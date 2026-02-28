const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const CHAMPS = 'id, nom, prenom, email, actif, created_at, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis';

const getProfs = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT ' + CHAMPS + ' FROM utilisateurs WHERE role=$1 ORDER BY nom, prenom', ['prof']
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const getProf = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT ' + CHAMPS + ' FROM utilisateurs WHERE id=$1 AND role=$2', [req.params.id, 'prof']
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Professeur non trouve' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const creerProf = async (req, res) => {
  const { nom, prenom, email, mot_de_passe, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis } = req.body;
  try {
    const existe = await pool.query('SELECT id FROM utilisateurs WHERE email=$1', [email]);
    if (existe.rows.length > 0) return res.status(400).json({ message: 'Email deja utilise' });
    const hash = await bcrypt.hash(mot_de_passe || 'Prof123!', 10);
    const result = await pool.query(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis)
       VALUES ($1,$2,$3,$4,'prof',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id, nom, prenom, email`,
      [nom, prenom, email, hash, telephone||null, specialite||null, adresse||null, npa||null, lieu||null, sexe||null, (taux_activite ? parseInt(taux_activite) : null), (periodes_semaine ? parseInt(periodes_semaine) : null), (date_naissance && date_naissance !== '' ? date_naissance : null), avs||null, type_contrat||null, type_permis||null]
    );
    res.status(201).json({ message: 'Professeur cree', prof: result.rows[0] });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const modifierProf = async (req, res) => {
  const { nom, prenom, email, actif, mot_de_passe, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis } = req.body;
  try {
    let query, params;
    if (mot_de_passe && mot_de_passe.trim() !== '') {
      const hash = await bcrypt.hash(mot_de_passe, 10);
      query = `UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, mot_de_passe=$5, telephone=$6, specialite=$7, adresse=$8, npa=$9, lieu=$10, sexe=$11, taux_activite=$12, periodes_semaine=$13, date_naissance=$14, avs=$15, type_contrat=$16, type_permis=$17 WHERE id=$18 AND role='prof' RETURNING id`;
      params = [nom, prenom, email, actif!==undefined?actif:true, hash, telephone||null, specialite||null, adresse||null, npa||null, lieu||null, sexe||null, (taux_activite ? parseInt(taux_activite) : null), (periodes_semaine ? parseInt(periodes_semaine) : null), (date_naissance && date_naissance !== '' ? date_naissance : null), avs||null, type_contrat||null, type_permis||null, req.params.id];
    } else {
      query = `UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, telephone=$5, specialite=$6, adresse=$7, npa=$8, lieu=$9, sexe=$10, taux_activite=$11, periodes_semaine=$12, date_naissance=$13, avs=$14, type_contrat=$15, type_permis=$16 WHERE id=$17 AND role='prof' RETURNING id`;
      params = [nom, prenom, email, actif!==undefined?actif:true, telephone||null, specialite||null, adresse||null, npa||null, lieu||null, sexe||null, (taux_activite ? parseInt(taux_activite) : null), (periodes_semaine ? parseInt(periodes_semaine) : null), (date_naissance && date_naissance !== '' ? date_naissance : null), avs||null, type_contrat||null, type_permis||null, req.params.id];
    }
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Professeur non trouve' });
    res.json({ message: 'Professeur modifie' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const supprimerProf = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM utilisateurs WHERE id=$1 AND role=$2 RETURNING id', [req.params.id, 'prof']);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Professeur non trouve' });
    res.json({ message: 'Professeur supprime' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

module.exports = { getProfs, getProf, creerProf, modifierProf, supprimerProf };