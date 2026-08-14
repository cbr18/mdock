//go:build smoke

package smoke

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestRunningTestStack(t *testing.T) {
	baseURL := getenv("TEST_BASE_URL", "http://127.0.0.1:18080")
	username := getenv("BOOTSTRAP_USERNAME", "admin")
	password := getenv("BOOTSTRAP_PASSWORD", "test-password")

	client := &http.Client{Timeout: 5 * time.Second}
	requireOK(t, client, http.MethodGet, baseURL+"/healthz", nil)

	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("cookiejar.New() error = %v", err)
	}
	client.Jar = jar

	payload, _ := json.Marshal(map[string]string{"username": username, "password": password})
	requireOK(t, client, http.MethodPost, baseURL+"/api/auth/login", bytes.NewReader(payload))
	requireOK(t, client, http.MethodGet, baseURL+"/api/auth/me", nil)
	body := requireOK(t, client, http.MethodGet, baseURL+"/api/vaults", nil)
	var response struct {
		Vaults []struct {
			Name string `json:"name"`
			Slug string `json:"slug"`
			Kind string `json:"kind"`
			Path string `json:"path"`
			Role string `json:"role"`
		} `json:"vaults"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		t.Fatalf("decode vaults response: %v", err)
	}
	if len(response.Vaults) != 1 {
		t.Fatalf("vault count = %d, want 1", len(response.Vaults))
	}
	if response.Vaults[0].Name != username || response.Vaults[0].Slug != username || response.Vaults[0].Kind != "personal" || response.Vaults[0].Role != "owner" {
		t.Fatalf("unexpected personal vault: %+v", response.Vaults[0])
	}

	smokeUsername := "smoke-" + time.Now().UTC().Format("20060102150405")
	smokePassword := "smoke-password"
	payload, _ = json.Marshal(map[string]string{"username": smokeUsername, "password": smokePassword})
	body = requireOK(t, client, http.MethodPost, baseURL+"/api/auth/register", bytes.NewReader(payload))
	var registerResponse struct {
		Vault struct {
			Name string `json:"name"`
			Slug string `json:"slug"`
			Path string `json:"path"`
		} `json:"vault"`
	}
	if err := json.Unmarshal(body, &registerResponse); err != nil {
		t.Fatalf("decode register response: %v", err)
	}
	if registerResponse.Vault.Slug == "" {
		t.Fatal("registered personal vault slug is empty")
	}
	if registerResponse.Vault.Name != smokeUsername {
		t.Fatalf("registered personal vault name = %q, want %q", registerResponse.Vault.Name, smokeUsername)
	}
	if registerResponse.Vault.Path == "" || registerResponse.Vault.Path == registerResponse.Vault.Slug {
		t.Fatalf("registered personal vault path = %q, want stable technical path different from slug %q", registerResponse.Vault.Path, registerResponse.Vault.Slug)
	}

	payload, _ = json.Marshal(map[string]string{"name": "Obsidian Vault"})
	body = requireOK(t, client, http.MethodPost, baseURL+"/api/vaults", bytes.NewReader(payload))
	var createResponse struct {
		Vault struct {
			Name string `json:"name"`
			Slug string `json:"slug"`
			Path string `json:"path"`
		} `json:"vault"`
	}
	if err := json.Unmarshal(body, &createResponse); err != nil {
		t.Fatalf("decode create vault response: %v", err)
	}
	if createResponse.Vault.Slug == "" {
		t.Fatal("created vault slug is empty")
	}
	if createResponse.Vault.Name != "Obsidian Vault" {
		t.Fatalf("created vault name = %q, want Obsidian Vault", createResponse.Vault.Name)
	}
	if createResponse.Vault.Path == "" || createResponse.Vault.Path == createResponse.Vault.Slug {
		t.Fatalf("created vault path = %q, want stable technical path different from slug %q", createResponse.Vault.Path, createResponse.Vault.Slug)
	}

	detail := requireOK(t, client, http.MethodGet, baseURL+"/api/vaults/"+createResponse.Vault.Slug, nil)
	if !strings.Contains(string(detail), "/webdav/"+createResponse.Vault.Slug+"/") {
		t.Fatalf("vault detail response missing WebDAV path: %s", string(detail))
	}
	payload, _ = json.Marshal(map[string]string{"name": "Renamed Obsidian Vault"})
	renamed := requireOK(t, client, http.MethodPatch, baseURL+"/api/vaults/"+createResponse.Vault.Slug, bytes.NewReader(payload))
	if !strings.Contains(string(renamed), `"name":"Renamed Obsidian Vault"`) || !strings.Contains(string(renamed), `"slug":"`+createResponse.Vault.Slug+`"`) {
		t.Fatalf("unexpected rename response: %s", string(renamed))
	}
	members := requireOK(t, client, http.MethodGet, baseURL+"/api/vaults/"+createResponse.Vault.Slug+"/members", nil)
	if !strings.Contains(string(members), `"login":"`+smokeUsername+`"`) || !strings.Contains(string(members), `"role":"owner"`) {
		t.Fatalf("unexpected members response: %s", string(members))
	}

	webdavBase := baseURL + "/webdav/" + createResponse.Vault.Slug
	requireWebDAV(t, client, http.MethodOptions, webdavBase+"/", smokeUsername, smokePassword, nil, http.StatusNoContent, "")
	requireWebDAV(t, client, "PROPFIND", webdavBase+"/", smokeUsername, smokePassword, nil, http.StatusMultiStatus, "multistatus")
	requireWebDAV(t, client, "MKCOL", webdavBase+"/notes", smokeUsername, smokePassword, nil, http.StatusCreated, "")
	requireWebDAV(t, client, http.MethodPut, webdavBase+"/notes/today.md", smokeUsername, smokePassword, strings.NewReader("hello from obsidian"), http.StatusCreated, "")
	requireWebDAV(t, client, http.MethodGet, webdavBase+"/notes/today.md", smokeUsername, smokePassword, nil, http.StatusOK, "hello from obsidian")
	req := newWebDAVRequest(t, "MOVE", webdavBase+"/notes/today.md", smokeUsername, smokePassword, nil)
	req.Header.Set("Destination", webdavBase+"/notes/tomorrow.md")
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("MOVE %s error = %v", webdavBase, err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("MOVE status = %d", resp.StatusCode)
	}
	requireWebDAV(t, client, http.MethodGet, webdavBase+"/notes/tomorrow.md", smokeUsername, smokePassword, nil, http.StatusOK, "hello from obsidian")
	requireWebDAV(t, client, http.MethodDelete, webdavBase+"/notes/tomorrow.md", smokeUsername, smokePassword, nil, http.StatusNoContent, "")
	requireWebDAV(t, client, http.MethodPut, webdavBase+"/notes/keep.md", smokeUsername, smokePassword, strings.NewReader("kept for git commit"), http.StatusCreated, "")
	time.Sleep(2 * time.Second)
	gitStatusBody := requireOK(t, client, http.MethodGet, baseURL+"/api/vaults/"+createResponse.Vault.Slug+"/git/status", nil)
	var gitStatus struct {
		Dirty    bool `json:"dirty"`
		QueueLen int  `json:"queue_len"`
	}
	if err := json.Unmarshal(gitStatusBody, &gitStatus); err != nil {
		t.Fatalf("decode git status response: %v", err)
	}
	if gitStatus.Dirty || gitStatus.QueueLen != 0 {
		t.Fatalf("unexpected git status after debounce: %+v", gitStatus)
	}
	gitCommitsBody := requireOK(t, client, http.MethodGet, baseURL+"/api/vaults/"+createResponse.Vault.Slug+"/git/commits?limit=5", nil)
	if !strings.Contains(string(gitCommitsBody), "sync: update") {
		t.Fatalf("git commits response missing sync commit: %s", string(gitCommitsBody))
	}

	archived := requireOK(t, client, http.MethodPost, baseURL+"/api/vaults/"+createResponse.Vault.Slug+"/archive", bytes.NewReader(nil))
	if !strings.Contains(string(archived), `"archived":true`) {
		t.Fatalf("archive response missing archived flag: %s", string(archived))
	}
	listAfterArchive := requireOK(t, client, http.MethodGet, baseURL+"/api/vaults", nil)
	if strings.Contains(string(listAfterArchive), `"slug":"`+createResponse.Vault.Slug+`"`) {
		t.Fatalf("archived vault is visible in list: %s", string(listAfterArchive))
	}
	requireWebDAV(t, client, http.MethodGet, webdavBase+"/notes/keep.md", smokeUsername, smokePassword, nil, http.StatusNotFound, "")
	restored := requireOK(t, client, http.MethodPost, baseURL+"/api/vaults/"+createResponse.Vault.Slug+"/unarchive", bytes.NewReader(nil))
	if !strings.Contains(string(restored), `"archived":false`) {
		t.Fatalf("unarchive response missing archived flag: %s", string(restored))
	}
}

func TestRemotelySaveWebDAVCompatibility(t *testing.T) {
	baseURL := getenv("TEST_BASE_URL", "http://127.0.0.1:18080")
	adminUsername := getenv("BOOTSTRAP_USERNAME", "admin")
	adminPassword := getenv("BOOTSTRAP_PASSWORD", "test-password")

	client := &http.Client{Timeout: 10 * time.Second}
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("cookiejar.New() error = %v", err)
	}
	client.Jar = jar

	payload, _ := json.Marshal(map[string]string{"username": adminUsername, "password": adminPassword})
	requireOK(t, client, http.MethodPost, baseURL+"/api/auth/login", bytes.NewReader(payload))

	suffix := time.Now().UTC().Format("20060102150405")
	username := "rs-" + suffix
	password := "rs-password"
	payload, _ = json.Marshal(map[string]string{"username": username, "password": password})
	body := requireOK(t, client, http.MethodPost, baseURL+"/api/auth/register", bytes.NewReader(payload))
	var registerResponse struct {
		Vault struct {
			Slug string `json:"slug"`
		} `json:"vault"`
	}
	if err := json.Unmarshal(body, &registerResponse); err != nil {
		t.Fatalf("decode register response: %v", err)
	}
	webdavBase := baseURL + "/webdav/" + registerResponse.Vault.Slug

	requireWebDAV(t, client, http.MethodOptions, webdavBase+"/", username, password, nil, http.StatusNoContent, "")
	requireWebDAV(t, client, "PROPFIND", webdavBase+"/", username, password, nil, http.StatusMultiStatus, "multistatus")

	remoteBaseDir := "Obsidian%20Vault"
	requireWebDAV(t, client, "MKCOL", webdavBase+"/"+remoteBaseDir, username, password, nil, http.StatusCreated, "")
	requireWebDAV(t, client, "PROPFIND", webdavBase+"/"+remoteBaseDir+"/", username, password, nil, http.StatusMultiStatus, "multistatus")

	testDir := remoteBaseDir + "/rs-test-folder-" + suffix
	testFile := testDir + "/rs-test-file-" + suffix
	requireWebDAV(t, client, "MKCOL", webdavBase+"/"+testDir, username, password, nil, http.StatusCreated, "")
	requireWebDAV(t, client, http.MethodPut, webdavBase+"/"+testFile, username, password, bytes.NewReader(bytes.Repeat([]byte{0}, 100)), http.StatusCreated, "")
	requireWebDAV(t, client, http.MethodPut, webdavBase+"/"+testFile, username, password, bytes.NewReader(bytes.Repeat([]byte{1}, 200)), http.StatusNoContent, "")
	download := requireWebDAV(t, client, http.MethodGet, webdavBase+"/"+testFile, username, password, nil, http.StatusOK, "")
	if !bytes.Equal(download, bytes.Repeat([]byte{1}, 200)) {
		t.Fatalf("downloaded overwritten file mismatch: len=%d", len(download))
	}
	requireWebDAV(t, client, http.MethodDelete, webdavBase+"/"+testFile, username, password, nil, http.StatusNoContent, "")
	requireWebDAV(t, client, http.MethodDelete, webdavBase+"/"+testDir, username, password, nil, http.StatusNoContent, "")

	for _, dir := range []string{".obsidian", ".obsidian/plugins", ".obsidian/plugins/remotely-save"} {
		requireWebDAV(t, client, "MKCOL", webdavBase+"/"+remoteBaseDir+"/"+dir, username, password, nil, http.StatusCreated, "")
	}
	requireWebDAVWithHeaders(t, client, http.MethodPut, webdavBase+"/"+remoteBaseDir+"/.obsidian/plugins/remotely-save/manifest.json", username, password, strings.NewReader(`{"id":"remotely-save"}`), http.StatusCreated, "", map[string]string{"X-RS-Test": "custom-header-ok"})
	requireWebDAV(t, client, http.MethodPut, webdavBase+"/"+remoteBaseDir+"/.obsidian/plugins/remotely-save/data.json", username, password, strings.NewReader(`{"sync":"config"}`), http.StatusCreated, "")
	requireWebDAV(t, client, http.MethodPut, webdavBase+"/"+remoteBaseDir+"/.obsidian/bookmarks.json", username, password, strings.NewReader(`[]`), http.StatusCreated, "")

	unicodePath := remoteBaseDir + "/%D0%91%D0%B5%D0%B7%20%D0%BD%D0%B0%D0%B7%D0%B2%D0%B0%D0%BD%D0%B8%D1%8F.md"
	requireWebDAV(t, client, http.MethodPut, webdavBase+"/"+unicodePath, username, password, strings.NewReader("unicode content"), http.StatusCreated, "")
	requireWebDAV(t, client, http.MethodPut, webdavBase+"/"+remoteBaseDir+"/_hidden_loose.md", username, password, strings.NewReader("underscore"), http.StatusCreated, "")
	requireWebDAV(t, client, http.MethodPut, webdavBase+"/"+remoteBaseDir+"/6f4ZALVduD9fQ%3D%3D", username, password, strings.NewReader("opaque"), http.StatusCreated, "")

	propfind := requireWebDAV(t, client, "PROPFIND", webdavBase+"/"+remoteBaseDir+"/", username, password, nil, http.StatusMultiStatus, "")
	for _, expected := range []string{"Obsidian%20Vault", "getlastmodified", "getetag"} {
		if !strings.Contains(string(propfind), expected) {
			t.Fatalf("PROPFIND response missing %q: %s", expected, string(propfind))
		}
	}

	req := newWebDAVRequest(t, "MOVE", webdavBase+"/"+unicodePath, username, password, nil)
	req.Header.Set("Destination", webdavBase+"/"+remoteBaseDir+"/moved.md")
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("MOVE unicode file error = %v", err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("MOVE unicode file status = %d", resp.StatusCode)
	}
	requireWebDAV(t, client, http.MethodGet, webdavBase+"/"+remoteBaseDir+"/moved.md", username, password, nil, http.StatusOK, "unicode content")
	requireWebDAV(t, client, http.MethodDelete, webdavBase+"/"+remoteBaseDir+"/moved.md", username, password, nil, http.StatusNoContent, "")

	customRemoteBaseDir := "Custom%20Remote%20Dir"
	requireWebDAV(t, client, "MKCOL", webdavBase+"/"+customRemoteBaseDir, username, password, nil, http.StatusCreated, "")
	requireWebDAV(t, client, http.MethodPut, webdavBase+"/"+customRemoteBaseDir+"/note.md", username, password, strings.NewReader("custom base"), http.StatusCreated, "")
	requireWebDAV(t, client, http.MethodGet, webdavBase+"/"+customRemoteBaseDir+"/note.md", username, password, nil, http.StatusOK, "custom base")

	for _, origin := range []string{"app://obsidian.md", "capacitor://localhost", "http://localhost"} {
		req, err := http.NewRequest(http.MethodOptions, webdavBase+"/", nil)
		if err != nil {
			t.Fatalf("new CORS request: %v", err)
		}
		req.Header.Set("Origin", origin)
		req.Header.Set("Access-Control-Request-Method", "PROPFIND")
		req.Header.Set("Access-Control-Request-Headers", "authorization,depth,destination,if,lock-token,overwrite,x-rs-test")
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("CORS preflight %s error = %v", origin, err)
		}
		_ = resp.Body.Close()
		if resp.StatusCode != http.StatusNoContent || resp.Header.Get("Access-Control-Allow-Origin") != origin {
			t.Fatalf("CORS preflight %s status=%d allow-origin=%q", origin, resp.StatusCode, resp.Header.Get("Access-Control-Allow-Origin"))
		}
	}

	requireWebDAV(t, client, http.MethodGet, webdavBase+"/", username, "wrong-password", nil, http.StatusUnauthorized, "")
	requireWebDAV(t, client, "PROPFIND", webdavBase+"/.git/", username, password, nil, http.StatusNotFound, "")
	requireWebDAV(t, client, http.MethodPut, webdavBase+"/%2e%2e/escape.md", username, password, strings.NewReader("x"), http.StatusBadRequest, "")
	requireWebDAVWithHeaders(t, client, "PROPFIND", webdavBase+"/"+remoteBaseDir+"/", username, password, nil, http.StatusForbidden, "depth infinity is not supported", map[string]string{"Depth": "infinity"})

	var wg sync.WaitGroup
	errs := make(chan error, 10)
	for i := 1; i <= 5; i++ {
		i := i
		wg.Add(1)
		go func() {
			defer wg.Done()
			req := newWebDAVRequest(t, http.MethodPut, fmt.Sprintf("%s/%s/parallel-%d.md", webdavBase, remoteBaseDir, i), username, password, strings.NewReader(fmt.Sprintf("parallel-%d", i)))
			resp, err := client.Do(req)
			if err != nil {
				errs <- err
				return
			}
			_ = resp.Body.Close()
			if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusNoContent {
				errs <- fmt.Errorf("parallel PUT %d status = %d", i, resp.StatusCode)
			}
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
	for i := 1; i <= 5; i++ {
		requireWebDAV(t, client, http.MethodGet, fmt.Sprintf("%s/%s/parallel-%d.md", webdavBase, remoteBaseDir, i), username, password, nil, http.StatusOK, fmt.Sprintf("parallel-%d", i))
	}
}

func TestAdminUserManagementAPI(t *testing.T) {
	baseURL := getenv("TEST_BASE_URL", "http://127.0.0.1:18080")
	adminUsername := getenv("BOOTSTRAP_USERNAME", "admin")
	adminPassword := getenv("BOOTSTRAP_PASSWORD", "test-password")

	adminClient := newSessionClient(t)
	payload, _ := json.Marshal(map[string]string{"username": adminUsername, "password": adminPassword})
	requireOK(t, adminClient, http.MethodPost, baseURL+"/api/auth/login", bytes.NewReader(payload))

	suffix := time.Now().UTC().Format("20060102150405")
	username := "admin-api-" + suffix
	password := "old-password"
	userClient := newSessionClient(t)
	payload, _ = json.Marshal(map[string]string{"username": username, "password": password})
	requireOK(t, userClient, http.MethodPost, baseURL+"/api/auth/register", bytes.NewReader(payload))

	requireStatus(t, userClient, http.MethodGet, baseURL+"/api/admin/users", nil, http.StatusForbidden)
	users := requireOK(t, adminClient, http.MethodGet, baseURL+"/api/admin/users", nil)
	if strings.Contains(string(users), "password_hash") || strings.Contains(string(users), password) {
		t.Fatalf("admin users leaked password data: %s", string(users))
	}
	if !strings.Contains(string(users), username) {
		t.Fatalf("admin users response missing created user %q: %s", username, string(users))
	}

	payload, _ = json.Marshal(map[string]string{"current_password": password, "new_password": "new-password"})
	requireOK(t, userClient, http.MethodPost, baseURL+"/api/auth/password", bytes.NewReader(payload))
	requireStatus(t, userClient, http.MethodGet, baseURL+"/api/auth/me", nil, http.StatusUnauthorized)
	requireLoginStatus(t, baseURL, username, password, http.StatusUnauthorized)
	requireLoginStatus(t, baseURL, username, "new-password", http.StatusOK)

	requireOK(t, adminClient, http.MethodPost, baseURL+"/api/admin/users/"+username+"/disable", bytes.NewReader(nil))
	requireLoginStatus(t, baseURL, username, "new-password", http.StatusUnauthorized)
	requireOK(t, adminClient, http.MethodPost, baseURL+"/api/admin/users/"+username+"/enable", bytes.NewReader(nil))
	requireLoginStatus(t, baseURL, username, "new-password", http.StatusOK)

	payload, _ = json.Marshal(map[string]string{"password": "admin-reset"})
	requireOK(t, adminClient, http.MethodPost, baseURL+"/api/admin/users/"+username+"/password", bytes.NewReader(payload))
	requireLoginStatus(t, baseURL, username, "new-password", http.StatusUnauthorized)

	revokeClient := newSessionClient(t)
	payload, _ = json.Marshal(map[string]string{"username": username, "password": "admin-reset"})
	requireOK(t, revokeClient, http.MethodPost, baseURL+"/api/auth/login", bytes.NewReader(payload))
	requireOK(t, adminClient, http.MethodPost, baseURL+"/api/admin/users/"+username+"/sessions/revoke", bytes.NewReader(nil))
	requireStatus(t, revokeClient, http.MethodGet, baseURL+"/api/auth/me", nil, http.StatusUnauthorized)
}

func newSessionClient(t *testing.T) *http.Client {
	t.Helper()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("cookiejar.New() error = %v", err)
	}
	return &http.Client{Timeout: 5 * time.Second, Jar: jar}
}

func requireLoginStatus(t *testing.T, baseURL, username, password string, status int) {
	t.Helper()
	client := newSessionClient(t)
	payload, _ := json.Marshal(map[string]string{"username": username, "password": password})
	requireStatus(t, client, http.MethodPost, baseURL+"/api/auth/login", bytes.NewReader(payload), status)
}

func requireStatus(t *testing.T, client *http.Client, method, url string, body *bytes.Reader, status int) []byte {
	t.Helper()
	if body == nil {
		body = bytes.NewReader(nil)
	}
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		t.Fatalf("NewRequest(%s) error = %v", url, err)
	}
	if method == http.MethodPost || method == http.MethodPatch {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("%s %s error = %v", method, url, err)
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if resp.StatusCode != status {
		t.Fatalf("%s %s status = %d want %d body=%s", method, url, resp.StatusCode, status, string(data))
	}
	return data
}

func requireOK(t *testing.T, client *http.Client, method, url string, body *bytes.Reader) []byte {
	t.Helper()
	if body == nil {
		body = bytes.NewReader(nil)
	}
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		t.Fatalf("NewRequest(%s) error = %v", url, err)
	}
	if method == http.MethodPost || method == http.MethodPatch {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("%s %s error = %v", method, url, err)
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		t.Fatalf("%s %s status = %d body=%s", method, url, resp.StatusCode, string(data))
	}
	return data
}

func requireWebDAV(t *testing.T, client *http.Client, method, url, username, password string, body io.Reader, status int, contains string) []byte {
	t.Helper()
	return requireWebDAVWithHeaders(t, client, method, url, username, password, body, status, contains, nil)
}

func requireWebDAVWithHeaders(t *testing.T, client *http.Client, method, url, username, password string, body io.Reader, status int, contains string, headers map[string]string) []byte {
	t.Helper()
	req := newWebDAVRequest(t, method, url, username, password, body)
	if method == "PROPFIND" {
		req.Header.Set("Depth", "1")
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("%s %s error = %v", method, url, err)
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read webdav response body: %v", err)
	}
	if resp.StatusCode != status {
		t.Fatalf("%s %s status = %d want %d body=%s", method, url, resp.StatusCode, status, string(data))
	}
	if contains != "" && !strings.Contains(string(data), contains) {
		t.Fatalf("%s %s body = %q, want contains %q", method, url, string(data), contains)
	}
	return data
}

func newWebDAVRequest(t *testing.T, method, url, username, password string, body io.Reader) *http.Request {
	t.Helper()
	if body == nil {
		body = bytes.NewReader(nil)
	}
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		t.Fatalf("NewRequest(%s) error = %v", url, err)
	}
	req.SetBasicAuth(username, password)
	return req
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
