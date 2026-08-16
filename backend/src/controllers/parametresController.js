const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { getMailSettingsRow, getMailRuntimeConfig, sendEmail } = require('../services/mailer');
const { encryptText } = require('../utils/crypto');
const { archiveRentreeZip, verifierArchiveToken } = require('../services/archiveRentree');

const getProfil = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nom, prenom, email, role, permissions, telephone, adresse, npa, lieu, sexe, date_naissance, avs, taux_activite, periodes_semaine, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, priorite_pref, specialite FROM utilisateurs WHERE id=$1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const modifierProfil = async (req, res) => {
  const {
    nom, prenom, email, telephone, adresse, npa, lieu, sexe, date_naissance, avs,
    niveau_prefere, lieu_travail_prefere, remarque_lieu_travail, priorite_pref, specialite,
    branches_specialites, type_permis,
  } = req.body;
  try {
    let branchesVal = branches_specialites;
    if (Array.isArray(branchesVal)) branchesVal = JSON.stringify(branchesVal);
    else if (branchesVal == null) branchesVal = null;
    else branchesVal = String(branchesVal);

    await pool.query(
      `UPDATE utilisateurs SET
        nom=$1, prenom=$2, email=$3, telephone=$4, adresse=$5, npa=$6, lieu=$7, sexe=$8,
        date_naissance=$9, avs=$10, niveau_prefere=$11, lieu_travail_prefere=$12,
        remarque_lieu_travail=$13, priorite_pref=$14, specialite=$15,
        branches_specialites=$16, type_permis=$17
       WHERE id=$18`,
      [
        nom, prenom, email, telephone || null, adresse || null, npa || null, lieu || null, sexe || null,
        date_naissance || null, avs || null, niveau_prefere || null, lieu_travail_prefere || null,
        remarque_lieu_travail || null, priorite_pref || null, specialite || null,
        branchesVal, type_permis || null, req.user.id,
      ]
    );
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

const normaliserResponsablesNiveaux = (valeur) => {
  let list = valeur;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch { list = []; }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      nom: String(item?.nom || '').trim(),
      sexe: String(item?.sexe || 'M').toUpperCase() === 'F' ? 'F' : 'M',
      niveaux: Array.isArray(item?.niveaux)
        ? Array.from(new Set(item.niveaux.map((n) => String(n).trim()).filter(Boolean)))
        : String(item?.niveaux || '').split(',').map((n) => n.trim()).filter(Boolean),
    }))
    .filter((item) => item.nom || item.niveaux.length);
};

const syncLegacyDepuisResponsables = (list) => {
  const out = {
    responsable_niveau: null,
    responsable_niveau_csc: null,
    responsable_niveau_cfr: null,
    responsable_niveau_epl: null,
    sexe_responsable_niveau_csc: null,
    sexe_responsable_niveau_cfr: null,
    sexe_responsable_niveau_epl: null,
  };
  if (list[0]?.nom) out.responsable_niveau = list[0].nom;
  for (const cle of ['CSC', 'CFR', 'EPL']) {
    const found = list.find((r) => (r.niveaux || []).some((n) => String(n).toUpperCase() === cle));
    if (!found) continue;
    const key = cle.toLowerCase();
    out[`responsable_niveau_${key}`] = found.nom || null;
    out[`sexe_responsable_niveau_${key}`] = found.sexe || 'M';
  }
  return out;
};

