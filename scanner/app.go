package main

import (
	"context"
	"fmt"
	"math/rand"
	"net"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
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

// StopScan cancels the ongoing scan
func (a *App) StopScan() {
	a.scanMutex.Lock()
	defer a.scanMutex.Unlock()
	if a.cancelScan != nil {
		a.cancelScan()
		a.cancelScan = nil
	}
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
			targets = append(targets, target{ip: fmt.Sprintf("%s.%d", req.BaseIP, i), port: 80}) // Defaulting to 80 for "ping" sweep
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

				result := a.checkTarget(t, timeout)
				runtime.EventsEmit(a.ctx, "scanResult", result)
			}(t)
		}
	}

	wg.Wait()
	runtime.EventsEmit(a.ctx, "scanComplete", true)
}

func (a *App) getMacAddr(ip string) string {
	data, err := os.ReadFile("/proc/net/arp")
	if err != nil {
		return ""
	}
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) >= 4 && fields[0] == ip {
			return fields[3]
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
