const pool = require('../config/database');

const getObservations = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT o.*, u.nom as auteur_nom, u.prenom as auteur_prenom
      FROM observations o
      LEFT JOIN utilisateurs u ON u.id=o.auteur_id
      WHERE o.eleve_id=$1
      ORDER BY o.created_at DESC
    `, [req.params.eleve_id]);
    res.json(r.rows);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const creerObservation = async (req, res) => {
  const { titre, contenu } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO observations (eleve_id, titre, contenu, auteur_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.eleve_id, titre, contenu, req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const supprimerObservation = async (req, res) => {
  try {
    await pool.query('DELETE FROM observations WHERE id=$1', [req.params.id]);
    res.json({ message: 'Observation supprimée' });
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const modifierObservation = async (req, res) => {
  const { titre, contenu } = req.body;
  try {
    await pool.query('UPDATE observations SET titre=$1, contenu=$2 WHERE id=$3', [titre, contenu, req.params.id]);
    res.json({ message: 'Observation modifiée' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getObservations, creerObservation, supprimerObservation, modifierObservation };