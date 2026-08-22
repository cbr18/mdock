package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/cbr/mdock/internal/config"
	appgit "github.com/cbr/mdock/internal/git"
	"github.com/cbr/mdock/internal/locks"
	"github.com/cbr/mdock/internal/server"
	"github.com/cbr/mdock/internal/store"
	"github.com/cbr/mdock/internal/vault"
)

func main() {
	os.Exit(run())
}

func run() int {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if len(os.Args) > 1 && os.Args[1] == "backup-sql" {
		return runBackupSQL(logger, os.Args[2:])
	}
	cfg, err := config.Load()
	if err != nil {
		logger.Error("load config", "error", err)
		return 1
	}
	if err := cfg.ValidateBootstrap(); err != nil {
		logger.Error("validate bootstrap config", "error", err)
		return 1
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	st, err := store.Open(ctx, cfg.DataDir)
	if err != nil {
		logger.Error("open store", "error", err)
		return 1
	}
	defer st.Close()
	if cfg.BootstrapUsername != "" || cfg.BootstrapPassword != "" {
		if err := st.BootstrapUser(ctx, cfg.BootstrapUsername, cfg.BootstrapPassword); err != nil {
			logger.Error("bootstrap user", "error", err)
			return 1
		}
	}
	vaultService, err := vault.NewService(cfg.VaultsRoot)
	if err != nil {
		logger.Error("create vault service", "error", err)
		return 1
	}
	if err := initializeVaults(ctx, st, vaultService, appgit.NewClient(cfg.GitBin)); err != nil {
		logger.Error("initialize vaults", "error", err)
		return 1
	}

	app, err := server.New(cfg, st, logger)
	if err != nil {
		logger.Error("create server", "error", err)
		return 1
	}
	httpServer := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           app.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info("starting server", "addr", cfg.HTTPAddr)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server failed", "error", err)
			stop()
		}
	}()

	<-ctx.Done()
	httpShutdownCtx, cancelHTTPShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	if err := httpServer.Shutdown(httpShutdownCtx); err != nil {
		logger.Error("server shutdown failed", "error", err)
		cancelHTTPShutdown()
		appShutdownCtx, cancelAppShutdown := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancelAppShutdown()
		if appErr := app.Service().Shutdown(appShutdownCtx); appErr != nil {
			logger.Error("app shutdown failed", "error", appErr)
		}
		return 1
	}
	cancelHTTPShutdown()

	appShutdownCtx, cancelAppShutdown := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancelAppShutdown()
	if err := app.Service().Shutdown(appShutdownCtx); err != nil {
		logger.Error("app shutdown failed", "error", err)
		return 1
	}
	return 0
}

func runBackupSQL(logger *slog.Logger, args []string) int {
	flags := flag.NewFlagSet("backup-sql", flag.ContinueOnError)
	flags.SetOutput(os.Stderr)
	outDir := flags.String("out", "", "backup output directory")
	dataDir := flags.String("data-dir", "", "mdock data directory")
	if err := flags.Parse(args); err != nil {
		return 2
	}
	cfg, err := config.Load()
	if err != nil {
		logger.Error("load config", "error", err)
		return 1
	}
	if *dataDir != "" {
		cfg.DataDir = *dataDir
	}
	if *outDir != "" {
		cfg.BackupDir = *outDir
	}
	path, err := store.BackupSQL(context.Background(), cfg.DataDir, cfg.BackupDir, time.Now())
	if err != nil {
		logger.Error("backup sql", "error", err)
		return 1
	}
	fmt.Println(path)
	return 0
}

func initializeVaults(ctx context.Context, st *store.Store, vaultService *vault.Service, gitClient *appgit.Client) error {
	vaults, err := st.ListVaults(ctx)
	if err != nil {
		return err
	}
	for _, item := range vaults {
		root, err := vaultService.EnsureVault(item.Path)
		if err != nil {
			return err
		}
		if err := gitClient.InitIfNeeded(ctx, root); err != nil {
			return err
		}
		if err := gitClient.EnsureMainBranch(ctx, root); err != nil {
			return err
		}
		if _, err := gitClient.RecoveryCommit(ctx, root); err != nil {
			return err
		}
	}
	lockService := locks.NewService(st.DB())
	if _, err := lockService.CleanupExpired(ctx, time.Now()); err != nil {
		return err
	}
	if _, err := st.DeleteExpiredSessions(ctx, time.Now()); err != nil {
		return err
	}
	return nil
}
