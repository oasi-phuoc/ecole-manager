import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { stickyPageChrome } from '../styles/pageShell';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';
const FONT = "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif";
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

export default function Calendrier() {
  const [evenements, setEvenements] = useState([]);
  const [profs, setProfs] = useState([]);
  const [moisActuel, setMoisActuel] = useState(new Date().getMonth());
  const [anneeActuelle, setAnneeActuelle] = useState(new Date().getFullYear());
  const [showFormVacance, setShowFormVacance] = useState(false);
  const [vacanceEdit, setVacanceEdit] = useState(null);
  const [formVacance, setFormVacance] = useState({ nom_vacance:'', date_debut:'', date_fin:'' });
  const [showFormSeance, setShowFormSeance] = useState(false);
  const [seanceEdit, setSeanceEdit] = useState(null);
  const [formSeance, setFormSeance] = useState({ titre:'', date_debut:'', heure_debut:'', heure_fin:'' });
  const [showFormRetenue, setShowFormRetenue] = useState(false);
  const [retenueEdit, setRetenueEdit] = useState(null);
  const [formRetenue, setFormRetenue] = useState({ titre:'', prof1_id:'', prof2_id:'', date_debut:'', heure_debut:'10:00', heure_fin:'11:30' });
  const [showFormEval, setShowFormEval] = useState(false);
  const [evalEdit, setEvalEdit] = useState(null);
  const [formEval, setFormEval] = useState({ nom_vacance:'', date_debut:'', date_fin:'' });
  const [showFormParticulier, setShowFormParticulier] = useState(false);
  const [particulierEdit, setParticulierEdit] = useState(null);
  const [formParticulier, setFormParticulier] = useState({ titre:'', date_debut:'', date_fin:'' });
  const [jourPopup, setJourPopup] = useState(null);
  const [evtsPopup, setEvtsPopup] = useState([]);
  const [calendrierProf, setCalendrierProf] = useState([]);
  const [profEventForm, setProfEventForm] = useState({ date: '', titre: '', type: 'Devoir', description: '' });
  const [showProfForm, setShowProfForm] = useState(false);
  const [profEventEditId, setProfEventEditId] = useState(null);
  const headers = {};

  useEffect(() => {
    chargerTout();
    chargerCalendrierProf();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement initial
  }, []);

  const chargerTout = async () => {
    try {
      const [ev, pr] = await Promise.all([
        axios.get(API+'/calendrier', { headers }),
        axios.get(API+'/profs', { headers }),
      ]);
      setEvenements(ev.data);
      setProfs(pr.data);
    } catch(err) { console.error(err); }
  };

  const chargerCalendrierProf = async () => {
    try {
      const res = await axios.get(API + '/calendrier/prof', { headers });
      setCalendrierProf(res.data || []);
    } catch {}
  };

  const supprimerProfEvent = async (id) => {
    if (!window.confirm('Supprimer cet élément ?')) return;
    await axios.delete(API + '/calendrier/prof/' + id, { headers });
    chargerCalendrierProf();
  };

  const resetProfEventForm = () => {
    setProfEventEditId(null);
    setProfEventForm({ date: '', titre: '', type: 'Devoir', description: '' });
    setShowProfForm(false);
  };

  const ouvrirEditionProfEvent = (ev) => {
    setProfEventEditId(ev.id);
    setProfEventForm({
      date: ev.date ? String(ev.date).substring(0, 10) : '',
      titre: ev.titre || '',
      type: ev.type || 'Devoir',
      description: ev.description || '',
    });
    setShowProfForm(true);
  };

  const sauverProfEvent = async (e) => {
    e.preventDefault();
    if (!profEventForm.date || !profEventForm.titre) return;
    if (profEventEditId) {
      await axios.put(API + '/calendrier/prof/' + profEventEditId, profEventForm, { headers });
    } else {
      await axios.post(API + '/calendrier/prof', profEventForm, { headers });
    }
    resetProfEventForm();
    chargerCalendrierProf();
  };

  const vacances = evenements.filter(e => e.categorie === 'vacance');
  const seances = evenements.filter(e => e.categorie === 'seance');
  const retenues = evenements.filter(e => e.categorie === 'retenue');
  const evaluations = evenements.filter(e => e.categorie === 'evaluation');
  const particuliers = evenements.filter(e => e.categorie === 'particulier');

  const sauverVacance = async (e) => {
    e.preventDefault();
    try {
      const data = { titre: formVacance.nom_vacance, nom_vacance: formVacance.nom_vacance, date_debut: formVacance.date_debut, date_fin: formVacance.date_fin||formVacance.date_debut, categorie: 'vacance', couleur: '#f59e0b', type: 'Conge' };
      if (vacanceEdit) await axios.put(API+'/calendrier/'+vacanceEdit.id, data, {headers});
      setShowFormVacance(false); setVacanceEdit(null);
      setFormVacance({nom_vacance:'',date_debut:'',date_fin:''});
      chargerTout();
    } catch(err) { alert('Erreur: '+err.message); }
  };

  const sauverSeance = async (e) => {
    e.preventDefault();
    try {
      const data = { titre: formSeance.titre, date_debut: formSeance.date_debut, date_fin: formSeance.date_debut, heure_debut: formSeance.heure_debut, heure_fin: formSeance.heure_fin||null, categorie: 'seance', couleur: '#0369a1', type: 'Reunion' };
      if (seanceEdit) await axios.put(API+'/calendrier/'+seanceEdit.id, data, {headers});
      else await axios.post(API+'/calendrier', data, {headers});
      setShowFormSeance(false); setSeanceEdit(null);
      setFormSeance({titre:'',date_debut:'',heure_debut:'',heure_fin:''});
      chargerTout();
    } catch(err) { alert('Erreur: '+err.message); }
  };

  const sauverRetenue = async (e) => {
    e.preventDefault();
    try {
      const prof1 = profs.find(p => String(p.id)===String(formRetenue.prof1_id));
      const prof2 = profs.find(p => String(p.id)===String(formRetenue.prof2_id));
      const profsNoms = [prof1,prof2].filter(Boolean).map(p=>p.prenom+' '+p.nom).join(' & ');
      const data = { titre: formRetenue.titre, description: profsNoms||null, date_debut: formRetenue.date_debut, date_fin: formRetenue.date_debut, heure_debut: formRetenue.heure_debut, heure_fin: formRetenue.heure_fin||null, categorie: 'retenue', couleur: '#dc2626', type: 'Autre' };
      if (retenueEdit) await axios.put(API+'/calendrier/'+retenueEdit.id, data, {headers});
      else await axios.post(API+'/calendrier', data, {headers});
      setShowFormRetenue(false); setRetenueEdit(null);
      setFormRetenue({titre:'',prof1_id:'',prof2_id:'',date_debut:'',heure_debut:'10:00',heure_fin:'11:30'});
      chargerTout();
    } catch(err) { alert('Erreur: '+err.message); }
  };

  const sauverEval = async (e) => {
    e.preventDefault();
    try {
      const data = { titre: formEval.nom_vacance, nom_vacance: formEval.nom_vacance, date_debut: formEval.date_debut, date_fin: formEval.date_fin||formEval.date_debut, categorie: 'evaluation', couleur: '#7c3aed', type: 'Examen' };
      if (evalEdit) await axios.put(API+'/calendrier/'+evalEdit.id, data, {headers});
      setShowFormEval(false); setEvalEdit(null);
      setFormEval({nom_vacance:'',date_debut:'',date_fin:''});
      chargerTout();
    } catch(err) { alert('Erreur: '+err.message); }
  };

  const sauverParticulier = async (e) => {
    e.preventDefault();
    try {
      const data = { titre: formParticulier.titre, date_debut: formParticulier.date_debut, date_fin: formParticulier.date_fin||formParticulier.date_debut, categorie: 'particulier', couleur: '#9333ea', type: 'Evenement' };
      if (particulierEdit) await axios.put(API+'/calendrier/'+particulierEdit.id, data, {headers});
      else await axios.post(API+'/calendrier', data, {headers});
      setShowFormParticulier(false); setParticulierEdit(null);
      setFormParticulier({titre:'',date_debut:'',date_fin:''});
      chargerTout();
    } catch(err) { alert('Erreur: '+err.message); }
  };

  const supprimerEvenement = async (id) => {
    if (window.confirm('Supprimer ?')) {
      await axios.delete(API+'/calendrier/'+id, {headers});
      chargerTout();
    }
  };

  const editVacance = (v) => {
    setVacanceEdit(v);
    setFormVacance({ nom_vacance: v.nom_vacance||v.titre, date_debut: v.date_debut?v.date_debut.substring(0,10):'', date_fin: v.date_fin?v.date_fin.substring(0,10):'' });
    setShowFormVacance(true);
  };

  const editEval = (ev) => {
    setEvalEdit(ev);
    setFormEval({ nom_vacance: ev.nom_vacance||ev.titre, date_debut: ev.date_debut?ev.date_debut.substring(0,10):'', date_fin: ev.date_fin?ev.date_fin.substring(0,10):'' });
    setShowFormEval(true);
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
    const scolaires = evenements.filter(ev => {
      const deb = ev.date_debut?.substring(0,10);
      const fin = (ev.date_fin||ev.date_debut)?.substring(0,10);
      return dateStr >= deb && dateStr <= fin;
    });
    const persos = calendrierProf.filter(ev => ev.date?.substring(0,10) === dateStr).map(ev => ({
      ...ev, couleur: '#6366f1', date_debut: ev.date, categorie: 'personnel'
    }));
    return [...scolaires, ...persos];
  };

  const today = new Date();
  const isToday = (j) => j === today.getDate() && moisActuel === today.getMonth() && anneeActuelle === today.getFullYear();
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-CH') : '—';

  return (
    <div style={{padding:'28px 32px',background:'#f8fafc',minHeight:'100%',boxSizing:'border-box',fontFamily:FONT}}>

      {/* Popup jour */}
      {jourPopup && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}} onClick={() => setJourPopup(null)}>
          <div style={{background:'white',borderRadius:14,width:320,boxShadow:'0 20px 40px rgba(0,0,0,0.15)',overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>
              <span style={{fontWeight:800,fontSize:14}}>{jourPopup} {MOIS[moisActuel]} {anneeActuelle}</span>
              <button style={s.btnX} onClick={() => setJourPopup(null)}>✕</button>
            </div>
            <div style={{maxHeight:300,overflowY:'auto'}}>
              {evtsPopup.map((ev,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',borderBottom:'1px solid #f8fafc'}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:ev.couleur||'#6366f1',flexShrink:0}}></div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{ev.titre}</div>
                    {ev.heure_debut && <div style={{fontSize:11,color:'#94a3b8'}}>{ev.heure_debut.substring(0,5)}{ev.heure_fin?' → '+ev.heure_fin.substring(0,5):''}</div>}
                    {ev.description && <div style={{fontSize:11,color:'#64748b'}}>{ev.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Popup jour */}
      {jourPopup && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}} onClick={() => setJourPopup(null)}>
          <div style={{background:'white',borderRadius:14,width:320,boxShadow:'0 20px 40px rgba(0,0,0,0.15)',overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>
              <span style={{fontWeight:800,fontSize:14}}>{jourPopup} {MOIS[moisActuel]} {anneeActuelle}</span>
              <button style={s.btnX} onClick={() => setJourPopup(null)}>✕</button>
            </div>
            <div style={{maxHeight:300,overflowY:'auto'}}>
              {evtsPopup.map((ev,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',borderBottom:'1px solid #f8fafc'}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:ev.couleur||'#6366f1',flexShrink:0}}></div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{ev.titre}</div>
                    {ev.heure_debut && <div style={{fontSize:11,color:'#94a3b8'}}>{ev.heure_debut.substring(0,5)}{ev.heure_fin?' → '+ev.heure_fin.substring(0,5):''}</div>}
                    {ev.description && <div style={{fontSize:11,color:'#64748b'}}>{ev.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal vacance */}
      {showFormVacance && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'white',padding:28,borderRadius:14,width:400,boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:800}}>Modifier une vacance</h3>
              <button style={s.btnX} onClick={() => setShowFormVacance(false)}>✕</button>
            </div>
            <form onSubmit={sauverVacance}>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div><label style={s.lbl}>Désignation</label><input style={{...s.inp,background:'#f8fafc',color:'#64748b'}} readOnly value={formVacance.nom_vacance} /></div>
                <div><label style={s.lbl}>Date de début *</label><input style={s.inp} type="date" required value={formVacance.date_debut} onChange={e => setFormVacance({...formVacance,date_debut:e.target.value})} /></div>
                <div><label style={s.lbl}>Date de fin</label><input style={s.inp} type="date" value={formVacance.date_fin} onChange={e => setFormVacance({...formVacance,date_fin:e.target.value})} /></div>
              </div>
              <div style={s.formActions}>
                <button type="button" style={s.btnCancel} onClick={() => setShowFormVacance(false)}>Annuler</button>
                <button type="submit" style={{...s.btnSave,background:'#f59e0b'}}>Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal evaluation */}
      {showFormEval && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'white',padding:28,borderRadius:14,width:400,boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:800}}>Modifier une évaluation</h3>
              <button style={s.btnX} onClick={() => setShowFormEval(false)}>✕</button>
            </div>
            <form onSubmit={sauverEval}>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div><label style={s.lbl}>Désignation</label><input style={{...s.inp,background:'#f8fafc',color:'#64748b'}} readOnly value={formEval.nom_vacance} /></div>
                <div><label style={s.lbl}>Date de début *</label><input style={s.inp} type="date" required value={formEval.date_debut} onChange={e => setFormEval({...formEval,date_debut:e.target.value})} /></div>
                <div><label style={s.lbl}>Date de fin</label><input style={s.inp} type="date" value={formEval.date_fin} onChange={e => setFormEval({...formEval,date_fin:e.target.value})} /></div>
              </div>
              <div style={s.formActions}>
                <button type="button" style={s.btnCancel} onClick={() => setShowFormEval(false)}>Annuler</button>
                <button type="submit" style={{...s.btnSave,background:'#7c3aed'}}>Sauvegarder</button>
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
              <button style={s.btnX} onClick={() => setShowFormSeance(false)}>✕</button>
            </div>
            <form onSubmit={sauverSeance}>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div><label style={s.lbl}>Désignation *</label><input style={s.inp} required value={formSeance.titre} onChange={e => setFormSeance({...formSeance,titre:e.target.value})} placeholder="Ex: Séance de direction..." /></div>
                <div><label style={s.lbl}>Date *</label><input style={s.inp} type="date" required value={formSeance.date_debut} onChange={e => setFormSeance({...formSeance,date_debut:e.target.value})} /></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div><label style={s.lbl}>Heure début *</label><input style={s.inp} type="time" required value={formSeance.heure_debut} onChange={e => setFormSeance({...formSeance,heure_debut:e.target.value})} /></div>
                  <div><label style={s.lbl}>Heure fin</label><input style={s.inp} type="time" value={formSeance.heure_fin} onChange={e => setFormSeance({...formSeance,heure_fin:e.target.value})} /></div>
                </div>
              </div>
              <div style={s.formActions}>
                <button type="button" style={s.btnCancel} onClick={() => setShowFormSeance(false)}>Annuler</button>
                <button type="submit" style={{...s.btnSave,background:'#0369a1'}}>Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal retenue */}
      {showFormRetenue && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'white',padding:28,borderRadius:14,width:440,boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:800}}>{retenueEdit?'Modifier':'Ajouter'} une retenue</h3>
              <button style={s.btnX} onClick={() => setShowFormRetenue(false)}>✕</button>
            </div>
            <form onSubmit={sauverRetenue}>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div><label style={s.lbl}>Désignation *</label><input style={s.inp} required value={formRetenue.titre} onChange={e => setFormRetenue({...formRetenue,titre:e.target.value})} placeholder="Ex: Retenue du mercredi..." /></div>
                <div>
                  <label style={s.lbl}>Professeurs</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <select style={s.inp} value={formRetenue.prof1_id} onChange={e => setFormRetenue({...formRetenue,prof1_id:e.target.value,prof2_id:e.target.value===formRetenue.prof2_id?'':formRetenue.prof2_id})}>
                      <option value="">-- Prof 1 --</option>
                      {profs.map(p => <option key={p.id} value={p.id} disabled={String(p.id)===String(formRetenue.prof2_id)}>{p.prenom} {p.nom}</option>)}
                    </select>
                    <select style={s.inp} value={formRetenue.prof2_id} onChange={e => setFormRetenue({...formRetenue,prof2_id:e.target.value})}>
                      <option value="">-- Prof 2 --</option>
                      {profs.map(p => <option key={p.id} value={p.id} disabled={String(p.id)===String(formRetenue.prof1_id)}>{p.prenom} {p.nom}</option>)}
                    </select>
                  </div>
                </div>
                <div><label style={s.lbl}>Date *</label><input style={s.inp} type="date" required value={formRetenue.date_debut} onChange={e => setFormRetenue({...formRetenue,date_debut:e.target.value})} /></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div><label style={s.lbl}>Heure début</label><input style={s.inp} type="time" value={formRetenue.heure_debut} onChange={e => setFormRetenue({...formRetenue,heure_debut:e.target.value})} /></div>
                  <div><label style={s.lbl}>Heure fin</label><input style={s.inp} type="time" value={formRetenue.heure_fin} onChange={e => setFormRetenue({...formRetenue,heure_fin:e.target.value})} /></div>
                </div>
              </div>
              <div style={s.formActions}>
                <button type="button" style={s.btnCancel} onClick={() => setShowFormRetenue(false)}>Annuler</button>
                <button type="submit" style={{...s.btnSave,background:'#dc2626'}}>Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal événement particulier */}
      {showFormParticulier && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'white',padding:28,borderRadius:14,width:420,boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:800}}>{particulierEdit?'Modifier':'Ajouter'} un événement</h3>
              <button style={s.btnX} onClick={() => setShowFormParticulier(false)}>✕</button>
            </div>
            <form onSubmit={sauverParticulier}>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div><label style={s.lbl}>Désignation *</label><input style={s.inp} required value={formParticulier.titre} onChange={e => setFormParticulier({...formParticulier,titre:e.target.value})} placeholder="Ex: Journée portes ouvertes..." /></div>
                <div><label style={s.lbl}>Date de début *</label><input style={s.inp} type="date" required value={formParticulier.date_debut} onChange={e => setFormParticulier({...formParticulier,date_debut:e.target.value})} /></div>
                <div><label style={s.lbl}>Date de fin</label><input style={s.inp} type="date" value={formParticulier.date_fin} onChange={e => setFormParticulier({...formParticulier,date_fin:e.target.value})} /></div>
              </div>
              <div style={s.formActions}>
                <button type="button" style={s.btnCancel} onClick={() => setShowFormParticulier(false)}>Annuler</button>
                <button type="submit" style={{...s.btnSave,background:'#9333ea'}}>Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={stickyPageChrome()}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <h2 style={{fontSize:22,fontWeight:800,color:'#0f172a',flex:1,margin:0}}>📅 Calendrier scolaire</h2>
      </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gridTemplateRows:'auto auto',gap:20,isolation:'isolate'}}>

        {/* CELLULE 1 - Calendrier (haut gauche) */}
        <div style={{gridColumn:1,gridRow:1,background:'white',borderRadius:14,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',border:'1px solid #f1f5f9',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid #f1f5f9',position:'relative',zIndex:10}}>
            <button style={{...s.navBtn,position:'relative',zIndex:11}} onClick={() => { if(moisActuel===0){setMoisActuel(11);setAnneeActuelle(a=>a-1);}else setMoisActuel(m=>m-1); }}>‹</button>
            <span style={{fontSize:17,fontWeight:800,color:'#0f172a'}}>{MOIS[moisActuel]} {anneeActuelle}</span>
            <button style={{...s.navBtn,position:'relative',zIndex:11}} onClick={() => { if(moisActuel===11){setMoisActuel(0);setAnneeActuelle(a=>a+1);}else setMoisActuel(m=>m+1); }}>›</button>
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
                        <div key={i} title={ev.titre} style={{fontSize:9,fontWeight:600,color:'white',background:ev.couleur||'#6366f1',borderRadius:3,padding:'2px 4px',marginBottom:1}}>
                          <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.titre}</div>
                          {ev.categorie==='retenue' && ev.description && ev.description.split(' & ').map((prof,pi) => (
                            <div key={pi} style={{fontSize:8,fontWeight:500,opacity:0.9,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{prof}</div>
                          ))}
                        </div>
                      ))}
                      {evts.length>2 && <div style={{fontSize:9,color:'#6366f1',fontWeight:700,cursor:'pointer'}} onClick={() => { setJourPopup(jour); setEvtsPopup(evts); }}>+{evts.length-2} voir tout</div>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CELLULE 2 - Vacances (haut droite) */}
        <div style={{gridColumn:2,gridRow:1,background:'white',borderRadius:14,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',border:'1px solid #f1f5f9',overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',background:'#fffbeb',flexShrink:0}}>
            <div style={{fontSize:13,fontWeight:800,color:'#92400e'}}>🏖️ Vacances & Jours fériés</div>
          </div>
          <div style={{overflowY:'auto'}}>
            {vacances.length===0 ? <div style={{padding:20,textAlign:'center',color:'#94a3b8',fontSize:12}}>Aucune vacance</div>
            : vacances.map(v => (
              <div key={v.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderBottom:'1px solid #f8fafc'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:v.couleur||'#f59e0b',flexShrink:0}}></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.nom_vacance||v.titre}</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>{formatDate(v.date_debut)}{v.date_fin&&v.date_fin!==v.date_debut?' → '+formatDate(v.date_fin):''}</div>
                </div>
                {isAdmin() && <button style={s.btnIconEdit} onClick={() => editVacance(v)}>✏️</button>}
              </div>
            ))}
          </div>
        </div>

        {/* CELLULE 3 - Séances Retenues Particuliers (bas gauche) */}
        <div style={{gridColumn:1,gridRow:2,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>

          {/* SÉANCES */}
          <div style={{background:'white',borderRadius:14,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',border:'1px solid #f1f5f9',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderBottom:'1px solid #f1f5f9',background:'#f0f9ff'}}>
              <div style={{fontSize:12,fontWeight:800,color:'#0369a1'}}>🤝 Séances</div>
              {isAdmin() && <button style={{...s.btnSave,background:'#0369a1',padding:'3px 8px',fontSize:10}} onClick={() => { setSeanceEdit(null); setFormSeance({titre:'',date_debut:'',heure_debut:'',heure_fin:''}); setShowFormSeance(true); }}>+</button>}
            </div>
            <div style={{maxHeight:180,overflowY:'auto'}}>
              {seances.length===0 ? <div style={{padding:16,textAlign:'center',color:'#94a3b8',fontSize:11}}>Aucune séance</div>
              : seances.map(s2 => (
                <div key={s2.id} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 10px',borderBottom:'1px solid #f8fafc'}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:'#0369a1',flexShrink:0}}></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s2.titre}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{formatDate(s2.date_debut)}{s2.heure_debut?' '+s2.heure_debut.substring(0,5):''}</div>
                  </div>
                  {isAdmin() && <div style={{display:'flex',gap:2,flexShrink:0}}>
                    <button style={s.btnIconEdit} onClick={() => { setSeanceEdit(s2); setFormSeance({titre:s2.titre,date_debut:s2.date_debut?.substring(0,10)||'',heure_debut:s2.heure_debut?.substring(0,5)||'',heure_fin:s2.heure_fin?.substring(0,5)||''}); setShowFormSeance(true); }}>✏️</button>
                    <button style={s.btnIconDel} onClick={() => supprimerEvenement(s2.id)}>🗑️</button>
                  </div>}
                </div>
              ))}
            </div>
          </div>

          {/* RETENUES */}
          <div style={{background:'white',borderRadius:14,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',border:'1px solid #f1f5f9',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderBottom:'1px solid #f1f5f9',background:'#fff1f2'}}>
              <div style={{fontSize:12,fontWeight:800,color:'#be123c'}}>🚫 Retenues</div>
              {isAdmin() && <button style={{...s.btnSave,background:'#dc2626',padding:'3px 8px',fontSize:10}} onClick={() => { setRetenueEdit(null); setFormRetenue({titre:'',prof1_id:'',prof2_id:'',date_debut:'',heure_debut:'10:00',heure_fin:'11:30'}); setShowFormRetenue(true); }}>+</button>}
            </div>
            <div style={{maxHeight:180,overflowY:'auto'}}>
              {retenues.length===0 ? <div style={{padding:16,textAlign:'center',color:'#94a3b8',fontSize:11}}>Aucune retenue</div>
              : retenues.map(r => (
                <div key={r.id} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 10px',borderBottom:'1px solid #f8fafc'}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:'#dc2626',flexShrink:0}}></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.titre}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{formatDate(r.date_debut)}{r.heure_debut?' '+r.heure_debut.substring(0,5):''}</div>
                  </div>
                  {isAdmin() && <div style={{display:'flex',gap:2,flexShrink:0}}>
                    <button style={s.btnIconEdit} onClick={() => { setRetenueEdit(r); setFormRetenue({titre:r.titre,prof1_id:'',prof2_id:'',date_debut:r.date_debut?.substring(0,10)||'',heure_debut:r.heure_debut?.substring(0,5)||'10:00',heure_fin:r.heure_fin?.substring(0,5)||'11:30'}); setShowFormRetenue(true); }}>✏️</button>
                    <button style={s.btnIconDel} onClick={() => supprimerEvenement(r.id)}>🗑️</button>
                  </div>}
                </div>
              ))}
            </div>
          </div>

          {/* ÉVÉNEMENTS PARTICULIERS */}
          <div style={{background:'white',borderRadius:14,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',border:'1px solid #f1f5f9',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderBottom:'1px solid #f1f5f9',background:'#fdf4ff'}}>
              <div style={{fontSize:12,fontWeight:800,color:'#7e22ce'}}>✨ Particuliers</div>
              {isAdmin() && <button style={{...s.btnSave,background:'#9333ea',padding:'3px 8px',fontSize:10}} onClick={() => { setParticulierEdit(null); setFormParticulier({titre:'',date_debut:'',date_fin:''}); setShowFormParticulier(true); }}>+</button>}
            </div>
            <div style={{maxHeight:180,overflowY:'auto'}}>
              {particuliers.length===0 ? <div style={{padding:16,textAlign:'center',color:'#94a3b8',fontSize:11}}>Aucun événement</div>
              : particuliers.map(p => (
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 10px',borderBottom:'1px solid #f8fafc'}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:'#9333ea',flexShrink:0}}></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.titre}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{formatDate(p.date_debut)}{p.date_fin&&p.date_fin!==p.date_debut?' → '+formatDate(p.date_fin):''}</div>
                  </div>
                  {isAdmin() && <div style={{display:'flex',gap:2,flexShrink:0}}>
                    <button style={s.btnIconEdit} onClick={() => { setParticulierEdit(p); setFormParticulier({titre:p.titre,date_debut:p.date_debut?.substring(0,10)||'',date_fin:p.date_fin?.substring(0,10)||''}); setShowFormParticulier(true); }}>✏️</button>
                    <button style={s.btnIconDel} onClick={() => supprimerEvenement(p.id)}>🗑️</button>
                  </div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CELLULE 4 - Évaluations (bas droite) */}
        <div style={{gridColumn:2,gridRow:2,background:'white',borderRadius:14,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',border:'1px solid #f1f5f9',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',background:'#f5f3ff'}}>
            <div style={{fontSize:13,fontWeight:800,color:'#5b21b6'}}>📝 Évaluations</div>
          </div>
          <div>
            {evaluations.length===0 ? <div style={{padding:20,textAlign:'center',color:'#94a3b8',fontSize:12}}>Aucune évaluation</div>
            : evaluations.map(ev => (
              <div key={ev.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderBottom:'1px solid #f8fafc'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:'#7c3aed',flexShrink:0}}></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.nom_vacance||ev.titre}</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>{formatDate(ev.date_debut)}{ev.date_fin&&ev.date_fin!==ev.date_debut?' → '+formatDate(ev.date_fin):''}</div>
                </div>
                {isAdmin() && <button style={s.btnIconEdit} onClick={() => editEval(ev)}>✏️</button>}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Tableau personnel du professeur */}
      <div style={{ marginTop: 32, background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>📋 Mon agenda personnel</h3>
          <button type="button" onClick={() => { resetProfEventForm(); setShowProfForm(true); }}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            + Ajouter
          </button>
        </div>
        {showProfForm && (
          <form onSubmit={sauverProfEvent} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Date *</label>
              <input type="date" required value={profEventForm.date} onChange={e => setProfEventForm({...profEventForm, date: e.target.value})}
                style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Titre *</label>
              <input type="text" required placeholder="Ex: Remise des devoirs..." value={profEventForm.titre} onChange={e => setProfEventForm({...profEventForm, titre: e.target.value})}
                style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Type</label>
              <select value={profEventForm.type} onChange={e => setProfEventForm({...profEventForm, type: e.target.value})}
                style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, background: 'white' }}>
                <option>Devoir</option>
                <option>Examen</option>
                <option>Administratif</option>
                <option>Réunion</option>
                <option>Autre</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 2, minWidth: 160 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Description</label>
              <input type="text" placeholder="Optionnel..." value={profEventForm.description} onChange={e => setProfEventForm({...profEventForm, description: e.target.value})}
                style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={resetProfEventForm}
                style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
              <button type="submit"
                style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#6366f1', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{profEventEditId ? 'Enregistrer' : 'Ajouter'}</button>
            </div>
          </form>
        )}
        {calendrierProf.length === 0 ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0', fontSize: 14 }}>Aucun élément — cliquez sur "+ Ajouter" pour commencer</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#6366f1' }}>
                <th style={{ padding: '8px 12px', color: 'white', fontWeight: 600, textAlign: 'left', borderRadius: '8px 0 0 0' }}>Date</th>
                <th style={{ padding: '8px 12px', color: 'white', fontWeight: 600, textAlign: 'left' }}>Titre</th>
                <th style={{ padding: '8px 12px', color: 'white', fontWeight: 600, textAlign: 'left' }}>Type</th>
                <th style={{ padding: '8px 12px', color: 'white', fontWeight: 600, textAlign: 'left' }}>Description</th>
                <th style={{ padding: '8px 12px', color: 'white', fontWeight: 600, textAlign: 'center', width: 1, borderRadius: '0 8px 0 0' }} aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {calendrierProf.map((ev, i) => (
                <tr key={ev.id} style={{ background: i % 2 === 0 ? 'white' : '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{ev.date ? new Date(ev.date).toLocaleDateString('fr-CH') : '—'}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{ev.titre}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: ev.type === 'Devoir' ? '#dbeafe' : ev.type === 'Examen' ? '#fce7f3' : ev.type === 'Réunion' ? '#d1fae5' : '#f1f5f9', color: ev.type === 'Devoir' ? '#1e40af' : ev.type === 'Examen' ? '#9d174d' : ev.type === 'Réunion' ? '#065f46' : '#475569' }}>
                      {ev.type}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#64748b' }}>{ev.description || '—'}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => ouvrirEditionProfEvent(ev)} title="Modifier"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.75, display: 'inline-flex', alignItems: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button type="button" onClick={() => supprimerProfEvent(ev.id)} title="Supprimer"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.75, display: 'inline-flex', alignItems: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
  btnIconEdit:{background:'none',border:'none',cursor:'pointer',fontSize:13,opacity:0.85,color:'#6366f1',padding:'2px'},
  btnIconDel:{background:'none',border:'none',cursor:'pointer',fontSize:13,opacity:0.85,color:'#ef4444',padding:'2px'},
  btnX:{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8'},
  formActions:{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20},
};