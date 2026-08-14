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
	if !strings.Contains(me.Body.String(), `"is_admin":true`) {
		t.Fatalf("me body missing admin flag: %s", me.Body.String())
	}

	vaults := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults", nil)
	req.AddCookie(cookies[0])
	srv.Handler().ServeHTTP(vaults, req)
	if vaults.Code != http.StatusOK {
		t.Fatalf("vaults status = %d body=%s", vaults.Code, vaults.Body.String())
	}
}

func TestAdminUserManagementAPI(t *testing.T) {
	ctx := context.Background()
	st, err := store.Open(ctx, t.TempDir())
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer st.Close()
	if err := st.BootstrapUser(ctx, "admin", "secret"); err != nil {
		t.Fatalf("BootstrapUser() error = %v", err)
	}
	srv, err := New(config.Config{VaultsRoot: t.TempDir(), GitBin: "git", SessionTTL: time.Hour, CommitDebounce: time.Hour, LockTTL: time.Hour}, st, slog.Default())
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	adminCookie := loginCookie(t, srv, "admin", "secret")
	body, _ := json.Marshal(map[string]string{"username": "alice", "password": "old"})
	register := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
	srv.Handler().ServeHTTP(register, req)
	if register.Code != http.StatusCreated {
		t.Fatalf("register status = %d body=%s", register.Code, register.Body.String())
	}
	aliceCookie := register.Result().Cookies()[0]

	forbidden := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/admin/users", nil)
	req.AddCookie(aliceCookie)
	srv.Handler().ServeHTTP(forbidden, req)
	if forbidden.Code != http.StatusForbidden {
		t.Fatalf("non-admin users status = %d body=%s", forbidden.Code, forbidden.Body.String())
	}

	users := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/admin/users", nil)
	req.AddCookie(adminCookie)
	srv.Handler().ServeHTTP(users, req)
	if users.Code != http.StatusOK {
		t.Fatalf("admin users status = %d body=%s", users.Code, users.Body.String())
	}
	if strings.Contains(users.Body.String(), "password_hash") || strings.Contains(users.Body.String(), "old") {
		t.Fatalf("admin users leaked password data: %s", users.Body.String())
	}

	changeOwn := httptest.NewRecorder()
	body, _ = json.Marshal(map[string]string{"current_password": "old", "new_password": "new"})
	req = httptest.NewRequest(http.MethodPost, "/api/auth/password", bytes.NewReader(body))
	req.AddCookie(aliceCookie)
	srv.Handler().ServeHTTP(changeOwn, req)
	if changeOwn.Code != http.StatusOK {
		t.Fatalf("change own password status = %d body=%s", changeOwn.Code, changeOwn.Body.String())
	}
	oldSession := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	req.AddCookie(aliceCookie)
	srv.Handler().ServeHTTP(oldSession, req)
	if oldSession.Code != http.StatusUnauthorized {
		t.Fatalf("old session after password change status = %d body=%s", oldSession.Code, oldSession.Body.String())
	}
	if loginStatus(t, srv, "alice", "old") != http.StatusUnauthorized {
		t.Fatal("old password still works")
	}
	if loginStatus(t, srv, "alice", "new") != http.StatusOK {
		t.Fatal("new password does not work")
	}

	disable := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/admin/users/alice/disable", nil)
	req.AddCookie(adminCookie)
	srv.Handler().ServeHTTP(disable, req)
	if disable.Code != http.StatusOK {
		t.Fatalf("disable status = %d body=%s", disable.Code, disable.Body.String())
	}
	if loginStatus(t, srv, "alice", "new") != http.StatusUnauthorized {
		t.Fatal("disabled user can still login")
	}

	enable := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/admin/users/alice/enable", nil)
	req.AddCookie(adminCookie)
	srv.Handler().ServeHTTP(enable, req)
	if enable.Code != http.StatusOK {
		t.Fatalf("enable status = %d body=%s", enable.Code, enable.Body.String())
	}
	if loginStatus(t, srv, "alice", "new") != http.StatusOK {
		t.Fatal("enabled user cannot login")
	}

	reset := httptest.NewRecorder()
	body, _ = json.Marshal(map[string]string{"password": "admin-reset"})
	req = httptest.NewRequest(http.MethodPost, "/api/admin/users/alice/password", bytes.NewReader(body))
	req.AddCookie(adminCookie)
	srv.Handler().ServeHTTP(reset, req)
	if reset.Code != http.StatusOK {
		t.Fatalf("admin reset password status = %d body=%s", reset.Code, reset.Body.String())
	}
	if loginStatus(t, srv, "alice", "admin-reset") != http.StatusOK {
		t.Fatal("admin-reset password does not work")
	}

	revokeCookie := loginCookie(t, srv, "alice", "admin-reset")
	revoke := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/admin/users/alice/sessions/revoke", nil)
	req.AddCookie(adminCookie)
	srv.Handler().ServeHTTP(revoke, req)
	if revoke.Code != http.StatusOK {
		t.Fatalf("revoke sessions status = %d body=%s", revoke.Code, revoke.Body.String())
	}
	me := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	req.AddCookie(revokeCookie)
	srv.Handler().ServeHTTP(me, req)
	if me.Code != http.StatusUnauthorized {
		t.Fatalf("revoked session me status = %d body=%s", me.Code, me.Body.String())
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

func loginCookie(t *testing.T, srv *Server, username, password string) *http.Cookie {
	t.Helper()
	body, _ := json.Marshal(map[string]string{"username": username, "password": password})
	login := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	srv.Handler().ServeHTTP(login, req)
	if login.Code != http.StatusOK {
		t.Fatalf("login %s status = %d body=%s", username, login.Code, login.Body.String())
	}
	cookies := login.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatalf("login %s returned no cookies", username)
	}
	return cookies[0]
}

func loginStatus(t *testing.T, srv *Server, username, password string) int {
	t.Helper()
	body, _ := json.Marshal(map[string]string{"username": username, "password": password})
	login := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	srv.Handler().ServeHTTP(login, req)
	return login.Code
}
