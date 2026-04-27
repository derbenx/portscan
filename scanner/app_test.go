package main

import (
	"testing"
	"time"
)

func TestCheckTarget(t *testing.T) {
	app := NewApp()
	// Test with a likely closed port on localhost
	res := app.checkTarget(target{ip: "127.0.0.1", port: 12345}, 100*time.Millisecond)
	if res.Status != "closed" && res.Status != "down" {
		t.Errorf("Expected closed or down, got %s", res.Status)
	}
}

func TestGetLocalIPPrefix(t *testing.T) {
	app := NewApp()
	prefix := app.GetLocalIPPrefix()
	if prefix == "" {
		t.Error("Expected a prefix, got empty string")
	}
}
