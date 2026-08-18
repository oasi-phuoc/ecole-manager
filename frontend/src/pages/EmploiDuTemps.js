/* eslint-disable */
import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { stickyPageChrome } from '../styles/pageShell';
import { injectForcedPrintCss, openPrintPopup } from '../utils/print';
import { demanderDossierExport, exporterDocumentsPdf, htmlDocumentToPdfBlob, sanitizeFilename } from '../utils/exportPlanningsPdf';
import CustomSelect from '../components/CustomSelect';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  regrouperBranchesParCode,
  listerGroupesColonneOrdonnes,
  LIBELLES_COLONNES_SPECIALITES,
  ORDRE_COLONNES_SPECIALITES,
} from '../utils/branchesSpecialites';

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
/** Valeurs de repli si un niveau n'est pas encore configuré en Structure. */
const REQUIS_PERIODES_DEFAUT = {
  CSC: { normales: 20, soutien: 4 },
  CAL: { normales: 20, soutien: 4 },
  APL: { normales: 28, soutien: 0 },
  CFR: { normales: 20, soutien: 0 },
  EPL: { normales: 20, soutien: 0 },
  CPR: { normales: 20, soutien: 0 },
};
/** Déduit le niveau (CSC/CAL/APL/CFR/EPL) depuis le nom de classe si besoin. */
const infererNiveauDepuisNom = (nom) => {
  const n = String(nom || '').toUpperCase();
  if (/\bCAL\b/.test(n) || n.startsWith('CAL')) return 'CAL';
  if (/\bCSC\b/.test(n) || n.startsWith('CSC')) return 'CSC';
  if (/\bAPL\b/.test(n) || n.startsWith('APL')) return 'APL';
  if (/\bCFR\b/.test(n) || n.startsWith('CFR')) return 'CFR';
  if (/\bEPL\b/.test(n) || n.startsWith('EPL')) return 'EPL';
  return '';
};
const resoudreNiveauClasse = (cl, fallbackNiveau = '') => {
  const direct = String(cl?.niveau || fallbackNiveau || '').toUpperCase();
  if (direct) return direct;
  return infererNiveauDepuisNom(cl?.nom);
};
const trierClassesParNom = (liste) =>
  [...(liste || [])].sort((a, b) =>
    String(a.nom || '').localeCompare(String(b.nom || ''), 'fr', { numeric: true, sensitivity: 'base' })
  );
