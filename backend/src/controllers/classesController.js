const pool = require('../config/database');

const getClasses = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.nom, c.niveau, c.annee_scolaire,
        u.nom as prof_nom, u.prenom as prof_prenom,
        COUNT(e.id) as nb_eleves
      FROM classes c
      LEFT JOIN utilisateurs u ON c.prof_principal_id = u.id
      LEFT JOIN eleves e ON e.classe_id = c.id
      GROUP BY c.id, u.nom, u.prenom
      ORDER BY c.nom
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const creerClasse = async (req, res) => {
  const { nom, niveau, annee_scolaire, prof_principal_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO classes (nom, niveau, annee_scolaire, prof_principal_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [nom, niveau || null, annee_scolaire || null, prof_principal_id || null]
    );
    res.status(201).json({ message: 'Classe creee', classe: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const modifierClasse = async (req, res) => {
  const { nom, niveau, annee_scolaire, prof_principal_id } = req.body;
  try {
    const result = await pool.query(
      'UPDATE classes SET nom=$1, niveau=$2, annee_scolaire=$3, prof_principal_id=$4 WHERE id=$5 RETURNING *',
      [nom, niveau || null, annee_scolaire || null, prof_principal_id || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Classe non trouvee' });
    res.json({ message: 'Classe modifiee' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const supprimerClasse = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM classes WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Classe non trouvee' });
    res.json({ message: 'Classe supprimee' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = { getClasses, creerClasse, modifierClasse, supprimerClasse };