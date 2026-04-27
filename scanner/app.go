package main

import (
	"context"
	"bytes"
	"fmt"
	"math/rand"
	"net"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// ScanRequest defines the parameters for a scan
type ScanRequest struct {
	BaseIP      string  `json:"baseIP"`
	StartIP     int     `json:"startIP"`
	EndIP       int     `json:"endIP"`
	StartPort   int     `json:"startPort"`
	EndPort     int     `json:"endPort"`
	Timeout     float64 `json:"timeout"`
	Connections int     `json:"connections"`
	Random      bool    `json:"random"`
	ScanType    int     `json:"scanType"` // -1: Ping Sweep, 0: Port Sweep, 1: Port Scan
}

// ScanResult defines the result of a single probe
type ScanResult struct {
	IP     string `json:"ip"`
	Port   int    `json:"port"`
	Status string `json:"status"` // "up", "open", "closed", "down"
	MAC    string `json:"mac"`
}

// App struct
type App struct {
	ctx        context.Context
	cancelScan context.CancelFunc
	scanMutex  sync.Mutex
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// SendWOL sends a Magic Packet to the specified MAC address
func (a *App) SendWOL(macStr string) error {
	mac, err := net.ParseMAC(macStr)
	if err != nil {
		return err
	}

	packet := bytes.Repeat([]byte{0xFF}, 6)
	for i := 0; i < 16; i++ {
		packet = append(packet, mac...)
	}

	conn, err := net.Dial("udp", "255.255.255.255:9")
	if err != nil {
		return err
	}
	defer conn.Close()

	_, err = conn.Write(packet)
	return err
}

// StopScan cancels the ongoing scan
func (a *App) StopScan() {
	a.scanMutex.Lock()
	defer a.scanMutex.Unlock()
	if a.cancelScan != nil {
		a.cancelScan()
		a.cancelScan = nil
	}
}

// GetMACAddress performs an on-demand MAC address lookup for a given IP
func (a *App) GetMACAddress(ip string) string {
	return a.getMacAddr(ip)
}

// GetLocalIPPrefix returns the first three octets of the local IP address
func (a *App) GetLocalIPPrefix() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "192.168.1"
	}
	for _, address := range addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				ip := ipnet.IP.String()
				parts := strings.Split(ip, ".")
				if len(parts) == 4 {
					return parts[0] + "." + parts[1] + "." + parts[2]
				}
			}
		}
	}
	return "192.168.1"
}

// StartScan initiates the scanning process
func (a *App) StartScan(req ScanRequest) {
	a.StopScan() // Ensure any previous scan is stopped

	a.scanMutex.Lock()
	scanCtx, cancel := context.WithCancel(a.ctx)
	a.cancelScan = cancel
	a.scanMutex.Unlock()

	go a.runScan(scanCtx, req)
}

type target struct {
	ip   string
	port int
}

func (a *App) runScan(ctx context.Context, req ScanRequest) {
	var targets []target

	if req.ScanType == -1 { // Ping Sweep
		for i := req.StartIP; i <= req.EndIP; i++ {
			targets = append(targets, target{ip: fmt.Sprintf("%s.%d", req.BaseIP, i), port: 0})
		}
	} else if req.ScanType == 0 { // Port Sweep
		for i := req.StartIP; i <= req.EndIP; i++ {
			targets = append(targets, target{ip: fmt.Sprintf("%s.%d", req.BaseIP, i), port: req.StartPort})
		}
	} else if req.ScanType == 1 { // Port Scan
		for p := req.StartPort; p <= req.EndPort; p++ {
			targets = append(targets, target{ip: fmt.Sprintf("%s.%d", req.BaseIP, req.StartIP), port: p})
		}
	}

	if req.Random {
		rand.Seed(time.Now().UnixNano())
		rand.Shuffle(len(targets), func(i, j int) {
			targets[i], targets[j] = targets[j], targets[i]
		})
	}

	sem := make(chan struct{}, req.Connections)
	var wg sync.WaitGroup
	timeout := time.Duration(req.Timeout * float64(time.Second))

	for _, t := range targets {
		select {
		case <-ctx.Done():
			return
		case sem <- struct{}{}:
			wg.Add(1)
			go func(t target) {
				defer wg.Done()
				defer func() { <-sem }()

				var result ScanResult
				if req.ScanType == -1 {
					up := a.pingHost(t.ip, timeout)
					status := "down"
					if up {
						status = "up"
					}
					result = ScanResult{
						IP:     t.ip,
						Port:   0,
						Status: status,
						MAC:    "", // Removed from loop to avoid flashing cmd windows
					}
				} else {
					result = a.checkTarget(t, timeout)
				}
				wailsRuntime.EventsEmit(a.ctx, "scanResult", result)
			}(t)
		}
	}

	wg.Wait()
	wailsRuntime.EventsEmit(a.ctx, "scanComplete", true)
}

func (a *App) pingHost(ip string, timeout time.Duration) bool {
	// Use system ping command. -c 1 (count), -W 1 (timeout in seconds)
	// On Windows it would be -n 1 -w timeout
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		timeoutMs := timeout.Milliseconds()
		if timeoutMs < 1 {
			timeoutMs = 1000
		}
		cmd = exec.Command("ping", "-n", "1", "-w", fmt.Sprintf("%d", timeoutMs), ip)
		cmd.SysProcAttr = getSysProcAttr()
	} else {
		timeoutSec := int(timeout.Seconds())
		if timeoutSec < 1 {
			timeoutSec = 1
		}
		cmd = exec.Command("ping", "-c", "1", "-W", fmt.Sprintf("%d", timeoutSec), ip)
	}

	err := cmd.Run()
	return err == nil
}

func (a *App) getMacAddr(ip string) string {
	// Try /proc/net/arp first (Linux)
	data, err := os.ReadFile("/proc/net/arp")
	if err == nil {
		lines := strings.Split(string(data), "\n")
		for _, line := range lines {
			fields := strings.Fields(line)
			if len(fields) >= 4 && fields[0] == ip {
				if fields[3] != "00:00:00:00:00:00" {
					return fields[3]
				}
			}
		}
	}

	// Try 'ip neigh' (Linux)
	cmd := exec.Command("ip", "neigh", "show", ip)
	cmd.SysProcAttr = getSysProcAttr()
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err == nil {
		fields := strings.Fields(out.String())
		for i, field := range fields {
			if field == "lladdr" && i+1 < len(fields) {
				return fields[i+1]
			}
		}
	}

	// Try 'arp -a' (Windows/macOS/Linux fallback)
	cmd = exec.Command("arp", "-a", ip)
	cmd.SysProcAttr = getSysProcAttr()
	out.Reset()
	cmd.Stdout = &out
	if err := cmd.Run(); err == nil {
		fields := strings.Fields(out.String())
		for _, field := range fields {
			// Look for something that looks like a MAC address
			if strings.Contains(field, ":") || strings.Contains(field, "-") {
				if len(field) >= 11 { // basic check for MAC length
					return field
				}
			}
		}
	}

	return ""
}

func (a *App) checkTarget(t target, timeout time.Duration) ScanResult {
	address := fmt.Sprintf("%s:%d", t.ip, t.port)
	conn, err := net.DialTimeout("tcp", address, timeout)

	status := "closed"
	if err == nil {
		conn.Close()
		status = "open"
	} else {
		if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
			status = "down"
		} else {
			status = "closed"
		}
	}

	return ScanResult{
		IP:     t.ip,
		Port:   t.port,
		Status: status,
		MAC:    a.getMacAddr(t.ip),
	}
}
