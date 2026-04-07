import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [brancheEdit, setBrancheEdit] = useState(null);
  const [form, setForm] = useState({ nom:'', niveau:'', periodes_semaine:'', coefficient:'1', type_branche:'principale', designation_courte:'', suivi_notes:true });
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtreNiveau, setFiltreNiveau] = useState('tous');
  const [niveauxDB, setNiveauxDB] = useState([]);
  const navigate = useNavigate();
  const headers = {};

  useEffect(() => {
    chargerBranches();
    axios.get(API + '/donnees/niveaux', { headers }).then(r => setNiveauxDB(r.data || [])).catch(() => {});
  }, []);

  const chargerBranches = async () => {
    try { const res = await axios.get(API+'/branches',{headers}); setBranches(res.data); }
    catch(err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setErreur('');
    try {
      if (brancheEdit) await axios.put(API+'/branches/'+brancheEdit.id, form, {headers});
      else await axios.post(API+'/branches', form, {headers});
      setShowForm(false); setBrancheEdit(null);
      setForm({nom:'',niveau:'',periodes_semaine:'',coefficient:'1',type_branche:'principale',designation_courte:'',suivi_notes:true});
      chargerBranches();
    } catch(err) { setErreur(err.response?.data?.message||'Erreur serveur'); }
  };

  const handleEdit = (b) => {
    setBrancheEdit(b);
    setForm({
      nom:b.nom||'',
      niveau:b.niveau||'',
      periodes_semaine:b.periodes_semaine||'',
      coefficient:b.coefficient||'1',
      type_branche:b.type_branche||'principale',
      designation_courte:b.designation_courte||'',
      suivi_notes:b.suivi_notes !== false,
    });
    setErreur(''); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cette branche ?')) {
      await axios.delete(API+'/branches/'+id, {headers});
      chargerBranches();
    }
  };

  const niveaux = ['tous', ...niveauxDB.map(n => n.nom)];

  const branchesFiltrees = branches.filter(b => {
    const matchR = b.nom.toLowerCase().includes(recherche.toLowerCase());
    const matchN = filtreNiveau==='tous' || b.niveau===filtreNiveau;
    return matchR && matchN;
  });

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.btnBack} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={s.title}>Gestion des branches</h2>
        {isAdmin() && <button style={s.btnAdd} onClick={() => { setShowForm(true); setBrancheEdit(null); setForm({nom:'',niveau:'',periodes_semaine:'',coefficient:'1',type_branche:'principale',designation_courte:'',suivi_notes:true}); setErreur(''); }}>+ Ajouter</button>}
      </div>
      <div style={s.tabsBar}>
        <div style={s.tabsRow}>
          {niveaux.map(n => (
            <button key={n} style={{...s.tabBtn,...(filtreNiveau===n?s.tabBtnActif:{})}} onClick={() => setFiltreNiveau(n)}>
              {n==='tous'?'Tous':n}
            </button>
          ))}
        </div>
      </div>
      <div style={{marginTop:15,marginBottom:12}}>
        <input style={s.tabSearch} placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} />
      </div>

      {showForm && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{brancheEdit?'Modifier':'Ajouter'} une branche</h3>
              <button style={s.btnClose} onClick={() => setShowForm(false)}>✕</button>
            </div>
            {erreur && <div style={s.erreur}>❌ {erreur}</div>}
            <form onSubmit={handleSubmit}>
              <div style={s.grid2}>
                <div style={{...s.field,gridColumn:'1/-1'}}>
                  <label style={s.lbl}>Nom de la branche *</label>
                  <input style={s.inp} type="text" required value={form.nom} onChange={e => setForm({...form,nom:e.target.value})} placeholder="Ex: Mathématiques, Français..." />
                </div>
                <div style={s.field}>
                  <label style={s.lbl}>Désignation courte *</label>
                  <input style={s.inp} type="text" required value={form.designation_courte} onChange={e => setForm({...form,designation_courte:e.target.value})} placeholder="Ex: MATH, FRA" />
                </div>
                <div style={s.field}>
                  <label style={s.lbl}>Niveau *</label>
                  <select style={s.inp} required value={form.niveau} onChange={e => setForm({...form,niveau:e.target.value})}>
                    <option value="">-- Choisir --</option>
                    {niveauxDB.map(n => <option key={n.id} value={n.nom}>{n.nom}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.lbl}>Périodes / semaine *</label>
                  <input style={s.inp} type="number" min="1" max="40" required value={form.periodes_semaine} onChange={e => setForm({...form,periodes_semaine:e.target.value})} placeholder="Ex: 4" />
                </div>
                <div style={s.field}>
                  <label style={s.lbl}>Coefficient</label>
                  <input style={s.inp} type="number" min="0.5" max="10" step="0.5" value={form.coefficient} onChange={e => setForm({...form,coefficient:e.target.value})} />
                </div>
                <div style={s.field}>
                  <label style={s.lbl}>Suivi des notes</label>
                  <button
                    type="button"
                    onClick={() => setForm({...form, suivi_notes: !form.suivi_notes})}
                    style={{
                      padding:'9px 12px',
                      borderRadius:8,
                      border:'2px solid '+(form.suivi_notes ? '#16a34a' : '#e2e8f0'),
                      background: form.suivi_notes ? '#dcfce7' : '#f8fafc',
                      color: form.suivi_notes ? '#166534' : '#64748b',
                      cursor:'pointer',
                      fontWeight:700,
                      fontSize:13
                    }}
                  >
                    {form.suivi_notes ? 'Oui' : 'Non'}
                  </button>
                </div>
              </div>
              <div style={{marginTop:14}}>
                <label style={s.lbl}>Type de branche *</label>
                <div style={{display:'flex',gap:10,marginTop:6}}>
                  {['principale','secondaire'].map(t => (
                    <button key={t} type="button"
                      onClick={() => setForm({...form,type_branche:t})}
                      style={{flex:1,padding:'10px',borderRadius:8,border:'2px solid '+(form.type_branche===t?'#6366f1':'#e2e8f0'),background:form.type_branche===t?'#e0e7ff':'#f8fafc',color:form.type_branche===t?'#3730a3':'#64748b',cursor:'pointer',fontWeight:700,fontSize:13,textTransform:'capitalize',transition:'all 0.15s'}}>
                      {t==='principale'?'⭐ Principale':'📎 Secondaire'}
                    </button>
                  ))}
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

      <div style={{marginTop:14}}>
        <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {['Branche','Abrév.','Suivi','Niveau','Type','Périodes/sem.','Coefficient','Actions'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {branchesFiltrees.length===0 ? (
              <tr><td colSpan="8" style={s.empty}>Aucune branche trouvée</td></tr>
            ) : branchesFiltrees.map((b) => {
              return (
                <tr key={b.id} style={s.tr}>
                  <td style={s.td}>
                    <b style={{color:'#1e293b'}}>{b.nom}</b>
                  </td>
                  <td style={s.td}>
                    <span style={{background:'#eef2ff',color:'#3730a3',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700}}>
                      {b.designation_courte || '—'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={{background:b.suivi_notes!==false?'#dcfce7':'#fee2e2',color:b.suivi_notes!==false?'#166534':'#991b1b',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700}}>
                      {b.suivi_notes!==false ? 'Oui' : 'Non'}
                    </span>
                  </td>
                  <td style={s.td}>
                    {b.niveau
                      ? <span style={{background:'#e0e7ff',color:'#3730a3',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700}}>{b.niveau}</span>
                      : <span style={{color:'#94a3b8'}}>—</span>}
                  </td>
                  <td style={s.td}>
                    <span style={{background:b.type_branche==='principale'?'#fef3c7':'#f1f5f9',color:b.type_branche==='principale'?'#92400e':'#475569',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600}}>
                      {b.type_branche==='principale'?'⭐ Principale':'📎 Secondaire'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={{background:'#f0fdf4',color:'#166534',padding:'3px 10px',borderRadius:99,fontSize:12,fontWeight:700}}>
                      {b.periodes_semaine||'—'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={{background:'#f8fafc',color:'#475569',padding:'3px 10px',borderRadius:99,fontSize:12,fontWeight:600}}>
                      {b.coefficient||1}
                    </span>
                  </td>
                  <td style={s.td}>
                    {isAdmin() && <>
                      <button style={s.btnEdit} onClick={() => handleEdit(b)} title="Modifier">✏️</button>
                      <button style={s.btnDel} onClick={() => handleDelete(b.id)} title="Supprimer">🗑️</button>
                    </>}
                  </td>
                </tr>
              );
            })}
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
  filtres:{display:'flex',gap:4,flexWrap:'wrap'},
  filtrBtn:{padding:'7px 12px',background:'white',border:'1px solid #e2e8f0',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:500,color:'#64748b'},
  filtrActif:{background:'#6366f1',color:'white',border:'1px solid #6366f1'},
  btnAdd:{padding:'8px 16px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  statsBar:{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'},
  statChip:{padding:'5px 12px',background:'#e0e7ff',color:'#3730a3',borderRadius:99,fontSize:12,fontWeight:500},
  overlay:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)'},
  modal:{background:'white',padding:32,borderRadius:16,width:460,boxShadow:'0 20px 40px rgba(0,0,0,0.15)'},
  modalHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24},
  modalTitle:{fontSize:18,fontWeight:800,color:'#0f172a',margin:0},
  btnClose:{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8'},
  erreur:{background:'#fee2e2',color:'#991b1b',padding:'10px 14px',borderRadius:8,marginBottom:16,fontSize:13,fontWeight:500},
  grid2:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:8},
  field:{display:'flex',flexDirection:'column'},
  lbl:{fontSize:12,fontWeight:600,marginBottom:5,color:'#475569'},
  inp:{padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,outline:'none',color:'#1e293b',width:'100%',boxSizing:'border-box'},
  formActions:{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24,paddingTop:20,borderTop:'1px solid #f1f5f9'},
  btnCancel:{padding:'9px 18px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#64748b'},
  btnSave:{padding:'9px 20px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  tabsBar: { display: 'flex', alignItems: 'flex-end', gap: 0, marginBottom: 0, borderBottom: '2px solid #6366f1', paddingBottom: 0, width: '100%', boxSizing: 'border-box' },
  tabsRow: { display: 'flex', gap: 0, alignItems: 'flex-end' },
  tabSearch: { padding: '9px 14px', borderRadius: 8, border: '1px solid #c7d2fe', background: 'white', outline: 'none', fontSize: 14, width: 280, color: '#1e293b', fontFamily: 'inherit' },
  tabBtn: { padding: '9px 14px', borderRadius: '10px 10px 0 0', border: 'none', background: '#ede9fe', cursor: 'pointer', fontWeight: 700, color: '#5b21b6', outline: 'none', lineHeight: '1', fontSize: 14, width: 90, minWidth: 90, textAlign: 'center' },
  tabBtnActif: { background: '#6366f1', color: 'white', marginBottom: -1, zIndex: 2 },
  tabContent: { background: 'white', border: 'none', borderRadius: '0 0 12px 12px', padding: 14 },
  tableWrap:{overflow:'hidden',borderRadius:12,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #f1f5f9'},
  table:{width:'100%',borderCollapse:'collapse',background:'white'},
  thead:{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'},
  th:{padding:'10px 16px',textAlign:'left',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em'},
  tr:{borderBottom:'1px solid #f8fafc'},
  td:{padding:'12px 16px',fontSize:13,color:'#374151'},
  empty:{padding:40,textAlign:'center',color:'#94a3b8'},
  btnEdit:{background:'none',border:'none',cursor:'pointer',fontSize:15,marginRight:6,opacity:0.7},
  btnDel:{background:'none',border:'none',cursor:'pointer',fontSize:15,opacity:0.7},
};