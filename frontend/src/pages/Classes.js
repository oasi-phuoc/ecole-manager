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
  const [filtreActif, setFiltreActif] = useState('actif');
  const [form, setForm] = useState({ nom:'', niveau:'', annee_scolaire:'', prof_principal_id:'' });
  const [detailClasse, setDetailClasse] = useState(null);
  const [elevesClasse, setElevesClasse] = useState([]);
  const [observations, setObservations] = useState([]);
  const [eleveDetail, setEleveDetail] = useState(null);
  const [showObsForm, setShowObsForm] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(null);
  const [obsEditId, setObsEditId] = useState(null);
  const [obsEditForm, setObsEditForm] = useState({titre:'',contenu:'',mesure_prise:'',intervention_responsable:false,demande_entretien:false});
  const [obsForm, setObsForm] = useState({ titre:'', contenu:'', mesure_prise:'', intervention_responsable:false, demande_entretien:false });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };
  const userStr = localStorage.getItem('utilisateur');
  const currentUser = userStr ? JSON.parse(userStr) : null;

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

  const toggleActif = async (c) => {
    if (!isAdmin()) return;
    await axios.put(API+'/classes/'+c.id, {...c, actif:!c.actif, prof_principal_id:c.prof_principal_id||null}, {headers});
    chargerTout();
  };

  const ouvrirDetail = async (c) => {
    setDetailClasse(c);
    setEleveDetail(null);
    setObservations([]);
    try {
      const r = await axios.get(API+'/classes/'+c.id+'/eleves', {headers});
      setElevesClasse(r.data);
    } catch(err) { console.error(err); }
  };

  const ouvrirEleveDetail = async (eleve) => {
    setEleveDetail(eleve);
    try {
      const r = await axios.get(API+'/observations/eleve/'+eleve.id, {headers});
      setObservations(r.data);
    } catch(err) { console.error(err); }
  };

  const sauverObservation = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API+'/observations/eleve/'+eleveDetail.id, obsForm, {headers});
      setObsForm({titre:'',contenu:'',mesure_prise:'',intervention_responsable:false,demande_entretien:false});
      setShowObsForm(false);
      const r = await axios.get(API+'/observations/eleve/'+eleveDetail.id, {headers});
      setObservations(r.data);
    } catch(err) { alert('Erreur: '+err.message); }
  };

  const [showTrombinoscope, setShowTrombinoscope] = useState(false);

  const imprimerObservations = () => {
    const rows = observations.map(obs => `
      <tr>
        <td>${new Date(obs.created_at).toLocaleDateString('fr-CH')}</td>
        <td style="font-weight:700">${obs.titre||''}</td>
        <td>${obs.contenu||''}</td>
        <td>${obs.mesure_prise||'—'}</td>
        <td>${obs.auteur_prenom||''} ${obs.auteur_nom||''}</td>
        <td style="text-align:center">
          ${obs.intervention_responsable?'<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700">🚨 Oui</span>':'<span style="color:#94a3b8;font-size:11px">Non</span>'}
        </td>
        <td style="text-align:center">
          ${obs.demande_entretien?'<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700">🤝 Oui</span>':'<span style="color:#94a3b8;font-size:11px">Non</span>'}
        </td>
      </tr>
    `).join('');

    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Observations - ${eleveDetail.prenom} ${eleveDetail.nom}</title>
        <style>
          body { font-family: 'Century Gothic', sans-serif; padding: 32px; color: #1e293b; background: #f8fafc; }
          h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
          .sub { font-size: 13px; color: #64748b; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
          th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
          tr:last-child td { border-bottom: none; }
          .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: right; }
          @media print { body { padding: 16px; background: white; } .no-print { display: none; } @page { margin: 1.5cm; } }
        </style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <h1>📋 Rapport d'observations — ${eleveDetail.prenom} ${eleveDetail.nom}</h1>
            <div class="sub">Classe : ${detailClasse.nom} · ${observations.length} observation(s) · Généré le ${new Date().toLocaleDateString('fr-CH')}</div>
          </div>
          <button class="no-print" onclick="window.print()" style="padding:10px 20px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit">🖨️ Imprimer</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Titre</th><th>Remarque</th><th>Mesure prise</th><th>Auteur</th><th style="text-align:center">Intervention</th><th style="text-align:center">Entretien</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">École Manager</div>
      </body>
      </html>
    `);
    win.document.close();
  };

  const imprimerTrombinoscope = () => {
    const cards = elevesClasse.map(el => `
      <div style="display:flex;flex-direction:column;align-items:center;padding:16px;background:white;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
        ${el.photo
          ? `<img src="${el.photo}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #e0e7ff;margin-bottom:10px"/>`
          : `<div style="width:100px;height:100px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;color:#6366f1;margin-bottom:10px">${(el.prenom||'?')[0]}</div>`
        }
        <div style="font-weight:800;font-size:14px;color:#1e293b;text-align:center">${el.prenom||''}</div>
        <div style="font-weight:600;font-size:13px;color:#475569;text-align:center">${el.nom||''}</div>
      </div>
    `).join('');

    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Trombinoscope - ${detailClasse.nom}</title>
        <style>
          body { font-family: 'Century Gothic', sans-serif; padding: 32px; color: #1e293b; background: #f8fafc; }
          h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; color: #0f172a; }
          .sub { font-size: 13px; color: #64748b; margin-bottom: 28px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
          .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print {
            body { padding: 16px; background: white; }
            .no-print { display: none; }
            @page { margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <h1>📸 Trombinoscope — ${detailClasse.nom}</h1>
            <div class="sub">
              ${detailClasse.annee_scolaire ? detailClasse.annee_scolaire + ' · ' : ''}
              ${detailClasse.prof_prenom ? 'Titulaire : ' + detailClasse.prof_prenom + ' ' + detailClasse.prof_nom + ' · ' : ''}
              ${elevesClasse.length} élève(s)
            </div>
          </div>
          <button class="no-print" onclick="window.print()" style="padding:10px 20px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit">🖨️ Imprimer</button>
        </div>
        <div class="grid">${cards}</div>
        <div class="footer">Généré le ${new Date().toLocaleDateString('fr-CH')} · École Manager</div>
      </body>
      </html>
    `);
    win.document.close();
  };

  const tauxPresence = (eleve) => {
    const total = parseInt(eleve.nb_absences||0) + parseInt(eleve.nb_retards||0);
    if (total === 0) return 100;
    return Math.max(0, Math.round((1 - total/20) * 100));
  };

  const classesFiltrees = classes.filter(c => {
    const matchR = (c.nom+' '+(c.niveau||'')).toLowerCase().includes(recherche.toLowerCase());
    const matchA = filtreActif==='tous' || (filtreActif==='actif'&&c.actif!==false) || (filtreActif==='archive'&&c.actif===false);
    return matchR && matchA;
  });

  // Modal zoom photo
  const ModalZoom = () => photoZoom ? (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}} onClick={() => setPhotoZoom(null)}>
      <div style={{position:'relative'}} onClick={e => e.stopPropagation()}>
        <img src={photoZoom} alt="photo" style={{maxWidth:'80vw',maxHeight:'80vh',borderRadius:12,boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}} />
        <div style={{display:'flex',gap:10,justifyContent:'center',marginTop:12}}>
          <a href={photoZoom} download="photo.jpg" style={{padding:'8px 20px',background:'#6366f1',color:'white',borderRadius:8,textDecoration:'none',fontSize:13,fontWeight:600}}>⬇ Télécharger</a>
          <button onClick={() => setPhotoZoom(null)} style={{padding:'8px 20px',background:'#ef4444',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600}}>✕ Fermer</button>
        </div>
      </div>
    </div>
  ) : null;

  // Vue détail élève
  if (eleveDetail && detailClasse) return (
    <div style={s.page}>
      <ModalZoom />
      <div style={s.header}>
        <button style={s.btnBack} onClick={() => setEleveDetail(null)}>← Retour classe</button>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
        {eleveDetail.photo ? (
          <img src={eleveDetail.photo} alt="photo" style={{width:56,height:56,borderRadius:'50%',objectFit:'cover',border:'3px solid #e2e8f0'}} />
        ) : (
          <div style={{width:56,height:56,borderRadius:'50%',background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,color:'#6366f1',fontWeight:700}}>
            {(eleveDetail.prenom||'?')[0]}
          </div>
        )}
        <h2 style={s.title}>🎓 {eleveDetail.prenom} {eleveDetail.nom}</h2>
      </div>
        <span style={{...s.chip, background:'#e0e7ff', color:'#3730a3'}}>{detailClasse.nom}</span>
      </div>

      {/* Stats élève */}
      <div style={s.statsRow}>
        {[
          {label:'Absences', value:eleveDetail.nb_absences||0, color:'#ef4444', bg:'#fee2e2'},
          {label:'Excusées', value:eleveDetail.nb_excuses||0, color:'#f59e0b', bg:'#fef3c7'},
          {label:'Retards', value:eleveDetail.nb_retards||0, color:'#8b5cf6', bg:'#ede9fe'},
          {label:'Taux présence', value:tauxPresence(eleveDetail)+'%', color:'#10b981', bg:'#d1fae5'},
        ].map(st => (
          <div key={st.label} style={{...s.statCard, borderTop:'3px solid '+st.color}}>
            <div style={{fontSize:24,fontWeight:800,color:st.color}}>{st.value}</div>
            <div style={{fontSize:12,color:'#64748b',marginTop:4}}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* Observations */}
      <div style={s.card}>
        <div style={s.rowBetween}>
          <h3 style={s.cardTitle}>📋 Observations</h3>
          <div style={{display:'flex',gap:8}}>
            <button style={{...s.btnAdd,background:'#6366f1'}} onClick={() => imprimerObservations()}>📄 Rapport PDF</button>
            <button style={s.btnAdd} onClick={() => setShowObsForm(!showObsForm)}>+ Ajouter</button>
          </div>
        </div>

        {showObsForm && (
          <form onSubmit={sauverObservation} style={{background:'#f8fafc',borderRadius:10,padding:16,marginTop:16,border:'1px solid #e2e8f0'}}>
            <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:8,fontSize:12,color:'#64748b'}}>
              <span>✍️ Auteur : <b>{currentUser?.prenom} {currentUser?.nom}</b></span>
              <span>📅 {new Date().toLocaleDateString('fr-CH')}</span>
            </div>
            <div style={s.field}>
              <label style={s.lbl}>Titre *</label>
              <input style={s.inp} required value={obsForm.titre} onChange={e => setObsForm({...obsForm,titre:e.target.value})} placeholder="Ex: Comportement en classe..." />
            </div>
            <div style={{...s.field,marginTop:10}}>
              <label style={s.lbl}>Remarque *</label>
              <textarea style={{...s.inp,minHeight:70,resize:'vertical'}} required value={obsForm.contenu} onChange={e => setObsForm({...obsForm,contenu:e.target.value})} placeholder="Saisir votre observation..." />
            </div>
            <div style={{...s.field,marginTop:10}}>
              <label style={s.lbl}>Mesure prise *</label>
              <textarea style={{...s.inp,minHeight:60,resize:'vertical'}} required value={obsForm.mesure_prise} onChange={e => setObsForm({...obsForm,mesure_prise:e.target.value})} placeholder="Ex: Avertissement oral, convocation..." />
            </div>
            <div style={{display:'flex',gap:12,marginTop:14}}>
              <button type="button" onClick={() => setObsForm({...obsForm,intervention_responsable:!obsForm.intervention_responsable})}
                style={{flex:1,padding:'9px 12px',borderRadius:8,border:'2px solid '+(obsForm.intervention_responsable?'#ef4444':'#e2e8f0'),background:obsForm.intervention_responsable?'#fee2e2':'#f8fafc',color:obsForm.intervention_responsable?'#991b1b':'#64748b',cursor:'pointer',fontWeight:600,fontSize:12,transition:'all 0.15s'}}>
                🚨 Intervention responsable : <b>{obsForm.intervention_responsable?'OUI':'NON'}</b>
              </button>
              <button type="button" onClick={() => setObsForm({...obsForm,demande_entretien:!obsForm.demande_entretien})}
                style={{flex:1,padding:'9px 12px',borderRadius:8,border:'2px solid '+(obsForm.demande_entretien?'#f59e0b':'#e2e8f0'),background:obsForm.demande_entretien?'#fef3c7':'#f8fafc',color:obsForm.demande_entretien?'#92400e':'#64748b',cursor:'pointer',fontWeight:600,fontSize:12,transition:'all 0.15s'}}>
                🤝 Demande entretien : <b>{obsForm.demande_entretien?'OUI':'NON'}</b>
              </button>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
              <button type="button" style={s.btnCancel} onClick={() => setShowObsForm(false)}>Annuler</button>
              <button type="submit" style={s.btnSave}>Sauvegarder</button>
            </div>
          </form>
        )}

        <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:12}}>
          {observations.length===0 ? (
            <div style={{textAlign:'center',color:'#94a3b8',padding:30,fontSize:13}}>Aucune observation enregistrée</div>
          ) : observations.map(obs => {
            const peutModifier = isAdmin() || (currentUser && obs.auteur_id === currentUser.id);
            return obsEditId === obs.id ? (
              <form key={obs.id} onSubmit={async (e) => {
                e.preventDefault();
                await axios.put(API+'/observations/'+obs.id, obsEditForm, {headers});
                setObsEditId(null);
                const r = await axios.get(API+'/observations/eleve/'+eleveDetail.id, {headers});
                setObservations(r.data);
              }} style={{background:'#f0f4ff',borderRadius:10,padding:16,border:'1px solid #c7d2fe',borderLeft:'3px solid #6366f1'}}>
                <div style={s.field}>
                  <label style={s.lbl}>Titre</label>
                  <input style={s.inp} value={obsEditForm.titre} onChange={e => setObsEditForm({...obsEditForm,titre:e.target.value})} required />
                </div>
                <div style={{...s.field,marginTop:10}}>
                  <label style={s.lbl}>Remarque</label>
                  <textarea style={{...s.inp,minHeight:60,resize:'vertical'}} value={obsEditForm.contenu} onChange={e => setObsEditForm({...obsEditForm,contenu:e.target.value})} required />
                </div>
                <div style={{...s.field,marginTop:10}}>
                  <label style={s.lbl}>Mesure prise</label>
                  <textarea style={{...s.inp,minHeight:50,resize:'vertical'}} value={obsEditForm.mesure_prise||''} onChange={e => setObsEditForm({...obsEditForm,mesure_prise:e.target.value})} />
                </div>
                <div style={{display:'flex',gap:10,marginTop:12}}>
                  <button type="button" onClick={() => setObsEditForm({...obsEditForm,intervention_responsable:!obsEditForm.intervention_responsable})}
                    style={{flex:1,padding:'8px',borderRadius:8,border:'2px solid '+(obsEditForm.intervention_responsable?'#ef4444':'#e2e8f0'),background:obsEditForm.intervention_responsable?'#fee2e2':'#f8fafc',color:obsEditForm.intervention_responsable?'#991b1b':'#64748b',cursor:'pointer',fontWeight:600,fontSize:11}}>
                    🚨 Intervention : <b>{obsEditForm.intervention_responsable?'OUI':'NON'}</b>
                  </button>
                  <button type="button" onClick={() => setObsEditForm({...obsEditForm,demande_entretien:!obsEditForm.demande_entretien})}
                    style={{flex:1,padding:'8px',borderRadius:8,border:'2px solid '+(obsEditForm.demande_entretien?'#f59e0b':'#e2e8f0'),background:obsEditForm.demande_entretien?'#fef3c7':'#f8fafc',color:obsEditForm.demande_entretien?'#92400e':'#64748b',cursor:'pointer',fontWeight:600,fontSize:11}}>
                    🤝 Entretien : <b>{obsEditForm.demande_entretien?'OUI':'NON'}</b>
                  </button>
                </div>
                <div style={{display:'flex',gap:8,marginTop:10,justifyContent:'flex-end'}}>
                  <button type="button" style={s.btnCancel} onClick={() => setObsEditId(null)}>Annuler</button>
                  <button type="submit" style={s.btnSave}>Sauvegarder</button>
                </div>
              </form>
            ) : (
              <div key={obs.id} style={{background:'#f8fafc',borderRadius:10,padding:16,border:'1px solid #e2e8f0',borderLeft:'3px solid #6366f1'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <b style={{fontSize:14,color:'#1e293b'}}>{obs.titre}</b>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:11,color:'#94a3b8'}}>{new Date(obs.created_at).toLocaleDateString('fr-CH')}</span>
                    {peutModifier && <>
                      <button onClick={() => { setObsEditId(obs.id); setObsEditForm({titre:obs.titre,contenu:obs.contenu,mesure_prise:obs.mesure_prise||'',intervention_responsable:obs.intervention_responsable||false,demande_entretien:obs.demande_entretien||false}); }} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,opacity:0.6}} title="Modifier">✏️</button>
                      <button onClick={async () => {
                        if (window.confirm('Supprimer cette observation ?')) {
                          await axios.delete(API+'/observations/'+obs.id, {headers});
                          const r = await axios.get(API+'/observations/eleve/'+eleveDetail.id, {headers});
                          setObservations(r.data);
                        }
                      }} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,opacity:0.6}} title="Supprimer">🗑️</button>
                    </>}
                  </div>
                </div>
                <div style={{fontSize:13,color:'#475569',lineHeight:1.6}}>{obs.contenu}</div>
                {obs.mesure_prise && <div style={{fontSize:12,color:'#475569',marginTop:6,background:'#f1f5f9',padding:'4px 10px',borderRadius:6}}>📋 <b>Mesure :</b> {obs.mesure_prise}</div>}
              <div style={{display:'flex',gap:8,marginTop:8,alignItems:'center',flexWrap:'wrap'}}>
                <span style={{fontSize:11,color:'#94a3b8'}}>✍️ {obs.auteur_prenom} {obs.auteur_nom}</span>
                {obs.intervention_responsable && <span style={{background:'#fee2e2',color:'#991b1b',padding:'2px 8px',borderRadius:99,fontSize:10,fontWeight:700}}>🚨 Intervention</span>}
                {obs.demande_entretien && <span style={{background:'#fef3c7',color:'#92400e',padding:'2px 8px',borderRadius:99,fontSize:10,fontWeight:700}}>🤝 Entretien</span>}
              </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Vue détail classe - liste élèves
  if (detailClasse) return (
    <div style={s.page}>
      <ModalZoom />
      <div style={s.header}>
        <button style={s.btnBack} onClick={() => setDetailClasse(null)}>← Retour classes</button>
        <h2 style={s.title}>🏫 {detailClasse.nom} — Liste des élèves</h2>
        {detailClasse.prof_prenom && <span style={{...s.chip,background:'#d1fae5',color:'#065f46'}}>Titulaire : {detailClasse.prof_prenom} {detailClasse.prof_nom}</span>}
      </div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <span style={s.statChip}><b>{elevesClasse.length}</b> élèves</span>
        <button style={{...s.btnAdd,background:'#6366f1',display:'flex',alignItems:'center',gap:6}} onClick={imprimerTrombinoscope}>
          📸 Trombinoscope
        </button>
      </div>

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {['Photo','Nom','Prénom','Contact','Absences','Excusées','Retards','Présence','Observations'].map(h => <th key={h} style={s.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {elevesClasse.length===0 ? (
              <tr><td colSpan="9" style={s.empty}>Aucun élève dans cette classe</td></tr>
            ) : elevesClasse.map(el => (
              <tr key={el.id} style={s.tr}>
                <td style={s.td}>
                  <div style={{position:'relative',width:38,height:38}}>
                    {el.photo ? (
                      <img src={el.photo} alt="photo" onClick={() => setPhotoZoom(el.photo)} style={{width:38,height:38,borderRadius:'50%',objectFit:'cover',border:'2px solid #e2e8f0',cursor:'pointer'}} />
                    ) : (
                      <div style={{width:38,height:38,borderRadius:'50%',background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'#6366f1',fontWeight:700}}>
                        {(el.prenom||'?')[0]}
                      </div>
                    )}
                    {isAdmin() && (
                      <label style={{position:'absolute',bottom:-2,right:-2,width:16,height:16,background:'#6366f1',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'white'}} title="Changer photo">
                        📷
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={async (ev) => {
                          const file = ev.target.files[0];
                          if (!file) return;
                          if (file.size > 2*1024*1024) { alert('Image trop grande (max 2MB)'); return; }
                          const reader = new FileReader();
                          reader.onload = async (e) => {
                            try {
                              await axios.put(API+'/eleves/'+el.id+'/photo', {photo: e.target.result}, {headers});
                              const r = await axios.get(API+'/classes/'+detailClasse.id+'/eleves', {headers});
                              setElevesClasse(r.data);
                            } catch(err) { alert('Erreur upload photo'); }
                          };
                          reader.readAsDataURL(file);
                        }} />
                      </label>
                    )}
                  </div>
                </td>
                <td style={{...s.td,fontWeight:700}}>{el.nom || '—'}</td>
                <td style={s.td}>{el.prenom || '—'}</td>
                <td style={s.td}>{el.nom_parent || el.personne_contact || '—'}</td>
                <td style={s.td}><span style={{...s.badge,background:'#fee2e2',color:'#991b1b'}}>{el.nb_absences||0}</span></td>
                <td style={s.td}><span style={{...s.badge,background:'#fef3c7',color:'#92400e'}}>{el.nb_excuses||0}</span></td>
                <td style={s.td}><span style={{...s.badge,background:'#ede9fe',color:'#5b21b6'}}>{el.nb_retards||0}</span></td>
                <td style={s.td}>
                  <span style={{...s.badge,background:tauxPresence(el)>=80?'#d1fae5':'#fee2e2',color:tauxPresence(el)>=80?'#065f46':'#991b1b'}}>{tauxPresence(el)}%</span>
                </td>
                <td style={s.td}><button style={s.btnDetail} onClick={() => ouvrirEleveDetail(el)}>👁 Détail</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Vue principale - liste classes
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
          <div style={s.filtres}>
            {[{id:'actif',label:'Actives'},{id:'archive',label:'Archivées'},{id:'tous',label:'Toutes'}].map(f => (
              <button key={f.id} style={{...s.filtrBtn,...(filtreActif===f.id?s.filtrActif:{})}} onClick={() => setFiltreActif(f.id)}>{f.label}</button>
            ))}
          </div>
          {isAdmin() && <button style={s.btnAdd} onClick={() => { setShowForm(true); setClasseEdit(null); setForm({nom:'',niveau:'',annee_scolaire:'',prof_principal_id:''}); }}>+ Ajouter</button>}
        </div>
      </div>

      <div style={s.statsBar}>
        <span style={s.statChip}>Total <b>{classes.length}</b></span>
        <span style={{...s.statChip,background:'#d1fae5',color:'#065f46'}}>Actives <b>{classes.filter(c=>c.actif!==false).length}</b></span>
        <span style={{...s.statChip,background:'#f1f5f9',color:'#475569'}}>Archivées <b>{classes.filter(c=>c.actif===false).length}</b></span>
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
                <div style={s.field}><label style={s.lbl}>Année scolaire *</label><input style={s.inp} type="text" required value={form.annee_scolaire} onChange={e => setForm({...form,annee_scolaire:e.target.value})} placeholder="2025-2026" /></div>
                <div style={s.field}>
                  <label style={s.lbl}>Titulaire</label>
                  <select style={s.inp} value={form.prof_principal_id} onChange={e => setForm({...form,prof_principal_id:e.target.value})}>
                    <option value="">-- Choisir --</option>
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

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {['','Classe','Année','Titulaire','Élèves','Statut'].map(h => <th key={h} style={s.th}>{h}</th>)}
              {isAdmin() && <th style={s.th}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {classesFiltrees.length===0 ? (
              <tr><td colSpan="6" style={s.empty}>Aucune classe trouvée</td></tr>
            ) : classesFiltrees.map(c => (
              <tr key={c.id} style={s.tr}>
                <td style={s.td}><button style={s.btnDetail} onClick={() => ouvrirDetail(c)}>👁 Détail</button></td>
                <td style={s.td}>
                  <div style={{fontWeight:700,color:'#1e293b'}}>{c.nom}</div>
                  {c.niveau && <div style={{fontSize:11,color:'#94a3b8'}}>{c.niveau}</div>}
                </td>
                <td style={s.td}>{c.annee_scolaire||'—'}</td>
                <td style={s.td}>{c.prof_prenom ? <span>{c.prof_prenom} <b>{c.prof_nom}</b></span> : <span style={{color:'#94a3b8'}}>—</span>}</td>
                <td style={s.td}><span style={{...s.badge,background:'#e0e7ff',color:'#3730a3'}}>{c.nb_eleves||0} élèves</span></td>
                <td style={s.td}>
                  <button style={c.actif!==false?s.badgeActive:s.badgeArchive} onClick={() => toggleActif(c)}>
                    {c.actif!==false?'✅ Active':'📦 Archivée'}
                  </button>
                </td>
                {isAdmin() && <td style={s.td}>
                  <button style={s.btnEdit} onClick={() => handleEdit(c)}>✏️</button>
                  <button style={s.btnDel} onClick={() => handleDelete(c.id)}>🗑️</button>
                </td>}
              </tr>
            ))}
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
  chip:{padding:'5px 12px',borderRadius:99,fontSize:12,fontWeight:600},
  searchBox:{position:'relative',display:'flex',alignItems:'center'},
  searchIcon:{position:'absolute',left:10,fontSize:13},
  searchInput:{padding:'8px 12px 8px 32px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,width:200,background:'white',outline:'none'},
  filtres:{display:'flex',gap:4},
  filtrBtn:{padding:'7px 12px',background:'white',border:'1px solid #e2e8f0',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:500,color:'#64748b'},
  filtrActif:{background:'#6366f1',color:'white',border:'1px solid #6366f1'},
  btnAdd:{padding:'8px 16px',background:'#10b981',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  statsBar:{display:'flex',gap:10,marginBottom:20},
  statChip:{padding:'5px 12px',background:'#e0e7ff',color:'#3730a3',borderRadius:99,fontSize:12,fontWeight:500},
  statsRow:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:20},
  statCard:{background:'white',borderRadius:12,padding:'16px 20px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #f1f5f9'},
  card:{background:'white',borderRadius:12,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #f1f5f9'},
  cardTitle:{fontSize:15,fontWeight:700,color:'#0f172a',margin:0},
  rowBetween:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8},
  overlay:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)'},
  modal:{background:'white',padding:32,borderRadius:16,width:500,maxHeight:'85vh',overflowY:'auto',boxShadow:'0 20px 40px rgba(0,0,0,0.15)'},
  modalHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24},
  modalTitle:{fontSize:18,fontWeight:800,color:'#0f172a',margin:0},
  btnClose:{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8'},
  grid2:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:8},
  field:{display:'flex',flexDirection:'column'},
  lbl:{fontSize:12,fontWeight:600,marginBottom:5,color:'#475569'},
  inp:{padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,outline:'none',color:'#1e293b',width:'100%',boxSizing:'border-box'},
  formActions:{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24,paddingTop:20,borderTop:'1px solid #f1f5f9'},
  btnCancel:{padding:'9px 18px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#64748b'},
  btnSave:{padding:'9px 20px',background:'#10b981',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  tableWrap:{overflowX:'auto',borderRadius:12,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #f1f5f9'},
  table:{width:'100%',borderCollapse:'collapse',background:'white'},
  thead:{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'},
  th:{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'},
  tr:{borderBottom:'1px solid #f8fafc'},
  td:{padding:'11px 14px',fontSize:13,color:'#374151'},
  empty:{padding:40,textAlign:'center',color:'#94a3b8'},
  badge:{display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:99,fontSize:11,fontWeight:600},
  badgeActive:{background:'#d1fae5',color:'#065f46',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600,border:'none',cursor:'pointer'},
  badgeArchive:{background:'#f1f5f9',color:'#475569',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600,border:'none',cursor:'pointer'},
  btnDetail:{padding:'5px 10px',background:'#e0e7ff',color:'#3730a3',border:'none',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:600,marginRight:4},
  btnEdit:{background:'none',border:'none',cursor:'pointer',fontSize:14,marginRight:4,opacity:0.6},
  btnDel:{background:'none',border:'none',cursor:'pointer',fontSize:14,opacity:0.6},
};