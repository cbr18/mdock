package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/cbr/mdock/internal/app"
)

type setGitRemoteRequest struct {
	URL string `json:"url"`
}

func (h *Handler) gitStatus(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	slug := chi.URLParam(r, "slug")
	status, err := h.app.GitStatus(r.Context(), user.ID, slug)
	if err != nil {
		h.logger.Error("git status", "error", err, "user_id", user.ID)
		http.NotFound(w, r)
		return
	}
	writeJSON(w, http.StatusOK, status)
}

func (h *Handler) gitCommits(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	slug := chi.URLParam(r, "slug")
	limit := 10
	if raw := r.URL.Query().Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_limit"})
			return
		}
		limit = parsed
	}
	item, commits, err := h.app.GitCommits(r.Context(), user.ID, slug, limit)
	if err != nil {
		h.logger.Error("git commits", "error", err, "user_id", user.ID)
		http.NotFound(w, r)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item, "commits": commits})
}

func (h *Handler) gitCommitDetails(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	slug := chi.URLParam(r, "slug")
	hash := chi.URLParam(r, "hash")
	item, details, err := h.app.GitCommitDetails(r.Context(), user.ID, slug, hash)
	if err != nil {
		h.logger.Error("git commit details", "error", err, "user_id", user.ID)
		http.NotFound(w, r)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item, "commit": details})
}

func (h *Handler) gitRemote(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	item, err := h.app.VaultDetails(r.Context(), user.ID, chi.URLParam(r, "slug"))
	if h.handleVaultError(w, r, "git remote", err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item, "remote_url": item.RemoteURL, "last_push_at": item.LastPushAt, "last_push_error": item.LastPushError})
}

func (h *Handler) setGitRemote(w http.ResponseWriter, r *http.Request) {
	var req setGitRemoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	user := userFromContext(r.Context())
	item, err := h.app.SetVaultRemoteURL(r.Context(), user.ID, chi.URLParam(r, "slug"), req.URL)
	if errors.Is(err, app.ErrInvalidRemoteURL) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_remote_url"})
		return
	}
	if h.handleVaultError(w, r, "set git remote", err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item, "remote_url": item.RemoteURL})
}

func (h *Handler) pushGitRemote(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	item, err := h.app.PushVaultRemote(r.Context(), user.ID, chi.URLParam(r, "slug"))
	if errors.Is(err, app.ErrRemoteNotConfigured) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "remote_not_configured"})
		return
	}
	if errors.Is(err, app.ErrInvalidRemoteURL) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_remote_url"})
		return
	}
	if item.ID == 0 && h.handleVaultError(w, r, "git remote push", err) {
		return
	}
	if err != nil {
		h.logger.Error("git remote push", "error", err, "vault_id", item.ID, "user_id", user.ID)
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "push_failed", "vault": item})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "vault": item})
}
