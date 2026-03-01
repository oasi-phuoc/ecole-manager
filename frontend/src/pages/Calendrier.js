import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';
const FONT = "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif";
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const VACANCES_LISTE = [
  "Vacances d'automne","La Toussaint","Immaculée Conception",
  "Vacances de Noël","Vacances d'hiver","St-Joseph",
  "Vacances de Pâques","Fête du travail","Ascension","Pentecôte","Fête-Dieu"
];
const COULEURS_VACANCES = {
  "Vacances d'automne":'#f59e0b',"La Toussaint":'#f59e0b',
  "Immaculée Conception":'#6366f1',"Vacances de Noël":'#ef4444',
  "Vacances d'hiver":'#3b82f6',"St-Joseph":'#6366f1',
  "Vacances de Pâques":'#10b981',"Fête du travail":'#6366f1',
  "Ascension":'#6366f1',"Pentecôte":'#6366f1',"Fête-Dieu":'#6366f1'
};

export default function Calendrier() {
  const [evenements, setEvenements] = useState([]);
  const [moisActuel, setMoisActuel] = useState(new Date().getMonth());
  const [anneeActuelle, setAnneeActuelle] = useState(new Date().getFullYear());
  const [showFormVacance, setShowFormVacance] = useState(false);
  const [vacanceEdit, setVacanceEdit] = useState(null);
  const [formVacance, setFormVacance] = useState({ nom_vacance:'', date_debut:'', date_fin:'' });
  const [showFormSeance, setShowFormSeance] = useState(false);
  const [seanceEdit, setSeanceEdit] = useState(null);
  const [formSeance, setFormSeance] = useState({ titre:'', date_debut:'', heure_debut:'', heure_fin:'' });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerEvenements(); }, []);

  const chargerEvenements = async () => {
    try {
      const res = await axios.get(API+'/calendrier', { headers });
      setEvenements(res.data);
    } catch(err) { console.error(err); }
  };

  const vacances = evenements.filter(e => e.categorie === 'vacance');
  const seances = evenements.filter(e => e.categorie === 'seance');

  const sauverVacance = async (e) => {
    e.preventDefault();
    try {
      const data = {
        titre: formVacance.nom_vacance,
        nom_vacance: formVacance.nom_vacance,
        date_debut: formVacance.date_debut,
        date_fin: formVacance.date_fin || formVacance.date_debut,
        categorie: 'vacance',
        couleur: COULEURS_VACANCES[formVacance.nom_vacance] || '#f59e0b',
        type: 'Conge'
      };
      if (vacanceEdit) await axios.put(API+'/calendrier/'+vacanceEdit.id, data, {headers});
      else await axios.post(API+'/calendrier', data, {headers});
      setShowFormVacance(false); setVacanceEdit(null);
      setFormVacance({nom_vacance:'',date_debut:'',date_fin:''});
      chargerEvenements();
    } catch(err) { alert('Erreur: '+err.message); }
  };

  const sauverSeance = async (e) => {
    e.preventDefault();
    try {
      const data = {
        titre: formSeance.titre,
        date_debut: formSeance.date_debut,
        date_fin: formSeance.date_debut,
        heure_debut: formSeance.heure_debut,
        heure_fin: formSeance.heure_fin || null,
        categorie: 'seance',
        couleur: '#0369a1',
        type: 'Reunion'
      };
      if (seanceEdit) await axios.put(API+'/calendrier/'+seanceEdit.id, data, {headers});
      else await axios.post(API+'/calendrier', data, {headers});
      setShowFormSeance(false); setSeanceEdit(null);
      setFormSeance({titre:'',date_debut:'',heure_debut:'',heure_fin:''});
      chargerEvenements();
    } catch(err) { alert('Erreur: '+err.message); }
  };

  const supprimerEvenement = async (id) => {
    if (window.confirm('Supprimer ?')) {
      await axios.delete(API+'/calendrier/'+id, {headers});
      chargerEvenements();
    }
  };

  const editVacance = (v) => {
    setVacanceEdit(v);
    setFormVacance({
      nom_vacance: v.nom_vacance || v.titre,
      date_debut: v.date_debut ? v.date_debut.substring(0,10) : '',
      date_fin: v.date_fin ? v.date_fin.substring(0,10) : ''
    });
    setShowFormVacance(true);
  };

  const premierJour = new Date(anneeActuelle, moisActuel, 1);
  const dernierJour = new Date(anneeActuelle, moisActuel+1, 0);
  const debutSemaine = (premierJour.getDay()+6)%7;
  const jours = [];
  for (let i = 0; i < debutSemaine; i++) jours.push(null);
  for (let i = 1; i <= dernierJour.getDate(); i++) jours.push(i);

  const eventsJour = (jour) => {
    if (!jour) return [];
    const dateStr = anneeActuelle+'-'+String(moisActuel+1).padStart(2,'0')+'-'+String(jour).padStart(2,'0');
    return evenements.filter(ev => {
      const deb = ev.date_debut?.substring(0,10);
      const fin = (ev.date_fin || ev.date_debut)?.substring(0,10);
      return dateStr >= deb && dateStr <= fin;
    });
  };

  const today = new Date();
  const isToday = (j) => j === today.getDate() && moisActuel === today.getMonth() && anneeActuelle === today.getFullYear();
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-CH') : '—';

  return (
    <div style={{padding:'24px 28px',background:'#f8fafc',minHeight:'100vh',fontFamily:FONT}}>

      {/* Modal vacance */}
      {showFormVacance && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'white',padding:28,borderRadius:14,width:420,boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:800}}>Modifier une vacance</h3>
              <button style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8'}} onClick={() => setShowFormVacance(false)}>✕</button>
            </div>
            <form onSubmit={sauverVacance}>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div>
                  <label style={s.lbl}>Désignation</label>
                  <input style={{...s.inp,background:'#f8fafc',color:'#64748b'}} readOnly value={formVacance.nom_vacance} />
                </div>
                <div>
                  <label style={s.lbl}>Date de début *</label>
                  <input style={s.inp} type="date" required value={formVacance.date_debut} onChange={e => setFormVacance({...formVacance,date_debut:e.target.value})} />
                </div>
                <div>
                  <label style={s.lbl}>Date de fin</label>
                  <input style={s.inp} type="date" value={formVacance.date_fin} onChange={e => setFormVacance({...formVacance,date_fin:e.target.value})} />
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20}}>
                <button type="button" style={s.btnCancel} onClick={() => setShowFormVacance(false)}>Annuler</button>
                <button type="submit" style={s.btnSave}>Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal séance */}
      {showFormSeance && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'white',padding:28,borderRadius:14,width:420,boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:800}}>{seanceEdit?'Modifier':'Ajouter'} une séance</h3>
              <button style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8'}} onClick={() => setShowFormSeance(false)}>✕</button>
            </div>
            <form onSubmit={sauverSeance}>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div>
                  <label style={s.lbl}>Désignation *</label>
                  <input style={s.inp} required value={formSeance.titre} onChange={e => setFormSeance({...formSeance,titre:e.target.value})} placeholder="Ex: Séance de direction..." />
                </div>
                <div>
                  <label style={s.lbl}>Date *</label>
                  <input style={s.inp} type="date" required value={formSeance.date_debut} onChange={e => setFormSeance({...formSeance,date_debut:e.target.value})} />
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div>
                    <label style={s.lbl}>Heure de début *</label>
                    <input style={s.inp} type="time" required value={formSeance.heure_debut} onChange={e => setFormSeance({...formSeance,heure_debut:e.target.value})} />
                  </div>
                  <div>
                    <label style={s.lbl}>Heure de fin</label>
                    <input style={s.inp} type="time" value={formSeance.heure_fin} onChange={e => setFormSeance({...formSeance,heure_fin:e.target.value})} />
                  </div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20}}>
                <button type="button" style={s.btnCancel} onClick={() => setShowFormSeance(false)}>Annuler</button>
                <button type="submit" style={{...s.btnSave,background:'#0369a1'}}>Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <button style={s.btnBack} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={{fontSize:22,fontWeight:800,color:'#0f172a',flex:1,margin:0}}>📅 Calendrier scolaire</h2>
      </div>

      {/* GRILLE PRINCIPALE : gauche=calendrier+séances, droite=vacances+événements */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:20,alignItems:'start'}}>

        {/* COLONNE GAUCHE */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* CALENDRIER */}
          <div style={{background:'white',borderRadius:14,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',border:'1px solid #f1f5f9',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid #f1f5f9'}}>
              <button style={s.navBtn} onClick={() => { if(moisActuel===0){setMoisActuel(11);setAnneeActuelle(a=>a-1);}else setMoisActuel(m=>m-1); }}>‹</button>
              <span style={{fontSize:17,fontWeight:800,color:'#0f172a'}}>{MOIS[moisActuel]} {anneeActuelle}</span>
              <button style={s.navBtn} onClick={() => { if(moisActuel===11){setMoisActuel(0);setAnneeActuelle(a=>a+1);}else setMoisActuel(m=>m+1); }}>›</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',background:'#f8fafc'}}>
              {JOURS.map(j => <div key={j} style={{padding:'8px 0',textAlign:'center',fontSize:11,fontWeight:700,color:'#94a3b8'}}>{j}</div>)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
              {jours.map((jour, idx) => {
                const evts = eventsJour(jour);
                const estAuj = isToday(jour);
                return (
                  <div key={idx} style={{minHeight:72,padding:'6px 4px',borderRight:'1px solid #f8fafc',borderBottom:'1px solid #f8fafc',background:estAuj?'#eff6ff':jour?'white':'#f8fafc'}}>
                    {jour && (
                      <>
                        <div style={{fontSize:12,fontWeight:estAuj?800:500,width:22,height:22,borderRadius:'50%',background:estAuj?'#2563eb':'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:estAuj?'white':'#374151',marginBottom:2}}>{jour}</div>
                        {evts.slice(0,2).map((ev,i) => (
                          <div key={i} title={ev.titre} style={{fontSize:9,fontWeight:600,color:'white',background:ev.couleur||'#6366f1',borderRadius:3,padding:'1px 4px',marginBottom:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.titre}</div>
                        ))}
                        {evts.length>2 && <div style={{fontSize:9,color:'#94a3b8'}}>+{evts.length-2}</div>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SÉANCES */}
          <div style={{background:'white',borderRadius:14,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',border:'1px solid #f1f5f9',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid #f1f5f9',background:'#f0f9ff'}}>
              <div style={{fontSize:13,fontWeight:800,color:'#0369a1'}}>🤝 Séances & Réunions</div>
              {isAdmin() && <button style={{...s.btnSave,background:'#0369a1',padding:'5px 12px',fontSize:11}} onClick={() => { setSeanceEdit(null); setFormSeance({titre:'',date_debut:'',heure_debut:'',heure_fin:''}); setShowFormSeance(true); }}>+ Ajouter</button>}
            </div>
            <div style={{maxHeight:200,overflowY:'auto'}}>
              {seances.length === 0 ? (
                <div style={{padding:20,textAlign:'center',color:'#94a3b8',fontSize:12}}>Aucune séance planifiée</div>
              ) : seances.map(s2 => (
                <div key={s2.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderBottom:'1px solid #f8fafc'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:'#0369a1',flexShrink:0}}></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{s2.titre}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>
                      {formatDate(s2.date_debut)}
                      {s2.heure_debut ? ' · '+s2.heure_debut.substring(0,5) : ''}
                      {s2.heure_fin ? ' → '+s2.heure_fin.substring(0,5) : ''}
                    </div>
                  </div>
                  {isAdmin() && (
                    <div style={{display:'flex',gap:4}}>
                      <button style={s.btnIcon} onClick={() => { setSeanceEdit(s2); setFormSeance({titre:s2.titre,date_debut:s2.date_debut?.substring(0,10)||'',heure_debut:s2.heure_debut?.substring(0,5)||'',heure_fin:s2.heure_fin?.substring(0,5)||''}); setShowFormSeance(true); }}>✏️</button>
                      <button style={s.btnIcon} onClick={() => supprimerEvenement(s2.id)}>🗑️</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLONNE DROITE */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* VACANCES */}
          <div style={{background:'white',borderRadius:14,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',border:'1px solid #f1f5f9',overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',background:'#fffbeb'}}>
              <div style={{fontSize:13,fontWeight:800,color:'#92400e'}}>🏖️ Vacances & Jours fériés</div>
            </div>
            <div style={{maxHeight:520,overflowY:'auto'}}>
              {vacances.length === 0 ? (
                <div style={{padding:20,textAlign:'center',color:'#94a3b8',fontSize:12}}>Aucune vacance définie</div>
              ) : vacances.map(v => (
                <div key={v.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderBottom:'1px solid #f8fafc'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:v.couleur||'#f59e0b',flexShrink:0}}></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.nom_vacance||v.titre}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{formatDate(v.date_debut)}{v.date_fin && v.date_fin!==v.date_debut?' → '+formatDate(v.date_fin):''}</div>
                  </div>
                  {isAdmin() && <button style={s.btnIcon} onClick={() => editVacance(v)}>✏️</button>}
                </div>
              ))}
            </div>
          </div>

          {/* ÉVÉNEMENTS PARTICULIERS */}
          <div style={{background:'white',borderRadius:14,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',border:'1px solid #f1f5f9',overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',background:'#fdf4ff'}}>
              <div style={{fontSize:13,fontWeight:800,color:'#7e22ce'}}>✨ Événements particuliers</div>
              <div style={{fontSize:11,color:'#9333ea'}}>À configurer prochainement</div>
            </div>
            <div style={{padding:20,textAlign:'center',color:'#94a3b8',fontSize:12}}>Aucun événement particulier</div>
          </div>

        </div>
      </div>
    </div>
  );
}

const s = {
  lbl:{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569',display:'block'},
  inp:{padding:'8px 10px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:13,outline:'none',width:'100%',boxSizing:'border-box'},
  btnBack:{padding:'8px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#475569'},
  navBtn:{width:32,height:32,border:'1px solid #e2e8f0',borderRadius:8,background:'white',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'},
  btnCancel:{padding:'8px 16px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#64748b'},
  btnSave:{padding:'8px 18px',background:'#f59e0b',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  btnIcon:{background:'none',border:'none',cursor:'pointer',fontSize:13,opacity:0.7,padding:'2px'},
};