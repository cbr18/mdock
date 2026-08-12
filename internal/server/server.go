package server

import (
	"context"
	"encoding/json"
	"errors"
	"io/fs"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/cbr/mdock/internal/config"
	appgit "github.com/cbr/mdock/internal/git"
	"github.com/cbr/mdock/internal/locks"
	"github.com/cbr/mdock/internal/store"
	"github.com/cbr/mdock/internal/vault"
	appwebdav "github.com/cbr/mdock/internal/webdav"
	"github.com/cbr/mdock/webdist"
)

func init() {
	for _, method := range []string{"PROPFIND", "MKCOL", "MOVE", "LOCK", "UNLOCK"} {
		chi.RegisterMethod(method)
	}
}

type Server struct {
	cfg          config.Config
	store        *store.Store
	logger       *slog.Logger
	vaultService *vault.Service
	lockService  *locks.Service
	gitClient    *appgit.Client
	queues       *queueRegistry
	router       http.Handler
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type createVaultRequest struct {
	Name string `json:"name"`
}

func New(cfg config.Config, st *store.Store, logger *slog.Logger) (*Server, error) {
	if logger == nil {
		logger = slog.Default()
	}
	vaultService, err := vault.NewService(cfg.VaultsRoot)
	if err != nil {
		return nil, err
	}
	gitClient := appgit.NewClient(cfg.GitBin)
	s := &Server{
		cfg:          cfg,
		store:        st,
		logger:       logger,
		vaultService: vaultService,
		lockService:  locks.NewService(st.DB()),
		gitClient:    gitClient,
		queues:       newQueueRegistry(gitClient, cfg.CommitDebounce),
	}
	router, err := s.routes()
	if err != nil {
		return nil, err
	}
	s.router = router
	return s, nil
}

func (s *Server) Handler() http.Handler {
	return s.router
}

func (s *Server) routes() (http.Handler, error) {
	r := chi.NewRouter()
	r.Get("/healthz", s.health)
	r.Post("/api/auth/register", s.register)
	r.Post("/api/auth/login", s.login)
	r.Group(func(r chi.Router) {
		r.Use(s.requireSession)
		r.Get("/api/auth/me", s.me)
		r.Post("/api/auth/logout", s.logout)
		r.Get("/api/vaults", s.vaults)
		r.Post("/api/vaults", s.createVault)
	})
	webdavHandler := http.StripPrefix("/webdav", appwebdav.NewHandler(appwebdav.Config{
		Store:        s.store,
		VaultService: s.vaultService,
		LockService:  s.lockService,
		QueueFor:     s.queueForVault,
		LockTTL:      s.cfg.LockTTL,
		Logger:       s.logger,
	}))
	for _, method := range []string{http.MethodOptions, "PROPFIND", http.MethodGet, http.MethodHead, http.MethodPut, "MKCOL", http.MethodDelete, "MOVE", "LOCK", "UNLOCK"} {
		r.Method(method, "/webdav/*", webdavHandler)
	}
	r.Mount("/", s.staticHandler())
	return r, nil
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	user, vault, err := s.store.CreateUser(r.Context(), req.Username, req.Password)
	if errors.Is(err, store.ErrUserExists) {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "user_exists"})
		return
	}
	if err != nil {
		s.logger.Error("register user", "error", err)
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_registration"})
		return
	}
	if err := s.prepareVault(r.Context(), vault); err != nil {
		s.logger.Error("prepare registered vault", "error", err, "vault_id", vault.ID)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	sessionID, expiresAt, err := s.store.CreateSession(r.Context(), user.ID, s.cfg.SessionTTL)
	if err != nil {
		s.logger.Error("create registration session", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	s.setSessionCookie(w, sessionID, expiresAt)
	writeJSON(w, http.StatusCreated, map[string]any{"status": "ok", "username": user.Login, "vault": vault})
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	user, err := s.store.Authenticate(r.Context(), req.Username, req.Password)
	if errors.Is(err, store.ErrInvalidCredentials) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid_credentials"})
		return
	}
	if err != nil {
		s.logger.Error("authenticate user", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	sessionID, expiresAt, err := s.store.CreateSession(r.Context(), user.ID, s.cfg.SessionTTL)
	if err != nil {
		s.logger.Error("create session", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	s.setSessionCookie(w, sessionID, expiresAt)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "username": user.Login})
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	writeJSON(w, http.StatusOK, map[string]string{"username": user.Login})
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie("mdock_session"); err == nil {
		if err := s.store.DeleteSession(r.Context(), cookie.Value); err != nil {
			s.logger.Error("delete session", "error", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
			return
		}
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "mdock_session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   s.cfg.CookieSecure,
	})
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) vaults(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	vaults, err := s.store.ListVaultsForUser(r.Context(), user.ID)
	if err != nil {
		s.logger.Error("list user vaults", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vaults": vaults})
}

func (s *Server) createVault(w http.ResponseWriter, r *http.Request) {
	var req createVaultRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name_required"})
		return
	}
	user := userFromContext(r.Context())
	vault, err := s.store.CreateVaultForUser(r.Context(), user.ID, req.Name, store.VaultKindShared)
	if err != nil {
		s.logger.Error("create vault", "error", err, "user_id", user.ID)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	if err := s.prepareVault(r.Context(), vault); err != nil {
		s.logger.Error("prepare created vault", "error", err, "vault_id", vault.ID)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"vault": vault})
}

func (s *Server) requireSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("mdock_session")
		if err != nil || cookie.Value == "" {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
		user, err := s.store.ValidateSession(r.Context(), cookie.Value)
		if errors.Is(err, store.ErrInvalidSession) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
		if err != nil {
			s.logger.Error("validate session", "error", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
			return
		}
		next.ServeHTTP(w, r.WithContext(contextWithUser(r.Context(), user)))
	})
}

func (s *Server) setSessionCookie(w http.ResponseWriter, sessionID string, expiresAt time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     "mdock_session",
		Value:    sessionID,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   s.cfg.CookieSecure,
	})
}

func (s *Server) prepareVault(ctx context.Context, item store.Vault) error {
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

func (s *Server) queueForVault(item store.Vault) (*appgit.Queue, error) {
	root, err := s.vaultService.EnsureVault(item.Path)
	if err != nil {
		return nil, err
	}
	return s.queues.For(item.ID, root), nil
}

type queueRegistry struct {
	client   *appgit.Client
	debounce time.Duration
	mu       sync.Mutex
	queues   map[int64]*appgit.Queue
}

func newQueueRegistry(client *appgit.Client, debounce time.Duration) *queueRegistry {
	return &queueRegistry{client: client, debounce: debounce, queues: map[int64]*appgit.Queue{}}
}

func (r *queueRegistry) For(vaultID int64, repoPath string) *appgit.Queue {
	r.mu.Lock()
	defer r.mu.Unlock()
	if queue, ok := r.queues[vaultID]; ok {
		return queue
	}
	queue := appgit.NewQueue(r.client, repoPath, r.debounce)
	r.queues[vaultID] = queue
	return queue
}

func (s *Server) staticHandler() http.Handler {
	sub, err := fs.Sub(webdist.Assets, "dist")
	if err != nil {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "frontend assets unavailable", http.StatusInternalServerError)
		})
	}
	fileServer := http.FileServer(http.FS(sub))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") || strings.HasPrefix(r.URL.Path, "/webdav/") {
			http.NotFound(w, r)
			return
		}
		if r.URL.Path == "/" {
			fileServer.ServeHTTP(w, r)
			return
		}
		if _, err := fs.Stat(sub, strings.TrimPrefix(r.URL.Path, "/")); err == nil {
			fileServer.ServeHTTP(w, r)
			return
		}
		r2 := r.Clone(r.Context())
		r2.URL.Path = "/"
		fileServer.ServeHTTP(w, r2)
	})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

type contextKey string

const userContextKey contextKey = "user"

func contextWithUser(ctx context.Context, user store.User) context.Context {
	return context.WithValue(ctx, userContextKey, user)
}

func userFromContext(ctx context.Context) store.User {
	user, _ := ctx.Value(userContextKey).(store.User)
	return user
}
