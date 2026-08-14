package httpapi

import (
	"io/fs"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/cbr/mdock/internal/app"
	appwebdav "github.com/cbr/mdock/internal/webdav"
	"github.com/cbr/mdock/webdist"
)

func init() {
	for _, method := range []string{"PROPFIND", "MKCOL", "MOVE", "LOCK", "UNLOCK"} {
		chi.RegisterMethod(method)
	}
}

type Handler struct {
	app    *app.Service
	logger *slog.Logger
}

func New(service *app.Service, logger *slog.Logger) (http.Handler, error) {
	if logger == nil {
		logger = slog.Default()
	}
	h := &Handler{app: service, logger: logger}
	return h.routes()
}

func (h *Handler) routes() (http.Handler, error) {
	r := chi.NewRouter()
	r.Get("/healthz", h.health)
	r.Post("/api/auth/register", h.register)
	r.Post("/api/auth/login", h.login)
	r.Group(func(r chi.Router) {
		r.Use(h.requireSession)
		r.Get("/api/auth/me", h.me)
		r.Post("/api/auth/logout", h.logout)
		r.Post("/api/auth/password", h.changeOwnPassword)
		r.Get("/api/vaults", h.vaults)
		r.Post("/api/vaults", h.createVault)
		r.Get("/api/vaults/{slug}", h.vaultDetails)
		r.Patch("/api/vaults/{slug}", h.renameVault)
		r.Post("/api/vaults/{slug}/archive", h.archiveVault)
		r.Post("/api/vaults/{slug}/unarchive", h.unarchiveVault)
		r.Get("/api/vaults/{slug}/webdav", h.vaultWebDAVDetails)
		r.Get("/api/vaults/{slug}/members", h.vaultMembers)
		r.Get("/api/vaults/{slug}/git/status", h.gitStatus)
		r.Get("/api/vaults/{slug}/git/commits", h.gitCommits)
		r.Group(func(r chi.Router) {
			r.Use(h.requireAdmin)
			r.Get("/api/admin/users", h.adminUsers)
			r.Post("/api/admin/users/{login}/password", h.adminSetPassword)
			r.Post("/api/admin/users/{login}/disable", h.adminDisableUser)
			r.Post("/api/admin/users/{login}/enable", h.adminEnableUser)
			r.Post("/api/admin/users/{login}/sessions/revoke", h.adminRevokeSessions)
		})
	})
	webdavHandler := http.StripPrefix("/webdav", appwebdav.NewHandler(appwebdav.Config{
		Store:        h.app.Store(),
		VaultService: h.app.VaultService(),
		LockService:  h.app.LockService(),
		QueueFor:     h.app.QueueForVault,
		LockTTL:      h.app.LockTTL(),
		Logger:       h.logger,
	}))
	for _, method := range []string{http.MethodOptions, "PROPFIND", http.MethodGet, http.MethodHead, http.MethodPut, "MKCOL", http.MethodDelete, "MOVE", "LOCK", "UNLOCK"} {
		r.Method(method, "/webdav/*", webdavHandler)
	}
	r.Mount("/", h.staticHandler())
	return r, nil
}

func (h *Handler) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) staticHandler() http.Handler {
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
