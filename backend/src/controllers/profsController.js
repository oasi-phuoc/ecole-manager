const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../services/mailer');

const CHAMPS = 'id, nom, prenom, email, actif, created_at, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, priorite_pref, type_prof, identifiant';

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
  const { nom, prenom, email, mot_de_passe, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, priorite_pref, type_prof, identifiant } = req.body;
  try {
    const existe = await pool.query('SELECT id FROM utilisateurs WHERE email=$1', [email]);
    if (existe.rows.length > 0) return res.status(400).json({ message: 'Email deja utilise' });
    const hash = await bcrypt.hash(mot_de_passe || 'EcoleManager2024!', 10);
    const identifiantFinal = (identifiant || '').trim() || (String(prenom||'').slice(0,3) + String(nom||'').slice(0,3)).toLowerCase() || null;
    const result = await pool.query(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, priorite_pref, type_prof, identifiant)
       VALUES ($1,$2,$3,$4,'prof',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING id, nom, prenom, email`,
      [nom, prenom, email, hash, telephone||null, specialite||null, adresse||null, npa||null, lieu||null, sexe||null, (taux_activite ? parseInt(taux_activite) : null), (periodes_semaine ? parseInt(periodes_semaine) : null), (date_naissance && date_naissance !== '' ? date_naissance : null), avs||null, type_contrat||null, type_permis||null, niveau_prefere||null, branches_specialites||null, lieu_travail_prefere||null, remarque_lieu_travail||null, priorite_pref || 'niveau', type_prof||null, identifiantFinal]
    );
    res.status(201).json({ message: 'Professeur cree', prof: result.rows[0] });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const modifierProf = async (req, res) => {
  const { nom, prenom, email, actif, mot_de_passe, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, priorite_pref, type_prof, identifiant } = req.body;
  try {
    let query, params;
    if (mot_de_passe && mot_de_passe.trim() !== '') {
      const hash = await bcrypt.hash(mot_de_passe, 10);
      query = `UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, mot_de_passe=$5, telephone=$6, specialite=$7, adresse=$8, npa=$9, lieu=$10, sexe=$11, taux_activite=$12, periodes_semaine=$13, date_naissance=$14, avs=$15, type_contrat=$16, type_permis=$17, niveau_prefere=$18, branches_specialites=$19, lieu_travail_prefere=$20, remarque_lieu_travail=$21, priorite_pref=$22, type_prof=$23, identifiant=$24 WHERE id=$25 AND role='prof' RETURNING id`;
      params = [nom, prenom, email, actif!==undefined?actif:true, hash, telephone||null, specialite||null, adresse||null, npa||null, lieu||null, sexe||null, (taux_activite ? parseInt(taux_activite) : null), (periodes_semaine ? parseInt(periodes_semaine) : null), (date_naissance && date_naissance !== '' ? date_naissance : null), avs||null, type_contrat||null, type_permis||null, niveau_prefere||null, branches_specialites||null, lieu_travail_prefere||null, remarque_lieu_travail||null, priorite_pref || 'niveau', type_prof||null, identifiant||null, req.params.id];
    } else {
      query = `UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, telephone=$5, specialite=$6, adresse=$7, npa=$8, lieu=$9, sexe=$10, taux_activite=$11, periodes_semaine=$12, date_naissance=$13, avs=$14, type_contrat=$15, type_permis=$16, niveau_prefere=$17, branches_specialites=$18, lieu_travail_prefere=$19, remarque_lieu_travail=$20, priorite_pref=$21, type_prof=$22, identifiant=$23 WHERE id=$24 AND role='prof' RETURNING id`;
      params = [nom, prenom, email, actif!==undefined?actif:true, telephone||null, specialite||null, adresse||null, npa||null, lieu||null, sexe||null, (taux_activite ? parseInt(taux_activite) : null), (periodes_semaine ? parseInt(periodes_semaine) : null), (date_naissance && date_naissance !== '' ? date_naissance : null), avs||null, type_contrat||null, type_permis||null, niveau_prefere||null, branches_specialites||null, lieu_travail_prefere||null, remarque_lieu_travail||null, priorite_pref || 'niveau', type_prof||null, identifiant||null, req.params.id];
    }
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Professeur non trouve' });
    res.json({ message: 'Professeur modifie' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const supprimerProf = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const id = req.params.id;
    const check = await client.query('SELECT id FROM utilisateurs WHERE id=$1 AND role=$2', [id, 'prof']);
    if (check.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Professeur non trouve' }); }
    // SET NULL sur les colonnes qui acceptent NULL
    await client.query('UPDATE classes SET prof_principal_id=NULL WHERE prof_principal_id=$1', [id]);
    await client.query('UPDATE tcf_state SET updated_by=NULL WHERE updated_by=$1', [id]);
    await client.query('UPDATE documents_administratifs SET auteur_id=NULL WHERE auteur_id=$1', [id]);
    await client.query('UPDATE inventaire_branches SET auteur_id=NULL WHERE auteur_id=$1', [id]);
    await client.query('UPDATE observations SET auteur_id=NULL WHERE auteur_id=$1', [id]);
    // Nettoyer le JSON tcf_state (pool + affectation) pour retirer l'ID du prof
    const tcfKeys = ['pool', 'affectation', 'resultats'];
    for (const cle of tcfKeys) {
      const row = await client.query('SELECT donnees FROM tcf_state WHERE cle=$1', [cle]);
      if (!row.rows.length) continue;
      const donnees = row.rows[0].donnees;
      // selectedBySite : { site1: [id1, id2, ...], ... }
      if (donnees.selectedBySite) {
        for (const site of Object.keys(donnees.selectedBySite)) {
          donnees.selectedBySite[site] = (donnees.selectedBySite[site] || []).filter(pid => String(pid) !== String(id));
        }
      }
      // poolCellOverrides : clés du type "siteKey::profId::jour::moment"
      if (donnees.poolCellOverrides) {
        for (const k of Object.keys(donnees.poolCellOverrides)) {
          if (k.includes(`::${id}::`) || k.endsWith(`::${id}`)) delete donnees.poolCellOverrides[k];
        }
      }
      // rolesByPoolDemi : { "siteKey::demiId": { profId: role, ... } }
      if (donnees.rolesByPoolDemi) {
        for (const demi of Object.keys(donnees.rolesByPoolDemi)) {
          delete donnees.rolesByPoolDemi[demi][String(id)];
        }
      }
      await client.query('UPDATE tcf_state SET donnees=$1 WHERE cle=$2', [JSON.stringify(donnees), cle]);
    }
    // DELETE dans toutes les tables liées
    await client.query('DELETE FROM affectations WHERE prof_id=$1', [id]);
    await client.query('DELETE FROM calendrier_prof WHERE prof_id=$1', [id]);
    await client.query('DELETE FROM disponibilites WHERE prof_id=$1', [id]);
    await client.query('DELETE FROM documents_profs WHERE prof_id=$1', [id]);
    await client.query('DELETE FROM emploi_du_temps WHERE prof_id=$1', [id]);
    await client.query('DELETE FROM evaluations WHERE prof_id=$1', [id]);
    await client.query('DELETE FROM messages WHERE expediteur_id=$1 OR destinataire_id=$1', [id]);
    await client.query('DELETE FROM notes_personnelles WHERE utilisateur_id=$1', [id]);
    await client.query('DELETE FROM notifications WHERE utilisateur_id=$1', [id]);
    await client.query('DELETE FROM planning_branches WHERE prof_id=$1', [id]);
    await client.query('DELETE FROM pool_profs WHERE prof_id=$1', [id]);
    await client.query('DELETE FROM prof_couleurs WHERE prof_id=$1', [id]);
    // Supprimer le professeur
    await client.query('DELETE FROM utilisateurs WHERE id=$1', [id]);
    await client.query('COMMIT');
    res.json({ message: 'Professeur supprime' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  } finally {
    client.release();
  }
};

const envoyerAcces = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT nom, prenom, email FROM utilisateurs WHERE id=$1 AND role=$2', [id, 'prof']);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Professeur non trouvé' });
    const prof = result.rows[0];

    // Générer mdp aléatoire
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    let mdp = '';
    for (let i = 0; i < 10; i++) mdp += chars[Math.floor(Math.random() * chars.length)];

    // Hasher et sauver
    const hash = await bcrypt.hash(mdp, 10);
    await pool.query('UPDATE utilisateurs SET mot_de_passe=$1, doit_changer_mdp=true WHERE id=$2', [hash, id]);

    // Envoyer email (configuration depuis Parametres > Envoi des mails)
    await sendEmail({
      to: prof.email,
      subject: 'Vos accès École Manager',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#f8fafc;border-radius:12px">
          <h2 style="color:#6366f1">🎓 École Manager</h2>
          <p>Bonjour <b>${prof.prenom} ${prof.nom}</b>,</p>
          <p>Voici vos accès pour vous connecter à l'application :</p>
          <div style="background:white;padding:20px;border-radius:8px;border-left:4px solid #6366f1;margin:20px 0">
            <p style="margin:0"><b>Email :</b> ${prof.email}</p>
            <p style="margin:8px 0 0"><b>Mot de passe temporaire :</b> <code style="background:#e0e7ff;padding:4px 8px;border-radius:4px;font-size:16px">${mdp}</code></p>
          </div>
          <p style="color:#ef4444;font-weight:bold">⚠️ Vous devrez changer ce mot de passe lors de votre première connexion.</p>
          <p style="color:#94a3b8;font-size:12px">Ce message a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
      `,
      text: `Bonjour ${prof.prenom} ${prof.nom}, vos acces Ecole Manager sont prets. Email: ${prof.email}. Mot de passe temporaire: ${mdp}.`
    });

    res.json({ message: 'Email envoyé à ' + prof.email });
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

module.exports = { getProfs, getProf, creerProf, modifierProf, supprimerProf, envoyerAcces, getDocuments, uploadDocument, telechargerDocument, supprimerDocument };