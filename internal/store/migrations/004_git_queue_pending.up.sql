CREATE TABLE IF NOT EXISTS git_queue_pending (
	vault_id INTEGER NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
	path TEXT NOT NULL,
	source TEXT NOT NULL,
	created_at TEXT NOT NULL,
	PRIMARY KEY (vault_id, path)
);