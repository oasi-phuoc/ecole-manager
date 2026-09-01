const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../services/mailer');

const CHAMPS = 'id, nom, prenom, email, actif, created_at, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, role_acces, identifiant';

const getEmployes = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT ' + CHAMPS + ' FROM utilisateurs WHERE role=$1 ORDER BY nom, prenom', ['admin']
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const getEmploye = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT ' + CHAMPS + ' FROM utilisateurs WHERE id=$1 AND role=$2', [req.params.id, 'admin']
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Employe administratif non trouve' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const creerEmploye = async (req, res) => {
  const { nom, prenom, email, mot_de_passe, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, role_acces, identifiant } = req.body;
  try {
    const existe = await pool.query('SELECT id FROM utilisateurs WHERE email=$1', [email]);
    if (existe.rows.length > 0) return res.status(400).json({ message: 'Email deja utilise' });
    const hash = await bcrypt.hash(mot_de_passe || 'Admin123!', 10);
    const identifiantFinal = (identifiant || '').trim() || (String(prenom||'').slice(0,3) + String(nom||'').slice(0,3)).toLowerCase() || null;
    const result = await pool.query(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, role_acces, identifiant)
       VALUES ($1,$2,$3,$4,'admin',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING id, nom, prenom, email`,
      [nom, prenom, email, hash, telephone||null, specialite||null, adresse||null, npa||null, lieu||null, sexe||null, (taux_activite ? parseInt(taux_activite) : null), (periodes_semaine ? parseInt(periodes_semaine) : null), (date_naissance && date_naissance !== '' ? date_naissance : null), avs||null, type_contrat||null, type_permis||null, niveau_prefere||null, branches_specialites||null, lieu_travail_prefere||null, remarque_lieu_travail||null, role_acces||'employe', identifiantFinal]
    );
    res.status(201).json({ message: 'Employe administratif cree', employe: result.rows[0] });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const modifierEmploye = async (req, res) => {
  const { nom, prenom, email, actif, mot_de_passe, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, role_acces, identifiant } = req.body;
  try {
    let query, params;
    if (mot_de_passe && mot_de_passe.trim() !== '') {
      const hash = await bcrypt.hash(mot_de_passe, 10);
      query = `UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, mot_de_passe=$5, telephone=$6, specialite=$7, adresse=$8, npa=$9, lieu=$10, sexe=$11, taux_activite=$12, periodes_semaine=$13, date_naissance=$14, avs=$15, type_contrat=$16, type_permis=$17, niveau_prefere=$18, branches_specialites=$19, lieu_travail_prefere=$20, remarque_lieu_travail=$21, role_acces=$22, identifiant=$23 WHERE id=$24 AND role='admin' RETURNING id`;
      params = [nom, prenom, email, actif!==undefined?actif:true, hash, telephone||null, specialite||null, adresse||null, npa||null, lieu||null, sexe||null, (taux_activite ? parseInt(taux_activite) : null), (periodes_semaine ? parseInt(periodes_semaine) : null), (date_naissance && date_naissance !== '' ? date_naissance : null), avs||null, type_contrat||null, type_permis||null, niveau_prefere||null, branches_specialites||null, lieu_travail_prefere||null, remarque_lieu_travail||null, role_acces||'employe', identifiant||null, req.params.id];
    } else {
      query = `UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, telephone=$5, specialite=$6, adresse=$7, npa=$8, lieu=$9, sexe=$10, taux_activite=$11, periodes_semaine=$12, date_naissance=$13, avs=$14, type_contrat=$15, type_permis=$16, niveau_prefere=$17, branches_specialites=$18, lieu_travail_prefere=$19, remarque_lieu_travail=$20, role_acces=$21, identifiant=$22 WHERE id=$23 AND role='admin' RETURNING id`;
      params = [nom, prenom, email, actif!==undefined?actif:true, telephone||null, specialite||null, adresse||null, npa||null, lieu||null, sexe||null, (taux_activite ? parseInt(taux_activite) : null), (periodes_semaine ? parseInt(periodes_semaine) : null), (date_naissance && date_naissance !== '' ? date_naissance : null), avs||null, type_contrat||null, type_permis||null, niveau_prefere||null, branches_specialites||null, lieu_travail_prefere||null, remarque_lieu_travail||null, role_acces||'employe', identifiant||null, req.params.id];
    }
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Employe administratif non trouve' });
    res.json({ message: 'Employe administratif modifie' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const supprimerEmploye = async (req, res) => {
  try {
    if (String(req.user?.id) === String(req.params.id)) {
      return res.status(400).json({ message: 'Suppression de votre propre compte interdite' });
    }
    const result = await pool.query('DELETE FROM utilisateurs WHERE id=$1 AND role=$2 RETURNING id', [req.params.id, 'admin']);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Employe administratif non trouve' });
    res.json({ message: 'Employe administratif supprime' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const envoyerAcces = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT nom, prenom, email FROM utilisateurs WHERE id=$1 AND role=$2', [id, 'admin']);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Employe administratif non trouvé' });
    const employe = result.rows[0];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    let mdp = '';
    for (let i = 0; i < 10; i++) mdp += chars[Math.floor(Math.random() * chars.length)];
    const hash = await bcrypt.hash(mdp, 10);
    await pool.query('UPDATE utilisateurs SET mot_de_passe=$1, doit_changer_mdp=true WHERE id=$2', [hash, id]);
    await sendEmail({
      to: employe.email,
      subject: 'Vos accès École Manager',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#f8fafc;border-radius:12px">
          <h2 style="color:#6366f1">🎓 École Manager</h2>
          <p>Bonjour <b>${employe.prenom} ${employe.nom}</b>,</p>
          <p>Voici vos accès pour vous connecter à l'application :</p>
          <div style="background:white;padding:20px;border-radius:8px;border-left:4px solid #6366f1;margin:20px 0">
            <p style="margin:0"><b>Email :</b> ${employe.email}</p>
            <p style="margin:8px 0 0"><b>Mot de passe temporaire :</b> <code style="background:#e0e7ff;padding:4px 8px;border-radius:4px;font-size:16px">${mdp}</code></p>
          </div>
          <p style="color:#ef4444;font-weight:bold">⚠️ Vous devrez changer ce mot de passe lors de votre première connexion.</p>
        </div>
      `,
      text: `Bonjour ${employe.prenom} ${employe.nom}, vos acces Ecole Manager sont prets. Email: ${employe.email}. Mot de passe temporaire: ${mdp}.`
    });
    res.json({ message: 'Email envoyé à ' + employe.email });
  } catch (err) {
    res.status(500).json({ message: 'Erreur envoi email', erreur: err.message });
  }
};

const getDocuments = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nom, type, taille, created_at FROM documents_profs WHERE prof_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const uploadDocument = async (req, res) => {
  const { nom, type, contenu, taille } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO documents_profs (prof_id, nom, type, contenu, taille) VALUES ($1,$2,$3,$4,$5) RETURNING id, nom, type, taille, created_at',
      [req.params.id, nom, type || 'Autre', contenu, taille || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const telechargerDocument = async (req, res) => {
  try {
    const result = await pool.query('SELECT nom, contenu FROM documents_profs WHERE id=$1 AND prof_id=$2', [req.params.docId, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Document non trouvé' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const supprimerDocument = async (req, res) => {
  try {
    await pool.query('DELETE FROM documents_profs WHERE id=$1 AND prof_id=$2', [req.params.docId, req.params.id]);
    res.json({ message: 'Document supprimé' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

module.exports = {
  getEmployes,
  getEmploye,
  creerEmploye,
  modifierEmploye,
  supprimerEmploye,
  envoyerAcces,
  getDocuments,
  uploadDocument,
  telechargerDocument,
  supprimerDocument,
};

