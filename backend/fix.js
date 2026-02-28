require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fix() {
  try {
    // Supprimer affectations des profs inactifs
    const r = await pool.query(`
      DELETE FROM affectations 
      WHERE prof_id IN (
        SELECT id FROM utilisateurs WHERE actif = false AND role = 'prof'
      )
      RETURNING id
    `);
    console.log('✅ Affectations supprimées pour profs inactifs:', r.rows.length);
    process.exit();
  } catch(err) { console.error('❌', err.message); process.exit(); }
}
fix();