package httpapi

import (
	"context"
	"errors"
	"net/http"

	"github.com/cbr/mdock/internal/store"
)

func (h *Handler) requireSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("mdock_session")
		if err != nil || cookie.Value == "" {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
		user, err := h.app.ValidateSession(r.Context(), cookie.Value)
		if errors.Is(err, store.ErrInvalidSession) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
		if err != nil {
			h.logger.Error("validate session", "error", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal_error"})
			return
		}
		next.ServeHTTP(w, r.WithContext(contextWithUser(r.Context(), user)))
	})
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
