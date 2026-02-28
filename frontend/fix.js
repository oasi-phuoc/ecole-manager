require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fix() {
  try {
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS date_naissance DATE`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS periodes_semaine INTEGER DEFAULT 0`);
    console.log('✅ Colonnes ajoutées !');
    process.exit();
  } catch(err) { console.error('❌', err.message); process.exit(); }
}
fix();