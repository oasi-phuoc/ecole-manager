import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';
const FONT = "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif";

// Composant champ HORS du composant principal pour eviter perte de focus
const Champ = ({ lbl, children }) => (
  <div style={{display:'flex',flexDirection:'column',marginBottom:0}}>
    <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>{lbl}</label>
    {children}
  </div>
);

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
  const [photoZoom, setPhotoZoom] = useState(null);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [classeId, setClasseId] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [adresse, setAdresse] = useState('');
  const [telephone, setTelephone] = useState('');
  const [nomParent, setNomParent] = useState('');
  const [telephoneParent, setTelephoneParent] = useState('');
  const [statut, setStatut] = useState('actif');
  const [oasiProgNom, setOasiProgNom] = useState('');
  const [oasiProgEncadrant, setOasiProgEncadrant] = useState('');
  const [oasiN, setOasiN] = useState('');
  const [oasiRef, setOasiRef] = useState('');
  const [oasiPos, setOasiPos] = useState('');
  const [oasiNom, setOasiNom] = useState('');
  const [oasiNais, setOasiNais] = useState('');
  const [oasiNationalite, setOasiNationalite] = useState('');
  const [oasiPresenceDate, setOasiPresenceDate] = useState('');
  const [oasiJourSemaine, setOasiJourSemaine] = useState('');
  const [oasiPresencePeriode, setOasiPresencePeriode] = useState('');
  const [oasiPresenceType, setOasiPresenceType] = useState('');
  const [oasiRemarque, setOasiRemarque] = useState('');
  const [oasiControleDu, setOasiControleDu] = useState('');
  const [oasiControleAu, setOasiControleAu] = useState('');
  const [oasiProgPresences, setOasiProgPresences] = useState('');
  const [oasiProgAdmin, setOasiProgAdmin] = useState('');
  const [oasiAs, setOasiAs] = useState('');
  const [oasiPrgId, setOasiPrgId] = useState('');
  const [oasiPrgOccupationId, setOasiPrgOccupationId] = useState('');
  const [oasiRaId, setOasiRaId] = useState('');
  const [oasiTempsRepartiId, setOasiTempsRepartiId] = useState('');

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

  const resetForm = () => {
    setNom(''); setPrenom(''); setEmail(''); setClasseId('');
    setDateNaissance(''); setAdresse(''); setTelephone('');
    setNomParent(''); setTelephoneParent(''); setStatut('actif');
    setOasiProgNom(''); setOasiProgEncadrant(''); setOasiN(''); setOasiRef(''); setOasiPos('');
    setOasiNom(''); setOasiNais(''); setOasiNationalite('');
    setOasiPresenceDate(''); setOasiJourSemaine(''); setOasiPresencePeriode('');
    setOasiPresenceType(''); setOasiRemarque(''); setOasiControleDu(''); setOasiControleAu('');
    setOasiProgPresences(''); setOasiProgAdmin(''); setOasiAs('');
    setOasiPrgId(''); setOasiPrgOccupationId(''); setOasiRaId(''); setOasiTempsRepartiId('');
  };

  const handleEdit = (el) => {
    setEleveEdit(el);
    setNom(el.nom||''); setPrenom(el.prenom||''); setEmail(el.email||'');
    setClasseId(el.classe_id||'');
    setDateNaissance(el.date_naissance?el.date_naissance.substring(0,10):'');
    setAdresse(el.adresse||''); setTelephone(el.telephone||'');
    setNomParent(el.nom_parent||''); setTelephoneParent(el.telephone_parent||'');
    setStatut(el.statut||'actif');
    setOasiProgNom(el.oasi_prog_nom||''); setOasiProgEncadrant(el.oasi_prog_encadrant||'');
    setOasiN(el.oasi_n||''); setOasiRef(el.oasi_ref||''); setOasiPos(el.oasi_pos||'');
    setOasiNom(el.oasi_nom||''); setOasiNais(el.oasi_nais?el.oasi_nais.substring(0,10):'');
    setOasiNationalite(el.oasi_nationalite||'');
    setOasiPresenceDate(el.oasi_presence_date?el.oasi_presence_date.substring(0,10):'');
    setOasiJourSemaine(el.oasi_jour_semaine||''); setOasiPresencePeriode(el.oasi_presence_periode||'');
    setOasiPresenceType(el.oasi_presence_type||''); setOasiRemarque(el.oasi_remarque||'');
    setOasiControleDu(el.oasi_controle_du?el.oasi_controle_du.substring(0,10):'');
    setOasiControleAu(el.oasi_controle_au?el.oasi_controle_au.substring(0,10):'');
    setOasiProgPresences(el.oasi_prog_presences||''); setOasiProgAdmin(el.oasi_prog_admin||'');
    setOasiAs(el.oasi_as||'');
    setOasiPrgId(el.oasi_prg_id||''); setOasiPrgOccupationId(el.oasi_prg_occupation_id||'');
    setOasiRaId(el.oasi_ra_id||''); setOasiTempsRepartiId(el.oasi_temps_reparti_id||'');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        nom, prenom, email, classe_id: classeId||null,
        date_naissance: dateNaissance||null, adresse, telephone,
        nom_parent: nomParent, telephone_parent: telephoneParent, statut,
        oasi_prog_nom: oasiProgNom, oasi_prog_encadrant: oasiProgEncadrant,
        oasi_n: oasiN?parseInt(oasiN):null, oasi_ref: oasiRef?parseInt(oasiRef):null,
        oasi_pos: oasiPos?parseInt(oasiPos):null,
        oasi_nom: oasiNom, oasi_nais: oasiNais||null, oasi_nationalite: oasiNationalite,
        oasi_presence_date: oasiPresenceDate||null, oasi_jour_semaine: oasiJourSemaine,
        oasi_presence_periode: oasiPresencePeriode, oasi_presence_type: oasiPresenceType,
        oasi_remarque: oasiRemarque, oasi_controle_du: oasiControleDu||null,
        oasi_controle_au: oasiControleAu||null,
        oasi_prog_presences: oasiProgPresences, oasi_prog_admin: oasiProgAdmin,
        oasi_as: oasiAs,
        oasi_prg_id: oasiPrgId?parseInt(oasiPrgId):null,
        oasi_prg_occupation_id: oasiPrgOccupationId?parseInt(oasiPrgOccupationId):null,
        oasi_ra_id: oasiRaId?parseInt(oasiRaId):null,
        oasi_temps_reparti_id: oasiTempsRepartiId?parseInt(oasiTempsRepartiId):null,
      };
      if (eleveEdit) await axios.put(API+'/eleves/'+eleveEdit.id, data, {headers});
      else await axios.post(API+'/eleves', data, {headers});
      setShowForm(false); setEleveEdit(null); resetForm(); chargerTout();
    } catch(err) { alert('Erreur: '+(err.response?.data?.message||err.message)); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cet élève ?')) {
      await axios.delete(API+'/eleves/'+id, {headers});
      chargerTout();
    }
  };

  const handleClasseChange = async (eleveId, cId) => {
    try {
      await axios.put(API+'/eleves/'+eleveId+'/classe', { classe_id: cId||null }, {headers});
      setEleves(prev => prev.map(el => el.id===eleveId ? {...el, classe_id: cId||null} : el));
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
      setImportResult(r.data); chargerTout();
    } catch(err) { setImportResult({ message: 'Erreur: '+(err.response?.data?.message||err.message) }); }
    setImportLoading(false);
  };

  const inp = {padding:'8px 10px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:12,outline:'none',color:'#1e293b',width:'100%',boxSizing:'border-box'};
  const secTitle = (color, bg) => ({fontSize:11,fontWeight:700,color,background:bg,padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase',letterSpacing:'0.05em'});

  const elevesFiltres = eleves.filter(el => {
    const matchR = ((el.nom||'')+' '+(el.prenom||'')+' '+(el.email||'')).toLowerCase().includes(recherche.toLowerCase());
    const matchC = filtreClasse==='tous' || String(el.classe_id)===String(filtreClasse);
    return matchR && matchC;
  });

  return (
    <div style={{padding:'28px 32px',background:'#f8fafc',minHeight:'100vh',fontFamily:FONT}}>

      {/* Zoom photo */}
      {photoZoom && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}} onClick={() => setPhotoZoom(null)}>
          <div onClick={e => e.stopPropagation()}>
            <img src={photoZoom} alt="photo" style={{maxWidth:'80vw',maxHeight:'80vh',borderRadius:12}} />
            <div style={{display:'flex',gap:10,justifyContent:'center',marginTop:12}}>
              <a href={photoZoom} download="photo.jpg" style={{padding:'8px 20px',background:'#6366f1',color:'white',borderRadius:8,textDecoration:'none',fontSize:13,fontWeight:600}}>⬇ Télécharger</a>
              <button onClick={() => setPhotoZoom(null)} style={{padding:'8px 20px',background:'#ef4444',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600}}>✕ Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20,flexWrap:'wrap'}}>
        <button style={{padding:'8px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#475569'}} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={{fontSize:22,fontWeight:800,color:'#0f172a',flex:1,margin:0}}>🎓 Élèves</h2>
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{position:'relative'}}>
            <span style={{position:'absolute',left:10,top:9,fontSize:13}}>🔍</span>
            <input style={{padding:'8px 12px 8px 32px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,width:200}} placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} />
          </div>
          <select style={{padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,background:'white'}} value={filtreClasse} onChange={e => setFiltreClasse(e.target.value)}>
            <option value="tous">Toutes les classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <button style={{padding:'8px 16px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13}} onClick={() => setShowImport(true)}>📥 Import OASI</button>
          {isAdmin() && <button style={{padding:'8px 16px',background:'#f59e0b',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13}} onClick={() => { resetForm(); setEleveEdit(null); setShowForm(true); }}>+ Ajouter</button>}
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <span style={{padding:'5px 12px',background:'#fef3c7',color:'#92400e',borderRadius:99,fontSize:12,fontWeight:500}}>Total <b>{eleves.length}</b> élèves</span>
        {classes.map(c => (
          <span key={c.id} style={{padding:'5px 12px',background:'#d1fae5',color:'#065f46',borderRadius:99,fontSize:12,fontWeight:500}}>
            {c.nom} <b>{eleves.filter(e=>e.classe_id==c.id).length}</b>
          </span>
        ))}
      </div>

      {/* Modal Import */}
      {showImport && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'white',padding:32,borderRadius:16,width:480,boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <h3 style={{fontSize:18,fontWeight:800,margin:0}}>📥 Importer depuis OASI</h3>
              <button style={{background:'none',border:'none',fontSize:18,cursor:'pointer'}} onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }}>✕</button>
            </div>
            {importResult ? (
              <div>
                <div style={{background:importResult.created>=0?'#d1fae5':'#fee2e2',color:importResult.created>=0?'#065f46':'#991b1b',padding:16,borderRadius:10,fontSize:14,fontWeight:600}}>{importResult.message}</div>
                {importResult.created >= 0 && <div style={{marginTop:12,fontSize:13,color:'#475569'}}><div>✅ <b>{importResult.created}</b> créé(s)</div><div>⏭️ <b>{importResult.skipped}</b> ignorés</div></div>}
                <div style={{marginTop:20,textAlign:'right'}}><button style={{padding:'9px 20px',background:'#f59e0b',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600}} onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }}>Fermer</button></div>
              </div>
            ) : (
              <form onSubmit={handleImport}>
                <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:10,padding:16,marginBottom:20,fontSize:13,color:'#0369a1'}}>ℹ️ Les élèves avec un REF déjà existant ne seront pas dupliqués.</div>
                <div style={{display:'flex',flexDirection:'column',marginBottom:16}}>
                  <label style={{fontSize:12,fontWeight:600,marginBottom:5,color:'#475569'}}>Fichier Excel (.xlsx) *</label>
                  <input type="file" accept=".xlsx,.xls" required style={{padding:'8px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13}} onChange={e => setImportFile(e.target.files[0])} />
                </div>
                {importFile && <div style={{marginTop:8,fontSize:12,color:'#10b981'}}>✅ {importFile.name}</div>}
                <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24}}>
                  <button type="button" style={{padding:'9px 18px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13}} onClick={() => setShowImport(false)}>Annuler</button>
                  <button type="submit" style={{padding:'9px 20px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600}} disabled={importLoading}>{importLoading?'⏳...':'📥 Importer'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Formulaire */}
      {showForm && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)'}}>
          <div style={{background:'white',padding:32,borderRadius:16,width:'95vw',maxWidth:1100,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <h3 style={{fontSize:18,fontWeight:800,margin:0}}>{eleveEdit?'Modifier':'Ajouter'} un élève</h3>
              <button style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8'}} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:24,alignItems:'start'}}>

                {/* COL 1 */}
                <div>
                  <div style={secTitle('#92400e','#fef3c7')}>🎓 Informations élève</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <Champ lbl="Nom *"><input style={inp} required value={nom} onChange={e => setNom(e.target.value)} placeholder="DUPONT" /></Champ>
                    <Champ lbl="Prénom *"><input style={inp} required value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Marie" /></Champ>
                    <Champ lbl="Email"><input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="marie@ecole.ch" /></Champ>
                    <Champ lbl="Date de naissance"><input style={inp} type="date" value={dateNaissance} onChange={e => setDateNaissance(e.target.value)} /></Champ>
                    <Champ lbl="Classe">
                      <select style={inp} value={classeId} onChange={e => setClasseId(e.target.value)}>
                        <option value="">-- Choisir --</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                    </Champ>
                    <Champ lbl="Téléphone"><input style={inp} value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="079 123 45 67" /></Champ>
                    <Champ lbl="Adresse"><input style={inp} value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Rue de la Paix 10, 1950 Sion" /></Champ>
                  </div>
                  <div style={{...secTitle('#92400e','#fef3c7'),marginTop:16}}>👨‍👩‍👦 Contact / Parent</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <Champ lbl="Nom parent"><input style={inp} value={nomParent} onChange={e => setNomParent(e.target.value)} placeholder="Dupont Jean" /></Champ>
                    <Champ lbl="Téléphone parent"><input style={inp} value={telephoneParent} onChange={e => setTelephoneParent(e.target.value)} placeholder="079 987 65 43" /></Champ>
                  </div>
                </div>

                {/* COL 2 - OASI obligatoires */}
                <div>
                  <div style={secTitle('#3730a3','#e0e7ff')}>🗂️ Données OASI</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <Champ lbl="A — PROG_NOM *"><input style={inp} required value={oasiProgNom} onChange={e => setOasiProgNom(e.target.value)} placeholder="Programme..." /></Champ>
                    <Champ lbl="B — PROG_ENCADRANT *"><input style={inp} required value={oasiProgEncadrant} onChange={e => setOasiProgEncadrant(e.target.value)} placeholder="Encadrant..." /></Champ>
                    <Champ lbl="C — N *"><input style={inp} required type="number" value={oasiN} onChange={e => setOasiN(e.target.value)} placeholder="859056" /></Champ>
                    <Champ lbl="D — REF *"><input style={inp} required type="number" value={oasiRef} onChange={e => setOasiRef(e.target.value)} placeholder="21372" /></Champ>
                    <Champ lbl="E — POS *"><input style={inp} required type="number" value={oasiPos} onChange={e => setOasiPos(e.target.value)} placeholder="1" /></Champ>
                    <Champ lbl="F — NOM complet *"><input style={inp} required value={oasiNom} onChange={e => setOasiNom(e.target.value)} placeholder="AHMAD Riaz" /></Champ>
                    <Champ lbl="G — NAIS *"><input style={inp} required type="date" value={oasiNais} onChange={e => setOasiNais(e.target.value)} /></Champ>
                    <Champ lbl="H — NATIONALITE *"><input style={inp} required value={oasiNationalite} onChange={e => setOasiNationalite(e.target.value)} placeholder="AFGHANISTAN" /></Champ>

                    <Champ lbl="P — PROG_PRESENCES *"><input style={inp} required value={oasiProgPresences} onChange={e => setOasiProgPresences(e.target.value)} /></Champ>
                    <Champ lbl="Q — PROG_ADMIN *"><input style={inp} required value={oasiProgAdmin} onChange={e => setOasiProgAdmin(e.target.value)} /></Champ>
                    <Champ lbl="R — AS *"><input style={inp} required value={oasiAs} onChange={e => setOasiAs(e.target.value)} /></Champ>
                    <Champ lbl="S — PRG_ID *"><input style={inp} required type="number" value={oasiPrgId} onChange={e => setOasiPrgId(e.target.value)} /></Champ>
                    <Champ lbl="T — PRG_OCCUPATION_ID *"><input style={inp} required type="number" value={oasiPrgOccupationId} onChange={e => setOasiPrgOccupationId(e.target.value)} /></Champ>
                    <Champ lbl="U — RA_ID *"><input style={inp} required type="number" value={oasiRaId} onChange={e => setOasiRaId(e.target.value)} /></Champ>
                    <Champ lbl="V — TEMPS_REPARTI_ID *"><input style={inp} required type="number" value={oasiTempsRepartiId} onChange={e => setOasiTempsRepartiId(e.target.value)} /></Champ>
                  </div>
                </div>

                {/* COL 3 - OASI optionnels */}
                <div>
                  <div style={secTitle('#475569','#f1f5f9')}>📋 OASI optionnels (I–O)</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <Champ lbl="I — PRESENCE_DATE"><input style={inp} type="date" value={oasiPresenceDate} onChange={e => setOasiPresenceDate(e.target.value)} /></Champ>
                    <Champ lbl="J — JOUR_SEMAINE"><input style={inp} value={oasiJourSemaine} onChange={e => setOasiJourSemaine(e.target.value)} placeholder="lundi" /></Champ>
                    <Champ lbl="K — PRESENCE_PERIODE"><input style={inp} value={oasiPresencePeriode} onChange={e => setOasiPresencePeriode(e.target.value)} placeholder="Matin" /></Champ>
                    <Champ lbl="L — PRESENCE_TYPE"><input style={inp} value={oasiPresenceType} onChange={e => setOasiPresenceType(e.target.value)} placeholder="01 Présent" /></Champ>
                    <Champ lbl="M — REMARQUE"><textarea style={{...inp,minHeight:80,resize:'vertical'}} value={oasiRemarque} onChange={e => setOasiRemarque(e.target.value)} /></Champ>
                    <Champ lbl="N — CONTROLE_DU"><input style={inp} type="date" value={oasiControleDu} onChange={e => setOasiControleDu(e.target.value)} /></Champ>
                    <Champ lbl="O — CONTROLE_AU"><input style={inp} type="date" value={oasiControleAu} onChange={e => setOasiControleAu(e.target.value)} /></Champ>
                  </div>
                </div>
              </div>

              <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24,paddingTop:20,borderTop:'1px solid #f1f5f9'}}>
                <button type="button" style={{padding:'9px 18px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#64748b'}} onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" style={{padding:'9px 20px',background:'#f59e0b',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13}}>Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div style={{overflowX:'auto',borderRadius:12,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #f1f5f9'}}>
        <table style={{width:'100%',borderCollapse:'collapse',background:'white'}}>
          <thead>
            <tr style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
              {['Photo','Nom','Prénom','REF','Nationalité','Classe','Date naissance','Contact','Statut','Actions'].map(h => (
                <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {elevesFiltres.length===0 ? (
              <tr><td colSpan="10" style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Aucun élève trouvé</td></tr>
            ) : elevesFiltres.map(el => (
              <tr key={el.id} style={{borderBottom:'1px solid #f8fafc'}}>
                <td style={{padding:'10px 14px'}}>
                  <div style={{position:'relative',width:36,height:36}}>
                    {el.photo
                      ? <img src={el.photo} onClick={() => setPhotoZoom(el.photo)} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',border:'2px solid #e2e8f0',cursor:'pointer'}} />
                      : <div style={{width:36,height:36,borderRadius:'50%',background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#6366f1',fontWeight:700}}>{(el.prenom||'?')[0]}</div>
                    }
                    {isAdmin() && (
                      <div style={{position:'absolute',bottom:-2,right:-2,display:'flex',gap:1}}>
                        <label style={{width:14,height:14,background:'#6366f1',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'white'}} title="Changer photo">
                          📷
                          <input type="file" accept="image/*" style={{display:'none'}} onChange={async (ev) => {
                            const file = ev.target.files[0];
                            if (!file) return;
                            if (file.size > 2*1024*1024) { alert('Max 2MB'); return; }
                            const reader = new FileReader();
                            reader.onload = async (re) => {
                              try { await axios.put(API+'/eleves/'+el.id+'/photo', {photo: re.target.result}, {headers}); chargerTout(); }
                              catch(err) { alert('Erreur upload'); }
                            };
                            reader.readAsDataURL(file);
                          }} />
                        </label>
                        {el.photo && (
                          <div onClick={async () => {
                            if (window.confirm('Supprimer la photo ?')) {
                              await axios.put(API+'/eleves/'+el.id+'/photo', {photo: null}, {headers});
                              chargerTout();
                            }
                          }} style={{width:14,height:14,background:'#ef4444',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'white'}} title="Supprimer photo">✕</div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td style={{padding:'10px 14px',fontWeight:700,color:'#1e293b',fontSize:13}}>{el.nom||'—'}</td>
                <td style={{padding:'10px 14px',fontSize:13,color:'#374151'}}>{el.prenom||'—'}</td>
                <td style={{padding:'10px 14px',fontSize:13}}>
                  {el.oasi_ref ? <span style={{background:'#e0e7ff',color:'#3730a3',padding:'3px 8px',borderRadius:99,fontSize:11,fontWeight:700}}>{el.oasi_ref}</span> : <span style={{color:'#94a3b8'}}>—</span>}
                </td>
                <td style={{padding:'10px 14px',fontSize:13,color:'#374151'}}>{el.oasi_nationalite||'—'}</td>
                <td style={{padding:'10px 14px',fontSize:13}}>
                  <select value={el.classe_id||''} onChange={e => handleClasseChange(el.id, e.target.value)}
                    style={{padding:'5px 8px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:12,background:'white',cursor:'pointer',maxWidth:120}}>
                    <option value="">— Aucune —</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </td>
                <td style={{padding:'10px 14px',fontSize:13,color:'#374151'}}>{el.date_naissance?new Date(el.date_naissance).toLocaleDateString('fr-CH'):el.oasi_nais?new Date(el.oasi_nais).toLocaleDateString('fr-CH'):'—'}</td>
                <td style={{padding:'10px 14px',fontSize:13}}>
                  <div>{el.nom_parent||'—'}</div>
                  {el.telephone_parent && <div style={{fontSize:11,color:'#94a3b8'}}>{el.telephone_parent}</div>}
                </td>
                <td style={{padding:'10px 14px'}}>
                  <span style={el.statut==='actif'?{background:'#d1fae5',color:'#065f46',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600}:{background:'#fee2e2',color:'#991b1b',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600}}>
                    {el.statut==='actif'?'✅ Actif':'❌ Inactif'}
                  </span>
                </td>
                <td style={{padding:'10px 14px'}}>
                  {isAdmin() && <>
                    <button style={{background:'none',border:'none',cursor:'pointer',fontSize:15,marginRight:6,opacity:0.7}} onClick={() => handleEdit(el)}>✏️</button>
                    <button style={{background:'none',border:'none',cursor:'pointer',fontSize:15,opacity:0.7}} onClick={() => handleDelete(el.id)}>🗑️</button>
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