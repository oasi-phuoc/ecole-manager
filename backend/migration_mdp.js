require('dotenv').config();
const pool = require('./src/config/database');
async function migrate() {
  try {
    await pool.query('ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS doit_changer_mdp BOOLEAN DEFAULT false');
    console.log('✅ Colonne doit_changer_mdp ajoutée');
    process.exit(0);
  } catch(err) { console.error('❌', err.message); process.exit(1); }
}
migrate();
