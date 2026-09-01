/**
 * Vérifie connexion Postgres + Edge Functions Supabase.
 * Usage: node scripts/verify-supabase.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, 'backend', '.env.supabase');

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    const v = m[2].trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(envPath);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qmigexiuiiqmkgyrumtk.supabase.co';
const results = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
    console.log(`OK  ${name}: ${detail}`);
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
    console.error(`FAIL ${name}: ${e.message}`);
  }
}

await check('Postgres (utilisateurs count)', async () => {
  const pool = new pg.Pool({
    host: process.env.SUPABASE_DB_HOST || 'db.qmigexiuiiqmkgyrumtk.supabase.co',
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    user: process.env.SUPABASE_DB_USER || 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  const r = await pool.query('SELECT COUNT(*)::int AS n FROM utilisateurs');
  await pool.end();
  return `${r.rows[0].n} utilisateurs`;
});

await check('Edge api-proxy /healthz', async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/api-proxy/healthz`);
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${body}`);
  return body.slice(0, 80);
});

await check('Edge auth-legacy-login (DB + handler)', async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-legacy-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@invalid.local', mot_de_passe: 'x' }),
  });
  const body = await res.text();
  if (res.status !== 401) throw new Error(`expected 401 got ${res.status}: ${body}`);
  return '401 comme attendu (DB joignable)';
});

const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(`\n${failed.length} vérification(s) en échec.`);
  process.exit(1);
}
console.log('\nToutes les vérifications Supabase OK.');
