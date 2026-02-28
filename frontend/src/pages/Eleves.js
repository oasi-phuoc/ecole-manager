import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';

export default function Eleves() {
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [eleveEdit, setEleveEdit] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtreClasse, setFiltreClasse] = useState('tous');
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [form, setForm] = useState({
    nom:'', prenom:'', email:'', classe_id:'',
    date_naissance:'', adresse:'', telephone:'',
    nom_parent:'', telephone_parent:'', statut:'actif',
    oasi_prog_nom:'', oasi_prog_encadrant:'', oasi_n:'', oasi_ref:'', oasi_pos:'',
    oasi_nom:'', oasi_nais:'', oasi_nationalite:'',
    oasi_presence_date:'', oasi_jour_semaine:'', oasi_presence_periode:'',
    oasi_presence_type:'', oasi_remarque:'', oasi_controle_du:'', oasi_controle_au:'',
    oasi_prog_presences:'', oasi_prog_admin:'', oasi_as:'',
    oasi_prg_id:'', oasi_prg_occupation_id:'', oasi_ra_id:'', oasi_temps_reparti_id:''
  });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerTout(); }, []);

  const chargerTout = async () => {
    try {
      const [el, cl] = await Promise.all([
        axios.get(API+'/eleves', {headers}),
        axios.get(API+'/classes', {headers}),
      ]);
      setEleves(el.data);
      setClasses(cl.data.filter(c => c.actif !== false));
    } catch(err) { console.error(err); }
  };

  const resetForm = () => setForm({
    nom:'', prenom:'', email:'', classe_id:'',
    date_naissance:'', adresse:'', telephone:'',
    nom_parent:'', telephone_parent:'', statut:'actif',
    oasi_prog_nom:'', oasi_prog_encadrant:'', oasi_n:'', oasi_ref:'', oasi_pos:'',
    oasi_nom:'', oasi_nais:'', oasi_nationalite:'',
    oasi_presence_date:'', oasi_jour_semaine:'', oasi_presence_periode:'',
    oasi_presence_type:'', oasi_remarque:'', oasi_controle_du:'', oasi_controle_au:'',
    oasi_prog_presences:'', oasi_prog_admin:'', oasi_as:'',
    oasi_prg_id:'', oasi_prg_occupation_id:'', oasi_ra_id:'', oasi_temps_reparti_id:''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        classe_id: form.classe_id||null,
        date_naissance: form.date_naissance||null,
        oasi_nais: form.oasi_nais||null,
        oasi_n: form.oasi_n ? parseInt(form.oasi_n) : null,
        oasi_ref: form.oasi_ref ? parseInt(form.oasi_ref) : null,
        oasi_pos: form.oasi_pos ? parseInt(form.oasi_pos) : null,
        oasi_prg_id: form.oasi_prg_id ? parseInt(form.oasi_prg_id) : null,
        oasi_prg_occupation_id: form.oasi_prg_occupation_id ? parseInt(form.oasi_prg_occupation_id) : null,
        oasi_ra_id: form.oasi_ra_id ? parseInt(form.oasi_ra_id) : null,
        oasi_temps_reparti_id: form.oasi_temps_reparti_id ? parseInt(form.oasi_temps_reparti_id) : null,
      };
      if (eleveEdit) await axios.put(API+'/eleves/'+eleveEdit.id, data, {headers});
      else await axios.post(API+'/eleves', data, {headers});
      setShowForm(false); setEleveEdit(null); resetForm(); chargerTout();
    } catch(err) { alert('Erreur: '+(err.response?.data?.message||err.message)); }
  };

  const handleEdit = (el) => {
    setEleveEdit(el);
    setForm({
      nom:el.nom||'', prenom:el.prenom||'', email:el.email||'',
      classe_id:el.classe_id||'',
      date_naissance:el.date_naissance?el.date_naissance.substring(0,10):'',
      adresse:el.adresse||'', telephone:el.telephone||'',
      nom_parent:el.nom_parent||'', telephone_parent:el.telephone_parent||'',
      statut:el.statut||'actif',
      oasi_prog_nom:el.oasi_prog_nom||'', oasi_prog_encadrant:el.oasi_prog_encadrant||'',
      oasi_n:el.oasi_n||'', oasi_ref:el.oasi_ref||'', oasi_pos:el.oasi_pos||'',
      oasi_nom:el.oasi_nom||'', oasi_nais:el.oasi_nais?el.oasi_nais.substring(0,10):'',
      oasi_nationalite:el.oasi_nationalite||'',
      oasi_presence_date:el.oasi_presence_date?el.oasi_presence_date.substring(0,10):'',
      oasi_jour_semaine:el.oasi_jour_semaine||'', oasi_presence_periode:el.oasi_presence_periode||'',
      oasi_presence_type:el.oasi_presence_type||'', oasi_remarque:el.oasi_remarque||'',
      oasi_controle_du:el.oasi_controle_du?el.oasi_controle_du.substring(0,10):'',
      oasi_controle_au:el.oasi_controle_au?el.oasi_controle_au.substring(0,10):'',
      oasi_prog_presences:el.oasi_prog_presences||'', oasi_prog_admin:el.oasi_prog_admin||'',
      oasi_as:el.oasi_as||'',
      oasi_prg_id:el.oasi_prg_id||'', oasi_prg_occupation_id:el.oasi_prg_occupation_id||'',
      oasi_ra_id:el.oasi_ra_id||'', oasi_temps_reparti_id:el.oasi_temps_reparti_id||''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cet élève ?')) {
      await axios.delete(API+'/eleves/'+id, {headers});
      chargerTout();
    }
  };

  const handleClasseChange = async (eleveId, classeId) => {
    try {
      await axios.put(API+'/eleves/'+eleveId+'/classe', { classe_id: classeId||null }, {headers});
      setEleves(prev => prev.map(el => el.id===eleveId ? {...el, classe_id: classeId||null} : el));
    } catch(err) { alert('Erreur: '+err.message); }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('fichier', importFile);
      const r = await axios.post(API+'/import/eleves', formData, {
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(r.data);
      chargerTout();
    } catch(err) { setImportResult({ message: 'Erreur: '+(err.response?.data?.message||err.message) }); }
    setImportLoading(false);
  };

  const getClasse = (id) => classes.find(c => c.id == id);

  const elevesFiltres = eleves.filter(el => {
    const matchR = ((el.nom||'')+' '+(el.prenom||'')+' '+(el.email||'')).toLowerCase().includes(recherche.toLowerCase());
    const matchC = filtreClasse==='tous' || String(el.classe_id)===String(filtreClasse);
    return matchR && matchC;
  });

  const F = ({lbl, children, full}) => (
    <div style={{...s.field, gridColumn: full?'1/-1':'auto'}}>
      <label style={s.lbl}>{lbl}</label>
      {children}
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.btnBack} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={s.title}>🎓 Élèves</h2>
        <div style={s.headerRight}>
          <div style={s.searchBox}>
            <span style={s.searchIcon}>🔍</span>
            <input style={s.searchInput} placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} />
          </div>
          <select style={s.select} value={filtreClasse} onChange={e => setFiltreClasse(e.target.value)}>
            <option value="tous">Toutes les classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <button style={{...s.btnAdd,background:'#6366f1'}} onClick={() => setShowImport(true)}>📥 Import OASI</button>
          {isAdmin() && <button style={s.btnAdd} onClick={() => { setShowForm(true); setEleveEdit(null); resetForm(); }}>+ Ajouter</button>}
        </div>
      </div>

      <div style={s.statsBar}>
        <span style={s.statChip}>Total <b>{eleves.length}</b> élèves</span>
        {classes.map(c => (
          <span key={c.id} style={{...s.statChip,background:'#d1fae5',color:'#065f46'}}>
            {c.nom} <b>{eleves.filter(e=>e.classe_id==c.id).length}</b>
          </span>
        ))}
      </div>

      {/* Modal Import */}
      {showImport && (
        <div style={s.overlay}>
          <div style={{...s.modal,width:480}}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>📥 Importer depuis OASI</h3>
              <button style={s.btnClose} onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }}>✕</button>
            </div>
            {importResult ? (
              <div>
                <div style={{background:importResult.created>=0?'#d1fae5':'#fee2e2',color:importResult.created>=0?'#065f46':'#991b1b',padding:16,borderRadius:10,fontSize:14,fontWeight:600}}>
                  {importResult.message}
                </div>
                {importResult.created >= 0 && (
                  <div style={{marginTop:12,fontSize:13,color:'#475569'}}>
                    <div>✅ <b>{importResult.created}</b> élève(s) créé(s)</div>
                    <div>⏭️ <b>{importResult.skipped}</b> déjà existant(s) ignorés</div>
                  </div>
                )}
                <div style={{marginTop:20,textAlign:'right'}}>
                  <button style={s.btnSave} onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }}>Fermer</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleImport}>
                <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:10,padding:16,marginBottom:20,fontSize:13,color:'#0369a1'}}>
                  ℹ️ Les élèves avec un REF déjà existant ne seront pas dupliqués.
                </div>
                <div style={s.field}>
                  <label style={s.lbl}>Fichier Excel (.xlsx) *</label>
                  <input type="file" accept=".xlsx,.xls" required style={{padding:'8px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13}} onChange={e => setImportFile(e.target.files[0])} />
                </div>
                {importFile && <div style={{marginTop:8,fontSize:12,color:'#10b981'}}>✅ {importFile.name}</div>}
                <div style={s.formActions}>
                  <button type="button" style={s.btnCancel} onClick={() => setShowImport(false)}>Annuler</button>
                  <button type="submit" style={{...s.btnSave,background:'#6366f1'}} disabled={importLoading}>
                    {importLoading?'⏳ Import...':'📥 Importer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Formulaire élève */}
      {showForm && (
        <div style={s.overlay}>
          <div style={{...s.modal, width:980, maxWidth:'95vw'}}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{eleveEdit?'Modifier':'Ajouter'} un élève</h3>
              <button style={s.btnClose} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,alignItems:'start'}}>

                {/* COLONNE GAUCHE */}
                <div>
                  <div style={s.sectionTitle}>🎓 Informations élève</div>
                  <div style={s.grid2}>
                    <F lbl="Nom *"><input style={s.inp} required value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="DUPONT" /></F>
                    <F lbl="Prénom *"><input style={s.inp} required value={form.prenom} onChange={e=>setForm({...form,prenom:e.target.value})} placeholder="Marie" /></F>
                    <F lbl="Email"><input style={s.inp} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="marie@ecole.ch" /></F>
                    <F lbl="Date de naissance"><input style={s.inp} type="date" value={form.date_naissance} onChange={e=>setForm({...form,date_naissance:e.target.value})} /></F>
                    <F lbl="Classe">
                      <select style={s.inp} value={form.classe_id} onChange={e=>setForm({...form,classe_id:e.target.value})}>
                        <option value="">-- Choisir --</option>
                        {classes.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                    </F>
                    <F lbl="Téléphone"><input style={s.inp} value={form.telephone} onChange={e=>setForm({...form,telephone:e.target.value})} placeholder="079 123 45 67" /></F>
                    <F lbl="Adresse" full><input style={s.inp} value={form.adresse} onChange={e=>setForm({...form,adresse:e.target.value})} placeholder="Rue de la Paix 10, 1950 Sion" /></F>
                  </div>
                  <div style={{...s.sectionTitle,marginTop:16}}>👨‍👩‍👦 Contact / Parent</div>
                  <div style={s.grid2}>
                    <F lbl="Nom parent / contact"><input style={s.inp} value={form.nom_parent} onChange={e=>setForm({...form,nom_parent:e.target.value})} placeholder="Dupont Jean" /></F>
                    <F lbl="Téléphone parent"><input style={s.inp} value={form.telephone_parent} onChange={e=>setForm({...form,telephone_parent:e.target.value})} placeholder="079 987 65 43" /></F>
                  </div>
                </div>

                {/* COLONNE DROITE - OASI */}
                <div style={{background:'#f8fafc',borderRadius:12,padding:16,border:'1px solid #e0e7ff'}}>
                  <div style={{...s.sectionTitle,color:'#6366f1',background:'#e0e7ff'}}>🗂️ Données OASI</div>
                  <div style={s.grid2}>
                    <F lbl="A — PROG_NOM *" full><input style={s.inp} required value={form.oasi_prog_nom} onChange={e=>setForm({...form,oasi_prog_nom:e.target.value})} placeholder="Programme..." /></F>
                    <F lbl="B — PROG_ENCADRANT *"><input style={s.inp} required value={form.oasi_prog_encadrant} onChange={e=>setForm({...form,oasi_prog_encadrant:e.target.value})} placeholder="Encadrant..." /></F>
                    <F lbl="C — N *"><input style={s.inp} required type="number" value={form.oasi_n} onChange={e=>setForm({...form,oasi_n:e.target.value})} placeholder="859056" /></F>
                    <F lbl="D — REF *"><input style={s.inp} required type="number" value={form.oasi_ref} onChange={e=>setForm({...form,oasi_ref:e.target.value})} placeholder="21372" /></F>
                    <F lbl="E — POS *"><input style={s.inp} required type="number" value={form.oasi_pos} onChange={e=>setForm({...form,oasi_pos:e.target.value})} placeholder="1" /></F>
                    <F lbl="F — NOM complet *"><input style={s.inp} required value={form.oasi_nom} onChange={e=>setForm({...form,oasi_nom:e.target.value})} placeholder="AHMAD Riaz" /></F>
                    <F lbl="G — NAIS *"><input style={s.inp} required type="date" value={form.oasi_nais} onChange={e=>setForm({...form,oasi_nais:e.target.value})} /></F>
                    <F lbl="H — NATIONALITE *"><input style={s.inp} required value={form.oasi_nationalite} onChange={e=>setForm({...form,oasi_nationalite:e.target.value})} placeholder="AFGHANISTAN" /></F>
                  </div>
                  <div style={{fontSize:10,color:'#94a3b8',margin:'10px 0 6px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>Colonnes I-O (optionnelles)</div>
                  <div style={s.grid2}>
                    <F lbl="I — PRESENCE_DATE"><input style={s.inp} type="date" value={form.oasi_presence_date} onChange={e=>setForm({...form,oasi_presence_date:e.target.value})} /></F>
                    <F lbl="J — JOUR_SEMAINE"><input style={s.inp} value={form.oasi_jour_semaine} onChange={e=>setForm({...form,oasi_jour_semaine:e.target.value})} placeholder="lundi" /></F>
                    <F lbl="K — PRESENCE_PERIODE"><input style={s.inp} value={form.oasi_presence_periode} onChange={e=>setForm({...form,oasi_presence_periode:e.target.value})} placeholder="Matin" /></F>
                    <F lbl="L — PRESENCE_TYPE"><input style={s.inp} value={form.oasi_presence_type} onChange={e=>setForm({...form,oasi_presence_type:e.target.value})} placeholder="01 Présent" /></F>
                    <F lbl="M — REMARQUE"><input style={s.inp} value={form.oasi_remarque} onChange={e=>setForm({...form,oasi_remarque:e.target.value})} /></F>
                    <F lbl="N — CONTROLE_DU"><input style={s.inp} type="date" value={form.oasi_controle_du} onChange={e=>setForm({...form,oasi_controle_du:e.target.value})} /></F>
                    <F lbl="O — CONTROLE_AU"><input style={s.inp} type="date" value={form.oasi_controle_au} onChange={e=>setForm({...form,oasi_controle_au:e.target.value})} /></F>
                    <F lbl="P — PROG_PRESENCES"><input style={s.inp} value={form.oasi_prog_presences} onChange={e=>setForm({...form,oasi_prog_presences:e.target.value})} /></F>
                    <F lbl="Q — PROG_ADMIN"><input style={s.inp} value={form.oasi_prog_admin} onChange={e=>setForm({...form,oasi_prog_admin:e.target.value})} /></F>
                    <F lbl="R — AS"><input style={s.inp} value={form.oasi_as} onChange={e=>setForm({...form,oasi_as:e.target.value})} /></F>
                    <F lbl="S — PRG_ID"><input style={s.inp} type="number" value={form.oasi_prg_id} onChange={e=>setForm({...form,oasi_prg_id:e.target.value})} /></F>
                    <F lbl="T — PRG_OCCUPATION_ID"><input style={s.inp} type="number" value={form.oasi_prg_occupation_id} onChange={e=>setForm({...form,oasi_prg_occupation_id:e.target.value})} /></F>
                    <F lbl="U — RA_ID"><input style={s.inp} type="number" value={form.oasi_ra_id} onChange={e=>setForm({...form,oasi_ra_id:e.target.value})} /></F>
                    <F lbl="V — TEMPS_REPARTI_ID"><input style={s.inp} type="number" value={form.oasi_temps_reparti_id} onChange={e=>setForm({...form,oasi_temps_reparti_id:e.target.value})} /></F>
                  </div>
                </div>
              </div>

              <div style={s.formActions}>
                <button type="button" style={s.btnCancel} onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" style={s.btnSave}>Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {['Nom','Prénom','REF','Nationalité','Classe','Date naissance','Contact','Statut','Actions'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {elevesFiltres.length===0 ? (
              <tr><td colSpan="9" style={s.empty}>Aucun élève trouvé</td></tr>
            ) : elevesFiltres.map(el => (
              <tr key={el.id} style={s.tr}>
                <td style={{...s.td,fontWeight:700,color:'#1e293b'}}>{el.nom||'—'}</td>
                <td style={s.td}>{el.prenom||'—'}</td>
                <td style={s.td}>
                  {el.oasi_ref
                    ? <span style={{background:'#e0e7ff',color:'#3730a3',padding:'3px 8px',borderRadius:99,fontSize:11,fontWeight:700}}>{el.oasi_ref}</span>
                    : <span style={{color:'#94a3b8'}}>—</span>}
                </td>
                <td style={s.td}>{el.oasi_nationalite||'—'}</td>
                <td style={s.td}>
                  <select
                    value={el.classe_id||''}
                    onChange={e => handleClasseChange(el.id, e.target.value)}
                    style={{padding:'5px 8px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:12,background:'white',cursor:'pointer',maxWidth:120}}>
                    <option value="">— Aucune —</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </td>
                <td style={s.td}>{el.date_naissance?new Date(el.date_naissance).toLocaleDateString('fr-CH'):el.oasi_nais?new Date(el.oasi_nais).toLocaleDateString('fr-CH'):'—'}</td>
                <td style={s.td}>
                  <div style={{fontSize:12}}>{el.nom_parent||'—'}</div>
                  {el.telephone_parent && <div style={{fontSize:11,color:'#94a3b8'}}>{el.telephone_parent}</div>}
                </td>
                <td style={s.td}>
                  <span style={el.statut==='actif'?s.badgeActive:s.badgeInactive}>
                    {el.statut==='actif'?'✅ Actif':'❌ Inactif'}
                  </span>
                </td>
                <td style={s.td}>
                  {isAdmin() && <>
                    <button style={s.btnEdit} onClick={() => handleEdit(el)} title="Modifier">✏️</button>
                    <button style={s.btnDel} onClick={() => handleDelete(el.id)} title="Supprimer">🗑️</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const s = {
  page:{padding:'28px 32px',background:'#f8fafc',minHeight:'100vh',fontFamily:"'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif"},
  header:{display:'flex',alignItems:'center',gap:14,marginBottom:20,flexWrap:'wrap'},
  btnBack:{padding:'8px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,color:'#475569'},
  title:{fontSize:22,fontWeight:800,color:'#0f172a',flex:1,margin:0},
  headerRight:{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'},
  searchBox:{position:'relative',display:'flex',alignItems:'center'},
  searchIcon:{position:'absolute',left:10,fontSize:13},
  searchInput:{padding:'8px 12px 8px 32px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,width:200,background:'white',outline:'none'},
  select:{padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,background:'white',outline:'none',cursor:'pointer'},
  btnAdd:{padding:'8px 16px',background:'#f59e0b',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  statsBar:{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'},
  statChip:{padding:'5px 12px',background:'#fef3c7',color:'#92400e',borderRadius:99,fontSize:12,fontWeight:500},
  overlay:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)'},
  modal:{background:'white',padding:32,borderRadius:16,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 40px rgba(0,0,0,0.15)'},
  modalHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24},
  modalTitle:{fontSize:18,fontWeight:800,color:'#0f172a',margin:0},
  btnClose:{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8'},
  sectionTitle:{fontSize:11,fontWeight:700,color:'#f59e0b',background:'#fef3c7',padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase',letterSpacing:'0.05em'},
  grid2:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:8},
  field:{display:'flex',flexDirection:'column'},
  lbl:{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'},
  inp:{padding:'8px 10px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:12,outline:'none',color:'#1e293b',width:'100%',boxSizing:'border-box'},
  formActions:{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24,paddingTop:20,borderTop:'1px solid #f1f5f9'},
  btnCancel:{padding:'9px 18px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#64748b'},
  btnSave:{padding:'9px 20px',background:'#f59e0b',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  tableWrap:{overflowX:'auto',borderRadius:12,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #f1f5f9'},
  table:{width:'100%',borderCollapse:'collapse',background:'white'},
  thead:{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'},
  th:{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'},
  tr:{borderBottom:'1px solid #f8fafc'},
  td:{padding:'10px 14px',fontSize:13,color:'#374151'},
  empty:{padding:40,textAlign:'center',color:'#94a3b8'},
  badgeActive:{background:'#d1fae5',color:'#065f46',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600},
  badgeInactive:{background:'#fee2e2',color:'#991b1b',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600},
  btnEdit:{background:'none',border:'none',cursor:'pointer',fontSize:15,marginRight:6,opacity:0.7},
  btnDel:{background:'none',border:'none',cursor:'pointer',fontSize:15,opacity:0.7},
};