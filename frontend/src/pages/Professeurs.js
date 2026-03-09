import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';

const API = 'https://ecole-manager-backend.onrender.com/api';
const CONTRATS = ['CDI','CDD','Remplaçant','Stagiaire','Civiliste','Autre'];
const PERMIS = ['Citoyen CH/UE','Permis C','Permis B','Permis L','Permis G','Frontalier','Autre'];
const MAX_PERIODES = 32;
const NIVEAUX = ['CSC','CFR','EPL'];

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
  titre = '👨‍🏫 Professeurs',
  nomEntite = 'professeur',
  hidePreferences = false,
  hidePeriodesSemaine = false,
  hidePreferencesLieu = false,
  hideRemarque = false,
} = {}) {
  const [profs, setProfs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [profEdit, setProfEdit] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [form, setForm] = useState({ nom:'',prenom:'',email:'',mot_de_passe:'',telephone:'',specialite:'',adresse:'',npa:'',lieu:'',sexe:'',taux_activite:'',periodes_semaine:'',date_naissance:'',avs:'',type_contrat:'',type_permis:'',niveau_prefere:'',branches_specialites:[],lieu_travail_prefere:'',remarque_lieu_travail:'' });
  const [branchesDisponibles, setBranchesDisponibles] = useState([]);
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
    if (!niveaux.length) { setBranchesDisponibles([]); return; }
    try {
      const r = await axios.get(API+'/branches', { headers });
      const branchesFiltrees = r.data
        .filter(b => niveaux.includes(b.niveau))
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
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerProfs(); }, []);
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

  const resetForm = () => setForm({nom:'',prenom:'',email:'',mot_de_passe:'',telephone:'',specialite:'',adresse:'',npa:'',lieu:'',sexe:'',taux_activite:'',periodes_semaine:'',date_naissance:'',avs:'',type_contrat:'',type_permis:'',niveau_prefere:'',branches_specialites:[],lieu_travail_prefere:'',remarque_lieu_travail:''});

  const handleEdit = (p) => {
    setProfEdit(p);
    setForm({nom:p.nom||'',prenom:p.prenom||'',email:p.email||'',mot_de_passe:'',telephone:p.telephone||'',specialite:p.specialite||'',adresse:p.adresse||'',npa:p.npa||'',lieu:p.lieu||'',sexe:p.sexe||'',taux_activite:p.taux_activite||'',periodes_semaine:p.periodes_semaine||'',date_naissance:p.date_naissance?p.date_naissance.substring(0,10):'',avs:p.avs||'',type_contrat:p.type_contrat||'',type_permis:p.type_permis||'',niveau_prefere:p.niveau_prefere||'',branches_specialites:normaliserBranchesSpecialites(p.branches_specialites),lieu_travail_prefere:p.lieu_travail_prefere||'',remarque_lieu_travail:p.remarque_lieu_travail||''});
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce ' + nomEntite + ' ?')) { await axios.delete(apiUrl + '/' + id,{headers}); chargerProfs(); }
  };

  const toggleStatut = async (p) => {
    if (!isAdmin()) return;
    await axios.put(apiUrl + '/' + p.id, {...p, actif:!p.actif}, {headers});
    chargerProfs();
  };

  const profsFiltres = profs.filter(p => {
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
        <button style={s.btnBack} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={s.title}>{titre}</h2>
        {isAdmin() && <button style={s.btnAdd} onClick={() => { setShowForm(true); setProfEdit(null); resetForm(); }}>+ Ajouter</button>}
      </div>
      <div style={s.controlsRow}>
        <div style={s.filtres}>
          {[{id:'tous',label:'Tous'},{id:'actif',label:'Actifs'},{id:'inactif',label:'Inactifs'}].map(f => (
            <button key={f.id} style={{...s.filtrBtn,...(filtreStatut===f.id?s.filtrActif:{})}} onClick={() => setFiltreStatut(f.id)}>{f.label}</button>
          ))}
        </div>
        <div style={s.searchBox}>
          <span style={s.searchIcon}>🔍</span>
          <input style={s.searchInput} placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} />
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
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,alignItems:'start'}}>

                {/* COLONNE 1 - Connexion + Infos personnelles */}
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'#92400e',background:'#fef3c7',padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase'}}>🔐 Connexion</div>
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
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
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
                </div>

                {/* COLONNE 2 - Infos professionnelles */}
                <div>
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
                    {!hidePreferences && <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Niveau(x) préféré(s)</label>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        {NIVEAUX.map(n => {
                          const niveaux = form.niveau_prefere ? form.niveau_prefere.split(',').filter(Boolean) : [];
                          const selected = niveaux.includes(n);
                          return (
                            <button key={n} type="button"
                              onClick={() => {
                                const curr = form.niveau_prefere ? form.niveau_prefere.split(',').filter(Boolean) : [];
                                const newNiv = selected ? curr.filter(x=>x!==n) : [...curr, n];
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
                    </div>}
                    {!hidePreferences && niveauxPreferesSelectionnes.length > 0 && (
                      <div style={{display:'flex',flexDirection:'column'}}>
                        <label style={{fontSize:11,fontWeight:600,marginBottom:8,color:'#475569'}}>Spécialité(s) — {form.niveau_prefere}</label>
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
                    {!hideRemarque && <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Remarques</label>
                      <input style={s.inp} value={form.specialite} onChange={e=>setForm({...form,specialite:e.target.value})} placeholder="Ex: Mathématiques, Physique..." />
                    </div>}
                    {!hidePreferencesLieu && <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Lieu(x) de travail préféré(s)</label>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        {['BOTZA','SYNECOM','CREUSET'].map(l => {
                          const lieux = form.lieu_travail_prefere ? form.lieu_travail_prefere.split(',').filter(Boolean) : [];
                          const selected = lieux.includes(l);
                          return (
                            <button key={l} type="button"
                              onClick={() => {
                                const curr = form.lieu_travail_prefere ? form.lieu_travail_prefere.split(',').filter(Boolean) : [];
                                const newLieux = selected ? curr.filter(x=>x!==l) : [...curr, l];
                                setForm({...form, lieu_travail_prefere: newLieux.join(',')});
                              }}
                              style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+(selected?'#0891b2':'#e2e8f0'),background:selected?'#cffafe':'white',color:selected?'#0e7490':'#64748b',cursor:'pointer',fontWeight:700,fontSize:13,transition:'all 0.15s'}}>
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
                    {!hidePreferencesLieu && <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Remarques lieu de travail</label>
                      <input style={s.inp} value={form.remarque_lieu_travail} onChange={e=>setForm({...form,remarque_lieu_travail:e.target.value})} placeholder="Ex: Préfère éviter BOTZA le lundi..." />
                    </div>}
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Statut</label>
                      <select style={s.inp} value={form.actif===false||form.actif==='false'?'false':'true'} onChange={e=>setForm({...form,actif:e.target.value==='true'})}>
                        <option value="true">✅ Actif</option>
                        <option value="false">❌ Inactif</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24,paddingTop:20,borderTop:'1px solid #f1f5f9'}}>
                <button type="button" style={s.btnCancel} onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" style={s.btnSave}>{profEdit?'Modifier':'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDocs && docsProf && (
        <div style={s.overlay}>
          <div style={{...s.modal, maxWidth:600}}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>📁 Documents — {docsProf.prenom} {docsProf.nom}</h3>
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

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              <th style={{...s.th, width:170, minWidth:170, whiteSpace:'nowrap'}}>Nom</th>
              <th style={{...s.th, width:150, minWidth:150, whiteSpace:'nowrap'}}>Prénom</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>Téléphone</th>
              <th style={s.th}>Naissance</th>
              <th style={{...s.th, width:98, minWidth:98, maxWidth:98, textAlign:'center'}}>Documents</th>
              <th style={{...s.th, width:120, minWidth:120, maxWidth:120, textAlign:'center'}}>Statut</th>
              {isAdmin() && <th style={{...s.th, width:120, minWidth:120, maxWidth:120, textAlign:'center'}}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {profsFiltres.length===0 ? (
              <tr><td colSpan={isAdmin()?8:7} style={s.empty}>Aucun {nomEntite} trouvé</td></tr>
            ) : profsFiltres.map(p => (
              <tr key={p.id} style={s.tr}>
                <td style={{...s.td,width:170,minWidth:170,whiteSpace:'nowrap'}}><b style={{color:'#1e293b'}}>{p.nom}</b></td>
                <td style={{...s.td,width:150,minWidth:150,whiteSpace:'nowrap'}}>{p.prenom}</td>
                <td style={{...s.td,color:'#6366f1'}}>{p.email}</td>
                <td style={s.td}>{p.telephone||'—'}</td>
                <td style={s.td}>{p.date_naissance?new Date(p.date_naissance).toLocaleDateString('fr-CH'):'—'}</td>
                <td style={{...s.td,width:98,minWidth:98,maxWidth:98,textAlign:'center'}}><button style={{...s.btnEdit,background:'#dbeafe',color:'#1e40af',borderRadius:6,padding:'4px 8px',opacity:1}} onClick={() => ouvrirDocuments(p)} title="Documents">📁</button></td>
                <td style={{...s.td,width:120,minWidth:120,maxWidth:120,textAlign:'center'}}>
                  <button style={p.actif!==false?s.badgeActive:s.badgeInactive} onClick={() => toggleStatut(p)}>
                    {p.actif!==false?'✅ Actif':'❌ Inactif'}
                  </button>
                </td>
                {isAdmin() && (
                  <td style={{...s.td,width:120,minWidth:120,maxWidth:120,textAlign:'center',whiteSpace:'nowrap'}}>
                    <button
                      onClick={() => envoyerAccesEmail(p.id)}
                      disabled={emailEnvoi[p.id]==='loading'}
                      title="Envoyer accès par email"
                      style={{background:'none',border:'none',cursor:'pointer',fontSize:15,marginRight:6,opacity:emailEnvoi[p.id]==='loading'?0.4:0.7}}>
                      {emailEnvoi[p.id]==='loading'?'⏳':emailEnvoi[p.id]==='ok'?'✅':'📧'}
                    </button>
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
  );
}

const s = {
  page:{padding:'28px 32px',background:'#f8fafc',minHeight:'100vh',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'},
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
  tableWrap:{overflowX:'auto',borderRadius:12,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #f1f5f9'},
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