const pool = require('../config/database');
const bcrypt = require('bcrypt');

const getProfil = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nom, prenom, email, role, permissions FROM utilisateurs WHERE id=$1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const modifierProfil = async (req, res) => {
  const { nom, prenom, email } = req.body;
  try {
    await pool.query('UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3 WHERE id=$4', [nom, prenom, email, req.user.id]);
    res.json({ message: 'Profil mis a jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const modifierMotDePasse = async (req, res) => {
  const { ancien, nouveau } = req.body;
  try {
    const result = await pool.query('SELECT mot_de_passe FROM utilisateurs WHERE id=$1', [req.user.id]);
    const valide = await bcrypt.compare(ancien, result.rows[0].mot_de_passe);
    if (!valide) return res.status(400).json({ message: 'Ancien mot de passe incorrect' });
    const hash = await bcrypt.hash(nouveau, 10);
    await pool.query('UPDATE utilisateurs SET mot_de_passe=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'Mot de passe modifie' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getParametresEcole = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM parametres_ecole LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const modifierParametresEcole = async (req, res) => {
  const { nom_ecole, adresse, telephone, email, annee_scolaire, directeur } = req.body;
  try {
    const existe = await pool.query('SELECT id FROM parametres_ecole LIMIT 1');
    if (existe.rows.length > 0) {
      await pool.query(
        'UPDATE parametres_ecole SET nom_ecole=$1, adresse=$2, telephone=$3, email=$4, annee_scolaire=$5, directeur=$6 WHERE id=$7',
        [nom_ecole, adresse, telephone, email, annee_scolaire, directeur, existe.rows[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO parametres_ecole (nom_ecole, adresse, telephone, email, annee_scolaire, directeur) VALUES ($1,$2,$3,$4,$5,$6)',
        [nom_ecole, adresse, telephone, email, annee_scolaire, directeur]
      );
    }
    res.json({ message: 'Parametres mis a jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getProfs = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nom, prenom, email, permissions
      FROM utilisateurs WHERE role='prof' ORDER BY nom, prenom
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const modifierPermissions = async (req, res) => {
  const { permissions } = req.body;
  try {
    await pool.query('UPDATE utilisateurs SET permissions=$1 WHERE id=$2', [JSON.stringify(permissions), req.params.id]);
    res.json({ message: 'Permissions mises a jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getClassesProf = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT c.id, c.nom, c.niveau, c.annee_scolaire, m.nom as matiere
      FROM emploi_du_temps et
      JOIN classes c ON et.classe_id = c.id
      JOIN matieres m ON et.matiere_id = m.id
      WHERE et.prof_id = $1
      ORDER BY c.nom
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = { getProfil, modifierProfil, modifierMotDePasse, getParametresEcole, modifierParametresEcole, getProfs, modifierPermissions, getClassesProf };