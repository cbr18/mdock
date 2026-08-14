package store

import (
	"context"
	"testing"
	"time"
)

func TestStoreBootstrapAuthenticateAndSession(t *testing.T) {
	ctx := context.Background()
	s, err := Open(ctx, t.TempDir())
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer s.Close()

	mode, err := s.JournalMode(ctx)
	if err != nil {
		t.Fatalf("JournalMode() error = %v", err)
	}
	if mode != "wal" {
		t.Fatalf("journal mode = %q, want wal", mode)
	}

	if err := s.BootstrapUser(ctx, "admin", "secret"); err != nil {
		t.Fatalf("BootstrapUser() error = %v", err)
	}
	user, err := s.Authenticate(ctx, "admin", "secret")
	if err != nil {
		t.Fatalf("Authenticate() error = %v", err)
	}
	if user.Login != "admin" {
		t.Fatalf("user login = %q", user.Login)
	}
	if _, err := s.Authenticate(ctx, "admin", "wrong"); err != ErrInvalidCredentials {
		t.Fatalf("Authenticate(wrong) error = %v", err)
	}

	sessionID, _, err := s.CreateSession(ctx, user.ID, time.Hour)
	if err != nil {
		t.Fatalf("CreateSession() error = %v", err)
	}
	sessionUser, err := s.ValidateSession(ctx, sessionID)
	if err != nil {
		t.Fatalf("ValidateSession() error = %v", err)
	}
	if sessionUser.ID != user.ID {
		t.Fatalf("session user id = %d, want %d", sessionUser.ID, user.ID)
	}

	vault, err := s.PersonalVault(ctx, user.ID)
	if err != nil {
		t.Fatalf("PersonalVault() error = %v", err)
	}
	if vault.Name != "admin" || vault.Slug != "admin" || vault.Kind != VaultKindPersonal || vault.Role != RoleOwner {
		t.Fatalf("unexpected personal vault: %+v", vault)
	}
	if vault.Path == "admin" || vault.Path == "" {
		t.Fatalf("personal vault path = %q, want stable technical path", vault.Path)
	}
}

func TestBootstrapDoesNotOverwriteExistingUser(t *testing.T) {
	ctx := context.Background()
	s, err := Open(ctx, t.TempDir())
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer s.Close()

	if err := s.BootstrapUser(ctx, "admin", "first"); err != nil {
		t.Fatalf("BootstrapUser(first) error = %v", err)
	}
	if err := s.BootstrapUser(ctx, "admin", "second"); err != nil {
		t.Fatalf("BootstrapUser(second) error = %v", err)
	}
	if _, err := s.Authenticate(ctx, "admin", "first"); err != nil {
		t.Fatalf("Authenticate(admin) error = %v", err)
	}
	if _, err := s.Authenticate(ctx, "admin", "second"); err != ErrInvalidCredentials {
		t.Fatalf("Authenticate(admin second password) error = %v", err)
	}

	user, err := s.Authenticate(ctx, "admin", "first")
	if err != nil {
		t.Fatalf("Authenticate(admin) error = %v", err)
	}
	vaults, err := s.ListVaultsForUser(ctx, user.ID)
	if err != nil {
		t.Fatalf("ListVaultsForUser() error = %v", err)
	}
	if len(vaults) != 1 {
		t.Fatalf("vault count = %d, want 1", len(vaults))
	}
}

func TestCreateUserAndVaultSlugCollision(t *testing.T) {
	ctx := context.Background()
	s, err := Open(ctx, t.TempDir())
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer s.Close()

	user, personal, err := s.CreateUser(ctx, "alice", "secret")
	if err != nil {
		t.Fatalf("CreateUser() error = %v", err)
	}
	if personal.Name != "alice" || personal.Slug != "alice" || personal.Kind != VaultKindPersonal {
		t.Fatalf("unexpected personal vault: %+v", personal)
	}
	if personal.Path == "alice" || personal.Path == "" {
		t.Fatalf("personal vault path = %q, want stable technical path", personal.Path)
	}
	if _, _, err := s.CreateUser(ctx, "alice", "secret"); err != ErrUserExists {
		t.Fatalf("CreateUser(duplicate) error = %v", err)
	}
	first, err := s.CreateVaultForUser(ctx, user.ID, "Team Notes", VaultKindShared)
	if err != nil {
		t.Fatalf("CreateVaultForUser(first) error = %v", err)
	}
	second, err := s.CreateVaultForUser(ctx, user.ID, "Team Notes", VaultKindShared)
	if err != nil {
		t.Fatalf("CreateVaultForUser(second) error = %v", err)
	}
	if first.Slug != "team-notes" || second.Slug != "team-notes-2" {
		t.Fatalf("unexpected slugs: %q %q", first.Slug, second.Slug)
	}
	if first.Name != "Team Notes" || second.Name != "Team Notes" {
		t.Fatalf("unexpected names: %q %q", first.Name, second.Name)
	}
	if first.Path == first.Slug || second.Path == second.Slug || first.Path == second.Path {
		t.Fatalf("unexpected paths: %q %q", first.Path, second.Path)
	}
	got, err := s.VaultForUserBySlug(ctx, user.ID, "team-notes")
	if err != nil {
		t.Fatalf("VaultForUserBySlug() error = %v", err)
	}
	if got.ID != first.ID || got.Role != RoleOwner {
		t.Fatalf("unexpected vault lookup: %+v", got)
	}
}

func TestSlug(t *testing.T) {
	tests := map[string]string{
		"Admin":         "admin",
		"John Smith":    "john-smith",
		" notes_root! ": "notes-root",
		"!!!":           "vault",
	}
	for input, want := range tests {
		if got := Slug(input); got != want {
			t.Fatalf("Slug(%q) = %q, want %q", input, got, want)
		}
	}
}
