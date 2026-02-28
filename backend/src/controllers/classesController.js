const pool = require('../config/database');

const getClasses = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.nom as prof_nom, u.prenom as prof_prenom,
        COUNT(DISTINCT e.id) as nb_eleves
      FROM classes c
      LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
      LEFT JOIN eleves e ON e.classe_id=c.id
      GROUP BY c.id, u.nom, u.prenom
      ORDER BY c.nom
    `);
    res.json(result.rows);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const getClasse = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.nom as prof_nom, u.prenom as prof_prenom
      FROM classes c LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
      WHERE c.id=$1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Classe non trouvée' });
    res.json(result.rows[0]);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const getElevesClasse = async (req, res) => {
  try {
    const eleves = await pool.query(`
      SELECT e.*,
        COALESCE(e.nom, u.nom) as nom,
        COALESCE(e.prenom, u.prenom) as prenom,
        COUNT(DISTINCT a.id) FILTER (WHERE a.type='absence') as nb_absences,
        COUNT(DISTINCT a.id) FILTER (WHERE a.type='absence' AND a.excusee=true) as nb_excuses,
        COUNT(DISTINCT a.id) FILTER (WHERE a.type='retard') as nb_retards
      FROM eleves e
      LEFT JOIN utilisateurs u ON u.id=e.utilisateur_id
      LEFT JOIN absences a ON a.eleve_id=e.id
      WHERE e.classe_id=$1
      GROUP BY e.id, u.nom, u.prenom
      ORDER BY COALESCE(e.nom, u.nom), COALESCE(e.prenom, u.prenom)
    `, [req.params.id]);
    res.json(eleves.rows);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const creerClasse = async (req, res) => {
  const { nom, niveau, annee_scolaire, prof_principal_id } = req.body;
  if (!nom) return res.status(400).json({ message: 'Le nom est requis' });
  if (!annee_scolaire) return res.status(400).json({ message: "L'année scolaire est requise" });
  try {
    const r = await pool.query(
      'INSERT INTO classes (nom, niveau, annee_scolaire, prof_principal_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [nom, niveau||null, annee_scolaire, prof_principal_id||null]
    );
    res.status(201).json(r.rows[0]);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const modifierClasse = async (req, res) => {
  const { nom, niveau, annee_scolaire, prof_principal_id, actif } = req.body;
  try {
    const r = await pool.query(
      'UPDATE classes SET nom=$1, niveau=$2, annee_scolaire=$3, prof_principal_id=$4, actif=$5 WHERE id=$6 RETURNING *',
      [nom, niveau||null, annee_scolaire, prof_principal_id||null, actif!==undefined?actif:true, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Classe non trouvée' });
    res.json(r.rows[0]);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const supprimerClasse = async (req, res) => {
  try {
    await pool.query('DELETE FROM classes WHERE id=$1', [req.params.id]);
    res.json({ message: 'Classe supprimée' });
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

module.exports = { getClasses, getClasse, getElevesClasse, creerClasse, modifierClasse, supprimerClasse };