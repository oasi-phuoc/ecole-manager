require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function fix() {
  try {
    await pool.query(`UPDATE calendrier SET couleur='#f59e0b' WHERE categorie='vacance'`);
    console.log('✅ Couleurs vacances mises à jour !');
    process.exit();
  } catch(err) { console.error('❌', err.message); process.exit(); }
}
fix();