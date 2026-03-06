const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { getMailSettingsRow, getMailRuntimeConfig, sendEmail } = require('../services/mailer');

const getProfil = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nom, prenom, email, role, permissions FROM utilisateurs WHERE id=$1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const modifierProfil = async (req, res) => {
  const { nom, prenom, email } = req.body;
  try {
    await pool.query('UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3 WHERE id=$4', [nom, prenom, email, req.user.id]);
    res.json({ message: 'Profil mis a jour' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
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
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const getParametresEcole = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM parametres_ecole LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const modifierParametresEcole = async (req, res) => {
  const {
    nom_ecole, adresse, telephone, email, annee_scolaire,
    responsable_langues_jeunes, responsable_niveau,
    responsable_niveau_csc, responsable_niveau_cfr, responsable_niveau_epl,
    sexe_responsable_langues_jeunes, sexe_responsable_niveau_csc, sexe_responsable_niveau_cfr, sexe_responsable_niveau_epl
  } = req.body;
  try {
    const existe = await pool.query('SELECT id FROM parametres_ecole LIMIT 1');
    if (existe.rows.length > 0) {
      await pool.query(
        'UPDATE parametres_ecole SET nom_ecole=$1, adresse=$2, telephone=$3, email=$4, annee_scolaire=$5, responsable_langues_jeunes=$6, responsable_niveau=$7, responsable_niveau_csc=$8, responsable_niveau_cfr=$9, responsable_niveau_epl=$10, sexe_responsable_langues_jeunes=$11, sexe_responsable_niveau_csc=$12, sexe_responsable_niveau_cfr=$13, sexe_responsable_niveau_epl=$14 WHERE id=$15',
        [
          nom_ecole, adresse, telephone, email, annee_scolaire,
          responsable_langues_jeunes || null,
          responsable_niveau || null,
          responsable_niveau_csc || null,
          responsable_niveau_cfr || null,
          responsable_niveau_epl || null,
          sexe_responsable_langues_jeunes || null,
          sexe_responsable_niveau_csc || null,
          sexe_responsable_niveau_cfr || null,
          sexe_responsable_niveau_epl || null,
          existe.rows[0].id
        ]
      );
    } else {
      await pool.query(
        'INSERT INTO parametres_ecole (nom_ecole, adresse, telephone, email, annee_scolaire, responsable_langues_jeunes, responsable_niveau, responsable_niveau_csc, responsable_niveau_cfr, responsable_niveau_epl, sexe_responsable_langues_jeunes, sexe_responsable_niveau_csc, sexe_responsable_niveau_cfr, sexe_responsable_niveau_epl) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',
        [
          nom_ecole, adresse, telephone, email, annee_scolaire,
          responsable_langues_jeunes || null,
          responsable_niveau || null,
          responsable_niveau_csc || null,
          responsable_niveau_cfr || null,
          responsable_niveau_epl || null,
          sexe_responsable_langues_jeunes || null,
          sexe_responsable_niveau_csc || null,
          sexe_responsable_niveau_cfr || null,
          sexe_responsable_niveau_epl || null
        ]
      );
    }
    res.json({ message: 'Parametres mis a jour' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const getParametresMail = async (req, res) => {
  try {
    const row = await getMailSettingsRow();
    const runtime = await getMailRuntimeConfig();
    res.json({
      smtp_active: row ? row.smtp_active === true : false,
      smtp_host: row?.smtp_host || runtime.host || 'smtp.office365.com',
      smtp_port: row?.smtp_port || runtime.port || 587,
      smtp_secure: row ? row.smtp_secure === true : false,
      smtp_user: row?.smtp_user || runtime.user || '',
      smtp_from_name: row?.smtp_from_name || runtime.fromName || 'Ecole Manager',
      smtp_from_email: row?.smtp_from_email || runtime.fromEmail || '',
      has_app_password: Boolean(row?.smtp_app_password),
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const modifierParametresMail = async (req, res) => {
  const {
    smtp_active,
    smtp_host,
    smtp_port,
    smtp_secure,
    smtp_user,
    smtp_from_name,
    smtp_from_email,
    smtp_app_password,
  } = req.body || {};

  try {
    const existe = await getMailSettingsRow();
    const hostValue = (smtp_host || 'smtp.office365.com').trim();
    const portValue = Number(smtp_port) || 587;
    const secureValue = smtp_secure === true;
    const userValue = (smtp_user || '').trim();
    const fromNameValue = (smtp_from_name || 'Ecole Manager').trim();
    const fromEmailValue = (smtp_from_email || userValue).trim();
    const activeValue = smtp_active === true;
    const appPasswordValue = typeof smtp_app_password === 'string' ? smtp_app_password.trim() : '';

    if (activeValue && (!userValue || (!appPasswordValue && !existe?.smtp_app_password))) {
      return res.status(400).json({
        message: "Pour activer l'envoi d'emails, renseignez l'utilisateur SMTP et le mot de passe d'application.",
      });
    }

    if (existe) {
      await pool.query(
        `UPDATE parametres_mail
         SET smtp_active=$1, smtp_host=$2, smtp_port=$3, smtp_secure=$4, smtp_user=$5,
             smtp_app_password=COALESCE(NULLIF($6,''), smtp_app_password),
             smtp_from_name=$7, smtp_from_email=$8, updated_at=NOW()
         WHERE id=$9`,
        [
          activeValue,
          hostValue,
          portValue,
          secureValue,
          userValue,
          appPasswordValue,
          fromNameValue,
          fromEmailValue,
          existe.id,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO parametres_mail
          (smtp_active, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_app_password, smtp_from_name, smtp_from_email)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [activeValue, hostValue, portValue, secureValue, userValue, appPasswordValue, fromNameValue, fromEmailValue]
      );
    }

    res.json({ message: 'Parametres email mis a jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const envoyerMailTest = async (req, res) => {
  const { email } = req.body || {};
  const destinataire = String(email || '').trim();
  if (!destinataire) return res.status(400).json({ message: 'Email destinataire manquant' });

  try {
    await sendEmail({
      to: destinataire,
      subject: 'Test configuration email - Ecole Manager',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#f8fafc;border-radius:12px">
          <h2 style="margin:0 0 10px;color:#6366f1">Configuration email OK</h2>
          <p style="margin:0 0 10px;color:#111827">
            Ce message confirme que la configuration SMTP admin fonctionne.
          </p>
          <p style="margin:0;color:#6b7280;font-size:12px">
            Si vous utilisez la double authentification Outlook, gardez un mot de passe d'application actif.
          </p>
        </div>
      `,
      text: 'Configuration email OK. La configuration SMTP admin fonctionne.',
    });
    res.json({ message: 'Email de test envoye' });
  } catch (err) {
    res.status(400).json({ message: "Echec de l'envoi du mail de test", erreur: err.message });
  }
};

const getProfs = async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nom, prenom, email, permissions FROM utilisateurs WHERE role='prof' ORDER BY nom, prenom");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const modifierPermissions = async (req, res) => {
  const { permissions } = req.body;
  try {
    await pool.query('UPDATE utilisateurs SET permissions=$1 WHERE id=$2', [JSON.stringify(permissions), req.params.id]);
    res.json({ message: 'Permissions mises a jour' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
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
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const resetTout = async (req, res) => {
  const tables = [
    'presences_v2', 'presences', 'absences',
    'notes', 'planning_branches', 'branches',
    'classe_horaires', 'planning_affectations', 'planning_pools', 'disponibilites',
    'paiements', 'comptabilite', 'calendrier', 'observations',
    'eleves', 'classes', 'profs',
    'messages', 'notifications'
  ];
  const resultats = [];
  for (const table of tables) {
    try {
      const r = await pool.query('DELETE FROM ' + table);
      resultats.push('OK:' + table + '(' + r.rowCount + ')');
    } catch (err) {
      resultats.push('ERR:' + table + ':' + err.message);
    }
  }
  try {
    const r = await pool.query("DELETE FROM utilisateurs WHERE role != 'admin'");
    resultats.push('OK:utilisateurs(' + r.rowCount + ')');
  } catch (err) { resultats.push('ERR:utilisateurs:' + err.message); }

  const erreurs = resultats.filter(r => r.startsWith('ERR'));
  res.json({
    message: erreurs.length === 0 ? 'Reset complet effectue' : 'Reset partiel - ' + erreurs.length + ' erreur(s)',
    details: resultats,
    erreurs: erreurs
  });
};

const resetRentree = async (req, res) => {
  const tables = [
    // Présences
    'presences_v2', 'presences', 'absences',

    // Notes
    'notes', 'evaluations',

    // Planification / affectations
    'affectations', 'planning_branches', 'pool_profs', 'pool_classes', 'pool_branches',
    'classe_horaires', 'emploi_du_temps', 'plan_classe',

    // Comptabilité / facturation
    'paiements', 'comptabilite',

    // Données liées aux élèves
    'documents_eleves', 'sanctions_eleves', 'observations',
    'eleves'
  ];

  const resultats = [];
  for (const table of tables) {
    try {
      const r = await pool.query('DELETE FROM ' + table);
      resultats.push('OK:' + table + '(' + r.rowCount + ')');
    } catch (err) {
      resultats.push('ERR:' + table + ':' + err.message);
    }
  }

  try {
    const r = await pool.query("DELETE FROM utilisateurs WHERE role IN ('eleve','parent')");
    resultats.push('OK:utilisateurs-eleves-parents(' + r.rowCount + ')');
  } catch (err) {
    resultats.push('ERR:utilisateurs-eleves-parents:' + err.message);
  }

  const erreurs = resultats.filter(r => r.startsWith('ERR'));
  res.json({
    message: erreurs.length === 0 ? 'Reset rentree effectue' : 'Reset rentree partiel - ' + erreurs.length + ' erreur(s)',
    details: resultats,
    erreurs: erreurs
  });
};

module.exports = {
  getProfil,
  modifierProfil,
  modifierMotDePasse,
  getParametresEcole,
  modifierParametresEcole,
  getParametresMail,
  modifierParametresMail,
  envoyerMailTest,
  getProfs,
  modifierPermissions,
  getClassesProf,
  resetTout,
  resetRentree,
};
