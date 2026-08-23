package server

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/cbr/mdock/internal/config"
	"github.com/cbr/mdock/internal/store"
	"github.com/cbr/mdock/internal/version"
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
	if health.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatalf("missing security header X-Content-Type-Options: %q", health.Header().Get("X-Content-Type-Options"))
	}

	ready := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/readyz", nil)
	srv.Handler().ServeHTTP(ready, req)
	if ready.Code != http.StatusOK {
		t.Fatalf("ready status = %d body=%s", ready.Code, ready.Body.String())
	}
	if !strings.Contains(ready.Body.String(), `"sqlite":"ok"`) || !strings.Contains(ready.Body.String(), `"vaultsRoot":"ok"`) {
		t.Fatalf("ready body missing checks: %s", ready.Body.String())
	}

	versionResponse := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/version", nil)
	srv.Handler().ServeHTTP(versionResponse, req)
	if versionResponse.Code != http.StatusOK {
		t.Fatalf("version status = %d body=%s", versionResponse.Code, versionResponse.Body.String())
	}
	if !strings.Contains(versionResponse.Body.String(), `"version":"`+version.Current+`"`) {
		t.Fatalf("version body mismatch: %s", versionResponse.Body.String())
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
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(me, req)
	if me.Code != http.StatusOK {
		t.Fatalf("me status = %d body=%s", me.Code, me.Body.String())
	}
	if !strings.Contains(me.Body.String(), `"is_admin":true`) {
		t.Fatalf("me body missing admin flag: %s", me.Body.String())
	}

	vaults := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults", nil)
	addSessionAuth(req, cookies)
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

	adminCookies := loginCookies(t, srv, "admin", "secret")
	body, _ := json.Marshal(map[string]string{"username": "alice", "password": "old"})
	register := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/admin/users", bytes.NewReader(body))
	addSessionAuth(req, adminCookies)
	srv.Handler().ServeHTTP(register, req)
	if register.Code != http.StatusCreated {
		t.Fatalf("admin create user status = %d body=%s", register.Code, register.Body.String())
	}
	aliceCookies := loginCookies(t, srv, "alice", "old")

	forbidden := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/admin/users", nil)
	addSessionAuth(req, aliceCookies)
	srv.Handler().ServeHTTP(forbidden, req)
	if forbidden.Code != http.StatusForbidden {
		t.Fatalf("non-admin users status = %d body=%s", forbidden.Code, forbidden.Body.String())
	}

	users := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/admin/users", nil)
	addSessionAuth(req, adminCookies)
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
	addSessionAuth(req, aliceCookies)
	srv.Handler().ServeHTTP(changeOwn, req)
	if changeOwn.Code != http.StatusOK {
		t.Fatalf("change own password status = %d body=%s", changeOwn.Code, changeOwn.Body.String())
	}
	oldSession := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	addSessionAuth(req, aliceCookies)
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
	addSessionAuth(req, adminCookies)
	srv.Handler().ServeHTTP(disable, req)
	if disable.Code != http.StatusOK {
		t.Fatalf("disable status = %d body=%s", disable.Code, disable.Body.String())
	}
	if loginStatus(t, srv, "alice", "new") != http.StatusUnauthorized {
		t.Fatal("disabled user can still login")
	}

	enable := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/admin/users/alice/enable", nil)
	addSessionAuth(req, adminCookies)
	srv.Handler().ServeHTTP(enable, req)
	if enable.Code != http.StatusOK {
		t.Fatalf("enable status = %d body=%s", enable.Code, enable.Body.String())
	}
	if loginStatus(t, srv, "alice", "new") != http.StatusOK {
		t.Fatal("enabled user cannot login")
	}

	lastAdmin := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/admin/users/admin/disable", nil)
	addSessionAuth(req, adminCookies)
	srv.Handler().ServeHTTP(lastAdmin, req)
	if lastAdmin.Code != http.StatusConflict {
		t.Fatalf("disable last admin status = %d body=%s", lastAdmin.Code, lastAdmin.Body.String())
	}

	reset := httptest.NewRecorder()
	body, _ = json.Marshal(map[string]string{"password": "admin-reset"})
	req = httptest.NewRequest(http.MethodPost, "/api/admin/users/alice/password", bytes.NewReader(body))
	addSessionAuth(req, adminCookies)
	srv.Handler().ServeHTTP(reset, req)
	if reset.Code != http.StatusOK {
		t.Fatalf("admin reset password status = %d body=%s", reset.Code, reset.Body.String())
	}
	if loginStatus(t, srv, "alice", "admin-reset") != http.StatusOK {
		t.Fatal("admin-reset password does not work")
	}

	revokeCookies := loginCookies(t, srv, "alice", "admin-reset")
	revoke := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/admin/users/alice/sessions/revoke", nil)
	addSessionAuth(req, adminCookies)
	srv.Handler().ServeHTTP(revoke, req)
	if revoke.Code != http.StatusOK {
		t.Fatalf("revoke sessions status = %d body=%s", revoke.Code, revoke.Body.String())
	}
	me := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	addSessionAuth(req, revokeCookies)
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

	noCSRF := httptest.NewRecorder()
	createBody, _ := json.Marshal(map[string]string{"name": "No CSRF"})
	req = httptest.NewRequest(http.MethodPost, "/api/vaults", bytes.NewReader(createBody))
	for _, cookie := range cookies {
		req.AddCookie(cookie)
	}
	srv.Handler().ServeHTTP(noCSRF, req)
	if noCSRF.Code != http.StatusForbidden {
		t.Fatalf("missing csrf create vault status = %d body=%s", noCSRF.Code, noCSRF.Body.String())
	}

	createBody, _ = json.Marshal(map[string]string{"name": "Work Notes"})
	create := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/vaults", bytes.NewReader(createBody))
	addSessionAuth(req, cookies)
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

	detail := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults/work-notes", nil)
	req.Host = "notes.example.test"
	req.Header.Set("X-Forwarded-Proto", "https")
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(detail, req)
	if detail.Code != http.StatusOK {
		t.Fatalf("vault detail status = %d body=%s", detail.Code, detail.Body.String())
	}
	if !strings.Contains(detail.Body.String(), `"url":"https://notes.example.test/webdav/work-notes/"`) {
		t.Fatalf("vault detail missing webdav url: %s", detail.Body.String())
	}
	if !strings.Contains(detail.Body.String(), `"default_file_root":"Obsidian Vault"`) {
		t.Fatalf("vault detail missing default file root: %s", detail.Body.String())
	}

	renameBody, _ := json.Marshal(map[string]string{"name": "Renamed Notes"})
	rename := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPatch, "/api/vaults/work-notes", bytes.NewReader(renameBody))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(rename, req)
	if rename.Code != http.StatusOK {
		t.Fatalf("rename vault status = %d body=%s", rename.Code, rename.Body.String())
	}
	if !strings.Contains(rename.Body.String(), `"name":"Renamed Notes"`) || !strings.Contains(rename.Body.String(), `"slug":"work-notes"`) {
		t.Fatalf("unexpected rename response: %s", rename.Body.String())
	}

	members := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults/work-notes/members", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(members, req)
	if members.Code != http.StatusOK {
		t.Fatalf("vault members status = %d body=%s", members.Code, members.Body.String())
	}
	if !strings.Contains(members.Body.String(), `"login":"alice"`) || !strings.Contains(members.Body.String(), `"role":"owner"`) {
		t.Fatalf("unexpected members response: %s", members.Body.String())
	}

	dirBody, _ := json.Marshal(map[string]string{"path": "web"})
	createDir := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/vaults/work-notes/dirs", bytes.NewReader(dirBody))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(createDir, req)
	if createDir.Code != http.StatusCreated {
		t.Fatalf("create directory status = %d body=%s", createDir.Code, createDir.Body.String())
	}
	fileBody, _ := json.Marshal(map[string]string{"path": "web/editor.md", "content": "hello from web"})
	createFile := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/vaults/work-notes/files", bytes.NewReader(fileBody))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(createFile, req)
	if createFile.Code != http.StatusCreated {
		t.Fatalf("create file status = %d body=%s", createFile.Code, createFile.Body.String())
	}
	readFile := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults/work-notes/files/content?path=web/editor.md", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(readFile, req)
	if readFile.Code != http.StatusOK || !strings.Contains(readFile.Body.String(), `"content":"hello from web"`) {
		t.Fatalf("read file status = %d body=%s", readFile.Code, readFile.Body.String())
	}
	listFiles := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults/work-notes/files?path=web", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(listFiles, req)
	if listFiles.Code != http.StatusOK || !strings.Contains(listFiles.Body.String(), `"path":"web/editor.md"`) {
		t.Fatalf("list files status = %d body=%s", listFiles.Code, listFiles.Body.String())
	}
	badPath := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults/work-notes/files/content?path=.git/config", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(badPath, req)
	if badPath.Code != http.StatusBadRequest {
		t.Fatalf(".git file api status = %d body=%s", badPath.Code, badPath.Body.String())
	}
	traversal := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults/work-notes/files/content?path=../escape.md", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(traversal, req)
	if traversal.Code != http.StatusBadRequest {
		t.Fatalf("traversal file api status = %d body=%s", traversal.Code, traversal.Body.String())
	}
	lockBody, _ := json.Marshal(map[string]string{"path": "web/editor.md"})
	lockFile := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/vaults/work-notes/locks", bytes.NewReader(lockBody))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(lockFile, req)
	if lockFile.Code != http.StatusOK {
		t.Fatalf("lock file status = %d body=%s", lockFile.Code, lockFile.Body.String())
	}
	secondAliceCookies := loginCookies(t, srv, "alice", "secret")
	lockedWrite := httptest.NewRecorder()
	body, _ = json.Marshal(map[string]string{"path": "web/editor.md", "content": "blocked"})
	req = httptest.NewRequest(http.MethodPut, "/api/vaults/work-notes/files/content", bytes.NewReader(body))
	addSessionAuth(req, secondAliceCookies)
	srv.Handler().ServeHTTP(lockedWrite, req)
	if lockedWrite.Code != http.StatusLocked {
		t.Fatalf("locked write status = %d body=%s", lockedWrite.Code, lockedWrite.Body.String())
	}
	lockedMoveOtherBody, _ := json.Marshal(map[string]string{"from_path": "web/editor.md", "to_path": "web/blocked-other.md"})
	lockedMoveOther := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPatch, "/api/vaults/work-notes/files/move", bytes.NewReader(lockedMoveOtherBody))
	addSessionAuth(req, secondAliceCookies)
	srv.Handler().ServeHTTP(lockedMoveOther, req)
	if lockedMoveOther.Code != http.StatusLocked {
		t.Fatalf("locked move by other status = %d body=%s", lockedMoveOther.Code, lockedMoveOther.Body.String())
	}
	lockedMoveOwnerBody, _ := json.Marshal(map[string]string{"from_path": "web/editor.md", "to_path": "web/blocked-owner.md"})
	lockedMoveOwner := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPatch, "/api/vaults/work-notes/files/move", bytes.NewReader(lockedMoveOwnerBody))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(lockedMoveOwner, req)
	if lockedMoveOwner.Code != http.StatusLocked {
		t.Fatalf("locked move by owner status = %d body=%s", lockedMoveOwner.Code, lockedMoveOwner.Body.String())
	}
	allowedWrite := httptest.NewRecorder()
	body, _ = json.Marshal(map[string]string{"path": "web/editor.md", "content": "updated by owner"})
	req = httptest.NewRequest(http.MethodPut, "/api/vaults/work-notes/files/content", bytes.NewReader(body))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(allowedWrite, req)
	if allowedWrite.Code != http.StatusOK {
		t.Fatalf("allowed write status = %d body=%s", allowedWrite.Code, allowedWrite.Body.String())
	}
	releaseLock := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodDelete, "/api/vaults/work-notes/locks?path=web/editor.md", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(releaseLock, req)
	if releaseLock.Code != http.StatusOK {
		t.Fatalf("release lock status = %d body=%s", releaseLock.Code, releaseLock.Body.String())
	}
	ownerLockBody, _ := json.Marshal(map[string]string{"path": "web/editor.md", "owner": "tab-a"})
	ownerLock := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/vaults/work-notes/locks", bytes.NewReader(ownerLockBody))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(ownerLock, req)
	if ownerLock.Code != http.StatusOK {
		t.Fatalf("owner lock status = %d body=%s", ownerLock.Code, ownerLock.Body.String())
	}
	sameSessionDifferentOwnerBody, _ := json.Marshal(map[string]string{"path": "web/editor.md", "owner": "tab-b"})
	sameSessionDifferentOwner := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/vaults/work-notes/locks", bytes.NewReader(sameSessionDifferentOwnerBody))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(sameSessionDifferentOwner, req)
	if sameSessionDifferentOwner.Code != http.StatusLocked {
		t.Fatalf("same session different owner lock status = %d body=%s", sameSessionDifferentOwner.Code, sameSessionDifferentOwner.Body.String())
	}
	sameSessionDifferentOwnerWrite := httptest.NewRecorder()
	body, _ = json.Marshal(map[string]string{"path": "web/editor.md", "content": "blocked by tab lock", "owner": "tab-b"})
	req = httptest.NewRequest(http.MethodPut, "/api/vaults/work-notes/files/content", bytes.NewReader(body))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(sameSessionDifferentOwnerWrite, req)
	if sameSessionDifferentOwnerWrite.Code != http.StatusLocked {
		t.Fatalf("same session different owner write status = %d body=%s", sameSessionDifferentOwnerWrite.Code, sameSessionDifferentOwnerWrite.Body.String())
	}
	sameSessionOwnerWrite := httptest.NewRecorder()
	body, _ = json.Marshal(map[string]string{"path": "web/editor.md", "content": "updated by tab owner", "owner": "tab-a"})
	req = httptest.NewRequest(http.MethodPut, "/api/vaults/work-notes/files/content", bytes.NewReader(body))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(sameSessionOwnerWrite, req)
	if sameSessionOwnerWrite.Code != http.StatusOK {
		t.Fatalf("same session owner write status = %d body=%s", sameSessionOwnerWrite.Code, sameSessionOwnerWrite.Body.String())
	}
	releaseOwnerLock := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodDelete, "/api/vaults/work-notes/locks?path=web/editor.md&owner=tab-a", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(releaseOwnerLock, req)
	if releaseOwnerLock.Code != http.StatusOK {
		t.Fatalf("release owner lock status = %d body=%s", releaseOwnerLock.Code, releaseOwnerLock.Body.String())
	}
	nestedDirBody, _ := json.Marshal(map[string]string{"path": "web/locked-dir"})
	nestedDir := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/vaults/work-notes/dirs", bytes.NewReader(nestedDirBody))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(nestedDir, req)
	if nestedDir.Code != http.StatusCreated {
		t.Fatalf("create nested dir status = %d body=%s", nestedDir.Code, nestedDir.Body.String())
	}
	nestedFileBody, _ := json.Marshal(map[string]string{"path": "web/locked-dir/child.md", "content": "nested"})
	nestedFile := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/vaults/work-notes/files", bytes.NewReader(nestedFileBody))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(nestedFile, req)
	if nestedFile.Code != http.StatusCreated {
		t.Fatalf("create nested file status = %d body=%s", nestedFile.Code, nestedFile.Body.String())
	}
	nestedLockBody, _ := json.Marshal(map[string]string{"path": "web/locked-dir/child.md"})
	nestedLock := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/vaults/work-notes/locks", bytes.NewReader(nestedLockBody))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(nestedLock, req)
	if nestedLock.Code != http.StatusOK {
		t.Fatalf("lock nested file status = %d body=%s", nestedLock.Code, nestedLock.Body.String())
	}
	lockedFolderMoveBody, _ := json.Marshal(map[string]string{"from_path": "web/locked-dir", "to_path": "web/locked-dir-moved"})
	lockedFolderMove := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPatch, "/api/vaults/work-notes/files/move", bytes.NewReader(lockedFolderMoveBody))
	addSessionAuth(req, secondAliceCookies)
	srv.Handler().ServeHTTP(lockedFolderMove, req)
	if lockedFolderMove.Code != http.StatusLocked {
		t.Fatalf("locked folder move status = %d body=%s", lockedFolderMove.Code, lockedFolderMove.Body.String())
	}
	releaseNestedLock := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodDelete, "/api/vaults/work-notes/locks?path=web/locked-dir/child.md", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(releaseNestedLock, req)
	if releaseNestedLock.Code != http.StatusOK {
		t.Fatalf("release nested lock status = %d body=%s", releaseNestedLock.Code, releaseNestedLock.Body.String())
	}
	moveFolder := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPatch, "/api/vaults/work-notes/files/move", bytes.NewReader(lockedFolderMoveBody))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(moveFolder, req)
	if moveFolder.Code != http.StatusOK {
		t.Fatalf("move unlocked folder status = %d body=%s", moveFolder.Code, moveFolder.Body.String())
	}
	deleteMovedFolder := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodDelete, "/api/vaults/work-notes/files?path=web/locked-dir-moved", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(deleteMovedFolder, req)
	if deleteMovedFolder.Code != http.StatusOK {
		t.Fatalf("delete moved folder status = %d body=%s", deleteMovedFolder.Code, deleteMovedFolder.Body.String())
	}
	moveBody, _ := json.Marshal(map[string]string{"from_path": "web/editor.md", "to_path": "web/moved.md"})
	moveFile := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPatch, "/api/vaults/work-notes/files/move", bytes.NewReader(moveBody))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(moveFile, req)
	if moveFile.Code != http.StatusOK {
		t.Fatalf("move file status = %d body=%s", moveFile.Code, moveFile.Body.String())
	}
	deleteFile := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodDelete, "/api/vaults/work-notes/files?path=web/moved.md", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(deleteFile, req)
	if deleteFile.Code != http.StatusOK {
		t.Fatalf("delete file status = %d body=%s", deleteFile.Code, deleteFile.Body.String())
	}

	put := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/webdav/work-notes/notes/today.md", strings.NewReader("hello obsidian"))
	req.SetBasicAuth("alice", "secret")
	srv.Handler().ServeHTTP(put, req)
	if put.Code != http.StatusCreated {
		t.Fatalf("webdav put status = %d body=%s", put.Code, put.Body.String())
	}

	mkcolTrailingSlash := httptest.NewRecorder()
	req = httptest.NewRequest("MKCOL", "/webdav/work-notes/Obsidian%20Vault/", nil)
	req.SetBasicAuth("alice", "secret")
	srv.Handler().ServeHTTP(mkcolTrailingSlash, req)
	if mkcolTrailingSlash.Code != http.StatusCreated {
		t.Fatalf("webdav mkcol trailing slash status = %d body=%s", mkcolTrailingSlash.Code, mkcolTrailingSlash.Body.String())
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
	addSessionAuth(req, cookies)
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
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(commits, req)
	if commits.Code != http.StatusOK {
		t.Fatalf("git commits code = %d body=%s", commits.Code, commits.Body.String())
	}
	if !strings.Contains(commits.Body.String(), "sync(webdav): update") && !strings.Contains(commits.Body.String(), "sync(mixed): update") {
		t.Fatalf("git commits response missing commit subject: %s", commits.Body.String())
	}
	if !strings.Contains(commits.Body.String(), "sync(web): update") && !strings.Contains(commits.Body.String(), "sync(mixed): update") {
		t.Fatalf("git commits response missing web commit subject: %s", commits.Body.String())
	}

	badRemoteBody, _ := json.Marshal(map[string]string{"url": "https://user:token@example.test/repo.git"})
	badRemote := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/api/vaults/work-notes/git/remote", bytes.NewReader(badRemoteBody))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(badRemote, req)
	if badRemote.Code != http.StatusBadRequest {
		t.Fatalf("bad remote status = %d body=%s", badRemote.Code, badRemote.Body.String())
	}
	remoteDir := filepath.Join(t.TempDir(), "backup.git")
	if err := exec.Command("git", "init", "--bare", remoteDir).Run(); err != nil {
		t.Fatalf("init bare remote: %v", err)
	}
	remoteBody, _ := json.Marshal(map[string]string{"url": remoteDir})
	setRemote := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/api/vaults/work-notes/git/remote", bytes.NewReader(remoteBody))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(setRemote, req)
	if setRemote.Code != http.StatusOK {
		t.Fatalf("set remote status = %d body=%s", setRemote.Code, setRemote.Body.String())
	}
	pushRemote := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/vaults/work-notes/git/push", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(pushRemote, req)
	if pushRemote.Code != http.StatusOK {
		t.Fatalf("push remote status = %d body=%s", pushRemote.Code, pushRemote.Body.String())
	}
	if out, err := exec.Command("git", "-C", remoteDir, "rev-parse", "--verify", "main").CombinedOutput(); err != nil || strings.TrimSpace(string(out)) == "" {
		t.Fatalf("remote main missing: out=%s err=%v", string(out), err)
	}

	archive := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/vaults/work-notes/archive", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(archive, req)
	if archive.Code != http.StatusOK {
		t.Fatalf("archive vault status = %d body=%s", archive.Code, archive.Body.String())
	}
	if !strings.Contains(archive.Body.String(), `"archived":true`) {
		t.Fatalf("archive response missing archived flag: %s", archive.Body.String())
	}
	archivedList := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(archivedList, req)
	if archivedList.Code != http.StatusOK {
		t.Fatalf("archived list status = %d body=%s", archivedList.Code, archivedList.Body.String())
	}
	if strings.Contains(archivedList.Body.String(), `"slug":"work-notes"`) {
		t.Fatalf("archived vault is visible in list: %s", archivedList.Body.String())
	}
	archiveOnlyList := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults?archived=only", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(archiveOnlyList, req)
	if archiveOnlyList.Code != http.StatusOK || !strings.Contains(archiveOnlyList.Body.String(), `"slug":"work-notes"`) {
		t.Fatalf("archive-only list status = %d body=%s", archiveOnlyList.Code, archiveOnlyList.Body.String())
	}
	badArchiveFilter := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults?archived=bad", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(badArchiveFilter, req)
	if badArchiveFilter.Code != http.StatusBadRequest {
		t.Fatalf("bad archived filter status = %d body=%s", badArchiveFilter.Code, badArchiveFilter.Body.String())
	}
	archivedWebDAV := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/webdav/work-notes/notes/keep.md", nil)
	req.SetBasicAuth("alice", "secret")
	srv.Handler().ServeHTTP(archivedWebDAV, req)
	if archivedWebDAV.Code != http.StatusNotFound {
		t.Fatalf("archived webdav status = %d body=%s", archivedWebDAV.Code, archivedWebDAV.Body.String())
	}
	archivedDetail := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults/work-notes", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(archivedDetail, req)
	if archivedDetail.Code != http.StatusOK || !strings.Contains(archivedDetail.Body.String(), `"archived":true`) {
		t.Fatalf("archived detail status = %d body=%s", archivedDetail.Code, archivedDetail.Body.String())
	}
	unarchive := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/vaults/work-notes/unarchive", nil)
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(unarchive, req)
	if unarchive.Code != http.StatusOK {
		t.Fatalf("unarchive vault status = %d body=%s", unarchive.Code, unarchive.Body.String())
	}
	if !strings.Contains(unarchive.Body.String(), `"archived":false`) {
		t.Fatalf("unarchive response missing archived flag: %s", unarchive.Body.String())
	}

	body, _ = json.Marshal(map[string]string{"username": "bob", "password": "secret"})
	otherRegister := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/admin/users", bytes.NewReader(body))
	addSessionAuth(req, cookies)
	srv.Handler().ServeHTTP(otherRegister, req)
	if otherRegister.Code != http.StatusCreated {
		t.Fatalf("admin create bob status = %d body=%s", otherRegister.Code, otherRegister.Body.String())
	}
	otherCookies := loginCookies(t, srv, "bob", "secret")
	hidden := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults/work-notes/git/status", nil)
	addSessionAuth(req, otherCookies)
	srv.Handler().ServeHTTP(hidden, req)
	if hidden.Code != http.StatusNotFound {
		t.Fatalf("other user git status code = %d body=%s", hidden.Code, hidden.Body.String())
	}
	hiddenDetail := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults/work-notes", nil)
	addSessionAuth(req, otherCookies)
	srv.Handler().ServeHTTP(hiddenDetail, req)
	if hiddenDetail.Code != http.StatusNotFound {
		t.Fatalf("other user vault detail code = %d body=%s", hiddenDetail.Code, hiddenDetail.Body.String())
	}
	hiddenFiles := httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/api/vaults/work-notes/files", nil)
	addSessionAuth(req, otherCookies)
	srv.Handler().ServeHTTP(hiddenFiles, req)
	if hiddenFiles.Code != http.StatusNotFound {
		t.Fatalf("other user file list code = %d body=%s", hiddenFiles.Code, hiddenFiles.Body.String())
	}
}

