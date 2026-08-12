package locks

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/cbr/mdock/internal/store"
)

func TestAcquireRejectsDifferentOwnerUntilRelease(t *testing.T) {
	ctx := context.Background()
	st, err := store.Open(ctx, t.TempDir())
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer st.Close()
	if err := st.BootstrapUser(ctx, "admin", "secret"); err != nil {
		t.Fatalf("BootstrapUser() error = %v", err)
	}
	user, err := st.Authenticate(ctx, "admin", "secret")
	if err != nil {
		t.Fatalf("Authenticate() error = %v", err)
	}
	vault, err := st.PersonalVault(ctx, user.ID)
	if err != nil {
		t.Fatalf("PersonalVault() error = %v", err)
	}
	service := NewService(st.DB())

	if _, err := service.Acquire(ctx, vault.ID, "note.md", "editor-1", "web", time.Minute); err != nil {
		t.Fatalf("Acquire() error = %v", err)
	}
	if _, err := service.Acquire(ctx, vault.ID, "note.md", "editor-2", "webdav", time.Minute); !errors.Is(err, ErrLocked) {
		t.Fatalf("Acquire() error = %v, want ErrLocked", err)
	}
	if _, err := service.Acquire(ctx, vault.ID, "other.md", "editor-2", "webdav", time.Minute); err != nil {
		t.Fatalf("Acquire(other file) error = %v", err)
	}
	if err := service.Release(ctx, vault.ID, "note.md", "editor-1"); err != nil {
		t.Fatalf("Release() error = %v", err)
	}
	if _, err := service.Acquire(ctx, vault.ID, "note.md", "editor-2", "webdav", time.Minute); err != nil {
		t.Fatalf("Acquire() after release error = %v", err)
	}
}

func TestLockExpires(t *testing.T) {
	ctx := context.Background()
	st, err := store.Open(ctx, t.TempDir())
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer st.Close()
	if err := st.BootstrapUser(ctx, "admin", "secret"); err != nil {
		t.Fatalf("BootstrapUser() error = %v", err)
	}
	user, err := st.Authenticate(ctx, "admin", "secret")
	if err != nil {
		t.Fatalf("Authenticate() error = %v", err)
	}
	vault, err := st.PersonalVault(ctx, user.ID)
	if err != nil {
		t.Fatalf("PersonalVault() error = %v", err)
	}
	service := NewService(st.DB())

	if _, err := service.Acquire(ctx, vault.ID, "note.md", "editor-1", "web", time.Nanosecond); err != nil {
		t.Fatalf("Acquire() error = %v", err)
	}
	time.Sleep(time.Millisecond)
	if _, err := service.Acquire(ctx, vault.ID, "note.md", "editor-2", "webdav", time.Minute); err != nil {
		t.Fatalf("Acquire() after expiry error = %v", err)
	}
}
