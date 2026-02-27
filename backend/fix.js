require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fix() {
  try {
    await pool.query(`ALTER TABLE matieres ADD COLUMN IF NOT EXISTS periodes_semaine INTEGER DEFAULT 1`);
    await pool.query(`ALTER TABLE matieres DROP COLUMN IF EXISTS code`);
    console.log('✅ Branches mise à jour !');
    process.exit();
  } catch(err) {
    console.error('❌', err.message);
    process.exit();
  }
}
fix();