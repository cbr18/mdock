package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	HTTPAddr              string
	VaultsRoot            string
	DataDir               string
	GitBin                string
	BackupDir             string
	CommitDebounce        time.Duration
	LockTTL               time.Duration
	SessionTTL            time.Duration
	BootstrapUsername     string
	BootstrapPassword     string
	FirstAdminToken       string
	CookieSecure          bool
	APIBodyLimitBytes     int64
	WebDAVBodyLimitBytes  int64
	AuthRateLimitAttempts int
	AuthRateLimitWindow   time.Duration
}

func Load() (Config, error) {
	cfg := Config{
		HTTPAddr:              getEnv("HTTP_ADDR", ":8080"),
		VaultsRoot:            getEnv("VAULTS_ROOT", "/vaults"),
		DataDir:               getEnv("DATA_DIR", "/data"),
		GitBin:                getEnv("GIT_BIN", "git"),
		BackupDir:             getEnv("BACKUP_DIR", "/backups"),
		CommitDebounce:        5 * time.Second,
		LockTTL:               30 * time.Second,
		SessionTTL:            24 * time.Hour,
		CookieSecure:          getBoolEnv("COOKIE_SECURE", false),
		APIBodyLimitBytes:     1 << 20,
		WebDAVBodyLimitBytes:  50 << 20,
		AuthRateLimitAttempts: 20,
		AuthRateLimitWindow:   time.Minute,
	}

	var err error
	if cfg.CommitDebounce, err = getDurationEnv("COMMIT_DEBOUNCE", cfg.CommitDebounce); err != nil {
		return Config{}, err
	}
	if cfg.LockTTL, err = getDurationEnv("LOCK_TTL", cfg.LockTTL); err != nil {
		return Config{}, err
	}
	if cfg.SessionTTL, err = getDurationEnv("SESSION_TTL", cfg.SessionTTL); err != nil {
		return Config{}, err
	}
	if cfg.AuthRateLimitWindow, err = getDurationEnv("AUTH_RATE_LIMIT_WINDOW", cfg.AuthRateLimitWindow); err != nil {
		return Config{}, err
	}
	if cfg.APIBodyLimitBytes, err = getInt64Env("API_BODY_LIMIT_BYTES", cfg.APIBodyLimitBytes); err != nil {
		return Config{}, err
	}
	if cfg.WebDAVBodyLimitBytes, err = getInt64Env("WEBDAV_BODY_LIMIT_BYTES", cfg.WebDAVBodyLimitBytes); err != nil {
		return Config{}, err
	}
	if cfg.AuthRateLimitAttempts, err = getIntEnv("AUTH_RATE_LIMIT_ATTEMPTS", cfg.AuthRateLimitAttempts); err != nil {
		return Config{}, err
	}

	cfg.BootstrapUsername = os.Getenv("BOOTSTRAP_USERNAME")
	cfg.BootstrapPassword = os.Getenv("BOOTSTRAP_PASSWORD")
	cfg.FirstAdminToken = os.Getenv("FIRST_ADMIN_TOKEN")
	return cfg, nil
}

func (c Config) ValidateBootstrap() error {
	if c.BootstrapUsername == "" && c.BootstrapPassword == "" {
		return nil
	}
	if c.BootstrapUsername == "" || c.BootstrapPassword == "" {
		return fmt.Errorf("BOOTSTRAP_USERNAME and BOOTSTRAP_PASSWORD must be set together")
	}
	return nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getDurationEnv(key string, fallback time.Duration) (time.Duration, error) {
	value := os.Getenv(key)
	if value == "" {
		return fallback, nil
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return 0, fmt.Errorf("parse %s: %w", key, err)
	}
	return parsed, nil
}

func getIntEnv(key string, fallback int) (int, error) {
	value := os.Getenv(key)
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("parse %s: %w", key, err)
	}
	return parsed, nil
}

func getInt64Env(key string, fallback int64) (int64, error) {
	value := os.Getenv(key)
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse %s: %w", key, err)
	}
	return parsed, nil
}

func getBoolEnv(key string, fallback bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}