func TestSetupRegisterCreatesFirstAdminOnly(t *testing.T) {
	ctx := context.Background()
	st, err := store.Open(ctx, t.TempDir())
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer st.Close()
	srv, err := New(config.Config{
		VaultsRoot:      t.TempDir(),
		GitBin:          "git",
		SessionTTL:      time.Hour,
		CommitDebounce:  10 * time.Millisecond,
		LockTTL:         time.Hour,
		FirstAdminToken: "setup-secret",
	}, st, slog.Default())
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}

	body, _ := json.Marshal(map[string]string{"username": "admin", "password": "secret", "setup_token": "wrong"})
	register := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
	srv.Handler().ServeHTTP(register, req)
	if register.Code != http.StatusForbidden {
		t.Fatalf("wrong setup token status = %d body=%s", register.Code, register.Body.String())
	}

	body, _ = json.Marshal(map[string]string{"username": "admin", "password": "secret", "setup_token": "setup-secret"})
	register = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
	srv.Handler().ServeHTTP(register, req)
	if register.Code != http.StatusCreated {
		t.Fatalf("setup register status = %d body=%s", register.Code, register.Body.String())
	}
	if !strings.Contains(register.Body.String(), `"is_admin":true`) {
		t.Fatalf("setup register response missing admin flag: %s", register.Body.String())
	}

	body, _ = json.Marshal(map[string]string{"username": "alice", "password": "secret", "setup_token": "setup-secret"})
	register = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
	srv.Handler().ServeHTTP(register, req)
	if register.Code != http.StatusForbidden {
		t.Fatalf("second public register status = %d body=%s", register.Code, register.Body.String())
	}
}

