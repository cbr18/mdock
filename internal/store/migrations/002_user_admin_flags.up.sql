-- Migration 002: user_admin_flags
-- Add is_admin and disabled columns to users table if they don't exist
-- These were added via ALTER TABLE in the original migration

-- Check and add is_admin
-- SQLite doesn't support IF NOT EXISTS for ADD COLUMN, so we handle in Go code
-- This file is for reference/documentation