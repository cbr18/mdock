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
		CommitDebounce: 10 * time.Millisecond,
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

	time.Sleep(100 * time.Millisecond)

	status := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults/work-notes/git/status", nil)
	req.AddCookie(cookies[0])
	srv.Handler().ServeHTTP(status, req)
	if status.Code != http.StatusOK {
		t.Fatalf("git status code = %d body=%s", status.Code, status.Body.String())
	}
	var statusResponse struct {
		Dirty    bool `json:"dirty"`
		QueueLen int  `json:"queue_len"`
	}
	if err := json.Unmarshal(status.Body.Bytes(), &statusResponse); err != nil {
		t.Fatalf("decode git status: %v", err)
	}
	if statusResponse.Dirty || statusResponse.QueueLen != 0 {
		t.Fatalf("unexpected git status: %+v", statusResponse)
	}

	commits := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults/work-notes/git/commits?limit=5", nil)
	req.AddCookie(cookies[0])
	srv.Handler().ServeHTTP(commits, req)
	if commits.Code != http.StatusOK {
		t.Fatalf("git commits code = %d body=%s", commits.Code, commits.Body.String())
	}
	if !strings.Contains(commits.Body.String(), "sync: update 1 file") {
		t.Fatalf("git commits response missing commit subject: %s", commits.Body.String())
	}

	body, _ = json.Marshal(map[string]string{"username": "bob", "password": "secret"})
	otherRegister := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
	srv.Handler().ServeHTTP(otherRegister, req)
	if otherRegister.Code != http.StatusCreated {
		t.Fatalf("register bob status = %d body=%s", otherRegister.Code, otherRegister.Body.String())
	}
	otherCookies := otherRegister.Result().Cookies()
	hidden := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults/work-notes/git/status", nil)
	req.AddCookie(otherCookies[0])
	srv.Handler().ServeHTTP(hidden, req)
	if hidden.Code != http.StatusNotFound {
		t.Fatalf("other user git status code = %d body=%s", hidden.Code, hidden.Body.String())
	}
}
