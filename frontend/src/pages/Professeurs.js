import { isAdmin, getUser } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';
const CONTRATS = ['CDI','CDD','Remplaçant','Stagiaire','Civiliste','Autre'];
const TYPES_EXTERN = ['Stagiaire','Civiliste','Remplaçant','Bénévole','Autre'];
const PERMIS = ['Citoyen CH/UE','Permis C','Permis B','Permis L','Permis G','Frontalier','Autre'];
const MAX_PERIODES = 32;
const nomSansSuffixe = (nom) => String(nom || '').split('-')[0].trim();

const normaliserBranchesSpecialites = (valeur) => {
  if (!valeur) return [];
  if (Array.isArray(valeur)) {
    return Array.from(new Set(valeur.map(v => String(v).trim()).filter(Boolean)));
  }
  const brut = String(valeur).trim();
  if (!brut) return [];
  try {
    const parsed = JSON.parse(brut);
    if (Array.isArray(parsed)) {
      return Array.from(new Set(parsed.map(v => String(v).trim()).filter(Boolean)));
    }
  } catch {}
  // Cas texte PostgreSQL (ex: {"1","2"}) ou liste simple "1,2"
  const nettoye = brut.replace(/^\{|\}$/g, '').replace(/"/g, '');
  return Array.from(new Set(nettoye.split(',').map(v => String(v).trim()).filter(Boolean)));
};

export default function Professeurs({
  apiBase = '/profs',
  titre = 'Gestion des professeurs',
  nomEntite = 'professeur',
  hidePreferences = false,
  hidePeriodesSemaine = false,
  hidePreferencesLieu = false,
  hideRemarque = false,
  singleColumnForm = false,
  excludeSessionUser = false,
  searchPlaceholder = 'Rechercher un professeur...',
  showRoleToggle = false,
} = {}) {
  const [profs, setProfs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [profEdit, setProfEdit] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [form, setForm] = useState({ nom:'',prenom:'',email:'',mot_de_passe:'',telephone:'',specialite:'',adresse:'',npa:'',lieu:'',sexe:'',taux_activite:'',periodes_semaine:'',date_naissance:'',avs:'',type_contrat:'',type_permis:'',type_prof:'Interne',niveau_prefere:'',branches_specialites:[],lieu_travail_prefere:'',remarque_lieu_travail:'',priorite_pref:'niveau',role_acces:'' });
  const [roleAccesErreur, setRoleAccesErreur] = useState(false);
  const [branchesDisponibles, setBranchesDisponibles] = useState([]);
  const [niveauxDB, setNiveauxDB] = useState([]);
  const [lieuxTravailDB, setLieuxTravailDB] = useState([]);
  const [emailEnvoi, setEmailEnvoi] = useState({});
  const [showDocs, setShowDocs] = useState(false);
  const [docsProf, setDocsProf] = useState(null);
  const [profDocs, setProfDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ type: 'CV' });
  const navigate = useNavigate();
  const apiUrl = API + apiBase;

  const ouvrirDocuments = async (prof) => {
    setDocsProf(prof);
    setShowDocs(true);
    setDocsLoading(true);
    try {
      const r = await axios.get(apiUrl + '/' + prof.id + '/documents', {headers});
      setProfDocs(r.data);
    } catch(err) { setProfDocs([]); }
    setDocsLoading(false);
  };

  const uploadDocument = async (file, type) => {
    if (file.size > 5*1024*1024) { alert('Fichier trop grand (max 5MB)'); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        await axios.post(apiUrl + '/' + docsProf.id + '/documents', {
          nom: file.name, type, contenu: e.target.result, taille: file.size
        }, {headers});
        const r = await axios.get(apiUrl + '/' + docsProf.id + '/documents', {headers});
        setProfDocs(r.data);
      } catch(err) { alert('Erreur upload: '+err.message); }
    };
    reader.readAsDataURL(file);
  };

  const telechargerDocument = async (doc) => {
    try {
      const r = await axios.get(apiUrl + '/' + docsProf.id + '/documents/' + doc.id + '/telecharger', {headers});
      const a = document.createElement('a');
      a.href = r.data.contenu;
      a.download = r.data.nom;
      a.click();
    } catch(err) { alert('Erreur téléchargement'); }
  };

  const supprimerDocument = async (docId) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    await axios.delete(apiUrl + '/' + docsProf.id + '/documents/' + docId, {headers});
    setProfDocs(prev => prev.filter(d => d.id !== docId));
  };

  const envoyerAccesEmail = async (profId) => {
    setEmailEnvoi(prev => ({...prev, [profId]: 'loading'}));
    try {
      await axios.post(apiUrl + '/' + profId + '/envoyer-acces', {}, {headers});
      setEmailEnvoi(prev => ({...prev, [profId]: 'ok'}));
      setTimeout(() => setEmailEnvoi(prev => ({...prev, [profId]: null})), 4000);
    } catch(err) {
      setEmailEnvoi(prev => ({...prev, [profId]: 'error'}));
      alert('Erreur: '+(err.response?.data?.erreur||err.message));
    }
  };

  const chargerBranchesNiveaux = async (niveaux = []) => {
    try {
      const r = await axios.get(API+'/branches', { headers });
      const branchesFiltrees = r.data
        .filter(b => !niveaux.length || niveaux.includes(b.niveau))
        .filter((b) => {
          const code = String(b.designation_courte || '').trim().toUpperCase();
          const nom = String(b.nom || '').trim().toLowerCase();
          // Demande métier: ne pas proposer AI (Accompagnement individuelle) en spécialité prof.
          if (code === 'AI') return false;
          if (nom.includes('accompagnement individuelle')) return false;
          return true;
        })
        .filter((b, i, arr) => arr.findIndex(x => String(x.id) === String(b.id)) === i);

      // Regrouper les branches par désignation courte pour éviter les doublons (ex: FR sur plusieurs niveaux)
      const branchesParCode = new Map();
      branchesFiltrees.forEach((b) => {
        const code = String(b.designation_courte || b.nom || '').trim().toUpperCase();
        if (!code) return;
        if (!branchesParCode.has(code)) {
          branchesParCode.set(code, {
            id: code,
            label: code,
            noms: [String(b.nom || '').trim()].filter(Boolean),
            ids: [String(b.id)],
          });
          return;
        }
        const existant = branchesParCode.get(code);
        existant.ids.push(String(b.id));
        const nom = String(b.nom || '').trim();
        if (nom && !existant.noms.includes(nom)) existant.noms.push(nom);
      });

      const options = Array.from(branchesParCode.values())
        .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
      setBranchesDisponibles(options);
    } catch(err) { setBranchesDisponibles([]); }
  };
  const headers = {};

  useEffect(() => {
    chargerProfs();
    axios.get(API + '/donnees/niveaux').then(r => setNiveauxDB(r.data || [])).catch(() => {});
    axios.get(API + '/donnees/lieux-travail').then(r => setLieuxTravailDB(r.data || [])).catch(() => {});
  }, []);
  useEffect(() => {
    if (!showForm) return;
    if (hidePreferences) return;
    const niveaux = (form.niveau_prefere || '').split(',').filter(Boolean);
    chargerBranchesNiveaux(niveaux);
  }, [form.niveau_prefere, showForm, hidePreferences]);

  const chargerProfs = async () => {
    try { const res = await axios.get(apiUrl,{headers}); setProfs(res.data); }
    catch(err) { console.error(err); }
  };

  const handleTauxChange = (val) => {
    const periodes = val ? Math.round((parseInt(val)/100)*MAX_PERIODES) : '';
    setForm({...form, taux_activite:val, periodes_semaine:periodes});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (showRoleToggle && !form.role_acces) {
      setRoleAccesErreur(true);
      return;
    }
    setRoleAccesErreur(false);
    try {
      const payload = {
        ...form,
        branches_specialites: normaliserBranchesSpecialites(form.branches_specialites),
      };
      if (hidePeriodesSemaine) payload.periodes_semaine = null;
      if (hidePreferences) {
        payload.niveau_prefere = null;
        payload.branches_specialites = [];
      }
      if (hidePreferencesLieu) {
        payload.lieu_travail_prefere = null;
        payload.remarque_lieu_travail = null;
      }
      if (profEdit) await axios.put(apiUrl + '/' + profEdit.id, payload, {headers});
      else await axios.post(apiUrl, payload, {headers});
      setShowForm(false); setProfEdit(null); resetForm(); chargerProfs();
    } catch(err) { alert('Erreur: '+(err.response?.data?.message||err.message)); }
  };

  const resetForm = () => { setForm({nom:'',prenom:'',email:'',mot_de_passe:'',telephone:'',specialite:'',adresse:'',npa:'',lieu:'',sexe:'',taux_activite:'',periodes_semaine:'',date_naissance:'',avs:'',type_contrat:'',type_permis:'',type_prof:'Interne',niveau_prefere:'',branches_specialites:[],lieu_travail_prefere:'',remarque_lieu_travail:'',priorite_pref:'niveau',role_acces:''}); setRoleAccesErreur(false); };

  const handleEdit = (p) => {
    setProfEdit(p);
    setForm({nom:p.nom||'',prenom:p.prenom||'',email:p.email||'',mot_de_passe:'',telephone:p.telephone||'',specialite:p.specialite||'',adresse:p.adresse||'',npa:p.npa||'',lieu:p.lieu||'',sexe:p.sexe||'',taux_activite:p.taux_activite||'',periodes_semaine:p.periodes_semaine||'',date_naissance:p.date_naissance?p.date_naissance.substring(0,10):'',avs:p.avs||'',type_contrat:p.type_contrat||'',type_permis:p.type_permis||'',type_prof:p.type_prof||'Interne',niveau_prefere:p.niveau_prefere||'',branches_specialites:normaliserBranchesSpecialites(p.branches_specialites),lieu_travail_prefere:p.lieu_travail_prefere||'',remarque_lieu_travail:p.remarque_lieu_travail||'',priorite_pref:p.priorite_pref||'niveau',actif:p.actif!==false,role_acces:p.role_acces||'employe'});
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const target = profs.find(p => p.id === id); if (target?.role === 'admin') { alert('Le compte administrateur ne peut pas être supprimé.'); return; }
    if (window.confirm('Supprimer ce ' + nomEntite + ' ?')) { await axios.delete(apiUrl + '/' + id,{headers}); chargerProfs(); }
  };

  const toggleStatut = async (p) => {
    if (!isAdmin()) return;
    await axios.put(apiUrl + '/' + p.id, {...p, actif:!p.actif}, {headers});
    chargerProfs();
  };

  const profsFiltres = profs.filter(p => {
    if (p.role === 'admin') return false;
    if (excludeSessionUser && p.id === getUser()?.id) return false;
    const matchR = (
      (p.prenom+' '+p.nom+' '+p.email+' '+p.nom+' '+p.prenom)
        .toLowerCase()
        .includes(recherche.toLowerCase())
    );
    const matchS = filtreStatut==='tous' || (filtreStatut==='actif'&&p.actif!==false) || (filtreStatut==='inactif'&&p.actif===false);
    return matchR && matchS;
  });
  const niveauxPreferesSelectionnes = form.niveau_prefere ? form.niveau_prefere.split(',').filter(Boolean) : [];
  const branchesSpecialitesSelectionnees = normaliserBranchesSpecialites(form.branches_specialites);
  const libelleNiveauxBranches = niveauxPreferesSelectionnes.length > 0
    ? form.niveau_prefere
    : 'Tous niveaux';
  const colsForm = (singleColumnForm && !showRoleToggle) ? '1fr' : '1fr 1fr';

  useEffect(() => {
    if (hidePreferences) return;
    if (!showForm) return;
    if (!branchesDisponibles.length) return;
    const idsAutorises = new Set(branchesDisponibles.flatMap(b => (b.ids || []).map(String)));
    setForm(prev => {
      const courantes = normaliserBranchesSpecialites(prev.branches_specialites);
      const filtrees = courantes.filter(id => idsAutorises.has(String(id)));
      if (filtrees.length === courantes.length) return prev;
      return { ...prev, branches_specialites: filtrees };
    });
  }, [branchesDisponibles, showForm, hidePreferences]);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>{titre}</h2>
        {isAdmin() && <button style={s.btnAdd} onClick={() => { setShowForm(true); setProfEdit(null); resetForm(); }}>+ Ajouter</button>}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <input style={s.tabSearch} placeholder={searchPlaceholder} value={recherche} onChange={e => setRecherche(e.target.value)} />
        <div style={s.toggleGroup}>
          {[{id:'tous',label:'Tous'},{id:'actif',label:'Actifs'},{id:'inactif',label:'Inactifs'}].map(f => (
            <button key={f.id}
              style={{...s.toggleBtn, ...(filtreStatut===f.id ? s.toggleBtnActif : {})}}
              onClick={() => setFiltreStatut(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{profEdit?'Modifier':'Ajouter'} un {nomEntite}</h3>
              <button style={s.btnClose} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{display:'grid',gridTemplateColumns:colsForm,gap:24,alignItems:'stretch'}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'#92400e',background:'#fef3c7',padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase'}}>🔐 Informations de connexion</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Email *</label>
                      <input style={s.inp} type="email" required autoComplete="off" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="prof@ecole.ch" />
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>{profEdit?'Nouveau mot de passe':'Mot de passe *'}</label>
                      <input style={s.inp} type="password" autoComplete="new-password" value={form.mot_de_passe} onChange={e=>setForm({...form,mot_de_passe:e.target.value})} placeholder="Laisser vide pour générer automatiquement" />
                    </div>
                  </div>

                  <div style={{fontSize:11,fontWeight:700,color:'#1e40af',background:'#dbeafe',padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase'}}>👤 Informations personnelles</div>
                  <div style={{display:'grid',gridTemplateColumns:colsForm,gap:10,marginBottom:showRoleToggle?0:16}}>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>NOM *</label>
                      <input style={s.inp} required value={form.nom} onChange={e=>setForm({...form,nom:e.target.value.toUpperCase()})} placeholder="DUPONT" />
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Prénom *</label>
                      <input style={s.inp} required value={form.prenom} onChange={e=>setForm({...form,prenom:e.target.value})} placeholder="Jean" />
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Date de naissance</label>
                      <input style={s.inp} type="date" value={form.date_naissance} onChange={e=>setForm({...form,date_naissance:e.target.value})} />
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Sexe</label>
                      <select style={s.inp} value={form.sexe} onChange={e=>setForm({...form,sexe:e.target.value})}>
                        <option value="">--</option>
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Téléphone</label>
                      <input style={s.inp} value={form.telephone} onChange={e=>setForm({...form,telephone:e.target.value})} placeholder="079 123 45 67" />
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>N° AVS</label>
                      <input style={s.inp} value={form.avs} onChange={e=>setForm({...form,avs:e.target.value})} placeholder="756.XXXX.XXXX.XX" />
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gridColumn:'1/-1'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Adresse</label>
                      <input style={s.inp} value={form.adresse} onChange={e=>setForm({...form,adresse:e.target.value})} placeholder="Rue de la Paix 10" />
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>NPA</label>
                      <input style={s.inp} value={form.npa} onChange={e=>setForm({...form,npa:e.target.value})} placeholder="1950" />
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Lieu</label>
                      <input style={s.inp} value={form.lieu} onChange={e=>setForm({...form,lieu:e.target.value})} placeholder="Sion" />
                    </div>
                  </div>

                  {!showRoleToggle && (<>
                    <div style={{fontSize:11,fontWeight:700,color:'#065f46',background:'#d1fae5',padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase'}}>💼 Informations professionnelles</div>
                    <div style={{display:'flex',flexDirection:'column',gap:10}}>
                      <div style={{display:'grid',gridTemplateColumns:hidePeriodesSemaine ? '1fr' : '1fr 1fr',gap:10}}>
                        <div style={{display:'flex',flexDirection:'column'}}>
                          <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Taux d'activité (%)</label>
                          <input style={s.inp} type="number" min="0" max="200" value={form.taux_activite} onChange={e=>handleTauxChange(e.target.value)} placeholder="100" />
                        </div>
                        {!hidePeriodesSemaine && <div style={{display:'flex',flexDirection:'column'}}>
                          <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Périodes / semaine <span style={{fontSize:10,color:'#94a3b8',fontWeight:400}}>(100% = 32)</span></label>
                          <input style={s.inp} type="number" min="0" max="40" value={form.periodes_semaine} onChange={e=>setForm({...form,periodes_semaine:e.target.value})} placeholder="32" />
                        </div>}
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                        <div style={{display:'flex',flexDirection:'column'}}>
                          <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Type de contrat</label>
                          <select style={s.inp} value={form.type_contrat} onChange={e=>setForm({...form,type_contrat:e.target.value})}>
                            <option value="">-- Choisir --</option>
                            {CONTRATS.map(c=><option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div style={{display:'flex',flexDirection:'column'}}>
                          <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Type de permis</label>
                          <select style={s.inp} value={form.type_permis} onChange={e=>setForm({...form,type_permis:e.target.value})}>
                            <option value="">-- Choisir --</option>
                            {PERMIS.map(p=><option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        <label style={{fontSize:11,fontWeight:600,marginBottom:2,color:'#475569'}}>Type de professeur</label>
                        <div style={{display:'flex',gap:0,borderRadius:8,overflow:'hidden',border:'1px solid #e2e8f0'}}>
                          {['Interne','Externe'].map(t => {
                            const isExterne = form.type_prof && form.type_prof !== 'Interne';
                            const actif = t==='Interne' ? !isExterne : isExterne;
                            return <button key={t} type="button"
                              onClick={()=>setForm({...form,type_prof:t==='Interne'?'Interne':'Stagiaire'})}
                              style={{flex:1,padding:'6px 0',border:'none',cursor:'pointer',fontWeight:700,fontSize:12,background:actif?(t==='Interne'?'#6366f1':'#f59e0b'):'#f8fafc',color:actif?'white':'#64748b',transition:'background 0.15s'}}>
                              {t}
                            </button>;
                          })}
                        </div>
                        {form.type_prof && form.type_prof !== 'Interne' && (
                          <select style={s.inp} value={form.type_prof} onChange={e=>setForm({...form,type_prof:e.target.value})}>
                            {TYPES_EXTERN.map(t=><option key={t} value={t}>{t}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  </>)}
                </div>

                <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
                  {showRoleToggle && (<>
                    <div style={{fontSize:11,fontWeight:700,color:'#065f46',background:'#d1fae5',padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase'}}>💼 Informations professionnelles</div>
                    <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                        <div style={{display:'flex',flexDirection:'column'}}>
                          <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Taux d'activité (%)</label>
                          <input style={s.inp} type="number" min="0" max="200" value={form.taux_activite} onChange={e=>handleTauxChange(e.target.value)} placeholder="100" />
                        </div>
                        <div style={{display:'flex',flexDirection:'column'}}>
                          <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Type de contrat</label>
                          <select style={s.inp} value={form.type_contrat} onChange={e=>setForm({...form,type_contrat:e.target.value})}>
                            <option value="">-- Choisir --</option>
                            {CONTRATS.map(c=><option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div style={{display:'flex',flexDirection:'column'}}>
                          <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Type de permis</label>
                          <select style={s.inp} value={form.type_permis} onChange={e=>setForm({...form,type_permis:e.target.value})}>
                            <option value="">-- Choisir --</option>
                            {PERMIS.map(p=><option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:6}}>
                          <label style={{fontSize:11,fontWeight:600,marginBottom:2,color:'#475569'}}>Type de professeur</label>
                          <div style={{display:'flex',gap:0,borderRadius:8,overflow:'hidden',border:'1px solid #e2e8f0'}}>
                            {['Interne','Externe'].map(t => {
                              const isExterne = form.type_prof && form.type_prof !== 'Interne';
                              const actif = t==='Interne' ? !isExterne : isExterne;
                              return <button key={t} type="button"
                                onClick={()=>setForm({...form,type_prof:t==='Interne'?'Interne':'Stagiaire'})}
                                style={{flex:1,padding:'6px 0',border:'none',cursor:'pointer',fontWeight:700,fontSize:12,background:actif?(t==='Interne'?'#6366f1':'#f59e0b'):'#f8fafc',color:actif?'white':'#64748b',transition:'background 0.15s'}}>
                                {t}
                              </button>;
                            })}
                          </div>
                          {form.type_prof && form.type_prof !== 'Interne' && (
                            <select style={s.inp} value={form.type_prof} onChange={e=>setForm({...form,type_prof:e.target.value})}>
                              {TYPES_EXTERN.map(t=><option key={t} value={t}>{t}</option>)}
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{fontSize:11,fontWeight:700,color:'#5b21b6',background:'#ede9fe',padding:'5px 12px',borderRadius:6,marginBottom:14,textTransform:'uppercase'}}>🔑 Rôle</div>
                    <div style={{display:'flex',gap:0,borderRadius:10,overflow:'hidden',border:`1px solid ${roleAccesErreur?'#ef4444':'#e2e8f0'}`,marginBottom:4}}>
                      {[{key:'employe',label:'Employé'},{key:'responsable',label:'Responsable'},{key:'admin',label:'Administrateur'}].map(r=>(
                        <button key={r.key} type="button" onClick={()=>{setForm({...form,role_acces:r.key});setRoleAccesErreur(false);}}
                          style={{flex:1,padding:'10px 0',border:'none',borderRight:'1px solid #e2e8f0',background:form.role_acces===r.key?'#6366f1':'white',color:form.role_acces===r.key?'white':'#475569',fontWeight:form.role_acces===r.key?700:500,fontSize:13,cursor:'pointer',transition:'all 0.15s'}}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                    {roleAccesErreur && <p style={{fontSize:12,color:'#ef4444',margin:'0 0 6px',fontWeight:600}}>Le rôle est obligatoire.</p>}
                    <p style={{fontSize:12,color:'#94a3b8',margin:0}}>
                      {form.role_acces==='employe' && 'Accès standard selon la configuration des accès employés.'}
                      {form.role_acces==='responsable' && 'Accès étendu selon la configuration des accès responsables.'}
                      {form.role_acces==='admin' && 'Accès complet à tous les modules.'}
                    </p>
                  </>)}
                  {(!hidePreferences || !hidePreferencesLieu || !hideRemarque) && (
                    <div style={{fontSize:11,fontWeight:700,color:'#5b21b6',background:'#ede9fe',padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase',marginTop:showRoleToggle?20:0}}>🧭 Désidératas</div>
                  )}

                  {!hidePreferences && (
                    <div style={{display:'flex',flexDirection:'column',marginBottom:12}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Niveaux préférés</label>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        {niveauxDB.map(niv => {
                          const n = niv.nom;
                          const niveaux = form.niveau_prefere ? form.niveau_prefere.split(',').filter(Boolean) : [];
                          const selected = niveaux.includes(n);
                          return (
                            <button key={n} type="button"
                              onClick={() => {
                                const curr = form.niveau_prefere ? form.niveau_prefere.split(',').filter(Boolean) : [];
                                let newNiv = selected ? curr.filter(x=>x!==n) : [...curr, n];
                                if (newNiv.length === niveauxDB.length) newNiv = [];
                                setForm(prev => ({...prev, niveau_prefere: newNiv.join(',')}));
                              }}
                              style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+(selected?'#6366f1':'#e2e8f0'),background:selected?'#e0e7ff':'white',color:selected?'#3730a3':'#64748b',cursor:'pointer',fontWeight:700,fontSize:13,transition:'all 0.15s'}}>
                              {n}
                            </button>
                          );
                        })}
                        <button type="button"
                          onClick={() => { setForm({...form,niveau_prefere:'',branches_specialites:[]}); }}
                          style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+((!form.niveau_prefere||form.niveau_prefere==='')?'#94a3b8':'#e2e8f0'),background:(!form.niveau_prefere||form.niveau_prefere==='')?'#f1f5f9':'white',color:'#64748b',cursor:'pointer',fontWeight:700,fontSize:13,transition:'all 0.15s'}}>
                          Aucune préférence
                        </button>
                      </div>
                    </div>
                  )}

                  {!hidePreferences && (
                    <div style={{display:'flex',flexDirection:'column',marginBottom:12}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:8,color:'#475569'}}>Spécialité(s) — {libelleNiveauxBranches}</label>
                      {branchesDisponibles.length === 0 ? (
                        <div style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>Aucune spécialité disponible pour le(s) niveau(x) sélectionné(s).</div>
                      ) : (
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))',gap:8}}>
                          {branchesDisponibles.map(b => {
                            const selected = (b.ids || []).some(id => branchesSpecialitesSelectionnees.includes(String(id)));
                            return (
                              <button key={b.id} type="button"
                                title={(b.noms || []).join(' / ')}
                                onClick={() => {
                                  setForm(prev => {
                                    const curr = normaliserBranchesSpecialites(prev.branches_specialites);
                                    let newSel;
                                    if (selected) {
                                      newSel = curr.filter(x => !(b.ids || []).includes(String(x)));
                                    } else {
                                      newSel = Array.from(new Set([...curr, ...(b.ids || [])].map(String)));
                                    }
                                    return {...prev, branches_specialites:newSel};
                                  });
                                }}
                                style={{
                                  height: 34,
                                  width: '100%',
                                  borderRadius: 9,
                                  border:'2px solid '+(selected?'#6366f1':'#e2e8f0'),
                                  background:selected?'#e0e7ff':'white',
                                  color:selected?'#3730a3':'#64748b',
                                  cursor:'pointer',
                                  fontWeight:700,
                                  fontSize:12,
                                  transition:'all 0.15s',
                                  display:'flex',
                                  alignItems:'center',
                                  justifyContent:'center',
                                  textAlign:'center',
                                  padding:'0 8px'
                                }}>
                                {b.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {!hideRemarque && <div style={{display:'flex',flexDirection:'column',marginBottom:12}}>
                    <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Remarques pour les niveaux et branches</label>
                    <input style={s.inp} value={form.specialite} onChange={e=>setForm({...form,specialite:e.target.value})} placeholder="Ex: Mathématiques, Physique..." />
                  </div>}

                  {!hidePreferencesLieu && <div style={{display:'flex',flexDirection:'column',marginBottom:12}}>
                    <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Lieux de travail préférés</label>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {lieuxTravailDB.map(lieu => {
                        const l = lieu.nom;
                        const lieux = form.lieu_travail_prefere ? form.lieu_travail_prefere.split(',').filter(Boolean) : [];
                        const selected = lieux.includes(l);
                        return (
                          <button key={l} type="button"
                            onClick={() => {
                              const curr = form.lieu_travail_prefere ? form.lieu_travail_prefere.split(',').filter(Boolean) : [];
                              let newLieux = selected ? curr.filter(x=>x!==l) : [...curr, l];
                              if (newLieux.length === lieuxTravailDB.length) newLieux = [];
                              setForm({...form, lieu_travail_prefere: newLieux.join(',')});
                            }}
                            style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+(selected?'#6366f1':'#e2e8f0'),background:selected?'#e0e7ff':'white',color:selected?'#3730a3':'#64748b',cursor:'pointer',fontWeight:700,fontSize:13,transition:'all 0.15s'}}>
                            {l}
                          </button>
                        );
                      })}
                      <button type="button"
                        onClick={() => setForm({...form, lieu_travail_prefere:''})}
                        style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+((!form.lieu_travail_prefere)?'#94a3b8':'#e2e8f0'),background:(!form.lieu_travail_prefere)?'#f1f5f9':'white',color:'#64748b',cursor:'pointer',fontWeight:700,fontSize:13,transition:'all 0.15s'}}>
                        Aucune préférence
                      </button>
                    </div>
                  </div>}

                  {!hidePreferencesLieu && <div style={{display:'flex',flexDirection:'column',marginBottom:12}}>
                    <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Remarques lieu de travail</label>
                    <input style={s.inp} value={form.remarque_lieu_travail} onChange={e=>setForm({...form,remarque_lieu_travail:e.target.value})} placeholder="Ex: Préfère éviter BOTZA le lundi..." />
                  </div>}

                  {!hidePreferencesLieu && !hidePreferences && (
                    <div style={{display:'flex',flexDirection:'column',marginBottom:12}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Priorité</label>
                      <div style={{display:'flex',gap:8}}>
                        <button type="button" onClick={() => setForm({...form, priorite_pref:'niveau'})}
                          style={{padding:'8px 14px',borderRadius:8,border:'2px solid '+(form.priorite_pref==='niveau'?'#6366f1':'#e2e8f0'),background:form.priorite_pref==='niveau'?'#e0e7ff':'white',fontWeight:700,cursor:'pointer'}}>
                          Niveau
                        </button>
                        <button type="button" onClick={() => setForm({...form, priorite_pref:'lieu'})}
                          style={{padding:'8px 14px',borderRadius:8,border:'2px solid '+(form.priorite_pref==='lieu'?'#6366f1':'#e2e8f0'),background:form.priorite_pref==='lieu'?'#e0e7ff':'white',fontWeight:700,cursor:'pointer'}}>
                          Lieu de travail
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{display:'flex',flexDirection:'column', marginTop: showRoleToggle ? 20 : 0}}>
                    <label style={{fontSize:11,fontWeight:600,marginBottom:8,color:'#475569'}}>Statut</label>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div onClick={()=>setForm({...form,actif:(form.actif===false||form.actif==='false')})} style={{width:44,height:24,borderRadius:12,background:(form.actif===false||form.actif==='false')?'#ccc':'#34a853',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}>
                        <span style={{position:'absolute',top:2,left:(form.actif===false||form.actif==='false')?2:22,width:20,height:20,borderRadius:'50%',background:'white',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                      </div>
                      <span style={{fontSize:13,fontWeight:600,color:(form.actif===false||form.actif==='false')?'#94a3b8':'#34a853'}}>
                        {(form.actif===false||form.actif==='false')?'Inactif':'Actif'}
                      </span>
                    </div>
                  </div>
                  <div style={{flex:1}}/>
                  <div style={{display:'flex',justifyContent:'flex-end',gap:10,paddingTop:16,borderTop:'1px solid #f1f5f9'}}>
                    <button type="button" style={s.btnCancel} onClick={() => setShowForm(false)}>Annuler</button>
                    <button type="submit" style={s.btnSave}>{profEdit?'Modifier':'Créer'}</button>
                  </div>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {showDocs && docsProf && (
        <div style={s.overlay}>
          <div style={{...s.modal, maxWidth:600}}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>📁 Documents — {docsProf.prenom} {nomSansSuffixe(docsProf.nom)}</h3>
              <button style={s.btnClose} onClick={() => setShowDocs(false)}>✕</button>
            </div>
            {isAdmin() && (
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:'#475569',marginBottom:8,textTransform:'uppercase'}}>Ajouter un document</div>
                <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                  <select style={{...s.inp, width:'auto', padding:'7px 10px'}} value={uploadForm.type} onChange={e => setUploadForm({type:e.target.value})}>
                    {['CV','Diplôme','Contrat','Certificat','Autre'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label style={{padding:'8px 16px',background:'#6366f1',color:'white',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13}}>
                    📎 Choisir un fichier
                    <input type="file" style={{display:'none'}} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={e => { if(e.target.files[0]) uploadDocument(e.target.files[0], uploadForm.type); e.target.value=''; }} />
                  </label>
                  <span style={{fontSize:11,color:'#94a3b8'}}>PDF, Word, image — max 5MB</span>
                </div>
              </div>
            )}
            <div style={{borderTop:'1px solid #f1f5f9',paddingTop:16}}>
              {docsLoading ? (
                <div style={{textAlign:'center',color:'#94a3b8',padding:20}}>Chargement...</div>
              ) : profDocs.length === 0 ? (
                <div style={{textAlign:'center',color:'#94a3b8',padding:20,fontSize:13}}>Aucun document pour ce {nomEntite}</div>
              ) : profDocs.map(doc => (
                <div key={doc.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderRadius:8,border:'1px solid #e2e8f0',marginBottom:8,background:'#f8fafc'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:20}}>
                      {doc.nom.endsWith('.pdf')?'📄':doc.nom.match(/\.(jpg|jpeg|png)$/i)?'🖼️':'📝'}
                    </span>
                    <div>
                      <div style={{fontWeight:600,fontSize:13,color:'#1e293b'}}>{doc.nom}</div>
                      <div style={{fontSize:11,color:'#94a3b8'}}>
                        <span style={{background:'#e0e7ff',color:'#3730a3',padding:'1px 7px',borderRadius:99,fontWeight:600,marginRight:6}}>{doc.type}</span>
                        {doc.taille ? Math.round(doc.taille/1024)+'KB · ' : ''}
                        {new Date(doc.created_at).toLocaleDateString('fr-CH')}
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={() => telechargerDocument(doc)} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,opacity:0.7}} title="Télécharger">⬇️</button>
                    {isAdmin() && <button onClick={() => supprimerDocument(doc.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,opacity:0.7}} title="Supprimer">🗑️</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:14}}>
        <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              <th style={{...s.th, width:170, minWidth:170, whiteSpace:'nowrap'}}>Nom</th>
              <th style={{...s.th, width:150, minWidth:150, whiteSpace:'nowrap'}}>Prénom</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>Téléphone</th>
              <th style={s.th}>Naissance</th>
              <th style={{...s.th, width:48, minWidth:48, maxWidth:48, textAlign:'center'}}>Statut</th>
              <th style={{...s.th, width:76, minWidth:76, maxWidth:76, textAlign:'center'}}></th>
              {isAdmin() && <th style={{...s.th, width:72, minWidth:72, maxWidth:72, textAlign:'center'}}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {profsFiltres.length===0 ? (
              <tr><td colSpan={isAdmin()?8:7} style={s.empty}>Aucun {nomEntite} trouvé</td></tr>
            ) : profsFiltres.map(p => (
              <tr key={p.id} style={s.tr}>
                <td style={{...s.td,width:170,minWidth:170,whiteSpace:'nowrap'}}><b style={{color:'#1e293b'}}>{nomSansSuffixe(p.nom)}</b></td>
                <td style={{...s.td,width:150,minWidth:150,whiteSpace:'nowrap'}}>{p.prenom}</td>
                <td style={{...s.td,color:'#6366f1'}}>{p.email}</td>
                <td style={s.td}>{p.telephone||'—'}</td>
                <td style={s.td}>{p.date_naissance?new Date(p.date_naissance).toLocaleDateString('fr-CH'):'—'}</td>
                <td style={{...s.td,width:48,minWidth:48,maxWidth:48,textAlign:'center',padding:'8px 4px'}}>
                  <button title={p.actif!==false?'Actif':'Inactif'}
                    style={{padding:5,background:p.actif!==false?'#dcfce7':'#fee2e2',color:p.actif!==false?'#16a34a':'#dc2626',border:'none',borderRadius:8,cursor:isAdmin()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto',opacity:isAdmin()?1:0.6}}
                    onClick={() => isAdmin() && toggleStatut(p)}>
                    <svg width={16} height={16} viewBox="0 0 24 24">
                      <path fillRule="evenodd" fill="currentColor" d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
                      {p.actif!==false
                        ? <path fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M7 12l3 3 7-7"/>
                        : <path fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" d="M8 8l8 8M16 8l-8 8"/>
                      }
                    </svg>
                  </button>
                </td>
                <td style={{...s.td,width:76,minWidth:76,maxWidth:76,padding:'8px 4px'}}>
                  <div style={{display:'flex',gap:4,justifyContent:'center',alignItems:'center',margin:'0 auto'}}>
                    <button title="Documents" style={{padding:6,background:'#dbeafe',color:'#1e40af',border:'none',borderRadius:8,cursor:isAdmin()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',opacity:isAdmin()?1:0.35}}
                      disabled={!isAdmin()} onClick={() => isAdmin() && ouvrirDocuments(p)}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M2 8a2 2 0 012-2h4.5l2 2H20a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8z M6 13h12v1.5H6z M6 16h9v1.5H6z"/>
                      </svg>
                    </button>
                    {isAdmin() && (
                      <button title="Envoyer accès par email"
                        onClick={() => envoyerAccesEmail(p.id)}
                        disabled={emailEnvoi[p.id]==='loading'}
                        style={{padding:6,background:emailEnvoi[p.id]==='ok'?'#dcfce7':'#ede9fe',color:emailEnvoi[p.id]==='ok'?'#16a34a':'#6366f1',border:'none',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:emailEnvoi[p.id]==='loading'?0.4:1}}>
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M2 4a2 2 0 012-2h16a2 2 0 012 2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V4z M4 4l8 7 8-7H4z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
                {isAdmin() && (
                  <td style={{...s.td,width:72,minWidth:72,maxWidth:72,textAlign:'center',whiteSpace:'nowrap',padding:'8px 4px'}}>
                    <button style={s.btnEdit} onClick={() => handleEdit(p)} title="Modifier">✏️</button>
                    <button style={s.btnDel} onClick={() => handleDelete(p.id)} title="Supprimer">🗑️</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:{padding:'28px 32px',background:'#f8fafc',minHeight:'100vh',fontFamily:"'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif"},
  header:{display:'flex',alignItems:'center',gap:14,marginBottom:24,flexWrap:'wrap'},
  btnBack:{padding:'8px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,color:'#475569'},
  title:{fontSize:22,fontWeight:800,color:'#0f172a',flex:1,margin:0},
  controlsRow:{display:'flex',alignItems:'center',gap:10,marginBottom:16,flexWrap:'wrap'},
  searchBox:{position:'relative',display:'flex',alignItems:'center'},
  searchIcon:{position:'absolute',left:10,fontSize:13},
  searchInput:{padding:'8px 12px 8px 32px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,width:200,background:'white',outline:'none'},
  filtres:{display:'flex',gap:4},
  filtrBtn:{padding:'7px 12px',background:'white',border:'1px solid #e2e8f0',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:500,color:'#64748b'},
  filtrActif:{background:'#6366f1',color:'white',border:'1px solid #6366f1'},
  btnAdd:{padding:'8px 16px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  statsBar:{display:'flex',gap:10,marginBottom:16},
  statChip:{padding:'5px 12px',background:'#e0e7ff',color:'#3730a3',borderRadius:99,fontSize:12,fontWeight:500},
  overlay:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)'},
  modal:{background:'white',padding:32,borderRadius:16,width:'95vw',maxWidth:1100,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 40px rgba(0,0,0,0.15)'},
  modalHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24},
  modalTitle:{fontSize:18,fontWeight:800,color:'#0f172a',margin:0},
  btnClose:{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8',padding:4},
  section:{fontSize:11,fontWeight:700,color:'#6366f1',background:'#e0e7ff',padding:'5px 12px',borderRadius:6,marginBottom:14,marginTop:10,textTransform:'uppercase',letterSpacing:'0.05em'},
  grid2:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:8},
  field:{display:'flex',flexDirection:'column'},
  lbl:{fontSize:12,fontWeight:600,marginBottom:5,color:'#475569'},
  inp:{padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,outline:'none',color:'#1e293b',background:'white'},
  formActions:{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24,paddingTop:20,borderTop:'1px solid #f1f5f9'},
  btnCancel:{padding:'9px 18px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#64748b'},
  btnSave:{padding:'9px 20px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  tabSearch: { padding: '9px 14px', borderRadius: 8, border: '1px solid #c7d2fe', background: 'white', outline: 'none', fontSize: 14, width: 280, color: '#1e293b', fontFamily: 'inherit' },
  toggleGroup: { display: 'flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 },
  toggleBtn: { padding: '7px 16px', borderRadius: 17, border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: '#6d28d9', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'background 0.15s, color 0.15s' },
  toggleBtnActif: { background: '#6366f1', color: 'white', fontWeight: 700 },
  tabContent: { background: 'white', border: 'none', borderRadius: '0 0 12px 12px', padding: 14 },
  tableWrap:{overflow:'hidden',borderRadius:12,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #f1f5f9'},
  table:{width:'100%',borderCollapse:'collapse',background:'white'},
  thead:{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'},
  th:{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'},
  tr:{borderBottom:'1px solid #f8fafc'},
  td:{padding:'11px 14px',fontSize:13,color:'#374151'},
  empty:{padding:40,textAlign:'center',color:'#94a3b8'},
  badgeGray:{background:'#f1f5f9',color:'#475569',padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:600},
  badgePrimary:{background:'#e0e7ff',color:'#3730a3',padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:600},
  badgeActive:{background:'#d1fae5',color:'#065f46',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600,border:'none',cursor:'pointer'},
  badgeInactive:{background:'#fee2e2',color:'#991b1b',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600,border:'none',cursor:'pointer'},
  btnEdit:{background:'none',border:'none',cursor:'pointer',fontSize:15,marginRight:6,opacity:0.7},
  btnDel:{background:'none',border:'none',cursor:'pointer',fontSize:15,opacity:0.7},
};