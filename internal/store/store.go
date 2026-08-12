package store

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

type Store struct {
	db *sql.DB
}

type User struct {
	ID       int64
	Login    string
	Password string
}

type Vault struct {
	ID        int64  `json:"id"`
	Slug      string `json:"slug"`
	Kind      string `json:"kind"`
	Path      string `json:"path"`
	Role      string `json:"role,omitempty"`
	CreatedAt string `json:"created_at,omitempty"`
}

const (
	VaultKindPersonal = "personal"
	VaultKindShared   = "shared"

	RoleOwner = "owner"
	RoleWrite = "write"
	RoleRead  = "read"
)

func Open(ctx context.Context, dataDir string) (*Store, error) {
	if err := os.MkdirAll(dataDir, 0o700); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}
	db, err := sql.Open("sqlite", filepath.Join(dataDir, "app.db"))
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	store := &Store{db: db}
	if err := store.init(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return store, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) DB() *sql.DB {
	return s.db
}

func (s *Store) init(ctx context.Context) error {
	statements := []string{
		`PRAGMA journal_mode=WAL;`,
		`PRAGMA foreign_keys=ON;`,
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			login TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			created_at TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS vaults (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			slug TEXT NOT NULL UNIQUE,
			kind TEXT NOT NULL,
			path TEXT NOT NULL UNIQUE,
			created_at TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS vault_members (
			vault_id INTEGER NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			role TEXT NOT NULL,
			created_at TEXT NOT NULL,
			PRIMARY KEY (vault_id, user_id)
		);`,
		`CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			expires_at TEXT NOT NULL,
			created_at TEXT NOT NULL
		);`,
		`DROP TABLE IF EXISTS file_locks;`,
		`CREATE TABLE IF NOT EXISTS file_locks (
			vault_id INTEGER NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
			path TEXT NOT NULL,
			owner TEXT NOT NULL,
			source TEXT NOT NULL,
			expires_at TEXT NOT NULL,
			heartbeat_at TEXT NOT NULL,
			PRIMARY KEY (vault_id, path)
		);`,
	}
	for _, stmt := range statements {
		if _, err := s.db.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("initialize sqlite: %w", err)
		}
	}
	return nil
}

func (s *Store) BootstrapUser(ctx context.Context, login, password string) error {
	user, err := s.GetUserByLogin(ctx, login)
	if err == nil {
		_, err = s.EnsurePersonalVault(ctx, user.ID, user.Login)
		return err
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash bootstrap password: %w", err)
	}
	res, err := s.db.ExecContext(ctx, `INSERT INTO users (login, password_hash, created_at) VALUES (?, ?, ?)`, login, string(hash), time.Now().UTC().Format(time.RFC3339Nano))
	if err != nil {
		return fmt.Errorf("insert bootstrap user: %w", err)
	}
	userID, err := res.LastInsertId()
	if err != nil {
		return fmt.Errorf("bootstrap user id: %w", err)
	}
	_, err = s.EnsurePersonalVault(ctx, userID, login)
	return err
}

func (s *Store) CreateUser(ctx context.Context, login, password string) (User, Vault, error) {
	login = strings.TrimSpace(login)
	if login == "" || password == "" {
		return User{}, Vault{}, fmt.Errorf("login and password are required")
	}
	if _, err := s.GetUserByLogin(ctx, login); err == nil {
		return User{}, Vault{}, ErrUserExists
	} else if !errors.Is(err, sql.ErrNoRows) {
		return User{}, Vault{}, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, Vault{}, fmt.Errorf("hash password: %w", err)
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return User{}, Vault{}, fmt.Errorf("begin create user: %w", err)
	}
	defer tx.Rollback()

	now := time.Now().UTC().Format(time.RFC3339Nano)
	res, err := tx.ExecContext(ctx, `INSERT INTO users (login, password_hash, created_at) VALUES (?, ?, ?)`, login, string(hash), now)
	if err != nil {
		return User{}, Vault{}, fmt.Errorf("insert user: %w", err)
	}
	userID, err := res.LastInsertId()
	if err != nil {
		return User{}, Vault{}, fmt.Errorf("user id: %w", err)
	}
	vault, err := s.createVaultForUserTx(ctx, tx, userID, login, VaultKindPersonal)
	if err != nil {
		return User{}, Vault{}, err
	}
	if err := tx.Commit(); err != nil {
		return User{}, Vault{}, fmt.Errorf("commit create user: %w", err)
	}
	return User{ID: userID, Login: login, Password: string(hash)}, vault, nil
}

func (s *Store) GetUserByLogin(ctx context.Context, login string) (User, error) {
	var user User
	err := s.db.QueryRowContext(ctx, `SELECT id, login, password_hash FROM users WHERE login = ?`, login).Scan(&user.ID, &user.Login, &user.Password)
	if err != nil {
		return User{}, err
	}
	return user, nil
}

func (s *Store) EnsurePersonalVault(ctx context.Context, userID int64, login string) (Vault, error) {
	existing, err := s.PersonalVault(ctx, userID)
	if err == nil {
		return existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return Vault{}, err
	}
	return s.CreateVaultForUser(ctx, userID, login, VaultKindPersonal)
}

func (s *Store) CreateVaultForUser(ctx context.Context, userID int64, name, kind string) (Vault, error) {
	if userID == 0 {
		return Vault{}, fmt.Errorf("user id is required")
	}
	if kind == "" {
		kind = VaultKindShared
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Vault{}, fmt.Errorf("begin create vault: %w", err)
	}
	defer tx.Rollback()
	vault, err := s.createVaultForUserTx(ctx, tx, userID, name, kind)
	if err != nil {
		return Vault{}, err
	}
	if err := tx.Commit(); err != nil {
		return Vault{}, fmt.Errorf("commit create vault: %w", err)
	}
	return vault, nil
}

func (s *Store) PersonalVault(ctx context.Context, userID int64) (Vault, error) {
	var vault Vault
	err := s.db.QueryRowContext(ctx, `
		SELECT vaults.id, vaults.slug, vaults.kind, vaults.path, vault_members.role, vaults.created_at
		FROM vaults
		JOIN vault_members ON vault_members.vault_id = vaults.id
		WHERE vault_members.user_id = ? AND vaults.kind = ?
		ORDER BY vaults.id
		LIMIT 1
	`, userID, VaultKindPersonal).Scan(&vault.ID, &vault.Slug, &vault.Kind, &vault.Path, &vault.Role, &vault.CreatedAt)
	if err != nil {
		return Vault{}, err
	}
	return vault, nil
}

func (s *Store) VaultForUserBySlug(ctx context.Context, userID int64, slug string) (Vault, error) {
	var vault Vault
	err := s.db.QueryRowContext(ctx, `
		SELECT vaults.id, vaults.slug, vaults.kind, vaults.path, vault_members.role, vaults.created_at
		FROM vaults
		JOIN vault_members ON vault_members.vault_id = vaults.id
		WHERE vault_members.user_id = ? AND vaults.slug = ?
		LIMIT 1
	`, userID, slug).Scan(&vault.ID, &vault.Slug, &vault.Kind, &vault.Path, &vault.Role, &vault.CreatedAt)
	if err != nil {
		return Vault{}, err
	}
	return vault, nil
}

func (s *Store) ListVaultsForUser(ctx context.Context, userID int64) ([]Vault, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT vaults.id, vaults.slug, vaults.kind, vaults.path, vault_members.role, vaults.created_at
		FROM vaults
		JOIN vault_members ON vault_members.vault_id = vaults.id
		WHERE vault_members.user_id = ?
		ORDER BY vaults.slug
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list vaults: %w", err)
	}
	defer rows.Close()
	var vaults []Vault
	for rows.Next() {
		var vault Vault
		if err := rows.Scan(&vault.ID, &vault.Slug, &vault.Kind, &vault.Path, &vault.Role, &vault.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan vault: %w", err)
		}
		vaults = append(vaults, vault)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate vaults: %w", err)
	}
	return vaults, nil
}

func (s *Store) ListVaults(ctx context.Context) ([]Vault, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, slug, kind, path, created_at FROM vaults ORDER BY slug`)
	if err != nil {
		return nil, fmt.Errorf("list all vaults: %w", err)
	}
	defer rows.Close()
	var vaults []Vault
	for rows.Next() {
		var vault Vault
		if err := rows.Scan(&vault.ID, &vault.Slug, &vault.Kind, &vault.Path, &vault.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan vault: %w", err)
		}
		vaults = append(vaults, vault)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate all vaults: %w", err)
	}
	return vaults, nil
}

