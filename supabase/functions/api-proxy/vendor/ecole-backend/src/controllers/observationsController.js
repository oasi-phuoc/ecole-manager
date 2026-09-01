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
  const { titre, contenu, mesure_prise, intervention_responsable, demande_entretien } = req.body;
  try {
    const eleveRes = await pool.query(`
      SELECT
        e.id,
        u.nom, u.prenom
      FROM eleves e
      LEFT JOIN utilisateurs u ON u.id = e.utilisateur_id
      WHERE e.id = $1
    `, [req.params.eleve_id]);
    if (!eleveRes.rows.length) return res.status(404).json({ message: 'Élève introuvable' });

    const nom = String(eleveRes.rows[0]?.nom || '').trim();
    const prenom = String(eleveRes.rows[0]?.prenom || '').trim();
    const initialNom = nom ? nom[0].toUpperCase() : 'X';
    const initialPrenom = prenom ? prenom[0].toUpperCase() : 'X';
    const prefix = `${initialPrenom}${initialNom}`;

    const seqRes = await pool.query(`
      SELECT COUNT(*)::int AS nb
      FROM observations
      WHERE eleve_id = $1
    `, [req.params.eleve_id]);
    const nextNum = (seqRes.rows[0]?.nb || 0) + 1;
    const referenceObs = `${prefix}-${String(nextNum).padStart(2, '0')}`;

    const r = await pool.query(
      'INSERT INTO observations (eleve_id, reference_obs, titre, contenu, mesure_prise, intervention_responsable, demande_entretien, auteur_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [req.params.eleve_id, referenceObs, titre, contenu, mesure_prise||null, intervention_responsable||false, demande_entretien||false, req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const modifierObservation = async (req, res) => {
  const { titre, contenu, mesure_prise, intervention_responsable, demande_entretien } = req.body;
  try {
    await pool.query(
      'UPDATE observations SET titre=$1, contenu=$2, mesure_prise=$3, intervention_responsable=$4, demande_entretien=$5 WHERE id=$6',
      [titre, contenu, mesure_prise||null, intervention_responsable||false, demande_entretien||false, req.params.id]
    );
    res.json({ message: 'Observation modifiée' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const supprimerObservation = async (req, res) => {
  try {
    await pool.query('DELETE FROM observations WHERE id=$1', [req.params.id]);
    res.json({ message: 'Observation supprimée' });
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

module.exports = { getObservations, creerObservation, supprimerObservation, modifierObservation };