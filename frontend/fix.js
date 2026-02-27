const fs = require('fs');

fs.writeFileSync('./src/pages/EmploiDuTemps.js', `
import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';
const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];
const COULEURS = ['#1a73e8','#34a853','#ea4335','#9c27b0','#ff9800','#00bcd4','#795548'];
const TYPES_COURS = ['cours','titulariat','atelier','autre'];

export default function EmploiDuTemps() {
  const [onglet, setOnglet] = useState('disponibilites');
  const [profs, setProfs] = useState([]);
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [creneaux, setCreneaux] = useState([]);
  const [pools, setPools] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [profSelectionne, setProfSelectionne] = useState(null);
  const [dispos, setDispos] = useState({});
  const [planningGeneral, setPlanningGeneral] = useState(null);
  const [planningPoolId, setPlanningPoolId] = useState('');
  const [planningProf, setPlanningProf] = useState(null);
  const [profPlanningId, setProfPlanningId] = useState('');
  const [planningClasse, setPlanningClasse] = useState(null);
  const [classePlanningId, setClassePlanningId] = useState('');
  const [showPoolForm, setShowPoolForm] = useState(false);
  const [poolEdit, setPoolEdit] = useState(null);
  const [poolForm, setPoolForm] = useState({ nom:'', site:'', couleur:'#1a73e8', prof_ids:[], classe_ids:[] });
  const [poolAffId, setPoolAffId] = useState('');
  const [classePeriodesMap, setClassePeriodesMap] = useState({});
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerTout(); }, []);

  const chargerTout = async () => {
    try {
      const [p, cl, m, cr, po, af] = await Promise.all([
        axios.get(API + '/profs', { headers }),
        axios.get(API + '/classes', { headers }),
        axios.get(API + '/branches', { headers }),
        axios.get(API + '/planning/creneaux', { headers }),
        axios.get(API + '/planning/pools', { headers }),
        axios.get(API + '/planning/affectations', { headers }),
      ]);
      setProfs(p.data);
      setClasses(cl.data);
      setMatieres(m.data);
      setCreneaux(cr.data);
      setPools(po.data);
      setAffectations(af.data);
    } catch(err) { console.error(err); }
  };

  const chargerDispos = async (prof_id) => {
    const r = await axios.get(API + '/planning/disponibilites/' + prof_id, { headers });
    const map = {};
    creneaux.forEach(c => { map[c.id] = true; });
    r.data.forEach(d => { map[d.creneau_id] = d.disponible; });
    setDispos(map);
    setProfSelectionne(prof_id);
  };

  const sauverDispos = async () => {
    const liste = Object.entries(dispos).map(([creneau_id, disponible]) => ({ creneau_id: parseInt(creneau_id), disponible }));
    await axios.post(API + '/planning/disponibilites/' + profSelectionne, { disponibilites: liste }, { headers });
    alert('Disponibilités sauvegardées !');
  };

  const toggleDispo = (creneau_id) => setDispos(prev => ({ ...prev, [creneau_id]: !prev[creneau_id] }));

  const creneauxParJour = (jour) => creneaux.filter(c => c.jour === jour);

  const handleSavePool = async () => {
    try {
      if (poolEdit) {
        await axios.put(API + '/planning/pools/' + poolEdit.id, poolForm, { headers });
      } else {
        await axios.post(API + '/planning/pools', poolForm, { headers });
      }
      setShowPoolForm(false); setPoolEdit(null);
      setPoolForm({ nom:'', site:'', couleur:'#1a73e8', prof_ids:[], classe_ids:[] });
      chargerTout();
    } catch(err) { alert(err.response?.data?.message || err.message); }
  };

  const toggleProfPool = (id) => setPoolForm(prev => ({ ...prev, prof_ids: prev.prof_ids.includes(id) ? prev.prof_ids.filter(x => x !== id) : [...prev.prof_ids, id] }));
  const toggleClassePool = (id) => setPoolForm(prev => ({ ...prev, classe_ids: prev.classe_ids.includes(id) ? prev.classe_ids.filter(x => x !== id) : [...prev.classe_ids, id] }));

  const poolSelectionne = pools.find(p => p.id == poolAffId);
  const profsPool = poolSelectionne ? poolSelectionne.profs : profs;
  const classesPool = poolSelectionne ? poolSelectionne.classes : classes;

  const getAffectation = (classe_id, creneau_id) => affectations.find(a => a.classe_id == classe_id && a.creneau_id == creneau_id);

  const handleCellChange = async (classe_id, creneau_id, value) => {
    if (!isAdmin()) return;
    if (!value) {
      const aff = getAffectation(classe_id, creneau_id);
      if (aff) await axios.delete(API + '/planning/affectations/' + aff.id, { headers });
    } else {
      const [type, prof_id, matiere_id] = value.split('|');
      if (type === 'special') {
        await axios.post(API + '/planning/affectations', { prof_id: prof_id || null, classe_id, creneau_id, matiere_id: matiere_id || null }, { headers });
      } else {
        await axios.post(API + '/planning/affectations', { prof_id: value, classe_id, creneau_id }, { headers });
      }
    }
    chargerTout();
  };

  const chargerPlanningGeneral = async (pool_id) => {
    const url = API + '/planning/general' + (pool_id ? '?pool_id=' + pool_id : '');
    const r = await axios.get(url, { headers });
    setPlanningGeneral(r.data);
  };

  const chargerPlanningProf = async (id) => {
    const r = await axios.get(API + '/planning/prof/' + id, { headers });
    setPlanningProf(r.data);
  };

  const chargerPlanningClasse = async (id) => {
    const r = await axios.get(API + '/planning/classe/' + id, { headers });
    setPlanningClasse(r.data);
  };

  const periodeLabel = (ordre, periode) => {
    const num = periode === 'Matin' ? ordre : ordre;
    return 'P' + num;
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={styles.titre}>📅 Emploi du Temps</h2>
      </div>

      <div style={styles.onglets}>
        {[
          {id:'disponibilites', label:'✅ Disponibilités'},
          {id:'pools', label:'👥 Pools'},
          {id:'affectations', label:'📌 Affectations'},
          {id:'general', label:'📊 Planning Général'},
          {id:'prof', label:'👨‍🏫 Planning Prof'},
          {id:'classe', label:'🏫 Planning Classe'},
        ].map(o => (
          <button key={o.id} style={{...styles.onglet, ...(onglet===o.id?styles.ongletActif:{})}}
            onClick={() => { setOnglet(o.id); if(o.id==='general') chargerPlanningGeneral(''); }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* ===== DISPONIBILITÉS ===== */}
      {onglet === 'disponibilites' && (
        <div>
          <div style={styles.card}>
            <h3 style={styles.cardTitre}>Sélectionner un professeur</h3>
            <div style={styles.flexWrap}>
              {profs.map(p => (
                <button key={p.id} style={{...styles.profBtn, ...(profSelectionne==p.id?styles.profBtnActif:{})}}
                  onClick={() => chargerDispos(p.id)}>
                  {p.nom} {p.prenom}
                </button>
              ))}
            </div>
          </div>

          {profSelectionne && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitre}>
                  {profs.find(p=>p.id==profSelectionne)?.nom} {profs.find(p=>p.id==profSelectionne)?.prenom}
                </h3>
                {isAdmin() && <button style={styles.btnBleu} onClick={sauverDispos}>💾 Sauvegarder</button>}
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={styles.tableDispos}>
                  <thead>
                    <tr>
                      <th style={styles.thDispo}>Période</th>
                      {JOURS.map(j => <th key={j} style={styles.thDispo}>{j}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {['Matin','Après-midi'].map(periode => {
                      const crsBase = creneaux.filter(c => c.jour==='Lundi' && c.periode===periode);
                      return crsBase.map((crBase, idx) => (
                        <tr key={crBase.id}>
                          <td style={styles.tdPeriode}>P{idx+1} {periode==='Après-midi'?'(AM)':'(M)'}<br/><span style={{fontSize:11,color:'#888'}}>{crBase.heure_debut}–{crBase.heure_fin}</span></td>
                          {JOURS.map(jour => {
                            const cr = creneaux.find(c => c.jour===jour && c.periode===periode && c.ordre===crBase.ordre);
                            if (!cr) return <td key={jour} style={{...styles.tdDispo, background:'#f5f5f5'}}></td>;
                            const ok = dispos[cr.id] !== false;
                            return (
                              <td key={jour} style={{...styles.tdDispo, background: ok?'#e8f5e9':'#fce4ec', cursor: isAdmin()?'pointer':'default'}}
                                onClick={() => isAdmin() && toggleDispo(cr.id)}>
                                <span style={{fontSize:18}}>{ok?'✅':'❌'}</span>
                              </td>
                            );
                          })}
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== POOLS ===== */}
      {onglet === 'pools' && (
        <div>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitre}>Pools de professeurs</h3>
            {isAdmin() && <button style={styles.btnVert} onClick={() => { setShowPoolForm(true); setPoolEdit(null); setPoolForm({nom:'',site:'',couleur:'#1a73e8',prof_ids:[],classe_ids:[]}); }}>+ Nouveau pool</button>}
          </div>

          {showPoolForm && (
            <div style={styles.overlay}>
              <div style={styles.modal}>
                <h3 style={styles.modalTitre}>{poolEdit?'Modifier':'Créer'} un pool</h3>
                <div style={styles.formGrid}>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Nom *</label>
                    <input style={styles.input} value={poolForm.nom} onChange={e => setPoolForm({...poolForm, nom:e.target.value})} />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Site</label>
                    <input style={styles.input} value={poolForm.site} onChange={e => setPoolForm({...poolForm, site:e.target.value})} />
                  </div>
                  <div style={{...styles.formChamp, gridColumn:'1/-1'}}>
                    <label style={styles.label}>Couleur</label>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:6}}>
                      {COULEURS.map(c => <div key={c} onClick={() => setPoolForm({...poolForm,couleur:c})}
                        style={{width:28,height:28,borderRadius:'50%',background:c,cursor:'pointer',border:poolForm.couleur===c?'3px solid #333':'3px solid transparent'}} />)}
                    </div>
                  </div>
                  <div style={{...styles.formChamp, gridColumn:'1/-1'}}>
                    <label style={styles.label}>Professeurs</label>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>
                      {profs.map(p => (
                        <label key={p.id} style={{...styles.checkBadge, background:poolForm.prof_ids.includes(p.id)?poolForm.couleur:'#f0f0f0', color:poolForm.prof_ids.includes(p.id)?'white':'#333'}}>
                          <input type="checkbox" checked={poolForm.prof_ids.includes(p.id)} onChange={() => toggleProfPool(p.id)} style={{marginRight:4}} />
                          {p.nom} {p.prenom}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{...styles.formChamp, gridColumn:'1/-1'}}>
                    <label style={styles.label}>Classes</label>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>
                      {classes.map(c => (
                        <label key={c.id} style={{...styles.checkBadge, background:poolForm.classe_ids.includes(c.id)?poolForm.couleur:'#f0f0f0', color:poolForm.classe_ids.includes(c.id)?'white':'#333'}}>
                          <input type="checkbox" checked={poolForm.classe_ids.includes(c.id)} onChange={() => toggleClassePool(c.id)} style={{marginRight:4}} />
                          {c.nom}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={styles.formActions}>
                  <button style={styles.btnAnnuler} onClick={() => setShowPoolForm(false)}>Annuler</button>
                  <button style={styles.btnVert} onClick={handleSavePool}>Sauvegarder</button>
                </div>
              </div>
            </div>
          )}

          <div style={styles.poolsGrid}>
            {pools.map(pool => (
              <div key={pool.id} style={{...styles.poolCard, borderTop:'4px solid '+pool.couleur}}>
                <div style={styles.cardHeader}>
                  <div>
                    <div style={{fontWeight:700,fontSize:16}}>{pool.nom}</div>
                    {pool.site && <div style={{color:'#888',fontSize:13}}>📍 {pool.site}</div>}
                  </div>
                  {isAdmin() && (
                    <div>
                      <button style={styles.btnIcon} onClick={() => { setPoolEdit(pool); setShowPoolForm(true); setPoolForm({nom:pool.nom,site:pool.site||'',couleur:pool.couleur,prof_ids:pool.profs.map(p=>p.id),classe_ids:pool.classes.map(c=>c.id)}); }}>✏️</button>
                      <button style={styles.btnIcon} onClick={async () => { if(window.confirm('Supprimer ?')) { await axios.delete(API+'/planning/pools/'+pool.id,{headers}); chargerTout(); } }}>🗑️</button>
                    </div>
                  )}
                </div>
                <div style={{marginTop:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#888',marginBottom:4}}>PROFS</div>
                  {pool.profs.map(p => <span key={p.id} style={{...styles.badge, background:pool.couleur+'22', color:pool.couleur}}>{p.nom} {p.prenom}</span>)}
                  {pool.profs.length===0 && <span style={{color:'#ccc',fontSize:12}}>Aucun</span>}
                </div>
                <div style={{marginTop:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#888',marginBottom:4}}>CLASSES</div>
                  {pool.classes.map(c => <span key={c.id} style={{...styles.badge, background:'#e8f0fe', color:'#1a73e8'}}>{c.nom}</span>)}
                  {pool.classes.length===0 && <span style={{color:'#ccc',fontSize:12}}>Aucune</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== AFFECTATIONS ===== */}
      {onglet === 'affectations' && (
        <div>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitre}>Grille d'affectation</h3>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <select style={styles.selectPool} value={poolAffId} onChange={e => setPoolAffId(e.target.value)}>
                  <option value="">— Tous les profs/classes —</option>
                  {pools.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </select>
              </div>
            </div>

            {classesPool.length === 0 ? (
              <p style={{color:'#888'}}>Sélectionne un pool ou vérifie que des classes y sont associées.</p>
            ) : (
              <div style={{overflowX:'auto'}}>
                <table style={{...styles.table, minWidth: 200 + classesPool.length * 150}}>
                  <thead>
                    <tr style={styles.theadRow}>
                      <th style={{...styles.th, minWidth:130}}>Créneau</th>
                      {classesPool.map(c => <th key={c.id} style={{...styles.th, minWidth:140}}>{c.nom}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {JOURS.map(jour => {
                      const crs = creneaux.filter(c => c.jour===jour);
                      if (crs.length===0) return null;
                      return [
                        <tr key={jour+'_h'}>
                          <td colSpan={classesPool.length+1} style={styles.jourBande}>{jour}</td>
                        </tr>,
                        ...['Matin','Après-midi'].map(periode => {
                          const crsPeriode = crs.filter(c => c.periode===periode);
                          if (crsPeriode.length===0) return null;
                          return [
                            <tr key={jour+periode+'_ph'}>
                              <td colSpan={classesPool.length+1} style={styles.periodeBande}>{periode}</td>
                            </tr>,
                            ...crsPeriode.map((cr, idx) => (
                              <tr key={cr.id} style={styles.tr}>
                                <td style={{...styles.td, background:'#f8f9fa', fontWeight:600, fontSize:12, whiteSpace:'nowrap'}}>
                                  P{idx+1} — {cr.heure_debut}–{cr.heure_fin}
                                </td>
                                {classesPool.map(classe => {
                                  const aff = getAffectation(classe.id, cr.id);
                                  return (
                                    <td key={classe.id} style={{...styles.td, padding:4}}>
                                      <select style={{...styles.cellSelect, background: aff ? '#e8f5e9' : '#fff'}}
                                        value={aff ? aff.prof_id : ''}
                                        onChange={e => handleCellChange(classe.id, cr.id, e.target.value)}
                                        disabled={!isAdmin()}>
                                        <option value="">—</option>
                                        <optgroup label="Professeurs">
                                          {profsPool.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
                                        </optgroup>
                                        <optgroup label="Spécial">
                                          <option value="special|null|titulariat">Titulariat</option>
                                          <option value="special|null|atelier">Atelier</option>
                                          <option value="special|null|autre">Autre</option>
                                        </optgroup>
                                      </select>
                                      {aff && aff.matiere_nom && <div style={{fontSize:10,color:'#666',textAlign:'center'}}>{aff.matiere_nom}</div>}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))
                          ];
                        })
                      ];
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== PLANNING GÉNÉRAL ===== */}
      {onglet === 'general' && (
        <div>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitre}>Planning général</h3>
            <select style={styles.selectPool} value={planningPoolId}
              onChange={e => { setPlanningPoolId(e.target.value); chargerPlanningGeneral(e.target.value); }}>
              <option value="">Tous les professeurs</option>
              {pools.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>

          {planningGeneral && (
            <div style={{overflowX:'auto'}}>
              <table style={{...styles.table, minWidth: 200 + planningGeneral.profs.length * 120}}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{...styles.th, minWidth:130}}>Créneau</th>
                    {planningGeneral.profs.map(p => <th key={p.id} style={styles.th}>{p.nom}<br/><span style={{fontWeight:400,fontSize:11}}>{p.prenom}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {JOURS.map(jour => {
                    const crs = planningGeneral.creneaux.filter(c => c.jour===jour);
                    if (crs.length===0) return null;
                    return [
                      <tr key={jour+'_h'}><td colSpan={planningGeneral.profs.length+1} style={styles.jourBande}>{jour}</td></tr>,
                      ...crs.map(cr => (
                        <tr key={cr.id} style={styles.tr}>
                          <td style={{...styles.td, background:'#f8f9fa', fontSize:11, fontWeight:600, whiteSpace:'nowrap'}}>
                            {cr.heure_debut}–{cr.heure_fin}<br/><span style={{color:'#999'}}>{cr.periode}</span>
                          </td>
                          {planningGeneral.profs.map(p => {
                            const aff = planningGeneral.affectations.find(a => a.prof_id===p.id && a.creneau_id===cr.id);
                            const dispo = planningGeneral.dispos.find(d => d.prof_id===p.id && d.creneau_id===cr.id);
                            const indispo = dispo && !dispo.disponible;
                            return (
                              <td key={p.id} style={{...styles.td, textAlign:'center', fontSize:11,
                                background: aff?'#e8f5e9': indispo?'#eeeeee':'#fff'}}>
                                {aff ? <><b style={{color:'#2e7d32'}}>{aff.classe_nom}</b>{aff.matiere_nom&&<><br/><span style={{color:'#888'}}>{aff.matiere_nom}</span></>}</> : ''}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== PLANNING PROF ===== */}
      {onglet === 'prof' && (
        <div>
          <div style={{...styles.card, marginBottom:16}}>
            <h3 style={styles.cardTitre}>Sélectionner un professeur</h3>
            <div style={styles.flexWrap}>
              {profs.map(p => (
                <button key={p.id} style={{...styles.profBtn,...(profPlanningId==p.id?styles.profBtnActif:{})}}
                  onClick={() => { setProfPlanningId(p.id); chargerPlanningProf(p.id); }}>
                  {p.nom} {p.prenom}
                </button>
              ))}
            </div>
          </div>

          {planningProf && profPlanningId && (
            <div style={{overflowX:'auto'}}>
              <div style={{fontWeight:700,fontSize:18,marginBottom:12}}>{planningProf.prof?.nom} {planningProf.prof?.prenom}</div>
              <table style={{...styles.table, minWidth:700}}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{...styles.th,minWidth:130}}>Créneau</th>
                    {JOURS.map(j => <th key={j} style={styles.th}>{j}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {['Matin','Après-midi'].map(periode => {
                    const crsBase = (planningProf.creneaux||[]).filter(c => c.jour==='Lundi' && c.periode===periode);
                    if (crsBase.length===0) return null;
                    return [
                      <tr key={periode}><td colSpan={6} style={styles.periodeBande}>{periode}</td></tr>,
                      ...crsBase.map((crBase, idx) => (
                        <tr key={crBase.id} style={styles.tr}>
                          <td style={{...styles.td,background:'#f8f9fa',fontWeight:600,fontSize:12,whiteSpace:'nowrap'}}>
                            P{idx+1} — {crBase.heure_debut}–{crBase.heure_fin}
                          </td>
                          {JOURS.map(jour => {
                            const cr = (planningProf.creneaux||[]).find(c => c.jour===jour && c.periode===periode && c.ordre===crBase.ordre);
                            if (!cr) return <td key={jour} style={{...styles.td,background:'#f5f5f5'}}></td>;
                            const aff = (planningProf.affectations||[]).find(a => a.creneau_id===cr.id);
                            const dispo = planningProf.dispos?.find(d => d.creneau_id===cr.id);
                            const indispo = dispo && !dispo.disponible;
                            return (
                              <td key={jour} style={{...styles.td, textAlign:'center', fontSize:12,
                                background: aff?'#e8f5e9': indispo?'#eeeeee':'#fff'}}>
                                {aff ? <>
                                  <b style={{color:'#2e7d32'}}>{aff.classe_nom}</b>
                                  {aff.matiere_nom && <><br/><span style={{color:'#666',fontSize:11}}>{aff.matiere_nom}</span></>}
                                </> : indispo ? '' : <span style={{color:'#ccc',fontSize:11}}>libre</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== PLANNING CLASSE ===== */}
      {onglet === 'classe' && (
        <div>
          <div style={{...styles.card, marginBottom:16}}>
            <h3 style={styles.cardTitre}>Sélectionner une classe</h3>
            <div style={styles.flexWrap}>
              {classes.map(c => (
                <button key={c.id} style={{...styles.profBtn,...(classePlanningId==c.id?styles.profBtnActif:{})}}
                  onClick={() => { setClassePlanningId(c.id); chargerPlanningClasse(c.id); }}>
                  {c.nom}
                </button>
              ))}
            </div>
          </div>

          {planningClasse && classePlanningId && (
            <div style={{overflowX:'auto'}}>
              <div style={{fontWeight:700,fontSize:18,marginBottom:12}}>Classe : {planningClasse.classe?.nom}</div>
              <table style={{...styles.table, minWidth:700}}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{...styles.th,minWidth:130}}>Créneau</th>
                    {JOURS.map(j => <th key={j} style={styles.th}>{j}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {['Matin','Après-midi'].map(periode => {
                    const crsBase = (planningClasse.creneaux||[]).filter(c => c.jour==='Lundi' && c.periode===periode);
                    if (crsBase.length===0) return null;
                    return [
                      <tr key={periode}><td colSpan={6} style={styles.periodeBande}>{periode}</td></tr>,
                      ...crsBase.map((crBase, idx) => (
                        <tr key={crBase.id} style={styles.tr}>
                          <td style={{...styles.td,background:'#f8f9fa',fontWeight:600,fontSize:12,whiteSpace:'nowrap'}}>
                            P{idx+1} — {crBase.heure_debut}–{crBase.heure_fin}
                          </td>
                          {JOURS.map(jour => {
                            const cr = (planningClasse.creneaux||[]).find(c => c.jour===jour && c.periode===periode && c.ordre===crBase.ordre);
                            if (!cr) return <td key={jour} style={{...styles.td,background:'#f5f5f5'}}></td>;
                            const aff = (planningClasse.affectations||[]).find(a => a.creneau_id===cr.id);
                            const periode_cl = planningClasse.periodes?.find(p => p.creneau_id===cr.id);
                            return (
                              <td key={jour} style={{...styles.td,textAlign:'center',fontSize:12, background: aff?'#e8f5e9':periode_cl?'#fff3e0':'#f5f5f5'}}>
                                {aff ? <>
                                  <b style={{color:'#2e7d32'}}>{aff.prof_nom}</b>
                                  {aff.matiere_nom && <><br/><span style={{color:'#666',fontSize:11}}>{aff.matiere_nom}</span></>}
                                </> : periode_cl ? <span style={{color:'#f57c00',fontSize:11}}>à affecter</span> : ''}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding:20, background:'#f0f2f5', minHeight:'100vh' },
  header: { display:'flex', alignItems:'center', gap:15, marginBottom:20 },
  btnRetour: { padding:'8px 16px', background:'white', border:'2px solid #e0e0e0', borderRadius:8, cursor:'pointer' },
  titre: { fontSize:24, fontWeight:700 },
  onglets: { display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' },
  onglet: { padding:'10px 16px', background:'white', border:'2px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 },
  ongletActif: { background:'#1a73e8', color:'white', border:'2px solid #1a73e8' },
  card: { background:'white', borderRadius:12, padding:20, marginBottom:20, boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  cardTitre: { fontSize:16, fontWeight:700, margin:0 },
  flexWrap: { display:'flex', flexWrap:'wrap', gap:8 },
  profBtn: { padding:'8px 14px', background:'white', border:'2px solid #e0e0e0', borderRadius:20, cursor:'pointer', fontSize:13 },
  profBtnActif: { background:'#1a73e8', color:'white', border:'2px solid #1a73e8' },
  tableDispos: { width:'100%', borderCollapse:'collapse', fontSize:13 },
  thDispo: { padding:'10px 14px', background:'#1a73e8', color:'white', fontWeight:600, textAlign:'center', border:'1px solid #1565c0' },
  tdPeriode: { padding:'8px 12px', background:'#f8f9fa', fontWeight:600, fontSize:12, border:'1px solid #e0e0e0', whiteSpace:'nowrap' },
  tdDispo: { padding:'6px', textAlign:'center', border:'1px solid #e0e0e0', cursor:'pointer' },
  btnBleu: { padding:'8px 16px', background:'#1a73e8', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 },
  btnVert: { padding:'10px 18px', background:'#34a853', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 },
  btnAnnuler: { padding:'10px 18px', background:'#f5f5f5', border:'none', borderRadius:8, cursor:'pointer' },
  btnIcon: { background:'none', border:'none', cursor:'pointer', fontSize:16, marginLeft:6 },
  selectPool: { padding:'8px 12px', border:'2px solid #e0e0e0', borderRadius:8, fontSize:14, cursor:'pointer' },
  overlay: { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'white', padding:30, borderRadius:16, width:580, maxHeight:'85vh', overflowY:'auto' },
  modalTitre: { fontSize:20, fontWeight:700, marginBottom:20 },
  formGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:15 },
  formChamp: { display:'flex', flexDirection:'column' },
  label: { fontSize:13, fontWeight:600, marginBottom:5, color:'#555' },
  input: { padding:10, border:'2px solid #e0e0e0', borderRadius:8, fontSize:14 },
  formActions: { display:'flex', justifyContent:'flex-end', gap:10, marginTop:20 },
  checkBadge: { padding:'5px 10px', borderRadius:16, cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center' },
  poolsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16, marginTop:16 },
  poolCard: { background:'white', borderRadius:12, padding:20, boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
  badge: { display:'inline-block', padding:'3px 10px', borderRadius:12, fontSize:12, fontWeight:600, margin:'2px 3px 2px 0' },
  table: { width:'100%', borderCollapse:'collapse', background:'white', borderRadius:12, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
  theadRow: { background:'#1a73e8', color:'white' },
  th: { padding:'11px 12px', textAlign:'left', fontSize:12, fontWeight:600 },
  tr: { borderBottom:'1px solid #f0f0f0' },
  td: { padding:'8px 12px', fontSize:13 },
  jourBande: { background:'#e8eaf6', padding:'7px 14px', fontWeight:700, fontSize:13, color:'#3949ab' },
  periodeBande: { background:'#f3f4f6', padding:'5px 14px', fontWeight:600, fontSize:12, color:'#666' },
  cellSelect: { width:'100%', padding:'5px 6px', border:'1px solid #e0e0e0', borderRadius:6, fontSize:12, cursor:'pointer' },
};
`.trim());

console.log('EmploiDuTemps.js OK !');