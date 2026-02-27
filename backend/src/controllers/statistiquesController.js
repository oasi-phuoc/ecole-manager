const pool = require('../config/database');

const getStatistiques = async (req, res) => {
  try {
    const nbEleves = await pool.query("SELECT COUNT(*) FROM eleves WHERE statut='actif'");
    const nbProfs = await pool.query("SELECT COUNT(*) FROM utilisateurs WHERE role='prof'");
    const nbClasses = await pool.query("SELECT COUNT(*) FROM classes");
    const nbBranches = await pool.query("SELECT COUNT(*) FROM matieres");

    const presencesAujourd = await pool.query(`
      SELECT
        COUNT(CASE WHEN statut='present' THEN 1 END) as presents,
        COUNT(CASE WHEN statut='absent' THEN 1 END) as absents,
        COUNT(CASE WHEN statut='retard' THEN 1 END) as retards,
        COUNT(*) as total
      FROM presences WHERE date = CURRENT_DATE
    `);

    const paiements = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN statut='paye' THEN montant END), 0) as encaisse,
        COALESCE(SUM(CASE WHEN statut='en_attente' THEN montant END), 0) as en_attente,
        COALESCE(SUM(CASE WHEN statut='en_retard' THEN montant END), 0) as en_retard
      FROM paiements
    `);

    const moyennesParClasse = await pool.query(`
      SELECT c.nom as classe,
        ROUND(AVG(n.valeur)::numeric, 2) as moyenne
      FROM notes n
      JOIN evaluations ev ON n.evaluation_id = ev.id
      JOIN classes c ON ev.classe_id = c.id
      WHERE n.absent = false AND n.dispense = false AND n.valeur IS NOT NULL
      GROUP BY c.nom
      ORDER BY c.nom
    `);

    const absencesParClasse = await pool.query(`
      SELECT c.nom as classe,
        COUNT(CASE WHEN p.statut='absent' THEN 1 END) as absents,
        COUNT(p.id) as total
      FROM presences p
      JOIN eleves e ON p.eleve_id = e.id
      JOIN classes c ON e.classe_id = c.id
      GROUP BY c.nom
      ORDER BY c.nom
    `);

    const elevesParClasse = await pool.query(`
      SELECT c.nom as classe, COUNT(e.id) as nb
      FROM classes c
      LEFT JOIN eleves e ON e.classe_id = c.id AND e.statut = 'actif'
      GROUP BY c.nom
      ORDER BY c.nom
    `);

    const prochainEvenements = await pool.query(`
      SELECT titre, date_debut, type, couleur
      FROM calendrier
      WHERE date_debut >= CURRENT_DATE
      ORDER BY date_debut
      LIMIT 5
    `);

    res.json({
      nb_eleves: parseInt(nbEleves.rows[0].count),
      nb_profs: parseInt(nbProfs.rows[0].count),
      nb_classes: parseInt(nbClasses.rows[0].count),
      nb_branches: parseInt(nbBranches.rows[0].count),
      presences_aujourd: presencesAujourd.rows[0],
      paiements: paiements.rows[0],
      moyennes_par_classe: moyennesParClasse.rows,
      absences_par_classe: absencesParClasse.rows,
      eleves_par_classe: elevesParClasse.rows,
      prochains_evenements: prochainEvenements.rows
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = { getStatistiques };