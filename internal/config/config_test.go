package config

import (
	"testing"
	"time"
)

func TestLoadDefaultsAndDurations(t *testing.T) {
	t.Setenv("HTTP_ADDR", ":9090")
	t.Setenv("VAULTS_ROOT", "/tmp/vaults")
	t.Setenv("DATA_DIR", "/tmp/data")
	t.Setenv("COMMIT_DEBOUNCE", "2s")
	t.Setenv("LOCK_TTL", "45s")
	t.Setenv("SESSION_TTL", "1h")
	t.Setenv("BOOTSTRAP_USERNAME", "admin")
	t.Setenv("BOOTSTRAP_PASSWORD", "secret")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.HTTPAddr != ":9090" || cfg.VaultsRoot != "/tmp/vaults" || cfg.DataDir != "/tmp/data" {
		t.Fatalf("unexpected config paths: %+v", cfg)
	}
	if cfg.CommitDebounce != 2*time.Second || cfg.LockTTL != 45*time.Second || cfg.SessionTTL != time.Hour {
		t.Fatalf("unexpected durations: %+v", cfg)
	}
	if err := cfg.ValidateBootstrap(); err != nil {
		t.Fatalf("ValidateBootstrap() error = %v", err)
	}
}

func TestLoadRejectsBadDuration(t *testing.T) {
	t.Setenv("LOCK_TTL", "bad")

	if _, err := Load(); err == nil {
		t.Fatal("expected bad duration error")
	}
}
