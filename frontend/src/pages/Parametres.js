/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';

const normaliserBranchesSpecialites = (valeur) => {
  if (!valeur) return [];
  if (Array.isArray(valeur)) return Array.from(new Set(valeur.map(v => String(v).trim()).filter(Boolean)));
  const brut = String(valeur).trim();
  if (!brut) return [];
  try { const parsed = JSON.parse(brut); if (Array.isArray(parsed)) return Array.from(new Set(parsed.map(v => String(v).trim()).filter(Boolean))); } catch {}
  return brut.split(',').map(v => v.trim()).filter(Boolean);
};

const HORAIRE_DEFAUT = {
  matin: [
    { label: 'P1', debut: '08:20', fin: '09:05' },
    { label: 'P2', debut: '09:05', fin: '09:45' },
    { label: 'Pause', debut: '09:45', fin: '10:05' },
    { label: 'P3', debut: '10:05', fin: '10:55' },
    { label: 'P4', debut: '10:55', fin: '11:40' },
  ],
  apresmidi: [
    { label: 'P1', debut: '13:30', fin: '14:15' },
    { label: 'P2', debut: '14:15', fin: '15:00' },
    { label: 'Pause', debut: '15:00', fin: '15:20' },
    { label: 'P3', debut: '15:20', fin: '16:05' },
    { label: 'P4', debut: '16:05', fin: '16:50' },
  ]
};

const MODULES_ACCES_PROFS = [
  { key: 'employes_admin',  label: 'Employés', defaut: false, onglets: [{ key: 'employes_admin_base', label: 'Base — Nom, prénom, email, téléphone, naissance' }, { key: 'employes_admin_etendu', label: 'Étendu — Toutes les informations' }, { key: 'employes_admin_gestion', label: 'Ajout, suppression et statut actif/inactif' }] },
  { key: 'professeurs',     label: 'Professeurs',      defaut: true,  onglets: [{ key: 'professeurs_base', label: 'Base — Nom, prénom, email, téléphone, naissance' }, { key: 'professeurs_etendu', label: 'Étendu — Toutes les informations' }, { key: 'professeurs_gestion', label: 'Ajout, suppression et statut actif/inactif' }] },
  { key: 'eleves',          label: 'Élèves',          defaut: true,  onglets: [{ key: 'eleves_base', label: 'Base — Photo, nom, prénom, nationalité, classe, naissance, observations, sanctions, documents' }, { key: 'eleves_etendu', label: 'Étendu — Toutes les informations' }, { key: 'eleves_import', label: 'Ajout, suppression et statut actif/inactif' }] },
  { key: 'branches',        label: 'Branches',         defaut: false, onglets: [] },
  { key: 'classes',         label: 'Classes',          defaut: false, onglets: [{ key: 'classes_base', label: 'Base — Tableau (détail, classe, titulaire, note)' }, { key: 'classes_gestion', label: 'Ajout, suppression et statut actif/inactif' }] },
  { key: 'emploi_du_temps', label: 'Emploi du temps',  defaut: false, onglets: [{ key: 'emploi_du_temps_planification', label: 'Planification — Pools, disponibilités, affectations' }, { key: 'emploi_du_temps_plannings', label: 'Vue des plannings' }] },
  { key: 'presences',       label: 'Présences',        defaut: true,  onglets: [{ key: 'presences_base', label: 'Base — Tout sauf importation LORA' }, { key: 'presences_import', label: 'Importer LORA' }] },
  { key: 'notes',           label: 'Notes',            defaut: true,  onglets: [{ key: 'notes_notes', label: 'Notes' }, { key: 'notes_evaluations', label: 'Évaluations' }] },
  { key: 'tcf',             label: 'TCF',              defaut: false, onglets: [{ key: 'tcf_liste', label: 'Liste' }] },
  { key: 'calendrier',      label: 'Calendrier',       defaut: true,  onglets: [{ key: 'calendrier_scolaire', label: 'Calendrier scolaire' }, { key: 'calendrier_agenda', label: 'Agenda personnel' }] },
  { key: 'comptabilite',    label: 'Comptabilité',     defaut: false, onglets: [{ key: 'comptabilite_factures', label: 'Factures' }, { key: 'comptabilite_paiements', label: 'Paiements' }, { key: 'comptabilite_prix', label: 'Liste de prix' }] },
  { key: 'documents',       label: 'Documents',        defaut: false, onglets: [{ key: 'documents_administratifs', label: 'Administratifs' }, { key: 'documents_pedagogiques', label: 'Pédagogiques' }, { key: 'documents_seances', label: 'Séances' }, { key: 'documents_formulaires', label: 'Formulaires' }, { key: 'documents_divers', label: 'Divers' }] },
  { key: 'statistiques',       label: 'Statistiques',        defaut: false, onglets: [{ key: 'statistiques_dashboard', label: 'Tableau de bord' }] },
  { key: 'enclassement',      label: 'Enclassement',        defaut: false, onglets: [] },
  { key: 'sorties_scolaires', label: 'Sorties scolaires',   defaut: false, onglets: [{ key: 'sorties_automne', label: 'Automne' }, { key: 'sorties_juin', label: 'Juin' }, { key: 'sorties_autres', label: 'Autres' }, { key: 'sorties_suivi', label: 'Tableau de suivi' }] },
];

