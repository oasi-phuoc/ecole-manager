/* eslint-disable */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import TimePicker from '../components/TimePicker';
import { stickyPageChrome } from '../styles/pageShell';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';
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
const ROLE_CAP = {
  Appel: Infinity,
  Surveillance: 2,
  Accompagnement: 1,
  'Oral Groupe 1': 2,
  'Oral Groupe 2': 2,
  Correction: Infinity,
};
const ROLES_COLONNE = ['Appel', 'Surveillance', 'Accompagnement', 'Oral Groupe 1', 'Oral Groupe 2', 'Correction'];
const LIGNES_ORGANISATION = [
  { row: 1, role: 'Appel', temps: 25, bloc: null },
  { row: 2, role: 'Surveillance', temps: 10, bloc: null },
  { row: 3, role: 'Accompagnement', temps: 45, bloc: 'blocA' },
  { row: 4, role: 'Oral 1', temps: null, bloc: 'blocA' },
  { row: 5, role: 'Oral 2', temps: null, bloc: 'blocA' },
  { row: 6, role: 'Surveillance', temps: 25, bloc: null },
  { row: 7, role: 'Surveillance', temps: 25, bloc: null },
  { row: 8, role: 'Accompagnement', temps: 45, bloc: 'blocB' },
  { row: 9, role: 'Oral 1', temps: null, bloc: 'blocB' },
  { row: 10, role: 'Oral 2', temps: null, bloc: 'blocB' },
  { row: 11, role: 'Correction', temps: null, bloc: null },
];

