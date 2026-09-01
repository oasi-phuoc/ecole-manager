const { Pool } = require('pg');

const connectionString =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.DB_CONNECTION_STRING;

const pool = new Pool(
  connectionString
    ? { connectionString, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'ecole_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'admin',
      }
);

module.exports = pool;
