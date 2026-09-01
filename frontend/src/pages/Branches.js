import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import { stickyPageChrome } from '../styles/pageShell';
import apiClient from '../lib/apiClient';
import CustomSelect from '../components/CustomSelect';


export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [brancheEdit, setBrancheEdit] = useState(null);
  const [form, setForm] = useState({ nom:'', niveau:'', periodes_semaine:'', coefficient:'1', type_branche:'principale', designation_courte:'', suivi_notes:true });
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtreNiveau, setFiltreNiveau] = useState('tous');
  const [showNiveauxFiltres, setShowNiveauxFiltres] = useState(false);
  const [niveauxDB, setNiveauxDB] = useState([]);
  const headers = {};

  useEffect(() => {
    chargerBranches();
    apiClient.get('/donnees/niveaux', { headers }).then(r => setNiveauxDB(r.data || [])).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement initial
  }, []);

  const chargerBranches = async () => {
    try { const res = await apiClient.get('/branches',{headers}); setBranches(res.data); }
    catch(err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setErreur('');
    try {
      if (brancheEdit) await apiClient.put('/branches/'+brancheEdit.id, form, {headers});
      else await apiClient.post('/branches', form, {headers});
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
      await apiClient.delete('/branches/'+id, {headers});
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
      <div style={{...stickyPageChrome(), marginBottom:0}}>
      <div style={{...s.header, marginBottom:12}}>
        <h2 style={s.title}>Gestion des branches</h2>
        {isAdmin() && <button style={s.btnAdd} onClick={() => { setShowForm(true); setBrancheEdit(null); setForm({nom:'',niveau:'',periodes_semaine:'',coefficient:'1',type_branche:'principale',designation_courte:'',suivi_notes:true}); setErreur(''); }}>+ Ajouter</button>}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:0}}>
        <input style={s.tabSearch} placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} />
        {!showNiveauxFiltres ? (
          <button
            onClick={() => setShowNiveauxFiltres(true)}
            style={{padding:'7px 14px',borderRadius:17,border:'1.5px solid #e2e8f0',background:'white',cursor:'pointer',fontWeight:600,color:'#94a3b8',fontSize:13,fontFamily:'inherit',whiteSpace:'nowrap'}}
          >
            Trier
          </button>
        ) : (
          <div className="chip-tabs" style={s.toggleGroup}>
            {niveaux.map(n => (
              <button key={n} style={{...s.toggleBtn,...(filtreNiveau===n?s.toggleBtnActif:{})}} onClick={() => { setFiltreNiveau(n); if (n === 'tous') setShowNiveauxFiltres(false); }}>
                {n==='tous'?'Trier':n}
              </button>
            ))}
          </div>
        )}
      </div>
      </div>

      {showForm && (
        <div className="modal-overlay" style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{brancheEdit?'Modifier':'Ajouter'} une branche</h3>
              <button style={s.btnCancel} onClick={() => setShowForm(false)}>Fermer</button>
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
                  <CustomSelect
                    style={s.inp}
                    value={form.niveau}
                    onChange={v => setForm({...form,niveau:v})}
                    options={niveauxDB.map(n => ({ value: n.nom, label: n.nom }))}
                  />
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
                      {t==='principale'?'Principale':'Secondaire'}
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

      <div style={{marginTop:4}}>
        <div style={s.tableWrap}>
        <div style={{overflow:'auto',maxHeight:'calc(100vh - 230px)',WebkitOverflowScrolling:'touch'}}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{...s.th, borderTopLeftRadius:12}}>Branche</th>
              <th style={s.th}>Abrév.</th>
              <th style={{...s.th, textAlign:'center'}}>Niveau</th>
              <th style={{...s.th, textAlign:'center'}}>Périodes</th>
              <th style={{...s.th, textAlign:'center'}}>Coefficient</th>
              <th style={{...s.th, width:86, minWidth:86, maxWidth:86, textAlign:'center', borderTopRightRadius:12}}></th>
            </tr>
          </thead>
          <tbody>
            {branchesFiltrees.length===0 ? (
              <tr><td colSpan="6" style={{...s.empty, borderBottomLeftRadius:12, borderBottomRightRadius:12}}>Aucune branche trouvée</td></tr>
            ) : branchesFiltrees.map((b, bi) => {
              const last = bi === branchesFiltrees.length - 1;
              return (
                <tr key={b.id} style={s.tr}>
                  <td style={{ ...s.td, ...(last ? { borderBottomLeftRadius: 12, borderBottom: 'none' } : {}) }}><b style={{color:'#1e293b'}}>{b.nom}</b></td>
                  <td style={{ ...s.td, ...(last ? { borderBottom: 'none' } : {}) }}>{b.designation_courte || '—'}</td>
                  <td style={{...s.td, textAlign:'center', ...(last ? { borderBottom: 'none' } : {})}}>{b.niveau || '—'}</td>
                  <td style={{...s.td, textAlign:'center', ...(last ? { borderBottom: 'none' } : {})}}>{b.periodes_semaine || '—'}</td>
                  <td style={{...s.td, textAlign:'center', ...(last ? { borderBottom: 'none' } : {})}}>{b.coefficient || 1}</td>
                  <td style={{...s.td, width:86, minWidth:86, maxWidth:86, padding:'10px 8px', textAlign:'center', ...(last ? { borderBottomRightRadius: 12, borderBottom: 'none' } : {})}}>
                    {isAdmin() && <div style={{display:'flex',gap:6,justifyContent:'center',alignItems:'center'}}>
                      <button style={s.btnEdit} onClick={() => handleEdit(b)} title="Modifier">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button style={s.btnDel} onClick={() => handleDelete(b.id)} title="Supprimer">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:{padding:'28px 32px',background:'#f8fafc',minHeight:'100%',boxSizing:'border-box',fontFamily:"'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif"},
  header:{display:'flex',alignItems:'center',gap:14,marginBottom:24,flexWrap:'wrap',minHeight:40},
  btnBack:{padding:'8px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,color:'#475569'},
  title:{fontSize:22,fontWeight:800,color:'#0f172a',flex:1,margin:0},
  controlsRow:{display:'flex',alignItems:'center',gap:10,marginBottom:16,flexWrap:'wrap'},
  searchBox:{position:'relative',display:'flex',alignItems:'center'},
  searchIcon:{position:'absolute',left:10,fontSize:13},
  searchInput:{padding:'8px 12px 8px 32px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,width:200,background:'white',outline:'none'},
  filtres:{display:'flex',gap:4,flexWrap:'wrap'},
  filtrBtn:{padding:'7px 12px',background:'white',border:'1px solid #e2e8f0',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:500,color:'#64748b'},
  filtrActif:{background:'#6366f1',color:'white',border:'1px solid #6366f1'},
  btnAdd:{padding:'8px 14px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
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
  btnCancel:{padding:'8px 16px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#64748b'},
  btnSave:{padding:'8px 16px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  tabSearch: { padding: '9px 14px', borderRadius: 8, border: '1px solid #c7d2fe', background: 'white', outline: 'none', fontSize: 14, width: 280, color: '#1e293b', fontFamily: 'inherit' },
  toggleGroup: { display: 'flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 },
  toggleBtn: { padding: '7px 16px', borderRadius: 17, border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: '#6d28d9', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' },
  toggleBtnActif: { background: '#6366f1', color: 'white', fontWeight: 700 },
  tableWrap:{borderRadius:12,overflow:'hidden',background:'white'},
  table:{width:'100%',borderCollapse:'separate',borderSpacing:0,background:'white'},
  th:{padding:'10px 16px',textAlign:'left',fontSize:11,fontWeight:700,color:'white',textTransform:'uppercase',letterSpacing:'0.05em',background:'#6366f1',borderBottom:'1px solid rgba(0,0,0,0.06)',position:'sticky',top:0,zIndex:2},
  tr:{},
  td:{padding:'12px 16px',fontSize:13,color:'#374151',background:'white',borderBottom:'1px solid #f8fafc',verticalAlign:'middle'},
  empty:{padding:40,textAlign:'center',color:'#94a3b8',background:'white'},
  btnEdit:{padding:5,border:'none',borderRadius:8,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',background:'#e0e7ff',color:'#4338ca'},
  btnDel:{padding:5,border:'none',borderRadius:8,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',background:'#fee2e2',color:'#dc2626'},
};