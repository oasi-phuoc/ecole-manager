require('dotenv').config();
const pool = require('./src/config/database');
async function migrate() {
  try {
    await pool.query("ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS lieu_travail_prefere VARCHAR(100) DEFAULT NULL");
    await pool.query("ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS remarque_lieu_travail TEXT DEFAULT NULL");
    console.log('✅ Colonnes lieu_travail_prefere et remarque_lieu_travail ajoutées');
    process.exit(0);
  } catch(err) { console.error('❌', err.message); process.exit(1); }
}
migrate();
