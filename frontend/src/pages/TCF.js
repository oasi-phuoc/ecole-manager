import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'https://ecole-manager-backend.onrender.com/api';
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const MOMENTS = [
  { id: 'matin', label: 'Matin', periode: 'Matin' },
  { id: 'apresMidi', label: 'Après-midi', periode: 'Après-midi' },
];
const SESSIONS = ["Test d'août", '1e semestre', '2e semestre'];
const SESSIONS_COMPAT = ["Test d'août", 'Rentrée scolaire', '1e semestre', '2e semestre'];
const DEMI_JOURNEES = JOURS.flatMap(j => ([
  { id: `${j}|matin`, label: `${j} matin`, jour: j, moment: 'matin' },
  { id: `${j}|apresMidi`, label: `${j} après-midi`, jour: j, moment: 'apresMidi' },
]));
const ROLE_CAP = {
  Surveillance: 2,
  Accompagnement: 1,
  'Oral Groupe 1': 2,
  'Oral Groupe 2': 2,
  Correction: Infinity,
};
const ROLES_COLONNE = ['Surveillance', 'Accompagnement', 'Oral Groupe 1', 'Oral Groupe 2', 'Correction'];
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

export default function TCF() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = useMemo(() => ({ Authorization: 'Bearer ' + token }), [token]);

  const [onglet, setOnglet] = useState('pool');
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
  const [splitByProf, setSplitByProf] = useState({});
  const [poolCellOverrides, setPoolCellOverrides] = useState({});
  const [poolDirty, setPoolDirty] = useState(false);
  const [affectationDirty, setAffectationDirty] = useState(false);
  const [resultatDirty, setResultatDirty] = useState(false);
  const [saveMsgByTab, setSaveMsgByTab] = useState({ pool: '', affectation: '', resultat: '' });
  const [saveToast, setSaveToast] = useState('');

  const [resultatNiveau, setResultatNiveau] = useState('');
  const [resultatMatiere, setResultatMatiere] = useState('francais');
  const [resultatSession, setResultatSession] = useState('');
  const [scores, setScores] = useState({});

  const [statSousOnglet, setStatSousOnglet] = useState('tri');
  const [statMatiere, setStatMatiere] = useState('francais');
  const [statSens, setStatSens] = useState('fort');
  const [statOrdre, setStatOrdre] = useState('decroissant');
  const [statSession, setStatSession] = useState('');
  const [statSeuil, setStatSeuil] = useState('60');
  const [sousOngletAffectation, setSousOngletAffectation] = useState('classes');
  const [affectationDateDebutBySite, setAffectationDateDebutBySite] = useState({});
  const [affectationHorairesBySite, setAffectationHorairesBySite] = useState({});
  const [affectationClassesBySite, setAffectationClassesBySite] = useState({});
  const [affectationJoursActifsBySite, setAffectationJoursActifsBySite] = useState({});
  const [rolesPoolSelect, setRolesPoolSelect] = useState('');
  const [rolesDemiJourneeSelect, setRolesDemiJourneeSelect] = useState('');
  const [rolesAffectesByPoolDemi, setRolesAffectesByPoolDemi] = useState({});
  const [organisationByPoolDemi, setOrganisationByPoolDemi] = useState({});
  const [ongletGraphiqueMatiere, setOngletGraphiqueMatiere] = useState('francais');
  const [graphPoolId, setGraphPoolId] = useState('');
  const [graphSession, setGraphSession] = useState('');
  const [graphEleveId, setGraphEleveId] = useState('');

  useEffect(() => {
    const charger = async () => {
      setChargement(true);
      try {
        const [rp, rPools, rCreneaux, rGeneral, rClasses, rEleves] = await Promise.all([
          axios.get(API + '/profs', { headers }),
          axios.get(API + '/planning/pools', { headers }),
          axios.get(API + '/planning/creneaux', { headers }),
          axios.get(API + '/planning/general', { headers }),
          axios.get(API + '/classes', { headers }),
          axios.get(API + '/eleves', { headers }),
        ]);
        setProfs((rp.data || []).filter(p => p.actif !== false));
        setPools(rPools.data || []);
        setCreneaux(rCreneaux.data || []);
        setClasses((rClasses.data || []).filter(c => c.actif !== false));
        setEleves((rEleves.data || []).filter(e => e.statut !== 'inactif'));

        const dMap = {};
        (rGeneral.data?.dispos || []).forEach(d => {
          dMap[`${d.prof_id}-${d.creneau_id}`] = d.disponible;
        });
        setDisposMap(dMap);
      } catch (err) {
        setProfs([]);
        setPools([]);
        setCreneaux([]);
        setClasses([]);
        setEleves([]);
        setDisposMap({});
      }

      try {
        const poolState = JSON.parse(localStorage.getItem('tcf_pool_state') || '{}');
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
      } catch {}

      try {
        const rs = JSON.parse(localStorage.getItem('tcf_resultats_scores') || '{}');
        if (rs && typeof rs === 'object') setScores(rs);
      } catch {}
      try {
        const aff = JSON.parse(localStorage.getItem('tcf_affectation_state') || '{}');
        if (aff && typeof aff === 'object') {
          if (aff.dateDebutBySite) setAffectationDateDebutBySite(aff.dateDebutBySite);
          if (aff.horairesBySite) setAffectationHorairesBySite(aff.horairesBySite);
          if (aff.classesBySite) setAffectationClassesBySite(aff.classesBySite);
          if (aff.joursActifsBySite) setAffectationJoursActifsBySite(aff.joursActifsBySite);
          if (aff.rolesByPoolDemi) setRolesAffectesByPoolDemi(aff.rolesByPoolDemi);
          if (aff.organisationByPoolDemi) setOrganisationByPoolDemi(aff.organisationByPoolDemi);
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
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [classes]);

  useEffect(() => {
    if (!resultatNiveau && niveaux.length) setResultatNiveau(niveaux[0]);
  }, [niveaux, resultatNiveau]);

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
    if (Object.keys(byLevel).length === 0) {
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
    const suivant = cycleStatut(courant);
    setPoolCellOverrides(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        statut: suivant,
        rActif: suivant === 'rouge' ? !!prev[key]?.rActif : false,
      },
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
      siteData[jour] = !isJourActifSite(siteKey, jour);
      return { ...prev, [siteKey]: siteData };
    });
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
  const getHoraireSite = (siteKey, champ) => affectationHorairesBySite?.[siteKey]?.[champ] || '';
  const setHoraireSite = (siteKey, champ, value) => {
    setAffectationDirty(true);
    setAffectationHorairesBySite(prev => ({
      ...prev,
      [siteKey]: { ...(prev?.[siteKey] || {}), [champ]: value },
    }));
  };

  const renderTablePoolSite = (siteKey) => {
    const ids = selectedBySite[siteKey] || [];
    if (!ids.length) return <div style={styles.empty}>Aucun professeur sélectionné.</div>;

    const countVertsDemiJournee = (jour, momentId) =>
      ids.reduce((acc, id) => acc + (statutCellule(siteKey, id, jour, momentId) === 'vert' ? 1 : 0), 0);

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
                    const showR = statut === 'rouge';
                    const rActif = rActifCellule(siteKey, id, j, m.id);
                    return (
                      <td
                        key={`${id}-${j}-${m.id}`}
                        style={styles.tdCenterCell}
                        onClick={() => cycleCellule(siteKey, id, j, m.id)}
                      >
                        <div style={styles.cellStatusWrap}>
                          {renderPastille(statut)}
                          {showR && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRCellule(siteKey, id, j, m.id);
                              }}
                              style={{ ...styles.rBtn, ...(rActif ? styles.rBtnActif : {}) }}
                            >
                              R
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  }))}
                </tr>
              );
            })}
            <tr>
              <td style={styles.tdCountLabel}>Nb verts</td>
              {JOURS.map(j => MOMENTS.map(m => (
                <td key={`count-${j}-${m.id}`} style={styles.tdCountValue}>
                  {countVertsDemiJournee(j, m.id)}
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
            Date de début des tests :
            <input
              type="date"
              value={affectationDateDebutBySite?.[siteKey] || ''}
              onChange={(e) => {
                setAffectationDirty(true);
                setAffectationDateDebutBySite(prev => ({ ...prev, [siteKey]: e.target.value }));
              }}
              style={styles.select}
            />
          </label>
          <label style={styles.inlineLabel}>
            Horaire du matin :
            <input
              type="time"
              value={getHoraireSite(siteKey, 'matinDebut')}
              onChange={(e) => setHoraireSite(siteKey, 'matinDebut', e.target.value)}
              style={styles.select}
            />
            <input
              type="time"
              value={getHoraireSite(siteKey, 'matinFin')}
              onChange={(e) => setHoraireSite(siteKey, 'matinFin', e.target.value)}
              style={styles.select}
            />
          </label>
          <label style={styles.inlineLabel}>
            Horaire de l'après-midi :
            <input
              type="time"
              value={getHoraireSite(siteKey, 'apresMidiDebut')}
              onChange={(e) => setHoraireSite(siteKey, 'apresMidiDebut', e.target.value)}
              style={styles.select}
            />
            <input
              type="time"
              value={getHoraireSite(siteKey, 'apresMidiFin')}
              onChange={(e) => setHoraireSite(siteKey, 'apresMidiFin', e.target.value)}
              style={styles.select}
            />
          </label>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.tablePool}>
            <colgroup>
              <col style={{ width: 110, minWidth: 110, maxWidth: 110 }} />
              {JOURS.map((j) => <col key={j} style={{ width: 'auto' }} />)}
            </colgroup>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.thCenter}>Demi-journée</th>
                {JOURS.map(j => <th key={j} style={styles.thCenter}>{j}</th>)}
              </tr>
              <tr style={styles.thead}>
                <th style={styles.thCenter}></th>
                {JOURS.map(j => (
                  <td key={`toggle-${j}`} style={styles.tdCenterRead}>
                    <button
                      type="button"
                      onClick={() => toggleJourActifSite(siteKey, j)}
                      style={{
                        ...styles.toggleBtn,
                        ...(isJourActifSite(siteKey, j) ? styles.toggleBtnActif : styles.toggleBtnInactif),
                        borderRadius: 999,
                      }}
                    >
                      {isJourActifSite(siteKey, j) ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOMENTS.map((moment, idxMoment) => (
                <React.Fragment key={`${siteKey}-${moment.id}`}>
                  <tr>
                    <td style={{ ...styles.tdCenterRead, fontWeight: 800, writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.04em' }}>{moment.label}</td>
                    {JOURS.map((j) => {
                      const actif = isJourActifSite(siteKey, j);
                      if (!actif) return <td key={`${j}-${moment.id}`} style={styles.dayInactiveCell}></td>;
                      const classesCell = getAffectationClassesSite(siteKey, j, moment.id);
                      return (
                        <td key={`${j}-${moment.id}`} style={styles.tdLeft}>
                          <div style={styles.pastillesWrap}>
                            {classesCell.map((cid) => {
                              const cl = classes.find(c => String(c.id) === String(cid));
                              return (
                                <button
                                  key={`${j}-${moment.id}-${cid}`}
                                  type="button"
                                  onClick={() => toggleClasseAffectationSite(siteKey, j, moment.id, cid)}
                                  style={styles.classChipActif}
                                >
                                  {cl?.nom || cid}
                                </button>
                              );
                            })}
                            {(classesSite || [])
                              .filter(c => !classeDejaUtiliseeDansSite(siteKey, c.id))
                              .map((cl) => (
                                <button
                                  key={`${j}-${moment.id}-add-${cl.id}`}
                                  type="button"
                                  onClick={() => toggleClasseAffectationSite(siteKey, j, moment.id, cl.id)}
                                  style={styles.classChip}
                                >
                                  {cl.nom}
                                </button>
                              ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  {idxMoment === 0 && (
                    <tr>
                      <td style={styles.tdSpacer}></td>
                      {JOURS.map(j => <td key={`spacer-${j}`} style={styles.tdSpacer}></td>)}
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const renderSelectionSite = (siteKey, siteLabel) => (
    <div key={siteKey} style={styles.siteCard}>
      <div style={styles.siteHeader}>
        <span style={styles.siteTitle}>{siteLabel} - </span>
        <input
          value={siteNames[siteKey]}
          onChange={e => {
            setPoolDirty(true);
            setSiteNames(prev => ({ ...prev, [siteKey]: e.target.value }));
          }}
          style={styles.siteInput}
          placeholder="Nom du site"
        />
        <div style={styles.siteLevelsWrap}>
          {niveauxDisponibles.map(level => {
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

      <div style={styles.sectionTitle}>Liste des professeurs séparée par niveau des pools</div>
      {chargement ? <div style={styles.empty}>Chargement...</div> : Object.entries(profsParNiveauPool).map(([niveau, liste]) => (
        <div key={niveau} style={styles.niveauBlock}>
          <div style={styles.niveauTitle}>Niveau {niveau}</div>
          <div style={styles.profsList}>
            {liste.map(p => {
              const checked = selectedBySite[siteKey].includes(p.id);
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

      <div style={styles.sectionTitle}>Affectation hebdomadaire selon les jours</div>
      {renderTablePoolSite(siteKey)}
    </div>
  );

  const renderResultat = () => {
    if (!niveaux.length) return <div style={styles.empty}>Aucun niveau de classe trouvé.</div>;
    const titreSession = resultatSession || 'Session non sélectionnée';
    const isFr = resultatMatiere === 'francais';

    return (
      <div style={styles.card}>
        <div style={styles.subTabsRow}>
          {niveaux.map(n => (
            <button
              key={n}
              onClick={() => setResultatNiveau(n)}
              style={{ ...styles.subTabBtn, ...(resultatNiveau === n ? styles.subTabBtnActif : {}) }}
            >
              {n}
            </button>
          ))}
        </div>

        <div style={styles.filtersRow}>
          <div style={styles.toggleWrap}>
            <button
              onClick={() => setResultatMatiere('francais')}
              style={{ ...styles.toggleBtn, ...(isFr ? styles.toggleBtnActif : {}) }}
            >
              Français
            </button>
            <button
              onClick={() => setResultatMatiere('math')}
              style={{ ...styles.toggleBtn, ...(!isFr ? styles.toggleBtnActif : {}) }}
            >
              Mathématiques
            </button>
          </div>
          <select value={resultatSession} onChange={e => setResultatSession(e.target.value)} style={styles.select}>
            <option value="">- Sélectionner la session -</option>
            {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {!resultatSession ? (
          <div style={styles.empty}>Sélectionnez une session.</div>
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
                    <th style={styles.thLeft}>Classe</th>
                    <th style={styles.thLeft}>Nom</th>
                    <th style={styles.thLeft}>Prénom</th>
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
                        <th style={styles.thCenter}>CSC-CFR</th>
                        <th style={styles.thCenter}>CAF-CAP</th>
                        <th style={styles.thCenter}>Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {elevesNiveau.map((e, idx) => {
                    const row = getScore(resultatMatiere, resultatSession, e.id);
                    const computed = isFr ? calculFr(row) : calculMath(row);
                    const total = computed.total === '' ? null : Number(computed.total);
                    const totalStyle = total == null ? {} : couleurTotale(total);
                    return (
                      <tr key={e.id}>
                        <td style={styles.tdCenter}>{idx + 1}</td>
                        <td style={styles.tdLeft}>{classesMap[String(e.classe_id)]?.nom || '—'}</td>
                        <td style={styles.tdLeft}>{toDisplayNom(e.nom) || ''}</td>
                        <td style={styles.tdLeft}>{e.prenom || ''}</td>

                        {isFr ? (
                          <>
                            {['co', 'po', 'ce', 'pe'].map(f => (
                              <td key={f} style={styles.tdCenter}>
                                <input
                                  style={styles.scoreInput}
                                  type="number"
                                  min="0"
                                  max="25"
                                  value={row[f] ?? ''}
                                  onChange={ev => setScore('francais', resultatSession, e.id, f, ev.target.value)}
                                />
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
                                <input
                                  style={styles.scoreInput}
                                  type="number"
                                  min="0"
                                  max="25"
                                  value={row[f] ?? ''}
                                  onChange={ev => setScore('math', resultatSession, e.id, f, ev.target.value)}
                                />
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

  const setTagClasseBloc = (poolId, demiId, blocKey, tag, classeId) => {
    setAffectationDirty(true);
    setOrganisationByPoolDemi(prev => {
      const key = `${poolId}::${demiId}`;
      const cur = { ...(prev[key] || {}) };
      const bloc = { ...(cur[blocKey] || {}) };
      bloc[tag] = classeId ? String(classeId) : '';
      cur[blocKey] = bloc;
      return { ...prev, [key]: cur };
    });
  };

  const renderRoles = () => {
    const siteKey = String(rolesPoolSelect || '');
    const demi = DEMI_JOURNEES.find(d => d.id === rolesDemiJourneeSelect);
    const selectedProfIds = siteKey ? (selectedBySite[siteKey] || []) : [];
    const profsPool = selectedProfIds
      .map(id => profMap[String(id)])
      .filter(Boolean);
    const reserveSet = new Set(
      demi
        ? selectedProfIds.filter((id) => statutCellule(siteKey, String(id), demi.jour, demi.moment) === 'rouge' && rActifCellule(siteKey, String(id), demi.jour, demi.moment))
        : []
    );
    const key = `${rolesPoolSelect}::${rolesDemiJourneeSelect}`;
    const rolesMap = rolesAffectesByPoolDemi[key] || {};
    const org = organisationByPoolDemi[key] || {};
    const classesAffecteesDemi = demi ? (affectationClassesBySite?.[String(rolesPoolSelect)]?.[cellKeyAffectation(demi.jour, demi.moment)] || []) : [];
    const classesColonnes = classesAffecteesDemi
      .map(cid => classes.find(c => String(c.id) === String(cid)))
      .filter(Boolean);
    const defaultStart = demi
      ? (demi.moment === 'matin' ? getHoraireSite(String(rolesPoolSelect), 'matinDebut') : getHoraireSite(String(rolesPoolSelect), 'apresMidiDebut'))
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
      <div style={styles.card}>
        <div style={styles.filtersRow}>
          <select value={rolesPoolSelect} onChange={(e) => { setRolesPoolSelect(e.target.value); setRolesDemiJourneeSelect(''); }} style={styles.select}>
            <option value="">- Sélectionner un pool -</option>
            {siteOrder.map((siteKey, idx) => (
              <option key={`role-pool-${siteKey}`} value={siteKey}>{siteNames[siteKey] || `Site ${idx + 1}`}</option>
            ))}
          </select>
          <select value={rolesDemiJourneeSelect} onChange={(e) => setRolesDemiJourneeSelect(e.target.value)} style={styles.select}>
            <option value="">- Sélectionner une demi-journée -</option>
            {DEMI_JOURNEES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        {!rolesPoolSelect || !rolesDemiJourneeSelect ? (
          <div style={styles.empty}>Sélectionnez un pool et une demi-journée.</div>
        ) : (
          <div style={styles.rolesGrid}>
            <div style={styles.tableWrap}>
              <table style={styles.tableRolesLeft}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.thLeftFixed}>Professeurs</th>
                    <th style={styles.thLeftFixed}>Rôle</th>
                  </tr>
                </thead>
                <tbody>
                  {profsPool.map((p) => {
                    const selectedRole = rolesMap[String(p.id)] || '';
                    return (
                      <tr key={`role-prof-${p.id}`}>
                        <td style={{ ...styles.tdLeft, ...(reserveSet.has(String(p.id)) ? styles.tdReserve : {}) }}>
                          {p.prenom} {toDisplayNom(p.nom)}
                        </td>
                        <td style={styles.tdLeft}>
                          <select
                            value={selectedRole}
                            onChange={(e) => {
                              const nextRole = e.target.value;
                              if (nextRole) {
                                const deja = Object.entries(rolesMap).filter(([pid, r]) => String(pid) !== String(p.id) && r === nextRole).length;
                                if (deja >= (ROLE_CAP[nextRole] ?? Infinity)) return;
                              }
                              setRoleProf(rolesPoolSelect, rolesDemiJourneeSelect, p.id, nextRole);
                            }}
                            style={styles.select}
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

            <div style={styles.tableWrap}>
              <table style={styles.tableRolesRight}>
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
                    const afficherHoraireTemps = !(estBlocAInner || estBlocBInner);
                    return (
                      <tr key={`ligne-${lg.row}`}>
                        {afficherHoraireTemps && (
                          <td style={styles.tdCenter} rowSpan={estBlocAStart || estBlocBStart ? 3 : 1}>
                            <input
                              style={{ ...styles.select, width: 88 }}
                              value={lignesHoraire[lg.row]?.start || ''}
                              onChange={(e) => setHoraireLigne(rolesPoolSelect, rolesDemiJourneeSelect, lg.row, e.target.value, lignesHoraire[lg.row]?.end || '')}
                              placeholder="Début"
                            />
                            <input
                              style={{ ...styles.select, width: 88, marginLeft: 6 }}
                              value={lignesHoraire[lg.row]?.end || ''}
                              onChange={(e) => setHoraireLigne(rolesPoolSelect, rolesDemiJourneeSelect, lg.row, lignesHoraire[lg.row]?.start || '', e.target.value)}
                              placeholder="Fin"
                            />
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
                                <div style={styles.pastillesWrap}>
                                  {['PE', 'PO', 'CE'].map(tag => (
                                    <button
                                      key={`${lg.row}-${cl.id}-${tag}`}
                                      type="button"
                                      onClick={() => setTagClasseBloc(rolesPoolSelect, rolesDemiJourneeSelect, 'blocA', tag, String(bloc[tag]) === String(cl.id) ? '' : cl.id)}
                                      style={{ ...styles.classChip, ...(String(bloc[tag]) === String(cl.id) ? styles.classChipActif : {}) }}
                                    >
                                      {tag}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            );
                          }
                          if (lg.row === 6 || lg.row === 7) {
                            const bloc = org[`ligne${lg.row}`] || {};
                            return (
                              <td key={`${lg.row}-${cl.id}`} style={styles.tdCenter}>
                                <div style={styles.pastillesWrap}>
                                  {['Pause', 'CO'].map(tag => (
                                    <button
                                      key={`${lg.row}-${cl.id}-${tag}`}
                                      type="button"
                                      onClick={() => setTagClasseBloc(rolesPoolSelect, rolesDemiJourneeSelect, `ligne${lg.row}`, tag, String(bloc[tag]) === String(cl.id) ? '' : cl.id)}
                                      style={{ ...styles.classChip, ...(String(bloc[tag]) === String(cl.id) ? styles.classChipActif : {}) }}
                                    >
                                      {tag}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            );
                          }
                          if (estBlocBStart) {
                            const bloc = org.blocB || {};
                            return (
                              <td key={`${lg.row}-${cl.id}`} style={styles.tdCenter} rowSpan={3}>
                                <div style={styles.pastillesWrap}>
                                  {['PE', 'PO', 'CE'].map(tag => (
                                    <button
                                      key={`${lg.row}-${cl.id}-${tag}`}
                                      type="button"
                                      onClick={() => setTagClasseBloc(rolesPoolSelect, rolesDemiJourneeSelect, 'blocB', tag, String(bloc[tag]) === String(cl.id) ? '' : cl.id)}
                                      style={{ ...styles.classChip, ...(String(bloc[tag]) === String(cl.id) ? styles.classChipActif : {}) }}
                                    >
                                      {tag}
                                    </button>
                                  ))}
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
                                if (lg.role === 'Oral 1') return role === 'Oral Groupe 1';
                                if (lg.role === 'Oral 2') return role === 'Oral Groupe 2';
                                if (lg.role === 'Accompagnement') return role === 'Accompagnement';
                                if (lg.role === 'Correction') return role === 'Correction';
                                if (lg.role === 'Surveillance') return role === 'Surveillance';
                                return false;
                              })
                              .map(([pid]) => {
                                const p = profMap[String(pid)];
                                if (!p) return null;
                                return <span key={`${lg.row}-prof-${pid}`} style={styles.profChip}>{p.prenom} {toDisplayNom(p.nom)}</span>;
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
        )}
      </div>
    );
  };

  const renderGraphique = () => {
    const poolClasses = graphPoolId ? (classesEligiblesSite[String(graphPoolId)] || []) : [];
    const poolClassIds = new Set(poolClasses.map(c => String(c.id)));
    const elevesPool = eleves
      .filter(e => poolClassIds.has(String(e.classe_id)))
      .sort((a, b) => `${a.prenom || ''} ${toDisplayNom(a.nom)}`.localeCompare(`${b.prenom || ''} ${toDisplayNom(b.nom)}`, 'fr'));
    const sessionsToShow = graphSession === '2e semestre'
      ? ["Test d'août", '1e semestre', '2e semestre']
      : graphSession === '1e semestre'
        ? ["Test d'août", '1e semestre']
        : graphSession === "Test d'août"
          ? ["Test d'août"]
          : [];
    const series = sessionsToShow.map((session) => {
      const sc = getScore(ongletGraphiqueMatiere, session, graphEleveId);
      if (ongletGraphiqueMatiere === 'francais') {
        const fr = calculFr(sc);
        const oral = Number(fr.oral || 0);
        const ecrit = Number(fr.ecrit || 0);
        const moyenne = (oral + ecrit) / 2;
        return { session, oral, ecrit, moyenne };
      }
      const ma = calculMath(sc);
      const total = Number(ma.total || 0);
      return { session, oral: total, ecrit: total, moyenne: total };
    });
    const maxVal = Math.max(1, ...series.flatMap(s => [s.oral, s.ecrit, s.moyenne]));

    return (
      <div style={styles.card}>
        <div style={styles.filtersRow}>
          <div style={styles.toggleWrap}>
            <button onClick={() => setOngletGraphiqueMatiere('francais')} style={{ ...styles.toggleBtn, ...(ongletGraphiqueMatiere === 'francais' ? styles.toggleBtnActif : {}) }}>Français</button>
            <button onClick={() => setOngletGraphiqueMatiere('math')} style={{ ...styles.toggleBtn, ...(ongletGraphiqueMatiere === 'math' ? styles.toggleBtnActif : {}) }}>Math</button>
          </div>
          <select value={graphPoolId} onChange={(e) => { setGraphPoolId(e.target.value); setGraphEleveId(''); }} style={styles.select}>
            <option value="">- Sélectionner le pool -</option>
            {siteOrder.map((siteKey, idx) => <option key={`graph-pool-${siteKey}`} value={siteKey}>{siteNames[siteKey] || `Site ${idx + 1}`}</option>)}
          </select>
          <select value={graphSession} onChange={(e) => setGraphSession(e.target.value)} style={styles.select}>
            <option value="">- Sélectionner la session -</option>
            {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={graphEleveId} onChange={(e) => setGraphEleveId(e.target.value)} style={styles.select}>
            <option value="">- Sélectionner l'élève -</option>
            {elevesPool.map(e => <option key={`graph-eleve-${e.id}`} value={String(e.id)}>{e.prenom} {toDisplayNom(e.nom)}</option>)}
          </select>
        </div>
        {!graphPoolId || !graphSession || !graphEleveId ? (
          <div style={styles.empty}>Sélectionnez un pool, une session et un élève.</div>
        ) : (
          <>
            <div style={styles.graphWrap}>
              {series.map((s) => (
                <div key={`bar-${s.session}`} style={styles.graphSessionCol}>
                  <div style={styles.graphSessionLabel}>{s.session}</div>
                  <div style={styles.graphBars}>
                    <div style={{ ...styles.graphBar, height: `${(s.oral / maxVal) * 180}px`, background: '#60a5fa' }} title={`Oral: ${s.oral}`}></div>
                    <div style={{ ...styles.graphBar, height: `${(s.ecrit / maxVal) * 180}px`, background: '#34d399' }} title={`Écrit: ${s.ecrit}`}></div>
                    <div style={{ ...styles.graphBar, height: `${(s.moyenne / maxVal) * 180}px`, background: '#f59e0b' }} title={`Moyenne: ${s.moyenne.toFixed(1)}`}></div>
                  </div>
                </div>
              ))}
            </div>
            {series.length > 1 && (
              <svg width="100%" height="120" viewBox="0 0 600 120" style={{ marginTop: 8 }}>
                {series.map((s, i) => {
                  const x = 30 + (i * (540 / (series.length - 1)));
                  const y = 100 - ((s.moyenne / maxVal) * 90);
                  return <circle key={`mean-dot-${s.session}`} cx={x} cy={y} r="4" fill="#f59e0b" />;
                })}
                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  points={series.map((s, i) => {
                    const x = 30 + (i * (540 / (series.length - 1)));
                    const y = 100 - ((s.moyenne / maxVal) * 90);
                    return `${x},${y}`;
                  }).join(' ')}
                />
              </svg>
            )}
          </>
        )}
      </div>
    );
  };

  const renderStatistiques = () => {
    const seuil = Number(statSeuil) || 0;
    const matiere = statMatiere;
    const session = statSession;
    const rows = eleves
      .map(e => {
        const sc = getScore(matiere, session, e.id);
        const total = matiere === 'francais' ? calculFr(sc).total : calculMath(sc).total;
        return {
          id: e.id,
          nom: e.nom || '',
          prenom: e.prenom || '',
          classe: classesMap[String(e.classe_id)]?.nom || '—',
          total: total === '' ? null : Number(total),
        };
      })
      .filter(r => r.total != null);

    const filtres = rows.filter(r => (statSens === 'fort' ? r.total >= seuil : r.total <= seuil));
    filtres.sort((a, b) => (statOrdre === 'croissant' ? a.total - b.total : b.total - a.total));

    return (
      <div style={styles.card}>
        <div style={styles.subTabsRow}>
          <button
            onClick={() => setStatSousOnglet('tri')}
            style={{ ...styles.subTabBtn, ...(statSousOnglet === 'tri' ? styles.subTabBtnActif : {}) }}
          >
            Trier
          </button>
        </div>

        {statSousOnglet === 'tri' && (
          <>
            <div style={styles.filtersRow}>
              <div style={styles.toggleWrap}>
                <button
                  onClick={() => setStatMatiere('francais')}
                  style={{ ...styles.toggleBtn, ...(statMatiere === 'francais' ? styles.toggleBtnActif : {}) }}
                >
                  Français
                </button>
                <button
                  onClick={() => setStatMatiere('math')}
                  style={{ ...styles.toggleBtn, ...(statMatiere === 'math' ? styles.toggleBtnActif : {}) }}
                >
                  Math
                </button>
              </div>

              <div style={styles.toggleWrap}>
                <button
                  onClick={() => { setStatSens('fort'); setStatSeuil('80'); }}
                  style={{ ...styles.toggleBtn, ...(statSens === 'fort' ? styles.toggleBtnActif : {}) }}
                >
                  Fort
                </button>
                <button
                  onClick={() => { setStatSens('faible'); setStatSeuil('40'); }}
                  style={{ ...styles.toggleBtn, ...(statSens === 'faible' ? styles.toggleBtnActif : {}) }}
                >
                  Faible
                </button>
              </div>

              <select value={statSession} onChange={e => setStatSession(e.target.value)} style={styles.select}>
                <option value="">- Sélectionner la session -</option>
                {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <input
                type="number"
                value={statSeuil}
                onChange={e => setStatSeuil(e.target.value)}
                style={{ ...styles.select, width: 120 }}
                placeholder="Seuil"
              />
              <button type="button" onClick={() => setStatSousOnglet('tri')} style={styles.btnSaveTop}>Trier</button>
              <div style={styles.toggleWrap}>
                <button
                  onClick={() => setStatOrdre('croissant')}
                  style={{ ...styles.toggleBtn, ...(statOrdre === 'croissant' ? styles.toggleBtnActif : {}) }}
                >
                  Croissant
                </button>
                <button
                  onClick={() => setStatOrdre('decroissant')}
                  style={{ ...styles.toggleBtn, ...(statOrdre === 'decroissant' ? styles.toggleBtnActif : {}) }}
                >
                  Décroissant
                </button>
              </div>
            </div>

            {!statSession ? (
              <div style={styles.empty}>Sélectionnez une session pour trier.</div>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <colgroup>
                    <col style={{ width: 60, minWidth: 60, maxWidth: 60 }} />
                    <col style={{ width: 95, minWidth: 95, maxWidth: 95 }} />
                    <col style={{ width: 160, minWidth: 160, maxWidth: 160 }} />
                    <col style={{ width: 160, minWidth: 160, maxWidth: 160 }} />
                    <col style={{ width: 'auto' }} />
                  </colgroup>
                  <thead>
                    <tr style={styles.thead}>
                      <th style={styles.thCenter}>N°</th>
                      <th style={styles.thCenter}>Classe</th>
                      <th style={styles.thLeft}>Nom</th>
                      <th style={styles.thLeft}>Prénom</th>
                      <th style={styles.thCenter}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtres.map((r, i) => {
                      const c = couleurTotale(r.total);
                      return (
                        <tr key={r.id}>
                          <td style={styles.tdCenter}>{i + 1}</td>
                          <td style={styles.tdCenter}>{r.classe}</td>
                          <td style={styles.tdLeft}>{toDisplayNom(r.nom)}</td>
                          <td style={styles.tdLeft}>{r.prenom}</td>
                          <td style={{ ...styles.tdLeftRead, background: c.bg, color: c.text }}>{r.total}</td>
                        </tr>
                      );
                    })}
                    {filtres.length === 0 && (
                      <tr>
                        <td colSpan={5} style={styles.empty}>Aucun élève ne correspond au tri.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
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

  const handleSavePool = () => {
    localStorage.setItem('tcf_pool_state', JSON.stringify({ siteOrder, siteCounter, siteNames, siteLevels, selectedBySite, splitByProf, poolCellOverrides }));
    setPoolDirty(false);
    afficherSaveMsg('pool');
  };

  const handleSaveAffectation = () => {
    localStorage.setItem('tcf_affectation_state', JSON.stringify({
      updatedAt: new Date().toISOString(),
      dateDebutBySite: affectationDateDebutBySite,
      horairesBySite: affectationHorairesBySite,
      classesBySite: affectationClassesBySite,
      joursActifsBySite: affectationJoursActifsBySite,
      rolesByPoolDemi: rolesAffectesByPoolDemi,
      organisationByPoolDemi: organisationByPoolDemi,
    }));
    setAffectationDirty(false);
    afficherSaveMsg('affectation');
  };

  const resetAffectationToSaved = () => {
    try {
      const aff = JSON.parse(localStorage.getItem('tcf_affectation_state') || '{}');
      setAffectationDateDebutBySite(aff?.dateDebutBySite || {});
      setAffectationHorairesBySite(aff?.horairesBySite || {});
      setAffectationClassesBySite(aff?.classesBySite || {});
      setAffectationJoursActifsBySite(aff?.joursActifsBySite || {});
      setRolesAffectesByPoolDemi(aff?.rolesByPoolDemi || {});
      setOrganisationByPoolDemi(aff?.organisationByPoolDemi || {});
    } catch {
      setAffectationDateDebutBySite({});
      setAffectationHorairesBySite({});
      setAffectationClassesBySite({});
      setAffectationJoursActifsBySite({});
      setRolesAffectesByPoolDemi({});
      setOrganisationByPoolDemi({});
    }
    setAffectationDirty(false);
  };

  const handleSaveResultat = () => {
    localStorage.setItem('tcf_resultats_scores', JSON.stringify(scores));
    setResultatDirty(false);
    afficherSaveMsg('resultat');
  };

  const tabHasUnsaved = (tab) => {
    if (tab === 'pool') return poolDirty;
    if (tab === 'affectation') return affectationDirty;
    if (tab === 'resultat') return resultatDirty;
    return false;
  };

  const handleTabChange = (nextTab) => {
    if (nextTab === onglet) return;
    if (tabHasUnsaved(onglet)) {
      const ok = window.confirm('Des changements ne sont pas sauvegardés. Voulez-vous quitter cet onglet sans sauvegarder ?');
      if (!ok) return;
      if (onglet === 'affectation') resetAffectationToSaved();
    }
    setOnglet(nextTab);
  };

  const handleAffectationSubTabChange = (next) => {
    if (next === sousOngletAffectation) return;
    if (affectationDirty) {
      const ok = window.confirm('Des changements dans Affectation ne sont pas sauvegardés. Changer de sous-onglet sans sauvegarder ?');
      if (!ok) return;
      resetAffectationToSaved();
    }
    setSousOngletAffectation(next);
  };

  const handleSaveCurrentTab = () => {
    if (onglet === 'pool') handleSavePool();
    else if (onglet === 'affectation') handleSaveAffectation();
    else if (onglet === 'resultat') handleSaveResultat();
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.btnBack}>← Retour</button>
        <h2 style={styles.title}>Test de connaissance</h2>
      </div>

      <div style={styles.tabsBar}>
        <div style={styles.tabsRow}>
          {[
            { id: 'pool', label: 'Pool' },
            { id: 'affectation', label: 'Affectation' },
            { id: 'planning', label: 'Planning' },
            { id: 'resultat', label: 'Résultat' },
            { id: 'statistique', label: 'Statistique' },
            { id: 'graphique', label: 'Graphique' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              style={{ ...styles.tabBtn, ...(onglet === t.id ? styles.tabBtnActif : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {(onglet === 'pool' || onglet === 'affectation' || onglet === 'resultat') && (
          <div style={styles.topSaveWrap}>
            {onglet === 'pool' && (
              <button type="button" style={styles.btnAddSite} onClick={ajouterSite}>
                + Ajouter un site
              </button>
            )}
            <button onClick={handleSaveCurrentTab} style={styles.btnSaveTop}>Sauvegarder</button>
          </div>
        )}
      </div>
      {saveToast && <div style={styles.noticeBand}>✅ {saveToast}</div>}

      {onglet === 'pool' && (
        <div style={styles.card}>
          <div style={styles.siteStack}>
            {siteOrder.map((siteKey, idx) => renderSelectionSite(siteKey, `Site ${idx + 1}`))}
          </div>
        </div>
      )}

      {onglet === 'affectation' && (
        <div style={styles.card}>
          <div style={styles.subTabsRow}>
            <button
              onClick={() => handleAffectationSubTabChange('classes')}
              style={{ ...styles.subTabBtn, ...(sousOngletAffectation === 'classes' ? styles.subTabBtnActif : {}) }}
            >
              Classes
            </button>
            <button
              onClick={() => handleAffectationSubTabChange('roles')}
              style={{ ...styles.subTabBtn, ...(sousOngletAffectation === 'roles' ? styles.subTabBtnActif : {}) }}
            >
              Rôles
            </button>
          </div>
          {sousOngletAffectation === 'classes' && (
            <div style={styles.siteStack}>
              {siteOrder.map((siteKey, idx) => (
                <div key={`aff-class-site-${siteKey}`} style={styles.siteCard}>
                  <div style={styles.sectionTitle}>{siteNames[siteKey] || `Site ${idx + 1}`}</div>
                  {renderTableAffectationSite(siteKey)}
                </div>
              ))}
            </div>
          )}
          {sousOngletAffectation === 'roles' && (
            renderRoles()
          )}
        </div>
      )}

      {onglet === 'planning' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Planning</h3>
          <div style={styles.empty}>Le planning est basé sur les affectations et disponibilités du module emploi du temps.</div>
        </div>
      )}

      {onglet === 'resultat' && renderResultat()}

      {onglet === 'statistique' && renderStatistiques()}

      {onglet === 'graphique' && renderGraphique()}
    </div>
  );
}

const styles = {
  page: {
    padding: 28,
    background: '#f8fafc',
    minHeight: '100vh',
    fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif",
  },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 },
  btnBack: { padding: '8px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', color: '#475569' },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' },
  tabsBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 },
  tabsRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  topSaveWrap: { display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  tabBtn: { padding: '8px 14px', borderRadius: 8, border: '1px solid transparent', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#475569', outline: 'none', boxShadow: 'none' },
  tabBtnActif: { background: '#6366f1', color: 'white', borderColor: '#6366f1' },
  btnSaveTop: { padding: '8px 16px', border: '1px solid #6366f1', borderRadius: 8, background: '#6366f1', color: 'white', fontWeight: 700, cursor: 'pointer' },
  card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 },
  cardTitle: { margin: '0 0 6px', fontSize: 18, color: '#0f172a' },
  empty: { fontSize: 13, color: '#94a3b8', padding: 12, textAlign: 'center' },
  affectationSiteLevelsBox: { border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', padding: 10, marginBottom: 10 },
  affectationSiteLevelsTitle: { fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 },
  affectationSiteLevelsRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  affectationSiteLevelsLabel: { fontSize: 12, fontWeight: 700, color: '#475569' },
  affectationSiteLevelsValue: { fontSize: 12, color: '#1e293b' },

  siteStack: { display: 'flex', flexDirection: 'column', gap: 14 },
  btnAddSite: { padding: '7px 12px', borderRadius: 8, border: '1px solid #6366f1', background: '#ede9fe', color: '#4c1d95', fontWeight: 700, cursor: 'pointer' },
  siteCard: { border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#fcfdff' },
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

  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 720 },
  tablePool: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 1180 },
  tableLarge: { width: '100%', borderCollapse: 'collapse', minWidth: 1100 },
  thead: { background: '#f8fafc' },
  thLeft: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '8px 10px', fontSize: 12, color: '#64748b', textAlign: 'left' },
  thProfPool: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '8px 12px', fontSize: 12, color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' },
  thCenter: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '8px 10px', fontSize: 12, color: '#64748b', textAlign: 'center' },
  tdLeft: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 10px', fontSize: 13, color: '#1e293b' },
  tdProfPool: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 12px', fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tdCenter: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 10px', fontSize: 13, color: '#1e293b', textAlign: 'center' },
  tdCenterCell: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 6px', fontSize: 13, color: '#1e293b', textAlign: 'center', cursor: 'pointer' },
  cellStatusWrap: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 18 },
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

  subTabsRow: { display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  subTabBtn: { padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#475569', outline: 'none' },
  subTabBtnActif: { background: '#6366f1', color: 'white', borderColor: '#6366f1' },
  filtersRow: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 },
  toggleWrap: { display: 'flex', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' },
  toggleBtn: { padding: '7px 11px', border: 'none', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#475569', outline: 'none', boxShadow: 'none' },
  toggleBtnActif: { background: '#6366f1', color: 'white' },
  toggleBtnInactif: { background: '#111827', color: '#ffffff' },
  select: { padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#1e293b', background: 'white' },
  tableTitleBig: { margin: '10px 0', fontSize: 16, color: '#0f172a' },
  scoreInput: { width: 62, padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, textAlign: 'center' },
  tdLeftRead: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 10px', fontSize: 13, textAlign: 'left', fontWeight: 700 },
  affectationMetaWrap: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' },
  inlineLabel: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#334155', flexWrap: 'wrap' },
  dayInactiveCell: { background: '#000000', minHeight: 42, borderBottom: '1px solid #111827', borderRight: '1px solid #111827' },
  pastillesWrap: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  classChip: { border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: 999, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  classChipActif: { border: '1px solid #6366f1', background: '#6366f1', color: '#ffffff', borderRadius: 999, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  tdSpacer: { padding: 0, height: 22, background: '#ffffff', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' },
  rolesGrid: { display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 12 },
  tableRolesLeft: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 360 },
  tableRolesRight: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 980 },
  thLeftFixed: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '8px 10px', fontSize: 12, color: '#64748b', textAlign: 'left', width: 160, minWidth: 160, maxWidth: 160 },
  tdReserve: { background: '#ede9fe', color: '#4c1d95', fontWeight: 700 },
  profChip: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 138, padding: '5px 9px', borderRadius: 999, background: '#eef2ff', border: '1px solid #c7d2fe', color: '#3730a3', fontSize: 11, fontWeight: 700 },
  graphWrap: { display: 'flex', alignItems: 'flex-end', gap: 20, minHeight: 240, padding: '12px 8px' },
  graphSessionCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  graphSessionLabel: { fontSize: 12, color: '#334155', fontWeight: 700, textAlign: 'center' },
  graphBars: { display: 'flex', alignItems: 'flex-end', gap: 6, minHeight: 180 },
  graphBar: { width: 26, borderRadius: '6px 6px 0 0' },
};
