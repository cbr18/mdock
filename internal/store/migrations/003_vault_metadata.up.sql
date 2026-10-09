-- Migration 003: vault_metadata
-- Add vault metadata columns: name, archived, remote_url, last_push_at, last_push_error
-- These were added via ALTER TABLE in the original migration

-- Check and add columns
-- SQLite doesn't support IF NOT EXISTS for ADD COLUMN, so we handle in Go code
-- This file is for reference/documentation