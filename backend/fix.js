require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function fix() {
  try {
    await pool.query(`DELETE FROM calendrier WHERE categorie='evaluation'`);
    const evals = ['Test de placement', 'TCF - Semestre 1', 'TCF - Semestre 2'];
    for (const nom of evals) {
      await pool.query(`INSERT INTO calendrier (titre, nom_vacance, categorie, couleur, date_debut, date_fin, type) VALUES ($1,$1,'evaluation','#7c3aed',CURRENT_DATE,CURRENT_DATE,'Examen')`, [nom]);
      console.log('✅', nom);
    }
    const check = await pool.query(`SELECT titre FROM calendrier WHERE categorie='evaluation'`);
    console.log('Résultat:', check.rows.map(r=>r.titre));
    process.exit();
  } catch(err) { console.error('❌', err.message); process.exit(); }
}
fix();