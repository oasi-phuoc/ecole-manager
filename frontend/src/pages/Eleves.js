import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getSessionUser } from '../utils/session';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';
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
  const [niveauOnglet, setNiveauOnglet] = useState('tous');
  const [niveauxDB, setNiveauxDB] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [loraUpdateLoading, setLoraUpdateLoading] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(null);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [classeId, setClasseId] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [dateDebutCours, setDateDebutCours] = useState('');
  const [categorie, setCategorie] = useState('');
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
  const [showDocsEleve, setShowDocsEleve] = useState(false);
  const [docsEleve, setDocsEleve] = useState(null);
  const [eleveDocs, setEleveDocs] = useState([]);
  const [docsEleveLoading, setDocsEleveLoading] = useState(false);
  const [uploadEleveForm, setUploadEleveForm] = useState({ type: 'Autre' });
  const [showSanctions, setShowSanctions] = useState(false);
  const [sanctionsEleve, setSanctionsEleve] = useState(null);
  const [eleveSanctions, setEleveSanctions] = useState([]);
  const [sanctionsObservations, setSanctionsObservations] = useState([]);
  const [sanctionsLoading, setSanctionsLoading] = useState(false);
  const [editSanction, setEditSanction] = useState(null);
  const [pendingCell, setPendingCell] = useState(null);
  const [showObs, setShowObs] = useState(false);
  const [obsEleve, setObsEleve] = useState(null);
  const [observations, setObservations] = useState([]);
  const [showObsForm, setShowObsForm] = useState(false);
  const [obsEditId, setObsEditId] = useState(null);
  const [obsEditForm, setObsEditForm] = useState({titre:'',contenu:'',mesure_prise:'',intervention_responsable:false,demande_entretien:false});
  const [obsForm, setObsForm] = useState({ titre: '', contenu: '', mesure_prise: '', intervention_responsable: false, demande_entretien: false });

  const navigate = useNavigate();
  const headers = {};
  const currentUser = getSessionUser() || {};

  useEffect(() => {
    chargerTout();
    axios.get(API + '/donnees/niveaux').then(r => setNiveauxDB(r.data || [])).catch(() => {});
  }, []);

  const mettreAJourLORA = async (file) => {
    if (!file) return;
    setLoraUpdateLoading(true);
    try {
      const fd = new FormData(); fd.append('fichier', file);
      const r = await axios.post(API + '/import/update-lora', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert(r.data.message);
      chargerTout();
    } catch(err) { alert('Erreur mise à jour LORA: ' + (err.response?.data?.message || err.message)); }
    setLoraUpdateLoading(false);
  };

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
    setDateNaissance(''); setDateDebutCours(''); setCategorie(''); setAdresse(''); setTelephone('');
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
    setDateDebutCours(el.date_debut_cours?el.date_debut_cours.substring(0,10):'');
    setCategorie(el.categorie||'');
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
        date_naissance: dateNaissance||null, date_debut_cours: dateDebutCours||null, categorie: categorie||null, adresse, telephone,
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
    const el = eleves.find(e => e.id === id);
    const nom = el ? `${el.prenom} ${el.nom}` : 'cet élève';
    if (window.confirm(`⚠️ Supprimer définitivement ${nom} ?\n\nCette action supprimera TOUTES les données liées :\nprésences, notes, paiements, observations, absences, documents et sanctions.\n\nCette action est irréversible.`)) {
      try {
        await axios.delete(API+'/eleves/'+id, {headers});
        chargerTout();
      } catch(err) { alert('Erreur lors de la suppression : '+(err.response?.data?.message||err.message)); }
    }
  };

  const handleToggleStatut = async (el) => {
    if (!isAdmin()) return;
    const newStatut = el.statut === 'actif' ? 'inactif' : 'actif';
    try {
      await axios.put(API+'/eleves/'+el.id, {
        nom: el.nom, prenom: el.prenom, email: el.email,
        classe_id: el.classe_id||null, statut: newStatut,
      }, {headers});
      chargerTout();
    } catch(err) { alert('Erreur: '+err.message); }
  };

  const handleClasseChange = async (eleveId, cId) => {
    try {
      await axios.put(API+'/eleves/'+eleveId+'/classe', { classe_id: cId||null }, {headers});
      setEleves(prev => prev.map(el => el.id===eleveId ? {...el, classe_id: cId||null} : el));
    } catch(err) { alert('Erreur: '+err.message); }
  };

  const handleCategorieChange = async (eleveId, val) => {
    try {
      await axios.put(API+'/eleves/'+eleveId+'/categorie', { categorie: val || null }, {headers});
      setEleves(prev => prev.map(el => el.id===eleveId ? {...el, categorie: val || null} : el));
    } catch(err) { alert('Erreur: '+err.message); }
  };

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
    setSanctionsEleve(el); setShowSanctions(true); setSanctionsLoading(true); setPendingCell(null); setEditSanction(null);
    try {
      const [sanctionsRes, obsRes] = await Promise.all([
        axios.get(API+'/eleves/'+el.id+'/sanctions', {headers}),
        axios.get(API+'/observations/eleve/'+el.id, {headers}),
      ]);
      setEleveSanctions(sanctionsRes.data || []);
      setSanctionsObservations(obsRes.data || []);
    } catch(err) {
      setEleveSanctions([]);
      setSanctionsObservations([]);
    }
    setSanctionsLoading(false);
  };

  const confirmerSanction = async () => {
    if (!pendingCell) return;
    if (!String(pendingCell.observation_ref || '').trim()) {
      alert("Référence d'observation obligatoire pour valider la sanction.");
      return;
    }
    try {
      await axios.post(API+'/eleves/'+sanctionsEleve.id+'/sanctions', {
        echelle: pendingCell.echelle,
        infraction: pendingCell.infraction,
        niveau: pendingCell.niveau,
        date_sanction: pendingCell.date_sanction || null,
        prof_nom: pendingCell.prof_nom || null,
        observation_ref: pendingCell.observation_ref || null,
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

  const sauvegarderEditionSanction = async () => {
    if (!editSanction) return;
    if (!String(editSanction.observation_ref || '').trim()) {
      alert("Référence d'observation obligatoire pour valider la sanction.");
      return;
    }
    try {
      await axios.put(API+'/eleves/'+sanctionsEleve.id+'/sanctions/'+editSanction.id, {
        date_sanction: editSanction.date_sanction || null,
        prof_nom: editSanction.prof_nom || null,
        observation_ref: editSanction.observation_ref || null,
      }, {headers});
      const r = await axios.get(API+'/eleves/'+sanctionsEleve.id+'/sanctions', {headers});
      setEleveSanctions(r.data || []);
      setEditSanction(null);
    } catch(err) {
      alert('Erreur: ' + (err.response?.data?.message || err.message));
    }
  };

  const ouvrirObservations = async (el) => {
    setObsEleve(el); setShowObs(true); setShowObsForm(false); setObsEditId(null);
    setObsForm({ titre: '', contenu: '', mesure_prise: '', intervention_responsable: false, demande_entretien: false });
    try { const r = await axios.get(API+'/observations/eleve/'+el.id, {headers}); setObservations(r.data); }
    catch(err) { setObservations([]); }
  };

  const sauverObservation = async (e) => {
    e.preventDefault();
    if (!obsEleve) return;
    try {
      await axios.post(API+'/observations/eleve/'+obsEleve.id, obsForm, {headers});
      setObsForm({titre:'',contenu:'',mesure_prise:'',intervention_responsable:false,demande_entretien:false});
      setShowObsForm(false);
      const r = await axios.get(API+'/observations/eleve/'+obsEleve.id, {headers});
      setObservations(r.data);
    } catch(err) { alert('Erreur: '+err.message); }
  };

  const imprimerObservations = () => {
    if (!obsEleve) return;
    const classeNom = classes.find(c => String(c.id) === String(obsEleve.classe_id))?.nom || '—';
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
        <title>Observations - ${obsEleve.prenom} ${obsEleve.nom}</title>
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
            <h1>📋 Rapport d'observations — ${obsEleve.prenom} ${obsEleve.nom}</h1>
            <div class="sub">Classe : ${classeNom} · ${observations.length} observation(s) · Généré le ${new Date().toLocaleDateString('fr-CH')}</div>
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

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('fichier', importFile);
      const r = await axios.post(API+'/import/eleves', formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(r.data); chargerTout();
    } catch(err) { setImportResult({ message: 'Erreur: '+(err.response?.data?.message||err.message) }); }
    setImportLoading(false);
  };

  const inp = {padding:'8px 10px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:12,outline:'none',color:'#1e293b',width:'100%',boxSizing:'border-box'};
  const secTitle = (color, bg) => ({fontSize:11,fontWeight:700,color,background:bg,padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase',letterSpacing:'0.05em'});
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

  const elevesFiltres = eleves.filter(el => {
    const classe = classes.find(c => String(c.id) === String(el.classe_id));
    const classeNom = classe?.nom || '';
    const niveau = classe?.niveau || '';
    const matchR = ((el.nom||'')+' '+(el.prenom||'')+' '+classeNom).toLowerCase().includes(recherche.toLowerCase());
    if (niveauOnglet === 'sans') return !el.classe_id && matchR;
    if (niveauOnglet !== 'tous') return niveau === niveauOnglet && matchR;
    return matchR;
  });

  const referenceObservationPreview = (() => {
    if (!obsEleve) return '';
    const nom = String(obsEleve.nom || '').trim();
    const prenom = String(obsEleve.prenom || '').trim();
    const initialNom = nom ? nom[0].toUpperCase() : 'X';
    const initialPrenom = prenom ? prenom[0].toUpperCase() : 'X';
    const nextNum = (observations?.length || 0) + 1;
    return `${initialPrenom}${initialNom}-${String(nextNum).padStart(2, '0')}`;
  })();

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
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24,flexWrap:'wrap'}}>
        <button style={{padding:'8px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#475569'}} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={{fontSize:22,fontWeight:800,color:'#0f172a',flex:1,margin:0}}>Gestion des élèves</h2>
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          {isAdmin() && <button style={{padding:'8px 16px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13}} onClick={() => { resetForm(); setEleveEdit(null); setShowForm(true); }}>+ Ajouter</button>}
          {isAdmin() && <label style={{padding:'8px 16px',background:'#64748b',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13,display:'inline-flex',alignItems:'center',gap:6}}>
            {loraUpdateLoading ? 'Mise à jour...' : '🔄 Mise à jour LORA'}
            <input type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={e => { if(e.target.files[0]) mettreAJourLORA(e.target.files[0]); e.target.value=''; }} />
          </label>}
          {isAdmin() && <button style={{padding:'8px 16px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13}} onClick={() => setShowImport(true)}>📥 Importer LORA</button>}
        </div>
      </div>
      <div style={{display:'flex',alignItems:'flex-end',gap:0,marginBottom:0,borderBottom:'2px solid #6366f1',paddingBottom:0,width:'100%',boxSizing:'border-box'}}>
        {['tous', ...niveauxDB.map(n => n.nom), 'sans'].map(k => {
          const actif = niveauOnglet === k;
          const label = k === 'tous' ? 'Tous' : k === 'sans' ? 'Sans classe' : k;
          return (
            <button key={k}
              style={{padding:'9px 0',borderRadius:'10px 10px 0 0',border:'none',background:actif?'#6366f1':'#ede9fe',cursor:'pointer',fontWeight:700,color:actif?'white':'#5b21b6',outline:'none',lineHeight:'1',fontSize:14,width:k==='sans'?120:90,minWidth:k==='sans'?120:90,textAlign:'center',marginBottom:actif?-1:0,zIndex:actif?2:1}}
              onClick={() => { setNiveauOnglet(k); setRecherche(''); }}
            >{label}</button>
          );
        })}
      </div>
      <div style={{marginTop:15,marginBottom:12}}>
        <input
          style={{padding:'9px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f1f5f9',outline:'none',fontSize:14,width:280,color:'#475569',fontFamily:'inherit'}}
          placeholder="Rechercher un élève, une classe..."
          value={recherche}
          onChange={e => { setRecherche(e.target.value); }}
        />
      </div>

      {/* Modal Import */}
      {showImport && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'white',padding:32,borderRadius:16,width:480,boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <h3 style={{fontSize:18,fontWeight:800,margin:0}}>📥 Importer depuis LORA</h3>
              <button style={{background:'none',border:'none',fontSize:18,cursor:'pointer'}} onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }}>✕</button>
            </div>
            {importResult ? (
              <div>
                <div style={{background:importResult.created>=0?'#d1fae5':'#fee2e2',color:importResult.created>=0?'#065f46':'#991b1b',padding:16,borderRadius:10,fontSize:14,fontWeight:600}}>{importResult.message}</div>
                {importResult.created >= 0 && <div style={{marginTop:12,fontSize:13,color:'#475569'}}><div>✅ <b>{importResult.created}</b> créé(s)</div><div>⏭️ <b>{importResult.skipped}</b> ignorés</div></div>}
                <div style={{marginTop:20,textAlign:'right'}}><button style={{padding:'9px 20px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600}} onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }}>Fermer</button></div>
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
                    <Champ lbl="Nom *"><input style={inp} required value={nom} onChange={e => setNom(e.target.value.toUpperCase())} placeholder="DUPONT" /></Champ>
                    <Champ lbl="Prénom *"><input style={inp} required value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Marie" /></Champ>
                    <Champ lbl="Email"><input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="marie@ecole.ch" /></Champ>
                    <Champ lbl="Date de naissance"><input style={inp} type="date" value={dateNaissance} onChange={e => setDateNaissance(e.target.value)} /></Champ>
                    <Champ lbl="Classe">
                      <select style={inp} value={classeId} onChange={e => setClasseId(e.target.value)}>
                        <option value="">-- Choisir --</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                    </Champ>
                    <Champ lbl="A commencé l'école le *">
                      <input style={inp} required type="date" value={dateDebutCours} onChange={e => setDateDebutCours(e.target.value)} />
                    </Champ>
                    <Champ lbl="Catégorie *">
                      <select style={inp} required value={categorie} onChange={e => setCategorie(e.target.value)}>
                        <option value="">-- Choisir --</option>
                        <option value="OASI">OASI</option>
                        <option value="EUCMS">EUCMS</option>
                      </select>
                    </Champ>
                    <Champ lbl="Téléphone"><input style={inp} value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="079 123 45 67" /></Champ>
                    <Champ lbl="Adresse"><input style={inp} value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Rue de la Paix 10, 1950 Sion" /></Champ>
                  </div>
                  <div style={{...secTitle('#92400e','#fef3c7'),marginTop:16}}>👨‍👩‍👦 Contact / Parent</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <Champ lbl="NOM et prénom"><input style={inp} value={nomParent} onChange={e => setNomParent(e.target.value)} placeholder="DUPONT Jean" /></Champ>
                    <Champ lbl="Téléphone parent"><input style={inp} value={telephoneParent} onChange={e => setTelephoneParent(e.target.value)} placeholder="079 987 65 43" /></Champ>
                  </div>
                </div>

                {/* COL 2 - Données OASI */}
                <div>
                  <div style={secTitle('#3730a3','#e0e7ff')}>🗂️ Données OASI</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <Champ lbl="PROG_NOM"><input style={inp} value={oasiProgNom} onChange={e => setOasiProgNom(e.target.value)} placeholder="Programme..." /></Champ>
                    <Champ lbl="PROG_ENCADRANT"><input style={inp} value={oasiProgEncadrant} onChange={e => setOasiProgEncadrant(e.target.value)} placeholder="Encadrant..." /></Champ>
                    <Champ lbl="N"><input style={inp} type="number" value={oasiN} onChange={e => setOasiN(e.target.value)} placeholder="859056" /></Champ>
                    <Champ lbl="REF"><input style={inp} type="number" value={oasiRef} onChange={e => setOasiRef(e.target.value)} placeholder="21372" /></Champ>
                    <Champ lbl="POS"><input style={inp} type="number" value={oasiPos} onChange={e => setOasiPos(e.target.value)} placeholder="1" /></Champ>
                    <Champ lbl="NOM"><input style={inp} value={oasiNom} onChange={e => setOasiNom(e.target.value)} placeholder="AHMAD Riaz" /></Champ>
                    <Champ lbl="NAIS"><input style={inp} type="date" value={oasiNais} onChange={e => setOasiNais(e.target.value)} /></Champ>
                    <Champ lbl="NATIONALITE"><input style={inp} value={oasiNationalite} onChange={e => setOasiNationalite(e.target.value)} placeholder="AFGHANISTAN" /></Champ>

                    <Champ lbl="PROG_PRESENCES"><input style={inp} value={oasiProgPresences} onChange={e => setOasiProgPresences(e.target.value)} /></Champ>
                    <Champ lbl="PROG_ADMIN"><input style={inp} value={oasiProgAdmin} onChange={e => setOasiProgAdmin(e.target.value)} /></Champ>
                    <Champ lbl="AS"><input style={inp} value={oasiAs} onChange={e => setOasiAs(e.target.value)} /></Champ>
                    <Champ lbl="PRG_ID"><input style={inp} type="number" value={oasiPrgId} onChange={e => setOasiPrgId(e.target.value)} /></Champ>
                    <Champ lbl="PRG_OCCUPATION_ID"><input style={inp} type="number" value={oasiPrgOccupationId} onChange={e => setOasiPrgOccupationId(e.target.value)} /></Champ>
                    <Champ lbl="RA_ID"><input style={inp} type="number" value={oasiRaId} onChange={e => setOasiRaId(e.target.value)} /></Champ>
                    <Champ lbl="TEMPS_REPARTI_ID"><input style={inp} type="number" value={oasiTempsRepartiId} onChange={e => setOasiTempsRepartiId(e.target.value)} /></Champ>
                  </div>
                </div>

                {/* COL 3 - OASI optionnels */}
                <div>
                  <div style={secTitle('#475569','#f1f5f9')}>📋 Données AOSI - présences</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <Champ lbl="PRESENCE_DATE"><input style={inp} type="date" value={oasiPresenceDate} onChange={e => setOasiPresenceDate(e.target.value)} /></Champ>
                    <Champ lbl="JOUR_SEMAINE"><input style={inp} value={oasiJourSemaine} onChange={e => setOasiJourSemaine(e.target.value)} placeholder="lundi" /></Champ>
                    <Champ lbl="PRESENCE_PERIODE"><input style={inp} value={oasiPresencePeriode} onChange={e => setOasiPresencePeriode(e.target.value)} placeholder="Matin" /></Champ>
                    <Champ lbl="PRESENCE_TYPE"><input style={inp} value={oasiPresenceType} onChange={e => setOasiPresenceType(e.target.value)} placeholder="01 Présent" /></Champ>
                    <Champ lbl="REMARQUE"><textarea style={{...inp,minHeight:80,resize:'vertical'}} value={oasiRemarque} onChange={e => setOasiRemarque(e.target.value)} /></Champ>
                    <Champ lbl="CONTROLE_DU"><input style={inp} type="date" value={oasiControleDu} onChange={e => setOasiControleDu(e.target.value)} /></Champ>
                    <Champ lbl="CONTROLE_AU"><input style={inp} type="date" value={oasiControleAu} onChange={e => setOasiControleAu(e.target.value)} /></Champ>
                  </div>
                </div>
              </div>

              <div style={{display:'flex',flexDirection:'column',marginBottom:16}}>
                <label style={{fontSize:12,fontWeight:600,marginBottom:5,color:'#475569'}}>Statut</label>
                <select style={inp} value={statut} onChange={e => setStatut(e.target.value)}>
                  <option value="actif">✅ Actif</option>
                  <option value="inactif">❌ Inactif</option>
                </select>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24,paddingTop:20,borderTop:'1px solid #f1f5f9'}}>
                <button type="button" style={{padding:'9px 18px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#64748b'}} onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" style={{padding:'9px 20px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13}}>Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDocsEleve && docsEleve && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1200}}>
          <div style={{background:'white',padding:24,borderRadius:16,width:'100%',maxWidth:600,maxHeight:'85vh',overflowY:'auto',boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <h3 style={{margin:0,fontSize:18,fontWeight:800}}>📁 Documents — {docsEleve.prenom} {docsEleve.nom}</h3>
              <button style={{background:'none',border:'none',fontSize:18,cursor:'pointer'}} onClick={() => setShowDocsEleve(false)}>✕</button>
            </div>
            {isAdmin() && (
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:'#475569',marginBottom:8,textTransform:'uppercase'}}>Ajouter un document</div>
                <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                  <select style={{...inp,width:'auto',padding:'7px 10px'}} value={uploadEleveForm.type} onChange={e => setUploadEleveForm({type:e.target.value})}>
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
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1200}}>
          <div style={{background:'white',padding:24,borderRadius:16,width:'95vw',maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <h3 style={{margin:0,fontSize:18,fontWeight:800}}>⚠️ Sanctions — {sanctionsEleve.prenom} {sanctionsEleve.nom}</h3>
              <button style={{background:'none',border:'none',fontSize:18,cursor:'pointer'}} onClick={() => { setShowSanctions(false); setPendingCell(null); }}>✕</button>
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
                              const niveauxSaisie = echelle.niveaux.filter(n => n.type !== 'section');
                              const idxNiveau = niveauxSaisie.findIndex(n => n.id === niveau.id);
                              const prevNiveau = idxNiveau > 0 ? niveauxSaisie[idxNiveau - 1] : null;
                              const prevExiste = prevNiveau
                                ? !!eleveSanctions.find(s => s.echelle===echelle.id && s.infraction===infraction && s.niveau===prevNiveau.id)
                                : true;
                              const peutAjouter = idxNiveau === 0 || prevExiste;
                              return (
                                <td key={infraction} style={{padding:'4px 4px',border:'1px solid #e2e8f0',textAlign:'center',background:sanction?'#fef3c7':'white',verticalAlign:'middle'}}>
                                  {isPending ? (
                                    <div style={{display:'flex',flexDirection:'column',gap:3,textAlign:'left'}}>
                                      <div style={{fontSize:10,color:'#374151',padding:'3px 6px',background:'#f1f5f9',borderRadius:4,fontWeight:600}}>
                                        📅 {pendingCell.date_sanction ? new Date(pendingCell.date_sanction+'T00:00:00').toLocaleDateString('fr-CH') : ''}
                                      </div>
                                      <select
                                        value={pendingCell.observation_ref || ''}
                                        onChange={e => setPendingCell(prev => ({ ...prev, observation_ref: e.target.value }))}
                                        style={{fontSize:10,padding:'4px 6px',border:'1px solid #cbd5e1',borderRadius:4,background:'white',color:'#374151',fontWeight:600}}
                                      >
                                        <option value="">Réf. observation</option>
                                        {sanctionsObservations.filter(o => o.reference_obs).map(o => (
                                          <option key={o.id} value={o.reference_obs}>
                                            {o.reference_obs}
                                          </option>
                                        ))}
                                      </select>
                                      <div style={{fontSize:10,color:'#374151',padding:'3px 6px',background:'#f1f5f9',borderRadius:4,fontWeight:600}}>
                                        👤 {pendingCell.prof_nom}
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
                                          <option value="">Réf. observation</option>
                                          {sanctionsObservations.filter(o => o.reference_obs).map(o => (
                                            <option key={o.id} value={o.reference_obs}>{o.reference_obs}</option>
                                          ))}
                                        </select>
                                        <div style={{fontSize:10,color:'#374151',padding:'3px 6px',background:'#f1f5f9',borderRadius:4,fontWeight:600}}>
                                          👤 {editSanction.prof_nom || ''}
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
                                            {sanction.observation_ref ? ' · ' : ''}
                                            {sanction.observation_ref ? (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const obs = sanctionsObservations.find(o => o.reference_obs === sanction.observation_ref);
                                                  if (!obs) return alert('Observation introuvable.');
                                                  alert(`${obs.reference_obs || ''}\n\nTitre: ${obs.titre || ''}\n\nRemarque: ${obs.contenu || ''}\n\nMesure: ${obs.mesure_prise || '—'}`);
                                                }}
                                                style={{background:'none',border:'none',padding:0,margin:0,color:'#1d4ed8',cursor:'pointer',fontSize:9,fontWeight:700,textDecoration:'underline'}}
                                              >
                                                {sanction.observation_ref}
                                              </button>
                                            ) : null}
                                          </span>
                                          <span style={{fontSize:9,color:'#92400e',lineHeight:1.2}}>{sanction.prof_nom||''}</span>
                                        </div>
                                        {isAdmin() && (
                                          <div style={{display:'flex',flexDirection:'column',gap:2,alignItems:'center'}}>
                                            <button onClick={() => setEditSanction({
                                              id: sanction.id,
                                              date_sanction: sanction.date_sanction ? String(sanction.date_sanction).substring(0,10) : '',
                                              observation_ref: sanction.observation_ref || '',
                                              prof_nom: sanction.prof_nom || ''
                                            })} style={{background:'none',border:'none',cursor:'pointer',fontSize:10,color:'#475569',padding:0,lineHeight:1}} title="Modifier">✏️</button>
                                            <button onClick={() => supprimerSanction(sanction.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:10,color:'#ef4444',padding:0,lineHeight:1}} title="Retirer">🗑️</button>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  ) : (
                                    isAdmin() ? (
                                      <button onClick={() => {
                                        if (!peutAjouter) {
                                          alert("Vous devez d'abord saisir la sanction du niveau précédent dans cette colonne.");
                                          return;
                                        }
                                        const refs = sanctionsObservations.filter(o => o.reference_obs);
                                        const today = new Date().toISOString().split('T')[0];
                                        const profNom = currentUser ? ((currentUser.prenom||'')+' '+(currentUser.nom||'')).trim() : '';
                                        setPendingCell({echelle:echelle.id,infraction,niveau:niveau.id,date_sanction:today,prof_nom:profNom,observation_ref:refs[0]?.reference_obs || ''});
                                      }}
                                      style={{width:20,height:20,borderRadius:4,border:'2px solid '+(peutAjouter?'#d1d5db':'#e5e7eb'),background:peutAjouter?'white':'#f3f4f6',cursor:peutAjouter?'pointer':'not-allowed',display:'inline-block',opacity:peutAjouter?1:0.6}} title={peutAjouter ? "Ajouter" : "Saisir d'abord le niveau précédent"} />
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
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1200}}>
          <div style={{background:'white',padding:24,borderRadius:16,width:'95vw',maxWidth:1100,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <h3 style={{margin:0,fontSize:18,fontWeight:800}}>📋 Observations — {obsEleve.prenom} {obsEleve.nom}</h3>
              <button style={{background:'none',border:'none',fontSize:18,cursor:'pointer'}} onClick={() => setShowObs(false)}>✕</button>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <span style={{fontSize:12,color:'#64748b'}}>Total: <b>{observations.length}</b> observation(s)</span>
              <div style={{display:'flex',gap:8}}>
                <button style={{padding:'8px 16px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13}} onClick={() => imprimerObservations()}>📄 Rapport PDF</button>
                <button style={{padding:'8px 16px',background:'#10b981',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13}} onClick={() => setShowObsForm(!showObsForm)}>+ Ajouter</button>
              </div>
            </div>

            {showObsForm && (
              <form onSubmit={sauverObservation} style={{background:'#f8fafc',borderRadius:10,padding:16,marginTop:16,border:'1px solid #e2e8f0'}}>
                <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:8,fontSize:12,color:'#64748b'}}>
                  <span>✍️ Auteur : <b>{currentUser?.prenom} {currentUser?.nom}</b></span>
                  <span>📅 {new Date().toLocaleDateString('fr-CH')}</span>
                  <span>🔖 <b>{referenceObservationPreview}</b></span>
                </div>
                <div style={{display:'flex',flexDirection:'column'}}>
                  <label style={{fontSize:12,fontWeight:600,marginBottom:5,color:'#475569'}}>Titre *</label>
                  <input style={inp} required value={obsForm.titre} onChange={e => setObsForm({...obsForm,titre:e.target.value})} placeholder="Ex: Comportement en classe..." />
                </div>
                <div style={{display:'flex',flexDirection:'column',marginTop:10}}>
                  <label style={{fontSize:12,fontWeight:600,marginBottom:5,color:'#475569'}}>Remarque *</label>
                  <textarea style={{...inp,minHeight:70,resize:'vertical'}} required value={obsForm.contenu} onChange={e => setObsForm({...obsForm,contenu:e.target.value})} placeholder="Saisir votre observation..." />
                </div>
                <div style={{display:'flex',flexDirection:'column',marginTop:10}}>
                  <label style={{fontSize:12,fontWeight:600,marginBottom:5,color:'#475569'}}>Mesure prise *</label>
                  <textarea style={{...inp,minHeight:60,resize:'vertical'}} required value={obsForm.mesure_prise} onChange={e => setObsForm({...obsForm,mesure_prise:e.target.value})} placeholder="Ex: Avertissement oral, convocation..." />
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
                  <button type="button" style={{padding:'9px 18px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#64748b'}} onClick={() => setShowObsForm(false)}>Annuler</button>
                  <button type="submit" style={{padding:'9px 20px',background:'#10b981',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13}}>Sauvegarder</button>
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
                    const r = await axios.get(API+'/observations/eleve/'+obsEleve.id, {headers});
                    setObservations(r.data);
                  }} style={{background:'#f0f4ff',borderRadius:10,padding:16,border:'1px solid #c7d2fe',borderLeft:'3px solid #6366f1'}}>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:12,fontWeight:600,marginBottom:5,color:'#475569'}}>Titre</label>
                      <input style={inp} value={obsEditForm.titre} onChange={e => setObsEditForm({...obsEditForm,titre:e.target.value})} required />
                    </div>
                    <div style={{display:'flex',flexDirection:'column',marginTop:10}}>
                      <label style={{fontSize:12,fontWeight:600,marginBottom:5,color:'#475569'}}>Remarque</label>
                      <textarea style={{...inp,minHeight:60,resize:'vertical'}} value={obsEditForm.contenu} onChange={e => setObsEditForm({...obsEditForm,contenu:e.target.value})} required />
                    </div>
                    <div style={{display:'flex',flexDirection:'column',marginTop:10}}>
                      <label style={{fontSize:12,fontWeight:600,marginBottom:5,color:'#475569'}}>Mesure prise</label>
                      <textarea style={{...inp,minHeight:50,resize:'vertical'}} value={obsEditForm.mesure_prise||''} onChange={e => setObsEditForm({...obsEditForm,mesure_prise:e.target.value})} />
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
                      <button type="button" style={{padding:'9px 18px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#64748b'}} onClick={() => setObsEditId(null)}>Annuler</button>
                      <button type="submit" style={{padding:'9px 20px',background:'#10b981',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13}}>Sauvegarder</button>
                    </div>
                  </form>
                ) : (
                  <div key={obs.id} style={{background:'#f8fafc',borderRadius:10,padding:16,border:'1px solid #e2e8f0',borderLeft:'3px solid #6366f1'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                      <div style={{display:'flex',flexDirection:'column',gap:2}}>
                        <b style={{fontSize:14,color:'#1e293b'}}>{obs.titre}</b>
                        <span style={{fontSize:11,color:'#64748b'}}>
                          {obs.reference_obs ? `${obs.reference_obs} - ` : ''}
                          {new Date(obs.created_at).toLocaleDateString('fr-CH')}
                        </span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        {peutModifier && <>
                          <button onClick={() => { setObsEditId(obs.id); setObsEditForm({titre:obs.titre,contenu:obs.contenu,mesure_prise:obs.mesure_prise||'',intervention_responsable:obs.intervention_responsable||false,demande_entretien:obs.demande_entretien||false}); }} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,opacity:0.6}} title="Modifier">✏️</button>
                          <button onClick={async () => {
                            if (window.confirm('Supprimer cette observation ?')) {
                              await axios.delete(API+'/observations/'+obs.id, {headers});
                              const r = await axios.get(API+'/observations/eleve/'+obsEleve.id, {headers});
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
      )}

      {/* Tableau */}
      <div style={{marginTop:14}}>
        <div style={{overflowX:'auto',borderRadius:12,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #f1f5f9'}}>
        <table style={{width:'100%',borderCollapse:'collapse',background:'white'}}>
          <thead>
            <tr style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
              <th style={{padding:'10px 10px',textAlign:'center',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap',width:62,minWidth:62,maxWidth:62}}>Photo</th>
              <th style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>Nom</th>
              <th style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>Prénom</th>
              <th style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>Nationalité</th>
              <th style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>Classe</th>
              <th style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>Naissance</th>
              <th style={{padding:'10px 10px',textAlign:'center',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap',width:110,minWidth:110,maxWidth:110}}>Observations</th>
              <th style={{padding:'10px 10px',textAlign:'center',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap',width:92,minWidth:92,maxWidth:92}}>Sanctions</th>
              <th style={{padding:'10px 10px',textAlign:'center',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap',width:96,minWidth:96,maxWidth:96}}>Documents</th>
              <th style={{padding:'10px 10px',textAlign:'center',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap',width:122,minWidth:122,maxWidth:122}}>Statut</th>
              <th style={{padding:'10px 10px',textAlign:'center',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap',width:86,minWidth:86,maxWidth:86}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {elevesFiltres.length===0 ? (
              <tr><td colSpan="11" style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Aucun élève trouvé</td></tr>
            ) : elevesFiltres.map(el => (
              <tr key={el.id} style={{borderBottom:'1px solid #f8fafc'}}>
                <td style={{padding:'10px 10px',width:62,minWidth:62,maxWidth:62,textAlign:'center'}}>
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
                <td style={{padding:'10px 14px',fontSize:13,color:'#374151'}}>{el.oasi_nationalite||'—'}</td>
                <td style={{padding:'10px 14px',fontSize:13}}>
                  <select value={el.classe_id||''} onChange={e => handleClasseChange(el.id, e.target.value)}
                    style={{padding:'5px 8px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:12,background:'white',cursor:'pointer',maxWidth:120}}>
                    <option value="">— Aucune —</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </td>
                <td style={{padding:'10px 14px',fontSize:13,color:'#374151'}}>{el.date_naissance?new Date(el.date_naissance).toLocaleDateString('fr-CH'):el.oasi_nais?new Date(el.oasi_nais).toLocaleDateString('fr-CH'):'—'}</td>
                <td style={{padding:'10px 10px',width:110,minWidth:110,maxWidth:110,textAlign:'center'}}><button style={{padding:'5px 10px',background:'#eef2ff',color:'#4338ca',border:'none',borderRadius:6,cursor:'pointer'}} onClick={() => ouvrirObservations(el)} title="Observations">👁 Détail</button></td>
                <td style={{padding:'10px 10px',width:92,minWidth:92,maxWidth:92,textAlign:'center'}}><button style={{padding:'5px 10px',background:'#fff7ed',color:'#c2410c',border:'none',borderRadius:6,cursor:'pointer'}} onClick={() => ouvrirSanctions(el)} title="Sanctions">⚠️</button></td>
                <td style={{padding:'10px 10px',width:96,minWidth:96,maxWidth:96,textAlign:'center'}}><button style={{padding:'5px 10px',background:'#dbeafe',color:'#1e40af',border:'none',borderRadius:6,cursor:'pointer'}} onClick={() => ouvrirDocumentsEleve(el)} title="Documents">📁</button></td>
                <td style={{padding:'10px 10px',width:122,minWidth:122,maxWidth:122,textAlign:'center'}}>
                  <button
                    onClick={() => handleToggleStatut(el)}
                    style={el.statut==='actif'?{background:'#d1fae5',color:'#065f46',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600,border:'none',cursor:isAdmin()?'pointer':'default',opacity:isAdmin()?1:0.6}:{background:'#fee2e2',color:'#991b1b',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600,border:'none',cursor:isAdmin()?'pointer':'default',opacity:isAdmin()?1:0.6}}
                  >
                    {el.statut==='actif'?'✅ Actif':'❌ Inactif'}
                  </button>
                </td>
                <td style={{padding:'10px 10px',width:86,minWidth:86,maxWidth:86,textAlign:'center'}}>
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
    </div>
  );
}