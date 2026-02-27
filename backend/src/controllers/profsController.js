const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const getProfs = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nom, prenom, email, actif, created_at FROM utilisateurs WHERE role = $1 ORDER BY nom, prenom',
      ['prof']
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getProf = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nom, prenom, email, actif, created_at FROM utilisateurs WHERE id = $1 AND role = $2',
      [req.params.id, 'prof']
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Professeur non trouve' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const creerProf = async (req, res) => {
  const { nom, prenom, email, mot_de_passe } = req.body;
  try {
    const existe = await pool.query('SELECT id FROM utilisateurs WHERE email = $1', [email]);
    if (existe.rows.length > 0) return res.status(400).json({ message: 'Email deja utilise' });
    const hash = await bcrypt.hash(mot_de_passe || 'Prof123!', 10);
    const result = await pool.query(
      'INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, nom, prenom, email, role',
      [nom, prenom, email, hash, 'prof']
    );
    res.status(201).json({ message: 'Professeur cree', prof: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const modifierProf = async (req, res) => {
  const { nom, prenom, email, actif } = req.body;
  try {
    const result = await pool.query(
      'UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4 WHERE id=$5 AND role=$6 RETURNING id',
      [nom, prenom, email, actif !== undefined ? actif : true, req.params.id, 'prof']
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Professeur non trouve' });
    res.json({ message: 'Professeur modifie' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const supprimerProf = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM utilisateurs WHERE id=$1 AND role=$2 RETURNING id',
      [req.params.id, 'prof']
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Professeur non trouve' });
    res.json({ message: 'Professeur supprime' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = { getProfs, getProf, creerProf, modifierProf, supprimerProf };