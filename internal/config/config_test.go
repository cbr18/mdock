package config

import (
	"testing"
	"time"
)

func TestLoadDefaultsAndDurations(t *testing.T) {
	t.Setenv("HTTP_ADDR", ":9090")
	t.Setenv("VAULTS_ROOT", "/tmp/vaults")
	t.Setenv("DATA_DIR", "/tmp/data")
	t.Setenv("DEFAULT_FILE_ROOT", "Notes")
	t.Setenv("COMMIT_DEBOUNCE", "2s")
	t.Setenv("LOCK_TTL", "45s")
	t.Setenv("SESSION_TTL", "1h")
	t.Setenv("API_BODY_LIMIT_BYTES", "2048")
	t.Setenv("WEBDAV_BODY_LIMIT_BYTES", "4096")
	t.Setenv("AUTH_RATE_LIMIT_ATTEMPTS", "7")
	t.Setenv("AUTH_RATE_LIMIT_WINDOW", "3m")
	t.Setenv("BOOTSTRAP_USERNAME", "admin")
	t.Setenv("BOOTSTRAP_PASSWORD", "secret")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.HTTPAddr != ":9090" || cfg.VaultsRoot != "/tmp/vaults" || cfg.DataDir != "/tmp/data" {
		t.Fatalf("unexpected config paths: %+v", cfg)
	}
	if cfg.DefaultFileRoot != "Notes" {
		t.Fatalf("DefaultFileRoot = %q, want Notes", cfg.DefaultFileRoot)
	}
	if cfg.CommitDebounce != 2*time.Second || cfg.LockTTL != 45*time.Second || cfg.SessionTTL != time.Hour {
		t.Fatalf("unexpected durations: %+v", cfg)
	}
	if cfg.APIBodyLimitBytes != 2048 || cfg.WebDAVBodyLimitBytes != 4096 || cfg.AuthRateLimitAttempts != 7 || cfg.AuthRateLimitWindow != 3*time.Minute {
		t.Fatalf("unexpected security limits: %+v", cfg)
	}
	if err := cfg.ValidateBootstrap(); err != nil {
		t.Fatalf("ValidateBootstrap() error = %v", err)
	}
}

func TestLoadDefaultFileRootFallback(t *testing.T) {
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.DefaultFileRoot != "Obsidian Vault" {
		t.Fatalf("DefaultFileRoot = %q, want Obsidian Vault", cfg.DefaultFileRoot)
	}
}

func TestLoadDefaultFileRootDot(t *testing.T) {
	t.Setenv("DEFAULT_FILE_ROOT", ".")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.DefaultFileRoot != "." {
		t.Fatalf("DefaultFileRoot = %q, want .", cfg.DefaultFileRoot)
	}
}

func TestLoadRejectsBadDuration(t *testing.T) {
	t.Setenv("LOCK_TTL", "bad")

	if _, err := Load(); err == nil {
		t.Fatal("expected bad duration error")
	}
}
