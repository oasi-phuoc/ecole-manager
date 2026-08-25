#!/usr/bin/env bash
# Per-boot startup for the Oasis (Ecole Manager) Cloud Agent environment.
# Starts the local PostgreSQL cluster, ensures the development role/database
# exist, applies the versioned schema + seed on a fresh database, and returns.
# The backend and frontend dev servers run as environment "terminals".
#
# This script is idempotent: it can run on every boot without duplicating work.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PG_VERSION="$(ls /usr/lib/postgresql 2>/dev/null | sort -n | tail -1 || true)"
PG_VERSION="${PG_VERSION:-16}"

echo "==> Starting PostgreSQL ${PG_VERSION} cluster"
sudo pg_ctlcluster "$PG_VERSION" main start 2>/dev/null || true

echo "==> Waiting for PostgreSQL to accept connections"
for _ in $(seq 1 30); do
  if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
pg_isready -h localhost -p 5432

echo "==> Ensuring development role and database exist"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='ecole'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE ROLE ecole LOGIN PASSWORD 'ecole' CREATEDB;"
fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='ecole_db'" | grep -q 1; then
  sudo -u postgres createdb -O ecole ecole_db
fi

echo "==> Checking schema state"
HAS_SCHEMA="$(PGPASSWORD=ecole psql -h localhost -U ecole -d ecole_db -tAc "SELECT to_regclass('public.utilisateurs') IS NOT NULL")"
if [ "$HAS_SCHEMA" != "t" ]; then
  echo "==> Fresh database: applying versioned migrations + seed"
  for f in $(ls supabase/migrations/*.sql | sort); do
    echo "    - $f"
    PGPASSWORD=ecole psql -h localhost -U ecole -d ecole_db -v ON_ERROR_STOP=1 -q -f "$f"
  done
  PGPASSWORD=ecole psql -h localhost -U ecole -d ecole_db -v ON_ERROR_STOP=1 -q -f supabase/seed.sql
else
  echo "==> Schema already present, skipping migrations"
fi

echo "==> start.sh completed; PostgreSQL is ready on localhost:5432"
