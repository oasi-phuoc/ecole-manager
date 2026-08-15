#!/usr/bin/env bash
# Dump Neon (ou toute Postgres source) pour restauration Supabase.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${OUT_DIR:-$ROOT/tmp/supabase-migration}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="$OUT_DIR/ecole-manager-$STAMP.dump"

SOURCE_URL="${NEON_DATABASE_URL:-${DATABASE_URL:-}}"
if [[ -z "$SOURCE_URL" ]]; then
  echo "Définir NEON_DATABASE_URL (ou DATABASE_URL) vers la base source." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump introuvable. Installer postgresql-client." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
echo "→ Dump custom-format vers $DUMP_FILE"
pg_dump "$SOURCE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --verbose \
  --file="$DUMP_FILE"

# Lien stable pour le script de restore
ln -sfn "$(basename "$DUMP_FILE")" "$OUT_DIR/latest.dump"
echo "OK. Fichier: $DUMP_FILE"
echo "Ensuite: SUPABASE_DB_URL=... ./scripts/restore-to-supabase.sh"
