const pool = require('../config/database');

const getDevoirs = async (req, res) => {
  const { classe_id } = req.query;
  if (!classe_id) return res.status(400).json({ message: 'classe_id requis' });
  try {
    const r = await pool.query(
      'SELECT * FROM devoirs WHERE classe_id=$1 ORDER BY date_remise DESC, created_at DESC',
      [classe_id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const creerDevoir = async (req, res) => {
  const { classe_id, titre, matiere, date_devoir, date_remise } = req.body;
  if (!classe_id || !titre) return res.status(400).json({ message: 'classe_id et titre requis' });
  try {
    const r = await pool.query(
      'INSERT INTO devoirs (classe_id, titre, matiere, date_devoir, date_remise) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [classe_id, titre, matiere || null, date_devoir || null, date_remise || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const supprimerDevoir = async (req, res) => {
  try {
    await pool.query('DELETE FROM devoirs WHERE id=$1', [req.params.id]);
    res.json({ message: 'Devoir supprimé' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getSuivi = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT sd.eleve_id, sd.statut, sd.commentaire,
              COALESCE(u.nom, e.nom) as nom, COALESCE(u.prenom, e.prenom) as prenom
       FROM suivi_devoirs sd
       JOIN eleves e ON sd.eleve_id = e.id
       LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
       WHERE sd.devoir_id=$1
       ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const majStatut = async (req, res) => {
  const { statut, commentaire } = req.body;
  const { id, eleve_id } = req.params;
  if (!['rendu', 'non_rendu', 'partiel', 'excuse'].includes(statut)) {
    return res.status(400).json({ message: 'Statut invalide' });
  }
  try {
    await pool.query(
      `INSERT INTO suivi_devoirs (devoir_id, eleve_id, statut, commentaire, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (devoir_id, eleve_id) DO UPDATE SET statut=$3, commentaire=$4, updated_at=NOW()`,
      [id, eleve_id, statut, commentaire || null]
    );
    res.json({ message: 'Statut mis à jour' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getDevoirs, creerDevoir, supprimerDevoir, getSuivi, majStatut };
