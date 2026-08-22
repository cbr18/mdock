package app

import (
	"context"
	"crypto/subtle"
	"errors"
	"log/slog"
	"net/url"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/cbr/mdock/internal/config"
	appgit "github.com/cbr/mdock/internal/git"
	"github.com/cbr/mdock/internal/locks"
	"github.com/cbr/mdock/internal/security"
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
	authLimiter  *security.RateLimiter
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

type Readiness struct {
	OK     bool              `json:"ok"`
	Checks map[string]string `json:"checks"`
}

var (
	ErrForbidden           = errors.New("forbidden")
	ErrInvalidRemoteURL    = errors.New("invalid remote url")
	ErrRemoteNotConfigured = errors.New("remote not configured")
	ErrRegistrationClosed  = errors.New("registration closed")
	ErrInvalidSetupToken   = errors.New("invalid setup token")
	ErrLastActiveAdmin     = errors.New("last active admin")
	ErrBinaryFile          = errors.New("binary file")
	ErrInvalidFilePath     = errors.New("invalid file path")
)

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
		authLimiter:  security.NewRateLimiter(cfg.AuthRateLimitAttempts, cfg.AuthRateLimitWindow),
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

func (s *Service) APIBodyLimitBytes() int64 {
	return s.cfg.APIBodyLimitBytes
}

func (s *Service) WebDAVBodyLimitBytes() int64 {
	return s.cfg.WebDAVBodyLimitBytes
}

func (s *Service) AllowAuthAttempt(key string) bool {
	return s.authLimiter.Allow(key)
}

func (s *Service) RecordAuthFailure(key string) {
	s.authLimiter.RecordFailure(key)
}

func (s *Service) ResetAuthFailures(key string) {
	s.authLimiter.Reset(key)
}

func (s *Service) AuthLimiter() *security.RateLimiter {
	return s.authLimiter
}

func (s *Service) Logger() *slog.Logger {
	return s.logger
}

func (s *Service) Shutdown(ctx context.Context) error {
	return s.queues.CloseAll(ctx)
}

func (s *Service) Ready(ctx context.Context) Readiness {
	checks := map[string]string{
		"sqlite":     "ok",
		"vaultsRoot": "ok",
	}
	ready := true
	if err := s.store.DB().PingContext(ctx); err != nil {
		ready = false
		checks["sqlite"] = err.Error()
	}
	if err := s.vaultService.CheckRoot(); err != nil {
		ready = false
		checks["vaultsRoot"] = err.Error()
	}
	return Readiness{OK: ready, Checks: checks}
}

func (s *Service) RegisterUser(ctx context.Context, username, password, setupToken string) (store.User, store.Vault, string, time.Time, error) {
	count, err := s.store.CountUsers(ctx)
	if err != nil {
		return store.User{}, store.Vault{}, "", time.Time{}, err
	}
	if count > 0 {
		return store.User{}, store.Vault{}, "", time.Time{}, ErrRegistrationClosed
	}
	if s.cfg.FirstAdminToken != "" && subtle.ConstantTimeCompare([]byte(setupToken), []byte(s.cfg.FirstAdminToken)) != 1 {
		return store.User{}, store.Vault{}, "", time.Time{}, ErrInvalidSetupToken
	}
	user, item, err := s.store.CreateAdminUser(ctx, username, password)
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

func (s *Service) CreateUser(ctx context.Context, username, password string) (store.User, store.Vault, error) {
	user, item, err := s.store.CreateUser(ctx, username, password)
	if err != nil {
		return store.User{}, store.Vault{}, err
	}
	if err := s.PrepareVault(ctx, item); err != nil {
		return store.User{}, store.Vault{}, err
	}
	return user, item, nil
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

func (s *Service) ChangeOwnPassword(ctx context.Context, user store.User, currentPassword, newPassword string) error {
	if _, err := s.store.Authenticate(ctx, user.Login, currentPassword); err != nil {
		return err
	}
	if err := s.store.SetPassword(ctx, user.Login, newPassword); err != nil {
		return err
	}
	return s.store.DeleteSessionsForLogin(ctx, user.Login)
}

func (s *Service) ListUsers(ctx context.Context) ([]store.User, error) {
	return s.store.ListUsers(ctx)
}

func (s *Service) SetUserPassword(ctx context.Context, login, password string) error {
	if err := s.store.SetPassword(ctx, login, password); err != nil {
		return err
	}
	return s.store.DeleteSessionsForLogin(ctx, login)
}

func (s *Service) SetUserDisabled(ctx context.Context, login string, disabled bool) error {
	user, err := s.store.GetUserByLogin(ctx, login)
	if err != nil {
		return err
	}
	if disabled && user.IsAdmin && !user.Disabled {
		activeAdmins, err := s.store.CountActiveAdmins(ctx)
		if err != nil {
			return err
		}
		if activeAdmins <= 1 {
			return ErrLastActiveAdmin
		}
	}
	if err := s.store.SetUserDisabled(ctx, login, disabled); err != nil {
		return err
	}
	if disabled {
		return s.store.DeleteSessionsForLogin(ctx, login)
	}
	return nil
}

func (s *Service) RevokeUserSessions(ctx context.Context, login string) error {
	if _, err := s.store.GetUserByLogin(ctx, login); err != nil {
		return err
	}
	return s.store.DeleteSessionsForLogin(ctx, login)
}

func (s *Service) ListVaults(ctx context.Context, userID int64) ([]store.Vault, error) {
	return s.store.ListVaultsForUser(ctx, userID)
}

func (s *Service) ListVaultsArchived(ctx context.Context, userID int64, archived string) ([]store.Vault, error) {
	return s.store.ListVaultsForUserArchived(ctx, userID, archived)
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

func (s *Service) VaultDetails(ctx context.Context, userID int64, vaultSlug string) (store.Vault, error) {
	return s.store.VaultForUserBySlugIncludingArchived(ctx, userID, vaultSlug)
}

func (s *Service) RenameVault(ctx context.Context, userID int64, vaultSlug, name string) (store.Vault, error) {
	item, err := s.requireVaultOwner(ctx, userID, vaultSlug)
	if err != nil {
		return store.Vault{}, err
	}
	updated, err := s.store.UpdateVaultName(ctx, item.ID, name)
	if err != nil {
		return store.Vault{}, err
	}
	updated.Role = item.Role
	return updated, nil
}

func (s *Service) ArchiveVault(ctx context.Context, userID int64, vaultSlug string, archived bool) (store.Vault, error) {
	item, err := s.requireVaultOwner(ctx, userID, vaultSlug)
	if err != nil {
		return store.Vault{}, err
	}
	updated, err := s.store.SetVaultArchived(ctx, item.ID, archived)
	if err != nil {
		return store.Vault{}, err
	}
	updated.Role = item.Role
	return updated, nil
}

func (s *Service) VaultMembers(ctx context.Context, userID int64, vaultSlug string) (store.Vault, []store.VaultMember, error) {
	item, err := s.requireVaultOwner(ctx, userID, vaultSlug)
	if err != nil {
		return store.Vault{}, nil, err
	}
	members, err := s.store.ListVaultMembers(ctx, item.ID)
	if err != nil {
		return store.Vault{}, nil, err
	}
	return item, members, nil
}

func (s *Service) SetVaultRemoteURL(ctx context.Context, userID int64, vaultSlug, remoteURL string) (store.Vault, error) {
	item, err := s.requireVaultOwner(ctx, userID, vaultSlug)
	if err != nil {
		return store.Vault{}, err
	}
	if err := validateRemoteURL(remoteURL); err != nil {
		return store.Vault{}, err
	}
	updated, err := s.store.SetVaultRemoteURL(ctx, item.ID, strings.TrimSpace(remoteURL))
	if err != nil {
		return store.Vault{}, err
	}
	updated.Role = item.Role
	return updated, nil
}

func (s *Service) PushVaultRemote(ctx context.Context, userID int64, vaultSlug string) (store.Vault, error) {
	item, root, queue, err := s.gitContext(ctx, userID, vaultSlug)
	if err != nil {
		return store.Vault{}, err
	}
	if item.Role != store.RoleOwner {
		return store.Vault{}, ErrForbidden
	}
	if strings.TrimSpace(item.RemoteURL) == "" {
		return store.Vault{}, ErrRemoteNotConfigured
	}
	if err := validateRemoteURL(item.RemoteURL); err != nil {
		return store.Vault{}, err
	}
	if err := queue.Flush(ctx); err != nil {
		_ = s.store.SetVaultPushResult(ctx, item.ID, time.Now(), err)
		return store.Vault{}, err
	}
	err = queue.RunExclusive(ctx, func(ctx context.Context) error {
		return s.gitClient.Push(ctx, root, item.RemoteURL)
	})
	_ = s.store.SetVaultPushResult(ctx, item.ID, time.Now(), err)
	updated, lookupErr := s.store.VaultForUserBySlug(ctx, userID, vaultSlug)
	if lookupErr != nil {
		return store.Vault{}, lookupErr
	}
	if err != nil {
		return updated, err
	}
	return updated, nil
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

func (s *Service) ListFiles(ctx context.Context, userID int64, vaultSlug, relPath string) (store.Vault, []vault.Entry, error) {
	item, err := s.store.VaultForUserBySlug(ctx, userID, vaultSlug)
	if err != nil {
		return store.Vault{}, nil, err
	}
	rel, err := cleanFilePath(relPath, true)
	if err != nil {
		return store.Vault{}, nil, err
	}
	entries, err := s.vaultService.List(item.Path, rel)
	if err != nil {
		return store.Vault{}, nil, err
	}
	return item, entries, nil
}

func (s *Service) ReadTextFile(ctx context.Context, userID int64, vaultSlug, relPath string) (store.Vault, vault.Info, string, error) {
	item, err := s.store.VaultForUserBySlug(ctx, userID, vaultSlug)
	if err != nil {
		return store.Vault{}, vault.Info{}, "", err
	}
	rel, err := cleanFilePath(relPath, false)
	if err != nil {
		return store.Vault{}, vault.Info{}, "", err
	}
	info, err := s.vaultService.Stat(item.Path, rel)
	if err != nil {
		return store.Vault{}, vault.Info{}, "", err
	}
	if info.IsDir {
		return store.Vault{}, vault.Info{}, "", ErrInvalidFilePath
	}
	data, err := s.vaultService.ReadFile(item.Path, rel)
	if err != nil {
		return store.Vault{}, vault.Info{}, "", err
	}
	if !utf8.Valid(data) {
		return store.Vault{}, vault.Info{}, "", ErrBinaryFile
	}
	return item, info, string(data), nil
}

func (s *Service) WriteTextFile(ctx context.Context, userID int64, vaultSlug, relPath, content, owner string) (store.Vault, vault.Info, error) {
	item, rel, err := s.fileMutationContext(ctx, userID, vaultSlug, relPath, false)
	if err != nil {
		return store.Vault{}, vault.Info{}, err
	}
	if err := s.withFileMutationLock(ctx, item, rel, owner, func() error {
		return s.vaultService.WriteFile(item.Path, rel, []byte(content))
	}); err != nil {
		return store.Vault{}, vault.Info{}, err
	}
	if err := s.enqueueVaultChange(ctx, item, []string{rel}); err != nil {
		return store.Vault{}, vault.Info{}, err
	}
	info, err := s.vaultService.Stat(item.Path, rel)
	if err != nil {
		return store.Vault{}, vault.Info{}, err
	}
	return item, info, nil
}

func (s *Service) CreateTextFile(ctx context.Context, userID int64, vaultSlug, relPath, content, owner string) (store.Vault, vault.Info, error) {
	item, rel, err := s.fileMutationContext(ctx, userID, vaultSlug, relPath, false)
	if err != nil {
		return store.Vault{}, vault.Info{}, err
	}
	if _, err := s.vaultService.Stat(item.Path, rel); err == nil {
		return store.Vault{}, vault.Info{}, ErrInvalidFilePath
	}
	if err := s.withFileMutationLock(ctx, item, rel, owner, func() error {
		return s.vaultService.WriteFile(item.Path, rel, []byte(content))
	}); err != nil {
		return store.Vault{}, vault.Info{}, err
	}
	if err := s.enqueueVaultChange(ctx, item, []string{rel}); err != nil {
		return store.Vault{}, vault.Info{}, err
	}
	info, err := s.vaultService.Stat(item.Path, rel)
	if err != nil {
		return store.Vault{}, vault.Info{}, err
	}
	return item, info, nil
}

func (s *Service) CreateDir(ctx context.Context, userID int64, vaultSlug, relPath, owner string) (store.Vault, vault.Info, error) {
	item, rel, err := s.fileMutationContext(ctx, userID, vaultSlug, relPath, false)
	if err != nil {
		return store.Vault{}, vault.Info{}, err
	}
	if err := s.withFileMutationLock(ctx, item, rel, owner, func() error {
		return s.vaultService.Mkdir(item.Path, rel)
	}); err != nil {
		return store.Vault{}, vault.Info{}, err
	}
	if err := s.enqueueVaultChange(ctx, item, []string{rel}); err != nil {
		return store.Vault{}, vault.Info{}, err
	}
	info, err := s.vaultService.Stat(item.Path, rel)
	if err != nil {
		return store.Vault{}, vault.Info{}, err
	}
	return item, info, nil
}

func (s *Service) MovePath(ctx context.Context, userID int64, vaultSlug, fromPath, toPath, owner string) (store.Vault, error) {
	item, from, err := s.fileMutationContext(ctx, userID, vaultSlug, fromPath, false)
	if err != nil {
		return store.Vault{}, err
	}
	to, err := cleanFilePath(toPath, false)
	if err != nil {
		return store.Vault{}, err
	}
	if _, err := s.vaultService.Stat(item.Path, to); err == nil {
		return store.Vault{}, ErrInvalidFilePath
	}
	info, err := s.vaultService.Stat(item.Path, from)
	if err != nil {
		return store.Vault{}, err
	}
	if err := s.ensureMoveUnlocked(ctx, item, from, info.IsDir); err != nil {
		return store.Vault{}, err
	}
	if err := s.withFileMutationLock(ctx, item, from, owner, func() error {
		return s.vaultService.Rename(item.Path, from, to)
	}); err != nil {
		return store.Vault{}, err
	}
	if err := s.enqueueVaultChange(ctx, item, []string{from, to}); err != nil {
		return store.Vault{}, err
	}
	return item, nil
}

func (s *Service) ensureMoveUnlocked(ctx context.Context, item store.Vault, rel string, isDir bool) error {
	if !isDir {
		if _, ok, err := s.lockService.Get(ctx, item.ID, rel); err != nil {
			return err
		} else if ok {
			return locks.ErrLocked
		}
		return nil
	}
	items, err := s.lockService.ActiveUnder(ctx, item.ID, rel)
	if err != nil {
		return err
	}
	if len(items) > 0 {
		return locks.ErrLocked
	}
	return nil
}

func (s *Service) DeletePath(ctx context.Context, userID int64, vaultSlug, relPath, owner string) (store.Vault, error) {
	item, rel, err := s.fileMutationContext(ctx, userID, vaultSlug, relPath, false)
	if err != nil {
		return store.Vault{}, err
	}
	if err := s.withFileMutationLock(ctx, item, rel, owner, func() error {
		return s.vaultService.Delete(item.Path, rel)
	}); err != nil {
		return store.Vault{}, err
	}
	if err := s.enqueueVaultChange(ctx, item, nil); err != nil {
		return store.Vault{}, err
	}
	return item, nil
}

func (s *Service) AcquireFileLock(ctx context.Context, userID int64, vaultSlug, relPath, owner string) (store.Vault, locks.Lock, error) {
	item, rel, err := s.fileMutationContext(ctx, userID, vaultSlug, relPath, false)
	if err != nil {
		return store.Vault{}, locks.Lock{}, err
	}
	lock, err := s.lockService.Acquire(ctx, item.ID, rel, owner, "web", s.cfg.LockTTL)
	return item, lock, err
}

func (s *Service) HeartbeatFileLock(ctx context.Context, userID int64, vaultSlug, relPath, owner string) (store.Vault, error) {
	item, rel, err := s.fileMutationContext(ctx, userID, vaultSlug, relPath, false)
	if err != nil {
		return store.Vault{}, err
	}
	return item, s.lockService.Heartbeat(ctx, item.ID, rel, owner, s.cfg.LockTTL)
}

func (s *Service) ReleaseFileLock(ctx context.Context, userID int64, vaultSlug, relPath, owner string) (store.Vault, error) {
	item, rel, err := s.fileMutationContext(ctx, userID, vaultSlug, relPath, false)
	if err != nil {
		return store.Vault{}, err
	}
	return item, s.lockService.Release(ctx, item.ID, rel, owner)
}

func (s *Service) requireVaultOwner(ctx context.Context, userID int64, vaultSlug string) (store.Vault, error) {
	item, err := s.store.VaultForUserBySlugIncludingArchived(ctx, userID, vaultSlug)
	if err != nil {
		return store.Vault{}, err
	}
	if item.Role != store.RoleOwner {
		return store.Vault{}, ErrForbidden
	}
	return item, nil
}

func (s *Service) fileMutationContext(ctx context.Context, userID int64, vaultSlug, relPath string, allowRoot bool) (store.Vault, string, error) {
	item, err := s.store.VaultForUserBySlug(ctx, userID, vaultSlug)
	if err != nil {
		return store.Vault{}, "", err
	}
	rel, err := cleanFilePath(relPath, allowRoot)
	if err != nil {
		return store.Vault{}, "", err
	}
	return item, rel, nil
}

func cleanFilePath(relPath string, allowRoot bool) (string, error) {
	rel, err := vault.SafeRelPath(relPath)
	if err != nil {
		return "", ErrInvalidFilePath
	}
	rel = filepath.ToSlash(rel)
	if rel == "." && !allowRoot {
		return "", ErrInvalidFilePath
	}
	return rel, nil
}

func (s *Service) withFileMutationLock(ctx context.Context, item store.Vault, rel, owner string, fn func() error) error {
	release := true
	if owner == "" {
		owner = "web:transient:" + strconv.FormatInt(time.Now().UnixNano(), 10)
	} else if existing, ok, err := s.lockService.Get(ctx, item.ID, rel); err != nil {
		return err
	} else if ok && existing.Owner == owner {
		release = false
	}
	if _, err := s.lockService.Acquire(ctx, item.ID, rel, owner, "web", s.cfg.LockTTL); err != nil {
		return err
	}
	if release {
		defer func() {
			if err := s.lockService.Release(context.Background(), item.ID, rel, owner); err != nil {
				s.logger.Error("release web mutation lock", "error", err, "vault_id", item.ID)
			}
		}()
	}
	return fn()
}

func (s *Service) enqueueVaultChange(ctx context.Context, item store.Vault, paths []string) error {
	queue, err := s.QueueForVault(item)
	if err != nil {
		return err
	}
	return queue.Enqueue(ctx, appgit.Task{Source: "web", Message: "web update", Paths: paths})
}

func validateRemoteURL(remoteURL string) error {
	remoteURL = strings.TrimSpace(remoteURL)
	if remoteURL == "" {
		return nil
	}
	if strings.ContainsAny(remoteURL, "\r\n\t ") {
		return ErrInvalidRemoteURL
	}
	if strings.Contains(remoteURL, "://") {
		parsed, err := url.Parse(remoteURL)
		if err != nil || parsed.Scheme == "" || parsed.Host == "" {
			return ErrInvalidRemoteURL
		}
		if parsed.User != nil {
			return ErrInvalidRemoteURL
		}
	}
	return nil
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
