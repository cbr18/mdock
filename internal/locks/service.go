package locks

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

type Lock struct {
	VaultID   int64
	Path      string
	Owner     string
	Source    string
	ExpiresAt time.Time
}

type Service struct {
	db  *sql.DB
	now func() time.Time
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db, now: time.Now}
}

func (s *Service) Acquire(ctx context.Context, vaultID int64, path, owner, source string, ttl time.Duration) (Lock, error) {
	if vaultID == 0 || path == "" || owner == "" || source == "" {
		return Lock{}, fmt.Errorf("vault id, path, owner and source are required")
	}
	now := s.now().UTC()
	if err := s.cleanupExpired(ctx, now); err != nil {
		return Lock{}, err
	}

	var existing Lock
	var expiresRaw string
	err := s.db.QueryRowContext(ctx, `SELECT vault_id, path, owner, source, expires_at FROM file_locks WHERE vault_id = ? AND path = ?`, vaultID, path).Scan(&existing.VaultID, &existing.Path, &existing.Owner, &existing.Source, &expiresRaw)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return Lock{}, fmt.Errorf("select lock: %w", err)
	}
	if err == nil {
		expiresAt, err := time.Parse(time.RFC3339Nano, expiresRaw)
		if err != nil {
			return Lock{}, fmt.Errorf("parse lock expiry: %w", err)
		}
		if now.Before(expiresAt) && existing.Owner != owner {
			return Lock{}, ErrLocked
		}
	}

	expiresAt := now.Add(ttl)
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO file_locks (vault_id, path, owner, source, expires_at, heartbeat_at)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(vault_id, path) DO UPDATE SET
			owner = excluded.owner,
			source = excluded.source,
			expires_at = excluded.expires_at,
			heartbeat_at = excluded.heartbeat_at
	`, vaultID, path, owner, source, expiresAt.Format(time.RFC3339Nano), now.Format(time.RFC3339Nano))
	if err != nil {
		return Lock{}, fmt.Errorf("upsert lock: %w", err)
	}
	return Lock{VaultID: vaultID, Path: path, Owner: owner, Source: source, ExpiresAt: expiresAt}, nil
}

func (s *Service) Heartbeat(ctx context.Context, vaultID int64, path, owner string, ttl time.Duration) error {
	now := s.now().UTC()
	expiresAt := now.Add(ttl)
	res, err := s.db.ExecContext(ctx, `UPDATE file_locks SET expires_at = ?, heartbeat_at = ? WHERE vault_id = ? AND path = ? AND owner = ?`, expiresAt.Format(time.RFC3339Nano), now.Format(time.RFC3339Nano), vaultID, path, owner)
	if err != nil {
		return fmt.Errorf("heartbeat lock: %w", err)
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("heartbeat rows affected: %w", err)
	}
	if affected == 0 {
		return ErrNotOwner
	}
	return nil
}

func (s *Service) Release(ctx context.Context, vaultID int64, path, owner string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM file_locks WHERE vault_id = ? AND path = ? AND owner = ?`, vaultID, path, owner)
	if err != nil {
		return fmt.Errorf("release lock: %w", err)
	}
	return nil
}

func (s *Service) cleanupExpired(ctx context.Context, now time.Time) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM file_locks WHERE expires_at <= ?`, now.Format(time.RFC3339Nano))
	if err != nil {
		return fmt.Errorf("cleanup expired locks: %w", err)
	}
	return nil
}

var (
	ErrLocked   = fmt.Errorf("file is locked")
	ErrNotOwner = fmt.Errorf("lock owner mismatch")
)
