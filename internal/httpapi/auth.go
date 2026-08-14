package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/cbr/mdock/internal/store"
)

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	user, item, sessionID, expiresAt, err := h.app.RegisterUser(r.Context(), req.Username, req.Password)
	if errors.Is(err, store.ErrUserExists) {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "user_exists"})
		return
	}
	if err != nil {
		h.logger.Error("register user", "error", err)
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_registration"})
		return
	}
	h.setSessionCookie(w, sessionID, expiresAt)
	writeJSON(w, http.StatusCreated, map[string]any{"status": "ok", "username": user.Login, "vault": item})
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	session, err := h.app.Login(r.Context(), req.Username, req.Password)
	if errors.Is(err, store.ErrInvalidCredentials) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid_credentials"})
		return
	}
	if err != nil {
		h.logger.Error("authenticate user", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	h.setSessionCookie(w, session.SessionID, session.ExpiresAt)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "username": session.User.Login})
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	writeJSON(w, http.StatusOK, map[string]string{"username": user.Login})
}

func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie("mdock_session"); err == nil {
		if err := h.app.Logout(r.Context(), cookie.Value); err != nil {
			h.logger.Error("delete session", "error", err)
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
		Secure:   h.app.CookieSecure(),
	})
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) setSessionCookie(w http.ResponseWriter, sessionID string, expiresAt time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     "mdock_session",
		Value:    sessionID,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   h.app.CookieSecure(),
	})
}