const extraireNumeroClasse = (nom) => {
  const m = String(nom || '').match(/(\d+)\s*$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
};
/** true = pattern « pair » (02, 04…) : démarre Après-midi / EPL aprem / APL aprem+mardi-jeudi. */
const estClasseIndexPair = (cl, listeOrdonnee = []) => {
  const num = extraireNumeroClasse(cl?.nom);
  if (num != null) return num % 2 === 0;
  const idx = listeOrdonnee.findIndex((c) => String(c.id) === String(cl?.id));
  return idx >= 0 ? idx % 2 === 1 : false;
};
/**
 * Proposition d'horaires demi-journée par niveau :
 * - CSC/CAL/CFR : alternance matin/aprem inversée à chaque classe
 * - EPL : toute la semaine matin OU aprem (alternance entre classes)
 * - APL : base matin OU aprem + 2 jours complets espacés (lun/mer ou mar/jeu)
 */
const genererHorairesPropositionPourClasse = (cl, niveau, listeMemeNiveau = []) => {
  const cid = cl?.id;
  if (cid == null) return null;
  const pair = estClasseIndexPair(cl, listeMemeNiveau);
  const niv = String(niveau || '').toUpperCase();

  if (niv === 'CSC' || niv === 'CAL' || niv === 'CFR') {
    return JOURS.map((jour, i) => {
      const periode = pair
        ? (i % 2 === 0 ? 'Après-midi' : 'Matin')
        : (i % 2 === 0 ? 'Matin' : 'Après-midi');
      return { classe_id: cid, jour, periode };
    });
  }
  if (niv === 'EPL') {
    const periode = pair ? 'Après-midi' : 'Matin';
    return JOURS.map((jour) => ({ classe_id: cid, jour, periode }));
  }
  if (niv === 'APL') {
    const base = pair ? 'Après-midi' : 'Matin';
    const extra = base === 'Matin' ? 'Après-midi' : 'Matin';
    const joursComplets = pair ? ['Mardi', 'Jeudi'] : ['Lundi', 'Mercredi'];
    const out = [];
    JOURS.forEach((jour) => {
      out.push({ classe_id: cid, jour, periode: base });
      if (joursComplets.includes(jour)) out.push({ classe_id: cid, jour, periode: extra });
    });
    return out;
  }
  return null;
};
const nomSansSuffixe = (nom) => String(nom || '').split('-')[0].trim();
const formaterNomComplet = (s) => String(s || '').replace(/(^|\s)(\S*?)-\S+$/, '$1$2').trim();
const libelleBadgeSoutienAff = (affS) => {
  if (!affS) return '';
  const nom = formaterNomComplet(affS.prof_nom || '');
  return nom ? `(S ${nom})` : '(S)';
};
const labelsSoutienDepuisAffectations = (affs) => new Map(
  (affs || [])
    .filter((a) => String(a?.type_special || '').toLowerCase() === 'soutien')
    .map((a) => [String(a.creneau_id), libelleBadgeSoutienAff(a)])
);
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

/** Répartit les cartes sur plusieurs lignes : max 5 par ligne, lignes équilibrées (6→3+3, 7→4+3). */
const repartirCartesParLigne = (items, maxParLigne = 5) => {
  const liste = Array.isArray(items) ? items : [];
  const n = liste.length;
  if (!n) return [];
  const cap = Math.max(1, Number(maxParLigne) || 5);
  if (n <= cap) return [liste];
  const nbLignes = Math.ceil(n / cap);
  const lignes = [];
  let index = 0;
  for (let l = 0; l < nbLignes; l++) {
    const restantes = n - index;
    const lignesRestantes = nbLignes - l;
    const taille = Math.ceil(restantes / lignesRestantes);
    lignes.push(liste.slice(index, index + taille));
    index += taille;
  }
  return lignes;
};

export default function EmploiDuTemps() {
  const isMobile = useIsMobile();
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
  const [titulariatsDraftByProf, setTitulariatsDraftByProf] = useState({}); // { [profId]: [classeId1, classeId2] }
  const NORMALISER_TITULARIATS_PROF = (val) => {
    if (Array.isArray(val)) {
      return [String(val[0] || ''), String(val[1] || '')];
    }
    if (val) return [String(val), ''];
    return ['', ''];
  };
  const getTitulariatsProf = (draft, profId) => NORMALISER_TITULARIATS_PROF(draft?.[String(profId)]);
  const listerTitulariatsPairs = (draft) => {
    const pairs = [];
    Object.entries(draft || {}).forEach(([profId, val]) => {
      NORMALISER_TITULARIATS_PROF(val).forEach((classeId) => {
        if (classeId) pairs.push({ profId: String(profId), classeId: String(classeId) });
      });
    });
    return pairs;
  };
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
  const [planningGeneralLoading, setPlanningGeneralLoading] = useState(false);
  const [planningGeneralError, setPlanningGeneralError] = useState('');
  const [exportPdfEnCours, setExportPdfEnCours] = useState(false);
  const [exportPdfProgress, setExportPdfProgress] = useState('');
  const exportPdfAnnulerRef = useRef(false);
  const [planningPoolId, setPlanningPoolId] = useState('');
  const [jourPlanningFiltre, setJourPlanningFiltre] = useState('tous');
  const [showJoursFiltres, setShowJoursFiltres] = useState(false);
  const [planningProf, setPlanningProf] = useState(null);
  const [profPlanningId, setProfPlanningId] = useState('');
  const [planningClasse, setPlanningClasse] = useState(null);
  const [planningClasseLoading, setPlanningClasseLoading] = useState(false);
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

  const getRequisPeriodesNiveau = (niveau) => {
    const niv = String(niveau || '').toUpperCase();
    if (!niv) return { normales: 0, soutien: 0 };
    const row = (niveauxDB || []).find((n) => String(n.nom || '').toUpperCase() === niv);
    if (row) {
      const normales = Number(row.periodes_normales);
      const soutien = Number(row.periodes_soutien);
      return {
        normales: Number.isFinite(normales) && normales >= 0 ? normales : 0,
        soutien: Number.isFinite(soutien) && soutien >= 0 ? soutien : 0,
      };
    }
    return REQUIS_PERIODES_DEFAUT[niv] || { normales: 0, soutien: 0 };
  };
  const niveauAvecSoutien = (niveau) => (getRequisPeriodesNiveau(niveau).soutien || 0) > 0;
  const totalPeriodesNiveau = (niveau) => {
    const r = getRequisPeriodesNiveau(niveau);
    return (r.normales || 0) + (r.soutien || 0);
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
      setClasses(trierClassesParNom(cl.data));
      setMatieres(m.data);
      setCreneaux(cr.data);
      setPools((po.data || []).map((pool) => ({
        ...pool,
        classes: trierClassesParNom(pool.classes),
      })));
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
    try {
      const [rDispo] = await Promise.all([
        axios.post(API + '/planning/disponibilites/' + profSelectionne, { disponibilites: liste }, { headers }),
        axios.post(API + '/planning/disponibilites/' + profSelectionne + '/remarque', { remarque: remarquesDispo || '' }, { headers }),
      ]);
      try {
        const rAll = await axios.get(API + '/planning/disponibilites', { headers });
        setAllDispos(rAll.data || []);
      } catch {}
      await chargerTout();
      await chargerDisposAffectations(poolAffId);
      const nRetirees = Number(rDispo?.data?.affectations_supprimees) || 0;
      showToast(nRetirees > 0
        ? `Disponibilités sauvegardées. ${nRetirees} période(s) retirée(s) des affectations professeurs.`
        : 'Disponibilités et remarque sauvegardées.');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Erreur lors de la sauvegarde des disponibilités.', 'error');
    }
  };

  const toggleDispo = (creneau_id) => setDispos(prev => ({ ...prev, [creneau_id]: !prev[creneau_id] }));

  const creneauxParJourPeriode = (jour, periode) => creneaux.filter(c => c.jour===jour && c.periode===periode);

  const getPeriodesRequisesPourTaux = (prof) => {
    const taux = parseFloat(prof?.taux_activite);
    if (!Number.isFinite(taux)) return parseInt(prof?.periodes_semaine, 10) || 0;
    // Règle métier : base 40, puis arrondi inférieur au pair pour rester cohérent avec les grilles de périodes.
    return Math.max(0, Math.floor(((BASE_PERIODES_TAUX * taux) / 100) / 2) * 2);
  };

  /** Quota effectif d'un professeur : periodes_semaine, sinon taux, sinon 0 */
  const getQuotaEffectifProf = (prof) => {
    const complet = (() => {
      if (!prof) return null;
      const fromList = (profs || []).find((x) => String(x.id) === String(prof.id));
      return fromList ? { ...fromList, ...prof } : prof;
    })();
    const ps = parseInt(complet?.periodes_semaine, 10);
    if (Number.isFinite(ps) && ps > 0) return ps;
    const viaTaux = getPeriodesRequisesPourTaux(complet);
    if (viaTaux > 0) return viaTaux;
    return 0;
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
  const estClasseAPL = (cl) => {
    const niveau = String(cl?.niveau || '').toUpperCase();
    const nom = String(cl?.nom || '').toUpperCase();
    return niveau.includes('APL') || /(^|[^A-Z])APL([^A-Z]|$)/.test(nom);
  };

  const classeAHoraire = (classe_id, jour, periode) =>
    classeHoraires.some(h => h.classe_id==classe_id && h.jour===jour && h.periode===periode);

  // Premier clic depuis vide -> Matin, puis alternance Matin <-> Après-midi (classes hors APL)
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

  // Pour APL : Matin et Après-midi sont indépendants (peuvent coexister le même jour)
  const toggleClasseHorairePeriode = (classe_id, jour, periode) => {
    if (!isAdmin()) return;
    const existe = classeAHoraire(classe_id, jour, periode);
    const nouveaux = existe
      ? classeHoraires.filter(h => !(h.classe_id==classe_id && h.jour===jour && h.periode===periode))
      : [...classeHoraires, { classe_id, jour, periode }];
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
      await axios.post(API + '/planning/affectations', { prof_id, classe_id, creneau_id, pool_id: idPoolNumerique() }, { headers });
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
    const poolId = pid ? String(pid) : '';
    if (!poolId) {
      setPlanningGeneral(null);
      setPlanningGeneralError('');
      setPlanningGeneralLoading(false);
      return;
    }
    setPlanningGeneralLoading(true);
    setPlanningGeneralError('');
    try {
      const url = API + '/planning/general?pool_id=' + encodeURIComponent(poolId);
      const r = await axios.get(url, { headers });
      const d = r?.data && typeof r.data === 'object' && !Array.isArray(r.data) ? r.data : {};
      setPlanningGeneral({
        profs: Array.isArray(d.profs) ? d.profs : [],
        creneaux: Array.isArray(d.creneaux) ? d.creneaux : [],
        affectations: Array.isArray(d.affectations) ? d.affectations : [],
        dispos: Array.isArray(d.dispos) ? d.dispos : [],
        titulaires: Array.isArray(d.titulaires) ? d.titulaires : [],
      });
    } catch (err) {
      setPlanningGeneral(null);
      const msg = err.response?.data?.message || err.message || 'Erreur lors du chargement du planning général.';
      setPlanningGeneralError(msg);
      showToast(msg, 'error');
    } finally {
      setPlanningGeneralLoading(false);
    }
  };

  const chargerPlanningProf = async (id) => {
    const r = await axios.get(API + '/planning/prof/' + id, { headers });
    setPlanningProf(r.data);
  };

  const chargerPlanningClasse = async (id, pool_id) => {
    if (!id) {
      setPlanningClasse(null);
      setPlanningClasseLoading(false);
      return;
    }
    setPlanningClasseLoading(true);
    try {
      const url = API + '/planning/classe/' + id + (pool_id ? '?pool_id=' + pool_id : '');
      const r = await axios.get(url, { headers });
      setPlanningClasse(r.data || null);
      if (pool_id) chargerPlanningBranches(pool_id);
    } catch (err) {
      setPlanningClasse(null);
      showToast(err.response?.data?.message || err.message || 'Erreur lors du chargement du planning de la classe.', 'error');
    } finally {
      setPlanningClasseLoading(false);
    }
  };

  const getLibelleTypeSpecial = (typeSpecial) => {
    const t = String(typeSpecial || '').trim().toLowerCase();
    if (t === 'titulariat') return 'Titulariat';
    if (t === 'atelier') return 'Atelier';
    if (t === 'mediation') return 'Médiation';
    if (t === 'autre') return 'Autre';
    if (t === 'soutien') return 'Soutien';
    return t;
  };
  const estAffectationSoutien = (aff) => {
    if (!aff) return false;
    if (String(aff.type_special || '').toLowerCase() === 'soutien') return true;
    return affectationModes[aff.id] === 'soutien';
  };
  /** Ligne « Prénom Nom Matière » du cours normal lié à une période de soutien. */
  const formatLigneSoutienLie = (aff) => {
    if (!estAffectationSoutien(aff)) return '';
    const prenom = String(aff.soutien_prof_prenom || '').trim();
    const nom = nomSansSuffixe(aff.soutien_prof_nom || '');
    const matiere = String(aff.soutien_matiere_nom || '').trim();
    const personne = [prenom, nom].filter(Boolean).join(' ');
    return [personne, matiere].filter(Boolean).join(' ');
  };
  /** Texte cellule planning professeur (écran / PDF) : soutien = classe + prof/branche liés. */
  const texteCellulePlanningProf = (aff) => {
    if (!aff) return '';
    const estSoutien = estAffectationSoutien(aff);
    const nomClasse = estSoutien
      ? `${aff.classe_nom || ''} - Soutien`
      : (aff.classe_nom || '');
    const ligneSoutien = formatLigneSoutienLie(aff);
    if (estSoutien && ligneSoutien) return `${nomClasse}\n${ligneSoutien}`;
    if (aff.matiere_nom) return `${nomClasse}\n${aff.matiere_nom}`;
    return nomClasse;
  };
  const estAffectationSpecialSansClasse = (aff) => {
    const t = String(aff?.type_special || '').toLowerCase();
    return t === 'titulariat' || t === 'atelier' || t === 'mediation' || t === 'autre';
  };
  /** True si chaque classe (hors soutien) a une affectation normale sur ce créneau. */
  const periodeClassesNormalesCompletes = (creneauId, classesListe) => {
    if (!classesListe?.length) return false;
    const idsAffectes = new Set(
      (affectationsDraft || [])
        .filter((a) =>
          String(a.creneau_id) === String(creneauId)
          && a.classe_id
          && !estAffectationSoutien(a)
          && !estAffectationSpecialSansClasse(a)
        )
        .map((a) => String(a.classe_id))
    );
    return classesListe.every((cl) => idsAffectes.has(String(cl.id)));
  };
  const formaterPrenomEntete = (prenom) => {
    const brut = String(prenom || '').trim();
    if (!brut) return '';
    return brut.charAt(0).toUpperCase() + brut.slice(1).toLowerCase();
  };

  const poolSelectionne = pools.find(p => p.id == poolAffId);
  const idPoolNumerique = (id = poolAffId) => {
    if (id == null || id === '') return null;
    const n = Number(id);
    return Number.isInteger(n) && n > 0 ? n : null;
  };
  const trouverPoolParId = (poolId) => {
    if (poolId == null || poolId === '') return null;
    return pools.find((p) => String(p.id) === String(poolId)) || null;
  };
  const trouverPoolParClasseId = (classeId) => {
    if (classeId == null || classeId === '') return null;
    return pools.find((p) => (p.classes || []).some((c) => String(c.id) === String(classeId))) || null;
  };
  const poolIdDeAffectation = (aff) => {
    if (aff?.pool_id != null && aff.pool_id !== '') return aff.pool_id;
    if (aff?.pool_id_aff != null && aff.pool_id_aff !== '') return aff.pool_id_aff;
    return null;
  };
  /** Titulariat / Atelier / Médiation / Autre (et classes) déjà posés sur un autre site. */
  const estAffectationHorsPool = (aff, poolCourant) => {
    if (!aff || !poolCourant) return false;
    const poolAff = poolIdDeAffectation(aff);
    if (poolAff != null) return String(poolAff) !== String(poolCourant.id);
    if (aff.dans_pool_courant === false) return true;
    if (aff.dans_pool_courant === true) return false;
    if (!aff.classe_id) return false;
    const poolClasse = trouverPoolParClasseId(aff.classe_id);
    if (!poolClasse) return false;
    return String(poolClasse.id) !== String(poolCourant.id);
  };
  /** Hors pool pour un groupe de pools (super-général) : absent de tous les pools du groupe. */
  const estAffectationHorsPools = (aff, poolsGroupe) => {
    const liste = (poolsGroupe || []).filter(Boolean);
    if (!aff || !liste.length) return false;
    if (liste.length === 1) return estAffectationHorsPool(aff, liste[0]);
    const idsPools = new Set(liste.map((p) => String(p.id)));
    const poolAff = poolIdDeAffectation(aff);
    if (poolAff != null) return !idsPools.has(String(poolAff));
    if (aff.dans_pool_courant === false) return true;
    if (!aff.classe_id) return false;
    const idsClasses = new Set();
    liste.forEach((p) => (p.classes || []).forEach((c) => idsClasses.add(String(c.id))));
    return !idsClasses.has(String(aff.classe_id));
  };
  const libellePeriodeAffectation = (aff) => {
    if (!aff) return '';
    if (estAffectationSpecialSansClasse(aff)) return getLibelleTypeSpecial(aff.type_special);
    const nomClasse = String(aff.classe_nom || '').trim();
    if (String(aff.type_special || '').toLowerCase() === 'soutien' || estAffectationSoutien(aff)) {
      return nomClasse ? `${nomClasse} - Soutien` : 'Soutien';
    }
    return nomClasse;
  };
  const resoudrePoolsPourGeneral = (poolId = null, poolIds = null) => {
    if (Array.isArray(poolIds) && poolIds.length) {
      return poolIds.map((id) => pools.find((p) => String(p.id) === String(id))).filter(Boolean);
    }
    if (poolId != null && poolId !== '') {
      const p = pools.find((x) => String(x.id) === String(poolId));
      return p ? [p] : [];
    }
    return [];
  };
  /** Libellé court de la branche affectée (pour affichage en petit). */
  const libelleBrancheAffectation = (aff) => {
    if (!aff) return '';
    if (aff.matiere_id != null && aff.matiere_id !== '') {
      const m = matieresParId.get(String(aff.matiere_id));
      if (m) return String(m.designation_courte || m.nom || '').trim();
    }
    return String(aff.matiere_nom || '').trim();
  };
  const nomPoolAffectationExterne = (aff, poolCourant) => {
    const poolAff = trouverPoolParId(poolIdDeAffectation(aff));
    if (poolAff?.nom) return poolAff.nom;
    if (aff?.pool_nom) return String(aff.pool_nom);
    const poolClasse = trouverPoolParClasseId(aff?.classe_id);
    if (poolClasse && poolCourant && String(poolClasse.id) !== String(poolCourant.id)) {
      return poolClasse.nom || 'Autre pool';
    }
    return 'Autre pool';
  };
  const profsPool = poolSelectionne ? poolSelectionne.profs : profs;
  const classesPool = trierClassesParNom(poolSelectionne ? poolSelectionne.classes : classes);
  const classesParId = new Map(classes.map(c => [String(c.id), c]));
  const classesPoolTriees = classesPool;
  const niveauxPoolSelectionne = parseNiveaux(poolSelectionne?.niveau);
  const poolAvecSoutien = niveauxPoolSelectionne.some(n => niveauAvecSoutien(n))
    || classesPool.some(cl => niveauAvecSoutien(resoudreNiveauClasse(cl)));
  const classesPoolIds = new Set(classesPool.map(c => String(c.id)));
  const profsPoolIds = new Set(profsPool.map(p => String(p.id)));
  const affectationsPourProfs = hasAffectationsUnsaved ? affectationsDraft : affectations;
  const affectationsPool = affectationsPourProfs.filter(a => {
    if (!profsPoolIds.has(String(a.prof_id))) return false;
    if (estAffectationHorsPool(a, poolSelectionne)) return false;
    if (a.classe_id != null && a.classe_id !== '' && classesPoolIds.has(String(a.classe_id))) return true;
    if (estAffectationSpecialSansClasse(a)) {
      const poolAff = poolIdDeAffectation(a);
      if (poolAff != null) return String(poolAff) === String(poolAffId);
      return true;
    }
    return false;
  });
  const periodesAffecteesParProf = profsPool.reduce((acc, p) => {
    acc[p.id] = (affectationsPourProfs || []).filter((a) => String(a.prof_id) === String(p.id)).length;
    return acc;
  }, {});
  const suiviClasses = classesPool.map(cl => {
    const fallbackNiveau = niveauxPoolSelectionne.length === 1 ? niveauxPoolSelectionne[0] : '';
    const niveauClasse = resoudreNiveauClasse(cl, fallbackNiveau);
    const affectationsClasse = affectationsPool.filter(a => String(a.classe_id) === String(cl.id));
    const periodesNormalesAffectees = affectationsClasse.filter(a => !estAffectationSoutien(a) && !estAffectationSpecialSansClasse(a)).length;
    const periodesSoutienAffectees = affectationsClasse.filter(a => estAffectationSoutien(a)).length;
    const requis = getRequisPeriodesNiveau(niveauClasse);
    const periodesParProf = new Map();
    affectationsClasse.forEach((a) => {
      if (!a?.prof_id || estAffectationSpecialSansClasse(a)) return;
      const key = String(a.prof_id);
      const prev = periodesParProf.get(key) || { profId: a.prof_id, periodes: 0 };
      prev.periodes += 1;
      periodesParProf.set(key, prev);
    });
    const profsClasse = Array.from(periodesParProf.values()).map((row) => {
      const prof = (profsPool || []).find((p) => String(p.id) === String(row.profId))
        || (profs || []).find((p) => String(p.id) === String(row.profId));
      const nom = prof
        ? `${prof.prenom || ''} ${nomSansSuffixe(prof.nom || '')}`.trim()
        : `Prof ${row.profId}`;
      return { ...row, nom };
    }).sort((a, b) =>
      (b.periodes - a.periodes)
      || String(a.nom || '').localeCompare(String(b.nom || ''), 'fr')
    );
    return {
      ...cl,
      niveauClasse,
      periodesNormalesAffectees,
      periodesSoutienAffectees,
      periodesNormalesRequises: requis.normales,
      periodesSoutienRequises: requis.soutien,
      profsClasse,
    };
  });
  const suiviClassesIncompletes = suiviClasses.filter(c =>
    niveauAvecSoutien(c.niveauClasse)
      ? (c.periodesNormalesAffectees < c.periodesNormalesRequises || c.periodesSoutienAffectees < c.periodesSoutienRequises)
      : (c.periodesNormalesAffectees < c.periodesNormalesRequises)
  );
  const totalRequisClassesPool = suiviClasses.reduce(
    (sum, c) => sum + (c.periodesNormalesRequises || 0) + (c.periodesSoutienRequises || 0),
    0
  );
  const quotaDefautPool = Math.max(
    2,
    Math.ceil(totalRequisClassesPool / Math.max(1, profsPool.length) / 2) * 2
  );
  const quotaAffichageParProf = profsPool.reduce((acc, p) => {
    const q = getQuotaEffectifProf(p);
    acc[p.id] = q > 0 ? q : quotaDefautPool;
    return acc;
  }, {});
  const resumePeriodesParJour = JOURS.reduce((acc, jour) => {
    let matin = 0;
    let apresMidi = 0;
    classesPool.forEach(cl => {
      if (classeAHoraire(cl.id, jour, 'Matin')) matin += 1;
      if (classeAHoraire(cl.id, jour, 'Après-midi')) apresMidi += 1;
    });
    acc[jour] = { matin, apresMidi };
    return acc;
  }, {});

  useEffect(() => {
    if (sousOngletAff !== 'profs') return;
    const init = {};
    const classesTriees = [...classesPool].sort((a, b) =>
      String(a.nom || '').localeCompare(String(b.nom || ''), 'fr')
    );
    classesTriees.forEach((cl) => {
      const classeComplete = classesParId.get(String(cl.id));
      const profId = classeComplete?.prof_principal_id;
      if (!profId || !profsPoolIds.has(String(profId))) return;
      const key = String(profId);
      if (!init[key]) init[key] = ['', ''];
      const slot = init[key].findIndex((v) => !v);
      if (slot >= 0) init[key][slot] = String(cl.id);
    });
    setTitulariatsDraftByProf(init);
  }, [sousOngletAff, poolAffId, classes, pools, profs]);

  const poolClasseP = pools.find(p => p.id == classePlanningPoolId);
  const classesPoolP = trierClassesParNom(poolClasseP ? poolClasseP.classes : classes);
  const classesToutesTriees = trierClassesParNom(classes);
  const profsPoolP = poolClasseP ? poolClasseP.profs : profs;
  const niveauxPoolPlanning = parseNiveaux(poolClasseP?.niveau).map(n => String(n).toUpperCase());
  const classePlanningObj = classes.find(c => String(c.id) === String(classePlanningId))
    || classesPoolP.find(c => String(c.id) === String(classePlanningId));
  const niveauClassePlanning = String(
    classePlanningObj?.niveau
    || (niveauxPoolPlanning.length === 1 ? niveauxPoolPlanning[0] : '')
    || ''
  ).toUpperCase();
  const matieresPourPlanningClasse = matieres.filter(m => {
    const nivM = String(m.niveau || '').toUpperCase();
    if (niveauClassePlanning) return nivM === niveauClassePlanning;
    return niveauxPoolPlanning.length > 0 && niveauxPoolPlanning.includes(nivM);
  });
  /** Branche « Soutien » : gérée via type_special, pas via le suivi des branches à placer. */
  const estMatiereSoutien = (m) => {
    const nom = String(m?.nom || '').trim().toLowerCase();
    const courte = String(m?.designation_courte || '').trim().toLowerCase();
    return nom === 'soutien' || courte === 'soutien';
  };
  const estBrancheFrancais = (m) => {
    const courte = String(m?.designation_courte || m?.code || m?.labelCourt || '').trim().toLowerCase();
    const nom = String(m?.nom || m?.label || '').trim().toLowerCase();
    if (['fr', 'fra'].includes(courte)) return true;
    return /fran[cç]ais/.test(`${nom} ${courte}`);
  };
  const estBrancheMath = (m) => {
    const courte = String(m?.designation_courte || m?.code || m?.labelCourt || '').trim().toLowerCase();
    const nom = String(m?.nom || m?.label || '').trim().toLowerCase();
    if (['ma', 'mat', 'math'].includes(courte)) return true;
    return /math/.test(`${nom} ${courte}`);
  };
  const matieresPourSuiviBranches = matieresPourPlanningClasse.filter((m) => !estMatiereSoutien(m));
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
  const estAffSoutienPlanning = (a) => String(a?.type_special || '').toLowerCase() === 'soutien';
  const planningClasseAffectationsNormales = planningClasseAffectations.filter((a) => !estAffSoutienPlanning(a));
  const soutienParCreneauClasse = new Map(
    planningClasseAffectations
      .filter((a) => estAffSoutienPlanning(a))
      .map((a) => [String(a.creneau_id), a])
  );
  const creneauxAvecSoutienClasse = new Set(soutienParCreneauClasse.keys());
  const getAffectationNormaleCreneau = (creneauId) =>
    planningClasseAffectationsNormales.find((a) => String(a.creneau_id) === String(creneauId)) || null;
  const libelleBadgeSoutienCreneau = (creneauId) =>
    libelleBadgeSoutienAff(soutienParCreneauClasse.get(String(creneauId)));
  const labelsSoutienClasse = new Map(
    [...soutienParCreneauClasse.entries()].map(([id, affS]) => [id, libelleBadgeSoutienAff(affS)])
  );
  const styleBadgeSoutien = {
    display: 'inline-block',
    maxWidth: '100%',
    marginTop: 4,
    padding: '1px 6px',
    borderRadius: 999,
    background: '#312e81',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 800,
    lineHeight: 1.35,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };
  const renderBadgeSoutien = (creneauId) => {
    const label = libelleBadgeSoutienCreneau(creneauId);
    if (!label) return null;
    return <div title={label} style={styleBadgeSoutien}>{label}</div>;
  };
  const classePlanningHorairesSet = new Set(
    (planningClasse?.horaires || []).map(h => `${h.jour}|${h.periode}`)
  );
  const classeAHorairePlanning = (jour, periode) => classePlanningHorairesSet.has(`${jour}|${periode}`);
  const creneauxPlanningParId = new Map((planningClasse?.creneaux || []).map((c) => [String(c.id), c]));
  const planningClasseAffectationsActives = planningClasseAffectationsNormales.filter((a) => {
    const cr = creneauxPlanningParId.get(String(a.creneau_id));
    if (!cr) return false;
    return classeAHorairePlanning(cr.jour, cr.periode);
  });
  const suiviBranchesClasse = planningClasse ? matieresPourSuiviBranches.map(m => {
    const affectees = planningClasseAffectationsActives.filter(a => String(a.matiere_id) === String(m.id)).length;
    const requises = parseInt(m.periodes_semaine) || 0;
    return { id: m.id, nom: m.nom, affectees, requises };
  }) : [];
  const groupesBranchesPool = regrouperBranchesParCode(matieresPourPlanningClasse);
  const idsClassesPoolPlanning = new Set((classesPoolP || []).map((c) => String(c.id)));
  const poolPlanningAvecSoutien = niveauxPoolPlanning.some((n) => niveauAvecSoutien(n))
    || (classesPoolP || []).some((cl) => niveauAvecSoutien(resoudreNiveauClasse(cl)));
  const affectationsPoolBranchesSuivi = (() => {
    const byId = new Map();
    (affectationsDraft || []).forEach((a) => {
      if (!idsClassesPoolPlanning.has(String(a.classe_id))) return;
      if (estAffectationSpecialSansClasse(a)) return;
      byId.set(String(a.id), a);
    });
    planningClasseAffectationsActives.forEach((a) => {
      if (estAffectationSpecialSansClasse(a)) return;
      byId.set(String(a.id), a);
    });
    (planningClasseAffectations || []).forEach((a) => {
      if (!estAffSoutienPlanning(a) && !estAffectationSoutien(a)) return;
      if (!idsClassesPoolPlanning.has(String(a.classe_id))) return;
      byId.set(String(a.id), a);
    });
    return Array.from(byId.values());
  })();
  const groupePourMatiereId = (matiereId) => {
    if (matiereId == null || matiereId === '') return null;
    const mid = String(matiereId);
    return groupesBranchesPool.find((g) => (g.ids || []).map(String).includes(mid)) || null;
  };
  const matiereCoursNormalDuSoutien = (affSoutien, liste) => {
    const soeurs = (liste || []).filter((a) =>
      String(a.classe_id) === String(affSoutien.classe_id)
      && String(a.creneau_id) === String(affSoutien.creneau_id)
      && String(a.id) !== String(affSoutien.id)
      && !estAffectationSoutien(a)
      && !estAffSoutienPlanning(a)
      && !estAffectationSpecialSansClasse(a)
      && a.matiere_id
    );
    const soeur = soeurs.find((a) => String(a.prof_id) !== String(affSoutien.prof_id)) || soeurs[0];
    if (!soeur) return null;
    return matieresParId.get(String(soeur.matiere_id)) || null;
  };
  const insererSoutienSousFrMa = (items, comptes, afficher) => {
    if (!afficher) return items;
    const out = [];
    let frAjoute = false;
    let maAjoute = false;
    (items || []).forEach((item) => {
      out.push(item);
      if (estBrancheFrancais(item) && !frAjoute) {
        out.push({
          id: `${item.id}_SOUTIEN_FR`,
          label: 'Français soutien',
          compte: comptes.fr || 0,
          indent: true,
        });
        frAjoute = true;
      }
      if (estBrancheMath(item) && !maAjoute) {
        out.push({
          id: `${item.id}_SOUTIEN_MA`,
          label: 'Math soutien',
          compte: comptes.ma || 0,
          indent: true,
        });
        maAjoute = true;
      }
    });
    if (!frAjoute) {
      out.push({ id: 'FR_SOUTIEN', label: 'Français soutien', compte: comptes.fr || 0, indent: true });
    }
    if (!maAjoute) {
      out.push({ id: 'MA_SOUTIEN', label: 'Math soutien', compte: comptes.ma || 0, indent: true });
    }
    return out;
  };
  const suiviPreferencesBranches = (profsPoolP || [])
    .slice()
    .sort((a, b) => String(a?.nom || '').localeCompare(String(b?.nom || ''), 'fr')
      || String(a?.prenom || '').localeCompare(String(b?.prenom || ''), 'fr'))
    .map((p) => {
      const prof = (profs || []).find((x) => String(x.id) === String(p.id)) || p;
      const affsProf = affectationsPoolBranchesSuivi.filter((a) => String(a.prof_id) === String(prof.id));
      const compteParCode = {};
      const comptesSoutien = { fr: 0, ma: 0 };
      affsProf.forEach((a) => {
        const estSoutien = estAffectationSoutien(a) || estAffSoutienPlanning(a);
        if (estSoutien) {
          const matiereLiee = matiereCoursNormalDuSoutien(a, affectationsPoolBranchesSuivi)
            || (a.matiere_id ? matieresParId.get(String(a.matiere_id)) : null);
          if (estBrancheFrancais(matiereLiee)) comptesSoutien.fr += 1;
          else if (estBrancheMath(matiereLiee)) comptesSoutien.ma += 1;
          return;
        }
        if (!a?.matiere_id) return;
        const matiere = matieresParId.get(String(a.matiere_id));
        if (!matiere || estMatiereSoutien(matiere)) return;
        const groupe = groupePourMatiereId(a.matiere_id);
        const code = String(groupe?.code || groupe?.id || matiere.designation_courte || matiere.nom || '').trim().toUpperCase();
        if (!code) return;
        compteParCode[code] = (compteParCode[code] || 0) + 1;
      });
      const afficherSoutien = poolPlanningAvecSoutien || comptesSoutien.fr > 0 || comptesSoutien.ma > 0;
      const colonnes = {};
      ORDRE_COLONNES_SPECIALITES.forEach((cat) => {
        const items = listerGroupesColonneOrdonnes(groupesBranchesPool, prof.branches_specialites, cat).map((g, idx) => {
          const code = String(g.code || g.id).toUpperCase();
          return {
            id: g.id,
            code,
            label: g.labelCourt || g.label || code,
            designation_courte: g.code || g.labelCourt,
            nom: g.labelComplet || g.label,
            rang: idx + 1,
            compte: compteParCode[code] || 0,
          };
        });
        colonnes[cat] = cat === 'principales'
          ? insererSoutienSousFrMa(items, comptesSoutien, afficherSoutien)
          : items;
      });
      return {
        profId: String(prof.id),
        nom: `${prof.prenom || ''} ${nomSansSuffixe(prof.nom || '')}`.trim() || `Prof ${prof.id}`,
        colonnes,
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

  const resetAffectationsSallesSalleCourante = () => {
    if (!isAdmin()) return;
    if (!sallesLieuTravailId) {
      showToast('Sélectionnez d\'abord un lieu de travail.', 'info');
      return;
    }
    if (!salleSelectionnee) {
      showToast('Sélectionnez d\'abord une salle à réinitialiser.', 'info');
      return;
    }
    const ok = window.confirm(
      `Vider les affectations de la salle « ${salleSelectionnee} » ?\n\n` +
      'Le tableau sera remis à zéro. Cliquez ensuite sur Sauvegarder pour enregistrer.'
    );
    if (!ok) return;
    const next = { ...sallesDraftMap };
    (creneaux || []).forEach((cr) => {
      const key = `${cr.jour}|${cr.periode}|${cr.ordre}`;
      const saved = getClasseAffecteeSalleCelluleSaved(cr.jour, cr.periode, cr.ordre) || '';
      if (saved) next[key] = '';
      else delete next[key];
    });
    setSallesDraftMap(next);
    setHasSallesUnsaved(Object.keys(next).length > 0);
    showToast(`Salle « ${salleSelectionnee} » vidée. Pensez à sauvegarder.`);
  };

  const resetAffectationsSallesSite = async () => {
    if (!isAdmin()) return;
    if (!sallesLieuTravailId) {
      showToast('Sélectionnez d\'abord un lieu de travail.', 'info');
      return;
    }
    const sallesSite = new Set((sallesDisponiblesLieu || []).map((s) => String(s).trim()));
    if (!sallesSite.size) {
      showToast('Aucune salle configurée pour ce lieu.', 'error');
      return;
    }
    const ok = window.confirm(
      `Vider les affectations salles de tout le site « ${sallesLieuTravailId} » ?\n\n` +
      'Toutes les salles du lieu seront libérées immédiatement.'
    );
    if (!ok) return;
    try {
      const coursAVider = (coursEmploiDuTemps || []).filter((c) =>
        sallesSite.has(String((c.salle || '').trim()))
      );
      for (const c of coursAVider) {
        await updateCoursSalle(c, null);
      }
      setSallesDraftMap({});
      setHasSallesUnsaved(false);
      await chargerTout();
      showToast(`Affectations salles du site « ${sallesLieuTravailId} » vidées.`);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Erreur lors de la réinitialisation des salles.', 'error');
    }
  };

  const proposerAffectationsSallesSite = async () => {
    if (!isAdmin()) return;
    if (!sallesLieuTravailId) {
      showToast('Sélectionnez d\'abord un lieu de travail.', 'info');
      return;
    }
    const sallesSite = [...(sallesDisponiblesLieu || [])];
    if (!sallesSite.length) {
      showToast('Aucune salle configurée pour ce lieu.', 'error');
      return;
    }
    if (!classesPourSalles.length) {
      showToast('Aucune classe sur ce site.', 'error');
      return;
    }
    const ok = window.confirm(
      `Proposer les affectations salles pour tout le site « ${sallesLieuTravailId} » ?\n\n` +
      'Les classes complémentaires (horaires en alternance) sont jumelées dans une même salle pour la remplir.\n' +
      'Chaque classe n’est placée qu’une seule fois sur le site. Les affectations actuelles du site seront remplacées.'
    );
    if (!ok) return;

    try {
      const demisParClasse = new Map();
      classesPourSalles.forEach((cl) => {
        const set = new Set(
          (classeHoraires || [])
            .filter((h) => String(h.classe_id) === String(cl.id))
            .map((h) => `${h.jour}|${h.periode}`)
        );
        demisParClasse.set(String(cl.id), set);
      });

      const classesAvecHoraires = classesPourSalles.filter((cl) => (demisParClasse.get(String(cl.id)) || new Set()).size > 0);
      if (!classesAvecHoraires.length) {
        showToast('Aucune classe n’a d’horaires matin/après-midi. Configurez d’abord Affectations → Classes.', 'error');
        return;
      }

      const seChevauchent = (idA, idB) => {
        const a = demisParClasse.get(String(idA)) || new Set();
        const b = demisParClasse.get(String(idB)) || new Set();
        for (const k of a) if (b.has(k)) return true;
        return false;
      };
      const tailleUnion = (idA, idB) => {
        const a = demisParClasse.get(String(idA)) || new Set();
        const b = demisParClasse.get(String(idB)) || new Set();
        return new Set([...a, ...b]).size;
      };

      // Jumelage : prioriser les paires sans chevauchement qui couvrent le plus de demi-journées
      const restants = trierClassesParNom(classesAvecHoraires).map((c) => String(c.id));
      const paires = [];
      const seuls = [];
      while (restants.length) {
        const a = restants.shift();
        let meilleur = null;
        let meilleurScore = -1;
        for (const b of restants) {
          if (seChevauchent(a, b)) continue;
          const score = tailleUnion(a, b);
          if (score > meilleurScore) {
            meilleurScore = score;
            meilleur = b;
          }
        }
        if (meilleur) {
          paires.push([a, meilleur]);
          const idx = restants.indexOf(meilleur);
          if (idx >= 0) restants.splice(idx, 1);
        } else {
          seuls.push(a);
        }
      }

      const groupes = [...paires, ...seuls.map((id) => [id])];
      if (groupes.length > sallesSite.length) {
        showToast(
          `Pas assez de salles (${sallesSite.length}) pour ${groupes.length} groupe(s) de classes. Réduisez les classes ou ajoutez des salles.`,
          'error'
        );
        return;
      }

      // Vider d'abord les salles du site
      const sallesSiteSet = new Set(sallesSite.map((s) => String(s).trim()));
      for (const c of (coursEmploiDuTemps || [])) {
        if (sallesSiteSet.has(String((c.salle || '').trim()))) {
          await updateCoursSalle(c, null);
        }
      }

      // Recharger pour partir d'un état propre
      let coursActuels = [];
      try {
        const r = await axios.get(API + '/emploi-du-temps', { headers });
        coursActuels = Array.isArray(r.data) ? r.data : (r.data?.cours || []);
      } catch (_) {
        coursActuels = coursEmploiDuTemps || [];
      }

      const trouverCours = (liste, classeId, jour, debut, fin) =>
        liste.find((c) =>
          String(c.classe_id) === String(classeId) &&
          c.jour === jour &&
          normaliserHeureCreneau(c.heure_debut) === debut &&
          normaliserHeureCreneau(c.heure_fin) === fin
        );

      let posees = 0;
      for (let i = 0; i < groupes.length; i += 1) {
        const salle = sallesSite[i];
        const idsGroupe = groupes[i];
        for (const cr of (creneaux || [])) {
          const cleDemi = `${cr.jour}|${cr.periode}`;
          const classeId = idsGroupe.find((id) => (demisParClasse.get(String(id)) || new Set()).has(cleDemi));
          if (!classeId) continue;
          const debut = normaliserHeureCreneau(cr.heure_debut);
          const fin = normaliserHeureCreneau(cr.heure_fin);
          const existant = trouverCours(coursActuels, classeId, cr.jour, debut, fin);
          if (existant) {
            await updateCoursSalle(existant, salle);
            existant.salle = salle;
          } else {
            const cree = await axios.post(API + '/emploi-du-temps', {
              classe_id: Number(classeId),
              matiere_id: null,
              prof_id: null,
              jour: cr.jour,
              heure_debut: cr.heure_debut,
              heure_fin: cr.heure_fin,
              salle,
            }, { headers });
            const row = cree?.data?.cours || cree?.data;
            if (row) coursActuels.push(row);
          }
          posees += 1;
        }
      }

      setSallesDraftMap({});
      setHasSallesUnsaved(false);
      await chargerTout();
      showToast(`Proposition salles enregistrée (${posees} créneaux, ${groupes.length} salle(s)).`);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Erreur lors de la proposition des salles.', 'error');
    }
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
    const classesTriees = [...classesPool].sort((a, b) =>
      String(a.nom || '').localeCompare(String(b.nom || ''), 'fr')
    );
    classesTriees.forEach((cl) => {
      const classeComplete = classesParId.get(String(cl.id));
      const profId = classeComplete?.prof_principal_id;
      if (!profId || !profsPoolIds.has(String(profId))) return;
      const key = String(profId);
      if (!init[key]) init[key] = ['', ''];
      const slot = init[key].findIndex((v) => !v);
      if (slot >= 0) init[key][slot] = String(cl.id);
    });
    setTitulariatsDraftByProf(init);
    setHasAffectationsUnsaved(false);
  };

  const resetAffectationsProfsTableau = () => {
    if (!isAdmin()) return;
    if (!poolAffId) {
      showToast('Sélectionnez d\'abord un pool.', 'info');
      return;
    }
    const ok = window.confirm(
      'Vider toutes les affectations professeurs de ce pool ?\n\nLe tableau sera remis à zéro. Cliquez ensuite sur Sauvegarder pour enregistrer.'
    );
    if (!ok) return;

    const idsAffectationsSupprimees = new Set();
    setAffectationsDraft((prev) => (prev || []).filter((a) => {
      if (!profsPoolIds.has(String(a.prof_id))) return true;
      if (estAffectationHorsPool(a, poolSelectionne)) return true;
      if (a?.id != null) idsAffectationsSupprimees.add(String(a.id));
      return false;
    }));
    setAffectationModes((prev) => {
      const next = { ...prev };
      idsAffectationsSupprimees.forEach((id) => { delete next[id]; });
      return next;
    });
    setTitulariatsDraftByProf((prev) => {
      const next = { ...prev };
      profsPoolIds.forEach((pid) => { delete next[String(pid)]; });
      return next;
    });
    setHasAffectationsUnsaved(true);
    showToast('Tableau des affectations vidé. Pensez à sauvegarder.');
  };

  const proposerAffectationsProfs = () => {
    if (!isAdmin()) return;
    if (!poolAffId) {
      showToast('Sélectionnez d\'abord un pool.', 'info');
      return;
    }
    if (!profsPool.length || !classesPool.length) {
      showToast('Le pool doit contenir des professeurs et des classes.', 'error');
      return;
    }
    const ok = window.confirm(
      'Générer une proposition d\'affectations pour ce pool ?\n\n' +
      'Règles : blocs de demi-journée (4 périodes) dans la même classe, sinon 2, sinon 1 ; ' +
      'répartition entre tous les professeurs (titulaire prioritaire, puis les moins chargés) ; ' +
      '1 période de titulariat par classe titulaire (max 2) ; 8 à 12 périodes par classe titulaire selon disponibilités/quota.\n\n' +
      'Le tableau actuel du pool sera remplacé. Cliquez ensuite sur Sauvegarder pour enregistrer.'
    );
    if (!ok) return;

    const draftId = () => `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ordreJour = Object.fromEntries(JOURS.map((j, i) => [j, i]));
    const creneauxTries = [...(creneaux || [])].sort((a, b) => {
      const dj = (ordreJour[a.jour] ?? 99) - (ordreJour[b.jour] ?? 99);
      if (dj !== 0) return dj;
      const dp = String(a.periode || '').localeCompare(String(b.periode || ''), 'fr');
      if (dp !== 0) return dp;
      return Number(a.ordre || 0) - Number(b.ordre || 0);
    });

    const isProfDispo = (profId, creneauId) => disposAffectations[`${profId}-${creneauId}`] !== false;
    const getRequisClasse = (cl) => {
      const fallbackNiveau = niveauxPoolSelectionne.length === 1 ? niveauxPoolSelectionne[0] : '';
      const niveauClasse = resoudreNiveauClasse(cl, fallbackNiveau);
      const requis = getRequisPeriodesNiveau(niveauClasse);
      return { ...requis, niveauClasse };
    };

    const totalRequisPool = classesPool.reduce((sum, cl) => {
      const r = getRequisClasse(cl);
      return sum + (r.normales || 0) + (r.soutien || 0);
    }, 0);
    // Si aucun quota n'est renseigné, répartir équitablement la charge du pool
    const quotaPartageDefaut = Math.max(
      2,
      Math.ceil(totalRequisPool / Math.max(1, profsPool.length) / 2) * 2
    );
    const getQuotaProf = (p) => {
      const q = getQuotaEffectifProf(p);
      return q > 0 ? q : quotaPartageDefaut;
    };

    // Titulariats de départ (jusqu'à 2 classes par professeur)
    const titulariatsParProf = {};
    const classesTitulairesPrises = new Set();
    listerTitulariatsPairs(titulariatsDraftByProf).forEach(({ profId, classeId }) => {
      if (!profsPoolIds.has(profId) || !classesPoolIds.has(classeId)) return;
      if (classesTitulairesPrises.has(classeId)) return;
      if (!titulariatsParProf[profId]) titulariatsParProf[profId] = [];
      if (titulariatsParProf[profId].length >= 2) return;
      titulariatsParProf[profId].push(classeId);
      classesTitulairesPrises.add(classeId);
    });
    classesPool.forEach((cl) => {
      const classeComplete = classesParId.get(String(cl.id));
      const profId = classeComplete?.prof_principal_id ? String(classeComplete.prof_principal_id) : '';
      const cid = String(cl.id);
      if (!profId || !profsPoolIds.has(profId)) return;
      if (classesTitulairesPrises.has(cid)) return;
      if (!titulariatsParProf[profId]) titulariatsParProf[profId] = [];
      if (titulariatsParProf[profId].length >= 2) return;
      titulariatsParProf[profId].push(cid);
      classesTitulairesPrises.add(cid);
    });
    const classesSansTitulaire = classesPool
      .map((cl) => String(cl.id))
      .filter((cid) => !classesTitulairesPrises.has(cid));
    const profsAvecPlace = profsPool
      .map((p) => String(p.id))
      .filter((pid) => (titulariatsParProf[pid] || []).length < 2);
    classesSansTitulaire.forEach((cid) => {
      const pid = profsAvecPlace.find((p) => (titulariatsParProf[p] || []).length < 2);
      if (!pid) return;
      if (!titulariatsParProf[pid]) titulariatsParProf[pid] = [];
      titulariatsParProf[pid].push(cid);
      classesTitulairesPrises.add(cid);
    });
    const titulariatsPairs = Object.entries(titulariatsParProf).flatMap(([profId, classesIds]) =>
      (classesIds || []).map((classeId) => ({ profId, classeId }))
    );
    const estTitulaireDe = (profId, classeId) =>
      (titulariatsParProf[String(profId)] || []).includes(String(classeId));
    const loadTitulaireParClasse = Object.fromEntries(
      titulariatsPairs.map(({ profId, classeId }) => [`${profId}|${classeId}`, 0])
    );

    let nextDraft = (affectationsDraft || []).filter((a) => {
      if (!profsPoolIds.has(String(a.prof_id))) return true;
      return estAffectationHorsPool(a, poolSelectionne);
    });
    const nextModes = {};
    const occupiedProf = new Set();
    const occupiedClasse = new Set(); // clé: classeId|creneauId|classe|soutien
    const loadProf = Object.fromEntries(profsPool.map((p) => [String(p.id), 0]));
    const loadClasse = Object.fromEntries(classesPool.map((c) => [String(c.id), 0]));
    const loadSoutien = Object.fromEntries(classesPool.map((c) => [String(c.id), 0]));
    const quotaProf = Object.fromEntries(profsPool.map((p) => [String(p.id), getQuotaProf(p)]));
    const requisParClasse = Object.fromEntries(classesPool.map((c) => [String(c.id), getRequisClasse(c)]));
    nextDraft.forEach((a) => {
      const pid = String(a.prof_id);
      if (!profsPoolIds.has(pid)) return;
      loadProf[pid] = (loadProf[pid] || 0) + 1;
      if (a.creneau_id != null) occupiedProf.add(`${pid}|${String(a.creneau_id)}`);
    });
    const cleOccupationClasse = (classeId, creneauId, mode = 'classe') =>
      `${String(classeId)}|${String(creneauId)}|${mode === 'soutien' ? 'soutien' : 'classe'}`;

    const ajouterAffectation = ({ profId, creneauId, classeId = null, typeSpecial = null, mode = 'classe' }) => {
      const pid = String(profId);
      const cid = classeId != null ? String(classeId) : null;
      const crid = String(creneauId);
      const modeOcc = mode === 'soutien' || typeSpecial === 'soutien' ? 'soutien' : 'classe';
      if (loadProf[pid] >= (quotaProf[pid] || 0)) return false;
      if (occupiedProf.has(`${pid}|${crid}`)) return false;
      if (!isProfDispo(pid, crid)) return false;
      if (cid && occupiedClasse.has(cleOccupationClasse(cid, crid, modeOcc))) return false;
      const id = draftId();
      const typeSpecialFinal = modeOcc === 'soutien' ? 'soutien' : (typeSpecial || null);
      nextDraft.push({
        id,
        prof_id: Number.isFinite(Number(profId)) ? Number(profId) : profId,
        classe_id: cid ? (Number.isFinite(Number(cid)) ? Number(cid) : cid) : null,
        matiere_id: null,
        creneau_id: Number.isFinite(Number(creneauId)) ? Number(creneauId) : creneauId,
        type_special: typeSpecialFinal,
        pool_id: idPoolNumerique(),
      });
      nextModes[id] = typeSpecialFinal === 'soutien' ? 'soutien' : (typeSpecialFinal ? 'special' : mode);
      occupiedProf.add(`${pid}|${crid}`);
      if (cid) occupiedClasse.add(cleOccupationClasse(cid, crid, modeOcc));
      loadProf[pid] += 1;
      if (cid && modeOcc === 'soutien') loadSoutien[cid] += 1;
      else if (cid) {
        loadClasse[cid] += 1;
        const cleTit = `${pid}|${cid}`;
        if (Object.prototype.hasOwnProperty.call(loadTitulaireParClasse, cleTit)) {
          loadTitulaireParClasse[cleTit] += 1;
        }
      }
      return true;
    };

    // Blocs d'une demi-journée : 4 périodes, sinon paires de 2, sinon unités
    const listerBlocs = (taille) => {
      const blocs = [];
      JOURS.forEach((jour) => {
        ['Matin', 'Après-midi'].forEach((periode) => {
          const crs = creneauxTries
            .filter((c) => c.jour === jour && c.periode === periode)
            .sort((a, b) => Number(a.ordre || 0) - Number(b.ordre || 0));
          if (crs.length < taille) return;
          if (taille === 4 && crs.length >= 4) {
            blocs.push({ jour, periode, crs: crs.slice(0, 4), taille: 4 });
          } else if (taille === 2) {
            for (let i = 0; i <= crs.length - 2; i += 1) {
              blocs.push({ jour, periode, crs: crs.slice(i, i + 2), taille: 2 });
            }
          } else if (taille === 1) {
            crs.forEach((cr) => {
              blocs.push({ jour, periode, crs: [cr], taille: 1 });
            });
          }
        });
      });
      return blocs;
    };
    const blocs4 = listerBlocs(4);
    const blocs2 = listerBlocs(2);
    const blocs1 = listerBlocs(1);

    const blocCompatibleClasse = (bloc, classeId) =>
      classeAHoraire(classeId, bloc.jour, bloc.periode);

    const peutAssignerBloc = (profId, classeId, bloc) => {
      const pid = String(profId);
      const cid = String(classeId);
      if (!blocCompatibleClasse(bloc, cid)) return false;
      if ((loadProf[pid] || 0) + bloc.crs.length > (quotaProf[pid] || 0)) return false;
      return bloc.crs.every((cr) =>
        isProfDispo(pid, cr.id)
        && !occupiedProf.has(`${pid}|${cr.id}`)
        && !occupiedClasse.has(cleOccupationClasse(cid, cr.id, 'classe'))
      );
    };

    const assignerBloc = (profId, classeId, bloc, mode = 'classe') => {
      if (!peutAssignerBloc(profId, classeId, bloc)) return false;
      let okAll = true;
      for (const cr of bloc.crs) {
        if (!ajouterAffectation({ profId, creneauId: cr.id, classeId, mode })) {
          okAll = false;
          break;
        }
      }
      return okAll;
    };

    const trouverBloc = (profId, classeId, taille, exclureKeys = new Set()) => {
      const source = taille === 4 ? blocs4 : (taille === 2 ? blocs2 : blocs1);
      return source.find((bloc) => {
        const key = `${bloc.jour}|${bloc.periode}|${bloc.crs.map((c) => c.id).join('-')}`;
        if (exclureKeys.has(key)) return false;
        return peutAssignerBloc(profId, classeId, bloc);
      }) || null;
    };

    /** Classe les candidats : titulaire d'abord, puis les moins chargés (répartition), léger aléa */
    const trierCandidatsRepartis = (candidats, classeId) => {
      const cleTitPour = (pid) => `${pid}|${classeId}`;
      return [...candidats].sort((a, b) => {
        const titA = estTitulaireDe(a, classeId) ? 0 : 1;
        const titB = estTitulaireDe(b, classeId) ? 0 : 1;
        if (titA !== titB) return titA - titB;
        if (estTitulaireDe(a, classeId) && (loadTitulaireParClasse[cleTitPour(a)] || 0) >= 12) return 1;
        if (estTitulaireDe(b, classeId) && (loadTitulaireParClasse[cleTitPour(b)] || 0) >= 12) return -1;
        const loadA = loadProf[a] || 0;
        const loadB = loadProf[b] || 0;
        if (loadA !== loadB) return loadA - loadB;
        const ratioA = loadA / Math.max(1, quotaProf[a] || 1);
        const ratioB = loadB / Math.max(1, quotaProf[b] || 1);
        if (ratioA !== ratioB) return ratioA - ratioB;
        return Math.random() - 0.5;
      });
    };

    // Phase 1 — classe(s) titulaire(s) en blocs 4 puis 2 (cible 8–12 par classe)
    // Ordre mélangé pour ne pas toujours prioriser le même professeur
    const titulariatsPairsMelanges = [...titulariatsPairs].sort(() => Math.random() - 0.5);
    titulariatsPairsMelanges.forEach(({ profId, classeId }) => {
      const nbTitulariatsProf = (titulariatsParProf[profId] || []).length;
      const quotaPourClasse = Math.max(0, (quotaProf[profId] || 0) - nbTitulariatsProf);
      const requisRestants = Math.max(0, (requisParClasse[classeId]?.normales || 0) - (loadClasse[classeId] || 0));
      const cleTit = `${profId}|${classeId}`;
      let cible = Math.min(12, quotaPourClasse);
      if (quotaPourClasse >= 8) cible = Math.min(12, Math.max(8, Math.min(10, quotaPourClasse)));
      if (requisRestants > 0) cible = Math.min(cible, requisRestants);
      else cible = 0;

      while ((loadTitulaireParClasse[cleTit] || 0) + 4 <= cible) {
        const bloc = trouverBloc(profId, classeId, 4);
        if (!bloc) break;
        if (!assignerBloc(profId, classeId, bloc)) break;
      }
      while ((loadTitulaireParClasse[cleTit] || 0) + 2 <= cible) {
        const bloc = trouverBloc(profId, classeId, 2);
        if (!bloc) break;
        if (!assignerBloc(profId, classeId, bloc)) break;
      }
    });

    // Phase 2 — 1 période de titulariat par classe titulaire
    titulariatsPairsMelanges.forEach(({ profId, classeId }) => {
      const dejaTitulariat = nextDraft.some((a) =>
        String(a.prof_id) === String(profId)
        && a.type_special === 'titulariat'
        && String(a.classe_id || '') === String(classeId)
      );
      if (dejaTitulariat) return;
      const slotsPref = creneauxTries.filter((cr) =>
        classeAHoraire(classeId, cr.jour, cr.periode)
        && isProfDispo(profId, cr.id)
        && !occupiedProf.has(`${profId}|${cr.id}`)
      );
      const slotsAutres = creneauxTries.filter((cr) =>
        isProfDispo(profId, cr.id)
        && !occupiedProf.has(`${profId}|${cr.id}`)
        && !slotsPref.some((s) => String(s.id) === String(cr.id))
      );
      const candidat = slotsPref[0] || slotsAutres[0];
      if (candidat) ajouterAffectation({ profId, creneauId: candidat.id, classeId, typeSpecial: 'titulariat' });
    });

    // Phase 3 — compléter les classes en tours (répartition entre professeurs), blocs 4 → 2 → 1
    const assignerBesoinParTours = (tailles = [4, 2, 1]) => {
      tailles.forEach((taille) => {
        let progres = true;
        let gardeFou = 0;
        while (progres && gardeFou < 300) {
          progres = false;
          gardeFou += 1;
          const classesNeeding = [...classesPool]
            .map((cl) => String(cl.id))
            .filter((cid) => ((requisParClasse[cid]?.normales || 0) - (loadClasse[cid] || 0)) >= taille)
            .sort((a, b) => {
              const ra = (requisParClasse[a]?.normales || 0) - (loadClasse[a] || 0);
              const rb = (requisParClasse[b]?.normales || 0) - (loadClasse[b] || 0);
              if (rb !== ra) return rb - ra;
              return Math.random() - 0.5;
            });

          classesNeeding.forEach((classeId) => {
            const cleTitPour = (pid) => `${pid}|${classeId}`;
            const candidats = trierCandidatsRepartis(
              [...profsPool]
                .map((p) => String(p.id))
                .filter((pid) => (loadProf[pid] || 0) + taille <= (quotaProf[pid] || 0)),
              classeId
            );

            for (const pid of candidats) {
              if (estTitulaireDe(pid, classeId) && (loadTitulaireParClasse[cleTitPour(pid)] || 0) + taille > 12) {
                // Le titulaire a atteint son plafond dans cette classe : laisser les autres
                continue;
              }
              const bloc = trouverBloc(pid, classeId, taille);
              if (!bloc) continue;
              if (assignerBloc(pid, classeId, bloc)) {
                progres = true;
                break; // 1 bloc max par classe et par tour → répartit entre les profs
              }
            }
          });
        }
      });
    };

    assignerBesoinParTours([4, 2, 1]);

    // Phase 4 — soutien CSC/CAL (paires puis unités)
    classesPool.forEach((cl) => {
      const cid = String(cl.id);
      let besoinSoutien = (requisParClasse[cid]?.soutien || 0) - (loadSoutien[cid] || 0);
      if (besoinSoutien <= 0) return;

      // paires de soutien
      while (besoinSoutien >= 2) {
        const candidats = [...profsPool]
          .map((p) => String(p.id))
          .filter((pid) => (loadProf[pid] || 0) + 2 <= (quotaProf[pid] || 0))
          .sort((a, b) => (loadProf[a] || 0) - (loadProf[b] || 0) || Math.random() - 0.5);
        let assigne = false;
        for (const pid of candidats) {
          const bloc = (blocs2 || []).find((b) => {
            if (!classeAHoraire(cid, b.jour, b.periode)) return false;
            return b.crs.every((cr) =>
              isProfDispo(pid, cr.id)
              && !occupiedProf.has(`${pid}|${cr.id}`)
              && !occupiedClasse.has(cleOccupationClasse(cid, cr.id, 'soutien'))
            ) && (loadProf[pid] || 0) + 2 <= (quotaProf[pid] || 0);
          });
          if (!bloc) continue;
          let okBloc = true;
          for (const cr of bloc.crs) {
            if (!ajouterAffectation({ profId: pid, creneauId: cr.id, classeId: cid, mode: 'soutien' })) {
              okBloc = false;
              break;
            }
          }
          if (okBloc) {
            besoinSoutien -= 2;
            assigne = true;
            break;
          }
        }
        if (!assigne) break;
      }

      // unités restantes
      const slots = creneauxTries.filter((cr) =>
        classeAHoraire(cid, cr.jour, cr.periode) && !occupiedClasse.has(cleOccupationClasse(cid, cr.id, 'soutien'))
      );
      for (const cr of slots) {
        if (besoinSoutien <= 0) break;
        const candidats = [...profsPool]
          .map((p) => String(p.id))
          .filter((pid) =>
            (loadProf[pid] || 0) < (quotaProf[pid] || 0)
            && isProfDispo(pid, cr.id)
            && !occupiedProf.has(`${pid}|${cr.id}`)
          )
          .sort((a, b) => (loadProf[a] || 0) - (loadProf[b] || 0) || Math.random() - 0.5);
        const choisi = candidats[0];
        if (!choisi) continue;
        if (ajouterAffectation({ profId: choisi, creneauId: cr.id, classeId: cid, mode: 'soutien' })) {
          besoinSoutien -= 1;
        }
      }
    });

    setAffectationsDraft(nextDraft);
    setAffectationModes((prev) => {
      const next = { ...(prev || {}) };
      (affectationsDraft || []).forEach((a) => {
        if (profsPoolIds.has(String(a.prof_id)) && a?.id != null) delete next[String(a.id)];
      });
      return { ...next, ...nextModes };
    });
    setTitulariatsDraftByProf((prev) => {
      const next = { ...prev };
      profsPoolIds.forEach((pid) => { delete next[String(pid)]; });
      Object.entries(titulariatsParProf).forEach(([pid, classesIds]) => {
        next[pid] = [String(classesIds[0] || ''), String(classesIds[1] || '')];
      });
      return next;
    });
    setHasAffectationsUnsaved(true);

    const totalPosees = Object.values(loadProf).reduce((s, n) => s + n, 0);
    const classesIncompletes = classesPool.filter((cl) => {
      const cid = String(cl.id);
      const req = requisParClasse[cid] || { normales: 0, soutien: 0 };
      return (loadClasse[cid] || 0) < req.normales || (loadSoutien[cid] || 0) < req.soutien;
    }).map((cl) => cl.nom);
    if (classesIncompletes.length) {
      showToast(`Proposition générée (${totalPosees} périodes). Classes incomplètes : ${classesIncompletes.join(', ')}.`, 'info');
    } else {
      showToast(`Proposition générée (${totalPosees} périodes). Pensez à sauvegarder.`);
    }
  };
  const abandonnerClassesNonSauvegardees = () => {
    setClasseHoraires(classeHorairesSaved || []);
    setHasClassesUnsaved(false);
  };

  const resetAffectationsClassesTableau = () => {
    if (!isAdmin()) return;
    if (!poolAffId) {
      showToast('Sélectionnez d\'abord un pool.', 'info');
      return;
    }
    const ok = window.confirm(
      'Vider les horaires (matin / après-midi) de toutes les classes de ce pool ?\n\n' +
      'Le tableau sera remis à zéro. Cliquez ensuite sur Sauvegarder pour enregistrer.'
    );
    if (!ok) return;
    const idsPool = new Set(classesPool.map((c) => String(c.id)));
    setClasseHoraires((prev) => (prev || []).filter((h) => !idsPool.has(String(h.classe_id))));
    setHasClassesUnsaved(true);
    showToast('Horaires des classes vidés. Pensez à sauvegarder.');
  };

  const proposerAffectationsClasses = () => {
    if (!isAdmin()) return;
    if (!poolAffId) {
      showToast('Sélectionnez d\'abord un pool.', 'info');
      return;
    }
    if (!classesPool.length) {
      showToast('Aucune classe dans ce pool.', 'error');
      return;
    }
    const ok = window.confirm(
      'Générer une proposition d\'horaires pour les classes de ce pool ?\n\n' +
      '• CSC / CAL / CFR : alternance matin/après-midi inversée entre classes (ex. 01 M-A-M-A-M, 02 A-M-A-M-A)\n' +
      '• EPL : toute la semaine matin ou après-midi (alternance entre classes)\n' +
      '• APL : base matin ou après-midi + 2 jours complets espacés (lun/mer ou mar/jeu)\n\n' +
      'Les horaires actuels du pool seront remplacés. Cliquez ensuite sur Sauvegarder.'
    );
    if (!ok) return;

    const fallbackNiveau = niveauxPoolSelectionne.length === 1 ? niveauxPoolSelectionne[0] : '';
    const parNiveau = {};
    classesPool.forEach((cl) => {
      const niv = resoudreNiveauClasse(cl, fallbackNiveau) || 'AUTRE';
      if (!parNiveau[niv]) parNiveau[niv] = [];
      parNiveau[niv].push(cl);
    });

    const idsPool = new Set(classesPool.map((c) => String(c.id)));
    const nouveaux = (classeHoraires || []).filter((h) => !idsPool.has(String(h.classe_id)));
    const ignores = [];
    let generes = 0;

    Object.entries(parNiveau).forEach(([niv, liste]) => {
      const listeOrdonnee = trierClassesParNom(liste);
      listeOrdonnee.forEach((cl) => {
        const horaires = genererHorairesPropositionPourClasse(cl, niv, listeOrdonnee);
        if (!horaires) {
          ignores.push(cl.nom || String(cl.id));
          return;
        }
        nouveaux.push(...horaires);
        generes += 1;
      });
    });

    setClasseHoraires(nouveaux);
    setHasClassesUnsaved(true);
    if (ignores.length) {
      showToast(
        `Proposition générée pour ${generes} classe(s). Non gérées (à saisir à la main) : ${ignores.join(', ')}.`,
        'info'
      );
    } else {
      showToast(`Proposition générée pour ${generes} classe(s). Pensez à sauvegarder.`);
    }
  };

  const abandonnerBranchesNonSauvegardees = () => {
    setBranchesMatiereDraftMap({});
    setHasBranchesUnsaved(false);
  };

  const resetAffectationsBranchesTableau = () => {
    if (!isAdmin()) return;
    if (!classePlanningId || !planningClasse) {
      showToast('Sélectionnez d\'abord une classe.', 'info');
      return;
    }
    const ok = window.confirm(
      'Vider toutes les branches de ce planning ?\n\nLe tableau sera remis à zéro. Cliquez ensuite sur Sauvegarder pour enregistrer.'
    );
    if (!ok) return;
    const next = {};
    planningClasseAffectationsNormales.forEach((a) => {
      if (a?.id != null) next[String(a.id)] = '';
    });
    setBranchesMatiereDraftMap(next);
    setHasBranchesUnsaved(true);
    setPlanningClasse((prev) => (prev ? { ...prev } : prev));
    showToast('Branches vidées. Pensez à sauvegarder.');
  };

  const proposerAffectationsBranches = () => {
    if (!isAdmin()) return;
    if (!classePlanningId || !planningClasse) {
      showToast('Sélectionnez d\'abord une classe.', 'info');
      return;
    }
    const slots = planningClasseAffectationsActives
      .map((a) => {
        const cr = creneauxPlanningParId.get(String(a.creneau_id));
        if (!cr) return null;
        return { aff: a, cr };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const dj = JOURS.indexOf(a.cr.jour) - JOURS.indexOf(b.cr.jour);
        if (dj !== 0) return dj;
        const dp = String(a.cr.periode || '').localeCompare(String(b.cr.periode || ''), 'fr');
        if (dp !== 0) return dp;
        return Number(a.cr.ordre || 0) - Number(b.cr.ordre || 0);
      });

    if (!slots.length) {
      showToast('Aucune période avec professeur affecté à planifier.', 'info');
      return;
    }
    if (!matieresPourPlanningClasse.length) {
      showToast('Aucune branche disponible pour ce niveau.', 'error');
      return;
    }

    const ok = window.confirm(
      'Générer une proposition de branches pour cette classe ?\n\n' +
      'Règles : max 2 fois la même branche à la suite ; Français et Math 1 fois/jour si possible.\n\n' +
      'Les branches actuelles seront remplacées. Cliquez ensuite sur Sauvegarder pour enregistrer.'
    );
    if (!ok) return;

    const requis = Object.fromEntries(
      matieresPourSuiviBranches.map((m) => [String(m.id), parseInt(m.periodes_semaine, 10) || 0])
    );
    const compte = Object.fromEntries(matieresPourSuiviBranches.map((m) => [String(m.id), 0]));
    const assignment = {}; // affId -> matiereId
    const byJour = {};
    slots.forEach((s) => {
      const j = s.cr.jour;
      if (!byJour[j]) byJour[j] = [];
      byJour[j].push(s);
    });

    const matiereFr = matieresPourSuiviBranches.find(estBrancheFrancais) || null;
    const matiereMa = matieresPourSuiviBranches.find(estBrancheMath) || null;

    const peutEncher = (matiereId, sequencePrecedente) => {
      const mid = String(matiereId);
      if ((compte[mid] || 0) >= (requis[mid] || 0)) return false;
      // max 2 à la suite
      if (sequencePrecedente.length >= 2
        && String(sequencePrecedente[sequencePrecedente.length - 1]) === mid
        && String(sequencePrecedente[sequencePrecedente.length - 2]) === mid) {
        return false;
      }
      return true;
    };

    const scoreCandidat = (m, slot, sequencePrecedente, dejaFrJour, dejaMaJour) => {
      const mid = String(m.id);
      if (!peutEncher(mid, sequencePrecedente)) return -9999;
      let score = 0;
      const restant = (requis[mid] || 0) - (compte[mid] || 0);
      score += restant * 10;
      // Préférence prof
      const prof = (profs || []).find((p) => String(p.id) === String(slot.aff.prof_id));
      const prefs = normaliserIdsPrefBranches(prof?.branches_specialites);
      if (prefs.includes(mid)) score += 25;
      // Éviter 2e consécutive sauf si utile
      if (sequencePrecedente.length && String(sequencePrecedente[sequencePrecedente.length - 1]) === mid) {
        score -= 5;
      }
      // Bonus FR/MA une fois par jour
      if (matiereFr && mid === String(matiereFr.id) && !dejaFrJour) score += 40;
      if (matiereMa && mid === String(matiereMa.id) && !dejaMaJour) score += 40;
      // Pénalité si déjà placé FR/MA ce jour et on en remet
      if (matiereFr && mid === String(matiereFr.id) && dejaFrJour) score -= 30;
      if (matiereMa && mid === String(matiereMa.id) && dejaMaJour) score -= 30;
      return score;
    };

    JOURS.forEach((jour) => {
      const daySlots = byJour[jour] || [];
      if (!daySlots.length) return;
      const sequence = [];
      let dejaFr = false;
      let dejaMa = false;

      // Passe 1 : essayer de placer FR et MA tôt dans la journée
      const prioritaires = [matiereFr, matiereMa].filter(Boolean);
      daySlots.forEach((slot) => {
        let meilleur = null;
        let meilleurScore = -9999;
        // d'abord candidats prioritaires du jour si pas encore placés
        const candidats = [
          ...prioritaires.filter((m) => {
            if (estBrancheFrancais(m) && dejaFr) return false;
            if (estBrancheMath(m) && dejaMa) return false;
            return true;
          }),
          ...matieresPourSuiviBranches,
        ];
        // unique by id preserving order
        const seen = new Set();
        candidats.forEach((m) => {
          const mid = String(m.id);
          if (seen.has(mid)) return;
          seen.add(mid);
          const sc = scoreCandidat(m, slot, sequence, dejaFr, dejaMa);
          if (sc > meilleurScore) {
            meilleurScore = sc;
            meilleur = m;
          }
        });
        if (!meilleur || meilleurScore <= -9999) {
          sequence.push(null);
          return;
        }
        const mid = String(meilleur.id);
        assignment[String(slot.aff.id)] = mid;
        compte[mid] = (compte[mid] || 0) + 1;
        sequence.push(mid);
        if (matiereFr && mid === String(matiereFr.id)) dejaFr = true;
        if (matiereMa && mid === String(matiereMa.id)) dejaMa = true;
      });
    });

    // Remplir les slots non assignés (si FR/MA n'ont rien trouvé etc.)
    slots.forEach((slot) => {
      const key = String(slot.aff.id);
      if (assignment[key]) return;
      const jourSlots = byJour[slot.cr.jour] || [];
      const idx = jourSlots.findIndex((s) => String(s.aff.id) === key);
      const sequence = jourSlots.slice(0, idx).map((s) => assignment[String(s.aff.id)] || null).filter(Boolean);
      let meilleur = null;
      let meilleurScore = -9999;
      matieresPourSuiviBranches.forEach((m) => {
        const sc = scoreCandidat(m, slot, sequence, false, false);
        // ignore daily FR/MA bonus recalculation for fill — use restant mainly
        const mid = String(m.id);
        if (!peutEncher(mid, sequence)) return;
        const restant = (requis[mid] || 0) - (compte[mid] || 0);
        const fillScore = restant * 10 + (sc > -9999 ? 1 : 0);
        if (fillScore > meilleurScore) {
          meilleurScore = fillScore;
          meilleur = m;
        }
      });
      if (!meilleur) return;
      const mid = String(meilleur.id);
      assignment[key] = mid;
      compte[mid] = (compte[mid] || 0) + 1;
    });

    const next = { ...branchesMatiereDraftMap };
    planningClasseAffectationsNormales.forEach((a) => {
      if (a?.id == null) return;
      next[String(a.id)] = assignment[String(a.id)] || '';
    });
    setBranchesMatiereDraftMap(next);
    setHasBranchesUnsaved(true);
    setPlanningClasse((prev) => (prev ? { ...prev } : prev));

    const incompletes = matieresPourSuiviBranches
      .filter((m) => (compte[String(m.id)] || 0) < (requis[String(m.id)] || 0))
      .map((m) => `${m.nom} ${compte[String(m.id)] || 0}/${requis[String(m.id)] || 0}`);
    if (incompletes.length) {
      showToast(`Proposition générée. Branches incomplètes : ${incompletes.join(', ')}.`, 'info');
    } else {
      showToast('Proposition de branches générée. Pensez à sauvegarder.');
    }
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
          const changedPool = String(orig.pool_id || '') !== String(draft.pool_id || '');
          if (changedClasse || changedMatiere || changedSpecial || changedPool) {
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
      listerTitulariatsPairs(titulariatsDraftByProf).forEach(({ profId, classeId }) => {
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
          pool_id: a.pool_id != null && a.pool_id !== '' ? a.pool_id : idPoolNumerique(),
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
          pool_id: aff.pool_id != null && aff.pool_id !== '' ? aff.pool_id : (classePlanningPoolId || idPoolNumerique()),
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
    const niv = resoudreNiveauClasse(c, fallbackNiv);
    const nb = totalPeriodesNiveau(niv);
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
  const baseCreneauxPeriode = (liste, periode) =>
    (liste || [])
      .filter(c => c.jour === 'Lundi' && c.periode === periode)
      .sort((a, b) => Number(a.ordre || 0) - Number(b.ordre || 0));
  const withPrintLayout = (titre, contenu, options = {}) => {
    const format = String(options?.format || 'A4').toUpperCase() === 'A3' ? 'A3' : 'A4';
    const pageSize = options?.pageSize
      || (format === 'A3'
        ? (options?.paysage ? 'A3 landscape' : 'A3 portrait')
        : (options?.paysage ? 'A4 landscape' : 'A4 portrait'));
    const compactClasses = !!options?.compactClasses;
    const a3Semaine = !!options?.a3Semaine;
    const marginCss = options?.margin || (a3Semaine ? '6mm 8mm' : (format === 'A3' ? '8mm 10mm' : '12mm 20mm'));
    return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(titre)}</title>
        <style>
          @page { size: ${pageSize}; margin: ${marginCss}; }
          html, body { height: 100%; }
          body {
            font-family: Arial, sans-serif;
            margin: ${a3Semaine ? '4px' : '16px'};
            color: #111827;
            text-align: center;
            box-sizing: border-box;
          }
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              width: 100%;
              height: 100%;
              min-height: 100%;
            }
            /* Sans .section : centrer le contenu sur la page (ex. général par jours) */
            body:not(:has(.section)):not(:has(.section-a3)) {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
          }
          h1 { margin: 0 0 ${a3Semaine ? '6px' : '18px'}; font-size: ${a3Semaine ? '16px' : '28px'}; text-align: center; width: 100%; }
          h2 { margin: 14px 0 8px; font-size: 15px; text-align: center; }
          table { border-collapse: collapse; margin: ${a3Semaine ? '0 auto' : '8px auto 18px'}; table-layout: fixed; ${a3Semaine ? 'width: 100%;' : 'width: auto; max-width: 100%;'} }
          .section, .section-a3 {
            text-align: center;
            width: 100%;
            box-sizing: border-box;
          }
          @media print {
            .section, .section-a3 {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: calc(100vh - 2mm);
              page-break-inside: avoid;
            }
          }
          .section table, .section-a3 table { margin-left: auto; margin-right: auto; }
          th, td { border: 1px solid #e2e8f0; padding: ${a3Semaine ? '2px 2px' : '5px 4px'}; font-size: ${a3Semaine ? '7pt' : '9pt'}; text-align: center; vertical-align: middle; word-break: break-word; overflow-wrap: anywhere; }
          th { background: #f8fafc; font-weight: 700; }
          col.creneau-col { width: ${a3Semaine ? 72 : LARGEUR_COLONNE_CRENEAU}px; min-width: ${a3Semaine ? 72 : LARGEUR_COLONNE_CRENEAU}px; max-width: ${a3Semaine ? 72 : LARGEUR_COLONNE_CRENEAU}px; }
          col.day-col { width: auto; }
          col.spacer-col { width: 10px; min-width: 8px; max-width: 14px; }
          .section { page-break-inside: avoid; page-break-after: always; margin-bottom: 12px; break-inside: avoid; break-after: page; }
          .section:last-child { page-break-after: auto; break-after: auto; }
          .section-a3 { page-break-inside: avoid; page-break-after: auto; break-inside: avoid; margin: 0; }
          .day-banner { background:#6366f1;color:#fff;text-align:center;font-weight:800;font-size:${a3Semaine ? '8pt' : '11pt'};padding:${a3Semaine ? '3px 8px' : '5px 14px'};text-transform:uppercase;letter-spacing:0.04em;border-radius:8px 8px 0 0; }
          .periode-banner { background:#000;color:#fff;font-weight:700;font-size:${a3Semaine ? '7pt' : '9pt'};padding:${a3Semaine ? '2px 6px' : '4px 8px'};text-align:left;border:none; }
          .pause-banner { background:#111827;color:#fff;font-weight:700;font-size:9pt;padding:4px 8px;text-align:center;border:1px solid #111827; }
          .day-gap td { border: none !important; background: transparent !important; height: ${a3Semaine ? '8px' : '14px'}; padding: 0 !important; }
          .spacer-cell { border: none !important; background: transparent !important; padding: 0 !important; width: 10px; }
          .titulaire-label { display:block; margin-top:2px; font-size:6pt; font-weight:600; color:#64748b; line-height:1.15; }
          ${compactClasses ? `
          h1 { margin-bottom: 14px; font-size: 24px; }
          h2 { margin: 10px 0 6px; font-size: 13px; }
          table { margin: 4px 0 10px; }
          th, td { padding: 3px; font-size: 8pt; line-height: 1.15; }
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

  /** Impression semaine (classe / salle / professeur) — style aligné sur le planning général */
  const buildPlanningSemainePrintHtml = ({ creneauxListe, getCellText, getCellData, showPauseRows = true, titreBanniere = '' }) => {
    const ROW_H = 52;
    const CRENEAU_W = LARGEUR_COLONNE_CRENEAU;
    const fetchCellData = (cr, jour, periode) => {
      if (!cr) return { text: '' };
      if (getCellData) return getCellData(cr, jour, periode) || { text: '' };
      return { text: getCellText ? getCellText(cr, jour, periode) : '' };
    };
    const headerDays = JOURS.map((j) =>
      `<th style="text-align:center;font-size:9pt;padding:5px 4px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">${escapeHtml(j)}</th>`
    ).join('');

    const rows = [];
    ['Matin', 'Après-midi'].forEach((periode, periodeIdx) => {
      const base = baseCreneauxPeriode(creneauxListe, periode);
      if (!base.length) return;
      rows.push(`<tr><td colspan="6" class="periode-banner">${escapeHtml(periode)}</td></tr>`);
      base.forEach((crBase, idx) => {
        const cellules = JOURS.map((jour) => {
          const cr = (creneauxListe || []).find(c => c.jour === jour && c.periode === periode && c.ordre === crBase.ordre);
          if (!cr) {
            return `<td style="background:#f8fafc;height:${ROW_H}px;border:1px solid #e2e8f0;"></td>`;
          }
          const raw = fetchCellData(cr, jour, periode) || { text: '' };
          const texteBrut = String(raw.text || '');
          const isIndispo = /indispo/i.test(texteBrut);
          let bg = toPrintColor(raw.bg) || (isIndispo ? '#eeeeee' : '#ffffff');
          let fg = toPrintColor(raw.color) || (isIndispo ? '#9ca3af' : '#1e293b');
          if (isIndispo && !raw.bg) {
            bg = '#eeeeee';
            fg = '#9ca3af';
          }
          const lignes = escapeHtml(texteBrut).split('\n').filter(Boolean);
          const content = lignes.length
            ? `<div style="font-weight:700;color:${fg};font-size:9pt;line-height:1.25;">${lignes[0]}</div>${lignes.slice(1).map(l => `<div style="color:${fg};font-size:8pt;margin-top:2px;line-height:1.2;">${l}</div>`).join('')}`
            : '';
          return `<td style="background:${bg};color:${fg};height:${ROW_H}px;text-align:center;vertical-align:middle;border:1px solid #e2e8f0;padding:3px 4px;">${content}</td>`;
        }).join('');
        rows.push(
          `<tr><td style="background:#f8fafc;font-weight:700;font-size:8pt;text-align:center;white-space:nowrap;height:${ROW_H}px;border:1px solid #e2e8f0;width:${CRENEAU_W}px;">${escapeHtml(crBase.heure_debut)}–${escapeHtml(crBase.heure_fin)}</td>${cellules}</tr>`
        );
        if (showPauseRows && idx === 1) {
          const pause = pausesParPeriode[periode] || { debut: '', fin: '' };
          rows.push(
            `<tr><td class="pause-banner" style="white-space:nowrap;">${escapeHtml(pause.debut)}–${escapeHtml(pause.fin)}</td><td colspan="5" class="pause-banner">PAUSE</td></tr>`
          );
        }
      });
      if (periodeIdx === 0) {
        rows.push(`<tr><td colspan="6" style="height:10px;background:#ffffff;border:none;padding:0;"></td></tr>`);
      }
    });

    const banniere = titreBanniere
      ? `<tr><td colspan="6" style="padding:0;border:none;background:transparent;"><div class="day-banner">${escapeHtml(titreBanniere)}</div></td></tr>`
      : '';

    return `
      <table style="border-collapse:collapse;width:100%;table-layout:fixed;margin-bottom:16px;">
        <colgroup>
          <col class="creneau-col" />
          ${JOURS.map(() => '<col class="day-col" />').join('')}
        </colgroup>
        <tbody>
          ${banniere}
          <tr>
            <th style="text-align:center;font-size:9pt;padding:5px 4px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Horaire</th>
            ${headerDays}
          </tr>
          ${rows.join('')}
        </tbody>
      </table>
    `;
  };

  const buildPlanningTableHtml = (args) => buildPlanningSemainePrintHtml(args);

  const buildPlanningClassesPrintTableHtml = ({ creneauxListe, affectationsListe, horairesListe, titreBanniere = '', creneauxAvecSoutien = null, labelsSoutien = null }) => {
    const horairesSet = new Set((horairesListe || []).map(h => `${h.jour}|${h.periode}`));
    const soutienSet = creneauxAvecSoutien instanceof Set
      ? creneauxAvecSoutien
      : new Set((creneauxAvecSoutien || []).map(String));
    const labels = labelsSoutien instanceof Map ? labelsSoutien : new Map();
    return buildPlanningSemainePrintHtml({
      creneauxListe,
      showPauseRows: true,
      titreBanniere,
      getCellData: (cr) => {
        const aCours = horairesSet.has(`${cr.jour}|${cr.periode}`);
        if (!aCours) return { text: '', bg: '#f8fafc' };
        const aff = (affectationsListe || []).find(a =>
          String(a.creneau_id) === String(cr.id)
          && String(a.type_special || '').toLowerCase() !== 'soutien'
        );
        if (!aff) return { text: 'Aucun professeur affecté', color: '#dc2626' };
        if (estAffectationSpecialSansClasse(aff)) {
          return {
            text: getLibelleTypeSpecial(aff.type_special),
            bg: '#000000',
            color: '#ffffff',
          };
        }
        const bg = toPrintColor(getCouleurProf(aff.prof_id)) || '#e8f5e9';
        const badgeS = soutienSet.has(String(cr.id))
          ? ` ${labels.get(String(cr.id)) || '(S)'}`
          : '';
        return {
          text: `${formaterNomComplet(aff.prof_nom || '')}${badgeS}${aff.matiere_nom ? `\n${aff.matiere_nom}` : ''}`,
          bg,
          color: getCouleurTexteSurFond(bg),
        };
      },
    });
  };
  const buildPlanningGeneralPrintHtml = ({ creneaux: allCrs, profs, affectations, dispos, poolId = null, poolIds = null }) => {
    const CRENEAU_W = LARGEUR_COLONNE_CRENEAU;
    const ROW_H = 52;
    const poolsCourants = resoudrePoolsPourGeneral(poolId, poolIds);
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
            const aff = (affectations || []).find(a => String(a.prof_id) === String(p.id) && String(a.creneau_id) === String(cr.id));
            const dispo = (dispos || []).find(d => String(d.prof_id) === String(p.id) && String(d.creneau_id) === String(cr.id));
            const indispo = dispo && !dispo.disponible;
            let bg = '#fff', content = '';
            if (aff && estAffectationHorsPools(aff, poolsCourants)) {
              bg = '#e2e8f0';
              const nomPool = escapeHtml(nomPoolAffectationExterne(aff, poolsCourants[0]));
              const periodeExt = escapeHtml(libellePeriodeAffectation(aff));
              content = `<div style="font-weight:700;color:#475569;font-size:8pt;line-height:1.2;">${nomPool}</div>${periodeExt ? `<div style="font-weight:600;color:#64748b;font-size:7pt;margin-top:1px;line-height:1.15;">${periodeExt}</div>` : ''}`;
            } else if (aff) {
              const estSoutien = String(aff.type_special || '').toLowerCase() === 'soutien';
              const estSpecial = !!aff.type_special && !estSoutien;
              bg = estSpecial ? '#000' : (aff.classe_id ? getCouleurClasse(aff.classe_id) : '#e8f5e9');
              const fg = estSpecial ? '#fff' : getCouleurTexteSurFond(bg);
              const nomClasse = escapeHtml(aff.classe_nom || '');
              const ligne1 = estSpecial
                ? getLibelleTypeSpecial(aff.type_special)
                : (estSoutien ? `${nomClasse} - Soutien` : nomClasse);
              const branche = libelleBrancheAffectation(aff);
              const ligne2 = estSpecial || !branche
                ? ''
                : `<div style="font-size:7.5pt;font-weight:600;margin-top:2px;line-height:1.15;opacity:0.95;">${escapeHtml(branche)}</div>`;
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
          <table style="border-collapse:collapse;width:100%;table-layout:fixed;margin:0 auto 20px;">
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
  /** Planning général A3 paysage : semaine entière, largeur colonnes comme 10 profs (fictifs si besoin). */
  const A3_NB_COLONNES_PROF = 10;
  const buildPlanningGeneralA3SemainePrintHtml = ({ creneaux: allCrs, profs, affectations, dispos, titulaires, poolId = null, poolIds = null }) => {
    const listeProfsReels = Array.isArray(profs) ? profs : [];
    const listeProfs = [...listeProfsReels];
    while (listeProfs.length < A3_NB_COLONNES_PROF) {
      listeProfs.push({ id: `__fake_${listeProfs.length}`, _fake: true, nom: '', prenom: '' });
    }
    const listeCrs = Array.isArray(allCrs) ? allCrs : [];
    const listeAff = Array.isArray(affectations) ? affectations : [];
    const listeDispos = Array.isArray(dispos) ? dispos : [];
    const listeTit = Array.isArray(titulaires) ? titulaires : [];
    const poolsCourants = resoudrePoolsPourGeneral(poolId, poolIds);
    const classesParProf = {};
    listeTit.forEach((t) => {
      const pid = t?.prof_id != null ? String(t.prof_id) : '';
      const nomClasse = String(t?.classe_nom || '').trim();
      if (!pid || !nomClasse) return;
      if (!classesParProf[pid]) classesParProf[pid] = [];
      if (!classesParProf[pid].includes(nomClasse)) classesParProf[pid].push(nomClasse);
    });
    if (Object.keys(classesParProf).length === 0) {
      listeTit.forEach((t) => {
        const nomTit = formaterNomComplet(t?.prof_nom || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (!nomTit || !t?.classe_nom) return;
        const prof = listeProfsReels.find((p) => {
          const n = formaterNomComplet(`${p.prenom || ''} ${nomSansSuffixe(p.nom || '')}`).toLowerCase().replace(/\s+/g, ' ').trim();
          return n && n === nomTit;
        });
        if (!prof) return;
        const pid = String(prof.id);
        if (!classesParProf[pid]) classesParProf[pid] = [];
        const cn = String(t.classe_nom).trim();
        if (cn && !classesParProf[pid].includes(cn)) classesParProf[pid].push(cn);
      });
    }

    const nProfs = listeProfs.length; // toujours A3_NB_COLONNES_PROF
    const nCols = 1 + nProfs + Math.max(0, nProfs - 1);
    const CRENEAU_W = 72;
    const ROW_H = 30;
    const PROF_COL_W = `calc((100% - ${CRENEAU_W}px - ${(nProfs - 1) * 10}px) / ${nProfs})`;
    const spacerTd = '<td class="spacer-cell"></td>';

    const withSpacers = (cellsHtmlArr) => {
      const out = [];
      cellsHtmlArr.forEach((cell, i) => {
        out.push(cell);
        if (i < cellsHtmlArr.length - 1) out.push(spacerTd);
      });
      return out.join('');
    };

    const profHeaders = withSpacers(listeProfs.map((p) => {
      if (p._fake) {
        return `<th style="text-align:center;font-size:7.5pt;padding:3px 2px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;line-height:1.2;width:${PROF_COL_W};">&nbsp;</th>`;
      }
      const nomAffiche = `${formaterPrenomEntete(p.prenom || '')} ${nomSansSuffixe(p.nom || '')}`.trim()
        || nomSansSuffixe(p.nom || '')
        || 'Professeur';
      const classesTit = (classesParProf[String(p.id)] || []).join(', ');
      const titulaireHtml = classesTit
        ? `<span class="titulaire-label">Tit. ${escapeHtml(classesTit)}</span>`
        : '';
      return `<th style="text-align:center;font-size:7.5pt;padding:3px 2px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;line-height:1.2;width:${PROF_COL_W};">${escapeHtml(nomAffiche)}${titulaireHtml}</th>`;
    }));

    const colgroup = `<colgroup>
      <col class="creneau-col" style="width:${CRENEAU_W}px;min-width:${CRENEAU_W}px;"/>
      ${listeProfs.map((_, i) =>
        `<col style="width:${PROF_COL_W};" />${i < nProfs - 1 ? '<col class="spacer-col" />' : ''}`
      ).join('')}
    </colgroup>`;

    const rows = [];
    JOURS.forEach((jour, jourIdx) => {
      const crs = listeCrs.filter((c) => c.jour === jour);
      if (!crs.length) return;
      if (jourIdx > 0) {
        rows.push(`<tr class="day-gap"><td colspan="${nCols}"></td></tr>`);
      }
      rows.push(
        `<tr><td colspan="${nCols}" style="padding:0;border:none;background:transparent;"><div class="day-banner">${escapeHtml(jour)}</div></td></tr>`
      );
      ['Matin', 'Après-midi'].forEach((per) => {
        const crsPer = crs
          .filter((c) => c.periode === per)
          .sort((a, b) => Number(a.ordre || 0) - Number(b.ordre || 0));
        if (!crsPer.length) return;
        rows.push(
          `<tr><td colspan="${nCols}" class="periode-banner">${escapeHtml(per)}</td></tr>`
        );
        crsPer.forEach((cr) => {
          const cells = listeProfs.map((p) => {
            if (p._fake) {
              return `<td style="background:#fff;height:${ROW_H}px;text-align:center;vertical-align:middle;border:1px solid #e2e8f0;padding:1px 2px;"></td>`;
            }
            const aff = listeAff.find(
              (a) => String(a.prof_id) === String(p.id) && String(a.creneau_id) === String(cr.id)
            );
            const dispo = listeDispos.find(
              (d) => String(d.prof_id) === String(p.id) && String(d.creneau_id) === String(cr.id)
            );
            const indispo = dispo && !dispo.disponible;
            let bg = '#fff';
            let content = '';
            if (aff && estAffectationHorsPools(aff, poolsCourants)) {
              bg = '#e2e8f0';
              const nomPool = escapeHtml(nomPoolAffectationExterne(aff, poolsCourants[0]));
              const periodeExt = escapeHtml(libellePeriodeAffectation(aff));
              content = `<div style="font-weight:700;color:#475569;font-size:6.5pt;line-height:1.15;">${nomPool}</div>${periodeExt ? `<div style="font-weight:600;color:#64748b;font-size:5.5pt;margin-top:1px;line-height:1.1;">${periodeExt}</div>` : ''}`;
            } else if (aff) {
              const estSoutien = String(aff.type_special || '').toLowerCase() === 'soutien';
              const estSpecial = !!aff.type_special && !estSoutien;
              bg = estSpecial ? '#000' : (aff.classe_id ? getCouleurClasse(aff.classe_id) : '#e8f5e9');
              const fg = estSpecial ? '#fff' : getCouleurTexteSurFond(bg);
              const nomClasse = escapeHtml(aff.classe_nom || '');
              const ligne1 = estSpecial
                ? getLibelleTypeSpecial(aff.type_special)
                : (estSoutien ? `${nomClasse} - Soutien` : nomClasse);
              const branche = libelleBrancheAffectation(aff);
              const ligne2 = estSpecial || !branche
                ? ''
                : `<div style="font-size:5.5pt;font-weight:600;margin-top:1px;line-height:1.1;opacity:0.95;">${escapeHtml(branche)}</div>`;
              content = `<div style="font-weight:700;color:${fg};font-size:7pt;line-height:1.15;">${ligne1}</div>${ligne2}`;
            } else if (indispo) {
              bg = '#eee';
              content = '<span style="color:#9ca3af;font-size:6.5pt;">Indispo</span>';
            }
            return `<td style="background:${bg};height:${ROW_H}px;text-align:center;vertical-align:middle;border:1px solid #e2e8f0;padding:1px 2px;">${content}</td>`;
          });
          rows.push(
            `<tr><td style="background:#f8fafc;font-weight:700;font-size:6.5pt;text-align:center;white-space:nowrap;height:${ROW_H}px;border:1px solid #e2e8f0;">${escapeHtml(cr.heure_debut)}–${escapeHtml(cr.heure_fin)}</td>${withSpacers(cells)}</tr>`
          );
        });
      });
    });

    return `
      <div class="section-a3">
        <table style="border-collapse:collapse;width:100%;table-layout:fixed;margin:0 auto;">
          ${colgroup}
          <thead>
            <tr>
              <th style="text-align:center;font-size:7.5pt;padding:3px 2px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Horaire</th>
              ${profHeaders}
            </tr>
          </thead>
          <tbody>
            ${rows.join('')}
          </tbody>
        </table>
      </div>
    `;
  };
  const openPrintWindow = (titre, contenu, options = {}) => {
    const html = withPrintLayout(titre, contenu, options);
    const format = String(options?.format || 'A4').toUpperCase() === 'A3' ? 'A3' : 'A4';
    const pageSize = options?.pageSize
      || (format === 'A3'
        ? (options?.paysage ? 'A3 landscape' : 'A3 portrait')
        : (options?.paysage ? 'A4 landscape' : 'A4 portrait'));
    const margin = options?.margin || (options?.a3Semaine ? '6mm 8mm' : (format === 'A3' ? '8mm 10mm' : '12mm 20mm'));
    const finalHtml = injectForcedPrintCss(html, pageSize, margin);
    const popup = openPrintPopup(finalHtml, {
      title: titre,
      width: format === 'A3' ? 1600 : 1200,
      height: format === 'A3' ? 1000 : 820,
    });
    if (!popup) alert("Impossible d'ouvrir la fenêtre d'impression. Autorisez les popups.");
  };
  const imprimerPlanningGeneralA3Semaine = async () => {
    try {
      if (!planningPoolId) return alert("Sélectionnez d'abord un pool.");
      // Même pipeline que l’export PDF « Général » (données fraîches + HTML A3 + rendu PDF)
      const pool = pools.find((p) => String(p.id) === String(planningPoolId));
      const url = API + '/planning/general?pool_id=' + encodeURIComponent(planningPoolId);
      const rep = await axios.get(url, { headers });
      const data = rep.data || {};
      const contenu = buildPlanningGeneralA3SemainePrintHtml({
        creneaux: data.creneaux || [],
        profs: data.profs || [],
        affectations: data.affectations || [],
        dispos: data.dispos || [],
        titulaires: data.titulaires || [],
        poolId: planningPoolId,
      });
      const siteBrut = String(pool?.site || pool?.nom || '').trim();
      const siteComplet = (
        lieuxTravailMap.get(normaliserLieuTravail(siteBrut))
        || siteBrut
        || pool?.nom
        || 'Site'
      ).trim();
      const titre = `Planning général — semaine — ${siteComplet}`;
      const html = buildHtmlPrintDoc(titre, contenu, {
        paysage: true,
        format: 'A3',
        a3Semaine: true,
        margin: '6mm 8mm',
      });
      const blob = await htmlDocumentToPdfBlob(html, {
        paysage: true,
        format: 'a3',
        orientation: 'landscape',
      });
      const pdfUrl = URL.createObjectURL(blob);
      const win = window.open(pdfUrl, '_blank');
      if (!win) {
        // Fallback téléchargement si popup bloquée
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = `${sanitizeFilename(siteComplet, 'Site')}_Planning-général.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Erreur lors de l'impression A3.");
    }
  };

  const buildHtmlPrintDoc = (titre, contenu, options = {}) =>
    injectForcedPrintCss(withPrintLayout(titre, contenu, options),
      options?.pageSize
        || (String(options?.format || 'A4').toUpperCase() === 'A3'
          ? (options?.paysage ? 'A3 landscape' : 'A3 portrait')
          : (options?.paysage ? 'A4 landscape' : 'A4 portrait')),
      options?.margin || (options?.a3Semaine ? '6mm 8mm' : '12mm 20mm'));

  /** Exporte tous les PDF (classes, salles, professeurs, général) dans un dossier + sous-dossiers. */
  const exporterTousPlanningsPdf = async () => {
    if (exportPdfEnCours) return;
    try {
      exportPdfAnnulerRef.current = false;
      setExportPdfEnCours(true);
      setExportPdfProgress('Choix du dossier…');

      let dirHandle = null;
      const choix = await demanderDossierExport();
      if (choix?.cancelled || exportPdfAnnulerRef.current) {
        setExportPdfEnCours(false);
        setExportPdfProgress('');
        return;
      }
      if (choix?.handle) {
        dirHandle = choix.handle;
      } else {
        // Navigateur sans File System Access → ZIP, sans popup bloquant : le statut reste sur le bouton
        setExportPdfProgress('Mode ZIP…');
      }

      const documents = [];
      const dateTag = new Date().toISOString().slice(0, 10);
      const rootFolderName = `Plannings_EDT_${dateTag}`;
      const poolsExport = Array.isArray(pools) ? pools : [];
      const nomPoolSafe = (pool) => sanitizeFilename(pool?.nom || `Pool_${pool?.id || 'x'}`, 'Pool');
      /** Nom du site (lieu) canonique / complet pour préfixer les PDF. */
      const resoudreNomSiteComplet = (poolOrSite) => {
        const brut = (poolOrSite && typeof poolOrSite === 'object')
          ? String(poolOrSite.site || poolOrSite.nom || '').trim()
          : String(poolOrSite || '').trim();
        if (!brut) return 'Site';
        const canon = lieuxTravailMap.get(normaliserLieuTravail(brut));
        return (canon || brut).trim() || 'Site';
      };
      const nomSiteSafe = (poolOrSite) => sanitizeFilename(resoudreNomSiteComplet(poolOrSite), 'Site');
      const pdfNomAvecSite = (site, suffixe) => `${site}_${sanitizeFilename(suffixe, 'doc')}.pdf`;
      const checkCancel = () => exportPdfAnnulerRef.current;

      // Index : classeId -> pools, profId -> pools (actifs uniquement)
      const classesActivesIds = new Set(
        (classes || []).filter((c) => c && c.actif !== false).map((c) => String(c.id))
      );
      const profsActifsIds = new Set(
        (profs || []).filter((p) => p && p.actif !== false).map((p) => String(p.id))
      );
      const poolsParClasse = new Map();
      const poolsParProf = new Map();
      poolsExport.forEach((pool) => {
        (pool.classes || []).forEach((cl) => {
          const key = String(cl.id);
          if (!classesActivesIds.has(key)) return;
          if (!poolsParClasse.has(key)) poolsParClasse.set(key, []);
          poolsParClasse.get(key).push(pool);
        });
        (pool.profs || []).forEach((p) => {
          const key = String(p.id);
          if (!profsActifsIds.has(key)) return;
          if (!poolsParProf.has(key)) poolsParProf.set(key, []);
          poolsParProf.get(key).push(pool);
        });
      });

      // —— Classes (sous-dossier par pool) : actives + rattachées à un pool uniquement ——
      setExportPdfProgress('Chargement des classes…');
      if (checkCancel()) throw Object.assign(new Error('annulé'), { cancelled: true });
      const classesExport = (classesToutesTriees.length ? classesToutesTriees : classes)
        .filter((cl) => cl && cl.actif !== false && poolsParClasse.has(String(cl.id)));
      if (classesExport.length) {
        const reps = await Promise.all(
          classesExport.map((cl) => axios.get(API + '/planning/classe/' + cl.id, { headers }).catch(() => null))
        );
        reps.forEach((rep, idx) => {
          if (!rep?.data) return;
          const data = rep.data;
          const classeId = String(data?.classe?.id || classesExport[idx]?.id || '');
          if (!poolsParClasse.has(classeId)) return;
          const nomClasse = data?.classe?.nom || classesExport[idx]?.nom || `Classe_${idx + 1}`;
          const titulaireClasse = data?.classe?.titulaire_nom || '';
          const affs = data?.affectations || [];
          const affsNormales = affs.filter((a) => String(a.type_special || '').toLowerCase() !== 'soutien');
          const labelsSoutien = labelsSoutienDepuisAffectations(affs);
          const titre = `${nomClasse}${titulaireClasse ? ` — Titulaire : ${titulaireClasse}` : ''}`;
          const table = buildPlanningClassesPrintTableHtml({
            creneauxListe: data?.creneaux || [],
            affectationsListe: affsNormales,
            horairesListe: data?.horaires || [],
            titreBanniere: titre || 'Classe',
            creneauxAvecSoutien: new Set(labelsSoutien.keys()),
            labelsSoutien,
          });
          const html = buildHtmlPrintDoc(titre, `<div class="section">${table}</div>`, { paysage: true, compactClasses: true });
          const pdfOptions = { paysage: true, format: 'a4', orientation: 'landscape' };
          const poolsClasse = poolsParClasse.get(classeId) || [];
          poolsClasse.forEach((pool) => {
            const site = nomSiteSafe(pool);
            documents.push({
              relativePath: `Classes/${nomPoolSafe(pool)}/${pdfNomAvecSite(site, nomClasse)}`,
              html,
              pdfOptions,
            });
          });
        });
      }

      // —— Professeurs (sous-dossier par pool) : actifs + rattachés à un pool uniquement ——
      setExportPdfProgress('Chargement des professeurs…');
      const profsExport = (profs || []).filter(
        (p) => p && p.actif !== false && poolsParProf.has(String(p.id))
      );
      if (profsExport.length) {
        const reps = await Promise.all(
          profsExport.map((p) => axios.get(API + '/planning/prof/' + p.id, { headers }).catch(() => null))
        );
        reps.forEach((rep, idx) => {
          if (!rep?.data) return;
          const data = rep.data;
          const profId = String(data?.prof?.id || profsExport[idx]?.id || '');
          if (!poolsParProf.has(profId)) return;
          const nom = `${data?.prof?.prenom || profsExport[idx]?.prenom || ''} ${nomSansSuffixe(data?.prof?.nom || profsExport[idx]?.nom || '')}`.trim() || `Prof_${idx + 1}`;
          const table = buildPlanningTableHtml({
            creneauxListe: data?.creneaux || [],
            titreBanniere: nom,
            showPauseRows: true,
            getCellData: (cr) => {
              const aff = (data?.affectations || []).find((a) => String(a.creneau_id) === String(cr.id));
              if (estAffectationSpecialSansClasse(aff)) {
                return { text: getLibelleTypeSpecial(aff.type_special), bg: '#000000', color: '#ffffff' };
              }
              if (hasBrancheAffectee(aff) || aff?.classe_nom) {
                const bg = aff.matiere_id
                  ? getCouleurBranche(aff.matiere_id)
                  : (aff.classe_id ? getCouleurClasse(aff.classe_id) : '#e8f5e9');
                return {
                  text: texteCellulePlanningProf(aff),
                  bg,
                  color: getCouleurTexteSurFond(bg),
                };
              }
              const dispo = (data?.dispos || []).find((d) => String(d.creneau_id) === String(cr.id));
              if (dispo && !dispo.disponible) return { text: 'Indispo', bg: '#eeeeee', color: '#9ca3af' };
              return { text: '' };
            },
          });
          const html = buildHtmlPrintDoc(`Planning professeur — ${nom}`, `<div class="section">${table}</div>`, { paysage: true });
          const pdfOptions = { paysage: true, format: 'a4', orientation: 'landscape' };
          const poolsProf = poolsParProf.get(profId) || [];
          poolsProf.forEach((pool) => {
            const site = nomSiteSafe(pool);
            documents.push({
              relativePath: `Professeurs/${nomPoolSafe(pool)}/${pdfNomAvecSite(site, nom)}`,
              html,
              pdfOptions,
            });
          });
        });
      }

      // —— Salles (tous les lieux) ——
      setExportPdfProgress('Préparation des salles…');
      const lieuxExport = (lieuxTravailOptions || []).length
        ? lieuxTravailOptions
        : Array.from(new Set((sallesDB || []).map((s) => s.lieu_nom).filter(Boolean)));
      for (const lieu of lieuxExport) {
        const lieuNorm = normaliserLieuTravail(lieu);
        const poolsLieu = poolsExport.filter((p) => normaliserLieuTravail(p.site || '') === lieuNorm);
        const idsClassesLieu = new Set();
        poolsLieu.forEach((p) => (p.classes || []).forEach((c) => idsClassesLieu.add(String(c.id))));
        if (!idsClassesLieu.size) classes.forEach((c) => idsClassesLieu.add(String(c.id)));

        const sallesLieu = (sallesDB || [])
          .filter((s) => normaliserLieuTravail(s.lieu_nom || '') === lieuNorm)
          .map((s) => s.nom);
        const sallesFixes = SALLES_FIXES_PAR_LIEU[lieuNorm] || [];
        const sallesListe = (sallesLieu.length ? sallesLieu : sallesFixes)
          .filter(Boolean)
          .sort((a, b) => String(a).localeCompare(String(b), 'fr'));

        sallesListe.forEach((salle) => {
          const table = buildPlanningTableHtml({
            creneauxListe: creneaux || [],
            titreBanniere: `${lieu} — ${salle}`,
            showPauseRows: true,
            getCellData: (cr) => {
              const cours = (coursEmploiDuTemps || []).find((c) =>
                c.jour === cr.jour
                && normaliserHeureCreneau(c.heure_debut) === normaliserHeureCreneau(cr.heure_debut)
                && normaliserHeureCreneau(c.heure_fin) === normaliserHeureCreneau(cr.heure_fin)
                && String((c.salle || '').trim()) === String((salle || '').trim())
                && idsClassesLieu.has(String(c.classe_id))
              );
              if (!cours) return { text: '' };
              const cl = classes.find((x) => String(x.id) === String(cours.classe_id));
              if (!cl) return { text: '' };
              const aff = (affectations || []).find((a) =>
                String(a.classe_id) === String(cl.id)
                && String(a.creneau_id) === String(cr.id)
                && String(a.type_special || '').toLowerCase() !== 'soutien'
              ) || (affectations || []).find((a) =>
                String(a.classe_id) === String(cl.id) && String(a.creneau_id) === String(cr.id)
              );
              if (estAffectationSpecialSansClasse(aff)) {
                return {
                  text: `${cl.nom}\n${getLibelleTypeSpecial(aff.type_special)}`,
                  bg: '#000000',
                  color: '#ffffff',
                };
              }
              const bg = getCouleurClasse(cl.id);
              const nom = estAffectationSoutien(aff) ? `${cl.nom} - Soutien` : cl.nom;
              return {
                text: `${nom}\n${aff?.prof_nom ? formaterNomComplet(aff.prof_nom) : 'Aucun professeur affecté'}`,
                bg,
                color: getCouleurTexteSurFond(bg),
              };
            },
          });
          documents.push({
            relativePath: `Salles/${sanitizeFilename(lieu)}/${pdfNomAvecSite(nomSiteSafe(lieu), salle)}`,
            html: buildHtmlPrintDoc(`Planning salle — ${lieu} — ${salle}`, `<div class="section">${table}</div>`, { paysage: true }),
            pdfOptions: { paysage: true, format: 'a4', orientation: 'landscape' },
          });
        });
      }

      // —— Général : par jours + A3 semaine, nommés avec le nom complet du site ——
      setExportPdfProgress('Chargement des plannings généraux…');
      const countPoolsParSite = new Map();
      poolsExport.forEach((p) => {
        const key = normaliserLieuTravail(p.site || p.nom || '');
        countPoolsParSite.set(key, (countPoolsParSite.get(key) || 0) + 1);
      });
      /** Premier mot du libellé composé (ex. SYNECOM-CFR-Fort → SYNECOM) pour le super-général. */
      const labelComposePool = (pool) => {
        const site = String(pool?.site || '').trim();
        const nom = String(pool?.nom || '').trim();
        if (site.includes('-') || site.includes('–') || site.includes('—')) return site;
        if (nom.includes('-') || nom.includes('–') || nom.includes('—')) return nom;
        return resoudreNomSiteComplet(pool);
      };
      const prefixeSitePool = (pool) => {
        const label = labelComposePool(pool);
        const premier = String(label).split(/[-–—_\s]+/).filter(Boolean)[0] || label;
        return String(premier).trim() || 'Site';
      };
      const fusionnerPlanningsGeneraux = (datas) => {
        const profMap = new Map();
        const affKeys = new Set();
        const affectations = [];
        const dispoKeys = new Set();
        const dispos = [];
        const titMap = new Map();
        let creneaux = [];
        (datas || []).forEach((data) => {
          if (!data) return;
          (data.profs || []).forEach((p) => {
            if (p?.id == null) return;
            if (!profMap.has(String(p.id))) profMap.set(String(p.id), p);
          });
          if (!creneaux.length && Array.isArray(data.creneaux) && data.creneaux.length) {
            creneaux = data.creneaux;
          }
          (data.affectations || []).forEach((a) => {
            const k = `${a.prof_id}|${a.creneau_id}|${a.classe_id || ''}|${a.type_special || ''}|${a.matiere_id || ''}`;
            if (affKeys.has(k)) return;
            affKeys.add(k);
            const { dans_pool_courant, ...rest } = a;
            affectations.push(rest);
          });
          (data.dispos || []).forEach((d) => {
            const k = `${d.prof_id}|${d.creneau_id}`;
            if (dispoKeys.has(k)) return;
            dispoKeys.add(k);
            dispos.push(d);
          });
          (data.titulaires || []).forEach((t) => {
            const k = String(t.classe_id != null ? t.classe_id : t.classe_nom || '');
            if (!k || titMap.has(k)) return;
            titMap.set(k, t);
          });
        });
        const profsMerged = Array.from(profMap.values()).sort((a, b) =>
          String(a.nom || '').localeCompare(String(b.nom || ''), 'fr')
          || String(a.prenom || '').localeCompare(String(b.prenom || ''), 'fr')
        );
        return {
          profs: profsMerged,
          creneaux,
          affectations,
          dispos,
          titulaires: Array.from(titMap.values()),
        };
      };

      const generalParPoolId = new Map();
      for (const pool of poolsExport) {
        const poolId = String(pool.id);
        const poolNom = pool.nom || `Pool_${poolId}`;
        const siteComplet = resoudreNomSiteComplet(pool);
        const siteFile = sanitizeFilename(siteComplet, 'Site');
        const siteKey = normaliserLieuTravail(pool.site || pool.nom || '');
        const plusieursPoolsMemeSite = (countPoolsParSite.get(siteKey) || 0) > 1;
        const baseNomGeneral = plusieursPoolsMemeSite
          ? `${siteFile}_${nomPoolSafe(pool)}`
          : siteFile;
        try {
          const url = API + '/planning/general?pool_id=' + encodeURIComponent(poolId);
          const rep = await axios.get(url, { headers });
          const data = rep.data || {};
          generalParPoolId.set(poolId, data);
          const titreGeneral = plusieursPoolsMemeSite
            ? `Planning général — ${siteComplet} — ${poolNom}`
            : `Planning général — ${siteComplet}`;
          const contenuJours = buildPlanningGeneralPrintHtml({
            creneaux: data.creneaux || [],
            profs: data.profs || [],
            affectations: data.affectations || [],
            dispos: data.dispos || [],
            poolId,
          });
          documents.push({
            relativePath: `General/${baseNomGeneral}_Planning-jours.pdf`,
            html: buildHtmlPrintDoc(titreGeneral, contenuJours, { paysage: true }),
            pdfOptions: { paysage: true, format: 'a4', orientation: 'landscape' },
          });
          const contenuA3 = buildPlanningGeneralA3SemainePrintHtml({
            creneaux: data.creneaux || [],
            profs: data.profs || [],
            affectations: data.affectations || [],
            dispos: data.dispos || [],
            titulaires: data.titulaires || [],
            poolId,
          });
          documents.push({
            relativePath: `General/${baseNomGeneral}_Planning-général.pdf`,
            html: buildHtmlPrintDoc(
              plusieursPoolsMemeSite
                ? `Planning général — semaine — ${siteComplet} — ${poolNom}`
                : `Planning général — semaine — ${siteComplet}`,
              contenuA3,
              { paysage: true, format: 'A3', a3Semaine: true, margin: '6mm 8mm' }
            ),
            pdfOptions: { paysage: true, format: 'a3', orientation: 'landscape' },
          });
        } catch (errPool) {
          console.error('Export général pool', poolId, errPool);
        }
      }

      // —— Super-général : uniquement s'il existe plusieurs sites distincts
      //    partageant le même premier mot (ex. SYNECOM-CFR-* + SYNECOM-CSC-*) ——
      const groupesPrefixe = new Map();
      poolsExport.forEach((pool) => {
        const labelComplet = labelComposePool(pool);
        const prefixe = prefixeSitePool(pool);
        const key = prefixe.toUpperCase();
        if (!groupesPrefixe.has(key)) {
          groupesPrefixe.set(key, { label: prefixe, pools: [], labelsComplets: new Set() });
        }
        const g = groupesPrefixe.get(key);
        g.pools.push(pool);
        g.labelsComplets.add(String(labelComplet).trim().toUpperCase());
      });
      const groupesSuper = Array.from(groupesPrefixe.values()).filter(
        (g) => g.labelsComplets.size >= 2
      );
      if (groupesSuper.length) {
        setExportPdfProgress('Plannings super-généraux…');
      }
      for (const { label, pools: poolsGroupe } of groupesSuper) {
        const datas = poolsGroupe
          .map((p) => generalParPoolId.get(String(p.id)))
          .filter(Boolean);
        if (!datas.length) continue;
        const merged = fusionnerPlanningsGeneraux(datas);
        if (!(merged.profs || []).length) continue;
        const poolIds = poolsGroupe.map((p) => p.id);
        const prefixFile = sanitizeFilename(label, 'Site');
        const titreSuper = `Planning super-général — ${label}`;
        try {
          const contenuJours = buildPlanningGeneralPrintHtml({
            creneaux: merged.creneaux || [],
            profs: merged.profs || [],
            affectations: merged.affectations || [],
            dispos: merged.dispos || [],
            poolIds,
          });
          documents.push({
            relativePath: `Super_General/${prefixFile}_Planning-jours.pdf`,
            html: buildHtmlPrintDoc(titreSuper, contenuJours, { paysage: true }),
            pdfOptions: { paysage: true, format: 'a4', orientation: 'landscape' },
          });
          const contenuA3 = buildPlanningGeneralA3SemainePrintHtml({
            creneaux: merged.creneaux || [],
            profs: merged.profs || [],
            affectations: merged.affectations || [],
            dispos: merged.dispos || [],
            titulaires: merged.titulaires || [],
            poolIds,
          });
          documents.push({
            relativePath: `Super_General/${prefixFile}_Planning-général.pdf`,
            html: buildHtmlPrintDoc(
              `${titreSuper} — semaine`,
              contenuA3,
              { paysage: true, format: 'A3', a3Semaine: true, margin: '6mm 8mm' }
            ),
            pdfOptions: { paysage: true, format: 'a3', orientation: 'landscape' },
          });
        } catch (errSuper) {
          console.error('Export super-général', label, errSuper);
        }
      }

      if (!documents.length) {
        alert('Aucun planning à exporter.');
        setExportPdfEnCours(false);
        setExportPdfProgress('');
        return;
      }

      const resultat = await exporterDocumentsPdf({
        dirHandle,
        rootFolderName,
        documents,
        shouldCancel: checkCancel,
        onProgress: (done, total, label) => {
          setExportPdfProgress(`${done}/${total} — ${label}`);
        },
      });

      if (resultat.cancelled || checkCancel()) {
        showToast(`Export annulé (${resultat.count || 0} PDF).`, 'info');
      } else if (resultat.mode === 'folder') {
        showToast(`${resultat.count} PDF enregistrés dans « ${rootFolderName} ».`, 'success');
      } else {
        showToast(`${resultat.count} PDF téléchargés dans le ZIP « ${rootFolderName}.zip ».`, 'success');
      }
    } catch (err) {
      if (err?.cancelled || exportPdfAnnulerRef.current) {
        showToast('Export annulé.', 'info');
      } else {
        console.error(err);
        alert(err.response?.data?.message || err.message || "Erreur lors de l'export PDF.");
      }
    } finally {
      setExportPdfEnCours(false);
      setExportPdfProgress('');
      exportPdfAnnulerRef.current = false;
    }
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
          affectationsListe: planningClasseAffectationsNormales || [],
          horairesListe: planningClasse.horaires || [],
          titreBanniere: nomClasse || 'Classe',
          creneauxAvecSoutien: creneauxAvecSoutienClasse,
          labelsSoutien: labelsSoutienClasse,
        });
        return openPrintWindow(titre, `<div class="section">${table}</div>`, { paysage: true, compactClasses: true });
      }
      if (sousOngletPlanning === 'professeurs') {
        if (!profPlanningId || !planningProf) return alert("Sélectionnez d'abord un professeur.");
        const nomProf = `${planningProf?.prof?.prenom || ''} ${nomSansSuffixe(planningProf?.prof?.nom || '')}`.trim();
        const titre = `Plannings professeur — ${nomProf}`;
        const table = buildPlanningTableHtml({
          creneauxListe: planningProf.creneaux || [],
          showPauseRows: true,
          titreBanniere: nomProf || 'Professeur',
          getCellData: (cr) => {
            const aff = (planningProf.affectations || []).find(a => String(a.creneau_id) === String(cr.id));
            if (estAffectationSpecialSansClasse(aff)) {
              return {
                text: getLibelleTypeSpecial(aff.type_special),
                bg: '#000000',
                color: '#ffffff',
              };
            }
            if (hasBrancheAffectee(aff) || aff?.classe_nom) {
              const bg = aff.matiere_id
                ? getCouleurBranche(aff.matiere_id)
                : (aff.classe_id ? getCouleurClasse(aff.classe_id) : '#e8f5e9');
              return {
                text: texteCellulePlanningProf(aff),
                bg,
                color: getCouleurTexteSurFond(bg),
              };
            }
            const dispo = (planningProf.dispos || []).find(d => String(d.creneau_id) === String(cr.id));
            if (dispo && !dispo.disponible) return { text: 'Indispo', bg: '#eeeeee', color: '#9ca3af' };
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
          showPauseRows: true,
          titreBanniere: salleSelectionnee,
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
              String(a.creneau_id) === String(cr.id) &&
              String(a.type_special || '').toLowerCase() !== 'soutien'
            ) || (affectations || []).find(a =>
              String(a.classe_id) === String(cl.id) &&
              String(a.creneau_id) === String(cr.id)
            );
            if (estAffectationSpecialSansClasse(aff)) {
              return {
                text: `${cl.nom}\n${getLibelleTypeSpecial(aff.type_special)}`,
                bg: '#000000',
                color: '#ffffff'
              };
            }
            const bg = getCouleurClasse(cl.id);
            const nom = estAffectationSoutien(aff) ? `${cl.nom} - Soutien` : cl.nom;
            return {
              text: `${nom}\n${aff?.prof_nom ? formaterNomComplet(aff.prof_nom) : 'Aucun professeur affecté'}`,
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
        poolId,
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
          const affs = data?.affectations || [];
          const affsNormales = affs.filter((a) => String(a.type_special || '').toLowerCase() !== 'soutien');
          const labelsSoutien = labelsSoutienDepuisAffectations(affs);
          const table = buildPlanningClassesPrintTableHtml({
            creneauxListe: data?.creneaux || [],
            affectationsListe: affsNormales,
            horairesListe: data?.horaires || [],
            titreBanniere: nomClasse
              ? `${nomClasse}${titulaireClasse ? ` — Titulaire : ${titulaireClasse}` : ''}`
              : 'Classe',
            creneauxAvecSoutien: new Set(labelsSoutien.keys()),
            labelsSoutien,
          });
          return `<div class="section">${table}</div>`;
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
            titreBanniere: nom || 'Professeur',
            showPauseRows: true,
            getCellData: (cr) => {
              const aff = (data?.affectations || []).find(a => String(a.creneau_id) === String(cr.id));
              if (estAffectationSpecialSansClasse(aff)) {
                return {
                  text: getLibelleTypeSpecial(aff.type_special),
                  bg: '#000000',
                  color: '#ffffff'
                };
              }
              if (hasBrancheAffectee(aff) || aff?.classe_nom) {
                const bg = aff.matiere_id
                  ? getCouleurBranche(aff.matiere_id)
                  : (aff.classe_id ? getCouleurClasse(aff.classe_id) : '#e8f5e9');
                return {
                  text: texteCellulePlanningProf(aff),
                  bg,
                  color: getCouleurTexteSurFond(bg)
                };
              }
              const dispo = (data?.dispos || []).find(d => String(d.creneau_id) === String(cr.id));
              if (dispo && !dispo.disponible) {
                return { text: 'Indispo', bg: '#eeeeee', color: '#9ca3af' };
              }
              return { text: '' };
            }
          });
          return `<div class="section">${table}</div>`;
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
            titreBanniere: `Salle ${salle}`,
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
                String(a.creneau_id) === String(cr.id) &&
                String(a.type_special || '').toLowerCase() !== 'soutien'
              ) || (affectations || []).find(a =>
                String(a.classe_id) === String(cl.id) &&
                String(a.creneau_id) === String(cr.id)
              );
              if (estAffectationSpecialSansClasse(aff)) {
                return {
                  text: `${cl.nom}\n${getLibelleTypeSpecial(aff.type_special)}`,
                  bg: '#000000',
                  color: '#ffffff'
                };
              }
              const bg = getCouleurClasse(cl.id);
              const nom = estAffectationSoutien(aff) ? `${cl.nom} - Soutien` : cl.nom;
              return {
                text: `${nom}\n${aff?.prof_nom ? formaterNomComplet(aff.prof_nom) : 'Aucun professeur affecté'}`,
                bg,
                color: getCouleurTexteSurFond(bg)
              };
            }
          });
          return `<div class="section">${table}</div>`;
        });
        return openPrintWindow(`Plannings salles — ${sallesLieuTravailId}`, sections.join(''), { paysage: true });
      }
      const poolId = planningPoolId || '';
      const url = API + '/planning/general' + (poolId ? `?pool_id=${poolId}` : '');
      const rep = await axios.get(url, { headers });
      const data = rep.data;
      const contenu = buildPlanningGeneralPrintHtml({
        creneaux: data?.creneaux || [],
        profs: data?.profs || [],
        affectations: data?.affectations || [],
        dispos: data?.dispos || [],
        poolId,
      });
      return openPrintWindow('Plannings général — complet', contenu, { paysage: true });
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
          <div className="page-actions" style={{marginLeft:'auto',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,minWidth:0,maxWidth:'min(720px,100%)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>
              {sousOngletPlanning !== 'general' && (
                <button type="button" style={styles.btnImprimer} onClick={imprimerPlanningTout}>Tout imprimer</button>
              )}
              <button type="button" style={styles.btnImprimer} onClick={imprimerPlanningSelection}>Imprimer</button>
              {sousOngletPlanning === 'general' && (
                <>
                  <button
                    type="button"
                    style={styles.btnImprimer}
                    onClick={imprimerPlanningGeneralA3Semaine}
                    title="Même PDF A3 que l’export (semaine complète)"
                  >
                    Imprimer A3 semaine
                  </button>
                  {exportPdfEnCours ? (
                    <>
                      <button
                        type="button"
                        style={{...styles.btnImprimer, opacity: 0.85, cursor: 'default'}}
                        disabled
                      >
                        Export en cours…
                      </button>
                      <button
                        type="button"
                        style={{...styles.btnImprimer, background: '#fee2e2', borderColor: '#fecaca', color: '#991b1b'}}
                        onClick={() => {
                          exportPdfAnnulerRef.current = true;
                          setExportPdfProgress('Annulation…');
                        }}
                        title="Annuler l'export"
                      >
                        Annuler
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      style={styles.btnImprimer}
                      onClick={exporterTousPlanningsPdf}
                      title="Enregistrer tous les PDF (classes, salles, professeurs, général) dans un dossier"
                    >
                      Exporter tous les PDF
                    </button>
                  )}
                </>
              )}
            </div>
            {exportPdfEnCours && (
              <div
                title={exportPdfProgress || 'Export…'}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#64748b',
                  lineHeight: 1.35,
                  textAlign: 'right',
                  width: '100%',
                  wordBreak: 'break-word',
                }}
              >
                {exportPdfProgress || 'Export…'}
              </div>
            )}
          </div>
        )}
        {onglet === 'disponibilites' && profSelectionne && isAdmin() && (
          <div style={{display:'flex',alignItems:'center',gap:10,marginLeft:'auto'}}>
            <button type="button" style={styles.btnSauvegarderAff} onClick={sauverDispos}>Sauvegarder</button>
          </div>
        )}
        {onglet === 'affectations' && (
          <div style={{display:'flex',alignItems:'center',gap:10,marginLeft:'auto'}}>
            {sousOngletAff === 'classes' && isAdmin() && (
              <>
                <button
                  type="button"
                  title="Réinitialiser les horaires des classes du pool"
                  aria-label="Réinitialiser les horaires des classes du pool"
                  onClick={resetAffectationsClassesTableau}
                  style={styles.btnResetAff}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="1 4 1 10 7 10" />
                    <polyline points="23 20 23 14 17 14" />
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Proposer les horaires des classes"
                  aria-label="Proposer les horaires des classes"
                  onClick={proposerAffectationsClasses}
                  style={styles.btnProposeAff}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                    <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
                    <path d="M5 15l.6 1.6L7 17.2l-1.4.6L5 19.4l-.6-1.6L3 17.2l1.4-.6L5 15z" />
                  </svg>
                </button>
              </>
            )}
            {sousOngletAff === 'salles' && isAdmin() && (
              <>
                <button
                  type="button"
                  title="Réinitialiser la salle sélectionnée"
                  aria-label="Réinitialiser la salle sélectionnée"
                  onClick={resetAffectationsSallesSalleCourante}
                  style={styles.btnResetAff}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="1 4 1 10 7 10" />
                    <polyline points="23 20 23 14 17 14" />
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Réinitialiser toutes les salles du site"
                  aria-label="Réinitialiser toutes les salles du site"
                  onClick={resetAffectationsSallesSite}
                  style={{...styles.btnResetAff, color:'#b45309', borderColor:'#fde68a', background:'#fffbeb'}}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 21h18" />
                    <path d="M5 21V8l7-5 7 5v13" />
                    <path d="M9 21v-6h6v6" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Proposer les salles du site"
                  aria-label="Proposer les salles du site"
                  onClick={proposerAffectationsSallesSite}
                  style={styles.btnProposeAff}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                    <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
                    <path d="M5 15l.6 1.6L7 17.2l-1.4.6L5 19.4l-.6-1.6L3 17.2l1.4-.6L5 15z" />
                  </svg>
                </button>
              </>
            )}
            {sousOngletAff === 'profs' && isAdmin() && (
              <>
                <button
                  type="button"
                  title="Réinitialiser le tableau"
                  aria-label="Réinitialiser le tableau"
                  onClick={resetAffectationsProfsTableau}
                  style={styles.btnResetAff}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="1 4 1 10 7 10" />
                    <polyline points="23 20 23 14 17 14" />
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Proposer les affectations"
                  aria-label="Proposer les affectations"
                  onClick={proposerAffectationsProfs}
                  style={styles.btnProposeAff}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                    <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
                    <path d="M5 15l.6 1.6L7 17.2l-1.4.6L5 19.4l-.6-1.6L3 17.2l1.4-.6L5 15z" />
                  </svg>
                </button>
              </>
            )}
            {sousOngletAff === 'branches' && isAdmin() && (
              <>
                <button
                  type="button"
                  title="Réinitialiser les branches"
                  aria-label="Réinitialiser les branches"
                  onClick={resetAffectationsBranchesTableau}
                  style={styles.btnResetAff}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="1 4 1 10 7 10" />
                    <polyline points="23 20 23 14 17 14" />
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Proposer les branches"
                  aria-label="Proposer les branches"
                  onClick={proposerAffectationsBranches}
                  style={styles.btnProposeAff}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                    <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
                    <path d="M5 15l.6 1.6L7 17.2l-1.4.6L5 19.4l-.6-1.6L3 17.2l1.4-.6L5 15z" />
                  </svg>
                </button>
              </>
            )}
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
          <div className="chip-tabs" style={styles.toggleGroup}>
            {[{id:'classes',label:'Classes'},{id:'salle',label:'Salles'},{id:'professeurs',label:'Professeurs'},{id:'general',label:'Général'}].map(o => (
              <button key={o.id} style={{...styles.toggleBtn,...(sousOngletPlanning===o.id?styles.toggleBtnActif:{})}}
                onClick={() => {
                  setSousOngletPlanning(o.id);
                  if (o.id === 'general' && planningPoolId) chargerPlanningGeneral(planningPoolId);
                }}>
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
                  <div className="chip-tabs" style={{display:'flex',background:'#ede9fe',borderRadius:20,padding:3,gap:2}}>
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
                        {trierClassesParNom(classes.filter(c => {
                          const niveaux = parseNiveaux(poolForm.niveau);
                          if (!niveaux.length) return true;
                          if (!c.niveau) return true;
                          return niveaux.some(n => String(c.niveau).toUpperCase() === String(n).toUpperCase());
                        })).map(c => (
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
                          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8,flexWrap:'wrap'}}>
                            <label style={styles.lbl}>Professeurs</label>
                            <span style={{fontSize:12,color:'#64748b'}}>
                              Un professeur peut être dans plusieurs pools (période prise ailleurs = nom du pool).
                            </span>
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
                                      <span style={{minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                        {p.prenom} {nomSansSuffixe(p.nom)}
                                        {(() => {
                                          const autres = pools
                                            .filter((po) => String(po.id) !== String(poolEdit?.id || '') && (po.profs || []).some((pp) => String(pp.id) === String(p.id)))
                                            .map((po) => po.nom);
                                          return autres.length
                                            ? <span style={{marginLeft:6,fontSize:10,fontWeight:700,color:'#6366f1'}}>({autres.join(', ')})</span>
                                            : null;
                                        })()}
                                      </span>
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
                    {trierClassesParNom(pool.classes).map(c => (
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
            <div className="chip-tabs" style={styles.toggleGroup}>
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
                  options={pools.map(p => ({
                    value: String(p.id),
                    label: p.site ? `${p.nom} (${p.site})` : p.nom,
                  }))}
                  onChange={(poolId) => {
                    if (String(classePlanningPoolId) === String(poolId)) return;
                    if (hasBranchesUnsaved && !window.confirm("Des changements dans Affectations > Branches ne sont pas sauvegardés. Changer de pool sans sauvegarder ?")) return;
                    if (hasBranchesUnsaved) abandonnerBranchesNonSauvegardees();
                    setClassePlanningPoolId(String(poolId || ''));
                    setClassePlanningId('');
                    setPlanningClasse(null);
                    setPlanningClasseLoading(false);
                  }}
                />
                <CustomSelect
                  style={styles.selAff}
                  value={classePlanningId ? String(classePlanningId) : ''}
                  disabled={!classePlanningPoolId}
                  placeholder={classePlanningPoolId ? 'Choisir une classe' : "Choisir d'abord un pool"}
                  options={classesPoolP.map(c => ({value: String(c.id), label: c.nom}))}
                  onChange={(classeId) => {
                    const nextId = classeId ? String(classeId) : '';
                    if (hasBranchesUnsaved && nextId !== String(classePlanningId || '') && !window.confirm("Des changements dans Affectations > Branches ne sont pas sauvegardés. Changer de classe sans sauvegarder ?")) return;
                    if (hasBranchesUnsaved && nextId !== String(classePlanningId || '')) abandonnerBranchesNonSauvegardees();
                    setClassePlanningId(nextId);
                    if (nextId) chargerPlanningClasse(nextId, classePlanningPoolId);
                    else {
                      setPlanningClasse(null);
                      setPlanningClasseLoading(false);
                    }
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
                    {classesPool.flatMap((cl) => {
                      const styleBtnPeriode = (periode, actif) => ({
                        padding:'6px 12px', borderRadius:20, fontWeight:700, fontSize:12,
                        cursor:isAdmin()?'pointer':'default', width:120, transition:'all 0.15s',
                        border: actif && periode==='Matin' ? '2px solid #3b82f6'
                          : actif && periode==='Après-midi' ? '2px solid #f59e0b'
                          : '2px solid #e2e8f0',
                        background: actif && periode==='Matin' ? '#dbeafe'
                          : actif && periode==='Après-midi' ? '#fef3c7'
                          : '#f8fafc',
                        color: actif && periode==='Matin' ? '#1d4ed8'
                          : actif && periode==='Après-midi' ? '#92400e'
                          : '#94a3b8',
                      });

                      if (estClasseAPL(cl)) {
                        return ['Matin', 'Après-midi'].map((periodeFixe, idx) => (
                          <tr key={`${cl.id}-${periodeFixe}`} style={{background:'white',borderBottom: idx === 1 ? '1px solid #e2e8f0' : '1px solid #f1f5f9'}}>
                            {idx === 0 ? (
                              <td rowSpan={2} style={{...styles.td,fontWeight:800,fontSize:14,color:'#0f172a',width:180,verticalAlign:'middle'}}>
                                <div>{cl.nom}</div>
                                <div style={{fontSize:11,fontWeight:600,color:'#64748b',marginTop:4}}>Matin + Après-midi</div>
                              </td>
                            ) : null}
                            {JOURS.map(jour => {
                              const actif = classeAHoraire(cl.id, jour, periodeFixe);
                              return (
                                <td key={`${cl.id}-${periodeFixe}-${jour}`} style={{padding:'10px 8px',textAlign:'center'}}>
                                  <button
                                    type="button"
                                    onClick={() => toggleClasseHorairePeriode(cl.id, jour, periodeFixe)}
                                    disabled={!isAdmin()}
                                    style={styleBtnPeriode(periodeFixe, actif)}
                                    title={actif ? `${periodeFixe} — cliquer pour retirer` : `Cliquer pour activer ${periodeFixe}`}
                                  >
                                    {actif ? periodeFixe : '-'}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ));
                      }

                      return [(
                        <tr key={cl.id} style={{background:'white',borderBottom:'1px solid #e2e8f0'}}>
                          <td style={{...styles.td,fontWeight:800,fontSize:14,color:'#0f172a',width:180}}>
                            {cl.nom}
                          </td>
                          {JOURS.map(jour => {
                            const periode = getHoraireJourClasse(cl.id, jour);
                            return (
                              <td key={jour} style={{padding:'10px 8px',textAlign:'center'}}>
                                <button onClick={() => toggleClasseHoraire(cl.id, jour)} disabled={!isAdmin()} style={styleBtnPeriode(periode, !!periode)}>
                                  {periode==='Matin' ? 'Matin' : periode==='Après-midi' ? 'Après-midi' : '-'}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      )];
                    })}
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
                    const avecSoutien = niveauAvecSoutien(cl.niveauClasse);
                    const totalAffectees = (cl.periodesNormalesAffectees || 0) + (avecSoutien ? (cl.periodesSoutienAffectees || 0) : 0);
                    const totalRequis = (cl.periodesNormalesRequises || 0) + (avecSoutien ? (cl.periodesSoutienRequises || 0) : 0);
                    const classeOk = totalRequis > 0 && totalAffectees === totalRequis;
                    return (
                      <div key={cl.id} style={{
                        ...styles.suiviClasseChip,
                        flex:1,
                        width:'auto',
                        minWidth:0,
                        maxWidth:'none',
                        alignItems:'stretch',
                        justifyContent:'flex-start',
                        textAlign:'left',
                        border: classeOk ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                        background: classeOk ? '#eef2ff' : '#ffffff',
                        color: classeOk ? '#3730a3' : '#0f172a'
                      }}>
                        <div style={{...styles.suiviClasseNom,textAlign:'center'}}>
                          {cl.nom} - Périodes {totalAffectees}/{totalRequis}
                        </div>
                        <div style={{display:'flex',flexDirection:'column',justifyContent:'flex-start',gap:3,minWidth:0,marginTop:6}}>
                          {(cl.profsClasse || []).length === 0 ? (
                            <div style={{...styles.suiviClasseLigne,fontWeight:600,opacity:0.7,textAlign:'center'}}>Aucun professeur</div>
                          ) : (cl.profsClasse || []).map((p) => (
                            <div key={`${cl.id}-${p.profId}`} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:6,minWidth:0}}>
                              <span style={{fontSize:11,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nom}</span>
                              <span style={{fontSize:11,fontWeight:800,flexShrink:0}}>{p.periodes}</span>
                            </div>
                          ))}
                        </div>
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
                      const totalProf = quotaAffichageParProf[p.id] || 0;
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
                  {[0, 1].map((slot) => (
                    <tr key={`titulariat-row-${slot}`} style={styles.tr}>
                      <td style={{...styles.td,background:'#f8f9fa',fontWeight:700,fontSize:12,whiteSpace:'nowrap',width:LARGEUR_COLONNE_CRENEAU,minWidth:LARGEUR_COLONNE_CRENEAU,maxWidth:LARGEUR_COLONNE_CRENEAU,textAlign:'center'}}>
                        {slot === 0 ? 'Titulariat' : 'Titulariat 2'}
                      </td>
                      {profsPool.map(prof => {
                        const slotsProf = getTitulariatsProf(titulariatsDraftByProf, prof.id);
                        const selectedClasseId = String(slotsProf[slot] || '');
                        const classesDejaAttribuees = new Set(
                          listerTitulariatsPairs(titulariatsDraftByProf)
                            .filter(({ profId, classeId }) => {
                              if (!classeId) return false;
                              if (String(profId) === String(prof.id) && String(classeId) === selectedClasseId) return false;
                              return true;
                            })
                            .map(({ classeId }) => String(classeId))
                        );
                        const options = classesPoolTriees.filter(cl =>
                          !classesDejaAttribuees.has(String(cl.id)) || String(cl.id) === selectedClasseId
                        );
                        return (
                          <td key={`titulariat-${slot}-${prof.id}`} style={{...styles.td,padding:'8px 4px',background:'#fff',textAlign:'center'}}>
                            <select
                              style={styles.cellSel}
                              value={selectedClasseId}
                              onChange={e => {
                                const classeId = String(e.target.value || '');
                                setTitulariatsDraftByProf(prev => {
                                  const next = { ...prev };
                                  // Retirer cette classe des autres professeurs / autres slots
                                  Object.keys(next).forEach((pid) => {
                                    const arr = getTitulariatsProf(next, pid);
                                    let changed = false;
                                    if (classeId) {
                                      arr.forEach((cid, idx) => {
                                        if (String(cid) === classeId && !(String(pid) === String(prof.id) && idx === slot)) {
                                          arr[idx] = '';
                                          changed = true;
                                        }
                                      });
                                    }
                                    if (String(pid) === String(prof.id)) {
                                      arr[slot] = classeId;
                                      // Éviter le doublon sur les 2 slots du même prof
                                      if (classeId && slot === 0 && arr[1] === classeId) arr[1] = '';
                                      if (classeId && slot === 1 && arr[0] === classeId) arr[0] = '';
                                      changed = true;
                                    }
                                    if (changed) next[String(pid)] = arr;
                                  });
                                  if (!Object.prototype.hasOwnProperty.call(next, String(prof.id))) {
                                    const arr = ['', ''];
                                    arr[slot] = classeId;
                                    next[String(prof.id)] = arr;
                                  }
                                  return next;
                                });
                                setHasAffectationsUnsaved(true);
                              }}
                              disabled={!isAdmin()}
                            >
                              <option value="">—</option>
                              {options.map(cl => (
                                <option key={`titulariat-option-${slot}-${prof.id}-${cl.id}`} value={String(cl.id)}>
                                  {cl.nom}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {JOURS.map(jour => {
                const crs = creneaux.filter(c => c.jour===jour);
                if (!crs.length) return null;
                const nColsJour = profsPool.length + 2; // horaire + profs + pastille
                return (
                  <div key={`jour-${jour}`} style={{overflowX:'auto', marginTop:30}}>
                  <table style={{...styles.tbl,tableLayout:'fixed',minWidth:200+profsPool.length*140+36,border:'none',boxShadow:'none'}}>
                    <colgroup>
                      <col style={{width: LARGEUR_COLONNE_CRENEAU}} />
                      {profsPool.map(p => <col key={`col-${jour}-${p.id}`} />)}
                      <col className="no-print-aff-ok" style={{width:36, minWidth:36, maxWidth:36}} />
                    </colgroup>
                    <tbody>
                      <tr>
                        <td colSpan={nColsJour} style={{padding:0,border:'none',background:'transparent'}}>
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
                            <td colSpan={nColsJour} style={styles.periodeBande}>{per} — aucune classe</td>
                          </tr>
                        );
                        return [
                          <tr key={jour+per+'_ph'}><td colSpan={nColsJour} style={styles.periodeBande}>{per}</td></tr>,
                          ...crsPer.map((cr, idx) => {
                            const periodeComplete = periodeClassesNormalesCompletes(cr.id, classesCours);
                            return (
                            <tr key={cr.id} style={styles.tr}>
                              <td style={{...styles.td,background:'#f8f9fa',fontWeight:600,fontSize:12,whiteSpace:'nowrap',width:LARGEUR_COLONNE_CRENEAU,minWidth:LARGEUR_COLONNE_CRENEAU,maxWidth:LARGEUR_COLONNE_CRENEAU}}>
                                P{per==='Matin' ? idx+1 : idx+5} — {cr.heure_debut}–{cr.heure_fin}
                              </td>
                              {profsPool.map(prof => {
                                const aff = affectationsDraft.find(a => a.prof_id==prof.id && a.creneau_id==cr.id);
                                const indispo = disposAffectations[`${prof.id}-${cr.id}`] === false;
                                const horsPool = aff && estAffectationHorsPool(aff, poolSelectionne);
                                if (horsPool) {
                                  const nomPoolExt = nomPoolAffectationExterne(aff, poolSelectionne);
                                  const periodeExt = libellePeriodeAffectation(aff);
                                  return (
                                    <td key={prof.id} style={{...styles.td,padding:'8px 4px',background:'#e2e8f0',textAlign:'center'}} title={`Affecté sur le pool « ${nomPoolExt} »${periodeExt ? ` : ${periodeExt}` : ''}`}>
                                      <div style={{
                                        minHeight:32,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                                        fontSize:11,fontWeight:700,color:'#475569',padding:'4px 6px',
                                        borderRadius:6,background:'#cbd5e1',lineHeight:1.2
                                      }}>
                                        <span>{nomPoolExt}</span>
                                        {periodeExt ? <span style={{fontSize:10,fontWeight:600,color:'#64748b',marginTop:2}}>{periodeExt}</span> : null}
                                      </div>
                                    </td>
                                  );
                                }
                                const classeAffecteeVisible = aff && aff.classe_id
                                  ? classesCours.some(cl => String(cl.id) === String(aff.classe_id))
                                  : false;
                                const affAffichable = aff && (estAffectationSpecialSansClasse(aff) || classeAffecteeVisible);
                                const estSoutienAff = affAffichable && estAffectationSoutien(aff);
                                const valeurSelect = affAffichable
                                  ? (estAffectationSpecialSansClasse(aff)
                                      ? `special:${aff.type_special}`
                                      : (estSoutienAff ? `soutien:${aff.classe_id}` : String(aff.classe_id)))
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
                                        // Empêcher d'écraser une affectation hors pool (déjà affichée ailleurs)
                                        const affExistante = affectationsDraft.find(x => x.prof_id==prof.id && x.creneau_id==cr.id);
                                        if (affExistante && estAffectationHorsPool(affExistante, poolSelectionne) && e.target.value) {
                                          alert(`Ce professeur est déjà affecté sur « ${nomPoolAffectationExterne(affExistante, poolSelectionne)} » (${libellePeriodeAffectation(affExistante) || 'période déjà posée'}) à cette heure.`);
                                          return;
                                        }
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
                                          const typeSpecial = estSoutien ? 'soutien' : (estSpecial ? valeur.split(':')[1] : null);
                                          const classe_id = estSpecial ? null : (estSoutien ? valeur.split(':')[1] : valeur);
                                          const ancienne = affectationsDraft.find(x => x.prof_id==prof.id && x.creneau_id==cr.id);
                                          // Conflit seulement si même mode (normal/normal ou soutien/soutien)
                                          const conflit = !estSpecial
                                            ? affectationsDraft.find(x => {
                                                if (String(x.classe_id) !== String(classe_id)) return false;
                                                if (String(x.creneau_id) !== String(cr.id)) return false;
                                                if (String(x.prof_id) === String(prof.id)) return false;
                                                const xSoutien = estAffectationSoutien(x);
                                                return estSoutien ? xSoutien : !xSoutien;
                                              })
                                            : null;
                                          if (conflit) {
                                            const profConflit = profsPool.find(p => p.id === conflit.prof_id);
                                            const nomProfConflit = profConflit ? `${profConflit.prenom} ${nomSansSuffixe(profConflit.nom)}` : 'un autre professeur';
                                            const classeNom = (classesPool.find(c => String(c.id) === String(classe_id)) || {}).nom || classe_id;
                                            const libelleConflit = estSoutien ? `${classeNom} - Soutien` : classeNom;
                                            const confirmer = window.confirm(
                                              `${libelleConflit} est déjà affecté à ${nomProfConflit} sur cet horaire.\n\nVoulez-vous échanger ces périodes ?`
                                            );
                                            if (!confirmer) return;

                                            setAffectationsDraft(prev => {
                                              const next = prev.map(a => ({ ...a }));
                                              const idxConflit = next.findIndex(x => x.id === conflit.id);
                                              const idxAncienne = ancienne ? next.findIndex(x => x.id === ancienne.id) : -1;
                                              if (idxConflit >= 0) {
                                                if (ancienne && (
                                                  String(ancienne.classe_id || '') !== String(classe_id || '')
                                                  || String(ancienne.type_special || '') !== String(typeSpecial || '')
                                                )) {
                                                  next[idxConflit].classe_id = ancienne.classe_id || null;
                                                  next[idxConflit].type_special = ancienne.type_special || null;
                                                  next[idxConflit].matiere_id = ancienne.matiere_id || null;
                                                  next[idxConflit].pool_id = ancienne.pool_id != null ? ancienne.pool_id : idPoolNumerique();
                                                } else {
                                                  next.splice(idxConflit, 1);
                                                }
                                              }
                                              if (idxAncienne >= 0) {
                                                next[idxAncienne].classe_id = classe_id;
                                                next[idxAncienne].type_special = typeSpecial;
                                                next[idxAncienne].matiere_id = null;
                                                next[idxAncienne].pool_id = idPoolNumerique();
                                              } else {
                                                next.push({
                                                  id: draftId(),
                                                  prof_id: prof.id,
                                                  classe_id,
                                                  matiere_id: null,
                                                  creneau_id: cr.id,
                                                  type_special: typeSpecial,
                                                  pool_id: idPoolNumerique(),
                                                });
                                              }
                                              return next;
                                            });
                                            setAffectationModes(prev => {
                                              const next = { ...prev };
                                              if (ancienne) next[ancienne.id] = estSoutien ? 'soutien' : (estSpecial ? 'special' : 'classe');
                                              if (conflit?.id) {
                                                next[conflit.id] = estAffectationSoutien(ancienne) ? 'soutien'
                                                  : (estAffectationSpecialSansClasse(ancienne) ? 'special' : 'classe');
                                              }
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
                                              next[idxAncienne].classe_id = classe_id;
                                              next[idxAncienne].type_special = typeSpecial;
                                              next[idxAncienne].matiere_id = null;
                                              next[idxAncienne].pool_id = idPoolNumerique();
                                            } else {
                                              const newId = draftId();
                                              next.push({
                                                id: newId,
                                                prof_id: prof.id,
                                                classe_id,
                                                matiere_id: null,
                                                creneau_id: cr.id,
                                                type_special: typeSpecial,
                                                pool_id: idPoolNumerique(),
                                              });
                                            }
                                            return next;
                                          });
                                          setAffectationModes(prev => {
                                            const next = { ...prev };
                                            const key = ancienne?.id;
                                            if (key) next[key] = estSoutien ? 'soutien' : (estSpecial ? 'special' : 'classe');
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
                                      {poolAvecSoutien && (
                                        <optgroup label="Soutien">
                                          {classesCours
                                            .filter(cl => niveauAvecSoutien(resoudreNiveauClasse(cl, niveauxPoolSelectionne.length === 1 ? niveauxPoolSelectionne[0] : '')))
                                            .map(cl => (
                                            <option key={`soutien-${cl.id}`} value={`soutien:${cl.id}`}>
                                              {cl.nom} - Soutien
                                            </option>
                                          ))}
                                        </optgroup>
                                      )}
                                      <optgroup label="Spécial">
                                        <option value="special:titulariat">Titulariat</option>
                                        <option value="special:atelier">Atelier</option>
                                        <option value="special:mediation">Médiation</option>
                                        <option value="special:autre">Autre</option>
                                      </optgroup>
                                    </select>
                                  </td>
                                );
                              })}
                              <td
                                className="no-print-aff-ok"
                                style={{
                                  ...styles.td,
                                  width:36,
                                  minWidth:36,
                                  maxWidth:36,
                                  padding:0,
                                  border:'none',
                                  background:'transparent',
                                  verticalAlign:'middle',
                                  textAlign:'center',
                                }}
                                title={periodeComplete ? 'Toutes les classes sont affectées' : undefined}
                              >
                                <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%',minHeight:32}}>
                                  {periodeComplete ? (
                                    <span style={styles.pastillePeriodeOk} aria-label="Période complète">✓</span>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                            );
                          })
                        ];
                      })}
                    </tbody>
                  </table>
                  </div>
                );
              })}
              <style>{`
                @media print {
                  .no-print-aff-ok { display: none !important; }
                }
              `}</style>
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
              {classePlanningPoolId && classePlanningId && planningClasseLoading && (
                <div style={styles.msgVide}>Chargement du planning de la classe…</div>
              )}
              {classePlanningPoolId && classePlanningId && !planningClasseLoading && !planningClasse && (
                <div style={styles.msgVide}>Impossible de charger le planning de cette classe. Réessayez ou vérifiez les affectations professeurs / horaires.</div>
              )}

              {planningClasse && classePlanningId && !planningClasseLoading && (
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
                      <div style={{fontSize:12,color:'#64748b',fontWeight:600,marginBottom:14}}>Aucun professeur dans ce pool pour le moment.</div>
                    ) : (
                      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:4}}>
                        {repartirCartesParLigne(suiviPreferencesBranches, isMobile ? 2 : 5).map((ligne, ligneIdx) => (
                          <div key={`prefs-ligne-${ligneIdx}`} style={{display:'flex',gap:8,width:'100%',alignItems:'stretch'}}>
                            {ligne.map((item) => (
                              <div key={item.profId} style={{
                                ...styles.suiviClasseChip,
                                flex:1,
                                width:'auto',
                                minWidth:0,
                                maxWidth:'none',
                                alignItems:'stretch',
                                justifyContent:'flex-start',
                                textAlign:'left',
                                border:'1px solid #e2e8f0',
                                background:'#ffffff',
                                color:'#0f172a',
                                padding:'8px 8px'
                              }}>
                                <div style={{...styles.suiviClasseNom,textAlign:'center',marginBottom:6,fontSize:12}}>{item.nom}</div>
                                <div style={{display:'flex',alignItems:'stretch',minWidth:0,width:'100%'}}>
                                  {ORDRE_COLONNES_SPECIALITES.map((cat, catIdx) => {
                                    const items = item.colonnes?.[cat] || [];
                                    return (
                                      <div
                                        key={`${item.profId}-${cat}`}
                                        style={{
                                          flex:1,
                                          minWidth:0,
                                          paddingLeft: catIdx ? 6 : 0,
                                          paddingRight: catIdx < ORDRE_COLONNES_SPECIALITES.length - 1 ? 6 : 0,
                                          borderLeft: catIdx ? '1px solid #cbd5e1' : 'none',
                                        }}
                                      >
                                        <div style={{fontSize:9,fontWeight:800,color:'#64748b',marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                          {LIBELLES_COLONNES_SPECIALITES[cat]}
                                        </div>
                                        {items.length === 0 ? (
                                          <div style={{...styles.suiviClasseLigne,fontWeight:600,opacity:0.7,fontSize:10}}>Aucune</div>
                                        ) : items.map((b, idx) => (
                                          <div key={`${item.profId}-${cat}-${b.id}-${idx}`} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:4,minWidth:0,paddingLeft: b.indent ? 8 : 0}}>
                                            <span style={{fontSize:10,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.label}</span>
                                            <span style={{fontSize:10,fontWeight:800,flexShrink:0}}>{b.compte}</span>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
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
                      <div style={{
                        display:'grid',
                        gridTemplateColumns:`repeat(${Math.max(1, Math.ceil(suiviBranchesClasse.length / 2))}, minmax(0, 1fr))`,
                        gap:8,
                        width:'100%'
                      }}>
                        {suiviBranchesClasse.map(b => {
                          const ok = b.affectees === b.requises;
                          return (
                            <div key={b.id} style={{
                              ...styles.suiviBrancheChip,
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
                  {!(planningClasse.horaires || []).length && (
                    <div style={{...styles.msgVide, marginBottom:12}}>
                      Aucun horaire défini pour cette classe. Allez dans Affectations → Classes pour choisir Matin / Après-midi.
                    </div>
                  )}
                  {!(planningClasse.creneaux || []).length && (
                    <div style={{...styles.msgVide, marginBottom:12}}>
                      Aucun créneau trouvé. Vérifiez la configuration des horaires.
                    </div>
                  )}

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
                          const allCrs = planningClasse.creneaux || [];
                          let crsBase = allCrs.filter(c => c.jour === 'Lundi' && c.periode === periode);
                          if (!crsBase.length) {
                            const jourRef = JOURS.find(j => allCrs.some(c => c.jour === j && c.periode === periode));
                            if (jourRef) crsBase = allCrs.filter(c => c.jour === jourRef && c.periode === periode);
                          }
                          crsBase = [...crsBase].sort((a, b) => Number(a.ordre || 0) - Number(b.ordre || 0));
                          if (!crsBase.length) return null;
                          return [
                            <tr key={periode}><td colSpan={6} style={styles.periodeBande}>{periode}</td></tr>,
                            ...crsBase.map((crBase,idx) => (
                              <tr key={`${periode}-${crBase.ordre || idx}`} style={styles.tr}>
                                <td style={{...styles.td,...STYLE_COLONNE_CRENEAU,background:'#f8f9fa',fontWeight:600,fontSize:12,whiteSpace:'nowrap'}}>
                                  P{periode==='Matin' ? idx+1 : idx+5} — {crBase.heure_debut}–{crBase.heure_fin}
                                </td>
                                {JOURS.map(jour => {
                                  const cr = allCrs.find(c=>c.jour===jour&&c.periode===periode&&c.ordre===crBase.ordre);
                                  if (!cr) return <td key={jour} style={{...styles.td,background:'#f5f5f5',width:LARGEUR_COLONNE_JOUR,minWidth:LARGEUR_COLONNE_JOUR,maxWidth:LARGEUR_COLONNE_JOUR}}></td>;
                                  const aCours = classeAHorairePlanning(jour, periode);
                                  const aff = aCours ? getAffectationNormaleCreneau(cr.id) : null;
                                  const aSoutien = aCours && creneauxAvecSoutienClasse.has(String(cr.id));
                                  const couleurFondProf = aff ? getCouleurProf(aff.prof_id) : '#ffffff';
                                  const couleurTexteProf = aff ? getCouleurTexteSurFond(couleurFondProf) : '#111827';
                                  return (
                                    <td key={jour} style={{...styles.td,textAlign:'center',fontSize:12,width:LARGEUR_COLONNE_JOUR,minWidth:LARGEUR_COLONNE_JOUR,maxWidth:LARGEUR_COLONNE_JOUR,
                                      background:aff?couleurFondProf:(aCours?'#fff':'#f5f5f5'),
                                      color: aff ? couleurTexteProf : undefined,
                                      position:'relative'}}>
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
                                                setPlanningClasse(prev => (prev ? { ...prev } : prev));
                                              }}>
                                              <option value="">— Branche —</option>
                                              {matieresPourPlanningClasse.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                                            </select>
                                          ) : (
                                            aff.matiere_nom && <div style={{color:'#666',fontSize:11}}>{aff.matiere_nom}</div>
                                          )}
                                          {aSoutien && renderBadgeSoutien(cr.id)}
                                        </div>
                                      ) : aCours ? (
                                        <div>
                                          <span style={{color:'#dc2626',fontSize:11,fontWeight:700}}>Aucun professeur affecté</span>
                                          {aSoutien && renderBadgeSoutien(cr.id)}
                                        </div>
                                      ) : ''}
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
                {Array.isArray(planningProf.pools) && planningProf.pools.length > 1 && (
                  <div style={{fontSize:13,fontWeight:600,color:'#6366f1',marginTop:6}}>
                    Pools : {planningProf.pools.map((p) => p.nom).join(' · ')}
                  </div>
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
                            const estSoutienAff = classeAffectee && estAffectationSoutien(aff);
                            const couleurFondClasse = classeAffectee ? getCouleurClasse(aff.classe_id) : '#ffffff';
                            const couleurTexteClasse = classeAffectee ? getCouleurTexteSurFond(couleurFondClasse) : '#111827';
                            const ligneSoutienLie = estSoutienAff ? formatLigneSoutienLie(aff) : '';
                            return (
                              <td key={jour} style={{...styles.td,...STYLE_TD_COURS_UI,height:HAUTEUR_LIGNE_COURS_UI,width:LARGEUR_COLONNE_JOUR,minWidth:LARGEUR_COLONNE_JOUR,maxWidth:LARGEUR_COLONNE_JOUR,
                                background:(!classeAffectee||indispo)?'#eeeeee':'#fff'}}>
                                {classeAffectee ? (
                                  <>
                                    <div style={{fontWeight:700,color:couleurTexteClasse,background:couleurFondClasse,borderRadius:6,padding:'3px 8px',textAlign:'center'}}>
                                      {estSoutienAff ? `${aff.classe_nom} - Soutien` : aff.classe_nom}
                                    </div>
                                    {aff.pool_nom ? <div style={{color:'#6366f1',fontWeight:600,fontSize:10,marginTop:2,textAlign:'center'}}>{aff.pool_nom}</div> : null}
                                    {ligneSoutienLie ? (
                                      <div style={{color:'#334155',fontWeight:600,fontSize:11,marginTop:3,textAlign:'center'}}>{ligneSoutienLie}</div>
                                    ) : (
                                      aff.matiere_nom && <div style={{color:'#334155',fontWeight:600,fontSize:11,marginTop:3,textAlign:'center'}}>{aff.matiere_nom}</div>
                                    )}
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
                              const aff = aCours ? getAffectationNormaleCreneau(cr.id) : null;
                              const aSoutien = aCours && creneauxAvecSoutienClasse.has(String(cr.id));
                              const couleurFondProf = aff ? getCouleurProf(aff.prof_id) : '#ffffff';
                              const couleurTexteProf = aff ? getCouleurTexteSurFond(couleurFondProf) : '#111827';
                              return (
                                <td key={`classe-tab-${periode}-${jour}-${cr.id}`} style={{...styles.td,...STYLE_TD_COURS_UI,height:HAUTEUR_LIGNE_COURS_UI,
                                  width:LARGEUR_COLONNE_JOUR,minWidth:LARGEUR_COLONNE_JOUR,maxWidth:LARGEUR_COLONNE_JOUR,
                                  background:aCours?'#fff':'#f5f5f5', position:'relative'}}>
                                  {aff ? (
                                    <>
                                      <div style={{fontWeight:700,color:couleurTexteProf,background:couleurFondProf,borderRadius:6,padding:'3px 8px',textAlign:'center'}}>{formaterNomComplet(aff.prof_nom)}</div>
                                      {aff.matiere_nom && <div style={{color:'#334155',fontWeight:600,fontSize:11,marginTop:3,textAlign:'center'}}>{aff.matiere_nom}</div>}
                                      {aSoutien && renderBadgeSoutien(cr.id)}
                                    </>
                                  ) : aCours ? (
                                    <>
                                      <span style={{color:'#dc2626',fontSize:11,fontWeight:700}}>Aucun professeur affecté</span>
                                      {aSoutien && renderBadgeSoutien(cr.id)}
                                    </>
                                  ) : ''}
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
          {planningPoolId && planningGeneralLoading && (
            <div style={styles.msgVide}>Chargement du planning général…</div>
          )}
          {planningPoolId && !planningGeneralLoading && planningGeneralError && (
            <div style={styles.msgVide}>{planningGeneralError}</div>
          )}

          {planningPoolId && !planningGeneralLoading && planningGeneral && (
            <div style={{marginBottom:16}}>
              <h3 style={{...styles.suiviGrandTitre,color:'#0f172a',textTransform:'none',letterSpacing:'normal'}}>Classes et titulaires</h3>
              <div style={{display:'flex',gap:8,width:'100%',flexWrap:'wrap'}}>
                {(Array.isArray(planningGeneral.titulaires) ? planningGeneral.titulaires : [])
                  .filter(t => t && t.classe_nom)
                  .sort((a,b) => String(a.classe_nom||'').localeCompare(String(b.classe_nom||''), 'fr', {numeric:true, sensitivity:'base'}))
                  .map((t,i) => (
                  <div key={String(t.classe_id || i)} style={{flex:'1 1 120px',minWidth:120,background:'#ffffff',borderRadius:10,padding:'10px 16px',border:'1px solid #e2e8f0',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
                    <div style={{fontWeight:700,fontSize:14,color:'#0f172a'}}>{t.classe_nom}</div>
                    <div style={{fontSize:12,color:'#475569',marginTop:4}}>{t.prof_nom ? formaterNomComplet(t.prof_nom) : <span style={{color:'#94a3b8'}}>Pas de titulaire</span>}</div>
                  </div>
                ))}
                {(Array.isArray(planningGeneral.titulaires) ? planningGeneral.titulaires : []).filter(t => t && t.classe_nom).length === 0 && (
                  <div style={{fontSize:12,color:'#64748b',fontWeight:600}}>Aucune classe dans ce pool.</div>
                )}
              </div>
            </div>
          )}
          {planningPoolId && !planningGeneralLoading && planningGeneral && (
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              {!showJoursFiltres ? (
                <button onClick={() => setShowJoursFiltres(true)}
                  style={{padding:'7px 14px',borderRadius:17,border:'1.5px solid #e2e8f0',background:'white',cursor:'pointer',fontWeight:600,color:'#94a3b8',fontSize:13,fontFamily:'inherit',whiteSpace:'nowrap'}}>
                  Trier
                </button>
              ) : (
                <div className="chip-tabs" style={{display:'flex',background:'#ede9fe',borderRadius:20,padding:3,gap:2}}>
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
          {planningPoolId && !planningGeneralLoading && planningGeneral && (
            <div style={{overflowX:'auto',marginTop:0}}>
              {(() => {
                try {
                const genProfs = Array.isArray(planningGeneral.profs) ? planningGeneral.profs : [];
                const genCreneaux = Array.isArray(planningGeneral.creneaux) ? planningGeneral.creneaux : [];
                const genAffectations = Array.isArray(planningGeneral.affectations) ? planningGeneral.affectations : [];
                const genDispos = Array.isArray(planningGeneral.dispos) ? planningGeneral.dispos : [];
                const joursAffiches = jourPlanningFiltre === 'tous' ? JOURS : JOURS.filter(j => j === jourPlanningFiltre);
                if (!genProfs.length) {
                  return <div style={styles.msgVide}>Aucun professeur dans ce pool.</div>;
                }
                if (!genCreneaux.length) {
                  return <div style={styles.msgVide}>Aucun créneau horaire défini.</div>;
                }
                return joursAffiches.map(jour => {
                const crs = genCreneaux.filter(c => c && c.jour === jour);
                if (!crs.length) return null;
                const nCols = genProfs.length + 1;
                return (
                  <table key={`gen-${jour}`} style={{...styles.tbl,tableLayout:'fixed',width:'100%',minWidth:LARGEUR_COLONNE_CRENEAU+genProfs.length*120,marginBottom:20,border:'none',boxShadow:'none'}}>
                    <colgroup>
                      <col style={{width:LARGEUR_COLONNE_CRENEAU}} />
                      {genProfs.map(p => <col key={`col-gen-${jour}-${p.id}`} />)}
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
                        {genProfs.map(p => (
                          <th key={p.id} style={{...styles.th,textAlign:'center',color:'#5b21b6'}}>
                            {nomSansSuffixe(p.nom)}<br/>
                            <span style={{fontWeight:400,fontSize:11}}>{formaterPrenomEntete(p.prenom)}</span>
                          </th>
                        ))}
                      </tr>
                      {['Matin','Après-midi'].flatMap(per => {
                        const crsPer = crs.filter(c => c.periode === per);
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
                              {genProfs.map(p => {
                                const aff = genAffectations.find(a => String(a.prof_id) === String(p.id) && String(a.creneau_id) === String(cr.id));
                                const dispo = genDispos.find(d => String(d.prof_id) === String(p.id) && String(d.creneau_id) === String(cr.id));
                                const indispo = dispo && !dispo.disponible;
                                const poolCourantGen = pools.find((pp) => String(pp.id) === String(planningPoolId));
                                const horsPool = aff && estAffectationHorsPool(aff, poolCourantGen);
                                const estSoutien = String(aff?.type_special || '').toLowerCase() === 'soutien';
                                const estSpecial = !!aff?.type_special && !estSoutien;
                                let couleurFond = '#fff';
                                let couleurTexte = '#111827';
                                let libelleAff = '';
                                let periodeHorsPool = '';
                                try {
                                  if (horsPool) {
                                    couleurFond = '#e2e8f0';
                                    couleurTexte = '#475569';
                                    libelleAff = nomPoolAffectationExterne(aff, poolCourantGen);
                                    periodeHorsPool = libellePeriodeAffectation(aff);
                                  } else {
                                    couleurFond = aff
                                      ? (estSpecial ? '#000000' : (aff.classe_id ? getCouleurClasse(aff.classe_id) : '#e8f5e9'))
                                      : (indispo ? '#eeeeee' : '#fff');
                                    couleurTexte = aff
                                      ? (estSpecial ? '#ffffff' : getCouleurTexteSurFond(couleurFond))
                                      : '#111827';
                                    libelleAff = estSpecial
                                      ? getLibelleTypeSpecial(aff.type_special)
                                      : (estSoutien ? `${aff.classe_nom || ''} - Soutien` : (aff.classe_nom || ''));
                                  }
                                } catch (_) {
                                  couleurFond = indispo ? '#eeeeee' : '#fff';
                                  couleurTexte = '#111827';
                                  libelleAff = aff?.classe_nom || '';
                                }
                                const brancheAff = (!horsPool && !estSpecial) ? libelleBrancheAffectation(aff) : '';
                                return (
                                  <td key={p.id} style={{...styles.td,...STYLE_TD_COURS_UI,height:HAUTEUR_LIGNE_COURS_UI,
                                    background:couleurFond,color:couleurTexte}}>
                                    {aff ? <>
                                      <b style={{color:couleurTexte,fontSize:12}}>{libelleAff}</b>
                                      {periodeHorsPool ? <div style={{color:'#64748b',fontWeight:600,fontSize:10,marginTop:2,lineHeight:1.15}}>{periodeHorsPool}</div> : null}
                                      {brancheAff ? <div style={{color:couleurTexte,fontWeight:600,fontSize:10,marginTop:2,lineHeight:1.15,opacity:0.92}}>{brancheAff}</div> : null}
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
              });
                } catch (err) {
                  console.error('rendu planning général:', err);
                  return <div style={styles.msgVide}>Impossible d&apos;afficher le planning général ({String(err?.message || err)}).</div>;
                }
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  page:{padding:'28px 32px',background:'#f8fafc',minHeight:'100%',boxSizing:'border-box',fontFamily:"'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif"},
  header:{display:'flex',alignItems:'center',gap:15,marginBottom:12,width:'100%',minHeight:40,flexWrap:'wrap'},
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
  btnResetAff:{width:36,height:36,padding:0,borderRadius:8,border:'1px solid #e2e8f0',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',background:'#ffffff',color:'#64748b',alignSelf:'center'},
  btnProposeAff:{width:36,height:36,padding:0,borderRadius:8,border:'1px solid #c7d2fe',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',background:'#eef2ff',color:'#4338ca',alignSelf:'center'},
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
  pastillePeriodeOk:{
    display:'inline-flex',
    alignItems:'center',
    justifyContent:'center',
    width:22,
    height:22,
    borderRadius:'50%',
    background:'#16a34a',
    color:'#ffffff',
    fontSize:12,
    fontWeight:800,
    lineHeight:1,
  },
};