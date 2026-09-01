/**
 * Export données Render → fichier dump
 * Usage: DATABASE_URL="postgres://..." node scripts/export-render-db.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const url = process.env.DATABASE_URL || process.env.RENDER_DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL ou RENDER_DATABASE_URL requis');
  process.exit(1);
}

const out = path.join(__dirname, '..', 'data', 'ecole-manager.dump');
fs.mkdirSync(path.dirname(out), { recursive: true });

console.log('Export vers', out);
execSync(
  `pg_dump "${url}" --no-owner --no-acl -F c -f "${out}"`,
  { stdio: 'inherit', shell: true }
);
console.log('Export terminé.');
