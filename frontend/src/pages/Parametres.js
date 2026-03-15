import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';

const MODULES_ACCES_PROFS = [
  { key: 'eleves',            label: 'Élèves',         defaut: true },
  { key: 'classes',           label: 'Classes',         defaut: false },
  { key: 'branches',          label: 'Branches',        defaut: false },
  { key: 'emploi_du_temps',   label: 'Emploi du Temps', defaut: false },
  { key: 'presences',         label: 'Présences',       defaut: true },
  { key: 'notes',             label: 'Notes',           defaut: true },
  { key: 'tcf',               label: 'TCF',             defaut: false },
  { key: 'calendrier',        label: 'Calendrier',      defaut: true },
  { key: 'comptabilite',      label: 'Comptabilité',    defaut: false },
  { key: 'documents',         label: 'Documents',       defaut: false },
  { key: 'statistiques',      label: 'Statistiques',    defaut: false },
];

export default function Parametres() {
  const [onglet, setOnglet] = useState('profil');
  const [profil, setProfil] = useState({ nom: '', prenom: '', email: '', role: '', telephone: '', adresse: '', npa: '', lieu: '', sexe: '', date_naissance: '', avs: '', taux_activite: '', periodes_semaine: '', type_contrat: '', type_permis: '', niveau_prefere: '', lieu_travail_prefere: '', remarque_lieu_travail: '', priorite_pref: 'niveau', specialite: '' });
  const [ecole, setEcole] = useState({
    nom_ecole: '', adresse: '', telephone: '', email: '', annee_scolaire: '',
    responsable_langues_jeunes: '', responsable_niveau: '',
    responsable_niveau_csc: '', responsable_niveau_cfr: '', responsable_niveau_epl: '',
    sexe_responsable_langues_jeunes: 'M', sexe_responsable_niveau_csc: 'M', sexe_responsable_niveau_cfr: 'M', sexe_responsable_niveau_epl: 'M'
  });
  const [mdp, setMdp] = useState({ ancien: '', nouveau: '', confirmation: '' });
  const [profs, setProfs] = useState([]);
  const [profSelectionne, setProfSelectionne] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [accesProfs, setAccesProfs] = useState({});
  const [msgAccesProfs, setMsgAccesProfs] = useState('');
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
  const navigate = useNavigate();
  const headers = {};
  const isAdmin = profil.role === 'admin';

  useEffect(() => { chargerProfil(); }, []);
  useEffect(() => { chargerMfaStatus(); }, []);
  useEffect(() => { if (isAdmin) { chargerEcole(); chargerProfs(); chargerMail(); chargerAccesProfs(); } }, [isAdmin]);
  useEffect(() => {
    if (isAdmin && !mailTestTo && profil?.email) setMailTestTo(profil.email);
  }, [isAdmin, profil?.email, mailTestTo]);

  const chargerProfil = async () => {
    try {
      const res = await axios.get(API + '/parametres/profil', { headers });
      setProfil(res.data);
    } catch (err) { console.error(err); }
  };

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
      }
    } catch (err) { console.error(err); }
  };

  const chargerProfs = async () => {
    try {
      const res = await axios.get(API + '/parametres/profs', { headers });
      setProfs(res.data);
    } catch (err) { console.error(err); }
  };

  const chargerAccesProfs = async () => {
    try {
      const res = await axios.get(API + '/parametres/acces-profs', { headers });
      const data = res.data || {};
      const init = {};
      MODULES_ACCES_PROFS.forEach(m => { init[m.key] = data[m.key] !== undefined ? data[m.key] : m.defaut; });
      setAccesProfs(init);
    } catch {}
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
      await axios.put(API + '/parametres/ecole', ecole, { headers });
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

  const ONGLETS = [
    { key: 'profil', label: '👤 Mon profil', show: true },
    { key: 'mdp', label: '🔒 Mot de passe', show: true },
    { key: 'mfa', label: '📱 Double authentification', show: true },
    { key: 'ecole', label: '🏫 École', show: isAdmin },
    { key: 'mail', label: '✉️ Envoi des mails', show: isAdmin },
    { key: 'acces', label: '🔑 Gestion des accès', show: isAdmin },
    { key: 'danger', label: '⚠️ Réinitialisation', show: isAdmin },
  ].filter(o => o.show);

  const COULEURS = { profil: '#1a73e8', mdp: '#ea4335', mfa: '#0f766e', ecole: '#34a853', mail: '#7c3aed', acces: '#ff9800', danger: '#dc2626' };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={styles.titre}>⚙️ Paramètres</h2>
      </div>

      <div style={styles.layout}>
        <div style={styles.sidebar}>
          {ONGLETS.map(o => (
            <div
              key={o.key}
              style={{
                ...styles.navItem,
                ...(onglet === o.key ? { ...styles.navItemActif, boxShadow: `0 -1px 6px ${COULEURS[o.key]}33` } : {})
              }}
              onClick={() => setOnglet(o.key)}
            >
              {o.label}
            </div>
          ))}
        </div>

        <div style={styles.content}>

          {onglet === 'profil' && (
            <div style={styles.card}>
              <h3 style={styles.cardTitre}>👤 Mon profil</h3>
              <div style={styles.roleTag}>{profil.role}</div>
              {msgProfil === 'success' && <div style={styles.msgSuccess}>✅ Profil mis à jour !</div>}
              {msgProfil === 'error' && <div style={styles.msgError}>❌ Erreur lors de la mise à jour</div>}
              <form onSubmit={handleSauverProfil}>

                {/* Informations de connexion */}
                <div style={{fontSize:11,fontWeight:700,color:'#92400e',background:'#fef3c7',padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase'}}>🔐 Informations de connexion</div>
                <div style={{...styles.formGrid, marginBottom:20}}>
                  <div style={{...styles.formChamp, gridColumn:'1/-1'}}>
                    <label style={styles.label}>Email *</label>
                    <input style={styles.input} type="email" required value={profil.email} onChange={e => setProfil({ ...profil, email: e.target.value })} />
                  </div>
                </div>

                {/* Informations personnelles */}
                <div style={{fontSize:11,fontWeight:700,color:'#1e40af',background:'#dbeafe',padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase'}}>👤 Informations personnelles</div>
                <div style={{...styles.formGrid, marginBottom:20}}>
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

                {/* Désidératas — uniquement pour les profs */}
                {profil.role === 'prof' && (<>
                  <div style={{fontSize:11,fontWeight:700,color:'#5b21b6',background:'#ede9fe',padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase'}}>🧭 Désidératas</div>
                  <div style={{marginBottom:20,display:'flex',flexDirection:'column',gap:12}}>
                    <div style={styles.formChamp}>
                      <label style={styles.label}>Niveaux préférés</label>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                        {['CSC','CFR','EPL'].map(n => {
                          const niveaux = profil.niveau_prefere ? profil.niveau_prefere.split(',').filter(Boolean) : [];
                          const selected = niveaux.includes(n);
                          return (
                            <button key={n} type="button"
                              onClick={() => {
                                const curr = profil.niveau_prefere ? profil.niveau_prefere.split(',').filter(Boolean) : [];
                                const newNiv = selected ? curr.filter(x=>x!==n) : [...curr, n];
                                setProfil({...profil, niveau_prefere: newNiv.join(',')});
                              }}
                              style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+(selected?'#6366f1':'#e2e8f0'),background:selected?'#e0e7ff':'white',color:selected?'#3730a3':'#64748b',cursor:'pointer',fontWeight:700,fontSize:13}}>
                              {n}
                            </button>
                          );
                        })}
                        <button type="button"
                          onClick={() => setProfil({...profil, niveau_prefere:''})}
                          style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+((!profil.niveau_prefere)?'#94a3b8':'#e2e8f0'),background:(!profil.niveau_prefere)?'#f1f5f9':'white',color:'#64748b',cursor:'pointer',fontWeight:700,fontSize:13}}>
                          Aucune préférence
                        </button>
                      </div>
                    </div>
                    <div style={styles.formChamp}>
                      <label style={styles.label}>Remarques niveaux / branches</label>
                      <input style={styles.input} type="text" value={profil.specialite||''} onChange={e => setProfil({...profil, specialite: e.target.value})} placeholder="Ex: Mathématiques, Physique..." />
                    </div>
                    <div style={styles.formChamp}>
                      <label style={styles.label}>Lieux de travail préférés</label>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                        {['BOTZA','SYNECOM','CREUSET'].map(l => {
                          const lieux = profil.lieu_travail_prefere ? profil.lieu_travail_prefere.split(',').filter(Boolean) : [];
                          const selected = lieux.includes(l);
                          return (
                            <button key={l} type="button"
                              onClick={() => {
                                const curr = profil.lieu_travail_prefere ? profil.lieu_travail_prefere.split(',').filter(Boolean) : [];
                                const newL = selected ? curr.filter(x=>x!==l) : [...curr, l];
                                setProfil({...profil, lieu_travail_prefere: newL.join(',')});
                              }}
                              style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+(selected?'#6366f1':'#e2e8f0'),background:selected?'#e0e7ff':'white',color:selected?'#3730a3':'#64748b',cursor:'pointer',fontWeight:700,fontSize:13}}>
                              {l}
                            </button>
                          );
                        })}
                        <button type="button"
                          onClick={() => setProfil({...profil, lieu_travail_prefere:''})}
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
                        {[['niveau','Niveau'],['lieu','Lieu de travail']].map(([val,label]) => (
                          <button key={val} type="button"
                            onClick={() => setProfil({...profil, priorite_pref: val})}
                            style={{padding:'8px 14px',borderRadius:8,border:'2px solid '+(profil.priorite_pref===val?'#6366f1':'#e2e8f0'),background:profil.priorite_pref===val?'#e0e7ff':'white',fontWeight:700,cursor:'pointer',fontSize:13,color:profil.priorite_pref===val?'#3730a3':'#64748b'}}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Informations professionnelles (lecture seule) */}
                  <div style={{fontSize:11,fontWeight:700,color:'#065f46',background:'#d1fae5',padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase'}}>💼 Informations professionnelles</div>
                  <div style={{...styles.formGrid, marginBottom:20}}>
                    {[
                      {label:"Taux d'activité (%)", value: profil.taux_activite ?? '—'},
                      {label:"Périodes / semaine", value: profil.periodes_semaine ?? '—'},
                      {label:"Type de contrat", value: profil.type_contrat || '—'},
                      {label:"Type de permis", value: profil.type_permis || '—'},
                    ].map(({label,value}) => (
                      <div key={label} style={styles.formChamp}>
                        <label style={styles.label}>{label}</label>
                        <div style={{...styles.input, background:'#f1f5f9', color:'#64748b', cursor:'not-allowed', display:'flex', alignItems:'center', height:38}}>{value}</div>
                      </div>
                    ))}
                  </div>
                </>)}

                <button type="submit" style={styles.btnSauver}>💾 Sauvegarder</button>
              </form>
            </div>
          )}

          {onglet === 'mdp' && (
            <div style={styles.card}>
              <h3 style={styles.cardTitre}>🔒 Changer le mot de passe</h3>
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
                <button type="submit" style={{ ...styles.btnSauver, background: '#ea4335', marginTop: '10px' }}>🔒 Changer</button>
              </form>
            </div>
          )}

          {onglet === 'mfa' && (
            <div style={styles.card}>
              <h3 style={styles.cardTitre}>📱 Double authentification (Google Authenticator)</h3>
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
              <h3 style={styles.cardTitre}>🏫 Paramètres de l'école</h3>
              {msgEcole === 'success' && <div style={styles.msgSuccess}>✅ Paramètres mis à jour !</div>}
              {msgEcole === 'error' && <div style={styles.msgError}>❌ Erreur lors de la mise à jour</div>}
              <form onSubmit={handleSauverEcole}>
                <div style={styles.formGrid}>
                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={styles.label}>Nom de l'école</label>
                    <input style={styles.input} type="text" value={ecole.nom_ecole || ''} onChange={e => setEcole({ ...ecole, nom_ecole: e.target.value })} />
                  </div>
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
                </div>
                <button type="submit" style={{ ...styles.btnSauver, background: '#34a853', marginTop: '10px' }}>💾 Sauvegarder</button>
              </form>
            </div>
          )}

          {onglet === 'mail' && isAdmin && (
            <div style={styles.card}>
              <h3 style={styles.cardTitre}>✉️ Envoi des mails (admin)</h3>
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

                <button type="submit" style={{ ...styles.btnSauver, background: '#7c3aed', marginTop: '10px' }}>💾 Sauvegarder la configuration</button>
              </form>

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 16, color: '#111827' }}>🧪 Tester l'envoi</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Email destinataire test</label>
                    <input style={styles.input} type="email" value={mailTestTo} onChange={e => setMailTestTo(e.target.value)} placeholder="votre.email@exemple.ch" />
                  </div>
                  <button type="button" style={{ ...styles.btnSauver, background: '#0ea5e9', opacity: testMailLoading ? 0.7 : 1 }} onClick={handleTesterMail} disabled={testMailLoading}>
                    {testMailLoading ? '⏳ Envoi...' : '📨 Envoyer un test'}
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
              <h3 style={styles.cardTitre}>🔑 Gestion des accès</h3>

              <div style={{marginBottom:24}}>
                <div style={{fontSize:13,fontWeight:700,color:'#475569',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.04em'}}>Employés administratifs</div>
                <p style={{color:'#64748b',fontSize:13,margin:'0 0 8px'}}>Les employés administratifs ont accès à tous les modules sans restriction.</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {MODULES_ACCES_PROFS.map(m => (
                    <span key={m.key} style={{padding:'4px 12px',background:'#d1fae5',color:'#065f46',borderRadius:99,fontSize:12,fontWeight:700}}>✅ {m.label}</span>
                  ))}
                  <span style={{padding:'4px 12px',background:'#d1fae5',color:'#065f46',borderRadius:99,fontSize:12,fontWeight:700}}>✅ Employés</span>
                  <span style={{padding:'4px 12px',background:'#d1fae5',color:'#065f46',borderRadius:99,fontSize:12,fontWeight:700}}>✅ Professeurs</span>
                  <span style={{padding:'4px 12px',background:'#d1fae5',color:'#065f46',borderRadius:99,fontSize:12,fontWeight:700}}>✅ Paramètres</span>
                </div>
              </div>

              <div style={{borderTop:'1px solid #e2e8f0',paddingTop:20}}>
                <div style={{fontSize:13,fontWeight:700,color:'#475569',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.04em'}}>Professeurs — accès aux modules</div>
                <p style={{color:'#64748b',fontSize:13,margin:'0 0 16px'}}>Ces paramètres s'appliquent à tous les professeurs.</p>
                {msgAccesProfs === 'success' && <div style={styles.msgSuccess}>✅ Accès mis à jour !</div>}
                {msgAccesProfs === 'error' && <div style={styles.msgError}>❌ Erreur</div>}
                <div style={styles.permsGrid}>
                  {MODULES_ACCES_PROFS.map(m => (
                    <div key={m.key} style={styles.permRow}>
                      <div style={styles.permLabel}>{m.label}</div>
                      <label style={styles.toggle}>
                        <input type="checkbox" checked={accesProfs[m.key] === true}
                          onChange={e => setAccesProfs({ ...accesProfs, [m.key]: e.target.checked })} />
                        <span style={{ ...styles.toggleSlider, background: accesProfs[m.key] ? '#34a853' : '#ccc' }}>
                          <span style={{ ...styles.toggleThumb, left: accesProfs[m.key] ? '22px' : '2px' }} />
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
                <button style={{ ...styles.btnSauver, background: '#ff9800', marginTop: '20px' }} onClick={async () => {
                  try {
                    await axios.put(API + '/parametres/acces-profs', { acces_profs: accesProfs }, { headers });
                    setMsgAccesProfs('success');
                    setTimeout(() => setMsgAccesProfs(''), 3000);
                  } catch { setMsgAccesProfs('error'); }
                }}>
                  💾 Sauvegarder les accès
                </button>
              </div>
            </div>
          )}
          {onglet === 'danger' && isAdmin && (
            <div style={{...styles.card,border:'2px solid #fecaca'}}>
              <h3 style={{...styles.cardTitre,color:'#dc2626'}}>⚠️ Réinitialisation</h3>

              <div style={{marginTop:4,paddingTop:0}}>
                <h4 style={{margin:'0 0 10px',color:'#c2410c',fontSize:18}}>🔁 Réinitialisation pour la rentrée scolaire</h4>
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
                    🧹 Lancer la réinitialisation pour la rentrée scolaire
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

              <div style={{marginTop:30,paddingTop:24,borderTop:'2px dashed #fecaca'}}>
                <h4 style={{margin:'0 0 10px',color:'#dc2626',fontSize:18}}>⚠️ Zone de danger</h4>
                <p style={{color:'#64748b',fontSize:14,marginBottom:24,lineHeight:1.6}}>
                  Cette action supprime <b>définitivement et irréversiblement</b> toutes les données :
                  élèves, classes, professeurs, notes, branches, emploi du temps, présences, comptabilité, calendrier, etc.<br/>
                  <b>Les comptes administrateurs sont conservés.</b>
                </p>

                {resetMsg && (
                  <div style={{padding:'12px 16px',borderRadius:8,marginBottom:20,fontWeight:600,fontSize:14,
                    background:resetMsg.startsWith('✅')?'#d1fae5':'#fee2e2',
                    color:resetMsg.startsWith('✅')?'#065f46':'#991b1b'}}>
                    {resetMsg}
                  </div>
                )}

                {resetEtape === 0 && (
                  <button onClick={() => setResetEtape(1)}
                    style={{padding:'12px 24px',background:'#dc2626',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:14}}>
                    🗑️ Réinitialiser toutes les données
                  </button>
                )}

                {resetEtape === 1 && (
                  <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:20}}>
                    <p style={{fontWeight:700,color:'#dc2626',marginBottom:16}}>⚠️ Première confirmation — Êtes-vous sûr ?</p>
                    <p style={{fontSize:13,color:'#64748b',marginBottom:16}}>Cette action est irréversible. Toutes les données seront perdues.</p>
                    <div style={{display:'flex',gap:10}}>
                      <button onClick={() => setResetEtape(0)} style={{padding:'10px 20px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontWeight:600}}>Annuler</button>
                      <button onClick={() => setResetEtape(2)} style={{padding:'10px 20px',background:'#dc2626',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700}}>Oui, continuer</button>
                    </div>
                  </div>
                )}

                {resetEtape === 2 && (
                  <div style={{background:'#fef2f2',border:'2px solid #dc2626',borderRadius:10,padding:20}}>
                    <p style={{fontWeight:800,color:'#dc2626',marginBottom:16,fontSize:15}}>🚨 Dernière confirmation — Cette action est irréversible !</p>
                    <p style={{fontSize:13,color:'#64748b',marginBottom:16}}>Toutes les données seront <b>définitivement supprimées</b>. Confirmez une dernière fois.</p>
                    <div style={{display:'flex',gap:10}}>
                      <button onClick={() => setResetEtape(0)} style={{padding:'10px 20px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontWeight:600}}>Annuler</button>
                      <button onClick={handleReset} style={{padding:'10px 20px',background:'#991b1b',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:800}}>⚠️ SUPPRIMER TOUTES LES DONNÉES</button>
                    </div>
                  </div>
                )}

                {resetEtape === 3 && (
                  <div style={{padding:20,textAlign:'center',color:'#dc2626',fontWeight:700}}>⏳ Suppression en cours...</div>
                )}

                {resetEtape === 4 && (
                  <button onClick={() => { setResetEtape(0); setResetMsg(''); }} style={{padding:'10px 20px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontWeight:600,marginTop:10}}>
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
  page: { padding: '20px', background: '#f0f2f5', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' },
  btnRetour: { padding: '8px 16px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer' },
  titre: { fontSize: '24px', fontWeight: '700' },
  layout: { display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px' },
  sidebar: { background: 'white', borderRadius: '12px', padding: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', height: 'fit-content' },
  navItem: { padding: '10px 14px', borderRadius: '10px 10px 0 0', cursor: 'pointer', fontSize: '14px', fontWeight: '700', border: 'none', background: '#ede9fe', color: '#5b21b6', marginBottom: '6px', lineHeight: 1.2, position: 'relative', zIndex: 1, outline: 'none' },
  navItemActif: { background: '#6366f1', color: 'white', border: 'none', marginBottom: '5px', transform: 'translateX(2px)', zIndex: 2 },
  content: {},
  card: { background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  cardTitre: { fontSize: '20px', fontWeight: '700', marginBottom: '20px' },
  roleTag: { display: 'inline-block', background: '#e3f2fd', color: '#1a73e8', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', marginBottom: '20px' },
  msgSuccess: { background: '#e8f5e9', color: '#2e7d32', padding: '10px 16px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600' },
  msgError: { background: '#ffebee', color: '#c62828', padding: '10px 16px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600' },
  msgInfo: { padding: '10px 16px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' },
  formChamp: { display: 'flex', flexDirection: 'column', marginBottom: '15px' },
  label: { fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#555' },
  input: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' },
  btnSauver: { padding: '12px 24px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' },
  vide: { color: '#888', textAlign: 'center', padding: '30px' },
  profCard: { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer', border: '2px solid transparent' },
  profAvatar: { width: '44px', height: '44px', borderRadius: '50%', background: '#ff9800', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '15px' },
  profNom: { fontWeight: '700', fontSize: '15px' },
  profEmail: { fontSize: '13px', color: '#888' },
  profPermsCount: { fontSize: '12px', color: '#ff9800', fontWeight: '600', background: '#fff3e0', padding: '4px 10px', borderRadius: '12px' },
  chevron: { fontSize: '20px', color: '#ccc' },
  profHeader: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #f0f0f0' },
  btnBack: { padding: '8px 14px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  permsGrid: { display: 'flex', flexDirection: 'column', gap: '12px' },
  permRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#f8f9fa', borderRadius: '10px' },
  permLabel: { fontSize: '14px', fontWeight: '600' },
  toggle: { position: 'relative', display: 'inline-block', cursor: 'pointer' },
  toggleSlider: { display: 'block', width: '46px', height: '26px', borderRadius: '13px', transition: 'background 0.3s', position: 'relative' },
  toggleThumb: { position: 'absolute', top: '3px', width: '20px', height: '20px', background: 'white', borderRadius: '50%', transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' },
};