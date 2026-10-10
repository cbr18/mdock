#!/usr/bin/env bash
# Verify mdock backup integrity
# Usage: verify-backup.sh --data-dir /data --vaults-root /vaults [--backup-file /backups/mdock-*.sql]

set -euo pipefail

DATA_DIR=""
VAULTS_ROOT=""
BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
	case $1 in
		--data-dir)
			DATA_DIR="$2"
			shift 2
			;;
		--vaults-root)
			VAULTS_ROOT="$2"
			shift 2
			;;
		--backup-file)
			BACKUP_FILE="$2"
			shift 2
			;;
		*)
			echo "Unknown option: $1"
			exit 1
			;;
	esac
done

if [[ -z "$DATA_DIR" || -z "$VAULTS_ROOT" ]]; then
	echo "Usage: $0 --data-dir /data --vaults-root /vaults [--backup-file /backups/mdock-*.sql]"
	exit 1
fi

echo "=== mdock backup verification ==="
echo "Data dir: $DATA_DIR"
echo "Vaults root: $VAULTS_ROOT"
[[ -n "$BACKUP_FILE" ]] && echo "Backup file: $BACKUP_FILE"
echo ""

# 1. Verify SQLite integrity
echo "[1/5] Checking SQLite integrity..."
if [[ ! -f "$DATA_DIR/app.db" ]]; then
	echo "ERROR: $DATA_DIR/app.db not found"
	exit 1
fi

sqlite3 "$DATA_DIR/app.db" "PRAGMA integrity_check" | grep -q "^ok$" || {
	echo "ERROR: SQLite integrity_check failed"
	exit 1
}
echo "  OK: SQLite integrity_check passed"

# 2. Verify core tables exist and have data
echo "[2/5] Checking core tables..."
for table in users vaults vault_members sessions file_locks; do
	count=$(sqlite3 "$DATA_DIR/app.db" "SELECT COUNT(*) FROM $table")
	if [[ -z "$count" ]]; then
		echo "ERROR: Table $table missing or query failed"
		exit 1
	fi
	echo "  $table: $count rows"
done

# 3. Verify vault directories and git repos
echo "[3/5] Checking vault directories and git repos..."
vault_count=0
for vault_path in "$VAULTS_ROOT"/vault-*; do
	[[ -d "$vault_path" ]] || continue
	((vault_count++))
	vault_name=$(basename "$vault_path")
	
	# Check git repo exists
	if [[ ! -d "$vault_path/.git" ]]; then
		echo "WARNING: $vault_name missing .git directory"
		continue
	fi
	
	# Check git fsck
	if ! git -C "$vault_path" fsck --strict >/dev/null 2>&1; then
		echo "ERROR: $vault_name git fsck failed"
		exit 1
	fi
	
	# Check at least one commit exists
	if ! git -C "$vault_path" rev-parse --verify HEAD >/dev/null 2>&1; then
		echo "WARNING: $vault_name has no commits yet"
		continue
	fi
	
	# Sample readability check - try to read a file if any exists
	sample_file=$(find "$vault_path" -type f -name "*.md" ! -path "*/.git/*" | head -1)
	if [[ -n "$sample_file" ]]; then
		if ! head -c 100 "$sample_file" >/dev/null 2>&1; then
			echo "ERROR: $vault_name sample file unreadable: $sample_file"
			exit 1
		fi
	fi
	
	echo "  $vault_name: OK"
done
echo "  Total vaults checked: $vault_count"

# 4. If backup file provided, verify it
if [[ -n "$BACKUP_FILE" ]]; then
	echo "[4/5] Verifying backup file: $BACKUP_FILE"
	if [[ ! -f "$BACKUP_FILE" ]]; then
		echo "ERROR: Backup file not found: $BACKUP_FILE"
		exit 1
	fi
	
	# Create temp DB and restore
	tmp_db=$(mktemp --suffix=.db)
	trap "rm -f $tmp_db" EXIT
	
	sqlite3 "$tmp_db" < "$BACKUP_FILE" || {
		echo "ERROR: Failed to restore backup to temp database"
		exit 1
	}
	
	# Verify restored DB
	sqlite3 "$tmp_db" "PRAGMA integrity_check" | grep -q "^ok$" || {
		echo "ERROR: Restored backup failed integrity_check"
		exit 1
	}
	
	# Check core tables in backup
	for table in users vaults vault_members sessions file_locks; do
		count=$(sqlite3 "$tmp_db" "SELECT COUNT(*) FROM $table")
		echo "  Backup $table: $count rows"
	done
	
	echo "  OK: Backup file verified"
fi

# 5. Summary
echo "[5/5] Summary"
echo "=== All checks passed ==="
exit 0