package store

import (
	"context"
	"database/sql"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

func BackupSQL(ctx context.Context, dataDir, backupDir string, now time.Time) (string, error) {
	if backupDir == "" {
		backupDir = filepath.Join(dataDir, "backups")
	}
	if err := os.MkdirAll(backupDir, 0o700); err != nil {
		return "", fmt.Errorf("create backup dir: %w", err)
	}
	dbPath := filepath.Join(dataDir, "app.db")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return "", fmt.Errorf("open sqlite for backup: %w", err)
	}
	defer db.Close()
	if err := db.PingContext(ctx); err != nil {
		return "", fmt.Errorf("ping sqlite for backup: %w", err)
	}
	dump, err := dumpSQL(ctx, db)
	if err != nil {
		return "", err
	}
	name := "mdock-" + now.UTC().Format("20060102T150405Z") + ".sql"
	path := filepath.Join(backupDir, name)
	if err := os.WriteFile(path, []byte(dump), 0o600); err != nil {
		return "", fmt.Errorf("write sql backup: %w", err)
	}
	return path, nil
}

func dumpSQL(ctx context.Context, db *sql.DB) (string, error) {
	var out strings.Builder
	out.WriteString("PRAGMA foreign_keys=OFF;\n")
	out.WriteString("BEGIN TRANSACTION;\n")
	tables, err := dumpTables(ctx, db)
	if err != nil {
		return "", err
	}
	for _, table := range tables {
		out.WriteString(table.SQL)
		out.WriteString(";\n")
	}
	for _, table := range tables {
		if err := dumpTableRows(ctx, db, table.Name, &out); err != nil {
			return "", err
		}
	}
	out.WriteString("COMMIT;\n")
	out.WriteString("PRAGMA foreign_keys=ON;\n")
	return out.String(), nil
}

type dumpTable struct {
	Name string
	SQL  string
}

func dumpTables(ctx context.Context, db *sql.DB) ([]dumpTable, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT name, sql
		FROM sqlite_schema
		WHERE type = 'table'
		  AND name NOT LIKE 'sqlite_%'
		  AND sql IS NOT NULL
		ORDER BY name
	`)
	if err != nil {
		return nil, fmt.Errorf("list schema tables: %w", err)
	}
	defer rows.Close()
	var tables []dumpTable
	for rows.Next() {
		var table dumpTable
		if err := rows.Scan(&table.Name, &table.SQL); err != nil {
			return nil, fmt.Errorf("scan schema table: %w", err)
		}
		tables = append(tables, table)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate schema tables: %w", err)
	}
	sort.SliceStable(tables, func(i, j int) bool {
		if tables[i].Name == "users" {
			return true
		}
		if tables[j].Name == "users" {
			return false
		}
		return tables[i].Name < tables[j].Name
	})
	return tables, nil
}

func dumpTableRows(ctx context.Context, db *sql.DB, table string, out *strings.Builder) error {
	rows, err := db.QueryContext(ctx, `SELECT * FROM `+quoteIdent(table))
	if err != nil {
		return fmt.Errorf("select table %s: %w", table, err)
	}
	defer rows.Close()
	cols, err := rows.Columns()
	if err != nil {
		return fmt.Errorf("columns table %s: %w", table, err)
	}
	values := make([]any, len(cols))
	ptrs := make([]any, len(cols))
	for i := range values {
		ptrs[i] = &values[i]
	}
	for rows.Next() {
		if err := rows.Scan(ptrs...); err != nil {
			return fmt.Errorf("scan table %s: %w", table, err)
		}
		out.WriteString("INSERT INTO ")
		out.WriteString(quoteIdent(table))
		out.WriteString(" (")
		for i, col := range cols {
			if i > 0 {
				out.WriteString(", ")
			}
			out.WriteString(quoteIdent(col))
		}
		out.WriteString(") VALUES (")
		for i, value := range values {
			if i > 0 {
				out.WriteString(", ")
			}
			out.WriteString(sqlLiteral(value))
		}
		out.WriteString(");\n")
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate table %s: %w", table, err)
	}
	return nil
}

func quoteIdent(value string) string {
	return `"` + strings.ReplaceAll(value, `"`, `""`) + `"`
}

func sqlLiteral(value any) string {
	switch v := value.(type) {
	case nil:
		return "NULL"
	case int64:
		return strconv.FormatInt(v, 10)
	case float64:
		return strconv.FormatFloat(v, 'g', -1, 64)
	case bool:
		if v {
			return "1"
		}
		return "0"
	case []byte:
		return "X'" + strings.ToUpper(hex.EncodeToString(v)) + "'"
	case string:
		return "'" + strings.ReplaceAll(v, "'", "''") + "'"
	default:
		return "'" + strings.ReplaceAll(fmt.Sprint(v), "'", "''") + "'"
	}
}
