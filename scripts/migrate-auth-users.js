/**
 * Crée comptes Supabase Auth pour utilisateurs sans auth_user_id
 *
 * Usage: depuis backend/ avec .env.supabase rempli, ou :
 *   powershell -File scripts\run-migrate-auth-users.ps1
 */
const path = require('path');
module.paths.push(path.join(__dirname, '..', 'backend', 'node_modules'));

const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const pool = new Pool(
  process.env.SUPABASE_DB_PASSWORD
    ? {
        host: process.env.SUPABASE_DB_HOST || 'db.qmigexiuiiqmkgyrumtk.supabase.co',
        port: Number(process.env.SUPABASE_DB_PORT || 5432),
        user: process.env.SUPABASE_DB_USER || 'postgres',
        password: process.env.SUPABASE_DB_PASSWORD,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
      }
    : {
        connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false },
      }
);

const TEMP_PASSWORD = process.env.MIGRATE_TEMP_PASSWORD || 'Perdu123+';

async function fixAuthTrigger() {
  await pool.query(`
    CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
      UPDATE public.utilisateurs
      SET auth_user_id = NEW.id
      WHERE LOWER(email) = LOWER(NEW.email);
      RETURN NEW;
    END;
    $$;
  `);
  console.log('Trigger handle_new_auth_user corrigé (UPDATE seulement).');
}

async function findAuthUserByEmail(email) {
  let page = 1;
  const perPage = 1000;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    const match = users.find((x) => (x.email || '').toLowerCase() === email);
    if (match) return match;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function main() {
  await fixAuthTrigger();

  const { rows } = await pool.query(
    `SELECT id, email, nom, prenom, role FROM utilisateurs WHERE auth_user_id IS NULL AND actif = true`
  );

  for (const u of rows) {
    const email = (u.email || '').trim().toLowerCase();
    if (!email || email.includes('@ecole.local')) {
      console.log(`Skip ${u.id} (email local)`);
      continue;
    }

    let authUserId = null;
    const existing = await findAuthUserByEmail(email);
    if (existing) {
      authUserId = existing.id;
      console.log(`Auth existant ${email}`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: TEMP_PASSWORD,
        email_confirm: true,
        user_metadata: { nom: u.nom, prenom: u.prenom, role: u.role, legacy_id: u.id },
      });
      if (error) {
        console.warn(`Erreur ${email}:`, error.message);
        const retry = await findAuthUserByEmail(email);
        if (retry) authUserId = retry.id;
        else continue;
      } else {
        authUserId = data.user.id;
      }
    }

    await pool.query('UPDATE utilisateurs SET auth_user_id = $1 WHERE id = $2', [authUserId, u.id]);
    console.log(`Lié ${email} → ${authUserId}`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
