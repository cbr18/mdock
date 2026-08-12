#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/test/.env.test.example"

set -a
source "$ENV_FILE"
set +a

cd "$ROOT_DIR"
GOCACHE="${GOCACHE:-/tmp/go-cache}" go test -count=1 -tags smoke ./test/smoke
