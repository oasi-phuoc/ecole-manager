require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fix() {
  try {
    await pool.query(`ALTER TABLE observations ADD COLUMN IF NOT EXISTS mesure_prise TEXT`);
    await pool.query(`ALTER TABLE observations ADD COLUMN IF NOT EXISTS intervention_responsable BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE observations ADD COLUMN IF NOT EXISTS demande_entretien BOOLEAN DEFAULT false`);
    console.log('✅ Colonnes ajoutées !');
    process.exit();
  } catch(err) { console.error('❌', err.message); process.exit(); }
}
fix();