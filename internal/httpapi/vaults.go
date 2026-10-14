package httpapi

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
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
	Path            string `json:"path"`
	URL             string `json:"url,omitempty"`
	DefaultFileRoot string `json:"default_file_root"`
}

func (h *Handler) vaults(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	archived := strings.TrimSpace(r.URL.Query().Get("archived"))
	vaults, err := h.app.ListVaultsArchived(r.Context(), user.ID, archived)
	if err != nil {
		if strings.Contains(err.Error(), "invalid archived filter") {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_archived_filter"})
			return
		}
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
	defaultFileRoot := h.app.DefaultFileRoot()
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
		return webDAVDetails{Path: path, DefaultFileRoot: defaultFileRoot}
	}
	return webDAVDetails{Path: path, URL: scheme + "://" + host + path, DefaultFileRoot: defaultFileRoot}
}

func (h *Handler) vaultPagesSearch(w http.ResponseWriter, r *http.Request) {
	vault, ok := h.userVault(w, r, false)
	if !ok {
		return
	}
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "query_required"})
		return
	}
	limit := 20
	if l := strings.TrimSpace(r.URL.Query().Get("limit")); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}
	results, err := h.app.Store().SearchPageIndex(r.Context(), vault.Slug, query, limit)
	if err != nil {
		h.logger.Error("search pages", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	type PageResult struct {
		Path    string `json:"path"`
		Title   string `json:"title"`
		Aliases string `json:"aliases"`
		Preview string `json:"preview"`
	}
	resultsList := make([]PageResult, 0, len(results))
	for _, r := range results {
		preview := r.Title
		if r.Tags != "" {
			preview = r.Tags
		} else if r.Aliases != "" {
			preview = r.Aliases
		}
		if len(preview) > 120 {
			preview = preview[:120] + "..."
		}
		resultsList = append(resultsList, PageResult{
			Path:    r.Path,
			Title:   r.Title,
			Aliases: r.Aliases,
			Preview: preview,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"results": resultsList})
}

func (h *Handler) vaultPagesIndex(w http.ResponseWriter, r *http.Request) {
	vault, ok := h.userVault(w, r, false)
	if !ok {
		return
	}
	offset := 0
	if o := strings.TrimSpace(r.URL.Query().Get("offset")); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}
	limit := 50
	if l := strings.TrimSpace(r.URL.Query().Get("limit")); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 200 {
			limit = v
		}
	}
	results, total, err := h.app.Store().ListPageIndex(r.Context(), vault.Slug, offset, limit)
	if err != nil {
		h.logger.Error("list pages index", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	type PageIndexResult struct {
		Path        string `json:"path"`
		Title       string `json:"title"`
		Aliases     string `json:"aliases"`
		Tags        string `json:"tags"`
		Headings    string `json:"headings"`
		Blocks      string `json:"blocks"`
		ContentHash string `json:"content_hash"`
		UpdatedAt   int64  `json:"updated_at"`
	}
	resultsList := make([]PageIndexResult, 0, len(results))
	for _, r := range results {
		resultsList = append(resultsList, PageIndexResult{
			Path:        r.Path,
			Title:       r.Title,
			Aliases:     r.Aliases,
			Tags:        r.Tags,
			Headings:    r.Headings,
			Blocks:      r.Blocks,
			ContentHash: r.ContentHash,
			UpdatedAt:   r.UpdatedAt,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"results": resultsList,
		"total":   total,
		"offset":  offset,
		"limit":   limit,
	})
}

func (h *Handler) vaultPageHeadings(w http.ResponseWriter, r *http.Request) {
	vault, ok := h.userVault(w, r, false)
	if !ok {
		return
	}
	path := chi.URLParam(r, "path")
	if path == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "path_required"})
		return
	}
	headings, err := h.app.Store().GetPageHeadings(r.Context(), vault.Slug, path)
	if err != nil {
		h.logger.Error("get page headings", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"headings": headings})
}

func (h *Handler) vaultPagesReindex(w http.ResponseWriter, r *http.Request) {
	vault, ok := h.userVault(w, r, false)
	if !ok {
		return
	}
	// Require owner for reindex
	if vault.Role != store.RoleOwner {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}
	if err := h.app.ReindexVault(r.Context(), vault.Path, vault.Slug); err != nil {
		h.logger.Error("reindex vault", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "reindexed"})
}