func (s *Store) Authenticate(ctx context.Context, login, password string) (User, error) {
	var user User
	err := s.db.QueryRowContext(ctx, `SELECT id, login, password_hash FROM users WHERE login = ?`, login).Scan(&user.ID, &user.Login, &user.Password)
	if errors.Is(err, sql.ErrNoRows) {
		return User{}, ErrInvalidCredentials
	}
	if err != nil {
		return User{}, fmt.Errorf("select user: %w", err)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return User{}, ErrInvalidCredentials
	}
	return user, nil
}

func (s *Store) CreateSession(ctx context.Context, userID int64, ttl time.Duration) (string, time.Time, error) {
	sessionID, err := randomHex(32)
	if err != nil {
		return "", time.Time{}, err
	}
	now := time.Now().UTC()
	expiresAt := now.Add(ttl)
	_, err = s.db.ExecContext(ctx, `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`, sessionID, userID, expiresAt.Format(time.RFC3339Nano), now.Format(time.RFC3339Nano))
	if err != nil {
		return "", time.Time{}, fmt.Errorf("insert session: %w", err)
	}
	return sessionID, expiresAt, nil
}

func (s *Store) DeleteSession(ctx context.Context, sessionID string) error {
	if sessionID == "" {
		return nil
	}
	if _, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE id = ?`, sessionID); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

func (s *Store) ValidateSession(ctx context.Context, sessionID string) (User, error) {
	var user User
	var expiresRaw string
	err := s.db.QueryRowContext(ctx, `
		SELECT users.id, users.login, users.password_hash, sessions.expires_at
		FROM sessions
		JOIN users ON users.id = sessions.user_id
		WHERE sessions.id = ?
	`, sessionID).Scan(&user.ID, &user.Login, &user.Password, &expiresRaw)
	if errors.Is(err, sql.ErrNoRows) {
		return User{}, ErrInvalidSession
	}
	if err != nil {
		return User{}, fmt.Errorf("select session: %w", err)
	}
	expiresAt, err := time.Parse(time.RFC3339Nano, expiresRaw)
	if err != nil {
		return User{}, fmt.Errorf("parse session expiry: %w", err)
	}
	if time.Now().UTC().After(expiresAt) {
		return User{}, ErrInvalidSession
	}
	return user, nil
}

func (s *Store) JournalMode(ctx context.Context) (string, error) {
	var mode string
	if err := s.db.QueryRowContext(ctx, `PRAGMA journal_mode;`).Scan(&mode); err != nil {
		return "", err
	}
	return mode, nil
}

func randomHex(bytesLen int) (string, error) {
	buf := make([]byte, bytesLen)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("read random bytes: %w", err)
	}
	return hex.EncodeToString(buf), nil
}

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidSession     = errors.New("invalid session")
	ErrUserExists         = errors.New("user already exists")
)

func Slug(input string) string {
	var b []rune
	lastDash := false
	for _, r := range strings.ToLower(input) {
		ok := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9')
		if ok {
			b = append(b, r)
			lastDash = false
			continue
		}
		if !lastDash && len(b) > 0 {
			b = append(b, '-')
			lastDash = true
		}
	}
	for len(b) > 0 && b[len(b)-1] == '-' {
		b = b[:len(b)-1]
	}
	if len(b) == 0 {
		return "vault"
	}
	return string(b)
}

func (s *Store) createVaultForUserTx(ctx context.Context, tx *sql.Tx, userID int64, name, kind string) (Vault, error) {
	base := Slug(name)
	now := time.Now().UTC().Format(time.RFC3339Nano)
	for i := 0; i < 100; i++ {
		slug := base
		if i > 0 {
			slug = fmt.Sprintf("%s-%d", base, i+1)
		}
		res, err := tx.ExecContext(ctx, `INSERT INTO vaults (slug, kind, path, created_at) VALUES (?, ?, ?, ?)`, slug, kind, slug, now)
		if err != nil {
			if strings.Contains(err.Error(), "constraint failed") || strings.Contains(err.Error(), "UNIQUE constraint failed") {
				continue
			}
			return Vault{}, fmt.Errorf("insert vault: %w", err)
		}
		vaultID, err := res.LastInsertId()
		if err != nil {
			return Vault{}, fmt.Errorf("vault id: %w", err)
		}
		if _, err := tx.ExecContext(ctx, `INSERT INTO vault_members (vault_id, user_id, role, created_at) VALUES (?, ?, ?, ?)`, vaultID, userID, RoleOwner, now); err != nil {
			return Vault{}, fmt.Errorf("insert vault membership: %w", err)
		}
		return Vault{ID: vaultID, Slug: slug, Kind: kind, Path: slug, Role: RoleOwner, CreatedAt: now}, nil
	}
	return Vault{}, fmt.Errorf("unique vault slug not available")
}