export default function Parametres() {
  const [searchParams] = useSearchParams();
  const onglet = searchParams.get('tab') || 'profil';
  const [profil, setProfil] = useState({ nom: '', prenom: '', email: '', role: '', telephone: '', adresse: '', npa: '', lieu: '', sexe: '', date_naissance: '', avs: '', taux_activite: '', periodes_semaine: '', type_contrat: '', type_permis: '', niveau_prefere: '', lieu_travail_prefere: '', remarque_lieu_travail: '', priorite_pref: 'niveau', specialite: '' });
  const [ecole, setEcole] = useState({
    nom_ecole: '', adresse: '', telephone: '', email: '', annee_scolaire: '', date_debut_annee: '',
    responsable_langues_jeunes: '', responsable_niveau: '',
    responsable_niveau_csc: '', responsable_niveau_cfr: '', responsable_niveau_epl: '',
    sexe_responsable_langues_jeunes: 'M', sexe_responsable_niveau_csc: 'M', sexe_responsable_niveau_cfr: 'M', sexe_responsable_niveau_epl: 'M'
  });
  const [mdp, setMdp] = useState({ ancien: '', nouveau: '', confirmation: '' });
  const [profs, setProfs] = useState([]);
  const [profSelectionne, setProfSelectionne] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [accesParRole, setAccesParRole] = useState({ professeurs: {}, employes: {}, responsables: {}, admins: {} });
  const [accesRoleOnglet, setAccesRoleOnglet] = useState('professeurs');
  const [msgAccesProfs, setMsgAccesProfs] = useState('');
  const [moduleOuvert, setModuleOuvert] = useState(null);
  const [sousOngletEcole, setSousOngletEcole] = useState('adresse');
  const [horairesEcole, setHorairesEcole] = useState({});
  const [lieuHoraireOnglet, setLieuHoraireOnglet] = useState('defaut');
  const [sousOngletProfil, setSousOngletProfil] = useState('connexion');
  const [mdpOuvert, setMdpOuvert] = useState(false);
  const [branchesDisponiblesProfil, setBranchesDisponiblesProfil] = useState([]);
  const [msgProfil, setMsgProfil] = useState('');
  const [msgEcole, setMsgEcole] = useState('');
  const [msgMdp, setMsgMdp] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSetupToken, setMfaSetupToken] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaOtpAuthUrl, setMfaOtpAuthUrl] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBackupCodes, setMfaBackupCodes] = useState([]);
  const [mfaBackupRemaining, setMfaBackupRemaining] = useState(0);
  const [msgMfa, setMsgMfa] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [msgPerms, setMsgPerms] = useState('');
  const [mail, setMail] = useState({
    smtp_active: false,
    smtp_host: 'smtp.office365.com',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_from_name: 'Ecole Manager',
    smtp_from_email: '',
    smtp_app_password: '',
    has_app_password: false,
  });
  const [mailTestTo, setMailTestTo] = useState('');
  const [msgMail, setMsgMail] = useState('');
  const [msgMailTest, setMsgMailTest] = useState('');
  const [testMailLoading, setTestMailLoading] = useState(false);
  const [resetEtape, setResetEtape] = useState(0); // 0=idle, 1=confirm1, 2=confirm2, 3=loading, 4=done
  const [resetMsg, setResetMsg] = useState('');
  const [resetRentreeEtape, setResetRentreeEtape] = useState(0); // 0=idle, 1=confirm1, 2=confirm2, 3=loading, 4=done
  const [resetRentreeMsg, setResetRentreeMsg] = useState('');
  // Données (niveaux, lieux, salles)
  const [niveauxDB, setNiveauxDB] = useState([]);
  const [lieuxTravailDB, setLieuxTravailDB] = useState([]);
  const [sallesDB, setSallesDB] = useState([]);
  const [donneesNiveauForm, setDonneesNiveauForm] = useState({ nom: '' });
  const [donneesLieuForm, setDonneesLieuForm] = useState({ nom: '' });
  const [donneesSalleForm, setDonneesSalleForm] = useState({ nom: '', lieu_travail_id: '' });
  const [donneesNiveauEdit, setDonneesNiveauEdit] = useState(null);
  const [donneesLieuEdit, setDonneesLieuEdit] = useState(null);
  const [donneesSalleEdit, setDonneesSalleEdit] = useState(null);
  const dragNiveauIdx = useRef(null);
  const dragLieuIdx = useRef(null);
  const [dragOverNiveau, setDragOverNiveau] = useState(null);
  const [dragOverLieu, setDragOverLieu] = useState(null);
  const navigate = useNavigate();
  const headers = {};
  const isAdmin = profil.role === 'admin';

  const reorderNiveaux = async (from, to) => {
    if (from === to) return;
    const list = [...niveauxDB];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setNiveauxDB(list);
    await Promise.all(list.map((n, i) => axios.put(API + '/donnees/niveaux/' + n.id, { nom: n.nom, ordre: i + 1 }, { headers })));
  };
  const reorderLieux = async (from, to) => {
    if (from === to) return;
    const list = [...lieuxTravailDB];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setLieuxTravailDB(list);
    await Promise.all(list.map((l, i) => axios.put(API + '/donnees/lieux-travail/' + l.id, { nom: l.nom, ordre: i + 1 }, { headers })));
  };

  useEffect(() => { chargerProfil(); }, []);
  useEffect(() => { chargerMfaStatus(); chargerDonnees(); }, []);
  useEffect(() => { if (isAdmin) { chargerEcole(); chargerProfs(); chargerMail(); chargerAccesProfs(); } }, [isAdmin]);
  useEffect(() => { if (onglet === 'ecole' && isAdmin) chargerEcole(); }, [onglet]);
  useEffect(() => {
    if (isAdmin && !mailTestTo && profil?.email) setMailTestTo(profil.email);
  }, [isAdmin, profil?.email, mailTestTo]);

  const chargerProfil = async () => {
    try {
      const res = await axios.get(API + '/parametres/profil', { headers });
      setProfil(res.data);
    } catch (err) { console.error(err); }
  };

  const chargerDonnees = async () => {
    try {
      const [niv, lieux, salles] = await Promise.all([
        axios.get(API + '/donnees/niveaux', { headers }),
        axios.get(API + '/donnees/lieux-travail', { headers }),
        axios.get(API + '/donnees/salles', { headers }),
      ]);
      setNiveauxDB(niv.data || []);
      setLieuxTravailDB(lieux.data || []);
      setSallesDB(salles.data || []);
    } catch(err) { console.error(err); }
  };

  const chargerBranchesProfil = async (niveaux = []) => {
    try {
      const r = await axios.get(API + '/branches', { headers });
      const filtrees = r.data
        .filter(b => !niveaux.length || niveaux.includes(b.niveau))
        .filter(b => { const code = String(b.designation_courte || '').trim().toUpperCase(); return code !== 'AI'; });
      const parCode = new Map();
      filtrees.forEach(b => {
        const code = String(b.designation_courte || b.nom || '').trim().toUpperCase();
        if (!code) return;
        if (!parCode.has(code)) { parCode.set(code, { id: code, label: code, ids: [String(b.id)], noms: [String(b.nom || '').trim()].filter(Boolean) }); return; }
        const ex = parCode.get(code); ex.ids.push(String(b.id));
        const nom = String(b.nom || '').trim(); if (nom && !ex.noms.includes(nom)) ex.noms.push(nom);
      });
      setBranchesDisponiblesProfil(Array.from(parCode.values()).sort((a, b) => a.label.localeCompare(b.label, 'fr')));
    } catch { setBranchesDisponiblesProfil([]); }
  };

  useEffect(() => {
    if (sousOngletProfil !== 'desideratas') return;
    const niveaux = (profil.niveau_prefere || '').split(',').filter(Boolean);
    chargerBranchesProfil(niveaux);
  }, [profil.niveau_prefere, sousOngletProfil]);

  const chargerEcole = async () => {
    try {
      const res = await axios.get(API + '/parametres/ecole', { headers });
      if (res.data) {
        setEcole(prev => ({
          ...prev,
          ...res.data,
          sexe_responsable_langues_jeunes: res.data.sexe_responsable_langues_jeunes || 'M',
          sexe_responsable_niveau_csc: res.data.sexe_responsable_niveau_csc || 'M',
          sexe_responsable_niveau_cfr: res.data.sexe_responsable_niveau_cfr || 'M',
          sexe_responsable_niveau_epl: res.data.sexe_responsable_niveau_epl || 'M',
        }));
        if (res.data.horaires != null) {
          const h = typeof res.data.horaires === 'string' ? JSON.parse(res.data.horaires) : res.data.horaires;
          setHorairesEcole(h);
        }
      }
    } catch (err) { console.error(err); }
  };

  const chargerProfs = async () => {
    try {
      const res = await axios.get(API + '/parametres/profs', { headers });
      setProfs(res.data);
    } catch (err) { console.error(err); }
  };

  const initRole = (roleData, defaultVal) => {
    const init = {};
    MODULES_ACCES_PROFS.forEach(m => {
      const mVal = roleData[m.key] !== undefined ? roleData[m.key] : defaultVal;
      init[m.key] = mVal;
      m.onglets.forEach(o => { init[o.key] = roleData[o.key] !== undefined ? roleData[o.key] : mVal; });
    });
    return init;
  };

  const chargerAccesProfs = async () => {
    try {
      const res = await axios.get(API + '/parametres/acces-profs', { headers });
      const data = res.data || {};
      const hasNested = data.professeurs !== undefined;
      const profRaw = hasNested ? (data.professeurs || {}) : data;
      setAccesParRole({
        professeurs: initRole(profRaw, true),
        employes:    initRole(hasNested ? (data.employes    || {}) : {}, false),
        responsables: initRole(hasNested ? (data.responsables || {}) : {}, false),
        admins:      initRole(hasNested ? (data.admins      || {}) : {}, true),
      });
    } catch {}
  };

  const toggleModule = (m) => {
    const curr = accesParRole[accesRoleOnglet] || {};
    const newVal = !curr[m.key];
    const update = { ...curr, [m.key]: newVal };
    m.onglets.forEach(o => { update[o.key] = newVal; });
    setAccesParRole(prev => ({ ...prev, [accesRoleOnglet]: update }));
  };

  const toggleOnglet = (m, oKey) => {
    const curr = accesParRole[accesRoleOnglet] || {};
    const newVal = !curr[oKey];
    const update = { ...curr, [oKey]: newVal };
    const anyOn = m.onglets.some(o => o.key === oKey ? newVal : update[o.key]);
    update[m.key] = anyOn;
    setAccesParRole(prev => ({ ...prev, [accesRoleOnglet]: update }));
  };

  const chargerMail = async () => {
    try {
      const res = await axios.get(API + '/parametres/mail', { headers });
      const data = res.data || {};
      setMail(prev => ({
        ...prev,
        ...data,
        smtp_port: Number(data.smtp_port || 587),
        smtp_app_password: '',
      }));
      setMailTestTo(data.smtp_from_email || profil.email || '');
    } catch (err) { console.error(err); }
  };

  const handleSauverProfil = async (e) => {
    e.preventDefault();
    try {
      await axios.put(API + '/parametres/profil', profil, { headers });
      setMsgProfil('success');
      setTimeout(() => setMsgProfil(''), 3000);
    } catch (err) { setMsgProfil('error'); }
  };

  const handleSauverMdp = async (e) => {
    e.preventDefault();
    if (mdp.nouveau !== mdp.confirmation) { setMsgMdp('mismatch'); return; }
    try {
      await axios.put(API + '/parametres/mot-de-passe', { ancien: mdp.ancien, nouveau: mdp.nouveau }, { headers });
      setMsgMdp('success');
      setMdp({ ancien: '', nouveau: '', confirmation: '' });
      setTimeout(() => setMsgMdp(''), 3000);
    } catch (err) { setMsgMdp('error'); }
  };

  const chargerMfaStatus = async () => {
    try {
      const res = await axios.get(API + '/auth/mfa/status', { headers });
      setMfaEnabled(res.data?.mfa_enabled === true);
      setMfaBackupRemaining(Number(res.data?.backup_codes_remaining || 0));
    } catch {}
  };

  const handleGenererMfaSetup = async () => {
    setMsgMfa('');
    setMfaLoading(true);
    try {
      const res = await axios.post(API + '/auth/mfa/setup', {}, { headers });
      setMfaSetupToken(res.data?.setup_token || '');
      setMfaSecret(res.data?.secret || '');
      setMfaOtpAuthUrl(res.data?.otpauth_url || '');
      setMfaBackupCodes([]);
      setMsgMfa('Scannez le QR code puis saisissez le code à 6 chiffres pour activer.');
    } catch (err) {
      setMsgMfa(err.response?.data?.message || 'Erreur génération setup MFA');
    }
    setMfaLoading(false);
  };

  const handleActiverMfa = async () => {
    setMsgMfa('');
    if (!mfaSetupToken || !mfaCode) return setMsgMfa('Token setup ou code manquant.');
    setMfaLoading(true);
    try {
      const res = await axios.post(API + '/auth/mfa/enable', { setup_token: mfaSetupToken, code: mfaCode }, { headers });
      setMfaEnabled(true);
      setMfaBackupCodes(res.data?.backup_codes || []);
      setMfaBackupRemaining(Number(res.data?.backup_codes_remaining || (res.data?.backup_codes || []).length));
      setMfaSetupToken('');
      setMfaSecret('');
      setMfaOtpAuthUrl('');
      setMfaCode('');
      setMsgMfa('✅ Double authentification activée. Conservez les codes de secours dans un endroit sûr.');
    } catch (err) {
      setMsgMfa(err.response?.data?.message || "Erreur d'activation MFA");
    }
    setMfaLoading(false);
  };

  const handleDesactiverMfa = async () => {
    setMsgMfa('');
    if (!mfaCode) return setMsgMfa('Veuillez saisir un code 2FA.');
    setMfaLoading(true);
    try {
      await axios.post(API + '/auth/mfa/disable', { code: mfaCode }, { headers });
      setMfaEnabled(false);
      setMfaBackupCodes([]);
      setMfaBackupRemaining(0);
      setMfaCode('');
      setMfaSetupToken('');
      setMfaSecret('');
      setMfaOtpAuthUrl('');
      setMsgMfa('✅ Double authentification désactivée.');
    } catch (err) {
      setMsgMfa(err.response?.data?.message || 'Erreur désactivation MFA');
    }
    setMfaLoading(false);
  };

  const handleRegenererBackupCodes = async () => {
    setMsgMfa('');
    if (!mfaCode) return setMsgMfa('Veuillez saisir un code 2FA pour régénérer les codes de secours.');
    setMfaLoading(true);
    try {
      const res = await axios.post(API + '/auth/mfa/backup/regenerate', { code: mfaCode }, { headers });
      setMfaBackupCodes(res.data?.backup_codes || []);
      setMfaBackupRemaining(Number(res.data?.backup_codes_remaining || (res.data?.backup_codes || []).length));
      setMfaCode('');
      setMsgMfa('✅ Nouveaux codes de secours générés.');
    } catch (err) {
      setMsgMfa(err.response?.data?.message || 'Erreur génération des codes de secours');
    }
    setMfaLoading(false);
  };

  const handleSauverEcole = async (e) => {
    e.preventDefault();
    try {
      const horairesData = Object.keys(horairesEcole).length > 0 ? horairesEcole : (ecole.horaires || {});
      await axios.put(API + '/parametres/ecole', { ...ecole, horaires: horairesData }, { headers });
      setMsgEcole('success');
      setTimeout(() => setMsgEcole(''), 3000);
    } catch (err) { setMsgEcole('error'); }
  };

  const ouvrirPermissions = (prof) => {
    setProfSelectionne(prof);
    setPermissions(prof.permissions || {});
    setMsgPerms('');
  };

  const handleSauverPermissions = async () => {
    try {
      await axios.put(API + '/parametres/permissions/' + profSelectionne.id, { permissions }, { headers });
      setMsgPerms('success');
      chargerProfs();
      setTimeout(() => setMsgPerms(''), 3000);
    } catch (err) { setMsgPerms('error'); }
  };

  const handleSauverMail = async (e) => {
    e.preventDefault();
    setMsgMail('');
    try {
      await axios.put(API + '/parametres/mail', {
        smtp_active: mail.smtp_active === true,
        smtp_host: mail.smtp_host,
        smtp_port: Number(mail.smtp_port || 587),
        smtp_secure: mail.smtp_secure === true,
        smtp_user: mail.smtp_user,
        smtp_from_name: mail.smtp_from_name,
        smtp_from_email: mail.smtp_from_email,
        smtp_app_password: mail.smtp_app_password || '',
      }, { headers });
      setMsgMail('success');
      setMail(prev => ({ ...prev, smtp_app_password: '' }));
      await chargerMail();
      setTimeout(() => setMsgMail(''), 3500);
    } catch (err) {
      setMsgMail(err?.response?.data?.message || 'error');
    }
  };

  const handleTesterMail = async () => {
    if (!mailTestTo) return setMsgMailTest('Veuillez saisir un email de destination');
    setMsgMailTest('');
    setTestMailLoading(true);
    try {
      await axios.post(API + '/parametres/mail/test', { email: mailTestTo }, { headers, timeout: 35000 });
      setMsgMailTest('✅ Email de test envoyé');
    } catch (err) {
      const timeout = err?.code === 'ECONNABORTED';
      if (timeout) {
        setMsgMailTest("❌ Délai dépassé. Vérifiez SMTP/port/mot de passe d'application puis réessayez.");
      } else {
        const data = err?.response?.data || {};
        const parts = [];
        parts.push(`❌ ${data.message || err.message || 'Echec envoi test'}`);
        if (data.code) parts.push(`Code: ${data.code}`);
        if (data.reponse) parts.push(`Réponse SMTP: ${data.reponse}`);
        if (data.erreur) parts.push(`Détail: ${data.erreur}`);
        if (data.hint) parts.push(`Astuce: ${data.hint}`);

        const isOutlookPersonal = /@(outlook\.com|hotmail\.com|live\.[a-z]{2,}|msn\.com)$/i.test(mail.smtp_user || '');
        const hostLooksOffice365 = String(mail.smtp_host || '').toLowerCase() === 'smtp.office365.com';
        if (isOutlookPersonal && hostLooksOffice365) {
          parts.push('Astuce Outlook personnel: essayez "smtp-mail.outlook.com" (port 587, TLS, mot de passe d application).');
        }

        setMsgMailTest(parts.join('\n'));
      }
    } finally {
      setTestMailLoading(false);
    }
  };

  const handleReset = async () => {
    setResetEtape(3);
    try {
      await axios.delete(API + '/parametres/reset-tout', { headers });
      setResetEtape(4);
      setResetMsg('✅ Toutes les données ont été supprimées.');
    } catch (err) {
      setResetEtape(0);
      setResetMsg('❌ Erreur : ' + (err.response?.data?.message || err.message));
    }
  };

  const handleResetRentree = async () => {
    setResetRentreeEtape(3);
    try {
      await axios.delete(API + '/parametres/reset-rentree', { headers });
      setResetRentreeEtape(4);
      setResetRentreeMsg('✅ Reset de rentrée scolaire effectué.');
    } catch (err) {
      setResetRentreeEtape(0);
      setResetRentreeMsg('❌ Erreur : ' + (err.response?.data?.message || err.message));
    }
  };

  const COULEURS = { profil: '#1a73e8', mdp: '#ea4335', mfa: '#0f766e', ecole: '#34a853', mail: '#7c3aed', acces: '#ff9800', danger: '#dc2626' };

  return (
    <div style={styles.page}>
      <div style={styles.main}>
        <div style={styles.topBar}>
          <h1 style={styles.titre}>Paramètres</h1>
          <div style={styles.topBarRight}>
            {onglet === 'profil' && (<>
              {msgProfil === 'success' && <span style={{fontSize:13,fontWeight:600,padding:'6px 14px',borderRadius:8,background:'#d1fae5',color:'#065f46'}}>✅ Profil mis à jour !</span>}
              {msgProfil === 'error' && <span style={{fontSize:13,fontWeight:600,padding:'6px 14px',borderRadius:8,background:'#fee2e2',color:'#991b1b'}}>❌ Erreur</span>}
              <button type="submit" form="form-profil" style={styles.btnSauverHeader}>Sauvegarder</button>
            </>)}
            {onglet === 'ecole' && isAdmin && (<>
              {msgEcole === 'success' && <span style={{fontSize:13,fontWeight:600,padding:'6px 14px',borderRadius:8,background:'#d1fae5',color:'#065f46'}}>✅ Paramètres mis à jour !</span>}
              {msgEcole === 'error' && <span style={{fontSize:13,fontWeight:600,padding:'6px 14px',borderRadius:8,background:'#fee2e2',color:'#991b1b'}}>❌ Erreur</span>}
              <button type="submit" form="form-ecole" style={styles.btnSauverHeader}>Sauvegarder</button>
            </>)}
          </div>
        </div>
        <div style={styles.content}>

          {onglet === 'profil' && (
            <div style={styles.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <h3 style={{ ...styles.cardTitre, margin: 0 }}>Mon profil</h3>
                <div style={styles.roleTag}>{profil.role}</div>
              </div>

              {/* Sous-onglets profil */}
              <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #6366f1', marginBottom: 0 }}>
                {[['connexion','Informations de connexion'],['personnelles','Informations personnelles'],['professionnelles','Informations professionnelles'],['desideratas','Désidératas']].map(([key, label]) => (
                  <button key={key} onClick={() => setSousOngletProfil(key)} style={{ padding: '9px 18px', borderRadius: '10px 10px 0 0', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, lineHeight: '1', outline: 'none', position: 'relative', zIndex: sousOngletProfil === key ? 2 : 1, ...(sousOngletProfil === key ? { background: '#6366f1', color: 'white', marginBottom: -2, boxShadow: '0 -1px 6px rgba(99,102,241,0.18)' } : { background: '#ede9fe', color: '#5b21b6' }) }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ paddingTop: 20 }}>
                {msgProfil === 'success' && <div style={styles.msgSuccess}>✅ Profil mis à jour !</div>}
                {msgProfil === 'error' && <div style={styles.msgError}>❌ Erreur lors de la mise à jour</div>}

                <form id="form-profil" onSubmit={handleSauverProfil}>

                  {/* Connexion */}
                  {sousOngletProfil === 'connexion' && (
                    <div>
                      <div style={{...styles.formGrid, marginBottom: 20}}>
                        <div style={{...styles.formChamp, gridColumn:'1/-1'}}>
                          <label style={styles.label}>Email *</label>
                          <input style={styles.input} type="email" required value={profil.email} onChange={e => setProfil({ ...profil, email: e.target.value })} />
                        </div>
                      </div>
                      {/* Changer mot de passe - expandable */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                        <div onClick={() => setMdpOuvert(!mdpOuvert)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: '#f8fafc', cursor: 'pointer' }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Changer le mot de passe</span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{mdpOuvert ? '▲' : '▼'}</span>
                        </div>
                        {mdpOuvert && (
                          <div style={{ padding: '16px', background: 'white', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {msgMdp === 'success' && <div style={styles.msgSuccess}>✅ Mot de passe modifié !</div>}
                            {msgMdp === 'error' && <div style={styles.msgError}>❌ Ancien mot de passe incorrect</div>}
                            {msgMdp === 'mismatch' && <div style={styles.msgError}>❌ Les mots de passe ne correspondent pas</div>}
                            <div style={styles.formChamp}>
                              <label style={styles.label}>Ancien mot de passe *</label>
                              <input style={styles.input} type="password" value={mdp.ancien} onChange={e => setMdp({ ...mdp, ancien: e.target.value })} />
                            </div>
                            <div style={styles.formChamp}>
                              <label style={styles.label}>Nouveau mot de passe *</label>
                              <input style={styles.input} type="password" value={mdp.nouveau} onChange={e => setMdp({ ...mdp, nouveau: e.target.value })} />
                            </div>
                            <div style={styles.formChamp}>
                              <label style={styles.label}>Confirmer *</label>
                              <input style={styles.input} type="password" value={mdp.confirmation} onChange={e => setMdp({ ...mdp, confirmation: e.target.value })} />
                            </div>
                            <button type="button" onClick={handleSauverMdp} style={{ ...styles.btnSauver, background: '#ea4335', alignSelf: 'flex-start' }}>Changer</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Informations personnelles */}
                  {sousOngletProfil === 'personnelles' && (
                    <div style={{...styles.formGrid, marginBottom: 20}}>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>NOM *</label>
                        <input style={styles.input} type="text" required value={profil.nom} onChange={e => setProfil({ ...profil, nom: e.target.value.toUpperCase() })} placeholder="DUPONT" />
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Prénom *</label>
                        <input style={styles.input} type="text" required value={profil.prenom} onChange={e => setProfil({ ...profil, prenom: e.target.value })} placeholder="Jean" />
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Date de naissance</label>
                        <input style={styles.input} type="date" value={profil.date_naissance ? profil.date_naissance.slice(0,10) : ''} onChange={e => setProfil({ ...profil, date_naissance: e.target.value })} />
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Sexe</label>
                        <select style={styles.input} value={profil.sexe||''} onChange={e => setProfil({ ...profil, sexe: e.target.value })}>
                          <option value="">--</option>
                          <option value="M">Masculin</option>
                          <option value="F">Féminin</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Téléphone</label>
                        <input style={styles.input} type="text" value={profil.telephone||''} onChange={e => setProfil({ ...profil, telephone: e.target.value })} placeholder="079 123 45 67" />
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>N° AVS</label>
                        <input style={styles.input} type="text" value={profil.avs||''} onChange={e => setProfil({ ...profil, avs: e.target.value })} placeholder="756.XXXX.XXXX.XX" />
                      </div>
                      <div style={{...styles.formChamp, gridColumn:'1/-1'}}>
                        <label style={styles.label}>Adresse</label>
                        <input style={styles.input} type="text" value={profil.adresse||''} onChange={e => setProfil({ ...profil, adresse: e.target.value })} placeholder="Rue de la Paix 10" />
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>NPA</label>
                        <input style={styles.input} type="text" value={profil.npa||''} onChange={e => setProfil({ ...profil, npa: e.target.value })} placeholder="1950" />
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Lieu</label>
                        <input style={styles.input} type="text" value={profil.lieu||''} onChange={e => setProfil({ ...profil, lieu: e.target.value })} placeholder="Sion" />
                      </div>
                    </div>
                  )}

                  {/* Informations professionnelles */}
                  {sousOngletProfil === 'professionnelles' && (
                    <div style={{...styles.formGrid, marginBottom: 20}}>
                      {[
                        {label:"Taux d'activité (%)", value: profil.taux_activite ?? '—'},
                        {label:"Périodes / semaine", value: profil.periodes_semaine ?? '—'},
                        {label:"Type de contrat", value: profil.type_contrat || '—'},
                      ].map(({label,value}) => (
                        <div key={label} style={styles.formChamp}>
                          <label style={styles.label}>{label}</label>
                          <div style={{...styles.input, background:'#f1f5f9', color:'#64748b', cursor:'not-allowed', display:'flex', alignItems:'center', height:38}}>{value}</div>
                        </div>
                      ))}
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Type de permis</label>
                        <input style={styles.input} type="text" value={profil.type_permis || ''} onChange={e => setProfil({...profil, type_permis: e.target.value})} placeholder="B, C, L..." />
                      </div>
                    </div>
                  )}

                  {/* Désidératas */}
                  {sousOngletProfil === 'desideratas' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Niveaux préférés</label>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                          {niveauxDB.map(n => {
                            const niveaux = profil.niveau_prefere ? profil.niveau_prefere.split(',').filter(Boolean) : [];
                            const selected = niveaux.includes(n.nom);
                            return (
                              <button key={n.id} type="button"
                                onClick={() => {
                                  const curr = profil.niveau_prefere ? profil.niveau_prefere.split(',').filter(Boolean) : [];
                                  const newNiv = selected ? curr.filter(x=>x!==n.nom) : [...curr, n.nom];
                                  setProfil({...profil, niveau_prefere: newNiv.length >= niveauxDB.length ? '' : newNiv.join(',')});
                                }}
                                style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+(selected?'#6366f1':'#e2e8f0'),background:selected?'#e0e7ff':'white',color:selected?'#3730a3':'#64748b',cursor:'pointer',fontWeight:700,fontSize:13}}>
                                {n.nom}
                              </button>
                            );
                          })}
                          <button type="button" onClick={() => setProfil({...profil, niveau_prefere:''})}
                            style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+((!profil.niveau_prefere)?'#94a3b8':'#e2e8f0'),background:(!profil.niveau_prefere)?'#f1f5f9':'white',color:'#64748b',cursor:'pointer',fontWeight:700,fontSize:13}}>
                            Aucune préférence
                          </button>
                        </div>
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Spécialité(s) — {profil.niveau_prefere || 'Tous niveaux'}</label>
                        {branchesDisponiblesProfil.length === 0 ? (
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>Aucune spécialité disponible.</div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginTop: 4 }}>
                            {branchesDisponiblesProfil.map(b => {
                              const bsArr = normaliserBranchesSpecialites(profil.branches_specialites);
                              const selected = (b.ids || []).some(id => bsArr.includes(String(id)));
                              return (
                                <button key={b.id} type="button" title={(b.noms || []).join(' / ')}
                                  onClick={() => {
                                    const curr = normaliserBranchesSpecialites(profil.branches_specialites);
                                    const newSel = selected
                                      ? curr.filter(x => !(b.ids || []).includes(String(x)))
                                      : Array.from(new Set([...curr, ...(b.ids || [])].map(String)));
                                    setProfil({ ...profil, branches_specialites: newSel });
                                  }}
                                  style={{ height: 34, borderRadius: 9, border: '2px solid ' + (selected ? '#6366f1' : '#e2e8f0'), background: selected ? '#e0e7ff' : 'white', color: selected ? '#3730a3' : '#64748b', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                                  {b.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Lieux de travail préférés</label>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                          {lieuxTravailDB.map(l => {
                            const lieux = profil.lieu_travail_prefere ? profil.lieu_travail_prefere.split(',').filter(Boolean) : [];
                            const selected = lieux.includes(l.nom);
                            return (
                              <button key={l.id} type="button"
                                onClick={() => {
                                  const curr = profil.lieu_travail_prefere ? profil.lieu_travail_prefere.split(',').filter(Boolean) : [];
                                  const newL = selected ? curr.filter(x=>x!==l.nom) : [...curr, l.nom];
                                  setProfil({...profil, lieu_travail_prefere: newL.length >= lieuxTravailDB.length ? '' : newL.join(',')});
                                }}
                                style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+(selected?'#6366f1':'#e2e8f0'),background:selected?'#e0e7ff':'white',color:selected?'#3730a3':'#64748b',cursor:'pointer',fontWeight:700,fontSize:13}}>
                                {l.nom}
                              </button>
                            );
                          })}
                          <button type="button" onClick={() => setProfil({...profil, lieu_travail_prefere:''})}
                            style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+((!profil.lieu_travail_prefere)?'#94a3b8':'#e2e8f0'),background:(!profil.lieu_travail_prefere)?'#f1f5f9':'white',color:'#64748b',cursor:'pointer',fontWeight:700,fontSize:13}}>
                            Aucune préférence
                          </button>
                        </div>
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Remarques lieu de travail</label>
                        <input style={styles.input} type="text" value={profil.remarque_lieu_travail||''} onChange={e => setProfil({...profil, remarque_lieu_travail: e.target.value})} placeholder="Ex: Préfère éviter BOTZA le lundi..." />
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Priorité</label>
                        <div style={{display:'flex',gap:8,marginTop:4}}>
                          {[['niveau','Niveau'],['lieu','Lieu de travail'],['aucune','Aucune priorité']].map(([val,lbl]) => (
                            <button key={val} type="button"
                              onClick={() => setProfil({...profil, priorite_pref: val})}
                              style={{padding:'8px 14px',borderRadius:8,border:'2px solid '+(profil.priorite_pref===val?'#6366f1':'#e2e8f0'),background:profil.priorite_pref===val?'#e0e7ff':'white',fontWeight:700,cursor:'pointer',fontSize:13,color:profil.priorite_pref===val?'#3730a3':'#64748b'}}>
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </form>
              </div>
            </div>
          )}

          {onglet === 'mdp' && (
            <div style={styles.card}>
              <h3 style={styles.cardTitre}>Changer le mot de passe</h3>
              {msgMdp === 'success' && <div style={styles.msgSuccess}>✅ Mot de passe modifié !</div>}
              {msgMdp === 'error' && <div style={styles.msgError}>❌ Ancien mot de passe incorrect</div>}
              {msgMdp === 'mismatch' && <div style={styles.msgError}>❌ Les mots de passe ne correspondent pas</div>}
              <form onSubmit={handleSauverMdp}>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Ancien mot de passe *</label>
                  <input style={styles.input} type="password" required value={mdp.ancien} onChange={e => setMdp({ ...mdp, ancien: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Nouveau mot de passe *</label>
                  <input style={styles.input} type="password" required value={mdp.nouveau} onChange={e => setMdp({ ...mdp, nouveau: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Confirmer *</label>
                  <input style={styles.input} type="password" required value={mdp.confirmation} onChange={e => setMdp({ ...mdp, confirmation: e.target.value })} />
                </div>
                <button type="submit" style={{ ...styles.btnSauver, background: '#ea4335', marginTop: '10px' }}>Changer</button>
              </form>
            </div>
          )}

          {onglet === 'mfa' && (
            <div style={styles.card}>
              <h3 style={styles.cardTitre}>Double authentification (Google Authenticator)</h3>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                Activez un second facteur de connexion (code à 6 chiffres) pour sécuriser l'accès à votre compte.
              </p>
              <div style={{
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 16,
                fontWeight: 700,
                background: mfaEnabled ? '#dcfce7' : '#fef3c7',
                color: mfaEnabled ? '#166534' : '#92400e'
              }}>
                {mfaEnabled ? '✅ 2FA active' : '⚠️ 2FA désactivée'}
              </div>
              {msgMfa && (
                <div style={{
                  ...styles.msgInfo,
                  background: msgMfa.startsWith('✅') ? '#dcfce7' : '#eff6ff',
                  color: msgMfa.startsWith('✅') ? '#166534' : '#1e40af'
                }}>
                  {msgMfa}
                </div>
              )}

              {!mfaEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {!mfaSetupToken && (
                    <button type="button" style={{ ...styles.btnSauver, background: '#0f766e' }} onClick={handleGenererMfaSetup} disabled={mfaLoading}>
                      {mfaLoading ? '⏳ Génération...' : 'Générer le setup 2FA'}
                    </button>
                  )}

                  {mfaSetupToken && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, background: '#f8fafc' }}>
                      <div style={{ fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>1) Scanner le QR code</div>
                      {mfaOtpAuthUrl && (
                        <img
                          alt="QR code MFA"
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mfaOtpAuthUrl)}`}
                          style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', marginBottom: 10 }}
                        />
                      )}
                      <div style={{ fontSize: 12, color: '#334155', marginBottom: 6 }}>
                        En cas de problème de scan, clé manuelle:
                      </div>
                      <code style={{ display: 'inline-block', padding: '6px 8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }}>
                        {mfaSecret}
                      </code>
                      <div style={{ fontWeight: 700, marginTop: 14, marginBottom: 8, color: '#0f172a' }}>2) Saisir le code à 6 chiffres</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          style={{ ...styles.input, maxWidth: 180 }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          value={mfaCode}
                          onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="123456"
                        />
                        <button type="button" style={{ ...styles.btnSauver, background: '#0f766e' }} onClick={handleActiverMfa} disabled={mfaLoading}>
                          {mfaLoading ? '⏳ Activation...' : 'Activer 2FA'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mfaEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 13, color: '#334155', fontWeight: 700 }}>
                    Codes de secours restants: {mfaBackupRemaining}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      style={{ ...styles.input, maxWidth: 180 }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={mfaCode}
                      onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Code 2FA"
                    />
                    <button type="button" style={{ ...styles.btnSauver, background: '#b45309' }} onClick={handleRegenererBackupCodes} disabled={mfaLoading}>
                      {mfaLoading ? '⏳ Génération...' : 'Régénérer codes secours'}
                    </button>
                    <button type="button" style={{ ...styles.btnSauver, background: '#dc2626' }} onClick={handleDesactiverMfa} disabled={mfaLoading}>
                      {mfaLoading ? '⏳ Désactivation...' : 'Désactiver 2FA'}
                    </button>
                  </div>
                </div>
              )}

              {mfaBackupCodes.length > 0 && (
                <div style={{ marginTop: 14, border: '1px solid #fde68a', borderRadius: 10, padding: 14, background: '#fffbeb' }}>
                  <div style={{ fontWeight: 800, color: '#92400e', marginBottom: 8 }}>
                    ⚠️ Codes de secours (affichés une seule fois)
                  </div>
                  <div style={{ fontSize: 12, color: '#92400e', marginBottom: 10 }}>
                    Conservez-les hors ligne. Chaque code ne peut être utilisé qu'une seule fois.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8 }}>
                    {mfaBackupCodes.map((c, i) => (
                      <code key={`backup-${i}`} style={{ padding: '8px 10px', background: 'white', border: '1px solid #fcd34d', borderRadius: 8, textAlign: 'center', fontWeight: 800 }}>
                        {c}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {onglet === 'ecole' && isAdmin && (
            <div style={styles.card}>
              <h3 style={{ ...styles.cardTitre, marginBottom: 16 }}>Paramètres de l'école</h3>

              {/* Sous-onglets */}
              <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #6366f1', marginBottom: 0 }}>
                {[['adresse','Adresse'],['responsables','Responsables'],['structure','Structure'],['horaires','Horaires']].map(([key, label]) => (
                  <button key={key} onClick={() => setSousOngletEcole(key)} style={{ padding: '9px 18px', borderRadius: '10px 10px 0 0', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, lineHeight: '1', outline: 'none', position: 'relative', zIndex: sousOngletEcole === key ? 2 : 1, ...(sousOngletEcole === key ? { background: '#6366f1', color: 'white', marginBottom: -2, boxShadow: '0 -1px 6px rgba(99,102,241,0.18)' } : { background: '#ede9fe', color: '#5b21b6' }) }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ paddingTop: sousOngletEcole === 'horaires' ? 0 : 20 }}>

              <form id="form-ecole" onSubmit={handleSauverEcole}>

                {/* Section Adresse */}
                {sousOngletEcole === 'adresse' && <div>
                <div style={styles.formGrid}>
                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={styles.label}>Nom de l'école</label>
                    <input style={styles.input} type="text" value={ecole.nom_ecole || ''} onChange={e => setEcole({ ...ecole, nom_ecole: e.target.value })} />
                  </div>
                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={styles.label}>Adresse</label>
                    <input style={styles.input} type="text" value={ecole.adresse || ''} onChange={e => setEcole({ ...ecole, adresse: e.target.value })} />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Téléphone</label>
                    <input style={styles.input} type="text" value={ecole.telephone || ''} onChange={e => setEcole({ ...ecole, telephone: e.target.value })} />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Email</label>
                    <input style={styles.input} type="email" value={ecole.email || ''} onChange={e => setEcole({ ...ecole, email: e.target.value })} />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Année scolaire</label>
                    <input style={styles.input} type="text" value={ecole.annee_scolaire || ''} onChange={e => setEcole({ ...ecole, annee_scolaire: e.target.value })} placeholder="2025-2026" />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Date début de l'année scolaire</label>
                    <input style={styles.input} type="date" value={ecole.date_debut_annee ? ecole.date_debut_annee.substring(0,10) : ''} onChange={e => setEcole({ ...ecole, date_debut_annee: e.target.value })} />
                  </div>
                </div>
                </div>}

                {/* Section Responsables */}
                {sousOngletEcole === 'responsables' && <div>
                <div style={styles.formGrid}>
                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={{ ...styles.label, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span>Responsable des cours de langues jeunes</span>
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        <button type="button" onClick={() => setEcole({ ...ecole, sexe_responsable_langues_jeunes: 'M' })}
                          style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: ecole.sexe_responsable_langues_jeunes === 'M' ? '#dbeafe' : 'white', color: '#1e3a8a', fontWeight: 700 }}>♂</button>
                        <button type="button" onClick={() => setEcole({ ...ecole, sexe_responsable_langues_jeunes: 'F' })}
                          style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: ecole.sexe_responsable_langues_jeunes === 'F' ? '#fce7f3' : 'white', color: '#9d174d', fontWeight: 700 }}>♀</button>
                      </span>
                    </label>
                    <input style={styles.input} type="text" value={ecole.responsable_langues_jeunes || ''} onChange={e => setEcole({ ...ecole, responsable_langues_jeunes: e.target.value })} />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={{ ...styles.label, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span>Responsable de niveau - CSC</span>
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        <button type="button" onClick={() => setEcole({ ...ecole, sexe_responsable_niveau_csc: 'M' })}
                          style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: ecole.sexe_responsable_niveau_csc === 'M' ? '#dbeafe' : 'white', color: '#1e3a8a', fontWeight: 700 }}>♂</button>
                        <button type="button" onClick={() => setEcole({ ...ecole, sexe_responsable_niveau_csc: 'F' })}
                          style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: ecole.sexe_responsable_niveau_csc === 'F' ? '#fce7f3' : 'white', color: '#9d174d', fontWeight: 700 }}>♀</button>
                      </span>
                    </label>
                    <input style={styles.input} type="text" value={ecole.responsable_niveau_csc || ''} onChange={e => setEcole({ ...ecole, responsable_niveau_csc: e.target.value })} />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={{ ...styles.label, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span>Responsable de niveau - CFR</span>
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        <button type="button" onClick={() => setEcole({ ...ecole, sexe_responsable_niveau_cfr: 'M' })}
                          style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: ecole.sexe_responsable_niveau_cfr === 'M' ? '#dbeafe' : 'white', color: '#1e3a8a', fontWeight: 700 }}>♂</button>
                        <button type="button" onClick={() => setEcole({ ...ecole, sexe_responsable_niveau_cfr: 'F' })}
                          style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: ecole.sexe_responsable_niveau_cfr === 'F' ? '#fce7f3' : 'white', color: '#9d174d', fontWeight: 700 }}>♀</button>
                      </span>
                    </label>
                    <input style={styles.input} type="text" value={ecole.responsable_niveau_cfr || ''} onChange={e => setEcole({ ...ecole, responsable_niveau_cfr: e.target.value })} />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={{ ...styles.label, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span>Responsable de niveau - EPL</span>
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        <button type="button" onClick={() => setEcole({ ...ecole, sexe_responsable_niveau_epl: 'M' })}
                          style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: ecole.sexe_responsable_niveau_epl === 'M' ? '#dbeafe' : 'white', color: '#1e3a8a', fontWeight: 700 }}>♂</button>
                        <button type="button" onClick={() => setEcole({ ...ecole, sexe_responsable_niveau_epl: 'F' })}
                          style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: ecole.sexe_responsable_niveau_epl === 'F' ? '#fce7f3' : 'white', color: '#9d174d', fontWeight: 700 }}>♀</button>
                      </span>
                    </label>
                    <input style={styles.input} type="text" value={ecole.responsable_niveau_epl || ''} onChange={e => setEcole({ ...ecole, responsable_niveau_epl: e.target.value })} />
                  </div>
                </div>
                </div>}

              </form>

              {/* Section Structure */}
              {sousOngletEcole === 'structure' && <div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>

                  {/* Niveaux */}
                  <div style={{ flex: '1 1 220px' }}>
                    <div style={styles.label}>Niveaux de classes</div>
                    <form onSubmit={async e => {
                      e.preventDefault();
                      try {
                        if (donneesNiveauEdit) {
                          await axios.put(API + '/donnees/niveaux/' + donneesNiveauEdit.id, { nom: donneesNiveauForm.nom, ordre: donneesNiveauEdit.ordre }, { headers });
                        } else {
                          await axios.post(API + '/donnees/niveaux', { nom: donneesNiveauForm.nom, ordre: niveauxDB.length + 1 }, { headers });
                        }
                        setDonneesNiveauForm({ nom: '' });
                        setDonneesNiveauEdit(null);
                        chargerDonnees();
                      } catch(err) { alert(err.response?.data?.message || err.message); }
                    }} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      <input style={{ ...styles.input, flex: 1, margin: 0, padding: '7px 10px' }} placeholder="Nom (ex: CSC)" value={donneesNiveauForm.nom} onChange={e => setDonneesNiveauForm(f => ({ ...f, nom: e.target.value }))} required />
                      <button type="submit" style={{ padding: '7px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>{donneesNiveauEdit ? '✓' : '+'}</button>
                      {donneesNiveauEdit && <button type="button" onClick={() => { setDonneesNiveauEdit(null); setDonneesNiveauForm({ nom: '' }); }} style={{ padding: '7px 10px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>✕</button>}
                    </form>
                    {niveauxDB.map((n, idx) => (
                      <div key={n.id}
                        draggable
                        onDragStart={() => { dragNiveauIdx.current = idx; }}
                        onDragOver={e => { e.preventDefault(); setDragOverNiveau(idx); }}
                        onDragLeave={() => setDragOverNiveau(null)}
                        onDrop={() => { reorderNiveaux(dragNiveauIdx.current, idx); setDragOverNiveau(null); dragNiveauIdx.current = null; }}
                        onDragEnd={() => { setDragOverNiveau(null); dragNiveauIdx.current = null; }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: dragOverNiveau === idx ? '#e0e7ff' : '#f8fafc', borderRadius: 7, border: '1px solid ' + (dragOverNiveau === idx ? '#6366f1' : '#e2e8f0'), marginBottom: 5, cursor: 'grab' }}>
                        <span style={{ color: '#cbd5e1', fontSize: 14, marginRight: 2 }}>⠿</span>
                        <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: '#334155' }}>{n.nom}</span>
                        <button onClick={() => { setDonneesNiveauEdit(n); setDonneesNiveauForm({ nom: n.nom }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                        <button onClick={async () => { if (window.confirm('Supprimer ?')) { await axios.delete(API + '/donnees/niveaux/' + n.id, { headers }); chargerDonnees(); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                      </div>
                    ))}
                    {niveauxDB.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>Aucun niveau</div>}
                  </div>

                  {/* Lieux de travail */}
                  <div style={{ flex: '1 1 220px' }}>
                    <div style={styles.label}>Lieux de travail</div>
                    <form onSubmit={async e => {
                      e.preventDefault();
                      try {
                        if (donneesLieuEdit) {
                          await axios.put(API + '/donnees/lieux-travail/' + donneesLieuEdit.id, donneesLieuForm, { headers });
                        } else {
                          await axios.post(API + '/donnees/lieux-travail', donneesLieuForm, { headers });
                        }
                        setDonneesLieuForm({ nom: '' });
                        setDonneesLieuEdit(null);
                        chargerDonnees();
                      } catch(err) { alert(err.response?.data?.message || err.message); }
                    }} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      <input style={{ ...styles.input, flex: 1, margin: 0, padding: '7px 10px' }} placeholder="Nom (ex: BOTZA)" value={donneesLieuForm.nom} onChange={e => setDonneesLieuForm(f => ({ ...f, nom: e.target.value }))} required />
                      <button type="submit" style={{ padding: '7px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>{donneesLieuEdit ? '✓' : '+'}</button>
                      {donneesLieuEdit && <button type="button" onClick={() => { setDonneesLieuEdit(null); setDonneesLieuForm({ nom: '' }); }} style={{ padding: '7px 10px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>✕</button>}
                    </form>
                    {lieuxTravailDB.map((l, idx) => (
                      <div key={l.id}
                        draggable
                        onDragStart={() => { dragLieuIdx.current = idx; }}
                        onDragOver={e => { e.preventDefault(); setDragOverLieu(idx); }}
                        onDragLeave={() => setDragOverLieu(null)}
                        onDrop={() => { reorderLieux(dragLieuIdx.current, idx); setDragOverLieu(null); dragLieuIdx.current = null; }}
                        onDragEnd={() => { setDragOverLieu(null); dragLieuIdx.current = null; }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: dragOverLieu === idx ? '#e0e7ff' : '#f8fafc', borderRadius: 7, border: '1px solid ' + (dragOverLieu === idx ? '#6366f1' : '#e2e8f0'), marginBottom: 5, cursor: 'grab' }}>
                        <span style={{ color: '#cbd5e1', fontSize: 14, marginRight: 2 }}>⠿</span>
                        <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: '#334155' }}>{l.nom}</span>
                        <button onClick={() => { setDonneesLieuEdit(l); setDonneesLieuForm({ nom: l.nom }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                        <button onClick={async () => { if (window.confirm('Supprimer ?')) { await axios.delete(API + '/donnees/lieux-travail/' + l.id, { headers }); chargerDonnees(); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                      </div>
                    ))}
                    {lieuxTravailDB.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>Aucun lieu</div>}
                  </div>

                  {/* Salles */}
                  <div style={{ flex: '2 1 320px' }}>
                    <div style={styles.label}>Salles</div>
                    <form onSubmit={async e => {
                      e.preventDefault();
                      try {
                        if (donneesSalleEdit) {
                          await axios.put(API + '/donnees/salles/' + donneesSalleEdit.id, donneesSalleForm, { headers });
                        } else {
                          await axios.post(API + '/donnees/salles', donneesSalleForm, { headers });
                        }
                        setDonneesSalleForm({ nom: '', lieu_travail_id: '' });
                        setDonneesSalleEdit(null);
                        chargerDonnees();
                      } catch(err) { alert(err.response?.data?.message || err.message); }
                    }} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      <input style={{ ...styles.input, flex: 1, margin: 0, padding: '7px 10px' }} placeholder="Nom salle" value={donneesSalleForm.nom} onChange={e => setDonneesSalleForm(f => ({ ...f, nom: e.target.value }))} required />
                      <select style={{ ...styles.input, minWidth: 130, margin: 0, padding: '7px 8px' }} value={donneesSalleForm.lieu_travail_id} onChange={e => setDonneesSalleForm(f => ({ ...f, lieu_travail_id: e.target.value }))} required>
                        <option value="">Lieu</option>
                        {lieuxTravailDB.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
                      </select>
                      <button type="submit" style={{ padding: '7px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>{donneesSalleEdit ? '✓' : '+'}</button>
                      {donneesSalleEdit && <button type="button" onClick={() => { setDonneesSalleEdit(null); setDonneesSalleForm({ nom: '', lieu_travail_id: '' }); }} style={{ padding: '7px 10px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>✕</button>}
                    </form>
                    {lieuxTravailDB.map(l => {
                      const sallesLieu = sallesDB.filter(s => String(s.lieu_travail_id) === String(l.id));
                      if (!sallesLieu.length) return null;
                      return (
                        <div key={l.id} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{l.nom}</div>
                          {sallesLieu.map(s => (
                            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: '#f8fafc', borderRadius: 7, border: '1px solid #e2e8f0', marginBottom: 4 }}>
                              <span style={{ flex: 1, fontSize: 13, color: '#334155' }}>{s.nom}</span>
                              <button onClick={() => { setDonneesSalleEdit(s); setDonneesSalleForm({ nom: s.nom, lieu_travail_id: String(s.lieu_travail_id) }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                              <button onClick={async () => { if (window.confirm('Supprimer ?')) { await axios.delete(API + '/donnees/salles/' + s.id, { headers }); chargerDonnees(); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {sallesDB.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>Aucune salle</div>}
                  </div>

                </div>
              </div>}

              {/* Section Horaires */}
              {sousOngletEcole === 'horaires' && (() => {
                const lieux = lieuxTravailDB;
                const actifKey = lieuHoraireOnglet || 'defaut';
                const horaireActif = horairesEcole[actifKey] || JSON.parse(JSON.stringify(HORAIRE_DEFAUT));
                const initLieu = (key) => {
                  if (!horairesEcole[key]) setHorairesEcole(prev => ({ ...prev, [key]: JSON.parse(JSON.stringify(HORAIRE_DEFAUT)) }));
                  setLieuHoraireOnglet(key);
                };
                const updatePeriode = (bloc, idx, champ, val) => {
                  const updated = JSON.parse(JSON.stringify(horaireActif));
                  updated[bloc][idx][champ] = val;
                  setHorairesEcole(prev => ({ ...prev, [actifKey]: updated }));
                };
                const allTabs = [{key:'defaut', nom:'Par défaut'}, ...lieux.map(l => ({key:String(l.id), nom:l.nom}))];
                return (
                  <div>
                    {/* Sous-onglets style affectations EDT */}
                    <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start', marginBottom: 0, marginTop: 0 }}>
                      {allTabs.map(item => {
                        const actif = (actifKey === item.key);
                        return (
                          <button key={item.key} type="button" onClick={() => initLieu(item.key)} style={{ padding: '9px 14px', borderRadius: '0 0 10px 10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: actif ? '#4f46e5' : '#e0e7ff', color: actif ? 'white' : '#3730a3', lineHeight: 1, position: 'relative', zIndex: actif ? 2 : 1, outline: 'none', minWidth: 100, textAlign: 'center', ...(actif ? { marginTop: -1, boxShadow: '0 4px 8px rgba(79,70,229,0.22)' } : {}) }}>
                            {item.nom}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ paddingTop: 20, display: 'flex', gap: 40, flexWrap: 'wrap' }}>
                      {[['matin', 'Matin'], ['apresmidi', 'Après-midi']].map(([bloc, titre]) => (
                        <div key={bloc} style={{ minWidth: 260 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 12 }}>{titre}</div>
                          {(horaireActif[bloc] || []).map((p, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <span style={{ width: 44, fontSize: 13, color: p.label === 'Pause' ? '#94a3b8' : '#334155', fontWeight: p.label === 'Pause' ? 400 : 600 }}>{p.label}</span>
                              <input type="time" value={p.debut} onChange={e => updatePeriode(bloc, idx, 'debut', e.target.value)}
                                style={{ ...styles.input, width: 90, padding: '5px 8px', margin: 0, textAlign: 'center' }} />
                              <span style={{ color: '#94a3b8', fontSize: 13 }}>→</span>
                              <input type="time" value={p.fin} onChange={e => updatePeriode(bloc, idx, 'fin', e.target.value)}
                                style={{ ...styles.input, width: 90, padding: '5px 8px', margin: 0, textAlign: 'center' }} />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              </div>{/* fin paddingTop */}
            </div>
          )}

          {onglet === 'mail' && isAdmin && (
            <div style={styles.card}>
              <h3 style={styles.cardTitre}>Envoi des mails (admin)</h3>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
                Pour un compte Outlook avec double authentification, utilisez un <b>mot de passe d'application</b>
                (et non votre mot de passe normal).
              </p>
              {msgMail === 'success' && <div style={styles.msgSuccess}>✅ Configuration email enregistrée</div>}
              {msgMail && msgMail !== 'success' && <div style={styles.msgError}>❌ {msgMail === 'error' ? "Erreur lors de l'enregistrement" : msgMail}</div>}

              <form onSubmit={handleSauverMail}>
                <div style={styles.formGrid}>
                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={{ ...styles.label, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span>Activer l'envoi d'emails</span>
                      <label style={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={mail.smtp_active === true}
                          onChange={e => setMail({ ...mail, smtp_active: e.target.checked })}
                        />
                        <span style={{ ...styles.toggleSlider, background: mail.smtp_active ? '#34a853' : '#ccc' }}>
                          <span style={{ ...styles.toggleThumb, left: mail.smtp_active ? '22px' : '2px' }} />
                        </span>
                      </label>
                    </label>
                  </div>

                  <div style={styles.formChamp}>
                    <label style={styles.label}>Serveur SMTP</label>
                    <input style={styles.input} type="text" value={mail.smtp_host || ''} onChange={e => setMail({ ...mail, smtp_host: e.target.value })} placeholder="smtp.office365.com" />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Port SMTP</label>
                    <input style={styles.input} type="number" value={mail.smtp_port || 587} onChange={e => setMail({ ...mail, smtp_port: e.target.value })} placeholder="587" />
                  </div>

                  <div style={styles.formChamp}>
                    <label style={styles.label}>Utilisateur SMTP (email)</label>
                    <input style={styles.input} type="email" value={mail.smtp_user || ''} onChange={e => setMail({ ...mail, smtp_user: e.target.value })} placeholder="thanh-phuoc.van@admin.vs.ch" />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Mot de passe d'application (MFA)</label>
                    <input
                      style={styles.input}
                      type="password"
                      value={mail.smtp_app_password || ''}
                      onChange={e => setMail({ ...mail, smtp_app_password: e.target.value })}
                      placeholder={mail.has_app_password ? 'Laisser vide pour conserver le mot de passe existant' : 'Coller le mot de passe d application'}
                    />
                  </div>

                  <div style={styles.formChamp}>
                    <label style={styles.label}>Nom expéditeur</label>
                    <input style={styles.input} type="text" value={mail.smtp_from_name || ''} onChange={e => setMail({ ...mail, smtp_from_name: e.target.value })} placeholder="Ecole Manager" />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Email expéditeur</label>
                    <input style={styles.input} type="email" value={mail.smtp_from_email || ''} onChange={e => setMail({ ...mail, smtp_from_email: e.target.value })} placeholder="thanh-phuoc.van@admin.vs.ch" />
                  </div>

                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={{ ...styles.label, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span>Connexion sécurisée (TLS implicite / port 465)</span>
                      <label style={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={mail.smtp_secure === true}
                          onChange={e => setMail({ ...mail, smtp_secure: e.target.checked, smtp_port: e.target.checked ? 465 : 587 })}
                        />
                        <span style={{ ...styles.toggleSlider, background: mail.smtp_secure ? '#34a853' : '#ccc' }}>
                          <span style={{ ...styles.toggleThumb, left: mail.smtp_secure ? '22px' : '2px' }} />
                        </span>
                      </label>
                    </label>
                  </div>
                </div>

                <button type="submit" style={{ ...styles.btnSauver, background: '#7c3aed', marginTop: '10px' }}>Sauvegarder la configuration</button>
              </form>

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 16, color: '#111827' }}>Tester l'envoi</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Email destinataire test</label>
                    <input style={styles.input} type="email" value={mailTestTo} onChange={e => setMailTestTo(e.target.value)} placeholder="votre.email@exemple.ch" />
                  </div>
                  <button type="button" style={{ ...styles.btnSauver, background: '#0ea5e9', opacity: testMailLoading ? 0.7 : 1 }} onClick={handleTesterMail} disabled={testMailLoading}>
                    {testMailLoading ? 'Envoi...' : 'Envoyer un test'}
                  </button>
                </div>
                {msgMailTest && (
                  <div style={{ marginTop: 12, fontWeight: 600, color: msgMailTest.startsWith('✅') ? '#166534' : '#b91c1c', whiteSpace: 'pre-line' }}>
                    {msgMailTest}
                  </div>
                )}
              </div>
            </div>
          )}

          {onglet === 'acces' && isAdmin && (
            <div style={styles.card}>
              <h3 style={styles.cardTitre}>Gestion des accès</h3>

              {/* Onglets de rôle */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #6366f1' }}>
                {[
                  { key: 'employes_admin', label: 'Employés admin.' },
                  { key: 'professeurs',    label: 'Professeurs' },
                  { key: 'responsables',   label: 'Responsables' },
                  { key: 'admins',         label: 'Administrateurs' },
                ].map(r => (
                  <button key={r.key} onClick={() => { setAccesRoleOnglet(r.key); setModuleOuvert(null); }}
                    style={{ padding: '9px 18px', border: 'none', borderRadius: '10px 10px 0 0', background: accesRoleOnglet === r.key ? '#6366f1' : '#ede9fe', color: accesRoleOnglet === r.key ? 'white' : '#5b21b6', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: accesRoleOnglet === r.key ? -2 : 0, zIndex: accesRoleOnglet === r.key ? 2 : 1, position: 'relative' }}>
                    {r.label}
                  </button>
                ))}
              </div>

              {msgAccesProfs === 'success' && <div style={styles.msgSuccess}>✅ Accès mis à jour !</div>}
              {msgAccesProfs === 'error' && <div style={styles.msgError}>❌ Erreur</div>}
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 14px' }}>
                {accesRoleOnglet === 'professeurs'    && 'Ces paramètres s\'appliquent à tous les professeurs.'}
                {accesRoleOnglet === 'employes_admin' && 'Ces paramètres s\'appliquent aux employés administratifs.'}
                {accesRoleOnglet === 'responsables'   && 'Ces paramètres s\'appliquent aux responsables.'}
                {accesRoleOnglet === 'admins'         && 'Les administrateurs ont accès à tous les modules.'}
              </p>
              {MODULES_ACCES_PROFS.map(m => {
                const ca = accesParRole[accesRoleOnglet] || {};
                const hasOnglets = m.onglets.length > 0;
                const allOn = hasOnglets ? m.onglets.every(o => ca[o.key]) : !!ca[m.key];
                const someOn = hasOnglets ? m.onglets.some(o => ca[o.key]) : !!ca[m.key];
                const bgMain = allOn ? '#34a853' : someOn ? '#f59e0b' : '#ccc';
                return (
                  <div key={m.key} style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', background: '#f8fafc', cursor: hasOnglets ? 'pointer' : 'default', gap: 10 }}
                      onClick={() => hasOnglets && setModuleOuvert(moduleOuvert === m.key ? null : m.key)}>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{m.label}</span>
                      <div style={styles.toggle} onClick={e => { e.stopPropagation(); toggleModule(m); }}>
                        <span style={{ ...styles.toggleSlider, background: bgMain }}>
                          <span style={{ ...styles.toggleThumb, left: someOn ? '22px' : '2px' }} />
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6, visibility: hasOnglets ? 'visible' : 'hidden' }}>{moduleOuvert === m.key ? '▲' : '▼'}</span>
                    </div>
                    {hasOnglets && moduleOuvert === m.key && (
                      <div style={{ background: 'white', padding: '4px 14px 10px' }}>
                        {m.onglets.map((o, i) => (
                          <div key={o.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < m.onglets.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                            <span style={{ fontSize: 13, color: '#334155' }}>{o.label}</span>
                            <div style={styles.toggle} onClick={e => { e.stopPropagation(); toggleOnglet(m, o.key); }}>
                              <span style={{ ...styles.toggleSlider, background: ca[o.key] ? '#34a853' : '#ccc' }}>
                                <span style={{ ...styles.toggleThumb, left: ca[o.key] ? '22px' : '2px' }} />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <button style={{ ...styles.btnSauver, background: '#ff9800', marginTop: '20px' }} onClick={async () => {
                try {
                  await axios.put(API + '/parametres/acces-profs', { acces_profs: accesParRole }, { headers });
                  setMsgAccesProfs('success');
                  setTimeout(() => setMsgAccesProfs(''), 3000);
                } catch { setMsgAccesProfs('error'); }
              }}>
                Sauvegarder les accès
              </button>
            </div>
          )}
          {onglet === 'danger' && isAdmin && (
            <div style={{...styles.card,border:'2px solid #fecaca'}}>
              <h3 style={{...styles.cardTitre,color:'#dc2626'}}>Réinitialisation</h3>

              <div style={{marginTop:4,paddingTop:0}}>
                <h4 style={{margin:'0 0 10px',color:'#c2410c',fontSize:18}}>Réinitialisation pour la rentrée scolaire</h4>
                <p style={{color:'#7c2d12',fontSize:14,marginBottom:16,lineHeight:1.6}}>
                  Cette option supprime uniquement les données de l'année à réinitialiser :
                </p>
                <ul style={{color:'#7c2d12',fontSize:13,lineHeight:1.7,margin:'0 0 16px 18px'}}>
                  <li>Élèves et toutes leurs données liées</li>
                  <li>Notes (et évaluations)</li>
                  <li>Affectations professeurs / classes</li>
                  <li>Plannings (les disponibilités professeurs sont conservées)</li>
                  <li>Présences</li>
                  <li>Comptabilité et facturation</li>
                </ul>

                {resetRentreeMsg && (
                  <div style={{padding:'12px 16px',borderRadius:8,marginBottom:14,fontWeight:600,fontSize:14,
                    background:resetRentreeMsg.startsWith('✅')?'#d1fae5':'#fee2e2',
                    color:resetRentreeMsg.startsWith('✅')?'#065f46':'#991b1b'}}>
                    {resetRentreeMsg}
                  </div>
                )}

                {resetRentreeEtape === 0 && (
                  <button onClick={() => setResetRentreeEtape(1)}
                    style={{padding:'12px 24px',background:'#ea580c',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:14}}>
                    Lancer la réinitialisation pour la rentrée scolaire
                  </button>
                )}

                {resetRentreeEtape === 1 && (
                  <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,padding:20}}>
                    <p style={{fontWeight:700,color:'#c2410c',marginBottom:16}}>⚠️ Première confirmation — Continuer ?</p>
                    <p style={{fontSize:13,color:'#7c2d12',marginBottom:16}}>Cette action supprime les données scolaires listées ci-dessus.</p>
                    <div style={{display:'flex',gap:10}}>
                      <button onClick={() => setResetRentreeEtape(0)} style={{padding:'10px 20px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontWeight:600}}>Annuler</button>
                      <button onClick={() => setResetRentreeEtape(2)} style={{padding:'10px 20px',background:'#ea580c',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700}}>Oui, continuer</button>
                    </div>
                  </div>
                )}

                {resetRentreeEtape === 2 && (
                  <div style={{background:'#fff7ed',border:'2px solid #c2410c',borderRadius:10,padding:20}}>
                    <p style={{fontWeight:800,color:'#c2410c',marginBottom:16,fontSize:15}}>🚨 Dernière confirmation — Réinitialisation de rentrée ?</p>
                    <p style={{fontSize:13,color:'#7c2d12',marginBottom:16}}>Les données de rentrée seront supprimées immédiatement.</p>
                    <div style={{display:'flex',gap:10}}>
                      <button onClick={() => setResetRentreeEtape(0)} style={{padding:'10px 20px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontWeight:600}}>Annuler</button>
                      <button onClick={handleResetRentree} style={{padding:'10px 20px',background:'#9a3412',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:800}}>⚠️ SUPPRIMER LES DONNÉES DE RENTRÉE</button>
                    </div>
                  </div>
                )}

                {resetRentreeEtape === 3 && (
                  <div style={{padding:20,textAlign:'center',color:'#c2410c',fontWeight:700}}>⏳ Réinitialisation de rentrée en cours...</div>
                )}

                {resetRentreeEtape === 4 && (
                  <button onClick={() => { setResetRentreeEtape(0); setResetRentreeMsg(''); }} style={{padding:'10px 20px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontWeight:600,marginTop:10}}>
                    Réinitialiser
                  </button>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}


const styles = {
  page: { minHeight: '100vh', background: '#f8fafc', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  main: { padding: '32px 36px', minHeight: '100vh' },
  topBar: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' },
  titre: { fontSize: 22, fontWeight: 800, color: '#0f172a', flex: 1, margin: 0 },
  topBarRight: { display: 'flex', alignItems: 'center', gap: 10 },
  btnSauverHeader: { padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' },
  content: {},
  card: { background: 'white', borderRadius: 14, padding: '30px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  cardTitre: { fontSize: '20px', fontWeight: '700', marginBottom: '20px' },
  roleTag: { display: 'inline-block', background: '#e3f2fd', color: '#1a73e8', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' },
  msgSuccess: { background: '#e8f5e9', color: '#2e7d32', padding: '10px 16px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600' },
  msgError: { background: '#ffebee', color: '#c62828', padding: '10px 16px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600' },
  msgInfo: { padding: '10px 16px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' },
  formChamp: { display: 'flex', flexDirection: 'column', marginBottom: '15px' },
  label: { fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#555' },
  input: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', background: 'white', fontFamily: 'inherit' },
  btnSauver: { padding: '12px 24px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px', fontFamily: 'inherit' },
  vide: { color: '#888', textAlign: 'center', padding: '30px' },
  profCard: { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer', border: '2px solid transparent' },
  profAvatar: { width: '44px', height: '44px', borderRadius: '50%', background: '#ff9800', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '15px' },
  profNom: { fontWeight: '700', fontSize: '15px' },
  profEmail: { fontSize: '13px', color: '#888' },
  profPermsCount: { fontSize: '12px', color: '#ff9800', fontWeight: '600', background: '#fff3e0', padding: '4px 10px', borderRadius: '12px' },
  chevron: { fontSize: '20px', color: '#ccc' },
  profHeader: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #f0f0f0' },
  btnBack: { padding: '8px 14px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' },
  permsGrid: { display: 'flex', flexDirection: 'column', gap: '12px' },
  permRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#f8f9fa', borderRadius: '10px' },
  permLabel: { fontSize: '14px', fontWeight: '600' },
  toggle: { position: 'relative', display: 'inline-block', cursor: 'pointer' },
  toggleSlider: { display: 'block', width: '46px', height: '26px', borderRadius: '13px', transition: 'background 0.3s', position: 'relative' },
  toggleThumb: { position: 'absolute', top: '3px', width: '20px', height: '20px', background: 'white', borderRadius: '50%', transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' },
};