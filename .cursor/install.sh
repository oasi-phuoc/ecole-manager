#!/usr/bin/env bash
# Idempotent repository bootstrap for the Oasis (Ecole Manager) Cloud Agent
# environment. Installs Node dependencies for both apps and generates a local
# backend .env for development if one does not already exist.
#
# System dependencies (Node.js, PostgreSQL server) are provided by the base
# environment. Runtime services (PostgreSQL, dev servers) are started by
# .cursor/start.sh and the environment "terminals", not here.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Installing backend dependencies"
( cd backend && npm ci )

echo "==> Installing frontend dependencies"
( cd frontend && npm ci )

if [ ! -f backend/.env ]; then
  echo "==> Generating backend/.env for local development"
  cat > backend/.env <<EOF
PORT=5000
NODE_ENV=development

# Local PostgreSQL (see .cursor/start.sh which provisions role + database)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecole_db
DB_USER=ecole
DB_PASSWORD=ecole

# Randomly generated development secrets (never reused in production)
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
DATA_ENCRYPTION_KEY=$(openssl rand -hex 32)

AUTH_COOKIE_NAME=ecole_session
COOKIE_SECURE=false
COOKIE_SAMESITE=Lax
CORS_ORIGIN=

MFA_ISSUER=EcoleManager
MFA_BACKUP_PEPPER=$(openssl rand -hex 16)
EOF
else
  echo "==> backend/.env already present, leaving it untouched"
fi

echo "==> install.sh completed"
