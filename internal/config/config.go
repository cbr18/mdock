package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	HTTPAddr          string
	VaultsRoot        string
	DataDir           string
	GitBin            string
	CommitDebounce    time.Duration
	LockTTL           time.Duration
	SessionTTL        time.Duration
	BootstrapUsername string
	BootstrapPassword string
	CookieSecure      bool
}

func Load() (Config, error) {
	cfg := Config{
		HTTPAddr:       getEnv("HTTP_ADDR", ":8080"),
		VaultsRoot:     getEnv("VAULTS_ROOT", "/vaults"),
		DataDir:        getEnv("DATA_DIR", "/data"),
		GitBin:         getEnv("GIT_BIN", "git"),
		CommitDebounce: 5 * time.Second,
		LockTTL:        30 * time.Second,
		SessionTTL:     24 * time.Hour,
		CookieSecure:   getBoolEnv("COOKIE_SECURE", false),
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

	cfg.BootstrapUsername = os.Getenv("BOOTSTRAP_USERNAME")
	cfg.BootstrapPassword = os.Getenv("BOOTSTRAP_PASSWORD")
	return cfg, nil
}

func (c Config) ValidateBootstrap() error {
	if c.BootstrapUsername == "" {
		return fmt.Errorf("BOOTSTRAP_USERNAME is required")
	}
	if c.BootstrapPassword == "" {
		return fmt.Errorf("BOOTSTRAP_PASSWORD is required")
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
