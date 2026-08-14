package httpapi

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/cbr/mdock/internal/app"
	"github.com/cbr/mdock/internal/store"
)

type createVaultRequest struct {
	Name string `json:"name"`
}

type renameVaultRequest struct {
	Name string `json:"name"`
}

type webDAVDetails struct {
	Path string `json:"path"`
	URL  string `json:"url,omitempty"`
}

func (h *Handler) vaults(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	vaults, err := h.app.ListVaults(r.Context(), user.ID)
	if err != nil {
		h.logger.Error("list user vaults", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vaults": vaults})
}

func (h *Handler) createVault(w http.ResponseWriter, r *http.Request) {
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
	item, err := h.app.CreateVault(r.Context(), user.ID, req.Name)
	if err != nil {
		h.logger.Error("create vault", "error", err, "user_id", user.ID)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"vault": item})
}

func (h *Handler) vaultDetails(w http.ResponseWriter, r *http.Request) {
	item, ok := h.userVault(w, r, true)
	if !ok {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item, "webdav": h.webDAVDetails(r, item)})
}

func (h *Handler) renameVault(w http.ResponseWriter, r *http.Request) {
	var req renameVaultRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name_required"})
		return
	}
	user := userFromContext(r.Context())
	item, err := h.app.RenameVault(r.Context(), user.ID, chi.URLParam(r, "slug"), req.Name)
	if h.handleVaultError(w, r, "rename vault", err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item, "webdav": h.webDAVDetails(r, item)})
}

func (h *Handler) archiveVault(w http.ResponseWriter, r *http.Request) {
	h.setVaultArchived(w, r, true)
}

func (h *Handler) unarchiveVault(w http.ResponseWriter, r *http.Request) {
	h.setVaultArchived(w, r, false)
}

func (h *Handler) setVaultArchived(w http.ResponseWriter, r *http.Request, archived bool) {
	user := userFromContext(r.Context())
	item, err := h.app.ArchiveVault(r.Context(), user.ID, chi.URLParam(r, "slug"), archived)
	if h.handleVaultError(w, r, "set vault archived", err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item, "webdav": h.webDAVDetails(r, item)})
}

func (h *Handler) vaultWebDAVDetails(w http.ResponseWriter, r *http.Request) {
	item, ok := h.userVault(w, r, false)
	if !ok {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item, "webdav": h.webDAVDetails(r, item)})
}

func (h *Handler) vaultMembers(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	item, members, err := h.app.VaultMembers(r.Context(), user.ID, chi.URLParam(r, "slug"))
	if h.handleVaultError(w, r, "list vault members", err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item, "members": members})
}

func (h *Handler) userVault(w http.ResponseWriter, r *http.Request, includeArchived bool) (store.Vault, bool) {
	user := userFromContext(r.Context())
	var (
		item store.Vault
		err  error
	)
	if includeArchived {
		item, err = h.app.VaultDetails(r.Context(), user.ID, chi.URLParam(r, "slug"))
	} else {
		item, err = h.app.Store().VaultForUserBySlug(r.Context(), user.ID, chi.URLParam(r, "slug"))
	}
	if h.handleVaultError(w, r, "get vault", err) {
		return store.Vault{}, false
	}
	return item, true
}

func (h *Handler) handleVaultError(w http.ResponseWriter, r *http.Request, operation string, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r)
		return true
	}
	if errors.Is(err, app.ErrForbidden) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return true
	}
	h.logger.Error(operation, "error", err)
	writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
	return true
}

func (h *Handler) webDAVDetails(r *http.Request, item store.Vault) webDAVDetails {
	path := "/webdav/" + item.Slug + "/"
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto")); forwarded != "" {
		scheme = strings.TrimSpace(strings.Split(forwarded, ",")[0])
	}
	host := r.Host
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-Host")); forwarded != "" {
		host = strings.TrimSpace(strings.Split(forwarded, ",")[0])
	}
	if host == "" {
		return webDAVDetails{Path: path}
	}
	return webDAVDetails{Path: path, URL: scheme + "://" + host + path}
}
