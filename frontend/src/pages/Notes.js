/* eslint-disable */
import { isAdmin, peutModifierNotes } from '../utils/permissions';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { getSessionUser } from '../utils/session';
import { injectForcedPrintCss, openPrintPopup } from '../utils/print';
import CustomSelect from '../components/CustomSelect';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';
const TYPES = ['Ecrit', 'Oral', 'Projet', 'TP', 'Devoir'];
/** Même largeur fixe que la colonne œil (détail) dans Gestion des classes */
const COL_OEIL_DETAIL = 52;

const calculerNote = (points, pointsMax) => {
  if (points === '' || points === null || points === undefined || pointsMax <= 0) return null;
  const p = Math.min(parseFloat(points), parseFloat(pointsMax));
  const note = (p / parseFloat(pointsMax)) * 5 + 1;
  return Math.round(Math.min(note, 6) * 10) / 10;
};

const getApprec = (n) => {
  if (n == null) return '—';
  const v = parseFloat(n);
  if (isNaN(v)) return '—';
  if (v < 4) return 'INS';
  if (v < 4.5) return 'S';
  if (v < 5) return 'AB';
  if (v < 5.5) return 'B';
  if (v < 6) return 'TB';
  return 'EXC';
};
const fmtNote = (n) => {
  if (n === null || n === undefined) return '—';
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  return num % 1 === 0 ? String(Math.round(num)) : String(parseFloat(num.toFixed(1)));
};
const abregerMatiere = (nom) => {
  const txt = String(nom || '').trim();
  if (!txt) return '';
  const map = {
    'Mathématiques': 'Math',
    'Français': 'Français',
    'Sciences naturelles': 'Sc. nat.',
    'Connaissance de l\'environnement': 'Env.',
  };
  return map[txt] || txt;
};
const nomSansSuffixe = (nom) => String(nom || '').split('-')[0].trim();

const parseMatieresDetail = (row) => {
  const md = row?.matieres_detail;
  if (Array.isArray(md)) return md.filter(x => x && x.matiere_id != null);
  if (typeof md === 'string') {
    try {
      const p = JSON.parse(md);
      return Array.isArray(p) ? p.filter(x => x && x.matiere_id != null) : [];
    } catch { return []; }
  }
  return [];
};

/** Une entrée par matière (évite les doublons si le prof a plusieurs créneaux pour la même branche). */
const parseMatieresDetailDedup = (row) => {
  const raw = parseMatieresDetail(row);
  const byId = new Map();
  for (const x of raw) {
    if (x == null || x.matiere_id == null) continue;
    const id = String(x.matiere_id);
    if (byId.has(id)) continue;
    const label = String(x.label || '').trim();
    byId.set(id, { matiere_id: x.matiere_id, label: label || id });
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' })
  );
};

const sortMatieres = (matieres) => [...matieres].sort((a, b) => {
  const pri = (n) => n === 'Français' ? 0 : n === 'Mathématiques' ? 1 : 2;
  const pa = pri(a.matiere_nom), pb = pri(b.matiere_nom);
  if (pa !== pb) return pa - pb;
  return a.matiere_nom.localeCompare(b.matiere_nom, 'fr');
});

const moyenneEleveMatiere = (matiere, eleveId) => {
  const vals = matiere.evaluations.flatMap(ev => {
    const n = ev.notes.find(n => n.eleve_id === eleveId);
    return n && !n.absent && !n.dispense && n.valeur !== null ? [parseFloat(n.valeur)] : [];
  });
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, v) => a + v, 0) / vals.length * 10) / 10;
};

const getMention = (moyenne) => {
  if (moyenne >= 5.5) return { label: 'Excellent', color: '#2e7d32' };
  if (moyenne >= 5) return { label: 'Très Bien', color: '#388e3c' };
  if (moyenne >= 4.5) return { label: 'Bien', color: '#6366f1' };
  if (moyenne >= 4) return { label: 'Suffisant', color: '#f59e0b' };
  if (moyenne >= 3.5) return { label: 'Insuffisant', color: '#f97316' };
  return { label: 'Très Insuffisant', color: '#ef4444' };
};