const normaliserNiveau = (niveau) => String(niveau || '').trim().toUpperCase();
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
const couleurTotale = (total) => {
  if (total < 40) return { bg: '#fee2e2', text: '#b91c1c' };
  if (total <= 80) return { bg: '#ffedd5', text: '#c2410c' };
  return { bg: '#dcfce7', text: '#166534' };
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

export default function TCF() {
  const navigate = useNavigate();
  const headers = useMemo(() => ({}), []);

  const [searchParams, setSearchParams] = useSearchParams();
  const onglet = searchParams.get('tab') || 'pool';
  const setOnglet = (tab) => setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('tab', tab); return p; });
  const [profs, setProfs] = useState([]);
  const [pools, setPools] = useState([]);
  const [creneaux, setCreneaux] = useState([]);
  const [disposMap, setDisposMap] = useState({});
  const [classes, setClasses] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [chargement, setChargement] = useState(true);

  const [siteNames, setSiteNames] = useState({ site1: 'Site 1', site2: 'Site 2' });
  const [siteLevels, setSiteLevels] = useState({ site1: [], site2: [] });
  const [selectedBySite, setSelectedBySite] = useState({ site1: [], site2: [] });
  const [siteOrder, setSiteOrder] = useState(['site1', 'site2']);
  const [siteCounter, setSiteCounter] = useState(2);
  const [siteActif, setSiteActif] = useState('site1');
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
  const [resultatMatiere, setResultatMatiere] = useState('francais');
  const [resultatSession, setResultatSession] = useState('');
  const [resultatVue, setResultatVue] = useState('individuelle');
  const [resultatClasseId, setResultatClasseId] = useState('');
  const [resultatEleveId, setResultatEleveId] = useState('');
  const [resultatEleveSearch, setResultatEleveSearch] = useState('');
  const [scores, setScores] = useState({});
  const [absences, setAbsences] = useState({});
  const [responsablesTCF, setResponsablesTCF] = useState([]);

  const [statSousOnglet, setStatSousOnglet] = useState('tri');
  const [statMatiere, setStatMatiere] = useState('francais');
  const [statSens, setStatSens] = useState('fort');
  const [statOrdre, setStatOrdre] = useState('decroissant');
  const [statSession, setStatSession] = useState('');
  const [statSeuil, setStatSeuil] = useState('60');
  const [statNiveau, setStatNiveau] = useState('');
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
  const [graphSession, setGraphSession] = useState('');
  const [graphEleveId, setGraphEleveId] = useState('');
  const [graphVue, setGraphVue] = useState('individuelle');
  const [graphNiveau, setGraphNiveau] = useState('');
  const [graphClasseId, setGraphClasseId] = useState('');
  const [graphEleveSearch, setGraphEleveSearch] = useState('');
  const [anneeScolaire, setAnneeScolaire] = useState('');

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
    await axios.put(API + '/tcf-state/' + cle, { donnees }, { headers });
  };

  useEffect(() => {
    const charger = async () => {
      setChargement(true);
      const [rp, rPools, rCreneaux, rGeneral, rClasses, rEleves, rParametres, rNiveaux] = await Promise.all([
        axios.get(API + '/profs', { headers }).catch(() => ({ data: [] })),
        axios.get(API + '/planning/pools', { headers }).catch(() => ({ data: [] })),
        axios.get(API + '/planning/creneaux', { headers }).catch(() => ({ data: [] })),
        axios.get(API + '/planning/general', { headers }).catch(() => ({ data: {} })),
        axios.get(API + '/classes', { headers }).catch(() => ({ data: [] })),
        axios.get(API + '/eleves', { headers }).catch(() => ({ data: [] })),
        axios.get(API + '/parametres/ecole', { headers }).catch(() => ({ data: {} })),
        axios.get(API + '/donnees/niveaux').catch(() => ({ data: [] })),
      ]);
      setProfs(rp.data || []);
      setPools(rPools.data || []);
      setCreneaux(rCreneaux.data || []);
      setClasses((rClasses.data || []).filter(c => c.actif !== false));
      setEleves((rEleves.data || []).filter(e => e.statut !== 'inactif'));
      setAnneeScolaire(String(rParametres?.data?.annee_scolaire || '').trim());
      const respFields = ['responsable_langues_jeunes', 'responsable_niveau', 'responsable_niveau_csc', 'responsable_niveau_cfr', 'responsable_niveau_epl'];
      const respNames = respFields.map(f => rParametres?.data?.[f]).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
      setResponsablesTCF(respNames.map((name, i) => ({ id: `resp_${i}`, nom: name, prenom: '' })));
      setNiveauxDB(rNiveaux.data || []);

      const dMap = {};
      (rGeneral.data?.dispos || []).forEach(d => {
        dMap[`${d.prof_id}-${d.creneau_id}`] = d.disponible;
      });
      setDisposMap(dMap);

      const poolLocal = lireObjetLocal('tcf_pool_state');
      const rsLocal = lireObjetLocal('tcf_resultats_scores');
      const affLocal = lireObjetLocal('tcf_affectation_state');
      appliquerPoolState(poolLocal);
      if (rsLocal && typeof rsLocal === 'object') setScores(rsLocal);
      appliquerAffectationState(affLocal);

      try {
        const [poolSrv, affSrv, rsSrv] = await Promise.all([
          axios.get(API + '/tcf-state/' + TCF_STATE_KEYS.pool, { headers }).catch(() => null),
          axios.get(API + '/tcf-state/' + TCF_STATE_KEYS.affectation, { headers }).catch(() => null),
          axios.get(API + '/tcf-state/' + TCF_STATE_KEYS.resultats, { headers }).catch(() => null),
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
          setScores(donnees && typeof donnees === 'object' ? donnees : {});
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
    if (!resultatNiveau && niveauxTabs.length) setResultatNiveau(niveauxTabs[0]);
  }, [niveaux, resultatNiveau]);

  useEffect(() => {
    if (!siteOrder.length) return;
    if (!siteActif || !siteOrder.includes(siteActif)) {
      setSiteActif(siteOrder[0]);
    }
  }, [siteOrder, siteActif]);

  useEffect(() => {
    if (statSens === 'fort' && String(statSeuil) !== '80') setStatSeuil('80');
    if (statSens === 'faible' && String(statSeuil) !== '40') setStatSeuil('40');
  }, [statSens]);

  const profsParNiveauPool = useMemo(() => {
    const byLevel = {};
    const seen = {};
    for (const pool of pools) {
      const niveau = normaliserNiveau(pool.niveau) || 'SANS NIVEAU';
      if (!byLevel[niveau]) {
        byLevel[niveau] = [];
        seen[niveau] = new Set();
      }

      const profsPool = Array.isArray(pool.profs) ? pool.profs : [];
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

    // Fallback si aucun prof n'est remonté depuis les pools.
    const totalProfs = Object.values(byLevel).reduce((acc, arr) => acc + arr.length, 0);
    if (totalProfs === 0) {
      Object.keys(byLevel).forEach(k => delete byLevel[k]);
      byLevel['SANS NIVEAU'] = profs.map(p => ({
        id: String(p.id),
        nom: p.nom || '',
        prenom: p.prenom || '',
      }));
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
      const n = normaliserNiveau(p.niveau);
      if (n) set.add(n);
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
    if (!resultatNiveau) return [];
    const cls = classes.filter(c => normaliserNiveau(c.niveau) === resultatNiveau);
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

  const toggleProfSite = (siteKey, profId) => {
    if (estBloqueDansAutreSite(siteKey, profId)) return;
    setPoolDirty(true);
    setSelectedBySite(prev => {
      const cur = prev[siteKey] || [];
      const deja = cur.includes(profId);
      if (!deja) {
        // Initialiser toutes les cellules en rouge (réserve) par défaut
        setPoolCellOverrides(overrides => {
          const next = { ...overrides };
          JOURS.forEach(j => MOMENTS.forEach(m => {
            const key = cleCellulePool(siteKey, profId, j, m.id);
            next[key] = { statut: 'rouge', rActif: false };
          }));
          return next;
        });
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

  const periodesDispoParDemiJournee = (profId, jour, momentId) => {
    const periodeCible = momentId === 'matin' ? 'matin' : 'apres-midi';
    const creneauxJour = creneaux.filter(c =>
      String(c.jour || '').toLowerCase() === jour.toLowerCase()
      && normaliserPeriode(c.periode) === periodeCible
    );
    const total = creneauxJour.length;
    let dispo = 0;
    for (const c of creneauxJour) {
      if (disposMap[`${profId}-${c.id}`] !== false) dispo += 1;
    }
    return { dispo, total };
  };

  const cleCellulePool = (siteKey, profId, jour, momentId) => `${siteKey}::${profId}::${jour}::${momentId}`;

  const statutBaseCellule = (profId, jour, momentId) => {
    const { dispo, total } = periodesDispoParDemiJournee(profId, jour, momentId);
    if (dispo <= 0 || total <= 0) return 'rouge';
    if (dispo >= total) return 'vert';
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

  const renderPastille = (statut) => {
    const color = statut === 'vert' ? '#22c55e' : statut === 'orange' ? '#f59e0b' : '#ef4444';
    return <span style={{ ...styles.dot, background: color }} />;
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
    if (champ === 'matinDebutProf') return getHoraireSite(siteKey, 'matinDebut');
    if (champ === 'matinFinProf') return getHoraireSite(siteKey, 'matinFin');
    if (champ === 'apresMidiDebutProf') return getHoraireSite(siteKey, 'apresMidiDebut');
    if (champ === 'apresMidiFinProf') return getHoraireSite(siteKey, 'apresMidiFin');
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
                    return (
                      <td
                        key={`${id}-${j}-${m.id}`}
                        style={styles.tdCenterCell}
                        onClick={() => cycleCellule(siteKey, id, j, m.id)}
                      >
                        <div style={styles.cellStatusWrap}>
                          {rActif
                            ? <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:18,height:18,borderRadius:'50%',background:'#a78bfa',color:'white',fontWeight:700,fontSize:10}}>R</span>
                            : renderPastille(statut)
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
          <label style={styles.inlineLabel}>
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
              <div style={{ fontSize: 11, fontWeight: 700, color: '#000000', marginBottom: 6 }}>Horaire élèves</div>
              <label style={styles.inlineLabel}>
                Matin :
                <TimePicker value={getHoraireSite(siteKey, 'matinDebut')} onChange={(e) => setHoraireSite(siteKey, 'matinDebut', e.target.value)} style={styles.inputField} />
                <TimePicker value={getHoraireSite(siteKey, 'matinFin')} onChange={(e) => setHoraireSite(siteKey, 'matinFin', e.target.value)} style={styles.inputField} />
              </label>
              <label style={styles.inlineLabel}>
                Après-midi :
                <TimePicker value={getHoraireSite(siteKey, 'apresMidiDebut')} onChange={(e) => setHoraireSite(siteKey, 'apresMidiDebut', e.target.value)} style={styles.inputField} />
                <TimePicker value={getHoraireSite(siteKey, 'apresMidiFin')} onChange={(e) => setHoraireSite(siteKey, 'apresMidiFin', e.target.value)} style={styles.inputField} />
              </label>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#000000', marginBottom: 6 }}>Horaire professeurs</div>
              <label style={styles.inlineLabel}>
                Matin :
                <TimePicker value={getHoraireSite(siteKey, 'matinDebutProf')} onChange={(e) => setHoraireSite(siteKey, 'matinDebutProf', e.target.value)} style={styles.inputField} />
                <TimePicker value={getHoraireSite(siteKey, 'matinFinProf')} onChange={(e) => setHoraireSite(siteKey, 'matinFinProf', e.target.value)} style={styles.inputField} />
              </label>
              <label style={styles.inlineLabel}>
                Après-midi :
                <TimePicker value={getHoraireSite(siteKey, 'apresMidiDebutProf')} onChange={(e) => setHoraireSite(siteKey, 'apresMidiDebutProf', e.target.value)} style={styles.inputField} />
                <TimePicker value={getHoraireSite(siteKey, 'apresMidiFinProf')} onChange={(e) => setHoraireSite(siteKey, 'apresMidiFinProf', e.target.value)} style={styles.inputField} />
              </label>
            </div>
          </div>
        </div>
        {MOMENTS.map((moment, mi) => {
          const thStyle = { ...styles.thCenter, fontSize: 14, padding: '5px 8px', background: '#6366f1', color: 'white', border: '1px solid #4338ca' };
          return (
            <div key={moment.id} style={{ ...styles.tableWrap, marginTop: mi === 1 ? 20 : 0 }}>
              <table style={{ ...styles.tablePool, width: '100%' }}>
                <colgroup>
                  <col style={{ width: 36, minWidth: 36, maxWidth: 36 }} />
                  {JOURS.map((j) => <col key={j} style={{ width: 'auto' }} />)}
                </colgroup>
                <tbody>
                  <tr>
                    <td rowSpan={2} style={{ background: '#eef2ff', color: '#4338ca', fontWeight: 700, fontSize: 13, padding: '4px 2px', border: '1px solid #a5b4fc', textAlign: 'center', verticalAlign: 'middle', width: 36 }}>
                      <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', display: 'inline-block' }}>{moment.label}</span>
                    </td>
                    {JOURS.map(j => {
                      const classesCell = getAffectationClassesSite(siteKey, j, moment.id);
                      const eff = classesCell.reduce((acc, cid) => acc + eleves.filter(e => String(e.classe_id) === String(cid)).length, 0);
                      return (
                        <td key={j} style={thStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, borderRadius: '50%', background: '#eef2ff', color: '#4338ca', fontSize: 11, fontWeight: 700, border: '1px solid #a5b4fc', flexShrink: 0 }}>{eff}</span>
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
      <div style={styles.siteHeader}>
        <span style={styles.siteTitle}>{siteLabel} - </span>
        <input
          value={siteNames[siteKey] ?? ''}
          onChange={e => {
            setPoolDirty(true);
            setSiteNames(prev => ({ ...prev, [siteKey]: e.target.value }));
          }}
          style={styles.siteInput}
          placeholder="Nom du site"
        />
        <div style={styles.siteLevelsWrap}>
          {niveauxTabs.map(level => {
            const actif = (siteLevels[siteKey] || []).includes(level);
            return (
              <button
                key={`${siteKey}-${level}`}
                type="button"
                onClick={() => toggleSiteLevel(siteKey, level)}
                style={{ ...styles.levelBtn, ...(actif ? styles.levelBtnActif : {}) }}
              >
                {level}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => supprimerSite(siteKey)}
          style={styles.btnRemoveSite}
        >
          Supprimer ce site
        </button>
      </div>

      <div style={styles.sectionTitle}>Liste des professeurs</div>
      {chargement ? <div style={styles.empty}>Chargement...</div> : Object.entries(profsParNiveauPool).map(([niveau, liste]) => (
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
                  <button
                    type="button"
                    onClick={() => toggleSplitProf(p.id)}
                    style={{ ...styles.splitToggleBtn, ...(splitByProf[p.id] ? styles.splitToggleBtnActif : {}) }}
                  >
                    Scinder
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{marginTop:15}}>{renderTablePoolSite(siteKey)}</div>
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
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, borderRadius: '50%', background: '#eef2ff', color: '#4338ca', fontSize: 11, fontWeight: 700, border: '1px solid #a5b4fc', flexShrink: 0 }}>{eff}</span>
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
    const lignesHoraire = {};
    let cursor = defaultStartMin;
    LIGNES_ORGANISATION.forEach((lg) => {
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
                {LIGNES_ORGANISATION.map((lg) => {
                  const estBlocAStart = lg.row === 3;
                  const estBlocAInner = lg.row === 4 || lg.row === 5;
                  const estBlocBStart = lg.row === 8;
                  const estBlocBInner = lg.row === 9 || lg.row === 10;
                  const afficherHoraireTemps = !(estBlocAInner || estBlocBInner);
                  const isCorrection = lg.row === 11;
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
                        <td style={styles.tdCenter} rowSpan={estBlocAStart || estBlocBStart ? 3 : 1}>
                          <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                            {spanHoraire(startValue)}
                            {spanHoraire(endValue)}
                          </div>
                        </td>
                      )}
                      {afficherHoraireTemps && (
                        <td style={styles.tdCenterRead} rowSpan={estBlocAStart || estBlocBStart ? 3 : 1}>{lg.temps ? `${lg.temps}'` : ''}</td>
                      )}
                      {classesColonnes.map((cl) => {
                        if (lg.row === 1) return <td key={`rro-${lg.row}-${cl.id}`} style={styles.tdCenterRead}>Appel et consignes</td>;
                        if (lg.row === 2) return <td key={`rro-${lg.row}-${cl.id}`} style={styles.tdCenterRead}>Préparation PO</td>;
                        if (estBlocAInner || estBlocBInner) return null;
                        if (estBlocAStart) {
                          const bloc = org.blocA || {};
                          return (
                            <td key={`rro-${lg.row}-${cl.id}`} style={styles.tdCenter} rowSpan={3}>
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
                        if (lg.row === 6 || lg.row === 7) {
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
                            <td key={`rro-${lg.row}-${cl.id}`} style={styles.tdCenter} rowSpan={3}>
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
                            .filter(([, role]) => {
                              if (!role) return false;
                              if (lg.role === 'Appel') return role === 'Appel';
                              if (lg.role === 'Oral 1') return role === 'Oral Groupe 1';
                              if (lg.role === 'Oral 2') return role === 'Oral Groupe 2';
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
    const classesNiveau = classes
      .filter(c => normaliserNiveau(c.niveau) === resultatNiveau)
      .sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'));
    const elevesResultat = resultatVue === 'classe'
      ? (resultatClasseId ? elevesNiveau.filter(e => String(e.classe_id) === String(resultatClasseId)) : [])
      : (resultatEleveId ? elevesNiveau.filter(e => String(e.id) === String(resultatEleveId)) : elevesNiveau);

    return (
      <div>
        {/* Tous les sous-onglets sur une ligne */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
          <div style={styles.pillGroup}>
            {niveauxTabs.map(n => (
              <button key={n} onClick={() => { setResultatNiveau(n); setResultatClasseId(''); setResultatEleveId(''); setResultatEleveSearch(''); }}
                style={{ ...styles.pillBtn, ...(resultatNiveau === n ? styles.pillBtnActif : {}) }}>{n}</button>
            ))}
          </div>
          <div style={styles.pillGroup}>
            {[['francais','Français'],['math','Math']].map(([val,label]) => (
              <button key={val} onClick={() => setResultatMatiere(val)}
                style={{ ...styles.pillBtn, ...(resultatMatiere === val ? styles.pillBtnActif : {}) }}>{label}</button>
            ))}
          </div>
          <div style={styles.pillGroup}>
            {[['individuelle','Élève'],['classe','Classe']].map(([val,label]) => (
              <button key={val} onClick={() => { setResultatVue(val); if (val === 'individuelle') setResultatClasseId(''); else { setResultatEleveId(''); setResultatEleveSearch(''); } }}
                style={{ ...styles.pillBtn, ...(resultatVue === val ? styles.pillBtnActif : {}) }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Dropdowns 15px sous les sous-onglets */}
        <div style={{ marginTop: 15, marginBottom: 15, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={resultatSession} onChange={e => setResultatSession(e.target.value)} style={styles.select}>
            <option value="">Choisir une session</option>
            {SESSIONS.map(s => <option key={s} value={s}>{SESSION_LABEL[s] || s}</option>)}
          </select>
          {resultatVue === 'individuelle' && (
            <>
              <input
                type="number" min="1" max={elevesNiveau.length}
                value={resultatEleveSearch}
                onChange={e => setResultatEleveSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const n = parseInt(resultatEleveSearch, 10);
                    const found = elevesNiveau[n - 1];
                    if (found) setResultatEleveId(String(found.id));
                  }
                }}
                placeholder="N° élève"
                style={{ ...styles.select, width: 150 }}
              />
              <select value={resultatEleveId} onChange={e => setResultatEleveId(e.target.value)} style={styles.select}>
                <option value="">Choisir un élève</option>
                {elevesNiveau.map((e, idx) => (
                  <option key={e.id} value={String(e.id)}>{idx + 1}. {toDisplayNom(e.nom)} {e.prenom}</option>
                ))}
              </select>
            </>
          )}
          {resultatVue === 'classe' && (
            <select value={resultatClasseId} onChange={e => setResultatClasseId(e.target.value)} style={styles.select}>
              <option value="">- Sélectionner la classe -</option>
              {classesNiveau.map(c => <option key={c.id} value={String(c.id)}>{c.nom}</option>)}
            </select>
          )}
        </div>

        {!resultatSession ? (
          <div style={styles.msgVide}>Sélectionnez une session pour afficher les résultats.</div>
        ) : resultatVue === 'classe' && !resultatClasseId ? (
          <div style={styles.msgVide}>Sélectionnez une classe pour afficher les résultats.</div>
        ) : (
          <>
            <h3 style={styles.tableTitleBig}>
              {isFr ? 'Test de connaissance de français' : 'Test de connaissance de mathématiques'} - {titreSession}
            </h3>
            <div style={styles.tableWrap}>
              <table style={styles.tableLarge}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.thCenter}>N°</th>
                    <th style={styles.thClasseFixe}>Classe</th>
                    <th style={styles.thLeft}>Nom</th>
                    <th style={styles.thLeft}>Prénom</th>
                    <th style={styles.thCenter}>Absence</th>
                    {isFr ? (
                      <>
                        <th style={styles.thCenter}>CO</th>
                        <th style={styles.thCenter}>PO</th>
                        <th style={styles.thCenter}>CE</th>
                        <th style={styles.thCenter}>PE</th>
                        <th style={styles.thCenter}>Oral</th>
                        <th style={styles.thCenter}>Écrit</th>
                        <th style={styles.thCenter}>Total</th>
                      </>
                    ) : (
                      <>
                        <th style={styles.thCenter}>P1</th>
                        <th style={styles.thCenter}>P2</th>
                        <th style={styles.thCenter}>P3</th>
                        <th style={styles.thCenter}>P4</th>
                        <th style={styles.thCenter}>Base</th>
                        <th style={styles.thCenter}>Avancé</th>
                        <th style={styles.thCenter}>Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {elevesResultat.map((e, idx) => {
                    const row = getScore(resultatMatiere, resultatSession, e.id);
                    const computed = isFr ? calculFr(row) : calculMath(row);
                    const total = computed.total === '' ? null : Number(computed.total);
                    const totalStyle = total == null ? {} : couleurTotale(total);
                    return (
                      <tr key={e.id}>
                        <td style={styles.tdCenter}>{idx + 1}</td>
                        <td style={styles.tdClasseFixe}>{classesMap[String(e.classe_id)]?.nom || '—'}</td>
                        <td style={styles.tdLeft}>{toDisplayNom(e.nom) || ''}</td>
                        <td style={styles.tdLeft}>{e.prenom || ''}</td>
                        <td style={styles.tdCenter}>
                          <input type="checkbox"
                            checked={!!absences[`${resultatMatiere}_${resultatSession}_${e.id}`]}
                            onChange={ev => setAbsences(prev => ({ ...prev, [`${resultatMatiere}_${resultatSession}_${e.id}`]: ev.target.checked }))}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#6366f1' }} />
                        </td>
                        {isFr ? (
                          <>
                            {['co', 'po', 'ce', 'pe'].map(f => (
                              <td key={f} style={styles.tdCenter}>
                                <input style={{ ...styles.scoreInput, opacity: absences[`${resultatMatiere}_${resultatSession}_${e.id}`] ? 0.3 : 1 }}
                                  type="number" min="0" max="25"
                                  value={row[f] ?? ''}
                                  disabled={!!absences[`${resultatMatiere}_${resultatSession}_${e.id}`]}
                                  onChange={ev => setScore('francais', resultatSession, e.id, f, ev.target.value)} />
                              </td>
                            ))}
                            <td style={styles.tdCenterRead}>{computed.oral === '' ? '' : computed.oral}</td>
                            <td style={styles.tdCenterRead}>{computed.ecrit === '' ? '' : computed.ecrit}</td>
                            <td style={{ ...styles.tdCenterRead, background: totalStyle.bg, color: totalStyle.text }}>{computed.total === '' ? '' : computed.total}</td>
                          </>
                        ) : (
                          <>
                            {['p1', 'p2', 'p3', 'p4'].map(f => (
                              <td key={f} style={styles.tdCenter}>
                                <input style={{ ...styles.scoreInput, opacity: absences[`${resultatMatiere}_${resultatSession}_${e.id}`] ? 0.3 : 1 }}
                                  type="number" min="0" max="25"
                                  value={row[f] ?? ''}
                                  disabled={!!absences[`${resultatMatiere}_${resultatSession}_${e.id}`]}
                                  onChange={ev => setScore('math', resultatSession, e.id, f, ev.target.value)} />
                              </td>
                            ))}
                            <td style={styles.tdCenterRead}>{computed.cscCfr === '' ? '' : computed.cscCfr}</td>
                            <td style={styles.tdCenterRead}>{computed.cafCap === '' ? '' : computed.cafCap}</td>
                            <td style={{ ...styles.tdCenterRead, background: totalStyle.bg, color: totalStyle.text }}>{computed.total === '' ? '' : computed.total}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {elevesResultat.length === 0 && (
                    <tr><td colSpan={12} style={styles.empty}>Aucun élève trouvé pour cette sélection.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
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

  const renderRoles = () => {
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
    const lignesHoraire = {};
    let cursor = defaultStartMin;
    LIGNES_ORGANISATION.forEach((lg) => {
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
        {/* Site sub-tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
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

        {/* Demi-journée + groupes */}
        <div style={{ marginTop: 15, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select value={rolesDemiJourneeSelect} onChange={(e) => setRolesDemiJourneeSelect(e.target.value)} style={styles.select}>
            <option value="">Choisir une demi-journée</option>
            {DEMI_JOURNEES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
          {rolesDemiJourneeSelect && (() => {
            const ROLE_MIN = { 'Appel': 1, 'Surveillance': 2, 'Accompagnement': 1, 'Oral Groupe 1': 2, 'Oral Groupe 2': 2, 'Correction': 2 };
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
            <div style={styles.tableWrap}>
              <table style={styles.tableRolesLeft}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.thLeftFixed}>Professeurs</th>
                    <th style={{ ...styles.thLeftFixed, width: 155, minWidth: 155, maxWidth: 155 }}>Rôle</th>
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
                        <td style={{ ...styles.tdLeft, width: 155, minWidth: 155, maxWidth: 155 }}>
                          <select value={selectedRole} onChange={(e) => setRoleProf(siteKey, rolesDemiJourneeSelect, resp.id, e.target.value)} style={{ ...styles.selectRole, width: '100%' }}>
                            <option value="">—</option>
                            {ROLES_COLONNE.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
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
                        <td style={{ ...styles.tdLeft, width: 155, minWidth: 155, maxWidth: 155 }}>
                          <select
                            value={selectedRole}
                            onChange={(e) => {
                              const nextRole = e.target.value;
                              if (nextRole) {
                                const deja = Object.entries(rolesMap).filter(([pid, r]) => String(pid) !== String(p.id) && r === nextRole).length;
                                if (deja >= (ROLE_CAP[nextRole] ?? Infinity)) return;
                              }
                              setRoleProf(siteKey, rolesDemiJourneeSelect, p.id, nextRole);
                            }}
                            style={{ ...styles.selectRole, width: '100%' }}
                          >
                            <option value="">—</option>
                            {ROLES_COLONNE.map((r) => {
                              const nb = Object.entries(rolesMap).filter(([pid, role]) => String(pid) !== String(p.id) && role === r).length;
                              const max = ROLE_CAP[r] ?? Infinity;
                              const disabled = nb >= max;
                              return <option key={r} value={r} disabled={disabled}>{r}</option>;
                            })}
                          </select>
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
                  {LIGNES_ORGANISATION.map((lg) => {
                    const estBlocAStart = lg.row === 3;
                    const estBlocAInner = lg.row === 4 || lg.row === 5;
                    const estBlocBStart = lg.row === 8;
                    const estBlocBInner = lg.row === 9 || lg.row === 10;
                    const isCorrection = lg.row === 11;
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
                          <td style={styles.tdCenter} rowSpan={estBlocAStart || estBlocBStart ? 3 : 1}>
                            <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                              <input
                                style={{ ...styles.select, width: 48, padding: '4px 4px', fontSize: 12, textAlign: 'center' }}
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
                                  style={{ ...styles.select, width: 48, padding: '4px 4px', fontSize: 12, textAlign: 'center' }}
                                  value={lignesHoraire[lg.row]?.end || ''}
                                  onChange={(e) => setHoraireLigne(siteKey, rolesDemiJourneeSelect, lg.row, startValue, e.target.value)}
                                  placeholder="Fin"
                                />
                              )}
                            </div>
                          </td>
                        )}
                        {afficherHoraireTemps && (
                          <td style={styles.tdCenterRead} rowSpan={estBlocAStart || estBlocBStart ? 3 : 1}>{lg.temps ? `${lg.temps}'` : ''}</td>
                        )}
                        {classesColonnes.map((cl) => {
                          if (lg.row === 1) return <td key={`${lg.row}-${cl.id}`} style={styles.tdCenterRead}>Appel et consignes</td>;
                          if (lg.row === 2) return <td key={`${lg.row}-${cl.id}`} style={styles.tdCenterRead}>Préparation PO</td>;
                          if (estBlocAInner || estBlocBInner) return null;
                          if (estBlocAStart) {
                            const bloc = org.blocA || {};
                            return (
                              <td key={`${lg.row}-${cl.id}`} style={styles.tdCenter} rowSpan={3}>
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
                          if (lg.row === 6 || lg.row === 7) {
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
                              <td key={`${lg.row}-${cl.id}`} style={styles.tdCenter} rowSpan={3}>
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
                              .filter(([, role]) => {
                                if (!role) return false;
                                if (lg.role === 'Appel') return role === 'Appel';
                                if (lg.role === 'Oral 1') return role === 'Oral Groupe 1';
                                if (lg.role === 'Oral 2') return role === 'Oral Groupe 2';
                                if (lg.role === 'Accompagnement') return role === 'Accompagnement';
                                if (lg.role === 'Correction') return role === 'Correction';
                                if (lg.role === 'Surveillance') return role === 'Surveillance';
                                return false;
                              })
                              .map(([pid]) => {
                                const p = profMap[String(pid)] || responsablesTCF.find(r => r.id === pid);
                                if (!p) return null;
                                const ROLE_CHIP_COLORS = {
                                  'Appel':          { bg: '#dbeafe', border: '#93c5fd', color: '#1e3a8a' },
                                  'Surveillance':   { bg: '#fef9c3', border: '#fde047', color: '#713f12' },
                                  'Accompagnement': { bg: '#dcfce7', border: '#86efac', color: '#14532d' },
                                  'Oral 1':         { bg: '#ede9fe', border: '#c4b5fd', color: '#4c1d95' },
                                  'Oral 2':         { bg: '#fce7f3', border: '#f9a8d4', color: '#831843' },
                                  'Correction':     { bg: '#ffedd5', border: '#fdba74', color: '#7c2d12' },
                                };
                                const rc = ROLE_CHIP_COLORS[lg.role] || {};
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
    const showTrend = options.showTrend !== false;
    const niveau = normaliserNiveau(options.niveau || '');
    const label1 = options.label1 || (isFr ? 'Oral' : 'Base');
    const label2 = options.label2 || (isFr ? 'Écrit' : 'Avancé');

    const barW = 52;
    const groupW = 180;
    const innerH = Number(options.innerH) > 0 ? Number(options.innerH) : 230;
    const padL = 48;
    const padT = 10;
    const padB = 70;
    const legendW = 130;
    const chartW = Math.max(groupW * Math.max(series.length, 1), 240);
    const svgW = padL + chartW + legendW + 24;
    const svgH = padT + innerH + padB;
    const chartLeft = padL;
    const chartRight = padL + chartW;
    const chartBottom = padT + innerH;
    const parts = [];

    const yFromValue = (v) => chartBottom - (Math.max(0, Math.min(maxScore, Number(v) || 0)) / maxScore) * innerH;

    // Grille (tous les 5 points) sans numérotation 0/10/20...
    const showFrenchLevelMarks = isFr && options.showFrenchLevelMarks !== false && !options.label1 && !options.label2;
    const showMathLevelMarks = !isFr && options.showMathLevelMarks !== false && !options.label1 && !options.label2;
    if (showFrenchLevelMarks) {
      for (let v = 0; v <= 55; v += 5) {
        const y = yFromValue(v);
        parts.push(`<line x1="${chartLeft}" y1="${y}" x2="${chartRight}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`);
      }
      const marks = niveau === 'CSC'
        ? [{ v: 45, label: 'A1' }, { v: 25, label: 'A0.2' }, { v: 5, label: 'A0.1' }]
        : [{ v: 45, label: 'A2' }, { v: 25, label: 'A1.2' }, { v: 5, label: 'A1.1' }];
      marks.forEach((m) => {
        const y = yFromValue(m.v);
        parts.push(`<text x="${chartLeft - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="#334155" font-weight="700">${esc(m.label)}</text>`);
      });
    } else {
      for (let v = 0; v <= maxScore; v += 5) {
        const y = yFromValue(v);
        parts.push(`<line x1="${chartLeft}" y1="${y}" x2="${chartRight}" y2="${y}" stroke="#e5e7eb" stroke-width="${v % 10 === 0 ? 1.2 : 1}" />`);
      }
      if (showMathLevelMarks) {
        const marks = niveau === 'CSC'
          ? [{ v: 45, label: 'CFR' }, { v: 35, label: 'CSC' }]
          : [{ v: 45, label: 'CAF' }, { v: 40, label: 'CFR' }, { v: 20, label: 'CSC' }];
        marks.forEach((m) => {
          const y = yFromValue(m.v);
          parts.push(`<text x="${chartLeft - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="#334155" font-weight="700">${esc(m.label)}</text>`);
        });
      }
    }

    // Axes
    parts.push(`<line x1="${chartLeft}" y1="${chartBottom}" x2="${chartRight}" y2="${chartBottom}" stroke="#94a3b8" stroke-width="1.5"/>`);
    parts.push(`<line x1="${chartLeft}" y1="${padT}" x2="${chartLeft}" y2="${chartBottom}" stroke="#94a3b8" stroke-width="1.5"/>`);

    // Barres + valeurs
    series.forEach((s, i) => {
      const baseX = chartLeft + i * groupW + (groupW - (barW * 2 + 8)) / 2;
      const h1 = Math.max(2, ((Number(s.v1) || 0) / maxScore) * innerH);
      const h2 = Math.max(2, ((Number(s.v2) || 0) / maxScore) * innerH);
      const y1 = chartBottom - h1;
      const y2 = chartBottom - h2;
      parts.push(`<rect x="${baseX}" y="${y1}" width="${barW}" height="${h1}" fill="#60a5fa" rx="4"/>`);
      parts.push(`<rect x="${baseX + barW + 8}" y="${y2}" width="${barW}" height="${h2}" fill="#34d399" rx="4"/>`);
      parts.push(`<text x="${baseX + barW / 2}" y="${chartBottom - 8}" text-anchor="middle" font-size="13" fill="#ffffff" font-weight="800">${Number(s.v1) || 0}</text>`);
      parts.push(`<text x="${baseX + barW + 8 + barW / 2}" y="${chartBottom - 8}" text-anchor="middle" font-size="13" fill="#ffffff" font-weight="800">${Number(s.v2) || 0}</text>`);
      parts.push(`<text x="${baseX + barW + 4}" y="${chartBottom + 18}" text-anchor="middle" font-size="11" fill="#334155">${esc(s.label || s.session || '')}</text>`);
    });

    // Ligne d'évolution
    if (showTrend && series.length > 1) {
      const pts = series.map((s, i) => {
        const moy = (Number(s.v1 || 0) + Number(s.v2 || 0)) / 2;
        const total = Number(s.v1 || 0) + Number(s.v2 || 0);
        const x = chartLeft + i * groupW + groupW / 2;
        const y = yFromValue(moy);
        return { x, y, moy, total };
      });
      parts.push(`<polyline fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="6,3" points="${pts.map(p => `${p.x},${p.y}`).join(' ')}"/>`);
      pts.forEach((p) => {
        parts.push(`<circle cx="${p.x}" cy="${p.y}" r="5" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5"/>`);
        parts.push(`<text x="${p.x}" y="${p.y - 8}" text-anchor="middle" font-size="11" fill="#92400e" font-weight="700">${p.total}</text>`);
      });
    }

    // Légendes à droite, alignées en bas du cadre
    const lx = chartRight + 18;
    const ly = chartBottom - 64;
    parts.push(`<rect x="${lx}" y="${ly}" width="14" height="14" fill="#60a5fa" rx="2"/>`);
    parts.push(`<text x="${lx + 22}" y="${ly + 11}" font-size="12" fill="#334155" font-weight="700">${label1}</text>`);
    parts.push(`<rect x="${lx}" y="${ly + 28}" width="14" height="14" fill="#34d399" rx="2"/>`);
    parts.push(`<text x="${lx + 22}" y="${ly + 39}" font-size="12" fill="#334155" font-weight="700">${label2}</text>`);
    if (showTrend && series.length > 1) {
      parts.push(`<line x1="${lx}" y1="${ly + 58}" x2="${lx + 18}" y2="${ly + 58}" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="5,3"/>`);
      parts.push(`<circle cx="${lx + 9}" cy="${ly + 58}" r="3.5" fill="#f59e0b"/>`);
      parts.push(`<text x="${lx + 22}" y="${ly + 62}" font-size="12" fill="#334155" font-weight="700">Moyenne</text>`);
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">${parts.join('')}</svg>`;
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
          <span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:50%;background:#eef2ff;color:#4338ca;font-size:8pt;font-weight:700;border:1px solid #a5b4fc;margin-right:4px">${eff}</span>
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
          <p>Nous vous informons que vous êtes convoqué(e) au <strong>test de connaissance du français</strong>. Ce test évalue vos compétences linguistiques aux niveaux <strong>A1 à A2</strong>, en adéquation avec le niveau de votre classe.</p>
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
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${filename}</title><style>${convocPrintCSS}</style></head><body>${buildConvocationPage(classeConvocation, sitePlan)}</body></html>`);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
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
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${filename}</title><style>${convocPrintCSS}</style></head><body>${pages.join('')}</body></html>`);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
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
      const regularHtml = regular.map(nom =>
        `<div style="color:#1e293b;font-size:9pt;font-weight:400;line-height:1.4;text-align:left">${escapeHtml(nom)}</div>`
      ).join('');
      if (reserves.length === 0) {
        return `<table style="width:100%;height:100%;border-collapse:collapse"><tbody>
          <tr><td style="vertical-align:top;padding:0;text-align:left;border:none">${regularHtml}</td></tr>
        </tbody></table>`;
      }
      const reserveHtml = `<div style="border-top:1px solid #e2e8f0;padding-top:3px">
        <div style="color:#1e293b;font-size:9pt;font-weight:700;line-height:1.4;text-align:left">Réserve</div>
        ${reserves.map(nom => `<div style="color:#1e293b;font-size:9pt;font-weight:400;line-height:1.4;text-align:left">${escapeHtml(nom)}</div>`).join('')}
      </div>`;
      return `<table style="width:100%;height:100%;border-collapse:collapse"><tbody>
        <tr style="height:100%"><td style="vertical-align:top;padding:0;text-align:left;border:none">${regularHtml}</td></tr>
        <tr><td style="vertical-align:bottom;padding:0;text-align:left;border:none">${reserveHtml}</td></tr>
      </tbody></table>`;
    };
    const getEffectif = (jour, moment) =>
      poolIds.filter(pid => statutCellule(siteKey, pid, jour, moment) === 'vert').length;
    const nCols = joursActifs.length;
    const colPct = nCols > 0 ? `${((100 - 3) / nCols).toFixed(2)}%` : 'auto';
    const colgroup = `<colgroup><col style="width:28px">${joursActifs.map(() => `<col style="width:${colPct}">`).join('')}</colgroup>`;
    const buildTable = (moment) => {
      const label = moment === 'matin' ? 'Matin' : 'Après-midi';
      const headerCells = joursActifs.map(j => {
        const eff = getEffectif(j, moment);
        const date = getDateStr(j);
        return `<td style="background:#f8fafc;color:#64748b;font-size:9pt;padding:4px 6px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center">
          <div style="display:flex;align-items:center;justify-content:center;gap:5px">
            <span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:50%;background:#eef2ff;color:#4338ca;font-size:8pt;font-weight:700;border:1px solid #a5b4fc;flex-shrink:0">${eff}</span>
            <span>${escapeHtml(j)}${date ? ` - ${date}` : ''}</span>
          </div>
        </td>`;
      }).join('');
      const dataCells = joursActifs.map(j => `<td style="vertical-align:top;text-align:left;height:120px;border:1px solid #e2e8f0;padding:5px 7px">${getCellProfs(j, moment)}</td>`).join('');
      return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:14px">
        ${colgroup}
        <tbody>
          <tr>
            <td rowspan="2" style="background:#eef2ff;color:#4338ca;font-weight:700;font-size:8pt;padding:4px 2px;border:1px solid #a5b4fc;text-align:center;vertical-align:middle;width:28px">
              <span style="writing-mode:vertical-rl;transform:rotate(180deg);display:inline-block">${label}</span>
            </td>
            ${headerCells}
          </tr>
          <tr>${dataCells}</tr>
        </tbody>
      </table>`;
    };
    const logoUrl = `${publicBase}/logo-etat-du-valais.png`;
    const logoPiedUrl = `${publicBase}/logo-pied-page.png`;
    const nomSite = escapeHtml(siteNames[siteKey] || siteKey);
    const horaireMatin = `${getHoraireSite(siteKey, 'matinDebut')} – ${getHoraireSite(siteKey, 'matinFin')}`;
    const horaireAM = `${getHoraireSite(siteKey, 'apresMidiDebut')} – ${getHoraireSite(siteKey, 'apresMidiFin')}`;
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
      <div style="text-align:right;font-size:11pt;color:#1e293b;margin-bottom:30px">Vétroz, le ${new Date().toLocaleDateString('fr-CH')}</div>
      <p style="margin:0 0 4px">Lieu : <strong>${nomSite}</strong></p>
      <p style="margin:0 0 16px">Horaire matin : <strong>${escapeHtml(horaireMatin)}</strong>&emsp;&bull;&emsp;Horaire après-midi : <strong>${escapeHtml(horaireAM)}</strong></p>
      ${buildTable('matin')}
      ${buildTable('apresMidi')}
      ${footerHtml}
    </div>
    <div class="page">
      ${headerHtml}
      <div style="margin-top:40px">
        <p style="font-weight:700;font-size:11pt;margin:0 0 12px">Information importante</p>
        <p style="margin:0 0 10px;text-align:justify;font-size:10pt;line-height:1.6">Les professeurs listés en bas de chaque colonne sous la mention <strong>Réserve</strong> sont désignés comme <strong>professeurs de réserve</strong>. À ce titre, ils sont tenus de se <strong>libérer impérativement</strong> lors de la demi-journée pour laquelle ils sont inscrits en réserve, afin de pouvoir intervenir en remplacement d'un collègue absent ou empêché.</p>
        <p style="margin:0 0 10px;text-align:justify;font-size:10pt;line-height:1.6">Il est donc indispensable que chaque professeur de réserve <strong>organise son agenda en conséquence</strong> et s'assure de sa disponibilité effective pour la ou les demi-journées concernées. En cas d'empêchement prévisible, nous vous remercions d'en informer <strong>sans délai</strong> les responsables afin que des dispositions alternatives puissent être prises dans les meilleurs délais.</p>
        <p style="margin:0 0 30px;text-align:justify;font-size:10pt;line-height:1.6">Nous comptons sur votre engagement et votre sens des responsabilités pour garantir le bon déroulement du test dans les meilleures conditions.</p>
        <p style="font-size:10pt;margin:0 0 4px">Cordialement,</p>
        <p style="font-weight:700;font-size:10pt;margin:0;margin-top:60px;text-align:right;padding-right:2cm">La direction</p>
      </div>
      ${footerHtml}
    </div>`;
  };

  const printProfPlanning = () => {
    const sitePlan = planningsSite || siteOrder[0] || '';
    const publicBase = `${window.location.origin}${process.env.PUBLIC_URL || ''}`;
    const siteNom = (siteNames[sitePlan] || sitePlan).toUpperCase().replace(/\s+/g, '_');
    const filename = `${siteNom}_Répartition_prof`;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${filename}</title><style>${rolesPrintCSS}</style></head><body>${buildProfPlanningPage(sitePlan, publicBase)}</body></html>`);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  const printAllProfPlannings = () => {
    const publicBase = `${window.location.origin}${process.env.PUBLIC_URL || ''}`;
    const pages = siteOrder.map(sk => buildProfPlanningPage(sk, publicBase));
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Repartition_tous_sites</title><style>${rolesPrintCSS}</style></head><body>${pages.join('')}</body></html>`);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
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
    const lignesHoraire = {};
    LIGNES_ORGANISATION.forEach(lg => {
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
    const tbody = LIGNES_ORGANISATION.map(lg => {
      const estBlocAStart = lg.row === 3, estBlocAInner = lg.row === 4 || lg.row === 5;
      const estBlocBStart = lg.row === 8, estBlocBInner = lg.row === 9 || lg.row === 10;
      const isCorrection = lg.row === 11;
      const afficher = !(estBlocAInner || estBlocBInner);
      const prevEnd = (() => { if (lg.row <= 1) return lignesHoraire[lg.row]?.start || ''; for (let r = lg.row - 1; r >= 1; r--) { if (lignesHoraire[r]?.end) return lignesHoraire[r].end; } return ''; })();
      const startVal = lg.row === 1 ? (lignesHoraire[lg.row]?.start || '') : prevEnd;
      const endVal = isCorrection ? '...' : (lignesHoraire[lg.row]?.end || '');
      const rs = (estBlocAStart || estBlocBStart) ? ' rowspan="3"' : '';
      const horTd = afficher ? `<td class="tc"${rs}><span class="time">${escapeHtml(startVal)}</span> <span class="time">${escapeHtml(endVal)}</span></td>` : '';
      const tmpTd = afficher ? `<td class="tc"${rs}>${lg.temps ? `${lg.temps}'` : ''}</td>` : '';
      const classCells = classesColonnes.map(cl => {
        if (lg.row === 1) return `<td class="tc">Appel et consignes</td>`;
        if (lg.row === 2) return `<td class="tc">Préparation PO</td>`;
        if (estBlocAInner || estBlocBInner) return '';
        const getChips = (bloc, tags) => tags.filter(tag => { const v = String(bloc[tag] || ''); return cl.classIds.includes(v) || v === cl.id; }).map(tag => `<span class="chip-tag">${tag}</span>`).join('');
        if (estBlocAStart) return `<td class="tc" rowspan="3">${getChips(org.blocA || {}, ['PE','PO','CE'])}</td>`;
        if (lg.row === 6 || lg.row === 7) return `<td class="tc">${getChips(org[`ligne${lg.row}`] || {}, ['Pause','CO'])}</td>`;
        if (estBlocBStart) return `<td class="tc" rowspan="3">${getChips(org.blocB || {}, ['PE','PO','CE'])}</td>`;
        return `<td class="tc"></td>`;
      }).join('');
      const PDF_ROLE_CHIP = {
        'Appel':          'background:#dbeafe;border:1px solid #93c5fd;color:#1e3a8a',
        'Surveillance':   'background:#fef9c3;border:1px solid #fde047;color:#713f12',
        'Accompagnement': 'background:#dcfce7;border:1px solid #86efac;color:#14532d',
        'Oral 1':         'background:#ede9fe;border:1px solid #c4b5fd;color:#4c1d95',
        'Oral 2':         'background:#fce7f3;border:1px solid #f9a8d4;color:#831843',
        'Correction':     'background:#ffedd5;border:1px solid #fdba74;color:#7c2d12',
      };
      const chipStyle = PDF_ROLE_CHIP[lg.role] || 'background:#eef2ff;border:1px solid #c7d2fe;color:#3730a3';
      const profsHtml = Object.entries(rolesMap).filter(([, role]) => {
        if (!role) return false;
        if (lg.role === 'Appel') return role === 'Appel';
        if (lg.role === 'Oral 1') return role === 'Oral Groupe 1';
        if (lg.role === 'Oral 2') return role === 'Oral Groupe 2';
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
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${filename}</title><style>${rolesLandscapeCSS}</style></head><body>${buildRolesPage(rolesDemiJourneeSelect, sitePlan, publicBase)}</body></html>`);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  const printAllRoles = () => {
    const sitePlan = planningsSite || siteOrder[0] || '';
    const publicBase = `${window.location.origin}${process.env.PUBLIC_URL || ''}`;
    const demisActives = DEMI_JOURNEES.filter(d => isJourActifSite(sitePlan, d.jour));
    if (!demisActives.length) return;
    const pages = demisActives.map(d => buildRolesPage(d.id, sitePlan, publicBase));
    const siteNom = (siteNames[sitePlan] || sitePlan).toUpperCase().replace(/\s+/g, '_');
    const filename = `${siteNom}_Role_toutes_demi_journees`;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${filename}</title><style>${rolesLandscapeCSS}</style></head><body>${pages.join('')}</body></html>`);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  const printCharts = (charts, isFr, maxScore) => {
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
    const pagesWithLayout = charts.map(c => {
      const svg = c.series.length > 0
        ? buildChartSVG(c.series, maxScore, isFr, { showTrend: c.showTrend !== false, niveau: c.niveau || '', innerH: 260 })
        : '<p style="color:#94a3b8;font-size:13px">Aucune donnée</p>';
      const nom = c.nom || '';
      const prenom = c.prenom || '';
      const classe = c.classe || '';
      const dateVetroz = `Vétroz, le ${new Date().toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      return `<div class="page">
          ${headerHtml}
          <div class="page-title">${titleMain}</div>
          <div class="page-date">${dateVetroz}</div>
          ${nom || prenom ? `<div class="page-identite"><b>NOM Prénom :</b> ${nom.toUpperCase()} ${prenom}</div>` : ''}
          ${classe ? `<div class="page-classe"><b>Classe :</b> ${classe}</div>` : ''}
          <div class="chart-wrap">${svg}</div>
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
        body { font-family: 'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif; background: white; color: #1e293b; }
        .page { page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .page-header { padding-bottom: 14px; margin-bottom: 18px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .header-left { display: flex; align-items: flex-start; gap: 10px; }
        .header-logo { width: 38px; height: auto; object-fit: contain; display: block; }
        .header-admin { font-size: 8pt; color: #334155; line-height: 1.5; }
        .header-right { text-align: right; }
        .header-scai { font-size: 17pt; font-weight: 800; color: #1e293b; line-height: 1; }
        .header-year { font-size: 10pt; font-weight: 700; color: #374151; margin-top: 2px; }
        .header-sub { font-size: 8pt; font-weight: 700; color: #475569; margin-top: 2px; }
        .page-title { font-size: 17pt; font-weight: 700; color: #0f172a; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin-top: 60px; margin-bottom: 40px; }
        .page-date { font-size: 10pt; color: #1e293b; text-align: right; margin-bottom: 40px; }
        .page-identite { font-size: 10pt; color: #1f2937; margin-bottom: 4px; }
        .page-classe { font-size: 10pt; color: #1f2937; margin-bottom: 16px; }
        .chart-wrap { overflow-x: auto; display: flex; justify-content: center; }
        .chart-wrap svg { max-width: 100%; height: auto; display: block; }
        .page-footer { position: fixed; bottom: 0; left: 0; right: 0; width: 100%; display: flex; align-items: center; gap: 12px; padding-top: 8px; }
        .footer-logo { height: 26px; width: auto; object-fit: contain; display: block; }
        .footer-text { font-size: 8pt; color: #64748b; line-height: 1.35; }
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style></head><body>${pagesWithLayout.join('')}</body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  };

  const renderGraphique = () => {
    const isFr = ongletGraphiqueMatiere === 'francais';
    const niveauActif = graphNiveau || (niveaux.length ? niveaux[0] : '');
    const classesNiveau = classes
      .filter(c => normaliserNiveau(c.niveau) === niveauActif)
      .sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
    const classeIdsNiveau = new Set(classesNiveau.map(c => String(c.id)));
    const elevesNiveauGraph = eleves
      .filter(e => classeIdsNiveau.has(String(e.classe_id)))
      .sort((a, b) => `${toDisplayNom(a.nom) || ''} ${a.prenom || ''}`.localeCompare(`${toDisplayNom(b.nom) || ''} ${b.prenom || ''}`, 'fr'));
    const elevesFiltered = elevesNiveauGraph;

    const maxScore = isFr ? 60 : 50;
    const label1 = isFr ? 'Oral' : 'Partie 1-2';
    const label2 = isFr ? 'Écrit' : 'Partie 3-4';

    // Sessions cumulatives selon la sélection
    const sessionsToShowIds = graphSession === "2e semestre"
      ? ["Test d'août", '1e semestre', '2e semestre']
      : graphSession === '1e semestre'
        ? ["Test d'août", '1e semestre']
        : graphSession === "Test d'août"
          ? ["Test d'août"]
          : [];

    const sessionsIndiv = sessionsToShowIds.map(session => {
      const sc = getScore(ongletGraphiqueMatiere, session, graphEleveId);
      if (isFr) { const fr = calculFr(sc); return { session, v1: Number(fr.oral || 0), v2: Number(fr.ecrit || 0), hasData: fr.total !== '' }; }
      const ma = calculMath(sc); return { session, v1: Number(ma.cscCfr || 0), v2: Number(ma.cafCap || 0), hasData: ma.total !== '' };
    }).filter(s => s.hasData);

    // Vue Classe
    const elevesClasse = graphClasseId
      ? eleves.filter(e => String(e.classe_id) === graphClasseId).sort((a, b) => `${a.prenom || ''} ${toDisplayNom(a.nom)}`.localeCompare(`${b.prenom || ''} ${toDisplayNom(b.nom)}`, 'fr'))
      : [];
    const dataClasse = graphSession
      ? elevesClasse.map(e => {
          const sc = getScore(ongletGraphiqueMatiere, graphSession, String(e.id));
          if (isFr) { const fr = calculFr(sc); return { id: e.id, label: `${e.prenom} ${toDisplayNom(e.nom)}`, v1: Number(fr.oral || 0), v2: Number(fr.ecrit || 0), hasData: fr.total !== '' }; }
          const ma = calculMath(sc); return { id: e.id, label: `${e.prenom} ${toDisplayNom(e.nom)}`, v1: Number(ma.cscCfr || 0), v2: Number(ma.cafCap || 0), hasData: ma.total !== '' };
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
      return classesNiveau.map((cl) => {
        const elevesClasse = eleves.filter(e => String(e.classe_id) === String(cl.id));
        const frTotals = elevesClasse
          .map((e) => calculFr(getScore('francais', graphSession, String(e.id))).total)
          .filter((v) => v !== '' && v !== null && v !== undefined)
          .map(Number);
        const maTotals = elevesClasse
          .map((e) => calculMath(getScore('math', graphSession, String(e.id))).total)
          .filter((v) => v !== '' && v !== null && v !== undefined)
          .map(Number);
        const frAvg = frTotals.length ? frTotals.reduce((a, b) => a + b, 0) / frTotals.length : null;
        const maAvg = maTotals.length ? maTotals.reduce((a, b) => a + b, 0) / maTotals.length : null;
        const globalAvg = [frAvg, maAvg].filter(v => v != null);
        const global = globalAvg.length ? globalAvg.reduce((a, b) => a + b, 0) / globalAvg.length : null;
        return { id: cl.id, nom: cl.nom, frAvg, maAvg, global };
      });
    };

    const handlePrintSelection = () => {
      if (graphVue === 'individuelle' && graphEleveId && sessionsIndiv.length > 0) {
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
      } else if (graphVue === 'classe' && graphClasseId && graphSession) {
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

    const canPrintSelection = (graphVue === 'individuelle' && graphEleveId && sessionsIndiv.length > 0) ||
      (graphVue === 'classe' && graphClasseId && graphSession);

    const niveauIndividuel = (() => {
      const e = eleves.find(ev => String(ev.id) === String(graphEleveId));
      const cl = classesMap[String(e?.classe_id)];
      return normaliserNiveau(cl?.niveau || '');
    })();
    const eleveIndividuel = eleves.find(ev => String(ev.id) === String(graphEleveId));
    const classeIndividuelle = classesMap[String(eleveIndividuel?.classe_id)];
    const niveauClasse = normaliserNiveau(classes.find(c => String(c.id) === String(graphClasseId))?.niveau || '');
    const moyenneRows = getClassMoyennes();
    const moyenneRowsClassees = moyenneRows.filter(r => r.global != null).sort((a, b) => a.global - b.global);
    const lowSet = new Set(moyenneRowsClassees.slice(0, 3).map(r => String(r.id)));
    const highSet = new Set(moyenneRowsClassees.slice(-3).map(r => String(r.id)));
    const moyenneSeries = moyenneRows
      .filter(r => r.frAvg != null || r.maAvg != null)
      .map(r => ({
        label: r.nom,
        v1: Math.round(Number(r.frAvg || 0) * 10) / 10,
        v2: Math.round(Number(r.maAvg || 0) * 10) / 10,
      }));
    const classesRangeLabel = classesNiveau.length ? `${classesNiveau[0].nom} à ${classesNiveau[classesNiveau.length - 1].nom}` : '—';

    const renderSvgChart = (items, opts = {}) => {
      const chartMax = Number(opts.maxScoreOverride) > 0 ? Number(opts.maxScoreOverride) : maxScore;
      const svg = buildChartSVG(items, chartMax, isFr, {
        showTrend: opts.showTrend !== false,
        niveau: opts.niveau || '',
        innerH: 320,
        label1: opts.label1,
        label2: opts.label2,
        showFrenchLevelMarks: opts.showFrenchLevelMarks,
        showMathLevelMarks: opts.showMathLevelMarks,
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
      return (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '24px 28px', width: opts.cardWidth || 800, maxWidth: '100%' }}>
            {/* En-tête */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18, paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <img src={logoSrc} alt="Logo" style={{ width: 38, height: 'auto', objectFit: 'contain', backgroundColor: 'white', padding: 2 }} onError={e => { e.target.style.display = 'none'; }} />
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
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 25, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 40, marginTop: 60, color: '#0f172a' }}>{titreGraph}</div>
            {/* Date */}
            <div style={{ textAlign: 'right', fontSize: 16, color: '#1e293b', marginBottom: 40 }}>{dateVetroz}</div>
            {/* Identité */}
            {(nomMaj || prenomAff) && <div style={{ fontSize: 16, color: '#1f2937', marginBottom: 4 }}><b>{identiteLabel} :</b> {nomMaj} {prenomAff}</div>}
            {classeAff && <div style={{ fontSize: 16, color: '#1f2937', marginBottom: 16 }}><b>Classe :</b> {classeAff}</div>}
            {/* Graphique */}
            <div style={{ overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
              <div dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
            {/* Pied de page */}
            <div style={{ marginTop: 10, paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10 }}>
              <img
                src={logoPiedSrc}
                alt="Logo pied de page"
                style={{ height: 26, width: 'auto', objectFit: 'contain' }}
                onError={(e) => {
                  if (!e.currentTarget.dataset.fallback) {
                    e.currentTarget.dataset.fallback = '1';
                    e.currentTarget.src = logoPiedFallbackSrc;
                    return;
                  }
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.35 }}>
                <div>Zone Industrielle 4, 1963 Vétroz</div>
                <div>Tél. 027 606 18 60</div>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Tous les sous-onglets sur une ligne */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
          {/* Niveaux */}
          {niveaux.length > 0 && (
            <div style={styles.pillGroup}>
              {niveauxTabs.map(n => (
                <button key={n} type="button" onClick={() => { setGraphNiveau(n); setGraphClasseId(''); setGraphEleveId(''); setGraphEleveSearch(''); }}
                  style={{ ...styles.pillBtn, ...(niveauActif === n ? styles.pillBtnActif : {}) }}>{n}</button>
              ))}
            </div>
          )}
          {/* Matière */}
          <div style={styles.pillGroup}>
            <button type="button" onClick={() => setOngletGraphiqueMatiere('francais')} style={{ ...styles.pillBtn, ...(isFr ? styles.pillBtnActif : {}) }}>Français</button>
            <button type="button" onClick={() => setOngletGraphiqueMatiere('math')} style={{ ...styles.pillBtn, ...(!isFr ? styles.pillBtnActif : {}) }}>Math</button>
          </div>
          {/* Vue */}
          <div style={styles.pillGroup}>
            <button type="button" onClick={() => { setGraphVue('individuelle'); setGraphClasseId(''); }} style={{ ...styles.pillBtn, ...(graphVue === 'individuelle' ? styles.pillBtnActif : {}) }}>Élève</button>
            <button type="button" onClick={() => { setGraphVue('classe'); setGraphEleveId(''); setGraphEleveSearch(''); }} style={{ ...styles.pillBtn, ...(graphVue === 'classe' ? styles.pillBtnActif : {}) }}>Classe</button>
            <button type="button" onClick={() => { setGraphVue('moyenne'); setGraphClasseId(''); setGraphEleveId(''); setGraphEleveSearch(''); }} style={{ ...styles.pillBtn, ...(graphVue === 'moyenne' ? styles.pillBtnActif : {}) }}>Moyenne globale</button>
          </div>
        </div>
        {/* Listes déroulantes */}
        <div style={{ marginTop: 15, marginBottom: 15, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={graphSession} onChange={e => setGraphSession(e.target.value)} style={styles.select}>
            <option value="">Choisir une session</option>
            {SESSIONS.map(s => <option key={s} value={s}>{SESSION_LABEL[s] || s}</option>)}
          </select>
          {graphVue === 'classe' && (
            <select value={graphClasseId} onChange={e => setGraphClasseId(e.target.value)} style={styles.select}>
              <option value="">Choisir une classe</option>
              {classesNiveau.map(c => <option key={c.id} value={String(c.id)}>{c.nom}</option>)}
            </select>
          )}
          {graphVue === 'individuelle' && (
            <>
              <input
                type="number" min="1" max={elevesNiveauGraph.length}
                value={graphEleveSearch}
                onChange={e => setGraphEleveSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const n = parseInt(graphEleveSearch, 10);
                    const found = elevesNiveauGraph[n - 1];
                    if (found) setGraphEleveId(String(found.id));
                  }
                }}
                placeholder="N° élève"
                style={{ ...styles.select, width: 150 }}
              />
              <select value={graphEleveId} onChange={e => setGraphEleveId(e.target.value)} style={styles.select}>
                <option value="">Choisir un élève</option>
                {elevesFiltered.map((e, idx) => <option key={e.id} value={String(e.id)}>{idx + 1}. {toDisplayNom(e.nom)} {e.prenom}</option>)}
              </select>
            </>
          )}
        </div>
        {/* Graphique */}
        {graphVue === 'moyenne' && !graphSession && <div style={styles.msgVide}>Sélectionnez une session.</div>}
        {graphVue === 'moyenne' && graphSession && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 12 }}>
            <div style={styles.tableWrap}>
              <table style={{ ...styles.tableRolesLeft, minWidth: 0, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 96, minWidth: 96, maxWidth: 96 }} />
                  <col style={{ width: 86, minWidth: 86, maxWidth: 86 }} />
                  <col style={{ width: 86, minWidth: 86, maxWidth: 86 }} />
                </colgroup>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.thLeftFixed}>Classe</th>
                    <th style={{ ...styles.thCenter, width: 86, minWidth: 86, maxWidth: 86 }}>Français</th>
                    <th style={{ ...styles.thCenter, width: 86, minWidth: 86, maxWidth: 86 }}>Mathématiques</th>
                  </tr>
                </thead>
                <tbody>
                  {moyenneRows.map((r) => {
                    const isLow = lowSet.has(String(r.id));
                    const isHigh = highSet.has(String(r.id));
                    const bg = isLow ? '#fee2e2' : isHigh ? '#dcfce7' : 'white';
                    const color = isLow ? '#991b1b' : isHigh ? '#166534' : '#334155';
                    return (
                      <tr key={`moy-row-${r.id}`} style={{ background: bg }}>
                        <td style={{ ...styles.tdLeft, color, fontWeight: 700 }}>{r.nom}</td>
                        <td style={{ ...styles.tdCenter, color, fontWeight: 700 }}>{r.frAvg == null ? '—' : r.frAvg.toFixed(1)}</td>
                        <td style={{ ...styles.tdCenter, color, fontWeight: 700 }}>{r.maAvg == null ? '—' : r.maAvg.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {renderSvgChart(
              moyenneSeries,
              {
                showTrend: false,
                niveau: niveauActif,
                nom: niveauActif,
                prenom: '',
                classe: classesRangeLabel,
                identiteLabel: 'Niveau',
                title: 'Moyennes des classes',
                label1: 'Français',
                label2: 'Mathématiques',
                showFrenchLevelMarks: false,
                showMathLevelMarks: false,
                maxScoreOverride: 100,
                cardWidth: '100%',
              }
            )}
          </div>
        )}
        {graphVue === 'individuelle' && !graphEleveId && <div style={styles.msgVide}>Sélectionnez un élève.</div>}
        {graphVue === 'individuelle' && graphEleveId && !graphSession && <div style={styles.msgVide}>Sélectionnez une session.</div>}
        {graphVue === 'individuelle' && graphEleveId && graphSession && sessionsIndiv.length === 0 && <div style={styles.msgVide}>Aucun résultat saisi pour cet élève.</div>}
        {graphVue === 'individuelle' && graphEleveId && graphSession && sessionsIndiv.length > 0 && renderSvgChart(
          sessionsIndiv.map(s => ({ ...s, label: SESSION_LABEL[s.session] || s.session })),
          {
            showTrend: true,
            niveau: niveauIndividuel,
            nom: toDisplayNom(eleveIndividuel?.nom || ''),
            prenom: eleveIndividuel?.prenom || '',
            classe: classeIndividuelle?.nom || '',
          }
        )}
        {graphVue === 'classe' && !graphClasseId && <div style={styles.msgVide}>Sélectionnez une classe.</div>}
        {graphVue === 'classe' && graphClasseId && !graphSession && <div style={styles.msgVide}>Sélectionnez une session.</div>}
        {graphVue === 'classe' && graphClasseId && graphSession && dataClasse.length === 0 && <div style={styles.msgVide}>Aucun résultat saisi pour cette classe et cette session.</div>}
        {graphVue === 'classe' && graphClasseId && graphSession && dataClasse.length > 0 && renderSvgChart(
          dataClasse,
          {
            showTrend: false,
            niveau: niveauClasse,
            nom: '',
            prenom: '',
            classe: classes.find(c => String(c.id) === String(graphClasseId))?.nom || '',
          }
        )}
      </div>
    );
  };

  const renderStatistiques = () => {
    const seuil = Number(statSeuil) || 0;
    const matiere = statMatiere;
    const session = statSession;
    const niveauActifStat = statNiveau || (niveaux.length ? niveaux[0] : '');
    const classesNiveauStat = niveauActifStat
      ? new Set(classes.filter(c => normaliserNiveau(c.niveau) === niveauActifStat).map(c => String(c.id)))
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
      .filter(r => r.totalSessionChoisie != null);

    const filtres = rows.filter(r => (statSens === 'fort' ? r.totalSessionChoisie >= seuil : r.totalSessionChoisie <= seuil));
    filtres.sort((a, b) => (statOrdre === 'croissant' ? a.totalSessionChoisie - b.totalSessionChoisie : b.totalSessionChoisie - a.totalSessionChoisie));

    return (
      <div>
        {/* Tous les sous-onglets sur une ligne */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
          {niveaux.length > 0 && (
            <div style={styles.pillGroup}>
              {niveauxTabs.map(n => (
                <button key={n} type="button" onClick={() => setStatNiveau(n)}
                  style={{ ...styles.pillBtn, ...(niveauActifStat === n ? styles.pillBtnActif : {}) }}>{n}</button>
              ))}
            </div>
          )}
          <div style={styles.pillGroup}>
            {[['francais','Français'],['math','Math']].map(([val,label]) => (
              <button key={val} onClick={() => setStatMatiere(val)}
                style={{ ...styles.pillBtn, ...(statMatiere === val ? styles.pillBtnActif : {}) }}>{label}</button>
            ))}
          </div>
          <div style={styles.pillGroup}>
            {[['fort','Fort'],['faible','Faible']].map(([val,label]) => (
              <button key={val} onClick={() => { setStatSens(val); setStatSeuil(val === 'fort' ? '80' : '40'); }}
                style={{ ...styles.pillBtn, ...(statSens === val ? styles.pillBtnActif : {}) }}>{label}</button>
            ))}
          </div>
          <div style={styles.pillGroup}>
            {[['croissant','Croissant'],['decroissant','Décroissant']].map(([val,label]) => (
              <button key={val} onClick={() => setStatOrdre(val)}
                style={{ ...styles.pillBtn, ...(statOrdre === val ? styles.pillBtnActif : {}) }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Dropdown session + seuil — 15px sous les sous-onglets */}
        <div style={{ marginTop: 15, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <select value={statSession} onChange={e => setStatSession(e.target.value)} style={styles.select}>
            <option value="">Choisir une session</option>
            {SESSIONS.map(s => <option key={s} value={s}>{SESSION_LABEL[s] || s}</option>)}
          </select>
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
                          <td key={`td-stat-${r.id}-${s}`} style={{ ...styles.tdCenterRead, background: c.bg, color: c.text }}>
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
    const payload = {
      updatedAt: new Date().toISOString(),
      dateDebutBySite: affectationDateDebutBySite,
      horairesBySite: affectationHorairesBySite,
      classesBySite: affectationClassesBySite,
      joursActifsBySite: affectationJoursActifsBySite,
      rolesByPoolDemi: rolesAffectesByPoolDemi,
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
    setResultatDirty(false);
    afficherSaveMsg('resultat');
  };

  const tabHasUnsaved = (tab) => {
    if (tab === 'pool') return poolDirty;
    if (tab === 'classes' || tab === 'roles') return affectationDirty;
    if (tab === 'resultat') return resultatDirty;
    return false;
  };

  const handleTabChange = (nextTab) => {
    if (nextTab === onglet) return;
    if (tabHasUnsaved(onglet)) {
      const ok = window.confirm('Des changements ne sont pas sauvegardés. Voulez-vous quitter cet onglet sans sauvegarder ?');
      if (!ok) return;
      if (onglet === 'classes' || onglet === 'roles') resetAffectationToSaved();
    }
    setOnglet(nextTab);
  };

  const handleSaveCurrentTab = async () => {
    if (!tabHasUnsaved(onglet)) { afficherSaveMsg(onglet, 'Aucun changement à sauvegarder.'); return; }
    if (onglet === 'pool') await handleSavePool();
    else if (onglet === 'classes' || onglet === 'roles') await handleSaveAffectation();
    else if (onglet === 'resultat') await handleSaveResultat();
  };

  return (
    <div style={styles.page}>
      <div style={stickyPageChrome()}>
      <div style={styles.header}>
        <h2 style={styles.title}>Test de connaissances</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {(onglet === 'pool' || onglet === 'classes' || onglet === 'roles' || onglet === 'resultat') && (
            <>
              {saveToast && (
                <span style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 8, background: '#ede9fe', color: '#4f46e5' }}>
                  {saveToast}
                </span>
              )}
              {onglet === 'pool' && (
                <button onClick={ajouterSite} style={styles.btnSauver}>+ Ajouter</button>
              )}
              <button onClick={handleSaveCurrentTab} style={styles.btnSauver}>Sauvegarder</button>
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
          {onglet === 'graphique' && graphVue !== 'moyenne' && (
            <>
              <button type="button" onClick={() => {
                const isFr = ongletGraphiqueMatiere === 'francais';
                const niveauActif = graphNiveau || (niveaux.length ? niveaux[0] : '');
                const classesNiveau = classes.filter(c => normaliserNiveau(c.niveau) === niveauActif).sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
                const elevesNiveauGraph = eleves.filter(e => new Set(classesNiveau.map(c => String(c.id))).has(String(e.classe_id))).sort((a, b) => `${toDisplayNom(a.nom) || ''} ${a.prenom || ''}`.localeCompare(`${toDisplayNom(b.nom) || ''} ${b.prenom || ''}`, 'fr'));
                const maxScore = isFr ? 60 : 50;
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
              }} style={{ ...styles.btnAjouter, background: '#6366f1', color: 'white', border: '1px solid #6366f1' }}>Tout imprimer</button>
              <button type="button" onClick={() => {
                const isFr = ongletGraphiqueMatiere === 'francais';
                const niveauActif = graphNiveau || (niveaux.length ? niveaux[0] : '');
                const classesNiveau = classes.filter(c => normaliserNiveau(c.niveau) === niveauActif).sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
                const elevesNiveauGraph = eleves.filter(e => new Set(classesNiveau.map(c => String(c.id))).has(String(e.classe_id))).sort((a, b) => `${toDisplayNom(a.nom) || ''} ${a.prenom || ''}`.localeCompare(`${toDisplayNom(b.nom) || ''} ${b.prenom || ''}`, 'fr'));
                const maxScore = isFr ? 60 : 50;
                const sessionsToShowIds = graphSession === "2e semestre" ? ["Test d'août", '1e semestre', '2e semestre'] : graphSession === '1e semestre' ? ["Test d'août", '1e semestre'] : graphSession === "Test d'août" ? ["Test d'août"] : [];
                if (graphVue === 'individuelle' && graphEleveId) {
                  const sessionsIndiv = sessionsToShowIds.map(session => { const sc = getScore(ongletGraphiqueMatiere, session, graphEleveId); if (isFr) { const fr = calculFr(sc); return { session, v1: Number(fr.oral || 0), v2: Number(fr.ecrit || 0), hasData: fr.total !== '' }; } const ma = calculMath(sc); return { session, v1: Number(ma.cscCfr || 0), v2: Number(ma.cafCap || 0), hasData: ma.total !== '' }; }).filter(s => s.hasData);
                  if (sessionsIndiv.length === 0) return;
                  const e = eleves.find(ev => String(ev.id) === graphEleveId);
                  const classe = classesMap[String(e?.classe_id)]?.nom || '';
                  const niveau = normaliserNiveau(classesMap[String(e?.classe_id)]?.niveau || '');
                  printCharts([{ label: `${e?.prenom || ''} ${toDisplayNom(e?.nom || '')} — ${classe}`, series: sessionsIndiv.map(s => ({ ...s, label: SESSION_LABEL[s.session] || s.session })), nom: toDisplayNom(e?.nom || ''), prenom: e?.prenom || '', classe, niveau, showTrend: true }], isFr, maxScore);
                } else if (graphVue === 'classe' && graphClasseId && graphSession) {
                  const elevesClasseFiltres = eleves.filter(e => String(e.classe_id) === String(graphClasseId)).sort((a, b) => `${toDisplayNom(a.nom) || ''} ${a.prenom || ''}`.localeCompare(`${toDisplayNom(b.nom) || ''} ${b.prenom || ''}`, 'fr'));
                  const classe = classes.find(c => String(c.id) === graphClasseId);
                  const charts = elevesClasseFiltres.map(e => { const series = sessionsToShowIds.map(session => { const sc = getScore(ongletGraphiqueMatiere, session, String(e.id)); if (isFr) { const fr = calculFr(sc); return { session, v1: Number(fr.oral || 0), v2: Number(fr.ecrit || 0), hasData: fr.total !== '' }; } const ma = calculMath(sc); return { session, v1: Number(ma.cscCfr || 0), v2: Number(ma.cafCap || 0), hasData: ma.total !== '' }; }).filter(s => s.hasData).map(s => ({ ...s, label: SESSION_LABEL[s.session] || s.session })); return { label: `${e.prenom} ${toDisplayNom(e.nom)} — ${classe?.nom || ''}`, series, nom: toDisplayNom(e.nom), prenom: e.prenom || '', classe: classe?.nom || '', niveau: normaliserNiveau(classe?.niveau || ''), showTrend: true }; }).filter(c => c.series.length > 0);
                  if (charts.length === 0) { alert('Aucun résultat saisi pour cette classe.'); return; }
                  printCharts(charts, isFr, maxScore);
                }
              }} style={{ ...styles.btnSauver, background: '#6366f1', color: 'white', border: '1px solid #6366f1' }}>Imprimer</button>
            </>
          )}
        </div>
      </div>

      <div style={styles.tabsBar}>
        <div style={styles.tabsRow}>
          {[
            { id: 'pool', label: 'Pool' },
            { id: 'classes', label: 'Affectation' },
            { id: 'roles', label: 'Rôles' },
            { id: 'plannings', label: 'Plannings' },
            { id: 'resultat', label: 'Résultat' },
            { id: 'statistique', label: 'Statistique' },
            { id: 'graphique', label: 'Graphique' },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabChange(t.id)}
              style={{ ...styles.tabBtn, ...(onglet === t.id ? styles.tabBtnActif : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      </div>

      <div style={styles.tabContent}>
        {onglet === 'pool' && (
          <div>
            <div style={{ display: 'flex', gap: 0, marginBottom: 14 }}>
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
              {siteActif && renderSelectionSite(siteActif, `Site ${siteOrder.indexOf(siteActif) + 1}`, true)}
            </div>
          </div>
        )}

        {onglet === 'classes' && (
        <div>
          <div style={{ display: 'flex', gap: 0, marginBottom: 14 }}>
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
              <div style={styles.pillGroup}>
                {siteOrder.map((sk, idx) => (
                  <button key={`plan-site-${sk}`} type="button"
                    onClick={() => setPlanningsSite(sk)}
                    style={{ ...styles.pillBtn, ...(sitePlan === sk ? styles.pillBtnActif : {}) }}>
                    {siteNames[sk] || `Site ${idx + 1}`}
                  </button>
                ))}
              </div>
              <div style={styles.pillGroup}>
                {[{ id: 'professeurs', label: 'Professeurs' }, { id: 'classes', label: 'Classes' }, { id: 'roles', label: 'Rôles' }].map(t => (
                  <button key={`plan-type-${t.id}`} type="button"
                    onClick={() => setPlanningsType(t.id)}
                    style={{ ...styles.pillBtn, ...(planningsType === t.id ? styles.pillBtnActif : {}) }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {planningsType === 'classes' && (
              <div className="tcf-no-print" style={{ margin: '15px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <select value={classeConvocation} onChange={e => setClasseConvocation(e.target.value)} style={{ ...styles.select, minWidth: 220 }}>
                  <option value="">Choisir une classe</option>
                  {(classesEligiblesSite[planningsSite || siteOrder[0]] || []).map(cl => (
                    <option key={cl.id} value={cl.id}>{cl.nom}</option>
                  ))}
                </select>
              </div>
            )}
            {planningsType === 'roles' && (
              <div className="tcf-no-print" style={{ margin: '15px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <select value={rolesDemiJourneeSelect} onChange={e => setRolesDemiJourneeSelect(e.target.value)} style={styles.select}>
                  <option value="">Choisir une demi-journée</option>
                  {DEMI_JOURNEES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </div>
            )}
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
                      Nous vous informons que vous êtes convoqué(e) au <strong>test de connaissance du français</strong>.
                      Ce test évalue vos compétences linguistiques aux niveaux <strong>A1 à A2</strong>, en adéquation avec le niveau de votre classe.
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
                              <td rowSpan={2} style={{ ...styles.thCenter, width: 36, verticalAlign: 'middle', background: '#eef2ff', color: '#4338ca', fontSize: 16 }}>
                                <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', display: 'inline-block', fontWeight: 700 }}>{moment === 'matin' ? 'Matin' : 'Après-midi'}</span>
                              </td>
                              {joursActifs.map(j => {
                                const eff = getEffectif(j, moment);
                                const date = getDateStr(j);
                                return (
                                  <td key={j} style={{ ...styles.thCenter, fontSize: 15 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, borderRadius: '50%', background: '#eef2ff', color: '#4338ca', fontSize: 11, fontWeight: 700, border: '1px solid #a5b4fc', flexShrink: 0 }}>{eff}</span>
                                      <span>{j}{date ? ` - ${date}` : ''}</span>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                            <tr>
                              {joursActifs.map(j => (
                                <td key={j} style={{ ...cellStyle, height: 120 }}>
                                  {(() => {
                                    const { regular, reserves } = getCellProfs(j, moment);
                                    return (
                                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                        <div>
                                          {regular.map((nom, i) => (
                                            <span key={i} style={{ display: 'block', color: '#1e293b', fontSize: 16, fontWeight: 400, lineHeight: 1.4 }}>{nom}</span>
                                          ))}
                                        </div>
                                        {reserves.length > 0 && (
                                          <div style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: 4 }}>
                                            <span style={{ display: 'block', color: '#1e293b', fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>Réserve</span>
                                            {reserves.map((nom, i) => (
                                              <span key={i} style={{ display: 'block', color: '#1e293b', fontSize: 16, fontWeight: 400, lineHeight: 1.4 }}>{nom}</span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ))}
                    <div style={{ marginTop: 28 }}>
                      <div style={{ ...pStyle, fontWeight: 700, marginBottom: 8 }}>Information importante</div>
                      <div style={pStyle}>
                        Les professeurs listés en bas de chaque colonne sous la mention <strong>Réserve</strong> sont désignés comme <strong>professeurs de réserve</strong>.
                        À ce titre, ils sont tenus de se <strong>libérer impérativement</strong> lors de la demi-journée pour laquelle ils sont inscrits en réserve,
                        afin de pouvoir intervenir en remplacement d'un collègue absent ou empêché.
                      </div>
                      <div style={{ ...pStyle, marginTop: 10 }}>
                        Il est donc indispensable que chaque professeur de réserve <strong>organise son agenda en conséquence</strong> et s'assure de sa disponibilité effective
                        pour la ou les demi-journées concernées. En cas d'empêchement prévisible, nous vous remercions d'en informer <strong>sans délai</strong> les responsables
                        afin que des dispositions alternatives puissent être prises dans les meilleurs délais.
                      </div>
                      <div style={{ ...pStyle, marginTop: 10 }}>
                        Nous comptons sur votre engagement et votre sens des responsabilités pour garantir le bon déroulement du test dans les meilleures conditions.
                      </div>
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
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
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
  btnAjouter: { padding: '8px 16px', border: '1px solid #6366f1', borderRadius: 8, background: '#ede9fe', color: '#4c1d95', fontWeight: 700, cursor: 'pointer', lineHeight: '1' },
  btnSauver: { padding: '8px 16px', border: '1px solid #6366f1', borderRadius: 8, background: '#6366f1', color: 'white', fontWeight: 700, cursor: 'pointer', lineHeight: '1' },
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
  siteHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  siteTitle: { fontSize: 13, fontWeight: 700, color: '#334155' },
  siteInput: { width: 260, maxWidth: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#1e293b' },
  siteLevelsWrap: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  levelBtn: { padding: '6px 10px', borderRadius: 999, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  levelBtnActif: { background: '#ede9fe', color: '#5b21b6', borderColor: '#c4b5fd' },
  btnRemoveSite: { marginLeft: 'auto', padding: '6px 10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff1f2', color: '#b91c1c', fontWeight: 700, cursor: 'pointer', fontSize: 12 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8, marginTop: 8 },
  niveauBlock: { marginBottom: 8 },
  niveauTitle: { fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 },
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

  tableWrap: { border: '1px solid #e2e8f0', borderRadius: 12, background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 720 },
  tablePool: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 1180 },
  tableLarge: { width: '100%', borderCollapse: 'collapse', minWidth: 1100 },
  thead: { background: '#f8fafc' },
  thLeft: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '8px 10px', fontSize: 12, color: '#64748b', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc', boxShadow: '0 1px 0 #e2e8f0' },
  thClasseFixe: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '8px 10px', fontSize: 12, color: '#64748b', textAlign: 'left', width: 88, minWidth: 88, maxWidth: 88, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc', boxShadow: '0 1px 0 #e2e8f0' },
  thProfPool: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '8px 12px', fontSize: 12, color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc', boxShadow: '0 1px 0 #e2e8f0' },
  thCenter: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '8px 10px', fontSize: 12, color: '#64748b', textAlign: 'center', position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc', boxShadow: '0 1px 0 #e2e8f0' },
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
  subTabBtn: { padding: '9px 14px', borderRadius: '0 0 10px 10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: '#e0e7ff', color: '#3730a3', lineHeight: 1, position: 'relative', zIndex: 1, outline: 'none', textAlign: 'center' },
  subTabBtnActif: { background: '#4f46e5', color: 'white', marginTop: -1, zIndex: 2, boxShadow: '0 4px 8px rgba(79,70,229,0.22)' },
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
  select: { padding: '9px 18px', borderRadius: 10, border: '2px solid #4f46e5', background: '#e0e7ff', color: '#3730a3', fontWeight: 700, fontSize: 14, outline: 'none', cursor: 'pointer' },
  selectRole: { padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', color: '#1e293b', fontWeight: 400, fontSize: 13, outline: 'none', cursor: 'pointer' },
  inputField: { padding: '6px 8px', borderRadius: 8, border: '1px solid #c7d2fe', background: 'white', outline: 'none', fontSize: 13, color: '#1e293b', fontFamily: 'inherit', width: 72, textAlign: 'center' },
  selectOnglet: { padding: '8px 12px', borderRadius: '10px 10px 0 0', border: 'none', fontSize: 13, fontWeight: 700, color: '#5b21b6', background: '#ede9fe', lineHeight: '1', outline: 'none', boxShadow: 'none' },
  tableTitleBig: { margin: '10px 0', fontSize: 16, color: '#0f172a' },
  scoreInput: { width: 62, padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, textAlign: 'center' },
  tdLeftRead: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 10px', fontSize: 13, textAlign: 'left', fontWeight: 700 },
  affectationMetaWrap: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 },
  inlineLabel: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#334155', flexWrap: 'wrap' },
  dayInactiveCell: { background: '#000000', minHeight: 42, borderBottom: '1px solid #111827', borderRight: '1px solid #111827' },
  pastillesWrap: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  classChip: { border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: 999, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  classChipActif: { border: '1px solid #6366f1', background: '#6366f1', color: '#ffffff', borderRadius: 999, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  classChipDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  tdSpacer: { padding: 0, height: 22, background: '#ffffff', borderBottom: '1px solid #f1f5f9' },
  rolesGrid: { display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 12 },
  tableRolesLeft: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 360 },
  tableRolesRight: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 980 },
  thLeftFixed: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '8px 10px', fontSize: 12, color: '#64748b', textAlign: 'left', width: 160, minWidth: 160, maxWidth: 160 },
  tdReserve: { background: '#fee2e2', color: '#7f1d1d', fontWeight: 700 },
  reserveCellWrap: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%' },
  reserveBadge: { marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: '#991b1b' },
  profChip: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 138, padding: '5px 9px', borderRadius: 999, background: '#eef2ff', border: '1px solid #c7d2fe', color: '#3730a3', fontSize: 13, fontWeight: 700 },
  graphWrap: { display: 'flex', alignItems: 'flex-end', gap: 20, minHeight: 240, padding: '12px 8px' },
  graphSessionCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  graphSessionLabel: { fontSize: 12, color: '#334155', fontWeight: 700, textAlign: 'center' },
  graphBars: { display: 'flex', alignItems: 'flex-end', gap: 6, minHeight: 180 },
  graphBar: { width: 26, borderRadius: '6px 6px 0 0' },
};
