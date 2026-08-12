package vault

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSafeRelPathAcceptsNormalPath(t *testing.T) {
	got, err := SafeRelPath("notes/today.md")
	if err != nil {
		t.Fatalf("SafeRelPath() error = %v", err)
	}
	if got != "notes/today.md" {
		t.Fatalf("SafeRelPath() = %q", got)
	}
}

func TestServiceFileOperations(t *testing.T) {
	service, err := NewService(t.TempDir())
	if err != nil {
		t.Fatalf("NewService() error = %v", err)
	}
	if err := service.WriteFile("admin", "notes/today.md", []byte("hello")); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
	data, err := service.ReadFile("admin", "notes/today.md")
	if err != nil {
		t.Fatalf("ReadFile() error = %v", err)
	}
	if string(data) != "hello" {
		t.Fatalf("ReadFile() = %q", data)
	}
	entries, err := service.List("admin", "notes")
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if len(entries) != 1 || entries[0].Path != "notes/today.md" {
		t.Fatalf("unexpected entries: %+v", entries)
	}
	if err := service.Rename("admin", "notes/today.md", "notes/tomorrow.md"); err != nil {
		t.Fatalf("Rename() error = %v", err)
	}
	if err := service.Delete("admin", "notes/tomorrow.md"); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
}

func TestServiceRejectsGitAndSymlinkEscape(t *testing.T) {
	root := t.TempDir()
	service, err := NewService(root)
	if err != nil {
		t.Fatalf("NewService() error = %v", err)
	}
	if err := service.WriteFile("admin", ".git/config", []byte("bad")); err == nil {
		t.Fatal("expected .git write error")
	}

	outside := t.TempDir()
	vaultRoot, err := service.EnsureVault("admin")
	if err != nil {
		t.Fatalf("EnsureVault() error = %v", err)
	}
	if err := os.Symlink(outside, filepath.Join(vaultRoot, "link")); err != nil {
		t.Skipf("symlink unavailable: %v", err)
	}
	if err := service.WriteFile("admin", "link/escape.md", []byte("bad")); err == nil {
		t.Fatal("expected symlink escape error")
	}
}

func TestSafeRelPathRejectsTraversalGitAndAbsolute(t *testing.T) {
	for _, input := range []string{"../secret.md", "notes/../../secret.md", "/etc/passwd", ".git/config", "notes/.git/config"} {
		if _, err := SafeRelPath(input); err == nil {
			t.Fatalf("SafeRelPath(%q) expected error", input)
		}
	}
}
