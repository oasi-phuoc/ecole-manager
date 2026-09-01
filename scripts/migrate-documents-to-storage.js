/**
 * Migre documents base64 (contenu TEXT) → Supabase Storage
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=... node scripts/migrate-documents-to-storage.js
 */
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function migrateTable(table, bucket, idCol, pathPrefix) {
  const { rows } = await pool.query(
    `SELECT id, ${idCol}, nom, contenu, taille FROM ${table} WHERE contenu IS NOT NULL AND storage_path IS NULL LIMIT 500`
  );
  for (const row of rows) {
    const raw = row.contenu;
    if (!raw || raw.length < 10) continue;
    let buffer;
    if (raw.startsWith('data:')) {
      const base64 = raw.split(',')[1] || '';
      buffer = Buffer.from(base64, 'base64');
    } else {
      buffer = Buffer.from(raw, 'base64');
    }
    const path = `${pathPrefix}/${row[idCol]}/${row.id}_${row.nom || 'file'}`;
    const { error } = await supabase.storage.from(bucket).upload(path, buffer, { upsert: true });
    if (error) {
      console.warn(`Skip ${table}#${row.id}:`, error.message);
      continue;
    }
    await pool.query(`UPDATE ${table} SET storage_path = $1, contenu = NULL WHERE id = $2`, [path, row.id]);
    console.log(`OK ${table}#${row.id}`);
  }
}

async function main() {
  await migrateTable('documents_administratifs', 'documents-admin', 'auteur_id', 'admin');
  await migrateTable('documents_profs', 'documents-profs', 'prof_id', 'profs');
  await migrateTable('documents_eleves', 'documents-eleves', 'eleve_id', 'eleves');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
