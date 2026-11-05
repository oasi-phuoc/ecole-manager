/**
 * Réinitialise le mot de passe du compte administrateur principal (prod Supabase).
 *
 * Met à jour `utilisateurs.mot_de_passe` (bcrypt) et, si possible, Supabase Auth.
 *
 * Prérequis : backend/.env.supabase (voir .env.supabase.example)
 *
 * Usage :
 *   node scripts/set-admin-password.js
 *   ADMIN_NEW_PASSWORD=admin123 node scripts/set-admin-password.js
 *
 * Windows :
 *   powershell -File scripts/run-set-admin-password.ps1
 */
const fs = require('fs');
const path = require('path');
module.paths.push(path.join(__dirname, '..', 'backend', 'node_modules'));

const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const root = path.join(__dirname, '..');
const envPath = path.join(root, 'backend', '.env.supabase');

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return false;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (/^\s*#/.test(line) || !line.trim()) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
  return true;
}

function createPool() {
  if (process.env.SUPABASE_DB_PASSWORD) {
    return new Pool({
      host: process.env.SUPABASE_DB_HOST || 'db.qmigexiuiiqmkgyrumtk.supabase.co',
      port: Number(process.env.SUPABASE_DB_PORT || 5432),
      user: process.env.SUPABASE_DB_USER || 'postgres',
      password: process.env.SUPABASE_DB_PASSWORD,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    });
  }
  const cs = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!cs) {
    throw new Error('Remplir SUPABASE_DB_PASSWORD ou DATABASE_URL dans backend/.env.supabase');
  }
  return new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
}

async function findAdminRow(pool) {
  const byIdent = await pool.query(
    `SELECT id, email, identifiant, auth_user_id, mfa_enabled, mfa_exempt
     FROM utilisateurs
     WHERE role = 'admin' AND actif = true AND LOWER(identifiant) = 'admin'
     LIMIT 1`,
  );
  if (byIdent.rows.length) return byIdent.rows[0];

  const byEmail = await pool.query(
    `SELECT id, email, identifiant, auth_user_id, mfa_enabled, mfa_exempt
     FROM utilisateurs
     WHERE role = 'admin' AND actif = true AND LOWER(email) = 'admin@ecole.com'
     LIMIT 1`,
  );
  if (byEmail.rows.length) return byEmail.rows[0];

  const anyAdmin = await pool.query(
    `SELECT id, email, identifiant, auth_user_id, mfa_enabled, mfa_exempt
     FROM utilisateurs
     WHERE role = 'admin' AND actif = true
     ORDER BY id
     LIMIT 1`,
  );
  return anyAdmin.rows[0] || null;
}

async function findAuthUserByEmail(supabase, email) {
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
  if (!loadEnvFile(envPath)) {
    throw new Error(`Fichier manquant : ${envPath} (copier depuis .env.supabase.example)`);
  }

  const plain = String(process.env.ADMIN_NEW_PASSWORD || 'admin123').trim();
  if (!plain) throw new Error('ADMIN_NEW_PASSWORD vide');

  const hash = await bcrypt.hash(plain, 10);
  const pool = createPool();

  try {
    const admin = await findAdminRow(pool);
    if (!admin) {
      throw new Error('Aucun utilisateur actif avec role=admin trouvé');
    }

    await pool.query(
      `UPDATE utilisateurs
       SET mot_de_passe = $1,
           identifiant = COALESCE(NULLIF(TRIM(identifiant), ''), 'admin'),
           actif = true
       WHERE id = $2`,
      [hash, admin.id],
    );

    let authUserId = admin.auth_user_id;
    const email = (admin.email || '').trim().toLowerCase();

    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && email && !email.includes('@ecole.local')) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      if (!authUserId) {
        const existing = await findAuthUserByEmail(supabase, email);
        if (existing) {
          authUserId = existing.id;
        } else {
          const { data, error } = await supabase.auth.admin.createUser({
            email,
            password: plain,
            email_confirm: true,
            user_metadata: { role: 'admin', legacy_id: admin.id },
          });
          if (error) throw error;
          authUserId = data.user.id;
        }
        await pool.query('UPDATE utilisateurs SET auth_user_id = $1 WHERE id = $2', [authUserId, admin.id]);
      } else {
        const { error } = await supabase.auth.admin.updateUserById(authUserId, { password: plain });
        if (error) throw error;
      }
    }

    const check = await pool.query(
      'SELECT id, email, identifiant, auth_user_id, mfa_enabled, mfa_exempt FROM utilisateurs WHERE id = $1',
      [admin.id],
    );
    console.log('Compte admin mis à jour :');
    console.log(JSON.stringify(check.rows[0], null, 2));
    console.log('Connexion : identifiant « admin » ou email ci-dessus, mot de passe défini via ADMIN_NEW_PASSWORD.');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
