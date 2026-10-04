#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
OUTPUT_DIR="$ROOT_DIR/artifacts"
ARCHIVE_NAME="Line-API-offline-update.tar.gz"
CHECKSUM_NAME="$ARCHIVE_NAME.sha256"

for tool in git tar sha256sum; do
  command -v "$tool" >/dev/null 2>&1 || {
    printf 'Required command not found: %s\n' "$tool" >&2
    exit 1
  }
done

git -C "$ROOT_DIR" rev-parse --verify HEAD >/dev/null 2>&1 || {
  printf 'Run this script from a Git worktree.\n' >&2
  exit 1
}

mapfile -d '' -t PACKAGE_FILES < <(
  git -C "$ROOT_DIR" ls-files -z -- \
    server/package.json \
    server/package-lock.json \
    server/src/ \
    server/test/ \
    server/scripts/hash-admin-password.mjs
)

required_files=(
  server/package.json
  server/package-lock.json
  server/src/index.js
  server/test/signaling.test.js
  server/test/prekeys.test.js
)
for required in "${required_files[@]}"; do
  found=false
  for packaged in "${PACKAGE_FILES[@]}"; do
    [[ "$packaged" == "$required" ]] && found=true
  done
  if [[ "$found" != true || ! -f "$ROOT_DIR/$required" || -L "$ROOT_DIR/$required" ]]; then
    printf 'Required tracked package input is missing or not a regular file: %s\n' "$required" >&2
    exit 1
  fi
done

if grep -Eq '"firebase-admin"[[:space:]]*:' "$ROOT_DIR/server/package.json" \
  || grep -Eq '"(firebase-admin|@firebase/[^\"]+)"[[:space:]]*:' "$ROOT_DIR/server/package-lock.json"; then
  printf 'Firebase Admin dependencies remain in the API package; refusing to build a no-Firebase update.\n' >&2
  exit 1
fi

if ((${#PACKAGE_FILES[@]} == 0)); then
  printf 'No tracked API source files were found.\n' >&2
  exit 1
fi

mkdir -p -- "$OUTPUT_DIR"
stage_dir="$(mktemp -d "${TMPDIR:-/tmp}/line-api-update.XXXXXX")"
temporary_archive="$(mktemp "$OUTPUT_DIR/.${ARCHIVE_NAME}.XXXXXX")"
temporary_checksum=""
cleanup() {
  rm -rf -- "$stage_dir"
  [[ -z "$temporary_archive" ]] || rm -f -- "$temporary_archive"
  [[ -z "$temporary_checksum" ]] || rm -f -- "$temporary_checksum"
}
trap cleanup EXIT

for path in "${PACKAGE_FILES[@]}"; do
  if [[ ! -f "$ROOT_DIR/$path" || -L "$ROOT_DIR/$path" ]]; then
    printf 'Package input is missing or not a regular file: %s\n' "$path" >&2
    exit 1
  fi
  mkdir -p -- "$stage_dir/$(dirname -- "$path")"
  cp -- "$ROOT_DIR/$path" "$stage_dir/$path"
done

revision="$(git -C "$ROOT_DIR" rev-parse --short=12 HEAD)"
if git -C "$ROOT_DIR" diff --quiet HEAD -- "${PACKAGE_FILES[@]}"; then
  tracked_changes=no
else
  tracked_changes=yes
fi
cat > "$stage_dir/API-UPDATE-MANIFEST.txt" <<EOF
Line API source update
Base Git revision: $revision
Tracked packaged files differ from that revision: $tracked_changes
Created (UTC): $(date -u '+%Y-%m-%dT%H:%M:%SZ')

This package contains API source, package metadata, tests and the optional
admin-password hash helper only. It excludes node_modules, server data,
environment files, credentials, runtime configuration and APKs.
EOF

tar -czf "$temporary_archive" -C "$stage_dir" API-UPDATE-MANIFEST.txt "${PACKAGE_FILES[@]}"
if tar -tzf "$temporary_archive" | grep -Eq '(^|/)(node_modules|data|\.env)(/|$)'; then
  printf 'Unexpected runtime data or dependency directory in package.\n' >&2
  exit 1
fi

mv -f -- "$temporary_archive" "$OUTPUT_DIR/$ARCHIVE_NAME"
temporary_archive=""
temporary_checksum="$(mktemp "$OUTPUT_DIR/.${CHECKSUM_NAME}.XXXXXX")"
(
  cd -- "$OUTPUT_DIR"
  sha256sum "$ARCHIVE_NAME" > "$temporary_checksum"
)
mv -f -- "$temporary_checksum" "$OUTPUT_DIR/$CHECKSUM_NAME"
temporary_checksum=""

printf 'Created: %s\n' "$OUTPUT_DIR/$ARCHIVE_NAME"
printf 'SHA-256: %s\n' "$OUTPUT_DIR/$CHECKSUM_NAME"
