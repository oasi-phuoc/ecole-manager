require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function fix() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendrier (
        id SERIAL PRIMARY KEY,
        titre VARCHAR(200) NOT NULL,
        description TEXT,
        date_debut DATE NOT NULL,
        date_fin DATE,
        type VARCHAR(50) DEFAULT 'evenement',
        couleur VARCHAR(20) DEFAULT '#1a73e8',
        categorie VARCHAR(50) DEFAULT 'evenement',
        nom_vacance VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table calendrier créée !');

    // Insérer les vacances par défaut
    const vacances = [
      ['Vacances d\'automne', '#f59e0b'],
      ['La Toussaint', '#f59e0b'],
      ['Immaculée Conception', '#6366f1'],
      ['Vacances de Noël', '#ef4444'],
      ['Vacances d\'hiver', '#3b82f6'],
      ['St-Joseph', '#6366f1'],
      ['Vacances de Pâques', '#10b981'],
      ['Fête du travail', '#6366f1'],
      ['Ascension', '#6366f1'],
      ['Pentecôte', '#6366f1'],
      ['Fête-Dieu', '#6366f1'],
    ];
    for (const [nom, couleur] of vacances) {
      await pool.query(`
        INSERT INTO calendrier (titre, categorie, nom_vacance, couleur, date_debut, date_fin)
        VALUES ($1, 'vacance', $1, $2, CURRENT_DATE, CURRENT_DATE)
        ON CONFLICT DO NOTHING
      `, [nom, couleur]);
    }
    console.log('✅ Vacances insérées !');
    process.exit();
  } catch(err) { console.error('❌', err.message); process.exit(); }
}
fix();