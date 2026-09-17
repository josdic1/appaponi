#!/bin/bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$HOME/Desktop/appoponi-handoff-$(date +%Y%m%d-%H%M%S).tar.gz}"

cd "$ROOT"

rm -f "$OUT"

COPYFILE_DISABLE=1 tar \
  --exclude='.git' \
  --exclude='*/.git' \
  --exclude='node_modules' \
  --exclude='*/node_modules' \
  --exclude='dist' \
  --exclude='*/dist' \
  --exclude='.env' \
  --exclude='*/.env' \
  --exclude='.DS_Store' \
  --exclude='*/.DS_Store' \
  --exclude='._*' \
  --exclude='*/._*' \
  --exclude='*.tar.gz' \
  -czf "$OUT" .

FORBIDDEN="$(
  tar -tzf "$OUT" |
  grep -E '(^|/)\.env$|(^|/)\.DS_Store$|(^|/)\._[^/]*$|(^|/)(node_modules|dist|\.git)(/|$)|\.tar\.gz$' \
  || true
)"

if [[ -n "$FORBIDDEN" ]]; then
  echo "HANDOFF CHECK: FAIL"
  echo "$FORBIDDEN"
  rm -f "$OUT"
  exit 1
fi

echo "HANDOFF CHECK: PASS"
echo "$OUT"
