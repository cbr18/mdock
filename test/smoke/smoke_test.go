//go:build smoke

package smoke

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/cookiejar"
	"os"
	"strings"
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
			Slug string `json:"slug"`
			Kind string `json:"kind"`
			Role string `json:"role"`
		} `json:"vaults"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		t.Fatalf("decode vaults response: %v", err)
	}
	if len(response.Vaults) != 1 {
		t.Fatalf("vault count = %d, want 1", len(response.Vaults))
	}
	if response.Vaults[0].Slug != username || response.Vaults[0].Kind != "personal" || response.Vaults[0].Role != "owner" {
		t.Fatalf("unexpected personal vault: %+v", response.Vaults[0])
	}

	smokeUsername := "smoke-" + time.Now().UTC().Format("20060102150405")
	smokePassword := "smoke-password"
	payload, _ = json.Marshal(map[string]string{"username": smokeUsername, "password": smokePassword})
	body = requireOK(t, client, http.MethodPost, baseURL+"/api/auth/register", bytes.NewReader(payload))
	var registerResponse struct {
		Vault struct {
			Slug string `json:"slug"`
		} `json:"vault"`
	}
	if err := json.Unmarshal(body, &registerResponse); err != nil {
		t.Fatalf("decode register response: %v", err)
	}
	if registerResponse.Vault.Slug == "" {
		t.Fatal("registered personal vault slug is empty")
	}

	payload, _ = json.Marshal(map[string]string{"name": "Obsidian Vault"})
	body = requireOK(t, client, http.MethodPost, baseURL+"/api/vaults", bytes.NewReader(payload))
	var createResponse struct {
		Vault struct {
			Slug string `json:"slug"`
		} `json:"vault"`
	}
	if err := json.Unmarshal(body, &createResponse); err != nil {
		t.Fatalf("decode create vault response: %v", err)
	}
	if createResponse.Vault.Slug == "" {
		t.Fatal("created vault slug is empty")
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
	if method == http.MethodPost {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("%s %s error = %v", method, url, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		t.Fatalf("%s %s status = %d", method, url, resp.StatusCode)
	}
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	return data
}

func requireWebDAV(t *testing.T, client *http.Client, method, url, username, password string, body io.Reader, status int, contains string) []byte {
	t.Helper()
	req := newWebDAVRequest(t, method, url, username, password, body)
	if method == "PROPFIND" {
		req.Header.Set("Depth", "1")
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
