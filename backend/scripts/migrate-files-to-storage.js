#!/usr/bin/env node
/**
 * Migre les fichiers base64 (DB) vers Supabase Storage.
 * Usage (avec env Render/local) :
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=... node scripts/migrate-files-to-storage.js
 */
require('dotenv').config();
const pool = require('../src/config/database');
const storage = require('../src/services/storageService');

async function migrateTable({ label, selectSql, bucket, pathFn, updateSql }) {
  const { rows } = await pool.query(selectSql);
  console.log(`${label}: ${rows.length} à migrer`);
  let ok = 0;
  for (const row of rows) {
    try {
      if (!row.contenu || !String(row.contenu).startsWith('data:')) {
        console.warn(`  skip id=${row.id} (pas de data URL)`);
        continue;
      }
      const path = pathFn(row);
      await storage.uploadDataUrl(bucket, path, row.contenu);
      await pool.query(updateSql, [path, row.id]);
      ok += 1;
      console.log(`  ✓ ${label} id=${row.id} → ${path}`);
    } catch (err) {
      console.error(`  ✗ ${label} id=${row.id}:`, err.message);
    }
  }
  console.log(`${label}: ${ok}/${rows.length} OK`);
}

(async () => {
  if (!storage.isSupabaseConfigured()) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY requis');
    process.exit(1);
  }
  await storage.ensureBuckets();

  await pool.query(`
    ALTER TABLE documents_eleves ADD COLUMN IF NOT EXISTS storage_path TEXT;
    ALTER TABLE documents_profs ADD COLUMN IF NOT EXISTS storage_path TEXT;
    ALTER TABLE documents_administratifs ADD COLUMN IF NOT EXISTS storage_path TEXT;
    ALTER TABLE eleves ADD COLUMN IF NOT EXISTS photo_storage_path TEXT;
    ALTER TABLE documents_eleves ALTER COLUMN contenu DROP NOT NULL;
    ALTER TABLE documents_profs ALTER COLUMN contenu DROP NOT NULL;
    ALTER TABLE documents_administratifs ALTER COLUMN contenu DROP NOT NULL;
  `);

  await migrateTable({
    label: 'documents_eleves',
    selectSql: `SELECT id, eleve_id, nom, contenu FROM documents_eleves
                WHERE (storage_path IS NULL OR storage_path = '')
                  AND contenu IS NOT NULL AND length(contenu) > 20`,
    bucket: storage.BUCKETS.documentsEleves,
    pathFn: (r) => `eleves/${r.eleve_id}/${r.id}_${storage.safeFileName(r.nom)}`,
    updateSql: `UPDATE documents_eleves SET storage_path=$1, contenu=NULL WHERE id=$2`,
  });

  await migrateTable({
    label: 'documents_profs',
    selectSql: `SELECT id, prof_id, nom, contenu FROM documents_profs
                WHERE (storage_path IS NULL OR storage_path = '')
                  AND contenu IS NOT NULL AND length(contenu) > 20`,
    bucket: storage.BUCKETS.documentsProfs,
    pathFn: (r) => `profs/${r.prof_id}/${r.id}_${storage.safeFileName(r.nom)}`,
    updateSql: `UPDATE documents_profs SET storage_path=$1, contenu=NULL WHERE id=$2`,
  });

  await migrateTable({
    label: 'documents_administratifs',
    selectSql: `SELECT id, nom_fichier, contenu FROM documents_administratifs
                WHERE (storage_path IS NULL OR storage_path = '')
                  AND contenu IS NOT NULL AND length(contenu) > 20`,
    bucket: storage.BUCKETS.documentsAdmin,
    pathFn: (r) => `admin/${r.id}_${storage.safeFileName(r.nom_fichier)}`,
    updateSql: `UPDATE documents_administratifs SET storage_path=$1, contenu=NULL WHERE id=$2`,
  });

  await migrateTable({
    label: 'eleves.photo',
    selectSql: `SELECT id, photo AS contenu FROM eleves
                WHERE (photo_storage_path IS NULL OR photo_storage_path = '')
                  AND photo IS NOT NULL AND length(photo) > 20`,
    bucket: storage.BUCKETS.elevesPhotos,
    pathFn: (r) => `eleves/${r.id}/photo.jpg`,
    updateSql: `UPDATE eleves SET photo_storage_path=$1, photo=NULL WHERE id=$2`,
  });

  console.log('Migration Storage terminée.');
  await pool.end();
})().catch(async (err) => {
  console.error(err);
  try { await pool.end(); } catch {}
  process.exit(1);
});
