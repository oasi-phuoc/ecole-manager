require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fix() {
  try {
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS telephone VARCHAR(50)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS specialite VARCHAR(100)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS adresse TEXT`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS npa VARCHAR(10)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS lieu VARCHAR(100)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS sexe VARCHAR(20)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS taux_activite INTEGER`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS periodes_semaine INTEGER`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS date_naissance DATE`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS avs VARCHAR(20)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS type_contrat VARCHAR(50)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS type_permis VARCHAR(50)`);
    console.log('✅ Toutes les colonnes ajoutées !');
    process.exit();
  } catch(err) { console.error('❌', err.message); process.exit(); }
}
fix();