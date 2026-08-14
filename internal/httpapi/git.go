package httpapi

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

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
