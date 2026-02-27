import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';
const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];
const COULEURS = ['#1a73e8','#34a853','#ea4335','#9c27b0','#ff9800','#00bcd4','#795548'];
const HORAIRES_DEFAUT = [
  {periode:'Matin',num:1,debut:'08:20',fin:'09:05'},
  {periode:'Matin',num:2,debut:'09:05',fin:'09:45'},
  {periode:'Matin',num:3,debut:'10:05',fin:'10:55'},
  {periode:'Matin',num:4,debut:'10:55',fin:'11:40'},
  {periode:'Après-midi',num:1,debut:'13:30',fin:'14:15'},
  {periode:'Après-midi',num:2,debut:'14:15',fin:'15:00'},
  {periode:'Après-midi',num:3,debut:'15:20',fin:'16:05'},
  {periode:'Après-midi',num:4,debut:'16:05',fin:'16:50'},
];

export default function EmploiDuTemps() {
  const [onglet, setOnglet] = useState('disponibilites');
  const [sousOngletAff, setSousOngletAff] = useState('classes');
  const [profs, setProfs] = useState([]);
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [creneaux, setCreneaux] = useState([]);
  const [pools, setPools] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [classeHoraires, setClasseHoraires] = useState([]);
  const [profSelectionne, setProfSelectionne] = useState(null);
  const [dispos, setDispos] = useState({});
  const [planningGeneral, setPlanningGeneral] = useState(null);
  const [planningPoolId, setPlanningPoolId] = useState('');
  const [planningProf, setPlanningProf] = useState(null);
  const [profPlanningId, setProfPlanningId] = useState('');
  const [planningClasse, setPlanningClasse] = useState(null);
  const [classePlanningId, setClassePlanningId] = useState('');
  const [classePlanningPoolId, setClassePlanningPoolId] = useState('');
  const [planningBranches, setPlanningBranches] = useState([]);
  const [showPoolForm, setShowPoolForm] = useState(false);
  const [poolEdit, setPoolEdit] = useState(null);
  const [poolForm, setPoolForm] = useState({nom:'',site:'',couleur:'#1a73e8',prof_ids:[],classe_ids:[],branche_ids:[],horaires:[...HORAIRES_DEFAUT]});
  const [poolAffId, setPoolAffId] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerTout(); }, []);

  const chargerTout = async () => {
    try {
      const [p, cl, m, cr, po, af, ch] = await Promise.all([
        axios.get(API + '/profs', { headers }),
        axios.get(API + '/classes', { headers }),
        axios.get(API + '/branches', { headers }),
        axios.get(API + '/planning/creneaux', { headers }),
        axios.get(API + '/planning/pools', { headers }),
        axios.get(API + '/planning/affectations', { headers }),
        axios.get(API + '/planning/classe-horaires', { headers }),
      ]);
      setProfs(p.data);
      setClasses(cl.data);
      setMatieres(m.data);
      setCreneaux(cr.data);
      setPools(po.data);
      setAffectations(af.data);
      setClasseHoraires(ch.data);
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

  const creneauxParJourPeriode = (jour, periode) => creneaux.filter(c => c.jour===jour && c.periode===periode);

  // Horaires du pool sélectionné ou défaut
  const getHorairesPool = (pool_id) => {
    const p = pools.find(x => x.id == pool_id);
    if (p && p.horaires && p.horaires.length === 8) return p.horaires;
    return HORAIRES_DEFAUT;
  };

  const handleSavePool = async () => {
    try {
      if (poolEdit) {
        await axios.put(API + '/planning/pools/' + poolEdit.id, poolForm, { headers });
      } else {
        await axios.post(API + '/planning/pools', poolForm, { headers });
      }
      setShowPoolForm(false); setPoolEdit(null);
      setPoolForm({nom:'',site:'',couleur:'#1a73e8',prof_ids:[],classe_ids:[],branche_ids:[],horaires:[...HORAIRES_DEFAUT]});
      chargerTout();
    } catch(err) { alert(err.response?.data?.message || err.message); }
  };

  const toggleArr = (arr, id) => arr.includes(id) ? arr.filter(x=>x!==id) : [...arr, id];

  // Classe horaires helpers
  const classeAHoraire = (classe_id, jour, periode) =>
    classeHoraires.some(h => h.classe_id==classe_id && h.jour===jour && h.periode===periode);

  const toggleClasseHoraire = async (classe_id, jour, periode) => {
    if (!isAdmin()) return;
    const aHoraire = classeAHoraire(classe_id, jour, periode);
    const autrePeriode = periode==='Matin'?'Après-midi':'Matin';
    let nouveaux = classeHoraires.filter(h => !(h.classe_id==classe_id && h.jour===jour));
    if (!aHoraire) {
      nouveaux = [...nouveaux, {classe_id, jour, periode}];
    }
    setClasseHoraires(nouveaux);
    const horairesClasse = nouveaux.filter(h => h.classe_id==classe_id).map(h => ({jour:h.jour, periode:h.periode}));
    await axios.post(API + '/planning/classe-horaires/' + classe_id, { horaires: horairesClasse }, { headers });
    chargerTout();
  };

  // Affectations
  const getAffectation = (classe_id, creneau_id) => affectations.find(a => a.classe_id==classe_id && a.creneau_id==creneau_id);

  const handleCellChange = async (classe_id, creneau_id, prof_id) => {
    if (!isAdmin()) return;
    if (!prof_id) {
      const aff = getAffectation(classe_id, creneau_id);
      if (aff) await axios.delete(API + '/planning/affectations/' + aff.id, { headers });
    } else {
      await axios.post(API + '/planning/affectations', { prof_id, classe_id, creneau_id }, { headers });
    }
    chargerTout();
  };

  // Planning branches
  const chargerPlanningBranches = async (pool_id) => {
    const r = await axios.get(API + '/planning-branches?pool_id=' + pool_id, { headers });
    setPlanningBranches(r.data);
  };

  const getPlanningBranche = (classe_id, matiere_id) =>
    planningBranches.find(pb => pb.classe_id==classe_id && pb.matiere_id==matiere_id);

  const handleBrancheChange = async (classe_id, matiere_id, pool_id, prof_id) => {
    if (!isAdmin()) return;
    if (!prof_id) {
      await axios.delete(API + '/planning-branches', { data: {classe_id, matiere_id, pool_id}, headers });
    } else {
      // Vérifier nombre de périodes
      const matiere = matieres.find(m => m.id==matiere_id);
      if (matiere && matiere.periodes_semaine) {
        const pool = pools.find(p => p.id==pool_id);
        const classesPool = pool ? pool.classes : classes;
        const total = planningBranches.filter(pb => pb.matiere_id==matiere_id).length;
        if (total >= matiere.periodes_semaine * classesPool.length) {
          alert('⚠️ Nombre maximum de périodes atteint pour ' + matiere.nom + ' (' + matiere.periodes_semaine + ' période(s)/semaine) !');
          return;
        }
      }
      await axios.post(API + '/planning-branches', { prof_id, classe_id, matiere_id, pool_id }, { headers });
    }
    chargerPlanningBranches(pool_id);
  };

  const chargerPlanningGeneral = async (pid) => {
    const url = API + '/planning/general' + (pid ? '?pool_id='+pid : '');
    const r = await axios.get(url, { headers });
    setPlanningGeneral(r.data);
  };

  const chargerPlanningProf = async (id) => {
    const r = await axios.get(API + '/planning/prof/' + id, { headers });
    setPlanningProf(r.data);
  };

  const chargerPlanningClasse = async (id, pool_id) => {
    const url = API + '/planning/classe/' + id + (pool_id ? '?pool_id='+pool_id : '');
    const r = await axios.get(url, { headers });
    setPlanningClasse(r.data);
    chargerPlanningBranches(pool_id);
  };

  const poolSelectionne = pools.find(p => p.id == poolAffId);
  const profsPool = poolSelectionne ? poolSelectionne.profs : profs;
  const classesPool = poolSelectionne ? poolSelectionne.classes : classes;

  const poolClasseP = pools.find(p => p.id == classePlanningPoolId);
  const classesPoolP = poolClasseP ? poolClasseP.classes : classes;
  const branchesPoolP = poolClasseP ? poolClasseP.branches : matieres;
  const profsPoolP = poolClasseP ? poolClasseP.profs : profs;

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
          {id:'classe', label:'🏫 Planning Classes'},
          {id:'prof', label:'👨‍🏫 Planning Profs'},
          {id:'general', label:'📊 Planning Général'},
        ].map(o => (
          <button key={o.id} style={{...styles.onglet,...(onglet===o.id?styles.ongletActif:{})}}
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
                <button key={p.id} style={{...styles.chip,...(profSelectionne==p.id?styles.chipActif:{})}}
                  onClick={() => chargerDispos(p.id)}>
                  {p.nom} {p.prenom}
                </button>
              ))}
            </div>
          </div>

          {profSelectionne && (
            <div style={styles.card}>
              <div style={styles.rowBetween}>
                <h3 style={styles.cardTitre}>
                  {profs.find(p=>p.id==profSelectionne)?.nom} {profs.find(p=>p.id==profSelectionne)?.prenom}
                </h3>
                {isAdmin() && <button style={styles.btnBleu} onClick={sauverDispos}>💾 Sauvegarder</button>}
              </div>
              <div style={{overflowX:'auto', marginTop:16}}>
                <table style={styles.tbl}>
                  <thead>
                    <tr>
                      <th style={{...styles.thA, minWidth:160}}>Période</th>
                      {JOURS.map(j => <th key={j} style={styles.thA}>{j}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {['Matin','Après-midi'].map(periode => {
                      const crsLundi = creneaux.filter(c => c.jour==='Lundi' && c.periode===periode);
                      return crsLundi.map((crBase, idx) => (
                        <tr key={crBase.id}>
                          <td style={styles.tdPer}>
                            <span style={styles.periodeTag}>{periode}</span>
                            <span style={styles.periodeNum}>Période {idx+1}</span>
                          </td>
                          {JOURS.map(jour => {
                            const cr = creneaux.find(c => c.jour===jour && c.periode===periode && c.ordre===crBase.ordre);
                            if (!cr) return <td key={jour} style={{...styles.tdDispo, background:'#f0f0f0'}}></td>;
                            const ok = dispos[cr.id] !== false;
                            return (
                              <td key={jour} style={{...styles.tdDispo, background:ok?'#e8f5e9':'#fce4ec', cursor:isAdmin()?'pointer':'default'}}
                                onClick={() => isAdmin() && toggleDispo(cr.id)}>
                                <span style={{fontSize:20}}>{ok?'✅':'❌'}</span>
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
          <div style={styles.rowBetween}>
            <h3 style={styles.cardTitre}>Pools</h3>
            {isAdmin() && <button style={styles.btnVert} onClick={() => { setShowPoolForm(true); setPoolEdit(null); setPoolForm({nom:'',site:'',couleur:'#1a73e8',prof_ids:[],classe_ids:[],branche_ids:[],horaires:[...HORAIRES_DEFAUT]}); }}>+ Nouveau pool</button>}
          </div>

          {showPoolForm && (
            <div style={styles.overlay}>
              <div style={{...styles.modal, width:660}}>
                <h3 style={styles.modalTitre}>{poolEdit?'Modifier':'Créer'} un pool</h3>
                <div style={styles.formGrid}>
                  <div style={styles.fc}>
                    <label style={styles.lbl}>Nom *</label>
                    <input style={styles.inp} value={poolForm.nom} onChange={e => setPoolForm({...poolForm,nom:e.target.value})} />
                  </div>
                  <div style={styles.fc}>
                    <label style={styles.lbl}>Site</label>
                    <input style={styles.inp} value={poolForm.site} onChange={e => setPoolForm({...poolForm,site:e.target.value})} />
                  </div>
                  <div style={{...styles.fc, gridColumn:'1/-1'}}>
                    <label style={styles.lbl}>Couleur</label>
                    <div style={{display:'flex',gap:8,marginTop:6}}>
                      {COULEURS.map(c => <div key={c} onClick={() => setPoolForm({...poolForm,couleur:c})}
                        style={{width:28,height:28,borderRadius:'50%',background:c,cursor:'pointer',border:poolForm.couleur===c?'3px solid #333':'3px solid transparent'}} />)}
                    </div>
                  </div>

                  <div style={{...styles.fc, gridColumn:'1/-1'}}>
                    <label style={styles.lbl}>🕐 Créneaux horaires (modifiables)</label>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
                      {['Matin','Après-midi'].map(per => (
                        <div key={per} style={{background:'#f8f9fa',borderRadius:8,padding:12}}>
                          <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:'#555'}}>{per}</div>
                          {poolForm.horaires.filter(h=>h.periode===per).map((h,idx) => (
                            <div key={idx} style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                              <span style={{fontSize:12,width:60,color:'#888'}}>P{idx+1}</span>
                              <input style={{...styles.inp,width:70,padding:'4px 6px',fontSize:12}} value={h.debut}
                                onChange={e => { const nh=[...poolForm.horaires]; const gi=poolForm.horaires.indexOf(h); nh[gi]={...h,debut:e.target.value}; setPoolForm({...poolForm,horaires:nh}); }} />
                              <span style={{fontSize:11,color:'#aaa'}}>→</span>
                              <input style={{...styles.inp,width:70,padding:'4px 6px',fontSize:12}} value={h.fin}
                                onChange={e => { const nh=[...poolForm.horaires]; const gi=poolForm.horaires.indexOf(h); nh[gi]={...h,fin:e.target.value}; setPoolForm({...poolForm,horaires:nh}); }} />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{...styles.fc, gridColumn:'1/-1'}}>
                    <label style={styles.lbl}>Professeurs</label>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>
                      {profs.map(p => (
                        <label key={p.id} style={{...styles.checkBadge,background:poolForm.prof_ids.includes(p.id)?poolForm.couleur:'#f0f0f0',color:poolForm.prof_ids.includes(p.id)?'white':'#333'}}>
                          <input type="checkbox" checked={poolForm.prof_ids.includes(p.id)} onChange={() => setPoolForm({...poolForm,prof_ids:toggleArr(poolForm.prof_ids,p.id)})} style={{marginRight:4}} />
                          {p.nom} {p.prenom}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{...styles.fc, gridColumn:'1/-1'}}>
                    <label style={styles.lbl}>Classes</label>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>
                      {classes.map(c => (
                        <label key={c.id} style={{...styles.checkBadge,background:poolForm.classe_ids.includes(c.id)?poolForm.couleur:'#f0f0f0',color:poolForm.classe_ids.includes(c.id)?'white':'#333'}}>
                          <input type="checkbox" checked={poolForm.classe_ids.includes(c.id)} onChange={() => setPoolForm({...poolForm,classe_ids:toggleArr(poolForm.classe_ids,c.id)})} style={{marginRight:4}} />
                          {c.nom}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{...styles.fc, gridColumn:'1/-1'}}>
                    <label style={styles.lbl}>Branches</label>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>
                      {matieres.map(m => (
                        <label key={m.id} style={{...styles.checkBadge,background:poolForm.branche_ids.includes(m.id)?poolForm.couleur:'#f0f0f0',color:poolForm.branche_ids.includes(m.id)?'white':'#333'}}>
                          <input type="checkbox" checked={poolForm.branche_ids.includes(m.id)} onChange={() => setPoolForm({...poolForm,branche_ids:toggleArr(poolForm.branche_ids,m.id)})} style={{marginRight:4}} />
                          {m.nom} {m.periodes_semaine?<span style={{opacity:.6,fontSize:11}}>({m.periodes_semaine}p/sem)</span>:''}
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
              <div key={pool.id} style={{...styles.poolCard,borderTop:'4px solid '+pool.couleur}}>
                <div style={styles.rowBetween}>
                  <div>
                    <div style={{fontWeight:700,fontSize:16}}>{pool.nom}</div>
                    {pool.site && <div style={{color:'#888',fontSize:13}}>📍 {pool.site}</div>}
                  </div>
                  {isAdmin() && <div>
                    <button style={styles.btnIcon} onClick={() => {
                      setPoolEdit(pool); setShowPoolForm(true);
                      setPoolForm({nom:pool.nom,site:pool.site||'',couleur:pool.couleur,
                        prof_ids:pool.profs.map(p=>p.id),classe_ids:pool.classes.map(c=>c.id),
                        branche_ids:pool.branches.map(b=>b.id),
                        horaires:pool.horaires&&pool.horaires.length===8?pool.horaires:[...HORAIRES_DEFAUT]});
                    }}>✏️</button>
                    <button style={styles.btnIcon} onClick={async () => { if(window.confirm('Supprimer ?')) { await axios.delete(API+'/planning/pools/'+pool.id,{headers}); chargerTout(); } }}>🗑️</button>
                  </div>}
                </div>
                <div style={{marginTop:10}}>
                  <div style={styles.poolLabel}>PROFS</div>
                  {pool.profs.map(p => <span key={p.id} style={{...styles.badge,background:pool.couleur+'22',color:pool.couleur}}>{p.nom} {p.prenom}</span>)}
                  {pool.profs.length===0&&<span style={styles.aucun}>Aucun</span>}
                </div>
                <div style={{marginTop:8}}>
                  <div style={styles.poolLabel}>CLASSES</div>
                  {pool.classes.map(c => <span key={c.id} style={{...styles.badge,background:'#e8f0fe',color:'#1a73e8'}}>{c.nom}</span>)}
                  {pool.classes.length===0&&<span style={styles.aucun}>Aucune</span>}
                </div>
                <div style={{marginTop:8}}>
                  <div style={styles.poolLabel}>BRANCHES</div>
                  {pool.branches.map(b => <span key={b.id} style={{...styles.badge,background:'#f3e5f5',color:'#7b1fa2'}}>{b.nom}</span>)}
                  {pool.branches.length===0&&<span style={styles.aucun}>Aucune</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== AFFECTATIONS ===== */}
      {onglet === 'affectations' && (
        <div>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            {[{id:'classes',label:'🏫 Affectation Classes'},{id:'profs',label:'👨‍🏫 Affectation Profs'}].map(o => (
              <button key={o.id} style={{...styles.onglet,...(sousOngletAff===o.id?styles.ongletActif:{})}}
                onClick={() => setSousOngletAff(o.id)}>
                {o.label}
              </button>
            ))}
          </div>

          <div style={styles.rowBetween}>
            <div />
            <select style={styles.sel} value={poolAffId} onChange={e => setPoolAffId(e.target.value)}>
              <option value="">— Tous —</option>
              {pools.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>

          {/* AFFECTATION CLASSES - matin/après-midi par jour */}
          {sousOngletAff === 'classes' && (
            <div style={{overflowX:'auto',marginTop:12}}>
              <table style={styles.tbl}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{...styles.th,minWidth:130}}>Classe</th>
                    {JOURS.map(jour => (
                      <th key={jour} style={{...styles.th,textAlign:'center'}} colSpan={2}>{jour}</th>
                    ))}
                  </tr>
                  <tr style={{background:'#e8eaf6'}}>
                    <th style={styles.th}></th>
                    {JOURS.map(jour => (
                      ['Matin','Après-midi'].map(per => (
                        <th key={jour+per} style={{...styles.th,fontSize:11,textAlign:'center',color:'#555'}}>{per}</th>
                      ))
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classesPool.map(cl => (
                    <tr key={cl.id} style={styles.tr}>
                      <td style={{...styles.td,fontWeight:700}}>{cl.nom}</td>
                      {JOURS.map(jour => (
                        ['Matin','Après-midi'].map(per => {
                          const active = classeAHoraire(cl.id, jour, per);
                          return (
                            <td key={jour+per} style={{...styles.td,textAlign:'center',cursor:isAdmin()?'pointer':'default',
                              background:active?'#e8f5e9':'#fff'}}
                              onClick={() => toggleClasseHoraire(cl.id, jour, per)}>
                              <span style={{fontSize:18}}>{active?'✅':'⬜'}</span>
                            </td>
                          );
                        })
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* AFFECTATION PROFS - profs en entête, classes en lignes par créneau */}
          {sousOngletAff === 'profs' && (
            <div style={{overflowX:'auto',marginTop:12}}>
              <table style={{...styles.tbl,minWidth:200+profsPool.length*140}}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{...styles.th,minWidth:130}}>Créneau</th>
                    {profsPool.map(p => <th key={p.id} style={styles.th}>{p.nom}<br/><span style={{fontWeight:400,fontSize:11}}>{p.prenom}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {JOURS.map(jour => {
                    const crs = creneaux.filter(c => c.jour===jour);
                    if (!crs.length) return null;
                    return [
                      <tr key={jour+'_h'}><td colSpan={profsPool.length+1} style={styles.jourBande}>{jour}</td></tr>,
                      ...['Matin','Après-midi'].map(per => {
                        const crsPer = crs.filter(c=>c.periode===per);
                        if (!crsPer.length) return null;
                        // Trouver classes qui ont cours ce jour/periode
                        const classesCours = classesPool.filter(cl => classeAHoraire(cl.id, jour, per));
                        if (!classesCours.length) return (
                          <tr key={jour+per+'_empty'}>
                            <td colSpan={profsPool.length+1} style={styles.periodeBande}>{per} — aucune classe</td>
                          </tr>
                        );
                        return [
                          <tr key={jour+per+'_ph'}><td colSpan={profsPool.length+1} style={styles.periodeBande}>{per}</td></tr>,
                          ...crsPer.map((cr, idx) => (
                            <tr key={cr.id} style={styles.tr}>
                              <td style={{...styles.td,background:'#f8f9fa',fontWeight:600,fontSize:12,whiteSpace:'nowrap'}}>
                                Période {idx+1}
                              </td>
                              {profsPool.map(prof => {
                                const aff = affectations.find(a => a.prof_id==prof.id && a.creneau_id==cr.id);
                                return (
                                  <td key={prof.id} style={{...styles.td,padding:4}}>
                                    <select style={{...styles.cellSel,background:aff?'#e8f5e9':'#fff'}}
                                      value={aff?aff.classe_id:''}
                                      onChange={async e => {
                                        const classe_id = e.target.value;
                                        if (!classe_id) {
                                          const a = affectations.find(x => x.prof_id==prof.id && x.creneau_id==cr.id);
                                          if (a) { await axios.delete(API+'/planning/affectations/'+a.id, {headers}); chargerTout(); }
                                        } else {
                                          // Vérifier si cette classe est déjà prise ce créneau par un autre prof
                                          const conflit = affectations.find(x => x.classe_id==classe_id && x.creneau_id==cr.id && x.prof_id!=prof.id);
                                          if (conflit) { alert('⚠️ ' + classe_id + ' est déjà affectée à un autre prof ce créneau !'); return; }
                                          // Supprimer ancienne affectation de CE prof pour CE créneau
                                          const ancienne = affectations.find(x => x.prof_id==prof.id && x.creneau_id==cr.id);
                                          if (ancienne) await axios.delete(API+'/planning/affectations/'+ancienne.id, {headers});
                                          await axios.post(API+'/planning/affectations', {prof_id:prof.id, classe_id, creneau_id:cr.id}, {headers});
                                          chargerTout();
                                        }
                                      }}
                                      disabled={!isAdmin()}>
                                      <option value="">—</option>
                                      <optgroup label="Classes">
                                        {classesCours.map(cl => <option key={cl.id} value={cl.id}>{cl.nom}</option>)}
                                      </optgroup>
                                      <optgroup label="Spécial">
                                        <option value="titulariat">Titulariat</option>
                                        <option value="atelier">Atelier</option>
                                        <option value="autre">Autre</option>
                                      </optgroup>
                                    </select>
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
      )}

      {/* ===== PLANNING CLASSES ===== */}
      {onglet === 'classe' && (
        <div>
          <div style={styles.card}>
            <div style={styles.rowBetween}>
              <h3 style={styles.cardTitre}>Planning par classe</h3>
              <select style={styles.sel} value={classePlanningPoolId}
                onChange={e => { setClassePlanningPoolId(e.target.value); if(classePlanningId) chargerPlanningClasse(classePlanningId, e.target.value); }}>
                <option value="">— Tous les pools —</option>
                {pools.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            <div style={{...styles.flexWrap,marginTop:12}}>
              {classesPoolP.map(c => (
                <button key={c.id} style={{...styles.chip,...(classePlanningId==c.id?styles.chipActif:{})}}
                  onClick={() => { setClassePlanningId(c.id); chargerPlanningClasse(c.id, classePlanningPoolId); }}>
                  {c.nom}
                </button>
              ))}
            </div>
          </div>

          {planningClasse && classePlanningId && (
            <div>
              <div style={{fontWeight:700,fontSize:18,marginBottom:12}}>Classe : {planningClasse.classe?.nom}</div>

              {/* Tableau branches - periodes attribuées */}
              {classePlanningPoolId && branchesPoolP.length > 0 && (
                <div style={{...styles.card,marginBottom:16}}>
                  <h4 style={{margin:'0 0 12px',fontSize:14,fontWeight:700,color:'#555'}}>Branches — suivi des périodes</h4>
                  <table style={styles.tbl}>
                    <thead>
                      <tr style={styles.theadRow}>
                        <th style={styles.th}>Branche</th>
                        <th style={{...styles.th,textAlign:'center'}}>Périodes/sem.</th>
                        <th style={{...styles.th,textAlign:'center'}}>Attribuées</th>
                        <th style={{...styles.th,textAlign:'center'}}>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchesPoolP.map(br => {
                        const max = parseInt(br.periodes_semaine) || 0;
                        const attribuees = (planningClasse.affectations||[]).filter(a => a.matiere_id==br.id).length;
                        const complet = max > 0 && attribuees >= max;
                        const depasse = max > 0 && attribuees > max;
                        const manquant = max > 0 && attribuees < max;
                        return (
                          <tr key={br.id} style={{...styles.tr, background:depasse?'#fff8e1':complet?'#e8f5e9':''}}>
                            <td style={styles.td}><b>{br.nom}</b></td>
                            <td style={{...styles.td,textAlign:'center'}}>
                              <span style={{...styles.badge,background:'#f3e5f5',color:'#7b1fa2'}}>{max||'—'}</span>
                            </td>
                            <td style={{...styles.td,textAlign:'center'}}>
                              <span style={{...styles.badge,
                                background:depasse?'#fff3e0':complet?'#e8f5e9':'#e3f2fd',
                                color:depasse?'#e65100':complet?'#2e7d32':'#1565c0'}}>
                                {attribuees}
                              </span>
                            </td>
                            <td style={{...styles.td,textAlign:'center'}}>
                              {depasse && <span style={{color:'#e53935',fontSize:12,fontWeight:700}}>⚠️ Dépassé</span>}
                              {complet && !depasse && <span style={{color:'#2e7d32',fontSize:12,fontWeight:700}}>✅ Complet</span>}
                              {manquant && <span style={{color:'#e53935',fontSize:12,fontWeight:600}}>❌ Manquant ({max-attribuees})</span>}
                              {max===0 && <span style={{color:'#bbb',fontSize:12}}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Planning semaine */}
              <div style={{overflowX:'auto'}}>
                <table style={{...styles.tbl,minWidth:700}}>
                  <thead>
                    <tr style={styles.theadRow}>
                      <th style={{...styles.th,minWidth:130}}>Créneau</th>
                      {JOURS.map(j => <th key={j} style={styles.th}>{j}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {['Matin','Après-midi'].map(periode => {
                      const crsBase = (planningClasse.creneaux||[]).filter(c => c.jour==='Lundi'&&c.periode===periode);
                      if (!crsBase.length) return null;
                      return [
                        <tr key={periode}><td colSpan={6} style={styles.periodeBande}>{periode}</td></tr>,
                        ...crsBase.map((crBase,idx) => (
                          <tr key={crBase.id} style={styles.tr}>
                            <td style={{...styles.td,background:'#f8f9fa',fontWeight:600,fontSize:12,whiteSpace:'nowrap'}}>
                              P{idx+1} — {crBase.heure_debut}–{crBase.heure_fin}
                            </td>
                            {JOURS.map(jour => {
                              const cr = (planningClasse.creneaux||[]).find(c=>c.jour===jour&&c.periode===periode&&c.ordre===crBase.ordre);
                              if (!cr) return <td key={jour} style={{...styles.td,background:'#f5f5f5'}}></td>;
                              const aff = (planningClasse.affectations||[]).find(a=>a.creneau_id===cr.id);
                              const aCours = classeAHoraire(classePlanningId, jour, periode);
                              return (
                                <td key={jour} style={{...styles.td,textAlign:'center',fontSize:12,
                                  background:aff?'#e8f5e9':aCours?'#fff':'#f5f5f5'}}>
                                  {aff ? (
                                    <div>
                                      <b style={{color:'#2e7d32',fontSize:12}}>{aff.prof_nom}</b>
                                      {isAdmin() ? (
                                        <select style={{...styles.cellSel,marginTop:4,fontSize:11}}
                                          value={aff.matiere_id||''}
                                          onChange={async ev => {
                                            await axios.post(API+'/planning/affectations',{prof_id:aff.prof_id,classe_id:classePlanningId,matiere_id:ev.target.value||null,creneau_id:cr.id},{headers});
                                            chargerPlanningClasse(classePlanningId, classePlanningPoolId);
                                          }}>
                                          <option value="">— Branche —</option>
                                          {(branchesPoolP.length>0?branchesPoolP:matieres).map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                                        </select>
                                      ) : (
                                        aff.matiere_nom && <div style={{color:'#666',fontSize:11}}>{aff.matiere_nom}</div>
                                      )}
                                    </div>
                                  ) : aCours ? <span style={{color:'#f57c00',fontSize:11}}>à affecter</span> : ''}
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
            </div>
          )}
        </div>
      )}

      {/* ===== PLANNING PROFS ===== */}
      {onglet === 'prof' && (
        <div>
          <div style={{...styles.card,marginBottom:16}}>
            <h3 style={styles.cardTitre}>Sélectionner un professeur</h3>
            <div style={styles.flexWrap}>
              {profs.map(p => (
                <button key={p.id} style={{...styles.chip,...(profPlanningId==p.id?styles.chipActif:{})}}
                  onClick={() => { setProfPlanningId(p.id); chargerPlanningProf(p.id); }}>
                  {p.nom} {p.prenom}
                </button>
              ))}
            </div>
          </div>

          {planningProf && profPlanningId && (
            <div style={{overflowX:'auto'}}>
              <div style={{fontWeight:700,fontSize:18,marginBottom:12}}>{planningProf.prof?.nom} {planningProf.prof?.prenom}</div>
              <table style={{...styles.tbl,minWidth:700}}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{...styles.th,minWidth:130}}>Créneau</th>
                    {JOURS.map(j => <th key={j} style={styles.th}>{j}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {['Matin','Après-midi'].map(periode => {
                    const crsBase = (planningProf.creneaux||[]).filter(c=>c.jour==='Lundi'&&c.periode===periode);
                    if (!crsBase.length) return null;
                    return [
                      <tr key={periode}><td colSpan={6} style={styles.periodeBande}>{periode}</td></tr>,
                      ...crsBase.map((crBase,idx) => (
                        <tr key={crBase.id} style={styles.tr}>
                          <td style={{...styles.td,background:'#f8f9fa',fontWeight:600,fontSize:12,whiteSpace:'nowrap'}}>
                            P{idx+1} — {crBase.heure_debut}–{crBase.heure_fin}
                          </td>
                          {JOURS.map(jour => {
                            const cr = (planningProf.creneaux||[]).find(c=>c.jour===jour&&c.periode===periode&&c.ordre===crBase.ordre);
                            if (!cr) return <td key={jour} style={{...styles.td,background:'#f5f5f5'}}></td>;
                            const aff = (planningProf.affectations||[]).find(a=>a.creneau_id===cr.id);
                            const dispo = planningProf.dispos?.find(d=>d.creneau_id===cr.id);
                            const indispo = dispo && !dispo.disponible;
                            return (
                              <td key={jour} style={{...styles.td,textAlign:'center',fontSize:12,
                                background:aff?'#e8f5e9':indispo?'#eeeeee':'#fff'}}>
                                {aff?<><b style={{color:'#2e7d32'}}>{aff.classe_nom}</b>{aff.matiere_nom&&<><br/><span style={{color:'#666',fontSize:11}}>{aff.matiere_nom}</span></>}</>:
                                 indispo?'':
                                 <span style={{color:'#ddd',fontSize:11}}>libre</span>}
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

      {/* ===== PLANNING GÉNÉRAL ===== */}
      {onglet === 'general' && (
        <div>
          <div style={styles.rowBetween}>
            <h3 style={styles.cardTitre}>Planning général</h3>
            <select style={styles.sel} value={planningPoolId}
              onChange={e => { setPlanningPoolId(e.target.value); chargerPlanningGeneral(e.target.value); }}>
              <option value="">Tous les professeurs</option>
              {pools.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>

          {planningGeneral && (
            <div style={{overflowX:'auto',marginTop:16}}>
              <table style={{...styles.tbl,minWidth:200+planningGeneral.profs.length*120}}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{...styles.th,minWidth:130}}>Créneau</th>
                    {planningGeneral.profs.map(p => <th key={p.id} style={styles.th}>{p.nom}<br/><span style={{fontWeight:400,fontSize:11}}>{p.prenom}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {JOURS.map(jour => {
                    const crs = planningGeneral.creneaux.filter(c=>c.jour===jour);
                    if (!crs.length) return null;
                    return [
                      <tr key={jour+'_h'}><td colSpan={planningGeneral.profs.length+1} style={styles.jourBande}>{jour}</td></tr>,
                      ...crs.map(cr => (
                        <tr key={cr.id} style={styles.tr}>
                          <td style={{...styles.td,background:'#f8f9fa',fontSize:11,fontWeight:600,whiteSpace:'nowrap'}}>
                            {cr.heure_debut}–{cr.heure_fin}<br/><span style={{color:'#999'}}>{cr.periode}</span>
                          </td>
                          {planningGeneral.profs.map(p => {
                            const aff = planningGeneral.affectations.find(a=>a.prof_id===p.id&&a.creneau_id===cr.id);
                            const dispo = planningGeneral.dispos.find(d=>d.prof_id===p.id&&d.creneau_id===cr.id);
                            const indispo = dispo&&!dispo.disponible;
                            return (
                              <td key={p.id} style={{...styles.td,textAlign:'center',fontSize:11,
                                background:aff?'#e8f5e9':indispo?'#eeeeee':'#fff'}}>
                                {aff?<><b style={{color:'#2e7d32'}}>{aff.classe_nom}</b>{aff.matiere_nom&&<><br/><span style={{color:'#888'}}>{aff.matiere_nom}</span></>}</>:''}
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
  page:{padding:20,background:'#f0f2f5',minHeight:'100vh'},
  header:{display:'flex',alignItems:'center',gap:15,marginBottom:20},
  btnRetour:{padding:'8px 16px',background:'white',border:'2px solid #e0e0e0',borderRadius:8,cursor:'pointer'},
  titre:{fontSize:24,fontWeight:700},
  onglets:{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap'},
  onglet:{padding:'10px 16px',background:'white',border:'2px solid #e0e0e0',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  ongletActif:{background:'#1a73e8',color:'white',border:'2px solid #1a73e8'},
  card:{background:'white',borderRadius:12,padding:20,marginBottom:20,boxShadow:'0 2px 8px rgba(0,0,0,0.06)'},
  rowBetween:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  cardTitre:{fontSize:16,fontWeight:700,margin:0},
  flexWrap:{display:'flex',flexWrap:'wrap',gap:8},
  chip:{padding:'7px 14px',background:'white',border:'2px solid #e0e0e0',borderRadius:20,cursor:'pointer',fontSize:13},
  chipActif:{background:'#1a73e8',color:'white',border:'2px solid #1a73e8'},
  tbl:{width:'100%',borderCollapse:'collapse',background:'white',borderRadius:12,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.07)'},
  theadRow:{background:'#1a73e8',color:'white'},
  th:{padding:'11px 12px',textAlign:'left',fontSize:12,fontWeight:600},
  thA:{padding:'11px 14px',background:'#1a73e8',color:'white',fontWeight:600,fontSize:13,textAlign:'center',border:'1px solid #1565c0'},
  tr:{borderBottom:'1px solid #f0f0f0'},
  td:{padding:'8px 12px',fontSize:13},
  tdPer:{padding:'10px 14px',background:'#f8f9fa',border:'1px solid #e0e0e0',whiteSpace:'nowrap'},
  periodeTag:{display:'block',fontSize:11,fontWeight:700,color:'#1a73e8',textTransform:'uppercase'},
  periodeNum:{display:'block',fontSize:13,fontWeight:600,color:'#333',marginTop:2},
  tdDispo:{padding:8,textAlign:'center',border:'1px solid #e0e0e0'},
  jourBande:{background:'#e8eaf6',padding:'7px 14px',fontWeight:700,fontSize:13,color:'#3949ab'},
  periodeBande:{background:'#f3f4f6',padding:'5px 14px',fontWeight:600,fontSize:12,color:'#666'},
  btnBleu:{padding:'8px 16px',background:'#1a73e8',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600},
  btnVert:{padding:'10px 18px',background:'#34a853',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600},
  btnAnnuler:{padding:'10px 18px',background:'#f5f5f5',border:'none',borderRadius:8,cursor:'pointer'},
  btnIcon:{background:'none',border:'none',cursor:'pointer',fontSize:16,marginLeft:6},
  sel:{padding:'8px 12px',border:'2px solid #e0e0e0',borderRadius:8,fontSize:14},
  overlay:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000},
  modal:{background:'white',padding:30,borderRadius:16,maxHeight:'85vh',overflowY:'auto'},
  modalTitre:{fontSize:20,fontWeight:700,marginBottom:20},
  formGrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:15},
  fc:{display:'flex',flexDirection:'column'},
  lbl:{fontSize:13,fontWeight:600,marginBottom:5,color:'#555'},
  inp:{padding:10,border:'2px solid #e0e0e0',borderRadius:8,fontSize:14},
  formActions:{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20},
  checkBadge:{padding:'5px 10px',borderRadius:16,cursor:'pointer',fontSize:12,fontWeight:600,display:'flex',alignItems:'center'},
  poolsGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16,marginTop:16},
  poolCard:{background:'white',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.08)'},
  poolLabel:{fontSize:11,fontWeight:700,color:'#aaa',marginBottom:4,letterSpacing:1},
  badge:{display:'inline-block',padding:'3px 10px',borderRadius:12,fontSize:12,fontWeight:600,margin:'2px 3px 2px 0'},
  aucun:{color:'#ccc',fontSize:12},
  cellSel:{width:'100%',padding:'5px 6px',border:'1px solid #e0e0e0',borderRadius:6,fontSize:12},
};