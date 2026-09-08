#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/test/.env.test.example"

while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    ''|\#*) continue ;;
  esac
  export "$line"
done < "$ENV_FILE"

cd "$ROOT_DIR"
GOCACHE="${GOCACHE:-/tmp/go-cache}" go test -count=1 -tags smoke ./test/smoke
