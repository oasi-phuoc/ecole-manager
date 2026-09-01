/**
 * Crée comptes Supabase Auth pour utilisateurs sans auth_user_id
 * Envoi reset password (recommandé) ou mot de passe temporaire
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=... node scripts/migrate-auth-users.js
 */
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

const TEMP_PASSWORD = process.env.MIGRATE_TEMP_PASSWORD || 'Perdu123+';

async function main() {
  const { rows } = await pool.query(
    `SELECT id, email, nom, prenom, role FROM utilisateurs WHERE auth_user_id IS NULL AND actif = true`
  );
  for (const u of rows) {
    const email = (u.email || '').trim().toLowerCase();
    if (!email || email.includes('@ecole.local')) {
      console.log(`Skip ${u.id} (email local)`);
      continue;
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { nom: u.nom, prenom: u.prenom, role: u.role, legacy_id: u.id },
    });
    if (error) {
      console.warn(`Erreur ${email}:`, error.message);
      continue;
    }
    await pool.query('UPDATE utilisateurs SET auth_user_id = $1 WHERE id = $2', [data.user.id, u.id]);
    console.log(`Lié ${email} → ${data.user.id}`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
