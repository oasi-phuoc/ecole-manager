/**
 * Restore dump vers Supabase Postgres
 * Usage: SUPABASE_DB_URL="postgres://..." node scripts/import-to-supabase.js
 */
const { execSync } = require('child_process');
const path = require('path');

const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const dump = path.join(__dirname, '..', 'data', 'ecole-manager.dump');

if (!url) {
  console.error('SUPABASE_DB_URL requis (connection directe, port 5432)');
  process.exit(1);
}

if (!require('fs').existsSync(dump)) {
  console.error('Dump introuvable:', dump, '— lancer export-render-db.js d\'abord');
  process.exit(1);
}

console.log('Restore depuis', dump);
execSync(
  `pg_restore -d "${url}" --no-owner --no-acl --clean --if-exists "${dump}"`,
  { stdio: 'inherit', shell: true }
);
console.log('Import terminé.');
