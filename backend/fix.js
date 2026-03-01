require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function fix() {
  try {
    // Vérifier ce qui existe déjà
    const existing = await pool.query(`SELECT titre FROM calendrier WHERE categorie='evaluation'`);
    console.log('Existants:', existing.rows.map(r=>r.titre));
    
    const evals = [
      'TP - Test de placement des élèves SCAI',
      'TCF 1 - Test de connaissances de français',
      'TCF 2 - Test de connaissances de français',
    ];
    for (const nom of evals) {
      const exists = existing.rows.find(r => r.titre === nom);
      if (!exists) {
        await pool.query(`
          INSERT INTO calendrier (titre, nom_vacance, categorie, couleur, date_debut, date_fin, type)
          VALUES ($1, $1, 'evaluation', '#7c3aed', CURRENT_DATE, CURRENT_DATE, 'Examen')
        `, [nom]);
        console.log('✅ Inséré:', nom);
      } else {
        console.log('⏭️ Déjà existant:', nom);
      }
    }
    process.exit();
  } catch(err) { console.error('❌', err.message); process.exit(); }
}
fix();