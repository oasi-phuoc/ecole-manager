import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [profs, setProfs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [suiviNotesClasse, setSuiviNotesClasse] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [classeEdit, setClasseEdit] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtreActif, setFiltreActif] = useState('actif');
  const [filtreNiveau, setFiltreNiveau] = useState('tous');
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
    const [cl, pr, br, sn] = await Promise.allSettled([
      axios.get(API+'/classes', {headers}),
      axios.get(API+'/profs', {headers}),
      axios.get(API+'/branches', {headers}),
      axios.get(API+'/notes/suivi-classes', {headers}),
    ]);
    if (cl.status === 'fulfilled') setClasses(cl.value.data);
    else console.error('Erreur classes:', cl.reason);
    if (pr.status === 'fulfilled') setProfs(pr.value.data.filter(p => p.actif !== false));
    else console.error('Erreur profs:', pr.reason);
    if (br.status === 'fulfilled') setBranches(br.value.data || []);
    else console.error('Erreur branches:', br.reason);
    if (sn.status === 'fulfilled') {
      const map = {};
      (sn.value.data || []).forEach(x => {
        map[`${x.classe_id}-${x.matiere_id}`] = parseInt(x.nb_evaluations, 10) || 0;
      });
      setSuiviNotesClasse(map);
    } else {
      console.error('Erreur suivi notes classes:', sn.reason);
      setSuiviNotesClasse({});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!classeEdit) {
        const nomSaisi = (form.nom || '').trim().toLowerCase();
        const niveauSaisi = (form.niveau || '').trim().toUpperCase();
        const existeDeja = classes.some(c =>
          (c.nom || '').trim().toLowerCase() === nomSaisi &&
          (c.niveau || '').trim().toUpperCase() === niveauSaisi
        );
        if (existeDeja) {
          alert('Cette classe existe déjà avec le même nom et le même niveau.');
          return;
        }
      }
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
    setClasseVueTab('eleves');
    setEleveDetail(null);
    setObservations([]);
    setInventaireMsg('');
    setInventaireRows([]);
    setBranchesInventaire([]);
    setBrancheInventaireActive(null);
    try {
      const [elevesRes, branchesRes] = await Promise.all([
        axios.get(API+'/classes/'+c.id+'/eleves', {headers}),
        axios.get(API+'/inventaire-branches/'+c.id+'/branches', {headers}),
      ]);
      setElevesClasse(elevesRes.data);
      const brs = branchesRes.data?.branches || [];
      setBranchesInventaire(brs);
      if (brs.length > 0) setBrancheInventaireActive(brs[0]);
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

  const [showPlanClasse, setShowPlanClasse] = useState(false);
  const [planPositions, setPlanPositions] = useState({});
  const [dragEleve, setDragEleve] = useState(null);

  const [showDocsEleve, setShowDocsEleve] = useState(false);
  const [docsEleve, setDocsEleve] = useState(null);
  const [eleveDocs, setEleveDocs] = useState([]);
  const [docsEleveLoading, setDocsEleveLoading] = useState(false);
  const [uploadEleveForm, setUploadEleveForm] = useState({ type: 'CV' });

  const [showSanctions, setShowSanctions] = useState(false);
  const [sanctionsEleve, setSanctionsEleve] = useState(null);
  const [eleveSanctions, setEleveSanctions] = useState([]);
  const [sanctionsLoading, setSanctionsLoading] = useState(false);
  const [pendingCell, setPendingCell] = useState(null);
  const [classeVueTab, setClasseVueTab] = useState('eleves');
  const [branchesInventaire, setBranchesInventaire] = useState([]);
  const [brancheInventaireActive, setBrancheInventaireActive] = useState(null);
  const [inventaireRows, setInventaireRows] = useState([]);
  const [inventaireLoading, setInventaireLoading] = useState(false);
  const [inventaireMsg, setInventaireMsg] = useState('');
  const [inventaireForm, setInventaireForm] = useState({
    date_document: new Date().toISOString().split('T')[0],
    nom_document: '',
    sans_numero: false,
    remarques: '',
  });
  const [inventaireEditId, setInventaireEditId] = useState(null);
  const [inventaireEditForm, setInventaireEditForm] = useState({
    date_document: '',
    nom_document: '',
    sans_numero: false,
    remarques: '',
  });
  const [dragInventaireId, setDragInventaireId] = useState(null);
  const ELEMENTS_SPECIAUX_PLAN = [
    { id: 'SPECIAL_ENTREE', label: "Porte d'entrée", icon: '🚪', bg: '#fff7ed', text: '#9a3412' },
    { id: 'SPECIAL_TABLEAU', label: 'Tableau', icon: '🧾', bg: '#ecfeff', text: '#0e7490' },
    { id: 'SPECIAL_PROF', label: 'Professeur', icon: '👨‍🏫', bg: '#fdf2f8', text: '#be185d' },
  ];

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

  const chargerPlanClasse = async () => {
    try {
      const r = await axios.get(API+'/plan-classe/'+detailClasse.id, {headers});
      setPlanPositions(r.data.positions || {});
    } catch(err) { setPlanPositions({}); }
  };

  const sauverPlanClasse = async () => {
    try {
      await axios.post(API+'/plan-classe/'+detailClasse.id, {positions: planPositions}, {headers});
      alert('Plan sauvegardé !');
    } catch(err) { alert('Erreur sauvegarde'); }
  };

  const imprimerPlanClasse = () => {
    const COLS = 10; const ROWS = 13;
    let cells = '';
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const key = row+'-'+col;
        const itemId = planPositions[key];
        const el = elevesClasse.find(e => String(e.id) === String(itemId));
        const special = ELEMENTS_SPECIAUX_PLAN.find(x => x.id === itemId);
        cells += `<td style="border:1px solid #e2e8f0;padding:6px;text-align:center;width:80px;height:80px;background:${itemId?'#f0f4ff':'#f8fafc'};vertical-align:middle">
          ${el ? `
            ${el.photo?`<img src="${el.photo}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid #6366f1;margin:0 auto;display:block"/>`:`<div style="width:44px;height:44px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#6366f1;margin:0 auto">${(el.prenom||'?')[0]}</div>`}
            <div style="font-size:10px;font-weight:700;color:#1e293b;margin-top:3px;line-height:1.2">${el.prenom}</div>
            <div style="font-size:9px;color:#475569">${el.nom}</div>
          ` : special ? `
            <div style="display:inline-block;padding:6px 8px;border-radius:8px;background:#e0e7ff;color:#3730a3;font-size:10px;font-weight:800;line-height:1.2">${special.icon} ${special.label}</div>
          ` : ''}
        </td>`;
      }
      cells += '</tr><tr>';
    }

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Plan de classe - ${detailClasse.nom}</title>
      <style>
        body{font-family:'Century Gothic',sans-serif;padding:24px;background:#f8fafc}
        h1{font-size:20px;font-weight:800;margin-bottom:4px}
        .sub{font-size:12px;color:#64748b;margin-bottom:20px}
        table{border-collapse:collapse;width:100%;background:white;border-radius:8px}
        .no-print{margin-bottom:16px}
        @media print{.no-print{display:none}body{padding:12px}@page{margin:1cm}}
      </style></head><body>
      <div class="no-print">
        <button onclick="window.print()" style="padding:10px 20px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit">🖨️ Imprimer</button>
      </div>
      <h1>🏫 Plan de classe — ${detailClasse.nom}</h1>
      <div class="sub">${detailClasse.annee_scolaire||''} · Titulaire : ${detailClasse.prof_prenom||''} ${detailClasse.prof_nom||''}</div>
      <table><tbody><tr>${cells}</tr></tbody></table>
    </body></html>`);
    win.document.close();
  };

  const dropOnCell = (row, col) => {
    if (dragEleve === null) return;
    const key = row+'-'+col;
    // Retirer élève de son ancienne position
    const newPos = {...planPositions};
    Object.keys(newPos).forEach(k => { if (String(newPos[k]) === String(dragEleve)) delete newPos[k]; });
    if (dragEleve !== 'VIDE') newPos[key] = dragEleve;
    setPlanPositions(newPos);
    setDragEleve(null);
  };

  const renderPlanClasseOnglet = () => {
    const COLS = 10; const ROWS = 13;
    const elevesNonPlaces = elevesClasse.filter(el => !Object.values(planPositions).includes(String(el.id)));
    const elementsSpeciauxNonPlaces = ELEMENTS_SPECIAUX_PLAN.filter(sp => !Object.values(planPositions).includes(sp.id));

    return (
      <div>
        <div style={{display:'flex',gap:20,alignItems:'flex-start'}}>
          <div style={{flex:1,overflowX:'auto'}}>
            <table style={{borderCollapse:'collapse',width:'100%',minWidth:620}}>
              <tbody>
                {Array.from({length:ROWS}).map((_,row) => (
                  <tr key={row}>
                    {Array.from({length:COLS}).map((_,col) => {
                      const key = row+'-'+col;
                      const itemId = planPositions[key];
                      const el = itemId ? elevesClasse.find(e => String(e.id)===String(itemId)) : null;
                      const special = ELEMENTS_SPECIAUX_PLAN.find(x => x.id === itemId);
                      return (
                        <td key={col}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => dropOnCell(row, col)}
                          style={{border:'1.5px solid #e2e8f0',width:70,height:72,textAlign:'center',verticalAlign:'middle',background:el?'#e0e7ff':(special?special.bg:'white'),borderRadius:4,cursor:'default',transition:'background 0.1s',position:'relative'}}>
                          {el ? (
                            <div draggable onDragStart={() => setDragEleve(String(el.id))}
                              style={{cursor:'grab',padding:2}}>
                              {el.photo
                                ? <img src={el.photo} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',border:'2px solid #6366f1',display:'block',margin:'0 auto'}} />
                                : <div style={{width:36,height:36,borderRadius:'50%',background:'#6366f1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:'white',margin:'0 auto'}}>{(el.prenom||'?')[0]}</div>
                              }
                              <div style={{fontSize:9,fontWeight:700,color:'#1e293b',marginTop:2,lineHeight:1.1}}>{el.prenom}</div>
                              <div style={{fontSize:8,color:'#475569'}}>{el.nom}</div>
                              <button onClick={() => {
                                const np = {...planPositions}; delete np[key]; setPlanPositions(np);
                              }} style={{position:'absolute',top:1,right:2,background:'none',border:'none',fontSize:10,cursor:'pointer',color:'#94a3b8',lineHeight:1}}>✕</button>
                            </div>
                          ) : special ? (
                            <div draggable onDragStart={() => setDragEleve(special.id)} style={{cursor:'grab',padding:6}}>
                              <div style={{display:'inline-block',padding:'6px 8px',borderRadius:8,background:special.bg,color:special.text,fontSize:10,fontWeight:800,lineHeight:1.2}}>
                                {special.icon} {special.label}
                              </div>
                              <button onClick={() => {
                                const np = {...planPositions}; delete np[key]; setPlanPositions(np);
                              }} style={{position:'absolute',top:1,right:2,background:'none',border:'none',fontSize:10,cursor:'pointer',color:'#94a3b8',lineHeight:1}}>✕</button>
                            </div>
                          ) : (
                            <div style={{color:'#e2e8f0',fontSize:10}}>·</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{width:160,flexShrink:0}}>
            <div style={{fontSize:11,fontWeight:700,color:'#475569',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.05em'}}>
              Éléments à placer ({elevesNonPlaces.length + elementsSpeciauxNonPlaces.length})
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:'70vh',overflowY:'auto'}}>
              {elementsSpeciauxNonPlaces.map(sp => (
                <div key={sp.id} draggable onDragStart={() => setDragEleve(sp.id)}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'white',borderRadius:10,border:'1.5px solid #e2e8f0',cursor:'grab',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                  <div style={{width:32,height:32,borderRadius:8,background:sp.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:sp.text,flexShrink:0}}>
                    {sp.icon}
                  </div>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'#1e293b'}}>{sp.label}</div>
                  </div>
                </div>
              ))}
              {elevesNonPlaces.map(el => (
                <div key={el.id} draggable onDragStart={() => setDragEleve(String(el.id))}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'white',borderRadius:10,border:'1.5px solid #e2e8f0',cursor:'grab',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                  {el.photo
                    ? <img src={el.photo} style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',flexShrink:0}} />
                    : <div style={{width:32,height:32,borderRadius:'50%',background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#6366f1',flexShrink:0}}>{(el.prenom||'?')[0]}</div>
                  }
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'#1e293b'}}>{el.prenom}</div>
                    <div style={{fontSize:10,color:'#64748b'}}>{el.nom}</div>
                  </div>
                </div>
              ))}
              {elevesNonPlaces.length===0 && elementsSpeciauxNonPlaces.length===0 && <div style={{fontSize:11,color:'#94a3b8',textAlign:'center',padding:16}}>Tous placés ✅</div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTrombinoscopeOnglet = () => (
    <div style={s.trombiGrid}>
      {elevesClasse.length === 0 ? (
        <div style={s.empty}>Aucun élève dans cette classe</div>
      ) : elevesClasse.map(el => (
        <div key={el.id} style={s.trombiCard}>
          {el.photo
            ? <img src={el.photo} alt="photo" style={s.trombiImg} />
            : <div style={s.trombiFallback}>{(el.prenom||'?')[0]}</div>
          }
          <div style={s.trombiPrenom}>{el.prenom || ''}</div>
          <div style={s.trombiNom}>{el.nom || ''}</div>
        </div>
      ))}
    </div>
  );

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
          body { font-family: 'Century Gothic', sans-serif; padding: 18px; color: #1e293b; background: white; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
          @media print {
            body { padding: 10px; background: white; }
            .no-print { display: none; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <button class="no-print" onclick="window.print()" style="margin-bottom:10px;padding:10px 20px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit">🖨️ Imprimer</button>
        <div class="grid">${cards}</div>
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

  const convertirImagePourUpload = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.onload = () => {
      const src = reader.result;
      const img = new Image();
      img.onerror = () => reject(new Error('Format image non supporte. Utilisez JPG, PNG ou WEBP.'));
      img.onload = () => {
        try {
          const maxDim = 1200;
          const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * ratio));
          const h = Math.max(1, Math.round(img.height * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } catch (e) {
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });

  const ouvrirDocumentsEleve = async (el) => {
    setDocsEleve(el); setShowDocsEleve(true); setDocsEleveLoading(true);
    try { const r = await axios.get(API+'/eleves/'+el.id+'/documents', {headers}); setEleveDocs(r.data); }
    catch(err) { setEleveDocs([]); }
    setDocsEleveLoading(false);
  };

  const uploadDocumentEleve = async (file, type) => {
    if (file.size > 5*1024*1024) { alert('Fichier trop grand (max 5MB)'); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        await axios.post(API+'/eleves/'+docsEleve.id+'/documents', { nom: file.name, type, contenu: e.target.result, taille: file.size }, {headers});
        const r = await axios.get(API+'/eleves/'+docsEleve.id+'/documents', {headers});
        setEleveDocs(r.data);
      } catch(err) { alert('Erreur upload: '+err.message); }
    };
    reader.readAsDataURL(file);
  };

  const telechargerDocumentEleve = async (doc) => {
    try {
      const r = await axios.get(API+'/eleves/'+docsEleve.id+'/documents/'+doc.id+'/telecharger', {headers});
      const a = document.createElement('a'); a.href = r.data.contenu; a.download = r.data.nom; a.click();
    } catch(err) { alert('Erreur téléchargement'); }
  };

  const supprimerDocumentEleve = async (docId) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    await axios.delete(API+'/eleves/'+docsEleve.id+'/documents/'+docId, {headers});
    setEleveDocs(prev => prev.filter(d => d.id !== docId));
  };

  const ouvrirSanctions = async (el) => {
    setSanctionsEleve(el); setShowSanctions(true); setSanctionsLoading(true); setPendingCell(null);
    try { const r = await axios.get(API+'/eleves/'+el.id+'/sanctions', {headers}); setEleveSanctions(r.data); }
    catch(err) { setEleveSanctions([]); }
    setSanctionsLoading(false);
  };

  const confirmerSanction = async () => {
    if (!pendingCell) return;
    try {
      await axios.post(API+'/eleves/'+sanctionsEleve.id+'/sanctions', {
        echelle: pendingCell.echelle, infraction: pendingCell.infraction, niveau: pendingCell.niveau,
        date_sanction: pendingCell.date_sanction || null, prof_nom: pendingCell.prof_nom || null
      }, {headers});
      const r = await axios.get(API+'/eleves/'+sanctionsEleve.id+'/sanctions', {headers});
      setEleveSanctions(r.data); setPendingCell(null);
    } catch(err) { alert('Erreur: '+(err.response?.data?.message||err.message)); }
  };

  const supprimerSanction = async (sanctionId) => {
    if (!window.confirm('Retirer cette sanction ?')) return;
    await axios.delete(API+'/eleves/'+sanctionsEleve.id+'/sanctions/'+sanctionId, {headers});
    setEleveSanctions(prev => prev.filter(s => s.id !== sanctionId));
  };

  const chargerInventaireBranche = async (brancheId) => {
    if (!detailClasse?.id || !brancheId) return;
    setInventaireLoading(true);
    setInventaireMsg('');
    try {
      const r = await axios.get(API + '/inventaire-branches/' + detailClasse.id + '/branches/' + brancheId, { headers });
      setInventaireRows(r.data || []);
    } catch (err) {
      setInventaireRows([]);
      setInventaireMsg('Erreur chargement inventaire');
    }
    setInventaireLoading(false);
  };

  const ajouterLigneInventaire = async (e) => {
    e.preventDefault();
    if (!detailClasse?.id || !brancheInventaireActive?.id) return;
    if (!inventaireForm.nom_document.trim()) {
      setInventaireMsg('Le nom du document est requis');
      return;
    }
    try {
      await axios.post(
        API + '/inventaire-branches/' + detailClasse.id + '/branches/' + brancheInventaireActive.id,
        inventaireForm,
        { headers }
      );
      setInventaireForm({
        date_document: new Date().toISOString().split('T')[0],
        nom_document: '',
        sans_numero: false,
        remarques: '',
      });
      await chargerInventaireBranche(brancheInventaireActive.id);
    } catch (err) {
      setInventaireMsg('Erreur enregistrement inventaire');
    }
  };

  const supprimerLigneInventaire = async (id) => {
    if (!detailClasse?.id || !brancheInventaireActive?.id) return;
    if (!window.confirm('Supprimer cette ligne ?')) return;
    try {
      await axios.delete(
        API + '/inventaire-branches/' + detailClasse.id + '/branches/' + brancheInventaireActive.id + '/' + id,
        { headers }
      );
      await chargerInventaireBranche(brancheInventaireActive.id);
    } catch (err) {
      setInventaireMsg('Erreur suppression inventaire');
    }
  };

  const sauvegarderEditionInventaire = async (id) => {
    if (!detailClasse?.id || !brancheInventaireActive?.id) return;
    if (!inventaireEditForm.nom_document.trim()) {
      setInventaireMsg('Le nom du document est requis');
      return;
    }
    try {
      await axios.put(
        API + '/inventaire-branches/' + detailClasse.id + '/branches/' + brancheInventaireActive.id + '/' + id,
        inventaireEditForm,
        { headers }
      );
      setInventaireEditId(null);
      await chargerInventaireBranche(brancheInventaireActive.id);
    } catch (err) {
      setInventaireMsg('Erreur modification inventaire');
    }
  };

  const reordonnerInventaire = async (sourceId, targetId) => {
    if (!detailClasse?.id || !brancheInventaireActive?.id || !sourceId || !targetId || sourceId === targetId) return;
    const rows = [...inventaireRows];
    const srcIndex = rows.findIndex(r => String(r.id) === String(sourceId));
    const tgtIndex = rows.findIndex(r => String(r.id) === String(targetId));
    if (srcIndex < 0 || tgtIndex < 0) return;
    const [moved] = rows.splice(srcIndex, 1);
    rows.splice(tgtIndex, 0, moved);
    setInventaireRows(rows);
    try {
      await axios.post(
        API + '/inventaire-branches/' + detailClasse.id + '/branches/' + brancheInventaireActive.id + '/reorder',
        { ids: rows.map(r => r.id) },
        { headers }
      );
    } catch (err) {
      setInventaireMsg('Erreur réorganisation inventaire');
      await chargerInventaireBranche(brancheInventaireActive.id);
    }
  };

  const getVisaInitiales = (ligne) => {
    const nom = String(ligne?.auteur_nom || '').trim();
    const prenom = String(ligne?.auteur_prenom || '').trim();
    const initiales = (prenom ? prenom[0] : '') + (nom ? nom[0] : '');
    return initiales ? initiales.toUpperCase() : '—';
  };

  useEffect(() => {
    if (classeVueTab === 'inventaire' && brancheInventaireActive?.id) {
      chargerInventaireBranche(brancheInventaireActive.id);
    }
    if (classeVueTab === 'plan' && detailClasse?.id) {
      chargerPlanClasse();
    }
  }, [classeVueTab, brancheInventaireActive?.id]);

  const classesFiltrees = classes.filter(c => {
    const matchR = (c.nom+' '+(c.niveau||'')).toLowerCase().includes(recherche.toLowerCase());
    const matchA = filtreActif==='tous' || (filtreActif==='actif'&&c.actif!==false) || (filtreActif==='inactif'&&c.actif===false);
    const niveauClasse = String(c.niveau || '').toUpperCase();
    const matchN = filtreNiveau==='tous' || niveauClasse===filtreNiveau;
    return matchR && matchA && matchN;
  });
  const getSuiviNotesBadges = (classe) => {
    const niveauClasse = String(classe?.niveau || '').toUpperCase();
    const branchesNiveau = branches.filter(b =>
      String(b.niveau || '').toUpperCase() === niveauClasse &&
      b.suivi_notes !== false
    );
    return branchesNiveau.map(b => {
      const nb = suiviNotesClasse[`${classe.id}-${b.id}`] || 0;
      const designation = (b.designation_courte || b.nom || '').toString().trim();
      return {
        id: b.id,
        label: designation || '—',
        nb
      };
    });
  };

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

  // Vue PLAN DE CLASSE
  if (showPlanClasse && detailClasse) {
    const COLS = 10; const ROWS = 13;
    const elevesNonPlaces = elevesClasse.filter(el => !Object.values(planPositions).includes(String(el.id)));

    return (
      <div style={{...s.page, padding:'20px 24px'}}>
        <div style={s.header}>
          <button style={s.btnBack} onClick={() => setShowPlanClasse(false)}>← Retour liste</button>
          <h2 style={{...s.title, fontSize:18}}>🪑 Plan de classe — {detailClasse.nom}</h2>
          <div style={{display:'flex',gap:8}}>
            <button style={{...s.btnAdd,background:'#10b981'}} onClick={sauverPlanClasse}>💾 Sauvegarder</button>
            <button style={{...s.btnAdd,background:'#6366f1'}} onClick={imprimerPlanClasse}>🖨️ Imprimer PDF</button>
            <button style={{...s.btnAdd,background:'#ef4444'}} onClick={() => setPlanPositions({})}>🗑️ Réinitialiser</button>
          </div>
        </div>

        <div style={{display:'flex',gap:20,alignItems:'flex-start'}}>
          {/* Grille plan */}
          <div style={{flex:1,overflowX:'auto'}}>
            <div style={{fontSize:11,color:'#94a3b8',marginBottom:8,fontWeight:600}}>↑ Tableau / Entrée</div>
            <table style={{borderCollapse:'collapse',width:'100%',minWidth:700}}>
              <tbody>
                {Array.from({length:ROWS}).map((_,row) => (
                  <tr key={row}>
                    {row === ROWS-1 ? (
                      <td colSpan={COLS}
                        style={{background:'#0f172a',color:'white',textAlign:'center',fontWeight:800,fontSize:13,padding:'10px',borderRadius:6,cursor:'default'}}>
                        🎓 Bureau du professeur — {detailClasse.prof_prenom||''} {detailClasse.prof_nom||''}
                      </td>
                    ) : Array.from({length:COLS}).map((_,col) => {
                      const key = row+'-'+col;
                      const eleveId = planPositions[key];
                      const el = eleveId ? elevesClasse.find(e => String(e.id)===String(eleveId)) : null;
                      return (
                        <td key={col}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => dropOnCell(row, col)}
                          style={{border:'1.5px solid #e2e8f0',width:70,height:72,textAlign:'center',verticalAlign:'middle',background:el?'#e0e7ff':'white',borderRadius:4,cursor:'default',transition:'background 0.1s',position:'relative'}}>
                          {el ? (
                            <div draggable onDragStart={() => setDragEleve(String(el.id))}
                              style={{cursor:'grab',padding:2}}>
                              {el.photo
                                ? <img src={el.photo} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',border:'2px solid #6366f1',display:'block',margin:'0 auto'}} />
                                : <div style={{width:36,height:36,borderRadius:'50%',background:'#6366f1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:'white',margin:'0 auto'}}>{(el.prenom||'?')[0]}</div>
                              }
                              <div style={{fontSize:9,fontWeight:700,color:'#1e293b',marginTop:2,lineHeight:1.1}}>{el.prenom}</div>
                              <div style={{fontSize:8,color:'#475569'}}>{el.nom}</div>
                              <button onClick={() => {
                                const np = {...planPositions}; delete np[key]; setPlanPositions(np);
                              }} style={{position:'absolute',top:1,right:2,background:'none',border:'none',fontSize:10,cursor:'pointer',color:'#94a3b8',lineHeight:1}}>✕</button>
                            </div>
                          ) : (
                            <div style={{color:'#e2e8f0',fontSize:10}}>·</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Panneau élèves */}
          <div style={{width:160,flexShrink:0}}>
            <div style={{fontSize:11,fontWeight:700,color:'#475569',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.05em'}}>
              Élèves non placés ({elevesNonPlaces.length})
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:'70vh',overflowY:'auto'}}>
              {elevesNonPlaces.map(el => (
                <div key={el.id} draggable onDragStart={() => setDragEleve(String(el.id))}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'white',borderRadius:10,border:'1.5px solid #e2e8f0',cursor:'grab',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                  {el.photo
                    ? <img src={el.photo} style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',flexShrink:0}} />
                    : <div style={{width:32,height:32,borderRadius:'50%',background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#6366f1',flexShrink:0}}>{(el.prenom||'?')[0]}</div>
                  }
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'#1e293b'}}>{el.prenom}</div>
                    <div style={{fontSize:10,color:'#64748b'}}>{el.nom}</div>
                  </div>
                </div>
              ))}
              {elevesNonPlaces.length===0 && <div style={{fontSize:11,color:'#94a3b8',textAlign:'center',padding:16}}>Tous placés ✅</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const NIVEAUX_STD = [
    {id:'Chance 1',label:'Chance 1',type:'row'},
    {id:'Chance 2',label:'Chance 2',type:'row'},
    {id:'Chance 3',label:'Chance 3',type:'row'},
    {id:null,label:'Punition',type:'section'},
    {id:'Punition Chance 1',label:'Chance 1',type:'row'},
    {id:'Punition Chance 2',label:'Chance 2',type:'row'},
    {id:null,label:'Retenue samedi',type:'section'},
    {id:'Retenue samedi Chance 1',label:'Chance 1',type:'row'},
    {id:'Avertissement et entretien',label:'Avertissement et entretien',type:'row'},
  ];
  const ECHELLES = [
    { id:1, titre:"Echelle 1 — Directives de l'école", infractions:['Retard injustifié','Objets connectés','Devoir non fait'], niveaux:NIVEAUX_STD, note:"* L'utilisation des autres langues que le français est sanctionnée par une retenue de 5 minutes par remontrance le jour-même." },
    { id:2, titre:'Echelle 2 — Respect du règlement', infractions:['Nourriture en classe','Casquette/bonnet','Règles de pause','Moquerie','Prise de parole','Ascenseur','Dégradation du matériel'], niveaux:NIVEAUX_STD },
    { id:3, titre:'Echelle 3', infractions:['Violence verbale','Violence physique','Vol'], niveaux:[{id:'Mise à pied',label:'Mise à pied',type:'row'}], note:'* En cas de récidive, sur proposition des responsables et décision du chef de section.' },
  ];

  // Vue détail classe - liste élèves
  if (detailClasse) return (
    <div style={s.page}>
      <ModalZoom />

      {showDocsEleve && docsEleve && (
        <div style={s.overlay}>
          <div style={{...s.modal, maxWidth:600, width:'100%'}}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>📁 Documents — {docsEleve.prenom} {docsEleve.nom}</h3>
              <button style={s.btnClose} onClick={() => setShowDocsEleve(false)}>✕</button>
            </div>
            {isAdmin() && (
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:'#475569',marginBottom:8,textTransform:'uppercase'}}>Ajouter un document</div>
                <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                  <select style={{...s.inp,width:'auto',padding:'7px 10px'}} value={uploadEleveForm.type} onChange={e => setUploadEleveForm({type:e.target.value})}>
                    {['CV','Charte','Attestation','Justificatif','Bulletin de notes','Autre'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label style={{padding:'8px 16px',background:'#6366f1',color:'white',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13}}>
                    📎 Choisir un fichier
                    <input type="file" style={{display:'none'}} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => { if(e.target.files[0]) uploadDocumentEleve(e.target.files[0], uploadEleveForm.type); e.target.value=''; }} />
                  </label>
                  <span style={{fontSize:11,color:'#94a3b8'}}>PDF, Word, image — max 5MB</span>
                </div>
              </div>
            )}
            <div style={{borderTop:'1px solid #f1f5f9',paddingTop:16}}>
              {docsEleveLoading ? (
                <div style={{textAlign:'center',color:'#94a3b8',padding:20}}>Chargement...</div>
              ) : eleveDocs.length===0 ? (
                <div style={{textAlign:'center',color:'#94a3b8',padding:20,fontSize:13}}>Aucun document pour cet élève</div>
              ) : eleveDocs.map(doc => (
                <div key={doc.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderRadius:8,border:'1px solid #e2e8f0',marginBottom:8,background:'#f8fafc'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:20}}>{doc.nom.endsWith('.pdf')?'📄':doc.nom.match(/\.(jpg|jpeg|png)$/i)?'🖼️':'📝'}</span>
                    <div>
                      <div style={{fontWeight:600,fontSize:13,color:'#1e293b'}}>{doc.nom}</div>
                      <div style={{fontSize:11,color:'#94a3b8'}}>
                        <span style={{background:'#e0e7ff',color:'#3730a3',padding:'1px 7px',borderRadius:99,fontWeight:600,marginRight:6}}>{doc.type}</span>
                        {doc.taille ? Math.round(doc.taille/1024)+'KB · ' : ''}
                        {new Date(doc.created_at).toLocaleDateString('fr-CH')}
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={() => telechargerDocumentEleve(doc)} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,opacity:0.7}} title="Télécharger">⬇️</button>
                    {isAdmin() && <button onClick={() => supprimerDocumentEleve(doc.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,opacity:0.7}} title="Supprimer">🗑️</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSanctions && sanctionsEleve && (
        <div style={s.overlay}>
          <div style={{...s.modal, width:'95vw', maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto', padding:24}}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>⚠️ Sanctions — {sanctionsEleve.prenom} {sanctionsEleve.nom}</h3>
              <button style={s.btnClose} onClick={() => { setShowSanctions(false); setPendingCell(null); }}>✕</button>
            </div>
            {sanctionsLoading ? (
              <div style={{textAlign:'center',color:'#94a3b8',padding:30}}>Chargement...</div>
            ) : <>
              <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'12px 16px',marginBottom:20,fontSize:12,color:'#78350f',lineHeight:1.7}}>
                <div>Toutes les cases (chances, retenues et avertissements) doivent être visées et datées par le FL ou les responsables.</div>
                <div>Pour valider une retenue ou un avertissement, il est impératif qu'une fiche d'observation soit préalablement rédigée.</div>
                <div>— Envoyer une copie au titulaire et aux responsables.</div>
                <div>— Classer le document dans le dossier de l'élève.</div>
              </div>
              {ECHELLES.map(echelle => (
              <div key={echelle.id} style={{marginBottom:28}}>
                <div style={{fontSize:13,fontWeight:700,color:'#3730a3',background:'#e0e7ff',padding:'6px 14px',borderRadius:6,marginBottom:10}}>{echelle.titre}</div>
                <table style={{borderCollapse:'collapse',width:'100%',fontSize:11,tableLayout:'fixed'}}>
                    <thead>
                      <tr>
                        <th style={{padding:'5px 8px',background:'#f8fafc',border:'1px solid #e2e8f0',width:'13%'}}></th>
                        {echelle.infractions.map(inf => (
                          <th key={inf} style={{padding:'5px 6px',background:'#f8fafc',border:'1px solid #e2e8f0',textAlign:'center',fontWeight:700,color:'#64748b',wordBreak:'break-word',lineHeight:1.3}}>{inf}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {echelle.niveaux.map((niveau, idx) => {
                        if (niveau.type === 'section') return (
                          <tr key={'s-'+idx}>
                            <td colSpan={echelle.infractions.length+1} style={{padding:'4px 10px',background:'#e0e7ff',color:'#3730a3',fontWeight:700,fontSize:10,borderTop:'2px solid #c7d2fe',borderBottom:'1px solid #c7d2fe'}}>{niveau.label}</td>
                          </tr>
                        );
                        return (
                        <tr key={niveau.id}>
                          <td style={{padding:'5px 8px',border:'1px solid #e2e8f0',fontWeight:600,color:'#374151',background:'#fafafa',whiteSpace:'nowrap',fontSize:10}}>{niveau.label}</td>
                          {echelle.infractions.map(infraction => {
                            const sanction = eleveSanctions.find(s => s.echelle===echelle.id && s.infraction===infraction && s.niveau===niveau.id);
                            const isPending = pendingCell && pendingCell.echelle===echelle.id && pendingCell.infraction===infraction && pendingCell.niveau===niveau.id;
                            return (
                              <td key={infraction} style={{padding:'4px 4px',border:'1px solid #e2e8f0',textAlign:'center',background:sanction?'#fef3c7':'white',verticalAlign:'middle'}}>
                                {isPending ? (
                                  <div style={{display:'flex',flexDirection:'column',gap:3,textAlign:'left'}}>
                                    <div style={{fontSize:10,color:'#374151',padding:'3px 6px',background:'#f1f5f9',borderRadius:4,fontWeight:600}}>
                                      📅 {pendingCell.date_sanction ? new Date(pendingCell.date_sanction+'T00:00:00').toLocaleDateString('fr-CH') : ''}
                                    </div>
                                    <div style={{fontSize:10,color:'#374151',padding:'3px 6px',background:'#f1f5f9',borderRadius:4,fontWeight:600}}>
                                      👤 {pendingCell.prof_nom}
                                    </div>
                                    <div style={{display:'flex',gap:4}}>
                                      <button onClick={confirmerSanction} style={{flex:1,padding:'3px 0',background:'#10b981',color:'white',border:'none',borderRadius:4,cursor:'pointer',fontSize:11,fontWeight:600}}>✓ OK</button>
                                      <button onClick={() => setPendingCell(null)} style={{flex:1,padding:'3px 0',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:4,cursor:'pointer',fontSize:11}}>✕</button>
                                    </div>
                                  </div>
                                ) : sanction ? (
                                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                                    <span style={{fontSize:16}}>✅</span>
                                    <span style={{fontSize:9,color:'#92400e',lineHeight:1.2}}>{sanction.date_sanction ? new Date(sanction.date_sanction).toLocaleDateString('fr-CH') : ''}</span>
                                    <span style={{fontSize:9,color:'#92400e',lineHeight:1.2}}>{sanction.prof_nom||''}</span>
                                    {isAdmin() && <button onClick={() => supprimerSanction(sanction.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:10,color:'#ef4444',padding:0}} title="Retirer">🗑️</button>}
                                  </div>
                                ) : (
                                  isAdmin() ? (
                                    <button onClick={() => {
                                        const today = new Date().toISOString().split('T')[0];
                                        const profNom = currentUser ? ((currentUser.prenom||'')+' '+(currentUser.nom||'')).trim() : '';
                                        setPendingCell({echelle:echelle.id,infraction,niveau:niveau.id,date_sanction:today,prof_nom:profNom});
                                      }}
                                      style={{width:20,height:20,borderRadius:4,border:'2px solid #d1d5db',background:'white',cursor:'pointer',display:'inline-block'}} title="Ajouter" />
                                  ) : (
                                    <span style={{width:20,height:20,borderRadius:4,border:'2px solid #e2e8f0',background:'#f9fafb',display:'inline-block'}} />
                                  )
                                )}
                              </td>
                            );
                          })}
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                {echelle.note && (
                  <div style={{fontSize:11,color:'#64748b',fontStyle:'italic',marginTop:8,paddingLeft:4}}>{echelle.note}</div>
                )}
              </div>
            ))}
            </>}
          </div>
        </div>
      )}
      <div style={s.header}>
        <button style={s.btnBack} onClick={() => setDetailClasse(null)}>← Retour classes</button>
        <h2 style={s.title}>🏫 Classe {detailClasse.nom}</h2>
        {detailClasse.prof_prenom && <span style={{...s.chip,background:'#d1fae5',color:'#065f46'}}>Titulaire : {detailClasse.prof_prenom} {detailClasse.prof_nom}</span>}
      </div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{display:'flex',gap:8}}>
          <button
            style={{...s.btnAdd,...(classeVueTab==='eleves'?{}:s.btnGhost)}}
            onClick={() => setClasseVueTab('eleves')}
          >
            📋 Liste des élèves
          </button>
          <button
            style={{...s.btnAdd,...(classeVueTab==='inventaire'?{}:s.btnGhost)}}
            onClick={() => setClasseVueTab('inventaire')}
          >
            📦 Inventaire
          </button>
          <button
            style={{...s.btnAdd,...(classeVueTab==='plan'?{}:s.btnGhost)}}
            onClick={() => setClasseVueTab('plan')}
          >
            🪑 Plan de classe
          </button>
          <button
            style={{...s.btnAdd,...(classeVueTab==='trombinoscope'?{}:s.btnGhost)}}
            onClick={() => setClasseVueTab('trombinoscope')}
          >
            📸 Trombinoscope
          </button>
        </div>
        <div style={{display:'flex',gap:8}}>
          {classeVueTab === 'plan' && (
            <>
              <button style={{...s.btnAdd,background:'#10b981'}} onClick={sauverPlanClasse}>💾 Sauvegarder</button>
              <button style={{...s.btnAdd,background:'#6366f1'}} onClick={imprimerPlanClasse}>🖨️ Imprimer PDF</button>
              <button style={{...s.btnAdd,background:'#ef4444'}} onClick={() => setPlanPositions({})}>🗑️ Réinitialiser</button>
            </>
          )}
          {classeVueTab === 'trombinoscope' && (
            <button style={{...s.btnAdd,background:'#6366f1'}} onClick={imprimerTrombinoscope}>🖨️ Imprimer PDF</button>
          )}
        </div>
      </div>

      {classeVueTab === 'eleves' ? (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {['Photo','Nom','Prénom','Contact','Documents','Sanctions','Observations'].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {elevesClasse.length===0 ? (
                <tr><td colSpan="7" style={s.empty}>Aucun élève dans cette classe</td></tr>
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
                          <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" style={{display:'none'}} onChange={async (ev) => {
                            const file = ev.target.files[0];
                            if (!file) return;
                            if (file.size > 2*1024*1024) { alert('Image trop grande (max 2MB)'); return; }
                            try {
                              const photoData = await convertirImagePourUpload(file);
                              await axios.put(API+'/eleves/'+el.id+'/photo', {photo: photoData}, {headers});
                              const r = await axios.get(API+'/classes/'+detailClasse.id+'/eleves', {headers});
                              setElevesClasse(r.data);
                            } catch(err) {
                              alert('Erreur upload photo: ' + (err.response?.data?.message || err.message || 'fichier non supporte'));
                            } finally {
                              ev.target.value = '';
                            }
                          }} />
                        </label>
                      )}
                    </div>
                  </td>
                  <td style={{...s.td,fontWeight:700}}>{el.nom || '—'}</td>
                  <td style={s.td}>{el.prenom || '—'}</td>
                  <td style={s.td}>{el.nom_parent || el.personne_contact || '—'}</td>
                  <td style={s.td}><button style={{...s.btnDetail,background:'#dbeafe',color:'#1e40af'}} onClick={() => ouvrirDocumentsEleve(el)} title="Documents">📁</button></td>
                  <td style={s.td}><button style={{...s.btnDetail,background:'#fff7ed',color:'#c2410c'}} onClick={() => ouvrirSanctions(el)} title="Sanctions">⚠️</button></td>
                  <td style={s.td}><button style={s.btnDetail} onClick={() => ouvrirEleveDetail(el)}>👁 Détail</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : classeVueTab === 'inventaire' ? (
        <div style={s.inventoryLayout}>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Branche</th>
                </tr>
              </thead>
              <tbody>
                {branchesInventaire.length===0 ? (
                  <tr><td style={s.empty}>Aucune branche</td></tr>
                ) : branchesInventaire.map(b => (
                  <tr
                    key={b.id}
                    style={String(brancheInventaireActive?.id)===String(b.id) ? s.trActive : s.tr}
                    onClick={() => setBrancheInventaireActive(b)}
                  >
                    <td style={{...s.td,cursor:'pointer'}}>
                      <div style={{fontWeight:700}}>{b.nom}</div>
                      <div style={{fontSize:11,color:'#94a3b8'}}>{b.niveau || '—'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={s.tableWrap}>
            {inventaireMsg && <div style={s.invMsg}>{inventaireMsg}</div>}
            {brancheInventaireActive ? (
              <>
                <div style={s.invTitle}>Inventaire: {brancheInventaireActive.nom}</div>
                <form onSubmit={ajouterLigneInventaire} style={s.invForm}>
                  <input type="date" style={s.inp} value={inventaireForm.date_document} onChange={e => setInventaireForm({...inventaireForm,date_document:e.target.value})} />
                  <input type="text" style={s.inp} placeholder="Nom du document *" value={inventaireForm.nom_document} onChange={e => setInventaireForm({...inventaireForm,nom_document:e.target.value})} />
                  <label style={s.invToggle}>
                    <input type="checkbox" checked={inventaireForm.sans_numero} onChange={e => setInventaireForm({...inventaireForm,sans_numero:e.target.checked})} />
                    Pas de numéro
                  </label>
                  <input type="text" style={s.inp} placeholder="Remarques" value={inventaireForm.remarques} onChange={e => setInventaireForm({...inventaireForm,remarques:e.target.value})} />
                  <button type="submit" style={s.btnAdd}>+ Ajouter</button>
                </form>

                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      {['Date','Nom du document','Numéro','Remarques','VISA','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {inventaireLoading ? (
                      <tr><td colSpan="6" style={s.empty}>Chargement...</td></tr>
                    ) : inventaireRows.length===0 ? (
                      <tr><td colSpan="6" style={s.empty}>Aucune ligne d’inventaire</td></tr>
                    ) : (() => {
                      let compteurNumero = 0;
                      return inventaireRows.map(l => {
                        const sansNumero = !!l.sans_numero;
                        const numeroAffiche = sansNumero ? '—' : String(++compteurNumero);
                        const isEditing = inventaireEditId === l.id;
                        return (
                          <tr
                            key={l.id}
                            style={s.tr}
                            draggable
                            onDragStart={() => setDragInventaireId(l.id)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              reordonnerInventaire(dragInventaireId, l.id);
                              setDragInventaireId(null);
                            }}
                          >
                            {isEditing ? (
                              <>
                                <td style={s.td}><input type="date" style={s.inp} value={inventaireEditForm.date_document?.substring(0,10) || ''} onChange={e => setInventaireEditForm({...inventaireEditForm,date_document:e.target.value})} /></td>
                                <td style={s.td}><input type="text" style={s.inp} value={inventaireEditForm.nom_document} onChange={e => setInventaireEditForm({...inventaireEditForm,nom_document:e.target.value})} /></td>
                                <td style={s.td}>
                                  <label style={s.invToggle}>
                                    <input type="checkbox" checked={!!inventaireEditForm.sans_numero} onChange={e => setInventaireEditForm({...inventaireEditForm,sans_numero:e.target.checked})} />
                                    Pas de numéro
                                  </label>
                                </td>
                                <td style={s.td}><input type="text" style={s.inp} value={inventaireEditForm.remarques || ''} onChange={e => setInventaireEditForm({...inventaireEditForm,remarques:e.target.value})} /></td>
                                <td style={s.td}>
                                  <span style={s.visaBadge}>{getVisaInitiales(l)}</span>
                                </td>
                                <td style={s.td}>
                                  <button style={s.btnEdit} onClick={() => sauvegarderEditionInventaire(l.id)}>✅</button>
                                  <button style={s.btnDel} onClick={() => setInventaireEditId(null)}>✕</button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={s.td}>{l.date_document ? new Date(l.date_document).toLocaleDateString('fr-CH') : '—'}</td>
                                <td style={{...s.td,fontWeight:700}}>{l.nom_document || '—'}</td>
                                <td style={s.td}>{numeroAffiche}</td>
                                <td style={s.td}>{l.remarques || '—'}</td>
                                <td style={s.td}>
                                  <span style={s.visaBadge}>{getVisaInitiales(l)}</span>
                                </td>
                                <td style={s.td}>
                                  <button
                                    style={s.btnEdit}
                                    onClick={() => {
                                      setInventaireEditId(l.id);
                                      setInventaireEditForm({
                                        date_document: l.date_document ? l.date_document.substring(0,10) : '',
                                        nom_document: l.nom_document || '',
                                        sans_numero: !!l.sans_numero,
                                        remarques: l.remarques || '',
                                      });
                                    }}
                                  >
                                    ✏️
                                  </button>
                                  <button style={s.btnEdit} title="Déplacer" onMouseDown={() => setDragInventaireId(l.id)}>↕️</button>
                                  <button style={s.btnDel} onClick={() => supprimerLigneInventaire(l.id)}>🗑️</button>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </>
            ) : (
              <div style={s.empty}>Sélectionnez une branche</div>
            )}
          </div>
        </div>
      ) : classeVueTab === 'plan' ? (
        renderPlanClasseOnglet()
      ) : (
        renderTrombinoscopeOnglet()
      )}
    </div>
  );

  // Vue principale - liste classes
  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.btnBack} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={s.title}>🏫 Classes</h2>
        {isAdmin() && <button style={s.btnAdd} onClick={() => { setShowForm(true); setClasseEdit(null); setForm({nom:'',niveau:'',annee_scolaire:'',prof_principal_id:''}); }}>+ Ajouter</button>}
      </div>
      <div style={s.controlsRow}>
        <div style={s.filtres}>
          {[{id:'tous',label:'Toutes'},{id:'CSC',label:'CSC'},{id:'CFR',label:'CFR'},{id:'EPL',label:'EPL'}].map(f => (
            <button key={f.id} style={{...s.filtrBtn,...(filtreNiveau===f.id?s.filtrActif:{})}} onClick={() => setFiltreNiveau(f.id)}>{f.label}</button>
          ))}
          {[{id:'actif',label:'Actives'},{id:'inactif',label:'Inactives'}].map(f => (
            <button key={f.id} style={{...s.filtrBtn,...(filtreActif===f.id?s.filtrActif:{})}} onClick={() => setFiltreActif(f.id)}>{f.label}</button>
          ))}
        </div>
        <div style={s.searchBox}>
          <span style={s.searchIcon}>🔍</span>
          <input style={s.searchInput} placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} />
        </div>
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
                <div style={s.field}><label style={s.lbl}>Nom de la classe *</label><input style={s.inp} type="text" required value={form.nom} onChange={e => setForm({...form,nom:e.target.value})} placeholder="Ex: CSC 03, CFR 10, EPL 05..." /></div>
                <div style={s.field}>
                  <label style={s.lbl}>Niveau *</label>
                  <select style={s.inp} required value={form.niveau} onChange={e => setForm({...form,niveau:e.target.value})}>
                    <option value="">-- Choisir --</option>
                    <option value="CSC">CSC</option>
                    <option value="CFR">CFR</option>
                    <option value="EPL">EPL</option>
                  </select>
                </div>
                
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
              <th style={{...s.th, width:84, minWidth:84, maxWidth:84, textAlign:'center'}}></th>
              <th style={{...s.th, minWidth:170}}>Classe</th>
              <th style={{...s.th, minWidth:210}}>Titulaire</th>
              <th style={s.th}>Notes</th>
              <th style={{...s.th, width:118, minWidth:118, maxWidth:118, textAlign:'center'}}>Statut</th>
              {isAdmin() && <th style={{...s.th, width:92, minWidth:92, maxWidth:92, textAlign:'center'}}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {classesFiltrees.length===0 ? (
              <tr><td colSpan={isAdmin()?6:5} style={s.empty}>Aucune classe trouvée</td></tr>
            ) : classesFiltrees.map(c => {
              const badgesNotes = getSuiviNotesBadges(c);
              return (
              <tr key={c.id} style={s.tr}>
                <td style={{...s.td, width:84, minWidth:84, maxWidth:84, textAlign:'center'}}><button style={s.btnDetail} onClick={() => ouvrirDetail(c)}>👁 Détail</button></td>
                <td style={{...s.td,minWidth:170}}>
                  <div style={{fontWeight:700,color:'#1e293b'}}>{c.nom}</div>
                </td>
                <td style={{...s.td, minWidth:210}}>{c.prof_prenom ? <span>{c.prof_prenom} <b>{c.prof_nom}</b></span> : <span style={{color:'#94a3b8'}}>—</span>}</td>
                <td style={s.td}>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {badgesNotes.length === 0 ? (
                      <span style={{color:'#94a3b8'}}>—</span>
                    ) : (
                      badgesNotes.map(b => (
                        <span
                          key={b.id}
                          style={{
                            background: b.nb >= 3 ? '#dcfce7' : '#fee2e2',
                            color: b.nb >= 3 ? '#166534' : '#991b1b',
                            padding:'3px 8px',
                            borderRadius:99,
                            fontSize:11,
                            fontWeight:700,
                            lineHeight:1.2
                          }}
                        >
                          {b.label} {b.nb}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td style={{...s.td, width:118, minWidth:118, maxWidth:118, textAlign:'center'}}>
                  <button style={c.actif!==false?s.badgeActive:s.badgeInactif} onClick={() => toggleActif(c)}>
                    {c.actif!==false?'✅ Active':'❌ Inactif'}
                  </button>
                </td>
                {isAdmin() && <td style={{...s.td, width:92, minWidth:92, maxWidth:92, textAlign:'center'}}>
                  <button style={s.btnEdit} onClick={() => handleEdit(c)}>✏️</button>
                  <button style={s.btnDel} onClick={() => handleDelete(c.id)}>🗑️</button>
                </td>}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const s = {
  page:{padding:'28px 32px',background:'#f8fafc',minHeight:'100vh',fontFamily:"'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif"},
  header:{display:'flex',alignItems:'center',gap:14,marginBottom:12,flexWrap:'wrap'},
  btnBack:{padding:'8px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,color:'#475569'},
  title:{fontSize:22,fontWeight:800,color:'#0f172a',flex:1,margin:0},
  controlsRow:{display:'flex',alignItems:'center',gap:10,marginBottom:16,flexWrap:'wrap'},
  chip:{padding:'5px 12px',borderRadius:99,fontSize:12,fontWeight:600},
  searchBox:{position:'relative',display:'flex',alignItems:'center'},
  searchIcon:{position:'absolute',left:10,fontSize:13},
  searchInput:{padding:'8px 12px 8px 32px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,width:200,background:'white',outline:'none'},
  filtres:{display:'flex',gap:4},
  filtrBtn:{padding:'7px 12px',background:'white',border:'1px solid #e2e8f0',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:500,color:'#64748b'},
  filtrActif:{background:'#6366f1',color:'white',border:'1px solid #6366f1'},
  btnAdd:{padding:'8px 16px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  btnGhost:{background:'white',color:'#475569',border:'1px solid #e2e8f0'},
  statsBar:{display:'flex',gap:10,marginBottom:12},
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
  btnSave:{padding:'9px 20px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  tableWrap:{overflowX:'auto',borderRadius:12,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #f1f5f9'},
  table:{width:'100%',borderCollapse:'collapse',background:'white'},
  thead:{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'},
  th:{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'},
  tr:{borderBottom:'1px solid #f8fafc'},
  trActive:{borderBottom:'1px solid #f8fafc',background:'#eef2ff'},
  td:{padding:'11px 14px',fontSize:13,color:'#374151'},
  empty:{padding:40,textAlign:'center',color:'#94a3b8'},
  inventoryLayout:{display:'grid',gridTemplateColumns:'320px 1fr',gap:14,alignItems:'start'},
  invTitle:{fontSize:14,fontWeight:800,color:'#0f172a',padding:'14px 14px 0'},
  invMsg:{margin:'12px 12px 0',padding:'8px 10px',borderRadius:8,background:'#fee2e2',color:'#991b1b',fontSize:12,fontWeight:700},
  invForm:{display:'grid',gridTemplateColumns:'140px 1.4fr auto 1fr auto',gap:8,padding:14,alignItems:'center'},
  invToggle:{display:'inline-flex',alignItems:'center',gap:6,fontSize:12,color:'#475569',fontWeight:600,whiteSpace:'nowrap'},
  trombiGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:14},
  trombiCard:{display:'flex',flexDirection:'column',alignItems:'center',padding:16,background:'white',borderRadius:12,border:'1px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'},
  trombiImg:{width:86,height:86,borderRadius:'50%',objectFit:'cover',border:'3px solid #e0e7ff',marginBottom:10},
  trombiFallback:{width:86,height:86,borderRadius:'50%',background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,fontWeight:800,color:'#6366f1',marginBottom:10},
  trombiPrenom:{fontWeight:800,fontSize:14,color:'#1e293b',textAlign:'center'},
  trombiNom:{fontWeight:600,fontSize:13,color:'#475569',textAlign:'center'},
  visaBadge:{display:'inline-flex',alignItems:'center',justifyContent:'center',minWidth:34,height:24,padding:'0 8px',borderRadius:99,background:'#e0e7ff',color:'#3730a3',fontSize:11,fontWeight:800,letterSpacing:'0.04em'},
  badge:{display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:99,fontSize:11,fontWeight:600},
  badgeActive:{background:'#d1fae5',color:'#065f46',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600,border:'none',cursor:'pointer'},
  badgeInactif:{background:'#f1f5f9',color:'#475569',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600,border:'none',cursor:'pointer'},
  btnDetail:{padding:'5px 10px',background:'#e0e7ff',color:'#3730a3',border:'none',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:600,marginRight:4},
  btnEdit:{background:'none',border:'none',cursor:'pointer',fontSize:14,marginRight:4,opacity:0.6},
  btnDel:{background:'none',border:'none',cursor:'pointer',fontSize:14,opacity:0.6},
};
