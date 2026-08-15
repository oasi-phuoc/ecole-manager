#!/usr/bin/env bash
# Restore un dump custom-format vers Supabase Postgres.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${OUT_DIR:-$ROOT/tmp/supabase-migration}"
DUMP_FILE="${DUMP_FILE:-$OUT_DIR/latest.dump}"

TARGET_URL="${SUPABASE_DB_URL:-}"
if [[ -z "$TARGET_URL" ]]; then
  echo "Définir SUPABASE_DB_URL (connexion directe db.[ref].supabase.co:5432)." >&2
  exit 1
fi

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "Dump introuvable: $DUMP_FILE (lancer dump-neon-for-supabase.sh d'abord)." >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore introuvable. Installer postgresql-client." >&2
  exit 1
fi

echo "⚠  Restauration vers Supabase (base cible idéalement vide)."
echo "   Cible: ${TARGET_URL%%@*}@***"
read -r -p "Continuer ? [y/N] " ans
[[ "${ans:-}" =~ ^[yY]$ ]] || { echo "Annulé."; exit 0; }

# --no-owner --no-acl : rôles Neon ≠ rôles Supabase
pg_restore \
  --dbname="$TARGET_URL" \
  --no-owner \
  --no-acl \
  --verbose \
  "$DUMP_FILE" || true

echo "OK (vérifier les warnings pg_restore ; les erreurs de rôles sont souvent bénignes)."
echo "Pointer ensuite DATABASE_URL du backend vers le session pooler Supabase."
