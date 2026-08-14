package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
)

type createVaultRequest struct {
	Name string `json:"name"`
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
