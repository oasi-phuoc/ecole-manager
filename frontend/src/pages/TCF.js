/* eslint-disable */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import TimePicker from '../components/TimePicker';
import CustomSelect from '../components/CustomSelect';
import { PageLoader, LoadingButton } from '../components/LoadingUI';
import { stickyPageChrome } from '../styles/pageShell';
import { injectForcedPrintCss, openPrintPopup } from '../utils/print';
import { listerNomsResponsablesEcole } from '../utils/responsablesEcole';

const escapeHtml = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const MOMENTS = [
  { id: 'matin', label: 'Matin', periode: 'Matin' },
  { id: 'apresMidi', label: 'Après-midi', periode: 'Après-midi' },
];
const SESSIONS = ["Test d'août", '1e semestre', '2e semestre'];
const SESSIONS_COMPAT = ["Test d'août", 'Rentrée scolaire', '1e semestre', '2e semestre'];
const SESSION_LABEL = { "Test d'août": 'Test de placement' };
const DEMI_JOURNEES = JOURS.flatMap(j => ([
  { id: `${j}|matin`, label: `${j} matin`, jour: j, moment: 'matin' },
  { id: `${j}|apresMidi`, label: `${j} après-midi`, jour: j, moment: 'apresMidi' },
]));
const getRoleCap = (role) => {
  if (role.startsWith('Oral Groupe ')) return 2;
  return Infinity;
};
const getLignesOrganisation = (n) => {
  const N = Math.max(n, 2);
  return [
    { row: 1, key: 'appel', role: 'Appel', temps: 25, bloc: null, type: 'normal' },
    { row: 2, key: 'surv1', role: 'Surveillance', temps: 10, bloc: null, type: 'normal' },
    { row: 3, key: 'acc_a', role: 'Accompagnement', temps: 45, bloc: 'blocA', type: 'blocStart' },
    ...Array.from({ length: N }, (_, i) => ({ row: 4 + i, key: `oral_a_${i + 1}`, role: `Oral ${i + 1}`, temps: null, bloc: 'blocA', type: 'blocInner' })),
    { row: 4 + N, key: 'surv2', role: 'Surveillance', temps: 25, bloc: null, type: 'normal' },
    { row: 5 + N, key: 'surv3', role: 'Surveillance', temps: 25, bloc: null, type: 'normal' },
    { row: 6 + N, key: 'acc_b', role: 'Accompagnement', temps: 45, bloc: 'blocB', type: 'blocStart' },
    ...Array.from({ length: N }, (_, i) => ({ row: 7 + N + i, key: `oral_b_${i + 1}`, role: `Oral ${i + 1}`, temps: null, bloc: 'blocB', type: 'blocInner' })),
    { row: 7 + 2 * N, key: 'correction', role: 'Correction', temps: null, bloc: null, type: 'correction' },
  ];
};
const getRolesColonne = (n) => {
  const N = Math.max(n, 2);
  return ['Appel', 'Surveillance', 'Accompagnement', ...Array.from({ length: N }, (_, i) => `Oral Groupe ${i + 1}`), 'Correction'];
};