func TestSecurityMiddlewareAndRateLimit(t *testing.T) {
	ctx := context.Background()
	st, err := store.Open(ctx, t.TempDir())
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer st.Close()
	srv, err := New(config.Config{SessionTTL: time.Hour, APIBodyLimitBytes: 8, AuthRateLimitAttempts: 20, AuthRateLimitWindow: time.Hour}, st, slog.Default())
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	tooLarge := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(`{"username":"large","password":"too-large"}`))
	srv.Handler().ServeHTTP(tooLarge, req)
	if tooLarge.Code >= 200 && tooLarge.Code < 300 {
		t.Fatalf("oversized body status = %d body=%s", tooLarge.Code, tooLarge.Body.String())
	}

	rateStore, err := store.Open(ctx, t.TempDir())
	if err != nil {
		t.Fatalf("Open(rate) error = %v", err)
	}
	defer rateStore.Close()
	if err := rateStore.BootstrapUser(ctx, "admin", "secret"); err != nil {
		t.Fatalf("BootstrapUser() error = %v", err)
	}
	rateSrv, err := New(config.Config{SessionTTL: time.Hour, AuthRateLimitAttempts: 2, AuthRateLimitWindow: time.Hour}, rateStore, slog.Default())
	if err != nil {
		t.Fatalf("New(rate) error = %v", err)
	}
	if loginStatus(t, rateSrv, "admin", "wrong") != http.StatusUnauthorized {
		t.Fatal("first bad login should be unauthorized")
	}
	if loginStatus(t, rateSrv, "admin", "wrong") != http.StatusUnauthorized {
		t.Fatal("second bad login should be unauthorized")
	}
	if loginStatus(t, rateSrv, "admin", "wrong") != http.StatusTooManyRequests {
		t.Fatal("third bad login should be rate limited")
	}
}

func loginCookies(t *testing.T, srv *Server, username, password string) []*http.Cookie {
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
	return cookies
}

func addSessionAuth(req *http.Request, cookies []*http.Cookie) {
	for _, cookie := range cookies {
		req.AddCookie(cookie)
		if cookie.Name == "mdock_csrf" {
			req.Header.Set("X-CSRF-Token", cookie.Value)
		}
	}
}

func loginStatus(t *testing.T, srv *Server, username, password string) int {
	t.Helper()
	body, _ := json.Marshal(map[string]string{"username": username, "password": password})
	login := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	srv.Handler().ServeHTTP(login, req)
	return login.Code
}
