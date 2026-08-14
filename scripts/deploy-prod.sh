#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

docker compose pull --ignore-pull-failures
docker compose build
docker compose run --rm --no-deps mdock backup-sql --out "${BACKUP_DIR:-/backups}"
docker compose up -d --remove-orphans
docker compose ps
