const pool = require('../config/database');

const getBranches = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM matieres ORDER BY niveau, nom');
    res.json(result.rows);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const creerBranche = async (req, res) => {
  const { nom, niveau, periodes_semaine, coefficient, type_branche, designation_courte, suivi_notes } = req.body;
  if (!nom) return res.status(400).json({ message: 'Le nom est requis' });
  if (!periodes_semaine) return res.status(400).json({ message: 'Les périodes/semaine sont requises' });
  if (!niveau) return res.status(400).json({ message: 'Le niveau est requis' });
  if (!designation_courte || !String(designation_courte).trim()) return res.status(400).json({ message: 'La désignation courte est requise' });
  try {
    const r = await pool.query(
      'INSERT INTO matieres (nom, niveau, periodes_semaine, coefficient, type_branche, designation_courte, suivi_notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [nom, niveau, parseInt(periodes_semaine), parseFloat(coefficient)||1, type_branche||'principale', String(designation_courte).trim(), suivi_notes !== false]
    );
    res.status(201).json(r.rows[0]);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const modifierBranche = async (req, res) => {
  const { nom, niveau, periodes_semaine, coefficient, type_branche, designation_courte, suivi_notes } = req.body;
  if (!designation_courte || !String(designation_courte).trim()) return res.status(400).json({ message: 'La désignation courte est requise' });
  try {
    const r = await pool.query(
      'UPDATE matieres SET nom=$1, niveau=$2, periodes_semaine=$3, coefficient=$4, type_branche=$5, designation_courte=$6, suivi_notes=$7 WHERE id=$8 RETURNING *',
      [nom, niveau, parseInt(periodes_semaine), parseFloat(coefficient)||1, type_branche||'principale', String(designation_courte).trim(), suivi_notes !== false, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Branche non trouvée' });
    res.json(r.rows[0]);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const supprimerBranche = async (req, res) => {
  try {
    await pool.query('DELETE FROM matieres WHERE id=$1', [req.params.id]);
    res.json({ message: 'Branche supprimée' });
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

module.exports = { getBranches, creerBranche, modifierBranche, supprimerBranche };