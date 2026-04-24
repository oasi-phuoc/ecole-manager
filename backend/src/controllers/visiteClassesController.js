const pool = require('../config/database');

const getVisites = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT v.*,
        uf.nom AS formateur_nom, uf.prenom AS formateur_prenom,
        c.nom AS classe_nom, c.niveau AS classe_niveau,
        m.nom AS branche_nom
      FROM visites_classes v
      LEFT JOIN utilisateurs uf ON uf.id = v.formateur_id
      LEFT JOIN classes c ON c.id = v.classe_id
      LEFT JOIN matieres m ON m.id = v.branche_id
      ORDER BY v.date_visite DESC, v.created_at DESC
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const creerVisite = async (req, res) => {
  try {
    const {
      formateur_id, classe_id, branche_id, date_visite, duree,
      scores, organisation, observation, feedback, valide,
    } = req.body;
    const r = await pool.query(
      `INSERT INTO visites_classes
        (formateur_id, classe_id, branche_id, date_visite, duree, scores, organisation, observation, feedback, valide, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        formateur_id || null, classe_id || null, branche_id || null,
        date_visite || null, duree || 1,
        JSON.stringify(scores || {}), JSON.stringify(organisation || {}),
        observation || null, feedback || null, valide || false,
        req.user?.id || null,
      ]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const modifierVisite = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      formateur_id, classe_id, branche_id, date_visite, duree,
      scores, organisation, observation, feedback, valide,
    } = req.body;
    const r = await pool.query(
      `UPDATE visites_classes SET
        formateur_id=$1, classe_id=$2, branche_id=$3, date_visite=$4, duree=$5,
        scores=$6, organisation=$7, observation=$8, feedback=$9, valide=$10,
        updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [
        formateur_id || null, classe_id || null, branche_id || null,
        date_visite || null, duree || 1,
        JSON.stringify(scores || {}), JSON.stringify(organisation || {}),
        observation || null, feedback || null, valide || false,
        id,
      ]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const supprimerVisite = async (req, res) => {
  try {
    await pool.query('DELETE FROM visites_classes WHERE id=$1', [req.params.id]);
    res.json({ message: 'Supprimé' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getVisites, creerVisite, modifierVisite, supprimerVisite };
