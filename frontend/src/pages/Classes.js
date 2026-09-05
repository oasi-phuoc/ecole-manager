/* eslint-disable */
import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import apiClient from '../lib/apiClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSessionUser } from '../utils/session';
import { stickyPageChrome } from '../styles/pageShell';
import { injectForcedPrintCss, openPrintPopup } from '../utils/print';
import CustomSelect from '../components/CustomSelect';
import { PageLoader, LoadingButton } from '../components/LoadingUI';
import Toast from '../components/Toast';

function mapSuiviNotesClasse(rows) {
  const map = {};
  (Array.isArray(rows) ? rows : []).forEach((x) => {
    map[`${x.classe_id}-${x.matiere_id}`] = parseInt(x.nb_evaluations, 10) || 0;
  });
  return map;
}

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profs, setProfs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [suiviNotesClasse, setSuiviNotesClasse] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [classeEdit, setClasseEdit] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [showInactif, setShowInactif] = useState(false);
  const [filtreNiveau, setFiltreNiveau] = useState('tous');
  const [showNiveauxFiltres, setShowNiveauxFiltres] = useState(false);
  const [niveauxDB, setNiveauxDB] = useState([]);
  const [form, setForm] = useState({ nom:'', niveau:'', annee_scolaire:'', prof_principal_id:'' });
  const [detailClasse, setDetailClasse] = useState(null);
  const [elevesClasse, setElevesClasse] = useState([]);
  const [loadingElevesClasse, setLoadingElevesClasse] = useState(false);
  const [observations, setObservations] = useState([]);
  const [eleveDetail, setEleveDetail] = useState(null);
  const [showObsForm, setShowObsForm] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(null);
  const [obsEditId, setObsEditId] = useState(null);
  const [obsEditForm, setObsEditForm] = useState({titre:'',contenu:'',mesure_prise:'',intervention_responsable:false,demande_entretien:false,intervention_titulaire:false});
  const [obsForm, setObsForm] = useState({ titre:'', contenu:'', mesure_prise:'', intervention_responsable:false, demande_entretien:false });
  const [filtreElevesActif, setFiltreElevesActif] = useState('actif');
  const [loraUpdateLoading, setLoraUpdateLoading] = useState(false);
  const [loraImportLoading, setLoraImportLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [planToast, setPlanToast] = useState(false);
  const [sanctionToast, setSanctionToast] = useState('');
  const [rechercheInventaire, setRechercheInventaire] = useState('');
  const [rechercheDevoirs, setRechercheDevoirs] = useState('');
  const [rechercheElevesClasse, setRechercheElevesClasse] = useState('');
  const [showObs, setShowObs] = useState(false);
  const [obsEleve, setObsEleve] = useState(null);
  const [showEleveReadOnly, setShowEleveReadOnly] = useState(false);
  const [eleveReadOnly, setEleveReadOnly] = useState(null);
  const [derniereActuClasse, setDerniereActuClasse] = useState(null);
  const [showSanctions, setShowSanctions] = useState(false);
  const [sanctionsEleve, setSanctionsEleve] = useState(null);
  const [eleveSanctions, setEleveSanctions] = useState([]);
  const headers = {};
  const currentUser = getSessionUser() || null;

  useEffect(() => {
    chargerTout();
    apiClient.get('/donnees/niveaux').then(r => setNiveauxDB(r.data || [])).catch(() => {});
  }, []);

  const chargerTout = async () => {
    try {
      const [cl, pr, br, sn] = await Promise.allSettled([
        apiClient.get('/classes', {headers}),
        apiClient.get('/profs', {headers}),
        apiClient.get('/branches', {headers}),
        apiClient.get('/notes/suivi-classes', {headers}),
      ]);
      if (cl.status === 'fulfilled') setClasses(Array.isArray(cl.value.data) ? cl.value.data : []);
      else console.error('Erreur classes:', cl.reason);
      if (pr.status === 'fulfilled') {
        const list = Array.isArray(pr.value.data) ? pr.value.data : [];
        setProfs(list.filter(p => p.actif !== false));
      } else console.error('Erreur profs:', pr.reason);
      if (br.status === 'fulfilled') setBranches(Array.isArray(br.value.data) ? br.value.data : []);
      else console.error('Erreur branches:', br.reason);
      if (sn.status === 'fulfilled') {
        setSuiviNotesClasse(mapSuiviNotesClasse(sn.value.data));
      } else {
        console.error('Erreur suivi notes classes:', sn.reason);
        setSuiviNotesClasse({});
      }
    } finally {
      setLoading(false);
    }
  };

  const mettreAJourLORA = async (file) => {
    if (!file) return;
    setLoraUpdateLoading(true);
    try {
      const fd = new FormData(); fd.append('fichier', file);
      const r = await apiClient.post('/import/update-lora', fd, { headers: {'Content-Type':'multipart/form-data'} });
      alert(r.data.message);
      chargerTout();
    } catch(err) { alert('Erreur mise à jour LORA: '+(err.response?.data?.message||err.message)); }
    setLoraUpdateLoading(false);
  };

  const importerLORA = async (file) => {
    if (!file) return;
    setLoraImportLoading(true);
    try {
      const fd = new FormData(); fd.append('fichier', file);
      const r = await apiClient.post('/import/eleves', fd, { headers: {'Content-Type':'multipart/form-data'} });
      alert(r.data.message);
      chargerTout();
    } catch(err) { alert('Erreur import LORA: '+(err.response?.data?.message||err.message)); }
    setLoraImportLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    setSaving(true);
    try {
      if (classeEdit) await apiClient.put('/classes/'+classeEdit.id, form, {headers});
      else await apiClient.post('/classes', form, {headers});
      setShowForm(false); setClasseEdit(null);
      setForm({nom:'',niveau:'',annee_scolaire:'',prof_principal_id:''});
      chargerTout();
    } catch(err) { alert('Erreur: '+(err.response?.data?.message||err.message)); }
    finally { setSaving(false); }
  };

  const handleEdit = (c) => {
    setClasseEdit(c);
    setForm({ nom:c.nom||'', niveau:c.niveau||'', annee_scolaire:c.annee_scolaire||'', prof_principal_id:c.prof_principal_id||'' });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cette classe ?')) {
      await apiClient.delete('/classes/'+id, {headers});
      chargerTout();
    }
  };

  const toggleActif = async (c) => {
    if (!isAdmin()) return;
    await apiClient.put('/classes/'+c.id, {...c, actif:!c.actif, prof_principal_id:c.prof_principal_id||null}, {headers});
    chargerTout();
  };

  const ouvrirDetail = async (c, tab = 'eleves', { syncUrl = true } = {}) => {
    setDetailClasse(c);
    if (syncUrl) setSearchParams({ detail: c.id, tab });
    setEleveDetail(null);
    setObservations([]);
    setInventaireMsg('');
    setInventaireRows([]);
    setBranchesInventaire([]);
    setBrancheInventaireActive(null);
    setElevesClasse([]);
    setLoadingElevesClasse(true);
    setPlanPositions({});
    setDevoirActif(null);
    setDevoirs([]);
    setSuiviDevoirs([]);
    setRechercheElevesClasse('');
    setDerniereActuClasse(null);
    const branchesFallbackNiveau = () => {
      const niveauClasse = String(c?.niveau || '').trim().toUpperCase();
      return (branches || [])
        .filter(b => String(b?.niveau || '').trim().toUpperCase() === niveauClasse)
        .map(b => ({
          id: b.id,
          nom: b.nom,
          code: b.code || '',
          designation_courte: b.designation_courte || '',
          niveau: b.niveau,
          type_branche: b.type_branche || '',
        }));
    };
    try {
      const elevesRes = await apiClient.get('/classes/'+c.id+'/eleves', {headers});
      setElevesClasse(elevesRes.data);
    } catch(err) { console.error('Erreur chargement élèves:', err); }
    finally { setLoadingElevesClasse(false); }
    try {
      const branchesRes = await apiClient.get('/inventaire-branches/'+c.id+'/branches', {headers});
      let brs = branchesRes.data?.branches || [];
      if (brs.length === 0) {
        brs = branchesFallbackNiveau();
      }
      const brsTries = trierBranchesParType(brs);
      setBranchesInventaire(brsTries);
      if (brsTries.length > 0) setBrancheInventaireActive(brsTries[0]);
    } catch(err) {
      console.error('Erreur chargement branches inventaire:', err);
      const brs = trierBranchesParType(branchesFallbackNiveau());
      setBranchesInventaire(brs);
      if (brs.length > 0) setBrancheInventaireActive(brs[0]);
    }
    try {
      const r = await apiClient.get('/classes/'+c.id+'/activites-recentes', {headers});
      setDerniereActuClasse(r.data || null);
    } catch(err) { setDerniereActuClasse(null); }
  };

  const ouvrirEleveDetail = async (eleve) => {
    setEleveDetail(eleve);
    try {
      const r = await apiClient.get('/observations/eleve/'+eleve.id, {headers});
      setObservations(r.data);
    } catch(err) { console.error(err); }
  };

  const sauverObservation = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/observations/eleve/'+eleveDetail.id, obsForm, {headers});
      setObsForm({titre:'',contenu:'',mesure_prise:'',intervention_responsable:false,demande_entretien:false,intervention_titulaire:false});
      setShowObsForm(false);
      const r = await apiClient.get('/observations/eleve/'+eleveDetail.id, {headers});
      setObservations(r.data);
    } catch(err) { alert('Erreur: '+err.message); }
    finally { setSaving(false); }
  };

  const [planPositions, setPlanPositions] = useState({});
  const [dragEleve, setDragEleve] = useState(null);

  const [showDocsEleve, setShowDocsEleve] = useState(false);
  const [docsEleve, setDocsEleve] = useState(null);
  const [eleveDocs, setEleveDocs] = useState([]);
  const [docsEleveLoading, setDocsEleveLoading] = useState(false);
  const [docPreview, setDocPreview] = useState(null);
  const [uploadEleveForm, setUploadEleveForm] = useState({ type: 'CV' });

  const [sanctionsLoading, setSanctionsLoading] = useState(false);
  const [sanctionsObservations, setSanctionsObservations] = useState([]);
  const [editSanction, setEditSanction] = useState(null);
  const [pendingCell, setPendingCell] = useState(null);
  const classeVueTab = searchParams.get('tab') || 'eleves';
  const [devoirs, setDevoirs] = useState([]);
  const [devoirActif, setDevoirActif] = useState(null);
  const [suiviDevoirs, setSuiviDevoirs] = useState([]);
  const [showDevoirForm, setShowDevoirForm] = useState(false);
  const [devoirSousOnglet, setDevoirSousOnglet] = useState('devoirs');
  const [devoirBrancheFiltre, setDevoirBrancheFiltre] = useState(null);
  const [showDevoirBranchesFiltres, setShowDevoirBranchesFiltres] = useState(false);
  const [statsAllSuivis, setStatsAllSuivis] = useState({});
  const [devoirEditId, setDevoirEditId] = useState(null);
  const [devoirEditForm, setDevoirEditForm] = useState({ titre: '', matiere: '', date_devoir: '', date_remise: '' });
  const [devoirForm, setDevoirForm] = useState({ titre: '', matiere: '', date_devoir: '', date_remise: '' });
  const [devoirsLoading, setDevoirsLoading] = useState(false);
  const [branchesInventaire, setBranchesInventaire] = useState([]);
  const [brancheInventaireActive, setBrancheInventaireActive] = useState(null);
  const [showInventaireBranchesFiltres, setShowInventaireBranchesFiltres] = useState(false);
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
  const trierBranchesParType = (liste) => {
    const prioriteCode = (code) => {
      const c = String(code || '').trim().toUpperCase();
      if (c === 'FR') return 0;
      if (c === 'MATH' || c === 'MA') return 1;
      return 2;
    };
    return [...(liste || [])].sort((a, b) => {
      const typeA = String(a?.type_branche || '').trim().toLowerCase();
      const typeB = String(b?.type_branche || '').trim().toLowerCase();
      const rangA = typeA === 'principale' ? 0 : 1;
      const rangB = typeB === 'principale' ? 0 : 1;
      if (rangA !== rangB) return rangA - rangB;
      const codeA = String(a?.designation_courte || a?.code || '').trim();
      const codeB = String(b?.designation_courte || b?.code || '').trim();
      const p = prioriteCode(codeA) - prioriteCode(codeB);
      if (p !== 0) return p;
      const libA = String(a?.designation_courte || a?.code || a?.nom || '').trim();
      const libB = String(b?.designation_courte || b?.code || b?.nom || '').trim();
      return libA.localeCompare(libB, 'fr', { sensitivity: 'base' });
    });
  };
  const [dragInventaireId, setDragInventaireId] = useState(null);
  const [dragOverInventaireId, setDragOverInventaireId] = useState(null);
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
        <td style="text-align:center;font-size:12px">${obs.intervention_responsable?'Oui':'Non'}</td>
        <td style="text-align:center;font-size:12px">${obs.demande_entretien?'Oui':'Non'}</td>
      </tr>
    `).join('');

    const html = `
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
          <span class="no-print" style="padding:10px 20px;background:#e2e8f0;color:#475569;border:none;border-radius:8px;font-size:13px;font-weight:700;font-family:inherit">Impression automatique</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Titre</th><th>Remarque</th><th>Mesure prise</th><th>Auteur</th><th style="text-align:center">Intervention</th><th style="text-align:center">Entretien</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">Oasis</div>
      </body>
      </html>
    `;
    const finalHtml = injectForcedPrintCss(html, 'A4 portrait', '1.5cm');
    openPrintPopup(finalHtml, { title: `Observations - ${eleveDetail.prenom} ${eleveDetail.nom}`, width: 1100, height: 800 });
  };

  const chargerPlanClasse = async () => {
    try {
      const r = await apiClient.get('/plan-classe/'+detailClasse.id, {headers});
      setPlanPositions(r.data.positions || {});
    } catch(err) { setPlanPositions({}); }
  };

  const sauverPlanClasse = async () => {
    setSaving(true);
    try {
      await apiClient.post('/plan-classe/'+detailClasse.id, {positions: planPositions}, {headers});
      setPlanToast(true);
      setTimeout(() => setPlanToast(false), 3000);
    } catch(err) { alert('Erreur sauvegarde'); }
    finally { setSaving(false); }
  };

  const imprimerPlanClasse = () => {
    const COLS = 7; const ROWS = 11;
    let cells = '';
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const key = row+'-'+col;
        const itemId = planPositions[key];
        const el = elevesClasse.find(e => String(e.id) === String(itemId));
        const special = ELEMENTS_SPECIAUX_PLAN.find(x => x.id === itemId);
        cells += `<td style="border:1px solid #e2e8f0;padding:0;text-align:center;background:${itemId?'#f0f4ff':'#f8fafc'};vertical-align:middle;overflow:hidden">
          <div style="height:21mm;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:2mm;box-sizing:border-box">
          ${el ? `
            <div style="font-size:11px;font-weight:700;color:#1e293b;line-height:1.3">${el.prenom}</div>
            <div style="font-size:10px;color:#475569;line-height:1.3">${el.nom}</div>
          ` : special ? `
            <div style="display:inline-block;padding:4px 6px;border-radius:6px;background:#e0e7ff;color:#3730a3;font-size:10px;font-weight:800;line-height:1.2">${special.label}</div>
          ` : ''}
          </div>
        </td>`;
      }
      cells += '</tr><tr>';
    }

    const htmlContent = `<!DOCTYPE html><html><head>
      <title>Plan de classe - ${detailClasse.nom}</title>
      <style>
        @page{size:A4 portrait;margin:10mm}
        *{box-sizing:border-box}
        html,body{margin:0;padding:0}
        body{font-family:'Century Gothic',sans-serif;padding:4mm 6mm;background:white}
        h1{font-size:13pt;font-weight:800;margin:0 0 1mm 0;line-height:1.2}
        .sub{font-size:9pt;color:#64748b;margin:0 0 2mm 0;line-height:1.2}
        table{border-collapse:collapse;width:100%;background:white;table-layout:fixed}
        tr{height:21mm}
        td{border:1px solid #e2e8f0;padding:0;text-align:center;vertical-align:middle;overflow:hidden}
      </style></head><body>
      <h1>Plan de classe — ${detailClasse.nom}</h1>
      <div class="sub">${detailClasse.annee_scolaire||''} · Titulaire : ${detailClasse.prof_prenom||''} ${detailClasse.prof_nom||''}</div>
      <table><tbody><tr>${cells}</tr></tbody></table>
    </body></html>`;
    const finalHtml = injectForcedPrintCss(htmlContent, 'A4 portrait', '10mm');
    openPrintPopup(finalHtml, { title: `Plan de classe - ${detailClasse.nom}`, width: 1100, height: 800 });
  };

  const dropOnCell = (row, col) => {
    if (dragEleve === null) return;
    const key = row+'-'+col;
    const newPos = {...planPositions};
    const isSpecial = ELEMENTS_SPECIAUX_PLAN.some(x => x.id === dragEleve);
    if (!isSpecial) {
      Object.keys(newPos).forEach(k => { if (String(newPos[k]) === String(dragEleve)) delete newPos[k]; });
    }
    if (dragEleve !== 'VIDE') newPos[key] = dragEleve;
    setPlanPositions(newPos);
    setDragEleve(null);
  };

  const renderPlanClasseOnglet = () => {
    const COLS = 7; const ROWS = 11;
    const elevesNonPlaces = elevesClasse.filter(el => !Object.values(planPositions).includes(String(el.id)));
    const elementsSpeciaux = ELEMENTS_SPECIAUX_PLAN;

    if (loadingElevesClasse) {
      return (
        <div style={{marginTop:30}}>
          <PageLoader label="Chargement..." compact style={{padding:40}} />
        </div>
      );
    }

    return (
      <div style={{marginTop:30}}>
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
                          style={{border:'1.5px solid #e2e8f0',width:53,height:54,textAlign:'center',verticalAlign:'middle',background:el?'#e0e7ff':(special?special.bg:'white'),borderRadius:4,cursor:'default',transition:'background 0.1s',position:'relative'}}>
                          {el ? (
                            <div draggable onDragStart={() => setDragEleve(String(el.id))}
                              style={{cursor:'grab',padding:'2px 1px'}}>
                              <div style={{fontSize:11,fontWeight:700,color:'#1e293b',lineHeight:1.2}}>{el.prenom}</div>
                              <div style={{fontSize:10,color:'#475569',lineHeight:1.2}}>{el.nom}</div>
                              <button onClick={() => {
                                const np = {...planPositions}; delete np[key]; setPlanPositions(np);
                              }} style={{position:'absolute',top:1,right:2,background:'none',border:'none',fontSize:9,cursor:'pointer',color:'#94a3b8',lineHeight:1}}>✕</button>
                            </div>
                          ) : special ? (
                            <div draggable onDragStart={() => setDragEleve(special.id)} style={{cursor:'grab',padding:'2px 1px',width:'100%',boxSizing:'border-box'}}>
                              <div style={{fontSize:11,fontWeight:700,color:special.text,textAlign:'center',lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:50,margin:'0 auto'}}>{special.label}</div>
                              <button onClick={() => {
                                const np = {...planPositions}; delete np[key]; setPlanPositions(np);
                              }} style={{position:'absolute',top:1,right:2,background:'none',border:'none',fontSize:9,cursor:'pointer',color:'#94a3b8',lineHeight:1}}>✕</button>
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
              Éléments à placer ({elevesNonPlaces.length})
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:'70vh',overflowY:'auto'}}>
              {elementsSpeciaux.map(sp => (
                <div key={sp.id} draggable onDragStart={() => setDragEleve(sp.id)}
                  style={{padding:'7px 10px',background:sp.bg,borderRadius:8,border:'1.5px solid #e2e8f0',cursor:'grab',boxSizing:'border-box',width:'100%'}}>
                  <div style={{fontSize:11,fontWeight:700,color:sp.text}}>{sp.label}</div>
                </div>
              ))}
              {elevesNonPlaces.map(el => (
                <div key={el.id} draggable onDragStart={() => setDragEleve(String(el.id))}
                  style={{padding:'7px 10px',background:'white',borderRadius:8,border:'1.5px solid #e2e8f0',cursor:'grab',boxSizing:'border-box',width:'100%'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#1e293b'}}>{el.prenom} {el.nom}</div>
                </div>
              ))}
              {elevesNonPlaces.length===0 && elementsSpeciaux.length===0 && <div style={{fontSize:11,color:'#94a3b8',textAlign:'center',padding:16}}>Tous placés ✅</div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTrombinoscopeOnglet = () => (
    <div style={s.trombiGrid}>
      {loadingElevesClasse ? (
        <PageLoader label="Chargement..." compact style={{padding:30,gridColumn:'1/-1'}} />
      ) : elevesClasse.length === 0 ? (
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

    const htmlContent = `<!DOCTYPE html><html><head>
        <title>Trombinoscope - ${detailClasse.nom}</title>
        <style>
          @page { size: A4 portrait; margin: 1cm; }
          body { font-family: 'Century Gothic', sans-serif; padding: 10px; color: #1e293b; background: white; width: 100%; box-sizing: border-box; }
          h1 { font-size: 16px; font-weight: 800; margin-bottom: 12px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        </style>
      </head>
      <body>
        <h1>Trombinoscope — ${detailClasse.nom}</h1>
        <div class="grid">${cards}</div>
      </body>
      </html>`;
    const finalHtml = injectForcedPrintCss(htmlContent, 'A4 portrait', '1cm');
    openPrintPopup(finalHtml, { title: `Trombinoscope - ${detailClasse.nom}`, width: 1100, height: 800 });
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
    try { const r = await apiClient.get('/eleves/'+el.id+'/documents', {headers}); setEleveDocs(r.data); }
    catch(err) { setEleveDocs([]); }
    setDocsEleveLoading(false);
  };

  const ouvrirObservationsClasse = async (el) => {
    setObsEleve(el); setShowObs(true); setShowObsForm(false); setObsEditId(null);
    setObsForm({ titre: '', contenu: '', mesure_prise: '', intervention_responsable: false, demande_entretien: false });
    try { const r = await apiClient.get('/observations/eleve/'+el.id, {headers}); setObservations(r.data); }
    catch(err) { setObservations([]); }
  };

  const sauverObsModal = async (e) => {
    e.preventDefault();
    if (!obsEleve) return;
    setSaving(true);
    try {
      await apiClient.post('/observations/eleve/'+obsEleve.id, obsForm, {headers});
      setObsForm({titre:'',contenu:'',mesure_prise:'',intervention_responsable:false,demande_entretien:false,intervention_titulaire:false});
      setShowObsForm(false);
      const r = await apiClient.get('/observations/eleve/'+obsEleve.id, {headers});
      setObservations(r.data);
      try { const r2 = await apiClient.get('/classes/'+detailClasse.id+'/activites-recentes', {headers}); setDerniereActuClasse(r2.data || null); } catch(e) {}
    } catch(err) { alert('Erreur: '+err.message); }
    finally { setSaving(false); }
  };

  const imprimerObsEleve = () => {
    if (!obsEleve) return;
    const rows = observations.map(obs => `<tr><td>${new Date(obs.created_at).toLocaleDateString('fr-CH')}</td><td style="font-weight:700">${obs.titre||''}</td><td>${obs.contenu||''}</td><td>${obs.mesure_prise||'—'}</td><td>${obs.auteur_prenom||''} ${obs.auteur_nom||''}</td><td style="text-align:center">${obs.intervention_responsable?'<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700">🚨 Oui</span>':'<span style="color:#94a3b8;font-size:11px">Non</span>'}</td><td style="text-align:center">${obs.demande_entretien?'<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700">🤝 Oui</span>':'<span style="color:#94a3b8;font-size:11px">Non</span>'}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>Observations - ${obsEleve.prenom} ${obsEleve.nom}</title><style>body{font-family:'Century Gothic',sans-serif;padding:32px;color:#1e293b}h1{font-size:20px;font-weight:800;margin-bottom:4px}.sub{font-size:13px;color:#64748b;margin-bottom:24px}table{width:100%;border-collapse:collapse;background:white}th{background:#f1f5f9;padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;border-bottom:2px solid #e2e8f0}td{padding:10px 12px;font-size:12px;border-bottom:1px solid #f1f5f9;vertical-align:top}@media print{.no-print{display:none}@page{margin:1.5cm}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><div><h1>📋 Observations — ${obsEleve.prenom} ${obsEleve.nom}</h1><div class="sub">Classe : ${detailClasse?.nom||'—'} · ${observations.length} observation(s) · Généré le ${new Date().toLocaleDateString('fr-CH')}</div></div><span class="no-print" style="padding:10px 20px;background:#e2e8f0;color:#475569;border-radius:8px;font-size:13px;font-weight:700">Impression automatique</span></div><table><thead><tr><th>Date</th><th>Titre</th><th>Remarque</th><th>Mesure prise</th><th>Auteur</th><th>Intervention</th><th>Entretien</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const finalHtml = injectForcedPrintCss(html, 'A4 portrait', '1.5cm');
    openPrintPopup(finalHtml, { title: `Observations - ${obsEleve.prenom} ${obsEleve.nom}`, width: 1100, height: 800 });
  };

  const uploadDocumentEleve = async (file, type) => {
    if (file.size > 5*1024*1024) { alert('Fichier trop grand (max 5MB)'); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        await apiClient.post('/eleves/'+docsEleve.id+'/documents', { nom: file.name, type, contenu: e.target.result, taille: file.size }, {headers});
        const r = await apiClient.get('/eleves/'+docsEleve.id+'/documents', {headers});
        setEleveDocs(r.data);
      } catch(err) { alert('Erreur upload: '+err.message); }
    };
    reader.readAsDataURL(file);
  };

  const telechargerDocumentEleve = async (doc) => {
    try {
      const r = await apiClient.get('/eleves/'+docsEleve.id+'/documents/'+doc.id+'/telecharger', {headers});
      const a = document.createElement('a'); a.href = r.data.contenu; a.download = r.data.nom; a.click();
    } catch(err) { alert('Erreur téléchargement'); }
  };

  const previsualiserDocumentEleve = async (doc) => {
    try {
      const r = await apiClient.get('/eleves/'+docsEleve.id+'/documents/'+doc.id+'/telecharger', {headers});
      setDocPreview({ url: r.data.contenu, nom: r.data.nom });
    } catch(err) { alert('Erreur prévisualisation'); }
  };

  const supprimerDocumentEleve = async (docId) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    await apiClient.delete('/eleves/'+docsEleve.id+'/documents/'+docId, {headers});
    setEleveDocs(prev => prev.filter(d => d.id !== docId));
  };

  const ouvrirSanctions = async (el) => {
    setSanctionsEleve(el); setShowSanctions(true); setSanctionsLoading(true); setPendingCell(null); setEditSanction(null);
    try {
      const [sanctionsRes, obsRes] = await Promise.all([
        apiClient.get('/eleves/'+el.id+'/sanctions', {headers}),
        apiClient.get('/observations/eleve/'+el.id, {headers}),
      ]);
      setEleveSanctions(sanctionsRes.data || []);
      setSanctionsObservations(obsRes.data || []);
    } catch(err) { setEleveSanctions([]); setSanctionsObservations([]); }
    setSanctionsLoading(false);
  };

  const confirmerSanction = async () => {
    if (!pendingCell) return;
    if (!String(pendingCell.observation_ref || '').trim()) {
      setSanctionToast("Référence d'observation obligatoire");
      setTimeout(() => setSanctionToast(''), 3000);
      return;
    }
    try {
      await apiClient.post('/eleves/'+sanctionsEleve.id+'/sanctions', {
        echelle: pendingCell.echelle, infraction: pendingCell.infraction, niveau: pendingCell.niveau,
        date_sanction: pendingCell.date_sanction || null, prof_nom: pendingCell.prof_nom || null,
        observation_ref: pendingCell.observation_ref || null,
      }, {headers});
      const r = await apiClient.get('/eleves/'+sanctionsEleve.id+'/sanctions', {headers});
      setEleveSanctions(r.data); setPendingCell(null);
    } catch(err) { alert('Erreur: '+(err.response?.data?.message||err.message)); }
  };

  const sauvegarderEditionSanction = async () => {
    if (!editSanction) return;
    if (!String(editSanction.observation_ref || '').trim()) {
      setSanctionToast("Référence d'observation obligatoire");
      setTimeout(() => setSanctionToast(''), 3000);
      return;
    }
    try {
      await apiClient.put('/eleves/'+sanctionsEleve.id+'/sanctions/'+editSanction.id, {
        date_sanction: editSanction.date_sanction || null,
        prof_nom: editSanction.prof_nom || null,
        observation_ref: editSanction.observation_ref || null,
      }, {headers});
      const r = await apiClient.get('/eleves/'+sanctionsEleve.id+'/sanctions', {headers});
      setEleveSanctions(r.data || []);
      setEditSanction(null);
    } catch(err) { alert('Erreur: '+(err.response?.data?.message||err.message)); }
  };

  const supprimerSanction = async (sanctionId) => {
    await apiClient.delete('/eleves/'+sanctionsEleve.id+'/sanctions/'+sanctionId, {headers});
    setEleveSanctions(prev => prev.filter(s => s.id !== sanctionId));
    setSanctionToast('Sanction retirée');
    setTimeout(() => setSanctionToast(''), 2500);
  };

  const observationsDisponiblesPourSanction = (sanctionIdExclure) => {
    const utilisees = new Set(
      (eleveSanctions || [])
        .filter(s => sanctionIdExclure == null || Number(s.id) !== Number(sanctionIdExclure))
        .map(s => String(s.observation_ref || '').trim())
        .filter(Boolean)
    );
    return (sanctionsObservations || []).filter(o => {
      const ref = String(o.reference_obs || '').trim();
      return ref && !utilisees.has(ref);
    });
  };

  const chargerInventaireBranche = async (brancheId) => {
    if (!detailClasse?.id || !brancheId) return;
    setInventaireLoading(true);
    setInventaireMsg('');
    try {
      const r = await apiClient.get('/inventaire-branches/' + detailClasse.id + '/branches/' + brancheId, { headers });
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
      await apiClient.post(
        '/inventaire-branches/' + detailClasse.id + '/branches/' + brancheInventaireActive.id,
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
      await apiClient.delete(
        '/inventaire-branches/' + detailClasse.id + '/branches/' + brancheInventaireActive.id + '/' + id,
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
      await apiClient.put(
        '/inventaire-branches/' + detailClasse.id + '/branches/' + brancheInventaireActive.id + '/' + id,
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
      await apiClient.post(
        '/inventaire-branches/' + detailClasse.id + '/branches/' + brancheInventaireActive.id + '/reorder',
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
    if (classeVueTab === 'devoirs' && detailClasse?.id) {
      chargerDevoirs(detailClasse.id);
    }
  }, [classeVueTab, detailClasse?.id, brancheInventaireActive?.id]);

  useEffect(() => {
    const detailId = searchParams.get('detail');
    if (!detailId && detailClasse) {
      setDetailClasse(null);
    } else if (detailId && !detailClasse && classes.length > 0) {
      const c = classes.find(x => String(x.id) === String(detailId));
      if (c) ouvrirDetail(c, searchParams.get('tab') || 'eleves', { syncUrl: false });
    }
  }, [searchParams.get('detail'), classes.length]);

  const chargerDevoirs = async (classeId) => {
    setDevoirsLoading(true);
    try {
      const r = await apiClient.get('/devoirs?classe_id=' + classeId, { headers });
      setDevoirs(r.data || []);
      if (r.data?.length > 0 && !devoirActif) setDevoirActif(r.data[0]);
    } catch (err) { console.error('Erreur devoirs:', err); }
    setDevoirsLoading(false);
  };

  const chargerSuiviDevoir = async (devoirId) => {
    try {
      const r = await apiClient.get('/devoirs/' + devoirId + '/suivi', { headers });
      setSuiviDevoirs(r.data || []);
    } catch (err) { console.error('Erreur suivi devoirs:', err); }
  };

  useEffect(() => {
    if (devoirActif?.id) chargerSuiviDevoir(devoirActif.id);
    else setSuiviDevoirs([]);
  }, [devoirActif?.id]);

  useEffect(() => {
    if (devoirSousOnglet !== 'stats' || devoirs.length === 0) return;
    const chargerTous = async () => {
      const map = {};
      await Promise.all(devoirs.map(async d => {
        try {
          const r = await apiClient.get('/devoirs/' + d.id + '/suivi', { headers });
          map[d.id] = r.data || [];
        } catch { map[d.id] = []; }
      }));
      setStatsAllSuivis(map);
    };
    chargerTous();
  }, [devoirSousOnglet, devoirs]);

  const creerDevoir = async (e) => {
    e.preventDefault();
    if (!detailClasse?.id || !devoirForm.titre.trim()) return;
    setSaving(true);
    try {
      await apiClient.post('/devoirs', { ...devoirForm, classe_id: detailClasse.id }, { headers });
      setShowDevoirForm(false);
      setDevoirForm({ titre: '', matiere: '', date_devoir: '', date_remise: '' });
      await chargerDevoirs(detailClasse.id);
    } catch (err) { alert('Erreur: ' + (err.response?.data?.message || err.message)); }
    finally { setSaving(false); }
  };

  const sauverEditionDevoir = async (e) => {
    e.preventDefault();
    if (!devoirEditId || !devoirEditForm.titre.trim()) return;
    setSaving(true);
    try {
      await apiClient.put('/devoirs/' + devoirEditId, devoirEditForm, { headers });
      setDevoirEditId(null);
      if (devoirActif?.id === devoirEditId) setDevoirActif(prev => ({ ...prev, ...devoirEditForm }));
      await chargerDevoirs(detailClasse.id);
    } catch (err) { alert('Erreur: ' + (err.response?.data?.message || err.message)); }
    finally { setSaving(false); }
  };

  const supprimerDevoir = async (id) => {
    if (!window.confirm('Supprimer ce devoir ?')) return;
    try {
      await apiClient.delete('/devoirs/' + id, { headers });
      if (devoirActif?.id === id) setDevoirActif(null);
      await chargerDevoirs(detailClasse.id);
    } catch (err) { alert('Erreur suppression'); }
  };

  const majStatutEleve = async (eleveId, statut) => {
    if (!devoirActif?.id) return;
    try {
      await apiClient.put('/devoirs/' + devoirActif.id + '/suivi/' + eleveId, { statut }, { headers });
      setSuiviDevoirs(prev => {
        const existing = prev.find(s => s.eleve_id === eleveId);
        if (existing) return prev.map(s => s.eleve_id === eleveId ? { ...s, statut } : s);
        const eleve = elevesClasse.find(el => el.id === eleveId);
        return [...prev, { eleve_id: eleveId, statut, nom: eleve?.nom || '', prenom: eleve?.prenom || '' }];
      });
    } catch (err) { console.error('Erreur maj statut:', err); }
  };

  const classesFiltrees = classes.filter(c => {
    const matchR = (c.nom+' '+(c.niveau||'')).toLowerCase().includes(recherche.toLowerCase());
    const matchA = c.actif !== false || showInactif;
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

  const referenceObsPreview = (() => {
    if (!obsEleve) return '';
    const nom = String(obsEleve.nom || '').trim();
    const prenom = String(obsEleve.prenom || '').trim();
    return `${(prenom[0]||'X').toUpperCase()}${(nom[0]||'X').toUpperCase()}-${String((observations?.length || 0) + 1).padStart(2, '0')}`;
  })();

  // Modal zoom photo
  const ModalZoom = () => photoZoom ? (
    <div className="modal-overlay" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}} onClick={() => setPhotoZoom(null)}>
      <div style={{position:'relative'}} onClick={e => e.stopPropagation()}>
        <img src={photoZoom} alt="photo" style={{maxWidth:'80vw',maxHeight:'80vh',borderRadius:12,boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}} />
        <div style={{display:'flex',gap:10,justifyContent:'center',marginTop:12}}>
          <a href={photoZoom} download="photo.jpg" style={{padding:'8px 16px',background:'#6366f1',color:'white',borderRadius:8,textDecoration:'none',fontSize:13,fontWeight:600}}>⬇ Télécharger</a>
          <button onClick={() => setPhotoZoom(null)} style={{padding:'8px 20px',background:'#ef4444',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600}}>Fermer</button>
        </div>
      </div>
    </div>
  ) : null;

  // Vue détail élève
  if (eleveDetail && detailClasse) return (
    <div style={s.page}>
      <ModalZoom />
      <div style={{...s.header, marginBottom:12}}>
        <button style={s.btnBack} onClick={() => setEleveDetail(null)}>← Retour classe</button>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
        {eleveDetail.photo ? (
          <img src={eleveDetail.photo} alt="photo" style={{width:56,height:56,borderRadius:'50%',objectFit:'cover',border:'3px solid #e2e8f0'}} />
        ) : (
          <div style={{width:56,height:56,borderRadius:'50%',background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,color:'#6366f1',fontWeight:700}}>
            {(eleveDetail.prenom||'?')[0]}
          </div>
        )}
        <h2 style={s.title}>{eleveDetail.prenom} {eleveDetail.nom}</h2>
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
            <button style={{...s.btnAdd,background:'#6366f1'}} onClick={() => imprimerObservations()}>Résumé</button>
            <button style={s.btnAdd} onClick={() => setShowObsForm(!showObsForm)}>+ Ajouter</button>
          </div>
        </div>

        {showObsForm && (
          <form onSubmit={sauverObservation} style={{background:'#f8fafc',borderRadius:10,padding:16,marginTop:16,border:'1px solid #e2e8f0'}}>
            <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:8,fontSize:12,color:'#64748b'}}>
              <span>Auteur : <b>{currentUser?.prenom} {currentUser?.nom}</b></span>
              <span>{new Date().toLocaleDateString('fr-CH')}</span>
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
              <button type="button" onClick={() => setObsForm({...obsForm,intervention_titulaire:!obsForm.intervention_titulaire})}
                style={{flex:1,padding:'9px 12px',borderRadius:8,border:'2px solid '+(obsForm.intervention_titulaire?'#7c3aed':'#e2e8f0'),background:obsForm.intervention_titulaire?'#ede9fe':'#f8fafc',color:obsForm.intervention_titulaire?'#5b21b6':'#64748b',cursor:'pointer',fontWeight:600,fontSize:12,transition:'all 0.15s'}}>
                Intervention du titulaire : <b>{obsForm.intervention_titulaire?'OUI':'NON'}</b>
              </button>
              <button type="button" onClick={() => setObsForm({...obsForm,intervention_responsable:!obsForm.intervention_responsable})}
                style={{flex:1,padding:'9px 12px',borderRadius:8,border:'2px solid '+(obsForm.intervention_responsable?'#f59e0b':'#e2e8f0'),background:obsForm.intervention_responsable?'#fef3c7':'#f8fafc',color:obsForm.intervention_responsable?'#92400e':'#64748b',cursor:'pointer',fontWeight:600,fontSize:12,transition:'all 0.15s'}}>
                Intervention d'un responsable : <b>{obsForm.intervention_responsable?'OUI':'NON'}</b>
              </button>
              <button type="button" onClick={() => setObsForm({...obsForm,demande_entretien:!obsForm.demande_entretien})}
                style={{flex:1,padding:'9px 12px',borderRadius:8,border:'2px solid '+(obsForm.demande_entretien?'#ef4444':'#e2e8f0'),background:obsForm.demande_entretien?'#fee2e2':'#f8fafc',color:obsForm.demande_entretien?'#991b1b':'#64748b',cursor:'pointer',fontWeight:600,fontSize:12,transition:'all 0.15s'}}>
                Entretien : <b>{obsForm.demande_entretien?'OUI':'NON'}</b>
              </button>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
              <button type="button" style={s.btnCancel} onClick={() => setShowObsForm(false)}>Annuler</button>
              <LoadingButton type="submit" loading={saving} style={s.btnSave}>Sauvegarder</LoadingButton>
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
                setSaving(true);
                try {
                  await apiClient.put('/observations/'+obs.id, obsEditForm, {headers});
                  setObsEditId(null);
                  const r = await apiClient.get('/observations/eleve/'+eleveDetail.id, {headers});
                  setObservations(r.data);
                } finally { setSaving(false); }
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
                  <button type="button" onClick={() => setObsEditForm({...obsEditForm,intervention_titulaire:!obsEditForm.intervention_titulaire})}
                    style={{flex:1,padding:'8px',borderRadius:8,border:'2px solid '+(obsEditForm.intervention_titulaire?'#7c3aed':'#e2e8f0'),background:obsEditForm.intervention_titulaire?'#ede9fe':'#f8fafc',color:obsEditForm.intervention_titulaire?'#5b21b6':'#64748b',cursor:'pointer',fontWeight:600,fontSize:11}}>
                    Intervention du titulaire : <b>{obsEditForm.intervention_titulaire?'OUI':'NON'}</b>
                  </button>
                  <button type="button" onClick={() => setObsEditForm({...obsEditForm,intervention_responsable:!obsEditForm.intervention_responsable})}
                    style={{flex:1,padding:'8px',borderRadius:8,border:'2px solid '+(obsEditForm.intervention_responsable?'#f59e0b':'#e2e8f0'),background:obsEditForm.intervention_responsable?'#fef3c7':'#f8fafc',color:obsEditForm.intervention_responsable?'#92400e':'#64748b',cursor:'pointer',fontWeight:600,fontSize:11}}>
                    Intervention d'un responsable : <b>{obsEditForm.intervention_responsable?'OUI':'NON'}</b>
                  </button>
                  <button type="button" onClick={() => setObsEditForm({...obsEditForm,demande_entretien:!obsEditForm.demande_entretien})}
                    style={{flex:1,padding:'8px',borderRadius:8,border:'2px solid '+(obsEditForm.demande_entretien?'#ef4444':'#e2e8f0'),background:obsEditForm.demande_entretien?'#fee2e2':'#f8fafc',color:obsEditForm.demande_entretien?'#991b1b':'#64748b',cursor:'pointer',fontWeight:600,fontSize:11}}>
                    Entretien : <b>{obsEditForm.demande_entretien?'OUI':'NON'}</b>
                  </button>
                </div>
                <div style={{display:'flex',gap:8,marginTop:10,justifyContent:'flex-end'}}>
                  <button type="button" style={s.btnCancel} onClick={() => setObsEditId(null)}>Annuler</button>
                  <LoadingButton type="submit" loading={saving} style={s.btnSave}>Sauvegarder</LoadingButton>
                </div>
              </form>
            ) : (
              <div key={obs.id} style={{background:'#f8fafc',borderRadius:10,padding:16,border:'1px solid #e2e8f0',borderLeft:'3px solid #6366f1'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <b style={{fontSize:14,color:'#1e293b'}}>{obs.titre}</b>
                    {obs.intervention_responsable && <span style={{background:'#fef3c7',color:'#92400e',padding:'2px 6px',borderRadius:99,fontSize:10,fontWeight:700}}>Intervention</span>}
                    {obs.intervention_titulaire && <span style={{background:'#ede9fe',color:'#5b21b6',padding:'2px 6px',borderRadius:99,fontSize:10,fontWeight:700}}>Intervention du titulaire</span>}
                    {obs.demande_entretien && <span style={{background:'#fee2e2',color:'#991b1b',padding:'2px 6px',borderRadius:99,fontSize:10,fontWeight:700}}>Entretien</span>}
                  </div>
                  {peutModifier && <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <button onClick={() => { setObsEditId(obs.id); setObsEditForm({titre:obs.titre,contenu:obs.contenu,mesure_prise:obs.mesure_prise||'',intervention_responsable:obs.intervention_responsable||false,demande_entretien:obs.demande_entretien||false,intervention_titulaire:obs.intervention_titulaire||false}); }} style={{background:'none',border:'none',cursor:'pointer',opacity:0.85,color:'#6366f1',display:'inline-flex',alignItems:'center',padding:2}} title="Modifier">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={async () => {
                      if (window.confirm('Supprimer cette observation ?')) {
                        await apiClient.delete('/observations/'+obs.id, {headers});
                        const r = await apiClient.get('/observations/eleve/'+eleveDetail.id, {headers});
                        setObservations(r.data);
                      }
                    }} style={{background:'none',border:'none',cursor:'pointer',opacity:0.85,color:'#ef4444',display:'inline-flex',alignItems:'center',padding:2}} title="Supprimer">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>}
                </div>
                <div style={{fontSize:13,color:'#475569',lineHeight:1.6}}>{obs.contenu}</div>
                {obs.mesure_prise && <div style={{fontSize:11,color:'#64748b',marginTop:6,fontStyle:'italic'}}><b>Mesure :</b> {obs.mesure_prise}</div>}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                  <span style={{fontSize:11,color:'#94a3b8'}}>Auteur : {obs.auteur_prenom} {obs.auteur_nom}</span>
                  <span style={{fontSize:11,color:'#94a3b8'}}>{new Date(obs.created_at).toLocaleDateString('fr-CH')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const NIVEAUX_STD = [
    {id:'Chance 1',label:'Chance 1',type:'row'},
    {id:'Chance 2',label:'Chance 2',type:'row'},
    {id:'Chance 3',label:'Chance 3',type:'row'},
    {id:null,label:'Punition',type:'section'},
    {id:'Punition Chance 1',label:'Chance 1',type:'row'},
    {id:'Punition Chance 2',label:'Chance 2',type:'row'},
    {id:null,label:'Retenue samedi',type:'section'},
    {id:'Retenue samedi Chance 1',label:'Chance 1',type:'row'},
    {id:'Avertissement et entretien',label:'Avertissement\nEntretien',type:'row'},
  ];
  const ECHELLES = [
    { id:1, titre:"Echelle 1 — Directives de l'école", infractions:['Retard injustifié','Objets connectés','Devoir non fait'], niveaux:NIVEAUX_STD, note:"* L'utilisation des autres langues que le français est sanctionnée par une retenue de 5 minutes par remontrance le jour-même." },
    { id:2, titre:'Echelle 2 — Respect du règlement', infractions:['Nourriture','Couvre-chef','Pause','Moquerie','Prise de parole','Ascenseur','Dégradation du matériel'], niveaux:NIVEAUX_STD },
    { id:3, titre:'Echelle 3', infractions:['Violence verbale','Violence physique','Vol'], niveaux:[{id:'Mise à pied',label:'Mise à pied',type:'row'}], note:'* En cas de récidive, sur proposition des responsables et décision du chef de section.' },
  ];

  // Vue détail classe - liste élèves
  if (detailClasse) return (
    <div style={s.page}>
      <ModalZoom />

      {showDocsEleve && docsEleve && (
        <div className="modal-overlay" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1200}}>
          <div style={{background:'white',padding:24,borderRadius:16,width:'100%',maxWidth:600,maxHeight:'85vh',overflowY:'auto',boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <h3 style={{margin:0,fontSize:18,fontWeight:800}}>Documents — {docsEleve.prenom} {docsEleve.nom}</h3>
              <button style={s.btnCancel} onClick={() => setShowDocsEleve(false)}>Fermer</button>
            </div>
            {isAdmin() && (
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:'#475569',marginBottom:8,textTransform:'uppercase'}}>Ajouter un document</div>
                <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                  <CustomSelect
                    style={{...s.inp,width:'auto',padding:'7px 10px'}}
                    value={uploadEleveForm.type}
                    onChange={(v) => setUploadEleveForm({type:v})}
                    options={['CV','Charte','Attestation','Justificatif','Bulletin de notes','Autre'].map(t => ({value:t, label:t}))}
                  />
                  <label style={{padding:'8px 16px',background:'#6366f1',color:'white',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13}}>
                    Choisir un fichier
                    <input type="file" style={{display:'none'}} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => { if(e.target.files[0]) uploadDocumentEleve(e.target.files[0], uploadEleveForm.type); e.target.value=''; }} />
                  </label>
                  <span style={{fontSize:11,color:'#94a3b8'}}>PDF, Word, image — max 5MB</span>
                </div>
              </div>
            )}
            <div style={{borderTop:'1px solid #f1f5f9',paddingTop:16}}>
              {docsEleveLoading ? (
                <PageLoader label="Chargement..." compact style={{padding:20}} />
              ) : eleveDocs.length===0 ? (
                <div style={{textAlign:'center',color:'#94a3b8',padding:20,fontSize:13}}>Aucun document pour cet élève</div>
              ) : eleveDocs.map(doc => (
                <div key={doc.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderRadius:8,border:'1px solid #e2e8f0',marginBottom:8,background:'#f8fafc'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
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
                    <button onClick={() => previsualiserDocumentEleve(doc)} style={{padding:5,border:'none',borderRadius:8,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',background:'#e0e7ff',color:'#4338ca'}} title="Visualiser">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 13a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>
                    </button>
                    <button onClick={() => telechargerDocumentEleve(doc)} style={{padding:5,border:'none',borderRadius:8,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',background:'#e0e7ff',color:'#4338ca'}} title="Télécharger">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>
                    </button>
                    {isAdmin() && <button onClick={() => supprimerDocumentEleve(doc.id)} style={{background:'#fee2e2',border:'none',cursor:'pointer',color:'#dc2626',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:5,borderRadius:8}} title="Supprimer">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {docPreview && (
        <div className="modal-overlay" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.85)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:2000}} onClick={() => setDocPreview(null)}>
          <div style={{position:'relative',width:'90vw',height:'85vh',display:'flex',flexDirection:'column'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{color:'white',fontWeight:700,fontSize:14}}>{docPreview.nom}</span>
              <button onClick={() => setDocPreview(null)} style={{background:'#ef4444',color:'white',border:'none',borderRadius:8,cursor:'pointer',padding:'6px 14px',fontWeight:600,fontSize:13}}>Fermer</button>
            </div>
            {docPreview.url.match(/^data:image\//i) ? (
              <img src={docPreview.url} alt={docPreview.nom} style={{maxWidth:'100%',maxHeight:'100%',borderRadius:8,objectFit:'contain',background:'white'}} />
            ) : (
              <iframe src={docPreview.url} title={docPreview.nom} style={{width:'100%',flex:1,borderRadius:8,border:'none'}} />
            )}
          </div>
        </div>
      )}

      {showSanctions && sanctionsEleve && (
        <div className="modal-overlay" style={s.overlay}>
          <div style={{...s.modal, width:'90vw', maxWidth:1050, maxHeight:'90vh', overflowY:'auto', padding:24}}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Sanctions — {sanctionsEleve.prenom} {sanctionsEleve.nom}</h3>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                {sanctionToast && <Toast message={sanctionToast} />}
                <button style={s.btnCancel} onClick={() => { setShowSanctions(false); setPendingCell(null); }}>Fermer</button>
              </div>
            </div>
            {sanctionsLoading ? (
              <PageLoader label="Chargement..." compact style={{padding:30}} />
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
                        <th style={{padding:'5px 8px',background:'#f8fafc',border:'1px solid #e2e8f0',width:'9%'}}></th>
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
                          <td style={{padding:'5px 8px',border:'1px solid #e2e8f0',fontWeight:600,color:'#374151',background:'#fafafa',whiteSpace:'pre-line',fontSize:10}}>{niveau.label}</td>
                          {echelle.infractions.map(infraction => {
                            const sanction = eleveSanctions.find(s => s.echelle===echelle.id && s.infraction===infraction && s.niveau===niveau.id);
                            const isPending = pendingCell && pendingCell.echelle===echelle.id && pendingCell.infraction===infraction && pendingCell.niveau===niveau.id;
                            const niveauxSaisie = echelle.niveaux.filter(n => n.type !== 'section');
                            const idxNiveau = niveauxSaisie.findIndex(n => n.id === niveau.id);
                            const prevNiveau = idxNiveau > 0 ? niveauxSaisie[idxNiveau - 1] : null;
                            const prevExiste = prevNiveau ? !!eleveSanctions.find(s => s.echelle===echelle.id && s.infraction===infraction && s.niveau===prevNiveau.id) : true;
                            const peutAjouter = idxNiveau === 0 || prevExiste;
                            return (
                              <td key={infraction} style={{padding:'4px 4px',border:'1px solid #e2e8f0',textAlign:'center',background:sanction?'#fef3c7':'white',verticalAlign:'middle'}}>
                                {isPending ? (
                                  <div style={{display:'flex',flexDirection:'column',gap:3,textAlign:'left'}}>
                                    <div style={{fontSize:10,color:'#374151',padding:'3px 6px',background:'#f1f5f9',borderRadius:4,fontWeight:600}}>
                                      {pendingCell.date_sanction ? new Date(pendingCell.date_sanction+'T00:00:00').toLocaleDateString('fr-CH') : ''}
                                    </div>
                                    <select
                                      value={pendingCell.observation_ref || ''}
                                      onChange={e => setPendingCell(prev => ({ ...prev, observation_ref: e.target.value }))}
                                      style={{fontSize:10,padding:'4px 6px',border:'1px solid #cbd5e1',borderRadius:4,background:'white',color:'#374151',fontWeight:600}}
                                    >
                                      <option value="">Choisir observation</option>
                                      {observationsDisponiblesPourSanction(null).map(o => (
                                        <option key={o.id} value={o.reference_obs}>{o.reference_obs}</option>
                                      ))}
                                    </select>
                                    <div style={{fontSize:10,color:'#374151',padding:'3px 6px',background:'#f1f5f9',borderRadius:4,fontWeight:600}}>
                                      {pendingCell.prof_nom}
                                    </div>
                                    <div style={{display:'flex',gap:4}}>
                                      <button onClick={confirmerSanction} style={{flex:1,padding:'3px 0',background:'#10b981',color:'white',border:'none',borderRadius:4,cursor:'pointer',fontSize:11,fontWeight:600}}>✓ OK</button>
                                      <button onClick={() => setPendingCell(null)} style={{flex:1,padding:'3px 0',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:4,cursor:'pointer',fontSize:11}}>✕</button>
                                    </div>
                                  </div>
                                ) : sanction ? (
                                  editSanction && editSanction.id === sanction.id ? (
                                    <div style={{display:'flex',flexDirection:'column',gap:3,textAlign:'left'}}>
                                      <input
                                        type="date"
                                        value={editSanction.date_sanction || ''}
                                        onChange={e => setEditSanction(prev => ({...prev, date_sanction: e.target.value}))}
                                        style={{fontSize:10,padding:'4px 6px',border:'1px solid #cbd5e1',borderRadius:4,background:'white',color:'#374151',fontWeight:600}}
                                      />
                                      <select
                                        value={editSanction.observation_ref || ''}
                                        onChange={e => setEditSanction(prev => ({...prev, observation_ref: e.target.value}))}
                                        style={{fontSize:10,padding:'4px 6px',border:'1px solid #cbd5e1',borderRadius:4,background:'white',color:'#374151',fontWeight:600}}
                                      >
                                        <option value="">Choisir observation</option>
                                        {observationsDisponiblesPourSanction(editSanction?.id).map(o => (
                                          <option key={o.id} value={o.reference_obs}>{o.reference_obs}</option>
                                        ))}
                                      </select>
                                      <div style={{fontSize:10,color:'#374151',padding:'3px 6px',background:'#f1f5f9',borderRadius:4,fontWeight:600}}>
                                        {editSanction.prof_nom || ''}
                                      </div>
                                      <div style={{display:'flex',gap:4}}>
                                        <button onClick={sauvegarderEditionSanction} style={{flex:1,padding:'3px 0',background:'#10b981',color:'white',border:'none',borderRadius:4,cursor:'pointer',fontSize:11,fontWeight:600}}>✓ OK</button>
                                        <button onClick={() => setEditSanction(null)} style={{flex:1,padding:'3px 0',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:4,cursor:'pointer',fontSize:11}}>✕</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:6}}>
                                      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:2}}>
                                        <span style={{fontSize:9,color:'#92400e',lineHeight:1.2}}>
                                          {sanction.date_sanction ? new Date(sanction.date_sanction).toLocaleDateString('fr-CH') : ''}
                                          {sanction.observation_ref ? ' · ' + sanction.observation_ref : ''}
                                        </span>
                                        <span style={{fontSize:9,color:'#92400e',lineHeight:1.2}}>{sanction.prof_nom||''}</span>
                                      </div>
                                      {isAdmin() && (
                                        <div style={{display:'flex',flexDirection:'row',gap:4,alignItems:'center'}}>
                                          <button onClick={() => setEditSanction({id:sanction.id,date_sanction:sanction.date_sanction?String(sanction.date_sanction).substring(0,10):'',observation_ref:sanction.observation_ref||'',prof_nom:sanction.prof_nom||''})} style={{background:'none',border:'none',cursor:'pointer',color:'#6366f1',padding:0,lineHeight:1,display:'flex',alignItems:'center'}} title="Modifier"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                                          <button onClick={() => supprimerSanction(sanction.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',padding:0,lineHeight:1,display:'flex',alignItems:'center'}} title="Retirer"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
                                        </div>
                                      )}
                                    </div>
                                  )
                                ) : (
                                  isAdmin() ? (
                                    <button onClick={() => {
                                      if (!peutAjouter) return;
                                      const today = new Date().toISOString().split('T')[0];
                                      const profNom = currentUser ? ((currentUser.prenom||'')+' '+(currentUser.nom||'')).trim() : '';
                                      setPendingCell({echelle:echelle.id,infraction,niveau:niveau.id,date_sanction:today,prof_nom:profNom,observation_ref:''});
                                    }}
                                    style={{width:20,height:20,borderRadius:4,border:'2px solid '+(peutAjouter?'#d1d5db':'#e5e7eb'),background:peutAjouter?'white':'#f3f4f6',cursor:peutAjouter?'pointer':'not-allowed',display:'inline-block',opacity:peutAjouter?1:0.6}} />
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
      {showObs && obsEleve && (
        <div className="modal-overlay" style={s.overlay}>
          <div style={{...s.modal, width:'71vw', maxWidth:825, maxHeight:'90vh', overflowY:'auto', padding:24}}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Fiches d'observation — {obsEleve.prenom} {obsEleve.nom}</h3>
              <button style={s.btnCancel} onClick={() => setShowObs(false)}>Fermer</button>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <span style={{fontSize:12,color:'#64748b'}}>Total: <b>{observations.length}</b> observation(s)</span>
              <div style={{display:'flex',gap:8}}>
                <button style={{...s.btnAdd,background:'#6366f1'}} onClick={imprimerObsEleve}>Résumé</button>
                <button style={s.btnAdd} onClick={() => setShowObsForm(!showObsForm)}>+ Ajouter</button>
              </div>
            </div>
            {showObsForm && (
              <form onSubmit={sauverObsModal} style={{background:'#f8fafc',borderRadius:10,padding:16,marginBottom:16,border:'1px solid #e2e8f0'}}>
                <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:8,fontSize:12,color:'#64748b'}}>
                  <span>Auteur : <b>{currentUser?.prenom} {currentUser?.nom}</b></span>
                  <span>{new Date().toLocaleDateString('fr-CH')}</span>
                  <span>Réf. <b>{referenceObsPreview}</b></span>
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
                  <button type="button" onClick={() => setObsForm({...obsForm,intervention_titulaire:!obsForm.intervention_titulaire})}
                    style={{flex:1,padding:'9px 12px',borderRadius:8,border:'2px solid '+(obsForm.intervention_titulaire?'#7c3aed':'#e2e8f0'),background:obsForm.intervention_titulaire?'#ede9fe':'#f8fafc',color:obsForm.intervention_titulaire?'#5b21b6':'#64748b',cursor:'pointer',fontWeight:600,fontSize:12}}>
                    Intervention du titulaire : <b>{obsForm.intervention_titulaire?'OUI':'NON'}</b>
                  </button>
                  <button type="button" onClick={() => setObsForm({...obsForm,intervention_responsable:!obsForm.intervention_responsable})}
                    style={{flex:1,padding:'9px 12px',borderRadius:8,border:'2px solid '+(obsForm.intervention_responsable?'#f59e0b':'#e2e8f0'),background:obsForm.intervention_responsable?'#fef3c7':'#f8fafc',color:obsForm.intervention_responsable?'#92400e':'#64748b',cursor:'pointer',fontWeight:600,fontSize:12}}>
                    Intervention d'un responsable : <b>{obsForm.intervention_responsable?'OUI':'NON'}</b>
                  </button>
                  <button type="button" onClick={() => setObsForm({...obsForm,demande_entretien:!obsForm.demande_entretien})}
                    style={{flex:1,padding:'9px 12px',borderRadius:8,border:'2px solid '+(obsForm.demande_entretien?'#ef4444':'#e2e8f0'),background:obsForm.demande_entretien?'#fee2e2':'#f8fafc',color:obsForm.demande_entretien?'#991b1b':'#64748b',cursor:'pointer',fontWeight:600,fontSize:12}}>
                    Entretien : <b>{obsForm.demande_entretien?'OUI':'NON'}</b>
                  </button>
                </div>
                <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
                  <button type="button" style={s.btnCancel} onClick={() => setShowObsForm(false)}>Annuler</button>
                  <LoadingButton type="submit" loading={saving} style={s.btnSave}>Sauvegarder</LoadingButton>
                </div>
              </form>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {observations.length===0 ? (
                <div style={{textAlign:'center',color:'#94a3b8',padding:30,fontSize:13}}>Aucune observation enregistrée</div>
              ) : observations.map(obs => {
                const peutModifier = isAdmin() || (currentUser && obs.auteur_id === currentUser.id);
                return obsEditId === obs.id ? (
                  <form key={obs.id} onSubmit={async (e) => {
                    e.preventDefault();
                    setSaving(true);
                    try {
                      await apiClient.put('/observations/'+obs.id, obsEditForm, {headers});
                      setObsEditId(null);
                      const r = await apiClient.get('/observations/eleve/'+obsEleve.id, {headers});
                      setObservations(r.data);
                    } finally { setSaving(false); }
                  }} style={{background:'#f0f4ff',borderRadius:10,padding:16,border:'1px solid #c7d2fe',borderLeft:'3px solid #6366f1'}}>
                    <div style={s.field}><label style={s.lbl}>Titre</label><input style={s.inp} value={obsEditForm.titre} onChange={e => setObsEditForm({...obsEditForm,titre:e.target.value})} required /></div>
                    <div style={{...s.field,marginTop:10}}><label style={s.lbl}>Remarque</label><textarea style={{...s.inp,minHeight:60,resize:'vertical'}} value={obsEditForm.contenu} onChange={e => setObsEditForm({...obsEditForm,contenu:e.target.value})} required /></div>
                    <div style={{...s.field,marginTop:10}}><label style={s.lbl}>Mesure prise</label><textarea style={{...s.inp,minHeight:50,resize:'vertical'}} value={obsEditForm.mesure_prise||''} onChange={e => setObsEditForm({...obsEditForm,mesure_prise:e.target.value})} /></div>
                    <div style={{display:'flex',gap:10,marginTop:12}}>
                      <button type="button" onClick={() => setObsEditForm({...obsEditForm,intervention_titulaire:!obsEditForm.intervention_titulaire})} style={{flex:1,padding:'8px',borderRadius:8,border:'2px solid '+(obsEditForm.intervention_titulaire?'#7c3aed':'#e2e8f0'),background:obsEditForm.intervention_titulaire?'#ede9fe':'#f8fafc',color:obsEditForm.intervention_titulaire?'#5b21b6':'#64748b',cursor:'pointer',fontWeight:600,fontSize:11}}>Intervention du titulaire : <b>{obsEditForm.intervention_titulaire?'OUI':'NON'}</b></button>
                      <button type="button" onClick={() => setObsEditForm({...obsEditForm,intervention_responsable:!obsEditForm.intervention_responsable})} style={{flex:1,padding:'8px',borderRadius:8,border:'2px solid '+(obsEditForm.intervention_responsable?'#f59e0b':'#e2e8f0'),background:obsEditForm.intervention_responsable?'#fef3c7':'#f8fafc',color:obsEditForm.intervention_responsable?'#92400e':'#64748b',cursor:'pointer',fontWeight:600,fontSize:11}}>Intervention d'un responsable : <b>{obsEditForm.intervention_responsable?'OUI':'NON'}</b></button>
                      <button type="button" onClick={() => setObsEditForm({...obsEditForm,demande_entretien:!obsEditForm.demande_entretien})} style={{flex:1,padding:'8px',borderRadius:8,border:'2px solid '+(obsEditForm.demande_entretien?'#ef4444':'#e2e8f0'),background:obsEditForm.demande_entretien?'#fee2e2':'#f8fafc',color:obsEditForm.demande_entretien?'#991b1b':'#64748b',cursor:'pointer',fontWeight:600,fontSize:11}}>Entretien : <b>{obsEditForm.demande_entretien?'OUI':'NON'}</b></button>
                    </div>
                    <div style={{display:'flex',gap:8,marginTop:10,justifyContent:'flex-end'}}>
                      <button type="button" style={s.btnCancel} onClick={() => setObsEditId(null)}>Annuler</button>
                      <LoadingButton type="submit" loading={saving} style={s.btnSave}>Sauvegarder</LoadingButton>
                    </div>
                  </form>
                ) : (
                  <div key={obs.id} style={{background:'#f8fafc',borderRadius:10,padding:16,border:'1px solid #e2e8f0',borderLeft:'3px solid #6366f1'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        <b style={{fontSize:14,color:'#1e293b'}}>{obs.titre}</b>
                        {obs.intervention_responsable && <span style={{background:'#fef3c7',color:'#92400e',padding:'2px 6px',borderRadius:99,fontSize:10,fontWeight:700}}>Intervention</span>}
                        {obs.intervention_titulaire && <span style={{background:'#ede9fe',color:'#5b21b6',padding:'2px 6px',borderRadius:99,fontSize:10,fontWeight:700}}>Intervention du titulaire</span>}
                        {obs.demande_entretien && <span style={{background:'#fee2e2',color:'#991b1b',padding:'2px 6px',borderRadius:99,fontSize:10,fontWeight:700}}>Entretien</span>}
                      </div>
                      {peutModifier && <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <button onClick={() => { setObsEditId(obs.id); setObsEditForm({titre:obs.titre,contenu:obs.contenu,mesure_prise:obs.mesure_prise||'',intervention_responsable:obs.intervention_responsable||false,demande_entretien:obs.demande_entretien||false,intervention_titulaire:obs.intervention_titulaire||false}); }} style={{background:'none',border:'none',cursor:'pointer',opacity:0.85,color:'#6366f1',display:'inline-flex',alignItems:'center',padding:2}} title="Modifier"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button onClick={async () => { if (window.confirm('Supprimer cette observation ?')) { await apiClient.delete('/observations/'+obs.id, {headers}); const r = await apiClient.get('/observations/eleve/'+obsEleve.id, {headers}); setObservations(r.data); }}} style={{background:'none',border:'none',cursor:'pointer',opacity:0.85,color:'#ef4444',display:'inline-flex',alignItems:'center',padding:2}} title="Supprimer"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
                      </div>}
                    </div>
                    <div style={{fontSize:13,color:'#475569',lineHeight:1.6}}>{obs.contenu}</div>
                    {obs.mesure_prise && <div style={{fontSize:11,color:'#64748b',marginTop:6,fontStyle:'italic'}}><b>Mesure :</b> {obs.mesure_prise}</div>}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                      <span style={{fontSize:11,color:'#94a3b8'}}>Auteur : {obs.auteur_prenom} {obs.auteur_nom}</span>
                      <span style={{fontSize:11,color:'#94a3b8'}}>{obs.reference_obs ? `${obs.reference_obs} — ` : ''}{new Date(obs.created_at).toLocaleDateString('fr-CH')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showEleveReadOnly && eleveReadOnly && (
        <div className="modal-overlay" style={s.overlay}>
          <div style={{...s.modal, width:'95vw', maxWidth:960, maxHeight:'90vh', overflowY:'auto', padding:32}}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Fiche élève</h3>
              <button style={s.btnCancel} onClick={() => setShowEleveReadOnly(false)}>Fermer</button>
            </div>
            {(() => {
              const ro = {padding:'8px 10px',border:'1px solid #f1f5f9',borderRadius:7,fontSize:12,color:'#1e293b',width:'100%',boxSizing:'border-box',background:'#f8fafc'};
              const Lbl = ({l, v}) => (
                <div style={{display:'flex',flexDirection:'column',marginBottom:0}}>
                  <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>{l}</label>
                  <div style={ro}>{v||'—'}</div>
                </div>
              );
              const secTitle = (txt,color,bg) => <div style={{fontSize:11,fontWeight:700,color,background:bg,padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase',letterSpacing:'0.05em',gridColumn:'1/-1'}}>{txt}</div>;
              return (
                <div style={{display:'flex',gap:28,marginTop:20}}>
                  {/* Colonne gauche : nom + photo */}
                  <div style={{width:180,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',gap:12,paddingTop:8}}>
                    <div style={{fontSize:18,fontWeight:800,color:'#1e293b',textAlign:'center',lineHeight:1.3}}>{eleveReadOnly.prenom}<br/>{eleveReadOnly.nom}</div>
                    {eleveReadOnly.photo ? (
                      <img src={eleveReadOnly.photo} alt="photo" style={{width:160,height:160,borderRadius:12,objectFit:'cover',border:'3px solid #e2e8f0',boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
                    ) : (
                      <div style={{width:160,height:160,borderRadius:12,background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:60,color:'#6366f1',fontWeight:700}}>{(eleveReadOnly.prenom||'?')[0]}</div>
                    )}
                  </div>
                  {/* Colonne droite : infos */}
                  <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  {secTitle('Informations personnelles','#1e40af','#dbeafe')}
                  <Lbl l="Nom" v={eleveReadOnly.nom} />
                  <Lbl l="Prénom" v={eleveReadOnly.prenom} />
                  <Lbl l="Email" v={eleveReadOnly.email} />
                  <Lbl l="Date de naissance" v={eleveReadOnly.date_naissance ? new Date(eleveReadOnly.date_naissance).toLocaleDateString('fr-CH') : eleveReadOnly.oasi_nais ? new Date(eleveReadOnly.oasi_nais).toLocaleDateString('fr-CH') : null} />
                  <Lbl l="Date début cours" v={eleveReadOnly.date_debut_cours ? new Date(eleveReadOnly.date_debut_cours).toLocaleDateString('fr-CH') : null} />
                  <Lbl l="Catégorie" v={eleveReadOnly.categorie} />
                  <div style={{gridColumn:'1/-1'}}>
                    <div style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Adresse</div>
                    <div style={ro}>{eleveReadOnly.adresse||'—'}</div>
                  </div>
                  <Lbl l="Téléphone" v={eleveReadOnly.telephone} />
                  <Lbl l="Nationalité" v={eleveReadOnly.nationalite || eleveReadOnly.oasi_nationalite} />
                  {secTitle('Contact / responsable légal','#166534','#dcfce7')}
                  <Lbl l="Nom parent / contact" v={eleveReadOnly.nom_parent || eleveReadOnly.personne_contact} />
                  <Lbl l="Téléphone parent" v={eleveReadOnly.telephone_parent} />
                  <div />
                  {(eleveReadOnly.oasi_n || eleveReadOnly.oasi_ref || eleveReadOnly.oasi_nom) && (<>
                    {secTitle('Données OASI','#6b21a8','#f3e8ff')}
                    <Lbl l="N" v={eleveReadOnly.oasi_n} />
                    <Lbl l="REF" v={eleveReadOnly.oasi_ref} />
                    <Lbl l="POS" v={eleveReadOnly.oasi_pos} />
                    <Lbl l="NOM" v={eleveReadOnly.oasi_nom} />
                    <Lbl l="PROG_NOM" v={eleveReadOnly.oasi_prog_nom} />
                    <Lbl l="PROG_ENCADRANT" v={eleveReadOnly.oasi_prog_encadrant} />
                    <Lbl l="AS" v={eleveReadOnly.oasi_as} />
                    <Lbl l="PRG_ID" v={eleveReadOnly.oasi_prg_id} />
                    <Lbl l="RA_ID" v={eleveReadOnly.oasi_ra_id} />
                  </>)}
                </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <div style={{...s.header, marginBottom:12}}>
        <button style={s.btnBack} onClick={() => { setDetailClasse(null); setSearchParams({}); }}>← Retour</button>
        <h2 style={s.title}>Classe {detailClasse.nom}{detailClasse.prof_prenom ? ' — Titulaire : '+detailClasse.prof_prenom+' '+detailClasse.prof_nom : ''}</h2>
        {classeVueTab === 'plan' && (
          <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto',flexWrap:'wrap',justifyContent:'flex-end'}}>
            {planToast && <Toast message="Plan sauvegardé !" />}
            <LoadingButton loading={saving} style={{...s.btnAdd,background:'#6366f1'}} onClick={sauverPlanClasse}>Sauvegarder</LoadingButton>
            <button style={{...s.btnAdd,background:'#6366f1'}} onClick={imprimerPlanClasse}>Imprimer</button>
            <button style={{...s.btnAdd,background:'#ef4444'}} onClick={() => setPlanPositions({})}>Réinitialiser</button>
          </div>
        )}
        {classeVueTab === 'trombinoscope' && (
          <button style={{...s.btnAdd,background:'#6366f1',marginLeft:'auto'}} onClick={imprimerTrombinoscope}>Imprimer</button>
        )}
        {classeVueTab === 'devoirs' && devoirSousOnglet === 'devoirs' && (
          <button style={{...s.btnAdd,marginLeft:'auto'}} onClick={() => setShowDevoirForm(true)}>+ Ajouter</button>
        )}
      </div>

      {classeVueTab === 'eleves' ? (
        <>
        <div style={{display:'flex',alignItems:'center',gap:10,marginTop:12,marginBottom:0}}>
          <input
            style={s.tabSearch}
            placeholder="Rechercher un élève..."
            value={rechercheElevesClasse}
            onChange={e => setRechercheElevesClasse(e.target.value)}
          />
          {derniereActuClasse && (
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',background: derniereActuClasse.type === 'sanction' ? '#fff7ed' : '#eef2ff',borderRadius:10,fontSize:12,fontWeight:600,color: derniereActuClasse.type === 'sanction' ? '#9a3412' : '#3730a3',boxShadow:'0 2px 8px rgba(99,102,241,0.15)',maxWidth:420,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
              <span>{derniereActuClasse.type === 'sanction' ? '⚠️' : '📋'}</span>
              <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>
                <b>{derniereActuClasse.eleve_prenom} {derniereActuClasse.eleve_nom}</b>
                {' · '}
                {derniereActuClasse.titre || derniereActuClasse.infraction}
                {' · '}
                <span style={{fontWeight:400,color:'#94a3b8'}}>{new Date(derniereActuClasse.date).toLocaleDateString('fr-CH')}</span>
              </span>
            </div>
          )}
        </div>
        <div style={{...s.tableWrap, marginTop:10}}>
          <div style={{overflow:'auto',maxHeight:'calc(100vh - 280px)',WebkitOverflowScrolling:'touch'}}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={{...s.th,width:56,minWidth:56,maxWidth:56,textAlign:'center'}}></th>
                <th style={{...s.th,width:62,minWidth:62,maxWidth:62,textAlign:'center'}}>Photo</th>
                <th style={{ ...s.th, width: 170, minWidth: 170, whiteSpace: 'nowrap' }}>Nom</th>
                <th style={{ ...s.th, width: 170, minWidth: 170, whiteSpace: 'nowrap' }}>Prénom</th>
                <th style={s.th}>Nationalité</th>
                <th style={s.th}>Naissance</th>
                <th style={{...s.th, textAlign:'center'}}>Catégorie</th>
                <th style={{...s.th,width:110,minWidth:110,maxWidth:110,textAlign:'center'}}></th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const elevesFiltres = elevesClasse.filter(el => ((el.nom||'')+' '+(el.prenom||'')).toLowerCase().includes(rechercheElevesClasse.toLowerCase()));
                if (loadingElevesClasse) {
                  return <tr><td colSpan="8"><PageLoader label="Chargement..." compact /></td></tr>;
                }
                if (elevesFiltres.length === 0) {
                  return <tr><td colSpan="8" style={s.empty}>Aucun élève trouvé</td></tr>;
                }
                return elevesFiltres.map(el => (
                <tr key={el.id} style={s.tr}>
                  <td style={{...s.td,width:56,minWidth:56,maxWidth:56,padding:'8px 4px',textAlign:'center'}}>
                    <button title="Détail élève" onClick={() => { setEleveReadOnly(el); setShowEleveReadOnly(true); }} style={{padding:6,background:'#e0e7ff',color:'#3730a3',border:'none',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto'}}>
                      <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 13a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>
                    </button>
                  </td>
                  <td style={{...s.td,width:62,minWidth:62,maxWidth:62,textAlign:'center',padding:'8px 6px'}}>
                    <div style={{position:'relative',width:38,height:38,margin:'0 auto'}}>
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
                              await apiClient.put('/eleves/'+el.id+'/photo', {photo: photoData}, {headers});
                              const r = await apiClient.get('/classes/'+detailClasse.id+'/eleves', {headers});
                              setElevesClasse(r.data);
                            } catch(err) {
                              alert('Erreur upload photo: ' + (err.response?.data?.message || err.message || 'fichier non supporte'));
                            } finally { ev.target.value = ''; }
                          }} />
                        </label>
                      )}
                    </div>
                  </td>
                  <td style={{...s.td,fontWeight:700,color:'#1e293b',width:170,minWidth:170,whiteSpace:'nowrap'}}>{el.nom || '—'}</td>
                  <td style={{...s.td,width:170,minWidth:170,whiteSpace:'nowrap'}}>{el.prenom || '—'}</td>
                  <td style={s.td}>{el.nationalite || el.oasi_nationalite || '—'}</td>
                  <td style={s.td}>{el.date_naissance ? new Date(el.date_naissance).toLocaleDateString('fr-CH') : el.oasi_nais ? new Date(el.oasi_nais).toLocaleDateString('fr-CH') : '—'}</td>
                  <td style={{...s.td, textAlign:'center'}}>{el.categorie || '—'}</td>
                  <td style={{...s.td,width:110,minWidth:110,maxWidth:110,padding:'8px 6px',textAlign:'center'}}>
                    <div style={{display:'flex',gap:4,justifyContent:'center',alignItems:'center'}}>
                      <button title="Documents" onClick={() => ouvrirDocumentsEleve(el)} style={{padding:6,background:'#dbeafe',color:'#1e40af',border:'none',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M2 8a2 2 0 012-2h4.5l2 2H20a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8z M6 13h12v1.5H6z M6 16h9v1.5H6z"/></svg>
                      </button>
                      {(() => { const aObs = Number(el.nb_observations || 0) > 0; return (
                      <button title={aObs ? 'Observations' : 'Aucune observation'} onClick={() => ouvrirObservationsClasse(el)} style={{padding:6,background:aObs?'#eef2ff':'#f1f5f9',color:aObs?'#4338ca':'#94a3b8',border:'none',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h2.5L9 19.5 11.5 17H20a2 2 0 002-2V5a2 2 0 00-2-2H4z M7 8h10v2H7z M7 12h7v2H7z"/></svg>
                      </button>
                      ); })()}
                      {(() => { const aSan = Number(el.nb_sanctions || 0) > 0; return (
                      <button title={aSan ? 'Sanctions' : 'Aucune sanction'} onClick={() => ouvrirSanctions(el)} style={{padding:6,background:aSan?'#fff7ed':'#f1f5f9',color:aSan?'#c2410c':'#94a3b8',border:'none',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 2L4 6.5v5c0 4.8 3.5 9.2 8 10.5 4.5-1.3 8-5.7 8-10.5v-5L12 2z M11 8h2v5h-2z M11 14.5h2v2h-2z"/></svg>
                      </button>
                      ); })()}
                    </div>
                  </td>
                </tr>
              ));
              })()}
            </tbody>
          </table>
          </div>
        </div>
        </>
      ) : classeVueTab === 'devoirs' ? (
        <div>
          {/* Search + filtre branches + sous-onglets */}
          <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4,flexWrap:'wrap'}}>
            <input style={s.tabSearch} placeholder="Rechercher un devoir..." value={rechercheDevoirs} onChange={e => setRechercheDevoirs(e.target.value)} />
            <button
              type="button"
              style={s.filterTriggerBtn}
              onClick={() => setDevoirSousOnglet(prev => (prev === 'devoirs' ? 'stats' : 'devoirs'))}
            >
              {devoirSousOnglet === 'devoirs' ? 'Afficher les stats' : 'Afficher les devoirs'}
            </button>
            {branchesInventaire.length > 0 && (
              !showDevoirBranchesFiltres ? (
                <button
                  type="button"
                  style={s.filterTriggerBtn}
                  onClick={() => setShowDevoirBranchesFiltres(true)}
                >
                  Trier
                </button>
              ) : (
                <div className="chip-tabs" style={s.toggleGroup}>
                  <button
                    type="button"
                    style={{...s.toggleBtn,...(devoirBrancheFiltre===null?s.toggleBtnActif:{})}}
                    onClick={() => { setDevoirBrancheFiltre(null); setShowDevoirBranchesFiltres(false); }}
                  >
                    Trier
                  </button>
                  {trierBranchesParType(branchesInventaire).map(b => (
                    <button key={b.id} type="button" style={{...s.toggleBtn,...(devoirBrancheFiltre?.id===b.id?s.toggleBtnActif:{})}} onClick={() => setDevoirBrancheFiltre(b)}>
                      {(b.designation_courte || b.code || b.nom || '').trim()}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>

          {(() => {
            const devoirsFiltres = devoirs
              .filter(d => !devoirBrancheFiltre || d.matiere === devoirBrancheFiltre.code || d.matiere === devoirBrancheFiltre.nom || d.matiere === (devoirBrancheFiltre.designation_courte || '').trim())
              .filter(d => !rechercheDevoirs || (d.titre||'').toLowerCase().includes(rechercheDevoirs.toLowerCase()) || (d.matiere||'').toLowerCase().includes(rechercheDevoirs.toLowerCase()));
            return <>

          {devoirSousOnglet === 'devoirs' && (<>
          {devoirActif && (() => {
            const sm = {};
            suiviDevoirs.forEach(s => { sm[s.eleve_id] = s.statut; });
            const rendus   = elevesClasse.filter(el => sm[el.id] === 'rendu').length;
            const partiel  = elevesClasse.filter(el => sm[el.id] === 'partiel').length;
            const excuse   = elevesClasse.filter(el => sm[el.id] === 'excuse').length;
            const nonRendu = elevesClasse.filter(el => !sm[el.id] || sm[el.id] === 'non_rendu').length;
            return (
              <div style={{width:220,display:'flex',justifyContent:'center',gap:6,fontSize:11,marginTop:15,marginBottom:8}}>
                <span style={{background:'#dcfce7',color:'#166534',padding:'3px 8px',borderRadius:12,fontWeight:700}}>✓ {rendus}</span>
                <span style={{background:'#fef9c3',color:'#d97706',padding:'3px 8px',borderRadius:12,fontWeight:700}}>✓ {partiel}</span>
                <span style={{background:'#fee2e2',color:'#991b1b',padding:'3px 8px',borderRadius:12,fontWeight:700}}>✗ {nonRendu}</span>
                <span style={{background:'#dbeafe',color:'#1e40af',padding:'3px 8px',borderRadius:12,fontWeight:700}}>✓ {excuse}</span>
              </div>
            );
          })()}
          <div style={{display:'flex',gap:8,alignItems:'flex-start',flexWrap:'wrap',marginTop: devoirActif ? 0 : 15}}>
            <div style={{flex:'0 0 220px',position:'sticky',top:16,alignSelf:'flex-start',background:'white',borderRadius:10,boxShadow:'0 2px 8px rgba(0,0,0,0.07)',overflow:'hidden'}}>
              <div style={{padding:'9px 14px',fontWeight:700,fontSize:11,color:'white',background:'#6366f1',textTransform:'uppercase',letterSpacing:'0.05em',borderRadius:'10px 10px 0 0'}}>Devoirs</div>
              <div style={{maxHeight:'calc(100vh - 250px)',overflowY:'auto'}}>
              {devoirsLoading ? (
                <PageLoader label="Chargement…" compact style={{padding:20,fontSize:13}} />
              ) : devoirsFiltres.length === 0 ? (
                <div style={{padding:20,textAlign:'center',color:'#94a3b8',fontSize:13}}>Aucun devoir</div>
              ) : devoirsFiltres.map(d => (
                <div key={d.id}
                  onClick={() => setDevoirActif(d)}
                  style={{padding:'10px 12px',cursor:'pointer',borderLeft:`3px solid ${devoirActif?.id===d.id?'#6366f1':'transparent'}`,background:devoirActif?.id===d.id?'#f5f3ff':'white',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:'#1e293b'}}>{d.titre}</div>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginTop:2}}>
                      {d.date_remise && <span style={{fontSize:11,color:'#94a3b8'}}>{new Date(d.date_remise).toLocaleDateString('fr-CH')}</span>}
                      {d.matiere && (() => {
                        const br = (branches || []).find(b => b.code === d.matiere || b.nom === d.matiere || (b.designation_courte || '').trim() === d.matiere);
                        const label = (br?.designation_courte || '').trim() || d.matiere;
                        return <span style={{fontSize:11,color:'#64748b'}}>{label}</span>;
                      })()}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:4,alignItems:'center',flexShrink:0}}>
                    <button style={s.btnEdit} onClick={e => { e.stopPropagation(); setDevoirEditForm({ titre:d.titre, matiere:d.matiere||'', date_devoir:d.date_devoir?.substring(0,10)||'', date_remise:d.date_remise?.substring(0,10)||'' }); setDevoirEditId(d.id); }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button style={s.btnDel} onClick={e => { e.stopPropagation(); supprimerDevoir(d.id); }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>

            {/* Tableau suivi */}
            <div style={{flex:1,background:'white',borderRadius:'10px 10px 0 0',boxShadow:'0 2px 8px rgba(0,0,0,0.07)',overflow:'hidden',minWidth:0}}>
              {!devoirActif ? (
                <div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:14}}>Sélectionnez un devoir pour voir le suivi</div>
              ) : (
                <>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{background:'#6366f1'}}>
                        {['Nom','Prénom','Statut'].map((h,i,a) => (
                          <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'white',textTransform:'uppercase',letterSpacing:'0.05em',borderRadius:i===0?'8px 0 0 0':i===a.length-1?'0 8px 0 0':0}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loadingElevesClasse ? (
                        <tr><td colSpan="3"><PageLoader label="Chargement..." compact /></td></tr>
                      ) : elevesClasse.length === 0 ? (
                        <tr><td colSpan="3" style={{padding:30,textAlign:'center',color:'#94a3b8'}}>Aucun élève</td></tr>
                      ) : elevesClasse.map((el, idx) => {
                        const suivi = suiviDevoirs.find(s => s.eleve_id === el.id);
                        const statut = suivi?.statut || 'non_rendu';
                        const STATUTS = [
                          { val: 'rendu',     label: '✓ Rendu',     bg: '#dcfce7', color: '#166534' },
                          { val: 'partiel',   label: '✓ Partiel',   bg: '#fef9c3', color: '#d97706' },
                          { val: 'non_rendu', label: '✗ Non rendu', bg: '#fee2e2', color: '#991b1b' },
                          { val: 'excuse',    label: '✓ Excusé',    bg: '#dbeafe', color: '#1e40af' },
                        ];
                        return (
                          <tr key={el.id} style={{background:idx%2===0?'white':'#fafafa',borderBottom:'1px solid #f1f5f9'}}>
                            <td style={{padding:'8px 14px',fontSize:13,fontWeight:700,color:'#1e293b'}}>{el.nom||'—'}</td>
                            <td style={{padding:'8px 14px',fontSize:13,color:'#334155'}}>{el.prenom||'—'}</td>
                            <td style={{padding:'8px 14px'}}>
                              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                                {STATUTS.map(st => (
                                  <button key={st.val} type="button"
                                    onClick={() => majStatutEleve(el.id, st.val)}
                                    style={{padding:'4px 10px',borderRadius:20,border:`2px solid ${statut===st.val?st.color:'#e2e8f0'}`,background:statut===st.val?st.bg:'white',color:statut===st.val?st.color:'#94a3b8',fontWeight:statut===st.val?700:400,fontSize:12,cursor:'pointer',fontFamily:'inherit',outline:'none'}}>
                                    {st.label}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>

          {/* Popup créer devoir */}
          {showDevoirForm && (
            <div className="modal-overlay" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}
              onClick={() => setShowDevoirForm(false)}>
              <div style={{background:'white',borderRadius:14,padding:24,width:400,maxWidth:'95vw',boxShadow:'0 8px 32px rgba(0,0,0,0.15)'}}
                onClick={e => e.stopPropagation()}>
                <h3 style={{margin:'0 0 16px',fontSize:16,fontWeight:700,color:'#1e293b'}}>Nouveau devoir</h3>
                <form onSubmit={creerDevoir}>
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>Titre *</label>
                      <input required style={{width:'100%',padding:'8px 10px',border:'1.5px solid #e2e8f0',borderRadius:7,fontSize:13,boxSizing:'border-box'}}
                        value={devoirForm.titre} onChange={e => setDevoirForm({...devoirForm, titre: e.target.value})} />
                    </div>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>Matière *</label>
                      <CustomSelect
                        style={{width:'100%'}}
                        value={devoirForm.matiere}
                        onChange={(v) => setDevoirForm({...devoirForm, matiere: v})}
                        placeholder="Sélectionner une branche"
                        options={branchesInventaire.map(b => ({value: b.code || b.nom, label: b.code ? `${b.code} ${b.nom}` : b.nom}))}
                      />
                    </div>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>Date de remise *</label>
                      <input required type="date" style={{width:'100%',padding:'8px 10px',border:'1.5px solid #e2e8f0',borderRadius:7,fontSize:13,boxSizing:'border-box'}}
                        value={devoirForm.date_remise} onChange={e => setDevoirForm({...devoirForm, date_remise: e.target.value})} />
                    </div>
                  </div>
                  <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:18}}>
                    <button type="button" style={{padding:'8px 16px',background:'#f5f5f5',border:'none',borderRadius:7,cursor:'pointer',fontSize:13}} onClick={() => setShowDevoirForm(false)}>Annuler</button>
                    <LoadingButton type="submit" loading={saving} loadingLabel="En cours de sauvegarde…" style={{padding:'8px 16px',background:'#6366f1',color:'white',border:'none',borderRadius:7,cursor:'pointer',fontSize:13,fontWeight:700}}>Créer</LoadingButton>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal édition devoir */}
          {devoirEditId && (
            <div className="modal-overlay" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}
              onClick={() => setDevoirEditId(null)}>
              <div style={{background:'white',borderRadius:14,padding:24,width:400,maxWidth:'95vw',boxShadow:'0 8px 32px rgba(0,0,0,0.15)'}}
                onClick={e => e.stopPropagation()}>
                <h3 style={{margin:'0 0 16px',fontSize:16,fontWeight:700,color:'#1e293b'}}>Modifier le devoir</h3>
                <form onSubmit={sauverEditionDevoir}>
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>Titre *</label>
                      <input required style={{width:'100%',padding:'8px 10px',border:'1.5px solid #e2e8f0',borderRadius:7,fontSize:13,boxSizing:'border-box'}}
                        value={devoirEditForm.titre} onChange={e => setDevoirEditForm({...devoirEditForm, titre: e.target.value})} />
                    </div>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>Matière *</label>
                      <CustomSelect
                        style={{width:'100%'}}
                        value={devoirEditForm.matiere}
                        onChange={(v) => setDevoirEditForm({...devoirEditForm, matiere: v})}
                        placeholder="Sélectionner une branche"
                        options={branchesInventaire.map(b => ({value: b.code || b.nom, label: b.code ? `${b.code} ${b.nom}` : b.nom}))}
                      />
                    </div>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>Date de remise *</label>
                      <input required type="date" style={{width:'100%',padding:'8px 10px',border:'1.5px solid #e2e8f0',borderRadius:7,fontSize:13,boxSizing:'border-box'}}
                        value={devoirEditForm.date_remise} onChange={e => setDevoirEditForm({...devoirEditForm, date_remise: e.target.value})} />
                    </div>
                  </div>
                  <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:18}}>
                    <button type="button" style={{padding:'8px 16px',background:'#f5f5f5',border:'none',borderRadius:7,cursor:'pointer',fontSize:13}} onClick={() => setDevoirEditId(null)}>Annuler</button>
                    <LoadingButton type="submit" loading={saving} loadingLabel="En cours de sauvegarde…" style={{padding:'8px 16px',background:'#6366f1',color:'white',border:'none',borderRadius:7,cursor:'pointer',fontSize:13,fontWeight:700}}>Enregistrer</LoadingButton>
                  </div>
                </form>
              </div>
            </div>
          )}
          </>)}

          {/* Sous-onglet Stats */}
          {devoirSousOnglet === 'stats' && (
            <div style={{background:'white',borderRadius:'10px 10px 0 0',boxShadow:'0 2px 8px rgba(0,0,0,0.07)',overflow:'hidden',marginTop:15}}>
              {devoirsLoading || loadingElevesClasse ? (
                <PageLoader label="Chargement..." compact style={{padding:40}} />
              ) : devoirsFiltres.length === 0 || elevesClasse.length === 0 ? (
                <div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:14}}>Aucune donnée</div>
              ) : (
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'#6366f1'}}>
                      {['Nom','Prénom','✓ Rendu','✓ Partiel','✗ Non rendu','✓ Excusé','Taux'].map((h,i,a) => (
                        <th key={h} style={{padding:'9px 12px',textAlign:i>=2?'center':'left',fontSize:11,fontWeight:700,color:'white',textTransform:'uppercase',letterSpacing:'0.05em',borderRadius:i===0?'8px 0 0 0':i===a.length-1?'0 8px 0 0':0}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {elevesClasse.map((el, idx) => {
                      let rendu = 0, partiel = 0, excuse = 0, nonRendu = 0;
                      devoirsFiltres.forEach(d => {
                        const suivisD = statsAllSuivis[d.id] || [];
                        const s = suivisD.find(s => s.eleve_id === el.id);
                        const st = s?.statut || 'non_rendu';
                        if (st === 'rendu') rendu++;
                        else if (st === 'partiel') partiel++;
                        else if (st === 'excuse') excuse++;
                        else nonRendu++;
                      });
                      const applicable = rendu + partiel + nonRendu;
                      const points = rendu * 1 + partiel * 0.5;
                      const taux = applicable > 0 ? Math.round((points / applicable) * 100) : null;
                      return (
                        <tr key={el.id} style={{background:idx%2===0?'white':'#fafafa',borderBottom:'1px solid #f1f5f9'}}>
                          <td style={{padding:'10px 12px',fontWeight:700,fontSize:13,color:'#1e293b'}}>{el.nom || '—'}</td>
                          <td style={{padding:'10px 12px',fontSize:13,color:'#334155'}}>{el.prenom || '—'}</td>
                          <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,fontSize:13,color:'#166534'}}>{rendu}</td>
                          <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,fontSize:13,color:'#d97706'}}>{partiel}</td>
                          <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,fontSize:13,color:'#991b1b'}}>{nonRendu}</td>
                          <td style={{padding:'10px 12px',textAlign:'center',fontWeight:700,fontSize:13,color:'#1e40af'}}>{excuse}</td>
                          <td style={{padding:'10px 12px',textAlign:'center'}}>
                            {taux !== null
                              ? <span style={{fontWeight:700,fontSize:13,color:taux>=75?'#166534':taux>=50?'#d97706':'#991b1b'}}>{taux}%</span>
                              : <span style={{color:'#94a3b8',fontSize:12}}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>;})()}
        </div>
      ) : classeVueTab === 'inventaire' ? (
        <div style={{paddingTop:0}}>
          {branchesInventaire.length === 0 ? (
            <div style={s.empty}>Aucune branche pour ce niveau</div>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4,marginBottom:8,flexWrap:'wrap'}}>
              <input style={s.tabSearch} placeholder="Rechercher un document..." value={rechercheInventaire} onChange={e => setRechercheInventaire(e.target.value)} />
              <div className="chip-tabs" style={s.toggleGroup}>
                {trierBranchesParType(branchesInventaire).map(b => (
                    <button
                      key={b.id}
                      type="button"
                      title={b.nom ? String(b.nom).trim() : undefined}
                      style={{...s.toggleBtn,...(String(brancheInventaireActive?.id)===String(b.id)?s.toggleBtnActif:{})}}
                      onClick={() => setBrancheInventaireActive(b)}
                    >
                      {(b.designation_courte || b.code || b.nom || '').trim()}
                    </button>
                  ))}
              </div>
            </div>
          )}
          {inventaireMsg && <div style={s.invMsg}>{inventaireMsg}</div>}
          {brancheInventaireActive ? (
              <>
                <form onSubmit={ajouterLigneInventaire} style={s.invForm}>
                  <input type="date" style={{...s.inp,width:142,flexShrink:0}} value={inventaireForm.date_document} onChange={e => setInventaireForm({...inventaireForm,date_document:e.target.value})} />
                  <input type="text" style={{...s.inp,flex:2}} placeholder="Nom du document *" value={inventaireForm.nom_document} onChange={e => setInventaireForm({...inventaireForm,nom_document:e.target.value})} />
                  <label style={{...s.invToggle,flexShrink:0}}>
                    <input type="checkbox" checked={inventaireForm.sans_numero} onChange={e => setInventaireForm({...inventaireForm,sans_numero:e.target.checked})} />
                    Pas de numéro
                  </label>
                  <input type="text" style={{...s.inp,flex:1}} placeholder="Remarques" value={inventaireForm.remarques} onChange={e => setInventaireForm({...inventaireForm,remarques:e.target.value})} />
                  <button type="submit" style={{...s.btnAdd,flexShrink:0}}>Valider</button>
                </form>

                <table style={{...s.table, tableLayout:'fixed', width:'100%'}}>
                  <colgroup>
                    <col style={{width:32}} />
                    <col style={{width:110}} />
                    <col />
                    <col style={{width:70}} />
                    <col />
                    <col style={{width:60}} />
                    <col style={{width:90}} />
                  </colgroup>
                  <thead>
                    <tr style={s.thead}>
                      <th style={{...s.th, borderTopLeftRadius:12}}></th>
                      {['Date','Nom du document','Numéro','Remarques','VISA','Actions'].map((h, idx, arr) => (
                        <th
                          key={h}
                          style={{
                            ...s.th,
                            textAlign: h==='Actions' ? 'right' : 'left',
                            ...(idx === arr.length - 1 ? { borderTopRightRadius:12 } : {})
                          }}
                        >
                          {h === 'Actions' ? '' : h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inventaireLoading ? (
                      <tr><td colSpan="7"><PageLoader label="Chargement..." compact /></td></tr>
                    ) : inventaireRows.filter(l => !rechercheInventaire || (l.nom_document||'').toLowerCase().includes(rechercheInventaire.toLowerCase())).length===0 ? (
                      <tr><td colSpan="7" style={s.empty}>Aucune ligne d'inventaire</td></tr>
                    ) : (() => {
                      let compteurNumero = 0;
                      return inventaireRows.filter(l => !rechercheInventaire || (l.nom_document||'').toLowerCase().includes(rechercheInventaire.toLowerCase())).map(l => {
                        const sansNumero = !!l.sans_numero;
                        const numeroAffiche = sansNumero ? '—' : String(++compteurNumero);
                        const isEditing = inventaireEditId === l.id;
                        const isDragOver = dragOverInventaireId === l.id;
                        return (
                          <tr
                            key={l.id}
                            style={{...s.tr, background: isDragOver ? '#e0e7ff' : undefined, outline: isDragOver ? '2px solid #6366f1' : undefined}}
                            draggable
                            onDragStart={() => setDragInventaireId(l.id)}
                            onDragOver={(e) => { e.preventDefault(); setDragOverInventaireId(l.id); }}
                            onDragLeave={() => setDragOverInventaireId(null)}
                            onDrop={() => {
                              reordonnerInventaire(dragInventaireId, l.id);
                              setDragInventaireId(null);
                              setDragOverInventaireId(null);
                            }}
                            onDragEnd={() => { setDragInventaireId(null); setDragOverInventaireId(null); }}
                          >
                            <td style={{...s.td, cursor:'grab', textAlign:'center', color:'#cbd5e1', fontSize:16, padding:'0 4px'}}>⠿</td>
                            {isEditing ? (
                              <>
                                <td style={s.td}><input type="date" style={s.inp} value={inventaireEditForm.date_document?.substring(0,10) || ''} onChange={e => setInventaireEditForm({...inventaireEditForm,date_document:e.target.value})} /></td>
                                <td style={s.td}><input type="text" style={s.inp} value={inventaireEditForm.nom_document} onChange={e => setInventaireEditForm({...inventaireEditForm,nom_document:e.target.value})} /></td>
                                <td style={s.td}>
                                  <label style={s.invToggle}>
                                    <input type="checkbox" checked={!!inventaireEditForm.sans_numero} onChange={e => setInventaireEditForm({...inventaireEditForm,sans_numero:e.target.checked})} />
                                    Sans n°
                                  </label>
                                </td>
                                <td style={s.td}><input type="text" style={s.inp} value={inventaireEditForm.remarques || ''} onChange={e => setInventaireEditForm({...inventaireEditForm,remarques:e.target.value})} /></td>
                                <td style={s.td}>
                                  <span style={s.visaBadge}>{getVisaInitiales(l)}</span>
                                </td>
                                <td style={{...s.td, textAlign:'right'}}>
                                  <button style={s.btnEdit} onClick={() => sauvegarderEditionInventaire(l.id)} title="Enregistrer">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  </button>
                                  <button style={s.btnDel} onClick={() => setInventaireEditId(null)} title="Annuler">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={{...s.td,textAlign:'left'}}>{l.date_document ? new Date(l.date_document).toLocaleDateString('fr-CH') : '—'}</td>
                                <td style={{...s.td,fontWeight:700}}>{l.nom_document || '—'}</td>
                                <td style={s.td}>{numeroAffiche}</td>
                                <td style={s.td}>{l.remarques || '—'}</td>
                                <td style={s.td}>
                                  <span style={s.visaBadge}>{getVisaInitiales(l)}</span>
                                </td>
                                <td style={{...s.td, textAlign:'right'}}>
                                  <button style={s.btnEdit} onClick={() => { setInventaireEditId(l.id); setInventaireEditForm({ date_document: l.date_document ? l.date_document.substring(0,10) : '', nom_document: l.nom_document || '', sans_numero: !!l.sans_numero, remarques: l.remarques || '' }); }} title="Modifier">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  </button>
                                  <button style={s.btnDel} onClick={() => supprimerLigneInventaire(l.id)} title="Supprimer">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                  </button>
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
      <div style={{...stickyPageChrome(), marginBottom:0}}>
      <div style={s.header}>
        <h2 style={s.title}>Gestion des classes</h2>
        {isAdmin() && (
          <div style={{display:'flex',gap:8,marginLeft:'auto',alignItems:'center'}}>
            <button style={s.btnAdd} onClick={() => { setShowForm(true); setClasseEdit(null); setForm({nom:'',niveau:'',annee_scolaire:'',prof_principal_id:''}); }}>+ Ajouter</button>
          </div>
        )}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:0,flexWrap:'wrap'}}>
        <input style={s.tabSearch} placeholder="Rechercher une classe..." value={recherche} onChange={e => setRecherche(e.target.value)} />
        <button
          onClick={() => setShowInactif(v => !v)}
          style={{padding:'7px 14px',borderRadius:17,border:'1.5px solid '+(showInactif?'#6366f1':'#e2e8f0'),background:showInactif?'#e0e7ff':'white',cursor:'pointer',fontWeight:600,color:showInactif?'#4338ca':'#94a3b8',fontSize:13,fontFamily:'inherit',whiteSpace:'nowrap'}}>
          {showInactif ? 'Masquer inactives' : 'Afficher inactives'}
        </button>
        {!showNiveauxFiltres ? (
          <button
            onClick={() => setShowNiveauxFiltres(true)}
            style={{padding:'7px 14px',borderRadius:17,border:'1.5px solid #e2e8f0',background:'white',cursor:'pointer',fontWeight:600,color:'#94a3b8',fontSize:13,fontFamily:'inherit',whiteSpace:'nowrap'}}
          >
            Trier
          </button>
        ) : (
          <div className="chip-tabs" style={s.toggleGroup}>
            {[{id:'tous',label:'Trier'}, ...niveauxDB.map(n => ({id:n.nom,label:n.nom}))].map(f => (
              <button key={f.id} style={{...s.toggleBtn,...(filtreNiveau===f.id?s.toggleBtnActif:{})}} onClick={() => { setFiltreNiveau(f.id); if (f.id === 'tous') setShowNiveauxFiltres(false); }}>{f.label}</button>
            ))}
          </div>
        )}
      </div>
      </div>

      {showForm && (
        <div className="modal-overlay" style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{classeEdit?'Modifier':'Ajouter'} une classe</h3>
              <button style={s.btnCancel} onClick={() => setShowForm(false)}>Fermer</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={s.grid2}>
                <div style={s.field}><label style={s.lbl}>Nom de la classe *</label><input style={s.inp} type="text" required value={form.nom} onChange={e => setForm({...form,nom:e.target.value})} placeholder="Ex: CSC 03, CFR 10, EPL 05..." /></div>
                <div style={s.field}>
                  <label style={s.lbl}>Niveau *</label>
                  <CustomSelect
                    style={{...s.inp, width:'100%'}}
                    value={form.niveau}
                    onChange={(v) => setForm({...form, niveau: v})}
                    placeholder="-- Choisir --"
                    options={niveauxDB.map(n => ({value: n.nom, label: n.nom}))}
                  />
                </div>
                
                <div style={s.field}>
                  <label style={s.lbl}>Titulaire</label>
                  <CustomSelect
                    style={{...s.inp, width:'100%'}}
                    value={form.prof_principal_id}
                    onChange={(v) => setForm({...form, prof_principal_id: v})}
                    placeholder="-- Choisir --"
                    options={profs.map(p => ({value: p.id, label: `${p.prenom} ${p.nom}`}))}
                  />
                </div>
              </div>
              <div style={s.formActions}>
                <button type="button" style={s.btnCancel} onClick={() => setShowForm(false)}>Annuler</button>
                <LoadingButton type="submit" loading={saving} style={s.btnSave}>Sauvegarder</LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{...s.tableWrap, marginTop:4}}>
        <div style={{overflow:'auto',maxHeight:'calc(100vh - 230px)',WebkitOverflowScrolling:'touch'}}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              <th style={{...s.th, width:56, minWidth:56, maxWidth:56, textAlign:'center'}}></th>
              <th style={{...s.th, width:1, minWidth:80, whiteSpace:'nowrap'}}>Classe</th>
              <th style={{...s.th, width:1, minWidth:100, whiteSpace:'nowrap'}}>Titulaire</th>
              <th style={s.th}>Notes</th>
              <th style={{...s.th, width:1, whiteSpace:'nowrap', textAlign:'center'}}></th>
              <th style={{...s.th, width:130, minWidth:130, maxWidth:130, textAlign:'center'}}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><PageLoader label="Chargement..." compact /></td></tr>
            ) : classesFiltrees.length===0 ? (
              <tr><td colSpan={6} style={s.empty}>Aucune classe trouvée</td></tr>
            ) : classesFiltrees.map(c => {
              const badgesNotes = getSuiviNotesBadges(c);
              return (
              <tr key={c.id} style={s.tr}>
                <td style={{...s.td, width:56, minWidth:56, maxWidth:56, whiteSpace:'nowrap', textAlign:'center', boxSizing:'border-box'}}>
                  <button style={{...s.iconBtn,background:'#e0e7ff',color:'#3730a3'}} onClick={() => ouvrirDetail(c)} title="Voir le détail">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 13a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>
                  </button>
                </td>
                <td style={{...s.td, width:1, whiteSpace:'nowrap'}}>
                  <div style={{fontWeight:700,color:'#1e293b'}}>{c.nom}</div>
                </td>
                <td style={{...s.td, width:1, whiteSpace:'nowrap'}}>{c.prof_prenom ? <span>{c.prof_prenom} <b>{c.prof_nom}</b></span> : <span style={{color:'#94a3b8'}}>—</span>}</td>
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
                <td style={{...s.td, width:1, textAlign:'center', whiteSpace:'nowrap'}}>
                  <div style={{display:'flex', gap:4, justifyContent:'center'}}>
                    <button style={{...s.iconBtn,background:'#fef9c3',color:'#a16207'}} onClick={() => ouvrirDetail(c, 'inventaire')} title="Inventaire">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 000 2h6a1 1 0 100-2H9zM7 4a2 2 0 00-2 2v13a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2H7zm2 5a1 1 0 000 2h6a1 1 0 100-2H9zm0 4a1 1 0 000 2h4a1 1 0 100-2H9z"/></svg>
                    </button>
                    <button style={{...s.iconBtn,background:'#fce7f3',color:'#be185d'}} onClick={() => ouvrirDetail(c, 'devoirs')} title="Suivi des devoirs">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5zM8 13h8v1.5H8V13zm0 3h6v1.5H8V16z"/></svg>
                    </button>
                    <button style={{...s.iconBtn,background:'#f0fdf4',color:'#15803d'}} onClick={() => ouvrirDetail(c, 'plan')} title="Plan de classe">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z"/></svg>
                    </button>
                    <button style={{...s.iconBtn,background:'#e0e7ff',color:'#4338ca'}} onClick={() => ouvrirDetail(c, 'trombinoscope')} title="Trombinoscope">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 12a4 4 0 100-8 4 4 0 000 8zm-8 8a8 8 0 1116 0H4z"/></svg>
                    </button>
                    <button style={{...s.iconBtn,background:'#fef3c7',color:'#b45309'}} onClick={() => navigate('/comptabilite', { state: { classeFacturationId: String(c.id) } })} title="Factures de la classe">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5zM8 13h8v1.5H8V13zm0 3h6v1.5H8V16z"/></svg>
                    </button>
                  </div>
                </td>
                <td style={{...s.td, width:130, minWidth:130, maxWidth:130, textAlign:'center', padding:'10px 8px'}}>
                  <div style={{display:'flex',gap:6,justifyContent:'center',alignItems:'center'}}>
                    {isAdmin() && <>
                      <button style={s.btnEdit} onClick={() => handleEdit(c)} title="Modifier">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button style={s.btnDel} onClick={() => handleDelete(c.id)} title="Supprimer">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </>}
                    <button title={c.actif!==false?'Active':'Inactif'}
                      style={{padding:5,background:c.actif!==false?'#dcfce7':'#fee2e2',color:c.actif!==false?'#16a34a':'#dc2626',border:'none',borderRadius:8,cursor:isAdmin()?'pointer':'default',display:'inline-flex',alignItems:'center',justifyContent:'center',opacity:isAdmin()?1:0.6}}
                      onClick={() => toggleActif(c)}>
                      <svg width={15} height={15} viewBox="0 0 24 24">
                        <path fillRule="evenodd" fill="currentColor" d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
                        {c.actif!==false
                          ? <path fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M7 12l3 3 7-7"/>
                          : <path fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" d="M8 8l8 8M16 8l-8 8"/>
                        }
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:{padding:'28px 32px',background:'#f8fafc',minHeight:'100%',boxSizing:'border-box',fontFamily:"'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif"},
  header:{display:'flex',alignItems:'center',gap:14,marginBottom:12,flexWrap:'wrap',minHeight:40},
  btnBack:{padding:'8px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,color:'#475569'},
  title:{fontSize:22,fontWeight:800,color:'#0f172a',flex:1,margin:0},
  controlsRow:{display:'flex',alignItems:'center',gap:10,marginBottom:16,flexWrap:'wrap'},
  toggleGroup:{display:'flex',background:'#ede9fe',borderRadius:20,padding:3,gap:2},
  toggleBtn:{padding:'7px 16px',borderRadius:17,border:'none',background:'transparent',cursor:'pointer',fontWeight:600,color:'#6d28d9',fontSize:13,fontFamily:'inherit',whiteSpace:'nowrap'},
  filterTriggerBtn:{padding:'7px 14px',borderRadius:17,border:'1.5px solid #e2e8f0',background:'white',cursor:'pointer',fontWeight:600,color:'#94a3b8',fontSize:13,fontFamily:'inherit',whiteSpace:'nowrap'},
  toggleBtnActif:{background:'#6366f1',color:'white',fontWeight:700},
  subTabsBar:{display:'flex',gap:0,marginTop:0},
  subTabBtn:{padding:'9px 14px',borderRadius:'0 0 10px 10px',fontSize:14,background:'#e0e7ff',color:'#3730a3',fontWeight:700,width:110,minWidth:110,textAlign:'center',border:'none',cursor:'pointer',outline:'none',lineHeight:1},
  subTabBtnActif:{background:'#4f46e5',color:'white',boxShadow:'0 4px 6px rgba(79,70,229,0.18)'},
  tabSearch:{padding:'9px 14px',borderRadius:8,border:'1px solid #c7d2fe',background:'white',outline:'none',fontSize:14,width:'min(280px, 100%)',color:'#1e293b',fontFamily:'inherit'},
  chip:{padding:'5px 12px',borderRadius:99,fontSize:12,fontWeight:600},
  searchBox:{position:'relative',display:'flex',alignItems:'center'},
  searchIcon:{position:'absolute',left:10,fontSize:13},
  searchInput:{padding:'8px 12px 8px 32px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,width:'min(200px, 100%)',background:'white',outline:'none'},
  filtres:{display:'flex',gap:4},
  filtrBtn:{padding:'7px 12px',background:'white',border:'1px solid #e2e8f0',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:500,color:'#64748b'},
  filtrActif:{background:'#6366f1',color:'white',border:'1px solid #6366f1'},
  btnAdd:{padding:'8px 14px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  btnGhost:{background:'white',color:'#475569',border:'1px solid #e2e8f0'},
  statsBar:{display:'flex',gap:10,marginBottom:12},
  statChip:{padding:'5px 12px',background:'#e0e7ff',color:'#3730a3',borderRadius:99,fontSize:12,fontWeight:500},
  statsRow:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:20},
  statCard:{background:'white',borderRadius:12,padding:'16px 20px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #f1f5f9'},
  card:{background:'white',borderRadius:12,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #f1f5f9'},
  cardTitle:{fontSize:15,fontWeight:700,color:'#0f172a',margin:0},
  rowBetween:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8},
  overlay:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)'},
  modal:{background:'white',padding:32,borderRadius:16,width:'min(500px, 100%)',maxHeight:'85vh',overflowY:'auto',boxShadow:'0 20px 40px rgba(0,0,0,0.15)'},
  modalHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24},
  modalTitle:{fontSize:18,fontWeight:800,color:'#0f172a',margin:0},
  btnClose:{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8'},
  grid2:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:8},
  field:{display:'flex',flexDirection:'column'},
  lbl:{fontSize:12,fontWeight:600,marginBottom:5,color:'#475569'},
  inp:{padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,outline:'none',color:'#1e293b',width:'100%',boxSizing:'border-box'},
  formActions:{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24,paddingTop:20,borderTop:'1px solid #f1f5f9'},
  btnCancel:{padding:'8px 16px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#64748b'},
  btnSave:{padding:'8px 16px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  tableWrap:{borderRadius:12,overflow:'hidden',background:'white'},
  table:{width:'100%',borderCollapse:'collapse',background:'white'},
  thead:{background:'#6366f1'},
  th:{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'white',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap',background:'#6366f1',position:'sticky',top:0,zIndex:2},
  tr:{borderBottom:'1px solid #f8fafc'},
  trActive:{borderBottom:'1px solid #f8fafc',background:'#eef2ff'},
  td:{padding:'11px 14px',fontSize:13,color:'#374151'},
  empty:{padding:40,textAlign:'center',color:'#94a3b8'},
  inventoryLayout:{display:'grid',gridTemplateColumns:'320px 1fr',gap:14,alignItems:'start',marginTop:15},
  invTitle:{fontSize:14,fontWeight:800,color:'#0f172a',padding:'14px 14px 0'},
  invMsg:{margin:'12px 12px 0',padding:'8px 10px',borderRadius:8,background:'#fee2e2',color:'#991b1b',fontSize:12,fontWeight:700},
  invForm:{display:'flex',gap:8,padding:'8px 0',marginBottom:8,alignItems:'center',width:'100%',boxSizing:'border-box'},
  invToggle:{display:'inline-flex',alignItems:'center',gap:6,fontSize:12,color:'#475569',fontWeight:600,whiteSpace:'nowrap'},
  trombiGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:14,marginTop:30},
  trombiCard:{display:'flex',flexDirection:'column',alignItems:'center',padding:16,background:'white',borderRadius:12,border:'1px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'},
  trombiImg:{width:86,height:86,borderRadius:'50%',objectFit:'cover',border:'3px solid #e0e7ff',marginBottom:10},
  trombiFallback:{width:86,height:86,borderRadius:'50%',background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,fontWeight:800,color:'#6366f1',marginBottom:10},
  trombiPrenom:{fontWeight:800,fontSize:14,color:'#1e293b',textAlign:'center'},
  trombiNom:{fontWeight:600,fontSize:13,color:'#475569',textAlign:'center'},
  visaBadge:{display:'inline-flex',alignItems:'center',justifyContent:'center',minWidth:34,height:24,padding:'0 8px',borderRadius:99,background:'#e0e7ff',color:'#3730a3',fontSize:11,fontWeight:800,letterSpacing:'0.04em'},
  badge:{display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:99,fontSize:11,fontWeight:600},
  badgeActive:{background:'#d1fae5',color:'#065f46',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600,border:'none',cursor:'pointer'},
  badgeInactif:{background:'#f1f5f9',color:'#475569',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600,border:'none',cursor:'pointer'},
  btnDetail:{padding:'5px 10px',background:'#e0e7ff',color:'#3730a3',border:'none',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:600,marginRight:4,display:'inline-flex',alignItems:'center',gap:4},
  iconBtn:{padding:6,border:'none',borderRadius:8,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center'},
  btnEdit:{padding:5,border:'none',borderRadius:8,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',background:'#e0e7ff',color:'#4338ca'},
  btnDel:{padding:5,border:'none',borderRadius:8,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',background:'#fee2e2',color:'#dc2626'},
};
