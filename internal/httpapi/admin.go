package httpapi

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/cbr/mdock/internal/app"
	"github.com/cbr/mdock/internal/store"
	"github.com/go-chi/chi/v5"
)

type setPasswordRequest struct {
	Password string `json:"password"`
}

type createUserRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type userResponse struct {
	ID       int64  `json:"id"`
	Login    string `json:"login"`
	IsAdmin  bool   `json:"is_admin"`
	Disabled bool   `json:"disabled"`
}

func (h *Handler) adminUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.app.ListUsers(r.Context())
	if err != nil {
		h.logger.Error("admin list users", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	response := make([]userResponse, 0, len(users))
	for _, user := range users {
		response = append(response, userResponse{ID: user.ID, Login: user.Login, IsAdmin: user.IsAdmin, Disabled: user.Disabled})
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": response})
}

func (h *Handler) adminCreateUser(w http.ResponseWriter, r *http.Request) {
	var req createUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	if req.Username == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "login_and_password_required"})
		return
	}
	user, item, err := h.app.CreateUser(r.Context(), req.Username, req.Password)
	if errors.Is(err, store.ErrUserExists) {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "user_exists"})
		return
	}
	if err != nil {
		h.logger.Error("admin create user", "error", err)
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_user"})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"user":  userResponse{ID: user.ID, Login: user.Login, IsAdmin: user.IsAdmin, Disabled: user.Disabled},
		"vault": item,
	})
}

func (h *Handler) adminSetPassword(w http.ResponseWriter, r *http.Request) {
	var req setPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	if req.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "password_required"})
		return
	}
	if err := h.app.SetUserPassword(r.Context(), chi.URLParam(r, "login"), req.Password); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.NotFound(w, r)
			return
		}
		h.logger.Error("admin set password", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) adminDisableUser(w http.ResponseWriter, r *http.Request) {
	h.adminSetUserDisabled(w, r, true)
}

func (h *Handler) adminEnableUser(w http.ResponseWriter, r *http.Request) {
	h.adminSetUserDisabled(w, r, false)
}

func (h *Handler) adminSetUserDisabled(w http.ResponseWriter, r *http.Request, disabled bool) {
	if err := h.app.SetUserDisabled(r.Context(), chi.URLParam(r, "login"), disabled); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.NotFound(w, r)
			return
		}
		if errors.Is(err, app.ErrLastActiveAdmin) {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "last_active_admin"})
			return
		}
		h.logger.Error("admin set user disabled", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) adminRevokeSessions(w http.ResponseWriter, r *http.Request) {
	if err := h.app.RevokeUserSessions(r.Context(), chi.URLParam(r, "login")); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.NotFound(w, r)
			return
		}
		h.logger.Error("admin revoke sessions", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
