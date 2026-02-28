import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [profs, setProfs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [classeEdit, setClasseEdit] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [form, setForm] = useState({ nom:'', niveau:'', annee_scolaire:'', prof_principal_id:'' });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerTout(); }, []);

  const chargerTout = async () => {
    try {
      const [cl, pr] = await Promise.all([
        axios.get(API+'/classes', {headers}),
        axios.get(API+'/profs', {headers}),
      ]);
      setClasses(cl.data);
      setProfs(pr.data.filter(p => p.actif !== false));
    } catch(err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (classeEdit) await axios.put(API+'/classes/'+classeEdit.id, form, {headers});
      else await axios.post(API+'/classes', form, {headers});
      setShowForm(false); setClasseEdit(null);
      setForm({nom:'',niveau:'',annee_scolaire:'',prof_principal_id:''});
      chargerTout();
    } catch(err) { alert('Erreur: '+(err.response?.data?.message||err.message)); }
  };

  const handleEdit = (c) => {
    setClasseEdit(c);
    setForm({ nom:c.nom||'', niveau:c.niveau||'', annee_scolaire:c.annee_scolaire||'', prof_principal_id:c.prof_principal_id||'' });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cette classe ?')) {
      await axios.delete(API+'/classes/'+id, {headers});
      chargerTout();
    }
  };

  const classesFiltrees = classes.filter(c =>
    (c.nom+' '+(c.niveau||'')).toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.btnBack} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={s.title}>🏫 Classes</h2>
        <div style={s.headerRight}>
          <div style={s.searchBox}>
            <span style={s.searchIcon}>🔍</span>
            <input style={s.searchInput} placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} />
          </div>
          {isAdmin() && <button style={s.btnAdd} onClick={() => { setShowForm(true); setClasseEdit(null); setForm({nom:'',niveau:'',annee_scolaire:'',prof_principal_id:''}); }}>+ Ajouter</button>}
        </div>
      </div>

      <div style={s.statsBar}>
        <span style={s.statChip}>Total <b>{classes.length}</b> classes</span>
      </div>

      {showForm && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{classeEdit?'Modifier':'Ajouter'} une classe</h3>
              <button style={s.btnClose} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={s.grid2}>
                <div style={s.field}><label style={s.lbl}>Nom de la classe *</label><input style={s.inp} type="text" required value={form.nom} onChange={e => setForm({...form,nom:e.target.value})} placeholder="Ex: CFR 09, 6A..." /></div>
                <div style={s.field}><label style={s.lbl}>Niveau</label><input style={s.inp} type="text" value={form.niveau} onChange={e => setForm({...form,niveau:e.target.value})} placeholder="Ex: CFR, CM2..." /></div>
                <div style={s.field}><label style={s.lbl}>Année scolaire</label><input style={s.inp} type="text" value={form.annee_scolaire} onChange={e => setForm({...form,annee_scolaire:e.target.value})} placeholder="2025-2026" /></div>
                <div style={s.field}>
                  <label style={s.lbl}>Titulaire</label>
                  <select style={s.inp} value={form.prof_principal_id} onChange={e => setForm({...form,prof_principal_id:e.target.value})}>
                    <option value="">-- Choisir un prof --</option>
                    {profs.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
                  </select>
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

      <div style={s.grid}>
        {classesFiltrees.length === 0 ? (
          <div style={s.empty}>Aucune classe trouvée</div>
        ) : classesFiltrees.map(c => (
          <div key={c.id} style={s.card}>
            <div style={s.cardTop}>
              <div style={s.cardIcon}>🏫</div>
              <div style={{flex:1}}>
                <div style={s.cardName}>{c.nom}</div>
                {c.niveau && <div style={s.cardSub}>Niveau : {c.niveau}</div>}
                {c.annee_scolaire && <div style={s.cardSub}>Année : {c.annee_scolaire}</div>}
                <div style={s.cardSub}>
                  Titulaire : {c.prof_prenom ? <b>{c.prof_prenom} {c.prof_nom}</b> : <span style={{color:'#94a3b8'}}>—</span>}
                </div>
              </div>
              <div style={s.eleveBadge}>{c.nb_eleves||0} élèves</div>
            </div>
            {isAdmin() && (
              <div style={s.cardActions}>
                <button style={s.btnEdit} onClick={() => handleEdit(c)}>✏️ Modifier</button>
                <button style={s.btnDel} onClick={() => handleDelete(c.id)}>🗑️ Supprimer</button>
              </div>
            )}
          </div>
        ))}
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
  btnAdd:{padding:'8px 16px',background:'#10b981',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  statsBar:{display:'flex',gap:10,marginBottom:20},
  statChip:{padding:'5px 12px',background:'#d1fae5',color:'#065f46',borderRadius:99,fontSize:12,fontWeight:500},
  overlay:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)'},
  modal:{background:'white',padding:32,borderRadius:16,width:500,maxHeight:'85vh',overflowY:'auto',boxShadow:'0 20px 40px rgba(0,0,0,0.15)'},
  modalHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24},
  modalTitle:{fontSize:18,fontWeight:800,color:'#0f172a',margin:0},
  btnClose:{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8'},
  grid2:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:8},
  field:{display:'flex',flexDirection:'column'},
  lbl:{fontSize:12,fontWeight:600,marginBottom:5,color:'#475569'},
  inp:{padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,outline:'none',color:'#1e293b'},
  formActions:{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24,paddingTop:20,borderTop:'1px solid #f1f5f9'},
  btnCancel:{padding:'9px 18px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#64748b'},
  btnSave:{padding:'9px 20px',background:'#10b981',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16},
  card:{background:'white',borderRadius:14,padding:20,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #f1f5f9',borderTop:'3px solid #10b981'},
  cardTop:{display:'flex',alignItems:'flex-start',gap:12,marginBottom:16},
  cardIcon:{fontSize:28,width:44,height:44,background:'#d1fae5',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  cardName:{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:4},
  cardSub:{fontSize:12,color:'#64748b',marginTop:2},
  eleveBadge:{background:'#e0e7ff',color:'#3730a3',padding:'4px 10px',borderRadius:99,fontSize:12,fontWeight:700,flexShrink:0},
  cardActions:{display:'flex',gap:8,borderTop:'1px solid #f8fafc',paddingTop:12},
  btnEdit:{flex:1,padding:'7px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:500,color:'#475569'},
  btnDel:{flex:1,padding:'7px',background:'#fff1f2',border:'1px solid #fecdd3',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:500,color:'#e11d48'},
  empty:{padding:60,textAlign:'center',color:'#94a3b8',background:'white',borderRadius:14,gridColumn:'1/-1'},
};