export default function Notes() {
  const [vue, setVue] = useState('classes');
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [evaluationOuverte, setEvaluationOuverte] = useState(null);
  const [elevesNotes, setElevesNotes] = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [bulletinStatsPresences, setBulletinStatsPresences] = useState([]);
  const [bulletinStatsS1, setBulletinStatsS1] = useState([]);
  const [bulletinStatsS2, setBulletinStatsS2] = useState([]);
  const [bulletinCriteres, setBulletinCriteres] = useState([]);
  const [bulletinRemarqueEdit, setBulletinRemarqueEdit] = useState({});
  const [eleveSelectionne, setEleveSelectionne] = useState(null);
  const [matiereSelectionnee, setMatiereSelectionnee] = useState('');
  const [classeSelectionnee, setClasseSelectionnee] = useState('');
  const [classeObj, setClasseObj] = useState(null);
  const [ecoleParams, setEcoleParams] = useState({});
  const [matiereObj, setMatiereObj] = useState(null);
  const [rapport, setRapport] = useState(null);
  const [rapportChargement, setRapportChargement] = useState(false);
  const [rapportErreur, setRapportErreur] = useState('');
  const [vueGeneraleMode, setVueGeneraleMode] = useState('tous');
  const [showVueGeneraleModes, setShowVueGeneraleModes] = useState(false);
  const [vueClasseAction, setVueClasseAction] = useState('evaluations');
  const [vueContexte, setVueContexte] = useState('detail');
  const [rapportMatiereId, setRapportMatiereId] = useState('');
  const [rapportEleveId, setRapportEleveId] = useState('');
  const [bulletinMode, setBulletinMode] = useState('eleve');
  const [showAppreciations, setShowAppreciations] = useState(false);
  const [bulletinOnglet, setBulletinOnglet] = useState('criteres');
  const [bulletinNiveau, setBulletinNiveau] = useState('');
  const [bulletinSemestre, setBulletinSemestre] = useState('1');
  const [bulletinsSem1, setBulletinsSem1] = useState([]);
  const [bulletinsSem2, setBulletinsSem2] = useState([]);
  const [criteresSem1, setCriteresSem1] = useState([]);
  const [criteresSem2, setCriteresSem2] = useState([]);
  const [remarqueModal, setRemarqueModal] = useState(null);
  const [bulletinPopupEleve, setBulletinPopupEleve] = useState(null);
  const [evalSemestre, setEvalSemestre] = useState('1');
  const [sem1Bloque, setSem1Bloque] = useState(false);
  const [evalNiveauFiltre, setEvalNiveauFiltre] = useState('tous');
  const [showNiveauxFiltres, setShowNiveauxFiltres] = useState(false);
  const [suiviNotesClasse, setSuiviNotesClasse] = useState({});
  const [branches, setBranches] = useState([]);
  const [classesResponsables, setClassesResponsables] = useState([]);
  const [generaleSemestre, setGeneraleSemestre] = useState('1');
  const [showForm, setShowForm] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast({ message: '', type: 'success' }), 2200); };
  const [criteresLocaux, setCriteresLocaux] = useState([]);
  const [criteresModifies, setCriteresModifies] = useState(false);
  const [criteresValides, setCriteresValides] = useState(false);
  const [form, setForm] = useState({ nom: '', matiere_id: '', date: new Date().toISOString().split('T')[0], type: 'Ecrit', coefficient: '1', sur: '6', points_max: '', sans_points: false, editId: null });
  const [searchParams, setSearchParams] = useSearchParams();
  const [rechercheClasses, setRechercheClasses] = useState('');
  const printRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();
  const headers = {};
  const currentUser = getSessionUser() || {};
  const profNomSession = ((currentUser.prenom || '') + ' ' + (currentUser.nom || '')).trim() || '—';
  const todayFormatted = new Date().toLocaleDateString('fr-CH');
  const nbEvalMatiereProf = (classeId, profId, matiereId) => {
    const pid = profId != null && profId !== '' ? String(profId) : 'null';
    const k = `${classeId}-${matiereId}-${pid}`;
    if (suiviNotesClasse[k] !== undefined) return suiviNotesClasse[k];
    return suiviNotesClasse[`${classeId}-${matiereId}`] || 0;
  };

  // Réagit aux changements de l'URL (sidebar Notes)
  useEffect(() => {
    const classeId = searchParams.get('classeId');
    const tab = searchParams.get('tab');
    if (!classeId) {
      setVue('classes');
      setClasseSelectionnee('');
      setClasseObj(null);
      return;
    }
    // Si la classe est déjà chargée, changer de vue selon l'onglet cliqué
    if (classeSelectionnee && String(classeSelectionnee) === String(classeId)) {
      if (tab === 'generale') { setVue('generale'); setVueClasseAction('generale'); setVueContexte('detail'); }
      else if (tab === 'evaluations') { setVue('matieres'); setVueClasseAction('evaluations'); setVueContexte('detail'); }
      else if (tab === 'comportements') { setVue('bulletin'); setVueClasseAction('comportements'); setVueContexte('bulletin'); setBulletinOnglet('criteres'); }
      else if (tab === 'bulletin') { setVue('bulletin'); setVueClasseAction('bulletin'); setVueContexte('bulletin'); setBulletinOnglet('notes'); }
    }
  }, [searchParams, location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chargerClasses(); chargerMatieres(); chargerParametresEcole();
    // Données pour le tableau des classes
    axios.get(API + '/emploi-du-temps/matieres', { headers }).then(r => setBranches(r.data || [])).catch(() => {});
    axios.get(API + '/notes/suivi-classes', { headers }).then(r => {
      const map = {};
      (r.data || []).forEach(x => {
        const pid = x.prof_id != null && x.prof_id !== '' ? String(x.prof_id) : 'null';
        map[`${x.classe_id}-${x.matiere_id}-${pid}`] = parseInt(x.nb_evaluations, 10) || 0;
      });
      setSuiviNotesClasse(map);
    }).catch(() => {});
    axios.get(API + '/notes/classes-responsables', { headers }).then(r => setClassesResponsables(r.data || [])).catch(() => {});
    axios.get(API + '/notes/semestre-config', { headers }).then(r => {
      const bloque = r.data?.sem1_bloque === true;
      setSem1Bloque(bloque);
      if (bloque && !isAdmin()) { setEvalSemestre('2'); setBulletinSemestre('2'); }
    }).catch(() => {});
  }, []);

  const chargerClasses = async () => {
    try {
      const res = await axios.get(API + '/classes', { headers });
      setClasses(res.data);
    } catch (err) { console.error(err); }
  };

  const chargerMatieres = async () => {
    try {
      const res = await axios.get(API + '/emploi-du-temps/matieres', { headers });
      setMatieres(res.data);
    } catch (err) { console.error(err); }
  };

  const chargerParametresEcole = async () => {
    try {
      const res = await axios.get(API + '/parametres/ecole', { headers });
      setEcoleParams(res.data || {});
    } catch (err) { setEcoleParams({}); }
  };

  const chargerEvaluationsId = async (classeId, matiereId, sem) => {
    try {
      let url = API + '/notes?classe_id=' + classeId;
      if (matiereId) url += '&matiere_id=' + matiereId;
      const s = sem !== undefined ? sem : evalSemestre;
      if (s) url += '&semestre=' + s;
      const res = await axios.get(url, { headers });
      setEvaluations(res.data);
      return res.data;
    } catch (err) { console.error(err); return []; }
  };

  const chargerRapport = async (classeId, sem) => {
    setRapport(null);
    setRapportErreur('');
    setRapportChargement(true);
    const semVal = sem !== undefined ? sem : generaleSemestre;
    try {
      const res = await axios.get(API + '/notes/rapport?classe_id=' + classeId + (semVal ? '&semestre=' + semVal : ''), { headers });
      setRapport(res.data);
    } catch (err) {
      console.error(err);
      setRapportErreur(err.response?.data?.message || err.message || 'Erreur inconnue');
    } finally {
      setRapportChargement(false);
    }
  };

  useEffect(() => {
    const classeId = searchParams.get('classeId');
    const tab = searchParams.get('tab');
    if (!classeId || tab !== 'generale') return;
    const cl = classes.find(c => String(c.id) === String(classeId));
    if (!cl) return;
    setClasseObj(cl);
    setClasseSelectionnee(cl.id);
    setVueClasseAction('generale');
    setVueContexte('detail');
    const semFocus = sem1Bloque && !isAdmin() ? '2' : '1';
    setGeneraleSemestre(semFocus);
    setVue('generale');
    chargerRapport(cl.id, semFocus);
  }, [searchParams, classes, sem1Bloque, location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const chargerBulletinId = async (classeId, sem) => {
    try {
      const semVal = sem !== undefined ? sem : bulletinSemestre;
      const today = new Date(); const annee = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
      const [bulletinRes, statsRes, criteresRes, bS1Res, bS2Res, cr1Res, cr2Res, stats1Res, stats2Res] = await Promise.all([
        axios.get(API + '/notes/bulletin?classe_id=' + classeId + '&semestre=' + semVal, { headers }),
        axios.get(API + '/presences/statistiques?classe_id=' + classeId + (semVal === '1' ? `&date_debut=${annee}-08-01&date_fin=${annee}-12-31` : `&date_debut=${annee+1}-01-01&date_fin=${annee+1}-06-30`), { headers }),
        axios.get(API + '/notes/bulletin-criteres?classe_id=' + classeId + '&semestre=' + semVal, { headers }),
        axios.get(API + '/notes/bulletin?classe_id=' + classeId + '&semestre=1', { headers }),
        axios.get(API + '/notes/bulletin?classe_id=' + classeId + '&semestre=2', { headers }),
        axios.get(API + '/notes/bulletin-criteres?classe_id=' + classeId + '&semestre=1', { headers }),
        axios.get(API + '/notes/bulletin-criteres?classe_id=' + classeId + '&semestre=2', { headers }),
        axios.get(API + '/presences/statistiques?classe_id=' + classeId + `&date_debut=${annee}-08-01&date_fin=${annee}-12-31`, { headers }),
        axios.get(API + '/presences/statistiques?classe_id=' + classeId + `&date_debut=${annee+1}-01-01&date_fin=${annee+1}-06-30`, { headers }),
      ]);
      const bulletinData = bulletinRes.data || [];
      setBulletins(bulletinData);
      setBulletinStatsPresences(statsRes.data || []);
      setBulletinStatsS1(stats1Res.data || []);
      setBulletinStatsS2(stats2Res.data || []);
      const criteresData = criteresRes.data || [];
      setBulletinCriteres(criteresData);
      setCriteresLocaux(criteresData);
      setCriteresModifies(false);
      const activeEleveIds = new Set(bulletinData.map(b => Number(b.eleve.id)));
      const criteresActifs = criteresData.filter(cr => activeEleveIds.has(Number(cr.eleve_id)));
      setCriteresValides(activeEleveIds.size > 0 && criteresActifs.length === activeEleveIds.size && criteresActifs.every(cr => cr.valide === true));
      setBulletinsSem1(bS1Res.data || []);
      setBulletinsSem2(bS2Res.data || []);
      setCriteresSem1(cr1Res.data || []);
      setCriteresSem2(cr2Res.data || []);
    } catch (err) { console.error(err); }
  };

  const ouvrirClasse = async (cl) => {
    setClasseObj(cl);
    setClasseSelectionnee(cl.id);
    await chargerEvaluationsId(cl.id, null);
    await chargerBulletinId(cl.id);
    setVue('matieres');
  };

  const ouvrirMatiere = async (m) => {
    setMatiereObj(m);
    setMatiereSelectionnee(m.id);
    await chargerEvaluationsId(classeSelectionnee, m.id);
    setShowForm(false);
    setForm({ nom: '', matiere_id: m.id, date: new Date().toISOString().split('T')[0], type: 'Ecrit', coefficient: '1', sur: '6', points_max: '', sans_points: false, editId: null });
    setVue('evaluations');
  };

  const ouvrirEvaluation = async (evaluation) => {
    try {
      const res = await axios.get(API + '/notes/' + evaluation.id + '/notes', { headers });
      setEvaluationOuverte(res.data.evaluation);
      setElevesNotes(res.data.eleves.map(e => ({
        ...e,
        points: e.points !== null ? String(parseFloat(e.points)) : '',
        note: e.valeur !== null ? String(parseFloat(e.valeur)) : '',
        absent: e.absent || false,
        dispense: e.dispense || false,
        commentaire: e.commentaire || ''
      })));
      setVue('saisie');
    } catch (err) { console.error(err); }
  };

  const formVide = { nom: '', matiere_id: matiereObj?.id || '', date: new Date().toISOString().split('T')[0], type: 'Ecrit', coefficient: '1', sur: '6', points_max: '', sans_points: false, editId: null };

  const ouvrirEditionEvaluation = (ev) => {
    const avecPoints = ev.points_max && parseFloat(ev.points_max) > 0;
    setForm({
      nom: ev.nom || '',
      matiere_id: ev.matiere_id || matiereObj?.id || '',
      date: ev.date ? new Date(ev.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      type: ev.type || 'Ecrit',
      coefficient: String(ev.coefficient || 1),
      sur: String(ev.sur || 6),
      points_max: avecPoints ? String(parseFloat(ev.points_max)) : '',
      sans_points: !avecPoints,
      editId: ev.id
    });
    setShowForm(true);
  };

  const handleCreerEvaluation = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        points_max: form.sans_points ? null : (form.points_max !== '' && form.points_max != null ? form.points_max : null),
        classe_id: classeSelectionnee,
        prof_id: currentUser.id || null,
        semestre: parseInt(evalSemestre) || 1
      };
      if (form.editId) {
        await axios.put(API + '/notes/' + form.editId, payload, { headers });
      } else {
        await axios.post(API + '/notes', payload, { headers });
      }
      setShowForm(false);
      setForm(formVide);
      await chargerEvaluationsId(classeSelectionnee, matiereSelectionnee);
    } catch (err) { alert('Erreur: ' + (err.response?.data?.message || err.message)); }
  };

  const handleSauvegarderNotes = async () => {
    try {
      const avecPoints = evaluationOuverte.points_max && parseFloat(evaluationOuverte.points_max) > 0;
      const notes = elevesNotes.map(e => ({
        eleve_id: e.id,
        points: avecPoints && e.points !== '' ? parseFloat(e.points) : null,
        valeur: avecPoints
          ? (e.points !== '' ? calculerNote(e.points, evaluationOuverte.points_max) : null)
          : (e.note !== '' ? Math.min(parseFloat(e.note), 6) : null),
        absent: e.absent,
        dispense: e.dispense,
        commentaire: e.commentaire
      }));
      await axios.post(API + '/notes/' + evaluationOuverte.id + '/notes', { notes }, { headers });
      showToast('Notes enregistrées.');
      await chargerBulletinId(classeSelectionnee);
    } catch (err) { alert('Erreur: ' + (err.response?.data?.message || err.message)); }
  };

  const handleSupprimerEvaluation = async (id) => {
    if (window.confirm('Supprimer cette évaluation ?')) {
      await axios.delete(API + '/notes/' + id, { headers });
      await chargerEvaluationsId(classeSelectionnee, matiereSelectionnee);
    }
  };

  const getMoyenneClasse = () => {
    const avecPoints = evaluationOuverte.points_max && parseFloat(evaluationOuverte.points_max) > 0;
    const valides = elevesNotes.filter(e => !e.absent && !e.dispense);
    if (avecPoints) {
      const actifs = valides.filter(e => e.points !== '');
      if (actifs.length === 0) return '—';
      const notes = actifs.map(e => calculerNote(e.points, evaluationOuverte.points_max)).filter(n => n !== null);
      if (notes.length === 0) return '—';
      return Math.round(notes.reduce((a, n) => a + n, 0) / notes.length * 10) / 10;
    } else {
      const actifs = valides.filter(e => e.note !== '');
      if (actifs.length === 0) return '—';
      const notes = actifs.map(e => parseFloat(e.note)).filter(n => !isNaN(n));
      if (notes.length === 0) return '—';
      return Math.round(notes.reduce((a, n) => a + n, 0) / notes.length * 10) / 10;
    }
  };

  const handleImprimer = () => {
    if (vue === 'bulletin' && bulletinMode === 'eleve' && !eleveSelectionne) {
      alert('Sélectionnez un élève avant impression.');
      return;
    }
    if (vue === 'bulletin') {
      const publicBase = `${window.location.origin}${process.env.PUBLIC_URL || ''}`;
      const now = new Date();
      const annee = now.getMonth() >= 7 ? `${now.getFullYear()}-${now.getFullYear()+1}` : `${now.getFullYear()-1}-${now.getFullYear()}`;
      const dateStr = now.toLocaleDateString('fr-CH');
      const showS2 = bulletinSemestre === '2';
      const seen = new Set(); const allEleves = [];
      for (const b of [...bulletinsSem1, ...bulletinsSem2]) { if (!seen.has(b.eleve.id)) { seen.add(b.eleve.id); allEleves.push(b.eleve); } }
      const elevesToShow = bulletinMode === 'tous' ? allEleves : allEleves.filter(el => el.id === parseInt(eleveSelectionne));
      const moyBr = (names, pm) => { const w = names.filter(n => pm[n]?.moyenne != null); return w.length ? w.reduce((a,n) => a + parseFloat(pm[n].moyenne||0), 0)/w.length : null; };
      const apprH = (n) => { if (n==null) return '—'; const v=parseFloat(n); if(isNaN(v))return'—'; if(v<4)return'INS'; if(v<4.5)return'S'; if(v<5)return'AB'; if(v<5.5)return'B'; if(v<6)return'TB'; return'EXC'; };
      const valH = (n, pm) => showAppreciations ? apprH(pm != null ? pm : n) : (n != null ? parseFloat(n).toFixed(1) : '—');
      const splitRem = (t) => { if (!t||!t.trim()) return []; const s = t.trim().split('\n').filter(Boolean); if (s.length>1) return s; return t.trim().split(/\.\s+(?=[A-ZÀ-Ü])/).map((r,i,a) => i<a.length-1?r+'.':r).filter(Boolean); };
      const dotH = (v) => v ? `<span style="width:11px;height:11px;border-radius:50%;display:inline-block;border:2px solid ${v==='vert'?'#22c55e':v==='orange'?'#f97316':'#ef4444'}"></span>` : `<span style="color:#aaa">—</span>`;
      const niv = String(classeObj?.niveau||'').toUpperCase();
      const cleNiv = niv.includes('CSC')?'CSC':niv.includes('CFR')?'CFR':niv.includes('EPL')?'EPL':'';
      const respNiveauNom = cleNiv==='CSC'?(ecoleParams.responsable_niveau_csc||''):cleNiv==='CFR'?(ecoleParams.responsable_niveau_cfr||''):cleNiv==='EPL'?(ecoleParams.responsable_niveau_epl||''):'';
      const respCoursNom = ecoleParams.responsable_langues_jeunes||'';
      const titulaire = [classeObj?.prof_prenom, classeObj?.prof_nom].filter(Boolean).join(' ');
      const th = `border:none;background:white;color:#000;font-weight:800;text-align:left;font-size:13px;padding:5px 10px;box-shadow:none;`;
      const thC = `${th}text-align:center;width:44px;white-space:nowrap;`;
      const td = `padding:4px 10px;font-size:13px;color:#374151;vertical-align:middle;`;
      const tdC = `padding:4px 6px;font-size:13px;color:#374151;text-align:center;vertical-align:middle;`;
      const footerHtml = `<div class="bul-footer"><img src="${publicBase}/logo-pied-page.png" style="height:30px;object-fit:contain;" onerror="this.style.display='none'"/><span>Zone Industrielle 4, 1963 Vétroz<br/>Tél. 027 606 18 60</span></div>`;
      const enteteHtml = `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;"><div style="display:flex;align-items:flex-start;gap:10px;"><img src="${publicBase}/logo-etat-du-valais.png" style="width:38px;" onerror="this.style.display='none'"/><div class="entete-txt"><div>Département de la santé, des affaires sociales et de la culture</div><div>Service de l'action sociale</div><div>Office de l'asile</div><div>Centre de formation "Le Botza"</div></div></div><div style="text-align:right;"><div class="scai">SCAI</div><div style="font-size:12px;font-weight:700;color:#374151;">${annee}</div><div style="font-size:10px;font-weight:700;color:#475569;">CLASSES D'ACCUEIL</div></div></div>`;
      const pages = elevesToShow.map(eleve => {
        const bdS1 = bulletinsSem1.find(b => b.eleve.id === eleve.id);
        const bdS2 = bulletinsSem2.find(b => b.eleve.id === eleve.id);
        const cr1 = criteresSem1.find(c => Number(c.eleve_id)===Number(eleve.id))||{};
        const cr2 = criteresSem2.find(c => Number(c.eleve_id)===Number(eleve.id))||{};
        const stS1 = bulletinStatsS1.find(s => Number(s.eleve_id)===Number(eleve.id));
        const stS2 = bulletinStatsS2.find(s => Number(s.eleve_id)===Number(eleve.id));
        const pm1 = bdS1?.parMatiere||{}; const pm2 = bdS2?.parMatiere||{};
        const allNames = [...new Set([...Object.keys(pm1),...Object.keys(pm2)])].sort();
        const prin = allNames.filter(n => Number((pm1[n]||pm2[n]||{}).coefficient||1)>=2);
        const sec = allNames.filter(n => Number((pm1[n]||pm2[n]||{}).coefficient||1)<2);
        const mP1=moyBr(prin,pm1),mP2=moyBr(prin,pm2),mS1=moyBr(sec,pm1),mS2=moyBr(sec,pm2);
        const mG1=moyBr([...prin,...sec],pm1),mG2=moyBr([...prin,...sec],pm2);
        const mAnn=mG1!=null&&mG2!=null?(mG1+mG2)/2:null;
        const fn=v=>v!=null?parseFloat(v).toFixed(1):'—';
        const fv=v=>showAppreciations?apprH(v):fn(v);
        const brRow=(n)=>`<tr><td style="${td}">${n}</td><td style="${tdC}">${pm1[n]?.moyenne!=null?fv(pm1[n].moyenne):'—'}</td><td style="${tdC}">${showS2&&pm2[n]?.moyenne!=null?fv(pm2[n].moyenne):'—'}</td></tr>`;
        const rem1=splitRem(cr1.remarques); const rem2=splitRem(cr2.remarques);
        const obsHtml=()=>{let h='';if(rem1.length){h+=`<div style="font-size:13px;font-weight:700;">1er semestre</div>`;h+=rem1.map(r=>`<div style="font-size:13px;">${r}</div>`).join('');}if(showS2&&rem2.length){if(rem1.length)h+=`<div style="height:10px;"></div>`;h+=`<div style="font-size:13px;font-weight:700;">2e semestre</div>`;h+=rem2.map(r=>`<div style="font-size:13px;">${r}</div>`).join('');}return h;};
        const sigHtml=[{label:'Titulaire',nom:titulaire},{label:'Responsable de niveau',nom:respNiveauNom},{label:'Responsable des cours',nom:respCoursNom}].map(({label,nom})=>`<div style="flex:1;text-align:center;"><div style="border-top:0.5px solid #94a3b8;padding-top:6px;"></div><div style="font-size:11px;font-weight:700;color:#334155;">${label}</div>${nom?`<div style="font-size:11px;color:#334155;">${nom}</div>`:''}</div>`).join('');
        return `<section class="bul-page">
          ${enteteHtml}
          <div class="bul-titre">Bulletin de notes</div>
          <div class="bul-date">Vétroz, le ${dateStr}</div>
          <div style="font-size:12pt;color:#1e293b;margin-bottom:6px;line-height:1.35;padding-left:10px"><span style="font-weight:700">Nom Prénom :</span><span style="margin-left:6px">${eleve.prenom} ${eleve.nom}</span></div>
          <div style="font-size:12pt;color:#1e293b;margin-bottom:16px;line-height:1.35;padding-left:10px"><span style="font-weight:700">Classe :</span><span style="margin-left:6px">${classeNom}</span></div>
          <div style="display:grid;grid-template-columns:50% 50%;gap:6px;">
            <div style="display:flex;flex-direction:column;gap:20px;">
              <table><thead><tr><th style="${th}">Branches principales</th><th style="${thC}">S1</th><th style="${thC}">S2</th></tr></thead><tbody>
                ${prin.length===0?`<tr><td colspan="3" style="${td};color:#aaa">—</td></tr>`:prin.map(brRow).join('')}
                <tr><td style="${td};font-weight:700">Moyenne</td><td style="${tdC};font-weight:700">${fv(mP1)}</td><td style="${tdC};font-weight:700">${showS2?fv(mP2):'—'}</td></tr>
              </tbody></table>
              <table><thead><tr><th style="${th}">Branches secondaires</th><th style="${thC}">S1</th><th style="${thC}">S2</th></tr></thead><tbody>
                ${sec.length===0?`<tr><td colspan="3" style="${td};color:#aaa">—</td></tr>`:sec.map(brRow).join('')}
                <tr><td style="${td};font-weight:700">Moyenne</td><td style="${tdC};font-weight:700">${fv(mS1)}</td><td style="${tdC};font-weight:700">${showS2?fv(mS2):'—'}</td></tr>
                <tr><td colspan="3" style="height:6px;padding:0;border:none;"></td></tr>
                <tr><td style="${td};font-weight:700">Moyenne semestrielle</td><td style="${tdC};font-weight:700">${fv(mG1)}</td><td style="${tdC};font-weight:700">${showS2?fv(mG2):'—'}</td></tr>
                <tr><td style="${td};font-weight:700">Moyenne annuelle</td><td style="${tdC};font-weight:900" colspan="2">${showS2&&mAnn!=null?fv(mAnn):'—'}</td></tr>
              </tbody></table>
            </div>
            <div style="display:flex;flex-direction:column;">
              <div style="flex:1;">
                <table><thead><tr><th style="${th}">Comportement</th><th style="${thC};width:40px;">S1</th><th style="${thC};width:40px;">S2</th></tr></thead><tbody>
                  ${BULLETIN_CRITERES_LABELS.map((label,idx)=>`<tr><td style="${td}">${label.join(' ')}</td><td style="${tdC}">${dotH(cr1['c'+(idx+1)])}</td><td style="${tdC}">${showS2?dotH(cr2['c'+(idx+1)]):'<span style="color:#aaa">—</span>'}</td></tr>`).join('')}
                </tbody></table>
              </div>
              <table><colgroup><col/><col style="width:40px"/><col style="width:40px"/></colgroup><tbody>
                <tr><td style="${td};border:none;">Absences excusées</td><td style="${tdC};text-align:center;">${stS1?.excuses??0}</td><td style="${tdC};text-align:center;">${stS2?.excuses??0}</td></tr>
                <tr><td style="${td};border:none;">Absences non excusées</td><td style="${tdC};text-align:center;">${stS1?.absents??0}</td><td style="${tdC};text-align:center;">${stS2?.absents??0}</td></tr>
              </tbody></table>
            </div>
          </div>
          ${showAppreciations?`<div style="font-size:10px;color:#94a3b8;margin-top:20px;padding-left:10px;">INS : Insuffisant &nbsp;·&nbsp; S : Suffisant &nbsp;·&nbsp; AB : Assez bien &nbsp;·&nbsp; B : Bien &nbsp;·&nbsp; TB : Très bien &nbsp;·&nbsp; EXC : Excellent</div>`:''}
          <div style="border:1px solid #e8e8e8;padding:6px 14px;margin-top:40px;min-height:70px;"><div style="font-size:13px;font-weight:700;margin-bottom:4px;">Observations</div>${obsHtml()}</div>
          <div style="margin-top:auto;padding-top:16px;">
            <div style="display:flex;gap:16px;margin-bottom:40px;">${sigHtml}</div>
            ${footerHtml}
          </div>
        </section>`;
      }).join('');
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Bulletin de notes</title><style>
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Century Gothic',CenturyGothic,'Apple Gothic',Futura,'Trebuchet MS',sans-serif;background:white;color:#1e293b;}
        @page{size:A4 portrait;margin:15mm 20mm;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
        .bul-page{page-break-after:always;position:relative;min-height:calc(297mm - 30mm);padding-bottom:50px;display:flex;flex-direction:column;}
        .bul-page:last-child{page-break-after:auto;}
        .entete-txt,.entete-txt *{font-size:6pt!important;}
        .scai{font-size:17pt!important;font-weight:800;line-height:1;color:#1e293b;}
        .bul-titre{text-align:center;font-weight:700;font-size:17pt;letter-spacing:1px;text-transform:uppercase;margin-top:20pt;margin-bottom:12pt;color:#0f172a;}
        .bul-date{text-align:right;font-size:10pt;margin-bottom:10pt;}
        table{width:100%;border-collapse:collapse;}
        th,td{border:none;}
        .bul-footer{font-size:6pt!important;position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:12px;}
        .bul-footer *{font-size:6pt!important;}
      </style></head><body>${pages}</body></html>`;
      const finalHtml = injectForcedPrintCss(fullHtml, 'A4 portrait', '15mm 20mm');
      openPrintPopup(finalHtml, { title: 'Bulletin de notes', width: 1000, height: 800 });
      return;
    }
    const rootHtml = document.getElementById('root')?.innerHTML || '';
    const html = `<html><head><title>Notes</title></head><body>${rootHtml}</body></html>`;
    const finalHtml = injectForcedPrintCss(html, 'A4 portrait', '10mm');
    openPrintPopup(finalHtml, { title: 'Notes', width: 1100, height: 820 });
  };
  const classeNom = classeObj?.nom || '';

  const ouvrirVueDepuisSelectionClasse = async (mode, classeIdParam = classeSelectionnee) => {
    if (!classeIdParam) return;
    const cl = classes.find(c => String(c.id) === String(classeIdParam));
    if (!cl) return;
    window.scrollTo(0, 0);
    if (mode === 'evaluations') {
      await ouvrirClasse(cl);
      return;
    }
    if (mode === 'generale') {
      setClasseObj(cl);
      setClasseSelectionnee(cl.id);
      setVueGeneraleMode('tous');
      setRapportMatiereId('');
      setRapportEleveId('');
      const semFocus = sem1Bloque && !isAdmin() ? '2' : '1';
      setGeneraleSemestre(semFocus);
      await chargerRapport(cl.id, semFocus);
      setVue('generale');
      return;
    }
    if (mode === 'comportements') {
      setClasseObj(cl);
      setClasseSelectionnee(cl.id);
      setBulletinOnglet('criteres');
      setVueClasseAction('comportements');
      await chargerBulletinId(cl.id);
      setVue('bulletin');
      return;
    }
    if (mode === 'bulletin') {
      setClasseObj(cl);
      setClasseSelectionnee(cl.id);
      setBulletinOnglet('notes');
      setBulletinMode('eleve');
      setEleveSelectionne('');
      setVueClasseAction('bulletin');
      await chargerBulletinId(cl.id);
      setVue('bulletin');
    }
  };

  const renderActionsBar = (className = '') => {
    const tabsDetail = [['evaluations', 'Évaluations'], ['generale', 'Vue générale']];
    const tabsBulletin = [['comportements', 'Comportements'], ['bulletin', 'Bulletin de notes']];
    const tabs = vueContexte === 'bulletin' ? tabsBulletin : tabsDetail;
    return (
      <div className={className}>
        <div style={s.tabsBar}>
          {tabs.map(([k, l]) => (
            <button key={k}
              style={{ ...s.tabBtn, ...(vueClasseAction === k ? s.tabBtnActif : {}) }}
              onClick={async () => {
                if (bulletinOnglet === 'criteres' && k !== 'comportements') {
                  if (criteresModifies && criteresValides) {
                    await sauvegarderTousCriteres();
                  } else if (criteresModifies) {
                    if (!window.confirm('Vous avez des modifications non sauvegardées dans les comportements. Quitter sans sauvegarder ?')) return;
                    setCriteresModifies(false);
                  }
                }
                setSearchParams({ tab: k });
                setVueClasseAction(k);
                if (k === 'comportements') setBulletinOnglet('criteres');
                else if (k === 'bulletin') { setBulletinOnglet('notes'); setBulletinMode('eleve'); setEleveSelectionne(''); }
                if (classeSelectionnee) {
                  ouvrirVueDepuisSelectionClasse(k);
                } else {
                  if (k === 'evaluations') setVue('classes');
                  else if (k === 'generale') setVue('generale');
                  else if (k === 'comportements') setVue('bulletin');
                  else if (k === 'bulletin') setVue('bulletin');
                }
              }}>
              {l}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ===================== CONSTANTES BULLETIN =====================
  const BULLETIN_CRITERES_LABELS = [
    ["Venir", "à l'école"],
    ["Être", "à l'heure"],
    ["Respecter", "les règles"],
    ["Participer", "en classe"],
    ["Écouter", "les consignes"],
    ["Parler", "français"],
    ["Travailler", "sans déranger"],
    ["Faire", "les devoirs"],
    ["Respecter", "le matériel"],
    ["Organiser", "le classeur"],
  ];
  const cycleCouleur = (v) => (v === '' || v === 'rouge' ? 'vert' : v === 'vert' ? 'orange' : 'rouge');

  // ===================== VUE SAISIE NOTES =====================
  if (vue === 'saisie' && evaluationOuverte) {
    return (
      <div style={s.page}>
        <style>{`input.note-input::-webkit-inner-spin-button, input.note-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; } input.note-input { -moz-appearance: textfield; }`}</style>
        <div style={s.header}>
          <button style={s.btnRetour} onClick={() => { setVue('evaluations'); chargerEvaluationsId(classeSelectionnee, matiereSelectionnee); }}>← Retour</button>
          <div style={{ flex: 1 }}>
            <h2 style={s.titre}>{evaluationOuverte.nom}</h2>
          </div>
          {toast.message && <div style={{ padding: '8px 14px', borderRadius: 8, background: '#ede9fe', color: '#4c1d95', fontWeight: 700, fontSize: 13 }}>{toast.message}</div>}
          <div style={{ ...s.moyenneBox, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={s.moyenneLabel}>Moy. classe</span>
            <span style={{ ...s.moyenneValeur, fontSize: 14 }}>{(() => { const m = getMoyenneClasse(); return m === '—' ? '—' : fmtNote(m); })()}</span>
          </div>
          {(() => { const bloque = sem1Bloque && String(evaluationOuverte?.semestre) === '1' && !isAdmin(); const ok = peutModifierNotes() && !bloque; return (
            <button style={{ ...s.btnSauver, opacity: ok ? 1 : 0.4, cursor: ok ? 'pointer' : 'not-allowed' }}
              disabled={!ok} onClick={handleSauvegarderNotes}>{bloque ? '🔒 1er sem. bloqué' : 'Enregistrer'}</button>
          ); })()}
        </div>
        {elevesNotes.length === 0 && <div style={{ background: '#fff3cd', color: '#856404', padding: '12px 20px', borderRadius: 8, marginBottom: 12 }}>Aucun élève actif trouvé dans cette classe.</div>}
        <div style={s.tableContainer}>
          <table style={s.tbl}>
            <thead>
              <tr style={s.theadRow}>
                <th style={{ ...s.th, borderTopLeftRadius: 12 }}>Nom</th>
                <th style={s.th}>Prénom</th>
                {evaluationOuverte.points_max && parseFloat(evaluationOuverte.points_max) > 0
                  ? <th style={{ ...s.th, textAlign: 'center' }}>Points</th>
                  : null}
                <th style={{ ...s.th, textAlign: 'center' }}>Note</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Absent</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Dispensé</th>
                <th style={{ ...s.th, borderTopRightRadius: 12 }}>Remarques</th>
              </tr>
            </thead>
            <tbody>
              {elevesNotes.map((eleve, i) => {
                const avecPoints = evaluationOuverte.points_max && parseFloat(evaluationOuverte.points_max) > 0;
                const note = avecPoints ? calculerNote(eleve.points, evaluationOuverte.points_max) : null;
                const noteDirecte = !avecPoints && eleve.note !== '' ? parseFloat(eleve.note) : null;
                return (
                  <tr key={eleve.id} style={{ ...s.tr, background: eleve.absent ? '#fff8f8' : eleve.dispense ? '#f8f8ff' : i % 2 === 0 ? 'white' : '#fafbfc' }}>
                    <td style={s.td}><b>{nomSansSuffixe(eleve.nom)}</b></td>
                    <td style={s.td}>{eleve.prenom}</td>
                    {avecPoints ? (
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        <input className="note-input" data-col="points" style={s.noteInput} type="number" min="0" max={evaluationOuverte.points_max} step="0.5"
                          value={eleve.points} disabled={eleve.absent || eleve.dispense}
                          onChange={ev => { const c = [...elevesNotes]; let v = ev.target.value; const max = parseFloat(evaluationOuverte.points_max); if (v !== '' && !isNaN(max) && parseFloat(v) > max) v = String(max); if (v !== '' && parseFloat(v) < 0) v = '0'; c[i].points = v; setElevesNotes(c); }}
                          onFocus={ev => ev.target.select()}
                          onKeyDown={ev => { if (ev.key === 'Tab') { ev.preventDefault(); const inputs = [...document.querySelectorAll('input[data-col="points"]')]; const idx = inputs.indexOf(ev.target); const next = inputs[ev.shiftKey ? idx - 1 : idx + 1]; if (next) next.focus(); } }} />
                      </td>
                    ) : null}
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {avecPoints ? (
                        <span style={{ fontWeight: 700, fontSize: 16, color: eleve.absent || eleve.dispense ? '#888' : note !== null ? (note >= 4 ? '#2e7d32' : '#ef4444') : '#888' }}>
                          {eleve.absent ? 'ABS' : eleve.dispense ? 'DISP' : fmtNote(note)}
                        </span>
                      ) : eleve.absent || eleve.dispense ? (
                        <span style={{ fontWeight: 700, fontSize: 16, color: '#888' }}>{eleve.absent ? 'ABS' : 'DISP'}</span>
                      ) : (
                        <input className="note-input" data-col="note" style={{ ...s.noteInput, color: noteDirecte !== null ? (noteDirecte >= 4 ? '#2e7d32' : '#ef4444') : '#333' }}
                          type="number" min="1" max="6" step="0.1"
                          value={eleve.note} placeholder="—"
                          onChange={ev => { const c = [...elevesNotes]; let v = ev.target.value; if (v !== '' && parseFloat(v) > 6) v = '6'; if (v !== '' && parseFloat(v) < 1) v = '1'; c[i].note = v; setElevesNotes(c); }}
                          onFocus={ev => ev.target.select()}
                          onKeyDown={ev => { if (ev.key === 'Tab') { ev.preventDefault(); const inputs = [...document.querySelectorAll('input[data-col="note"]')]; const idx = inputs.indexOf(ev.target); const next = inputs[ev.shiftKey ? idx - 1 : idx + 1]; if (next) next.focus(); } }} />
                      )}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <input type="checkbox" checked={eleve.absent} style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
                        onChange={ev => { const c = [...elevesNotes]; c[i].absent = ev.target.checked; if (ev.target.checked) { c[i].points = ''; c[i].note = ''; c[i].dispense = false; } setElevesNotes(c); }} />
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <input type="checkbox" checked={eleve.dispense} style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
                        onChange={ev => { const c = [...elevesNotes]; c[i].dispense = ev.target.checked; if (ev.target.checked) { c[i].points = ''; c[i].note = ''; c[i].absent = false; } setElevesNotes(c); }} />
                    </td>
                    <td style={s.td}>
                      <input style={s.commentInput} type="text" placeholder="Remarque..." value={eleve.commentaire}
                        onChange={ev => { const c = [...elevesNotes]; c[i].commentaire = ev.target.value; setElevesNotes(c); }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ===================== VUE GENERALE =====================
  if (vue === 'generale') {
    const modeMatieres = rapport ? sortMatieres(rapport.matieres) : [];
    const matiereRapport = modeMatieres.find(m => m.matiere_id === parseInt(rapportMatiereId));
    const eleveRapport = rapport?.eleves.find(e => e.id === parseInt(rapportEleveId));
    const fontVG = 'Century Gothic, CenturyGothic, AppleGothic, sans-serif';
    const imprimerVueGenerale = (htmlId) => {
      const node = document.getElementById(htmlId);
      if (!node) return;
      let htmlDocument = '';
      const origin = (typeof window !== 'undefined' && window.location?.origin) ? `${window.location.origin}/` : '';
      let htmlOut = node.outerHTML;
      if (origin) {
        htmlOut = htmlOut.replace(/src="\/([^"]+)"/g, `src="${origin}$1"`);
        htmlOut = htmlOut.replace(/src='\/([^']+)'/g, `src='${origin}$1'`);
      }
      const isPortrait = htmlId === 'vg-eleve-bull';
      const pageSize = isPortrait ? 'A4 portrait' : 'A4 landscape';
      const pageHeight = isPortrait ? '297mm' : '210mm';
      const baseTag = origin ? `<base href="${origin}">` : '';
      htmlDocument = `<html><head>${baseTag}<title>Notes de l'élève</title><style>@import url('https://fonts.googleapis.com/css2?family=Century+Gothic&display=swap');@page{size:${pageSize};margin:10mm;}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}html,body{height:100%;width:100%;margin:0;}body{font-family:'Century Gothic',CenturyGothic,AppleGothic,sans-serif;color:#111;font-size:12px;display:flex;flex-direction:column;min-height:100vh;align-items:stretch;}.vg-bull-sheet{flex:1;display:flex;flex-direction:column;justify-content:flex-start;min-height:calc(${pageHeight} - 20mm)!important;height:calc(${pageHeight} - 20mm)!important;max-width:none!important;width:100%!important;margin:0!important;padding:0!important;border:none!important;box-shadow:none!important;border-radius:0!important;background:transparent!important;}table{border-collapse:collapse;width:100%!important;table-layout:fixed!important;}#vg-eleve-bull th,#vg-eleve-bull td{border:none!important;padding:3px 8px!important;font-size:11px;line-height:1.2!important;}#vg-tous-print th,#vg-tous-print td,#vg-branche-bull th,#vg-branche-bull td{padding:6px 8px!important;font-size:11px;line-height:1.2!important;}#vg-tous-print th,#vg-branche-bull th{background:#6366f1!important;color:#fff!important;border-top:1px solid #4338ca!important;border-bottom:1px solid #4338ca!important;border-left:1px solid #4338ca!important;border-right:1px solid #818cf8!important;}#vg-tous-print td,#vg-branche-bull td{border:1px solid #e2e8f0!important;background:#fff!important;}#vg-eleve-bull tr.vg-eval-row td{padding-top:2px!important;padding-bottom:2px!important;line-height:1.15!important;}.vg-bull-pied{margin-top:auto!important;padding-top:16px!important;}.vg-branch-gap td{padding:0!important;height:8px!important;border:none!important;}#vg-eleve-bull,#vg-branche-bull,#vg-tous-print{width:100%!important;max-width:100%!important;align-self:stretch!important;}#vg-eleve-bull table,#vg-branche-bull table,#vg-tous-print table{width:100%!important;min-width:100%!important;}#vg-eleve-bull col.vg-date-col{width:90px!important;}#vg-eleve-bull col.vg-nom-col{width:calc(100% - 395px)!important;}#vg-eleve-bull col.vg-prof-col{width:160px!important;}#vg-eleve-bull col.vg-coef-col{width:85px!important;}#vg-eleve-bull col.vg-note-col{width:60px!important;}#vg-eleve-bull .vg-prof-col,#vg-eleve-bull .vg-coef-col,#vg-eleve-bull .vg-note-col{text-align:right!important;}#vg-eleve-bull .vg-branch-title-cell{padding-left:0!important;border-bottom:1px solid #000!important;}#vg-eleve-bull .vg-date-col{padding-left:0!important;}#vg-eleve-bull .vg-nom-col{min-width:0!important;}#vg-branche-bull th.vg-moy-col,#vg-tous-print th.vg-moy-col{white-space:normal!important;min-width:88px!important;}img{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}.no-print{display:none!important;}</style></head><body>${htmlOut}</body></html>`;
      const finalHtml = injectForcedPrintCss(htmlDocument, pageSize, '10mm');
      openPrintPopup(finalHtml, { title: "Notes de l'élève", width: 1100, height: 820 });
    };
    const canPrintVueGenerale =
      !!rapport &&
      !rapportChargement &&
      !rapportErreur &&
      (vueGeneraleMode === 'tous' ||
        (vueGeneraleMode === 'branche' && !!rapportMatiereId && !!matiereRapport) ||
        (vueGeneraleMode === 'eleve' && !!rapportEleveId && !!eleveRapport));
    const handlePrintVueGenerale = () => {
      if (vueGeneraleMode === 'tous' && rapport) imprimerVueGenerale('vg-tous-print');
      else if (vueGeneraleMode === 'branche' && matiereRapport) imprimerVueGenerale('vg-branche-bull');
      else if (vueGeneraleMode === 'eleve' && eleveRapport) imprimerVueGenerale('vg-eleve-bull');
    };
    const enteteBulletinVueGenerale = () => {
      const _now = new Date();
      const _as = _now.getMonth() >= 7 ? `${_now.getFullYear()}-${_now.getFullYear() + 1}` : `${_now.getFullYear() - 1}-${_now.getFullYear()}`;
      return (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <img src="/logo-etat-du-valais.png" alt="" style={{ width: 38, height: 'auto', objectFit: 'contain', backgroundColor: 'white', padding: 2 }} />
            <div style={{ fontSize: 10, lineHeight: 1.5, color: '#334155', fontFamily: fontVG }}>
              <div>Département de la santé, des affaires sociales et de la culture</div>
              <div>Service de l'action sociale</div>
              <div>Office de l'asile</div>
              <div>Centre de formation "Le Botza"</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontFamily: fontVG }}>
            <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: '#1e293b' }}>SCAI</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{_as}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>CLASSES D'ACCUEIL</div>
          </div>
        </div>
      );
    };
    const piedBulletinVueGenerale = () => (
      <div className="vg-bull-pied" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, fontSize: 11, color: '#64748b', fontFamily: fontVG }}>
        <img src="/logo-pied-page.png" alt="" style={{ height: 19, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
        <span>Zone Industrielle 4, 1963 Vétroz<br />Tél. 027 606 18 60</span>
      </div>
    );

    return (
      <div style={s.page}>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            @page { size: ${vueGeneraleMode === 'tous' || vueGeneraleMode === 'branche' ? 'A4 landscape' : 'A4 portrait'}; margin: 10mm; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { margin: 0; font-size: 9px; }
            th, td { font-size: 9px !important; padding: 3px 5px !important; }
            h3 { font-size: 11px !important; margin: 0 0 6px 0 !important; }
            div[class] { box-shadow: none !important; }
            #vg-eleve-bull, #vg-branche-bull, #vg-tous-print { width: 100% !important; max-width: 100% !important; }
            #vg-eleve-bull table, #vg-branche-bull table, #vg-tous-print table { width: 100% !important; table-layout: fixed !important; }
            #vg-branche-bull th, #vg-branche-bull td { border: 1px solid #e2e8f0 !important; }
            #vg-branche-bull thead th { background: #6366f1 !important; color: #fff !important; border-color: #4338ca !important; }
            #vg-eleve-bull tr.vg-eval-row td { padding-top: 4px !important; padding-bottom: 4px !important; line-height: 1.2 !important; }
            #vg-branche-bull th.vg-moy-col, #vg-tous-print th.vg-moy-col { white-space: normal !important; min-width: 96px !important; }
          }
        `}</style>
        <div style={s.header} className="no-print">
          <button style={s.btnRetour} onClick={() => { setSearchParams({}); setVue('classes'); }}>← Retour</button>
          <h2 style={s.titre}>Notes de l'élève — {classeNom}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isAdmin() && <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, whiteSpace: 'nowrap' }}>Mode admin — accès complet</span>}
            <button type="button" style={{ ...s.btnImprimer, ...(!canPrintVueGenerale ? { opacity: 0.45, cursor: 'not-allowed' } : {}) }} disabled={!canPrintVueGenerale} onClick={handlePrintVueGenerale}>Imprimer</button>
          </div>
        </div>
        {/* Sous-onglets Vue générale */}
        <div className="no-print" style={{ background: '#f8fafc', paddingBottom: 12, marginBottom: 0, boxShadow: 'none' }}>
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'inline-flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 }}>
            {[{ id: '1', label: '1er semestre' }, { id: '2', label: '2e semestre' }].map(sem => (
              <button key={sem.id} onClick={() => { setGeneraleSemestre(sem.id); chargerRapport(classeSelectionnee, sem.id); }}
                style={{ padding: '7px 16px', borderRadius: 17, border: 'none', background: generaleSemestre === sem.id ? '#6366f1' : 'transparent', color: generaleSemestre === sem.id ? 'white' : '#6d28d9', cursor: 'pointer', fontWeight: generaleSemestre === sem.id ? 700 : 600, fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                {sem.label}
              </button>
            ))}
          </div>
          {!showVueGeneraleModes ? (
            <button
              type="button"
              onClick={() => setShowVueGeneraleModes(true)}
              style={s.btnGhostPill}
            >
              Trier
            </button>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'inline-flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 }}>
                <button
                  type="button"
                  onClick={() => { setVueGeneraleMode('tous'); setShowVueGeneraleModes(false); }}
                  style={{ padding: '7px 16px', borderRadius: 17, border: 'none', background: vueGeneraleMode === 'tous' ? '#6366f1' : 'transparent', color: vueGeneraleMode === 'tous' ? 'white' : '#6d28d9', cursor: 'pointer', fontWeight: vueGeneraleMode === 'tous' ? 700 : 600, fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  Trier
                </button>
                {[['eleve','Par élève'],['branche','Par branche']].map(([val,label]) => (
                  <button key={val} onClick={() => setVueGeneraleMode(val)}
                    style={{ padding: '7px 16px', borderRadius: 17, border: 'none', background: vueGeneraleMode === val ? '#6366f1' : 'transparent', color: vueGeneraleMode === val ? 'white' : '#6d28d9', cursor: 'pointer', fontWeight: vueGeneraleMode === val ? 700 : 600, fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    {label}
                  </button>
                ))}
              </div>
              {vueGeneraleMode === 'branche' && (
                <CustomSelect
                  className="no-print"
                  style={{ minWidth: 240 }}
                  placeholder="Choisir une branche"
                  value={rapportMatiereId}
                  onChange={(v) => setRapportMatiereId(v)}
                  options={modeMatieres.map(m => ({ value: m.matiere_id, label: m.matiere_nom }))}
                />
              )}
              {vueGeneraleMode === 'eleve' && (
                <CustomSelect
                  className="no-print"
                  style={{ minWidth: 240 }}
                  placeholder="Choisir un élève"
                  value={rapportEleveId}
                  onChange={(v) => setRapportEleveId(v)}
                  options={(rapport?.eleves || []).map(e => ({ value: e.id, label: `${nomSansSuffixe(e.nom)} ${e.prenom}` }))}
                />
              )}
            </div>
          )}
        </div>
        </div>

        {/* Chargement / erreur */}
        {rapportChargement && <div style={{ ...s.vide, color: '#6366f1' }}>Chargement des données…</div>}
        {rapportErreur && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 20px', borderRadius: 8, marginBottom: 12, fontWeight: 600 }}>Erreur : {rapportErreur}</div>}

        {/* ---- VUE TOUS ---- */}
        {vueGeneraleMode === 'tous' && rapport && (() => {
          const niveauCl = String(classeObj?.niveau || '').toUpperCase();
          const branchesClasse = branches.filter(b => String(b.niveau || '').toUpperCase() === niveauCl && b.suivi_notes !== false);
          const brPrin = branchesClasse.filter(b => b.type_branche === 'principale');
          const brSec  = branchesClasse.filter(b => b.type_branche !== 'principale');
          const getMoy = (brId, eleveId) => {
            const mat = rapport.matieres.find(m => m.matiere_id === brId);
            return mat ? moyenneEleveMatiere(mat, eleveId) : null;
          };
          const moyGen  = (eleveId) => { const vals = branchesClasse.map(b => getMoy(b.id, eleveId)).filter(v => v !== null); return vals.length ? Math.round(vals.reduce((a,v)=>a+v,0)/vals.length*10)/10 : null; };
          const colNom = (b) => (b.designation_courte || b.nom || '').trim();
          const thTCF = {
            ...s.th,
            position: 'static',
            top: 'auto',
            zIndex: 'auto',
            background: '#6366f1',
            color: 'white',
            textAlign: 'center',
            borderTop: '1px solid #4338ca',
            borderBottom: '1px solid #4338ca',
            borderLeft: '1px solid #4338ca',
            borderRight: '1px solid #818cf8',
          };
          const tdTCF = { ...s.td, border: '1px solid #e2e8f0', background: 'white' };
          const tdMoyCol = { ...tdTCF, textAlign: 'center' };
          const tdBas = { ...tdTCF, textAlign: 'center', fontWeight: 700, background: '#f8fafc', color: '#1e293b' };
          return (
          <div ref={printRef} id="vg-tous-print" className="vg-bull-sheet" style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid #f1f5f9', fontFamily: fontVG, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', width: '100%', boxSizing: 'border-box' }}>
            {enteteBulletinVueGenerale()}
            <div style={{ marginTop: 40, marginBottom: 16 }}>
              <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 20, letterSpacing: 2, fontFamily: fontVG, textTransform: 'uppercase', marginBottom: 15 }}>Moyennes de la classe</div>
              <div style={{ textAlign: 'right', fontSize: 13, color: '#475569', fontFamily: fontVG, marginBottom: 12 }}>Vétroz, le {todayFormatted}</div>
              <div style={{ fontFamily: fontVG }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{classeNom}</div>
                <div style={{ fontSize: 12, color: '#475569' }}>{generaleSemestre === '1' ? '1er semestre' : '2e semestre'}</div>
              </div>
            </div>
            <div style={{ overflowX: 'auto', marginTop: 0, borderRadius: 12 }}>
            <table style={{ ...s.tbl, fontSize: 12, tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: 144, maxWidth: 144 }} />
                <col />
                {brPrin.map(b => <col key={`col-prin-${b.id}`} style={{ width: 78 }} />)}
                {brSec.map(b => <col key={`col-sec-${b.id}`} style={{ width: 78 }} />)}
                <col style={{ width: 112 }} />
              </colgroup>
              <thead>
                <tr style={s.theadRow}>
                  <th style={{ ...thTCF, whiteSpace: 'nowrap', textAlign: 'left', width: 144, maxWidth: 144, boxSizing: 'border-box' }}>Nom</th>
                  <th style={{ ...thTCF, whiteSpace: 'nowrap', textAlign: 'left' }}>Prénom</th>
                  {brPrin.map(b => <th key={b.id} style={thTCF}>{colNom(b)}</th>)}
                  {brSec.map(b => <th key={b.id} style={thTCF}>{colNom(b)}</th>)}
                  <th className="vg-moy-col" style={{ ...thTCF, whiteSpace: 'normal', minWidth: 112, maxWidth: 140 }}>Moyenne</th>
                </tr>
              </thead>
              <tbody>
                {rapport.eleves.map((eleve, i) => {
                  const mg = moyGen(eleve.id);
                  return (
                    <tr key={eleve.id} style={{ ...s.tr, background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                      <td style={{ ...tdTCF, fontWeight: 700, whiteSpace: 'nowrap' }}>{nomSansSuffixe(eleve.nom)}</td>
                      <td style={{ ...tdTCF, whiteSpace: 'nowrap' }}>{eleve.prenom}</td>
                      {brPrin.map(b => { const moy = getMoy(b.id, eleve.id); return <td key={b.id} style={{ ...tdTCF, textAlign: 'center', color: moy !== null ? (moy >= 4 ? '#111827' : '#ef4444') : '#94a3b8' }}>{moy !== null ? fmtNote(moy) : '—'}</td>; })}
                      {brSec.map(b => { const moy = getMoy(b.id, eleve.id); return <td key={b.id} style={{ ...tdTCF, textAlign: 'center', color: moy !== null ? (moy >= 4 ? '#111827' : '#ef4444') : '#94a3b8' }}>{moy !== null ? fmtNote(moy) : '—'}</td>; })}
                      <td className="vg-moy-col" style={{ ...tdMoyCol, fontSize: 14, color: mg !== null ? (mg >= 4 ? '#111827' : '#ef4444') : '#94a3b8' }}>{mg !== null ? fmtNote(mg) : '—'}</td>
                    </tr>
                  );
                })}
                <tr style={{ ...s.tr, fontWeight: 700 }}>
                  <td style={{ ...tdBas, textAlign: 'left' }} colSpan={2}>Moyennes de la classe</td>
                  {brPrin.map(b => { const vals = rapport.eleves.map(e => getMoy(b.id, e.id)).filter(v => v !== null); const moy = vals.length ? Math.round(vals.reduce((a,v)=>a+v,0)/vals.length*10)/10 : null; return <td key={b.id} style={tdBas}>{moy !== null ? fmtNote(moy) : '—'}</td>; })}
                  {brSec.map(b => { const vals = rapport.eleves.map(e => getMoy(b.id, e.id)).filter(v => v !== null); const moy = vals.length ? Math.round(vals.reduce((a,v)=>a+v,0)/vals.length*10)/10 : null; return <td key={b.id} style={tdBas}>{moy !== null ? fmtNote(moy) : '—'}</td>; })}
                  <td style={tdBas}>
                    {(() => {
                      const vals = rapport.eleves.map(e => moyGen(e.id)).filter(v => v !== null);
                      const moy = vals.length ? Math.round(vals.reduce((a, v) => a + v, 0) / vals.length * 10) / 10 : null;
                      return moy !== null ? fmtNote(moy) : '—';
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
            {piedBulletinVueGenerale()}
          </div>
          );
        })()}

        {bulletinPopupEleve && (() => {
          const critValide = bulletinCriteres.find(c => Number(c.eleve_id) === Number(bulletinPopupEleve))?.valide;
          const bdS1 = bulletinsSem1.find(b => b.eleve.id === bulletinPopupEleve);
          const bdS2 = bulletinsSem2.find(b => b.eleve.id === bulletinPopupEleve);
          const eleveInfo = bdS1?.eleve || bdS2?.eleve;
          const cr1 = criteresSem1.find(c => Number(c.eleve_id) === Number(bulletinPopupEleve)) || {};
          const cr2 = criteresSem2.find(c => Number(c.eleve_id) === Number(bulletinPopupEleve)) || {};
          const st = bulletinStatsPresences.find(s => Number(s.eleve_id) === Number(bulletinPopupEleve));
          const stS1 = bulletinStatsS1.find(s => Number(s.eleve_id) === Number(bulletinPopupEleve));
          const stS2 = bulletinStatsS2.find(s => Number(s.eleve_id) === Number(bulletinPopupEleve));
          const pm1 = bdS1?.parMatiere || {};
          const pm2 = bdS2?.parMatiere || {};
          const allNames = [...new Set([...Object.keys(pm1), ...Object.keys(pm2)])].sort();
          const principales = allNames.filter(n => Number((pm1[n] || pm2[n] || {}).coefficient || 1) >= 2);
          const secondaires = allNames.filter(n => Number((pm1[n] || pm2[n] || {}).coefficient || 1) < 2);
          const moyBr = (names, pm) => { const w = names.filter(n => pm[n]?.moyenne != null); return w.length ? w.reduce((a, n) => a + parseFloat(pm[n].moyenne || 0), 0) / w.length : null; };
          const moyP1 = moyBr(principales, pm1); const moyP2 = moyBr(principales, pm2);
          const moyS1 = moyBr(secondaires, pm1); const moyS2 = moyBr(secondaires, pm2);
          const allN = [...principales, ...secondaires];
          const moyG1 = moyBr(allN, pm1); const moyG2 = moyBr(allN, pm2);
          const moyAnn = moyG1 != null && moyG2 != null ? (moyG1 + moyG2) / 2 : null;
          const showS2popup = bulletinSemestre === '2';
          const splitRem = (t) => { if (!t || !t.trim()) return []; const s = t.trim().split('\n').filter(Boolean); if (s.length > 1) return s; return t.trim().split(/\.\s+(?=[A-ZÀ-Ü])/).map((r, i, a) => i < a.length - 1 ? r + '.' : r).filter(Boolean); };
          const rem1 = splitRem(cr1.remarques);
          const rem2 = splitRem(cr2.remarques);
          const dot = (v) => v ? <span style={{ width: 11, height: 11, borderRadius: '50%', display: 'inline-block', background: v === 'vert' ? '#22c55e' : v === 'orange' ? '#f97316' : '#ef4444' }} /> : <span style={{ color: '#aaa' }}>—</span>;
          const tblBorder = {};
          const thBranch = { border: 'none', background: 'white', color: '#000', fontWeight: 800, textAlign: 'left', fontSize: 13, padding: '5px 10px', textTransform: 'none', letterSpacing: 'normal', fontFamily: 'Century Gothic, CenturyGothic, AppleGothic, sans-serif', boxShadow: 'none', position: 'static' };
          const thBranchC = { ...thBranch, textAlign: 'center', width: 44, whiteSpace: 'nowrap' };
          const tdP = { ...s.td, padding: '2px 10px', fontFamily: 'Century Gothic, CenturyGothic, AppleGothic, sans-serif' };
          const tdC = { ...s.td, border: 'none', textAlign: 'center', padding: '2px 6px', fontFamily: 'Century Gothic, CenturyGothic, AppleGothic, sans-serif' };
          const tdL = { ...s.td, border: 'none', padding: '2px 14px', fontFamily: 'Century Gothic, CenturyGothic, AppleGothic, sans-serif' };
          const font = 'Century Gothic, CenturyGothic, AppleGothic, sans-serif';
          const articleSexe = (sexe) => String(sexe || '').toUpperCase() === 'F' ? 'de la' : 'du';
          const niveauCl = String(classeObj?.niveau || '').toUpperCase();
          const cleNiv = niveauCl.includes('CSC') ? 'CSC' : niveauCl.includes('CFR') ? 'CFR' : niveauCl.includes('EPL') ? 'EPL' : '';
          const respNiveauNom = cleNiv === 'CSC' ? (ecoleParams.responsable_niveau_csc || '') : cleNiv === 'CFR' ? (ecoleParams.responsable_niveau_cfr || '') : cleNiv === 'EPL' ? (ecoleParams.responsable_niveau_epl || '') : '';
          const respNiveauSexe = cleNiv === 'CSC' ? ecoleParams.sexe_responsable_niveau_csc : cleNiv === 'CFR' ? ecoleParams.sexe_responsable_niveau_cfr : cleNiv === 'EPL' ? ecoleParams.sexe_responsable_niveau_epl : null;
          const respCoursNom = ecoleParams.responsable_langues_jeunes || '';
          const respCoursSexe = ecoleParams.sexe_responsable_langues_jeunes;
          return (
            <div className="modal-overlay" style={s.overlay} onClick={() => setBulletinPopupEleve(null)}>
              <div style={{ ...s.modal, maxWidth: 900, width: '95vw', maxHeight: '90vh', overflowY: 'auto', fontFamily: font }} onClick={e => e.stopPropagation()}>
                <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setBulletinPopupEleve(null); }} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Fermer</button>
                    <button onClick={() => {
                      const node = document.getElementById('bulletin-popup-pdf');
                      if (!node) return;
                      const html = `<html><head><title>Bulletin de notes</title><style>@import url('https://fonts.googleapis.com/css2?family=Century+Gothic&display=swap');@page{size:A4;margin:10mm;}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}html,body{height:100%;margin:0;}body{font-family:'Century Gothic',CenturyGothic,AppleGothic,sans-serif;color:#111;display:flex;flex-direction:column;min-height:100vh;}table{width:100%;border-collapse:collapse;}th,td{border:none;padding:5px 14px;font-size:13px;}tr{border-bottom:none;}#bulletin-popup-pdf{min-height:calc(297mm - 20mm);display:flex;flex-direction:column;padding:0;flex:1;}.bulletin-bas-page{margin-top:auto;padding-top:12px;}.no-print{display:none!important;}</style></head><body>${node.outerHTML}</body></html>`;
                      const finalHtml = injectForcedPrintCss(html, 'A4 portrait', '10mm');
                      openPrintPopup(finalHtml, { title: 'Bulletin de notes', width: 1000, height: 800 });
                    }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #6366f1', background: '#6366f1', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Imprimer</button>
                  </div>
                </div>
                {!critValide ? (
                  <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '16px 20px', color: '#92400e', fontSize: 14, fontWeight: 600 }}>
                    ⚠ Les critères de comportement de cet élève n'ont pas encore été validés. Le bulletin ne peut pas être affiché.
                  </div>
                ) : !eleveInfo ? (
                  <div style={{ color: '#aaa', fontSize: 13 }}>Aucune donnée disponible. Veuillez d'abord charger les bulletins.</div>
                ) : (
                  <div id="bulletin-popup-pdf">
                    {/* En-tête */}
                    {(() => { const _now = new Date(); const _as = _now.getMonth() >= 7 ? `${_now.getFullYear()}-${_now.getFullYear()+1}` : `${_now.getFullYear()-1}-${_now.getFullYear()}`; return (<>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <img src="/logo-etat-du-valais.png" alt="" style={{ width: 38, height: 'auto', objectFit: 'contain', backgroundColor: 'white', padding: 2 }} />
                        <div style={{ fontSize: 10, lineHeight: 1.5, color: '#334155', fontFamily: font }}>
                          <div>Département de la santé, des affaires sociales et de la culture</div>
                          <div>Service de l'action sociale</div>
                          <div>Office de l'asile</div>
                          <div>Centre de formation "Le Botza"</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontFamily: font }}>
                        <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: '#1e293b' }}>SCAI</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{_as}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>CLASSES D'ACCUEIL</div>
                      </div>
                    </div>
                    </>); })()}
                    {/* Titre + Élève */}
                    <div className="bulletin-titre-eleve" style={{ marginTop: 50, marginBottom: 16 }}>
                      <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 20, letterSpacing: 2, fontFamily: font, textTransform: 'uppercase', marginBottom: 15 }}>Bulletin de notes</div>
                      <div style={{ textAlign: 'right', fontSize: 13, color: '#475569', fontFamily: font, marginBottom: 12 }}>Vétroz, le {new Date().toLocaleDateString('fr-CH')}</div>
                      <div style={{ fontFamily: font, paddingLeft: 14, paddingRight: 14 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{eleveInfo.prenom} {eleveInfo.nom}</div>
                        <div style={{ fontSize: 12, color: '#475569' }}>{classeNom}</div>
                      </div>
                    </div>
                    {/* Tableaux */}
                    <div style={{ display: 'grid', gridTemplateColumns: '50% 50%', gap: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <table style={{ ...s.tbl, ...tblBorder, width: '100%', tableLayout: 'fixed', border: 'none' }}>
                          <thead><tr style={{ background: 'white' }}><th style={thBranch}>Branches principales</th><th style={thBranchC}>S1</th><th style={thBranchC}>S2</th></tr></thead>
                          <tbody>
                            {principales.length === 0 && <tr><td colSpan={3} style={{ ...tdL, color: '#aaa' }}>—</td></tr>}
                            {principales.map(nom => (<tr key={nom} style={s.tr}><td style={tdL}>{nom}</td><td style={tdC}>{pm1[nom]?.moyenne != null ? fmtNote(pm1[nom].moyenne) : '—'}</td><td style={tdC}>{showS2popup && pm2[nom]?.moyenne != null ? fmtNote(pm2[nom].moyenne) : '—'}</td></tr>))}
                            <tr style={{ ...s.tr, fontWeight: 700 }}><td style={tdL}>Moyenne</td><td style={tdC}>{moyP1 != null ? fmtNote(moyP1) : '—'}</td><td style={tdC}>{showS2popup && moyP2 != null ? fmtNote(moyP2) : '—'}</td></tr>
                          </tbody>
                        </table>
                        <table style={{ ...s.tbl, ...tblBorder, width: '100%', tableLayout: 'fixed', border: 'none' }}>
                          <thead><tr style={{ background: 'white' }}><th style={thBranch}>Branches secondaires</th><th style={thBranchC}>S1</th><th style={thBranchC}>S2</th></tr></thead>
                          <tbody>
                            {secondaires.length === 0 && <tr><td colSpan={3} style={{ ...tdL, color: '#aaa' }}>—</td></tr>}
                            {secondaires.map(nom => (<tr key={nom} style={s.tr}><td style={tdL}>{nom}</td><td style={tdC}>{pm1[nom]?.moyenne != null ? fmtNote(pm1[nom].moyenne) : '—'}</td><td style={tdC}>{showS2popup && pm2[nom]?.moyenne != null ? fmtNote(pm2[nom].moyenne) : '—'}</td></tr>))}
                            <tr style={{ ...s.tr, fontWeight: 700 }}><td style={tdL}>Moyenne</td><td style={tdC}>{moyS1 != null ? fmtNote(moyS1) : '—'}</td><td style={tdC}>{showS2popup && moyS2 != null ? fmtNote(moyS2) : '—'}</td></tr>
                            <tr><td colSpan={3} style={{ height: 10, padding: 0, border: 'none', background: 'white' }}></td></tr>
                            <tr style={{ ...s.tr, fontWeight: 700 }}><td style={tdL}>Moyenne semestrielle</td><td style={tdC}>{moyG1 != null ? fmtNote(moyG1) : '—'}</td><td style={tdC}>{showS2popup && moyG2 != null ? fmtNote(moyG2) : '—'}</td></tr>
                            <tr style={{ ...s.tr, fontWeight: 700, color: '#000000' }}><td style={tdL}>Moyenne annuelle</td><td style={{ ...tdC, fontWeight: 900, color: '#000000' }} colSpan={2}>{showS2popup && moyAnn != null ? fmtNote(moyAnn) : '—'}</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <table style={{ ...s.tbl, ...tblBorder, width: '100%', tableLayout: 'fixed', flex: 1, height: '100%', border: 'none' }}>
                          <thead><tr style={{ background: 'white' }}><th style={thBranch}>Comportement</th><th style={{ ...thBranchC, width: 40 }}>S1</th><th style={{ ...thBranchC, width: 40 }}>S2</th></tr></thead>
                          <tbody style={{ height: '100%' }}>
                            {BULLETIN_CRITERES_LABELS.map((label, idx) => (<tr key={idx} style={{ ...s.tr, height: '1px' }}><td style={tdL}>{label.join(' ')}</td><td style={tdC}>{dot(cr1['c' + (idx + 1)])}</td><td style={tdC}>{showS2popup ? dot(cr2['c' + (idx + 1)]) : <span style={{ color: '#aaa' }}>—</span>}</td></tr>))}
                          </tbody>
                        </table>
                        <table style={{ ...s.tbl, ...tblBorder, width: '100%', tableLayout: 'fixed' }}>
                          <colgroup><col /><col style={{ width: 40 }} /><col style={{ width: 40 }} /></colgroup>
                          <tbody>
                            <tr style={s.tr}><td style={tdL}>Absences excusées</td><td style={tdC}>{stS1?.excuses ?? 0}</td><td style={tdC}>{stS2?.excuses ?? 0}</td></tr>
                            <tr style={s.tr}><td style={tdL}>Absences non excusées</td><td style={tdC}>{stS1?.absents ?? 0}</td><td style={tdC}>{stS2?.absents ?? 0}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Observations sous les deux tableaux */}
                    <div style={{ ...s.card, padding: '6px 14px', marginTop: 50, marginBottom: 100, fontFamily: font, minHeight: 100, height: 'auto' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Observations</div>
                      {rem1.length > 0 && <>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>1er semestre</div>
                        {rem1.map((r, i) => <div key={i} style={{ fontSize: 13 }}>{r}</div>)}
                      </>}
                      {showS2popup && rem2.length > 0 && <>
                        {rem1.length > 0 && <div style={{ height: 10 }} />}
                        <div style={{ fontSize: 13, fontWeight: 700 }}>2e semestre</div>
                        {rem2.map((r, i) => <div key={i} style={{ fontSize: 13 }}>{r}</div>)}
                      </>}
                    </div>
                    {/* Signatures + Pied de page — poussés en bas à l'impression */}
                    <div className="bulletin-bas-page">
                      {/* Signatures */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontFamily: font, marginBottom: 75, paddingLeft: 14, paddingRight: 14 }}>
                        {[
                          { label: 'Titulaire', nom: [classeObj?.prof_prenom, classeObj?.prof_nom].filter(Boolean).join(' ') },
                          { label: 'Responsable de niveau', nom: respNiveauNom },
                          { label: 'Responsable des cours', nom: respCoursNom },
                        ].map(({ label, nom }, i) => (
                          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ borderTop: '0.5px solid #000', marginBottom: 6 }}></div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>{label}</div>
                            {nom && <div style={{ fontSize: 11, color: '#334155' }}>{nom}</div>}
                          </div>
                        ))}
                      </div>
                      {/* Pied de page */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, fontSize: 11, color: '#64748b', fontFamily: font }}>
                        <img src="/logo-pied-page.png" alt="" style={{ height: 19, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                        <span>Zone Industrielle 4, 1963 Vétroz<br />Tél. 027 606 18 60</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ---- VUE PAR BRANCHE ---- */}
        {vueGeneraleMode === 'branche' && rapport && matiereRapport && (() => {
          const thTCFB = {
            ...s.th,
            position: 'static',
            top: 'auto',
            zIndex: 'auto',
            background: '#6366f1',
            color: 'white',
            textAlign: 'center',
            borderTop: '1px solid #4338ca',
            borderBottom: '1px solid #4338ca',
            borderLeft: '1px solid #4338ca',
            borderRight: '1px solid #818cf8',
          };
          const tdTCFB = { ...s.td, border: '1px solid #e2e8f0', background: 'white' };
          const tdMoyBr = { ...tdTCFB, textAlign: 'center', fontSize: 14 };
          const colEvalW = 72;
          return (
            <div id="vg-branche-bull" className="vg-bull-sheet" style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid #f1f5f9', fontFamily: fontVG, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', width: '100%', boxSizing: 'border-box' }}>
              {enteteBulletinVueGenerale()}
              <div style={{ marginTop: 40, marginBottom: 16 }}>
                <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 20, letterSpacing: 2, fontFamily: fontVG, textTransform: 'uppercase', marginBottom: 15 }}>Moyennes de la classe</div>
                <div style={{ textAlign: 'right', fontSize: 13, color: '#475569', fontFamily: fontVG, marginBottom: 12 }}>Vétroz, le {todayFormatted}</div>
                <div style={{ fontFamily: fontVG }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{matiereRapport.matiere_nom}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{classeNom} — {generaleSemestre === '1' ? '1er semestre' : '2e semestre'}</div>
                </div>
              </div>
              <div style={{ overflowX: 'auto', marginTop: 0, borderRadius: 12 }}>
                <table style={{ ...s.tbl, fontSize: 12, tableLayout: 'fixed', width: '100%' }}>
                  <colgroup>
                    <col />
                    <col />
                    {matiereRapport.evaluations.map(ev => <col key={`col-ev-${ev.id}`} style={{ width: colEvalW }} />)}
                    <col style={{ width: 112 }} />
                  </colgroup>
                  <thead>
                    <tr style={s.theadRow}>
                      <th style={{ ...thTCFB, whiteSpace: 'nowrap', textAlign: 'left', borderTopLeftRadius: 12 }}>Nom</th>
                      <th style={{ ...thTCFB, whiteSpace: 'nowrap', textAlign: 'left' }}>Prénom</th>
                      {matiereRapport.evaluations.map((ev, ei) => (
                        <th key={ev.id} style={{ ...thTCFB, whiteSpace: 'nowrap' }} title={ev.nom}>{ei + 1}</th>
                      ))}
                      <th className="vg-moy-col" style={{ ...thTCFB, whiteSpace: 'normal', minWidth: 112, maxWidth: 140, borderTopRightRadius: 12 }}>Moyenne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rapport.eleves.map((eleve, i) => {
                      const moy = moyenneEleveMatiere(matiereRapport, eleve.id);
                      return (
                        <tr key={eleve.id} style={{ ...s.tr, background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                          <td style={{ ...tdTCFB, fontWeight: 700, whiteSpace: 'nowrap' }}>{nomSansSuffixe(eleve.nom)}</td>
                          <td style={{ ...tdTCFB, whiteSpace: 'nowrap' }}>{eleve.prenom}</td>
                          {matiereRapport.evaluations.map(ev => {
                            const n = ev.notes.find(n => n.eleve_id === eleve.id);
                            const color = n && !n.absent && !n.dispense && n.valeur !== null ? (parseFloat(n.valeur) >= 4 ? '#111827' : '#ef4444') : '#94a3b8';
                            return (
                              <td key={ev.id} style={{ ...tdTCFB, textAlign: 'center', color }}>
                                {n && n.absent ? 'ABS' : n && n.dispense ? 'DISP' : (n && n.valeur !== null ? fmtNote(n.valeur) : '—')}
                              </td>
                            );
                          })}
                          <td className="vg-moy-col" style={{ ...tdMoyBr, color: moy !== null ? (moy >= 4 ? '#111827' : '#ef4444') : '#94a3b8' }}>
                            {moy !== null ? fmtNote(moy) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {piedBulletinVueGenerale()}
            </div>
          );
        })()}
        {vueGeneraleMode === 'branche' && !rapportMatiereId && <div style={s.vide}>Sélectionnez une branche</div>}

        {/* ---- VUE PAR ELEVE ---- */}
        {vueGeneraleMode === 'eleve' && rapport && eleveRapport && (() => {
          return (
            <div style={{ width: '100%', maxWidth: '210mm', margin: '0 auto', boxSizing: 'border-box' }}>
            <div id="vg-eleve-bull" className="vg-bull-sheet" style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid #f1f5f9', fontFamily: fontVG, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              {enteteBulletinVueGenerale()}
              <div style={{ marginTop: 40, marginBottom: 16 }}>
                <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 20, letterSpacing: 2, fontFamily: fontVG, textTransform: 'uppercase', marginBottom: 15 }}>Notes de l'élève</div>
                <div style={{ textAlign: 'right', fontSize: 13, color: '#475569', fontFamily: fontVG, marginBottom: 12 }}>Vétroz, le {todayFormatted}</div>
                <div style={{ fontFamily: fontVG }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{eleveRapport.prenom} {nomSansSuffixe(eleveRapport.nom)}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{classeNom} — {generaleSemestre === '1' ? '1er semestre' : '2e semestre'}</div>
                </div>
              </div>
              <table style={{ ...s.tbl, fontSize: 13, tableLayout: 'fixed', width: '100%', minWidth: '100%', fontFamily: fontVG }}>
                <colgroup>
                  <col className="vg-date-col" style={{ width: 90 }} />
                  <col className="vg-nom-col" style={{ width: 'calc(100% - 395px)' }} />
                  <col className="vg-prof-col" style={{ width: 160 }} />
                  <col className="vg-coef-col" style={{ width: 85 }} />
                  <col className="vg-note-col" style={{ width: 60 }} />
                </colgroup>
                <tbody>
                  {modeMatieres.map((matiere, matiereIdx) => {
                    const moy = moyenneEleveMatiere(matiere, eleveRapport.id);
                    return [
                      ...(matiereIdx > 0 ? [<tr key={`gap-${matiere.matiere_id}`} className="vg-branch-gap"><td colSpan={5}></td></tr>] : []),
                      <tr key={`sep-${matiere.matiere_id}`}>
                        <td className="vg-branch-title-cell" colSpan={5} style={{ padding: `${matiereIdx === 0 ? 8 : 16}px 0 4px`, borderBottom: '1px solid #000' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <b style={{ fontSize: 14, color: '#1e293b' }}>{matiere.matiere_nom}</b>
                            {moy !== null
                              ? <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>Moyenne : {fmtNote(moy)}</span>
                              : <span style={{ color: '#aaa', fontSize: 13 }}>Aucune note</span>}
                          </div>
                        </td>
                      </tr>,
                      ...(matiere.evaluations.length === 0
                        ? [<tr key={`empty-${matiere.matiere_id}`}><td colSpan={5} style={{ ...s.td, color: '#aaa', fontSize: 13 }}>Aucune évaluation</td></tr>]
                        : matiere.evaluations.map((ev, j) => {
                            const n = ev.notes.find(n => n.eleve_id === eleveRapport.id);
                            const valeur = n && !n.absent && !n.dispense ? n.valeur : null;
                            const statut = n && n.absent ? 'ABS' : n && n.dispense ? 'DISP' : null;
                            const profAff = [ev.prof_prenom, nomSansSuffixe(ev.prof_nom)].filter(Boolean).join(' ').trim() || '—';
                            const padEval = { paddingTop: 5, paddingBottom: 5, lineHeight: 1.25 };
                            return (
                              <tr key={ev.id} className="vg-eval-row" style={{ ...s.tr, background: 'white' }}>
                                <td className="vg-date-col" style={{ ...s.td, ...padEval, paddingLeft: 0, whiteSpace: 'nowrap', color: '#64748b' }}>{ev.date ? new Date(ev.date).toLocaleDateString('fr-CH') : '—'}</td>
                                <td className="vg-nom-col" style={{ ...s.td, ...padEval, fontWeight: 400, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{ev.nom}</td>
                                <td className="vg-prof-col" style={{ ...s.td, ...padEval, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profAff}</td>
                                <td className="vg-coef-col" style={{ ...s.td, ...padEval, textAlign: 'right', color: '#64748b', whiteSpace: 'nowrap' }}>Coef. {ev.coefficient}</td>
                                <td className="vg-note-col" style={{ ...s.td, ...padEval, textAlign: 'right', fontWeight: 400, color: '#1e293b' }}>{statut || (valeur !== null ? fmtNote(valeur) : '—')}</td>
                              </tr>
                            );
                          })
                      )
                    ];
                  })}
                </tbody>
              </table>
              {piedBulletinVueGenerale()}
            </div>
            </div>
          );
        })()}
        {vueGeneraleMode === 'eleve' && !rapportEleveId && <div style={s.vide}>Sélectionnez un élève</div>}
      </div>
    );
  }

  // ===================== VUE PAR ELEVE =====================
  if (vue === 'eleve') {
    const bulletin = bulletins.find(b => b.eleve.id === parseInt(eleveSelectionne));
    return (
      <div style={s.page}>
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
        <div style={s.header} className="no-print">
          <button style={s.btnRetour} onClick={() => { setSearchParams({}); setVue('classes'); }}>← Retour</button>
          <h2 style={s.titre}>👤 Notes par élève — {classeNom}</h2>
          <CustomSelect
            style={{ minWidth: 240 }}
            placeholder="-- Choisir un élève --"
            value={eleveSelectionne || ''}
            onChange={(v) => setEleveSelectionne(v)}
            options={bulletins.map(b => ({ value: b.eleve.id, label: `${b.eleve.nom} ${b.eleve.prenom}` }))}
          />
          <button style={s.btnImprimer} onClick={handleImprimer}>Imprimer</button>
        </div>
        {bulletin ? (
          <div ref={printRef}>
            <h3 style={{ marginBottom: 5 }}>Liste intermédiaire des notes — {bulletin.eleve.prenom} {bulletin.eleve.nom}</h3>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 15 }}>Classe : {classeNom}</p>
            {Object.entries(bulletin.parMatiere).map(([matierNom, data]) => (
              <div key={matierNom} style={{ marginBottom: 20 }}>
                <div style={s.bulletinMatiereTitre}>
                  <b>{matierNom}</b>
                  <span style={{ marginLeft: 'auto', fontWeight: 700, color: data.moyenne >= 4 ? '#2e7d32' : '#ef4444' }}>
                    Moyenne : {parseFloat(data.moyenne).toFixed(1)}/6
                  </span>
                </div>
                <table style={{ ...s.tbl, fontSize: 13 }}>
                  <thead>
                    <tr style={s.theadRow}>
                      <th style={s.th}>Évaluation</th>
                      <th style={s.th}>Date</th>
                      <th style={s.th}>Type</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>Coef.</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>Note /6</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluations.filter(ev => ev.matiere === matierNom).map((ev, i) => (
                      <tr key={ev.id} style={{ ...s.tr, background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                        <td style={s.td}>{ev.nom}</td>
                        <td style={s.td}>{ev.date ? new Date(ev.date).toLocaleDateString('fr-CH') : '—'}</td>
                        <td style={s.td}>{ev.type}</td>
                        <td style={{ ...s.td, textAlign: 'center' }}>{ev.coefficient}</td>
                        <td style={{ ...s.td, textAlign: 'center', fontWeight: 700 }}>—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <div style={s.moyenneGeneraleBox}>
              Moyenne générale : <b style={{ fontSize: 20, color: bulletin.moyenneGenerale >= 4 ? '#2e7d32' : '#ef4444' }}>{parseFloat(bulletin.moyenneGenerale).toFixed(1)}/6</b>
            </div>
          </div>
        ) : <div style={s.vide}>Sélectionnez un élève</div>}
      </div>
    );
  }

  // ===================== VUE BULLETIN (tableau critères + PDF) =====================
  const mettreAJourCritereLocal = (eleveId, patch) => {
    setCriteresLocaux(prev => {
      const exists = prev.find(c => Number(c.eleve_id) === Number(eleveId));
      if (exists) return prev.map(c => Number(c.eleve_id) === Number(eleveId) ? { ...c, ...patch } : c);
      return [...prev, { eleve_id: eleveId, ...patch }];
    });
    setCriteresModifies(true);
    setCriteresValides(false);
  };

  const validerCriteres = () => {
    // Toggle: si déjà validé, dé-valider
    if (criteresValides) {
      setCriteresLocaux(prev => prev.map(cr => ({ ...cr, valide: false })));
      setCriteresModifies(true);
      setCriteresValides(false);
      return;
    }

    const tousRemplis = bulletins.every(b => {
      const cr = criteresLocaux.find(c => Number(c.eleve_id) === Number(b.eleve.id)) || {};
      return [1,2,3,4,5,6,7,8,9,10].every(n => cr['c'+n] && cr['c'+n] !== '');
    });
    if (!tousRemplis) { alert('Tous les critères de comportement doivent avoir une couleur avant de valider.'); return; }

    const avertissements = [];
    for (const b of bulletins) {
      const cr = criteresLocaux.find(c => Number(c.eleve_id) === Number(b.eleve.id)) || {};
      const st = bulletinStatsPresences.find(s => Number(s.eleve_id) === Number(b.eleve.id));
      const presents = Number(st?.presents) || 0;
      const retards = Number(st?.retards) || 0;
      const absents = Number(st?.absents) || 0;
      const excuses = Number(st?.excuses) || 0;
      const conges = Number(st?.conges) || 0;
      const totalPeriodes = presents + absents + retards + excuses + conges;
      const tauxBN = totalPeriodes > 0 ? Math.round(((presents + retards) / totalPeriodes) * 1000) / 10 : null;
      const couleurTaux = tauxBN == null ? null : tauxBN < 70 ? 'rouge' : tauxBN < 80 ? 'orange' : null;
      const couleurRetards = retards > 6 ? 'rouge' : retards > 3 ? 'orange' : null;
      const nom = `${b.eleve.nom} ${b.eleve.prenom}`;
      if (couleurTaux && cr.c1 !== couleurTaux)
        avertissements.push(`${nom} : "Venir à l'école" doit être ${couleurTaux} (taux présence ${tauxBN}%)`);
      if (couleurRetards && cr.c2 !== couleurRetards)
        avertissements.push(`${nom} : "Être à l'heure" doit être ${couleurRetards} (${retards} retards)`);
      if ((cr.remarques || '').includes('Suspension de scolarité') && cr.c3 !== 'rouge')
        avertissements.push(`${nom} : "Respecter les règles" doit être rouge (suspension de scolarité)`);
    }
    if (avertissements.length > 0) {
      alert('⚠ Incohérences détectées :\n\n' + avertissements.join('\n') + '\n\nCorrigez ces critères avant de valider.');
      return;
    }
    setCriteresLocaux(prev => prev.map(cr => ({ ...cr, valide: true })));
    setCriteresModifies(true);
    setCriteresValides(true);
  };

  const sauvegarderTousCriteres = async () => {
    if (!criteresValides) {
      showToast('Veuillez valider les critères avant de sauvegarder.', 'info');
      return;
    }
    if (!criteresModifies) {
      showToast('Aucun changement à sauvegarder.', 'info');
      return;
    }
    for (const b of bulletins) {
      const cr = criteresLocaux.find(c => Number(c.eleve_id) === Number(b.eleve.id)) || {};
      const payload = {
        classe_id: classeSelectionnee, semestre: bulletinSemestre,
        c1: cr.c1||null, c2: cr.c2||null, c3: cr.c3||null, c4: cr.c4||null, c5: cr.c5||null,
        c6: cr.c6||null, c7: cr.c7||null, c8: cr.c8||null, c9: cr.c9||null, c10: cr.c10||null,
        remarques: cr.remarques||null, valide: true,
      };
      await axios.put(API + '/notes/bulletin-criteres/' + b.eleve.id, payload, { headers });
    }
    setBulletinCriteres([...criteresLocaux]);
    if (bulletinSemestre === '1') setCriteresSem1([...criteresLocaux]);
    else setCriteresSem2([...criteresLocaux]);
    setCriteresModifies(false);
    showToast('Changements sauvegardés.', 'info');
  };

  if (vue === 'bulletin') {
    const articleSelonSexe = (sexe) => (String(sexe || '').toUpperCase() === 'F' ? 'de la' : 'du');
    const niveauClasse = String(classeObj?.niveau || '').toUpperCase();
    const cleNiveau =
      niveauClasse.includes('CSC') ? 'CSC' :
      niveauClasse.includes('CFR') ? 'CFR' :
      niveauClasse.includes('EPL') ? 'EPL' : '';
    const responsableNiveauNom =
      cleNiveau === 'CSC' ? (ecoleParams.responsable_niveau_csc || '') :
      cleNiveau === 'CFR' ? (ecoleParams.responsable_niveau_cfr || '') :
      cleNiveau === 'EPL' ? (ecoleParams.responsable_niveau_epl || '') : '';
    const responsableNiveauSexe =
      cleNiveau === 'CSC' ? ecoleParams.sexe_responsable_niveau_csc :
      cleNiveau === 'CFR' ? ecoleParams.sexe_responsable_niveau_cfr :
      cleNiveau === 'EPL' ? ecoleParams.sexe_responsable_niveau_epl : null;
    const responsableCoursNom = ecoleParams.responsable_langues_jeunes || '';
    const responsableCoursSexe = ecoleParams.sexe_responsable_langues_jeunes;
    const bulletinsAImprimer = bulletinMode === 'tous'
      ? bulletins
      : bulletins.filter(b => b.eleve.id === parseInt(eleveSelectionne));

    const sauvegarderCriteres = async (eleveId, patch) => {
      const cr = bulletinCriteres.find(c => Number(c.eleve_id) === Number(eleveId)) || {};
      const payload = {
        classe_id: classeSelectionnee,
        c1: patch.c1 !== undefined ? patch.c1 : cr.c1,
        c2: patch.c2 !== undefined ? patch.c2 : cr.c2,
        c3: patch.c3 !== undefined ? patch.c3 : cr.c3,
        c4: patch.c4 !== undefined ? patch.c4 : cr.c4,
        c5: patch.c5 !== undefined ? patch.c5 : cr.c5,
        c6: patch.c6 !== undefined ? patch.c6 : cr.c6,
        c7: patch.c7 !== undefined ? patch.c7 : cr.c7,
        c8: patch.c8 !== undefined ? patch.c8 : cr.c8,
        c9: patch.c9 !== undefined ? patch.c9 : cr.c9,
        c10: patch.c10 !== undefined ? patch.c10 : cr.c10,
        remarques: patch.remarques !== undefined ? patch.remarques : cr.remarques,
        valide: patch.valide !== undefined ? patch.valide : cr.valide,
        semestre: bulletinSemestre,
      };
      await axios.put(API + '/notes/bulletin-criteres/' + eleveId, payload, { headers });
      const res = await axios.get(API + '/notes/bulletin-criteres?classe_id=' + classeSelectionnee + '&semestre=' + bulletinSemestre, { headers });
      setBulletinCriteres(res.data || []);
    };

    const toutVert = () => {
      for (const b of bulletins) {
        mettreAJourCritereLocal(b.eleve.id, { c1: 'vert', c2: 'vert', c3: 'vert', c4: 'vert', c5: 'vert', c6: 'vert', c7: 'vert', c8: 'vert', c9: 'vert', c10: 'vert' });
      }
    };
    const toutEstVert = bulletins.length > 0 && bulletins.every(b => {
      const cr = criteresLocaux.find(c => Number(c.eleve_id) === Number(b.eleve.id));
      return cr && ['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10'].every(k => cr[k] === 'vert');
    });

    const toggleValide = async (eleveId) => {
      const cr = bulletinCriteres.find(c => Number(c.eleve_id) === Number(eleveId));
      await sauvegarderCriteres(eleveId, { valide: !(cr && cr.valide) });
    };

    return (
      <div style={s.page}>
        <style>{`@media print { .no-print { display: none !important; } body { margin: 0; } }`}</style>
        <div style={s.header} className="no-print">
          <button style={s.btnRetour} onClick={() => { setSearchParams({}); setVue('classes'); }}>← Retour</button>
          <h2 style={s.titre}>{bulletinOnglet === 'criteres' ? 'Comportements' : 'Bulletin de notes'} — {classeNom}</h2>
          {bulletinOnglet === 'criteres' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {isAdmin() && <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, whiteSpace: 'nowrap' }}>Mode admin — accès complet</span>}
              {toast.message && <div style={{ padding: '8px 14px', borderRadius: 8, background: '#ede9fe', color: '#4c1d95', fontWeight: 700, fontSize: 13 }}>{toast.message}</div>}
              <button
                onClick={sauvegarderTousCriteres}
                style={{ padding: '0 18px', height: 36, boxSizing: 'border-box', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: '#6366f1', color: 'white', transition: 'all 0.2s' }}>
                Sauvegarder
              </button>
            </div>
          )}
          {bulletinOnglet === 'notes' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isAdmin() && <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, whiteSpace: 'nowrap' }}>Mode admin — accès complet</span>}
              <button style={s.btnImprimer} onClick={handleImprimer}>
                Imprimer
              </button>
            </div>
          )}
        </div>
        {/* Sous-onglets semestre + mode */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 }}>
            {[{ id: '1', label: '1er semestre' }, { id: '2', label: '2e semestre' }].map(sem => {
              const disabled = (sem.id === '2' && !sem1Bloque && !isAdmin()) || (sem.id === '1' && sem1Bloque && !isAdmin());
              return (
                <button key={sem.id} disabled={disabled} onClick={async () => { if (criteresModifies && criteresValides) await sauvegarderTousCriteres(); setBulletinSemestre(sem.id); chargerBulletinId(classeSelectionnee, sem.id); }}
                  style={{ padding: '7px 16px', borderRadius: 17, border: 'none', background: bulletinSemestre === sem.id ? '#6366f1' : 'transparent', color: bulletinSemestre === sem.id ? 'white' : '#6d28d9', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: bulletinSemestre === sem.id ? 700 : 600, fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: disabled ? 0.4 : 1 }}>
                  {sem.label}
                </button>
              );
            })}
          </div>
          {bulletinOnglet === 'notes' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'inline-flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 }}>
                {[{ id: 'eleve', label: 'Par élève' }, { id: 'tous', label: 'Tous' }].map(m => (
                  <button key={m.id} onClick={() => setBulletinMode(m.id)}
                    style={{ padding: '7px 16px', borderRadius: 17, border: 'none', background: bulletinMode === m.id ? '#6366f1' : 'transparent', color: bulletinMode === m.id ? 'white' : '#6d28d9', cursor: 'pointer', fontWeight: bulletinMode === m.id ? 700 : 600, fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    {m.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setShowAppreciations(v => !v)}
                style={{ padding: '7px 14px', borderRadius: 17, border: '1.5px solid ' + (showAppreciations ? '#6366f1' : '#e2e8f0'), background: showAppreciations ? '#e0e7ff' : 'white', cursor: 'pointer', fontWeight: 600, color: showAppreciations ? '#4338ca' : '#94a3b8', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap', minWidth: 170 }}>
                {showAppreciations ? 'Afficher notes' : 'Afficher appréciations'}
              </button>
            </div>
          )}
          {bulletinOnglet === 'criteres' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={toutVert}
              style={{ ...s.btnGhostPill, ...(toutEstVert ? s.btnGhostPillActif : {}) }}>
              Tout mettre au vert
            </button>
            <button
              type="button"
              onClick={validerCriteres}
              style={{ ...s.btnGhostPill, ...(criteresValides ? s.btnGhostPillActif : {}) }}>
              {criteresValides ? 'Critères validés' : 'Valider les critères'}
            </button>
            </div>
          )}
        </div>


        {bulletinOnglet === 'criteres' && (
          <>
            <div style={{ ...s.tableContainer, marginBottom: 24 }} className="no-print">
              <table style={{ ...s.tbl, fontSize: 12, tableLayout: 'auto' }}>
                <thead>
                  <tr style={s.theadRow}>
                    <th style={{ ...s.th, whiteSpace: 'nowrap', width: 1, borderTopLeftRadius: 12 }}>Élève</th>
                    {BULLETIN_CRITERES_LABELS.map((label, i) => (
                      <th key={i} style={{ ...s.th, textAlign: 'center', verticalAlign: 'bottom', padding: '4px 2px', height: 110 }} title={label.join(' ')}>
                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'pre-line', fontSize: 11, fontWeight: 700, lineHeight: 1.6, margin: '0 auto' }}>{label[0] + '\n' + label[1]}</div>
                      </th>
                    ))}
                    <th style={{ ...s.th, width: 77, minWidth: 77, maxWidth: 77, textAlign: 'center', lineHeight: 1.2 }}>Taux<br />prés.</th>
                    <th style={{ ...s.th, width: 58, minWidth: 58, maxWidth: 58, textAlign: 'center' }}>Ret.</th>
                    <th style={{ ...s.th, width: 96, minWidth: 96, maxWidth: 96, textAlign: 'center', borderTopRightRadius: 12 }}>Rem.</th>
                  </tr>
                </thead>
                <tbody>
                  {bulletins.length === 0 ? (
                    <tr><td colSpan={14} style={s.vide}>Aucun élève</td></tr>
                  ) : bulletins.map((b, idx) => {
                    const st = bulletinStatsPresences.find(s => Number(s.eleve_id) === Number(b.eleve.id));
                    const cr = criteresLocaux.find(c => Number(c.eleve_id) === Number(b.eleve.id)) || {};
                    const presents = Number(st?.presents) || 0;
                    const retards = Number(st?.retards) || 0;
                    const absents = Number(st?.absents) || 0;
                    const excuses = Number(st?.excuses) || 0;
                    const conges = Number(st?.conges) || 0;
                    const totalPeriodes = presents + absents + retards + excuses + conges;
                    const tauxBN = totalPeriodes > 0 ? Math.round(((presents + retards) / totalPeriodes) * 1000) / 10 : null;
                    const tauxBg = tauxBN == null ? {} : tauxBN < 70 ? {color:'#b91c1c'} : tauxBN < 80 ? {color:'#c2410c'} : {};
                    const retardsBg = retards > 6 ? {color:'#b91c1c'} : retards > 3 ? {color:'#c2410c'} : {};
                    return (
                      <tr key={b.eleve.id} style={{ ...s.tr, background: idx % 2 === 0 ? 'white' : '#fafbfc' }}>
                        <td style={{ ...s.td, whiteSpace: 'nowrap', width: 1 }}><b>{b.eleve.nom}</b> {b.eleve.prenom}</td>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                          const key = 'c' + n;
                          const val = cr[key] || '';
                          return (
                            <td key={key} style={{ ...s.td, padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', cursor: 'pointer' }} title={BULLETIN_CRITERES_LABELS[n - 1].join(' ')}
                              onClick={() => { mettreAJourCritereLocal(b.eleve.id, { [key]: cycleCouleur(val) }); }}>
                              {val ? <span style={{ width: 14, height: 14, borderRadius: '50%', display: 'inline-block', background: val === 'vert' ? '#22c55e' : val === 'orange' ? '#f97316' : '#ef4444' }} /> : '—'}
                            </td>
                          );
                        })}
                        <td style={{ ...s.td, textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, ...tauxBg }}>{tauxBN != null ? tauxBN + '%' : '—'}</td>
                        <td style={{ ...s.td, textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, ...retardsBg }}>{retards > 0 ? retards : (st?.retards != null ? st.retards : '—')}</td>
                        <td style={{ ...s.td, textAlign: 'center', padding: '8px 6px' }}>
                          <button type="button"
                            onClick={() => {
                              const existing = cr.remarques || '';
                              const sel = [];
                              const prm = { transfertVerseClasse: '', transfertDepuisSuite: 'au TCF', transfertDepuisDate: '', suspensionDu: '', suspensionAu: '' };
                              if (existing.includes('Arrêt de scolarité')) sel.push('arret');
                              if (existing.includes('Transfert vers une autre classe')) {
                                sel.push('transfertVers');
                                const m = existing.match(/Transfert vers une autre classe\s*:\s*([^.]+)/);
                                if (m) prm.transfertVerseClasse = m[1].trim();
                              }
                              if (existing.includes('dans cette classe suite')) {
                                sel.push('transfertDepuis');
                                const sm = existing.match(/suite\s+(au TCF|au conseil de classe|à la demande du titulaire)/);
                                if (sm) prm.transfertDepuisSuite = sm[1];
                                const dm = existing.match(/suite.*le\s+(\d{2}\.\d{2}\.\d{4})/);
                                if (dm) { const p = dm[1].split('.'); prm.transfertDepuisDate = `${p[2]}-${p[1]}-${p[0]}`; }
                              }
                              if (existing.includes('Suspension de scolarité')) {
                                sel.push('suspension');
                                const dm = existing.match(/du\s+(\d{2}\.\d{2}\.\d{4})/);
                                const am = existing.match(/au\s+(\d{2}\.\d{2}\.\d{4})/);
                                if (dm) { const p = dm[1].split('.'); prm.suspensionDu = `${p[2]}-${p[1]}-${p[0]}`; }
                                if (am) { const p = am[1].split('.'); prm.suspensionAu = `${p[2]}-${p[1]}-${p[0]}`; }
                              }
                              if (existing.includes('Participation aux ateliers')) sel.push('ateliers');
                              setRemarqueModal({ eleveId: b.eleve.id, nom: b.eleve.nom, prenom: b.eleve.prenom, selected: sel, params: prm });
                            }}
                            style={{ padding: 6, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: cr.remarques ? '#eef2ff' : '#f1f5f9', color: cr.remarques ? '#4338ca' : '#94a3b8' }}>
                            <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h2.5L9 19.5 11.5 17H20a2 2 0 002-2V5a2 2 0 00-2-2H4z M7 8h10v2H7z M7 12h7v2H7z"/></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal remarque */}
            {remarqueModal && (() => {
              const REMARQUES_CONFIG = [
                { key: 'arret', label: 'Arrêt de scolarité.' },
                { key: 'transfertVers', label: 'Transfert vers une autre classe :', hasClassInput: true },
                { key: 'transfertDepuis', label: 'Transféré(e) dans cette classe suite…', hasSuiteSelect: true, hasDate: true },
                { key: 'suspension', label: 'Suspension de scolarité du … au …', hasDateDu: true, hasDateAu: true },
                { key: 'ateliers', label: "Participation aux ateliers, certaines évaluations n'ont pas été effectuées." },
              ];
              const { selected, params } = remarqueModal;
              const toggle = (key) => setRemarqueModal(prev => ({ ...prev, selected: prev.selected.includes(key) ? prev.selected.filter(k => k !== key) : [...prev.selected, key] }));
              const setParam = (key, val) => setRemarqueModal(prev => ({ ...prev, params: { ...prev.params, [key]: val } }));
              const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-CH') : '___';
              const buildText = () => {
                const parts = [];
                if (selected.includes('arret')) parts.push('Arrêt de scolarité.');
                if (selected.includes('transfertVers')) parts.push(`Transfert vers une autre classe : ${params.transfertVerseClasse || '___'}.`);
                if (selected.includes('transfertDepuis')) parts.push(`Transféré(e) dans cette classe suite ${params.transfertDepuisSuite} le ${fmtDate(params.transfertDepuisDate)}.`);
                if (selected.includes('suspension')) parts.push(`Suspension de scolarité du ${fmtDate(params.suspensionDu)} au ${fmtDate(params.suspensionAu)}.`);
                if (selected.includes('ateliers')) parts.push("Participation aux ateliers, certaines évaluations n'ont pas été effectuées.");
                return parts.join('\n');
              };
              const previewText = buildText();
              const inStyle = { padding: '6px 10px', borderRadius: 6, border: '1px solid #6366f1', fontSize: 13, outline: 'none', background: 'white' };
              return (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500 }}
                  onClick={() => setRemarqueModal(null)}>
                  <div style={{ width: 'min(580px, 94vw)', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 15px 40px rgba(0,0,0,0.18)', padding: 20, maxHeight: '90vh', overflowY: 'auto' }}
                    onClick={e => e.stopPropagation()}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: '#1e293b' }}>
                      Remarques — {remarqueModal.nom} {remarqueModal.prenom}
                    </div>
                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e', marginBottom: 14, fontStyle: 'italic' }}>
                      ⚠ Seules les remarques prédéfinies ci-dessous sont autorisées. Plusieurs peuvent être sélectionnées simultanément.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {REMARQUES_CONFIG.map(cfg => {
                        const isSel = selected.includes(cfg.key);
                        return (
                          <div key={cfg.key}>
                            <button type="button" onClick={() => toggle(cfg.key)}
                              style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 7, border: `2px solid ${isSel ? '#6366f1' : '#e2e8f0'}`, background: isSel ? '#ede9fe' : '#f8fafc', color: isSel ? '#4c1d95' : '#334155', fontSize: 13, cursor: 'pointer', fontWeight: isSel ? 700 : 400, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSel ? '#6366f1' : '#cbd5e1'}`, background: isSel ? '#6366f1' : 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {isSel && <span style={{ color: 'white', fontSize: 10, fontWeight: 900 }}>✓</span>}
                              </span>
                              {cfg.label}
                            </button>
                            {isSel && cfg.hasClassInput && (
                              <div style={{ padding: '6px 12px 4px 36px' }}>
                                <input type="text" placeholder="Nom de la classe..." value={params.transfertVerseClasse}
                                  onChange={e => setParam('transfertVerseClasse', e.target.value)}
                                  style={{ ...inStyle, width: '100%', boxSizing: 'border-box' }} />
                              </div>
                            )}
                            {isSel && cfg.hasSuiteSelect && (
                              <div style={{ padding: '6px 12px 4px 36px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <CustomSelect
                                  style={inStyle}
                                  value={params.transfertDepuisSuite}
                                  onChange={(v) => setParam('transfertDepuisSuite', v)}
                                  options={[
                                    { value: 'au TCF', label: 'au TCF' },
                                    { value: 'au conseil de classe', label: 'au conseil de classe' },
                                    { value: 'à la demande du titulaire', label: 'à la demande du titulaire' },
                                  ]}
                                />
                                <span style={{ fontSize: 13, color: '#475569' }}>le</span>
                                <input type="date" value={params.transfertDepuisDate} onChange={e => setParam('transfertDepuisDate', e.target.value)} style={inStyle} />
                              </div>
                            )}
                            {isSel && cfg.hasDateDu && (
                              <div style={{ padding: '6px 12px 4px 36px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 13, color: '#475569' }}>Du</span>
                                <input type="date" value={params.suspensionDu} onChange={e => setParam('suspensionDu', e.target.value)} style={inStyle} />
                                <span style={{ fontSize: 13, color: '#475569' }}>au</span>
                                <input type="date" value={params.suspensionAu} onChange={e => setParam('suspensionAu', e.target.value)} style={inStyle} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#475569', marginBottom: 14, minHeight: 40 }}>
                      <span style={{ fontWeight: 700 }}>Aperçu : </span>
                      {previewText ? <span style={{ color: '#1e293b' }}>{previewText}</span> : <span style={{ fontStyle: 'italic' }}>Aucune remarque sélectionnée</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {selected.length > 0 && (
                        <button onClick={() => setRemarqueModal(prev => ({ ...prev, selected: [], params: { transfertVerseClasse: '', transfertDepuisSuite: 'au TCF', transfertDepuisDate: '', suspensionDu: '', suspensionAu: '' } }))}
                          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Effacer tout</button>
                      )}
                      <button onClick={() => setRemarqueModal(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Annuler</button>
                      <button onClick={() => { mettreAJourCritereLocal(remarqueModal.eleveId, { remarques: previewText }); setRemarqueModal(null); }}
                        style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Enregistrer</button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {bulletinOnglet === 'notes' && (bulletinsSem1.length > 0 || bulletinsSem2.length > 0) && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            {bulletinMode === 'eleve' && (
              <div className="no-print" style={{ width: 210, flexShrink: 0, position: 'sticky', top: 16, alignSelf: 'flex-start', background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '9px 14px', fontWeight: 700, fontSize: 11, color: 'white', background: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '12px 12px 0 0' }}>Élèves</div>
                <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                  {bulletins.map((b, idx) => {
                    const isSelected = eleveSelectionne && String(eleveSelectionne) === String(b.eleve.id);
                    return (
                      <div key={b.eleve.id} onClick={() => setEleveSelectionne(String(b.eleve.id))}
                        style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, background: isSelected ? '#eef2ff' : idx % 2 === 0 ? 'white' : '#fafbfc', color: isSelected ? '#4338ca' : '#1e293b', fontWeight: isSelected ? 700 : 400, borderLeft: `3px solid ${isSelected ? '#6366f1' : 'transparent'}`, transition: 'background 0.1s' }}>
                        {nomSansSuffixe(b.eleve.nom)} {b.eleve.prenom}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          <div ref={printRef} style={{ flex: 1, minWidth: 0 }}>
            <style>{`
              @media print {
                @page { size: A4; margin: 2cm; }
                .no-print { display: none !important; }
                .bulletin-pdf-page { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; }
                .bulletin-pdf-page * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            `}</style>
            {(() => {
              const seen = new Set();
              const allEleves = [];
              for (const b of [...bulletinsSem1, ...bulletinsSem2]) {
                if (!seen.has(b.eleve.id)) { seen.add(b.eleve.id); allEleves.push(b.eleve); }
              }
              const elevesToShow = bulletinMode === 'tous' ? allEleves : allEleves.filter(el => el.id === parseInt(eleveSelectionne));
              const dot = (v) => v ? <span style={{ width: 11, height: 11, borderRadius: '50%', display: 'inline-block', border: `2px solid ${v === 'vert' ? '#22c55e' : v === 'orange' ? '#f97316' : '#ef4444'}` }} /> : <span style={{ color: '#aaa' }}>—</span>;
              const moyBranches = (names, pm) => { const w = names.filter(n => pm[n]?.moyenne != null); return w.length ? w.reduce((a, n) => a + parseFloat(pm[n].moyenne || 0), 0) / w.length : null; };
              return elevesToShow.map((eleve, bi) => {
                const bdS1 = bulletinsSem1.find(b => b.eleve.id === eleve.id);
                const bdS2 = bulletinsSem2.find(b => b.eleve.id === eleve.id);
                const cr1 = criteresSem1.find(c => Number(c.eleve_id) === Number(eleve.id)) || {};
                const cr2 = criteresSem2.find(c => Number(c.eleve_id) === Number(eleve.id)) || {};
                const st = bulletinStatsPresences.find(s => Number(s.eleve_id) === Number(eleve.id));
                const stS1 = bulletinStatsS1.find(s => Number(s.eleve_id) === Number(eleve.id));
                const stS2 = bulletinStatsS2.find(s => Number(s.eleve_id) === Number(eleve.id));
                const pm1 = bdS1?.parMatiere || {};
                const pm2 = bdS2?.parMatiere || {};
                const allNames = [...new Set([...Object.keys(pm1), ...Object.keys(pm2)])].sort();
                const principales = allNames.filter(n => Number((pm1[n] || pm2[n] || {}).coefficient || 1) >= 2);
                const secondaires = allNames.filter(n => Number((pm1[n] || pm2[n] || {}).coefficient || 1) < 2);
                const moyP1 = moyBranches(principales, pm1); const moyP2 = moyBranches(principales, pm2);
                const moyS1 = moyBranches(secondaires, pm1); const moyS2 = moyBranches(secondaires, pm2);
                const allN = [...principales, ...secondaires];
                const moyG1 = moyBranches(allN, pm1); const moyG2 = moyBranches(allN, pm2);
                const moyAnn = moyG1 != null && moyG2 != null ? (moyG1 + moyG2) / 2 : null;
                const showS2 = bulletinSemestre === '2';
                const splitRem = (t) => { if (!t || !t.trim()) return []; const s = t.trim().split('\n').filter(Boolean); if (s.length > 1) return s; return t.trim().split(/\.\s+(?=[A-ZÀ-Ü])/).map((r, i, a) => i < a.length - 1 ? r + '.' : r).filter(Boolean); };
                const rem1 = splitRem(cr1.remarques);
                const rem2 = splitRem(cr2.remarques);
                const thBranch = { border: 'none', background: 'white', color: '#000', fontWeight: 800, textAlign: 'left', fontSize: 13, padding: '5px 10px', textTransform: 'none', letterSpacing: 'normal', boxShadow: 'none', position: 'static' };
                const thBranchC = { ...thBranch, textAlign: 'center', width: 44, whiteSpace: 'nowrap' };
                const tdP = { ...s.td, padding: '4px 10px', fontFamily: 'Century Gothic, CenturyGothic, AppleGothic, sans-serif' };
                const tdC = { ...s.td, textAlign: 'center', padding: '4px 6px', border: 'none' };
                return (
                  <div key={eleve.id} className="bulletin-pdf-page" style={{ background: 'white', padding: 40, maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: 'calc(297mm - 20mm)', pageBreakAfter: bi < elevesToShow.length - 1 ? 'always' : 'auto', marginBottom: 24, border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    {/* En-tête : logo+org à gauche, SCAI à droite */}
                    {(() => { const _now = new Date(); const _as = _now.getMonth() >= 7 ? `${_now.getFullYear()}-${_now.getFullYear()+1}` : `${_now.getFullYear()-1}-${_now.getFullYear()}`; return (
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <img src="/logo-etat-du-valais.png" alt="Logo État du Valais" style={{ width: 38, height: 'auto', objectFit: 'contain' }} />
                        <div style={{ fontSize: 9, lineHeight: 1.6, color: '#334155' }}>
                          <div>Département de la santé, des affaires sociales et de la culture</div>
                          <div>Service de l'action sociale</div>
                          <div>Office de l'asile</div>
                          <div>Centre de formation "Le Botza"</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: '#1e293b' }}>SCAI</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{_as}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>CLASSES D'ACCUEIL</div>
                      </div>
                    </div>
                    ); })()}
                    <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 20, letterSpacing: 2, margin: '30px 0 14px', textTransform: 'uppercase', color: '#0f172a' }}>Bulletin de notes</div>
                    <div style={{ textAlign: 'right', fontSize: 13, color: '#1e293b', marginBottom: 14 }}>Vétroz, le {new Date().toLocaleDateString('fr-CH')}</div>
                    <div style={{ fontSize: 13, color: '#1e293b', marginBottom: 16, paddingLeft: 10 }}>
                      <div style={{ marginBottom: 6, lineHeight: 1.35 }}><span style={{ fontWeight: 700 }}>Nom Prénom :</span><span style={{ marginLeft: 6 }}>{eleve.prenom} {eleve.nom}</span></div>
                      <div style={{ lineHeight: 1.35 }}><span style={{ fontWeight: 700 }}>Classe :</span><span style={{ marginLeft: 6 }}>{classeNom}</span></div>
                    </div>
                    {/* 2 colonnes : notes (60%) | comportement (40%) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '50% 50%', gap: 6 }}>
                      {/* Colonne gauche : branches principales + secondaires empilées */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <table style={{ ...s.tbl, width: '100%', tableLayout: 'fixed', border: 'none' }}>
                          <thead><tr style={{ background: 'white' }}>
                            <th style={thBranch}>Branches principales</th>
                            <th style={thBranchC}>S1</th><th style={thBranchC}>S2</th>
                          </tr></thead>
                          <tbody>
                            {principales.length === 0 && <tr><td colSpan={3} style={{ ...tdP, color: '#aaa' }}>—</td></tr>}
                            {principales.map(nom => (
                              <tr key={nom} style={s.tr}>
                                <td style={tdP}>{nom}</td>
                                <td style={tdC}>{pm1[nom]?.moyenne != null ? (showAppreciations ? getApprec(pm1[nom].moyenne) : fmtNote(pm1[nom].moyenne)) : '—'}</td>
                                <td style={tdC}>{showS2 && pm2[nom]?.moyenne != null ? (showAppreciations ? getApprec(pm2[nom].moyenne) : fmtNote(pm2[nom].moyenne)) : '—'}</td>
                              </tr>
                            ))}
                            <tr style={{ ...s.tr, fontWeight: 700 }}>
                              <td style={tdP}>Moyenne</td>
                              <td style={tdC}>{moyP1 != null ? (showAppreciations ? getApprec(moyP1) : fmtNote(moyP1)) : '—'}</td>
                              <td style={tdC}>{showS2 && moyP2 != null ? (showAppreciations ? getApprec(moyP2) : fmtNote(moyP2)) : '—'}</td>
                            </tr>
                          </tbody>
                        </table>
                        <table style={{ ...s.tbl, width: '100%', tableLayout: 'fixed', border: 'none' }}>
                          <thead><tr style={{ background: 'white' }}>
                            <th style={thBranch}>Branches secondaires</th>
                            <th style={thBranchC}>S1</th><th style={thBranchC}>S2</th>
                          </tr></thead>
                          <tbody>
                            {secondaires.length === 0 && <tr><td colSpan={3} style={{ ...tdP, color: '#aaa' }}>—</td></tr>}
                            {secondaires.map(nom => (
                              <tr key={nom} style={s.tr}>
                                <td style={tdP}>{nom}</td>
                                <td style={tdC}>{pm1[nom]?.moyenne != null ? (showAppreciations ? getApprec(pm1[nom].moyenne) : fmtNote(pm1[nom].moyenne)) : '—'}</td>
                                <td style={tdC}>{showS2 && pm2[nom]?.moyenne != null ? (showAppreciations ? getApprec(pm2[nom].moyenne) : fmtNote(pm2[nom].moyenne)) : '—'}</td>
                              </tr>
                            ))}
                            <tr style={{ ...s.tr, fontWeight: 700 }}>
                              <td style={tdP}>Moyenne</td>
                              <td style={tdC}>{moyS1 != null ? (showAppreciations ? getApprec(moyS1) : fmtNote(moyS1)) : '—'}</td>
                              <td style={tdC}>{showS2 && moyS2 != null ? (showAppreciations ? getApprec(moyS2) : fmtNote(moyS2)) : '—'}</td>
                            </tr>
                            <tr><td colSpan={3} style={{ height: 6, padding: 0, border: 'none', background: 'white' }}></td></tr>
                            <tr style={{ ...s.tr, fontWeight: 700 }}>
                              <td style={tdP}>Moyenne semestrielle</td>
                              <td style={tdC}>{moyG1 != null ? (showAppreciations ? getApprec(moyG1) : fmtNote(moyG1)) : '—'}</td>
                              <td style={tdC}>{showS2 && moyG2 != null ? (showAppreciations ? getApprec(moyG2) : fmtNote(moyG2)) : '—'}</td>
                            </tr>
                            <tr style={{ ...s.tr, fontWeight: 700, color: '#000000' }}>
                              <td style={tdP}>Moyenne annuelle</td>
                              <td style={{ ...tdC, fontWeight: 900, color: '#000000' }} colSpan={2}>{showS2 && moyAnn != null ? (showAppreciations ? getApprec(moyAnn) : fmtNote(moyAnn)) : '—'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      {/* Colonne droite : comportement */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1 }}>
                        <table style={{ ...s.tbl, width: '100%', tableLayout: 'fixed', border: 'none' }}>
                          <thead><tr style={{ background: 'white' }}>
                            <th style={thBranch}>Comportement</th>
                            <th style={{ ...thBranchC, width: 40 }}>S1</th>
                            <th style={{ ...thBranchC, width: 40 }}>S2</th>
                          </tr></thead>
                          <tbody>
                            {BULLETIN_CRITERES_LABELS.map((label, idx) => {
                              const key = 'c' + (idx + 1);
                              return (
                                <tr key={idx} style={s.tr}>
                                  <td style={tdP}>{label.join(' ')}</td>
                                  <td style={tdC}>{dot(cr1[key])}</td>
                                  <td style={tdC}>{showS2 ? dot(cr2[key]) : <span style={{ color: '#aaa' }}>—</span>}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        </div>
                        <table style={{ ...s.tbl, width: '100%', tableLayout: 'fixed', border: 'none' }}>
                          <colgroup><col /><col style={{ width: 40 }} /><col style={{ width: 40 }} /></colgroup>
                          <tbody>
                            <tr style={s.tr}><td style={{ ...tdP, border: 'none' }}>Absences excusées</td><td style={{ ...tdC, textAlign: 'center' }}>{stS1?.excuses ?? 0}</td><td style={{ ...tdC, textAlign: 'center' }}>{stS2?.excuses ?? 0}</td></tr>
                            <tr style={s.tr}><td style={{ ...tdP, border: 'none' }}>Absences non excusées</td><td style={{ ...tdC, textAlign: 'center' }}>{stS1?.absents ?? 0}</td><td style={{ ...tdC, textAlign: 'center' }}>{stS2?.absents ?? 0}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {showAppreciations && (
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 20, paddingLeft: 10 }}>
                        INS : Insuffisant &nbsp;·&nbsp; S : Suffisant &nbsp;·&nbsp; AB : Assez bien &nbsp;·&nbsp; B : Bien &nbsp;·&nbsp; TB : Très bien &nbsp;·&nbsp; EXC : Excellent
                      </div>
                    )}
                    {/* Observations pleine largeur sous les deux tableaux */}
                    <div style={{ ...s.card, padding: '6px 14px', marginTop: 40, marginBottom: 0, width: '100%', boxSizing: 'border-box', minHeight: 80, height: 'auto', border: '1px solid #e8e8e8' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Observations</div>
                      {rem1.length > 0 && <>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>1er semestre</div>
                        {rem1.map((r, i) => <div key={i} style={{ fontSize: 13 }}>{r}</div>)}
                      </>}
                      {showS2 && rem2.length > 0 && <>
                        {rem1.length > 0 && <div style={{ height: 10 }} />}
                        <div style={{ fontSize: 13, fontWeight: 700 }}>2e semestre</div>
                        {rem2.map((r, i) => <div key={i} style={{ fontSize: 13 }}>{r}</div>)}
                      </>}
                    </div>
                    {/* Signatures + pied de page groupés en bas */}
                    <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                      <div style={{ ...s.signatures, marginTop: 0, marginBottom: 40, paddingLeft: 14, paddingRight: 14 }}>
                        {[
                          { label: 'Titulaire', nom: [classeObj?.prof_prenom, classeObj?.prof_nom].filter(Boolean).join(' ') },
                          { label: 'Responsable de niveau', nom: responsableNiveauNom },
                          { label: 'Responsable des cours', nom: responsableCoursNom },
                        ].map(({ label, nom }, i) => (
                          <div key={i} style={s.signatureBox}>
                            <div style={{ borderTop: '0.5px solid #94a3b8', marginBottom: 8 }}></div>
                            <div style={{ ...s.signatureLabel, fontWeight: 700, color: '#334155' }}>{label}</div>
                            {nom && <div style={{ fontSize: 11, color: '#334155' }}>{nom}</div>}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#64748b' }}>
                        <img src="/logo-pied-page.png" alt="" style={{ height: 30, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                        <span>Zone Industrielle 4, 1963 Vétroz<br />Tél. 027 606 18 60</span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          </div>
        )}
      </div>
    );
  }

  // ===================== VUE EVALUATIONS =====================
  if (vue === 'evaluations') {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <button style={s.btnRetour} onClick={async () => { await chargerEvaluationsId(classeSelectionnee, null); setVue('matieres'); }}>← Retour</button>
          <h2 style={s.titre}>{matiereObj?.nom} — {classeNom}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isAdmin() && <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, whiteSpace: 'nowrap' }}>Mode admin — accès complet</span>}
            {peutModifierNotes() && !(sem1Bloque && evalSemestre === '1' && !isAdmin()) && <button style={s.btnAjouter} onClick={() => setShowForm(!showForm)}>+ Ajouter</button>}
          </div>
        </div>

        {showForm && (
          <div className="modal-overlay" style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div style={s.modal}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{form.editId ? 'Modifier l\'évaluation' : 'Nouvelle évaluation'}</h3>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={s.infoBox}>
                  <div style={s.infoLabel}>Professeur</div>
                  <div style={s.infoValue}>{profNomSession}</div>
                </div>
                <div style={s.infoBox}>
                  <div style={s.infoLabel}>Date</div>
                  <div style={s.infoValue}>{todayFormatted}</div>
                </div>
                <div style={s.infoBox}>
                  <div style={s.infoLabel}>Matière</div>
                  <div style={s.infoValue}>{matiereObj?.nom}</div>
                </div>
              </div>
              <form onSubmit={handleCreerEvaluation}>
                <div style={s.formGrid}>
                  <div style={{ ...s.formChamp, gridColumn: '1/-1' }}>
                    <label style={s.label}>Désignation <span style={{ color: '#ef4444' }}>*</span></label>
                    <input style={s.input} type="text" required value={form.nom}
                      onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Contrôle chapitre 3..." />
                  </div>
                  <div style={s.formChamp}>
                    <label style={s.label}>Type</label>
                    <CustomSelect
                      style={s.input}
                      value={form.type}
                      onChange={(v) => setForm({ ...form, type: v })}
                      options={TYPES.map(t => ({ value: t, label: t }))}
                    />
                  </div>
                  <div style={s.formChamp}>
                    <label style={s.label}>Points maximum</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input style={{ ...s.input, flex: 1, opacity: form.sans_points ? 0.4 : 1 }} type="number" step="0.5"
                        value={form.points_max} disabled={form.sans_points}
                        onChange={e => setForm({ ...form, points_max: e.target.value })} placeholder="Ex: 30" />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <input type="checkbox" checked={form.sans_points}
                          onChange={e => setForm({ ...form, sans_points: e.target.checked, points_max: e.target.checked ? '' : '' })} />
                        Pas de points
                      </label>
                    </div>
                  </div>
                  <div style={s.formChamp}>
                    <label style={s.label}>Coefficient</label>
                    <input style={s.input} type="number" step="0.1" value={form.coefficient}
                      onChange={e => setForm({ ...form, coefficient: e.target.value })} />
                  </div>
                </div>
                <div style={s.formActions}>
                  <button type="button" style={s.btnAnnuler} onClick={() => { setShowForm(false); setForm(formVide); }}>Annuler</button>
                  <button type="submit" style={s.btnSauver}>{form.editId ? 'Enregistrer' : 'Créer'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div style={s.tblWrap}>
        <table style={{ ...s.tbl, tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: COL_OEIL_DETAIL }} />
            <col />
            <col style={{ width: 170 }} />
            <col style={{ width: 96 }} />
            <col style={{ width: 92 }} />
            <col style={{ width: 78 }} />
            <col style={{ width: 64 }} />
            <col style={{ width: 92 }} />
            <col style={{ width: 96 }} />
            <col style={{ width: 58 }} />
          </colgroup>
          <thead>
            <tr style={s.theadRow}>
              <th style={{ ...s.th, width: COL_OEIL_DETAIL, minWidth: COL_OEIL_DETAIL, maxWidth: COL_OEIL_DETAIL, textAlign: 'center', borderTopLeftRadius: 12, boxSizing: 'border-box' }} aria-label="Ouvrir" />
              <th style={s.th}>Désignation</th>
              <th style={s.th}>Professeur</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Date</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Type</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Pts max</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Coef.</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Statut</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Moyenne</th>
              <th style={{ ...s.th, width: 58, minWidth: 58, maxWidth: 58, textAlign: 'center', borderTopRightRadius: 12 }} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {evaluations.length === 0 ? (
              <tr><td colSpan="10" style={s.vide}>Aucune évaluation — cliquez sur + Nouvelle évaluation</td></tr>
            ) : evaluations.map((ev, i) => (
              <tr key={ev.id} style={{ ...s.tr, background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                <td style={{ ...s.td, whiteSpace: 'nowrap', width: COL_OEIL_DETAIL, minWidth: COL_OEIL_DETAIL, maxWidth: COL_OEIL_DETAIL, boxSizing: 'border-box', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button type="button" style={{ ...s.btnDetail, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 6 }} title="Saisir les notes" onClick={() => ouvrirEvaluation(ev)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 13a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>
                    </button>
                  </div>
                </td>
                <td style={{ ...s.td, fontWeight: 700, color: '#6366f1', cursor: 'pointer' }} onClick={() => ouvrirEvaluation(ev)}>{ev.nom}</td>
                <td style={s.td}>{((ev.prof_prenom || '') + ' ' + (ev.prof_nom || '')).trim() || '—'}</td>
                <td style={{ ...s.td, textAlign: 'center' }}>{ev.date ? new Date(ev.date).toLocaleDateString('fr-CH') : '—'}</td>
                <td style={{ ...s.td, textAlign: 'center' }}><span style={s.typeBadge}>{ev.type}</span></td>
                <td style={{ ...s.td, textAlign: 'center' }}>{ev.points_max && parseFloat(ev.points_max) > 0 ? ev.points_max : '—'}</td>
                <td style={{ ...s.td, textAlign: 'center' }}>{ev.coefficient}</td>
                <td style={{ ...s.td, textAlign: 'center' }}>
                  {(() => {
                    const total = parseInt(ev.nb_eleves_classe) || 0;
                    const dispenses = parseInt(ev.nb_dispenses) || 0;
                    const saisies = parseInt(ev.nb_notes_saisies) || 0;
                    const manquants = total - dispenses - saisies;
                    if (total === 0) return <span style={{ color: '#aaa', fontSize: 13 }}>—</span>;
                    if (manquants <= 0) return <span style={{ color: '#2e7d32', fontWeight: 700, fontSize: 16 }}>✓</span>;
                    return <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13 }}>{manquants} manq.</span>;
                  })()}
                </td>
                <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, fontSize: 15, color: ev.moyenne_classe != null && !isNaN(parseFloat(ev.moyenne_classe)) ? (parseFloat(ev.moyenne_classe) >= 4 ? '#2e7d32' : '#ef4444') : '#aaa' }}>
                  {ev.moyenne_classe != null && !isNaN(parseFloat(ev.moyenne_classe)) ? fmtNote(parseFloat(ev.moyenne_classe)) : '—'}
                </td>
                <td style={{ ...s.td, width:58, minWidth:58, maxWidth:58, padding:'8px 4px', textAlign:'center' }}>
                  <div style={{ display:'inline-flex', gap:4, alignItems:'center', justifyContent:'center' }}>
                    {peutModifierNotes() && !(sem1Bloque && String(ev.semestre) === '1' && !isAdmin()) && (
                      <button
                        type="button"
                        style={{background:'none',border:'none',cursor:'pointer',opacity:0.85,color:'#6366f1',display:'inline-flex',alignItems:'center',padding:2}}
                        title="Modifier l'évaluation"
                        onClick={() => ouvrirEditionEvaluation(ev)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    )}
                    {isAdmin() && (
                      <button
                        type="button"
                        style={{background:'none',border:'none',cursor:'pointer',opacity:0.85,color:'#ef4444',display:'inline-flex',alignItems:'center',padding:2}}
                        title="Supprimer l'évaluation"
                        onClick={() => handleSupprimerEvaluation(ev.id)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    );
  }

  // ===================== VUE MATIERES =====================
  if (vue === 'matieres') {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <button style={s.btnRetour} onClick={() => { setSearchParams({}); setVue('classes'); }}>← Retour</button>
          <h2 style={s.titre}>Évaluations — {classeNom}</h2>
          {isAdmin() && <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, whiteSpace: 'nowrap' }}>Mode admin — accès complet</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'inline-flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 }}>
            {[{ id: '1', label: '1er semestre' }, { id: '2', label: '2e semestre' }].map(sem => {
              const disabled = (sem.id === '2' && !sem1Bloque && !isAdmin()) || (sem.id === '1' && sem1Bloque && !isAdmin());
              return (
                <button key={sem.id} disabled={disabled}
                  onClick={async () => { setEvalSemestre(sem.id); await chargerEvaluationsId(classeSelectionnee, null, sem.id); }}
                  style={{ padding: '7px 16px', borderRadius: 17, border: 'none', background: evalSemestre === sem.id ? '#6366f1' : 'transparent', color: evalSemestre === sem.id ? 'white' : '#6d28d9', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: evalSemestre === sem.id ? 700 : 600, fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: disabled ? 0.4 : 1 }}>
                  {sem.label}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ ...s.tblWrap, marginTop: 4 }}>
        <table style={{ ...s.tbl, tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: COL_OEIL_DETAIL }} />
            <col style={{ width: 180 }} />
            <col style={{ width: 'calc((100% - 232px) / 2)' }} />
            <col style={{ width: 'calc((100% - 232px) / 2)' }} />
          </colgroup>
          <thead>
            <tr style={s.theadRow}>
              <th style={{ ...s.th, width: COL_OEIL_DETAIL, minWidth: COL_OEIL_DETAIL, maxWidth: COL_OEIL_DETAIL, textAlign: 'center', borderTopLeftRadius: 12, boxSizing: 'border-box' }} aria-label="Ouvrir" />
              <th style={{ ...s.th, whiteSpace: 'nowrap' }}>Matière</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Moyennes de classe</th>
              <th style={{ ...s.th, textAlign: 'center', borderTopRightRadius: 12 }}>Évaluations</th>
            </tr>
          </thead>
          <tbody>
            {matieres.filter(m => (!classeObj?.niveau || m.niveau === classeObj.niveau) && m.suivi_notes !== false).length === 0 ? (
              <tr><td colSpan="4" style={s.vide}>Aucune matière disponible pour ce niveau</td></tr>
            ) : matieres.filter(m => (!classeObj?.niveau || m.niveau === classeObj.niveau) && m.suivi_notes !== false).map((m, i) => {
              const evalsMatiere = evaluations.filter(ev => ev.matiere_id === m.id && String(ev.semestre) === evalSemestre);
              const nbEvals = evalsMatiere.length;
              const moyennesMatiere = evalsMatiere
                .map(ev => parseFloat(ev.moyenne_classe))
                .filter(v => !isNaN(v));
              const moyenneBranche = moyennesMatiere.length
                ? Math.round((moyennesMatiere.reduce((a, b) => a + b, 0) / moyennesMatiere.length) * 10) / 10
                : null;
              return (
                <tr key={m.id} style={{ ...s.tr, background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                  <td style={{ ...s.td, whiteSpace: 'nowrap', width: COL_OEIL_DETAIL, minWidth: COL_OEIL_DETAIL, maxWidth: COL_OEIL_DETAIL, textAlign: 'center', boxSizing: 'border-box' }}>
                    <button type="button" style={{ ...s.btnDetail, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 6 }} title="Ouvrir la matière" onClick={() => ouvrirMatiere(m)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 13a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>
                    </button>
                  </td>
                  <td style={{ ...s.td, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{m.nom}</td>
                  <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, color: moyenneBranche == null ? '#94a3b8' : (moyenneBranche >= 4 ? '#2e7d32' : '#ef4444') }}>
                    {moyenneBranche == null ? '—' : fmtNote(moyenneBranche)}
                  </td>
                  <td style={{ ...s.td, textAlign: 'center', color: nbEvals > 0 ? '#1e293b' : '#94a3b8', fontWeight: 600 }}>
                    {nbEvals}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    );
  }

  // ===================== VUE CLASSES (point d'entrée) =====================
  // Classes visibles : admin = toutes, prof = titulaire uniquement
  const classesVisibles = isAdmin()
    ? classes.filter(c => c.actif !== false)
    : classes.filter(c => c.actif !== false && String(c.prof_principal_id) === String(currentUser.id));
  const classesFiltrees = (() => {
    let filtered = evalNiveauFiltre === 'tous' ? classesVisibles : classesVisibles.filter(c => c.niveau === evalNiveauFiltre);
    if (rechercheClasses) {
      const q = rechercheClasses.toLowerCase();
      filtered = filtered.filter(c => (c.nom || '').toLowerCase().includes(q));
    }
    return filtered;
  })();

  const niveauxPills = ['tous', ...([...new Set(classesVisibles.map(c => c.niveau).filter(Boolean))].sort().reduce((acc, n) => {
    if (n === 'CSC') return [n, ...acc];
    return [...acc, n];
  }, []))];

  return (
      <div style={s.page}>
        <div style={s.header}>
          <h2 style={s.titre}>Notes</h2>
          {isAdmin() && (
            <button type="button" onClick={async () => {
              const next = !sem1Bloque;
              await axios.put(API + '/notes/semestre-config', { sem1_bloque: next }, { headers });
              setSem1Bloque(next);
            }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 99, border: '2px solid ' + (sem1Bloque ? '#6366f1' : '#e2e8f0'), background: sem1Bloque ? '#eef2ff' : 'white', color: sem1Bloque ? '#4338ca' : '#64748b', cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.2s' }}>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: sem1Bloque ? '#6366f1' : '#e2e8f0', position: 'relative', transition: 'all 0.2s' }}>
                <div style={{ position: 'absolute', top: 2, left: sem1Bloque ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'all 0.2s' }} />
              </div>
              {sem1Bloque ? '1er semestre bloqué' : 'Bloquer 1er semestre'}
            </button>
          )}
        </div>
        {/* Barre de recherche + toggles niveaux */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <input type="text" placeholder="Rechercher une classe..." value={rechercheClasses}
            onChange={e => setRechercheClasses(e.target.value)}
            style={{ padding: '9px 14px', border: '1px solid #c7d2fe', borderRadius: 8, fontSize: 14, width: 280, outline: 'none', background: 'white', color: '#1e293b', fontFamily: 'inherit' }} />
          {!showNiveauxFiltres ? (
            <button
              onClick={() => setShowNiveauxFiltres(true)}
              style={{padding:'7px 14px',borderRadius:17,border:'1.5px solid #e2e8f0',background:'white',cursor:'pointer',fontWeight:600,color:'#94a3b8',fontSize:13,fontFamily:'inherit',whiteSpace:'nowrap'}}
            >
              Trier
            </button>
          ) : (
            <div style={{ display: 'flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 }}>
              {niveauxPills.map(n => (
                <button key={n} onClick={() => { setEvalNiveauFiltre(n); if (n === 'tous') setShowNiveauxFiltres(false); }}
                  style={evalNiveauFiltre === n
                    ? { padding: '6px 14px', borderRadius: 99, border: 'none', background: '#6366f1', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
                    : { padding: '6px 14px', borderRadius: 99, border: 'none', background: 'transparent', color: '#4c1d95', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  {n === 'tous' ? 'Trier' : n}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tableau des classes */}
        <div style={s.tblWrap}>
          <table style={{ ...s.tbl, tableLayout: 'auto', width: '100%' }}>
            <thead>
              <tr style={s.theadRow}>
                <th style={{ ...s.th, width: COL_OEIL_DETAIL, minWidth: COL_OEIL_DETAIL, maxWidth: COL_OEIL_DETAIL, whiteSpace: 'nowrap', textAlign: 'center', borderTopLeftRadius: 12, boxSizing: 'border-box' }}></th>
                <th style={{ ...s.th, width: 1, whiteSpace: 'nowrap' }}>Classe</th>
                <th style={{ ...s.th, width: '100%' }}>Responsables et évaluations</th>
                <th style={{ ...s.th, width: 1, whiteSpace: 'nowrap', textAlign: 'center', borderTopRightRadius: 12 }}></th>
              </tr>
            </thead>
            <tbody>
              {classesFiltrees.length === 0 ? (
                <tr><td colSpan={4} style={s.vide}>Aucune classe disponible.</td></tr>
              ) : classesFiltrees.map((cl, i) => {
                const respClasse = classesResponsables.filter(r => String(r.classe_id) === String(cl.id));
                const titulaires = respClasse.filter(r => r.est_titulaire);
                const autresProfs = respClasse.filter(r => !r.est_titulaire);
                const pastillesBranche = (r) =>
                  parseMatieresDetailDedup(r).map(item => (
                    <span key={item.matiere_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ color: '#6366f1', fontWeight: 600 }}>{item.label}</span>
                      <span style={{ background: '#e0e7ff', color: '#4338ca', borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{nbEvalMatiereProf(cl.id, r.prof_id, item.matiere_id)}</span>
                    </span>
                  ));
                return (
                  <tr key={cl.id} style={{ ...s.tr, background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                    <td style={{ ...s.td, textAlign: 'center', whiteSpace: 'nowrap', width: COL_OEIL_DETAIL, minWidth: COL_OEIL_DETAIL, maxWidth: COL_OEIL_DETAIL, boxSizing: 'border-box' }}>
                      <button style={{ ...s.btnDetail, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 6 }}
                        onClick={() => { setSearchParams({tab:'evaluations', classeId: cl.id}); setVueContexte('detail'); setVueClasseAction('evaluations'); ouvrirVueDepuisSelectionClasse('evaluations', cl.id); }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 13a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>
                      </button>
                    </td>
                    <td style={{ ...s.td, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', width: 1 }}>{cl.nom}</td>
                    <td style={{ ...s.td, width: '100%' }}>
                      {respClasse.length === 0 ? <span style={{ color: '#94a3b8' }}>—</span> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {titulaires.map(r => (
                            <div key={r.prof_id} style={{ fontSize: 12, color: '#1e293b', display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 6 }}>
                              <span style={{ whiteSpace: 'nowrap' }}>
                                <span style={{ fontWeight: 600 }}>Titulaire :</span>{' '}
                                <span style={{ fontWeight: 400 }}>{r.prof_prenom} {nomSansSuffixe(r.prof_nom)}</span>
                              </span>
                              {parseMatieresDetailDedup(r).length ? pastillesBranche(r) : null}
                            </div>
                          ))}
                          {autresProfs.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', columnGap: 14, rowGap: 6 }}>
                              {autresProfs.map(r => (
                                <div key={r.prof_id} style={{ fontSize: 12, color: '#1e293b', display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 6 }}>
                                  <span style={{ whiteSpace: 'nowrap' }}>{r.prof_prenom} {nomSansSuffixe(r.prof_nom)}</span>
                                  {parseMatieresDetailDedup(r).length ? pastillesBranche(r) : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center', whiteSpace: 'nowrap', width: 1 }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button style={{ padding: 6, background: '#ede9fe', color: '#5b21b6', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => { setSearchParams({tab:'comportements', classeId: cl.id}); setVueContexte('bulletin'); setVueClasseAction('comportements'); ouvrirVueDepuisSelectionClasse('comportements', cl.id); }}
                          title="Comportements">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        </button>
                        <button style={{ padding: 6, background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => { setSearchParams({tab:'bulletin', classeId: cl.id}); setVueContexte('bulletin'); setVueClasseAction('bulletin'); ouvrirVueDepuisSelectionClasse('bulletin', cl.id); }}
                          title="Bulletin de notes">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
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
  );
}

const s = {
  page: { padding: '28px 32px', background: '#f8fafc', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  tabsBar: {display:'flex',alignItems:'flex-end',gap:0,borderBottom:'2px solid #6366f1',paddingBottom:0},
  tabBtn: {padding:'9px 14px',borderRadius:'10px 10px 0 0',border:'none',background:'#ede9fe',cursor:'pointer',fontWeight:700,fontSize:14,color:'#5b21b6',outline:'none',lineHeight:'1',position:'relative',zIndex:1,width:140,minWidth:140,textAlign:'center'},
  tabBtnActif: {background:'#6366f1',color:'white',border:'none',marginBottom:-1,zIndex:2,boxShadow:'0 -1px 6px rgba(99,102,241,0.28)'},
  tabSelect: {padding:'9px 14px',borderRadius:10,border:'2px solid #4f46e5',background:'#e0e7ff',color:'#3730a3',fontWeight:700,fontSize:14,outline:'none',cursor:'pointer'},
  subTabsBar: {display:'flex',gap:0,marginTop:0},
  subTabBtn: {padding:'9px 14px',borderRadius:'0 0 10px 10px',fontSize:14,background:'#e0e7ff',color:'#3730a3',fontWeight:700,width:140,minWidth:140,textAlign:'center',border:'none',cursor:'pointer',outline:'none',position:'relative',zIndex:1,lineHeight:1},
  subTabBtnActif: {background:'#4f46e5',color:'white',zIndex:2,boxShadow:'0 4px 6px rgba(79,70,229,0.18)'},
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  btnRetour: { padding: '7px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#475569' },
  btnTopAction: { padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  titre: { fontSize: 22, fontWeight: 800, flex: 1, color: '#0f172a', margin: 0, lineHeight: 1, minHeight: 36, display: 'flex', alignItems: 'center' },
  evalInfo: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  select: { height:36, padding:'0 14px', boxSizing:'border-box', borderRadius:8, border:'1px solid #c7d2fe', background:'white', color:'#1e293b', fontWeight:400, fontSize:13, outline:'none', cursor:'pointer', fontFamily:'inherit' },
  moyenneBox: { background: 'white', padding: '10px 18px', borderRadius: 10, textAlign: 'center', border: '1px solid #e2e8f0' },
  moyenneLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' },
  moyenneValeur: { fontSize: 22, fontWeight: 700, color: '#6366f1' },
  btnSauver: { padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnImprimer: { padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  successMsg: { background: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: 8, marginBottom: 12, fontWeight: 600, fontSize: 13 },
  tableContainer: { borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  tblWrap: { borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  btnAjouter: { padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  tbl: { width: '100%', borderCollapse: 'collapse', background: 'white' },
  theadRow: { background: '#f8fafc', borderBottom: 'none' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', position: 'static', top: 'auto', zIndex: 'auto', background: '#f8fafc', boxShadow: 'none' },
  tr: { borderBottom: 'none' },
  td: { padding: '11px 14px', fontSize: 13, color: '#374151', verticalAlign: 'middle' },
  vide: { padding: 40, textAlign: 'center', color: '#94a3b8', background: 'white' },
  typeBadge: { background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 },
  btnIconOeil: { padding: 6, background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: 6, verticalAlign: 'middle' },
  btnOuvrir: { padding: '5px 10px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, marginRight: 6 },
  btnDelete: { padding: '4px 8px', background: 'none', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: '#ef4444', fontWeight: 600, marginLeft: 4 },
  btnEdit: { padding: '4px 10px', background: '#eef2ff', color: '#6366f1', border: '1px solid #c7d2fe', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginRight: 6 },
  btnDetail: { padding: '5px 10px', background: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btnGhostPill: { padding: '7px 14px', borderRadius: 17, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#94a3b8', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' },
  btnGhostPillActif: { borderColor: '#6366f1', background: '#e0e7ff', color: '#4338ca' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 },
  noteInput: { width: 72, padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 15, fontWeight: 700, textAlign: 'center' },
  commentInput: { padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, width: '100%', boxSizing: 'border-box' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  formChamp: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#64748b' },
  input: { padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  btnAnnuler: { padding: '8px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#64748b' },
  card: { background: 'white', borderRadius: 12, padding: 18, border: '1px solid #f1f5f9' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', borderRadius: 14, padding: 28, maxWidth: 520, width: '95%', boxShadow: '0 16px 48px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' },
  infoBox: { background: '#f8fafc', borderRadius: 8, padding: '8px 14px', minWidth: 140, border: '1px solid #f1f5f9' },
  infoLabel: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: 700, color: '#0f172a' },
  bulletinMatiereTitre: { display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '8px 14px', borderRadius: 8, marginBottom: 6, fontWeight: 600, border: '1px solid #e2e8f0' },
  moyenneGeneraleBox: { background: '#f1f5f9', padding: '14px 18px', borderRadius: 10, marginTop: 18, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #e2e8f0' },
  bulletinPDF: { background: 'white', padding: 30, borderRadius: 12, maxWidth: 800, margin: '0 auto', border: '1px solid #e2e8f0' },
  bulletinPDFHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' },
  signatures: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 40 },
  signatureBox: { textAlign: 'center' },
  signatureLine: { height: 1, background: '#94a3b8', marginBottom: 8 },
  signatureLabel: { fontSize: 12, color: '#64748b' },
};
