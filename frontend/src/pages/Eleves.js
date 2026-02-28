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
  const [form, setForm] = useState({
    nom:'', prenom:'', email:'', classe_id:'',
    date_naissance:'', adresse:'', telephone:'',
    nom_parent:'', telephone_parent:'', statut:'actif'
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

  const resetForm = () => setForm({nom:'',prenom:'',email:'',classe_id:'',date_naissance:'',adresse:'',telephone:'',nom_parent:'',telephone_parent:'',statut:'actif'});

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {...form, classe_id: form.classe_id||null, date_naissance: form.date_naissance||null};
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
      statut:el.statut||'actif'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cet élève ?')) {
      await axios.delete(API+'/eleves/'+id, {headers});
      chargerTout();
    }
  };

  const getClasse = (id) => classes.find(c => c.id == id);

  const elevesFiltres = eleves.filter(el => {
    const matchR = (el.nom+' '+el.prenom+' '+(el.email||'')).toLowerCase().includes(recherche.toLowerCase());
    const matchC = filtreClasse==='tous' || String(el.classe_id)===String(filtreClasse);
    return matchR && matchC;
  });

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

      {showForm && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{eleveEdit?'Modifier':'Ajouter'} un élève</h3>
              <button style={s.btnClose} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={s.section}>🎓 Informations élève</div>
              <div style={s.grid2}>
                <div style={s.field}><label style={s.lbl}>Nom *</label><input style={s.inp} required value={form.nom} onChange={e => setForm({...form,nom:e.target.value})} placeholder="Dupont" /></div>
                <div style={s.field}><label style={s.lbl}>Prénom *</label><input style={s.inp} required value={form.prenom} onChange={e => setForm({...form,prenom:e.target.value})} placeholder="Marie" /></div>
                <div style={s.field}><label style={s.lbl}>Email</label><input style={s.inp} type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} placeholder="marie@ecole.ch" /></div>
                <div style={s.field}><label style={s.lbl}>Date de naissance</label><input style={s.inp} type="date" value={form.date_naissance} onChange={e => setForm({...form,date_naissance:e.target.value})} /></div>
                <div style={s.field}><label style={s.lbl}>Classe</label>
                  <select style={s.inp} value={form.classe_id} onChange={e => setForm({...form,classe_id:e.target.value})}>
                    <option value="">-- Choisir --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
                <div style={s.field}><label style={s.lbl}>Téléphone</label><input style={s.inp} value={form.telephone} onChange={e => setForm({...form,telephone:e.target.value})} placeholder="079 123 45 67" /></div>
                <div style={{...s.field,gridColumn:'1/-1'}}><label style={s.lbl}>Adresse</label><input style={s.inp} value={form.adresse} onChange={e => setForm({...form,adresse:e.target.value})} placeholder="Rue de la Paix 10, 1950 Sion" /></div>
              </div>
              <div style={s.section}>👨‍👩‍👦 Contact / Parent</div>
              <div style={s.grid2}>
                <div style={s.field}><label style={s.lbl}>Nom du parent / contact</label><input style={s.inp} value={form.nom_parent} onChange={e => setForm({...form,nom_parent:e.target.value})} placeholder="Dupont Jean" /></div>
                <div style={s.field}><label style={s.lbl}>Téléphone parent</label><input style={s.inp} value={form.telephone_parent} onChange={e => setForm({...form,telephone_parent:e.target.value})} placeholder="079 987 65 43" /></div>
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
              {['Nom','Prénom','Classe','Date naissance','Téléphone','Parent / Contact','Statut','Actions'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {elevesFiltres.length===0 ? (
              <tr><td colSpan="8" style={s.empty}>Aucun élève trouvé</td></tr>
            ) : elevesFiltres.map(el => {
              const cl = getClasse(el.classe_id);
              return (
                <tr key={el.id} style={s.tr}>
                  <td style={{...s.td,fontWeight:700,color:'#1e293b'}}>{el.nom||'—'}</td>
                  <td style={s.td}>{el.prenom||'—'}</td>
                  <td style={s.td}>
                    {cl ? <span style={{background:'#e0e7ff',color:'#3730a3',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700}}>{cl.nom}</span>
                        : <span style={{color:'#94a3b8'}}>—</span>}
                  </td>
                  <td style={s.td}>{el.date_naissance?new Date(el.date_naissance).toLocaleDateString('fr-CH'):'—'}</td>
                  <td style={s.td}>{el.telephone||'—'}</td>
                  <td style={s.td}>
                    <div>{el.nom_parent||'—'}</div>
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
              );
            })}
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
  modal:{background:'white',padding:32,borderRadius:16,width:560,maxHeight:'88vh',overflowY:'auto',boxShadow:'0 20px 40px rgba(0,0,0,0.15)'},
  modalHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24},
  modalTitle:{fontSize:18,fontWeight:800,color:'#0f172a',margin:0},
  btnClose:{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8'},
  section:{fontSize:11,fontWeight:700,color:'#f59e0b',background:'#fef3c7',padding:'5px 12px',borderRadius:6,marginBottom:14,marginTop:10,textTransform:'uppercase',letterSpacing:'0.05em'},
  grid2:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:8},
  field:{display:'flex',flexDirection:'column'},
  lbl:{fontSize:12,fontWeight:600,marginBottom:5,color:'#475569'},
  inp:{padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,outline:'none',color:'#1e293b',width:'100%',boxSizing:'border-box'},
  formActions:{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24,paddingTop:20,borderTop:'1px solid #f1f5f9'},
  btnCancel:{padding:'9px 18px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#64748b'},
  btnSave:{padding:'9px 20px',background:'#f59e0b',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  tableWrap:{overflowX:'auto',borderRadius:12,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #f1f5f9'},
  table:{width:'100%',borderCollapse:'collapse',background:'white'},
  thead:{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'},
  th:{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'},
  tr:{borderBottom:'1px solid #f8fafc'},
  td:{padding:'11px 14px',fontSize:13,color:'#374151'},
  empty:{padding:40,textAlign:'center',color:'#94a3b8'},
  badgeActive:{background:'#d1fae5',color:'#065f46',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600},
  badgeInactive:{background:'#fee2e2',color:'#991b1b',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600},
  btnEdit:{background:'none',border:'none',cursor:'pointer',fontSize:15,marginRight:6,opacity:0.7},
  btnDel:{background:'none',border:'none',cursor:'pointer',fontSize:15,opacity:0.7},
};