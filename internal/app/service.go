package app

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/cbr/mdock/internal/config"
	appgit "github.com/cbr/mdock/internal/git"
	"github.com/cbr/mdock/internal/locks"
	"github.com/cbr/mdock/internal/store"
	"github.com/cbr/mdock/internal/vault"
)

type Service struct {
	cfg          config.Config
	store        *store.Store
	logger       *slog.Logger
	vaultService *vault.Service
	lockService  *locks.Service
	gitClient    *appgit.Client
	queues       *appgit.QueueRegistry
}

type AuthSession struct {
	User      store.User
	SessionID string
	ExpiresAt time.Time
}

type GitStatus struct {
	Vault     store.Vault `json:"vault"`
	Dirty     bool        `json:"dirty"`
	Status    string      `json:"status"`
	QueueLen  int         `json:"queue_len"`
	LastError string      `json:"last_error,omitempty"`
}

func New(cfg config.Config, st *store.Store, logger *slog.Logger) (*Service, error) {
	if logger == nil {
		logger = slog.Default()
	}
	vaultService, err := vault.NewService(cfg.VaultsRoot)
	if err != nil {
		return nil, err
	}
	gitClient := appgit.NewClient(cfg.GitBin)
	return &Service{
		cfg:          cfg,
		store:        st,
		logger:       logger,
		vaultService: vaultService,
		lockService:  locks.NewService(st.DB()),
		gitClient:    gitClient,
		queues:       appgit.NewQueueRegistry(gitClient, cfg.CommitDebounce),
	}, nil
}

func (s *Service) Store() *store.Store {
	return s.store
}

func (s *Service) VaultService() *vault.Service {
	return s.vaultService
}

func (s *Service) LockService() *locks.Service {
	return s.lockService
}

func (s *Service) LockTTL() time.Duration {
	return s.cfg.LockTTL
}

func (s *Service) CookieSecure() bool {
	return s.cfg.CookieSecure
}

func (s *Service) Logger() *slog.Logger {
	return s.logger
}

func (s *Service) RegisterUser(ctx context.Context, username, password string) (store.User, store.Vault, string, time.Time, error) {
	user, item, err := s.store.CreateUser(ctx, username, password)
	if err != nil {
		return store.User{}, store.Vault{}, "", time.Time{}, err
	}
	if err := s.PrepareVault(ctx, item); err != nil {
		return store.User{}, store.Vault{}, "", time.Time{}, err
	}
	sessionID, expiresAt, err := s.store.CreateSession(ctx, user.ID, s.cfg.SessionTTL)
	if err != nil {
		return store.User{}, store.Vault{}, "", time.Time{}, err
	}
	return user, item, sessionID, expiresAt, nil
}

func (s *Service) Login(ctx context.Context, username, password string) (AuthSession, error) {
	user, err := s.store.Authenticate(ctx, username, password)
	if err != nil {
		return AuthSession{}, err
	}
	sessionID, expiresAt, err := s.store.CreateSession(ctx, user.ID, s.cfg.SessionTTL)
	if err != nil {
		return AuthSession{}, err
	}
	return AuthSession{User: user, SessionID: sessionID, ExpiresAt: expiresAt}, nil
}

func (s *Service) Logout(ctx context.Context, sessionID string) error {
	return s.store.DeleteSession(ctx, sessionID)
}

func (s *Service) ValidateSession(ctx context.Context, sessionID string) (store.User, error) {
	return s.store.ValidateSession(ctx, sessionID)
}

func (s *Service) ListVaults(ctx context.Context, userID int64) ([]store.Vault, error) {
	return s.store.ListVaultsForUser(ctx, userID)
}

func (s *Service) CreateVault(ctx context.Context, userID int64, name string) (store.Vault, error) {
	item, err := s.store.CreateVaultForUser(ctx, userID, name, store.VaultKindShared)
	if err != nil {
		return store.Vault{}, err
	}
	if err := s.PrepareVault(ctx, item); err != nil {
		return store.Vault{}, err
	}
	return item, nil
}

func (s *Service) PrepareVault(ctx context.Context, item store.Vault) error {
	root, err := s.vaultService.EnsureVault(item.Path)
	if err != nil {
		return err
	}
	if err := s.gitClient.InitIfNeeded(ctx, root); err != nil {
		return err
	}
	if err := s.gitClient.EnsureMainBranch(ctx, root); err != nil {
		return err
	}
	_, err = s.gitClient.RecoveryCommit(ctx, root)
	return err
}

func (s *Service) QueueForVault(item store.Vault) (*appgit.Queue, error) {
	root, err := s.vaultService.EnsureVault(item.Path)
	if err != nil {
		return nil, err
	}
	return s.queues.For(item.ID, root), nil
}

func (s *Service) GitStatus(ctx context.Context, userID int64, vaultSlug string) (GitStatus, error) {
	item, root, queue, err := s.gitContext(ctx, userID, vaultSlug)
	if err != nil {
		return GitStatus{}, err
	}
	status, err := s.gitClient.StatusPorcelain(ctx, root)
	if err != nil {
		return GitStatus{}, err
	}
	var lastErr string
	if err := queue.LastError(); err != nil {
		lastErr = err.Error()
	}
	return GitStatus{
		Vault:     item,
		Dirty:     strings.TrimSpace(status) != "",
		Status:    status,
		QueueLen:  queue.Len(),
		LastError: lastErr,
	}, nil
}

func (s *Service) GitCommits(ctx context.Context, userID int64, vaultSlug string, limit int) (store.Vault, []appgit.CommitInfo, error) {
	item, root, _, err := s.gitContext(ctx, userID, vaultSlug)
	if err != nil {
		return store.Vault{}, nil, err
	}
	commits, err := s.gitClient.Log(ctx, root, limit)
	if err != nil {
		return store.Vault{}, nil, err
	}
	return item, commits, nil
}

func (s *Service) gitContext(ctx context.Context, userID int64, vaultSlug string) (store.Vault, string, *appgit.Queue, error) {
	item, err := s.store.VaultForUserBySlug(ctx, userID, vaultSlug)
	if err != nil {
		return store.Vault{}, "", nil, err
	}
	root, err := s.vaultService.EnsureVault(item.Path)
	if err != nil {
		return store.Vault{}, "", nil, err
	}
	queue := s.queues.For(item.ID, root)
	return item, root, queue, nil
}