const normaliserNiveau = (niveau) => String(niveau || '').trim().toUpperCase();
const parseNiveauxPool = (valeur) => {
  if (!valeur) return [];
  if (Array.isArray(valeur)) return valeur.map(v => normaliserNiveau(v)).filter(Boolean);
  return String(valeur).split(',').map(v => normaliserNiveau(v)).filter(Boolean);
};
const clampNote = (value, min = 0, max = 25) => {
  if (value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return Math.min(max, Math.max(min, n));
};
const nb = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const parseNoteTCF = (v) => {
  if (v === '' || v === undefined || v === null) return null;
  const n = typeof v === 'string' ? parseFloat(String(v).replace(',', '.')) : Number(v);
  return Number.isFinite(n) ? n : null;
};
/** Total TCF (/100) : ≤ 30 rouge, ≥ 85 vert (onglet Résultats — vues Classe / Élève ; Statistiques) */
const couleurTotale = (total) => {
  const n = parseNoteTCF(total);
  if (n == null) return {};
  if (n <= 30) return { color: '#b91c1c' };
  if (n >= 85) return { color: '#166534' };
  return { color: '#0f172a' };
};
const cycleStatut = (statut) => {
  if (statut === 'vert') return 'orange';
  if (statut === 'orange') return 'rouge';
  return 'vert';
};
const normaliserPeriode = (p) =>
  String(p || '')
    .trim()
    .toLowerCase()
    .replace('è', 'e')
    .replace('é', 'e');
const toDisplayNom = (nom) => String(nom || '').split('-')[0].trim();
const sessionStorageKey = (session) => {
  if (!session) return '';
  if (session === 'Rentrée scolaire') return "Test d'août";
  return session;
};
const parseTimeToMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};
const minutesToTime = (minutes) => {
  if (!Number.isFinite(minutes)) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const TCF_STATE_KEYS = {
  pool: 'pool',
  affectation: 'affectation',
  resultats: 'resultats',
};

const lireObjetLocal = () => {
  return {};
};

function FiltreDropdown({ label = 'Trier', value = '', options = [], onSelect, allLabel = 'Tous niveaux', width = 190 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLabel = options.find((option) => option.value === value)?.label || '';
  const buttonLabel = value ? activeLabel : label;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{ ...styles.filterDropdownButton, minWidth: width }}
      >
        <span>{buttonLabel}</span>
        <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ ...styles.filterDropdownMenu, minWidth: width }}>
          <button
            type="button"
            onClick={() => {
              onSelect('');
              setOpen(false);
            }}
            style={{ ...styles.filterDropdownItem, ...(!value ? styles.filterDropdownItemActive : {}) }}
          >
            {allLabel}
          </button>
          {options.map((option) => {
            const actif = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onSelect(option.value);
                  setOpen(false);
                }}
                style={{ ...styles.filterDropdownItem, ...(actif ? styles.filterDropdownItemActive : {}) }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TCF() {
  const navigate = useNavigate();
  const headers = useMemo(() => ({}), []);

  const [searchParams, setSearchParams] = useSearchParams();
  const normalizeTCFTab = (tabValue) => {
    const tab = String(tabValue || '').trim().toLowerCase();
    if (!tab) return 'pool';
    if (tab === 'resultats') return 'resultat';
    if (tab === 'stats') return 'statistique';
    return tab;
  };
  const onglet = normalizeTCFTab(searchParams.get('tab'));
  const setOnglet = (tab) => {
    const normalized = normalizeTCFTab(tab);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set('tab', normalized);
      return p;
    });
  };
  const [profs, setProfs] = useState([]);
  const [pools, setPools] = useState([]);
  const [creneaux, setCreneaux] = useState([]);
  // Créneaux où le prof a une affectation EDT (Emploi du temps → Affectations → Professeurs)
  const [affectationsMap, setAffectationsMap] = useState({});
  const [classes, setClasses] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [saving, setSaving] = useState(false);

  const [siteNames, setSiteNames] = useState({ site1: 'Site 1', site2: 'Site 2' });
  const [siteLevels, setSiteLevels] = useState({ site1: [], site2: [] });
  const [selectedBySite, setSelectedBySite] = useState({ site1: [], site2: [] });
  const [siteOrder, setSiteOrder] = useState(['site1', 'site2']);
  const [siteCounter, setSiteCounter] = useState(2);
  const [siteActif, setSiteActif] = useState('site1');
  const [showAutresProfsBySite, setShowAutresProfsBySite] = useState({});
  const [affectationSousOnglet, setAffectationSousOnglet] = useState('classes');
  const [planningsSite, setPlanningsSite] = useState(null);
  const [planningsType, setPlanningsType] = useState('classes');
  const [planningsProfId, setPlanningsProfId] = useState('');
  const [classeConvocation, setClasseConvocation] = useState('');
  const [splitByProf, setSplitByProf] = useState({});
  const [poolCellOverrides, setPoolCellOverrides] = useState({});
  const [poolDirty, setPoolDirty] = useState(false);
  const [affectationDirty, setAffectationDirty] = useState(false);
  const [resultatDirty, setResultatDirty] = useState(false);
  const [saveMsgByTab, setSaveMsgByTab] = useState({ pool: '', classes: '', roles: '', resultat: '' });
  const [saveToast, setSaveToast] = useState('');
  const [niveauxDB, setNiveauxDB] = useState([]);

  const [resultatNiveau, setResultatNiveau] = useState('');
  const [showTrierNiveaux, setShowTrierNiveaux] = useState(false);
  const [resultatMatiere, setResultatMatiere] = useState('francais');
  const [resultatSession, setResultatSession] = useState('');
  const [resultatVue, setResultatVue] = useState('individuelle');
  const [resultatClasseId, setResultatClasseId] = useState('');
  const [resultatEleveId, setResultatEleveId] = useState('');
  const [resultatEleveSearch, setResultatEleveSearch] = useState('');
  const [resultatRecherche, setResultatRecherche] = useState('');
  const [resultatSortDir, setResultatSortDir] = useState('asc');
  const [scores, setScores] = useState({});
  const [absences, setAbsences] = useState({});
  const [responsablesTCF, setResponsablesTCF] = useState([]);

  const [statSousOnglet, setStatSousOnglet] = useState('tri');
  const [statMatiere, setStatMatiere] = useState('francais');
  const [statSens, setStatSens] = useState('fort');
  const [statOrdre, setStatOrdre] = useState('decroissant');
  const [statSession, setStatSession] = useState(() => {
    const m = new Date().getMonth() + 1;
    if (m >= 8 && m <= 11) return "Test d'août";
    if (m === 12 || (m >= 1 && m <= 4)) return '1e semestre';
    return '2e semestre';
  });
  const [statSeuil, setStatSeuil] = useState('60');
  const [statNiveau, setStatNiveau] = useState('');
  const [statRecherche, setStatRecherche] = useState('');
  const [statShowNiveaux, setStatShowNiveaux] = useState(false);
  const [rolesGroupActif, setRolesGroupActif] = useState('g1');
  const [affectationDateDebutBySite, setAffectationDateDebutBySite] = useState({});
  const [affectationHorairesBySite, setAffectationHorairesBySite] = useState({});
  const [affectationClassesBySite, setAffectationClassesBySite] = useState({});
  const [affectationJoursActifsBySite, setAffectationJoursActifsBySite] = useState({});
  const [rolesDemiJourneeSelect, setRolesDemiJourneeSelect] = useState('');
  const [rolesAffectesByPoolDemi, setRolesAffectesByPoolDemi] = useState({});
  const [organisationByPoolDemi, setOrganisationByPoolDemi] = useState({});
  const savedAffectationRef = useRef({});
  const [ongletGraphiqueMatiere, setOngletGraphiqueMatiere] = useState('francais');
  const [graphPoolId, setGraphPoolId] = useState('');
  const [graphSession, setGraphSession] = useState(() => {
    const m = new Date().getMonth() + 1;
    if (m >= 8 && m <= 11) return "Test d'août";
    if (m === 12 || (m >= 1 && m <= 4)) return '1e semestre';
    return '2e semestre';
  });
  const [graphEleveId, setGraphEleveId] = useState('');
  const [graphVue, setGraphVue] = useState('moyenne');
  const [graphNiveau, setGraphNiveau] = useState('');
  const [graphShowNiveaux, setGraphShowNiveaux] = useState(false);
  /** Points / étiquettes sur la courbe de tendance (vue élève, plusieurs sessions) */
  const [graphShowTrendPoints, setGraphShowTrendPoints] = useState(true);
  /** Largeur du bouton Afficher/Masquer les points = max des deux libellés (mesure une fois) */
  const [graphTrendPointsBtnWidthPx, setGraphTrendPointsBtnWidthPx] = useState(168);
  const [graphClasseId, setGraphClasseId] = useState('');
  const [graphRecherche, setGraphRecherche] = useState('');
  const [graphSortDir, setGraphSortDir] = useState('asc');
  const [anneeScolaire, setAnneeScolaire] = useState('');
  /** UI graphique : orientation paysage (fenêtre / appareil) → graphique plus large */
  const [graphUiLandscape, setGraphUiLandscape] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches
  );
  const savedScoresRef = useRef({});

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(orientation: landscape)');
    const update = () => setGraphUiLandscape(mq.matches);
    update();
    mq.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.createElement('span');
    el.style.cssText =
      'font-weight:600;font-size:13px;font-family:Century Gothic,CenturyGothic,Apple Gothic,Futura,Trebuchet MS,sans-serif;position:absolute;left:-9999px;top:0;white-space:nowrap;visibility:hidden;';
    document.body.appendChild(el);
    el.textContent = 'Afficher les points';
    const w1 = el.offsetWidth;
    el.textContent = 'Masquer les points';
    const w2 = el.offsetWidth;
    document.body.removeChild(el);
    setGraphTrendPointsBtnWidthPx(Math.ceil(Math.max(w1, w2)) + 29);
  }, []);

  const appliquerPoolState = (poolState = {}) => {
    const savedOrder = Array.isArray(poolState?.siteOrder) && poolState.siteOrder.length
      ? poolState.siteOrder
      : Object.keys(poolState?.siteNames || {});
    if (savedOrder.length) {
      setSiteOrder(savedOrder);
      const maxSuffix = savedOrder.reduce((acc, key) => {
        const n = Number(String(key).replace('site', ''));
        return Number.isFinite(n) ? Math.max(acc, n) : acc;
      }, 0);
      setSiteCounter(maxSuffix || 2);
    }
    if (poolState?.siteNames) setSiteNames(poolState.siteNames);
    if (poolState?.siteLevels) setSiteLevels(poolState.siteLevels);
    if (poolState?.selectedBySite) setSelectedBySite(poolState.selectedBySite);
    if (poolState?.splitByProf) setSplitByProf(poolState.splitByProf);
    if (poolState?.poolCellOverrides) setPoolCellOverrides(poolState.poolCellOverrides);
  };

  const appliquerAffectationState = (aff = {}, saveSnapshot = false) => {
    setAffectationDateDebutBySite(aff?.dateDebutBySite || {});
    setAffectationHorairesBySite(aff?.horairesBySite || {});
    setAffectationClassesBySite(aff?.classesBySite || {});
    setAffectationJoursActifsBySite(aff?.joursActifsBySite || {});
    setRolesAffectesByPoolDemi(aff?.rolesByPoolDemi || {});
    setOrganisationByPoolDemi(aff?.organisationByPoolDemi || {});
    if (saveSnapshot) savedAffectationRef.current = aff;
  };

  const sauvegarderEtatTCFServeur = async (cle, donnees) => {
    await apiClient.put('/tcf-state/' + cle, { donnees }, { headers });
  };

  useEffect(() => {
    const charger = async () => {
      setChargement(true);
      const [rp, rPools, rCreneaux, rGeneral, rClasses, rEleves, rParametres, rNiveaux] = await Promise.all([
        apiClient.get('/profs', { headers }).catch(() => ({ data: [] })),
        apiClient.get('/planning/pools', { headers }).catch(() => ({ data: [] })),
        apiClient.get('/planning/creneaux', { headers }).catch(() => ({ data: [] })),
        apiClient.get('/planning/general', { headers }).catch(() => ({ data: {} })),
        apiClient.get('/classes', { headers }).catch(() => ({ data: [] })),
        apiClient.get('/eleves', { headers }).catch(() => ({ data: [] })),
        apiClient.get('/parametres/ecole', { headers }).catch(() => ({ data: {} })),
        apiClient.get('/donnees/niveaux').catch(() => ({ data: [] })),
      ]);
      setProfs(rp.data || []);
      setPools(rPools.data || []);
      setCreneaux(rCreneaux.data || []);
      setClasses((rClasses.data || []).filter(c => c.actif !== false));
      setEleves((rEleves.data || []).filter(e => e.statut !== 'inactif'));
      setAnneeScolaire(String(rParametres?.data?.annee_scolaire || '').trim());
      const respNames = listerNomsResponsablesEcole(rParametres?.data || {});
      setResponsablesTCF(respNames.map((name, i) => ({ id: `resp_${i}`, nom: name, prenom: '' })));
      setNiveauxDB(rNiveaux.data || []);

      const aMap = {};
      (rGeneral.data?.affectations || []).forEach(a => {
        if (a?.prof_id == null || a?.creneau_id == null) return;
        aMap[`${a.prof_id}-${a.creneau_id}`] = true;
      });
      setAffectationsMap(aMap);

      const poolLocal = lireObjetLocal('tcf_pool_state');
      const rsLocal = lireObjetLocal('tcf_resultats_scores');
      const affLocal = lireObjetLocal('tcf_affectation_state');
      appliquerPoolState(poolLocal);
      if (rsLocal && typeof rsLocal === 'object') {
        setScores(rsLocal);
        savedScoresRef.current = rsLocal;
      }
      appliquerAffectationState(affLocal);

      try {
        const [poolSrv, affSrv, rsSrv] = await Promise.all([
          apiClient.get('/tcf-state/' + TCF_STATE_KEYS.pool, { headers }).catch(() => null),
          apiClient.get('/tcf-state/' + TCF_STATE_KEYS.affectation, { headers }).catch(() => null),
          apiClient.get('/tcf-state/' + TCF_STATE_KEYS.resultats, { headers }).catch(() => null),
        ]);

        if (poolSrv?.data?.updated_at) {
          const donnees = poolSrv.data?.donnees || {};
          appliquerPoolState(donnees);
        }
        if (affSrv?.data?.updated_at) {
          const donnees = affSrv.data?.donnees || {};
          appliquerAffectationState(donnees, true);
        }
        if (rsSrv?.data?.updated_at) {
          const donnees = rsSrv.data?.donnees || {};
          const nextScores = donnees && typeof donnees === 'object' ? donnees : {};
          setScores(nextScores);
          savedScoresRef.current = nextScores;
        }
      } catch {}
      setChargement(false);
    };
    charger();
  }, [headers]);

  const profMap = useMemo(() => {
    const out = {};
    for (const p of profs) out[String(p.id)] = p;
    return out;
  }, [profs]);

  const classesMap = useMemo(() => {
    const out = {};
    for (const c of classes) out[String(c.id)] = c;
    return out;
  }, [classes]);

  const niveaux = useMemo(() => {
    const set = new Set();
    for (const c of classes) {
      const n = normaliserNiveau(c.niveau);
      if (n) set.add(n);
    }
    const ORDRE_NIVEAUX = ['CSC', 'CFR', 'EPL'];
    return Array.from(set).sort((a, b) => {
      const ia = ORDRE_NIVEAUX.indexOf(a), ib = ORDRE_NIVEAUX.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b, 'fr');
    });
  }, [classes]);

  const niveauxTabs = useMemo(() => {
    if (niveauxDB.length > 0) {
      const ORDRE = ['CSC', 'CFR', 'EPL'];
      return niveauxDB.map(n => normaliserNiveau(n.nom)).sort((a, b) => {
        const ia = ORDRE.indexOf(a), ib = ORDRE.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1; if (ib !== -1) return 1;
        return a.localeCompare(b, 'fr');
      });
    }
    return niveaux;
  }, [niveauxDB, niveaux]);

  useEffect(() => {
    if (resultatNiveau && !niveauxTabs.includes(resultatNiveau)) setResultatNiveau('');
    if (graphNiveau && !niveauxTabs.includes(graphNiveau)) setGraphNiveau('');
    if (statNiveau && !niveauxTabs.includes(statNiveau)) setStatNiveau('');
  }, [niveauxTabs, resultatNiveau, graphNiveau, statNiveau]);

  useEffect(() => {
    if (!siteOrder.length) return;
    if (!siteActif || !siteOrder.includes(siteActif)) {
      setSiteActif(siteOrder[0]);
    }
  }, [siteOrder, siteActif]);

  useEffect(() => {
    if (onglet === 'classes') setAffectationSousOnglet('classes');
    else if (onglet === 'roles') setAffectationSousOnglet('roles');
    else if (onglet === 'affectation') setAffectationSousOnglet(prev => (prev === 'roles' ? 'roles' : 'classes'));
  }, [onglet]);

  useEffect(() => {
    if (statSens === 'fort' && String(statSeuil) !== '80') setStatSeuil('80');
    if (statSens === 'faible' && String(statSeuil) !== '40') setStatSeuil('40');
  }, [statSens]);

  const profsParNiveauPool = useMemo(() => {
    const byLevel = {};
    const seen = {};
    for (const pool of pools) {
      const niveaux = parseNiveauxPool(pool.niveau);
      const niveauxCibles = niveaux.length ? niveaux : ['SANS NIVEAU'];

      const profsPool = Array.isArray(pool.profs) ? pool.profs : [];
      for (const niveau of niveauxCibles) {
        if (!byLevel[niveau]) {
          byLevel[niveau] = [];
          seen[niveau] = new Set();
        }
        for (const p of profsPool) {
          const pid = String(p.id);
          if (seen[niveau].has(pid)) continue;
          seen[niveau].add(pid);
          byLevel[niveau].push({
            id: pid,
            nom: p.nom || profMap[pid]?.nom || '',
            prenom: p.prenom || profMap[pid]?.prenom || '',
          });
        }
      }
    }

    // Ajouter les profs non couverts par les pools dans SANS NIVEAU.
    const tousLesPids = new Set(Object.values(seen).flatMap(s => [...s]));
    const manquants = profs.filter(p => !tousLesPids.has(String(p.id)));
    if (manquants.length > 0) {
      if (!byLevel['SANS NIVEAU']) byLevel['SANS NIVEAU'] = [];
      for (const p of manquants) {
        byLevel['SANS NIVEAU'].push({ id: String(p.id), nom: p.nom || '', prenom: p.prenom || '' });
      }
    }

    for (const niveau of Object.keys(byLevel)) {
      byLevel[niveau].sort((a, b) =>
        `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, 'fr')
      );
    }
    return byLevel;
  }, [pools, profs, profMap]);

  const niveauxDisponibles = useMemo(() => {
    const set = new Set(niveaux);
    for (const p of pools) {
      for (const n of parseNiveauxPool(p.niveau)) set.add(n);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [niveaux, pools]);

  const classesParNiveau = useMemo(() => {
    const out = {};
    (classes || []).forEach((c) => {
      const n = normaliserNiveau(c.niveau);
      if (!n) return;
      if (!out[n]) out[n] = [];
      out[n].push(c);
    });
    Object.values(out).forEach((arr) => arr.sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr')));
    return out;
  }, [classes]);

  const classesEligiblesSite = useMemo(() => {
    const out = {};
    siteOrder.forEach((siteKey) => {
      const lvls = siteLevels[siteKey] || [];
      const niveauSet = new Set(lvls.map(normaliserNiveau));
      out[siteKey] = classes
        .filter((c) => niveauSet.size === 0 || niveauSet.has(normaliserNiveau(c.niveau)))
        .sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'));
    });
    return out;
  }, [siteOrder, siteLevels, classes]);

  const elevesNiveau = useMemo(() => {
    const cls = resultatNiveau
      ? classes.filter(c => normaliserNiveau(c.niveau) === resultatNiveau)
      : classes;
    const clsIds = new Set(cls.map(c => String(c.id)));
    return eleves
      .filter(e => clsIds.has(String(e.classe_id)))
      .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'));
  }, [eleves, classes, resultatNiveau]);

  useEffect(() => {
    if (resultatEleveId && !elevesNiveau.some(e => String(e.id) === String(resultatEleveId))) {
      setResultatEleveId('');
      setResultatEleveSearch('');
    }
    if (resultatClasseId && !elevesNiveau.some(e => String(e.classe_id) === String(resultatClasseId))) {
      setResultatClasseId('');
    }
  }, [elevesNiveau, resultatEleveId, resultatClasseId]);

  const estBloqueDansAutreSite = (siteKey, profId) => {
    if (splitByProf[profId]) return false;
    return siteOrder.some(k => k !== siteKey && (selectedBySite[k] || []).includes(profId));
  };

  const clearPastillesOverridesProf = (siteKey, profId) => {
    setPoolCellOverrides(overrides => {
      const next = { ...overrides };
      JOURS.forEach(j => MOMENTS.forEach(m => {
        delete next[cleCellulePool(siteKey, profId, j, m.id)];
      }));
      return next;
    });
  };

  const resetPastillesProf = (siteKey, profId) => {
    setPoolDirty(true);
    // Recalcule les pastilles depuis l'horaire affecté (EDT), pas les disponibilités
    clearPastillesOverridesProf(siteKey, profId);
  };

  const toggleProfSite = (siteKey, profId) => {
    if (estBloqueDansAutreSite(siteKey, profId)) return;
    setPoolDirty(true);
    setSelectedBySite(prev => {
      const cur = prev[siteKey] || [];
      const deja = cur.includes(profId);
      if (!deja) {
        // À la sélection : pastilles = horaire affecté EDT (vert/orange/rouge)
        clearPastillesOverridesProf(siteKey, profId);
      }
      return {
        ...prev,
        [siteKey]: deja ? cur.filter(id => id !== profId) : [...cur, profId],
      };
    });
  };

  const toggleSplitProf = (profId) => {
    setPoolDirty(true);
    setSplitByProf(prev => {
      const next = { ...prev, [profId]: !prev[profId] };
      if (!next[profId]) {
        const sitesAvecProf = siteOrder.filter(k => (selectedBySite[k] || []).includes(profId));
        if (sitesAvecProf.length > 1) {
          const keep = sitesAvecProf[0];
          setSelectedBySite(s => {
            const updated = { ...s };
            for (const k of sitesAvecProf) {
              if (k === keep) continue;
              updated[k] = (updated[k] || []).filter(id => id !== profId);
            }
            return updated;
          });
        }
      }
      return next;
    });
  };

  const toggleSiteLevel = (siteKey, level) => {
    setPoolDirty(true);
    setSiteLevels(prev => {
      const current = prev[siteKey] || [];
      const has = current.includes(level);
      return {
        ...prev,
        [siteKey]: has ? current.filter(x => x !== level) : [...current, level],
      };
    });
  };

  const ajouterSite = () => {
    setPoolDirty(true);
    const next = siteCounter + 1;
    const key = `site${next}`;
    setSiteCounter(next);
    setSiteOrder(prev => [...prev, key]);
    setSiteNames(prev => ({ ...prev, [key]: `Site ${next}` }));
    setSiteLevels(prev => ({ ...prev, [key]: [] }));
    setSelectedBySite(prev => ({ ...prev, [key]: [] }));
    setSiteActif(key);
  };

  const supprimerSite = (siteKey) => {
    if (siteOrder.length <= 1) {
      alert('Au moins un site est requis.');
      return;
    }
    const nomSite = siteNames[siteKey] || siteKey;
    const ok = window.confirm(`Confirmer la suppression du site "${nomSite}" ?`);
    if (!ok) return;
    setPoolDirty(true);
    setSiteOrder(prev => prev.filter(k => k !== siteKey));
    setSiteNames(prev => {
      const next = { ...prev };
      delete next[siteKey];
      return next;
    });
    setSiteLevels(prev => {
      const next = { ...prev };
      delete next[siteKey];
      return next;
    });
    setSelectedBySite(prev => {
      const next = { ...prev };
      delete next[siteKey];
      return next;
    });
    setPoolCellOverrides(prev => {
      const next = {};
      for (const [k, v] of Object.entries(prev)) {
        if (!k.startsWith(`${siteKey}::`)) next[k] = v;
      }
      return next;
    });
  };

  // Nombre de périodes où le prof travaille (affectations EDT) sur la demi-journée
  const periodesAffecteesParDemiJournee = (profId, jour, momentId) => {
    const periodeCible = momentId === 'matin' ? 'matin' : 'apres-midi';
    const creneauxJour = creneaux.filter(c =>
      String(c.jour || '').toLowerCase() === jour.toLowerCase()
      && normaliserPeriode(c.periode) === periodeCible
    );
    const total = creneauxJour.length;
    let nb = 0;
    for (const c of creneauxJour) {
      if (
        affectationsMap[`${profId}-${c.id}`]
        || affectationsMap[`${String(profId)}-${c.id}`]
        || affectationsMap[`${profId}-${String(c.id)}`]
        || affectationsMap[`${String(profId)}-${String(c.id)}`]
      ) {
        nb += 1;
      }
    }
    return { nb, total };
  };

  const cleCellulePool = (siteKey, profId, jour, momentId) => `${siteKey}::${profId}::${jour}::${momentId}`;

  // Vert = 4 périodes (demi-journée complète), orange = 1–3, rouge = 0
  const statutBaseCellule = (profId, jour, momentId) => {
    const { nb } = periodesAffecteesParDemiJournee(profId, jour, momentId);
    if (nb <= 0) return 'rouge';
    if (nb >= 4) return 'vert';
    return 'orange';
  };

  const statutCellule = (siteKey, profId, jour, momentId) => {
    const key = cleCellulePool(siteKey, profId, jour, momentId);
    return poolCellOverrides[key]?.statut || statutBaseCellule(profId, jour, momentId);
  };

  const rActifCellule = (siteKey, profId, jour, momentId) => {
    const key = cleCellulePool(siteKey, profId, jour, momentId);
    return !!poolCellOverrides[key]?.rActif;
  };

  const cycleCellule = (siteKey, profId, jour, momentId) => {
    setPoolDirty(true);
    const key = cleCellulePool(siteKey, profId, jour, momentId);
    const courant = statutCellule(siteKey, profId, jour, momentId);
    const rActifCourant = rActifCellule(siteKey, profId, jour, momentId);
    // Cycle 4 états : vert → orange → rouge → réserve(rouge+R) → vert
    let suivantStatut, suivantRActif;
    if (courant === 'vert')                          { suivantStatut = 'orange'; suivantRActif = false; }
    else if (courant === 'orange')                   { suivantStatut = 'rouge';  suivantRActif = false; }
    else if (courant === 'rouge' && !rActifCourant)  { suivantStatut = 'rouge';  suivantRActif = true;  }
    else /* réserve (rouge+R) */                     { suivantStatut = 'vert';   suivantRActif = false; }
    setPoolCellOverrides(prev => ({
      ...prev,
      [key]: { statut: suivantStatut, rActif: suivantRActif },
    }));
  };

  const toggleRCellule = (siteKey, profId, jour, momentId) => {
    const key = cleCellulePool(siteKey, profId, jour, momentId);
    const statut = statutCellule(siteKey, profId, jour, momentId);
    if (statut !== 'rouge') return;
    setPoolDirty(true);
    setPoolCellOverrides(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        statut: 'rouge',
        rActif: !prev[key]?.rActif,
      },
    }));
  };

  const scoreKey = (matiere, session, eleveId) => `${matiere}::${sessionStorageKey(session)}::${eleveId}`;
  const getScore = (matiere, session, eleveId) => {
    const key = scoreKey(matiere, session, eleveId);
    if (scores[key]) return scores[key];
    if (session === "Test d'août") {
      const compat = `${matiere}::Rentrée scolaire::${eleveId}`;
      if (scores[compat]) return scores[compat];
    }
    return {};
  };
  const setScore = (matiere, session, eleveId, field, value) => {
    const valeur = value === '' ? '' : String(clampNote(value));
    setResultatDirty(true);
    setScores(prev => {
      const key = scoreKey(matiere, session, eleveId);
      const cur = prev[key] || {};
      return { ...prev, [key]: { ...cur, [field]: valeur } };
    });
  };

  const calculFr = (row) => {
    const oral = nb(row.co) + nb(row.po);
    const ecrit = nb(row.ce) + nb(row.pe);
    const total = oral + ecrit;
    const filled = [row.co, row.po, row.ce, row.pe].some(v => v !== '' && v !== undefined);
    return { oral: filled ? oral : '', ecrit: filled ? ecrit : '', total: filled ? total : '' };
  };
  const calculMath = (row) => {
    const cscCfr = nb(row.p1) + nb(row.p2);
    const cafCap = nb(row.p3) + nb(row.p4);
    const total = cscCfr + cafCap;
    const filled = [row.p1, row.p2, row.p3, row.p4].some(v => v !== '' && v !== undefined);
    return { cscCfr: filled ? cscCfr : '', cafCap: filled ? cafCap : '', total: filled ? total : '' };
  };

  const renderPastille = (statut, nbPeriodes = null) => {
    const color = statut === 'vert' ? '#22c55e' : statut === 'orange' ? '#f59e0b' : '#ef4444';
    const showCount = statut === 'orange' && nbPeriodes >= 1 && nbPeriodes <= 3;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ ...styles.dot, background: color }} />
        {showCount && (
          <span style={{ fontSize: 11, fontWeight: 800, color: '#b45309', lineHeight: 1, minWidth: 10 }}>
            {nbPeriodes}
          </span>
        )}
      </span>
    );
  };

  const cellKeyAffectation = (jour, moment) => `${jour}|${moment}`;
  const getAffectationClassesSite = (siteKey, jour, moment) =>
    affectationClassesBySite?.[siteKey]?.[cellKeyAffectation(jour, moment)] || [];
  const setAffectationClassesSite = (siteKey, jour, moment, nextClasses) => {
    setAffectationClassesBySite(prev => {
      const next = { ...prev };
      const siteData = { ...(next[siteKey] || {}) };
      siteData[cellKeyAffectation(jour, moment)] = nextClasses;
      next[siteKey] = siteData;
      return next;
    });
  };
  const isJourActifSite = (siteKey, jour) => {
    const siteData = affectationJoursActifsBySite?.[siteKey] || {};
    if (!Object.prototype.hasOwnProperty.call(siteData, jour)) return true;
    return !!siteData[jour];
  };
  const toggleJourActifSite = (siteKey, jour) => {
    setAffectationDirty(true);
    setAffectationJoursActifsBySite(prev => {
      const siteData = { ...(prev?.[siteKey] || {}) };
      const nextActif = !isJourActifSite(siteKey, jour);
      siteData[jour] = nextActif;
      return { ...prev, [siteKey]: siteData };
    });
    // Si le jour est désactivé, on libère toutes les classes de la journée
    // pour qu'elles puissent être réaffectées sur d'autres demi-journées.
    if (isJourActifSite(siteKey, jour)) {
      setAffectationClassesBySite(prev => {
        const next = { ...prev };
        const siteData = { ...(next[siteKey] || {}) };
        siteData[cellKeyAffectation(jour, 'matin')] = [];
        siteData[cellKeyAffectation(jour, 'apresMidi')] = [];
        next[siteKey] = siteData;
        return next;
      });
    }
  };
  const classeDejaUtiliseeDansSite = (siteKey, classeId) => {
    const siteData = affectationClassesBySite?.[siteKey] || {};
    return Object.values(siteData).some((ids) => (ids || []).includes(String(classeId)));
  };
  const toggleClasseAffectationSite = (siteKey, jour, moment, classeId) => {
    const classeIdStr = String(classeId);
    const curCell = getAffectationClassesSite(siteKey, jour, moment);
    const dejaDansCell = curCell.includes(classeIdStr);
    if (!dejaDansCell && classeDejaUtiliseeDansSite(siteKey, classeIdStr)) return;
    setAffectationDirty(true);
    setAffectationClassesBySite(prev => {
      const next = { ...prev };
      const siteData = { ...(next[siteKey] || {}) };
      const key = cellKeyAffectation(jour, moment);
      const base = [...(siteData[key] || [])];
      siteData[key] = dejaDansCell ? base.filter(id => id !== classeIdStr) : [...base, classeIdStr];
      next[siteKey] = siteData;
      return next;
    });
  };
  const getHoraireSite = (siteKey, champ) => {
    const val = affectationHorairesBySite?.[siteKey]?.[champ];
    if (val !== undefined && val !== null && String(val).trim() !== '') return val;
    if (champ === 'matinDebut') return '08:20';
    if (champ === 'matinFin') return '11:15';
    if (champ === 'apresMidiDebut') return '13:30';
    if (champ === 'apresMidiFin') return '16:15';
    if (champ === 'matinDebutProf') return '07:30';
    if (champ === 'matinFinProf') return '12:00';
    if (champ === 'apresMidiDebutProf') return '13:00';
    if (champ === 'apresMidiFinProf') return '17:00';
    return '';
  };
  const setHoraireSite = (siteKey, champ, value) => {
    setAffectationDirty(true);
    setAffectationHorairesBySite(prev => ({
      ...prev,
      [siteKey]: { ...(prev?.[siteKey] || {}), [champ]: value },
    }));
  };

  const renderTablePoolSite = (siteKey) => {
    const ids = [...(selectedBySite[siteKey] || [])].sort((a, b) => {
      const pa = profMap[a], pb = profMap[b];
      return (pa?.prenom || '').localeCompare(pb?.prenom || '', 'fr') || (pa?.nom || '').localeCompare(pb?.nom || '', 'fr');
    });
    if (!ids.length) return <div style={styles.empty}>Aucun professeur sélectionné.</div>;

    const countVertsDemiJournee = (jour, momentId) =>
      ids.reduce((acc, id) => acc + (statutCellule(siteKey, id, jour, momentId) === 'vert' ? 1 : 0), 0);
    const countReservesDemiJournee = (jour, momentId) =>
      ids.reduce((acc, id) => {
        const estRouge = statutCellule(siteKey, id, jour, momentId) === 'rouge';
        const reserveActive = rActifCellule(siteKey, id, jour, momentId);
        return acc + (estRouge && reserveActive ? 1 : 0);
      }, 0);

    return (
      <div style={styles.tableWrap}>
        <table style={styles.tablePool}>
          <colgroup>
            <col style={{ width: 245, minWidth: 245, maxWidth: 245 }} />
            {JOURS.flatMap(j => MOMENTS.map(m => (
              <col key={`${j}-${m.id}`} style={{ width: 'auto' }} />
            )))}
          </colgroup>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.thProfPool} rowSpan={2}>Professeur</th>
              {JOURS.map(j => <th key={j} style={styles.thCenter} colSpan={2}>{j}</th>)}
            </tr>
            <tr style={styles.thead}>
              {JOURS.map(j => MOMENTS.map(m => (
                <th key={`${j}-${m.id}`} style={styles.thCenter}>{m.label}</th>
              )))}
            </tr>
          </thead>
          <tbody>
            {ids.map(id => {
              const p = profMap[id];
              return (
                <tr key={id}>
                  <td style={styles.tdProfPool}>{p ? `${p.prenom} ${toDisplayNom(p.nom)}` : `Prof #${id}`}</td>
                  {JOURS.map(j => MOMENTS.map(m => {
                    const statut = statutCellule(siteKey, id, j, m.id);
                    const rActif = rActifCellule(siteKey, id, j, m.id);
                    const { nb } = periodesAffecteesParDemiJournee(id, j, m.id);
                    return (
                      <td
                        key={`${id}-${j}-${m.id}`}
                        style={styles.tdCenterCell}
                        onClick={() => cycleCellule(siteKey, id, j, m.id)}
                      >
                        <div style={styles.cellStatusWrap}>
                          {rActif
                            ? <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:18,height:18,borderRadius:'50%',background:'#a78bfa',color:'white',fontWeight:700,fontSize:10}}>R</span>
                            : renderPastille(statut, nb)
                          }
                        </div>
                      </td>
                    );
                  }))}
                </tr>
              );
            })}
            <tr>
              <td style={styles.tdCountLabel}>Disponibles</td>
              {JOURS.map(j => MOMENTS.map(m => (
                <td key={`count-${j}-${m.id}`} style={styles.tdCountValue}>
                  {countVertsDemiJournee(j, m.id)}
                </td>
              )))}
            </tr>
            <tr>
              <td style={styles.tdCountLabel}>Réserves</td>
              {JOURS.map(j => MOMENTS.map(m => (
                <td key={`count-r-${j}-${m.id}`} style={styles.tdCountValue}>
                  {countReservesDemiJournee(j, m.id)}
                </td>
              )))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderTableAffectationSite = (siteKey) => {
    const classesSite = classesEligiblesSite[siteKey] || [];
    if (!classesSite.length) return <div style={styles.empty}>Aucune classe disponible pour les niveaux sélectionnés.</div>;

    return (
      <>
        <div style={styles.affectationMetaWrap}>
          <label style={{...styles.inlineLabel, color:'#0f172a'}}>
            Date de début :
            <input
              type="date"
              value={affectationDateDebutBySite?.[siteKey] || ''}
              onChange={(e) => {
                setAffectationDirty(true);
                setAffectationDateDebutBySite(prev => ({ ...prev, [siteKey]: e.target.value }));
              }}
              style={{ ...styles.inputField, width: 144 }}
            />
          </label>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Horaires élève</div>
              <label style={styles.inlineLabel}>
                <span style={styles.momentLabelFix}><span style={styles.momentLabelText}>Matin</span><span>:</span></span>
                <TimePicker value={getHoraireSite(siteKey, 'matinDebut')} onChange={e => setHoraireSite(siteKey, 'matinDebut', e.target.value)} style={styles.timePastilleFixe} />
                <TimePicker value={getHoraireSite(siteKey, 'matinFin')} onChange={e => setHoraireSite(siteKey, 'matinFin', e.target.value)} style={styles.timePastilleFixe} />
              </label>
              <div style={{marginBottom:6}} />
              <label style={styles.inlineLabel}>
                <span style={styles.momentLabelFix}><span style={styles.momentLabelText}>Après-midi</span><span>:</span></span>
                <TimePicker value={getHoraireSite(siteKey, 'apresMidiDebut')} onChange={e => setHoraireSite(siteKey, 'apresMidiDebut', e.target.value)} style={styles.timePastilleFixe} />
                <TimePicker value={getHoraireSite(siteKey, 'apresMidiFin')} onChange={e => setHoraireSite(siteKey, 'apresMidiFin', e.target.value)} style={styles.timePastilleFixe} />
              </label>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Horaires professeurs</div>
              <label style={styles.inlineLabel}>
                <span style={styles.momentLabelFix}><span style={styles.momentLabelText}>Matin</span><span>:</span></span>
                <TimePicker value={getHoraireSite(siteKey, 'matinDebutProf')} onChange={e => setHoraireSite(siteKey, 'matinDebutProf', e.target.value)} style={styles.timePastilleFixe} />
                <TimePicker value={getHoraireSite(siteKey, 'matinFinProf')} onChange={e => setHoraireSite(siteKey, 'matinFinProf', e.target.value)} style={styles.timePastilleFixe} />
              </label>
              <div style={{marginBottom:6}} />
              <label style={styles.inlineLabel}>
                <span style={styles.momentLabelFix}><span style={styles.momentLabelText}>Après-midi</span><span>:</span></span>
                <TimePicker value={getHoraireSite(siteKey, 'apresMidiDebutProf')} onChange={e => setHoraireSite(siteKey, 'apresMidiDebutProf', e.target.value)} style={styles.timePastilleFixe} />
                <TimePicker value={getHoraireSite(siteKey, 'apresMidiFinProf')} onChange={e => setHoraireSite(siteKey, 'apresMidiFinProf', e.target.value)} style={styles.timePastilleFixe} />
              </label>
            </div>
          </div>
        </div>
        {MOMENTS.map((moment, mi) => {
          const thStyle = { ...styles.thCenter, fontSize: 14, padding: '5px 8px', background: '#6366f1', color: 'white', borderBottom: 'none', borderRight: 'none' };
          return (
            <div key={moment.id} style={{ ...styles.tableWrap, marginTop: mi === 1 ? 20 : 0 }}>
              <table style={{ ...styles.tablePool, width: '100%' }}>
                <colgroup>
                  <col style={{ width: 36, minWidth: 36, maxWidth: 36 }} />
                  {JOURS.map((j) => <col key={j} style={{ width: 'auto' }} />)}
                </colgroup>
                <tbody>
                  <tr>
                    <td rowSpan={2} style={{ background: '#eef2ff', color: '#4338ca', fontWeight: 700, fontSize: 13, padding: '4px 2px', borderRight: '1px solid #e2e8f0', borderBottom: 'none', textAlign: 'center', verticalAlign: 'middle', width: 36 }}>
                      <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', display: 'inline-block' }}>{moment.label}</span>
                    </td>
                    {JOURS.map(j => {
                      const classesCell = getAffectationClassesSite(siteKey, j, moment.id);
                      const eff = classesCell.reduce((acc, cid) => acc + eleves.filter(e => String(e.classe_id) === String(cid)).length, 0);
                      return (
                        <td key={j} style={thStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {eff > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, borderRadius: '50%', background: '#eef2ff', color: '#4338ca', fontSize: 11, fontWeight: 700, border: '1px solid #a5b4fc', flexShrink: 0 }}>{eff}</span>}
                            <span>{j}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    {JOURS.map((j) => {
                      const actif = isJourActifSite(siteKey, j);

                      if (!actif) return <td key={`${j}-${moment.id}`} style={{ ...styles.dayInactiveCell, height: 80 }}></td>;
                      const classesCell = getAffectationClassesSite(siteKey, j, moment.id);
                      return (
                        <td key={`${j}-${moment.id}`} style={{ ...styles.tdCenter, height: 80 }}>
                          <div style={{ ...styles.pastillesWrap, justifyContent: 'center' }}>
                            {classesCell.map((cid) => {
                              const cl = classes.find(c => String(c.id) === String(cid));
                              return (
                                <button key={`${j}-${moment.id}-${cid}`} type="button"
                                  onClick={() => toggleClasseAffectationSite(siteKey, j, moment.id, cid)}
                                  style={styles.classChipActif}>
                                  {cl?.nom || cid}
                                </button>
                              );
                            })}
                            {(classesSite || [])
                              .filter(c => !classeDejaUtiliseeDansSite(siteKey, c.id))
                              .map((cl) => (
                                <button key={`${j}-${moment.id}-add-${cl.id}`} type="button"
                                  onClick={() => toggleClasseAffectationSite(siteKey, j, moment.id, cl.id)}
                                  style={styles.classChip}>
                                  {cl.nom}
                                </button>
                              ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: 0, marginTop: 12 }}>
          <div style={{ width: 36, flexShrink: 0 }}></div>
          {JOURS.map((j) => (
            <div key={`toggle-${j}`} style={{ flex: 1, textAlign: 'center', padding: '4px' }}>
              <div style={{ ...styles.toggleWrap, display: 'inline-flex' }}>
                <button type="button"
                  onClick={() => { if (!isJourActifSite(siteKey, j)) toggleJourActifSite(siteKey, j); }}
                  style={{ ...styles.toggleBtnDay, ...(isJourActifSite(siteKey, j) ? styles.toggleBtnDayActif : {}) }}>
                  Actif
                </button>
                <button type="button"
                  onClick={() => { if (isJourActifSite(siteKey, j)) toggleJourActifSite(siteKey, j); }}
                  style={{ ...styles.toggleBtnDay, ...(!isJourActifSite(siteKey, j) ? styles.toggleBtnDayActif : {}) }}>
                  Inactif
                </button>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderSelectionSite = (siteKey, siteLabel, sansCadre = false) => (
    <div key={siteKey} style={sansCadre ? styles.siteCardPlain : styles.siteCard}>
      <div style={{...styles.siteHeader, alignItems:'center'}}>
        <div style={{...styles.siteNameField, justifyContent:'center'}}>
          <input
            value={siteNames[siteKey] ?? ''}
            onChange={e => {
              setPoolDirty(true);
              setSiteNames(prev => ({ ...prev, [siteKey]: e.target.value }));
            }}
            style={styles.siteInput}
            placeholder="Nom du site"
          />
        </div>
        <div style={{...styles.niveauSection, flexDirection:'row', alignItems:'center', gap:6}}>
          <div style={styles.siteLevelsWrap}>
            {niveauxTabs.map(level => {
              const actif = (siteLevels[siteKey] || []).includes(level);
              return (
                <button
                  key={`${siteKey}-${level}`}
                  type="button"
                  onClick={() => toggleSiteLevel(siteKey, level)}
                  style={{ ...styles.levelBtn, ...(actif ? styles.levelBtnActif : {}), height:38, boxSizing:'border-box' }}
                >
                  {level}
                </button>
              );
            })}
          </div>
          {(() => {
            const niveauxSelectionnes = siteLevels[siteKey] || [];
            const niveauxSet = new Set(niveauxSelectionnes.map(normaliserNiveau));
            const afficherAutres = showAutresProfsBySite[siteKey] === true;
            if (niveauxSet.size === 0) return null;
            return (
              <button
                type="button"
                onClick={() => setShowAutresProfsBySite(prev => ({ ...prev, [siteKey]: !(prev[siteKey] === true) }))}
                style={{
                  ...styles.autresProfsToggleBtn,
                  ...(afficherAutres ? styles.autresProfsToggleBtnActif : {}),
                }}
              >
                {afficherAutres ? 'Masquer les autres professeurs' : 'Afficher les autres professeurs'}
              </button>
            );
          })()}
        </div>
      </div>

      {(() => {
        const niveauxSelectionnes = siteLevels[siteKey] || [];
        const afficherAutres = showAutresProfsBySite[siteKey] === true;
        const niveauxSet = new Set(niveauxSelectionnes.map(normaliserNiveau));
        const profsParNiveauFiltres = Object.entries(profsParNiveauPool).filter(([niveau]) => {
          if (niveauxSet.size === 0) return true;
          if (afficherAutres) return true;
          return niveauxSet.has(normaliserNiveau(niveau));
        });
        return (
          <>
            {chargement ? <PageLoader label="Chargement..." style={styles.empty} /> : profsParNiveauFiltres.map(([niveau, liste]) => (
        <div key={niveau} style={styles.niveauBlock}>
          <div style={styles.niveauTitle}>Niveau {niveau}</div>
          <div style={styles.profsList}>
            {liste.map(p => {
              const checked = (selectedBySite[siteKey] || []).includes(p.id);
              const blocked = estBloqueDansAutreSite(siteKey, p.id);
              return (
                <div key={p.id} style={{ ...styles.profItem, ...(blocked ? styles.profItemBlocked : {}) }}>
                  <label style={styles.profCheck}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={blocked}
                      onChange={() => toggleProfSite(siteKey, p.id)}
                    />
                    <span style={styles.profName}>{p.prenom} {toDisplayNom(p.nom)}</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {checked && (
                      <button
                        type="button"
                        title="Recalculer les pastilles selon l'horaire affecté (EDT)"
                        onClick={() => resetPastillesProf(siteKey, p.id)}
                        style={styles.resetPastillesBtn}
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleSplitProf(p.id)}
                      style={{ ...styles.splitToggleBtn, ...(splitByProf[p.id] ? styles.splitToggleBtnActif : {}) }}
                    >
                      Scinder
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
            ))}
          </>
        );
      })()}

      <div style={{marginTop:15}}>{renderTablePoolSite(siteKey)}</div>
      <div style={styles.siteFooterActions}>
        <button
          type="button"
          onClick={() => supprimerSite(siteKey)}
          style={styles.btnRemoveSite}
        >
          Supprimer
        </button>
      </div>
    </div>
  );

  const renderTableAffectationSiteReadOnly = (siteKey) => {
    const dateDebut = affectationDateDebutBySite?.[siteKey] || '';
    const getDateJour = (idx) => {
      if (!dateDebut) return '';
      const d = new Date(dateDebut);
      d.setDate(d.getDate() + idx);
      return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
    };
    const joursActifs = JOURS.filter(j => isJourActifSite(siteKey, j));
    return (
      <>
        {MOMENTS.map((moment, mi) => (
          <div key={moment.id} style={{ ...styles.tableWrap, marginTop: mi === 1 ? 20 : 0 }}>
            <table style={{ ...styles.tableLarge, tableLayout: 'fixed' }}>
              <tbody>
                <tr style={styles.thead}>
                  <td rowSpan={2} className="moment-label-cell" style={{ ...styles.thCenter, width: 36, verticalAlign: 'middle', background: '#eef2ff', color: '#4338ca', fontSize: 16 }}>
                    <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', display: 'inline-block', fontWeight: 700 }}>{moment.label}</span>
                  </td>
                  {joursActifs.map((j) => {
                    const date = getDateJour(JOURS.indexOf(j));
                    const classesCell = getAffectationClassesSite(siteKey, j, moment.id);
                    const eff = classesCell.reduce((acc, cid) => acc + eleves.filter(e => String(e.classe_id) === String(cid)).length, 0);
                    return (
                      <td key={j} style={{ ...styles.thCenter, fontSize: 15 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {eff > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, borderRadius: '50%', background: '#eef2ff', color: '#4338ca', fontSize: 11, fontWeight: 700, border: '1px solid #a5b4fc', flexShrink: 0 }}>{eff}</span>}
                          <span>{j}{date ? ` - ${date}` : ''}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  {joursActifs.map(j => {
                    const actif = isJourActifSite(siteKey, j);
                    if (!actif) return <td key={j} style={{ ...styles.dayInactiveCell, height: 80 }}></td>;
                    const classesCell = getAffectationClassesSite(siteKey, j, moment.id);
                    return (
                      <td key={j} style={{ ...styles.tdLeft, verticalAlign: 'middle', padding: '6px 8px', height: 80, textAlign: 'center' }}>
                        <div style={{ ...styles.pastillesWrap, justifyContent: 'center', alignItems: 'center', gap: 3 }}>
                          {classesCell.length === 0
                            ? <span style={{ fontSize: 16, color: '#cbd5e1' }}>—</span>
                            : classesCell.map(cid => {
                              const cl = classes.find(c => String(c.id) === String(cid));
                              return <span key={cid} style={{ border: '1px solid #a5b4fc', background: '#eef2ff', color: '#4338ca', borderRadius: 999, padding: '2px 6px', fontSize: 16, fontWeight: 700, cursor: 'default' }}>{cl?.nom || cid}</span>;
                            })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </>
    );
  };

  const renderRolesReadOnly = (siteKey) => {
    const demi = DEMI_JOURNEES.find(d => d.id === rolesDemiJourneeSelect);
    const key = `${siteKey}::${rolesDemiJourneeSelect}`;
    const rolesMap = rolesAffectesByPoolDemi[key] || {};
    const poolIdsReadOnly = new Set((selectedBySite[siteKey] || []).map(String));
    const org = organisationByPoolDemi[key] || {};
    const classesAffecteesDemi = demi ? (affectationClassesBySite?.[siteKey]?.[cellKeyAffectation(demi.jour, demi.moment)] || []) : [];
    const classesAffecteesObjs = classesAffecteesDemi.map(cid => classes.find(c => String(c.id) === String(cid))).filter(Boolean);
    const useGroups = classesAffecteesObjs.length > 2;
    const savedGroups = {
      g1: (org.groups?.g1 || []).map(String).filter(cid => classesAffecteesDemi.includes(String(cid))),
      g2: (org.groups?.g2 || []).map(String).filter(cid => classesAffecteesDemi.includes(String(cid))),
    };
    const classesColonnes = useGroups
      ? [
        { id: 'group:g1', nom: savedGroups.g1.map(cid => classes.find(c => String(c.id) === String(cid))?.nom).filter(Boolean).join(' + ') || 'Groupe 1', classIds: savedGroups.g1 },
        { id: 'group:g2', nom: savedGroups.g2.map(cid => classes.find(c => String(c.id) === String(cid))?.nom).filter(Boolean).join(' + ') || 'Groupe 2', classIds: savedGroups.g2 },
      ]
      : classesAffecteesObjs.map(cl => ({ id: String(cl.id), nom: cl.nom, classIds: [String(cl.id)] }));
    const defaultStart = demi
      ? (demi.moment === 'matin' ? getHoraireSite(siteKey, 'matinDebut') : getHoraireSite(siteKey, 'apresMidiDebut'))
      : '';
    const defaultStartMin = parseTimeToMinutes(defaultStart);
    const nbOralGroupsRO = Math.max(classesAffecteesObjs.length, 2);
    const lignesOrgRO = getLignesOrganisation(nbOralGroupsRO);
    const lignesHoraire = {};
    let cursor = defaultStartMin;
    lignesOrgRO.forEach((lg) => {
      const saved = org[`horaire_${lg.row}`];
      if (saved?.start || saved?.end) {
        lignesHoraire[lg.row] = { start: saved.start || '', end: saved.end || '' };
        if (saved.end) cursor = parseTimeToMinutes(saved.end);
      } else if (Number.isFinite(cursor) && lg.temps) {
        lignesHoraire[lg.row] = { start: minutesToTime(cursor), end: minutesToTime(cursor + lg.temps) };
        cursor = cursor + lg.temps;
      } else {
        lignesHoraire[lg.row] = { start: '', end: '' };
      }
    });
    const spanHoraire = (val) => (
      <span style={{ display: 'inline-block', width: 48, padding: '4px', fontSize: 12, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 4, background: '#f8fafc' }}>{val}</span>
    );
    return (
      <div>
        {!rolesDemiJourneeSelect ? (
          <div style={styles.empty}>Sélectionnez une demi-journée.</div>
        ) : demi && !isJourActifSite(siteKey, demi.jour) ? (
          <div style={styles.empty}>La demi-journée sélectionnée est inactive pour ce site.</div>
        ) : (
          <div style={{ overflowX: 'hidden', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white' }}>
            <table style={{ ...styles.tableRolesRight, pointerEvents: 'none' }}>
              <colgroup>
                <col style={{ width: 116, minWidth: 116, maxWidth: 116 }} />
                <col style={{ width: 72, minWidth: 72, maxWidth: 72 }} />
                {classesColonnes.map((col) => <col key={`rro-col-${col.id}`} style={{ width: 150, minWidth: 150, maxWidth: 150 }} />)}
                <col style={{ width: 150, minWidth: 150, maxWidth: 150 }} />
                <col style={{ width: 'auto' }} />
              </colgroup>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.thCenter}>Horaire</th>
                  <th style={styles.thCenter}>Temps</th>
                  {classesColonnes.map((cl, i) => <th key={`rro-class-${i}`} style={styles.thCenter}>{cl.nom}</th>)}
                  <th style={styles.thCenter}>Rôle</th>
                  <th style={styles.thCenter}>Professeurs</th>
                </tr>
              </thead>
              <tbody>
                {lignesOrgRO.map((lg) => {
                  const estBlocAStart = lg.type === 'blocStart' && lg.bloc === 'blocA';
                  const estBlocAInner = lg.type === 'blocInner' && lg.bloc === 'blocA';
                  const estBlocBStart = lg.type === 'blocStart' && lg.bloc === 'blocB';
                  const estBlocBInner = lg.type === 'blocInner' && lg.bloc === 'blocB';
                  const afficherHoraireTemps = !(estBlocAInner || estBlocBInner);
                  const isCorrection = lg.type === 'correction';
                  const prevEnd = (() => {
                    if (lg.row <= 1) return lignesHoraire[lg.row]?.start || '';
                    for (let r = lg.row - 1; r >= 1; r--) {
                      if (lignesHoraire[r]?.end) return lignesHoraire[r].end;
                    }
                    return '';
                  })();
                  const startValue = lg.row === 1 ? (lignesHoraire[lg.row]?.start || '') : prevEnd;
                  const endValue = isCorrection ? '...' : (lignesHoraire[lg.row]?.end || '');
                  return (
                    <tr key={`rro-ligne-${lg.row}`}>
                      {afficherHoraireTemps && (
                        <td style={styles.tdCenter} rowSpan={estBlocAStart || estBlocBStart ? nbOralGroupsRO + 1 : 1}>
                          <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                            {spanHoraire(startValue)}
                            {spanHoraire(endValue)}
                          </div>
                        </td>
                      )}
                      {afficherHoraireTemps && (
                        <td style={styles.tdCenterRead} rowSpan={estBlocAStart || estBlocBStart ? nbOralGroupsRO + 1 : 1}>{lg.temps ? `${lg.temps}'` : ''}</td>
                      )}
                      {classesColonnes.map((cl) => {
                        if (lg.key === 'appel') return <td key={`rro-${lg.row}-${cl.id}`} style={styles.tdCenterRead}>Appel et consignes</td>;
                        if (lg.key === 'surv1') return <td key={`rro-${lg.row}-${cl.id}`} style={styles.tdCenterRead}>Préparation PO</td>;
                        if (estBlocAInner || estBlocBInner) return null;
                        if (estBlocAStart) {
                          const bloc = org.blocA || {};
                          return (
                            <td key={`rro-${lg.row}-${cl.id}`} style={styles.tdCenter} rowSpan={nbOralGroupsRO + 1}>
                              <div style={{ ...styles.pastillesWrap, justifyContent: 'center' }}>
                                {['PE', 'PO', 'CE'].map(tag => {
                                  const selectedVal = String(bloc[tag] || '');
                                  const estDansCol = cl.classIds.includes(selectedVal) || selectedVal === cl.id;
                                  if (!estDansCol) return null;
                                  return <span key={`rro-${lg.row}-${cl.id}-${tag}`} style={{ ...styles.classChip, ...styles.classChipActif }}>{tag}</span>;
                                })}
                              </div>
                            </td>
                          );
                        }
                        if (lg.key === 'surv2' || lg.key === 'surv3') {
                          const bloc = org[`ligne${lg.row}`] || {};
                          return (
                            <td key={`rro-${lg.row}-${cl.id}`} style={styles.tdCenter}>
                              <div style={{ ...styles.pastillesWrap, justifyContent: 'center' }}>
                                {['Pause', 'CO'].map(tag => {
                                  const selectedVal = String(bloc[tag] || '');
                                  const estDansCol = cl.classIds.includes(selectedVal) || selectedVal === cl.id;
                                  if (!estDansCol) return null;
                                  return <span key={`rro-${lg.row}-${cl.id}-${tag}`} style={{ ...styles.classChip, ...styles.classChipActif }}>{tag}</span>;
                                })}
                              </div>
                            </td>
                          );
                        }
                        if (estBlocBStart) {
                          const bloc = org.blocB || {};
                          return (
                            <td key={`rro-${lg.row}-${cl.id}`} style={styles.tdCenter} rowSpan={nbOralGroupsRO + 1}>
                              <div style={{ ...styles.pastillesWrap, justifyContent: 'center' }}>
                                {['PE', 'PO', 'CE'].map(tag => {
                                  const selectedVal = String(bloc[tag] || '');
                                  const estDansCol = cl.classIds.includes(selectedVal) || selectedVal === cl.id;
                                  if (!estDansCol) return null;
                                  return <span key={`rro-${lg.row}-${cl.id}-${tag}`} style={{ ...styles.classChip, ...styles.classChipActif }}>{tag}</span>;
                                })}
                              </div>
                            </td>
                          );
                        }
                        return <td key={`rro-${lg.row}-${cl.id}`} style={styles.tdCenter}></td>;
                      })}
                      <td style={styles.tdCenterRead}>{lg.role}</td>
                      <td style={styles.tdLeft}>
                        <div style={styles.pastillesWrap}>
                          {Object.entries(rolesMap)
                            .filter(([pid, role]) => {
                              if (!role) return false;
                              const isResp = String(pid).startsWith('resp_');
                              if (!isResp && !poolIdsReadOnly.has(String(pid))) return false;
                              if (lg.role === 'Appel') return role === 'Appel';
                              if (lg.role.startsWith('Oral ')) return role === `Oral Groupe ${lg.role.split(' ')[1]}`;
                              if (lg.role === 'Accompagnement') return role === 'Accompagnement';
                              if (lg.role === 'Correction') return role === 'Correction';
                              if (lg.role === 'Surveillance') return role === 'Surveillance';
                              return false;
                            })
                            .map(([pid]) => {
                              const p = profMap[String(pid)] || responsablesTCF.find(r => r.id === pid);
                              if (!p) return null;
                              const isResp = String(pid).startsWith('resp_');
                              return <span key={`rro-${lg.row}-prof-${pid}`} style={{ ...styles.profChip, ...(isResp ? { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' } : {}) }}>{p.prenom ? `${p.prenom} ${toDisplayNom(p.nom)}` : p.nom}</span>;
                            })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderResultat = () => {
    if (!niveaux.length) return <div style={styles.msgVide}>Aucun niveau de classe trouvé.</div>;
    const titreSession = resultatSession || 'Session non sélectionnée';
    const isFr = resultatMatiere === 'francais';
    const search = resultatRecherche.trim().toLowerCase();
    const classesNiveau = classes
      .filter(c => !resultatNiveau || normaliserNiveau(c.niveau) === resultatNiveau)
      .sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'));
    const elevesResultatBase = resultatVue === 'classe'
      ? (resultatClasseId ? elevesNiveau.filter(e => String(e.classe_id) === String(resultatClasseId)) : [])
      : (resultatEleveId ? elevesNiveau.filter(e => String(e.id) === String(resultatEleveId)) : elevesNiveau);
    const elevesResultat = elevesResultatBase.filter((e) => {
      if (!search) return true;
      const classeNom = classesMap[String(e.classe_id)]?.nom || '';
      return `${toDisplayNom(e.nom)} ${e.prenom} ${classeNom}`.toLowerCase().includes(search);
    });
    const elevesOptions = elevesNiveau.filter((e) => {
      if (!search) return true;
      const classeNom = classesMap[String(e.classe_id)]?.nom || '';
      return `${toDisplayNom(e.nom)} ${e.prenom} ${classeNom}`.toLowerCase().includes(search);
    });

    const sessionsAAfficher = resultatSession ? [resultatSession] : SESSIONS;
    const withResultatToggleGuard = (action) => {
      if (!confirmResultatDiscardIfNeeded()) return;
      action();
    };
    const elevesResultatSorted = [...elevesResultat].sort((a, b) => {
      const nomA = toDisplayNom(a.nom).toLowerCase();
      const nomB = toDisplayNom(b.nom).toLowerCase();
      return resultatSortDir === 'asc' ? nomA.localeCompare(nomB, 'fr') : nomB.localeCompare(nomA, 'fr');
    });

    const renderTableTousSessions = () => {
      const thFix = { ...styles.thCenter, background: '#eef2ff', color: '#4338ca', verticalAlign: 'middle' };
      const thSess = { ...styles.thCenter, background: '#ede9fe', color: '#5b21b6', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderLeft: '2px solid #c4b5fd' };
      const thCol = { ...styles.thCenter, borderLeft: '1px solid #e5e7eb' };
      const thColFirst = { ...styles.thCenter, borderLeft: '2px solid #c4b5fd' };
      const tdSep = { borderLeft: '2px solid #e5e7eb' };
      const scoreCols = isFr
        ? [['co','CO'],['po','PO'],['ce','CE'],['pe','PE']]
        : [['p1','P1'],['p2','P2'],['p3','P3'],['p4','P4']];
      const computedCols = isFr
        ? [['oral','Oral'],['ecrit','Écrit']]
        : [];
      const ROW1_H = 29;
      const stickyTh = (left, extra = {}) => ({ ...thFix, position: 'sticky', left, top: ROW1_H, zIndex: 5, ...extra });
      const stickyThCorner = (left, extra = {}) => ({ ...thFix, position: 'sticky', left, top: ROW1_H, zIndex: 6, ...extra });
      const stickyTd = (left, extra = {}) => ({ position: 'sticky', left, zIndex: 1, background: 'white', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 10px', fontSize: 13, color: '#1e293b', ...extra });
      return (
        <div style={{overflow: 'auto', maxHeight: 'calc(100vh - 260px)'}}>
        <div style={{...styles.tableWrap, background: '#f8fafc'}}>
          <table style={{...styles.tableLarge, background: '#f8fafc', overflow: 'visible', clipPath: 'none', borderCollapse: 'separate', borderSpacing: 0}}>
            <thead>
              <tr className="session-tab-row">
                <td colSpan={4} style={{padding:0, background:'#f8fafc', border:'none', position:'sticky', top:0, zIndex:4}} />
                {SESSIONS.map(s => (
                  <td key={s} colSpan={scoreCols.length + computedCols.length + 2} style={{padding:0, background:'#f8fafc', border:'none', verticalAlign:'bottom', position:'sticky', top:0, zIndex:4}}>
                    <div style={{display:'block', background:'#ede9fe', color:'#6d28d9', borderRadius:'8px 8px 0 0', padding:'5px 0 0', fontSize:11, fontWeight:700, letterSpacing:'0.04em', textTransform:'uppercase', textAlign:'center', lineHeight:'24px'}}>
                      {SESSION_LABEL[s] || s}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <th style={stickyThCorner(0, {minWidth:36,width:36,textAlign:'center',borderRadius:'8px 0 0 0',borderTop:'none'})}>N°</th>
                <th style={stickyThCorner(36, {textAlign:'left', minWidth:88, width:88, borderTop:'none'})}>Classe</th>
                <th style={stickyThCorner(124, {textAlign:'left', minWidth:100, borderTop:'none'})}>Nom</th>
                <th style={stickyThCorner(224, {textAlign:'left', minWidth:80, borderTop:'none'})}>Prénom</th>
                {SESSIONS.map(s => (
                  <React.Fragment key={s}>
                    <th style={{...thColFirst, borderTop:'none', position:'sticky', top:ROW1_H, zIndex:3}}>Abs</th>
                    {scoreCols.map(([,lbl]) => <th key={lbl} style={{...thCol, borderTop:'none', position:'sticky', top:ROW1_H, zIndex:3}}>{lbl}</th>)}
                    {computedCols.map(([,lbl]) => <th key={lbl} style={{...thCol, borderTop:'none', position:'sticky', top:ROW1_H, zIndex:3}}>{lbl}</th>)}
                    <th style={{...thCol, borderTop:'none', position:'sticky', top:ROW1_H, zIndex:3}}>Total</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {elevesResultatSorted.map((e, idx) => (
                <tr key={e.id}>
                  <td style={stickyTd(0, {textAlign:'center', minWidth:36, width:36})}>{idx + 1}</td>
                  <td style={stickyTd(36, {minWidth:88, width:88, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'})}>{classesMap[String(e.classe_id)]?.nom || '—'}</td>
                  <td style={stickyTd(124, {minWidth:100})}>{toDisplayNom(e.nom) || ''}</td>
                  <td style={stickyTd(224, {minWidth:80})}>{e.prenom || ''}</td>
                  {SESSIONS.map(session => {
                    const absSuf = `${resultatMatiere}_${session}_${e.id}`;
                    const row = getScore(resultatMatiere, session, e.id);
                    const computed = isFr ? calculFr(row) : calculMath(row);
                    const total = computed.total === '' ? null : Number(computed.total);
                    const totalStyle = total == null ? {} : couleurTotale(total);
                    const abs = !!absences[absSuf];
                    return (
                      <React.Fragment key={session}>
                        <td style={{...styles.tdCenter, ...tdSep}}>
                          <input type="checkbox" checked={abs}
                            onChange={ev => setAbsences(prev => ({ ...prev, [absSuf]: ev.target.checked }))}
                            style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#6366f1' }} />
                        </td>
                        {scoreCols.map(([f]) => (
                          <td key={f} style={styles.tdCenter}>
                            <input style={{ ...styles.scoreInput, opacity: abs ? 0.3 : 1 }}
                              type="number" min="0" max="25"
                              value={row[f] ?? ''}
                              disabled={abs}
                              onChange={ev => setScore(resultatMatiere, session, e.id, f, ev.target.value)} />
                          </td>
                        ))}
                        {isFr ? (
                          <>
                            <td style={styles.tdCenterRead}>{computed.oral === '' ? '' : computed.oral}</td>
                            <td style={styles.tdCenterRead}>{computed.ecrit === '' ? '' : computed.ecrit}</td>
                          </>
                        ) : null}
                        <td style={{ ...styles.tdCenterRead, ...totalStyle }}>{computed.total === '' ? '' : computed.total}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
              {elevesResultatSorted.length === 0 && (
                <tr><td colSpan={4 + SESSIONS.length * (scoreCols.length + computedCols.length + 2)} style={styles.empty}>Aucun élève trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      );
    };

    const renderTableSession = (session) => {
      const absSuffix = (id) => `${resultatMatiere}_${session}_${id}`;
      const elevesSession = elevesResultatSorted;
      return (
        <>
          <div style={{overflow:'auto', maxHeight:'calc(100vh - 260px)'}}>
          <div style={{...styles.tableWrap}}>
            <table style={{...styles.tableLarge, overflow:'visible', clipPath:'none', borderCollapse:'separate', borderSpacing:0}}>
              <thead>
                <tr style={styles.thead}>
                  <th style={{...styles.thCenter, position:'sticky', left:0, top:0, zIndex:5, minWidth:36, width:36, borderTopLeftRadius:10}}>N°</th>
                  <th style={{...styles.thClasseFixe, position:'sticky', left:36, top:0, zIndex:5}}>Classe</th>
                  <th style={{...styles.thLeft, position:'sticky', left:124, top:0, zIndex:5, minWidth:100}}>Nom</th>
                  <th style={{...styles.thLeft, position:'sticky', left:224, top:0, zIndex:5, minWidth:80}}>Prénom</th>
                  <th style={{...styles.thCenter, position:'sticky', top:0, zIndex:3}}>Absence</th>
                  {isFr ? (
                    <>
                      <th style={{...styles.thCenter, position:'sticky', top:0, zIndex:3}}>CO</th>
                      <th style={{...styles.thCenter, position:'sticky', top:0, zIndex:3}}>PO</th>
                      <th style={{...styles.thCenter, position:'sticky', top:0, zIndex:3}}>CE</th>
                      <th style={{...styles.thCenter, position:'sticky', top:0, zIndex:3}}>PE</th>
                      <th style={{...styles.thCenter, position:'sticky', top:0, zIndex:3}}>Oral</th>
                      <th style={{...styles.thCenter, position:'sticky', top:0, zIndex:3}}>Écrit</th>
                      <th style={{...styles.thCenter, position:'sticky', top:0, zIndex:3, borderTopRightRadius:10}}>Total</th>
                    </>
                  ) : (
                    <>
                      <th style={{...styles.thCenter, position:'sticky', top:0, zIndex:3}}>P1</th>
                      <th style={{...styles.thCenter, position:'sticky', top:0, zIndex:3}}>P2</th>
                      <th style={{...styles.thCenter, position:'sticky', top:0, zIndex:3}}>P3</th>
                      <th style={{...styles.thCenter, position:'sticky', top:0, zIndex:3}}>P4</th>
                      <th style={{...styles.thCenter, position:'sticky', top:0, zIndex:3, borderTopRightRadius:10}}>Total</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {elevesSession.map((e, idx) => {
                  const row = getScore(resultatMatiere, session, e.id);
                  const computed = isFr ? calculFr(row) : calculMath(row);
                  const total = computed.total === '' ? null : Number(computed.total);
                  const totalStyle = total == null ? {} : couleurTotale(total);
                  return (
                    <tr key={e.id}>
                      <td style={{...styles.tdCenter, position:'sticky', left:0, zIndex:1, background:'white', minWidth:36, width:36}}>{idx + 1}</td>
                      <td style={{...styles.tdClasseFixe, position:'sticky', left:36, zIndex:1, background:'white'}}>{classesMap[String(e.classe_id)]?.nom || '—'}</td>
                      <td style={{...styles.tdLeft, position:'sticky', left:124, zIndex:1, background:'white', minWidth:100}}>{toDisplayNom(e.nom) || ''}</td>
                      <td style={{...styles.tdLeft, position:'sticky', left:224, zIndex:1, background:'white', minWidth:80}}>{e.prenom || ''}</td>
                      <td style={styles.tdCenter}>
                        <input type="checkbox"
                          checked={!!absences[absSuffix(e.id)]}
                          onChange={ev => setAbsences(prev => ({ ...prev, [absSuffix(e.id)]: ev.target.checked }))}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#6366f1' }} />
                      </td>
                      {isFr ? (
                        <>
                          {['co', 'po', 'ce', 'pe'].map(f => (
                            <td key={f} style={styles.tdCenter}>
                              <input style={{ ...styles.scoreInput, opacity: absences[absSuffix(e.id)] ? 0.3 : 1 }}
                                type="number" min="0" max="25"
                                value={row[f] ?? ''}
                                disabled={!!absences[absSuffix(e.id)]}
                                onChange={ev => setScore('francais', session, e.id, f, ev.target.value)} />
                            </td>
                          ))}
                          <td style={styles.tdCenterRead}>{computed.oral === '' ? '' : computed.oral}</td>
                          <td style={styles.tdCenterRead}>{computed.ecrit === '' ? '' : computed.ecrit}</td>
                          <td style={{ ...styles.tdCenterRead, ...totalStyle }}>{computed.total === '' ? '' : computed.total}</td>
                        </>
                      ) : (
                        <>
                          {['p1', 'p2', 'p3', 'p4'].map(f => (
                            <td key={f} style={styles.tdCenter}>
                              <input style={{ ...styles.scoreInput, opacity: absences[absSuffix(e.id)] ? 0.3 : 1 }}
                                type="number" min="0" max="25"
                                value={row[f] ?? ''}
                                disabled={!!absences[absSuffix(e.id)]}
                                onChange={ev => setScore('math', session, e.id, f, ev.target.value)} />
                            </td>
                          ))}
                          <td style={{ ...styles.tdCenterRead, ...totalStyle }}>{computed.total === '' ? '' : computed.total}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
                {elevesSession.length === 0 && (
                  <tr><td colSpan={isFr ? 12 : 10} style={styles.empty}>Aucun élève trouvé pour cette sélection.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        </>
      );
    };

    return (
      <div>
        <div style={styles.filtersRow}>
          <input
            value={resultatRecherche}
            onChange={(e) => setResultatRecherche(e.target.value)}
            placeholder="Rechercher un élève, une classe..."
            style={{ ...styles.searchInput, width: 280, flex: 'none' }}
          />
          {!showTrierNiveaux ? (
            <button
              type="button"
              onClick={() => setShowTrierNiveaux(true)}
              style={{ padding: '7px 14px', borderRadius: 17, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#94a3b8', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              Trier
            </button>
          ) : (
            <div className="chip-tabs" style={{ display: 'flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 }}>
              <button
                type="button"
                onClick={() => withResultatToggleGuard(() => { setResultatNiveau(''); setResultatClasseId(''); setResultatEleveId(''); setResultatEleveSearch(''); setShowTrierNiveaux(false); })}
                style={{ padding: '7px 16px', borderRadius: 17, border: 'none', background: !resultatNiveau ? '#6366f1' : 'transparent', color: !resultatNiveau ? 'white' : '#6d28d9', fontWeight: !resultatNiveau ? 700 : 600, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
              >
                Trier
              </button>
              {niveauxTabs.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => withResultatToggleGuard(() => { setResultatNiveau(n); setResultatClasseId(''); setResultatEleveId(''); setResultatEleveSearch(''); })}
                  style={{ padding: '7px 16px', borderRadius: 17, border: 'none', background: resultatNiveau === n ? '#6366f1' : 'transparent', color: resultatNiveau === n ? 'white' : '#6d28d9', fontWeight: resultatNiveau === n ? 700 : 600, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          {resultatVue === 'classe' && (
            <CustomSelect
              value={resultatClasseId}
              onChange={(v) => withResultatToggleGuard(() => setResultatClasseId(v))}
              options={classesNiveau.map(c => ({ value: String(c.id), label: c.nom }))}
              placeholder="Classe"
              allowClear={true}
              style={{ ...styles.select, width: 200 }}
            />
          )}
        </div>

        <div style={{...styles.filtersStack}}>
          <div className="chip-tabs" style={styles.pillGroup}>
            {/* Backup visuel conservé: option "Tous" */}
            {false && (
              <button onClick={() => withResultatToggleGuard(() => setResultatSession(''))}
                style={{ ...styles.pillBtn, ...(resultatSession === '' ? styles.pillBtnActif : {}) }}>
                Tous
              </button>
            )}
            {SESSIONS.map(s => (
              <button key={s} onClick={() => withResultatToggleGuard(() => setResultatSession(s))}
                style={{ ...styles.pillBtn, ...(resultatSession === s ? styles.pillBtnActif : {}) }}>
                {SESSION_LABEL[s] || s}
              </button>
            ))}
          </div>
          <div className="chip-tabs" style={styles.pillGroup}>
            {[['francais','Français'],['math','Math']].map(([val,label]) => (
              <button key={val} onClick={() => withResultatToggleGuard(() => setResultatMatiere(val))}
                style={{ ...styles.pillBtn, ...(resultatMatiere === val ? styles.pillBtnActif : {}) }}>{label}</button>
            ))}
          </div>
          <div className="chip-tabs" style={styles.pillGroup}>
            {[['individuelle','Élève'],['classe','Classe']].map(([val,label]) => (
              <button key={val} onClick={() => withResultatToggleGuard(() => { setResultatVue(val); if (val === 'individuelle') setResultatClasseId(''); else { setResultatEleveId(''); setResultatEleveSearch(''); } })}
                style={{ ...styles.pillBtn, ...(resultatVue === val ? styles.pillBtnActif : {}) }}>{label}</button>
            ))}
          </div>
        </div>

        {resultatVue === 'classe' && !resultatClasseId ? (
          <div style={styles.msgVide}>Sélectionnez une classe pour afficher les résultats.</div>
        ) : resultatSession === '' ? (
          renderTableTousSessions()
        ) : (
          sessionsAAfficher.map(session => (
            <div key={session} style={{marginBottom:24}}>
              {renderTableSession(session)}
            </div>
          ))
        )}
      </div>
    );
  };

  const setRoleProf = (poolId, demiId, profId, role) => {
    setAffectationDirty(true);
    setRolesAffectesByPoolDemi(prev => {
      const key = `${poolId}::${demiId}`;
      const cur = { ...(prev[key] || {}) };
      cur[String(profId)] = role;
      return { ...prev, [key]: cur };
    });
  };

  const setHoraireLigne = (poolId, demiId, ligne, start, end) => {
    setAffectationDirty(true);
    setOrganisationByPoolDemi(prev => {
      const key = `${poolId}::${demiId}`;
      const cur = { ...(prev[key] || {}) };
      cur[`horaire_${ligne}`] = { start, end };
      return { ...prev, [key]: cur };
    });
  };

  const setTagClasseBloc = (poolId, demiId, blocKey, tag, targetId) => {
    setAffectationDirty(true);
    setOrganisationByPoolDemi(prev => {
      const key = `${poolId}::${demiId}`;
      const cur = { ...(prev[key] || {}) };
      const bloc = { ...(cur[blocKey] || {}) };
      const value = targetId ? String(targetId) : '';
      bloc[tag] = value;
      if ((blocKey === 'ligne6' || blocKey === 'ligne7') && value) {
        // Une classe (ou un groupe) ne peut pas avoir Pause et CO en même temps.
        const autreTag = tag === 'Pause' ? 'CO' : 'Pause';
        if (bloc[autreTag] === value) bloc[autreTag] = '';
      }
      cur[blocKey] = bloc;
      return { ...prev, [key]: cur };
    });
  };

  const setRoleGroupClasse = (poolId, demiId, groupId, classeId) => {
    setAffectationDirty(true);
    setOrganisationByPoolDemi(prev => {
      const key = `${poolId}::${demiId}`;
      const cur = { ...(prev[key] || {}) };
      const demi = DEMI_JOURNEES.find(d => d.id === demiId);
      const classesDemi = demi ? (affectationClassesBySite?.[String(poolId)]?.[cellKeyAffectation(demi.jour, demi.moment)] || []) : [];
      const maxParGroupe = Math.max(1, Math.ceil(classesDemi.length / 2));
      const wasInG1 = (cur.groups?.g1 || []).map(String).includes(String(classeId));
      const wasInG2 = (cur.groups?.g2 || []).map(String).includes(String(classeId));
      const groups = {
        g1: [...(cur.groups?.g1 || [])].map(String),
        g2: [...(cur.groups?.g2 || [])].map(String),
      };
      groups.g1 = groups.g1.filter(id => String(id) !== String(classeId));
      groups.g2 = groups.g2.filter(id => String(id) !== String(classeId));
      const target = groupId === 'g2' ? 'g2' : 'g1';
      const already = target === 'g1' ? wasInG1 : wasInG2;
      if (already) {
        groups[target] = groups[target].filter(id => String(id) !== String(classeId));
      } else {
        let next = [...groups[target]];
        if (next.length >= maxParGroupe) {
          // Si la limite est atteinte, on remplace la dernière sélection.
          next = next.slice(0, Math.max(0, maxParGroupe - 1));
        }
        next = [...next, String(classeId)];
        // Limite de classes par groupe: moitié arrondie au supérieur.
        groups[target] = next;
      }
      cur.groups = groups;
      return { ...prev, [key]: cur };
    });
  };

  const renderRoles = ({ hideSiteTabs = false, extraHeader = null } = {}) => {
    const siteKey = String(siteActif || '');
    const demi = DEMI_JOURNEES.find(d => d.id === rolesDemiJourneeSelect);
    const selectedProfIds = siteKey ? (selectedBySite[siteKey] || []) : [];
    const reserveSet = new Set(
      demi
        ? selectedProfIds.filter((id) => statutCellule(siteKey, String(id), demi.jour, demi.moment) === 'rouge' && rActifCellule(siteKey, String(id), demi.jour, demi.moment))
        : []
    );
    const profsPool = selectedProfIds
      .map(id => profMap[String(id)])
      .filter(Boolean)
      .filter(p => !demi || statutCellule(siteKey, String(p.id), demi.jour, demi.moment) !== 'rouge' || rActifCellule(siteKey, String(p.id), demi.jour, demi.moment))
      .sort((a, b) => {
        const aReserve = reserveSet.has(String(a.id));
        const bReserve = reserveSet.has(String(b.id));
        if (aReserve !== bReserve) return aReserve ? 1 : -1;
        const aPrenom = String(a.prenom || '').toLowerCase();
        const bPrenom = String(b.prenom || '').toLowerCase();
        if (aPrenom !== bPrenom) return aPrenom.localeCompare(bPrenom, 'fr');
        return String(toDisplayNom(a.nom) || '').toLowerCase().localeCompare(String(toDisplayNom(b.nom) || '').toLowerCase(), 'fr');
      });
    const key = `${siteKey}::${rolesDemiJourneeSelect}`;
    const rolesMap = rolesAffectesByPoolDemi[key] || {};
    const poolIdsEdit = new Set(selectedProfIds.map(String));
    const org = organisationByPoolDemi[key] || {};
    const classesAffecteesDemi = demi ? (affectationClassesBySite?.[siteKey]?.[cellKeyAffectation(demi.jour, demi.moment)] || []) : [];
    const classesAffecteesObjs = classesAffecteesDemi
      .map(cid => classes.find(c => String(c.id) === String(cid)))
      .filter(Boolean);
    const useGroups = classesAffecteesObjs.length > 2;
    const savedGroups = {
      g1: (org.groups?.g1 || []).map(String).filter(cid => classesAffecteesDemi.includes(String(cid))),
      g2: (org.groups?.g2 || []).map(String).filter(cid => classesAffecteesDemi.includes(String(cid))),
    };
    const assignedSaved = new Set([...savedGroups.g1, ...savedGroups.g2]);
    const unassigned = classesAffecteesDemi.filter(cid => !assignedSaved.has(String(cid)));
    if (useGroups) {
      for (const cid of unassigned) {
        if (savedGroups.g1.length <= savedGroups.g2.length) savedGroups.g1.push(String(cid));
        else savedGroups.g2.push(String(cid));
      }
    }
    const classesColonnes = useGroups
      ? [
        {
          id: 'group:g1',
          nom: savedGroups.g1.map(cid => classes.find(c => String(c.id) === String(cid))?.nom).filter(Boolean).join(' + ') || 'Groupe 1',
          classIds: savedGroups.g1,
        },
        {
          id: 'group:g2',
          nom: savedGroups.g2.map(cid => classes.find(c => String(c.id) === String(cid))?.nom).filter(Boolean).join(' + ') || 'Groupe 2',
          classIds: savedGroups.g2,
        },
      ]
      : classesAffecteesObjs.map(cl => ({ id: String(cl.id), nom: cl.nom, classIds: [String(cl.id)] }));
    const defaultStart = demi
      ? (demi.moment === 'matin' ? getHoraireSite(siteKey, 'matinDebut') : getHoraireSite(siteKey, 'apresMidiDebut'))
      : '';
    const defaultStartMin = parseTimeToMinutes(defaultStart);
    const nbOralGroups = Math.max(classesAffecteesObjs.length, 2);
    const lignesOrg = getLignesOrganisation(nbOralGroups);
    const rolesColonne = getRolesColonne(nbOralGroups);
    const lignesHoraire = {};
    let cursor = defaultStartMin;
    lignesOrg.forEach((lg) => {
      const saved = org[`horaire_${lg.row}`];
      if (saved?.start || saved?.end) {
        lignesHoraire[lg.row] = { start: saved.start || '', end: saved.end || '' };
        if (saved.end) cursor = parseTimeToMinutes(saved.end);
      } else if (Number.isFinite(cursor) && lg.temps) {
        const start = minutesToTime(cursor);
        const end = minutesToTime(cursor + lg.temps);
        lignesHoraire[lg.row] = { start, end };
        cursor = cursor + lg.temps;
      } else {
        lignesHoraire[lg.row] = { start: '', end: '' };
      }
    });

    return (
      <div>
        {!hideSiteTabs && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ ...styles.pillGroup, display: 'inline-flex' }}>
              {siteOrder.map((sKey, idx) => (
                <button
                  key={`roles-site-tab-${sKey}`}
                  type="button"
                  onClick={() => { if (sKey !== siteActif) { setSiteActif(sKey); setRolesDemiJourneeSelect(''); } }}
                  style={{ ...styles.subTabBtn, ...(siteActif === sKey ? styles.subTabBtnActif : {}) }}
                >
                  {siteNames[sKey] || `Site ${idx + 1}`}
                </button>
              ))}
            </div>
            {extraHeader}
          </div>
        )}

        {/* Demi-journée + groupes */}
        <div style={{ marginTop: 15, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <CustomSelect
            value={rolesDemiJourneeSelect}
            onChange={(v) => setRolesDemiJourneeSelect(v)}
            options={DEMI_JOURNEES.map(d => ({ value: d.id, label: d.label }))}
            placeholder="Choisir une demi-journée"
            style={styles.select}
          />
          {rolesDemiJourneeSelect && (() => {
            const ROLE_MIN = Object.fromEntries([
              ['Appel', 1], ['Surveillance', 2], ['Accompagnement', 1],
              ...Array.from({ length: nbOralGroups }, (_, i) => [`Oral Groupe ${i + 1}`, 2]),
              ['Correction', 2],
            ]);
            const counts = {};
            Object.values(rolesMap).forEach(role => { if (role) counts[role] = (counts[role] || 0) + 1; });
            const complet = Object.entries(ROLE_MIN).every(([role, min]) => (counts[role] || 0) >= min);
            if (!complet) return null;
            return (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 999, padding: '6px 16px', fontWeight: 700, fontSize: 14 }}>
                ✓ Tous les rôles sont affectés
              </span>
            );
          })()}
          {useGroups && (
            <div style={styles.rolesTopRight}>
              <div style={styles.toggleWrap}>
                <button type="button" onClick={() => setRolesGroupActif('g1')} style={{ ...styles.toggleBtn, ...(rolesGroupActif === 'g1' ? styles.toggleBtnActif : {}) }}>Groupe 1</button>
                <button type="button" onClick={() => setRolesGroupActif('g2')} style={{ ...styles.toggleBtn, ...(rolesGroupActif === 'g2' ? styles.toggleBtnActif : {}) }}>Groupe 2</button>
              </div>
              <div style={{ ...styles.pastillesWrap, marginLeft: 2 }}>
                {classesAffecteesObjs.map((cl) => {
                  const actifDansG1 = savedGroups.g1.includes(String(cl.id));
                  const actifDansG2 = savedGroups.g2.includes(String(cl.id));
                  const actif = rolesGroupActif === 'g1' ? actifDansG1 : actifDansG2;
                  return (
                    <button key={`group-class-${cl.id}`} type="button"
                      onClick={() => setRoleGroupClasse(siteKey, rolesDemiJourneeSelect, rolesGroupActif, cl.id)}
                      style={{ ...styles.classChip, ...(actif ? styles.classChipActif : {}) }}>
                      {cl.nom}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {!siteKey || !rolesDemiJourneeSelect ? (
          <div style={styles.empty}>Sélectionnez un site et une demi-journée.</div>
        ) : demi && !isJourActifSite(siteKey, demi.jour) ? (
          <div style={styles.empty}>La demi-journée sélectionnée est inactive pour ce site.</div>
        ) : (
          <><div style={styles.rolesGrid}>
            <div style={{ ...styles.tableWrap, overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
              <table style={styles.tableRolesLeft}>
                <colgroup>
                  <col />
                  <col style={{ width: 190 }} />
                </colgroup>
                <thead>
                  <tr style={styles.thead}>
                    <th style={{ ...styles.thLeftFixed, width: 'auto', minWidth: 0, maxWidth: 'none', position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Professeurs</th>
                    <th style={{ ...styles.thLeftFixed, width: 190, minWidth: 190, maxWidth: 190, position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>Rôle</th>
                  </tr>
                </thead>
                <tbody>
                  {responsablesTCF.length === 0 && (
                    <tr><td colSpan={2} style={{ ...styles.tdLeft, color: '#94a3b8', fontSize: 12, fontStyle: 'italic', padding: '6px 10px' }}>
                      Aucun responsable (à configurer dans Paramètres → École)
                    </td></tr>
                  )}
                  {responsablesTCF.map((resp) => {
                    const selectedRole = rolesMap[String(resp.id)] || '';
                    return (
                      <tr key={`role-resp-${resp.id}`}>
                        <td style={{ ...styles.tdLeft, background: '#eef2ff', color: '#4338ca' }}>
                          <div style={styles.reserveCellWrap}>
                            <span>{resp.nom}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#4338ca' }}>Resp.</span>
                          </div>
                        </td>
                        <td style={{ ...styles.tdLeft, width: 190, minWidth: 190, maxWidth: 190, paddingRight: 8 }}>
                          <CustomSelect
                            value={selectedRole}
                            onChange={(v) => setRoleProf(siteKey, rolesDemiJourneeSelect, resp.id, v)}
                            options={rolesColonne.map(r => ({ value: r, label: r }))}
                            placeholder="—"
                            style={{ ...styles.selectRole, width: '100%' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {profsPool.map((p) => {
                    const selectedRole = rolesMap[String(p.id)] || '';
                    const isReserve = reserveSet.has(String(p.id));
                    return (
                      <tr key={`role-prof-${p.id}`}>
                        <td style={{ ...styles.tdLeft, ...(isReserve ? styles.tdReserve : {}) }}>
                          <div style={styles.reserveCellWrap}>
                            <span>{p.prenom} {toDisplayNom(p.nom)}</span>
                            {isReserve ? <span style={styles.reserveBadge}>Réserve</span> : null}
                          </div>
                        </td>
                        <td style={{ ...styles.tdLeft, width: 190, minWidth: 190, maxWidth: 190, paddingRight: 8 }}>
                          <CustomSelect
                            value={selectedRole}
                            onChange={(v) => {
                              const nextRole = v;
                              if (nextRole) {
                                const deja = Object.entries(rolesMap).filter(([pid, r]) => String(pid) !== String(p.id) && r === nextRole).length;
                                if (deja >= getRoleCap(nextRole)) return;
                              }
                              setRoleProf(siteKey, rolesDemiJourneeSelect, p.id, nextRole);
                            }}
                            options={rolesColonne.map((r) => {
                              const nb = Object.entries(rolesMap).filter(([pid, role]) => String(pid) !== String(p.id) && role === r).length;
                              const max = getRoleCap(r);
                              const disabled = nb >= max;
                              return { value: r, label: r, disabled };
                            })}
                            placeholder="—"
                            style={{ ...styles.selectRole, width: '100%' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ ...styles.tableWrap }}>
              <table style={styles.tableRolesRight}>
                <colgroup>
                  <col style={{ width: 116, minWidth: 116, maxWidth: 116 }} />
                  <col style={{ width: 72, minWidth: 72, maxWidth: 72 }} />
                  {classesColonnes.map((col) => <col key={`role-col-${col.id}`} style={{ width: 150, minWidth: 150, maxWidth: 150 }} />)}
                  <col style={{ width: 150, minWidth: 150, maxWidth: 150 }} />
                  <col style={{ width: 'auto' }} />
                </colgroup>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.thCenter}>Horaire</th>
                    <th style={styles.thCenter}>Temps</th>
                    {classesColonnes.map((cl, i) => <th key={`class-col-${i}`} style={styles.thCenter}>{cl.nom}</th>)}
                    <th style={styles.thCenter}>Rôle</th>
                    <th style={styles.thCenter}>Professeurs</th>
                  </tr>
                </thead>
                <tbody>
                  {lignesOrg.map((lg) => {
                    const estBlocAStart = lg.type === 'blocStart' && lg.bloc === 'blocA';
                    const estBlocAInner = lg.type === 'blocInner' && lg.bloc === 'blocA';
                    const estBlocBStart = lg.type === 'blocStart' && lg.bloc === 'blocB';
                    const estBlocBInner = lg.type === 'blocInner' && lg.bloc === 'blocB';
                    const isCorrection = lg.type === 'correction';
                    const afficherHoraireTemps = !(estBlocAInner || estBlocBInner);
                    const prevEnd = (() => {
                      if (lg.row <= 1) return lignesHoraire[lg.row]?.start || '';
                      for (let r = lg.row - 1; r >= 1; r--) {
                        if (lignesHoraire[r]?.end) return lignesHoraire[r].end;
                      }
                      return '';
                    })();
                    const startValue = lg.row === 1 ? (lignesHoraire[lg.row]?.start || '') : prevEnd;
                    return (
                      <tr key={`ligne-${lg.row}`}>
                        {afficherHoraireTemps && (
                          <td style={styles.tdCenter} rowSpan={estBlocAStart || estBlocBStart ? nbOralGroups + 1 : 1}>
                            <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                              <input
                                style={{ ...styles.select, width: 48, minWidth: 0, maxWidth: 48, boxSizing: 'border-box', padding: '4px 4px', fontSize: 12, textAlign: 'center' }}
                                value={startValue}
                                readOnly={lg.row > 1}
                                onChange={(e) => {
                                  if (lg.row > 1) return;
                                  setHoraireLigne(siteKey, rolesDemiJourneeSelect, lg.row, e.target.value, lignesHoraire[lg.row]?.end || '');
                                }}
                                placeholder="Début"
                              />
                              {isCorrection ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, fontSize: 12, color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: 4, background: '#f8fafc' }}>...</span>
                              ) : (
                                <input
                                  style={{ ...styles.select, width: 48, minWidth: 0, maxWidth: 48, boxSizing: 'border-box', padding: '4px 4px', fontSize: 12, textAlign: 'center' }}
                                  value={lignesHoraire[lg.row]?.end || ''}
                                  onChange={(e) => setHoraireLigne(siteKey, rolesDemiJourneeSelect, lg.row, startValue, e.target.value)}
                                  placeholder="Fin"
                                />
                              )}
                            </div>
                          </td>
                        )}
                        {afficherHoraireTemps && (
                          <td style={styles.tdCenterRead} rowSpan={estBlocAStart || estBlocBStart ? nbOralGroups + 1 : 1}>{lg.temps ? `${lg.temps}'` : ''}</td>
                        )}
                        {classesColonnes.map((cl) => {
                          if (lg.key === 'appel') return <td key={`${lg.row}-${cl.id}`} style={styles.tdCenterRead}>Appel et consignes</td>;
                          if (lg.key === 'surv1') return <td key={`${lg.row}-${cl.id}`} style={styles.tdCenterRead}>Préparation PO</td>;
                          if (estBlocAInner || estBlocBInner) return null;
                          if (estBlocAStart) {
                            const bloc = org.blocA || {};
                            return (
                              <td key={`${lg.row}-${cl.id}`} style={styles.tdCenter} rowSpan={nbOralGroups + 1}>
                                <div style={{ ...styles.pastillesWrap, justifyContent: 'center' }}>
                                  {['PE', 'PO', 'CE'].map(tag => {
                                    const selectedVal = String(bloc[tag] || '');
                                    const estDansCol = cl.classIds.includes(selectedVal) || selectedVal === cl.id;
                                    const valeurConnue = selectedVal && classesColonnes.some(col => col.classIds.includes(selectedVal) || selectedVal === col.id);
                                    const alreadyElsewhere = valeurConnue && !estDansCol;
                                    if (alreadyElsewhere) return null;
                                    const targetValue = cl.id;
                                    return (
                                      <button
                                        key={`${lg.row}-${cl.id}-${tag}`}
                                        type="button"
                                        onClick={() => setTagClasseBloc(siteKey, rolesDemiJourneeSelect, 'blocA', tag, estDansCol ? '' : targetValue)}
                                        style={{ ...styles.classChip, ...(estDansCol ? styles.classChipActif : {}) }}
                                      >
                                        {tag}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            );
                          }
                          if (lg.key === 'surv2' || lg.key === 'surv3') {
                            const bloc = org[`ligne${lg.row}`] || {};
                            return (
                              <td key={`${lg.row}-${cl.id}`} style={styles.tdCenter}>
                                <div style={{ ...styles.pastillesWrap, justifyContent: 'center' }}>
                                  {['Pause', 'CO'].map(tag => {
                                    const selectedVal = String(bloc[tag] || '');
                                    const estDansCol = cl.classIds.includes(selectedVal) || selectedVal === cl.id;
                                    const valeurConnue = selectedVal && classesColonnes.some(col => col.classIds.includes(selectedVal) || selectedVal === col.id);
                                    const alreadyElsewhere = valeurConnue && !estDansCol;
                                    if (alreadyElsewhere) return null;
                                    const autreTag = tag === 'Pause' ? 'CO' : 'Pause';
                                    const selectedAutre = String(bloc[autreTag] || '');
                                    const bloqueCarMemeClasse = selectedAutre && (cl.classIds.includes(selectedAutre) || selectedAutre === cl.id) && !estDansCol;
                                    const targetValue = cl.id;
                                    return (
                                      <button
                                        key={`${lg.row}-${cl.id}-${tag}`}
                                        type="button"
                                        disabled={bloqueCarMemeClasse}
                                        onClick={() => {
                                          if (bloqueCarMemeClasse) return;
                                          setTagClasseBloc(siteKey, rolesDemiJourneeSelect, `ligne${lg.row}`, tag, estDansCol ? '' : targetValue);
                                        }}
                                        style={{ ...styles.classChip, ...(estDansCol ? styles.classChipActif : {}), ...(bloqueCarMemeClasse ? styles.classChipDisabled : {}) }}
                                      >
                                        {tag}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            );
                          }
                          if (estBlocBStart) {
                            const bloc = org.blocB || {};
                            return (
                              <td key={`${lg.row}-${cl.id}`} style={styles.tdCenter} rowSpan={nbOralGroups + 1}>
                                <div style={{ ...styles.pastillesWrap, justifyContent: 'center' }}>
                                  {['PE', 'PO', 'CE'].map(tag => {
                                    const selectedVal = String(bloc[tag] || '');
                                    const estDansCol = cl.classIds.includes(selectedVal) || selectedVal === cl.id;
                                    const valeurConnue = selectedVal && classesColonnes.some(col => col.classIds.includes(selectedVal) || selectedVal === col.id);
                                    const alreadyElsewhere = valeurConnue && !estDansCol;
                                    if (alreadyElsewhere) return null;
                                    const targetValue = cl.id;
                                    return (
                                      <button
                                        key={`${lg.row}-${cl.id}-${tag}`}
                                        type="button"
                                        onClick={() => setTagClasseBloc(siteKey, rolesDemiJourneeSelect, 'blocB', tag, estDansCol ? '' : targetValue)}
                                        style={{ ...styles.classChip, ...(estDansCol ? styles.classChipActif : {}) }}
                                      >
                                        {tag}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            );
                          }
                          return <td key={`${lg.row}-${cl.id}`} style={styles.tdCenter}></td>;
                        })}
                        <td style={styles.tdCenterRead}>{lg.role}</td>
                        <td style={styles.tdLeft}>
                          <div style={styles.pastillesWrap}>
                            {Object.entries(rolesMap)
                              .filter(([pid, role]) => {
                                if (!role) return false;
                                const isResp = String(pid).startsWith('resp_');
                                if (!isResp && !poolIdsEdit.has(String(pid))) return false;
                                if (lg.role === 'Appel') return role === 'Appel';
                                if (lg.role.startsWith('Oral ')) return role === `Oral Groupe ${lg.role.split(' ')[1]}`;
                                if (lg.role === 'Accompagnement') return role === 'Accompagnement';
                                if (lg.role === 'Correction') return role === 'Correction';
                                if (lg.role === 'Surveillance') return role === 'Surveillance';
                                return false;
                              })
                              .map(([pid]) => {
                                const p = profMap[String(pid)] || responsablesTCF.find(r => r.id === pid);
                                if (!p) return null;
                                const oralPalette = [
                                  { bg: '#ede9fe', border: '#c4b5fd', color: '#4c1d95' },
                                  { bg: '#fce7f3', border: '#f9a8d4', color: '#831843' },
                                  { bg: '#d1fae5', border: '#6ee7b7', color: '#064e3b' },
                                  { bg: '#fef3c7', border: '#fcd34d', color: '#78350f' },
                                ];
                                const rc = (() => {
                                  if (lg.role === 'Appel') return { bg: '#dbeafe', border: '#93c5fd', color: '#1e3a8a' };
                                  if (lg.role === 'Surveillance') return { bg: '#fef9c3', border: '#fde047', color: '#713f12' };
                                  if (lg.role === 'Accompagnement') return { bg: '#dcfce7', border: '#86efac', color: '#14532d' };
                                  if (lg.role === 'Correction') return { bg: '#ffedd5', border: '#fdba74', color: '#7c2d12' };
                                  if (lg.role.startsWith('Oral ')) return oralPalette[(parseInt(lg.role.split(' ')[1]) - 1) % oralPalette.length] || {};
                                  return {};
                                })();
                                return <span key={`${lg.row}-prof-${pid}`} style={{ ...styles.profChip, background: rc.bg, border: `1px solid ${rc.border}`, color: rc.color }}>{p.prenom ? `${p.prenom} ${toDisplayNom(p.nom)}` : p.nom}</span>;
                              })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}
      </div>
    );
  };

  const buildChartSVG = (series, maxScore, isFr, options = {}) => {
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const splitPrenomNomAxis = (raw) => {
      const t = String(raw ?? '').trim();
      if (!t) return { prenom: '', nom: '' };
      const parts = t.split(/\s+/).filter(Boolean);
      if (parts.length === 1) return { prenom: '', nom: parts[0] };
      return { prenom: parts.slice(0, -1).join(' '), nom: parts[parts.length - 1] };
    };
    const showTrend = options.showTrend !== false;
    /** Par défaut affichés ; masqués seulement si hideTrendPoints === true (évite ambiguïtés avec undefined) */
    const showTrendPoints = options.hideTrendPoints !== true;
    const niveau = normaliserNiveau(options.niveau || '');
    const singleSeries = options.singleSeries === true;
    const label1 = options.label1 || (isFr ? 'Oral' : (singleSeries ? 'Total' : 'Base'));
    const label2 = options.label2 || (isFr ? 'Écrit' : (singleSeries ? '' : 'Avancé'));

    const wide = options.chartWide === true;
    const printLayout = options.printLayout === true;
    const verticalXLabels = options.verticalXLabels === true;
    const innerH = Number(options.innerH) > 0
      ? Number(options.innerH)
      : (wide ? 340 : 230);
    let padL = wide ? 54 : 48;
    const padT = options.fitContainer ? 5 : 10;
    let padB = options.fitContainer ? 52 : 70;
    if (verticalXLabels) padB = Math.max(padB, options.fitContainer ? 118 : 125);
    const legendW = wide ? 140 : 130;
    const nSer = Math.max(series.length, 1);
    let barW = wide ? 62 : 52;
    let groupW = wide ? 220 : 180;
    if (printLayout && !wide && nSer >= 1) {
      const budget = Number(options.printBarWidthBudget) > 0 ? Number(options.printBarWidthBudget) : 520;
      groupW = Math.max(34, Math.min(96, Math.floor(budget / Math.max(nSer, 1))));
      barW = Math.max(8, Math.floor((groupW - 14) / 2));
    }
    const fitMinSlots = options.fitContainer
      ? Math.max(1, Number(options.fitMinSlots) > 0 ? Number(options.fitMinSlots) : (printLayout ? nSer : 6))
      : nSer;
    const slotCount = options.fitContainer ? Math.max(nSer, fitMinSlots) : nSer;

    const marks = Array.isArray(options.levelMarks) ? options.levelMarks : [];
    if (marks.length && !wide) padL = Math.max(padL, 58);
    const chartW = Math.max(groupW * slotCount, 240);
    const svgW = padL + chartW + legendW + 24;
    const svgH = padT + innerH + padB;
    const chartLeft = padL;
    const chartRight = padL + chartW;
    const chartBottom = padT + innerH;
    const barOffsetX = options.fitContainer && series.length > 0
      ? chartLeft + Math.max(0, (chartW - groupW * series.length) / 2)
      : chartLeft;
    const parts = [];

    const axisMax = Number(options.axisMax) > 0 ? Number(options.axisMax) : maxScore;
    const yFromValue = (v) => chartBottom - (Math.max(0, Math.min(axisMax, Number(v) || 0)) / axisMax) * innerH;

    // Grille (tous les 5 points) sans numérotation 0/10/20...
    const marksByValue = new Map(marks.map((m) => [Number(m.v), m]));
    for (let v = 0; v <= axisMax; v += 5) {
      const y = yFromValue(v);
      const isMajor = v % 10 === 0;
      const isMarked = marksByValue.has(v);
      parts.push(`<line x1="${chartLeft}" y1="${y}" x2="${chartRight}" y2="${y}" stroke="#e5e7eb" stroke-width="${isMarked ? 2.2 : (isMajor ? 1.2 : 1)}" />`);
    }
    marks.forEach((m) => {
      const y = yFromValue(m.v);
      const lx = Math.max(12, chartLeft - (printLayout ? 12 : 10));
      parts.push(`<text x="${lx}" y="${y + 4}" text-anchor="end" font-size="12" fill="#334155" font-weight="${m.bold ? '800' : '700'}">${esc(m.label)}</text>`);
    });

    // Axes
    parts.push(`<line x1="${chartLeft}" y1="${chartBottom}" x2="${chartRight}" y2="${chartBottom}" stroke="#94a3b8" stroke-width="1.5"/>`);
    parts.push(`<line x1="${chartLeft}" y1="${padT}" x2="${chartLeft}" y2="${chartBottom}" stroke="#94a3b8" stroke-width="1.5"/>`);

    // Barres + valeurs
    series.forEach((s, i) => {
      const baseX = barOffsetX + i * groupW + (groupW - (barW * 2 + 8)) / 2;
      const h1 = Math.max(2, ((Number(s.v1) || 0) / axisMax) * innerH);
      const h2 = Math.max(2, ((Number(s.v2) || 0) / axisMax) * innerH);
      const y1 = chartBottom - h1;
      const y2 = chartBottom - h2;
      if (singleSeries) {
        const oneBarW = Math.min(groupW - 18, wide ? 94 : 84);
        const oneBarX = barOffsetX + i * groupW + (groupW - oneBarW) / 2;
        parts.push(`<rect x="${oneBarX}" y="${y1}" width="${oneBarW}" height="${h1}" fill="#6366f1" rx="4"/>`);
      } else {
        parts.push(`<rect x="${baseX}" y="${y1}" width="${barW}" height="${h1}" fill="#60a5fa" rx="4"/>`);
        parts.push(`<rect x="${baseX + barW + 8}" y="${y2}" width="${barW}" height="${h2}" fill="#34d399" rx="4"/>`);
      }
      if (showTrendPoints) {
        if (singleSeries) {
          const oneBarW = Math.min(groupW - 18, wide ? 94 : 84);
          const oneBarX = barOffsetX + i * groupW + (groupW - oneBarW) / 2;
          parts.push(`<text x="${oneBarX + oneBarW / 2}" y="${chartBottom - 8}" text-anchor="middle" font-size="13" fill="#ffffff" font-weight="800">${Number(s.v1) || 0}</text>`);
        } else {
          parts.push(`<text x="${baseX + barW / 2}" y="${chartBottom - 8}" text-anchor="middle" font-size="13" fill="#ffffff" font-weight="800">${Number(s.v1) || 0}</text>`);
          parts.push(`<text x="${baseX + barW + 8 + barW / 2}" y="${chartBottom - 8}" text-anchor="middle" font-size="13" fill="#ffffff" font-weight="800">${Number(s.v2) || 0}</text>`);
        }
      }
      const labelX = singleSeries
        ? (barOffsetX + i * groupW + groupW / 2)
        : (baseX + barW + 4);
      const rawLabel = s.label || s.session || '';
      if (verticalXLabels) {
        const { prenom: pAx, nom: nAx } = splitPrenomNomAxis(rawLabel);
        const labelAnchorY = chartBottom + (printLayout ? 96 : 88);
        const fs = printLayout && nSer > 10 ? 9 : 10;
        parts.push(`<g transform="translate(${labelX},${labelAnchorY}) rotate(-90)">`);
        if (pAx) parts.push(`<text x="0" y="${nAx ? -5 : 0}" text-anchor="middle" font-size="${fs}" fill="#334155">${esc(pAx)}</text>`);
        if (nAx) parts.push(`<text x="0" y="${pAx ? 9 : 0}" text-anchor="middle" font-size="${fs}" fill="#334155" font-weight="700">${esc(nAx)}</text>`);
        parts.push('</g>');
      } else {
        parts.push(`<text x="${labelX}" y="${chartBottom + 18}" text-anchor="middle" font-size="11" fill="#334155">${esc(rawLabel)}</text>`);
      }
    });

    // Ligne d'évolution
    if (showTrend && series.length > 1) {
      const pts = series.map((s, i) => {
        const moy = singleSeries ? Number(s.v1 || 0) : ((Number(s.v1 || 0) + Number(s.v2 || 0)) / 2);
        const total = singleSeries ? Number(s.v1 || 0) : (Number(s.v1 || 0) + Number(s.v2 || 0));
        const x = barOffsetX + i * groupW + groupW / 2;
        const y = yFromValue(moy);
        return { x, y, moy, total };
      });
      parts.push(`<polyline fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="6,3" points="${pts.map(p => `${p.x},${p.y}`).join(' ')}"/>`);
      if (showTrendPoints) {
        pts.forEach((p) => {
          parts.push(`<circle cx="${p.x}" cy="${p.y}" r="5" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5"/>`);
          parts.push(`<text x="${p.x}" y="${p.y - 8}" text-anchor="middle" font-size="11" fill="#92400e" font-weight="700">${p.total}</text>`);
        });
      }
    }

    // Légendes à droite, alignées en bas du cadre
    const lx = chartRight + 18;
    const ly = chartBottom - 64;
    if (singleSeries) {
      parts.push(`<rect x="${lx}" y="${ly}" width="15" height="15" fill="#6366f1" rx="2"/>`);
      parts.push(`<text x="${lx + 22}" y="${ly + 11}" font-size="12" fill="#334155" font-weight="700">${label1}</text>`);
    } else {
      parts.push(`<rect x="${lx}" y="${ly}" width="15" height="15" fill="#60a5fa" rx="2"/>`);
      parts.push(`<text x="${lx + 22}" y="${ly + 11}" font-size="12" fill="#334155" font-weight="700">${label1}</text>`);
      parts.push(`<rect x="${lx}" y="${ly + 28}" width="15" height="15" fill="#34d399" rx="2"/>`);
      parts.push(`<text x="${lx + 22}" y="${ly + 39}" font-size="12" fill="#334155" font-weight="700">${label2}</text>`);
    }
    if (showTrend && series.length > 1) {
      parts.push(`<line x1="${lx}" y1="${ly + 58}" x2="${lx + 18}" y2="${ly + 58}" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="5,3"/>`);
      if (showTrendPoints) {
        parts.push(`<circle cx="${lx + 9}" cy="${ly + 58}" r="3.5" fill="#f59e0b"/>`);
      }
      parts.push(`<text x="${lx + 22}" y="${ly + 62}" font-size="12" fill="#334155" font-weight="700">Évolution</text>`);
    }

    const responsiveSvg = wide || options.fitContainer === true;
    const scrollPlotHorizontal = options.scrollPlotHorizontal === true;
    const expandVerticalFill = options.expandVerticalFill === true;
    const svgWidthAttr = scrollPlotHorizontal ? '' : ' width="100%"';
    let svgStyle;
    if (scrollPlotHorizontal) {
      svgStyle = 'height:100%;width:auto;max-height:100%;display:block;flex-shrink:0';
    } else if (expandVerticalFill) {
      svgStyle = 'max-width:100%;max-height:100%;width:100%;height:100%;display:block';
    } else {
      svgStyle = 'max-width:100%;max-height:100%;height:auto;display:block';
    }
    const svgAttrs = responsiveSvg
      ? ` xmlns="http://www.w3.org/2000/svg"${svgWidthAttr} viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet" style="${svgStyle}"`
      : ` xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}"`;
    return `<svg${svgAttrs}>${parts.join('')}</svg>`;
  };

  const convocationRef = useRef(null);
  const tableConvocationRef = useRef(null);

  const getClasseJourHoraire = (siteKey, classeId) => {
    for (const j of JOURS) {
      for (const m of MOMENTS) {
        const classesCell = getAffectationClassesSite(siteKey, j, m.id);
        if (classesCell.map(String).includes(String(classeId))) {
          const debut = getHoraireSite(siteKey, m.id === 'matin' ? 'matinDebut' : 'apresMidiDebut');
          const fin = getHoraireSite(siteKey, m.id === 'matin' ? 'matinFin' : 'apresMidiFin');
          return { jour: j, horaire: `${debut} – ${fin}` };
        }
      }
    }
    return null;
  };

  const convocPrintCSS = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif; background: white; color: #1e293b; }
    @page { size: A4 portrait; margin: 15mm 20mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    div { overflow: visible !important; }
    table { border-collapse: collapse; width: 100% !important; table-layout: fixed; min-width: 0 !important; }
    .moment-label-col { width: 28px !important; min-width: 28px !important; max-width: 28px !important; }
    th, td { padding: 4px 6px; font-size: 10pt !important; word-break: break-word; overflow: visible !important; text-align: center; }
    .moment-label-cell { width: 28px !important; min-width: 28px !important; max-width: 28px !important; padding: 4px 2px !important; font-size: 10pt !important; }
    th *, td * { font-size: 10pt !important; }
    td { border: 1px solid #e2e8f0; }
    thead tr { background: #6366f1 !important; color: white !important; }
    thead th { background: #6366f1 !important; color: white !important; border: 1px solid #4338ca !important; }
    p { font-size: 10pt !important; text-align: justify !important; margin-bottom: 8pt !important; }
    .conv-entete, .conv-entete * { font-size: 6pt !important; }
    .conv-footer { font-size: 6pt !important; position: fixed; bottom: 0; left: 0; right: 0; width: 100%; }
    .conv-footer * { font-size: 6pt !important; }
    .conv-titre { font-size: 17pt !important; margin-top: 25pt !important; margin-bottom: 35pt !important; }
    .conv-entete .conv-scai { font-size: 17pt !important; }
    .conv-date { font-size: 10pt !important; }
    .conv-direction { margin-top: 0 !important; text-align: right !important; padding-right: 50px !important; }
  `;

  const buildGeneralTableHtml = (siteKey) => {
    const dateDebut = affectationDateDebutBySite?.[siteKey] || '';
    const getDateJour = (idx) => {
      if (!dateDebut) return '';
      const d = new Date(dateDebut);
      d.setDate(d.getDate() + idx);
      return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
    };
    const joursActifs = JOURS.filter(j => isJourActifSite(siteKey, j));
    return MOMENTS.map(moment => {
      const headerCells = joursActifs.map(j => {
        const date = getDateJour(JOURS.indexOf(j));
        const classesCell = getAffectationClassesSite(siteKey, j, moment.id);
        const eff = classesCell.reduce((acc, cid) => acc + eleves.filter(e => String(e.classe_id) === String(cid)).length, 0);
        return `<td style="background:#f8fafc;color:#64748b;font-size:9pt;padding:5px 8px;border:1px solid #e2e8f0;text-align:center">
          ${eff > 0 ? `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:50%;background:#eef2ff;color:#4338ca;font-size:8pt;font-weight:700;border:1px solid #a5b4fc;margin-right:4px">${eff}</span>` : ''}
          ${escapeHtml(j)}${date ? ` - ${date}` : ''}
        </td>`;
      }).join('');
      const dataCells = joursActifs.map(j => {
        const classesCell = getAffectationClassesSite(siteKey, j, moment.id);
        const chips = classesCell.map(cid => {
          const cl = classes.find(c => String(c.id) === String(cid));
          return `<span style="display:inline-block;border:1px solid #a5b4fc;background:#eef2ff;color:#4338ca;border-radius:999px;padding:2px 6px;font-size:9pt;font-weight:700;margin:1px">${escapeHtml(cl?.nom || String(cid))}</span>`;
        }).join('');
        return `<td style="border:1px solid #e2e8f0;padding:6px 8px;text-align:center;height:60px;vertical-align:middle">${chips || '<span style="color:#cbd5e1">—</span>'}</td>`;
      }).join('');
      return `<table style="width:100%;border-collapse:collapse;margin-bottom:10px">
        <colgroup><col style="width:28px">${joursActifs.map(() => '<col>').join('')}</colgroup>
        <tbody>
          <tr>
            <td rowspan="2" style="background:#eef2ff;color:#4338ca;font-weight:700;font-size:8pt;padding:4px 2px;border:1px solid #a5b4fc;text-align:center;vertical-align:middle;width:28px">
              <span style="writing-mode:vertical-rl;transform:rotate(180deg);display:inline-block">${escapeHtml(moment.label)}</span>
            </td>
            ${headerCells}
          </tr>
          <tr>${dataCells}</tr>
        </tbody>
      </table>`;
    }).join('');
  };

  const buildConvocationPage = (classeId, siteKey) => {
    const cl = classes.find(c => String(c.id) === String(classeId));
    const aff = getClasseJourHoraire(siteKey, classeId);
    const nom = cl?.nom || '—';
    const lieu = siteNames[siteKey] || siteKey;
    const jour = aff?.jour || '—';
    const horaire = aff?.horaire || '—';
    const dateVetroz = new Date().toLocaleDateString('fr-CH');
    const publicBase = `${window.location.origin}${process.env.PUBLIC_URL || ''}`;
    const tableHtml = tableConvocationRef.current?.innerHTML || '';
    return `
      <div>
        <div class="conv-entete" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px;padding-bottom:14px;">
          <div style="display:flex;align-items:flex-start;gap:10px;">
            <img src="${publicBase}/logo-etat-du-valais.png" style="width:38px;" onerror="this.style.display='none'" />
            <div><div>Département de la santé, des affaires sociales et de la culture</div><div>Service de l'action sociale</div><div>Office de l'asile</div><div>Centre de formation "Le Botza"</div></div>
          </div>
          <div style="text-align:right;">
            <div class="conv-scai" style="font-size:26px;font-weight:800;line-height:1;color:#1e293b;">SCAI</div>
            <div style="font-size:12px;font-weight:700;color:#374151;">${anneeScolaire || '—'}</div>
            <div style="font-size:10px;font-weight:700;color:#475569;">CLASSES D'ACCUEIL</div>
          </div>
        </div>
        <div class="conv-titre" style="text-align:center;font-weight:700;font-size:25px;letter-spacing:1px;text-transform:uppercase;margin-bottom:40px;margin-top:60px;color:#0f172a;">
          Convocation<br>Test de connaissance du français
        </div>
        <div class="conv-date" style="text-align:right;margin-bottom:40px;">Vétroz, le ${dateVetroz}</div>
        <div>
          <p>Madame, Monsieur,</p>
          <p>Nous vous informons que vous êtes convoqué(e) au <strong>test de connaissance du français</strong>. Ce test évalue vos compétences linguistiques.</p>
          <p>Horaire matin : <strong>${escapeHtml(getHoraireSite(siteKey, 'matinDebut'))} – ${escapeHtml(getHoraireSite(siteKey, 'matinFin'))}</strong> &bull; Horaire après-midi : <strong>${escapeHtml(getHoraireSite(siteKey, 'apresMidiDebut'))} – ${escapeHtml(getHoraireSite(siteKey, 'apresMidiFin'))}</strong></p>
          ${classeId
            ? `<p>Classe : <strong>${escapeHtml(nom)}</strong>&emsp;Lieu : <strong>${escapeHtml(lieu)}</strong>&emsp;Jour : <strong>${escapeHtml(jour)}</strong>&emsp;Horaire : <strong>${escapeHtml(horaire)}</strong></p>`
            : `<div style="margin-top:20px;margin-bottom:20px">${buildGeneralTableHtml(siteKey)}</div>`
          }
          <div style="margin-bottom:25px"></div>
          <p style="font-weight:700;font-size:12pt !important;">Informations importantes</p>
          <p>Vous êtes convoqué(e) <strong>uniquement à la demi-journée correspondant à votre classe</strong>, telle qu'elle figure sur le planning ci-dessus. Veuillez vous présenter à l'heure indiquée — <strong>toute arrivée tardive ne pourra être tolérée</strong>.</p>
          <p><strong>Aucun rattrapage ne sera organisé</strong> en cas d'absence ou de maladie le jour du test.</p>
          <p>Nous comptons sur votre ponctualité et votre sérieux pour le bon déroulement de cette évaluation. Pour toute question, n'hésitez pas à vous adresser à votre responsable de classe ou à l'administration du centre.</p>
          <p style="margin-top:24px;">Cordialement,</p>
          <p class="conv-direction">La direction</p>
        </div>
        <div class="conv-footer" style="display:flex;align-items:center;gap:12px;margin-top:28px;padding-top:10px;">
          <img src="${publicBase}/logo-pied-page.png" style="height:30px;object-fit:contain;" onerror="this.style.display='none'" />
          <span>Zone Industrielle 4, 1963 Vétroz<br>Tél. 027 606 18 60</span>
        </div>
      </div>`;
  };

  const printConvocation = () => {
    const sitePlan = planningsSite || siteOrder[0] || '';
    const siteNom = (siteNames[sitePlan] || sitePlan).toUpperCase().replace(/\s+/g, '_');
    const filename = `${siteNom}_Convocation_classe`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${filename}</title><style>${convocPrintCSS}</style></head><body>${buildConvocationPage(classeConvocation, sitePlan)}</body></html>`;
    const finalHtml = injectForcedPrintCss(html, 'A4 portrait', '15mm 20mm');
    openPrintPopup(finalHtml, { title: filename, width: 1100, height: 820 });
  };

  const printAllConvocations = () => {
    const sitePlan = planningsSite || siteOrder[0] || '';
    const classesSite = classesEligiblesSite[sitePlan] || [];
    if (!classesSite.length) return;
    const pages = classesSite.map((cl, i) =>
      `<div style="${i < classesSite.length - 1 ? 'page-break-after:always' : ''}">${buildConvocationPage(cl.id, sitePlan)}</div>`
    );
    const siteNom = (siteNames[sitePlan] || sitePlan).toUpperCase().replace(/\s+/g, '_');
    const filename = `${siteNom}_Convocation_classe`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${filename}</title><style>${convocPrintCSS}</style></head><body>${pages.join('')}</body></html>`;
    const finalHtml = injectForcedPrintCss(html, 'A4 portrait', '15mm 20mm');
    openPrintPopup(finalHtml, { title: filename, width: 1100, height: 820 });
  };

  const buildProfPlanningPage = (siteKey, publicBase) => {
    const joursActifs = JOURS.filter(j => isJourActifSite(siteKey, j));
    const getDateStr = (jour) => {
      if (!affectationDateDebutBySite?.[siteKey]) return '';
      const dt = new Date(affectationDateDebutBySite[siteKey]);
      dt.setDate(dt.getDate() + JOURS.indexOf(jour));
      return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}`;
    };
    const poolIds = (selectedBySite[siteKey] || []).map(id => String(id));
    const getProfNom = (pid) => {
      const p = profMap[String(pid)];
      if (!p) return '';
      return p.prenom ? `${p.prenom} ${toDisplayNom(p.nom) || ''}`.trim() : p.nom;
    };
    const isReserveCellule = (pid, jour, moment) =>
      statutCellule(siteKey, pid, jour, moment) === 'rouge' && rActifCellule(siteKey, pid, jour, moment);
    const getCellProfs = (jour, moment) => {
      const sortByPrenom = (a, b) => (profMap[a]?.prenom || '').localeCompare(profMap[b]?.prenom || '', 'fr');
      const reserves = poolIds.filter(pid => isReserveCellule(pid, jour, moment)).sort(sortByPrenom).map(pid => getProfNom(pid)).filter(Boolean);
      const regular = poolIds.filter(pid => statutCellule(siteKey, pid, jour, moment) === 'vert').sort(sortByPrenom).map(pid => getProfNom(pid)).filter(Boolean);
      return { regular, reserves };
    };
    const getEffectif = (jour, moment) =>
      poolIds.filter(pid => statutCellule(siteKey, pid, jour, moment) === 'vert').length;
    const nCols = joursActifs.length;
    const colPct = nCols > 0 ? `${((100 - 3) / nCols).toFixed(2)}%` : 'auto';
    const colgroup = `<colgroup><col style="width:28px">${joursActifs.map(() => `<col style="width:${colPct}">`).join('')}</colgroup>`;
    const maxRegular = Math.max(0, ...['matin', 'apresMidi'].flatMap(m => joursActifs.map(j => getCellProfs(j, m).regular.length)));
    const compact = maxRegular > 12;
    const nameFontSize = compact ? '7pt' : '9pt';
    const lineHeight = compact ? '1.3' : '1.4';
    const cellPad = compact ? '3px 5px' : '5px 7px';
    const tableMb = compact ? '8px' : '14px';
    const buildTable = (moment) => {
      const label = moment === 'matin' ? 'Matin' : 'Après-midi';
      const headerCells = joursActifs.map(j => {
        const eff = getEffectif(j, moment);
        const date = getDateStr(j);
        return `<td style="background:#f8fafc;color:#64748b;font-size:9pt;padding:4px 6px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center">
          <div style="display:flex;align-items:center;justify-content:center;gap:5px">
            ${eff > 0 ? `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:50%;background:#eef2ff;color:#4338ca;font-size:8pt;font-weight:700;border:1px solid #a5b4fc;flex-shrink:0">${eff}</span>` : ''}
            <span>${escapeHtml(j)}${date ? ` - ${date}` : ''}</span>
          </div>
        </td>`;
      }).join('');
      const regularCells = joursActifs.map(j => {
        const { regular } = getCellProfs(j, moment);
        const html = regular.map(nom => `<div style="color:#1e293b;font-size:${nameFontSize};font-weight:400;line-height:${lineHeight};text-align:left">${escapeHtml(nom)}</div>`).join('');
        return `<td style="vertical-align:top;text-align:left;border:1px solid #e2e8f0;padding:${cellPad}">${html}</td>`;
      }).join('');
      const reserveCells = joursActifs.map(j => {
        const { reserves } = getCellProfs(j, moment);
        const html = reserves.length > 0
          ? `<div style="color:#1e293b;font-size:${nameFontSize};font-weight:700;line-height:${lineHeight};text-align:left">Réserve</div>${reserves.map(nom => `<div style="color:#1e293b;font-size:${nameFontSize};font-weight:400;line-height:${lineHeight};text-align:left">${escapeHtml(nom)}</div>`).join('')}`
          : '';
        return `<td style="vertical-align:top;text-align:left;border:1px solid #e2e8f0;border-top:1px solid #e2e8f0;padding:${cellPad}">${html}</td>`;
      }).join('');
      return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:${tableMb}">
        ${colgroup}
        <tbody>
          <tr>
            <td rowspan="3" style="background:#eef2ff;color:#4338ca;font-weight:700;font-size:8pt;padding:4px 2px;border:1px solid #a5b4fc;text-align:center;vertical-align:middle;width:28px">
              <span style="writing-mode:vertical-rl;transform:rotate(180deg);display:inline-block">${label}</span>
            </td>
            ${headerCells}
          </tr>
          <tr>${regularCells}</tr>
          <tr>${reserveCells}</tr>
        </tbody>
      </table>`;
    };
    const logoUrl = `${publicBase}/logo-etat-du-valais.png`;
    const logoPiedUrl = `${publicBase}/logo-pied-page.png`;
    const nomSite = escapeHtml(siteNames[siteKey] || siteKey);
    const horaireMatin = `${getHoraireSite(siteKey, 'matinDebutProf')} – ${getHoraireSite(siteKey, 'matinFinProf')}`;
    const horaireAM = `${getHoraireSite(siteKey, 'apresMidiDebutProf')} – ${getHoraireSite(siteKey, 'apresMidiFinProf')}`;
    const headerHtml = `
      <div class="page-header">
        <div class="header-left">
          <img class="header-logo" src="${logoUrl}" onerror="this.style.display='none'" />
          <div class="header-admin">
            <div>DÉPARTEMENT DE LA SANTÉ, DES AFFAIRES SOCIALES ET DE LA CULTURE</div>
            <div>Service de l'action sociale</div>
            <div>Office de l'asile</div>
            <div>Centre de formation "Le Botza"</div>
          </div>
        </div>
        <div class="header-right">
          <div class="header-scai">SCAI</div>
          <div class="header-year">${escapeHtml(anneeScolaire || '—')}</div>
          <div class="header-sub">CLASSES D'ACCUEIL</div>
        </div>
      </div>`;
    const footerHtml = `
      <div class="page-footer">
        <img class="footer-logo" src="${logoPiedUrl}" onerror="this.style.display='none'" />
        <div class="footer-text"><div>Zone Industrielle 4, 1963 Vétroz</div><div>Tél. 027 606 18 60</div></div>
      </div>`;
    return `
    <div class="page">
      ${headerHtml}
      <div class="page-title">Répartition des professeurs</div>
      <div style="text-align:right;font-size:11pt;color:#1e293b;margin-bottom:${compact ? '12px' : '30px'}">Vétroz, le ${new Date().toLocaleDateString('fr-CH')}</div>
      <p style="margin:0 0 4px">Lieu : <strong>${nomSite}</strong></p>
      <p style="margin:0 0 ${compact ? '8px' : '16px'}">Horaire matin : <strong>${escapeHtml(horaireMatin)}</strong>&emsp;&bull;&emsp;Horaire après-midi : <strong>${escapeHtml(horaireAM)}</strong></p>
      ${buildTable('matin')}
      ${buildTable('apresMidi')}
      <div style="page-break-before:always;margin-top:28px">
        <p style="font-weight:700;font-size:11pt;margin:0 0 8px">Information importante</p>
        <p style="margin:0 0 10px;font-size:10pt;text-align:justify">Les professeurs listés en bas de chaque colonne sous la mention <strong>Réserve</strong> sont désignés comme professeurs de réserve. À ce titre, ils sont tenus de se libérer impérativement lors de la demi-journée pour laquelle ils sont inscrits en réserve, afin de pouvoir intervenir en remplacement d'un collègue absent ou empêché.</p>
        <p style="margin:0 0 24px;font-size:10pt;text-align:justify">Nous comptons sur votre engagement et votre sens des responsabilités pour garantir le bon déroulement du test dans les meilleures conditions.</p>
        <p style="margin:0 0 4px;font-size:10pt">Cordialement,</p>
        <p style="font-weight:700;margin-top:50px;padding-right:2cm;text-align:right;font-size:10pt">La direction</p>
      </div>
      ${footerHtml}
    </div>`;
  };

  const printProfPlanning = () => {
    const sitePlan = planningsSite || siteOrder[0] || '';
    const publicBase = `${window.location.origin}${process.env.PUBLIC_URL || ''}`;
    const siteNom = (siteNames[sitePlan] || sitePlan).toUpperCase().replace(/\s+/g, '_');
    const filename = `${siteNom}_Répartition_prof`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${filename}</title><style>${rolesPrintCSS}</style></head><body>${buildProfPlanningPage(sitePlan, publicBase)}</body></html>`;
    const finalHtml = injectForcedPrintCss(html, 'A4 portrait', '10mm');
    openPrintPopup(finalHtml, { title: filename, width: 1200, height: 820 });
  };

  const printAllProfPlannings = () => {
    const publicBase = `${window.location.origin}${process.env.PUBLIC_URL || ''}`;
    const pages = siteOrder.map(sk => buildProfPlanningPage(sk, publicBase));
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Repartition_tous_sites</title><style>${rolesPrintCSS}</style></head><body>${pages.join('')}</body></html>`;
    const finalHtml = injectForcedPrintCss(html, 'A4 portrait', '10mm');
    openPrintPopup(finalHtml, { title: 'Repartition_tous_sites', width: 1200, height: 820 });
  };

  const rolesPrintCSS = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif; background: white; color: #1e293b; }
    @page { size: A4 portrait; margin: 10mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; padding-bottom: 14px; }
    .header-left { display: flex; align-items: flex-start; gap: 10px; }
    .header-logo { width: 38px; height: auto; object-fit: contain; }
    .header-admin { font-size: 8pt; color: #334155; line-height: 1.5; }
    .header-right { text-align: right; }
    .header-scai { font-size: 17pt; font-weight: 800; color: #1e293b; line-height: 1; }
    .header-year { font-size: 10pt; font-weight: 700; color: #374151; margin-top: 2px; }
    .header-sub { font-size: 8pt; font-weight: 700; color: #475569; margin-top: 2px; }
    .page-title { font-size: 17pt; font-weight: 700; color: #0f172a; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin-top: 40px; margin-bottom: 30px; }
    .page-date-line { font-size: 13pt; font-weight: 400; text-transform: none; letter-spacing: 0; display: block; margin-top: 6px; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #6366f1 !important; color: white !important; padding: 6px 8px; font-size: 10pt; text-align: center; border-bottom: 2px solid #4338ca !important; }
    td { padding: 5px 8px; font-size: 10pt; border: 1px solid #e2e8f0; vertical-align: middle; }
    th { border: 1px solid #4338ca !important; }
    td.tc { text-align: center; }
    td.tl { text-align: left; }
    .chip { display: inline-block; background: #eef2ff; color: #3730a3; border-radius: 10px; padding: 2px 8px; font-size: 9pt; margin: 1px; border: 1px solid #c7d2fe; }
    .chip-green { display: inline-block; background: #dcfce7; color: #166534; border-radius: 10px; padding: 2px 8px; font-size: 9pt; margin: 1px; border: 1px solid #bbf7d0; }
    .chip-tag { display: inline-block; background: #6366f1; color: white; border-radius: 10px; padding: 2px 8px; font-size: 9pt; margin: 1px; border: 1px solid #6366f1; }
    .time { display: inline-block; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px 5px; font-size: 9pt; margin: 1px; }
    .page-footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; gap: 12px; padding-top: 8px; }
    .footer-logo { height: 26px; width: auto; object-fit: contain; }
    .footer-text { font-size: 8pt; color: #64748b; line-height: 1.35; }
  `;

  const buildRolesPage = (demiId, siteKey, publicBase) => {
    const demi = DEMI_JOURNEES.find(d => d.id === demiId);
    if (!demi) return '';
    const key = `${siteKey}::${demiId}`;
    const rolesMap = rolesAffectesByPoolDemi[key] || {};
    const poolIdsPdf = new Set((selectedBySite[siteKey] || []).map(String));
    const org = organisationByPoolDemi[key] || {};
    const classesAffecteesDemi = affectationClassesBySite?.[siteKey]?.[cellKeyAffectation(demi.jour, demi.moment)] || [];
    const classesAffecteesObjs = classesAffecteesDemi.map(cid => classes.find(c => String(c.id) === String(cid))).filter(Boolean);
    const useGroups = classesAffecteesObjs.length > 2;
    const savedG1 = (org.groups?.g1 || []).map(String).filter(cid => classesAffecteesDemi.includes(String(cid)));
    const savedG2 = (org.groups?.g2 || []).map(String).filter(cid => classesAffecteesDemi.includes(String(cid)));
    const classesColonnes = useGroups
      ? [
        { id: 'g1', nom: savedG1.map(cid => classes.find(c => String(c.id) === cid)?.nom).filter(Boolean).join(' + ') || 'Groupe 1', classIds: savedG1 },
        { id: 'g2', nom: savedG2.map(cid => classes.find(c => String(c.id) === cid)?.nom).filter(Boolean).join(' + ') || 'Groupe 2', classIds: savedG2 },
      ]
      : classesAffecteesObjs.map(cl => ({ id: String(cl.id), nom: cl.nom, classIds: [String(cl.id)] }));
    const defaultStart = demi.moment === 'matin' ? getHoraireSite(siteKey, 'matinDebut') : getHoraireSite(siteKey, 'apresMidiDebut');
    let cursor = parseTimeToMinutes(defaultStart);
    const nbOralGroupsPdf = Math.max(classesAffecteesObjs.length, 2);
    const lignesOrgPdf = getLignesOrganisation(nbOralGroupsPdf);
    const lignesHoraire = {};
    lignesOrgPdf.forEach(lg => {
      const saved = org[`horaire_${lg.row}`];
      if (saved?.start || saved?.end) {
        lignesHoraire[lg.row] = { start: saved.start || '', end: saved.end || '' };
        if (saved.end) cursor = parseTimeToMinutes(saved.end);
      } else if (Number.isFinite(cursor) && lg.temps) {
        lignesHoraire[lg.row] = { start: minutesToTime(cursor), end: minutesToTime(cursor + lg.temps) };
        cursor = cursor + lg.temps;
      } else {
        lignesHoraire[lg.row] = { start: '', end: '' };
      }
    });
    let dateStr = '';
    if (affectationDateDebutBySite?.[siteKey]) {
      const d = new Date(affectationDateDebutBySite[siteKey]);
      d.setDate(d.getDate() + JOURS.indexOf(demi.jour));
      dateStr = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
    }
    const momentLabel = demi.moment === 'matin' ? 'Matin' : 'Après-midi';
    const logoUrl = `${publicBase}/logo-etat-du-valais.png`;
    const logoPiedUrl = `${publicBase}/logo-pied-page.png`;
    const colgroup = `<col style="width:118px"><col style="width:50px">${classesColonnes.map(() => '<col>').join('')}<col style="width:110px"><col>`;
    const thead = `<thead><tr><th>Horaire</th><th>Temps</th>${classesColonnes.map(cl => `<th>${escapeHtml(cl.nom)}</th>`).join('')}<th>Rôle</th><th>Professeurs</th></tr></thead>`;
    const tbody = lignesOrgPdf.map(lg => {
      const estBlocAStart = lg.type === 'blocStart' && lg.bloc === 'blocA';
      const estBlocAInner = lg.type === 'blocInner' && lg.bloc === 'blocA';
      const estBlocBStart = lg.type === 'blocStart' && lg.bloc === 'blocB';
      const estBlocBInner = lg.type === 'blocInner' && lg.bloc === 'blocB';
      const isCorrection = lg.type === 'correction';
      const afficher = !(estBlocAInner || estBlocBInner);
      const prevEnd = (() => { if (lg.row <= 1) return lignesHoraire[lg.row]?.start || ''; for (let r = lg.row - 1; r >= 1; r--) { if (lignesHoraire[r]?.end) return lignesHoraire[r].end; } return ''; })();
      const startVal = lg.row === 1 ? (lignesHoraire[lg.row]?.start || '') : prevEnd;
      const endVal = isCorrection ? '...' : (lignesHoraire[lg.row]?.end || '');
      const rs = (estBlocAStart || estBlocBStart) ? ` rowspan="${nbOralGroupsPdf + 1}"` : '';
      const horTd = afficher ? `<td class="tc"${rs}><span class="time">${escapeHtml(startVal)}</span> <span class="time">${escapeHtml(endVal)}</span></td>` : '';
      const tmpTd = afficher ? `<td class="tc"${rs}>${lg.temps ? `${lg.temps}'` : ''}</td>` : '';
      const classCells = classesColonnes.map(cl => {
        if (lg.key === 'appel') return `<td class="tc">Appel et consignes</td>`;
        if (lg.key === 'surv1') return `<td class="tc">Préparation PO</td>`;
        if (estBlocAInner || estBlocBInner) return '';
        const getChips = (bloc, tags) => tags.filter(tag => { const v = String(bloc[tag] || ''); return cl.classIds.includes(v) || v === cl.id; }).map(tag => `<span class="chip-tag">${tag}</span>`).join('');
        if (estBlocAStart) return `<td class="tc" rowspan="${nbOralGroupsPdf + 1}">${getChips(org.blocA || {}, ['PE','PO','CE'])}</td>`;
        if (lg.key === 'surv2' || lg.key === 'surv3') return `<td class="tc">${getChips(org[`ligne${lg.row}`] || {}, ['Pause','CO'])}</td>`;
        if (estBlocBStart) return `<td class="tc" rowspan="${nbOralGroupsPdf + 1}">${getChips(org.blocB || {}, ['PE','PO','CE'])}</td>`;
        return `<td class="tc"></td>`;
      }).join('');
      const oralPdfPalette = [
        'background:#ede9fe;border:1px solid #c4b5fd;color:#4c1d95',
        'background:#fce7f3;border:1px solid #f9a8d4;color:#831843',
        'background:#d1fae5;border:1px solid #6ee7b7;color:#064e3b',
        'background:#fef3c7;border:1px solid #fcd34d;color:#78350f',
      ];
      const chipStyle = (() => {
        if (lg.role === 'Appel') return 'background:#dbeafe;border:1px solid #93c5fd;color:#1e3a8a';
        if (lg.role === 'Surveillance') return 'background:#fef9c3;border:1px solid #fde047;color:#713f12';
        if (lg.role === 'Accompagnement') return 'background:#dcfce7;border:1px solid #86efac;color:#14532d';
        if (lg.role === 'Correction') return 'background:#ffedd5;border:1px solid #fdba74;color:#7c2d12';
        if (lg.role.startsWith('Oral ')) return oralPdfPalette[(parseInt(lg.role.split(' ')[1]) - 1) % oralPdfPalette.length];
        return 'background:#eef2ff;border:1px solid #c7d2fe;color:#3730a3';
      })();
      const profsHtml = Object.entries(rolesMap).filter(([pid, role]) => {
        if (!role) return false;
        const isResp = String(pid).startsWith('resp_');
        if (!isResp && !poolIdsPdf.has(String(pid))) return false;
        if (lg.role === 'Appel') return role === 'Appel';
        if (lg.role.startsWith('Oral ')) return role === `Oral Groupe ${lg.role.split(' ')[1]}`;
        return role === lg.role;
      }).map(([pid]) => {
        const p = profMap[String(pid)] || responsablesTCF.find(r => r.id === pid);
        if (!p) return '';
        const name = p.prenom ? `${escapeHtml(p.prenom)} ${escapeHtml(toDisplayNom(p.nom) || '')}` : escapeHtml(p.nom);
        return `<span style="display:inline-block;border-radius:10px;padding:2px 8px;font-size:9pt;margin:1px;${chipStyle}">${name}</span>`;
      }).filter(Boolean).join('');
      return `<tr>${horTd}${tmpTd}${classCells}<td class="tc">${escapeHtml(lg.role)}</td><td class="tl">${profsHtml}</td></tr>`;
    }).join('');
    return `<div class="page">
      <div class="page-header">
        <div class="header-left">
          <img class="header-logo" src="${logoUrl}" onerror="this.style.display='none'" />
          <div class="header-admin">
            <div>DÉPARTEMENT DE LA SANTÉ, DES AFFAIRES SOCIALES ET DE LA CULTURE</div>
            <div>Service de l'action sociale</div>
            <div>Office de l'asile</div>
            <div>Centre de formation "Le Botza"</div>
          </div>
        </div>
        <div class="header-right">
          <div class="header-scai">SCAI</div>
          <div class="header-year">${escapeHtml(anneeScolaire || '—')}</div>
          <div class="header-sub">CLASSES D'ACCUEIL</div>
        </div>
      </div>
      <div class="page-title">Répartition des tâches<span class="page-date-line">${dateStr ? `${dateStr} — ` : ''}${escapeHtml(demi.jour)} ${momentLabel}</span></div>
      <table><colgroup>${colgroup}</colgroup>${thead}<tbody>${tbody}</tbody></table>
      <div class="page-footer">
        <img class="footer-logo" src="${logoPiedUrl}" onerror="this.style.display='none'" />
        <div class="footer-text"><div>Zone Industrielle 4, 1963 Vétroz</div><div>Tél. 027 606 18 60</div></div>
      </div>
    </div>
    <div class="page" style="page-break-before:always">
      <div class="page-header">
        <div class="header-left">
          <img class="header-logo" src="${logoUrl}" onerror="this.style.display='none'" />
          <div class="header-admin">
            <div>DÉPARTEMENT DE LA SANTÉ, DES AFFAIRES SOCIALES ET DE LA CULTURE</div>
            <div>Service de l'action sociale</div>
            <div>Office de l'asile</div>
            <div>Centre de formation "Le Botza"</div>
          </div>
        </div>
        <div class="header-right">
          <div class="header-scai">SCAI</div>
          <div class="header-year">${escapeHtml(anneeScolaire || '—')}</div>
          <div class="header-sub">CLASSES D'ACCUEIL</div>
        </div>
      </div>
      <div style="font-size:14pt;font-weight:700;color:#334155;margin:18px 0 16px">Description des rôles</div>
      <div style="font-size:10pt;color:#475569;line-height:1.7">
        <div style="margin-bottom:14px"><div style="font-size:12pt;font-weight:700;color:#1e293b;margin-bottom:4px">1. Appel</div>Assurer le contrôle des présences avant le début de l'épreuve, puis présenter aux candidats le déroulement de la session ainsi que les consignes à respecter.</div>
        <div style="margin-bottom:14px"><div style="font-size:12pt;font-weight:700;color:#1e293b;margin-bottom:4px">2. Surveillance</div>Garantir le bon déroulement de l'épreuve écrite : maintien du silence dans la salle, collecte des copies au fur et à mesure que les candidats terminent, ainsi que distribution des documents d'occupation selon les besoins.</div>
        <div style="margin-bottom:14px"><div style="font-size:12pt;font-weight:700;color:#1e293b;margin-bottom:4px">3. Accompagnement</div>Conduire les candidats depuis la salle d'examen jusqu'à la salle dédiée à l'épreuve orale.</div>
        <div style="margin-bottom:14px"><div style="font-size:12pt;font-weight:700;color:#1e293b;margin-bottom:4px">4. Oral</div>Faire passer l'épreuve de production orale en quatre phases distinctes :<br><strong>Phase 1 — Vocabulaire :</strong> Le candidat doit poser des questions en lien avec les mots proposés.<br><strong>Phase 2 — Entretien dirigé :</strong> Conduire un échange structuré autour des questions de base proposées dans le document.<br><strong>Phase 3 — Description :</strong> Inviter le candidat à décrire la scène afin d'évaluer sa capacité d'expression et son vocabulaire en contexte.<br><strong>Phase 4 — Dialogue :</strong> Mener une interaction spontanée avec le candidat afin d'évaluer sa capacité à communiquer.</div>
        <div style="margin-bottom:14px"><div style="font-size:12pt;font-weight:700;color:#1e293b;margin-bottom:4px">5. Correction</div>Procéder à la correction des épreuves écrites selon les critères d'évaluation définis, en garantissant rigueur et homogénéité dans la notation.</div>
      </div>
      <div class="page-footer">
        <img class="footer-logo" src="${logoPiedUrl}" onerror="this.style.display='none'" />
        <div class="footer-text"><div>Zone Industrielle 4, 1963 Vétroz</div><div>Tél. 027 606 18 60</div></div>
      </div>
    </div>`;
  };

  const rolesLandscapeCSS = rolesPrintCSS.replace('@page { size: A4 portrait; margin: 10mm; }', '@page { size: A4 landscape; margin: 10mm; }');

  const jourNumero = (jour) => String(JOURS.indexOf(jour) + 1).padStart(2, '0');

  const printRoles = () => {
    const sitePlan = planningsSite || siteOrder[0] || '';
    if (!rolesDemiJourneeSelect) return;
    const publicBase = `${window.location.origin}${process.env.PUBLIC_URL || ''}`;
    const siteNom = (siteNames[sitePlan] || sitePlan).toUpperCase().replace(/\s+/g, '_');
    const demi = DEMI_JOURNEES.find(d => d.id === rolesDemiJourneeSelect);
    const numDemi = demi ? jourNumero(demi.jour) : '00';
    const momentLabel = demi?.moment === 'matin' ? 'Matin' : 'Après-midi';
    const filename = `${siteNom}_Role_${numDemi}-${demi?.jour || ''}-${momentLabel}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${filename}</title><style>${rolesLandscapeCSS}</style></head><body>${buildRolesPage(rolesDemiJourneeSelect, sitePlan, publicBase)}</body></html>`;
    const finalHtml = injectForcedPrintCss(html, 'A4 landscape', '10mm');
    openPrintPopup(finalHtml, { title: filename, width: 1300, height: 820 });
  };

  const printAllRoles = () => {
    const sitePlan = planningsSite || siteOrder[0] || '';
    const publicBase = `${window.location.origin}${process.env.PUBLIC_URL || ''}`;
    const demisActives = DEMI_JOURNEES.filter(d => isJourActifSite(sitePlan, d.jour));
    if (!demisActives.length) return;
    const pages = demisActives.map(d => buildRolesPage(d.id, sitePlan, publicBase));
    const siteNom = (siteNames[sitePlan] || sitePlan).toUpperCase().replace(/\s+/g, '_');
    const filename = `${siteNom}_Role_toutes_demi_journees`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${filename}</title><style>${rolesLandscapeCSS}</style></head><body>${pages.join('')}</body></html>`;
    const finalHtml = injectForcedPrintCss(html, 'A4 landscape', '10mm');
    openPrintPopup(finalHtml, { title: filename, width: 1300, height: 820 });
  };

  const getLevelMarksForPrintChart = (c, isFr) => {
    if (!isFr) return [{ v: 80, label: 'CAF', bold: true }, { v: 60, label: 'CFR', bold: true }, { v: 30, label: 'CSC', bold: true }];
    const agg = c.levelMarksAggregate === true;
    const niveauNormalise = normaliserNiveau(c.niveau || '');
    const isNiveauCscCpr = ['CSC', 'CPR'].includes(niveauNormalise);
    if (agg) {
      return isNiveauCscCpr
        ? [{ v: 90, label: 'A1', bold: true }, { v: 50, label: 'A0.2', bold: true }, { v: 10, label: 'A0.1', bold: true }]
        : [{ v: 90, label: 'A2', bold: true }, { v: 50, label: 'A1.2', bold: true }, { v: 10, label: 'A1.1', bold: true }];
    }
    return isNiveauCscCpr
      ? [{ v: 45, label: 'A1', bold: true }, { v: 25, label: 'A0.2', bold: true }, { v: 5, label: 'A0.1', bold: true }]
      : [{ v: 45, label: 'A2', bold: true }, { v: 25, label: 'A1.2', bold: true }, { v: 5, label: 'A1.1', bold: true }];
  };

  const printCharts = (charts, isFr, maxScore, isLandscape = false) => {
    const titleMain = isFr ? 'Test de connaissance de français' : 'Test de connaissance des mathématiques';
    const publicBase = `${window.location.origin}${process.env.PUBLIC_URL || ''}`;
    const logoUrl = `${publicBase}/logo-etat-du-valais.png`;
    const logoFallbackUrl = `${window.location.origin}/build/logo-etat-du-valais.png`;
    const logoPiedUrl = `${publicBase}/logo-pied-page.png`;
    const logoPiedFallbackUrl = `${window.location.origin}/build/logo-pied-page.png`;
    const headerHtml = `<div class="page-header">
        <div class="header-left">
          <div class="header-logo-wrap">
            <img class="header-logo" src="${logoUrl}" alt="Logo État du Valais" onerror="if(!this.dataset.fallback){this.dataset.fallback='1';this.src='${logoFallbackUrl}';}else{this.style.display='none';}" />
          </div>
          <div class="header-admin">
            <div>DÉPARTEMENT DE LA SANTÉ, DES AFFAIRES SOCIALES ET DE LA CULTURE</div>
            <div>Service de l'action sociale</div>
            <div>Office de l'asile</div>
            <div>Centre de formation "Le Botza"</div>
          </div>
        </div>
        <div class="header-right">
          <div class="header-scai">SCAI</div>
          <div class="header-year">${anneeScolaire || '—'}</div>
          <div class="header-sub">CLASSES D'ACCUEIL</div>
        </div>
      </div>`;
    const pagesWithLayout = charts.map((c) => {
      const nSer = c.series.length;
      const levelMarks = c.levelMarks?.length ? c.levelMarks : getLevelMarksForPrintChart(c, isFr);
      const verticalXLabels = c.verticalXLabels !== undefined ? c.verticalXLabels === true : (!c.showTrend && nSer > 1);
      const svg = nSer > 0
        ? buildChartSVG(c.series, maxScore, isFr, {
          showTrend: c.showTrend !== false,
          niveau: c.niveau || '',
          innerH: 380,
          fitContainer: true,
          fitMinSlots: nSer,
          expandVerticalFill: true,
          levelMarks,
          printLayout: true,
          verticalXLabels,
          label1: c.label1,
          label2: c.label2,
          hideTrendPoints: false,
        })
        : '<p style="color:#94a3b8;font-size:13px">Aucune donnée</p>';
      const nom = c.nom || '';
      const prenom = c.prenom || '';
      const classe = c.classe || '';
      const dateVetroz = `Vétroz, le ${new Date().toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      const chartInner = `<div class="chart-print-frame">${svg}</div>`;
      return `<div class="page">
          ${headerHtml}
          <div class="page-stack">
            <div class="page-title">${titleMain}</div>
            <div class="page-date">${dateVetroz}</div>
            ${nom || prenom ? `<div class="page-identite"><b>NOM Prénom :</b> ${nom.toUpperCase()} ${prenom}</div>` : ''}
            ${classe ? `<div class="page-classe"><b>Classe :</b> ${classe}</div>` : ''}
            <div class="chart-wrap">${chartInner}</div>
          </div>
          <div class="page-footer">
            <img class="footer-logo" src="${logoPiedUrl}" alt="Logo pied de page" onerror="if(!this.dataset.fallback){this.dataset.fallback='1';this.src='${logoPiedFallbackUrl}';}else{this.style.display='none';}" />
            <div class="footer-text">
              <div>Zone Industrielle 4, 1963 Vétroz</div>
              <div>Tél. 027 606 18 60</div>
            </div>
          </div>
      </div>`;
    });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Graphiques TCF</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        body { font-family: 'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif; background: white; color: #1e293b; }
        .page { page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; }
        .page:last-child { page-break-after: auto; }
        .page-stack { flex: 1; display: flex; flex-direction: column; min-height: 0; }
        .page-header { flex-shrink: 0; padding-bottom: 14px; margin-bottom: 10px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .header-left { display: flex; align-items: flex-start; gap: 10px; }
        .header-logo { width: 38px; height: auto; object-fit: contain; display: block; }
        .header-admin { font-size: 8pt; color: #334155; line-height: 1.5; }
        .header-right { text-align: right; }
        .header-scai { font-size: 17pt; font-weight: 800; color: #1e293b; line-height: 1; }
        .header-year { font-size: 10pt; font-weight: 700; color: #374151; margin-top: 2px; }
        .header-sub { font-size: 8pt; font-weight: 700; color: #475569; margin-top: 2px; }
        .page-title { flex-shrink: 0; font-size: 17pt; font-weight: 700; color: #0f172a; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin-top: 12px; margin-bottom: 10px; }
        .page-date { flex-shrink: 0; font-size: 10pt; color: #1e293b; text-align: right; margin-bottom: 10px; }
        .page-identite { flex-shrink: 0; font-size: 10pt; color: #1f2937; margin-bottom: 4px; }
        .page-classe { flex-shrink: 0; font-size: 10pt; color: #1f2937; margin-bottom: 10px; }
        .chart-wrap { flex: 1; min-height: 180px; display: flex; flex-direction: column; align-items: stretch; justify-content: center; overflow: visible; }
        .chart-print-frame {
          width: 100%;
          height: 400px;
          max-height: 400px;
          flex-shrink: 0;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        .chart-print-frame svg { width: 100%; height: 100%; max-width: 100%; max-height: 100%; display: block; }
        .page-footer { flex-shrink: 0; margin-top: auto; display: flex; align-items: center; gap: 12px; padding-top: 10px; }
        .footer-logo { height: 26px; width: auto; object-fit: contain; display: block; }
        .footer-text { font-size: 8pt; color: #64748b; line-height: 1.35; }
        @page { size: A4 ${isLandscape ? 'landscape' : 'portrait'}; margin: 10mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style></head><body>${pagesWithLayout.join('')}</body></html>`;
    const finalHtml = injectForcedPrintCss(html, `A4 ${isLandscape ? 'landscape' : 'portrait'}`, '10mm');
    openPrintPopup(finalHtml, { title: 'Graphiques TCF', width: isLandscape ? 1400 : 1200, height: 820 });
  };

  const renderGraphique = () => {
    const isFr = ongletGraphiqueMatiere === 'francais';
    const niveauActif = graphNiveau || (niveaux.length ? niveaux[0] : '');
    const search = graphRecherche.trim().toLowerCase();
    const classesNiveau = classes
      .filter(c => !graphNiveau || normaliserNiveau(c.niveau) === graphNiveau)
      .sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
    const classeIdsNiveau = new Set(classesNiveau.map(c => String(c.id)));
    const elevesNiveauGraph = eleves
      .filter(e => classeIdsNiveau.has(String(e.classe_id)))
      .sort((a, b) => `${toDisplayNom(a.nom) || ''} ${a.prenom || ''}`.localeCompare(`${toDisplayNom(b.nom) || ''} ${b.prenom || ''}`, 'fr'));
    const elevesFiltered = elevesNiveauGraph.filter((e) => {
      if (!search) return true;
      const classeNom = classesMap[String(e.classe_id)]?.nom || '';
      return `${toDisplayNom(e.nom)} ${e.prenom} ${classeNom}`.toLowerCase().includes(search);
    });
    const classModeActive = graphVue === 'moyenne' || graphVue === 'classe';
    const classesListeGraph = classesNiveau.filter((cl) => !search || String(cl.nom || '').toLowerCase().includes(search));

    const maxScore = isFr ? 60 : 110;
    const label1 = isFr ? 'Oral' : 'Partie 1-2';
    const label2 = isFr ? 'Écrit' : 'Partie 3-4';
    const frenchMarks = (niveauSource, aggregate = false) => {
      const niveauNormalise = normaliserNiveau(niveauSource || '');
      const isNiveauCscCpr = ['CSC', 'CPR'].includes(niveauNormalise);
      if (aggregate) {
        return isNiveauCscCpr
          ? [{ v: 90, label: 'A1', bold: true }, { v: 50, label: 'A0.2', bold: true }, { v: 10, label: 'A0.1', bold: true }]
          : [{ v: 90, label: 'A2', bold: true }, { v: 50, label: 'A1.2', bold: true }, { v: 10, label: 'A1.1', bold: true }];
      }
      return isNiveauCscCpr
        ? [{ v: 45, label: 'A1', bold: true }, { v: 25, label: 'A0.2', bold: true }, { v: 5, label: 'A0.1', bold: true }]
        : [{ v: 45, label: 'A2', bold: true }, { v: 25, label: 'A1.2', bold: true }, { v: 5, label: 'A1.1', bold: true }];
    };
    const mathMarks = [{ v: 80, label: 'CAF', bold: true }, { v: 60, label: 'CFR', bold: true }, { v: 30, label: 'CSC', bold: true }];

    // Sessions cumulatives selon la sélection
    const sessionsToShowIds = !graphSession
      ? ["Test d'août", '1e semestre', '2e semestre']
      : graphSession === "2e semestre"
        ? ["Test d'août", '1e semestre', '2e semestre']
        : graphSession === '1e semestre'
          ? ["Test d'août", '1e semestre']
          : ["Test d'août"];

    const sessionsIndiv = graphEleveId
      ? sessionsToShowIds.map(session => {
        const sc = getScore(ongletGraphiqueMatiere, session, graphEleveId);
        if (isFr) { const fr = calculFr(sc); return { session, v1: Number(fr.oral || 0), v2: Number(fr.ecrit || 0), hasData: fr.total !== '' }; }
        const ma = calculMath(sc); return { session, v1: Number(ma.total || 0), v2: 0, hasData: ma.total !== '' };
      }).filter(s => s.hasData)
      : [];

    const getEleveSessionGlobal = (e) => {
      if (!graphSession) return null;
      const sc = getScore(ongletGraphiqueMatiere, graphSession, String(e.id));
      const computed = isFr ? calculFr(sc) : calculMath(sc);
      return computed.total === '' ? null : Number(computed.total);
    };

    const dataTousEleves = graphSession
      ? elevesFiltered
        .map((e) => {
          const sc = getScore(ongletGraphiqueMatiere, graphSession, String(e.id));
          if (isFr) {
            const fr = calculFr(sc);
            return {
              label: `${e.prenom || ''} ${toDisplayNom(e.nom)}`.trim(),
              v1: Number(fr.oral || 0),
              v2: Number(fr.ecrit || 0),
              hasData: fr.total !== '',
            };
          }
          const ma = calculMath(sc);
          return {
            label: `${e.prenom || ''} ${toDisplayNom(e.nom)}`.trim(),
            v1: Number(ma.total || 0),
            v2: 0,
            hasData: ma.total !== '',
          };
        })
        .filter((x) => x.hasData)
        .map(({ label, v1, v2 }) => ({ label, v1, v2 }))
      : [];

    const moyenneTousEleves = (() => {
      if (!graphSession) return null;
      const vals = elevesFiltered.map((e) => getEleveSessionGlobal(e)).filter((v) => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    })();

    // Vue Classe
    const elevesClasse = graphClasseId
      ? eleves.filter(e => String(e.classe_id) === graphClasseId).sort((a, b) => `${a.prenom || ''} ${toDisplayNom(a.nom)}`.localeCompare(`${b.prenom || ''} ${toDisplayNom(b.nom)}`, 'fr'))
      : [];
    const dataClasse = graphSession
      ? elevesClasse.map(e => {
          const sc = getScore(ongletGraphiqueMatiere, graphSession, String(e.id));
          if (isFr) { const fr = calculFr(sc); return { id: e.id, label: `${e.prenom} ${toDisplayNom(e.nom)}`, v1: Number(fr.oral || 0), v2: Number(fr.ecrit || 0), hasData: fr.total !== '' }; }
          const ma = calculMath(sc); return { id: e.id, label: `${e.prenom} ${toDisplayNom(e.nom)}`, v1: Number(ma.total || 0), v2: 0, hasData: ma.total !== '' };
        }).filter(e => e.hasData)
      : [];

    const buildChartsForClasse = () => {
      if (!graphClasseId) return [];
      const classe = classes.find(c => String(c.id) === graphClasseId);
      const elevesClasseFiltres = eleves
        .filter(e => String(e.classe_id) === String(graphClasseId))
        .sort((a, b) => `${toDisplayNom(a.nom) || ''} ${a.prenom || ''}`.localeCompare(`${toDisplayNom(b.nom) || ''} ${b.prenom || ''}`, 'fr'));
      return elevesClasseFiltres.map((e) => {
        const series = sessionsToShowIds.map(session => {
          const sc = getScore(ongletGraphiqueMatiere, session, String(e.id));
          if (isFr) { const fr = calculFr(sc); return { session, v1: Number(fr.oral || 0), v2: Number(fr.ecrit || 0), hasData: fr.total !== '' }; }
          const ma = calculMath(sc); return { session, v1: Number(ma.cscCfr || 0), v2: Number(ma.cafCap || 0), hasData: ma.total !== '' };
        }).filter(s => s.hasData).map(s => ({ ...s, label: SESSION_LABEL[s.session] || s.session }));
        return {
          label: `${e.prenom} ${toDisplayNom(e.nom)} — ${classe?.nom || ''}`,
          series,
          nom: toDisplayNom(e.nom),
          prenom: e.prenom || '',
          classe: classe?.nom || '',
          niveau: normaliserNiveau(classe?.niveau || ''),
          showTrend: true,
        };
      }).filter(c => c.series.length > 0);
    };

    const getClassMoyennes = () => {
      return classesNiveau
        .filter((cl) => !search || String(cl.nom || '').toLowerCase().includes(search))
        .map((cl) => {
        const elevesClasse = eleves.filter(e => String(e.classe_id) === String(cl.id));
        if (isFr) {
          const oralVals = elevesClasse
            .map((e) => calculFr(getScore('francais', graphSession, String(e.id))).oral)
            .filter((v) => v !== '' && v !== null && v !== undefined)
            .map(Number);
          const ecritVals = elevesClasse
            .map((e) => calculFr(getScore('francais', graphSession, String(e.id))).ecrit)
            .filter((v) => v !== '' && v !== null && v !== undefined)
            .map(Number);
          const totalVals = elevesClasse
            .map((e) => calculFr(getScore('francais', graphSession, String(e.id))).total)
            .filter((v) => v !== '' && v !== null && v !== undefined)
            .map(Number);
          const v1Avg = oralVals.length ? oralVals.reduce((a, b) => a + b, 0) / oralVals.length : null;
          const v2Avg = ecritVals.length ? ecritVals.reduce((a, b) => a + b, 0) / ecritVals.length : null;
          const totalAvg = totalVals.length ? totalVals.reduce((a, b) => a + b, 0) / totalVals.length : null;
          return { id: cl.id, nom: cl.nom, v1Avg, v2Avg, totalAvg, global: totalAvg };
        }
        const totalVals = elevesClasse
          .map((e) => calculMath(getScore('math', graphSession, String(e.id))).total)
          .filter((v) => v !== '' && v !== null && v !== undefined)
          .map(Number);
          const v1Avg = totalVals.length ? totalVals.reduce((a, b) => a + b, 0) / totalVals.length : null;
          const v2Avg = null;
        const totalAvg = totalVals.length ? totalVals.reduce((a, b) => a + b, 0) / totalVals.length : null;
        return { id: cl.id, nom: cl.nom, v1Avg, v2Avg, totalAvg, global: totalAvg };
      });
    };

    const handlePrintSelection = () => {
      if (graphVue === 'individuelle' && !graphEleveId && graphSession && dataTousEleves.length > 0) {
        printCharts([{
          label: `Moyennes élèves — ${SESSION_LABEL[graphSession] || graphSession}`,
          series: dataTousEleves,
          nom: niveauActif,
          prenom: '',
          classe: `${elevesFiltered.length} élève(s)`,
          niveau: niveauActif,
          showTrend: false,
          levelMarksAggregate: true,
        }], isFr, 100);
      } else if (graphVue === 'individuelle' && graphEleveId && sessionsIndiv.length > 0) {
        const e = eleves.find(ev => String(ev.id) === graphEleveId);
        const classe = classesMap[String(e?.classe_id)]?.nom || '';
        const niveau = normaliserNiveau(classesMap[String(e?.classe_id)]?.niveau || '');
        printCharts([{
          label: `${e?.prenom || ''} ${toDisplayNom(e?.nom || '')} — ${classe}`,
          series: sessionsIndiv.map(s => ({ ...s, label: SESSION_LABEL[s.session] || s.session })),
          nom: toDisplayNom(e?.nom || ''),
          prenom: e?.prenom || '',
          classe,
          niveau,
          showTrend: true,
        }], isFr, maxScore);
      } else if ((graphVue === 'moyenne' || graphVue === 'classe') && graphClasseId && graphSession) {
        const charts = buildChartsForClasse();
        if (charts.length === 0) { alert('Aucun résultat saisi pour cette classe.'); return; }
        printCharts(charts, isFr, maxScore);
      }
    };

    const handlePrintAll = () => {
      const sessionsIds = sessionsToShowIds.length > 0 ? sessionsToShowIds : SESSIONS.slice();
      const charts = elevesNiveauGraph.map(e => {
        const series = sessionsIds.map(session => {
          const sc = getScore(ongletGraphiqueMatiere, session, String(e.id));
          if (isFr) { const fr = calculFr(sc); return { session, v1: Number(fr.oral || 0), v2: Number(fr.ecrit || 0), hasData: fr.total !== '' }; }
          const ma = calculMath(sc); return { session, v1: Number(ma.cscCfr || 0), v2: Number(ma.cafCap || 0), hasData: ma.total !== '' };
        }).filter(s => s.hasData);
        const classe = classesMap[String(e.classe_id)]?.nom || '';
        return {
          label: `${e.prenom} ${toDisplayNom(e.nom)} — ${classe}`,
          series: series.map(s => ({ ...s, label: SESSION_LABEL[s.session] || s.session })),
          nom: toDisplayNom(e.nom),
          prenom: e.prenom || '',
          classe,
          niveau: normaliserNiveau(classesMap[String(e.classe_id)]?.niveau || ''),
          showTrend: true,
        };
      }).filter(c => c.series.length > 0);
      if (charts.length === 0) { alert('Aucun résultat saisi pour ce niveau.'); return; }
      printCharts(charts, isFr, maxScore);
    };

    const canPrintSelection = (graphVue === 'individuelle' && !graphEleveId && graphSession && dataTousEleves.length > 0) ||
      (graphVue === 'individuelle' && graphEleveId && sessionsIndiv.length > 0) ||
      (classModeActive && graphClasseId && graphSession && dataClasse.length > 0);

    const niveauIndividuel = (() => {
      const e = eleves.find(ev => String(ev.id) === String(graphEleveId));
      const cl = classesMap[String(e?.classe_id)];
      return normaliserNiveau(cl?.niveau || '');
    })();
    const eleveIndividuel = eleves.find(ev => String(ev.id) === String(graphEleveId));
    const classeIndividuelle = classesMap[String(eleveIndividuel?.classe_id)];
    const niveauClasse = normaliserNiveau(classes.find(c => String(c.id) === String(graphClasseId))?.niveau || '');
    const moyenneRows = getClassMoyennes();
    const moyRowByClasseId = new Map(moyenneRows.map((r) => [String(r.id), r]));
    const moyenneGlobaleListe = moyenneRows.filter((r) => r.global != null).map((r) => r.global);
    const moyenneToutesClasses = graphSession && moyenneGlobaleListe.length
      ? moyenneGlobaleListe.reduce((a, b) => a + b, 0) / moyenneGlobaleListe.length
      : null;
    const fmtMoyClasse = (v) => (v != null && !Number.isNaN(v) ? Number(v).toFixed(1) : '—');
    const moyenneRowsClassees = moyenneRows.filter(r => r.global != null).sort((a, b) => a.global - b.global);
    const lowSet = new Set(moyenneRowsClassees.slice(0, 3).map(r => String(r.id)));
    const highSet = new Set(moyenneRowsClassees.slice(-3).map(r => String(r.id)));
    const moyenneSeries = moyenneRows
      .filter(r => r.v1Avg != null || r.v2Avg != null)
      .map(r => ({
        label: r.nom,
        v1: Math.round(Number(r.v1Avg || 0) * 10) / 10,
        v2: Math.round(Number(r.v2Avg || 0) * 10) / 10,
      }));
    const classesRangeLabel = classesNiveau.length ? `${classesNiveau[0].nom} à ${classesNiveau[classesNiveau.length - 1].nom}` : '—';

    /** Hauteurs stables (changement classe / élève sans saut de layout) */
    const GRAPH_EMBED_IDENTITY_MIN = 56;
    const GRAPH_EMBED_PLOT_PX = 272;
    const GRAPH_FULL_IDENTITY_MIN = 72;
    const GRAPH_FULL_PLOT_PX = graphUiLandscape ? 400 : 360;

    const renderSvgChart = (items, opts = {}) => {
      const chartMax = Number(opts.maxScoreOverride) > 0 ? Number(opts.maxScoreOverride) : maxScore;
      const embedPanel = opts.embedClassPanel === true;
      /** Graphique en panneau : même hauteur utile (flex) ; défilement horizontal si beaucoup de barres */
      const expandPlot = embedPanel && opts.expandPlotInPanel === true;
      const scrollPlotHorizontal = embedPanel && opts.scrollPlotHorizontally === true;
      const fixPlot = embedPanel || opts.fixPlotHeight === true;
      const wideUi = graphUiLandscape && !embedPanel;
      const plotPx = embedPanel && !expandPlot ? GRAPH_EMBED_PLOT_PX : (!embedPanel && fixPlot ? GRAPH_FULL_PLOT_PX : null);
      const identityMin = embedPanel ? GRAPH_EMBED_IDENTITY_MIN : (fixPlot ? GRAPH_FULL_IDENTITY_MIN : undefined);
      const svg = buildChartSVG(items, chartMax, isFr, {
        showTrend: opts.showTrend !== false,
        niveau: opts.niveau || '',
        innerH: expandPlot ? 400 : (embedPanel ? 240 : (wideUi ? 360 : 320)),
        chartWide: wideUi,
        fitContainer: embedPanel || fixPlot,
        ...(expandPlot ? {
          fitMinSlots: Math.max(items.length, 2),
          ...(scrollPlotHorizontal
            ? { scrollPlotHorizontal: true }
            : { expandVerticalFill: true }),
        } : {}),
        label1: opts.label1,
        label2: opts.label2,
        showFrenchLevelMarks: opts.showFrenchLevelMarks,
        showMathLevelMarks: opts.showMathLevelMarks,
        levelMarks: opts.levelMarks,
        axisMax: opts.axisMax,
        singleSeries: opts.singleSeries,
        hideTrendPoints: !graphShowTrendPoints,
      });
      const publicBase = `${window.location.origin}${process.env.PUBLIC_URL || ''}`;
      const logoSrc = `${publicBase}/logo-etat-du-valais.png`;
      const logoPiedSrc = `${publicBase}/logo-pied-page.png`;
      const logoPiedFallbackSrc = `${window.location.origin}/build/logo-pied-page.png`;
      const dateVetroz = `Vétroz, le ${new Date().toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      const titreGraph = opts.title || (isFr ? 'Test de connaissance de français' : 'Test de connaissance des mathématiques');
      const nomMaj = String(opts.nom || '').toUpperCase();
      const prenomAff = String(opts.prenom || '');
      const classeAff = String(opts.classe || '');
      const identiteLabel = opts.identiteLabel || 'NOM Prénom';
      const cardW = opts.cardWidth != null ? opts.cardWidth : (wideUi ? 'min(100%, 1180px)' : 800);
      const padCard = embedPanel ? '10px 12px' : (wideUi ? '24px 32px' : '24px 28px');
      return (
        <div style={{
          display: 'flex', justifyContent: 'center', width: '100%',
          height: embedPanel ? '100%' : undefined, minHeight: embedPanel ? 0 : undefined,
        }}
        >
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            padding: padCard,
            width: cardW,
            maxWidth: '100%',
            height: embedPanel ? '100%' : undefined,
            maxHeight: embedPanel ? '100%' : undefined,
            minHeight: embedPanel ? 0 : undefined,
            overflow: embedPanel ? 'hidden' : undefined,
            display: embedPanel ? 'flex' : undefined,
            flexDirection: embedPanel ? 'column' : undefined,
            boxSizing: 'border-box',
          }}
          >
            {/* En-tête — espacement sous l’en-tête réduit de moitié vs. maquette initiale */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: embedPanel ? 8 : 12,
              marginBottom: embedPanel ? 4 : 9, paddingBottom: embedPanel ? 3 : 7, flexShrink: 0,
            }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: embedPanel ? 6 : 10 }}>
                <img src={logoSrc} alt="Logo" style={{ width: embedPanel ? 28 : 38, height: 'auto', objectFit: 'contain', backgroundColor: 'white', padding: 2 }} onError={e => { e.target.style.display = 'none'; }} />
                <div style={{ fontSize: embedPanel ? 9 : 12, lineHeight: 1.45, color: '#334155' }}>
                  <div>Département de la santé, des affaires sociales et de la culture</div>
                  <div>Service de l'action sociale</div>
                  <div>Office de l'asile</div>
                  <div>Centre de formation "Le Botza"</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: embedPanel ? 18 : 26, fontWeight: 800, lineHeight: 1, color: '#1e293b' }}>SCAI</div>
                <div style={{ fontSize: embedPanel ? 10 : 12, fontWeight: 700, color: '#374151' }}>{anneeScolaire || '—'}</div>
                <div style={{ fontSize: embedPanel ? 8 : 10, fontWeight: 700, color: '#475569' }}>CLASSES D'ACCUEIL</div>
              </div>
            </div>
            {/* Titre */}
            <div style={{
              textAlign: 'center', fontWeight: 700, fontSize: embedPanel ? 14 : 25, letterSpacing: embedPanel ? 0.5 : 1, textTransform: 'uppercase',
              marginBottom: embedPanel ? 3 : 20, marginTop: embedPanel ? 2 : 30, color: '#0f172a', flexShrink: 0,
            }}
            >{titreGraph}</div>
            {/* Date */}
            <div style={{ textAlign: 'right', fontSize: embedPanel ? 11 : 16, color: '#1e293b', marginBottom: embedPanel ? 3 : 20, flexShrink: 0 }}>{dateVetroz}</div>
            {/* Identité — hauteur minimale fixe si zone tracé fixe (évite de redimensionner le graphique) */}
            <div style={{ flexShrink: 0, minHeight: identityMin, marginBottom: embedPanel ? 6 : (fixPlot ? 12 : 0) }}>
              {(nomMaj || prenomAff) && <div style={{ fontSize: embedPanel ? 12 : 16, color: '#1f2937', marginBottom: 4 }}><b>{identiteLabel} :</b> {nomMaj} {prenomAff}</div>}
              {classeAff && <div style={{ fontSize: embedPanel ? 12 : 16, color: '#1f2937', marginBottom: embedPanel ? 0 : 16 }}><b>Classe :</b> {classeAff}</div>}
            </div>
            {/* Graphique — flex 1 si expandPlot ; défilement horizontal si scrollPlotHorizontally */}
            <div style={{
              overflowX: scrollPlotHorizontal ? 'auto' : (fixPlot ? 'hidden' : 'auto'),
              overflowY: fixPlot ? 'hidden' : 'visible',
              display: 'flex',
              justifyContent: scrollPlotHorizontal ? 'flex-start' : 'center',
              alignItems: expandPlot ? 'stretch' : (fixPlot ? 'center' : undefined),
              flex: expandPlot ? 1 : undefined,
              minHeight: expandPlot ? 220 : undefined,
              marginTop: expandPlot ? 10 : undefined,
              scrollbarGutter: scrollPlotHorizontal ? 'stable' : undefined,
              ...(plotPx != null ? { height: plotPx, minHeight: plotPx, maxHeight: plotPx, flex: '0 0 auto' } : {}),
            }}
            >
              {scrollPlotHorizontal ? (
                <div style={{
                  height: '100%',
                  width: 'max-content',
                  minWidth: '100%',
                  minHeight: 0,
                  boxSizing: 'border-box',
                }}
                >
                  <div
                    key={`tcfsvg-${graphShowTrendPoints}`}
                    style={{
                      width: 'max-content',
                      minWidth: '100%',
                      height: '100%',
                      maxHeight: '100%',
                      display: 'block',
                      minHeight: 0,
                    }}
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                </div>
              ) : (
                <div
                  key={`tcfsvg-${graphShowTrendPoints}`}
                  style={fixPlot ? {
                    width: '100%',
                    height: '100%',
                    maxHeight: '100%',
                    display: 'flex',
                    alignItems: expandPlot ? 'stretch' : 'center',
                    justifyContent: 'center',
                    minHeight: 0,
                    ...(expandPlot ? { flex: 1, alignSelf: 'stretch' } : {}),
                  } : undefined}
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              )}
            </div>
            {embedPanel && !expandPlot ? <div style={{ flex: 1, minHeight: 0 }} /> : null}
            {/* Pied de page */}
            <div style={{
              marginTop: embedPanel ? 6 : 10, paddingTop: embedPanel ? 4 : 8, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, flexShrink: 0,
            }}
            >
              <img
                src={logoPiedSrc}
                alt="Logo pied de page"
                style={{ height: embedPanel ? 18 : 26, width: 'auto', objectFit: 'contain' }}
                onError={(e) => {
                  if (!e.currentTarget.dataset.fallback) {
                    e.currentTarget.dataset.fallback = '1';
                    e.currentTarget.src = logoPiedFallbackSrc;
                    return;
                  }
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div style={{ fontSize: embedPanel ? 9 : 12, color: '#64748b', lineHeight: 1.35 }}>
                <div>Zone Industrielle 4, 1963 Vétroz</div>
                <div>Tél. 027 606 18 60</div>
              </div>
            </div>
          </div>
        </div>
      );
    };

    const btnGraphTrendPointsStyle = {
      padding: '7px 14px',
      borderRadius: 17,
      border: `1.5px solid ${graphShowTrendPoints ? '#6366f1' : '#e2e8f0'}`,
      background: graphShowTrendPoints ? '#e0e7ff' : 'white',
      cursor: 'pointer',
      fontWeight: 600,
      color: graphShowTrendPoints ? '#4338ca' : '#94a3b8',
      fontSize: 13,
      fontFamily: 'inherit',
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
      width: graphTrendPointsBtnWidthPx,
      minWidth: graphTrendPointsBtnWidthPx,
      maxWidth: graphTrendPointsBtnWidthPx,
      textAlign: 'center',
    };
    const btnGraphTrendPoints = (
      <button type="button" onClick={() => setGraphShowTrendPoints((v) => !v)} style={btnGraphTrendPointsStyle}>
        {graphShowTrendPoints ? 'Masquer les points' : 'Afficher les points'}
      </button>
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 0 }}>
          <div style={styles.filtersRow}>
            <input
              value={graphRecherche}
              onChange={(e) => setGraphRecherche(e.target.value)}
              placeholder="Rechercher un élève, une classe..."
              style={{ ...styles.searchInput, minWidth: 160, flex: '0 1 220px' }}
            />
            {!graphShowNiveaux ? (
              <>
                <button
                  type="button"
                  onClick={() => setGraphShowNiveaux(true)}
                  style={{ padding: '7px 14px', borderRadius: 17, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#94a3b8', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  Trier
                </button>
                {btnGraphTrendPoints}
              </>
            ) : (
              <>
                <div className="chip-tabs" style={{ display: 'flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 }}>
                  <button
                    type="button"
                    onClick={() => { setGraphNiveau(''); setGraphShowNiveaux(false); setGraphClasseId(''); setGraphEleveId(''); }}
                    style={{ padding: '7px 16px', borderRadius: 17, border: 'none', background: !graphNiveau ? '#6366f1' : 'transparent', color: !graphNiveau ? 'white' : '#6d28d9', fontWeight: !graphNiveau ? 700 : 600, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                  >
                    Trier
                  </button>
                  {niveauxTabs.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => { setGraphNiveau(n); setGraphClasseId(''); setGraphEleveId(''); }}
                      style={{ padding: '7px 16px', borderRadius: 17, border: 'none', background: graphNiveau === n ? '#6366f1' : 'transparent', color: graphNiveau === n ? 'white' : '#6d28d9', fontWeight: graphNiveau === n ? 700 : 600, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {btnGraphTrendPoints}
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            <div className="chip-tabs" style={styles.pillGroup}>
              {SESSIONS.map(s => (
                <button key={s} type="button" onClick={() => setGraphSession(prev => prev === s ? '' : s)}
                  style={{ ...styles.pillBtn, ...(graphSession === s ? styles.pillBtnActif : {}) }}>
                  {SESSION_LABEL[s] || s}
                </button>
              ))}
            </div>
            <div className="chip-tabs" style={styles.pillGroup}>
              <button type="button" onClick={() => { setGraphVue('moyenne'); setGraphClasseId(''); setGraphEleveId(''); }} style={{ ...styles.pillBtn, ...(classModeActive ? styles.pillBtnActif : {}) }}>Classes</button>
              <button type="button" onClick={() => { setGraphVue('individuelle'); setGraphClasseId(''); setGraphEleveId(''); }} style={{ ...styles.pillBtn, ...(graphVue === 'individuelle' ? styles.pillBtnActif : {}) }}>Élèves</button>
            </div>
            <div className="chip-tabs" style={styles.pillGroup}>
              <button type="button" onClick={() => setOngletGraphiqueMatiere('francais')} style={{ ...styles.pillBtn, ...(isFr ? styles.pillBtnActif : {}) }}>Français</button>
              <button type="button" onClick={() => setOngletGraphiqueMatiere('math')} style={{ ...styles.pillBtn, ...(!isFr ? styles.pillBtnActif : {}) }}>Math</button>
            </div>
          </div>
        </div>
        {/* Graphique Élèves — liste à gauche + graphique (comme Classes), « Tous les élèves » par défaut */}
        {graphVue === 'individuelle' && (
          <div style={{ height: 'calc(100vh - 260px)', maxHeight: 'calc(100vh - 260px)', overflow: 'hidden', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 20, height: '100%', minHeight: 0, boxSizing: 'border-box' }}>
              <div style={{ width: 300, flexShrink: 0, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 14px', fontWeight: 700, fontSize: 11, color: 'white', background: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '12px 12px 0 0' }}>
                  <span>Élève</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>Moyenne</span>
                </div>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { setGraphEleveId(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setGraphEleveId(''); } }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', background: !graphEleveId ? '#eef2ff' : 'white', color: !graphEleveId ? '#4338ca' : '#1e293b', fontWeight: !graphEleveId ? 700 : 400, borderLeft: `3px solid ${!graphEleveId ? '#6366f1' : 'transparent'}`, borderBottom: '1px solid #e2e8f0', transition: 'background 0.1s' }}
                  >
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Tous les élèves</span>
                    <span style={{ flexShrink: 0, fontWeight: !graphEleveId ? 700 : 600, fontVariantNumeric: 'tabular-nums', color: !graphEleveId ? '#4338ca' : '#64748b' }}>{fmtMoyClasse(moyenneTousEleves)}</span>
                  </div>
                  {elevesFiltered.map((el, idx) => {
                    const isSelected = String(graphEleveId) === String(el.id);
                    const moy = getEleveSessionGlobal(el);
                    const classeNom = classesMap[String(el.classe_id)]?.nom || '';
                    const title = classeNom ? `${el.prenom || ''} ${toDisplayNom(el.nom)} — ${classeNom}` : `${el.prenom || ''} ${toDisplayNom(el.nom)}`;
                    return (
                      <div
                        key={`graph-eleve-side-${el.id}`}
                        role="button"
                        tabIndex={0}
                        title={title}
                        onClick={() => setGraphEleveId(String(el.id))}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setGraphEleveId(String(el.id)); } }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', fontSize: 13, background: isSelected ? '#eef2ff' : idx % 2 === 0 ? 'white' : '#fafbfc', color: isSelected ? '#4338ca' : '#1e293b', fontWeight: isSelected ? 700 : 400, borderLeft: `3px solid ${isSelected ? '#6366f1' : 'transparent'}`, transition: 'background 0.1s' }}
                      >
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{el.prenom} {toDisplayNom(el.nom)}</span>
                        <span style={{ flexShrink: 0, fontWeight: isSelected ? 700 : 500, fontVariantNumeric: 'tabular-nums', color: isSelected ? '#4338ca' : '#64748b' }}>{fmtMoyClasse(moy)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {!graphSession && <div style={styles.msgVide}>Sélectionnez une session.</div>}
                {!graphEleveId && graphSession && dataTousEleves.length === 0 && <div style={styles.msgVide}>Aucune note saisie pour les élèves de ce filtre et cette session.</div>}
                {!graphEleveId && graphSession && dataTousEleves.length > 0 && renderSvgChart(
                  dataTousEleves,
                  {
                    embedClassPanel: true,
                    expandPlotInPanel: true,
                    scrollPlotHorizontally: dataTousEleves.length > 4,
                    showTrend: false,
                    niveau: niveauActif,
                    nom: niveauActif,
                    prenom: '',
                    classe: `${SESSION_LABEL[graphSession] || graphSession} — ${elevesFiltered.length} élève(s)`,
                    identiteLabel: 'Niveau',
                    title: 'Moyennes des élèves',
                    label1: isFr ? 'Oral' : 'Total',
                    label2: isFr ? 'Écrit' : '',
                    showFrenchLevelMarks: false,
                    showMathLevelMarks: false,
                    levelMarks: isFr ? frenchMarks(niveauActif, true) : mathMarks,
                    axisMax: isFr ? 100 : 110,
                    singleSeries: !isFr,
                    maxScoreOverride: isFr ? 100 : 110,
                    cardWidth: '100%',
                  }
                )}
                {graphEleveId && !graphSession && <div style={styles.msgVide}>Sélectionnez une session.</div>}
                {graphEleveId && graphSession && sessionsIndiv.length === 0 && <div style={styles.msgVide}>Aucun résultat saisi pour cet élève.</div>}
                {graphEleveId && graphSession && sessionsIndiv.length > 0 && renderSvgChart(
                  sessionsIndiv.map(s => ({ ...s, label: SESSION_LABEL[s.session] || s.session })),
                  {
                    embedClassPanel: true,
                    expandPlotInPanel: true,
                    showTrend: true,
                    niveau: niveauIndividuel,
                    nom: toDisplayNom(eleveIndividuel?.nom || ''),
                    prenom: eleveIndividuel?.prenom || '',
                    classe: classeIndividuelle?.nom || '',
                    label1: isFr ? 'Oral' : 'Total',
                    label2: isFr ? 'Écrit' : '',
                    levelMarks: isFr ? frenchMarks(niveauIndividuel, false) : mathMarks,
                    axisMax: isFr ? 60 : 110,
                    singleSeries: !isFr,
                    cardWidth: '100%',
                  }
                )}
              </div>
            </div>
          </div>
        )}
        {/* Graphique Classes — même hauteur utile que le tableau Résultats ; défilement uniquement dans la liste classes */}
        {classModeActive && (
          <div style={{ height: 'calc(100vh - 260px)', maxHeight: 'calc(100vh - 260px)', overflow: 'hidden', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 20, height: '100%', minHeight: 0, boxSizing: 'border-box' }}>
            <div style={{ width: 280, flexShrink: 0, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 14px', fontWeight: 700, fontSize: 11, color: 'white', background: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '12px 12px 0 0' }}>
                <span>Classe</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>Moyenne</span>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { setGraphClasseId(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setGraphClasseId(''); } }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', background: !graphClasseId ? '#eef2ff' : 'white', color: !graphClasseId ? '#4338ca' : '#1e293b', fontWeight: !graphClasseId ? 700 : 400, borderLeft: `3px solid ${!graphClasseId ? '#6366f1' : 'transparent'}`, borderBottom: '1px solid #e2e8f0', transition: 'background 0.1s' }}
                >
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Toutes les classes</span>
                  <span style={{ flexShrink: 0, fontWeight: !graphClasseId ? 700 : 600, fontVariantNumeric: 'tabular-nums', color: !graphClasseId ? '#4338ca' : '#64748b' }}>{fmtMoyClasse(moyenneToutesClasses)}</span>
                </div>
                {classesListeGraph.map((cl, idx) => {
                  const isSelected = String(graphClasseId) === String(cl.id);
                  const moy = moyRowByClasseId.get(String(cl.id))?.global ?? null;
                  return (
                    <div
                      key={`graph-classe-side-${cl.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setGraphClasseId(String(cl.id))}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setGraphClasseId(String(cl.id)); } }}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', fontSize: 13, background: isSelected ? '#eef2ff' : idx % 2 === 0 ? 'white' : '#fafbfc', color: isSelected ? '#4338ca' : '#1e293b', fontWeight: isSelected ? 700 : 400, borderLeft: `3px solid ${isSelected ? '#6366f1' : 'transparent'}`, transition: 'background 0.1s' }}
                    >
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cl.nom}</span>
                      <span style={{ flexShrink: 0, fontWeight: isSelected ? 700 : 500, fontVariantNumeric: 'tabular-nums', color: isSelected ? '#4338ca' : '#64748b' }}>{fmtMoyClasse(moy)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {!graphSession && <div style={styles.msgVide}>Sélectionnez une session.</div>}
              {!graphClasseId && graphSession && moyenneSeries.length === 0 && <div style={styles.msgVide}>Aucune moyenne disponible pour les classes de ce niveau et cette session.</div>}
              {!graphClasseId && graphSession && moyenneSeries.length > 0 && renderSvgChart(
                moyenneSeries,
                {
                  embedClassPanel: true,
                  expandPlotInPanel: true,
                  /** Même comportement que l’onglet Élèves : remplissage vertical ; scroll seulement si beaucoup de classes */
                  scrollPlotHorizontally: moyenneSeries.length > 4,
                  showTrend: false,
                  niveau: niveauActif,
                  nom: niveauActif,
                  prenom: '',
                  classe: classesRangeLabel,
                  identiteLabel: 'Niveau',
                  title: 'Moyennes des classes',
                  label1: isFr ? 'Oral' : 'Total',
                  label2: isFr ? 'Écrit' : '',
                  showFrenchLevelMarks: false,
                  showMathLevelMarks: false,
                  levelMarks: isFr ? frenchMarks(niveauActif, true) : mathMarks,
                  axisMax: isFr ? 100 : 110,
                  singleSeries: !isFr,
                  maxScoreOverride: isFr ? 100 : 110,
                  cardWidth: '100%',
                }
              )}
              {graphClasseId && !graphSession && <div style={styles.msgVide}>Sélectionnez une session.</div>}
              {graphClasseId && graphSession && dataClasse.length === 0 && <div style={styles.msgVide}>Aucun résultat saisi pour cette classe et cette session.</div>}
              {graphClasseId && graphSession && dataClasse.length > 0 && renderSvgChart(
                dataClasse,
                {
                  embedClassPanel: true,
                  expandPlotInPanel: true,
                  scrollPlotHorizontally: dataClasse.length > 4,
                  showTrend: false,
                  niveau: niveauClasse,
                  nom: '',
                  prenom: '',
                  label1: isFr ? 'Oral' : 'Total',
                  label2: isFr ? 'Écrit' : '',
                  levelMarks: isFr ? frenchMarks(niveauClasse, false) : mathMarks,
                  axisMax: isFr ? 60 : 110,
                  singleSeries: !isFr,
                  classe: classes.find(c => String(c.id) === String(graphClasseId))?.nom || '',
                  cardWidth: '100%',
                }
              )}
            </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStatistiques = () => {
    const seuil = Number(statSeuil) || 0;
    const matiere = statMatiere;
    const session = statSession;
    const niveauActifStat = statNiveau || (niveaux.length ? niveaux[0] : '');
    const search = statRecherche.trim().toLowerCase();
    const classesNiveauStat = statNiveau
      ? new Set(classes.filter(c => normaliserNiveau(c.niveau) === statNiveau).map(c => String(c.id)))
      : null;
    const sessionsColonnes = session === '2e semestre'
      ? ["Test d'août", '1e semestre', '2e semestre']
      : session === '1e semestre'
        ? ["Test d'août", '1e semestre']
        : ["Test d'août"];
    const labelSession = {
      "Test d'août": 'Août',
      '1e semestre': 'Décembre',
      '2e semestre': 'Mai',
    };

    const rows = eleves
      .filter(e => !classesNiveauStat || classesNiveauStat.has(String(e.classe_id)))
      .map(e => {
        const totalsBySession = {};
        sessionsColonnes.forEach((s) => {
          const sc = getScore(matiere, s, e.id);
          const total = matiere === 'francais' ? calculFr(sc).total : calculMath(sc).total;
          totalsBySession[s] = total === '' ? null : Number(total);
        });
        const totalSessionChoisie = totalsBySession[session] ?? null;
        return {
          id: e.id,
          nom: e.nom || '',
          prenom: e.prenom || '',
          classe: classesMap[String(e.classe_id)]?.nom || '—',
          totalSessionChoisie,
          totalsBySession,
        };
      })
      .filter(r => {
        if (r.totalSessionChoisie == null) return false;
        if (!search) return true;
        return `${r.classe} ${toDisplayNom(r.nom)} ${r.prenom}`.toLowerCase().includes(search);
      });

    const filtres = rows.filter(r => (statSens === 'fort' ? r.totalSessionChoisie >= seuil : r.totalSessionChoisie <= seuil));
    filtres.sort((a, b) => (statOrdre === 'croissant' ? a.totalSessionChoisie - b.totalSessionChoisie : b.totalSessionChoisie - a.totalSessionChoisie));

    return (
      <div>
        <div style={styles.filtersStack}>
          <input
            value={statRecherche}
            onChange={(e) => setStatRecherche(e.target.value)}
            placeholder="Rechercher un élève, une classe..."
            style={{ ...styles.searchInput, width: 200, minWidth: 'unset', flex: 'none' }}
          />
          <div className="chip-tabs" style={styles.pillGroup}>
            {[['francais','Français'],['math','Math']].map(([val,label]) => (
              <button key={val} onClick={() => setStatMatiere(val)}
                style={{ ...styles.pillBtn, ...(statMatiere === val ? styles.pillBtnActif : {}) }}>{label}</button>
            ))}
          </div>
          <div className="chip-tabs" style={styles.pillGroup}>
            {[['fort','Fort'],['faible','Faible']].map(([val,label]) => (
              <button key={val} onClick={() => { setStatSens(val); setStatSeuil(val === 'fort' ? '80' : '40'); }}
                style={{ ...styles.pillBtn, ...(statSens === val ? styles.pillBtnActif : {}) }}>{label}</button>
            ))}
          </div>
          <div className="chip-tabs" style={styles.pillGroup}>
            {[['croissant','Croissant'],['decroissant','Décroissant']].map(([val,label]) => (
              <button key={val} onClick={() => setStatOrdre(val)}
                style={{ ...styles.pillBtn, ...(statOrdre === val ? styles.pillBtnActif : {}) }}>{label}</button>
            ))}
          </div>
          {!statShowNiveaux ? (
            <button type="button" onClick={() => setStatShowNiveaux(true)}
              style={{ padding: '7px 14px', borderRadius: 17, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#94a3b8', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              Trier
            </button>
          ) : (
            <div className="chip-tabs" style={{ display: 'flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 }}>
              <button type="button" onClick={() => { setStatNiveau(''); setStatShowNiveaux(false); }}
                style={{ padding: '7px 16px', borderRadius: 17, border: 'none', background: !statNiveau ? '#6366f1' : 'transparent', color: !statNiveau ? 'white' : '#6d28d9', fontWeight: !statNiveau ? 700 : 600, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                Trier
              </button>
              {niveauxTabs.map(n => (
                <button key={n} type="button" onClick={() => setStatNiveau(n)}
                  style={{ padding: '7px 16px', borderRadius: 17, border: 'none', background: statNiveau === n ? '#6366f1' : 'transparent', color: statNiveau === n ? 'white' : '#6d28d9', fontWeight: statNiveau === n ? 700 : 600, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ ...styles.filtersRow, justifyContent: 'flex-end' }}>
          <div className="chip-tabs" style={styles.pillGroup}>
            {SESSIONS.map(s => (
              <button key={s} type="button" onClick={() => setStatSession(prev => prev === s ? '' : s)}
                style={{ ...styles.pillBtn, ...(statSession === s ? styles.pillBtnActif : {}) }}>
                {labelSession[s] || s}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Points :</span>
          <input type="number" value={statSeuil} onChange={e => setStatSeuil(e.target.value)}
            style={{ ...styles.select, width: 90 }} placeholder="Seuil" />
        </div>

        {!statSession ? (
          <div style={styles.msgVide}>Sélectionnez une session pour afficher les statistiques.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <colgroup>
                <col style={{ width: 60, minWidth: 60, maxWidth: 60 }} />
                <col style={{ width: 95, minWidth: 95, maxWidth: 95 }} />
                <col style={{ width: 160, minWidth: 160, maxWidth: 160 }} />
                <col style={{ width: 160, minWidth: 160, maxWidth: 160 }} />
                {sessionsColonnes.map((s) => <col key={`col-stat-${s}`} style={{ width: 98, minWidth: 98, maxWidth: 98 }} />)}
              </colgroup>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.thCenter}>N°</th>
                  <th style={styles.thCenter}>Classe</th>
                  <th style={styles.thLeft}>Nom</th>
                  <th style={styles.thLeft}>Prénom</th>
                  {sessionsColonnes.map((s) => (
                    <th key={`th-stat-${s}`} style={styles.thCenter}>{labelSession[s] || s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtres.map((r, i) => {
                  return (
                    <tr key={r.id}>
                      <td style={styles.tdCenter}>{i + 1}</td>
                      <td style={styles.tdCenter}>{r.classe}</td>
                      <td style={styles.tdLeft}>{toDisplayNom(r.nom)}</td>
                      <td style={styles.tdLeft}>{r.prenom}</td>
                      {sessionsColonnes.map((s) => {
                        const v = r.totalsBySession[s];
                        const c = v == null ? {} : couleurTotale(v);
                        return (
                          <td key={`td-stat-${r.id}-${s}`} style={{ ...styles.tdCenterRead, ...c }}>
                            {v == null ? '—' : v}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {filtres.length === 0 && (
                  <tr><td colSpan={4 + sessionsColonnes.length} style={styles.empty}>Aucun élève ne correspond au tri.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const afficherSaveMsg = (tab, msg = 'Sauvegarde effectuée.') => {
    setSaveMsgByTab(prev => ({ ...prev, [tab]: msg }));
    setSaveToast(msg);
    setTimeout(() => {
      setSaveMsgByTab(prev => ({ ...prev, [tab]: '' }));
      setSaveToast('');
    }, 2000);
  };

  const handleSavePool = async () => {
    const sitesSansNiveau = siteOrder.filter((siteKey) => !(siteLevels?.[siteKey] || []).length);
    if (sitesSansNiveau.length > 0) {
      const noms = sitesSansNiveau.map((siteKey, idx) => siteNames?.[siteKey] || `Site ${idx + 1}`).join(', ');
      alert(`Sélection du niveau obligatoire.\n\nVeuillez sélectionner au moins un niveau pour : ${noms}.`);
      return;
    }
    const payload = { siteOrder, siteCounter, siteNames, siteLevels, selectedBySite, splitByProf, poolCellOverrides };
    try {
      await sauvegarderEtatTCFServeur(TCF_STATE_KEYS.pool, payload);
    } catch (err) {
      alert('Erreur sauvegarde serveur (Pool): ' + (err.response?.data?.message || err.message));
      return;
    }
    setPoolDirty(false);
    afficherSaveMsg('pool');
  };

  const handleSaveAffectation = async () => {
    if (onglet === 'classes') {
      const sitesSansDate = siteOrder.filter((siteKey) => {
        const d = String(affectationDateDebutBySite?.[siteKey] || '').trim();
        return !d;
      });
      if (sitesSansDate.length > 0) {
        const noms = sitesSansDate
          .map((siteKey, idx) => siteNames?.[siteKey] || `Site ${idx + 1}`)
          .join(', ');
        alert(`Date de début obligatoire.\n\nVeuillez renseigner la date pour : ${noms}.`);
        return;
      }
    }
    const cleanedRoles = {};
    for (const [key, rolesMap] of Object.entries(rolesAffectesByPoolDemi)) {
      const siteK = key.split('::')[0];
      const poolSet = new Set((selectedBySite[siteK] || []).map(String));
      const cleaned = {};
      for (const [pid, role] of Object.entries(rolesMap)) {
        if (String(pid).startsWith('resp_') || poolSet.has(String(pid))) {
          cleaned[pid] = role;
        }
      }
      cleanedRoles[key] = cleaned;
    }
    const payload = {
      updatedAt: new Date().toISOString(),
      dateDebutBySite: affectationDateDebutBySite,
      horairesBySite: affectationHorairesBySite,
      classesBySite: affectationClassesBySite,
      joursActifsBySite: affectationJoursActifsBySite,
      rolesByPoolDemi: cleanedRoles,
      organisationByPoolDemi: organisationByPoolDemi,
    };
    try {
      await sauvegarderEtatTCFServeur(TCF_STATE_KEYS.affectation, payload);
    } catch (err) {
      alert('Erreur sauvegarde serveur (Classes/Rôles): ' + (err.response?.data?.message || err.message));
      return;
    }
    savedAffectationRef.current = payload;
    setAffectationDirty(false);
    afficherSaveMsg(onglet === 'roles' ? 'roles' : 'classes');
  };

  const resetAffectationToSaved = () => {
    appliquerAffectationState(savedAffectationRef.current);
    setAffectationDirty(false);
  };

  const handleSaveResultat = async () => {
    try {
      await sauvegarderEtatTCFServeur(TCF_STATE_KEYS.resultats, scores);
    } catch (err) {
      alert('Erreur sauvegarde serveur (Résultats): ' + (err.response?.data?.message || err.message));
      return;
    }
    savedScoresRef.current = scores;
    setResultatDirty(false);
    afficherSaveMsg('resultat');
  };

  const resetResultatToSaved = () => {
    setScores(savedScoresRef.current || {});
    setResultatDirty(false);
  };

  const confirmResultatDiscardIfNeeded = () => {
    if (!tabHasUnsaved('resultat')) return true;
    const ok = window.confirm('Des changements ne sont pas sauvegardés. Voulez-vous quitter cette vue sans sauvegarder ?');
    if (!ok) return false;
    resetResultatToSaved();
    return true;
  };

  const tabHasUnsaved = (tab) => {
    if (tab === 'pool') return poolDirty;
    if (tab === 'affectation' || tab === 'classes' || tab === 'roles') return affectationDirty;
    if (tab === 'resultat') return resultatDirty && JSON.stringify(scores) !== JSON.stringify(savedScoresRef.current || {});
    return false;
  };

  const handleTabChange = (nextTab) => {
    if (nextTab === onglet) return;
    if (tabHasUnsaved(onglet)) {
      const ok = window.confirm('Des changements ne sont pas sauvegardés. Voulez-vous quitter cet onglet sans sauvegarder ?');
      if (!ok) return;
      if (onglet === 'affectation' || onglet === 'classes' || onglet === 'roles') resetAffectationToSaved();
      if (onglet === 'resultat') resetResultatToSaved();
    }
    setOnglet(nextTab);
  };

  const handleSaveCurrentTab = async () => {
    if (!tabHasUnsaved(onglet)) { afficherSaveMsg(onglet, 'Aucun changement à sauvegarder.'); return; }
    try {
      setSaving(true);
      if (onglet === 'pool') await handleSavePool();
      else if (onglet === 'affectation' || onglet === 'classes' || onglet === 'roles') await handleSaveAffectation();
      else if (onglet === 'resultat') await handleSaveResultat();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={{...stickyPageChrome(), paddingBottom:0, marginBottom:0}}>
      <div style={styles.header}>
        <h2 style={styles.title}>Test de connaissances</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {(onglet === 'pool' || onglet === 'affectation' || onglet === 'classes' || onglet === 'roles' || onglet === 'resultat') && (
            <>
              {saveToast && (
                <span style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 8, background: '#ede9fe', color: '#4c1d95' }}>
                  {saveToast}
                </span>
              )}
              {onglet === 'pool' && (
                <button onClick={ajouterSite} style={styles.btnSauver}>+ Ajouter</button>
              )}
              <LoadingButton onClick={handleSaveCurrentTab} style={styles.btnSauver} loading={saving}>Sauvegarder</LoadingButton>
            </>
          )}
          {onglet === 'plannings' && planningsType === 'classes' && (
            <>
              <button type="button" onClick={printAllConvocations} style={{ ...styles.btnAjouter, background: '#6366f1', color: 'white', border: '1px solid #6366f1' }}>Tout imprimer</button>
              <button type="button" onClick={printConvocation} style={{ ...styles.btnAjouter, background: '#6366f1', color: 'white', border: '1px solid #6366f1' }}>Imprimer</button>
            </>
          )}
          {onglet === 'plannings' && planningsType === 'roles' && (
            <>
              <button type="button" onClick={printAllRoles} style={{ ...styles.btnAjouter, background: '#6366f1', color: 'white', border: '1px solid #6366f1' }}>Tout imprimer</button>
              <button type="button" onClick={printRoles} style={{ ...styles.btnAjouter, background: '#6366f1', color: 'white', border: '1px solid #6366f1' }}>Imprimer</button>
            </>
          )}
          {onglet === 'plannings' && planningsType === 'professeurs' && (
            <button type="button" onClick={printProfPlanning} style={{ ...styles.btnAjouter, background: '#6366f1', color: 'white', border: '1px solid #6366f1' }}>Imprimer</button>
          )}
          {onglet === 'graphique' && (
            <>
              <button type="button" onClick={() => {
                const isFr = ongletGraphiqueMatiere === 'francais';
                const niveauActif = graphNiveau || (niveaux.length ? niveaux[0] : '');
                const classesNiveau = classes.filter(c => normaliserNiveau(c.niveau) === niveauActif).sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
                const elevesNiveauGraph = eleves.filter(e => new Set(classesNiveau.map(c => String(c.id))).has(String(e.classe_id))).sort((a, b) => `${toDisplayNom(a.nom) || ''} ${a.prenom || ''}`.localeCompare(`${toDisplayNom(b.nom) || ''} ${b.prenom || ''}`, 'fr'));
                const maxScore = isFr ? 60 : 110;
                if (graphVue === 'classe' || graphVue === 'moyenne') {
                  const sessionsList = graphSession ? [graphSession] : SESSIONS.slice();
                  const charts = classesNiveau.flatMap(cl => {
                    const elevsCl = eleves.filter(e => String(e.classe_id) === String(cl.id)).sort((a, b) => `${toDisplayNom(a.nom) || ''} ${a.prenom || ''}`.localeCompare(`${toDisplayNom(b.nom) || ''} ${b.prenom || ''}`, 'fr'));
                    return sessionsList.map(session => {
                      const series = elevsCl.map(e => {
                        const sc = getScore(ongletGraphiqueMatiere, session, String(e.id));
                        if (isFr) { const fr = calculFr(sc); return { label: `${e.prenom} ${toDisplayNom(e.nom)}`, v1: Number(fr.oral || 0), v2: Number(fr.ecrit || 0), hasData: fr.total !== '' }; }
                        const ma = calculMath(sc); return { label: `${e.prenom} ${toDisplayNom(e.nom)}`, v1: Number(ma.total || 0), v2: 0, hasData: ma.total !== '' };
                      }).filter(e => e.hasData);
                      if (series.length === 0) return null;
                      return { label: `${cl.nom} — ${SESSION_LABEL[session] || session}`, series, nom: cl.nom, prenom: '', classe: cl.nom, niveau: normaliserNiveau(cl.niveau || ''), showTrend: false };
                    }).filter(Boolean);
                  });
                  if (charts.length === 0) { alert('Aucun résultat saisi pour ce niveau.'); return; }
                  printCharts(charts, isFr, maxScore, true);
                } else {
                  const sessionsToShowIds = graphSession === "2e semestre" ? ["Test d'août", '1e semestre', '2e semestre'] : graphSession === '1e semestre' ? ["Test d'août", '1e semestre'] : graphSession === "Test d'août" ? ["Test d'août"] : SESSIONS.slice();
                  const charts = elevesNiveauGraph.map(e => {
                    const series = sessionsToShowIds.map(session => {
                      const sc = getScore(ongletGraphiqueMatiere, session, String(e.id));
                      if (isFr) { const fr = calculFr(sc); return { session, v1: Number(fr.oral || 0), v2: Number(fr.ecrit || 0), hasData: fr.total !== '' }; }
                      const ma = calculMath(sc); return { session, v1: Number(ma.cscCfr || 0), v2: Number(ma.cafCap || 0), hasData: ma.total !== '' };
                    }).filter(s => s.hasData);
                    const classe = classesMap[String(e.classe_id)]?.nom || '';
                    return { label: `${e.prenom} ${toDisplayNom(e.nom)} — ${classe}`, series: series.map(s => ({ ...s, label: SESSION_LABEL[s.session] || s.session })), nom: toDisplayNom(e.nom), prenom: e.prenom || '', classe, niveau: normaliserNiveau(classesMap[String(e.classe_id)]?.niveau || ''), showTrend: true };
                  }).filter(c => c.series.length > 0);
                  if (charts.length === 0) { alert('Aucun résultat saisi pour ce niveau.'); return; }
                  printCharts(charts, isFr, maxScore);
                }
              }} style={{ ...styles.btnAjouter, background: '#6366f1', color: 'white', border: '1px solid #6366f1' }}>Tout imprimer</button>
              <button type="button" onClick={() => {
                const isFr = ongletGraphiqueMatiere === 'francais';
                const niveauActif = graphNiveau || (niveaux.length ? niveaux[0] : '');
                const classesNiveau = classes
                  .filter(c => !graphNiveau || normaliserNiveau(c.niveau) === graphNiveau)
                  .sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
                const elevesNiveauGraph = eleves.filter(e => new Set(classesNiveau.map(c => String(c.id))).has(String(e.classe_id))).sort((a, b) => `${toDisplayNom(a.nom) || ''} ${a.prenom || ''}`.localeCompare(`${toDisplayNom(b.nom) || ''} ${b.prenom || ''}`, 'fr'));
                const maxScore = isFr ? 60 : 110;
                const sessionsToShowIds = graphSession === "2e semestre" ? ["Test d'août", '1e semestre', '2e semestre'] : graphSession === '1e semestre' ? ["Test d'août", '1e semestre'] : graphSession === "Test d'août" ? ["Test d'août"] : [];
                if (graphVue === 'individuelle' && !graphEleveId && graphSession) {
                  const classeIdsN = new Set(classesNiveau.map(c => String(c.id)));
                  const elevesF = eleves.filter(e => classeIdsN.has(String(e.classe_id))).sort((a, b) => `${toDisplayNom(a.nom) || ''} ${a.prenom || ''}`.localeCompare(`${toDisplayNom(b.nom) || ''} ${b.prenom || ''}`, 'fr'));
                  const searchT = graphRecherche.trim().toLowerCase();
                  const elevesFilt = !searchT ? elevesF : elevesF.filter((e) => {
                    const cn = classesMap[String(e.classe_id)]?.nom || '';
                    return `${toDisplayNom(e.nom)} ${e.prenom} ${cn}`.toLowerCase().includes(searchT);
                  });
                  const dataAll = elevesFilt.map((e) => {
                    const scFr = getScore('francais', graphSession, String(e.id));
                    const scMa = getScore('math', graphSession, String(e.id));
                    const fr = calculFr(scFr);
                    const ma = calculMath(scMa);
                    const v1 = fr.total !== '' ? Number(fr.total) : null;
                    const v2 = ma.total !== '' ? Number(ma.total) : null;
                    const hasData = v1 != null || v2 != null;
                    return { label: `${e.prenom || ''} ${toDisplayNom(e.nom)}`.trim(), v1: v1 != null ? Math.round(v1 * 10) / 10 : 0, v2: v2 != null ? Math.round(v2 * 10) / 10 : 0, hasData };
                  }).filter((x) => x.hasData).map(({ label, v1, v2 }) => ({ label, v1, v2 }));
                  if (dataAll.length === 0) return;
                  printCharts([{ label: `Moyennes élèves — ${SESSION_LABEL[graphSession] || graphSession}`, series: dataAll, nom: niveauActif, prenom: '', classe: `${elevesFilt.length} élève(s)`, niveau: niveauActif, showTrend: false, levelMarksAggregate: true }], isFr, 100);
                } else if (graphVue === 'individuelle' && graphEleveId) {
                  const sessionsIndiv = sessionsToShowIds.map(session => { const sc = getScore(ongletGraphiqueMatiere, session, graphEleveId); if (isFr) { const fr = calculFr(sc); return { session, v1: Number(fr.oral || 0), v2: Number(fr.ecrit || 0), hasData: fr.total !== '' }; } const ma = calculMath(sc); return { session, v1: Number(ma.cscCfr || 0), v2: Number(ma.cafCap || 0), hasData: ma.total !== '' }; }).filter(s => s.hasData);
                  if (sessionsIndiv.length === 0) return;
                  const e = eleves.find(ev => String(ev.id) === graphEleveId);
                  const classe = classesMap[String(e?.classe_id)]?.nom || '';
                  const niveau = normaliserNiveau(classesMap[String(e?.classe_id)]?.niveau || '');
                  printCharts([{ label: `${e?.prenom || ''} ${toDisplayNom(e?.nom || '')} — ${classe}`, series: sessionsIndiv.map(s => ({ ...s, label: SESSION_LABEL[s.session] || s.session })), nom: toDisplayNom(e?.nom || ''), prenom: e?.prenom || '', classe, niveau, showTrend: true }], isFr, maxScore);
                } else if ((graphVue === 'moyenne' || graphVue === 'classe') && graphClasseId && graphSession) {
                  const elevesClasseFiltres = eleves.filter(e => String(e.classe_id) === String(graphClasseId)).sort((a, b) => `${toDisplayNom(a.nom) || ''} ${a.prenom || ''}`.localeCompare(`${toDisplayNom(b.nom) || ''} ${b.prenom || ''}`, 'fr'));
                  const classe = classes.find(c => String(c.id) === graphClasseId);
                  const seriesClasse = elevesClasseFiltres.map(e => {
                    const sc = getScore(ongletGraphiqueMatiere, graphSession, String(e.id));
                    if (isFr) { const fr = calculFr(sc); return { label: `${e.prenom} ${toDisplayNom(e.nom)}`, v1: Number(fr.oral || 0), v2: Number(fr.ecrit || 0), hasData: fr.total !== '' }; }
                    const ma = calculMath(sc); return { label: `${e.prenom} ${toDisplayNom(e.nom)}`, v1: Number(ma.total || 0), v2: 0, hasData: ma.total !== '' };
                  }).filter(e => e.hasData);
                  if (seriesClasse.length === 0) { alert('Aucun résultat saisi pour cette classe.'); return; }
                  printCharts([{ label: `${classe?.nom || ''} — ${SESSION_LABEL[graphSession] || graphSession}`, series: seriesClasse, nom: classe?.nom || '', prenom: '', classe: classe?.nom || '', niveau: normaliserNiveau(classe?.niveau || ''), showTrend: false }], isFr, maxScore, true);
                }
              }} style={{ ...styles.btnSauver, background: '#6366f1', color: 'white', border: '1px solid #6366f1' }}>Imprimer</button>
            </>
          )}
        </div>
      </div>

      </div>

      <div style={styles.tabContent}>
        {onglet === 'pool' && (
          <div>
            <div className="chip-tabs" style={{ ...styles.pillGroup, display: 'inline-flex', marginBottom: 14 }}>
              {siteOrder.map((siteKey, idx) => (
                <button
                  key={`pool-site-tab-${siteKey}`}
                  type="button"
                  onClick={() => setSiteActif(siteKey)}
                  style={{ ...styles.subTabBtn, ...(siteActif === siteKey ? styles.subTabBtnActif : {}) }}
                >
                  {siteNames[siteKey] || `Site ${idx + 1}`}
                </button>
              ))}
            </div>
            <div>
              {siteActif && renderSelectionSite(siteActif, `Site N°${siteOrder.indexOf(siteActif) + 1}`, true)}
            </div>
          </div>
        )}

        {onglet === 'affectation' && (() => {
          const affectationToggle = (
            <div style={{ ...styles.pillGroup, display: 'inline-flex' }}>
              {[{ id: 'classes', label: 'Classes' }, { id: 'roles', label: 'Rôles' }].map(t => (
                <button
                  key={`affectation-tab-${t.id}`}
                  type="button"
                  onClick={() => setAffectationSousOnglet(t.id)}
                  style={{ ...styles.subTabBtn, ...(affectationSousOnglet === t.id ? styles.subTabBtnActif : {}) }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          );
          return (
            <div>
              {affectationSousOnglet === 'classes' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                    <div style={{ ...styles.pillGroup, display: 'inline-flex' }}>
                      {siteOrder.map((siteKey, idx) => (
                        <button
                          key={`affectation-classes-site-tab-${siteKey}`}
                          type="button"
                          onClick={() => setSiteActif(siteKey)}
                          style={{ ...styles.subTabBtn, ...(siteActif === siteKey ? styles.subTabBtnActif : {}) }}
                        >
                          {siteNames[siteKey] || `Site ${idx + 1}`}
                        </button>
                      ))}
                    </div>
                    {affectationToggle}
                  </div>
                  {siteActif ? renderTableAffectationSite(siteActif) : <div style={styles.empty}>Aucun site disponible.</div>}
                </div>
              )}

              {affectationSousOnglet === 'roles' && renderRoles({ extraHeader: affectationToggle })}
            </div>
          );
        })()}

        {onglet === 'classes' && (
        <div>
          <div style={{ ...styles.pillGroup, display: 'inline-flex', marginBottom: 14 }}>
            {siteOrder.map((siteKey, idx) => (
              <button
                key={`classes-site-tab-${siteKey}`}
                type="button"
                onClick={() => setSiteActif(siteKey)}
                style={{ ...styles.subTabBtn, ...(siteActif === siteKey ? styles.subTabBtnActif : {}) }}
              >
                {siteNames[siteKey] || `Site ${idx + 1}`}
              </button>
            ))}
          </div>
          {siteActif ? renderTableAffectationSite(siteActif) : <div style={styles.empty}>Aucun site disponible.</div>}
        </div>
        )}

        {onglet === 'roles' && renderRoles()}

        {onglet === 'plannings' && (() => {
          const sitePlan = planningsSite || siteOrder[0] || '';
          return (
          <div>
            <div className="tcf-no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <div className="chip-tabs" style={styles.pillGroup}>
                {siteOrder.map((sk, idx) => (
                  <button key={`plan-site-${sk}`} type="button"
                    onClick={() => setPlanningsSite(sk)}
                    style={{ ...styles.pillBtn, ...(sitePlan === sk ? styles.pillBtnActif : {}) }}>
                    {siteNames[sk] || `Site ${idx + 1}`}
                  </button>
                ))}
              </div>
              <div className="chip-tabs" style={styles.pillGroup}>
                {[{ id: 'professeurs', label: 'Professeurs' }, { id: 'classes', label: 'Classes' }, { id: 'roles', label: 'Rôles' }].map(t => (
                  <button key={`plan-type-${t.id}`} type="button"
                    onClick={() => setPlanningsType(t.id)}
                    style={{ ...styles.pillBtn, ...(planningsType === t.id ? styles.pillBtnActif : {}) }}>
                    {t.label}
                  </button>
                ))}
              </div>
              {planningsType === 'classes' && (
                <CustomSelect
                  value={classeConvocation}
                  onChange={(v) => setClasseConvocation(v)}
                  options={(classesEligiblesSite[planningsSite || siteOrder[0]] || []).map(cl => ({ value: cl.id, label: cl.nom }))}
                  placeholder="Choisir une classe"
                  style={{ ...styles.select, minWidth: 220 }}
                />
              )}
              {planningsType === 'roles' && (
                <CustomSelect
                  value={rolesDemiJourneeSelect}
                  onChange={(v) => setRolesDemiJourneeSelect(v)}
                  options={DEMI_JOURNEES.map(d => ({ value: d.id, label: d.label }))}
                  placeholder="Choisir une demi-journée"
                  style={styles.select}
                />
              )}
            </div>
            <div ref={convocationRef} style={{ background: 'white', borderRadius: 12, padding: '24px 28px', marginTop: 15, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <style>{`@media print { .tcf-no-print { display: none !important; } .tcf-print-page { padding: 0 !important; border: none !important; box-shadow: none !important; } }`}</style>
              {/* En-tête */}
              <div className="conv-entete" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18, paddingBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <img src="/logo-etat-du-valais.png" alt="" style={{ width: 38, height: 'auto', objectFit: 'contain', backgroundColor: 'white', padding: 2 }} onError={e => { e.target.style.display = 'none'; }} />
                  <div style={{ fontSize: 12, lineHeight: 1.5, color: '#334155' }}>
                    <div>Département de la santé, des affaires sociales et de la culture</div>
                    <div>Service de l'action sociale</div>
                    <div>Office de l'asile</div>
                    <div>Centre de formation "Le Botza"</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: '#1e293b' }}>SCAI</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{anneeScolaire || '—'}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>CLASSES D'ACCUEIL</div>
                </div>
              </div>
              {/* Titre */}
              <div className="conv-titre" style={{ textAlign: 'center', fontWeight: 700, fontSize: 25, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 40, marginTop: 60, color: '#0f172a' }}>
                {planningsType === 'roles' ? (() => {
                  const demi = DEMI_JOURNEES.find(d => d.id === rolesDemiJourneeSelect);
                  let dateStr = '';
                  if (demi && affectationDateDebutBySite?.[sitePlan]) {
                    const d = new Date(affectationDateDebutBySite[sitePlan]);
                    d.setDate(d.getDate() + JOURS.indexOf(demi.jour));
                    dateStr = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
                  }
                  const momentLabel = demi?.moment === 'matin' ? 'Matin' : demi?.moment === 'apresMidi' ? 'Après-midi' : '';
                  return <>Répartition des tâches{demi && dateStr ? <><br /><span style={{ fontSize: 16, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{dateStr} — {demi.jour} {momentLabel}</span></> : null}</>;
                })() : planningsType === 'professeurs' ? 'Répartition des professeurs' : 'Convocation — Test de connaissance du français'}
              </div>
              {/* Date sous le titre (classes + professeurs) */}
              {(planningsType === 'classes' || planningsType === 'professeurs') && (
                <div className="conv-date" style={{ textAlign: 'right', fontSize: 16, color: '#1e293b', marginBottom: 40 }}>
                  Vétroz, le {new Date().toLocaleDateString('fr-CH')}
                </div>
              )}
              {/* Contenu */}
              {!sitePlan ? (
                <div style={styles.empty}>Aucun site disponible.</div>
              ) : planningsType === 'classes' ? (() => {
                const font = "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif";
                const p = { fontSize: 16, lineHeight: 1.7, color: '#1e293b', fontFamily: font, marginBottom: 14 };
                return (
                  <div style={{ fontFamily: font }}>
                    <p style={p}>Madame, Monsieur,</p>
                    <p style={p}>
                      Nous vous informons que vous êtes convoqué(e) au <strong>test de connaissance du français</strong>. Ce test évalue vos compétences linguistiques.
                    </p>
                    <p style={p}>
                      Horaire matin : <strong>{getHoraireSite(sitePlan, 'matinDebut')} – {getHoraireSite(sitePlan, 'matinFin')}</strong> &bull; Horaire après-midi : <strong>{getHoraireSite(sitePlan, 'apresMidiDebut')} – {getHoraireSite(sitePlan, 'apresMidiFin')}</strong>
                    </p>
                    {classeConvocation ? (() => {
                      const cl = classes.find(c => String(c.id) === String(classeConvocation));
                      const aff = getClasseJourHoraire(sitePlan, classeConvocation);
                      return (
                        <p style={p}>
                          Classe : <strong>{cl?.nom || '—'}</strong>&emsp;
                          Lieu : <strong>{siteNames[sitePlan] || sitePlan}</strong>&emsp;
                          Jour : <strong>{aff?.jour || '—'}</strong>&emsp;
                          Horaire : <strong>{aff?.horaire || '—'}</strong>
                        </p>
                      );
                    })() : (
                      <div style={{ marginTop: 20, marginBottom: 20 }}>
                        {renderTableAffectationSiteReadOnly(sitePlan)}
                      </div>
                    )}
                    <div style={{ marginBottom: 25 }} />
                    <p style={{ ...p, fontWeight: 700 }}>Informations importantes</p>
                    <p style={p}>
                      Vous êtes convoqué(e) <strong>uniquement à la demi-journée correspondant à votre classe</strong>, telle qu'elle figure sur le planning ci-dessus.
                      Veuillez vous présenter à l'heure indiquée — <strong>toute arrivée tardive ne pourra être tolérée</strong>.
                    </p>
                    <p style={p}>
                      <strong>Aucun rattrapage ne sera organisé</strong> en cas d'absence ou de maladie le jour du test.
                    </p>
                    <p style={p}>Nous comptons sur votre ponctualité et votre sérieux pour le bon déroulement de cette évaluation. Pour toute question, n'hésitez pas à vous adresser à votre responsable de classe ou à l'administration du centre.</p>
                    <p style={{ ...p, marginTop: 24 }}>Cordialement,</p>
                    <p className="conv-direction" style={{ ...p, fontWeight: 700, marginTop: 50, paddingRight: '2cm', textAlign: 'right' }}>La direction</p>
                  </div>
                );
              })()
              : planningsType === 'professeurs' ? (() => {
                const joursActifs = JOURS.filter(j => isJourActifSite(sitePlan, j));
                const poolIds = (selectedBySite[sitePlan] || []).map(id => String(id));
                const getProfNom = (pid) => {
                  const p = profMap[String(pid)];
                  if (!p) return '';
                  return p.prenom ? `${p.prenom} ${toDisplayNom(p.nom) || ''}`.trim() : p.nom;
                };
                const getDateStr = (jour) => {
                  if (!affectationDateDebutBySite?.[sitePlan]) return '';
                  const dt = new Date(affectationDateDebutBySite[sitePlan]);
                  dt.setDate(dt.getDate() + JOURS.indexOf(jour));
                  return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}`;
                };
                const getEffectif = (jour, moment) =>
                  poolIds.filter(pid => statutCellule(sitePlan, pid, jour, moment) === 'vert').length;
                const isReserveCellule = (pid, jour, moment) =>
                  statutCellule(sitePlan, pid, jour, moment) === 'rouge' && rActifCellule(sitePlan, pid, jour, moment);
                const getCellProfs = (jour, moment) => {
                  const sortByPrenom = (a, b) => (profMap[a]?.prenom || '').localeCompare(profMap[b]?.prenom || '', 'fr');
                  const reserves = poolIds.filter(pid => isReserveCellule(pid, jour, moment)).sort(sortByPrenom).map(pid => getProfNom(pid)).filter(Boolean);
                  const regular = poolIds.filter(pid => statutCellule(sitePlan, pid, jour, moment) === 'vert').sort(sortByPrenom).map(pid => getProfNom(pid)).filter(Boolean);
                  return { regular, reserves };
                };
                const cellStyle = { ...styles.tdLeft, verticalAlign: 'top', padding: '6px 8px' };
                const font = "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif";
                const pStyle = { fontSize: 16, lineHeight: 1.7, color: '#1e293b', fontFamily: font, marginBottom: 6 };
                const horaireMatin = `${getHoraireSite(sitePlan, 'matinDebutProf')} – ${getHoraireSite(sitePlan, 'matinFinProf')}`;
                const horaireAM = `${getHoraireSite(sitePlan, 'apresMidiDebutProf')} – ${getHoraireSite(sitePlan, 'apresMidiFinProf')}`;
                return (
                  <>
                    <div style={{ ...pStyle, marginBottom: 2 }}>Lieu : <strong>{siteNames[sitePlan] || sitePlan}</strong></div>
                    <div style={{ ...pStyle, marginBottom: 20 }}>Horaire matin : <strong>{horaireMatin}</strong>&emsp;&bull;&emsp;Horaire après-midi : <strong>{horaireAM}</strong></div>
                    {['matin', 'apresMidi'].map((moment, mi) => (
                      <div key={moment} style={{ ...styles.tableWrap, marginTop: mi === 1 ? 20 : 0 }}>
                        <table style={{ ...styles.tableLarge, tableLayout: 'fixed' }}>
                          <tbody>
                            <tr style={styles.thead}>
                              <td rowSpan={3} style={{ ...styles.thCenter, width: 36, verticalAlign: 'middle', background: '#eef2ff', color: '#4338ca', fontSize: 16 }}>
                                <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', display: 'inline-block', fontWeight: 700 }}>{moment === 'matin' ? 'Matin' : 'Après-midi'}</span>
                              </td>
                              {joursActifs.map(j => {
                                const eff = getEffectif(j, moment);
                                const date = getDateStr(j);
                                return (
                                  <td key={j} style={{ ...styles.thCenter, fontSize: 15 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                      {eff > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, borderRadius: '50%', background: '#eef2ff', color: '#4338ca', fontSize: 11, fontWeight: 700, border: '1px solid #a5b4fc', flexShrink: 0 }}>{eff}</span>}
                                      <span>{j}{date ? ` - ${date}` : ''}</span>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                            <tr>
                              {joursActifs.map(j => {
                                const { regular } = getCellProfs(j, moment);
                                return (
                                  <td key={j} style={{ ...cellStyle, verticalAlign: 'top' }}>
                                    {regular.map((nom, i) => (
                                      <span key={i} style={{ display: 'block', color: '#1e293b', fontSize: 16, fontWeight: 400, lineHeight: 1.4 }}>{nom}</span>
                                    ))}
                                  </td>
                                );
                              })}
                            </tr>
                            <tr>
                              {joursActifs.map(j => {
                                const { reserves } = getCellProfs(j, moment);
                                return (
                                  <td key={j} style={{ ...cellStyle, verticalAlign: 'top', borderTop: '1px solid #e2e8f0' }}>
                                    {reserves.length > 0 ? (
                                      <>
                                        <span style={{ display: 'block', color: '#1e293b', fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>Réserve</span>
                                        {reserves.map((nom, i) => (
                                          <span key={i} style={{ display: 'block', color: '#1e293b', fontSize: 16, fontWeight: 400, lineHeight: 1.4 }}>{nom}</span>
                                        ))}
                                      </>
                                    ) : null}
                                  </td>
                                );
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ))}
                    <div style={{ marginTop: 28 }}>
                      <div style={{ ...pStyle, fontWeight: 700, marginBottom: 8 }}>Information importante</div>
                      <div style={{ ...pStyle, textAlign: 'left' }}>Les professeurs listés en bas de chaque colonne sous la mention <strong>Réserve</strong> sont désignés comme professeurs de réserve. À ce titre, ils sont tenus de se libérer impérativement lors de la demi-journée pour laquelle ils sont inscrits en réserve, afin de pouvoir intervenir en remplacement d'un collègue absent ou empêché.</div>
                      <div style={{ ...pStyle, marginTop: 10, textAlign: 'left' }}>Nous comptons sur votre engagement et votre sens des responsabilités pour garantir le bon déroulement du test dans les meilleures conditions.</div>
                      <div style={{ ...pStyle, marginTop: 24 }}>Cordialement,</div>
                      <div style={{ ...pStyle, fontWeight: 700, marginTop: 50, paddingRight: '2cm', textAlign: 'right' }}>La direction</div>
                    </div>
                  </>
                );
              })()
              : (() => {
                const font = "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif";
                const rolesDesc = [
                  { num: 1, role: 'Appel', desc: "Assurer le contrôle des présences avant le début de l'épreuve, puis présenter aux candidats le déroulement de la session ainsi que les consignes à respecter." },
                  { num: 2, role: 'Surveillance', desc: "Garantir le bon déroulement de l'épreuve écrite : maintien du silence dans la salle, collecte des copies au fur et à mesure que les candidats terminent, ainsi que distribution des documents d'occupation selon les besoins." },
                  { num: 3, role: 'Accompagnement', desc: "Conduire les candidats depuis la salle d'examen jusqu'à la salle dédiée à l'épreuve orale." },
                  { num: 4, role: 'Oral', desc: <>Faire passer l'épreuve de production orale en quatre phases distinctes :<br/>
                    <strong>Phase 1 — Vocabulaire :</strong> Le candidat doit poser des questions en lien avec les mots proposés.<br/>
                    <strong>Phase 2 — Entretien dirigé :</strong> Conduire un échange structuré autour des questions de base proposées dans le document.<br/>
                    <strong>Phase 3 — Description :</strong> Inviter le candidat à décrire la scène afin d'évaluer sa capacité d'expression et son vocabulaire en contexte.<br/>
                    <strong>Phase 4 — Dialogue :</strong> Mener une interaction spontanée avec le candidat afin d'évaluer sa capacité à communiquer.</> },
                  { num: 5, role: 'Correction', desc: "Procéder à la correction des épreuves écrites selon les critères d'évaluation définis, en garantissant rigueur et homogénéité dans la notation." },
                ];
                return (
                  <>
                    {renderRolesReadOnly(sitePlan)}
                    <div style={{ marginTop: 20, fontFamily: font }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#334155', marginBottom: 14 }}>Description des rôles</div>
                      {rolesDesc.map(({ num, role, desc }) => (
                        <div key={num} style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{num}. {role}</div>
                          <div style={{ fontSize: 16, color: '#475569', lineHeight: 1.6 }}>{desc}</div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
              {/* Pied de page */}
              <div className="conv-footer" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28, paddingTop: 10, fontSize: 12, color: '#64748b' }}>
                <img src="/logo-pied-page.png" alt="" style={{ height: 30, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                <span>Zone Industrielle 4, 1963 Vétroz<br />Tél. 027 606 18 60</span>
              </div>
            </div>
          </div>
          );
        })()}

        {onglet === 'resultat' && renderResultat()}

        {onglet === 'statistique' && renderStatistiques()}

        {onglet === 'graphique' && renderGraphique()}
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: '28px 32px',
    background: '#f8fafc',
    minHeight: '100%',
    boxSizing: 'border-box',
    fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif",
  },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, minHeight: 40, flexWrap: 'wrap' },
  btnBack: { padding: '8px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', color: '#475569', lineHeight: '1' },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' },
  pillGroup: { display: 'flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 },
  pillBtn: { padding: '7px 14px', borderRadius: 17, border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: '#6d28d9', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' },
  pillBtnActif: { background: '#6366f1', color: 'white', fontWeight: 700 },
  tabsBar: { display: 'flex', alignItems: 'flex-end', gap: 0, marginBottom: 0, borderBottom: '2px solid #6366f1', paddingBottom: 0 },
  tabsRow: { display: 'flex', gap: 0, flexWrap: 'wrap', alignItems: 'flex-end' },
  tabContent: { paddingTop: 0 },
  tabBtn: { padding: '9px 14px', borderRadius: '10px 10px 0 0', border: 'none', background: '#ede9fe', cursor: 'pointer', fontWeight: 700, color: '#5b21b6', outline: 'none', lineHeight: '1', position: 'relative', zIndex: 1, fontSize: 14, width: 140, minWidth: 140, textAlign: 'center' },
  tabBtnActif: { background: '#6366f1', color: 'white', border: 'none', marginBottom: -2, zIndex: 2, boxShadow: '0 -1px 6px rgba(99,102,241,0.28)' },
  btnAjouter: { padding: '8px 14px', border: '1px solid #6366f1', borderRadius: 8, background: '#ede9fe', color: '#4c1d95', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  btnSauver: { padding: '8px 14px', border: '1px solid #6366f1', borderRadius: 8, background: '#6366f1', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 },
  poolPanel: { background: 'transparent', border: 'none', borderRadius: 0, padding: 0 },
  panelTopWhite: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 10, marginBottom: 10 },
  panelTopInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  panelContentWhite: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 },
  cardTitle: { margin: '0 0 6px', fontSize: 18, color: '#0f172a' },
  empty: { background: 'white', borderRadius: 12, padding: '20px 24px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: '#64748b', fontSize: 12, fontStyle: 'italic', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  msgVide: { background: 'white', borderRadius: 12, padding: '20px 24px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: '#64748b', fontSize: 12, fontStyle: 'italic', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  affectationSiteLevelsBox: { border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', padding: 10, marginBottom: 10 },
  affectationSiteLevelsTitle: { fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 },
  affectationSiteLevelsRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  affectationSiteLevelsLabel: { fontSize: 12, fontWeight: 700, color: '#475569' },
  affectationSiteLevelsValue: { fontSize: 12, color: '#1e293b' },

  siteStack: { display: 'flex', flexDirection: 'column', gap: 14 },
  btnAddSite: { padding: '8px 14px', borderRadius: 8, border: '1px solid #6366f1', background: '#ede9fe', color: '#4c1d95', fontWeight: 700, cursor: 'pointer', lineHeight: '1' },
  siteCard: { border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#fcfdff' },
  siteCardPlain: { border: 'none', borderRadius: 0, padding: 0, background: 'transparent' },
  siteHeader: { display: 'flex', alignItems: 'stretch', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  siteTitle: { fontSize: 13, fontWeight: 700, color: '#334155' },
  siteNameField: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6, width: 280, flex: '0 0 280px' },
  siteInputLabel: { fontSize: 12, fontWeight: 700, color: '#334155' },
  siteInput: { width: '100%', maxWidth: '100%', padding: '9px 14px', borderRadius: 8, border: '1px solid #c7d2fe', fontSize: 14, color: '#1e293b', background: 'white', fontFamily: 'inherit', boxSizing: 'border-box' },
  niveauSection: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6, minWidth: 290, flex: '0 1 420px' },
  niveauSectionTitle: { fontSize: 13, fontWeight: 700, color: '#334155' },
  siteLevelsWrap: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' },
  levelBtn: { padding: '7px 14px', borderRadius: 17, border: '1.5px solid #e2e8f0', background: 'white', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1 },
  levelBtnActif: { background: '#6366f1', color: 'white', borderColor: '#6366f1', fontWeight: 700 },
  btnRemoveSite: { padding: '6px 10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff1f2', color: '#b91c1c', fontWeight: 700, cursor: 'pointer', fontSize: 12 },
  siteFooterActions: { display: 'flex', justifyContent: 'flex-end', marginTop: 12 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8, marginTop: 8 },
  niveauBlock: { marginBottom: 8 },
  niveauTitle: { fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 6 },
  profsHeaderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8, marginBottom: 8, flexWrap: 'wrap' },
  autresProfsToggleBtn: { padding: '9px 14px', minWidth: 230, borderRadius: 17, border: '1.5px solid #e2e8f0', background: 'white', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1, boxSizing: 'border-box' },
  autresProfsToggleBtnActif: { background: '#6366f1', color: 'white', borderColor: '#6366f1', fontWeight: 700 },
  profsList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 6 },
  profItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 8px', background: 'white', minHeight: 34 },
  profItemBlocked: { opacity: 0.5, background: '#f8fafc' },
  profCheck: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', flex: 1, minWidth: 0 },
  profName: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', minWidth: 0 },
  splitToggleBtn: {
    flexShrink: 0,
    minWidth: 64,
    height: 22,
    borderRadius: 11,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: 800,
    cursor: 'pointer',
    padding: '0 10px',
    lineHeight: '20px',
  },
  splitToggleBtnActif: {
    background: '#fee2e2',
    borderColor: '#fca5a5',
    color: '#dc2626',
    fontWeight: 800,
  },
  resetPastillesBtn: {
    flexShrink: 0,
    minWidth: 52,
    height: 22,
    borderRadius: 11,
    border: '1px solid #c7d2fe',
    background: '#eef2ff',
    color: '#4338ca',
    fontSize: 11,
    fontWeight: 800,
    cursor: 'pointer',
    padding: '0 10px',
    lineHeight: '20px',
  },

  tableWrap: { border: '1px solid #e2e8f0', borderRadius: 12, background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 720 },
  tablePool: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 1180 },
  tableLarge: { width: '100%', borderCollapse: 'collapse', minWidth: 1100 },
  thead: { background: '#f8fafc' },
  thLeft: { borderBottom: 'none', borderRight: 'none', padding: '8px 10px', fontSize: 12, color: '#64748b', textAlign: 'left', position: 'static', top: 'auto', zIndex: 'auto', background: '#f8fafc', boxShadow: 'none' },
  thClasseFixe: { borderBottom: 'none', borderRight: 'none', padding: '8px 10px', fontSize: 12, color: '#64748b', textAlign: 'left', width: 88, minWidth: 88, maxWidth: 88, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', position: 'static', top: 'auto', zIndex: 'auto', background: '#f8fafc', boxShadow: 'none' },
  thProfPool: { borderBottom: 'none', borderRight: 'none', padding: '8px 12px', fontSize: 12, color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap', position: 'static', top: 'auto', zIndex: 'auto', background: '#f8fafc', boxShadow: 'none' },
  thCenter: { borderBottom: 'none', borderRight: 'none', padding: '8px 10px', fontSize: 12, color: '#64748b', textAlign: 'center', position: 'static', top: 'auto', zIndex: 'auto', background: '#f8fafc', boxShadow: 'none' },
  tdLeft: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 10px', fontSize: 13, color: '#1e293b' },
  tdClasseFixe: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 10px', fontSize: 13, color: '#1e293b', width: 88, minWidth: 88, maxWidth: 88, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tdProfPool: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 12px', fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tdCenter: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 10px', fontSize: 13, color: '#1e293b', textAlign: 'center' },
  tdCenterCell: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 6px', fontSize: 13, color: '#1e293b', textAlign: 'center', cursor: 'pointer', verticalAlign: 'middle' },
  cellStatusWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 18 },
  tdCountLabel: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#334155', background: '#f8fafc' },
  tdCountValue: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#1e293b', textAlign: 'center', background: '#f8fafc' },
  tdCenterRead: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 10px', fontSize: 13, textAlign: 'center', fontWeight: 700 },
  dot: { width: 18, height: 18, borderRadius: '50%', display: 'inline-block' },
  rBtn: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: 800,
    cursor: 'pointer',
    lineHeight: '16px',
    padding: '0 5px',
  },
  rBtnActif: {
    color: '#dc2626',
    borderColor: '#fca5a5',
    background: '#fee2e2',
  },

  saveMsg: { marginLeft: 10, fontSize: 12, color: '#166534', fontWeight: 700 },
  noticeBand: { background: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: 8, marginBottom: 12, fontWeight: 600, fontSize: 13 },

  subTabsRow: { display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' },
  subTabBtn: { padding: '7px 14px', borderRadius: 17, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: 'transparent', color: '#6d28d9', lineHeight: 1, position: 'relative', zIndex: 1, outline: 'none', textAlign: 'center', whiteSpace: 'nowrap' },
  subTabBtnActif: { background: '#6366f1', color: 'white', fontWeight: 700, boxShadow: 'none' },
  poolSiteTabsBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  btnAddSitePoolTabs: { marginLeft: 'auto', padding: '8px 14px', borderRadius: 8, border: '1px solid #6366f1', background: '#6366f1', color: '#ffffff', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', lineHeight: '1' },
  rolesTopRight: { display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  filtersRow: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 },
  toggleWrap: { display: 'flex', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', alignItems: 'stretch' },
  toggleBtn: { padding: '8px 14px', border: 'none', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#475569', outline: 'none', boxShadow: 'none', lineHeight: '1' },
  toggleBtnActif: { background: '#6366f1', color: 'white' },
  toggleBtnInactif: { background: '#111827', color: '#ffffff' },
  dayToggleOutsideRow: { display: 'grid', gridTemplateColumns: '110px repeat(5, 1fr)', gap: 8, marginTop: 8, alignItems: 'center' },
  dayToggleOutsideSpacer: { height: 1 },
  dayToggleOutsideCell: { display: 'flex', justifyContent: 'center' },
  toggleBtnDay: { padding: '8px 14px', border: 'none', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#475569', outline: 'none', boxShadow: 'none', lineHeight: '1' },
  toggleBtnDayActif: { background: '#6366f1', color: '#ffffff', fontWeight: 800 },
  select: { height:36, padding:'0 14px', boxSizing:'border-box', borderRadius:8, border:'1px solid #c7d2fe', background:'white', color:'#1e293b', fontWeight:400, fontSize:13, outline:'none', cursor:'pointer', fontFamily:'inherit', minWidth:190 },
  selectRole: { padding: '4px 8px', borderRadius: 8, border: '1px solid #c7d2fe', background: 'white', color: '#1e293b', fontWeight: 400, fontSize: 13, outline: 'none', cursor: 'pointer', fontFamily: 'inherit', minWidth: 120 },
  inputField: { padding: '6px 8px', borderRadius: 8, border: '1px solid #c7d2fe', background: 'white', outline: 'none', fontSize: 13, color: '#1e293b', fontFamily: 'inherit', width: 72, textAlign: 'center' },
  timePastille: { padding: '5px 14px', borderRadius: 999, border: '1px solid #c7d2fe', background: '#eef2ff', outline: 'none', fontSize: 13, color: '#3730a3', fontWeight: 700, fontFamily: 'inherit', width: 76, textAlign: 'center', cursor: 'pointer' },
  timePastilleFixe: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '5px 14px', borderRadius: 999, border: '1px solid #c7d2fe', background: '#eef2ff', fontSize: 13, color: '#3730a3', fontWeight: 700, fontFamily: 'inherit', width: 76, textAlign: 'center' },
  momentLabelFix: { display: 'inline-flex', alignItems: 'center', fontWeight: 400 },
  momentLabelText: { display: 'inline-block', width: 76, textAlign: 'left' },
  selectOnglet: { padding: '8px 12px', borderRadius: '10px 10px 0 0', border: 'none', fontSize: 13, fontWeight: 700, color: '#5b21b6', background: '#ede9fe', lineHeight: '1', outline: 'none', boxShadow: 'none' },
  tableTitleBig: { margin: '10px 0', fontSize: 16, color: '#0f172a' },
  scoreInput: { width: 62, padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, textAlign: 'center' },
  tdLeftRead: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 10px', fontSize: 13, textAlign: 'left', fontWeight: 700 },
  affectationMetaWrap: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 },
  inlineLabel: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#334155', flexWrap: 'wrap' },
  filtersStack: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 },
  filtersRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 15 },
  searchInput: { padding: '9px 14px', borderRadius: 8, border: '1px solid #c7d2fe', background: 'white', outline: 'none', fontSize: 14, minWidth: 280, flex: '1 1 320px', color: '#1e293b', fontFamily: 'inherit' },
  filterDropdownButton: { display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '7px 14px', borderRadius: 17, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#94a3b8', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' },
  filterDropdownMenu: { position: 'absolute', top: 'calc(100% + 8px)', right: 0, display: 'flex', flexDirection: 'column', gap: 4, padding: 6, background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 10px 24px rgba(15,23,42,0.12)', zIndex: 20 },
  filterDropdownItem: { padding: '8px 12px', borderRadius: 10, border: 'none', background: 'transparent', color: '#6d28d9', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit', textAlign: 'left', whiteSpace: 'nowrap' },
  filterDropdownItemActive: { background: '#ede9fe', color: '#4f46e5', fontWeight: 700 },
  dayInactiveCell: { background: '#000000', minHeight: 42, borderBottom: '1px solid #111827', borderRight: '1px solid #111827' },
  pastillesWrap: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  classChip: { border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: 999, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  classChipActif: { border: '1px solid #6366f1', background: '#6366f1', color: '#ffffff', borderRadius: 999, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  classChipDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  tdSpacer: { padding: 0, height: 22, background: '#ffffff', borderBottom: '1px solid #f1f5f9' },
  rolesGrid: { display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 12 },
  tableRolesLeft: { width: '100%', borderCollapse: 'collapse', tableLayout: 'auto', minWidth: 360 },
  tableRolesRight: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 980 },
  thLeftFixed: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '8px 10px', fontSize: 12, color: '#64748b', textAlign: 'left', width: 160, minWidth: 160, maxWidth: 160 },
  tdReserve: { background: '#fee2e2', color: '#7f1d1d', fontWeight: 700 },
  reserveCellWrap: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%' },
  reserveBadge: { marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: '#991b1b' },
  profChip: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 185, flexShrink: 0, padding: '5px 9px', borderRadius: 999, background: '#eef2ff', border: '1px solid #c7d2fe', color: '#3730a3', fontSize: 13, fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  graphWrap: { display: 'flex', alignItems: 'flex-end', gap: 20, minHeight: 240, padding: '12px 8px' },
  graphSessionCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  graphSessionLabel: { fontSize: 12, color: '#334155', fontWeight: 700, textAlign: 'center' },
  graphBars: { display: 'flex', alignItems: 'flex-end', gap: 6, minHeight: 180 },
  graphBar: { width: 26, borderRadius: '6px 6px 0 0' },
};
