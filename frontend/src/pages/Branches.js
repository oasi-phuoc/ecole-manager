import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [brancheEdit, setBrancheEdit] = useState(null);
  const [form, setForm] = useState({ nom:'', periodes_semaine:'', coefficient:'1' });
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerBranches(); }, []);

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
      setForm({nom:'',periodes_semaine:'',coefficient:'1'});
      chargerBranches();
    } catch(err) { setErreur(err.response?.data?.message||'Erreur serveur'); }
  };

  const handleEdit = (b) => {
    setBrancheEdit(b);
    setForm({nom:b.nom||'',periodes_semaine:b.periodes_semaine||'',coefficient:b.coefficient||'1'});
    setErreur(''); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cette branche ?')) {
      await axios.delete(API+'/branches/'+id, {headers});
      chargerBranches();
    }
  };

  const branchesFiltrees = branches.filter(b =>
    b.nom.toLowerCase().includes(recherche.toLowerCase())
  );

  const COULEURS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'];

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.btnBack} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={s.title}>📚 Branches</h2>
        <div style={s.headerRight}>
          <div style={s.searchBox}>
            <span style={s.searchIcon}>🔍</span>
            <input style={s.searchInput} placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} />
          </div>
          {isAdmin() && <button style={s.btnAdd} onClick={() => { setShowForm(true); setBrancheEdit(null); setForm({nom:'',periodes_semaine:'',coefficient:'1'}); setErreur(''); }}>+ Ajouter</button>}
        </div>
      </div>

      <div style={s.statsBar}>
        <span style={s.statChip}>Total <b>{branches.length}</b> branches</span>
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
                <div style={{...s.field,gridColumn:'1/-1'}}><label style={s.lbl}>Nom de la branche *</label><input style={s.inp} type="text" required value={form.nom} onChange={e => setForm({...form,nom:e.target.value})} placeholder="Ex: Mathématiques, Français..." /></div>
                <div style={s.field}><label style={s.lbl}>Périodes / semaine</label><input style={s.inp} type="number" min="1" max="40" value={form.periodes_semaine} onChange={e => setForm({...form,periodes_semaine:e.target.value})} placeholder="Ex: 4" /></div>
                <div style={s.field}><label style={s.lbl}>Coefficient</label><input style={s.inp} type="number" min="0.5" max="10" step="0.5" value={form.coefficient} onChange={e => setForm({...form,coefficient:e.target.value})} /></div>
              </div>
              <div style={s.formActions}>
                <button type="button" style={s.btnCancel} onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" style={s.btnSave}>Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={s.grid}>
        {branchesFiltrees.length === 0 ? (
          <div style={s.empty}>Aucune branche trouvée</div>
        ) : branchesFiltrees.map((b,i) => {
          const couleur = COULEURS[i % COULEURS.length];
          return (
            <div key={b.id} style={{...s.card, borderTop:'3px solid '+couleur}}>
              <div style={s.cardTop}>
                <div style={{...s.cardIcon,background:couleur+'22',color:couleur}}>📚</div>
                <div style={{flex:1}}>
                  <div style={s.cardName}>{b.nom}</div>
                  <div style={s.cardMeta}>
                    {b.periodes_semaine && <span style={{...s.metaBadge,background:couleur+'18',color:couleur}}>{b.periodes_semaine} p/sem</span>}
                    <span style={s.metaBadgeGray}>Coef. {b.coefficient||1}</span>
                  </div>
                </div>
              </div>
              {isAdmin() && (
                <div style={s.cardActions}>
                  <button style={s.btnEdit} onClick={() => handleEdit(b)}>✏️ Modifier</button>
                  <button style={s.btnDel} onClick={() => handleDelete(b.id)}>🗑️ Supprimer</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  page:{padding:'28px 32px',background:'#f8fafc',minHeight:'100vh',fontFamily:"'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif"},
  header:{display:'flex',alignItems:'center',gap:14,marginBottom:20,flexWrap:'wrap'},
  btnBack:{padding:'8px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,color:'#475569'},
  title:{fontSize:22,fontWeight:800,color:'#0f172a',flex:1,margin:0},
  headerRight:{display:'flex',gap:10,alignItems:'center'},
  searchBox:{position:'relative',display:'flex',alignItems:'center'},
  searchIcon:{position:'absolute',left:10,fontSize:13},
  searchInput:{padding:'8px 12px 8px 32px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,width:200,background:'white',outline:'none'},
  btnAdd:{padding:'8px 16px',background:'#8b5cf6',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  statsBar:{display:'flex',gap:10,marginBottom:20},
  statChip:{padding:'5px 12px',background:'#ede9fe',color:'#5b21b6',borderRadius:99,fontSize:12,fontWeight:500},
  overlay:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)'},
  modal:{background:'white',padding:32,borderRadius:16,width:460,boxShadow:'0 20px 40px rgba(0,0,0,0.15)'},
  modalHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24},
  modalTitle:{fontSize:18,fontWeight:800,color:'#0f172a',margin:0},
  btnClose:{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8'},
  erreur:{background:'#fee2e2',color:'#991b1b',padding:'10px 14px',borderRadius:8,marginBottom:16,fontSize:13,fontWeight:500},
  grid2:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:8},
  field:{display:'flex',flexDirection:'column'},
  lbl:{fontSize:12,fontWeight:600,marginBottom:5,color:'#475569'},
  inp:{padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,outline:'none',color:'#1e293b'},
  formActions:{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24,paddingTop:20,borderTop:'1px solid #f1f5f9'},
  btnCancel:{padding:'9px 18px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#64748b'},
  btnSave:{padding:'9px 20px',background:'#8b5cf6',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16},
  card:{background:'white',borderRadius:14,padding:20,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #f1f5f9'},
  cardTop:{display:'flex',alignItems:'center',gap:12,marginBottom:16},
  cardIcon:{fontSize:22,width:42,height:42,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  cardName:{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:6},
  cardMeta:{display:'flex',gap:6,flexWrap:'wrap'},
  metaBadge:{padding:'3px 9px',borderRadius:99,fontSize:11,fontWeight:600},
  metaBadgeGray:{padding:'3px 9px',borderRadius:99,fontSize:11,fontWeight:600,background:'#f1f5f9',color:'#475569'},
  cardActions:{display:'flex',gap:8,borderTop:'1px solid #f8fafc',paddingTop:12},
  btnEdit:{flex:1,padding:'7px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:500,color:'#475569'},
  btnDel:{flex:1,padding:'7px',background:'#fff1f2',border:'1px solid #fecdd3',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:500,color:'#e11d48'},
  empty:{padding:60,textAlign:'center',color:'#94a3b8',background:'white',borderRadius:14,gridColumn:'1/-1'},
};