const modifierParametresEcole = async (req, res) => {
  const {
    nom_ecole, adresse, telephone, email, annee_scolaire, date_debut_annee, date_fin_annee,
    responsable_langues_jeunes, responsable_niveau,
    responsable_niveau_csc, responsable_niveau_cfr, responsable_niveau_epl,
    sexe_responsable_langues_jeunes, sexe_responsable_niveau_csc, sexe_responsable_niveau_cfr, sexe_responsable_niveau_epl,
    responsables_niveaux, horaires
  } = req.body;
  try {
    const responsablesNormalises = normaliserResponsablesNiveaux(responsables_niveaux);
    const legacy = Object.keys(req.body).includes('responsables_niveaux')
      ? syncLegacyDepuisResponsables(responsablesNormalises)
      : {
          responsable_niveau: responsable_niveau || null,
          responsable_niveau_csc: responsable_niveau_csc || null,
          responsable_niveau_cfr: responsable_niveau_cfr || null,
          responsable_niveau_epl: responsable_niveau_epl || null,
          sexe_responsable_niveau_csc: sexe_responsable_niveau_csc || null,
          sexe_responsable_niveau_cfr: sexe_responsable_niveau_cfr || null,
          sexe_responsable_niveau_epl: sexe_responsable_niveau_epl || null,
        };
    const existe = await pool.query('SELECT id FROM parametres_ecole LIMIT 1');
    if (existe.rows.length > 0) {
      await pool.query(
        'UPDATE parametres_ecole SET nom_ecole=$1, adresse=$2, telephone=$3, email=$4, annee_scolaire=$5, date_debut_annee=$6, date_fin_annee=$7, responsable_langues_jeunes=$8, responsable_niveau=$9, responsable_niveau_csc=$10, responsable_niveau_cfr=$11, responsable_niveau_epl=$12, sexe_responsable_langues_jeunes=$13, sexe_responsable_niveau_csc=$14, sexe_responsable_niveau_cfr=$15, sexe_responsable_niveau_epl=$16, responsables_niveaux=$17::jsonb, horaires=$18::jsonb WHERE id=$19',
        [
          nom_ecole, adresse, telephone, email, annee_scolaire, date_debut_annee || null, date_fin_annee || null,
          responsable_langues_jeunes || null,
          legacy.responsable_niveau,
          legacy.responsable_niveau_csc,
          legacy.responsable_niveau_cfr,
          legacy.responsable_niveau_epl,
          sexe_responsable_langues_jeunes || null,
          legacy.sexe_responsable_niveau_csc,
          legacy.sexe_responsable_niveau_cfr,
          legacy.sexe_responsable_niveau_epl,
          JSON.stringify(responsablesNormalises),
          horaires ? JSON.stringify(horaires) : '{}',
          existe.rows[0].id
        ]
      );
    } else {
      await pool.query(
        'INSERT INTO parametres_ecole (nom_ecole, adresse, telephone, email, annee_scolaire, date_debut_annee, date_fin_annee, responsable_langues_jeunes, responsable_niveau, responsable_niveau_csc, responsable_niveau_cfr, responsable_niveau_epl, sexe_responsable_langues_jeunes, sexe_responsable_niveau_csc, sexe_responsable_niveau_cfr, sexe_responsable_niveau_epl, responsables_niveaux, horaires) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb)',
        [
          nom_ecole, adresse, telephone, email, annee_scolaire, date_debut_annee || null, date_fin_annee || null,
          responsable_langues_jeunes || null,
          legacy.responsable_niveau,
          legacy.responsable_niveau_csc,
          legacy.responsable_niveau_cfr,
          legacy.responsable_niveau_epl,
          sexe_responsable_langues_jeunes || null,
          legacy.sexe_responsable_niveau_csc,
          legacy.sexe_responsable_niveau_cfr,
          legacy.sexe_responsable_niveau_epl,
          JSON.stringify(responsablesNormalises),
          horaires ? JSON.stringify(horaires) : '{}'
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
      smtp_from_name: row?.smtp_from_name || runtime.fromName || 'Oasis',
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
    const fromNameValue = (smtp_from_name || 'Oasis').trim();
    const fromEmailValue = (smtp_from_email || userValue).trim();
    const activeValue = smtp_active === true;
    const appPasswordValue = typeof smtp_app_password === 'string' ? smtp_app_password.trim() : '';
    const encryptedPassword = appPasswordValue ? encryptText(appPasswordValue) : '';

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
          encryptedPassword,
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
        [activeValue, hostValue, portValue, secureValue, userValue, encryptedPassword, fromNameValue, fromEmailValue]
      );
    }

    res.json({ message: 'Parametres email mis a jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

function getMailErrorHint(err) {
  const code = String(err?.code || '').toUpperCase();
  const message = String(err?.message || '').toLowerCase();

  if (code === 'EAUTH' || message.includes('authentication unsuccessful') || message.includes('auth')) {
    return "Authentification refusee. Verifiez l'email SMTP, le mot de passe d'application, et que SMTP AUTH est active sur le compte Microsoft.";
  }

  if (code === 'ETIMEDOUT' || code === 'ECONNECTION' || message.includes('timeout') || message.includes('connect')) {
    return 'Connexion SMTP impossible. Verifiez le serveur/port, le pare-feu reseau, et le mode TLS (587 sans SSL implicite ou 465 avec SSL implicite).';
  }

  if (message.includes('5.7.57') || message.includes('smtp client authentication is disabled')) {
    return 'SMTP AUTH est desactive cote Microsoft 365. Activez "Authenticated SMTP" au niveau de la boite et du tenant.';
  }

  return "Consultez le detail de l'erreur SMTP puis verifiez host/port/TLS et les identifiants.";
}

const envoyerMailTest = async (req, res) => {
  const { email } = req.body || {};
  const destinataire = String(email || '').trim();
  if (!destinataire) return res.status(400).json({ message: 'Email destinataire manquant' });

  try {
    await sendEmail({
      to: destinataire,
      subject: 'Test configuration email - Oasis',
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
    const smtpCode = err?.code || null;
    const smtpResponse = err?.response || err?.responseCode || null;
    const detail = err?.message || 'Erreur SMTP inconnue';
    res.status(400).json({
      message: "Echec de l'envoi du mail de test",
      erreur: detail,
      code: smtpCode,
      reponse: smtpResponse,
      hint: getMailErrorHint(err),
    });
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

const archiveRentree = archiveRentreeZip;

const resetRentree = async (req, res) => {
  const archiveToken = req.headers['x-archive-token'] || req.body?.archive_token;
  if (!verifierArchiveToken(archiveToken, req.user.id)) {
    return res.status(400).json({
      message: 'Vous devez d’abord télécharger l’archive de l’année en cours avant de confirmer la réinitialisation.',
      archive_required: true,
    });
  }
  // Ordre important : enfants d'élèves / emploi du temps avant les parents.
  // Tables structurelles conservées : classes, pools, creneaux, matieres, utilisateurs prof/admin,
  // disponibilités, niveaux, lieux, salles, paramètres, etc.
  const tables = [
    // Présences (avant emploi_du_temps)
    'presences_v2',
    'presences',
    'absences',

    // Notes / évaluations
    'notes',
    'evaluations',
    'bulletin_criteres',
    'suivi_devoirs',
    'devoirs',

    // Enclassement (références eleves sans CASCADE)
    'affectations_eleves_enc',
    'classes_enclassement',
    'enclassements',

    // Planification année (dispos conservées)
    'affectations',
    'planning_branches',
    'pool_profs',
    'pool_classes',
    'pool_branches',
    'classe_horaires',
    'classe_periodes',
    'emploi_du_temps',
    'plan_classe',
    'inventaire_branches',

    // Comptabilité / facturation
    'paiements',
    'factures_validations',
    'factures_references',
    'commandes_lignes',
    'commandes',

    // Autres données liées aux élèves / année
    'documents_eleves',
    'sanctions_eleves',
    'observations',
    'sorties_scolaires',

    // Élèves en dernier parmi les tables métier
    'eleves',
  ];

  const resultats = [];
  const client = await pool.connect();
  const fail = async (message) => {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    return res.status(500).json({
      message,
      details: resultats,
      erreurs: resultats.filter((r) => r.startsWith('ERR:')),
    });
  };

  try {
    await client.query('BEGIN');

    for (const table of tables) {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      if (!exists.rows.length) {
        resultats.push('SKIP:' + table + '(absente)');
        continue;
      }
      try {
        const r = await client.query('DELETE FROM ' + table);
        resultats.push('OK:' + table + '(' + r.rowCount + ')');
      } catch (err) {
        resultats.push('ERR:' + table + ':' + err.message);
        return fail('Reset rentree echoue — aucune donnée n\'a été supprimée (rollback)');
      }
    }

    try {
      const r = await client.query("DELETE FROM utilisateurs WHERE role IN ('eleve','parent')");
      resultats.push('OK:utilisateurs-eleves-parents(' + r.rowCount + ')');
    } catch (err) {
      resultats.push('ERR:utilisateurs-eleves-parents:' + err.message);
      return fail('Reset rentree echoue — aucune donnée n\'a été supprimée (rollback)');
    }

    await client.query('COMMIT');
    res.json({
      message: 'Reset rentree effectue',
      details: resultats,
      erreurs: [],
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    res.status(500).json({
      message: 'Erreur serveur lors du reset rentree',
      erreur: err.message,
      details: resultats,
      erreurs: ['ERR:transaction:' + err.message],
    });
  } finally {
    client.release();
  }
};

const getAccesProfs = async (req, res) => {
  try {
    const r = await pool.query('SELECT acces_profs FROM parametres_ecole LIMIT 1');
    res.json(r.rows[0]?.acces_profs || {});
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
};

const modifierAccesProfs = async (req, res) => {
  const { acces_profs } = req.body;
  try {
    const existe = await pool.query('SELECT id FROM parametres_ecole LIMIT 1');
    if (existe.rows.length > 0) {
      await pool.query('UPDATE parametres_ecole SET acces_profs=$1 WHERE id=$2', [JSON.stringify(acces_profs), existe.rows[0].id]);
    } else {
      await pool.query('INSERT INTO parametres_ecole (acces_profs) VALUES ($1)', [JSON.stringify(acces_profs)]);
    }
    res.json({ message: 'Accès professeurs mis à jour' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
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
  archiveRentree,
  resetRentree,
  getAccesProfs,
  modifierAccesProfs,
};
