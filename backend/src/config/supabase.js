/**
 * Client Supabase (optionnel) — phase 2+ (Storage / Auth).
 * Phase 1 : la DB reste accessible via `pg` + DATABASE_URL (database.js).
 *
 * Ne jamais exposer SUPABASE_SERVICE_ROLE_KEY au frontend.
 */
let client = null;

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  if (client) return client;
  try {
    // Dépendance optionnelle : npm i @supabase/supabase-js (phase 2)
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const { createClient } = require('@supabase/supabase-js');
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return client;
  } catch (err) {
    console.warn(
      'Supabase JS non installé ou invalide — ignorer jusqu’à la phase Storage/Auth:',
      err.message
    );
    return null;
  }
}

function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

module.exports = { getSupabaseAdmin, isSupabaseConfigured };
