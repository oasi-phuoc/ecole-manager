const pool = require('../config/database');

const getEleves = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*,
        COALESCE(e.nom, u.nom) as nom,
        COALESCE(e.prenom, u.prenom) as prenom,
        COALESCE(e.email, u.email) as email,
        c.nom as classe_nom
      FROM eleves e
      LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
      LEFT JOIN classes c ON e.classe_id = c.id
      ORDER BY COALESCE(e.nom, u.nom), COALESCE(e.prenom, u.prenom)
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getEleve = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.id, u.nom, u.prenom, u.email, c.nom as classe, e.classe_id, e.date_naissance, e.telephone, e.adresse, e.nom_parent, e.telephone_parent, e.statut
      FROM eleves e
      JOIN utilisateurs u ON e.utilisateur_id = u.id
      LEFT JOIN classes c ON e.classe_id = c.id
      WHERE e.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Eleve non trouve' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const creerEleve = async (req, res) => {
  const { nom, prenom, email, mot_de_passe, classe_id, date_naissance, telephone, adresse, nom_parent, telephone_parent } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(mot_de_passe || 'Ecole123!', 10);
    const userResult = await client.query(
      'INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [nom, prenom, email, hash, 'eleve']
    );
    const userId = userResult.rows[0].id;
    const eleveResult = await client.query(
      'INSERT INTO eleves (utilisateur_id, classe_id, date_naissance, telephone, adresse, nom_parent, telephone_parent) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [userId, classe_id || null, date_naissance || null, telephone || null, adresse || null, nom_parent || null, telephone_parent || null]
    );
    await client.query('COMMIT');
    res.status(201).json({ message: 'Eleve cree', id: eleveResult.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  } finally {
    client.release();
  }
};

const modifierEleve = async (req, res) => {
  const { nom, prenom, email, classe_id, date_naissance, telephone, adresse, nom_parent, telephone_parent, statut } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const eleveResult = await client.query('SELECT utilisateur_id FROM eleves WHERE id = $1', [req.params.id]);
    if (eleveResult.rows.length === 0) return res.status(404).json({ message: 'Eleve non trouve' });
    const userId = eleveResult.rows[0].utilisateur_id;
    await client.query('UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3 WHERE id=$4', [nom, prenom, email, userId]);
    await client.query(
      'UPDATE eleves SET classe_id=$1, date_naissance=$2, telephone=$3, adresse=$4, nom_parent=$5, telephone_parent=$6, statut=$7 WHERE id=$8',
      [classe_id || null, date_naissance || null, telephone || null, adresse || null, nom_parent || null, telephone_parent || null, statut || 'actif', req.params.id]
    );
    await client.query('COMMIT');
    res.json({ message: 'Eleve modifie' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  } finally {
    client.release();
  }
};

const supprimerEleve = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const eleveResult = await client.query('SELECT utilisateur_id FROM eleves WHERE id = $1', [req.params.id]);
    if (eleveResult.rows.length === 0) return res.status(404).json({ message: 'Eleve non trouve' });
    const userId = eleveResult.rows[0].utilisateur_id;
    await client.query('DELETE FROM eleves WHERE id = $1', [req.params.id]);
    // Supprimer utilisateur seulement s'il existe
    if (userId) await client.query('DELETE FROM utilisateurs WHERE id = $1', [userId]);
    await client.query('COMMIT');
    res.json({ message: 'Eleve supprime' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  } finally {
    client.release();
  }
};

const updatePhoto = async (req, res) => {
  const { photo } = req.body;
  try {
    await pool.query('UPDATE eleves SET photo=$1 WHERE id=$2', [photo, req.params.id]);
    res.json({ message: 'Photo mise à jour' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getEleves, getEleve, creerEleve, modifierEleve, supprimerEleve,
  updatePhoto};
