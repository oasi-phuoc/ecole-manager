import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/theme';

const API = 'https://ecole-manager-backend.onrender.com/api';
const CONTRATS = ['CDI','CDD','Temps partiel','Vacataire','Stagiaire'];
const PERMIS = ['Citoyen CH','Permis C','Permis B','Permis L','Permis G','Autre'];
const MAX_PERIODES = 32;

export default function Professeurs() {
  const [profs, setProfs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [profEdit, setProfEdit] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [form, setForm] = useState({ nom:'',prenom:'',email:'',mot_de_passe:'',telephone:'',specialite:'',adresse:'',npa:'',lieu:'',sexe:'',taux_activite:'',periodes_semaine:'',date_naissance:'',avs:'',type_contrat:'',type_permis:'' });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerProfs(); }, []);

  const chargerProfs = async () => {
    try { const res = await axios.get(API+'/profs',{headers}); setProfs(res.data); }
    catch(err) { console.error(err); }
  };

  const handleTauxChange = (val) => {
    const periodes = val ? Math.round((parseInt(val)/100)*MAX_PERIODES) : '';
    setForm({...form, taux_activite:val, periodes_semaine:periodes});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (profEdit) await axios.put(API+'/profs/'+profEdit.id, form, {headers});
      else await axios.post(API+'/profs', form, {headers});
      setShowForm(false); setProfEdit(null); resetForm(); chargerProfs();
    } catch(err) { alert('Erreur: '+(err.response?.data?.message||err.message)); }
  };

  const resetForm = () => setForm({nom:'',prenom:'',email:'',mot_de_passe:'',telephone:'',specialite:'',adresse:'',npa:'',lieu:'',sexe:'',taux_activite:'',periodes_semaine:'',date_naissance:'',avs:'',type_contrat:'',type_permis:''});

  const handleEdit = (p) => {
    setProfEdit(p);
    setForm({nom:p.nom||'',prenom:p.prenom||'',email:p.email||'',mot_de_passe:'',telephone:p.telephone||'',specialite:p.specialite||'',adresse:p.adresse||'',npa:p.npa||'',lieu:p.lieu||'',sexe:p.sexe||'',taux_activite:p.taux_activite||'',periodes_semaine:p.periodes_semaine||'',date_naissance:p.date_naissance?p.date_naissance.substring(0,10):'',avs:p.avs||'',type_contrat:p.type_contrat||'',type_permis:p.type_permis||''});
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce professeur ?')) { await axios.delete(API+'/profs/'+id,{headers}); chargerProfs(); }
  };

  const toggleStatut = async (p) => {
    if (!isAdmin()) return;
    await axios.put(API+'/profs/'+p.id, {...p, actif:!p.actif}, {headers});
    chargerProfs();
  };

  const profsFiltres = profs.filter(p => {
    const matchR = (p.nom+' '+p.prenom+' '+p.email).toLowerCase().includes(recherche.toLowerCase());
    const matchS = filtreStatut==='tous' || (filtreStatut==='actif'&&p.actif!==false) || (filtreStatut==='inactif'&&p.actif===false);
    return matchR && matchS;
  });

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.btnBack} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={s.title}>👨‍🏫 Professeurs</h2>
        <div style={s.headerRight}>
          <div style={s.searchBox}>
            <span style={s.searchIcon}>🔍</span>
            <input style={s.searchInput} placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} />
          </div>
          <div style={s.filtres}>
            {[{id:'tous',label:'Tous'},{id:'actif',label:'Actifs'},{id:'inactif',label:'Inactifs'}].map(f => (
              <button key={f.id} style={{...s.filtrBtn,...(filtreStatut===f.id?s.filtrActif:{})}} onClick={() => setFiltreStatut(f.id)}>{f.label}</button>
            ))}
          </div>
          {isAdmin() && <button style={s.btnAdd} onClick={() => { setShowForm(true); setProfEdit(null); resetForm(); }}>+ Ajouter</button>}
        </div>
      </div>

      <div style={s.statsBar}>
        <span style={s.statChip}>Total <b>{profs.length}</b></span>
        <span style={{...s.statChip,background:'#d1fae5',color:'#065f46'}}>Actifs <b>{profs.filter(p=>p.actif!==false).length}</b></span>
        <span style={{...s.statChip,background:'#fee2e2',color:'#991b1b'}}>Inactifs <b>{profs.filter(p=>p.actif===false).length}</b></span>
      </div>

      {showForm && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{profEdit?'Modifier':'Ajouter'} un professeur</h3>
              <button style={s.btnClose} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={s.section}>🔐 Connexion</div>
              <div style={s.grid2}>
                <div style={s.field}><label style={s.lbl}>Email *</label><input style={s.inp} type="email" required value={form.email} onChange={e => setForm({...form,email:e.target.value})} /></div>
                <div style={s.field}><label style={s.lbl}>{profEdit?'Nouveau mot de passe':'Mot de passe *'}</label><input style={s.inp} type="password" required={!profEdit} value={form.mot_de_passe} onChange={e => setForm({...form,mot_de_passe:e.target.value})} /></div>
              </div>
              <div style={{marginTop:24}}></div>
              <div style={s.section}>👤 Informations personnelles</div>
              <div style={s.grid2}>
                <div style={{...s.field,gridColumn:'1/-1'}}>
                  <label style={s.lbl}>Sexe *</label>
                  <div style={{display:'flex',gap:20,marginTop:6}}>
                    {['Masculin','Féminin'].map(sx => (
                      <label key={sx} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:13}}>
                        <input type="radio" name="sexe" value={sx} required checked={form.sexe===sx} onChange={e => setForm({...form,sexe:e.target.value})} />{sx}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={s.field}><label style={s.lbl}>Nom *</label><input style={s.inp} type="text" required value={form.nom} onChange={e => setForm({...form,nom:e.target.value})} /></div>
                <div style={s.field}><label style={s.lbl}>Prénom *</label><input style={s.inp} type="text" required value={form.prenom} onChange={e => setForm({...form,prenom:e.target.value})} /></div>
                <div style={s.field}><label style={s.lbl}>Taux d'activité (%) *</label><input style={s.inp} type="number" min="10" max="100" step="5" required value={form.taux_activite} onChange={e => handleTauxChange(e.target.value)} placeholder="100" /></div>
                <div style={s.field}><label style={s.lbl}>Périodes/semaine * <span style={{color:'#9ca3af',fontSize:11}}>(max {MAX_PERIODES})</span></label><input style={s.inp} type="number" min="1" max={MAX_PERIODES} required value={form.periodes_semaine} onChange={e => setForm({...form,periodes_semaine:e.target.value})} /></div>
                <div style={s.field}><label style={s.lbl}>Date de naissance</label><input style={s.inp} type="date" value={form.date_naissance} onChange={e => setForm({...form,date_naissance:e.target.value})} /></div>
                <div style={s.field}><label style={s.lbl}>Téléphone</label><input style={s.inp} type="text" value={form.telephone} onChange={e => setForm({...form,telephone:e.target.value})} placeholder="079 123 45 67" /></div>
                <div style={{...s.field,gridColumn:'1/-1'}}><label style={s.lbl}>Adresse</label><input style={s.inp} type="text" value={form.adresse} onChange={e => setForm({...form,adresse:e.target.value})} placeholder="Rue de la Paix 10" /></div>
                <div style={s.field}><label style={s.lbl}>NPA</label><input style={s.inp} type="text" value={form.npa} onChange={e => setForm({...form,npa:e.target.value})} placeholder="1950" /></div>
                <div style={s.field}><label style={s.lbl}>Lieu</label><input style={s.inp} type="text" value={form.lieu} onChange={e => setForm({...form,lieu:e.target.value})} placeholder="Sion" /></div>
                <div style={s.field}><label style={s.lbl}>Numéro AVS</label><input style={s.inp} type="text" value={form.avs} onChange={e => setForm({...form,avs:e.target.value})} placeholder="756.XXXX.XXXX.XX" /></div>
                <div style={s.field}><label style={s.lbl}>Spécialité</label><input style={s.inp} type="text" value={form.specialite} onChange={e => setForm({...form,specialite:e.target.value})} placeholder="Mathématiques" /></div>
                <div style={s.field}><label style={s.lbl}>Type de contrat</label><select style={s.inp} value={form.type_contrat} onChange={e => setForm({...form,type_contrat:e.target.value})}><option value="">-- Choisir --</option>{CONTRATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <div style={s.field}><label style={s.lbl}>Type de permis</label><select style={s.inp} value={form.type_permis} onChange={e => setForm({...form,type_permis:e.target.value})}><option value="">-- Choisir --</option>{PERMIS.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
              </div>
              <div style={s.formActions}>
                <button type="button" style={s.btnCancel} onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" style={s.btnSave}>Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {['Nom','Prénom','Email','Naissance','Téléphone','Statut','Créé le'].map(h => <th key={h} style={s.th}>{h}</th>)}
              {isAdmin() && <th style={s.th}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {profsFiltres.length===0 ? (
              <tr><td colSpan="10" style={s.empty}>Aucun professeur trouvé</td></tr>
            ) : profsFiltres.map(p => (
              <tr key={p.id} style={s.tr}>
                <td style={s.td}><b style={{color:'#1e293b'}}>{p.nom}</b></td>
                <td style={s.td}>{p.prenom}</td>
                <td style={{...s.td,color:'#6366f1'}}>{p.email}</td>
                <td style={s.td}>{p.date_naissance?new Date(p.date_naissance).toLocaleDateString('fr-CH'):'—'}</td>
                <td style={s.td}>{p.telephone||'—'}</td>
                
                <td style={s.td}>
                  <button style={p.actif!==false?s.badgeActive:s.badgeInactive} onClick={() => toggleStatut(p)}>
                    {p.actif!==false?'✅ Actif':'❌ Inactif'}
                  </button>
                </td>
                <td style={s.td}>{p.created_at?new Date(p.created_at).toLocaleDateString('fr-CH'):'—'}</td>
                {isAdmin() && (
                  <td style={s.td}>
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
  header:{display:'flex',alignItems:'center',gap:14,marginBottom:20,flexWrap:'wrap'},
  btnBack:{padding:'8px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,color:'#475569'},
  title:{fontSize:22,fontWeight:800,color:'#0f172a',flex:1,margin:0},
  headerRight:{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'},
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
  modal:{background:'white',padding:32,borderRadius:16,width:600,maxHeight:'88vh',overflowY:'auto',boxShadow:'0 20px 40px rgba(0,0,0,0.15)'},
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