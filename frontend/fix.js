const pool = require('./src/config/database');

const vacances = [
  { nom: "Vacances d'automne",         debut: '2025-10-04', fin: '2025-10-19' },
  { nom: "La Toussaint",               debut: '2025-11-01', fin: '2025-11-01' },
  { nom: "Immaculée Conception",       debut: '2025-12-08', fin: '2025-12-08' },
  { nom: "Vacances de Noël",           debut: '2025-12-22', fin: '2026-01-04' },
  { nom: "Vacances d'hiver",           debut: '2026-02-14', fin: '2026-02-22' },
  { nom: "St-Joseph",                  debut: '2026-03-19', fin: '2026-03-19' },
  { nom: "Vacances de Pâques",         debut: '2026-04-04', fin: '2026-04-19' },
  { nom: "Fête du travail",            debut: '2026-05-01', fin: '2026-05-01' },
  { nom: "Ascension",                  debut: '2026-05-14', fin: '2026-05-17' },
  { nom: "Pentecôte",                  debut: '2026-05-25', fin: '2026-05-25' },
  { nom: "Fête-Dieu",                  debut: '2026-06-04', fin: '2026-06-04' },
];

const evaluations = [
  { nom: 'Test déplacement TCF - Semestre 1', debut: '2025-12-01', fin: '2025-12-31' },
  { nom: 'TCF - Semestre 2',                  debut: '2026-05-01', fin: '2026-05-31' },
];

async function restaurer() {
  try {
    for (const v of vacances) {
      await pool.query(
        `INSERT INTO calendrier (titre, nom_vacance, date_debut, date_fin, categorie, couleur, type)
         VALUES ($1,$2,$3,$4,'vacance','#f59e0b','Conge')
         ON CONFLICT DO NOTHING`,
        [v.nom, v.nom, v.debut, v.fin]
      );
      console.log('✅ Vacance : ' + v.nom);
    }
    for (const ev of evaluations) {
      await pool.query(
        `INSERT INTO calendrier (titre, nom_vacance, date_debut, date_fin, categorie, couleur, type)
         VALUES ($1,$2,$3,$4,'evaluation','#7c3aed','Examen')
         ON CONFLICT DO NOTHING`,
        [ev.nom, ev.nom, ev.debut, ev.fin]
      );
      console.log('✅ Évaluation : ' + ev.nom);
    }
    console.log('\n✅ Restauration terminée !');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
  }
}

restaurer();