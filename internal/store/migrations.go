package store

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type migration struct {
	ID   int
	Name string
	Up   func(context.Context, *sql.DB) error
	Down func(context.Context, *sql.DB) error // optional, can be nil for additive-only
}

var migrations = []migration{
	{
		ID:   1,
		Name: "base_schema",
		Up: func(ctx context.Context, db *sql.DB) error {
			statements := []string{
				`PRAGMA journal_mode=WAL;`,
				`PRAGMA foreign_keys=ON;`,
				`PRAGMA busy_timeout=5000;`,
				`CREATE TABLE IF NOT EXISTS users (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					login TEXT NOT NULL UNIQUE,
					password_hash TEXT NOT NULL,
					is_admin INTEGER NOT NULL DEFAULT 0,
					disabled INTEGER NOT NULL DEFAULT 0,
					created_at TEXT NOT NULL
				);`,
				`CREATE TABLE IF NOT EXISTS vaults (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					name TEXT NOT NULL DEFAULT '',
					slug TEXT NOT NULL UNIQUE,
					kind TEXT NOT NULL,
					path TEXT NOT NULL UNIQUE,
					archived INTEGER NOT NULL DEFAULT 0,
					remote_url TEXT NOT NULL DEFAULT '',
					last_push_at TEXT NOT NULL DEFAULT '',
					last_push_error TEXT NOT NULL DEFAULT '',
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
			return execStatements(ctx, db, statements)
		},
		Down: func(ctx context.Context, db *sql.DB) error {
			// Additive-only migration, no down
			return nil
		},
	},
	{
		ID:   2,
		Name: "user_admin_flags",
		Up: func(ctx context.Context, db *sql.DB) error {
			statements := []string{
				`ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;`,
				`ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0;`,
			}
			return execStatementsIgnoreDuplicateColumns(ctx, db, statements)
		},
		Down: func(ctx context.Context, db *sql.DB) error {
			// Additive-only migration, no down
			return nil
		},
	},
	{
		ID:   3,
		Name: "vault_metadata",
		Up: func(ctx context.Context, db *sql.DB) error {
			statements := []string{
				`ALTER TABLE vaults ADD COLUMN name TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE vaults ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;`,
				`ALTER TABLE vaults ADD COLUMN remote_url TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE vaults ADD COLUMN last_push_at TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE vaults ADD COLUMN last_push_error TEXT NOT NULL DEFAULT '';`,
				`UPDATE vaults SET name = slug WHERE name = '';`,
			}
			return execStatementsIgnoreDuplicateColumns(ctx, db, statements)
		},
	},
	{
		ID:   4,
		Name: "git_queue_pending",
		Up: func(ctx context.Context, db *sql.DB) error {
			statements := []string{
				`CREATE TABLE IF NOT EXISTS git_queue_pending (
					vault_id INTEGER NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
					path TEXT NOT NULL,
					source TEXT NOT NULL,
					created_at TEXT NOT NULL,
					PRIMARY KEY (vault_id, path)
				);`,
			}
			return execStatements(ctx, db, statements)
		},
		Down: func(ctx context.Context, db *sql.DB) error {
			_, err := db.ExecContext(ctx, `DROP TABLE IF EXISTS git_queue_pending`)
			return err
		},
	},
}

func migrate(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, `PRAGMA journal_mode=WAL;`); err != nil {
		return fmt.Errorf("set journal mode: %w", err)
	}
	if _, err := db.ExecContext(ctx, `PRAGMA foreign_keys=ON;`); err != nil {
		return fmt.Errorf("enable foreign keys: %w", err)
	}
	if _, err := db.ExecContext(ctx, `PRAGMA busy_timeout=5000;`); err != nil {
		return fmt.Errorf("set busy timeout: %w", err)
	}
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		id INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	);`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}
	for _, item := range migrations {
		var exists int
		if err := db.QueryRowContext(ctx, `SELECT COUNT(1) FROM schema_migrations WHERE id = ?`, item.ID).Scan(&exists); err != nil {
			return fmt.Errorf("check migration %d: %w", item.ID, err)
		}
		if exists > 0 {
			continue
		}
		if err := item.Up(ctx, db); err != nil {
			return fmt.Errorf("apply migration %d %s: %w", item.ID, item.Name, err)
		}
		if _, err := db.ExecContext(ctx, `INSERT INTO schema_migrations (id, name) VALUES (?, ?)`, item.ID, item.Name); err != nil {
			return fmt.Errorf("record migration %d: %w", item.ID, err)
		}
	}
	return nil
}

// LoadMigrationsFromDir loads migration files from a directory
// Files must be named: {id}_{name}.up.sql and optionally {id}_{name}.down.sql
func LoadMigrationsFromDir(dir string) ([]migration, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read migrations dir: %w", err)
	}

	type migrationFile struct {
		id   int
		name string
		up   string
		down string
	}

	files := make(map[int]*migrationFile)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		// Parse: {id}_{name}.up.sql or {id}_{name}.down.sql
		parts := strings.SplitN(name, "_", 2)
		if len(parts) != 2 {
			continue
		}
		id := 0
		_, err := fmt.Sscanf(parts[0], "%d", &id)
		if err != nil {
			continue
		}
		rest := parts[1]
		if strings.HasSuffix(rest, ".up.sql") {
			mName := strings.TrimSuffix(rest, ".up.sql")
			content, err := os.ReadFile(filepath.Join(dir, name))
			if err != nil {
				return nil, err
			}
			if files[id] == nil {
				files[id] = &migrationFile{id: id, name: mName}
			}
			files[id].up = string(content)
		} else if strings.HasSuffix(rest, ".down.sql") {
			mName := strings.TrimSuffix(rest, ".down.sql")
			content, err := os.ReadFile(filepath.Join(dir, name))
			if err != nil {
				return nil, err
			}
			if files[id] == nil {
				files[id] = &migrationFile{id: id, name: mName}
			}
			files[id].down = string(content)
		}
	}

	// Sort by ID
	ids := make([]int, 0, len(files))
	for id := range files {
		ids = append(ids, id)
	}
	sort.Ints(ids)

	result := make([]migration, 0, len(files))
	for _, id := range ids {
		f := files[id]
		m := migration{
			ID:   id,
			Name: f.name,
			Up: func(ctx context.Context, db *sql.DB) error {
				return execStatements(ctx, db, strings.Split(f.up, ";"))
			},
		}
		if f.down != "" {
			m.Down = func(ctx context.Context, db *sql.DB) error {
				return execStatements(ctx, db, strings.Split(f.down, ";"))
			}
		}
		result = append(result, m)
	}
	return result, nil
}

// GetAppliedMigrations returns list of applied migration IDs
func GetAppliedMigrations(ctx context.Context, db *sql.DB) ([]int, error) {
	rows, err := db.QueryContext(ctx, `SELECT id FROM schema_migrations ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func execStatements(ctx context.Context, db *sql.DB, statements []string) error {
	for _, stmt := range statements {
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}

func execStatementsIgnoreDuplicateColumns(ctx context.Context, db *sql.DB, statements []string) error {
	for _, stmt := range statements {
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "duplicate column") {
				continue
			}
			return err
		}
	}
	return nil
}
