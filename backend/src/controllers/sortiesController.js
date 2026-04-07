const pool = require('../config/database');

const getSorties = async (req, res) => {
  try {
    const { type } = req.query;
    let q = 'SELECT * FROM sorties_scolaires';
    const params = [];
    if (type) { q += ' WHERE type = $1'; params.push(type); }
    q += ' ORDER BY date_sortie DESC, created_at DESC';
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const creerSortie = async (req, res) => {
  try {
    const { type, classes_ids, classes_noms, titulaires, autres_accompagnants, date_sortie, destination, activites, lieu_depart, heure_depart, lieu_retour, heure_retour, budget, commentaires, approuve } = req.body;
    const r = await pool.query(
      `INSERT INTO sorties_scolaires (type, classes_ids, classes_noms, titulaires, autres_accompagnants, date_sortie, destination, activites, lieu_depart, heure_depart, lieu_retour, heure_retour, budget, commentaires, approuve)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [type, classes_ids||null, classes_noms||null, titulaires, autres_accompagnants, date_sortie||null, destination, activites, lieu_depart, heure_depart||null, lieu_retour, heure_retour||null, budget||null, commentaires, approuve||false]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const modifierSortie = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, classes_ids, classes_noms, titulaires, autres_accompagnants, date_sortie, destination, activites, lieu_depart, heure_depart, lieu_retour, heure_retour, budget, commentaires, approuve } = req.body;
    const r = await pool.query(
      `UPDATE sorties_scolaires SET type=$1, classes_ids=$2, classes_noms=$3, titulaires=$4, autres_accompagnants=$5, date_sortie=$6, destination=$7, activites=$8, lieu_depart=$9, heure_depart=$10, lieu_retour=$11, heure_retour=$12, budget=$13, commentaires=$14, approuve=$15
       WHERE id=$16 RETURNING *`,
      [type, classes_ids||null, classes_noms||null, titulaires, autres_accompagnants, date_sortie||null, destination, activites, lieu_depart, heure_depart||null, lieu_retour, heure_retour||null, budget||null, commentaires, approuve||false, id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const supprimerSortie = async (req, res) => {
  try {
    await pool.query('DELETE FROM sorties_scolaires WHERE id=$1', [req.params.id]);
    res.json({ message: 'Supprimé' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getSorties, creerSortie, modifierSortie, supprimerSortie };
