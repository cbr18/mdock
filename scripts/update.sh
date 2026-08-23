#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GITHUB_REPO_URL="${GITHUB_REPO_URL:-https://github.com/cbr18/mdock.git}"
FETCH_SOURCE="${FETCH_SOURCE:-$GITHUB_REPO_URL}"
MODE="apply"
TARGET=""
BRANCH=""
ASSUME_YES="false"

usage() {
  cat <<'EOF'
Usage:
  scripts/update.sh
  scripts/update.sh --check
  scripts/update.sh --apply [--target vX.Y.Z | --branch main] [--yes]

Options:
  --check           Show installed version and latest GitHub tag without changing files.
  --apply           Apply update, then run scripts/deploy-prod.sh.
  --target VERSION  Checkout a specific tag, for example v0.1.0-alpha.1.
  --branch BRANCH   Update from a branch instead of a tag, for example main.
  --yes             Do not prompt before applying.
  --help            Show this help.

Env:
  GITHUB_REPO_URL   GitHub repo used for tag discovery. Default: https://github.com/cbr18/mdock.git
  FETCH_SOURCE      Git remote or URL used for fetch/checkout. Default: GITHUB_REPO_URL

Notes:
  Running without arguments prompts to update from branch main.
  --check never changes files.
  --apply requires a clean git working tree.
  A manually copied untracked scripts/update.sh is ignored for first bootstrap update.
  --apply reuses scripts/deploy-prod.sh, which creates SQL backup before docker compose up.
EOF
}

die() {
  echo "update: $*" >&2
  exit 1
}

log() {
  echo "[update] $*"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check)
      MODE="check"
      shift
      ;;
    --apply)
      MODE="apply"
      shift
      ;;
    --target)
      TARGET="${2:-}"
      [[ -n "$TARGET" ]] || die "--target requires a value"
      shift 2
      ;;
    --branch)
      BRANCH="${2:-}"
      [[ -n "$BRANCH" ]] || die "--branch requires a value"
      shift 2
      ;;
    --yes|-y)
      ASSUME_YES="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      die "unknown option: $1"
      ;;
  esac
done

[[ -n "$TARGET" && -n "$BRANCH" ]] && die "use either --target or --branch, not both"
if [[ "$MODE" == "apply" && -z "$TARGET" && -z "$BRANCH" ]]; then
  BRANCH="main"
fi

cd "$ROOT_DIR"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

require_cmd git
require_cmd sort

current_version() {
  if [[ -f VERSION ]]; then
    tr -d '[:space:]' < VERSION
    return
  fi
  if command -v mdock >/dev/null 2>&1; then
    mdock version
    return
  fi
  echo "unknown"
}

latest_tag() {
  git ls-remote --tags --refs "$GITHUB_REPO_URL" 'v*' 2>/dev/null \
    | awk '{print $2}' \
    | sed 's#refs/tags/##' \
    | sort -V \
    | tail -n 1
}

normalize_version() {
  local value="$1"
  value="${value#v}"
  printf '%s\n' "$value"
}

is_newer() {
  local current="$1"
  local latest="$2"
  [[ "$current" != "$latest" ]] || return 1
  [[ "$(printf '%s\n%s\n' "$current" "$latest" | sort -V | tail -n 1)" == "$latest" ]]
}

ensure_clean_tree() {
  local status
  status="$(git status --porcelain)"
  status="$(printf '%s\n' "$status" | sed '/^?? scripts\/update\.sh$/d')"
  if [[ -n "$status" ]]; then
    printf '%s\n' "$status" >&2
    die "working tree is not clean"
  fi
}

confirm_apply() {
  local ref="$1"
  [[ "$ASSUME_YES" == "true" ]] && return
  read -r -p "Apply update to ${ref} and run production deploy? [y/N] " answer
  case "$answer" in
    y|Y|yes|YES) ;;
    *) die "cancelled" ;;
  esac
}

current="$(current_version)"
latest="$(latest_tag || true)"

log "installed version: $current"
if [[ -n "$latest" ]]; then
  log "latest GitHub tag: $latest"
else
  log "latest GitHub tag: not found"
fi

if [[ "$MODE" == "check" ]]; then
  if [[ -z "$latest" ]]; then
    log "no release tags found; nothing to compare"
    exit 0
  fi
  current_normalized="$(normalize_version "$current")"
  latest_normalized="$(normalize_version "$latest")"
  if is_newer "$current_normalized" "$latest_normalized"; then
    log "update available: $current -> $latest"
  elif [[ "$current_normalized" == "$latest_normalized" ]]; then
    log "up-to-date"
  else
    log "installed version is newer than latest tag"
  fi
  exit 0
fi

if [[ -n "$BRANCH" ]]; then
  ref="branch $BRANCH"
  confirm_apply "$ref"
  ensure_clean_tree
  log "fetching $FETCH_SOURCE $BRANCH"
  git fetch "$FETCH_SOURCE" "$BRANCH"
  git checkout -B "$BRANCH" FETCH_HEAD
elif [[ -n "$TARGET" ]]; then
  ref="$TARGET"
  confirm_apply "$ref"
  ensure_clean_tree
  log "fetching tag $TARGET"
  git fetch "$FETCH_SOURCE" "tag" "$TARGET"
  git checkout --detach "$TARGET"
else
  [[ -n "$latest" ]] || die "no release tags found; use --branch main or --target vX.Y.Z"
  ref="$latest"
  current_normalized="$(normalize_version "$current")"
  latest_normalized="$(normalize_version "$latest")"
  if ! is_newer "$current_normalized" "$latest_normalized"; then
    log "no newer tag to apply"
    exit 0
  fi
  confirm_apply "$ref"
  ensure_clean_tree
  log "fetching tag $latest"
  git fetch "$FETCH_SOURCE" "tag" "$latest"
  git checkout --detach "$latest"
fi

log "running production deploy flow"
"$ROOT_DIR/scripts/deploy-prod.sh"
log "done"
