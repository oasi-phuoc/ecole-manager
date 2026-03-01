require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function fix() {
  try {
    await pool.query(`ALTER TABLE calendrier ADD COLUMN heure_debut VARCHAR(10)`);
    await pool.query(`ALTER TABLE calendrier ADD COLUMN heure_fin VARCHAR(10)`);
    console.log('✅ Colonnes heure ajoutées !');
    const r = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='calendrier'`);
    console.log('Colonnes:', r.rows.map(c=>c.column_name).join(', '));
    process.exit();
  } catch(err) { console.error('❌', err.message); process.exit(); }
}
fix();