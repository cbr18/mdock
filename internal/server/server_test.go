package server

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/cbr/mdock/internal/config"
	"github.com/cbr/mdock/internal/store"
)

func TestHealthAndLoginFlow(t *testing.T) {
	ctx := context.Background()
	st, err := store.Open(ctx, t.TempDir())
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer st.Close()
	if err := st.BootstrapUser(ctx, "admin", "secret"); err != nil {
		t.Fatalf("BootstrapUser() error = %v", err)
	}
	srv, err := New(config.Config{SessionTTL: time.Hour}, st, slog.Default())
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	health := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	srv.Handler().ServeHTTP(health, req)
	if health.Code != http.StatusOK {
		t.Fatalf("health status = %d", health.Code)
	}

	body, _ := json.Marshal(map[string]string{"username": "admin", "password": "secret"})
	login := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	srv.Handler().ServeHTTP(login, req)
	if login.Code != http.StatusOK {
		t.Fatalf("login status = %d body=%s", login.Code, login.Body.String())
	}
	cookies := login.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatal("expected session cookie")
	}

	me := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	req.AddCookie(cookies[0])
	srv.Handler().ServeHTTP(me, req)
	if me.Code != http.StatusOK {
		t.Fatalf("me status = %d body=%s", me.Code, me.Body.String())
	}

	vaults := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults", nil)
	req.AddCookie(cookies[0])
	srv.Handler().ServeHTTP(vaults, req)
	if vaults.Code != http.StatusOK {
		t.Fatalf("vaults status = %d body=%s", vaults.Code, vaults.Body.String())
	}
}

func TestRegisterCreateVaultAndWebDAVRoundTrip(t *testing.T) {
	ctx := context.Background()
	st, err := store.Open(ctx, t.TempDir())
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer st.Close()
	srv, err := New(config.Config{
		VaultsRoot:     t.TempDir(),
		GitBin:         "git",
		SessionTTL:     time.Hour,
		CommitDebounce: time.Hour,
		LockTTL:        time.Hour,
	}, st, slog.Default())
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	body, _ := json.Marshal(map[string]string{"username": "alice", "password": "secret"})
	register := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
	srv.Handler().ServeHTTP(register, req)
	if register.Code != http.StatusCreated {
		t.Fatalf("register status = %d body=%s", register.Code, register.Body.String())
	}
	cookies := register.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatal("expected session cookie")
	}

	createBody, _ := json.Marshal(map[string]string{"name": "Work Notes"})
	create := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/vaults", bytes.NewReader(createBody))
	req.AddCookie(cookies[0])
	srv.Handler().ServeHTTP(create, req)
	if create.Code != http.StatusCreated {
		t.Fatalf("create vault status = %d body=%s", create.Code, create.Body.String())
	}
	var createResponse struct {
		Vault store.Vault `json:"vault"`
	}
	if err := json.Unmarshal(create.Body.Bytes(), &createResponse); err != nil {
		t.Fatalf("decode create vault: %v", err)
	}
	if createResponse.Vault.Slug != "work-notes" {
		t.Fatalf("created vault slug = %q", createResponse.Vault.Slug)
	}

	put := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/webdav/work-notes/notes/today.md", strings.NewReader("hello obsidian"))
	req.SetBasicAuth("alice", "secret")
	srv.Handler().ServeHTTP(put, req)
	if put.Code != http.StatusCreated {
		t.Fatalf("webdav put status = %d body=%s", put.Code, put.Body.String())
	}

	get := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/webdav/work-notes/notes/today.md", nil)
	req.SetBasicAuth("alice", "secret")
	srv.Handler().ServeHTTP(get, req)
	if get.Code != http.StatusOK {
		t.Fatalf("webdav get status = %d body=%s", get.Code, get.Body.String())
	}
	if get.Body.String() != "hello obsidian" {
		t.Fatalf("webdav get body = %q", get.Body.String())
	}

	bad := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/webdav/work-notes/.git/config", strings.NewReader("bad"))
	req.SetBasicAuth("alice", "secret")
	srv.Handler().ServeHTTP(bad, req)
	if bad.Code == http.StatusCreated {
		t.Fatal("expected .git write to be rejected")
	}
}
