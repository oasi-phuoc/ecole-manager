const pool = require('../config/database');

const getPresences = async (req, res) => {
  try {
    const { classe_id, date } = req.query;
    const result = await pool.query(`
      SELECT p.id, p.date, p.statut, p.commentaire,
        e.id as eleve_id, u.nom, u.prenom,
        c.nom as classe
      FROM presences p
      JOIN eleves e ON p.eleve_id = e.id
      JOIN utilisateurs u ON e.utilisateur_id = u.id
      JOIN classes c ON e.classe_id = c.id
      WHERE e.classe_id = $1 AND p.date = $2
      ORDER BY u.nom, u.prenom
    `, [classe_id, date]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getElevesClasse = async (req, res) => {
  try {
    const { classe_id } = req.query;
    const result = await pool.query(`
      SELECT e.id, u.nom, u.prenom
      FROM eleves e
      JOIN utilisateurs u ON e.utilisateur_id = u.id
      WHERE e.classe_id = $1 AND e.statut = 'actif'
      ORDER BY u.nom, u.prenom
    `, [classe_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const enregistrerPresences = async (req, res) => {
  const { presences, date } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const p of presences) {
      const existe = await client.query(
        'SELECT id FROM presences WHERE eleve_id=$1 AND date=$2',
        [p.eleve_id, date]
      );
      if (existe.rows.length > 0) {
        await client.query(
          'UPDATE presences SET statut=$1, commentaire=$2 WHERE eleve_id=$3 AND date=$4',
          [p.statut, p.commentaire || null, p.eleve_id, date]
        );
      } else {
        await client.query(
          'INSERT INTO presences (eleve_id, date, statut, commentaire) VALUES ($1,$2,$3,$4)',
          [p.eleve_id, date, p.statut, p.commentaire || null]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ message: 'Presences enregistrees' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  } finally {
    client.release();
  }
};

const getStatistiques = async (req, res) => {
  try {
    const { classe_id } = req.query;
    const result = await pool.query(`
      SELECT u.nom, u.prenom,
        COUNT(CASE WHEN p.statut = 'present' THEN 1 END) as presents,
        COUNT(CASE WHEN p.statut = 'absent' THEN 1 END) as absents,
        COUNT(CASE WHEN p.statut = 'retard' THEN 1 END) as retards,
        COUNT(CASE WHEN p.statut = 'excuse' THEN 1 END) as excuses,
        COUNT(p.id) as total
      FROM eleves e
      JOIN utilisateurs u ON e.utilisateur_id = u.id
      LEFT JOIN presences p ON p.eleve_id = e.id
      WHERE e.classe_id = $1
      GROUP BY u.nom, u.prenom
      ORDER BY u.nom, u.prenom
    `, [classe_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = { getPresences, getElevesClasse, enregistrerPresences, getStatistiques };