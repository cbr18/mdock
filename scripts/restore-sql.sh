#!/usr/bin/env bash
# Restore mdock SQLite database from backup
# Usage: restore-sql.sh --data-dir /data --backup-file /backups/mdock-*.sql [--yes]

set -euo pipefail

DATA_DIR=""
BACKUP_FILE=""
FORCE=false

while [[ $# -gt 0 ]]; do
	case $1 in
		--data-dir)
			DATA_DIR="$2"
			shift 2
			;;
		--backup-file)
			BACKUP_FILE="$2"
			shift 2
			;;
		--yes)
			FORCE=true
			shift
			;;
		*)
			echo "Unknown option: $1"
			exit 1
			;;
	esac
done

if [[ -z "$DATA_DIR" || -z "$BACKUP_FILE" ]]; then
	echo "Usage: $0 --data-dir /data --backup-file /backups/mdock-*.sql [--yes]"
	exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
	echo "ERROR: Backup file not found: $BACKUP_FILE"
	exit 1
fi

DB_FILE="$DATA_DIR/app.db"
PRE_RESTORE_BACKUP="${DB_FILE}.pre-restore-$(date -u +%Y%m%dT%H%M%SZ)"

echo "=== mdock SQLite restore ==="
echo "Data dir: $DATA_DIR"
echo "Backup file: $BACKUP_FILE"
echo "Current DB: $DB_FILE"
echo ""

# Verify backup file integrity first
echo "[1/5] Verifying backup file..."
tmp_db=$(mktemp --suffix=.db)
trap "rm -f $tmp_db" EXIT

sqlite3 "$tmp_db" < "$BACKUP_FILE" 2>/dev/null || {
	echo "ERROR: Failed to restore backup to temp database (invalid SQL)"
	exit 1
}

sqlite3 "$tmp_db" "PRAGMA integrity_check" 2>/dev/null | grep -q "^ok$" || {
	echo "ERROR: Backup failed integrity_check"
	exit 1
}

# Check core tables exist
for table in users vaults vault_members sessions file_locks; do
	count=$(sqlite3 "$tmp_db" "SELECT COUNT(*) FROM $table" 2>/dev/null || echo "0")
	echo "  Backup $table: $count rows"
done

echo "  OK: Backup file verified"

# Check if mdock is running (try to detect)
echo "[2/5] Checking for running mdock processes..."
if pgrep -f "mdock" >/dev/null 2>&1; then
	echo "WARNING: mdock process detected. Stop mdock before restoring to avoid corruption."
	if [[ "$FORCE" != "true" ]]; then
		echo "Use --yes to force restore anyway"
		exit 1
	fi
fi

# Create pre-restore backup of current DB
echo "[3/5] Creating pre-restore backup of current DB..."
if [[ -f "$DB_FILE" ]]; then
	cp "$DB_FILE" "$PRE_RESTORE_BACKUP"
	echo "  Backed up to: $PRE_RESTORE_BACKUP"
else
	echo "  No existing DB file (fresh restore)"
fi

# Restore from backup
echo "[4/5] Restoring database..."
sqlite3 "$DB_FILE" < "$BACKUP_FILE" || {
	echo "ERROR: Failed to restore backup"
	if [[ -f "$PRE_RESTORE_BACKUP" ]]; then
		echo "Restoring pre-restore backup..."
		cp "$PRE_RESTORE_BACKUP" "$DB_FILE"
	fi
	exit 1
}

# Verify restored DB
echo "[5/5] Verifying restored database..."
sqlite3 "$DB_FILE" "PRAGMA integrity_check" 2>/dev/null | grep -q "^ok$" || {
	echo "ERROR: Restored DB failed integrity_check"
	if [[ -f "$PRE_RESTORE_BACKUP" ]]; then
		echo "Restoring pre-restore backup..."
		cp "$PRE_RESTORE_BACKUP" "$DB_FILE"
	fi
	exit 1
}

for table in users vaults vault_members sessions file_locks; do
	count=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM $table" 2>/dev/null || echo "0")
	echo "  Restored $table: $count rows"
done

echo ""
echo "=== Restore completed successfully ==="
echo "Pre-restore backup saved at: $PRE_RESTORE_BACKUP"
echo ""
echo "Next steps:"
echo "1. Restart mdock: docker compose restart mdock"
echo "2. Verify: curl http://localhost:8080/healthz && curl http://localhost:8080/api/version"
echo "3. If issues: restore from $PRE_RESTORE_BACKUP"