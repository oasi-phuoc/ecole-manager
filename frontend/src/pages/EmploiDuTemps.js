/* eslint-disable */
import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { stickyPageChrome } from '../styles/pageShell';
import { injectForcedPrintCss, openPrintPopup } from '../utils/print';
import CustomSelect from '../components/CustomSelect';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';
const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];
const BASE_PERIODES_TAUX = 40;
const SALLES_FIXES_PAR_LIEU = {
  creuset: ['Salle 1', 'Salle 2', 'Salle 3'],
  botza: ['Salle 1', 'Salle 2', 'Salle 3', 'Salle 4'],
  synecom: ['Salle 11', 'Salle 12', 'Salle 13', 'Salle 21', 'Salle 22', 'Salle 23', 'Salle 24', 'Salle 25', 'Salle 26'],
};

const COULEURS_CLASSES_DISPONIBLES = [
  '#fee2e2', '#fed7aa', '#fde68a', '#fef08a', '#d9f99d', '#bbf7d0', '#a7f3d0', '#99f6e4', '#a5f3fc', '#bae6fd',
  '#bfdbfe', '#c7d2fe', '#ddd6fe', '#e9d5ff', '#fbcfe8',
  '#fca5a5', '#fdba74', '#fcd34d', '#fde047', '#bef264', '#86efac', '#6ee7b7', '#5eead4', '#67e8f9', '#7dd3fc',
  '#93c5fd', '#a5b4fc', '#c4b5fd', '#d8b4fe', '#f9a8d4'
];
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
const PAUSES_PAR_PERIODE_DEFAUT = {
  Matin: { debut: '09:45', fin: '10:05' },
  'Après-midi': { debut: '15:00', fin: '15:20' },
};
const PERIODES_PAR_NIVEAU = { CSC: 24, CFR: 20, EPL: 20 };
const nomSansSuffixe = (nom) => String(nom || '').split('-')[0].trim();
const formaterNomComplet = (s) => String(s || '').replace(/(^|\s)(\S*?)-\S+$/, '$1$2').trim();
const normaliserLieuTravail = (v) => String(v || '').trim().toLowerCase();
const parseNiveaux = (valeur) => {
  if (!valeur) return [];
  if (Array.isArray(valeur)) return valeur.map(v => String(v).trim()).filter(Boolean);
  return String(valeur).split(',').map(v => v.trim()).filter(Boolean);
};
const niveauxSeChevauchent = (a, b) => {
  const setA = new Set(parseNiveaux(a).map(n => n.toUpperCase()));
  if (!setA.size) return false;
  return parseNiveaux(b).some(n => setA.has(n.toUpperCase()));
};
const normaliserIdsPrefBranches = (valeur) => {
  if (!valeur) return [];
  if (Array.isArray(valeur)) return valeur.map(v => String(v).trim()).filter(Boolean);
  const brut = String(valeur).trim();
  if (!brut) return [];
  try {
    const parsed = JSON.parse(brut);
    if (Array.isArray(parsed)) return parsed.map(v => String(v).trim()).filter(Boolean);
  } catch {}
  const nettoye = brut.replace(/^\{|\}$/g, '').replace(/"/g, '');
  return nettoye.split(',').map(v => String(v).trim()).filter(Boolean);
};

export default function EmploiDuTemps() {
  const clonePausesParPeriode = (source = PAUSES_PAR_PERIODE_DEFAUT) => ({
    Matin: { ...(source?.Matin || PAUSES_PAR_PERIODE_DEFAUT.Matin) },
    'Après-midi': { ...(source?.['Après-midi'] || PAUSES_PAR_PERIODE_DEFAUT['Après-midi']) },
  });
  const [searchParams] = useSearchParams();
  const onglet = searchParams.get('tab') || (isAdmin() ? 'pools' : 'plannings');
  const [sousOngletPlanning, setSousOngletPlanning] = useState('classes');
  const [sousOngletAff, setSousOngletAff] = useState('classes');
  const [sousOngletDisp, setSousOngletDisp] = useState('tous');
  const [showPoolsFiltresDispo, setShowPoolsFiltresDispo] = useState(false);
  const [profs, setProfs] = useState([]);
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [creneaux, setCreneaux] = useState([]);
  const [pools, setPools] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [affectationsDraft, setAffectationsDraft] = useState([]);
  const [hasAffectationsUnsaved, setHasAffectationsUnsaved] = useState(false);
  const [titulariatsDraftByProf, setTitulariatsDraftByProf] = useState({});
  const [branchesMatiereDraftMap, setBranchesMatiereDraftMap] = useState({});
  const [hasBranchesUnsaved, setHasBranchesUnsaved] = useState(false);
  const [affectationModes, setAffectationModes] = useState({});
  const [couleursClassesMap, setCouleursClassesMap] = useState({});
  const [classeCouleurEditionId, setClasseCouleurEditionId] = useState('');
  const [couleursProfsMap, setCouleursProfsMap] = useState({});
  const [profCouleurEditionId, setProfCouleurEditionId] = useState('');
  const [couleursBranchesMap, setCouleursBranchesMap] = useState({});
  const [brancheCouleurEditionId, setBrancheCouleurEditionId] = useState('');
  const [classeHoraires, setClasseHoraires] = useState([]);
  const [classeHorairesSaved, setClasseHorairesSaved] = useState([]);
  const [hasClassesUnsaved, setHasClassesUnsaved] = useState(false);
  const [profSelectionne, setProfSelectionne] = useState(null);
  const [dispos, setDispos] = useState({});
  const [disposAffectations, setDisposAffectations] = useState({});
  const [planningGeneral, setPlanningGeneral] = useState(null);
  const [planningPoolId, setPlanningPoolId] = useState('');
  const [jourPlanningFiltre, setJourPlanningFiltre] = useState('tous');
  const [showJoursFiltres, setShowJoursFiltres] = useState(false);
  const [planningProf, setPlanningProf] = useState(null);
  const [profPlanningId, setProfPlanningId] = useState('');
  const [planningClasse, setPlanningClasse] = useState(null);
  const [classePlanningId, setClassePlanningId] = useState('');
  const [classePlanningPoolId, setClassePlanningPoolId] = useState('');
  const [sallesLieuTravailId, setSallesLieuTravailId] = useState('');
  const [salleSelectionnee, setSalleSelectionnee] = useState('');
  const [modeAffectationRapideClasse, setModeAffectationRapideClasse] = useState(false);
  const [classeRapideId, setClasseRapideId] = useState('');
  const [classeRapideId2, setClasseRapideId2] = useState('');
  const [sallesDraftMap, setSallesDraftMap] = useState({});
  const [hasSallesUnsaved, setHasSallesUnsaved] = useState(false);
  const [remarquesDispo, setRemarquesDispo] = useState('');
  const [allDispos, setAllDispos] = useState([]);
  const [rechercheProfDispo, setRechercheProfDispo] = useState('');
  const [coursEmploiDuTemps, setCoursEmploiDuTemps] = useState([]);
  const [planningBranches, setPlanningBranches] = useState([]);
  const [showPoolForm, setShowPoolForm] = useState(false);
  const [poolEdit, setPoolEdit] = useState(null);
  const [poolForm, setPoolForm] = useState({nom:'',site:'',couleur:'#6366f1',niveau:'',prof_ids:[],classe_ids:[],branche_ids:[],horaires:[...HORAIRES_DEFAUT]});
  const [pausesParPeriode, setPausesParPeriode] = useState(() => clonePausesParPeriode(PAUSES_PAR_PERIODE_DEFAUT));
  const [pausesParPeriodeForm, setPausesParPeriodeForm] = useState(() => clonePausesParPeriode(PAUSES_PAR_PERIODE_DEFAUT));
  const [poolAffId, setPoolAffId] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  // Données (niveaux, lieux, salles) pour les sélecteurs
  const [niveauxDB, setNiveauxDB] = useState([]);
  const [lieuxTravailDB, setLieuxTravailDB] = useState([]);
  const [sallesDB, setSallesDB] = useState([]);
  const [parametresHoraires, setParametresHoraires] = useState({});
  const dragPoolIdx = useRef(null);
  const [dragOverPool, setDragOverPool] = useState(null);
  const navigate = useNavigate();
  const headers = {};

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 2200);
  };

  useEffect(() => { chargerTout(); chargerDonnees(); }, []);

  useEffect(() => {
    if (onglet === 'disponibilites') {
      axios.get(API + '/profs', { headers }).then(r => setProfs(r.data.filter(x => x.actif !== false))).catch(() => {});
      axios.get(API + '/planning/disponibilites', { headers }).then(r => setAllDispos(r.data)).catch(() => {});
    }
    if (onglet === 'plannings') setSousOngletPlanning('classes');
    if (onglet === 'affectations') setSousOngletAff('classes');
  }, [onglet]);

  const chargerDonnees = async () => {
    try {
      const [niv, lieux, salles] = await Promise.all([
        axios.get(API + '/donnees/niveaux', { headers }),
        axios.get(API + '/donnees/lieux-travail', { headers }),
        axios.get(API + '/donnees/salles', { headers }),
      ]);
      setNiveauxDB(niv.data || []);
      setLieuxTravailDB(lieux.data || []);
      setSallesDB(salles.data || []);
    } catch(err) { console.error(err); }
    try {
      const par = await axios.get(API + '/parametres/ecole', { headers });
      const h = par.data?.horaires || {};
      setParametresHoraires(typeof h === 'string' ? JSON.parse(h) : h);
    } catch(err) { console.error('parametres horaires:', err); }
  };

  const reorderPools = async (from, to) => {
    if (from === to) return;
    const list = [...pools];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setPools(list);
    await Promise.all(list.map((p, i) => axios.put(API + '/planning/pools/' + p.id, { nom: p.nom, site: p.site, couleur: p.couleur, niveau: p.niveau, prof_ids: (p.profs||[]).map(x=>x.id), classe_ids: (p.classes||[]).map(x=>x.id), branche_ids: (p.branches||[]).map(x=>x.id), horaires: p.horaires, ordre: i + 1 }, { headers })));
  };

  const horaireParamToPool = (horaireParam) => {
    if (!horaireParam || (!horaireParam.matin && !horaireParam.apresmidi)) {
      return { poolHoraires: [...HORAIRES_DEFAUT], pauses: clonePausesParPeriode() };
    }
    const poolHoraires = [];
    const pauses = clonePausesParPeriode();
    let nm = 1, na = 1;
    (horaireParam.matin || []).forEach(p => {
      if (p.label === 'Pause') { pauses.Matin = { debut: p.debut, fin: p.fin }; }
      else { poolHoraires.push({ periode: 'Matin', num: nm++, debut: p.debut, fin: p.fin }); }
    });
    (horaireParam.apresmidi || []).forEach(p => {
      if (p.label === 'Pause') { pauses['Après-midi'] = { debut: p.debut, fin: p.fin }; }
      else { poolHoraires.push({ periode: 'Après-midi', num: na++, debut: p.debut, fin: p.fin }); }
    });
    if (poolHoraires.length !== 8) return { poolHoraires: [...HORAIRES_DEFAUT], pauses: clonePausesParPeriode() };
    return { poolHoraires, pauses };
  };

  const getHoraireForLieu = (lieuNom, lieux, paramH) => {
    const h = paramH || parametresHoraires;
    const l = lieux || lieuxTravailDB;
    if (lieuNom) {
      const lieu = l.find(x => x.nom === lieuNom);
      if (lieu && h[String(lieu.id)]) return horaireParamToPool(h[String(lieu.id)]);
    }
    return horaireParamToPool(h['defaut']);
  };

  const chargerTout = async () => {
    try {
      const [p, cl, m, cr, po, af, ch, edt, cc, pc, bc] = await Promise.all([
        axios.get(API + '/profs', { headers }),
        axios.get(API + '/classes', { headers }),
        axios.get(API + '/branches', { headers }),
        axios.get(API + '/planning/creneaux', { headers }),
        axios.get(API + '/planning/pools', { headers }),
        axios.get(API + '/planning/affectations', { headers }),
        axios.get(API + '/planning/classe-horaires', { headers }),
        axios.get(API + '/emploi-du-temps', { headers }),
        axios.get(API + '/planning/classe-couleurs', { headers }),
        axios.get(API + '/planning/prof-couleurs', { headers }),
        axios.get(API + '/planning/branche-couleurs', { headers }),
      ]);
      setProfs(p.data.filter(x => x.actif !== false));
      setClasses(cl.data);
      setMatieres(m.data);
      setCreneaux(cr.data);
      setPools(po.data);
      setAffectations(af.data);
      setAffectationsDraft(af.data || []);
      setClasseHoraires(ch.data);
      setClasseHorairesSaved(ch.data || []);
      setCoursEmploiDuTemps(edt.data || []);
      const couleursMap = (cc.data || []).reduce((acc, row) => {
        acc[String(row.classe_id)] = row.couleur;
        return acc;
      }, {});
      setCouleursClassesMap(couleursMap);
      const couleursProfs = (pc.data || []).reduce((acc, row) => {
        acc[String(row.prof_id)] = row.couleur;
        return acc;
      }, {});
      setCouleursProfsMap(couleursProfs);
      const couleursBranches = (bc.data || []).reduce((acc, row) => {
        acc[String(row.matiere_id)] = row.couleur;
        return acc;
      }, {});
      setCouleursBranchesMap(couleursBranches);
      setHasAffectationsUnsaved(false);
      setBranchesMatiereDraftMap({});
      setHasBranchesUnsaved(false);
      setHasClassesUnsaved(false);
    } catch(err) { console.error(err); }
  };

  const chargerDisposAffectations = async (pool_id = poolAffId) => {
    try {
      const url = API + '/planning/general' + (pool_id ? '?pool_id=' + pool_id : '');
      const r = await axios.get(url, { headers });
      const map = {};
      (r.data?.dispos || []).forEach(d => { map[`${d.prof_id}-${d.creneau_id}`] = d.disponible; });
      setDisposAffectations(map);
    } catch (err) {
      console.error(err);
      setDisposAffectations({});
    }
  };

  useEffect(() => {
    if (onglet === 'affectations' && sousOngletAff === 'profs') {
      chargerDisposAffectations(poolAffId);
    }
  }, [onglet, sousOngletAff, poolAffId]);

  useEffect(() => {
    setSalleSelectionnee('');
    setModeAffectationRapideClasse(false);
    setClasseRapideId('');
    setClasseRapideId2('');
  }, [sallesLieuTravailId]);

  const chargerDispos = async (prof_id) => {
    const [rDispos, rRemarque] = await Promise.all([
      axios.get(API + '/planning/disponibilites/' + prof_id, { headers }),
      axios.get(API + '/planning/disponibilites/' + prof_id + '/remarque', { headers }),
    ]);
    const map = {};
    creneaux.forEach(c => { map[c.id] = true; });
    rDispos.data.forEach(d => { map[d.creneau_id] = d.disponible; });
    setDispos(map);
    setRemarquesDispo(rRemarque?.data?.remarque || '');
    setProfSelectionne(prof_id);
  };

  const sauverDispos = async () => {
    if (!profSelectionne) { showToast('Sélectionner d\'abord un professeur.', 'error'); return; }
    if (!isAdmin()) { showToast('Action réservée aux administrateurs.', 'error'); return; }
    const prof = profs.find(p => p.id == profSelectionne);
    const periodesRequises = getPeriodesRequisesPourTaux(prof);
    const periodesSelectionnees = Object.values(dispos).filter(v => v !== false).length;
    if (periodesSelectionnees < periodesRequises) {
      const ok = window.confirm(
        `Le professeur a ${periodesSelectionnees} période(s) sélectionnée(s) alors que ${periodesRequises} sont requises.\n\nVoulez-vous vraiment sauvegarder ?`
      );
      if (!ok) return;
    }
    const liste = Object.entries(dispos).map(([creneau_id, disponible]) => ({ creneau_id: parseInt(creneau_id), disponible }));
    await Promise.all([
      axios.post(API + '/planning/disponibilites/' + profSelectionne, { disponibilites: liste }, { headers }),
      axios.post(API + '/planning/disponibilites/' + profSelectionne + '/remarque', { remarque: remarquesDispo || '' }, { headers }),
    ]);
    try {
      const rAll = await axios.get(API + '/planning/disponibilites', { headers });
      setAllDispos(rAll.data || []);
    } catch {}
    chargerDisposAffectations(poolAffId);
    showToast('Disponibilités et remarque sauvegardées.');
  };

  const toggleDispo = (creneau_id) => setDispos(prev => ({ ...prev, [creneau_id]: !prev[creneau_id] }));

  const creneauxParJourPeriode = (jour, periode) => creneaux.filter(c => c.jour===jour && c.periode===periode);

  const getPeriodesRequisesPourTaux = (prof) => {
    const taux = parseFloat(prof?.taux_activite);
    if (!Number.isFinite(taux)) return parseInt(prof?.periodes_semaine) || 0;
    // Règle métier : base 42, puis arrondi inférieur au pair pour rester cohérent avec les grilles de périodes.
    return Math.max(0, Math.floor(((BASE_PERIODES_TAUX * taux) / 100) / 2) * 2);
  };

  // Horaires du pool sélectionné ou défaut
  const getHorairesPool = (pool_id) => {
    const p = pools.find(x => x.id == pool_id);
    if (p && p.horaires && p.horaires.length === 8) return p.horaires;
    return HORAIRES_DEFAUT;
  };

  const handleSavePool = async () => {
    try {
      const niveauxSelectionnes = parseNiveaux(poolForm.niveau);
      if (!niveauxSelectionnes.length) { alert('Veuillez sélectionner au moins un niveau.'); return; }
      if (!poolForm.site) { alert('Veuillez sélectionner un lieu de travail.'); return; }
      if (totalPeriodesRequisesFormTotal !== 0 && totalPeriodesProfsForm !== 0 && totalPeriodesRequisesFormTotal < totalPeriodesProfsForm) {
        window.alert("Attention : les périodes professeurs dépassent le total requis (cours + titulariat).");
      } else if (totalPeriodesRequisesFormTotal !== 0 && totalPeriodesProfsForm !== 0 && totalPeriodesRequisesFormTotal > totalPeriodesProfsForm) {
        const manque = totalPeriodesRequisesFormTotal - totalPeriodesProfsForm;
        window.alert(`Attention : il manque ${manque} période(s) professeur par rapport au total requis.`);
      }
      const payload = { ...poolForm, niveau: niveauxSelectionnes.join(',') };
      if (poolEdit) {
        await axios.put(API + '/planning/pools/' + poolEdit.id, payload, { headers });
      } else {
        await axios.post(API + '/planning/pools', payload, { headers });
      }
      setPausesParPeriode(clonePausesParPeriode(pausesParPeriodeForm));
      setShowPoolForm(false);
      setPoolEdit(null);
      setPoolForm({nom:'',site:'',couleur:'#6366f1',niveau:'',prof_ids:[],classe_ids:[],branche_ids:[],horaires:[...HORAIRES_DEFAUT]});
      await chargerTout();
      showToast('Pool sauvegardé.');
    } catch(err) { showToast(err.response?.data?.message || err.message, 'error'); }
  };

  const toggleArr = (arr, id) => arr.includes(id) ? arr.filter(x=>x!==id) : [...arr, id];

  // Classe horaires helpers
  const classeAHoraire = (classe_id, jour, periode) =>
    classeHoraires.some(h => h.classe_id==classe_id && h.jour===jour && h.periode===periode);

  // Premier clic depuis vide -> Matin, puis alternance Matin <-> Après-midi
  const toggleClasseHoraire = async (classe_id, jour) => {
    if (!isAdmin()) return;
    const actuel = classeHoraires.find(h => h.classe_id==classe_id && h.jour===jour);
    const nouvellePeriode =
      !actuel?.periode ? 'Matin'
      : actuel.periode === 'Matin' ? 'Après-midi'
      : 'Matin';
    let nouveaux = classeHoraires.filter(h => !(h.classe_id==classe_id && h.jour===jour));
    nouveaux = [...nouveaux, {classe_id, jour, periode: nouvellePeriode}];
    setClasseHoraires(nouveaux);
    setHasClassesUnsaved(true);
  };

  const getHoraireJourClasse = (classe_id, jour) => {
    const h = classeHoraires.find(h => h.classe_id==classe_id && h.jour===jour);
    return h?.periode || '';
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
    const r = await axios.get(API + '/planning/planning-branches?pool_id=' + pool_id, { headers });
    setPlanningBranches(r.data);
  };

  const getPlanningBranche = (classe_id, matiere_id) =>
    planningBranches.find(pb => pb.classe_id==classe_id && pb.matiere_id==matiere_id);

  const handleBrancheChange = async (classe_id, matiere_id, pool_id, prof_id) => {
    if (!isAdmin()) return;
    if (!prof_id) {
      await axios.delete(API + '/planning/planning-branches', { data: {classe_id, matiere_id, pool_id}, headers });
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
      await axios.post(API + '/planning/planning-branches', { prof_id, classe_id, matiere_id, pool_id }, { headers });
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
  const classesParId = new Map(classes.map(c => [String(c.id), c]));
  const classesPoolTriees = [...classesPool].sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'));
  const niveauxPoolSelectionne = parseNiveaux(poolSelectionne?.niveau);
  const poolEstCSC = niveauxPoolSelectionne.some(n => String(n).toUpperCase() === 'CSC');
  const classesPoolIds = new Set(classesPool.map(c => String(c.id)));
  const profsPoolIds = new Set(profsPool.map(p => String(p.id)));
  const affectationsPourProfs = hasAffectationsUnsaved ? affectationsDraft : affectations;
  const affectationsPool = affectationsPourProfs.filter(a =>
    profsPoolIds.has(String(a.prof_id)) &&
    (classesPoolIds.has(String(a.classe_id)) || !!a.type_special)
  );
  const suiviClasses = classesPool.map(cl => {
    const fallbackNiveau = niveauxPoolSelectionne.length === 1 ? niveauxPoolSelectionne[0] : '';
    const niveauClasse = String(cl.niveau || fallbackNiveau || '').toUpperCase();
    const affectationsClasse = affectationsPool.filter(a => String(a.classe_id) === String(cl.id));
    const periodesNormalesAffectees = affectationsClasse.filter(a => affectationModes[a.id] !== 'soutien').length;
    const periodesSoutienAffectees = affectationsClasse.filter(a => affectationModes[a.id] === 'soutien').length;
    const periodesNormalesRequises = niveauClasse === 'CSC' ? 20 : (PERIODES_PAR_NIVEAU[niveauClasse] || 0);
    const periodesSoutienRequises = niveauClasse === 'CSC' ? 4 : 0;
    return {
      ...cl,
      niveauClasse,
      periodesNormalesAffectees,
      periodesSoutienAffectees,
      periodesNormalesRequises,
      periodesSoutienRequises
    };
  });
  const suiviClassesIncompletes = suiviClasses.filter(c =>
    c.niveauClasse === 'CSC'
      ? (c.periodesNormalesAffectees < c.periodesNormalesRequises || c.periodesSoutienAffectees < c.periodesSoutienRequises)
      : (c.periodesNormalesAffectees < c.periodesNormalesRequises)
  );
  const periodesAffecteesParProf = profsPool.reduce((acc, p) => {
    acc[p.id] = affectationsPool.filter(a => String(a.prof_id) === String(p.id)).length;
    return acc;
  }, {});
  const resumePeriodesParJour = JOURS.reduce((acc, jour) => {
    let matin = 0;
    let apresMidi = 0;
    classesPool.forEach(cl => {
      const periode = getHoraireJourClasse(cl.id, jour);
      if (periode === 'Matin') matin += 1;
      if (periode === 'Après-midi') apresMidi += 1;
    });
    acc[jour] = { matin, apresMidi };
    return acc;
  }, {});

  useEffect(() => {
    if (sousOngletAff !== 'profs') return;
    const init = {};
    classesPool.forEach((cl) => {
      const classeComplete = classesParId.get(String(cl.id));
      const profId = classeComplete?.prof_principal_id;
      if (profId && profsPoolIds.has(String(profId)) && !init[String(profId)]) {
        init[String(profId)] = String(cl.id);
      }
    });
    setTitulariatsDraftByProf(init);
  }, [sousOngletAff, poolAffId, classes, pools, profs]);

  const poolClasseP = pools.find(p => p.id == classePlanningPoolId);
  const classesPoolP = poolClasseP ? poolClasseP.classes : classes;
  const classesToutesTriees = [...classes].sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'));
  const profsPoolP = poolClasseP ? poolClasseP.profs : profs;
  const niveauxPoolPlanning = parseNiveaux(poolClasseP?.niveau).map(n => String(n).toUpperCase());
  const matieresPourPlanningClasse = matieres.filter(m =>
    niveauxPoolPlanning.length > 0 && niveauxPoolPlanning.includes(String(m.niveau || '').toUpperCase())
  );
  const matieresParId = new Map(matieres.map(m => [String(m.id), m]));
  const planningClasseAffectations = (planningClasse?.affectations || []).map((a) => {
    const key = String(a.id);
    if (!Object.prototype.hasOwnProperty.call(branchesMatiereDraftMap, key)) return a;
    const matiereIdDraft = branchesMatiereDraftMap[key] || null;
    const matiereDraft = matiereIdDraft ? matieresParId.get(String(matiereIdDraft)) : null;
    return {
      ...a,
      matiere_id: matiereIdDraft,
      matiere_nom: matiereDraft?.nom || null
    };
  });
  const classePlanningHorairesSet = new Set(
    (planningClasse?.horaires || []).map(h => `${h.jour}|${h.periode}`)
  );
  const classeAHorairePlanning = (jour, periode) => classePlanningHorairesSet.has(`${jour}|${periode}`);
  const creneauxPlanningParId = new Map((planningClasse?.creneaux || []).map((c) => [String(c.id), c]));
  const planningClasseAffectationsActives = planningClasseAffectations.filter((a) => {
    const cr = creneauxPlanningParId.get(String(a.creneau_id));
    if (!cr) return false;
    return classeAHorairePlanning(cr.jour, cr.periode);
  });
  const suiviBranchesClasse = planningClasse ? matieresPourPlanningClasse.map(m => {
    const affectees = planningClasseAffectationsActives.filter(a => String(a.matiere_id) === String(m.id)).length;
    const requises = parseInt(m.periodes_semaine) || 0;
    return { id: m.id, nom: m.nom, affectees, requises };
  }) : [];
  const profsAffectesClasse = planningClasse ? Array.from(new Set(
    planningClasseAffectationsActives
      .map(a => a.prof_id)
      .filter(Boolean)
      .map(id => String(id))
  )) : [];
  const suiviPreferencesBranches = profsAffectesClasse.map((profId) => {
    const prof = (profsPoolP || []).find(p => String(p.id) === String(profId)) || (profs || []).find(p => String(p.id) === String(profId));
    const idsPrefs = normaliserIdsPrefBranches(prof?.branches_specialites)
      .filter(id => {
        const m = matieresParId.get(String(id));
        return m && (!niveauxPoolPlanning.length || niveauxPoolPlanning.includes(String(m.niveau || '').toUpperCase()));
      });
    const affectationsProf = planningClasseAffectationsActives.filter(a => String(a.prof_id) === String(profId));
    const compteurParBranche = affectationsProf.reduce((acc, a) => {
      if (!a?.matiere_id) return acc;
      const key = String(a.matiere_id);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const idsPrefsSet = new Set(idsPrefs.map(String));
    const branchesPrefs = idsPrefs
      .map(id => {
        const matiere = matieresParId.get(String(id));
        if (!matiere) return null;
        const label = matiere.designation_courte || matiere.nom;
        const compte = compteurParBranche[String(id)] || 0;
        return { id: String(id), label, compte, affectee: compte > 0 };
      })
      .filter(Boolean);
    const compteAutres = Object.entries(compteurParBranche).reduce((sum, [matiereId, compte]) => {
      if (idsPrefsSet.has(String(matiereId))) return sum;
      return sum + (parseInt(compte, 10) || 0);
    }, 0);
    return {
      profId: String(profId),
      nom: prof ? `${prof.prenom} ${nomSansSuffixe(prof.nom)}` : `Prof ${profId}`,
      branchesPrefs,
      compteAutres
    };
  });
  const lieuxTravailMap = new Map();
  lieuxTravailDB.forEach(l => lieuxTravailMap.set(normaliserLieuTravail(l.nom), l.nom));
  pools
    .map(p => (p.site || '').trim())
    .filter(Boolean)
    .forEach(site => {
      const key = normaliserLieuTravail(site);
      if (!lieuxTravailMap.has(key)) lieuxTravailMap.set(key, site);
    });
  const lieuxTravailOptions = Array.from(lieuxTravailMap.values()).sort((a, b) => a.localeCompare(b, 'fr'));
  const poolsLieuTravail = pools.filter(p =>
    normaliserLieuTravail(p.site) === normaliserLieuTravail(sallesLieuTravailId)
  );
  const classesPourSallesMap = new Map();
  poolsLieuTravail.forEach(p => {
    (p.classes || []).forEach(cl => {
      const key = String(cl.id);
      if (!classesPourSallesMap.has(key)) {
        classesPourSallesMap.set(key, {
          ...cl,
          poolsClasseLieu: [p],
          sallesClasse: [],
        });
      } else {
        const existante = classesPourSallesMap.get(key);
        existante.poolsClasseLieu.push(p);
      }
    });
  });
  const classesPourSalles = Array.from(classesPourSallesMap.values())
    .map(cl => {
      const sallesClasse = Array.from(
        new Set(
          coursEmploiDuTemps
            .filter(c => String(c.classe_id) === String(cl.id) && (c.salle || '').trim())
            .map(c => c.salle.trim())
        )
      ).sort((a, b) => a.localeCompare(b, 'fr'));
      return {
        ...cl,
        sallesClasse
      };
    })
    .sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'));
  const sallesDisponiblesLieuDyn = Array.from(
    new Set(classesPourSalles.flatMap(cl => cl.sallesClasse))
  ).sort((a, b) => a.localeCompare(b, 'fr'));
  const sallesDBPourLieu = sallesDB
    .filter(s => normaliserLieuTravail(s.lieu_nom || '') === normaliserLieuTravail(sallesLieuTravailId))
    .map(s => s.nom);
  const sallesFixesLieu = sallesDBPourLieu.length ? sallesDBPourLieu : (SALLES_FIXES_PAR_LIEU[normaliserLieuTravail(sallesLieuTravailId)] || []);
  const sallesDisponiblesLieu = sallesFixesLieu.length ? sallesFixesLieu : sallesDisponiblesLieuDyn;
  const classesFiltreesSalles = salleSelectionnee ? classesPourSalles : [];
  const classesSallesParCellule = (jour, periode) =>
    classesFiltreesSalles.filter(cl => classeAHoraire(cl.id, jour, periode));
  const normaliserHeureCreneau = (heure) => String(heure || '').slice(0, 5);
  const getCreneauCelluleSalle = (jour, periode, ordre) =>
    creneaux.find(c => c.jour === jour && c.periode === periode && c.ordre === ordre);
  const getClassesAffectablesSalleCellule = (jour, periode, ordre) => {
    const creneau = getCreneauCelluleSalle(jour, periode, ordre);
    if (!creneau) return [];
    return classesSallesParCellule(jour, periode);
  };
  const getClasseAffecteeSalleCelluleSaved = (jour, periode, ordre) => {
    if (!salleSelectionnee) return '';
    const creneau = getCreneauCelluleSalle(jour, periode, ordre);
    if (!creneau) return '';
    const debut = normaliserHeureCreneau(creneau.heure_debut);
    const fin = normaliserHeureCreneau(creneau.heure_fin);
    const cours = coursEmploiDuTemps.find(c =>
      c.jour === jour &&
      normaliserHeureCreneau(c.heure_debut) === debut &&
      normaliserHeureCreneau(c.heure_fin) === fin &&
      String((c.salle || '').trim()) === String((salleSelectionnee || '').trim())
    );
    return cours ? String(cours.classe_id) : '';
  };
  const getClasseAffecteeSalleCellule = (jour, periode, ordre) => {
    const key = `${jour}|${periode}|${ordre}`;
    if (Object.prototype.hasOwnProperty.call(sallesDraftMap, key)) {
      return sallesDraftMap[key] || '';
    }
    return getClasseAffecteeSalleCelluleSaved(jour, periode, ordre);
  };
  const getProfAffecteSalleCellule = (jour, periode, ordre, classeId) => {
    if (!classeId) return '';
    const creneau = getCreneauCelluleSalle(jour, periode, ordre);
    if (!creneau) return '';
    const aff = (affectations || []).find(a =>
      String(a.classe_id) === String(classeId) &&
      String(a.creneau_id) === String(creneau.id)
    );
    return formaterNomComplet(aff?.prof_nom || '');
  };
  const updateCoursSalle = async (cours, nouvelleSalle) => {
    await axios.put(API + '/emploi-du-temps/' + cours.id, {
      classe_id: cours.classe_id,
      matiere_id: cours.matiere_id,
      prof_id: cours.prof_id,
      jour: cours.jour,
      heure_debut: cours.heure_debut,
      heure_fin: cours.heure_fin,
      salle: nouvelleSalle || null,
    }, { headers });
  };
  const handleAffectationSalleChange = ({ jour, periode, ordre, classeId }) => {
    if (!isAdmin() || !salleSelectionnee) return;
    const creneau = getCreneauCelluleSalle(jour, periode, ordre);
    if (!creneau) return;
    const key = `${jour}|${periode}|${ordre}`;
    const nouvelleValeur = String(classeId || '');
    const valeurSauvegardee = getClasseAffecteeSalleCelluleSaved(jour, periode, ordre) || '';
    const next = { ...sallesDraftMap };
    if (nouvelleValeur === valeurSauvegardee) {
      delete next[key];
    } else {
      next[key] = nouvelleValeur;
    }
    setSallesDraftMap(next);
    setHasSallesUnsaved(Object.keys(next).length > 0);
  };
  const handleAffectationRapideClasse = () => {
    if (!isAdmin()) return;
    if (!salleSelectionnee) return;
    const classesIdsSelectionnees = [classeRapideId, classeRapideId2].filter(Boolean);
    if (classesIdsSelectionnees.length === 0) return;

    const classesIdsUniques = Array.from(new Set(classesIdsSelectionnees.map(String)));
    const classesSelectionnees = classesIdsUniques
      .map(id => classesPourSalles.find(c => String(c.id) === String(id)))
      .filter(Boolean);

    if (classesSelectionnees.length !== classesIdsUniques.length) return;

    const nextDraft = { ...sallesDraftMap };
    let modifications = 0;
    for (const cr of creneaux) {
      const classesEligibles = classesSelectionnees.filter(cl => classeAHoraire(cl.id, cr.jour, cr.periode));
      if (!classesEligibles.length) continue;
      const classe = classesEligibles[0];
      const key = `${cr.jour}|${cr.periode}|${cr.ordre}`;
      const valeurActuelle = Object.prototype.hasOwnProperty.call(nextDraft, key)
        ? (nextDraft[key] || '')
        : (getClasseAffecteeSalleCelluleSaved(cr.jour, cr.periode, cr.ordre) || '');
      const nouvelleValeur = String(classe.id);
      const valeurSauvegardee = getClasseAffecteeSalleCelluleSaved(cr.jour, cr.periode, cr.ordre) || '';
      if (valeurActuelle === nouvelleValeur) continue;
      if (nouvelleValeur === valeurSauvegardee) {
        delete nextDraft[key];
      } else {
        nextDraft[key] = nouvelleValeur;
      }
      modifications += 1;
    }
    if (modifications === 0) return;
    setSallesDraftMap(nextDraft);
    setHasSallesUnsaved(Object.keys(nextDraft).length > 0);
  };
  const sauvegarderAffectationsSalles = async () => {
    if (!hasSallesUnsaved || Object.keys(sallesDraftMap).length === 0) {
      showToast('Aucun changement à sauvegarder.', 'info');
      return;
    }
    if (!salleSelectionnee) {
      alert("Sélectionnez d'abord une salle.");
      return;
    }
    try {
      const salleCourante = String((salleSelectionnee || '').trim());
      for (const [key, classeIdStr] of Object.entries(sallesDraftMap)) {
        const [jour, periode, ordreStr] = key.split('|');
        const ordre = Number(ordreStr);
        const creneau = getCreneauCelluleSalle(jour, periode, ordre);
        if (!creneau) continue;
        const debut = normaliserHeureCreneau(creneau.heure_debut);
        const fin = normaliserHeureCreneau(creneau.heure_fin);
        const coursDuCreneau = coursEmploiDuTemps.filter(c =>
          c.jour === jour &&
          normaliserHeureCreneau(c.heure_debut) === debut &&
          normaliserHeureCreneau(c.heure_fin) === fin
        );
        for (const c of coursDuCreneau) {
          const salleDuCours = String((c.salle || '').trim());
          if (salleDuCours === salleCourante && String(c.classe_id) !== String(classeIdStr || '')) {
            await updateCoursSalle(c, null);
          }
        }
        if (classeIdStr) {
          const coursClasse = coursDuCreneau.find(c => String(c.classe_id) === String(classeIdStr));
          if (!coursClasse) {
            await axios.post(API + '/emploi-du-temps', {
              classe_id: Number(classeIdStr),
              matiere_id: null,
              prof_id: null,
              jour,
              heure_debut: creneau.heure_debut,
              heure_fin: creneau.heure_fin,
              salle: salleSelectionnee,
            }, { headers });
          } else {
            const salleDuCoursClasse = String((coursClasse.salle || '').trim());
            if (salleDuCoursClasse !== salleCourante) {
              await updateCoursSalle(coursClasse, salleSelectionnee);
            }
          }
        }
      }
      setSallesDraftMap({});
      setHasSallesUnsaved(false);
      await chargerTout();
      showToast('Changements sauvegardés.');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Erreur lors de la sauvegarde des salles.", 'error');
    }
  };
  const abandonnerSallesNonSauvegardees = () => {
    setSallesDraftMap({});
    setHasSallesUnsaved(false);
  };
  const classesPourSallesIds = new Set(classesPourSalles.map(cl => String(cl.id)));
  const creneauxTheoriquesKeys = new Set(
    creneaux.map(c => `${c.jour}|${normaliserHeureCreneau(c.heure_debut)}|${normaliserHeureCreneau(c.heure_fin)}`)
  );
  const totalCreneauxTheoriques = creneauxTheoriquesKeys.size;
  const getCouleurClasse = (classeId) => {
    const id = String(classeId || '').trim();
    if (!id) return '#ffffff';
    const indexClasse = classes.findIndex(c => String(c.id) === id);
    if (indexClasse < 0) return '#ffffff';
    if (couleursClassesMap[id]) return couleursClassesMap[id];
    return COULEURS_CLASSES_DISPONIBLES[indexClasse % COULEURS_CLASSES_DISPONIBLES.length];
  };
  const sauverCouleurClasse = async (classeId, couleur) => {
    if (!isAdmin()) return;
    try {
      const idCible = String(classeId);
      const couleurCibleNorm = String(couleur).toLowerCase();
      const couleurActuelleCible = getCouleurClasse(idCible);
      if (String(couleurActuelleCible).toLowerCase() === couleurCibleNorm) return;

      // Trouver une autre classe qui utilise déjà cette couleur pour l'intervertir
      const autreId = classes
        .map(c => String(c.id))
        .find(id => id !== idCible && String(getCouleurClasse(id)).toLowerCase() === couleurCibleNorm);

      const requetes = [
        axios.post(API + '/planning/classe-couleurs', { classe_id: classeId, couleur }, { headers })
      ];
      if (autreId) {
        requetes.push(
          axios.post(API + '/planning/classe-couleurs', { classe_id: autreId, couleur: couleurActuelleCible }, { headers })
        );
      }
      await Promise.all(requetes);

      setCouleursClassesMap(prev => {
        const next = { ...prev };
        next[idCible] = couleur;
        if (autreId) next[autreId] = couleurActuelleCible;
        return next;
      });
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Erreur lors de l'enregistrement de la couleur.");
    }
  };
  const getCouleurProf = (profId) => {
    const id = String(profId || '').trim();
    if (!id) return '#ffffff';
    const indexProf = profs.findIndex(p => String(p.id) === id);
    if (indexProf < 0) return '#ffffff';
    if (couleursProfsMap[id]) return couleursProfsMap[id];
    return COULEURS_CLASSES_DISPONIBLES[indexProf % COULEURS_CLASSES_DISPONIBLES.length];
  };
  const sauverCouleurProf = async (profId, couleur) => {
    if (!isAdmin()) return;
    try {
      const idCible = String(profId);
      const couleurCibleNorm = String(couleur).toLowerCase();
      const couleurActuelleCible = getCouleurProf(idCible);
      if (String(couleurActuelleCible).toLowerCase() === couleurCibleNorm) return;

      // Trouver un autre prof qui utilise déjà cette couleur pour l'intervertir
      const autreId = profs
        .map(p => String(p.id))
        .find(id => id !== idCible && String(getCouleurProf(id)).toLowerCase() === couleurCibleNorm);

      const requetes = [
        axios.post(API + '/planning/prof-couleurs', { prof_id: profId, couleur }, { headers })
      ];
      if (autreId) {
        requetes.push(
          axios.post(API + '/planning/prof-couleurs', { prof_id: autreId, couleur: couleurActuelleCible }, { headers })
        );
      }
      await Promise.all(requetes);

      setCouleursProfsMap(prev => {
        const next = { ...prev };
        next[idCible] = couleur;
        if (autreId) next[autreId] = couleurActuelleCible;
        return next;
      });
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Erreur lors de l'enregistrement de la couleur.");
    }
  };
  const getCouleurTexteSurFond = (hex) => {
    const val = String(hex || '').replace('#', '');
    const ok = /^[0-9a-fA-F]{6}$/.test(val);
    if (!ok) return '#111827';
    const r = parseInt(val.slice(0, 2), 16);
    const g = parseInt(val.slice(2, 4), 16);
    const b = parseInt(val.slice(4, 6), 16);
    const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
    return luminance < 150 ? '#ffffff' : '#111827';
  };
  const getCouleurBranche = (matiereId) => {
    const id = String(matiereId || '').trim();
    if (!id) return '#ffffff';
    const indexMatiere = matieres.findIndex(m => String(m.id) === id);
    if (indexMatiere < 0) return '#ffffff';
    if (couleursBranchesMap[id]) return couleursBranchesMap[id];
    return COULEURS_CLASSES_DISPONIBLES[indexMatiere % COULEURS_CLASSES_DISPONIBLES.length];
  };
  const hasBrancheAffectee = (aff) => {
    if (!aff) return false;
    const idOk = String(aff.matiere_id || '').trim() !== '';
    const nomOk = String(aff.matiere_nom || '').trim() !== '';
    return idOk || nomOk;
  };
  const getLibelleTypeSpecial = (typeSpecial) => {
    const t = String(typeSpecial || '').trim().toLowerCase();
    if (t === 'titulariat') return 'Titulariat';
    if (t === 'atelier') return 'Atelier';
    if (t === 'autre') return 'Autre';
    return t;
  };
  const sauverCouleurBranche = async (matiereId, couleur) => {
    if (!isAdmin()) return;
    try {
      const idCible = String(matiereId);
      const couleurCibleNorm = String(couleur).toLowerCase();
      const couleurActuelleCible = getCouleurBranche(idCible);
      if (String(couleurActuelleCible).toLowerCase() === couleurCibleNorm) return;

      // Trouver une autre branche qui utilise déjà cette couleur pour l'intervertir
      const autreId = matieres
        .map(m => String(m.id))
        .find(id => id !== idCible && String(getCouleurBranche(id)).toLowerCase() === couleurCibleNorm);

      const requetes = [
        axios.post(API + '/planning/branche-couleurs', { matiere_id: matiereId, couleur }, { headers })
      ];
      if (autreId) {
        requetes.push(
          axios.post(API + '/planning/branche-couleurs', { matiere_id: autreId, couleur: couleurActuelleCible }, { headers })
        );
      }
      await Promise.all(requetes);

      setCouleursBranchesMap(prev => {
        const next = { ...prev };
        next[idCible] = couleur;
        if (autreId) next[autreId] = couleurActuelleCible;
        return next;
      });
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Erreur lors de l'enregistrement de la couleur.");
    }
  };
  const confirmerQuitterSansSauvegarder = () => {
    if (sousOngletAff === 'classes' && hasClassesUnsaved) {
      return window.confirm("Des changements dans Affectations > Classes ne sont pas sauvegardés. Quitter sans sauvegarder ?");
    }
    if (sousOngletAff === 'profs' && hasAffectationsUnsaved) {
      return window.confirm("Des changements dans Affectations > Professeurs ne sont pas sauvegardés. Quitter sans sauvegarder ?");
    }
    if (sousOngletAff === 'branches' && hasBranchesUnsaved) {
      return window.confirm("Des changements dans Affectations > Branches ne sont pas sauvegardés. Quitter sans sauvegarder ?");
    }
    if (sousOngletAff === 'salles' && hasSallesUnsaved) {
      return window.confirm("Des changements dans Affectations > Salles ne sont pas sauvegardés. Quitter sans sauvegarder ?");
    }
    return true;
  };
  const abandonnerAffectationsNonSauvegardees = () => {
    setAffectationsDraft(affectations || []);
    const init = {};
    classesPool.forEach((cl) => {
      const classeComplete = classesParId.get(String(cl.id));
      const profId = classeComplete?.prof_principal_id;
      if (profId && profsPoolIds.has(String(profId)) && !init[String(profId)]) {
        init[String(profId)] = String(cl.id);
      }
    });
    setTitulariatsDraftByProf(init);
    setHasAffectationsUnsaved(false);
  };
  const abandonnerClassesNonSauvegardees = () => {
    setClasseHoraires(classeHorairesSaved || []);
    setHasClassesUnsaved(false);
  };
  const abandonnerBranchesNonSauvegardees = () => {
    setBranchesMatiereDraftMap({});
    setHasBranchesUnsaved(false);
  };
  const abandonnerChangementsAffectationsCourants = () => {
    if (sousOngletAff === 'classes' && hasClassesUnsaved) {
      abandonnerClassesNonSauvegardees();
    }
    if (sousOngletAff === 'profs' && hasAffectationsUnsaved) {
      abandonnerAffectationsNonSauvegardees();
    }
    if (sousOngletAff === 'branches' && hasBranchesUnsaved) {
      abandonnerBranchesNonSauvegardees();
    }
    if (sousOngletAff === 'salles' && hasSallesUnsaved) {
      abandonnerSallesNonSauvegardees();
    }
  };
  const sauvegarderAffectationsProfs = async () => {
    if (!hasAffectationsUnsaved) {
      showToast('Aucun changement à sauvegarder.', 'info');
      return;
    }
    try {
      const keyFor = (a) => `${String(a.prof_id)}|${String(a.creneau_id)}`;
      const origMap = new Map((affectations || []).map(a => [keyFor(a), a]));
      const draftMap = new Map((affectationsDraft || []).map(a => [keyFor(a), a]));
      const keys = new Set([...origMap.keys(), ...draftMap.keys()]);
      const deletes = [];
      const upserts = [];

      keys.forEach((k) => {
        const orig = origMap.get(k);
        const draft = draftMap.get(k);
        if (orig && !draft) {
          deletes.push(orig.id);
          return;
        }
        if (!orig && draft) {
          upserts.push(draft);
          return;
        }
        if (orig && draft) {
          const changedClasse = String(orig.classe_id || '') !== String(draft.classe_id || '');
          const changedMatiere = String(orig.matiere_id || '') !== String(draft.matiere_id || '');
          const changedSpecial = String(orig.type_special || '') !== String(draft.type_special || '');
          if (changedClasse || changedMatiere || changedSpecial) {
            deletes.push(orig.id);
            upserts.push(draft);
          }
        }
      });

      const currentTitulaireByClasse = {};
      classesPool.forEach((cl) => {
        const classeComplete = classesParId.get(String(cl.id));
        currentTitulaireByClasse[String(cl.id)] = classeComplete?.prof_principal_id
          ? String(classeComplete.prof_principal_id)
          : '';
      });
      const desiredTitulaireByClasse = {};
      classesPool.forEach((cl) => { desiredTitulaireByClasse[String(cl.id)] = ''; });
      Object.entries(titulariatsDraftByProf || {}).forEach(([profId, classeId]) => {
        if (!classeId) return;
        if (!Object.prototype.hasOwnProperty.call(desiredTitulaireByClasse, String(classeId))) return;
        desiredTitulaireByClasse[String(classeId)] = String(profId);
      });
      const updatesTitulaires = classesPool
        .map(cl => String(cl.id))
        .filter(classeId => String(currentTitulaireByClasse[classeId] || '') !== String(desiredTitulaireByClasse[classeId] || ''))
        .map(classeId => ({
          classe_id: Number(classeId),
          prof_id: desiredTitulaireByClasse[classeId] ? Number(desiredTitulaireByClasse[classeId]) : null
        }));

      if (!deletes.length && !upserts.length && !updatesTitulaires.length) {
        showToast('Aucun changement à sauvegarder.', 'info');
        setHasAffectationsUnsaved(false);
        return;
      }

      for (const id of deletes) {
        await axios.delete(API + '/planning/affectations/' + id, { headers });
      }
      for (const a of upserts) {
        await axios.post(API + '/planning/affectations', {
          prof_id: a.prof_id,
          classe_id: a.classe_id || null,
          matiere_id: a.matiere_id || null,
          creneau_id: a.creneau_id,
          type_special: a.type_special || null,
        }, { headers });
      }
      for (const t of updatesTitulaires) {
        await axios.post(API + '/planning/titulaires', t, { headers });
      }
      await chargerTout();
      showToast('Changements sauvegardés.');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Erreur lors de la sauvegarde des affectations professeurs.", 'error');
    }
  };
  const sauvegarderAffectationsBranches = async () => {
    if (!hasBranchesUnsaved) {
      showToast('Aucun changement à sauvegarder.', 'info');
      return;
    }
    if (!classePlanningId || !planningClasse) {
      alert("Sélectionnez d'abord une classe.");
      return;
    }
    try {
      const affects = planningClasse.affectations || [];
      for (const aff of affects) {
        const key = String(aff.id);
        if (!Object.prototype.hasOwnProperty.call(branchesMatiereDraftMap, key)) continue;
        const nouvelleMatiere = branchesMatiereDraftMap[key] || null;
        const actuelle = aff.matiere_id || null;
        if (String(actuelle || '') === String(nouvelleMatiere || '')) continue;
        await axios.post(API + '/planning/affectations', {
          prof_id: aff.prof_id,
          classe_id: classePlanningId,
          matiere_id: nouvelleMatiere,
          creneau_id: aff.creneau_id,
          type_special: aff.type_special || null,
        }, { headers });
      }
      await chargerTout();
      await chargerPlanningClasse(classePlanningId, classePlanningPoolId);
      setBranchesMatiereDraftMap({});
      setHasBranchesUnsaved(false);
      showToast('Changements sauvegardés.');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Erreur lors de la sauvegarde des branches.", 'error');
    }
  };
  const sauvegarderAffectationsClasses = async () => {
    if (!hasClassesUnsaved) {
      showToast('Aucun changement à sauvegarder.', 'info');
      return;
    }
    try {
      const byClass = (liste) => {
        const map = new Map();
        (liste || []).forEach((h) => {
          const id = String(h.classe_id);
          if (!map.has(id)) map.set(id, []);
          map.get(id).push({ jour: h.jour, periode: h.periode });
        });
        return map;
      };
      const savedMap = byClass(classeHorairesSaved);
      const draftMap = byClass(classeHoraires);
      const allIds = new Set([...savedMap.keys(), ...draftMap.keys()]);
      const classesModifiees = [];
      for (const classeId of allIds) {
        const saved = (savedMap.get(classeId) || []).map(x => `${x.jour}|${x.periode}`).sort().join(',');
        const draft = (draftMap.get(classeId) || []).map(x => `${x.jour}|${x.periode}`).sort().join(',');
        if (saved === draft) continue;
        classesModifiees.push(String(classeId));
        await axios.post(API + '/planning/classe-horaires/' + classeId, {
          horaires: draftMap.get(classeId) || []
        }, { headers });
      }

      // Nettoyage des anciennes affectations hors demi-journées autorisées.
      if (classesModifiees.length) {
        const creneauParId = new Map((creneaux || []).map(cr => [String(cr.id), cr]));
        const classesSet = new Set(classesModifiees);
        for (const aff of (affectations || [])) {
          const classeId = String(aff?.classe_id || '');
          if (!classesSet.has(classeId)) continue;
          const cr = creneauParId.get(String(aff?.creneau_id || ''));
          if (!cr) continue;
          const autorises = new Set((draftMap.get(classeId) || []).map(h => `${h.jour}|${h.periode}`));
          const estAutorise = autorises.has(`${cr.jour}|${cr.periode}`);
          if (!estAutorise) {
            await axios.delete(API + '/planning/affectations/' + aff.id, { headers });
          }
        }
      }

      await chargerTout();
      if (classePlanningId) await chargerPlanningClasse(classePlanningId, classePlanningPoolId);
      showToast('Changements sauvegardés.');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Erreur lors de la sauvegarde des classes.", 'error');
    }
  };
  const getClasseIdDepuisValeurAffectation = (valeur) => {
    const texte = String(valeur || '');
    if (!texte) return '';
    if (texte.startsWith('special:')) return '';
    if (texte.startsWith('soutien:')) return texte.split(':')[1] || '';
    return texte;
  };
  const suiviSalles = sallesDisponiblesLieu.map(salle => {
    const coursSalleFiltres = coursEmploiDuTemps.filter(c =>
      classesPourSallesIds.has(String(c.classe_id)) &&
      String((c.salle || '').trim()) === String(salle)
    );
    const creneauxSalleKeys = new Set(
      coursSalleFiltres.map(c => `${c.jour}|${normaliserHeureCreneau(c.heure_debut)}|${normaliserHeureCreneau(c.heure_fin)}`)
    );
    const coursSalle = creneauxSalleKeys.size;
    const complet = totalCreneauxTheoriques > 0 && coursSalle === totalCreneauxTheoriques;
    return { salle, coursSalle, complet };
  });

  const niveauxPoolForm = parseNiveaux(poolForm.niveau);
  const classesSelectionneesForm = classes.filter(c => poolForm.classe_ids.includes(c.id));
  const totalPeriodesCoursForm = classesSelectionneesForm.reduce((sum, c) => {
    const fallbackNiv = niveauxPoolForm.length === 1 ? niveauxPoolForm[0] : '';
    const niv = String(c.niveau || fallbackNiv || '').toUpperCase();
    const nb = PERIODES_PAR_NIVEAU[niv] || 0;
    return sum + nb;
  }, 0);
  const totalPeriodesTitulariatForm = classesSelectionneesForm.length;
  const totalPeriodesRequisesFormTotal = totalPeriodesCoursForm + totalPeriodesTitulariatForm;
  const profsSelectionnesForm = profs.filter(p => poolForm.prof_ids.includes(p.id));
  const totalPeriodesProfsForm = profsSelectionnesForm.reduce((sum, p) => sum + (parseInt(p.periodes_semaine) || 0), 0);
  const couleurPeriodesRequises = totalPeriodesProfsForm >= totalPeriodesRequisesFormTotal ? '#16a34a' : '#dc2626';
  const couleurPeriodesProfs = totalPeriodesProfsForm >= totalPeriodesRequisesFormTotal ? '#16a34a' : '#dc2626';
  const profDispoSelectionne = profs.find(p => String(p.id) === String(profSelectionne));
  const periodesRequisesDispo = profDispoSelectionne ? getPeriodesRequisesPourTaux(profDispoSelectionne) : 0;
  const periodesSelectionneesDispo = Object.values(dispos).filter(v => v !== false).length;
  const couleurCompteurDispo = periodesSelectionneesDispo < periodesRequisesDispo ? '#dc2626' : '#16a34a';
  const profsTriesPrenomNom = [...profs].sort((a, b) => {
    const prenomCmp = String(a?.prenom || '').localeCompare(String(b?.prenom || ''), 'fr', { sensitivity: 'base' });
    if (prenomCmp !== 0) return prenomCmp;
    return String(a?.nom || '').localeCompare(String(b?.nom || ''), 'fr', { sensitivity: 'base' });
  });
  const LARGEUR_COLONNE_CRENEAU = 128;
  const STYLE_COLONNE_CRENEAU = {
    width: LARGEUR_COLONNE_CRENEAU,
    minWidth: LARGEUR_COLONNE_CRENEAU,
    maxWidth: LARGEUR_COLONNE_CRENEAU
  };
  const LARGEUR_COLONNE_JOUR = `calc((100% - ${LARGEUR_COLONNE_CRENEAU}px) / ${JOURS.length})`;
  const LARGEUR_COLONNE_PERIODE_UI = 46;
  const HAUTEUR_LIGNE_COURS_UI = 56;
  const HAUTEUR_LIGNE_PAUSE_UI = 42;
  const STYLE_TD_HORAIRE_UI = {background:'#f8f9fa',fontWeight:600,fontSize:12,whiteSpace:'nowrap',textAlign:'center',verticalAlign:'middle'};
  const STYLE_TD_COURS_UI = {textAlign:'center',verticalAlign:'middle',fontSize:12};
  const STYLE_TD_PAUSE_UI = {background:'#000000',color:'#ffffff',fontWeight:700,fontSize:12,textAlign:'center',verticalAlign:'middle'};
  const escapeHtml = (val) => String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const toPrintColor = (val) => {
    const c = String(val || '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
    return '';
  };
  const formaterPrenomEntete = (prenom) => {
    const brut = String(prenom || '').trim();
    if (!brut) return '';
    return brut.charAt(0).toUpperCase() + brut.slice(1).toLowerCase();
  };
  const baseCreneauxPeriode = (liste, periode) =>
    (liste || [])
      .filter(c => c.jour === 'Lundi' && c.periode === periode)
      .sort((a, b) => Number(a.ordre || 0) - Number(b.ordre || 0));
  const withPrintLayout = (titre, contenu, options = {}) => {
    const pageSize = options?.paysage ? 'A4 landscape' : 'A4 portrait';
    const compactClasses = !!options?.compactClasses;
    return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(titre)}</title>
        <style>
          @page { size: ${pageSize}; margin: 12mm 20mm; }
          body { font-family: Arial, sans-serif; margin: 16px; color: #111827; }
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          h1 { margin: 0 0 24px; font-size: 40px; }
          h2 { margin: 18px 0 8px; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0 18px; table-layout: fixed; }
          th, td { border: 1px solid #d1d5db; padding: 6px; font-size: 11px; text-align: center; vertical-align: middle; word-break: break-word; overflow-wrap: anywhere; }
          th { background: #f3f4f6; }
          col.creneau-col { width: ${LARGEUR_COLONNE_CRENEAU}px; min-width: ${LARGEUR_COLONNE_CRENEAU}px; max-width: ${LARGEUR_COLONNE_CRENEAU}px; }
          col.day-col { width: auto; }
          .creneau { width: ${LARGEUR_COLONNE_CRENEAU}px; min-width: ${LARGEUR_COLONNE_CRENEAU}px; max-width: ${LARGEUR_COLONNE_CRENEAU}px; text-align: left; white-space: nowrap; background: #f9fafb; font-weight: 700; }
          .periode { background: #000000; color: #ffffff; font-weight: 700; text-align: left; }
          .section { page-break-inside: avoid; page-break-after: always; margin-bottom: 12px; }
          .section:last-child { page-break-after: auto; }
          .section { break-inside: avoid; break-after: page; }
          .section:last-child { break-after: auto; }
          ${compactClasses ? `
          h1 { margin-bottom: 18px; font-size: 36px; }
          h2 { margin: 10px 0 6px; font-size: 14px; }
          table { margin: 4px 0 10px; }
          th, td { padding: 4px; font-size: 10px; line-height: 1.15; }
          .creneau { font-size: 10px; }
          ` : ''}
        </style>
      </head>
      <body>
        <h1>${escapeHtml(titre)}</h1>
        ${contenu}
      </body>
    </html>
  `;
  };
  const buildPlanningTableHtml = ({ creneauxListe, getCellText, getCellData, showPauseRows = false }) => {
    const HAUTEUR_LIGNE_COURS = 56;
    const HAUTEUR_LIGNE_PAUSE = 42;
    const fetchCellData = (cr, jour, periode) => {
      if (!cr) return { text: '' };
      if (getCellData) return getCellData(cr, jour, periode) || { text: '' };
      return { text: getCellText ? getCellText(cr, jour, periode) : '' };
    };
    const countParJour = (jour) => (creneauxListe || []).reduce((acc, cr) => {
      if (cr.jour !== jour) return acc;
      const data = fetchCellData(cr, jour, cr.periode);
      return data && data.text ? acc + 1 : acc;
    }, 0);
    const lignes = [];
    ['Matin', 'Après-midi'].forEach((periode, periodeIdx) => {
      const base = baseCreneauxPeriode(creneauxListe, periode);
      if (!base.length) return;
      const numRows = base.length + (showPauseRows ? 1 : 0);
      base.forEach((crBase, idx) => {
        const isFirstRow = idx === 0;
        const isLastRow = idx === base.length - 1;
        const topEdge = isFirstRow ? 'border-top:2px solid #a5b4fc;' : '';
        const bottomEdge = isLastRow ? 'border-bottom:2px solid #a5b4fc;' : '';
        const cellules = JOURS.map((jour, jdx) => {
          const isLastCol = jdx === JOURS.length - 1;
          const rightEdge = isLastCol ? 'border-right:2px solid #a5b4fc;' : '';
          const cr = (creneauxListe || []).find(c => c.jour === jour && c.periode === periode && c.ordre === crBase.ordre);
          if (!cr) return `<td style="background:#f8fafc;height:${HAUTEUR_LIGNE_COURS}px;text-align:center;vertical-align:middle;border:1px solid #e2e8f0;${topEdge}${bottomEdge}${rightEdge}"></td>`;
          const raw = fetchCellData(cr, jour, periode) || { text: '' };
          const texte = escapeHtml(raw.text || '').replace(/\n/g, '<br/>');
          const bg = toPrintColor(raw.bg) || '#ffffff';
          const fg = toPrintColor(raw.color) || '#1e293b';
          return `<td style="background:${bg};color:${fg};height:${HAUTEUR_LIGNE_COURS}px;text-align:center;vertical-align:middle;border:1px solid #e2e8f0;${topEdge}${bottomEdge}${rightEdge}font-size:9pt;line-height:1.25;">${texte}</td>`;
        }).join('');
        const periodeCell = idx === 0
          ? `<td rowspan="${numRows}" style="background:#eef2ff;color:#4338ca;font-weight:700;font-size:9pt;padding:4px 2px;border:2px solid #a5b4fc;text-align:center;vertical-align:middle;width:28px;min-width:28px;max-width:28px;"><span style="writing-mode:vertical-rl;transform:rotate(180deg);display:inline-block;white-space:nowrap;">${escapeHtml(periode)}</span></td>`
          : '';
        lignes.push(
          `<tr>${periodeCell}<td class="creneau" style="height:${HAUTEUR_LIGNE_COURS}px;background:#f8fafc;color:#1e293b;border:1px solid #e2e8f0;${topEdge}${bottomEdge}text-align:center;font-size:9pt;">${escapeHtml(crBase.heure_debut)}–${escapeHtml(crBase.heure_fin)}</td>${cellules}</tr>`
        );
        if (showPauseRows && idx === 1) {
          const pause = pausesParPeriode[periode];
          lignes.push(
            `<tr><td style="background:#eef2ff;color:#4338ca;font-weight:700;white-space:nowrap;text-align:center;font-size:9pt;height:${HAUTEUR_LIGNE_PAUSE}px;border:1px solid #a5b4fc;border-top:2px solid #a5b4fc;border-bottom:2px solid #a5b4fc;">${escapeHtml(pause.debut)}–${escapeHtml(pause.fin)}</td><td colspan="5" style="background:#eef2ff;color:#4338ca;font-weight:700;text-align:center;font-size:9pt;height:${HAUTEUR_LIGNE_PAUSE}px;border:1px solid #a5b4fc;border-top:2px solid #a5b4fc;border-bottom:2px solid #a5b4fc;border-right:2px solid #a5b4fc;">PAUSE</td></tr>`
          );
        }
      });
      if (periodeIdx === 0) {
        lignes.push(`<tr><td colspan="7" style="height:${HAUTEUR_LIGNE_PAUSE}px;background:#ffffff;border:none;padding:0;"></td></tr>`);
      }
    });
    const headerDaysCells = JOURS.map(j => {
      const eff = countParJour(j);
      return `<th style="background:#f8fafc;color:#64748b;font-size:9pt;font-weight:600;padding:4px 6px;border:1px solid #e2e8f0;text-align:center;white-space:nowrap;"><span style="display:inline-block;min-width:18px;height:18px;line-height:16px;padding:0 4px;border-radius:10px;background:#eef2ff;color:#4338ca;font-size:8pt;font-weight:700;border:1px solid #a5b4fc;margin-right:5px;vertical-align:middle;">${eff}</span><span style="vertical-align:middle;">${escapeHtml(j)}</span></th>`;
    }).join('');
    return `
      <table style="border-collapse:collapse;width:100%;table-layout:fixed;">
        <colgroup>
          <col style="width:28px;min-width:28px;max-width:28px;" />
          <col class="creneau-col" />
          ${JOURS.map(() => '<col class="day-col" />').join('')}
        </colgroup>
        <thead>
          <tr>
            <th colspan="2" style="background:#f8fafc;color:#64748b;font-size:9pt;font-weight:600;padding:4px 6px;border:1px solid #e2e8f0;text-align:center;">Horaire</th>
            ${headerDaysCells}
          </tr>
        </thead>
        <tbody>${lignes.join('')}</tbody>
      </table>
    `;
  };
  const buildPlanningClassesPrintTableHtml = ({ creneauxListe, affectationsListe, horairesListe }) => {
    const HAUTEUR_LIGNE_COURS = 56;
    const HAUTEUR_LIGNE_PAUSE = 42;
    const horairesSet = new Set((horairesListe || []).map(h => `${h.jour}|${h.periode}`));
    const countAffectationsParJour = (jour) => (creneauxListe || []).reduce((acc, cr) => {
      if (cr.jour !== jour) return acc;
      const aCours = horairesSet.has(`${jour}|${cr.periode}`);
      const aff = aCours ? (affectationsListe || []).find(a => a.creneau_id === cr.id) : null;
      return aff ? acc + 1 : acc;
    }, 0);
    const renderPeriodeRows = (periode) => {
      const base = baseCreneauxPeriode(creneauxListe, periode);
      if (!base.length) return '';
      const rows = [];
      base.forEach((crBase, idx) => {
        const isFirstRow = idx === 0;
        const isLastRow = idx === base.length - 1;
        const topEdge = isFirstRow ? 'border-top:2px solid #a5b4fc;' : '';
        const bottomEdge = isLastRow ? 'border-bottom:2px solid #a5b4fc;' : '';
        const cellulesJours = JOURS.map((jour, jdx) => {
          const isLastCol = jdx === JOURS.length - 1;
          const rightEdge = isLastCol ? 'border-right:2px solid #a5b4fc;' : '';
          const cr = (creneauxListe || []).find(c => c.jour === jour && c.periode === periode && c.ordre === crBase.ordre);
          if (!cr) return `<td style="background:#f8fafc;height:${HAUTEUR_LIGNE_COURS}px;text-align:center;vertical-align:middle;border:1px solid #e2e8f0;${topEdge}${bottomEdge}${rightEdge}"></td>`;
          const aCours = horairesSet.has(`${jour}|${periode}`);
          const aff = aCours ? (affectationsListe || []).find(a => a.creneau_id === cr.id) : null;
          const bg = aff ? toPrintColor(getCouleurProf(aff.prof_id)) : (aCours ? '#ffffff' : '#f8fafc');
          const fg = aff ? toPrintColor(getCouleurTexteSurFond(bg)) : '#1e293b';
          const contenu = aff
            ? `<div style="font-weight:700;color:${fg};font-size:10pt;line-height:1.25;">${escapeHtml(formaterNomComplet(aff.prof_nom || ''))}</div>${aff.matiere_nom ? `<div style="color:${fg};font-size:9pt;margin-top:3px;line-height:1.2;">${escapeHtml(aff.matiere_nom)}</div>` : ''}`
            : (aCours ? '<span style="color:#dc2626;font-size:9pt;font-weight:700;">Aucun professeur affecté</span>' : '');
          return `<td style="background:${bg};color:${fg};height:${HAUTEUR_LIGNE_COURS}px;text-align:center;vertical-align:middle;border:1px solid #e2e8f0;${topEdge}${bottomEdge}${rightEdge}">${contenu}</td>`;
        }).join('');
        rows.push(
          `<tr>
            ${idx === 0 ? `<td rowspan="5" style="background:#eef2ff;color:#4338ca;font-weight:700;font-size:9pt;padding:4px 2px;border:2px solid #a5b4fc;text-align:center;vertical-align:middle;width:28px;min-width:28px;max-width:28px;"><span style="writing-mode:vertical-rl;transform:rotate(180deg);display:inline-block;white-space:nowrap;">${escapeHtml(periode)}</span></td>` : ''}
            <td class="creneau" style="height:${HAUTEUR_LIGNE_COURS}px;background:#f8fafc;color:#1e293b;border:1px solid #e2e8f0;${topEdge}${bottomEdge}text-align:center;font-size:9pt;">${escapeHtml(crBase.heure_debut)}–${escapeHtml(crBase.heure_fin)}</td>
            ${cellulesJours}
          </tr>`
        );
        if (idx === 1) {
          const pause = pausesParPeriode[periode];
          rows.push(
            `<tr><td style="background:#eef2ff;color:#4338ca;font-weight:700;white-space:nowrap;text-align:center;font-size:9pt;height:${HAUTEUR_LIGNE_PAUSE}px;border:1px solid #a5b4fc;border-top:2px solid #a5b4fc;border-bottom:2px solid #a5b4fc;">${escapeHtml(pause.debut)}–${escapeHtml(pause.fin)}</td><td colspan="5" style="background:#eef2ff;color:#4338ca;font-weight:700;text-align:center;font-size:9pt;height:${HAUTEUR_LIGNE_PAUSE}px;border:1px solid #a5b4fc;border-top:2px solid #a5b4fc;border-bottom:2px solid #a5b4fc;border-right:2px solid #a5b4fc;">PAUSE</td></tr>`
          );
        }
      });
      return rows.join('');
    };
    const headerDaysCells = JOURS.map(j => {
      const eff = countAffectationsParJour(j);
      return `<th style="background:#f8fafc;color:#64748b;font-size:9pt;font-weight:600;padding:4px 6px;border:1px solid #e2e8f0;text-align:center;white-space:nowrap;"><span style="display:inline-block;min-width:18px;height:18px;line-height:16px;padding:0 4px;border-radius:10px;background:#eef2ff;color:#4338ca;font-size:8pt;font-weight:700;border:1px solid #a5b4fc;margin-right:5px;vertical-align:middle;">${eff}</span><span style="vertical-align:middle;">${escapeHtml(j)}</span></th>`;
    }).join('');
    return `
      <table style="border-collapse:collapse;width:100%;table-layout:fixed;">
        <colgroup>
          <col style="width:28px;min-width:28px;max-width:28px;" />
          <col class="creneau-col" />
          ${JOURS.map(() => '<col class="day-col" />').join('')}
        </colgroup>
        <thead>
          <tr>
            <th colspan="2" style="background:#f8fafc;color:#64748b;font-size:9pt;font-weight:600;padding:4px 6px;border:1px solid #e2e8f0;text-align:center;">Horaire</th>
            ${headerDaysCells}
          </tr>
        </thead>
        <tbody>
          ${renderPeriodeRows('Matin')}
          <tr>
            <td colspan="7" style="height:${HAUTEUR_LIGNE_PAUSE}px;background:#ffffff;border:none;"></td>
          </tr>
          ${renderPeriodeRows('Après-midi')}
        </tbody>
      </table>
    `;
  };
  const buildPlanningGeneralPrintHtml = ({ creneaux: allCrs, profs, affectations, dispos }) => {
    const CRENEAU_W = LARGEUR_COLONNE_CRENEAU;
    const ROW_H = 52;
    const parts = [];
    JOURS.forEach(jour => {
      const crs = (allCrs || []).filter(c => c.jour === jour);
      if (!crs.length) return;
      const nCols = (profs || []).length + 1;
      const profHeaders = (profs || []).map(p => {
        const nom = nomSansSuffixe(p.nom || '');
        const prenom = formaterPrenomEntete(p.prenom || '');
        return `<th style="text-align:center;font-size:9pt;padding:5px 4px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">${escapeHtml(nom)}<br/><span style="font-weight:400;font-size:8pt;">${escapeHtml(prenom)}</span></th>`;
      }).join('');
      const rows = [];
      ['Matin', 'Après-midi'].forEach(per => {
        const crsPer = crs.filter(c => c.periode === per).sort((a, b) => Number(a.ordre || 0) - Number(b.ordre || 0));
        if (!crsPer.length) return;
        rows.push(`<tr><td colspan="${nCols}" style="background:#000;color:#fff;font-weight:700;font-size:9pt;padding:4px 8px;text-align:left;border:none;">${escapeHtml(per)}</td></tr>`);
        crsPer.forEach(cr => {
          const cells = (profs || []).map(p => {
            const aff = (affectations || []).find(a => a.prof_id === p.id && a.creneau_id === cr.id);
            const dispo = (dispos || []).find(d => d.prof_id === p.id && d.creneau_id === cr.id);
            const indispo = dispo && !dispo.disponible;
            let bg = '#fff', content = '';
            if (aff) {
              const estSpecial = !!aff.type_special;
              bg = estSpecial ? '#000' : (aff.classe_id ? getCouleurClasse(aff.classe_id) : '#e8f5e9');
              const fg = estSpecial ? '#fff' : getCouleurTexteSurFond(bg);
              const ligne1 = estSpecial ? getLibelleTypeSpecial(aff.type_special) : escapeHtml(aff.classe_nom || '');
              const ligne2 = estSpecial ? '' : (aff.matiere_nom ? `<div style="font-size:8pt;margin-top:2px;">${escapeHtml(aff.matiere_nom)}</div>` : '');
              content = `<div style="font-weight:700;color:${fg};font-size:9pt;">${ligne1}</div>${ligne2}`;
            } else if (indispo) {
              bg = '#eee';
              content = '<span style="color:#9ca3af;font-size:8pt;">Indispo</span>';
            }
            return `<td style="background:${bg};height:${ROW_H}px;text-align:center;vertical-align:middle;border:1px solid #e2e8f0;padding:3px 4px;">${content}</td>`;
          }).join('');
          rows.push(`<tr><td style="background:#f8fafc;font-weight:700;font-size:8pt;text-align:center;white-space:nowrap;height:${ROW_H}px;border:1px solid #e2e8f0;width:${CRENEAU_W}px;">${escapeHtml(cr.heure_debut)}–${escapeHtml(cr.heure_fin)}</td>${cells}</tr>`);
        });
      });
      const colgroup = `<colgroup><col style="width:${CRENEAU_W}px;min-width:${CRENEAU_W}px;"/>${(profs || []).map(() => '<col/>').join('')}</colgroup>`;
      parts.push(`
        <div class="section">
          <table style="border-collapse:collapse;width:100%;table-layout:fixed;margin-bottom:20px;">
            ${colgroup}
            <tbody>
              <tr><td colspan="${nCols}" style="padding:0;border:none;background:transparent;">
                <div style="background:#6366f1;color:#fff;text-align:center;font-weight:800;font-size:11pt;padding:5px 14px;text-transform:uppercase;letter-spacing:0.04em;border-radius:8px 8px 0 0;">${escapeHtml(jour)}</div>
              </td></tr>
              <tr><th style="text-align:center;font-size:9pt;padding:5px 4px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Horaire</th>${profHeaders}</tr>
              ${rows.join('')}
            </tbody>
          </table>
        </div>
      `);
    });
    return parts.join('');
  };
  const openPrintWindow = (titre, contenu, options = {}) => {
    const html = withPrintLayout(titre, contenu, options);
    const pageSize = options?.paysage ? 'A4 landscape' : 'A4 portrait';
    const finalHtml = injectForcedPrintCss(html, pageSize, '12mm 20mm');
    const popup = openPrintPopup(finalHtml, { title: titre, width: 1200, height: 820 });
    if (!popup) alert("Impossible d'ouvrir la fenêtre d'impression. Autorisez les popups.");
  };
  const imprimerPlanningSelection = async () => {
    try {
      if (sousOngletPlanning === 'classes') {
        if (!classePlanningId || !planningClasse) return alert("Sélectionnez d'abord une classe.");
        const nomClasse = planningClasse?.classe?.nom || '';
        const titulaireClasse = planningClasse?.classe?.titulaire_nom || '';
        const titre = `${nomClasse}${titulaireClasse ? ` — Titulaire : ${titulaireClasse}` : ''}`;
        const table = buildPlanningClassesPrintTableHtml({
          creneauxListe: planningClasse.creneaux || [],
          affectationsListe: planningClasseAffectations || [],
          horairesListe: planningClasse.horaires || [],
        });
        return openPrintWindow(titre, `<div class="section">${table}</div>`, { paysage: true, compactClasses: true });
      }
      if (sousOngletPlanning === 'professeurs') {
        if (!profPlanningId || !planningProf) return alert("Sélectionnez d'abord un professeur.");
        const titre = `Plannings professeur — ${planningProf?.prof?.prenom || ''} ${nomSansSuffixe(planningProf?.prof?.nom || '')}`.trim();
        const table = buildPlanningTableHtml({
          creneauxListe: planningProf.creneaux || [],
          repeatPeriodeOnDays: true,
          showPauseRows: true,
          getCellData: (cr) => {
            const aff = (planningProf.affectations || []).find(a => a.creneau_id === cr.id);
            if (hasBrancheAffectee(aff)) {
              const bg = getCouleurBranche(aff.matiere_id);
              return {
                text: `${aff.classe_nom}\n${aff.matiere_nom}`,
                bg,
                color: getCouleurTexteSurFond(bg)
              };
            }
            const dispo = (planningProf.dispos || []).find(d => d.creneau_id === cr.id);
            if (dispo && !dispo.disponible) return { text: 'Indisponible' };
            return { text: '' };
          }
        });
        return openPrintWindow(titre, `<div class="section">${table}</div>`, { paysage: true });
      }
      if (sousOngletPlanning === 'salle') {
        if (!sallesLieuTravailId || !salleSelectionnee) return alert("Sélectionnez d'abord un lieu de travail et une salle.");
        const idsClassesLieu = new Set(classesPourSalles.map(cl => String(cl.id)));
        const titre = `Plannings salles — ${salleSelectionnee}`;
        const table = buildPlanningTableHtml({
          creneauxListe: creneaux || [],
          repeatPeriodeOnDays: true,
          showPauseRows: true,
          getCellData: (cr) => {
            const cours = (coursEmploiDuTemps || []).find(c =>
              c.jour === cr.jour &&
              normaliserHeureCreneau(c.heure_debut) === normaliserHeureCreneau(cr.heure_debut) &&
              normaliserHeureCreneau(c.heure_fin) === normaliserHeureCreneau(cr.heure_fin) &&
              String((c.salle || '').trim()) === String((salleSelectionnee || '').trim()) &&
              idsClassesLieu.has(String(c.classe_id))
            );
            if (!cours) return { text: '' };
            const cl = classes.find(x => String(x.id) === String(cours.classe_id));
            if (!cl) return { text: '' };
            const aff = (affectations || []).find(a =>
              String(a.classe_id) === String(cl.id) &&
              String(a.creneau_id) === String(cr.id)
            );
            const bg = getCouleurClasse(cl.id);
            return {
              text: `${cl.nom}\n${aff?.prof_nom ? formaterNomComplet(aff.prof_nom) : 'Aucun professeur affecté'}`,
              bg,
              color: getCouleurTexteSurFond(bg)
            };
          }
        });
        return openPrintWindow(titre, `<div class="section">${table}</div>`, { paysage: true });
      }
      const poolId = planningPoolId || '';
      const url = API + '/planning/general' + (poolId ? `?pool_id=${poolId}` : '');
      const rep = await axios.get(url, { headers });
      const data = rep.data;
      const titre = `Plannings général${poolId ? ' — pool sélectionné' : ''}`;
      const contenu = buildPlanningGeneralPrintHtml({
        creneaux: data?.creneaux || [],
        profs: data?.profs || [],
        affectations: data?.affectations || [],
        dispos: data?.dispos || [],
      });
      return openPrintWindow(titre, contenu, { paysage: true });
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Erreur lors de l'impression.");
    }
  };
  const imprimerPlanningTout = async () => {
    try {
      if (sousOngletPlanning === 'classes') {
        if (!classesToutesTriees.length) return alert('Aucune classe à imprimer.');
        const reps = await Promise.all(
          classesToutesTriees.map(cl => axios.get(API + '/planning/classe/' + cl.id, { headers }))
        );
        const sections = reps.map((rep) => {
          const data = rep.data;
          const nomClasse = data?.classe?.nom || '';
          const titulaireClasse = data?.classe?.titulaire_nom || '';
          const table = buildPlanningClassesPrintTableHtml({
            creneauxListe: data?.creneaux || [],
            affectationsListe: data?.affectations || [],
            horairesListe: data?.horaires || [],
          });
          return `<div class="section"><h2>${escapeHtml(nomClasse)}${titulaireClasse ? ` — Titulaire : ${escapeHtml(titulaireClasse)}` : ''}</h2>${table}</div>`;
        });
        return openPrintWindow('Plannings classes — toutes les classes', sections.join(''), { paysage: true, compactClasses: true });
      }
      if (sousOngletPlanning === 'professeurs') {
        if (!profs.length) return alert('Aucun professeur à imprimer.');
        const reps = await Promise.all(
          profs.map(p => axios.get(API + '/planning/prof/' + p.id, { headers }))
        );
        const sections = reps.map((rep) => {
          const data = rep.data;
          const nom = `${data?.prof?.prenom || ''} ${nomSansSuffixe(data?.prof?.nom || '')}`.trim();
          const table = buildPlanningTableHtml({
            creneauxListe: data?.creneaux || [],
            repeatPeriodeOnDays: true,
            showPauseRows: true,
            getCellData: (cr) => {
              const aff = (data?.affectations || []).find(a => a.creneau_id === cr.id);
              if (hasBrancheAffectee(aff)) {
                const bg = getCouleurBranche(aff.matiere_id);
                return {
                  text: `${aff.classe_nom}\n${aff.matiere_nom}`,
                  bg,
                  color: getCouleurTexteSurFond(bg)
                };
              }
              const dispo = (data?.dispos || []).find(d => d.creneau_id === cr.id);
              if (dispo && !dispo.disponible) return { text: 'Indisponible' };
              return { text: '' };
            }
          });
          return `<div class="section"><h2>Professeur : ${escapeHtml(nom)}</h2>${table}</div>`;
        });
        return openPrintWindow('Plannings professeurs — tous les professeurs', sections.join(''), { paysage: true });
      }
      if (sousOngletPlanning === 'salle') {
        if (!sallesLieuTravailId) return alert("Sélectionnez d'abord un lieu de travail.");
        if (!sallesDisponiblesLieu.length) return alert('Aucune salle disponible pour ce lieu.');
        const idsClassesLieu = new Set(classesPourSalles.map(cl => String(cl.id)));
        const sections = sallesDisponiblesLieu.map((salle) => {
          const table = buildPlanningTableHtml({
            creneauxListe: creneaux || [],
            repeatPeriodeOnDays: true,
            showPauseRows: true,
            getCellData: (cr) => {
              const cours = (coursEmploiDuTemps || []).find(c =>
                c.jour === cr.jour &&
                normaliserHeureCreneau(c.heure_debut) === normaliserHeureCreneau(cr.heure_debut) &&
                normaliserHeureCreneau(c.heure_fin) === normaliserHeureCreneau(cr.heure_fin) &&
                String((c.salle || '').trim()) === String((salle || '').trim()) &&
                idsClassesLieu.has(String(c.classe_id))
              );
              if (!cours) return { text: '' };
              const cl = classes.find(x => String(x.id) === String(cours.classe_id));
              if (!cl) return { text: '' };
              const aff = (affectations || []).find(a =>
                String(a.classe_id) === String(cl.id) &&
                String(a.creneau_id) === String(cr.id)
              );
              const bg = getCouleurClasse(cl.id);
              return {
                text: `${cl.nom}\n${aff?.prof_nom ? formaterNomComplet(aff.prof_nom) : 'Aucun professeur affecté'}`,
                bg,
                color: getCouleurTexteSurFond(bg)
              };
            }
          });
          return `<div class="section"><h2>Salle : ${escapeHtml(salle)}</h2>${table}</div>`;
        });
        return openPrintWindow(`Plannings salles — ${sallesLieuTravailId}`, sections.join(''), { paysage: true });
      }
      const rep = await axios.get(API + '/planning/general', { headers });
      const data = rep.data;
      const table = buildPlanningTableHtml({
        creneauxListe: data?.creneaux || [],
        repeatPeriodeOnDays: true,
        getCellData: (cr) => {
          const affectes = (data?.affectations || []).filter(a => a.creneau_id === cr.id);
          if (!affectes.length) return { text: '' };
          if (affectes.length === 1) {
            const a = affectes[0];
            if (a.type_special) {
              return {
                text: `${formaterNomComplet(a.prof_nom)}\n${getLibelleTypeSpecial(a.type_special)}`,
                bg: '#000000',
                color: '#ffffff'
              };
            }
            const bg = a.classe_id ? getCouleurClasse(a.classe_id) : getCouleurBranche(a.matiere_id);
            return {
              text: `${formaterNomComplet(a.prof_nom)}\n${a.matiere_nom ? `${a.classe_nom} — ${a.matiere_nom}` : a.classe_nom}`,
              bg,
              color: getCouleurTexteSurFond(bg)
            };
          }
          return {
            text: affectes
              .map(a => `${formaterNomComplet(a.prof_nom)}\n${a.matiere_nom ? `${a.classe_nom} — ${a.matiere_nom}` : a.classe_nom}`)
              .join('\n\n')
          };
        }
      });
      return openPrintWindow('Plannings général — complet', `<div class="section">${table}</div>`);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Erreur lors de l'impression globale.");
    }
  };

  const toastBg = toast.type === 'error' ? '#fee2e2' : (toast.type === 'info' ? '#ede9fe' : '#dcfce7');
  const toastColor = toast.type === 'error' ? '#991b1b' : (toast.type === 'info' ? '#4c1d95' : '#166534');
  const toastBorder = toast.type === 'error' ? '#fecaca' : (toast.type === 'info' ? '#c7d2fe' : '#86efac');

  return (
    <div style={styles.page}>
      {toast.message && (
        <div style={{
          position:'fixed',
          top:20,
          right:20,
          zIndex:9999,
          padding:'12px 18px',
          borderRadius:10,
          background:toastBg,
          color:toastColor,
          border:`1px solid ${toastBorder}`,
          boxShadow:'0 8px 24px rgba(15,23,42,0.15)',
          fontSize:13,
          fontWeight:600,
          maxWidth:420,
          lineHeight:1.4
        }}>
          {toast.message}
        </div>
      )}
      <div style={{...stickyPageChrome(), paddingBottom:0, marginBottom:0}}>
      <div style={styles.header}>
        {onglet === 'disponibilites' && profSelectionne && (
          <button style={styles.btnRetour} onClick={() => { setProfSelectionne(null); setDispos({}); setRemarquesDispo(''); }}>← Retour</button>
        )}
        <h2 style={styles.titre}>Emploi du temps</h2>
        {isAdmin() && onglet === 'pools' && (
          <div style={{display:'flex',alignItems:'center',gap:10,marginLeft:'auto'}}>
            <button style={styles.btnVert} onClick={() => { const {poolHoraires, pauses} = getHoraireForLieu(''); setShowPoolForm(true); setPoolEdit(null); setPoolForm({nom:'',site:'',couleur:'#6366f1',niveau:'',prof_ids:[],classe_ids:[],branche_ids:[],horaires:poolHoraires}); setPausesParPeriodeForm(pauses); }}>+ Ajouter</button>
          </div>
        )}
        {onglet === 'plannings' && (
          <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
            <button type="button" style={styles.btnImprimer} onClick={imprimerPlanningTout}>Tout imprimer</button>
            <button type="button" style={styles.btnImprimer} onClick={imprimerPlanningSelection}>Imprimer</button>
          </div>
        )}
        {onglet === 'disponibilites' && profSelectionne && isAdmin() && (
          <div style={{display:'flex',alignItems:'center',gap:10,marginLeft:'auto'}}>
            <button type="button" style={styles.btnSauvegarderAff} onClick={sauverDispos}>Sauvegarder</button>
          </div>
        )}
        {onglet === 'affectations' && (
          <div style={{display:'flex',alignItems:'center',gap:10,marginLeft:'auto'}}>
            <button type="button" style={styles.btnSauvegarderAff} onClick={() => {
              if (sousOngletAff === 'classes') return sauvegarderAffectationsClasses();
              if (sousOngletAff === 'profs') return sauvegarderAffectationsProfs();
              if (sousOngletAff === 'branches') return sauvegarderAffectationsBranches();
              if (sousOngletAff === 'salles') return sauvegarderAffectationsSalles();
              showToast("Aucun changement à sauvegarder pour ce sous-onglet.", 'info');
            }}>Sauvegarder</button>
          </div>
        )}
      </div>

      {onglet === 'plannings' && (
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap'}}>
          <div style={styles.toggleGroup}>
            {[{id:'classes',label:'Classes'},{id:'salle',label:'Salles'},{id:'professeurs',label:'Professeurs'},{id:'general',label:'Général'}].map(o => (
              <button key={o.id} style={{...styles.toggleBtn,...(sousOngletPlanning===o.id?styles.toggleBtnActif:{})}}
                onClick={() => { setSousOngletPlanning(o.id); if (o.id==='general') chargerPlanningGeneral(planningPoolId||''); }}>
                {o.label}
              </button>
            ))}
          </div>
          {sousOngletPlanning === 'classes' && (
            <CustomSelect
              style={styles.selAff}
              value={classePlanningId || ''}
              placeholder="Choisir une classe"
              options={classesToutesTriees.map(c => ({value: c.id, label: c.nom}))}
              onChange={(classeId) => {
                setClassePlanningId(classeId);
                if (classeId) {
                  const poolTrouve = pools.find(p => (p.classes || []).some(c => String(c.id) === String(classeId)));
                  const poolId = poolTrouve ? String(poolTrouve.id) : '';
                  setClassePlanningPoolId(poolId);
                  chargerPlanningClasse(classeId, poolId);
                } else { setClassePlanningPoolId(''); setPlanningClasse(null); }
              }}
            />
          )}
          {sousOngletPlanning === 'professeurs' && (
            <CustomSelect
              style={styles.selAff}
              value={profPlanningId || ''}
              placeholder="Choisir un professeur"
              options={profsTriesPrenomNom.map(p => ({value: p.id, label: `${p.prenom} ${nomSansSuffixe(p.nom)}`}))}
              onChange={(id) => {
                setProfPlanningId(id);
                if (id) chargerPlanningProf(id); else setPlanningProf(null);
              }}
            />
          )}
          {sousOngletPlanning === 'general' && (
            <CustomSelect
              style={styles.selAff}
              value={planningPoolId}
              placeholder="Choisir un pool"
              options={pools.map(p => ({value: p.id, label: p.nom}))}
              onChange={(v) => { setPlanningPoolId(v); chargerPlanningGeneral(v); }}
            />
          )}
          {sousOngletPlanning === 'salle' && (
            <>
              <CustomSelect
                style={styles.selAff}
                value={sallesLieuTravailId}
                placeholder="Choisir un lieu de travail"
                options={lieuxTravailOptions.map(lieu => ({value: lieu, label: lieu}))}
                onChange={(v) => setSallesLieuTravailId(v)}
              />
              <CustomSelect
                style={styles.selAff}
                value={salleSelectionnee}
                disabled={!sallesLieuTravailId}
                placeholder={sallesLieuTravailId ? 'Choisir une salle' : "Choisir d'abord un lieu"}
                options={sallesDisponiblesLieu.map(salle => ({value: salle, label: salle}))}
                onChange={(v) => setSalleSelectionnee(v)}
              />
            </>
          )}
        </div>
      )}
      </div>

      {/* ===== DISPONIBILITÉS ===== */}
      {onglet === 'disponibilites' && (
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap'}}>
            {!profSelectionne && (
              <>
                <input
                  type="text"
                  style={styles.selAff}
                  placeholder="Rechercher un professeur..."
                  value={rechercheProfDispo}
                  onChange={e => setRechercheProfDispo(e.target.value)}
                />
                {!showPoolsFiltresDispo ? (
                  <button
                    onClick={() => setShowPoolsFiltresDispo(true)}
                    style={{padding:'7px 14px',borderRadius:17,border:'1.5px solid #e2e8f0',background:'white',cursor:'pointer',fontWeight:600,color:'#94a3b8',fontSize:13,fontFamily:'inherit',whiteSpace:'nowrap'}}>
                    Trier
                  </button>
                ) : (
                  <div style={{display:'flex',background:'#ede9fe',borderRadius:20,padding:3,gap:2}}>
                    {[{id:'tous', label:'Trier'}, ...pools.map(p => ({id:String(p.id), label:p.nom}))].map(tab => {
                      const actif = sousOngletDisp === tab.id;
                      return (
                        <button key={tab.id}
                          style={{padding:'7px 14px',borderRadius:17,border:'none',background:actif?'#6366f1':'transparent',cursor:'pointer',fontWeight:actif?700:600,color:actif?'white':'#6d28d9',fontSize:13,fontFamily:'inherit',whiteSpace:'nowrap'}}
                          onClick={() => {
                            setSousOngletDisp(tab.id);
                            setProfSelectionne(null);
                            setDispos({});
                            setRemarquesDispo('');
                            if (tab.id === 'tous') setShowPoolsFiltresDispo(false);
                          }}>
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {!profSelectionne && (
            <div style={{overflow:'hidden',marginTop:8,borderRadius:10,border:'1px solid #e8eaf6'}}>
            <div style={{overflow:'auto',maxHeight:'calc(100vh - 280px)',WebkitOverflowScrolling:'touch'}}>
              {(() => {
                const poolSelectionne = pools.find(p => String(p.id) === sousOngletDisp);
                const profIds = poolSelectionne ? (poolSelectionne.profs||[]).map(x=>x.id) : null;
                const q = rechercheProfDispo.trim().toLowerCase();
                const profsAffiches = profs
                  .filter(p => !profIds || profIds.includes(p.id))
                  .filter(p => !q || `${p.prenom||''} ${p.nom||''}`.toLowerCase().includes(q) || `${p.nom||''} ${p.prenom||''}`.toLowerCase().includes(q));
                return (
              <table style={{...styles.tbl, width:'100%', tableLayout:'fixed'}}>
                <colgroup>
                  <col style={{width:56}} />
                  <col />
                  <col />
                  <col style={{width:70}} />
                  {['Lundi','Mardi','Mercredi','Jeudi','Vendredi'].map(j => (
                    <col key={j} style={{width:100}} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th style={{...styles.th, width:56, minWidth:56, maxWidth:56, whiteSpace:'nowrap', textAlign:'center', boxSizing:'border-box', position:'sticky', top:0, zIndex:2, background:'white'}}></th>
                    <th style={{...styles.th, position:'sticky', top:0, zIndex:2, background:'white'}}>Nom</th>
                    <th style={{...styles.th, position:'sticky', top:0, zIndex:2, background:'white'}}>Prénom</th>
                    <th style={{...styles.th, textAlign:'center', position:'sticky', top:0, zIndex:2, background:'white'}}>Taux</th>
                    {['Lundi','Mardi','Mercredi','Jeudi','Vendredi'].map(j => (
                      <th key={j} style={{...styles.th, textAlign:'center', position:'sticky', top:0, zIndex:2, background:'white'}}>{j}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profsAffiches.map(prof => {
                    const profDispos = allDispos.filter(d => String(d.prof_id) === String(prof.id));
                    return (
                      <tr key={prof.id} style={{borderBottom:'1px solid #e2e8f0'}}>
                        <td style={{...styles.td, width:56, minWidth:56, maxWidth:56, whiteSpace:'nowrap', textAlign:'center', boxSizing:'border-box'}}>
                          <button
                            title="Voir le détail des disponibilités"
                            onClick={() => chargerDispos(prof.id)}
                            style={{padding:5,border:'none',borderRadius:8,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',background:'#e0e7ff',color:'#4338ca'}}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 13a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>
                          </button>
                        </td>
                        <td style={{...styles.td, whiteSpace:'nowrap'}}><b style={{color:'#1e293b'}}>{nomSansSuffixe(prof.nom)}</b></td>
                        <td style={{...styles.td, whiteSpace:'nowrap'}}>{prof.prenom}</td>
                        <td style={{...styles.td, textAlign:'center'}}>{prof.taux_activite ? `${prof.taux_activite}%` : '—'}</td>
                        {['Lundi','Mardi','Mercredi','Jeudi','Vendredi'].map(jour => {
                          const creneauxJour = creneaux.filter(c => c.jour === jour);
                          const total = creneauxJour.length;
                          const dispoCount = creneauxJour.filter(cr => {
                            const stored = profDispos.find(d => Number(d.creneau_id) === Number(cr.id));
                            return stored ? stored.disponible !== false : true;
                          }).length;
                          const color = dispoCount === total && total > 0 ? '#16a34a' : dispoCount === 0 ? '#dc2626' : '#f59e0b';
                          const title = `${dispoCount}/${total} périodes`;
                          return (
                            <td key={jour} style={{...styles.td, textAlign:'center', verticalAlign:'middle'}}>
                              <span title={title} style={{display:'inline-block',width:16,height:16,borderRadius:'50%',background:color,cursor:'default',verticalAlign:'middle'}} />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
                );
              })()}
            </div>
            </div>
          )}
          {profSelectionne && (
            <div style={styles.card}>
              <div style={styles.rowBetween}>
                <h3 style={styles.cardTitre}>
                  {profDispoSelectionne?.prenom} {nomSansSuffixe(profDispoSelectionne?.nom)}
                  <span style={{marginLeft:10,fontSize:14,fontWeight:800,color:couleurCompteurDispo}}>
                    {periodesSelectionneesDispo} / {periodesRequisesDispo} périodes
                  </span>
                </h3>
              </div>
              <div style={{overflowX:'auto', marginTop:16}}>
                <div style={{minWidth:860, width:'100%'}}>
                  <div style={{marginBottom:12}}>
                    <label style={{...styles.lbl, marginBottom: 6}}>Remarques</label>
                    <textarea
                      style={{...styles.inp, width:'100%', minHeight:82, resize:'vertical'}}
                      value={remarquesDispo}
                      onChange={e => setRemarquesDispo(e.target.value)}
                      placeholder="Ajouter une remarque..."
                    />
                  </div>
                  <table style={{...styles.tbl, tableLayout:'fixed', width:'100%'}}>
                    <thead>
                      <tr>
                        <th style={{...styles.thA, width:80, minWidth:80, maxWidth:80}}>Période</th>
                        {JOURS.map(j => <th key={j} style={styles.thAJour}>{j}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {['Matin','Après-midi'].map(periode => {
                        const crsLundi = creneaux.filter(c => c.jour==='Lundi' && c.periode===periode);
                        if (!crsLundi.length) return null;
                        return [
                          <tr key={periode+'-banner'}>
                            <td colSpan={JOURS.length+1} style={styles.periodeBande}>{periode}</td>
                          </tr>,
                          ...crsLundi.map((crBase, idx) => (
                            <tr key={crBase.id}>
                              <td style={{...styles.tdPer, width:80, minWidth:80, maxWidth:80}}>
                                <span style={styles.periodeNum}>P{periode==='Matin' ? idx+1 : idx+5}</span>
                              </td>
                              {JOURS.map(jour => {
                                const cr = creneaux.find(c => c.jour===jour && c.periode===periode && c.ordre===crBase.ordre);
                                if (!cr) return <td key={jour} style={{...styles.tdDispo, background:'#f0f0f0'}}></td>;
                                const ok = dispos[cr.id] !== false;
                                return (
                                  <td
                                    key={jour}
                                    style={{...styles.tdDispo, cursor:isAdmin()?'pointer':'default', textAlign:'center', verticalAlign:'middle'}}
                                    onClick={() => { if (isAdmin()) toggleDispo(cr.id); }}
                                    title={isAdmin() ? (ok ? 'Disponible — cliquer pour basculer' : 'Indisponible — cliquer pour basculer') : (ok ? 'Disponible' : 'Indisponible')}
                                  >
                                    <span style={{display:'inline-block',width:16,height:16,borderRadius:'50%',background:ok?'#16a34a':'#dc2626',verticalAlign:'middle',pointerEvents:'none'}} />
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
            </div>
          )}
        </div>
      )}

      {/* ===== POOLS ===== */}
      {onglet === 'pools' && (
        <div>
          {showPoolForm && (
            <div className="modal-overlay" style={styles.overlay}>
              <div style={{...styles.modal, width:1000}}>
                <h3 style={styles.modalTitre}>{poolEdit?'Modifier':'Créer'} un pool</h3>
                <div style={{display:'grid',gridTemplateColumns:'minmax(0, 1fr) 250px',gap:18,alignItems:'start'}}>
                  <div style={styles.formGrid}>
                    <div style={{...styles.fc, gridColumn:'1/-1'}}>
                      <label style={styles.lbl}>Désignation <span style={{color:'#ef4444'}}>*</span></label>
                      <input style={styles.inp} value={poolForm.nom} onChange={e => setPoolForm({...poolForm,nom:e.target.value})} />
                    </div>
                    <div style={styles.fc}>
                      <label style={styles.lbl}>Niveaux <span style={{color:'#ef4444'}}>*</span></label>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                        {niveauxDB.map(niv => {
                          const n = niv.nom;
                          const niveaux = parseNiveaux(poolForm.niveau);
                          const selected = niveaux.includes(n);
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => {
                                const curr = parseNiveaux(poolForm.niveau);
                                const newNiv = selected ? curr.filter(x => x !== n) : [...curr, n];
                                setPoolForm({ ...poolForm, niveau: newNiv.join(',') });
                              }}
                              style={{
                                padding:'8px 16px',
                                borderRadius:8,
                                border:'2px solid '+(selected?'#6366f1':'#e2e8f0'),
                                background:selected?'#e0e7ff':'white',
                                color:selected?'#3730a3':'#64748b',
                                cursor:'pointer',
                                fontWeight:700,
                                fontSize:13,
                                transition:'all 0.15s'
                              }}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{marginTop:6,fontSize:12,fontWeight:700,color:couleurPeriodesRequises}}>
                        Périodes de cours : {totalPeriodesCoursForm}
                      </div>
                      <div style={{marginTop:4,fontSize:12,fontWeight:700,color:couleurPeriodesRequises}}>
                        Périodes de titulariat : {totalPeriodesTitulariatForm}
                      </div>
                      <div style={{marginTop:4,fontSize:12,fontWeight:700,color:couleurPeriodesRequises}}>
                        Total requis : {totalPeriodesRequisesFormTotal}
                      </div>
                    </div>
                    <div style={styles.fc}>
                      <label style={styles.lbl}>Lieu de travail <span style={{color:'#ef4444'}}>*</span></label>
                      <CustomSelect
                        style={{...styles.inp, width:'100%'}}
                        value={poolForm.site}
                        placeholder="Choisir"
                        options={lieuxTravailDB.map(l => ({value: l.nom, label: l.nom}))}
                        onChange={(site) => { const {poolHoraires,pauses}=getHoraireForLieu(site); setPoolForm({...poolForm,site,horaires:poolHoraires}); setPausesParPeriodeForm(pauses); }}
                      />
                      <div style={{marginTop:6,fontSize:12,fontWeight:700,color:couleurPeriodesProfs}}>
                        Périodes professeurs : {totalPeriodesProfsForm}
                      </div>
                    </div>
                    <div style={{...styles.fc, gridColumn:'1/-1'}}>
                      <label style={styles.lbl}>Classes</label>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(6, minmax(0, 1fr))',gap:8,marginTop:6}}>
                        {classes.filter(c => {
                          const niveaux = parseNiveaux(poolForm.niveau);
                          if (!niveaux.length) return true;
                          if (!c.niveau) return true;
                          return niveaux.some(n => String(c.niveau).toUpperCase() === String(n).toUpperCase());
                        }).map(c => (
                          <label
                            key={c.id}
                            style={{
                              ...styles.checkBadge,
                              display:'flex',
                              alignItems:'center',
                              gap:8,
                              minHeight:36,
                              padding:'7px 10px',
                              borderRadius:10,
                              background:poolForm.classe_ids.includes(c.id)?'#c7d2fe':'#f0f0f0',
                              color:'#111827'
                            }}
                          >
                            <input type="checkbox" checked={poolForm.classe_ids.includes(c.id)} onChange={() => setPoolForm({...poolForm,classe_ids:toggleArr(poolForm.classe_ids,c.id)})} />
                            <span style={{lineHeight:1.2}}>{c.nom}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {(() => {
                      const niveauxSel = parseNiveaux(poolForm.niveau);
                      const niveauSelLabel = niveauxSel.length ? niveauxSel.join(', ') : '';
                      const siteSel = poolForm.site || '';
                      const respecteNiveau = (p) => niveauxSel.length > 0 && niveauxSeChevauchent(p.niveau_prefere, niveauxSel);
                      const respecteLieu = (p) => !!siteSel && (p.lieu_travail_prefere || '') === siteSel;
                      const sortAlpha = (a, b) => (a.prenom || '').localeCompare(b.prenom || '') || (a.nom || '').localeCompare(b.nom || '');
                      const blocsProfs = [
                        {
                          label: `✅ Respecte les deux critères (${niveauSelLabel || '?'} / ${siteSel || '?'})`,
                          items: profs.filter(p => respecteNiveau(p) && respecteLieu(p)).sort(sortAlpha)
                        },
                        {
                          label: `🎯 A une préférence pour ${niveauxSel.length > 1 ? 'ces niveaux' : 'ce niveau'} (${niveauSelLabel || '?'})`,
                          items: profs.filter(p => respecteNiveau(p) && !respecteLieu(p)).sort(sortAlpha)
                        },
                        {
                          label: `📍 A une préférence pour ce lieu de travail (${siteSel || '?'})`,
                          items: profs.filter(p => !respecteNiveau(p) && respecteLieu(p)).sort(sortAlpha)
                        },
                        {
                          label: '👤 Ne respecte pas ces critères',
                          items: profs.filter(p => !respecteNiveau(p) && !respecteLieu(p)).sort(sortAlpha)
                        },
                      ];
                      return (
                        <div style={{...styles.fc, gridColumn:'1/-1'}}>
                          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                            <label style={styles.lbl}>Professeurs</label>
                          </div>
                          {blocsProfs.map(bloc => bloc.items.length > 0 && (
                            <div key={bloc.label} style={{marginBottom:10}}>
                              <div style={{fontSize:11,fontWeight:700,color:'#6366f1',marginBottom:5,textTransform:'uppercase',letterSpacing:.5}}>{bloc.label}</div>
                              <div style={{display:'grid',gridTemplateColumns:'repeat(3, minmax(0, 1fr))',gap:8}}>
                                {bloc.items.map(p => (
                                  <label
                                    key={p.id}
                                    style={{
                                      ...styles.checkBadge,
                                      display:'flex',
                                      alignItems:'center',
                                      gap:8,
                                      minHeight:36,
                                      padding:'7px 10px',
                                      borderRadius:10,
                                      background:poolForm.prof_ids.includes(p.id)?'#c7d2fe':'#f0f0f0',
                                      color:'#111827'
                                    }}
                                  >
                                    <input type="checkbox" checked={poolForm.prof_ids.includes(p.id)} onChange={() => setPoolForm({...poolForm,prof_ids:toggleArr(poolForm.prof_ids,p.id)})} />
                                    <span style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6,flexWrap:'nowrap',lineHeight:1.2,width:'100%'}}>
                                      <span style={{minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.prenom} {nomSansSuffixe(p.nom)}</span>
                                      <span style={{display:'inline-flex',alignItems:'center',gap:5,flexShrink:0}}>
                                        {p.taux_activite ? <span style={{opacity:.75,fontSize:10,fontWeight:700}}>{p.taux_activite}%</span> : null}
                                        <span title={`${p.niveau_prefere ? `Niveau: ${p.niveau_prefere}` : ''}${p.lieu_travail_prefere ? `${p.niveau_prefere ? ' • ' : ''}Lieu: ${p.lieu_travail_prefere}` : ''}`}
                                          style={{fontSize:12,opacity:0.85}}>
                                          {p.niveau_prefere && p.lieu_travail_prefere ? '🎯' : (p.niveau_prefere ? '🎓' : (p.lieu_travail_prefere ? '📍' : '•'))}
                                        </span>
                                      </span>
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:15,width:250}}>
                    <div style={styles.fc}>
                      <label style={styles.lbl}>Horaires</label>
                      <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:8}}>
                        {['Matin','Après-midi'].map(per => (
                          <div key={per} style={{background:'#f8f9fa',borderRadius:8,padding:12}}>
                            <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:'#555'}}>{per}</div>
                            {poolForm.horaires
                              .filter(h => h.periode === per)
                              .sort((a, b) => Number(a.num || 0) - Number(b.num || 0))
                              .map((h,idx) => (
                              <React.Fragment key={`${per}-${h.num || idx}`}>
                                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                                  <span style={{fontSize:12,width:60,color:'#888'}}>P{idx+1}</span>
                                  <span style={{width:70,padding:'4px 6px',fontSize:12,textAlign:'center',background:'#f1f5f9',borderRadius:6,border:'1px solid #e2e8f0',color:'#475569',display:'inline-block'}}>{h.debut}</span>
                                  <span style={{fontSize:11,color:'#aaa'}}>→</span>
                                  <span style={{width:70,padding:'4px 6px',fontSize:12,textAlign:'center',background:'#f1f5f9',borderRadius:6,border:'1px solid #e2e8f0',color:'#475569',display:'inline-block'}}>{h.fin}</span>
                                </div>
                                {idx === 1 && (
                                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                                    <span style={{fontSize:12,width:60,color:'#888'}}>Pause</span>
                                    <span style={{width:70,padding:'4px 6px',fontSize:12,textAlign:'center',background:'#f1f5f9',borderRadius:6,border:'1px solid #e2e8f0',color:'#475569',display:'inline-block'}}>{pausesParPeriodeForm[per].debut}</span>
                                    <span style={{fontSize:11,color:'#aaa'}}>→</span>
                                    <span style={{width:70,padding:'4px 6px',fontSize:12,textAlign:'center',background:'#f1f5f9',borderRadius:6,border:'1px solid #e2e8f0',color:'#475569',display:'inline-block'}}>{pausesParPeriodeForm[per].fin}</span>
                                  </div>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        ))}
                      </div>
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

          {pools.length === 0 && (
            <div style={styles.msgVide}>
              Aucun pool créé. Cliquez sur <strong>+ Ajouter</strong> pour créer votre premier pool.
            </div>
          )}
          <div style={styles.poolsGrid}>
            {pools.map((pool, idx) => (
              <div key={pool.id}
                draggable
                onDragStart={() => { dragPoolIdx.current = idx; }}
                onDragOver={e => { e.preventDefault(); setDragOverPool(idx); }}
                onDragLeave={() => setDragOverPool(null)}
                onDrop={() => { reorderPools(dragPoolIdx.current, idx); setDragOverPool(null); }}
                onDragEnd={() => { dragPoolIdx.current = null; setDragOverPool(null); }}
                style={{...styles.poolCard, cursor:'grab', border: dragOverPool === idx ? '2px dashed #6366f1' : '2px solid transparent', transition:'border 0.15s'}}>
                <div style={styles.rowBetween}>
                  <div style={{display:'flex',flexDirection:'column',gap:2}}>
                    <div style={{fontWeight:700,fontSize:16,color:'#0f172a'}}>{pool.nom}</div>
                    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:2}}>
                      {pool.niveau && <span style={{color:'#0f172a',fontSize:13,fontWeight:400}}>{parseNiveaux(pool.niveau).length > 1 ? 'Niveaux' : 'Niveau'} : {parseNiveaux(pool.niveau).join(', ')}</span>}
                      {pool.site && <span style={{color:'#0f172a',fontSize:13,fontWeight:400}}>Lieu : {pool.site}</span>}
                    </div>
                  </div>
                  {isAdmin() && <div style={{display:'flex',gap:6}}>
                    <button style={styles.btnIconEdit} title="Modifier" onClick={() => {
                      const {poolHoraires, pauses} = getHoraireForLieu(pool.site||'');
                      setPoolEdit(pool); setShowPoolForm(true);
                      setPoolForm({nom:pool.nom,site:pool.site||'',couleur:pool.couleur,
                        niveau:pool.niveau||'',
                        prof_ids:pool.profs.map(p=>p.id),classe_ids:pool.classes.map(c=>c.id),
                        branche_ids:pool.branches.map(b=>b.id),
                        horaires:poolHoraires});
                      setPausesParPeriodeForm(pauses);
                    }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button style={styles.btnIconDel} title="Supprimer" onClick={async () => { if(window.confirm('Supprimer ?')) { await axios.delete(API+'/planning/pools/'+pool.id,{headers}); chargerTout(); } }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>}
                </div>
                <div style={{marginTop:10}}>
                  <div style={styles.poolLabel}>Professeurs</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:4}}>
                    {pool.profs.map(p => (
                      <span key={p.id} style={{display:'inline-block',width:'100%',padding:'4px 10px',borderRadius:999,background:'#eef2ff',color:'#3730a3',fontSize:12,fontWeight:600,textAlign:'center',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',boxSizing:'border-box'}}>
                        {p.prenom} {nomSansSuffixe(p.nom)}
                      </span>
                    ))}
                  </div>
                  {pool.profs.length===0&&<span style={styles.aucun}>Aucun</span>}
                </div>
                <div style={{marginTop:14}}>
                  <div style={styles.poolLabel}>Classes</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                    {pool.classes.map(c => (
                      <span
                        key={c.id}
                        style={{
                          display:'inline-block',
                          width:80,
                          padding:'3px 6px',
                          borderRadius:999,
                          background:'#eef2ff',
                          color:'#3730a3',
                          fontSize:11,
                          fontWeight:600,
                          textAlign:'center',
                          whiteSpace:'nowrap',
                          overflow:'hidden',
                          textOverflow:'ellipsis',
                          boxSizing:'border-box'
                        }}
                      >
                        {c.nom}
                      </span>
                    ))}
                  </div>
                  {pool.classes.length===0&&<span style={styles.aucun}>Aucune</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== AFFECTATIONS ===== */}
      {onglet === 'affectations' && (
        <div>
          {/* Toggles + Dropdowns — une seule ligne */}
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap'}}>
            <div style={styles.toggleGroup}>
              {[{id:'classes',label:'Classes'},{id:'salles',label:'Salles'},{id:'profs',label:'Professeurs'},{id:'branches',label:'Branches'}].map(o => (
                <button key={o.id} style={{...styles.toggleBtn,...(sousOngletAff===o.id?styles.toggleBtnActif:{})}}
                  onClick={async () => {
                    if (sousOngletAff !== o.id && !confirmerQuitterSansSauvegarder()) return;
                    if (sousOngletAff !== o.id) abandonnerChangementsAffectationsCourants();
                    setSousOngletAff(o.id);
                    if (o.id === 'profs') await chargerTout();
                    if (o.id === 'branches' && classePlanningId) await chargerPlanningClasse(classePlanningId, classePlanningPoolId);
                  }}>
                  {o.label}
                </button>
              ))}
            </div>
            {sousOngletAff === 'classes' && (
              <CustomSelect
                value={poolAffId}
                onChange={val => {
                  if (String(val) === String(poolAffId)) return;
                  if (hasClassesUnsaved && !window.confirm("Des changements dans Affectations > Classes ne sont pas sauvegardés. Changer de pool sans sauvegarder ?")) return;
                  if (hasClassesUnsaved) abandonnerClassesNonSauvegardees();
                  setPoolAffId(String(val));
                }}
                options={pools.map(p => ({ value: String(p.id), label: p.nom }))}
                placeholder="Choisir un pool..."
                style={{ minWidth: 180, height: 34 }}
              />
            )}
            {sousOngletAff === 'profs' && (
              <CustomSelect
                value={poolAffId}
                onChange={val => {
                  if (String(val) === String(poolAffId)) return;
                  setPoolAffId(String(val));
                }}
                options={pools.map(p => ({ value: String(p.id), label: p.nom }))}
                placeholder="Choisir un pool..."
                style={{ minWidth: 180, height: 34 }}
              />
            )}
            {sousOngletAff === 'branches' && (
              <>
                <CustomSelect
                  style={styles.selAff}
                  value={classePlanningPoolId || ''}
                  placeholder="Choisir un pool..."
                  options={pools.map(p => ({value: String(p.id), label: p.nom}))}
                  onChange={(poolId) => {
                    if (String(classePlanningPoolId) === String(poolId)) return;
                    if (hasBranchesUnsaved && !window.confirm("Des changements dans Affectations > Branches ne sont pas sauvegardés. Changer de pool sans sauvegarder ?")) return;
                    if (hasBranchesUnsaved) abandonnerBranchesNonSauvegardees();
                    setClassePlanningPoolId(String(poolId)); setClassePlanningId(''); setPlanningClasse(null);
                  }}
                />
                <CustomSelect
                  style={styles.selAff}
                  value={classePlanningId || ''}
                  disabled={!classePlanningPoolId}
                  placeholder={classePlanningPoolId ? 'Choisir une classe' : "Choisir d'abord un pool"}
                  options={classesPoolP.map(c => ({value: c.id, label: c.nom}))}
                  onChange={(classeId) => {
                    if (hasBranchesUnsaved && classeId !== String(classePlanningId || '') && !window.confirm("Des changements dans Affectations > Branches ne sont pas sauvegardés. Changer de classe sans sauvegarder ?")) return;
                    if (hasBranchesUnsaved && classeId !== String(classePlanningId || '')) abandonnerBranchesNonSauvegardees();
                    setClassePlanningId(classeId);
                    if (classeId) chargerPlanningClasse(classeId, classePlanningPoolId); else setPlanningClasse(null);
                  }}
                />
              </>
            )}
            {sousOngletAff === 'salles' && (
              <>
                <CustomSelect
                  value={sallesLieuTravailId}
                  onChange={val => {
                    if (String(val) === String(sallesLieuTravailId)) return;
                    if (hasSallesUnsaved && !window.confirm("Des changements dans Affectations > Salles ne sont pas sauvegardés. Changer de lieu sans sauvegarder ?")) return;
                    if (hasSallesUnsaved) abandonnerSallesNonSauvegardees();
                    setSallesLieuTravailId(val);
                  }}
                  options={lieuxTravailOptions.map(lieu => ({ value: lieu, label: lieu }))}
                  placeholder="Choisir un lieu..."
                  style={{ minWidth: 180, height: 34 }}
                />
                <CustomSelect
                  style={styles.selAff}
                  value={salleSelectionnee}
                  disabled={!sallesLieuTravailId}
                  placeholder={sallesLieuTravailId ? 'Choisir une salle' : "Choisir d'abord un lieu"}
                  options={sallesDisponiblesLieu.map(salle => ({value: salle, label: salle}))}
                  onChange={(v) => {
                    if (hasSallesUnsaved && !window.confirm("Des changements dans Affectations > Salles ne sont pas sauvegardés. Changer de salle sans sauvegarder ?")) return;
                    if (hasSallesUnsaved) abandonnerSallesNonSauvegardees();
                    setSalleSelectionnee(v);
                  }}
                />
              </>
            )}
          </div>

          {/* AFFECTATION CLASSES - toggle cycle exclusif par jour */}
          {sousOngletAff === 'classes' && (
            <div style={{marginTop:0}}>
              {!poolAffId ? (
                <div style={styles.msgVide}>
                  Sélectionnez d'abord un pool pour afficher les classes.
                </div>
              ) : (
              <>
              <div style={{marginBottom:12}}>
                <h3 style={{...styles.suiviGrandTitre,color:'#0f172a',textTransform:'none',letterSpacing:'normal'}}>Couleurs</h3>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:8}}>
                  {classesPool.map(cl => {
                    const selected = String(classeCouleurEditionId) === String(cl.id);
                    return (
                      <button
                        key={`color-class-${cl.id}`}
                        type="button"
                        onClick={() => setClasseCouleurEditionId(selected ? '' : String(cl.id))}
                        style={{
                          ...styles.colorClassChip,
                          background: getCouleurClasse(cl.id),
                          border: selected ? '3px solid #111827' : '2px solid #ffffff',
                          boxShadow: selected ? '0 0 0 2px #cbd5e1' : 'none'
                        }}
                      >
                        {cl.nom}
                      </button>
                    );
                  })}
                </div>
                {classeCouleurEditionId && (
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <span style={{fontSize:12,fontWeight:700,color:'#475569'}}>Choisir la couleur :</span>
                    {COULEURS_CLASSES_DISPONIBLES.map(c => (
                      <button
                        key={`palette-${c}`}
                        type="button"
                        onClick={() => sauverCouleurClasse(classeCouleurEditionId, c)}
                        style={{
                          ...styles.colorPaletteBtn,
                          background:c,
                          border: getCouleurClasse(classeCouleurEditionId) === c ? '3px solid #111827' : '2px solid #ffffff'
                        }}
                        title={c}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div style={{marginTop:16,marginBottom:12}}>
                <h3 style={{...styles.suiviGrandTitre,color:'#0f172a',textTransform:'none',letterSpacing:'normal'}}>Suivi</h3>
                <div style={styles.suiviJoursGrid}>
                  {JOURS.map(j => {
                    const aAffectations = (resumePeriodesParJour[j].matin > 0) || (resumePeriodesParJour[j].apresMidi > 0);
                    return (
                      <div key={j} style={{
                        ...styles.suiviJourChip,
                        background: aAffectations ? '#eef2ff' : '#ffffff',
                        border: `1px solid ${aAffectations ? '#c7d2fe' : '#e2e8f0'}`,
                        color: aAffectations ? '#3730a3' : '#0f172a'
                      }}>
                        <div style={{...styles.suiviJourNom,color: aAffectations ? '#3730a3' : '#0f172a'}}>{j}</div>
                        <div style={{...styles.suiviJourLigne,color: aAffectations ? '#4338ca' : '#475569'}}>Matin : {resumePeriodesParJour[j].matin}</div>
                        <div style={{...styles.suiviJourLigne,color: aAffectations ? '#4338ca' : '#475569'}}>Après-midi : {resumePeriodesParJour[j].apresMidi}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{...styles.tbl, tableLayout:'fixed', width:'100%'}}>
                  <colgroup>
                    <col style={{width:180}} />
                    {JOURS.map(j => <col key={j} style={{width:'calc((100% - 180px) / 5)'}} />)}
                  </colgroup>
                  <thead>
                    <tr style={styles.theadRow}>
                      <th style={{...styles.th,width:180}}>Classe</th>
                      {JOURS.map(j => <th key={j} style={{...styles.th,textAlign:'center'}}>{j}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {classesPool.map((cl) => (
                      <tr key={cl.id} style={{background:'white',borderBottom:'1px solid #e2e8f0'}}>
                        <td style={{...styles.td,fontWeight:800,fontSize:14,color:'#0f172a',width:180}}>
                          {cl.nom}
                        </td>
                        {JOURS.map(jour => {
                          const periode = getHoraireJourClasse(cl.id, jour);
                          return (
                            <td key={jour} style={{padding:'10px 8px',textAlign:'center'}}>
                              <button onClick={() => toggleClasseHoraire(cl.id, jour)} disabled={!isAdmin()} style={{
                                padding:'6px 12px', borderRadius:20, fontWeight:700, fontSize:12,
                                cursor:isAdmin()?'pointer':'default', width:120, transition:'all 0.15s',
                                border: periode==='Matin' ? '2px solid #3b82f6' : periode==='Après-midi' ? '2px solid #f59e0b' : '2px solid #e2e8f0',
                                background: periode==='Matin' ? '#dbeafe' : periode==='Après-midi' ? '#fef3c7' : '#f8fafc',
                                color: periode==='Matin' ? '#1d4ed8' : periode==='Après-midi' ? '#92400e' : '#94a3b8',
                              }}>
                                {periode==='Matin' ? 'Matin' : periode==='Après-midi' ? 'Après-midi' : '-'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
              )}
            </div>
          )}

          {/* AFFECTATION PROFS - profs en entête, classes en lignes par horaire */}
          {sousOngletAff === 'profs' && (
            <div style={{marginTop:12}}>
              {!poolAffId ? (
                <div style={styles.msgVide}>
                  Sélectionnez d'abord un pool pour afficher les professeurs.
                </div>
              ) : (
              <>
              <div style={{marginBottom:12}}>
                <h3 style={{...styles.suiviGrandTitre,color:'#0f172a',textTransform:'none',letterSpacing:'normal'}}>Couleurs</h3>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:8}}>
                  {profsPool.map(p => {
                    const selected = String(profCouleurEditionId) === String(p.id);
                    const bg = getCouleurProf(p.id);
                    const fg = getCouleurTexteSurFond(bg);
                    return (
                      <button
                        key={`color-prof-${p.id}`}
                        type="button"
                        onClick={() => setProfCouleurEditionId(selected ? '' : String(p.id))}
                        style={{
                          ...styles.colorClassChip,
                          background: bg,
                          color: fg,
                          border: selected ? '3px solid #111827' : '2px solid #ffffff',
                          boxShadow: selected ? '0 0 0 2px #cbd5e1' : 'none'
                        }}
                      >
                        {p.prenom} {nomSansSuffixe(p.nom)}
                      </button>
                    );
                  })}
                </div>
                {profCouleurEditionId && (
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <span style={{fontSize:12,fontWeight:700,color:'#475569'}}>Choisir la couleur :</span>
                    {COULEURS_CLASSES_DISPONIBLES.map(c => (
                      <button
                        key={`palette-prof-${c}`}
                        type="button"
                        onClick={() => sauverCouleurProf(profCouleurEditionId, c)}
                        style={{
                          ...styles.colorPaletteBtn,
                          background:c,
                          border: getCouleurProf(profCouleurEditionId) === c ? '3px solid #111827' : '2px solid #ffffff'
                        }}
                        title={c}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div style={{marginTop:16,marginBottom:10}}>
                <h3 style={{...styles.suiviGrandTitre,color:'#0f172a',textTransform:'none',letterSpacing:'normal'}}>Suivi</h3>
                <div style={{display:'flex',gap:8,width:'100%'}}>
                  {suiviClasses.map(cl => {
                    const classeOk = cl.niveauClasse === 'CSC'
                      ? (cl.periodesNormalesAffectees === cl.periodesNormalesRequises && cl.periodesSoutienAffectees === cl.periodesSoutienRequises)
                      : (cl.periodesNormalesAffectees === cl.periodesNormalesRequises);
                    return (
                      <div key={cl.id} style={{
                        ...styles.suiviClasseChip,
                        flex:1,
                        width:'auto',
                        minWidth:0,
                        maxWidth:'none',
                        border: classeOk ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                        background: classeOk ? '#eef2ff' : '#ffffff',
                        color: classeOk ? '#3730a3' : '#0f172a'
                      }}>
                        <div style={styles.suiviClasseNom}>{cl.nom}</div>
                        {cl.niveauClasse === 'CSC' && (
                          <>
                            <div style={styles.suiviClasseLigne}>Périodes : {cl.periodesNormalesAffectees} / {cl.periodesNormalesRequises}</div>
                            <div style={styles.suiviClasseLigne}>Soutien : {cl.periodesSoutienAffectees} / {cl.periodesSoutienRequises}</div>
                          </>
                        )}
                        {cl.niveauClasse !== 'CSC' && (
                          <div style={styles.suiviClasseLigne}>Périodes {cl.periodesNormalesAffectees}/{cl.periodesNormalesRequises}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{overflowX:'auto'}}>
              <table style={{...styles.tbl,tableLayout:'fixed',minWidth:200+profsPool.length*140,border:'none',boxShadow:'none'}}>
                <colgroup>
                  <col style={{width: LARGEUR_COLONNE_CRENEAU}} />
                  {profsPool.map(p => <col key={`col-main-${p.id}`} />)}
                </colgroup>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{...styles.th,width:LARGEUR_COLONNE_CRENEAU,minWidth:LARGEUR_COLONNE_CRENEAU,maxWidth:LARGEUR_COLONNE_CRENEAU,textAlign:'center'}}>Horaire</th>
                    {profsPool.map(p => {
                      const totalProf = parseInt(p.periodes_semaine) || 0;
                      const totalAffecte = periodesAffecteesParProf[p.id] || 0;
                      const couleurProf = getCouleurProf(p.id);
                      const couleurTexteProf = getCouleurTexteSurFond(couleurProf);
                      return (
                        <th key={p.id} style={{...styles.th, textAlign:'center', background: couleurProf, color: couleurTexteProf}}>
                          {nomSansSuffixe(p.nom)}<br/><span style={{fontWeight:400,fontSize:11}}>{formaterPrenomEntete(p.prenom)}</span>
                          <div style={{fontWeight:700,fontSize:11,marginTop:4,color: couleurTexteProf}}>
                            {totalAffecte} / {totalProf}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr style={styles.tr}>
                    <td style={{...styles.td,background:'#f8f9fa',fontWeight:700,fontSize:12,whiteSpace:'nowrap',width:LARGEUR_COLONNE_CRENEAU,minWidth:LARGEUR_COLONNE_CRENEAU,maxWidth:LARGEUR_COLONNE_CRENEAU,textAlign:'center'}}>
                      Titulariat
                    </td>
                    {profsPool.map(prof => {
                      const selectedClasseId = String(titulariatsDraftByProf[String(prof.id)] || '');
                      const classesDejaAttribueesAuxAutres = new Set(
                        Object.entries(titulariatsDraftByProf || {})
                          .filter(([profId, classeId]) => String(profId) !== String(prof.id) && classeId)
                          .map(([, classeId]) => String(classeId))
                      );
                      const options = classesPoolTriees.filter(cl =>
                        !classesDejaAttribueesAuxAutres.has(String(cl.id)) || String(cl.id) === selectedClasseId
                      );
                      return (
                        <td key={`titulariat-${prof.id}`} style={{...styles.td,padding:'8px 4px',background:'#fff',textAlign:'center'}}>
                          <select
                            style={styles.cellSel}
                            value={selectedClasseId}
                            onChange={e => {
                              const classeId = String(e.target.value || '');
                              setTitulariatsDraftByProf(prev => {
                                const next = { ...prev };
                                Object.keys(next).forEach((pid) => {
                                  if (String(pid) !== String(prof.id) && String(next[pid] || '') === classeId) {
                                    next[pid] = '';
                                  }
                                });
                                next[String(prof.id)] = classeId;
                                return next;
                              });
                              setHasAffectationsUnsaved(true);
                            }}
                            disabled={!isAdmin()}
                          >
                            <option value="">—</option>
                            {options.map(cl => (
                              <option key={`titulariat-option-${prof.id}-${cl.id}`} value={String(cl.id)}>
                                {cl.nom}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
              {JOURS.map(jour => {
                const crs = creneaux.filter(c => c.jour===jour);
                if (!crs.length) return null;
                return (
                  <table key={`jour-${jour}`} style={{...styles.tbl,tableLayout:'fixed',minWidth:200+profsPool.length*140,marginTop:30,border:'none',boxShadow:'none'}}>
                    <colgroup>
                      <col style={{width: LARGEUR_COLONNE_CRENEAU}} />
                      {profsPool.map(p => <col key={`col-${jour}-${p.id}`} />)}
                    </colgroup>
                    <tbody>
                      <tr>
                        <td colSpan={profsPool.length+1} style={{padding:0,border:'none',background:'transparent'}}>
                          <div style={{background:'#6366f1',color:'#ffffff',textAlign:'center',fontWeight:800,fontSize:12,padding:'6px 14px',textTransform:'uppercase',letterSpacing:'0.04em'}}>
                            {jour}
                          </div>
                        </td>
                      </tr>
                      {['Matin','Après-midi'].map(per => {
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
                              <td style={{...styles.td,background:'#f8f9fa',fontWeight:600,fontSize:12,whiteSpace:'nowrap',width:LARGEUR_COLONNE_CRENEAU,minWidth:LARGEUR_COLONNE_CRENEAU,maxWidth:LARGEUR_COLONNE_CRENEAU}}>
                                P{per==='Matin' ? idx+1 : idx+5} — {cr.heure_debut}–{cr.heure_fin}
                              </td>
                              {profsPool.map(prof => {
                                const aff = affectationsDraft.find(a => a.prof_id==prof.id && a.creneau_id==cr.id);
                                const indispo = disposAffectations[`${prof.id}-${cr.id}`] === false;
                                const classeAffecteeVisible = aff && aff.classe_id
                                  ? classesCours.some(cl => String(cl.id) === String(aff.classe_id))
                                  : false;
                                const affAffichable = aff && (aff.type_special || classeAffecteeVisible);
                                const modeAffectation = affAffichable ? (affectationModes[aff.id] || 'classe') : 'classe';
                                const valeurSelect = affAffichable
                                  ? (aff.type_special
                                      ? `special:${aff.type_special}`
                                      : (modeAffectation === 'soutien' ? `soutien:${aff.classe_id}` : String(aff.classe_id)))
                                  : '';
                                const classeIdCouleur = getClasseIdDepuisValeurAffectation(valeurSelect);
                                const estSpecialSelectionne = String(valeurSelect || '').startsWith('special:');
                                const couleurSelectProf = indispo
                                  ? '#e5e7eb'
                                  : (estSpecialSelectionne ? '#111111' : (classeIdCouleur ? getCouleurClasse(classeIdCouleur) : '#ffffff'));
                                const couleurTexteSelectProf = indispo ? '#6b7280' : (estSpecialSelectionne ? '#ffffff' : '#1f2937');
                                const poidsTexteSelectProf = estSpecialSelectionne ? 700 : 500;
                                return (
                                  <td key={prof.id} style={{...styles.td,padding:'8px 4px',background:'#fff',textAlign:'center'}}>
                                    <select style={{...styles.cellSel,background:couleurSelectProf,color:couleurTexteSelectProf,fontWeight:poidsTexteSelectProf}}
                                      value={valeurSelect}
                                      onChange={e => {
                                        if (indispo) return;
                                        const valeur = e.target.value;
                                        const draftId = () => `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                                        if (!valeur) {
                                          const a = affectationsDraft.find(x => x.prof_id==prof.id && x.creneau_id==cr.id);
                                          if (!a) return;
                                          setAffectationsDraft(prev => prev.filter(x => !(x.prof_id==prof.id && x.creneau_id==cr.id)));
                                          setAffectationModes(prev => {
                                            const next = { ...prev };
                                            delete next[a.id];
                                            return next;
                                          });
                                          setHasAffectationsUnsaved(true);
                                        } else {
                                          const estSpecial = valeur.startsWith('special:');
                                          const estSoutien = valeur.startsWith('soutien:');
                                          const typeSpecial = estSpecial ? valeur.split(':')[1] : null;
                                          const classe_id = estSoutien ? valeur.split(':')[1] : (estSpecial ? null : valeur);
                                          const ancienne = affectationsDraft.find(x => x.prof_id==prof.id && x.creneau_id==cr.id);
                                          // Vérifier si cette classe est déjà prise sur ce horaire par un autre prof
                                          const conflit = !estSpecial
                                            ? affectationsDraft.find(x => x.classe_id==classe_id && x.creneau_id==cr.id && x.prof_id!=prof.id)
                                            : null;
                                          if (conflit) {
                                            const profConflit = profsPool.find(p => p.id === conflit.prof_id);
                                            const nomProfConflit = profConflit ? `${profConflit.prenom} ${nomSansSuffixe(profConflit.nom)}` : 'un autre professeur';
                                            const classeNom = (classesPool.find(c => String(c.id) === String(classe_id)) || {}).nom || classe_id;
                                            const confirmer = window.confirm(
                                              `La classe ${classeNom} est déjà affectée à ${nomProfConflit} sur cet horaire.\n\nVoulez-vous échanger ces périodes ?`
                                            );
                                            if (!confirmer) return;

                                            setAffectationsDraft(prev => {
                                              const next = prev.map(a => ({ ...a }));
                                              const idxConflit = next.findIndex(x => x.id === conflit.id);
                                              const idxAncienne = ancienne ? next.findIndex(x => x.id === ancienne.id) : -1;
                                              if (idxConflit >= 0) {
                                                if (ancienne && String(ancienne.classe_id || '') !== String(classe_id || '')) {
                                                  next[idxConflit].classe_id = ancienne.classe_id || null;
                                                  next[idxConflit].type_special = ancienne.type_special || null;
                                                  next[idxConflit].matiere_id = ancienne.matiere_id || null;
                                                } else {
                                                  next.splice(idxConflit, 1);
                                                }
                                              }
                                              if (idxAncienne >= 0) {
                                                next[idxAncienne].classe_id = estSpecial ? null : classe_id;
                                                next[idxAncienne].type_special = typeSpecial;
                                                if (estSpecial || estSoutien || String(ancienne.classe_id || '') !== String(classe_id || '')) {
                                                  next[idxAncienne].matiere_id = null;
                                                }
                                              } else {
                                                next.push({
                                                  id: draftId(),
                                                  prof_id: prof.id,
                                                  classe_id: estSpecial ? null : classe_id,
                                                  matiere_id: null,
                                                  creneau_id: cr.id,
                                                  type_special: typeSpecial,
                                                });
                                              }
                                              return next;
                                            });
                                            setAffectationModes(prev => {
                                              const next = { ...prev };
                                              if (ancienne) next[ancienne.id] = estSpecial ? 'special' : (estSoutien ? 'soutien' : 'classe');
                                              return next;
                                            });
                                            setHasAffectationsUnsaved(true);
                                            return;
                                          }
                                          // Supprimer ancienne affectation de CE prof pour CE horaire
                                          setAffectationsDraft(prev => {
                                            const next = prev.map(a => ({ ...a }));
                                            const idxAncienne = next.findIndex(x => ancienne && x.id === ancienne.id);
                                            if (idxAncienne >= 0) {
                                              next[idxAncienne].classe_id = estSpecial ? null : classe_id;
                                              next[idxAncienne].type_special = typeSpecial;
                                              if (estSpecial || estSoutien || String(ancienne.classe_id || '') !== String(classe_id || '')) {
                                                next[idxAncienne].matiere_id = null;
                                              }
                                            } else {
                                              next.push({
                                                id: draftId(),
                                                prof_id: prof.id,
                                                classe_id: estSpecial ? null : classe_id,
                                                matiere_id: null,
                                                creneau_id: cr.id,
                                                type_special: typeSpecial,
                                              });
                                            }
                                            return next;
                                          });
                                          setAffectationModes(prev => {
                                            const next = { ...prev };
                                            const key = ancienne?.id || '';
                                            if (key) next[key] = estSpecial ? 'special' : (estSoutien ? 'soutien' : 'classe');
                                            return next;
                                          });
                                          setHasAffectationsUnsaved(true);
                                        }
                                      }}
                                      disabled={!isAdmin() || indispo}>
                                      <option value="">—</option>
                                      <optgroup label="Classes">
                                        {classesCours.map(cl => <option key={cl.id} value={String(cl.id)}>{cl.nom}</option>)}
                                      </optgroup>
                                      {poolEstCSC && (
                                        <optgroup label="Soutien">
                                          {classesCours.map(cl => (
                                            <option key={`soutien-${cl.id}`} value={`soutien:${cl.id}`}>
                                              {cl.nom} - Soutien
                                            </option>
                                          ))}
                                        </optgroup>
                                      )}
                                      <optgroup label="Spécial">
                                        <option value="special:titulariat">Titulariat</option>
                                        <option value="special:atelier">Atelier</option>
                                        <option value="special:autre">Autre</option>
                                      </optgroup>
                                    </select>
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        ];
                      })}
                    </tbody>
                  </table>
                );
              })}
            </div>
            </>
            )}
            </div>
          )}

          {sousOngletAff === 'salles' && (
            <div style={{marginTop:12}}>
              {!sallesLieuTravailId ? (
                <div style={styles.msgVide}>
                  Sélectionnez d'abord un lieu de travail pour afficher les classes.
                </div>
              ) : (
                <div>
                  <div style={{marginBottom:12}}>
                    <h3 style={{...styles.suiviGrandTitre,color:'#0f172a',textTransform:'none',letterSpacing:'normal'}}>Affectation rapide</h3>
                    <div style={{display:'flex',alignItems:'center',gap:8,minHeight:40,flexWrap:'nowrap',overflowX:'auto'}}>
                      <select
                        style={{...styles.sel, minWidth:260, height:38, textAlign:'center', textAlignLast:'center'}}
                        value={classeRapideId}
                        onChange={e => setClasseRapideId(e.target.value)}
                        disabled={!sallesLieuTravailId}
                      >
                        <option value="">Choisir classe 1</option>
                        {classesPourSalles
                        .filter(cl => !classeRapideId2 || String(cl.id) !== String(classeRapideId2) || String(cl.id) === String(classeRapideId))
                        .map(cl => (
                          <option key={cl.id} value={String(cl.id)}>{cl.nom}</option>
                        ))}
                      </select>
                      <select
                        style={{...styles.sel, minWidth:260, height:38, textAlign:'center', textAlignLast:'center'}}
                        value={classeRapideId2}
                        onChange={e => setClasseRapideId2(e.target.value)}
                        disabled={!sallesLieuTravailId}
                      >
                        <option value="">Choisir classe 2 (optionnel)</option>
                        {classesPourSalles
                        .filter(cl => !classeRapideId || String(cl.id) !== String(classeRapideId) || String(cl.id) === String(classeRapideId2))
                        .map(cl => (
                          <option key={`classe2-${cl.id}`} value={String(cl.id)}>{cl.nom}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        style={{...styles.btnBleu, opacity: (!isAdmin() || (!classeRapideId && !classeRapideId2) || !salleSelectionnee) ? 0.65 : 1}}
                        disabled={!isAdmin() || (!classeRapideId && !classeRapideId2) || !salleSelectionnee}
                        onClick={handleAffectationRapideClasse}
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                  <div style={{marginTop:16,marginBottom:12}}>
                    <h3 style={{...styles.suiviGrandTitre,color:'#0f172a',textTransform:'none',letterSpacing:'normal'}}>Suivi</h3>
                    {suiviSalles.length === 0 ? (
                      <div style={styles.msgVide}>Aucune salle configurée pour ce lieu.</div>
                    ) : (
                      <div style={{display:'flex',gap:8,width:'100%'}}>
                        {suiviSalles.map(salle => (
                          <div
                            key={salle.salle}
                            style={{
                              ...styles.suiviBrancheChip,
                              flex:1,
                              width:'auto',
                              minWidth:0,
                              maxWidth:'none',
                              borderColor: salle.complet ? '#c7d2fe' : '#e2e8f0',
                              background: salle.complet ? '#eef2ff' : '#ffffff',
                              color: salle.complet ? '#3730a3' : '#0f172a'
                            }}
                          >
                            <div style={styles.suiviBrancheNom}>{salle.salle}</div>
                            <div style={styles.suiviBrancheLigne}>{salle.complet ? 'Complet' : 'Non complet'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {!salleSelectionnee ? (
                    <div style={styles.msgVide}>
                      Sélectionnez d'abord une salle pour afficher les classes à affecter par horaire.
                    </div>
                  ) : (
                    <div style={{overflowX:'auto'}}>
                      <table style={{...styles.tbl,minWidth:760}}>
                        <thead>
                          <tr style={styles.theadRow}>
                            <th style={{...styles.th,width:LARGEUR_COLONNE_CRENEAU,minWidth:LARGEUR_COLONNE_CRENEAU,maxWidth:LARGEUR_COLONNE_CRENEAU,textAlign:'center'}}>Horaire</th>
                            {JOURS.map(j => <th key={j} style={{...styles.th,textAlign:'center'}}>{j}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {classesFiltreesSalles.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{...styles.td, textAlign:'center', color:'#64748b', fontSize:12, fontStyle:'italic', fontFamily:"'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif"}}>
                                Aucune classe trouvée pour cette sélection.
                              </td>
                            </tr>
                          ) : (
                            ['Matin','Après-midi'].map(periode => {
                              const crsBase = creneaux.filter(c => c.jour==='Lundi' && c.periode===periode);
                              if (!crsBase.length) return null;
                              return [
                                <tr key={periode}><td colSpan={6} style={styles.periodeBande}>{periode}</td></tr>,
                                ...crsBase.map((crBase, idx) => (
                                  <tr key={crBase.id} style={styles.tr}>
                                    <td style={{...styles.td,background:'#f8f9fa',fontWeight:600,fontSize:12,whiteSpace:'nowrap',width:LARGEUR_COLONNE_CRENEAU,minWidth:LARGEUR_COLONNE_CRENEAU,maxWidth:LARGEUR_COLONNE_CRENEAU}}>
                                      P{periode==='Matin' ? idx+1 : idx+5} — {crBase.heure_debut}–{crBase.heure_fin}
                                    </td>
                                    {JOURS.map(jour => {
                                      const classesCellule = getClassesAffectablesSalleCellule(jour, periode, crBase.ordre);
                                      const classeAffectee = getClasseAffecteeSalleCellule(jour, periode, crBase.ordre);
                                      const profAffecte = getProfAffecteSalleCellule(jour, periode, crBase.ordre, classeAffectee);
                                      const couleurClasse = classeAffectee ? getCouleurClasse(classeAffectee) : '#ffffff';
                                      return (
                                        <td key={jour} style={{...styles.td, textAlign:'left', verticalAlign:'top', minHeight:62}}>
                                          <select
                                            style={{...styles.cellSel, minWidth: 160, backgroundColor: couleurClasse, fontWeight: classeAffectee ? 700 : 500, color:'#1f2937', textAlign:'center', textAlignLast:'center'}}
                                            value={classeAffectee}
                                            onChange={e => handleAffectationSalleChange({
                                              jour,
                                              periode,
                                              ordre: crBase.ordre,
                                              classeId: e.target.value,
                                            })}
                                            disabled={!isAdmin() || classesCellule.length === 0}
                                          >
                                            <option value="">— Aucune classe —</option>
                                            {classesCellule.map(cl => (
                                              <option key={`${jour}-${periode}-${cl.id}`} value={String(cl.id)}>
                                              {cl.nom}
                                              </option>
                                            ))}
                                          </select>
                                          {classeAffectee && (
                                            <input
                                              readOnly
                                              value={profAffecte || 'Aucun professeur affecté'}
                                              style={{
                                                ...styles.cellSel,
                                                marginTop: 6,
                                                minWidth: 160,
                                                background: '#f1f5f9',
                                                color: '#334155',
                                                fontWeight: 600,
                                                cursor: 'default',
                                                textAlign: 'center'
                                              }}
                                            />
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))
                              ];
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AFFECTATION PLANNING CLASSE */}
          {sousOngletAff === 'branches' && (
            <div>
              {!classePlanningPoolId && (
                <div style={styles.msgVide}>
                  Sélectionnez d'abord un pool pour afficher les classes.
                </div>
              )}
              {classePlanningPoolId && !classePlanningId && (
                <div style={styles.msgVide}>Sélectionnez d'abord une classe pour afficher les branches.</div>
              )}

              {planningClasse && classePlanningId && (
                <div>
                  <div style={{marginBottom:12}}>
                    <h3 style={{...styles.suiviGrandTitre,color:'#0f172a',textTransform:'none',letterSpacing:'normal'}}>Couleurs</h3>
                    <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:8}}>
                      {matieresPourPlanningClasse.map(m => {
                        const selected = String(brancheCouleurEditionId) === String(m.id);
                        const bg = getCouleurBranche(m.id);
                        const fg = getCouleurTexteSurFond(bg);
                        return (
                          <button
                            key={`color-branche-${m.id}`}
                            type="button"
                            onClick={() => setBrancheCouleurEditionId(selected ? '' : String(m.id))}
                            style={{
                              ...styles.colorClassChip,
                              background: bg,
                              color: fg,
                              border: selected ? '3px solid #111827' : '2px solid #ffffff',
                              boxShadow: selected ? '0 0 0 2px #cbd5e1' : 'none'
                            }}
                          >
                            {m.designation_courte || m.nom}
                          </button>
                        );
                      })}
                    </div>
                    {brancheCouleurEditionId && (
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        <span style={{fontSize:12,fontWeight:700,color:'#475569'}}>Choisir la couleur :</span>
                        {COULEURS_CLASSES_DISPONIBLES.map(c => (
                          <button
                            key={`palette-branche-${c}`}
                            type="button"
                            onClick={() => sauverCouleurBranche(brancheCouleurEditionId, c)}
                            style={{
                              ...styles.colorPaletteBtn,
                              background:c,
                              border: getCouleurBranche(brancheCouleurEditionId) === c ? '3px solid #111827' : '2px solid #ffffff'
                            }}
                            title={c}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{marginTop:16,marginBottom:12}}>
                    <h3 style={{...styles.suiviGrandTitre,color:'#0f172a',textTransform:'none',letterSpacing:'normal'}}>Préférences</h3>
                    {suiviPreferencesBranches.length === 0 ? (
                      <div style={{fontSize:12,color:'#64748b',fontWeight:600,marginBottom:14}}>Aucun professeur affecté à cette classe pour le moment.</div>
                    ) : (
                      <div style={styles.suiviPrefsGrid}>
                        {suiviPreferencesBranches.map((item) => (
                          <div key={item.profId} style={{...styles.suiviPrefCard,background:'#ffffff',borderColor:'#e2e8f0'}}>
                            <div style={styles.suiviPrefHead}>
                              <div style={{...styles.suiviPrefNom,color:'#0f172a'}}>{item.nom}</div>
                              <span style={styles.suiviPrefTagAutre}>Autre ({item.compteAutres})</span>
                            </div>
                            {item.branchesPrefs.length === 0 ? (
                              <div style={styles.suiviPrefLigne}>Aucune préférence de branche</div>
                            ) : (
                              <div style={styles.suiviPrefTags}>
                                {item.branchesPrefs.map((b) => (
                                  <span
                                    key={`${item.profId}-${b.id}`}
                                    style={b.affectee ? styles.suiviPrefTagOk : styles.suiviPrefTag}
                                  >
                                    {b.label} ({b.compte})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{marginTop:16,marginBottom:12}}>
                    <h3 style={{...styles.suiviGrandTitre,color:'#0f172a',textTransform:'none',letterSpacing:'normal'}}>Suivi</h3>
                    {suiviBranchesClasse.length === 0 ? (
                      <div style={{fontSize:12,color:'#64748b',fontWeight:600}}>Aucune branche trouvée pour ce niveau.</div>
                    ) : (
                      <div style={{display:'flex',gap:8,width:'100%'}}>
                        {suiviBranchesClasse.map(b => {
                          const ok = b.affectees === b.requises;
                          return (
                            <div key={b.id} style={{
                              ...styles.suiviBrancheChip,
                              flex:1,
                              width:'auto',
                              minWidth:0,
                              maxWidth:'none',
                              borderColor: ok ? '#c7d2fe' : '#e2e8f0',
                              background: ok ? '#eef2ff' : '#ffffff',
                              color: ok ? '#3730a3' : '#0f172a'
                            }}>
                              <div style={styles.suiviBrancheNom}>{b.nom}</div>
                              <div style={styles.suiviBrancheLigne}>Périodes {b.affectees}/{b.requises}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{fontWeight:700,fontSize:18,marginBottom:12}}>{planningClasse.classe?.nom}{planningClasse.classe?.titulaire_nom ? ` — Titulaire : ${planningClasse.classe.titulaire_nom}` : ''}</div>

                  <div style={{overflowX:'auto'}}>
                    <table style={{...styles.tbl,width:'100%',tableLayout:'fixed'}}>
                      <thead>
                        <tr style={styles.theadRow}>
                          <th style={{...styles.th,...STYLE_COLONNE_CRENEAU,textAlign:'center'}}>Horaire</th>
                          {JOURS.map(j => <th key={j} style={{...styles.th,textAlign:'center',width:LARGEUR_COLONNE_JOUR,minWidth:LARGEUR_COLONNE_JOUR,maxWidth:LARGEUR_COLONNE_JOUR}}>{j}</th>)}
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
                                <td style={{...styles.td,...STYLE_COLONNE_CRENEAU,background:'#f8f9fa',fontWeight:600,fontSize:12,whiteSpace:'nowrap'}}>
                                  P{periode==='Matin' ? idx+1 : idx+5} — {crBase.heure_debut}–{crBase.heure_fin}
                                </td>
                                {JOURS.map(jour => {
                                  const cr = (planningClasse.creneaux||[]).find(c=>c.jour===jour&&c.periode===periode&&c.ordre===crBase.ordre);
                                  if (!cr) return <td key={jour} style={{...styles.td,background:'#f5f5f5',width:LARGEUR_COLONNE_JOUR,minWidth:LARGEUR_COLONNE_JOUR,maxWidth:LARGEUR_COLONNE_JOUR}}></td>;
                                  const aCours = classeAHorairePlanning(jour, periode);
                                  const aff = aCours ? planningClasseAffectations.find(a=>a.creneau_id===cr.id) : null;
                                  const couleurFondProf = aff ? getCouleurProf(aff.prof_id) : '#ffffff';
                                  const couleurTexteProf = aff ? getCouleurTexteSurFond(couleurFondProf) : '#111827';
                                  return (
                                    <td key={jour} style={{...styles.td,textAlign:'center',fontSize:12,width:LARGEUR_COLONNE_JOUR,minWidth:LARGEUR_COLONNE_JOUR,maxWidth:LARGEUR_COLONNE_JOUR,
                                      background:aff?couleurFondProf:(aCours?'#fff':'#f5f5f5'),
                                      color: aff ? couleurTexteProf : undefined}}>
                                      {aff ? (
                                        <div>
                                          <b style={{color:couleurTexteProf,fontSize:12}}>{formaterNomComplet(aff.prof_nom)}</b>
                                          {isAdmin() ? (
                                            <select style={{...styles.cellSel,marginTop:4,fontSize:11,textAlign:'center',textAlignLast:'center'}}
                                              value={Object.prototype.hasOwnProperty.call(branchesMatiereDraftMap, String(aff.id))
                                                ? (branchesMatiereDraftMap[String(aff.id)] || '')
                                                : (aff.matiere_id||'')}
                                              onChange={ev => {
                                                const valeur = ev.target.value || '';
                                                setBranchesMatiereDraftMap(prev => ({ ...prev, [String(aff.id)]: valeur }));
                                                setHasBranchesUnsaved(true);
                                                // Force un rerender immédiat pour refléter le suivi des branches
                                                // (comptes/préférences) sans attendre la sauvegarde.
                                                setPlanningClasse(prev => (prev ? { ...prev } : prev));
                                              }}>
                                              <option value="">— Branche —</option>
                                              {matieresPourPlanningClasse.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                                            </select>
                                          ) : (
                                            aff.matiere_nom && <div style={{color:'#666',fontSize:11}}>{aff.matiere_nom}</div>
                                          )}
                                        </div>
                                      ) : aCours ? <span style={{color:'#dc2626',fontSize:11,fontWeight:700}}>Aucun professeur affecté</span> : ''}
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
        </div>
      )}

      {(onglet === 'plannings' && sousOngletPlanning === 'salle') && (
        <div>
          {!sallesLieuTravailId ? (
            <div style={styles.msgVide}>
              Sélectionnez d'abord un lieu de travail pour afficher les classes.
            </div>
          ) : (
            <div>
              {!salleSelectionnee ? (
                <div style={styles.msgVide}>
                  Sélectionnez d'abord une salle pour afficher son planning.
                </div>
              ) : (
                <div>
                  <div style={{fontSize:18,marginBottom:12,color:'#0f172a'}}>
                    <span style={{fontWeight:700}}>Site :</span>
                    <span style={{fontWeight:400}}> {sallesLieuTravailId}</span>
                    <span style={{fontWeight:700}}> - Salle :</span>
                    <span style={{fontWeight:400}}> {salleSelectionnee}</span>
                  </div>
                  <div style={{overflowX:'auto'}}>
                  <table style={{...styles.tbl,minWidth:200+JOURS.length*140,tableLayout:'fixed',width:'100%'}}>
                    <thead>
                      <tr style={styles.theadRow}>
                        <th style={{...styles.th,width:LARGEUR_COLONNE_PERIODE_UI,minWidth:LARGEUR_COLONNE_PERIODE_UI,maxWidth:LARGEUR_COLONNE_PERIODE_UI}}></th>
                        <th style={{...styles.th,...STYLE_COLONNE_CRENEAU,textAlign:'center'}}>Horaire</th>
                        {JOURS.map(j => <th key={`planning-only-${j}`} style={{...styles.th,textAlign:'center',width:LARGEUR_COLONNE_JOUR,minWidth:LARGEUR_COLONNE_JOUR,maxWidth:LARGEUR_COLONNE_JOUR}}>{j}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {classesFiltreesSalles.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{...styles.td, textAlign:'center', color:'#64748b', fontWeight:600}}>
                            Aucune classe trouvée pour cette sélection.
                          </td>
                        </tr>
                      ) : (
                        ['Matin','Après-midi'].map((periode, periodeIdx) => {
                          const crsBase = creneaux.filter(c => c.jour==='Lundi' && c.periode===periode);
                          if (!crsBase.length) return null;
                          const numRows = crsBase.length + 1;
                          return [
                            ...crsBase.flatMap((crBase, idx) => [
                              <tr key={`planning-only-${crBase.id}`} style={{...styles.tr, height:HAUTEUR_LIGNE_COURS_UI}}>
                                {idx === 0 && (
                                  <td rowSpan={numRows} style={{width:LARGEUR_COLONNE_PERIODE_UI,minWidth:LARGEUR_COLONNE_PERIODE_UI,maxWidth:LARGEUR_COLONNE_PERIODE_UI,padding:0,overflow:'hidden',borderRight:'1px solid #e5e7eb',background:'#f8fafc',verticalAlign:'middle',textAlign:'center'}}>
                                    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',width:'100%'}}>
                                      <span style={{display:'inline-block',transform:'rotate(-90deg)',fontWeight:700,color:'#334155',whiteSpace:'nowrap',lineHeight:1}}>{periode}</span>
                                    </div>
                                  </td>
                                )}
                                <td style={{...styles.td,...STYLE_COLONNE_CRENEAU,...STYLE_TD_HORAIRE_UI,height:HAUTEUR_LIGNE_COURS_UI}}>
                                  P{periode==='Matin' ? idx+1 : idx+5} — {crBase.heure_debut}–{crBase.heure_fin}
                                </td>
                                {JOURS.map(jour => {
                                  const classeAffectee = getClasseAffecteeSalleCellule(jour, periode, crBase.ordre);
                                  const profAffecte = getProfAffecteSalleCellule(jour, periode, crBase.ordre, classeAffectee);
                                  const couleurClasse = classeAffectee ? getCouleurClasse(classeAffectee) : '#ffffff';
                                  const classeNom = classes.find(cl => String(cl.id) === String(classeAffectee))?.nom || '';
                                  return (
                                    <td key={`planning-only-${jour}-${crBase.id}`} style={{...styles.td,...STYLE_TD_COURS_UI,height:HAUTEUR_LIGNE_COURS_UI,width:LARGEUR_COLONNE_JOUR,minWidth:LARGEUR_COLONNE_JOUR,maxWidth:LARGEUR_COLONNE_JOUR}}>
                                      <div style={{fontWeight:classeNom?700:500,color:classeNom?'#1f2937':'#94a3b8',background:couleurClasse,borderRadius:6,padding:'3px 8px',textAlign:'center'}}>{classeNom||'—'}</div>
                                      {classeNom&&<div style={{color:'#334155',fontWeight:600,fontSize:11,marginTop:3,textAlign:'center'}}>{profAffecte||'Aucun professeur affecté'}</div>}
                                    </td>
                                  );
                                })}
                              </tr>,
                              ...(idx === 1 ? [(
                                <tr key={`planning-only-pause-${periode}`} style={{height:HAUTEUR_LIGNE_PAUSE_UI}}>
                                  <td style={{...styles.td,...STYLE_COLONNE_CRENEAU,...STYLE_TD_PAUSE_UI,height:HAUTEUR_LIGNE_PAUSE_UI}}>
                                    {pausesParPeriode[periode].debut}–{pausesParPeriode[periode].fin}
                                  </td>
                                  <td colSpan={5} style={{...STYLE_TD_PAUSE_UI,height:HAUTEUR_LIGNE_PAUSE_UI}}>PAUSE</td>
                                </tr>
                              )] : [])
                            ]),
                            periodeIdx === 0 ? <tr key={`sep-salle-${periode}`}><td colSpan={7} style={{height:HAUTEUR_LIGNE_COURS_UI,background:'white',border:'none',padding:0}}></td></tr> : null
                          ].filter(Boolean);
                        })
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== PLANNING PROFS ===== */}
      {(onglet === 'plannings' && sousOngletPlanning === 'professeurs') && (
        <div>
          {!profPlanningId && (
            <div style={styles.msgVide}>Sélectionnez d'abord un professeur pour afficher son planning.</div>
          )}
          {planningProf && profPlanningId && (
            <div style={{overflowX:'auto'}}>
              <div style={{fontSize:18,marginBottom:12,color:'#0f172a'}}>
                <span style={{fontWeight:700}}>{planningProf.prof?.prenom} {nomSansSuffixe(planningProf.prof?.nom)}</span>
                {planningProf.classesTitulaire?.length > 0 && (
                  <>
                    <span style={{fontWeight:700}}> - Titulaire :</span>
                    <span style={{fontWeight:400}}> {planningProf.classesTitulaire.map(c=>c.nom).join(', ')}</span>
                  </>
                )}
              </div>
              <table style={{...styles.tbl,width:'100%',tableLayout:'fixed',minWidth:200+JOURS.length*140}}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{...styles.th,width:LARGEUR_COLONNE_PERIODE_UI,minWidth:LARGEUR_COLONNE_PERIODE_UI,maxWidth:LARGEUR_COLONNE_PERIODE_UI}}></th>
                    <th style={{...styles.th,...STYLE_COLONNE_CRENEAU,textAlign:'center'}}>Horaire</th>
                    {JOURS.map(j => <th key={j} style={{...styles.th,width:LARGEUR_COLONNE_JOUR,minWidth:LARGEUR_COLONNE_JOUR,maxWidth:LARGEUR_COLONNE_JOUR,textAlign:'center'}}>{j}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {['Matin','Après-midi'].map((periode, periodeIdx) => {
                    const crsBase = (planningProf.creneaux||[]).filter(c=>c.jour==='Lundi'&&c.periode===periode);
                    if (!crsBase.length) return null;
                    const numRows = crsBase.length + 1;
                    return [
                      ...crsBase.flatMap((crBase,idx) => [
                        <tr key={crBase.id} style={{...styles.tr, height:HAUTEUR_LIGNE_COURS_UI}}>
                          {idx === 0 && (
                            <td rowSpan={numRows} style={{width:LARGEUR_COLONNE_PERIODE_UI,minWidth:LARGEUR_COLONNE_PERIODE_UI,maxWidth:LARGEUR_COLONNE_PERIODE_UI,padding:0,overflow:'hidden',borderRight:'1px solid #e5e7eb',background:'#f8fafc',verticalAlign:'middle',textAlign:'center'}}>
                              <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',width:'100%'}}>
                                <span style={{display:'inline-block',transform:'rotate(-90deg)',fontWeight:700,color:'#334155',whiteSpace:'nowrap',lineHeight:1}}>{periode}</span>
                              </div>
                            </td>
                          )}
                          <td style={{...styles.td,...STYLE_COLONNE_CRENEAU,...STYLE_TD_HORAIRE_UI,height:HAUTEUR_LIGNE_COURS_UI}}>
                            P{periode==='Matin' ? idx+1 : idx+5} — {crBase.heure_debut}–{crBase.heure_fin}
                          </td>
                          {JOURS.map(jour => {
                            const cr = (planningProf.creneaux||[]).find(c=>c.jour===jour&&c.periode===periode&&c.ordre===crBase.ordre);
                            if (!cr) return <td key={jour} style={{...styles.td,background:'#f5f5f5',width:LARGEUR_COLONNE_JOUR,minWidth:LARGEUR_COLONNE_JOUR,maxWidth:LARGEUR_COLONNE_JOUR,textAlign:'center',verticalAlign:'middle',height:HAUTEUR_LIGNE_COURS_UI}}></td>;
                            const aff = (planningProf.affectations||[]).find(a=>a.creneau_id===cr.id);
                            const dispo = planningProf.dispos?.find(d=>d.creneau_id===cr.id);
                            const indispo = dispo && !dispo.disponible;
                            const classeAffectee = !!(aff && String(aff.classe_nom || '').trim());
                            const couleurFondClasse = classeAffectee ? getCouleurClasse(aff.classe_id) : '#ffffff';
                            const couleurTexteClasse = classeAffectee ? getCouleurTexteSurFond(couleurFondClasse) : '#111827';
                            return (
                              <td key={jour} style={{...styles.td,...STYLE_TD_COURS_UI,height:HAUTEUR_LIGNE_COURS_UI,width:LARGEUR_COLONNE_JOUR,minWidth:LARGEUR_COLONNE_JOUR,maxWidth:LARGEUR_COLONNE_JOUR,
                                background:(!classeAffectee||indispo)?'#eeeeee':'#fff'}}>
                                {classeAffectee ? (
                                  <>
                                    <div style={{fontWeight:700,color:couleurTexteClasse,background:couleurFondClasse,borderRadius:6,padding:'3px 8px',textAlign:'center'}}>{aff.classe_nom}</div>
                                    {aff.matiere_nom && <div style={{color:'#334155',fontWeight:600,fontSize:11,marginTop:3,textAlign:'center'}}>{aff.matiere_nom}</div>}
                                  </>
                                ) : ''}
                              </td>
                            );
                          })}
                        </tr>,
                        ...(idx === 1 ? [(
                          <tr key={`prof-pause-${periode}`} style={{height:HAUTEUR_LIGNE_PAUSE_UI}}>
                            <td style={{...styles.td,...STYLE_COLONNE_CRENEAU,...STYLE_TD_PAUSE_UI,height:HAUTEUR_LIGNE_PAUSE_UI}}>
                              {pausesParPeriode[periode].debut}–{pausesParPeriode[periode].fin}
                            </td>
                            <td colSpan={5} style={{...STYLE_TD_PAUSE_UI,height:HAUTEUR_LIGNE_PAUSE_UI}}>PAUSE</td>
                          </tr>
                        )] : [])
                      ]),
                      periodeIdx === 0 ? <tr key={`sep-prof-${periode}`}><td colSpan={7} style={{height:HAUTEUR_LIGNE_COURS_UI,background:'white',border:'none',padding:0}}></td></tr> : null
                    ].filter(Boolean);
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== PLANNING CLASSES ===== */}
      {(onglet === 'plannings' && sousOngletPlanning === 'classes') && (
        <div>
          {!classePlanningId && (
            <div style={styles.msgVide}>Sélectionnez d'abord une classe pour afficher son planning.</div>
          )}
          {planningClasse && classePlanningId && (
            <div>
              <div style={{fontSize:18,marginBottom:12,color:'#0f172a'}}>
                <span style={{fontWeight:700}}>Classe :</span>
                <span style={{fontWeight:400}}> {planningClasse.classe?.nom}</span>
                {planningClasse.classe?.titulaire_nom && (
                  <>
                    <span style={{fontWeight:700}}> - Titulaire :</span>
                    <span style={{fontWeight:400}}> {planningClasse.classe.titulaire_nom}</span>
                  </>
                )}
              </div>

              <div style={{overflowX:'auto'}}>
                <table style={{...styles.tbl, width:'100%', tableLayout:'fixed',minWidth:200+JOURS.length*140}}>
                  <thead>
                    <tr style={styles.theadRow}>
                      <th style={{...styles.th,width:LARGEUR_COLONNE_PERIODE_UI,minWidth:LARGEUR_COLONNE_PERIODE_UI,maxWidth:LARGEUR_COLONNE_PERIODE_UI,textAlign:'center'}}></th>
                      <th style={{...styles.th,...STYLE_COLONNE_CRENEAU,textAlign:'center'}}>Horaire</th>
                      {JOURS.map(j => <th key={`classe-tab-${j}`} style={{...styles.th,textAlign:'center',width:LARGEUR_COLONNE_JOUR,minWidth:LARGEUR_COLONNE_JOUR,maxWidth:LARGEUR_COLONNE_JOUR}}>{j}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const renderPeriodeRows = (periode) => {
                        const crsBase = (planningClasse.creneaux || []).filter(c => c.jour === 'Lundi' && c.periode === periode);
                        if (!crsBase.length) return [];
                        return crsBase.flatMap((crBase, idx) => [
                          <tr key={`classe-tab-${periode}-${crBase.id}`} style={{...styles.tr, height:HAUTEUR_LIGNE_COURS_UI}}>
                            {idx === 0 && (
                              <td
                                rowSpan={5}
                                style={{
                                  ...styles.td,
                                  width:LARGEUR_COLONNE_PERIODE_UI,
                                  minWidth:LARGEUR_COLONNE_PERIODE_UI,
                                  maxWidth:LARGEUR_COLONNE_PERIODE_UI,
                                  textAlign:'center',
                                  verticalAlign:'middle',
                                  background:'#f8fafc',
                                  padding:0,
                                  overflow:'hidden',
                                  borderRight:'1px solid #e5e7eb'
                                }}
                              >
                                <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',width:'100%'}}>
                                  <span style={{display:'inline-block',transform:'rotate(-90deg)',fontWeight:700,color:'#334155',whiteSpace:'nowrap',lineHeight:1}}>
                                    {periode}
                                  </span>
                                </div>
                              </td>
                            )}
                            <td style={{...styles.td,...STYLE_COLONNE_CRENEAU,...STYLE_TD_HORAIRE_UI,height:HAUTEUR_LIGNE_COURS_UI}}>
                              P{periode==='Matin' ? idx+1 : idx+5} — {crBase.heure_debut}–{crBase.heure_fin}
                            </td>
                            {JOURS.map(jour => {
                              const cr = (planningClasse.creneaux||[]).find(c=>c.jour===jour&&c.periode===periode&&c.ordre===crBase.ordre);
                              if (!cr) return <td key={`classe-tab-${periode}-${jour}`} style={{...styles.td,background:'#f5f5f5',height:HAUTEUR_LIGNE_COURS_UI,width:LARGEUR_COLONNE_JOUR,minWidth:LARGEUR_COLONNE_JOUR,maxWidth:LARGEUR_COLONNE_JOUR}}></td>;
                              const aCours = classeAHorairePlanning(jour, periode);
                              const aff = aCours ? (planningClasse.affectations||[]).find(a=>a.creneau_id===cr.id) : null;
                              const couleurFondProf = aff ? getCouleurProf(aff.prof_id) : '#ffffff';
                              const couleurTexteProf = aff ? getCouleurTexteSurFond(couleurFondProf) : '#111827';
                              return (
                                <td key={`classe-tab-${periode}-${jour}-${cr.id}`} style={{...styles.td,...STYLE_TD_COURS_UI,height:HAUTEUR_LIGNE_COURS_UI,
                                  width:LARGEUR_COLONNE_JOUR,minWidth:LARGEUR_COLONNE_JOUR,maxWidth:LARGEUR_COLONNE_JOUR,
                                  background:aCours?'#fff':'#f5f5f5'}}>
                                  {aff ? (
                                    <>
                                      <div style={{fontWeight:700,color:couleurTexteProf,background:couleurFondProf,borderRadius:6,padding:'3px 8px',textAlign:'center'}}>{formaterNomComplet(aff.prof_nom)}</div>
                                      {aff.matiere_nom && <div style={{color:'#334155',fontWeight:600,fontSize:11,marginTop:3,textAlign:'center'}}>{aff.matiere_nom}</div>}
                                    </>
                                  ) : aCours ? <span style={{color:'#dc2626',fontSize:11,fontWeight:700}}>Aucun professeur affecté</span> : ''}
                                </td>
                              );
                            })}
                          </tr>,
                          ...(idx === 1 ? [(
                            <tr key={`classe-pause-${periode}`} style={{height:HAUTEUR_LIGNE_PAUSE_UI}}>
                              <td style={{...styles.td,...STYLE_COLONNE_CRENEAU,...STYLE_TD_PAUSE_UI,height:HAUTEUR_LIGNE_PAUSE_UI,whiteSpace:'nowrap'}}>
                                {pausesParPeriode[periode].debut}–{pausesParPeriode[periode].fin}
                              </td>
                              <td colSpan={5} style={{...styles.td,...STYLE_TD_PAUSE_UI,height:HAUTEUR_LIGNE_PAUSE_UI}}>
                                PAUSE
                              </td>
                            </tr>
                          )] : [])
                        ]);
                      };
                      return [
                        ...renderPeriodeRows('Matin'),
                        <tr key="classe-separation-matin-apresmidi">
                          <td colSpan={7} style={{...styles.td,height:HAUTEUR_LIGNE_COURS_UI,background:'#ffffff',border:'none'}}></td>
                        </tr>,
                        ...renderPeriodeRows('Après-midi'),
                      ];
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== PLANNING GÉNÉRAL ===== */}
      {(onglet === 'plannings' && sousOngletPlanning === 'general') && (
        <div>
          {!planningPoolId && (
            <div style={styles.msgVide}>
              Sélectionnez d'abord un pool pour afficher le planning général.
            </div>
          )}

          {planningPoolId && planningGeneral && (
            <div style={{marginBottom:16}}>
              <h3 style={{...styles.suiviGrandTitre,color:'#0f172a',textTransform:'none',letterSpacing:'normal'}}>Classes et titulaires</h3>
              <div style={{display:'flex',gap:8,width:'100%'}}>
                {(planningGeneral.titulaires||[])
                  .filter(t=>t.classe_nom)
                  .filter(t => {
                    if (!planningPoolId) return true;
                    const poolSel = pools.find(p => String(p.id) === String(planningPoolId));
                    const ids = new Set((poolSel?.classes || []).map(c => String(c.id)));
                    return ids.has(String(t.classe_id));
                  })
                  .sort((a,b) => String(a.classe_nom||'').localeCompare(String(b.classe_nom||''), 'fr', {numeric:true, sensitivity:'base'}))
                  .map((t,i) => (
                  <div key={i} style={{flex:1,minWidth:0,background:'#ffffff',borderRadius:10,padding:'10px 16px',border:'1px solid #e2e8f0',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
                    <div style={{fontWeight:700,fontSize:14,color:'#0f172a'}}>{t.classe_nom}</div>
                    <div style={{fontSize:12,color:'#475569',marginTop:4}}>{t.prof_nom ? formaterNomComplet(t.prof_nom) : <span style={{color:'#94a3b8'}}>Pas de titulaire</span>}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {planningPoolId && planningGeneral && (
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              {!showJoursFiltres ? (
                <button onClick={() => setShowJoursFiltres(true)}
                  style={{padding:'7px 14px',borderRadius:17,border:'1.5px solid #e2e8f0',background:'white',cursor:'pointer',fontWeight:600,color:'#94a3b8',fontSize:13,fontFamily:'inherit',whiteSpace:'nowrap'}}>
                  Trier
                </button>
              ) : (
                <div style={{display:'flex',background:'#ede9fe',borderRadius:20,padding:3,gap:2}}>
                  {['tous',...JOURS].map(j => (
                    <button key={j}
                      onClick={() => { setJourPlanningFiltre(j); if (j==='tous') setShowJoursFiltres(false); }}
                      style={{padding:'6px 14px',borderRadius:99,border:'none',fontWeight: jourPlanningFiltre===j ? 700 : 600,fontSize:13,cursor:'pointer',
                        background: jourPlanningFiltre===j ? '#6366f1' : 'transparent',
                        color: jourPlanningFiltre===j ? 'white' : '#4c1d95',fontFamily:'inherit',whiteSpace:'nowrap'}}>
                      {j === 'tous' ? 'Trier' : j}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {planningPoolId && planningGeneral && (
            <div style={{overflowX:'auto',marginTop:0}}>
              {(jourPlanningFiltre === 'tous' ? JOURS : JOURS.filter(j => j === jourPlanningFiltre)).map(jour => {
                const crs = planningGeneral.creneaux.filter(c=>c.jour===jour);
                if (!crs.length) return null;
                const nCols = planningGeneral.profs.length + 1;
                return (
                  <table key={`gen-${jour}`} style={{...styles.tbl,tableLayout:'fixed',width:'100%',minWidth:LARGEUR_COLONNE_CRENEAU+planningGeneral.profs.length*120,marginBottom:20,border:'none',boxShadow:'none'}}>
                    <colgroup>
                      <col style={{width:LARGEUR_COLONNE_CRENEAU}} />
                      {planningGeneral.profs.map(p => <col key={`col-gen-${jour}-${p.id}`} />)}
                    </colgroup>
                    <tbody>
                      <tr>
                        <td colSpan={nCols} style={{padding:0,border:'none',background:'transparent'}}>
                          <div style={{background:'#6366f1',color:'#fff',textAlign:'center',fontWeight:800,fontSize:12,padding:'6px 14px',textTransform:'uppercase',letterSpacing:'0.04em',borderTopLeftRadius:10,borderTopRightRadius:10}}>
                            {jour}
                          </div>
                        </td>
                      </tr>
                      <tr style={{...styles.theadRow, background:'#ede9fe'}}>
                        <th style={{...styles.th,...STYLE_COLONNE_CRENEAU,textAlign:'center',color:'#5b21b6'}}>Horaire</th>
                        {planningGeneral.profs.map(p => (
                          <th key={p.id} style={{...styles.th,textAlign:'center',color:'#5b21b6'}}>
                            {nomSansSuffixe(p.nom)}<br/>
                            <span style={{fontWeight:400,fontSize:11}}>{formaterPrenomEntete(p.prenom)}</span>
                          </th>
                        ))}
                      </tr>
                      {['Matin','Après-midi'].flatMap(per => {
                        const crsPer = crs.filter(c=>c.periode===per);
                        if (!crsPer.length) return [];
                        return [
                          <tr key={jour+per+'_ph'}>
                            <td colSpan={nCols} style={styles.periodeBande}>{per}</td>
                          </tr>,
                          ...crsPer.map(cr => (
                            <tr key={cr.id} style={{...styles.tr, height:HAUTEUR_LIGNE_COURS_UI}}>
                              <td style={{...styles.td,...STYLE_COLONNE_CRENEAU,...STYLE_TD_HORAIRE_UI,height:HAUTEUR_LIGNE_COURS_UI}}>
                                {cr.heure_debut}–{cr.heure_fin}
                              </td>
                              {planningGeneral.profs.map(p => {
                                const aff = planningGeneral.affectations.find(a=>a.prof_id===p.id&&a.creneau_id===cr.id);
                                const dispo = planningGeneral.dispos.find(d=>d.prof_id===p.id&&d.creneau_id===cr.id);
                                const indispo = dispo&&!dispo.disponible;
                                const estSpecial = !!aff?.type_special;
                                const couleurFond = aff
                                  ? (estSpecial ? '#000000' : (aff.classe_id ? getCouleurClasse(aff.classe_id) : '#e8f5e9'))
                                  : (indispo ? '#eeeeee' : '#fff');
                                const couleurTexte = aff
                                  ? (estSpecial ? '#ffffff' : getCouleurTexteSurFond(couleurFond))
                                  : '#111827';
                                return (
                                  <td key={p.id} style={{...styles.td,...STYLE_TD_COURS_UI,height:HAUTEUR_LIGNE_COURS_UI,
                                    background:couleurFond,color:couleurTexte}}>
                                    {aff ? <>
                                      <b style={{color:couleurTexte,fontSize:12}}>{estSpecial ? getLibelleTypeSpecial(aff.type_special) : aff.classe_nom}</b>
                                      {estSpecial ? null : (aff.matiere_nom ? <div style={{color:couleurTexte,fontWeight:600,fontSize:11,marginTop:3}}>{aff.matiere_nom}</div> : null)}
                                    </> : ''}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        ];
                      })}
                    </tbody>
                  </table>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  page:{padding:'28px 32px',background:'#f8fafc',minHeight:'100%',boxSizing:'border-box',fontFamily:"'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif"},
  header:{display:'flex',alignItems:'center',gap:15,marginBottom:12,width:'100%',minHeight:40},
  btnRetour:{padding:'8px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#475569'},
  btnImprimer:{padding:'8px 14px',background:'#6366f1',border:'1px solid #6366f1',borderRadius:8,cursor:'pointer',fontSize:13,color:'white',fontWeight:600},
  titre:{fontSize:22,fontWeight:800,color:'#0f172a',margin:0},
  noticeBand:{padding:'10px 16px',borderRadius:8,marginBottom:12,fontSize:13,fontWeight:600},
  noticeBandSuccess:{background:'#ede9fe',color:'#4f46e5'},
  noticeBandInfo:{background:'#ede9fe',color:'#4f46e5'},
  noticeBandError:{background:'#fee2e2',color:'#991b1b'},
  toggleGroup:{display:'flex',background:'#ede9fe',borderRadius:20,padding:3,gap:2},
  toggleBtn:{padding:'7px 16px',borderRadius:17,border:'none',background:'transparent',cursor:'pointer',fontWeight:600,color:'#6d28d9',fontSize:13,fontFamily:'inherit',whiteSpace:'nowrap'},
  toggleBtnActif:{background:'#6366f1',color:'white',fontWeight:700},
  affActionsWrap:{display:'flex',alignItems:'center',gap:10,marginBottom:12,background:'white',padding:'12px 16px',borderRadius:10,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',flexWrap:'wrap'},
  affActionsLeft:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',flex:'1 1 auto',minWidth:0},
  affTabBtn:{padding:'8px 14px',borderRadius:'10px 10px 0 0',border:'none',cursor:'pointer',fontWeight:700,fontSize:13,background:'#ede9fe',color:'#5b21b6',lineHeight:1,position:'relative',zIndex:1,outline:'none',boxShadow:'none'},
  affTabBtnActif:{background:'#6366f1',color:'white',border:'none',marginBottom:-1,zIndex:2,boxShadow:'0 -1px 6px rgba(99,102,241,0.22)'},
  btnSauvegarderAff:{padding:'8px 16px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:600,fontSize:13,background:'#6366f1',color:'#ffffff',alignSelf:'center'},
  card:{background:'white',borderRadius:12,padding:20,marginBottom:20,boxShadow:'0 2px 8px rgba(0,0,0,0.06)'},
  msgVide:{background:'white',borderRadius:12,padding:'20px 24px',marginBottom:20,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',color:'#64748b',fontSize:12,fontStyle:'italic',fontFamily:"'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif"},
  rowBetween:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  cardTitre:{fontSize:16,fontWeight:700,margin:0},
  flexWrap:{display:'flex',flexWrap:'wrap',gap:8},
  chip:{padding:'9px 14px',width:240,minWidth:240,maxWidth:240,background:'white',border:'2px solid #e0e0e0',borderRadius:20,cursor:'pointer',fontSize:13,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'},
  chipNom:{fontWeight:700,display:'block',lineHeight:1.15},
  chipPrenom:{fontWeight:500,display:'block',lineHeight:1.15,marginTop:2},
  chipActif:{background:'#6366f1',color:'white',border:'2px solid #6366f1'},
  suiviGrandTitre:{fontSize:14,fontWeight:700,color:'#475569',margin:'0 0 8px',textTransform:'uppercase',letterSpacing:'0.05em'},
  suiviJoursGrid:{display:'flex',gap:8,width:'100%'},
  suiviJourChip:{flex:1,minWidth:0,padding:'8px 10px',borderRadius:10,border:'1px solid #c7d2fe',background:'#eef2ff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'},
  suiviJourNom:{fontSize:13,fontWeight:800,color:'#334155',lineHeight:1.2},
  suiviJourLigne:{fontSize:12,fontWeight:700,color:'#475569',lineHeight:1.25,marginTop:2},
  suiviClassesGrid:{display:'flex',flexWrap:'wrap',gap:8},
  suiviClasseChip:{width:240,minWidth:240,maxWidth:240,padding:'8px 10px',borderRadius:10,border:'1px solid #fecaca',background:'#fef2f2',color:'#991b1b',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'},
  suiviClasseNom:{fontSize:13,fontWeight:800,lineHeight:1.2},
  suiviClasseLigne:{fontSize:12,fontWeight:700,lineHeight:1.25,marginTop:2},
  suiviBranchesGrid:{display:'flex',flexWrap:'wrap',gap:8},
  suiviBrancheChip:{width:240,minWidth:240,maxWidth:240,padding:'8px 10px',borderRadius:10,border:'1px solid #fecaca',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'},
  suiviBrancheNom:{fontSize:13,fontWeight:800,lineHeight:1.2},
  suiviBrancheLigne:{fontSize:12,fontWeight:700,lineHeight:1.25,marginTop:2},
  suiviPrefsGrid:{display:'flex',flexWrap:'wrap',gap:8},
  suiviPrefCard:{width:300,minWidth:300,maxWidth:300,padding:'10px 12px',borderRadius:10,border:'1px solid #dbeafe',background:'#f8fbff'},
  suiviPrefHead:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:6},
  suiviPrefNom:{fontSize:13,fontWeight:800,color:'#1e3a8a',marginBottom:0},
  suiviPrefLigne:{fontSize:12,fontWeight:600,color:'#64748b'},
  suiviPrefTags:{display:'flex',flexWrap:'wrap',gap:6},
  suiviPrefTag:{display:'inline-block',padding:'3px 8px',borderRadius:999,border:'1px solid #c7d2fe',background:'#eef2ff',color:'#3730a3',fontSize:11,fontWeight:700},
  suiviPrefTagOk:{display:'inline-block',padding:'3px 8px',borderRadius:999,border:'1px solid #86efac',background:'#dcfce7',color:'#166534',fontSize:11,fontWeight:700},
  suiviPrefTagAutre:{display:'inline-block',padding:'3px 8px',borderRadius:999,border:'1px solid #fdba74',background:'#fff7ed',color:'#9a3412',fontSize:11,fontWeight:700},
  colorClassChip:{padding:'8px 12px',borderRadius:18,cursor:'pointer',fontWeight:800,fontSize:12,color:'#111827',minWidth:100},
  colorPaletteBtn:{width:24,height:24,borderRadius:'50%',cursor:'pointer'},
  tbl:{width:'100%',borderCollapse:'collapse',background:'white',borderRadius:10,overflow:'hidden',border:'1px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'},
  theadRow:{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'},
  th:{padding:'10px 12px',textAlign:'left',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'},
  thA:{padding:'10px 12px',background:'#f8fafc',color:'#94a3b8',fontWeight:700,fontSize:11,textAlign:'center',border:'1px solid #e2e8f0',textTransform:'uppercase',letterSpacing:'0.05em'},
  thAJour:{padding:'10px 12px',background:'#f8fafc',color:'#94a3b8',fontWeight:700,fontSize:11,textAlign:'center',border:'1px solid #e2e8f0',textTransform:'uppercase',letterSpacing:'0.05em',minWidth:140},
  tr:{borderBottom:'1px solid #eef2f7'},
  td:{padding:'9px 12px',fontSize:13,color:'#334155'},
  tdPer:{padding:'10px 14px',background:'#f8fafc',border:'1px solid #e2e8f0',whiteSpace:'nowrap'},
  periodeTag:{display:'block',fontSize:11,fontWeight:700,color:'#6366f1',textTransform:'uppercase'},
  periodeNum:{display:'block',fontSize:13,fontWeight:600,color:'#333',marginTop:2},
  tdDispo:{padding:8,textAlign:'center',border:'1px solid #e2e8f0',background:'#fff'},
  jourBande:{background:'#f1f5f9',padding:'7px 14px',fontWeight:700,fontSize:12,color:'#475569',textTransform:'uppercase',letterSpacing:'0.04em'},
  periodeBandeCreneau:{background:'#000000',color:'#ffffff',padding:'6px 10px',fontWeight:800,fontSize:12,textTransform:'uppercase',letterSpacing:'0.04em',textAlign:'center',border:'1px solid #111111'},
  periodeBandeJour:{background:'#000000',color:'#ffffff',padding:'6px 10px',fontWeight:800,fontSize:12,textTransform:'uppercase',letterSpacing:'0.04em',textAlign:'center',border:'1px solid #111111'},
  periodeBandeSpacer:{background:'#000000',color:'#ffffff',border:'1px solid #111111',padding:'6px 10px',fontWeight:800,fontSize:12,textAlign:'center'},
  periodeBande:{background:'#000000',padding:'6px 14px',fontWeight:800,fontSize:12,color:'#ffffff',textAlign:'center',textTransform:'uppercase',letterSpacing:'0.04em'},
  separateurJourBlanc:{background:'#ffffff',padding:0,border:'none',lineHeight:0},
  btnBleu:{padding:'8px 16px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  btnVert:{padding:'8px 16px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  btnAnnuler:{padding:'8px 16px',background:'#f5f5f5',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,color:'#475569'},
  btnIconEdit:{padding:5,border:'none',borderRadius:8,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',background:'#e0e7ff',color:'#4338ca'},
  btnIconDel:{padding:5,border:'none',borderRadius:8,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',background:'#fee2e2',color:'#dc2626'},
  sel:{padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:14},
  selOnglet:{padding:'9px 18px',borderRadius:10,border:'2px solid #4f46e5',background:'#e0e7ff',color:'#3730a3',fontWeight:700,fontSize:14,outline:'none',cursor:'pointer',textAlign:'center',width:220,minWidth:220},
  selAff:{height:36,padding:'0 14px',boxSizing:'border-box',borderRadius:8,border:'1px solid #c7d2fe',background:'white',color:'#1e293b',fontWeight:400,fontSize:13,outline:'none',cursor:'pointer',width:240,fontFamily:'inherit'},
  overlay:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000},
  modal:{background:'white',padding:30,borderRadius:16,maxHeight:'85vh',overflowY:'auto'},
  modalTitre:{fontSize:20,fontWeight:700,marginBottom:20},
  formGrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:15},
  fc:{display:'flex',flexDirection:'column'},
  lbl:{fontSize:13,fontWeight:600,marginBottom:5,color:'#555'},
  inp:{padding:10,border:'1px solid #e2e8f0',borderRadius:8,fontSize:14},
  formActions:{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20},
  checkBadge:{padding:'5px 10px',borderRadius:16,cursor:'pointer',fontSize:12,fontWeight:400,display:'flex',alignItems:'center'},
  poolsGrid:{display:'flex',flexDirection:'column',gap:16,marginTop:16},
  poolCard:{background:'white',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.08)'},
  poolLabel:{fontSize:13,fontWeight:600,color:'#0f172a',marginBottom:4},
  badge:{display:'inline-block',padding:'3px 10px',borderRadius:12,fontSize:12,fontWeight:600,margin:'2px 3px 2px 0'},
  aucun:{color:'#ccc',fontSize:12},
  cellSel:{width:'100%',padding:'5px 6px',border:'1px solid #e0e0e0',borderRadius:6,fontSize:12,textAlign:'center',textAlignLast:'center'},
};