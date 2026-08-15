package httpapi

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/cbr/mdock/internal/app"
	"github.com/cbr/mdock/internal/locks"
)

type fileContentRequest struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type createDirRequest struct {
	Path string `json:"path"`
}

type movePathRequest struct {
	FromPath string `json:"from_path"`
	ToPath   string `json:"to_path"`
}

type lockPathRequest struct {
	Path string `json:"path"`
}

func (h *Handler) listFiles(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	item, entries, err := h.app.ListFiles(r.Context(), user.ID, chi.URLParam(r, "slug"), queryPath(r))
	if h.handleFileError(w, "list files", err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item, "path": queryPath(r), "entries": entries})
}

func (h *Handler) readFileContent(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	item, info, content, err := h.app.ReadTextFile(r.Context(), user.ID, chi.URLParam(r, "slug"), queryPath(r))
	if h.handleFileError(w, "read file content", err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item, "file": info, "content": content})
}

func (h *Handler) createFile(w http.ResponseWriter, r *http.Request) {
	var req fileContentRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.Path) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "path_required"})
		return
	}
	user := userFromContext(r.Context())
	item, info, err := h.app.CreateTextFile(r.Context(), user.ID, chi.URLParam(r, "slug"), req.Path, req.Content, webLockOwner(r, user.ID))
	if h.handleFileError(w, "create file", err) {
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"vault": item, "file": info})
}

func (h *Handler) writeFileContent(w http.ResponseWriter, r *http.Request) {
	var req fileContentRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.Path) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "path_required"})
		return
	}
	user := userFromContext(r.Context())
	item, info, err := h.app.WriteTextFile(r.Context(), user.ID, chi.URLParam(r, "slug"), req.Path, req.Content, webLockOwner(r, user.ID))
	if h.handleFileError(w, "write file content", err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item, "file": info})
}

func (h *Handler) createDir(w http.ResponseWriter, r *http.Request) {
	var req createDirRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.Path) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "path_required"})
		return
	}
	user := userFromContext(r.Context())
	item, info, err := h.app.CreateDir(r.Context(), user.ID, chi.URLParam(r, "slug"), req.Path, webLockOwner(r, user.ID))
	if h.handleFileError(w, "create directory", err) {
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"vault": item, "file": info})
}

func (h *Handler) movePath(w http.ResponseWriter, r *http.Request) {
	var req movePathRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.FromPath) == "" || strings.TrimSpace(req.ToPath) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "path_required"})
		return
	}
	user := userFromContext(r.Context())
	item, err := h.app.MovePath(r.Context(), user.ID, chi.URLParam(r, "slug"), req.FromPath, req.ToPath, webLockOwner(r, user.ID))
	if h.handleFileError(w, "move path", err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item})
}

func (h *Handler) deletePath(w http.ResponseWriter, r *http.Request) {
	path := queryPath(r)
	if strings.TrimSpace(path) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "path_required"})
		return
	}
	user := userFromContext(r.Context())
	item, err := h.app.DeletePath(r.Context(), user.ID, chi.URLParam(r, "slug"), path, webLockOwner(r, user.ID))
	if h.handleFileError(w, "delete path", err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item})
}

func (h *Handler) acquireFileLock(w http.ResponseWriter, r *http.Request) {
	var req lockPathRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	user := userFromContext(r.Context())
	item, lock, err := h.app.AcquireFileLock(r.Context(), user.ID, chi.URLParam(r, "slug"), req.Path, webLockOwner(r, user.ID))
	if h.handleFileError(w, "acquire file lock", err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item, "lock": lock})
}

func (h *Handler) heartbeatFileLock(w http.ResponseWriter, r *http.Request) {
	var req lockPathRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	user := userFromContext(r.Context())
	item, err := h.app.HeartbeatFileLock(r.Context(), user.ID, chi.URLParam(r, "slug"), req.Path, webLockOwner(r, user.ID))
	if h.handleFileError(w, "heartbeat file lock", err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item})
}

func (h *Handler) releaseFileLock(w http.ResponseWriter, r *http.Request) {
	path := queryPath(r)
	if strings.TrimSpace(path) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "path_required"})
		return
	}
	user := userFromContext(r.Context())
	item, err := h.app.ReleaseFileLock(r.Context(), user.ID, chi.URLParam(r, "slug"), path, webLockOwner(r, user.ID))
	if h.handleFileError(w, "release file lock", err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"vault": item})
}

func (h *Handler) handleFileError(w http.ResponseWriter, operation string, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, sql.ErrNoRows) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
		return true
	}
	if errors.Is(err, os.ErrNotExist) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
		return true
	}
	if errors.Is(err, app.ErrInvalidFilePath) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_path"})
		return true
	}
	if errors.Is(err, app.ErrBinaryFile) {
		writeJSON(w, http.StatusUnsupportedMediaType, map[string]string{"error": "binary_file"})
		return true
	}
	if errors.Is(err, locks.ErrLocked) {
		writeJSON(w, http.StatusLocked, map[string]string{"error": "locked"})
		return true
	}
	if errors.Is(err, locks.ErrNotOwner) {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "lock_not_owner"})
		return true
	}
	h.logger.Error(operation, "error", err)
	writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
	return true
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	if err := json.NewDecoder(r.Body).Decode(target); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return false
	}
	return true
}

func queryPath(r *http.Request) string {
	if path := r.URL.Query().Get("path"); path != "" {
		return path
	}
	return "."
}

func webLockOwner(r *http.Request, userID int64) string {
	sessionID := ""
	if cookie, err := r.Cookie("mdock_session"); err == nil {
		sessionID = cookie.Value
	}
	sum := sha256.Sum256([]byte(sessionID))
	return "web:" + strconv.FormatInt(userID, 10) + ":" + hex.EncodeToString(sum[:8])
}
