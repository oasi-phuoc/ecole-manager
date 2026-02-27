const pool = require('../config/database');

const getMatieres = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM matieres ORDER BY nom');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const creerMatiere = async (req, res) => {
  const { nom, code, coefficient } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO matieres (nom, code, coefficient) VALUES ($1,$2,$3) RETURNING *',
      [nom, code || null, coefficient || 1]
    );
    res.status(201).json({ message: 'Matiere creee', matiere: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getEmploiDuTemps = async (req, res) => {
  try {
    const { classe_id } = req.query;
    let query = `
      SELECT e.id, e.jour, e.heure_debut, e.heure_fin, e.salle,
        c.nom as classe, c.id as classe_id,
        m.nom as matiere, m.id as matiere_id,
        u.nom as prof_nom, u.prenom as prof_prenom, u.id as prof_id
      FROM emploi_du_temps e
      JOIN classes c ON e.classe_id = c.id
      JOIN matieres m ON e.matiere_id = m.id
      JOIN utilisateurs u ON e.prof_id = u.id
    `;
    const params = [];
    if (classe_id) {
      query += ' WHERE e.classe_id = $1';
      params.push(classe_id);
    }
    query += ' ORDER BY e.heure_debut';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const creerCours = async (req, res) => {
  const { classe_id, matiere_id, prof_id, jour, heure_debut, heure_fin, salle } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO emploi_du_temps (classe_id, matiere_id, prof_id, jour, heure_debut, heure_fin, salle) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [classe_id, matiere_id, prof_id, jour, heure_debut, heure_fin, salle || null]
    );
    res.status(201).json({ message: 'Cours cree', cours: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const modifierCours = async (req, res) => {
  const { classe_id, matiere_id, prof_id, jour, heure_debut, heure_fin, salle } = req.body;
  try {
    const result = await pool.query(
      'UPDATE emploi_du_temps SET classe_id=$1, matiere_id=$2, prof_id=$3, jour=$4, heure_debut=$5, heure_fin=$6, salle=$7 WHERE id=$8 RETURNING *',
      [classe_id, matiere_id, prof_id, jour, heure_debut, heure_fin, salle || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Cours non trouve' });
    res.json({ message: 'Cours modifie' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const supprimerCours = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM emploi_du_temps WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Cours non trouve' });
    res.json({ message: 'Cours supprime' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = { getMatieres, creerMatiere, getEmploiDuTemps, creerCours, modifierCours, supprimerCours };