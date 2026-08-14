package httpapi

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/cbr/mdock/internal/store"
)

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	rateKey := authRateKey(r, req.Username, "register")
	if !h.app.AllowAuthAttempt(rateKey) {
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "rate_limited"})
		return
	}
	user, item, sessionID, expiresAt, err := h.app.RegisterUser(r.Context(), req.Username, req.Password)
	if errors.Is(err, store.ErrUserExists) {
		h.app.RecordAuthFailure(rateKey)
		writeJSON(w, http.StatusConflict, map[string]string{"error": "user_exists"})
		return
	}
	if err != nil {
		h.app.RecordAuthFailure(rateKey)
		h.logger.Error("register user", "error", err)
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_registration"})
		return
	}
	h.app.ResetAuthFailures(rateKey)
	h.setSessionCookie(w, sessionID, expiresAt)
	h.setCSRFCookie(w, expiresAt)
	writeJSON(w, http.StatusCreated, map[string]any{"status": "ok", "username": user.Login, "vault": item})
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	rateKey := authRateKey(r, req.Username, "login")
	if !h.app.AllowAuthAttempt(rateKey) {
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "rate_limited"})
		return
	}
	session, err := h.app.Login(r.Context(), req.Username, req.Password)
	if errors.Is(err, store.ErrInvalidCredentials) {
		h.app.RecordAuthFailure(rateKey)
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid_credentials"})
		return
	}
	if err != nil {
		h.logger.Error("authenticate user", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
	h.app.ResetAuthFailures(rateKey)
	h.setSessionCookie(w, session.SessionID, session.ExpiresAt)
	h.setCSRFCookie(w, session.ExpiresAt)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "username": session.User.Login})
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{"username": user.Login, "is_admin": user.IsAdmin})
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
	h.clearCSRFCookie(w)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) changeOwnPassword(w http.ResponseWriter, r *http.Request) {
	var req changePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	if req.CurrentPassword == "" || req.NewPassword == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "password_required"})
		return
	}
	user := userFromContext(r.Context())
	if err := h.app.ChangeOwnPassword(r.Context(), user, req.CurrentPassword, req.NewPassword); err != nil {
		if errors.Is(err, store.ErrInvalidCredentials) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid_credentials"})
			return
		}
		h.logger.Error("change own password", "error", err, "user_id", user.ID)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
		return
	}
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

func (h *Handler) setCSRFCookie(w http.ResponseWriter, expiresAt time.Time) {
	token, err := randomToken(32)
	if err != nil {
		h.logger.Error("generate csrf token", "error", err)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     csrfCookieName,
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		SameSite: http.SameSiteLaxMode,
		Secure:   h.app.CookieSecure(),
	})
}

func (h *Handler) clearCSRFCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     csrfCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		SameSite: http.SameSiteLaxMode,
		Secure:   h.app.CookieSecure(),
	})
}

func randomToken(bytesLen int) (string, error) {
	buf := make([]byte, bytesLen)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("read random token: %w", err)
	}
	return hex.EncodeToString(buf), nil
}
