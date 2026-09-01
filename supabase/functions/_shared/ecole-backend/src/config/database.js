const { Pool } = require('pg');

function readEnv(key) {
  if (typeof Deno !== 'undefined' && Deno.env?.get) {
    const v = Deno.env.get(key);
    if (v) return v;
  }
  return process.env[key];
}

const connectionString =
  readEnv('DATABASE_URL') ||
  readEnv('SUPABASE_DB_URL') ||
  readEnv('DB_CONNECTION_STRING');

const pool = new Pool(
  connectionString
    ? { connectionString, ssl: { rejectUnauthorized: false } }
    : {
        host: readEnv('DB_HOST') || 'localhost',
        port: Number(readEnv('DB_PORT') || 5432),
        database: readEnv('DB_NAME') || 'ecole_db',
        user: readEnv('DB_USER') || 'postgres',
        password: readEnv('DB_PASSWORD') || 'admin',
      }
);

module.exports = pool;
