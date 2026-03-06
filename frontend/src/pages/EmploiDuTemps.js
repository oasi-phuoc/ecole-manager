import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';
const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];
const AFFECTATION_MODES_STORAGE_KEY = 'emploi_du_temps_affectation_modes';
const BASE_PERIODES_TAUX = 42;
const SALLES_FIXES_PAR_LIEU = {
  creuset: ['Salle 1', 'Salle 2', 'Salle 3'],
  botza: ['Salle 1', 'Salle 2', 'Salle 3', 'Salle 4'],
  synecom: ['Salle 11', 'Salle 12', 'Salle 13', 'Salle 21', 'Salle 22', 'Salle 23', 'Salle 24', 'Salle 25', 'Salle 26'],
};
const COULEURS = [
  '#F8B4B4', // rouge pastel
  '#B7E4C7', // vert pastel
  '#FFD6A5', // orange pastel
  '#AEEBFF', // cyan pastel
  '#FBCFE8', // rose pastel
  '#BFDBFE', // bleu pastel
  '#DDD6FE', // violet pastel
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
const PERIODES_PAR_NIVEAU = { CSC: 24, CFR: 20, EPL: 20 };
const normaliserLieuTravail = (v) => String(v || '').trim().toLowerCase();

export default function EmploiDuTemps() {
  const [onglet, setOnglet] = useState('pools');
  const [sousOngletAff, setSousOngletAff] = useState('classes');
  const [profs, setProfs] = useState([]);
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [creneaux, setCreneaux] = useState([]);
  const [pools, setPools] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [affectationModes, setAffectationModes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AFFECTATION_MODES_STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  });
  const [classeHoraires, setClasseHoraires] = useState([]);
  const [profSelectionne, setProfSelectionne] = useState(null);
  const [dispos, setDispos] = useState({});
  const [disposAffectations, setDisposAffectations] = useState({});
  const [planningGeneral, setPlanningGeneral] = useState(null);
  const [planningPoolId, setPlanningPoolId] = useState('');
  const [planningProf, setPlanningProf] = useState(null);
  const [profPlanningId, setProfPlanningId] = useState('');
  const [planningClasse, setPlanningClasse] = useState(null);
  const [classePlanningId, setClassePlanningId] = useState('');
  const [classePlanningPoolId, setClassePlanningPoolId] = useState('');
  const [sallesLieuTravailId, setSallesLieuTravailId] = useState('');
  const [salleSelectionnee, setSalleSelectionnee] = useState('');
  const [remarquesDispo, setRemarquesDispo] = useState('');
  const [coursEmploiDuTemps, setCoursEmploiDuTemps] = useState([]);
  const [planningBranches, setPlanningBranches] = useState([]);
  const [showPoolForm, setShowPoolForm] = useState(false);
  const [poolEdit, setPoolEdit] = useState(null);
  const [poolForm, setPoolForm] = useState({nom:'',site:'',couleur:'#6366f1',niveau:'',prof_ids:[],classe_ids:[],branche_ids:[],horaires:[...HORAIRES_DEFAUT]});
  const [poolAffId, setPoolAffId] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerTout(); }, []);

  const chargerTout = async () => {
    try {
      const [p, cl, m, cr, po, af, ch, edt] = await Promise.all([
        axios.get(API + '/profs', { headers }),
        axios.get(API + '/classes', { headers }),
        axios.get(API + '/branches', { headers }),
        axios.get(API + '/planning/creneaux', { headers }),
        axios.get(API + '/planning/pools', { headers }),
        axios.get(API + '/planning/affectations', { headers }),
        axios.get(API + '/planning/classe-horaires', { headers }),
        axios.get(API + '/emploi-du-temps', { headers }),
      ]);
      setProfs(p.data.filter(x => x.actif !== false));
      setClasses(cl.data);
      setMatieres(m.data);
      setCreneaux(cr.data);
      setPools(po.data);
      setAffectations(af.data);
      setClasseHoraires(ch.data);
      setCoursEmploiDuTemps(edt.data || []);
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
    localStorage.setItem(AFFECTATION_MODES_STORAGE_KEY, JSON.stringify(affectationModes));
  }, [affectationModes]);

  useEffect(() => {
    setSalleSelectionnee('');
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
    chargerDisposAffectations(poolAffId);
    alert('Disponibilités et remarque sauvegardées !');
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
      if (!poolForm.niveau) { alert('Veuillez sélectionner un niveau.'); return; }
      if (!poolForm.site) { alert('Veuillez sélectionner un lieu de travail.'); return; }
      if (totalPeriodesRequisesFormTotal < totalPeriodesProfsForm) {
        const ok = window.confirm(
          "Les périodes professeurs dépassent le total requis (cours + titulariat). Voulez-vous vraiment poursuivre la sauvegarde ?"
        );
        if (!ok) return;
      } else if (totalPeriodesRequisesFormTotal > totalPeriodesProfsForm) {
        const manque = totalPeriodesRequisesFormTotal - totalPeriodesProfsForm;
        const ok = window.confirm(
          `Il manque ${manque} période(s) professeur par rapport au total requis (cours + titulariat). Voulez-vous vraiment poursuivre la sauvegarde ?`
        );
        if (!ok) return;
      }
      if (poolEdit) {
        await axios.put(API + '/planning/pools/' + poolEdit.id, poolForm, { headers });
      } else {
        await axios.post(API + '/planning/pools', poolForm, { headers });
      }
      setShowPoolForm(false); setPoolEdit(null);
      setPoolForm({nom:'',site:'',couleur:'#1a73e8',prof_ids:[],classe_ids:[],branche_ids:[],horaires:[...HORAIRES_DEFAUT]});
      chargerTout();
    } catch(err) { alert(err.response?.data?.message || err.message); }
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
    const horairesClasse = nouveaux.filter(h => h.classe_id==classe_id).map(h => ({jour:h.jour, periode:h.periode}));
    await axios.post(API + '/planning/classe-horaires/' + classe_id, { horaires: horairesClasse }, { headers });
    chargerTout();
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
    const r = await axios.get(API + '/planning-branches?pool_id=' + pool_id, { headers });
    setPlanningBranches(r.data);
  };

  const getPlanningBranche = (classe_id, matiere_id) =>
    planningBranches.find(pb => pb.classe_id==classe_id && pb.matiere_id==matiere_id);

  const handleBrancheChange = async (classe_id, matiere_id, pool_id, prof_id) => {
    if (!isAdmin()) return;
    if (!prof_id) {
      await axios.delete(API + '/planning-branches', { data: {classe_id, matiere_id, pool_id}, headers });
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
      await axios.post(API + '/planning-branches', { prof_id, classe_id, matiere_id, pool_id }, { headers });
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
  const poolEstCSC = String(poolSelectionne?.niveau || '').toUpperCase() === 'CSC';
  const classesPoolIds = new Set(classesPool.map(c => String(c.id)));
  const profsPoolIds = new Set(profsPool.map(p => String(p.id)));
  const affectationsPool = affectations.filter(a =>
    profsPoolIds.has(String(a.prof_id)) &&
    (classesPoolIds.has(String(a.classe_id)) || !!a.type_special)
  );
  const suiviClasses = classesPool.map(cl => {
    const niveauClasse = String(cl.niveau || poolSelectionne?.niveau || '').toUpperCase();
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

  const poolClasseP = pools.find(p => p.id == classePlanningPoolId);
  const classesPoolP = poolClasseP ? poolClasseP.classes : classes;
  const profsPoolP = poolClasseP ? poolClasseP.profs : profs;
  const niveauPoolPlanning = String(poolClasseP?.niveau || '').toUpperCase();
  const matieresPourPlanningClasse = matieres.filter(m =>
    niveauPoolPlanning && String(m.niveau || '').toUpperCase() === niveauPoolPlanning
  );
  const suiviBranchesClasse = planningClasse ? matieresPourPlanningClasse.map(m => {
    const affectees = (planningClasse.affectations || []).filter(a => String(a.matiere_id) === String(m.id)).length;
    const requises = parseInt(m.periodes_semaine) || 0;
    return { id: m.id, nom: m.nom, affectees, requises };
  }) : [];
  const lieuxTravailMap = new Map([
    ['creuset', 'Creuset'],
    ['botza', 'Botza'],
    ['synecom', 'Synecom'],
  ]);
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
  const sallesFixesLieu = SALLES_FIXES_PAR_LIEU[normaliserLieuTravail(sallesLieuTravailId)] || [];
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
  const getClasseAffecteeSalleCellule = (jour, periode, ordre) => {
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
  const handleAffectationSalleChange = async ({ jour, periode, ordre, classeId }) => {
    if (!isAdmin() || !salleSelectionnee) return;
    const creneau = getCreneauCelluleSalle(jour, periode, ordre);
    if (!creneau) return;
    try {
      const debut = normaliserHeureCreneau(creneau.heure_debut);
      const fin = normaliserHeureCreneau(creneau.heure_fin);
      const coursDuCreneau = coursEmploiDuTemps.filter(c =>
        c.jour === jour &&
        normaliserHeureCreneau(c.heure_debut) === debut &&
        normaliserHeureCreneau(c.heure_fin) === fin
      );
      const updates = [];
      const salleCourante = String((salleSelectionnee || '').trim());

      coursDuCreneau.forEach(c => {
        const salleDuCours = String((c.salle || '').trim());
        if (salleDuCours === salleCourante && String(c.classe_id) !== String(classeId || '')) {
          updates.push(updateCoursSalle(c, null));
        }
      });

      if (classeId) {
        const coursClasse = coursDuCreneau.find(c => String(c.classe_id) === String(classeId));
        if (!coursClasse) {
          updates.push(
            axios.post(API + '/emploi-du-temps', {
              classe_id: classeId,
              matiere_id: null,
              prof_id: null,
              jour,
              heure_debut: creneau.heure_debut,
              heure_fin: creneau.heure_fin,
              salle: salleSelectionnee,
            }, { headers })
          );
        } else {
          const salleDuCoursClasse = String((coursClasse.salle || '').trim());
          if (salleDuCoursClasse !== salleCourante) {
            updates.push(updateCoursSalle(coursClasse, salleSelectionnee));
          }
        }
      }

      if (updates.length === 0) return;
      await Promise.all(updates);
      await chargerTout();
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Erreur lors de l'affectation de la salle.");
    }
  };
  const classesPourSallesIds = new Set(classesPourSalles.map(cl => String(cl.id)));
  const creneauxTheoriquesKeys = new Set(
    creneaux.map(c => `${c.jour}|${normaliserHeureCreneau(c.heure_debut)}|${normaliserHeureCreneau(c.heure_fin)}`)
  );
  const totalCreneauxTheoriques = creneauxTheoriquesKeys.size;
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

  const niveauPool = String(poolForm.niveau || '').toUpperCase();
  const classesSelectionneesForm = classes.filter(c => poolForm.classe_ids.includes(c.id));
  const totalPeriodesCoursForm = classesSelectionneesForm.reduce((sum, c) => {
    const niv = String(c.niveau || niveauPool || '').toUpperCase();
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

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={styles.titre}>📅 Emploi du Temps</h2>
      </div>

      <div style={styles.onglets}>
        {[
          {id:'pools', label:'👥 Pools'},
          {id:'disponibilites', label:'✅ Disponibilités'},
          {id:'affectations', label:'📌 Affectations'},
          {id:'prof', label:'👨‍🏫 Planning Profs'},
          {id:'general', label:'📊 Planning Général'},
        ].map(o => (
          <button key={o.id} style={{...styles.onglet,...(onglet===o.id?styles.ongletActif:{})}}
            onClick={() => { setOnglet(o.id); if(o.id==='general') chargerPlanningGeneral(''); }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* ===== DISPONIBILITÉS ===== */}
      {onglet === 'disponibilites' && (
        <div>
          <div style={styles.card}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
              <h3 style={{...styles.cardTitre, fontSize:18, marginBottom:0}}>Sélectionner un professeur :</h3>
              <select
                style={{...styles.sel, width: 360, maxWidth:'100%'}}
                value={profSelectionne || ''}
                onChange={async e => {
                  const profId = e.target.value;
                  if (!profId) {
                    setProfSelectionne(null);
                    setDispos({});
                    setRemarquesDispo('');
                    return;
                  }
                  await chargerDispos(profId);
                }}
              >
                <option value="">— Sélectionner un professeur —</option>
                {profs.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nom} {p.prenom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {profSelectionne && (
            <div style={styles.card}>
              <div style={styles.rowBetween}>
                <h3 style={styles.cardTitre}>
                  {profDispoSelectionne?.nom} {profDispoSelectionne?.prenom}
                  <span style={{marginLeft:10,fontSize:14,fontWeight:800,color:couleurCompteurDispo}}>
                    {periodesSelectionneesDispo} / {periodesRequisesDispo} périodes
                  </span>
                </h3>
                {isAdmin() && <button style={styles.btnBleu} onClick={sauverDispos}>💾 Sauvegarder</button>}
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
                        <th style={{...styles.thA, width:160, minWidth:160, maxWidth:160}}>Période</th>
                        {JOURS.map(j => <th key={j} style={styles.thAJour}>{j}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {['Matin','Après-midi'].map(periode => {
                        const crsLundi = creneaux.filter(c => c.jour==='Lundi' && c.periode===periode);
                        return crsLundi.map((crBase, idx) => (
                          <tr key={crBase.id}>
                            <td style={{...styles.tdPer, width:160, minWidth:160, maxWidth:160}}>
                              <span style={styles.periodeTag}>{periode}</span>
                              <span style={styles.periodeNum}>Période {idx+1}</span>
                            </td>
                            {JOURS.map(jour => {
                              const cr = creneaux.find(c => c.jour===jour && c.periode===periode && c.ordre===crBase.ordre);
                              if (!cr) return <td key={jour} style={{...styles.tdDispo, background:'#f0f0f0'}}></td>;
                              const ok = dispos[cr.id] !== false;
                              return (
                                <td key={jour} style={{...styles.tdDispo, cursor:isAdmin()?'pointer':'default'}}
                                  onClick={() => isAdmin() && toggleDispo(cr.id)}>
                                  <span style={{fontSize:24, lineHeight:1, color:ok?'#16a34a':'#dc2626'}}>●</span>
                                </td>
                              );
                            })}
                          </tr>
                        ));
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
          <div style={styles.rowBetween}>
            <h3 style={styles.cardTitre}>Pools</h3>
            {isAdmin() && <button style={styles.btnVert} onClick={() => { setShowPoolForm(true); setPoolEdit(null); setPoolForm({nom:'',site:'',couleur:'#6366f1',niveau:'',prof_ids:[],classe_ids:[],branche_ids:[],horaires:[...HORAIRES_DEFAUT]}); }}>+ Nouveau pool</button>}
          </div>

          {showPoolForm && (
            <div style={styles.overlay}>
              <div style={{...styles.modal, width:1000}}>
                <h3 style={styles.modalTitre}>{poolEdit?'Modifier':'Créer'} un pool</h3>
                <div style={{display:'grid',gridTemplateColumns:'minmax(0, 1fr) 250px',gap:18,alignItems:'start'}}>
                  <div style={styles.formGrid}>
                    <div style={{...styles.fc, gridColumn:'1/-1'}}>
                      <label style={styles.lbl}>Désignation <span style={{color:'#ef4444'}}>*</span></label>
                      <input style={styles.inp} value={poolForm.nom} onChange={e => setPoolForm({...poolForm,nom:e.target.value})} />
                    </div>
                    <div style={styles.fc}>
                      <label style={styles.lbl}>Niveau <span style={{color:'#ef4444'}}>*</span></label>
                      <select style={styles.inp} value={poolForm.niveau} onChange={e => setPoolForm({...poolForm,niveau:e.target.value})}>
                        <option value="">— Sélectionner —</option>
                        <option value="CSC">CSC</option>
                        <option value="CFR">CFR</option>
                        <option value="EPL">EPL</option>
                      </select>
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
                      <select style={styles.inp} value={poolForm.site} onChange={e => setPoolForm({...poolForm,site:e.target.value})}>
                        <option value="">— Sélectionner —</option>
                        <option value="Synecom">Synecom</option>
                        <option value="Botza">Botza</option>
                        <option value="Creuset">Creuset</option>
                      </select>
                      <div style={{marginTop:6,fontSize:12,fontWeight:700,color:couleurPeriodesProfs}}>
                        Périodes professeurs : {totalPeriodesProfsForm}
                      </div>
                    </div>
                    <div style={{...styles.fc, gridColumn:'1/-1'}}>
                      <label style={styles.lbl}>Classes {poolForm.niveau && <span style={{color:'#6366f1',fontSize:11,fontWeight:400}}>(niveau : {poolForm.niveau})</span>}</label>
                      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>
                        {classes.filter(c => !poolForm.niveau || c.niveau === poolForm.niveau || !c.niveau).map(c => (
                          <label key={c.id} style={{...styles.checkBadge,background:poolForm.classe_ids.includes(c.id)?poolForm.couleur:'#f0f0f0',color:'#111827'}}>
                            <input type="checkbox" checked={poolForm.classe_ids.includes(c.id)} onChange={() => setPoolForm({...poolForm,classe_ids:toggleArr(poolForm.classe_ids,c.id)})} style={{marginRight:4}} />
                            {c.nom}{c.niveau && <span style={{opacity:.6,fontSize:11}}> ({c.niveau})</span>}
                          </label>
                        ))}
                      </div>
                    </div>
                    {(() => {
                      const niveauSel = poolForm.niveau || '';
                      const siteSel = poolForm.site || '';
                      const respecteNiveau = (p) => !!niveauSel && (p.niveau_prefere || '') === niveauSel;
                      const respecteLieu = (p) => !!siteSel && (p.lieu_travail_prefere || '') === siteSel;
                      const blocsProfs = [
                        {
                          label: `✅ Respecte les deux critères (${niveauSel || '?'} / ${siteSel || '?'})`,
                          items: profs.filter(p => respecteNiveau(p) && respecteLieu(p))
                        },
                        {
                          label: `🎯 A une préférence pour ce niveau (${niveauSel || '?'})`,
                          items: profs.filter(p => respecteNiveau(p) && !respecteLieu(p))
                        },
                        {
                          label: `📍 A une préférence pour ce lieu de travail (${siteSel || '?'})`,
                          items: profs.filter(p => !respecteNiveau(p) && respecteLieu(p))
                        },
                        {
                          label: '👤 Ne respecte pas ces critères',
                          items: profs.filter(p => !respecteNiveau(p) && !respecteLieu(p))
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
                              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                                {bloc.items.map(p => (
                                  <label key={p.id} style={{...styles.checkBadge,background:poolForm.prof_ids.includes(p.id)?poolForm.couleur:'#f0f0f0',color:'#111827'}}>
                                    <input type="checkbox" checked={poolForm.prof_ids.includes(p.id)} onChange={() => setPoolForm({...poolForm,prof_ids:toggleArr(poolForm.prof_ids,p.id)})} style={{marginRight:4}} />
                                    {p.nom} {p.prenom}
                                    {p.taux_activite ? <span style={{opacity:.7,fontSize:10,marginLeft:4}}>({p.taux_activite}%)</span> : ''}
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
                      <label style={styles.lbl}>Couleur</label>
                      <div style={{display:'flex',flexWrap:'nowrap',gap:6,marginTop:6}}>
                        {COULEURS.map(c => <div key={c} onClick={() => setPoolForm({...poolForm,couleur:c})}
                          style={{width:26,height:26,borderRadius:'50%',background:c,cursor:'pointer',border:poolForm.couleur===c?'3px solid #333':'3px solid transparent'}} />)}
                      </div>
                    </div>

                    <div style={styles.fc}>
                      <label style={styles.lbl}>Créneaux horaires</label>
                      <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:8}}>
                        {['Matin','Après-midi'].map(per => (
                          <div key={per} style={{background:'#f8f9fa',borderRadius:8,padding:12}}>
                            <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:'#555'}}>{per}</div>
                            {poolForm.horaires.filter(h=>h.periode===per).map((h,idx) => (
                              <div key={idx} style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                                <span style={{fontSize:12,width:60,color:'#888'}}>P{idx+1}</span>
                                <input style={{...styles.inp,width:70,padding:'4px 6px',fontSize:12}} value={h.debut}
                                  onChange={e => { const nh=[...poolForm.horaires]; const gi=poolForm.horaires.indexOf(h); nh[gi]={...h,debut:e.target.value}; setPoolForm({...poolForm,horaires:nh}); }} />
                                <span style={{fontSize:11,color:'#aaa'}}>→</span>
                                <input style={{...styles.inp,width:70,padding:'4px 6px',fontSize:12}} value={h.fin}
                                  onChange={e => { const nh=[...poolForm.horaires]; const gi=poolForm.horaires.indexOf(h); nh[gi]={...h,fin:e.target.value}; setPoolForm({...poolForm,horaires:nh}); }} />
                              </div>
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

          <div style={styles.poolsGrid}>
            {pools.map(pool => (
              <div key={pool.id} style={{...styles.poolCard,borderTop:'4px solid '+pool.couleur}}>
                <div style={styles.rowBetween}>
                  <div>
                    <div style={{fontWeight:700,fontSize:16}}>{pool.nom}</div>
                    {pool.niveau && <div style={{color:'#6366f1',fontSize:13,fontWeight:600}}>📚 {pool.niveau}</div>}
                    {pool.site && <div style={{color:'#888',fontSize:13}}>📍 {pool.site}</div>}
                  </div>
                  {isAdmin() && <div>
                    <button style={styles.btnIcon} onClick={() => {
                      setPoolEdit(pool); setShowPoolForm(true);
                      setPoolForm({nom:pool.nom,site:pool.site||'',couleur:pool.couleur,
                        niveau:pool.niveau||'',
                        prof_ids:pool.profs.map(p=>p.id),classe_ids:pool.classes.map(c=>c.id),
                        branche_ids:pool.branches.map(b=>b.id),
                        horaires:pool.horaires&&pool.horaires.length===8?pool.horaires:[...HORAIRES_DEFAUT]});
                    }}>✏️</button>
                    <button style={styles.btnIcon} onClick={async () => { if(window.confirm('Supprimer ?')) { await axios.delete(API+'/planning/pools/'+pool.id,{headers}); chargerTout(); } }}>🗑️</button>
                  </div>}
                </div>
                <div style={{marginTop:10}}>
                  <div style={styles.poolLabel}>PROFS</div>
                  {pool.profs.map(p => <span key={p.id} style={{...styles.badge,background:pool.couleur+'22',color:'#111827'}}>{p.nom} {p.prenom}</span>)}
                  {pool.profs.length===0&&<span style={styles.aucun}>Aucun</span>}
                </div>
                <div style={{marginTop:8}}>
                  <div style={styles.poolLabel}>CLASSES</div>
                  {pool.classes.map(c => <span key={c.id} style={{...styles.badge,background:'#e8f0fe',color:'#1a73e8'}}>{c.nom}</span>)}
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
          <div style={styles.affActionsWrap}>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              {[{id:'classes',label:'Classes'},{id:'salles',label:'Salles'},{id:'profs',label:'Professeurs'},{id:'branches',label:'Branches'}].map(o => (
                <button key={o.id} style={{...styles.affTabBtn,...(sousOngletAff===o.id?styles.affTabBtnActif:{})}}
                  onClick={() => {
                    setSousOngletAff(o.id);
                    if (o.id === 'classes' || o.id === 'profs') setPoolAffId('');
                    if (o.id === 'branches') {
                      setClassePlanningPoolId('');
                      setClassePlanningId('');
                      setPlanningClasse(null);
                    }
                  }}>
                  {o.label}
                </button>
              ))}
              {(sousOngletAff === 'classes' || sousOngletAff === 'profs') && (
                <select style={styles.sel} value={poolAffId} onChange={e => setPoolAffId(e.target.value)}>
                  <option value="">— Sélectionner un pool —</option>
                  {pools.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </select>
              )}
              {sousOngletAff === 'branches' && (
                <>
                  <select
                    style={styles.sel}
                    value={classePlanningPoolId}
                    onChange={e => {
                      setClassePlanningPoolId(e.target.value);
                      setClassePlanningId('');
                      setPlanningClasse(null);
                    }}
                  >
                    <option value="">— Sélectionner un pool —</option>
                    {pools.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                  <select
                    style={styles.sel}
                    value={classePlanningId || ''}
                    disabled={!classePlanningPoolId}
                    onChange={e => {
                      const classeId = e.target.value;
                      setClassePlanningId(classeId);
                      if (classeId) chargerPlanningClasse(classeId, classePlanningPoolId);
                      else setPlanningClasse(null);
                    }}
                  >
                    <option value="">{classePlanningPoolId ? '— Sélectionner une classe —' : '— Sélectionner d’abord un pool —'}</option>
                    {classesPoolP.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </>
              )}
              {sousOngletAff === 'salles' && (
                <>
                  <select
                    style={styles.sel}
                    value={sallesLieuTravailId}
                    onChange={e => setSallesLieuTravailId(e.target.value)}
                  >
                    <option value="">— Sélectionner un lieu de travail —</option>
                    {lieuxTravailOptions.map(lieu => <option key={lieu} value={lieu}>{lieu}</option>)}
                  </select>
                  <select
                    style={styles.sel}
                    value={salleSelectionnee}
                    disabled={!sallesLieuTravailId}
                    onChange={e => setSalleSelectionnee(e.target.value)}
                  >
                    <option value="">{sallesLieuTravailId ? '- Sélectionner une salle -' : '— Sélectionner d’abord un lieu —'}</option>
                    {sallesDisponiblesLieu.map(salle => <option key={salle} value={salle}>{salle}</option>)}
                  </select>
                </>
              )}
            </div>
          </div>

          {/* AFFECTATION CLASSES - toggle cycle exclusif par jour */}
          {sousOngletAff === 'classes' && (
            <div style={{marginTop:12}}>
              {!poolAffId ? (
                <div style={{...styles.card, color:'#64748b', fontWeight:600}}>
                  Sélectionnez d'abord un pool pour afficher les classes.
                </div>
              ) : (
              <>
              <div style={{marginBottom:12}}>
                <h3 style={styles.suiviGrandTitre}>Suivi des horaires classes</h3>
                <div style={styles.suiviJoursGrid}>
                  {JOURS.map(j => (
                    <div key={j} style={styles.suiviJourChip}>
                      <div style={styles.suiviJourNom}>{j}</div>
                      <div style={styles.suiviJourLigne}>Matin : {resumePeriodesParJour[j].matin}</div>
                      <div style={styles.suiviJourLigne}>Après-midi : {resumePeriodesParJour[j].apresMidi}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{...styles.tbl, tableLayout:'auto', minWidth:860}}>
                  <thead>
                    <tr style={styles.theadRow}>
                      <th style={{...styles.th,width:180,minWidth:180,maxWidth:180}}>Classe</th>
                      {JOURS.map(j => <th key={j} style={{...styles.th,textAlign:'center',minWidth:140}}>{j}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {classesPool.map((cl,ri) => (
                      <tr key={cl.id} style={{background:ri%2===0?'white':'#fafbfc'}}>
                        <td style={{...styles.td,fontWeight:800,fontSize:14,color:'#0f172a',width:180,minWidth:180,maxWidth:180}}>
                          {cl.nom}
                        </td>
                        {JOURS.map(jour => {
                          const periode = getHoraireJourClasse(cl.id, jour);
                          return (
                            <td key={jour} style={{padding:'10px 8px',textAlign:'center',borderBottom:'1px solid #f1f5f9',minWidth:140}}>
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

          {/* AFFECTATION PROFS - profs en entête, classes en lignes par créneau */}
          {sousOngletAff === 'profs' && (
            <div style={{marginTop:12}}>
              {!poolAffId ? (
                <div style={{...styles.card, color:'#64748b', fontWeight:600}}>
                  Sélectionnez d'abord un pool pour afficher les professeurs.
                </div>
              ) : (
              <>
              <div style={{marginBottom:10}}>
                <h3 style={styles.suiviGrandTitre}>Suivi classes</h3>
                <div style={styles.suiviClassesGrid}>
                  {suiviClasses.map(cl => {
                    const classeOk = cl.niveauClasse === 'CSC'
                      ? (cl.periodesNormalesAffectees === cl.periodesNormalesRequises && cl.periodesSoutienAffectees === cl.periodesSoutienRequises)
                      : (cl.periodesNormalesAffectees === cl.periodesNormalesRequises);
                    return (
                      <div key={cl.id} style={{
                        ...styles.suiviClasseChip,
                        border: classeOk ? '1px solid #86efac' : '1px solid #fecaca',
                        background: classeOk ? '#f0fdf4' : '#fef2f2',
                        color: classeOk ? '#166534' : '#991b1b'
                      }}>
                        <div style={styles.suiviClasseNom}>{cl.nom}</div>
                        {cl.niveauClasse === 'CSC' && (
                          <>
                            <div style={styles.suiviClasseLigne}>Périodes normales : {cl.periodesNormalesAffectees} / {cl.periodesNormalesRequises}</div>
                            <div style={styles.suiviClasseLigne}>Périodes de soutien : {cl.periodesSoutienAffectees} / {cl.periodesSoutienRequises}</div>
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
              <table style={{...styles.tbl,minWidth:200+profsPool.length*140}}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{...styles.th,minWidth:130}}>Créneau</th>
                    {profsPool.map(p => {
                      const totalProf = parseInt(p.periodes_semaine) || 0;
                      const totalAffecte = periodesAffecteesParProf[p.id] || 0;
                      return (
                        <th key={p.id} style={{...styles.th, textAlign:'center'}}>
                          {p.nom}<br/><span style={{fontWeight:400,fontSize:11}}>{p.prenom}</span>
                          <div style={{fontWeight:700,fontSize:11,marginTop:4,color:'#475569'}}>
                            {totalAffecte} / {totalProf}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {JOURS.map(jour => {
                    const crs = creneaux.filter(c => c.jour===jour);
                    if (!crs.length) return null;
                    return [
                      <tr key={jour+'_h'}><td colSpan={profsPool.length+1} style={styles.jourBande}>{jour}</td></tr>,
                      ...['Matin','Après-midi'].map(per => {
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
                              <td style={{...styles.td,background:'#f8f9fa',fontWeight:600,fontSize:12,whiteSpace:'nowrap'}}>
                                Période {idx+1}
                              </td>
                              {profsPool.map(prof => {
                                const aff = affectations.find(a => a.prof_id==prof.id && a.creneau_id==cr.id);
                                const indispo = disposAffectations[`${prof.id}-${cr.id}`] === false;
                                const modeAffectation = aff ? (affectationModes[aff.id] || 'classe') : 'classe';
                                const valeurSelect = aff
                                  ? (aff.type_special
                                      ? `special:${aff.type_special}`
                                      : (modeAffectation === 'soutien' ? `soutien:${aff.classe_id}` : String(aff.classe_id)))
                                  : '';
                                return (
                                  <td key={prof.id} style={{...styles.td,padding:4,background:'#fff',textAlign:'center'}}>
                                    <select style={{...styles.cellSel,background:indispo?'#e5e7eb':'#fff'}}
                                      value={valeurSelect}
                                      onChange={async e => {
                                        if (indispo) return;
                                        const valeur = e.target.value;
                                        if (!valeur) {
                                          const a = affectations.find(x => x.prof_id==prof.id && x.creneau_id==cr.id);
                                          if (a) {
                                            await axios.delete(API+'/planning/affectations/'+a.id, {headers});
                                            setAffectationModes(prev => {
                                              const next = { ...prev };
                                              delete next[a.id];
                                              return next;
                                            });
                                          }
                                          chargerTout();
                                        } else {
                                          const estSpecial = valeur.startsWith('special:');
                                          const estSoutien = valeur.startsWith('soutien:');
                                          const typeSpecial = estSpecial ? valeur.split(':')[1] : null;
                                          const classe_id = estSoutien ? valeur.split(':')[1] : (estSpecial ? null : valeur);
                                          const ancienne = affectations.find(x => x.prof_id==prof.id && x.creneau_id==cr.id);
                                          // Vérifier si cette classe est déjà prise ce créneau par un autre prof
                                          const conflit = !estSpecial
                                            ? affectations.find(x => x.classe_id==classe_id && x.creneau_id==cr.id && x.prof_id!=prof.id)
                                            : null;
                                          if (conflit) {
                                            const profConflit = profsPool.find(p => p.id == conflit.prof_id);
                                            const nomProfConflit = profConflit ? `${profConflit.nom} ${profConflit.prenom}` : 'un autre professeur';
                                            const classeNom = (classesPool.find(c => String(c.id) === String(classe_id)) || {}).nom || classe_id;
                                            const confirmer = window.confirm(
                                              `La classe ${classeNom} est déjà affectée à ${nomProfConflit} sur ce créneau.\n\nVoulez-vous échanger ces périodes ?`
                                            );
                                            if (!confirmer) return;

                                            // Échange: l'ancienne classe du prof courant est transférée au prof en conflit
                                            if (ancienne && String(ancienne.classe_id) !== String(classe_id)) {
                                              const repSwap = await axios.post(
                                                API + '/planning/affectations',
                                                { prof_id: conflit.prof_id, classe_id: ancienne.classe_id, creneau_id: cr.id, type_special: ancienne.type_special || null },
                                                { headers }
                                              );
                                              setAffectationModes(prev => ({ ...prev, [repSwap.data.id]: prev[ancienne.id] || (ancienne.type_special ? 'special' : 'classe') }));
                                            }

                                            // Puis on affecte la classe choisie au prof courant
                                            const repCourant = await axios.post(
                                              API+'/planning/affectations',
                                              {prof_id:prof.id, classe_id, creneau_id:cr.id, type_special: typeSpecial},
                                              {headers}
                                            );
                                            setAffectationModes(prev => ({ ...prev, [repCourant.data.id]: estSpecial ? 'special' : (estSoutien ? 'soutien' : 'classe') }));
                                            chargerTout();
                                            return;
                                          }
                                          // Supprimer ancienne affectation de CE prof pour CE créneau
                                          if (ancienne) {
                                            await axios.delete(API+'/planning/affectations/'+ancienne.id, {headers});
                                            setAffectationModes(prev => {
                                              const next = { ...prev };
                                              delete next[ancienne.id];
                                              return next;
                                            });
                                          }
                                          const rep = await axios.post(
                                            API+'/planning/affectations',
                                            {prof_id:prof.id, classe_id, creneau_id:cr.id, type_special: typeSpecial},
                                            {headers}
                                          );
                                          setAffectationModes(prev => ({ ...prev, [rep.data.id]: estSpecial ? 'special' : (estSoutien ? 'soutien' : 'classe') }));
                                          chargerTout();
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
                      })
                    ];
                  })}
                </tbody>
              </table>
            </div>
            </>
            )}
            </div>
          )}

          {sousOngletAff === 'salles' && (
            <div style={{marginTop:12}}>
              {!sallesLieuTravailId ? (
                <div style={{...styles.card, color:'#64748b', fontWeight:600}}>
                  Sélectionnez d'abord un lieu de travail pour afficher les classes.
                </div>
              ) : (
                <div>
                  <div style={{marginBottom:12}}>
                    <h3 style={styles.suiviGrandTitre}>Suivi des salles</h3>
                    {suiviSalles.length === 0 ? (
                      <div style={{fontSize:12,color:'#64748b',fontWeight:600}}>Aucune salle configurée pour ce lieu.</div>
                    ) : (
                      <div style={styles.suiviBranchesGrid}>
                        {suiviSalles.map(salle => (
                          <div
                            key={salle.salle}
                            style={{
                              ...styles.suiviBrancheChip,
                              borderColor: salle.complet ? '#bbf7d0' : '#fecaca',
                              background: salle.complet ? '#f0fdf4' : '#fef2f2',
                              color: salle.complet ? '#166534' : '#991b1b'
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
                    <div style={{...styles.card, color:'#64748b', fontWeight:600}}>
                      Sélectionnez d'abord une salle pour afficher les classes à affecter par créneau.
                    </div>
                  ) : (
                    <div style={{overflowX:'auto'}}>
                      <table style={{...styles.tbl,minWidth:760}}>
                        <thead>
                          <tr style={styles.theadRow}>
                            <th style={{...styles.th,minWidth:130,textAlign:'center'}}>Créneau</th>
                            {JOURS.map(j => <th key={j} style={{...styles.th,textAlign:'center'}}>{j}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {classesFiltreesSalles.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{...styles.td, textAlign:'center', color:'#64748b', fontWeight:600}}>
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
                                    <td style={{...styles.td,background:'#f8f9fa',fontWeight:600,fontSize:12,whiteSpace:'nowrap'}}>
                                      P{idx+1} — {crBase.heure_debut}–{crBase.heure_fin}
                                    </td>
                                    {JOURS.map(jour => {
                                      const classesCellule = getClassesAffectablesSalleCellule(jour, periode, crBase.ordre);
                                      const classeAffectee = getClasseAffecteeSalleCellule(jour, periode, crBase.ordre);
                                      return (
                                        <td key={jour} style={{...styles.td, textAlign:'left', verticalAlign:'top', minHeight:62}}>
                                          <select
                                            style={{...styles.cellSel, minWidth: 160}}
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
                <div style={{...styles.card, color:'#64748b', fontWeight:600}}>
                  Sélectionnez d'abord un pool pour afficher les classes.
                </div>
              )}

              {planningClasse && classePlanningId && (
                <div>
                  <div style={{marginBottom:12}}>
                    <h3 style={styles.suiviGrandTitre}>Suivi des branches</h3>
                    {suiviBranchesClasse.length === 0 ? (
                      <div style={{fontSize:12,color:'#64748b',fontWeight:600}}>Aucune branche trouvée pour ce niveau.</div>
                    ) : (
                      <div style={styles.suiviBranchesGrid}>
                        {suiviBranchesClasse.map(b => {
                          const ok = b.affectees === b.requises;
                          return (
                            <div key={b.id} style={{...styles.suiviBrancheChip, borderColor: ok ? '#bbf7d0' : '#fecaca', background: ok ? '#f0fdf4' : '#fef2f2', color: ok ? '#166534' : '#991b1b'}}>
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
                    <table style={{...styles.tbl,minWidth:700}}>
                      <thead>
                        <tr style={styles.theadRow}>
                          <th style={{...styles.th,minWidth:130,textAlign:'center'}}>Créneau</th>
                          {JOURS.map(j => <th key={j} style={{...styles.th,textAlign:'center'}}>{j}</th>)}
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
                                <td style={{...styles.td,background:'#f8f9fa',fontWeight:600,fontSize:12,whiteSpace:'nowrap'}}>
                                  P{idx+1} — {crBase.heure_debut}–{crBase.heure_fin}
                                </td>
                                {JOURS.map(jour => {
                                  const cr = (planningClasse.creneaux||[]).find(c=>c.jour===jour&&c.periode===periode&&c.ordre===crBase.ordre);
                                  if (!cr) return <td key={jour} style={{...styles.td,background:'#f5f5f5'}}></td>;
                                  const aff = (planningClasse.affectations||[]).find(a=>a.creneau_id===cr.id);
                                  const aCours = classeAHoraire(classePlanningId, jour, periode);
                                  return (
                                    <td key={jour} style={{...styles.td,textAlign:'center',fontSize:12,
                                      background:aff?'#e8f5e9':aCours?'#fff':'#f5f5f5'}}>
                                      {aff ? (
                                        <div>
                                          <b style={{color:'#2e7d32',fontSize:12}}>{aff.prof_nom}</b>
                                          {isAdmin() ? (
                                            <select style={{...styles.cellSel,marginTop:4,fontSize:11}}
                                              value={aff.matiere_id||''}
                                              onChange={async ev => {
                                                await axios.post(API+'/planning/affectations',{prof_id:aff.prof_id,classe_id:classePlanningId,matiere_id:ev.target.value||null,creneau_id:cr.id},{headers});
                                                chargerPlanningClasse(classePlanningId, classePlanningPoolId);
                                              }}>
                                              <option value="">— Branche —</option>
                                              {matieresPourPlanningClasse.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                                            </select>
                                          ) : (
                                            aff.matiere_nom && <div style={{color:'#666',fontSize:11}}>{aff.matiere_nom}</div>
                                          )}
                                        </div>
                                      ) : aCours ? <span style={{color:'#f57c00',fontSize:11}}>à affecter</span> : ''}
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

      {/* ===== PLANNING PROFS ===== */}
      {onglet === 'prof' && (
        <div>
          <div style={{...styles.card,marginBottom:16}}>
            <h3 style={{...styles.cardTitre, fontSize:18, marginBottom:20}}>👨‍🏫 Sélectionner un professeur</h3>
            <div style={{...styles.flexWrap, gap:12, marginTop:8}}>
              {profs.map(p => (
                <button key={p.id} style={{...styles.chip,...(profPlanningId==p.id?styles.chipActif:{})}}
                  onClick={() => { setProfPlanningId(p.id); chargerPlanningProf(p.id); }}>
                  {p.nom} {p.prenom}
                </button>
              ))}
            </div>
          </div>

          {planningProf && profPlanningId && (
            <div style={{overflowX:'auto'}}>
              <div style={{fontWeight:700,fontSize:18,marginBottom:12}}>{planningProf.prof?.nom} {planningProf.prof?.prenom}{planningProf.classesTitulaire?.length>0 ? ` — Titulaire : ${planningProf.classesTitulaire.map(c=>c.nom).join(', ')}` : ''}</div>
              <table style={{...styles.tbl,minWidth:700}}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{...styles.th,minWidth:130}}>Créneau</th>
                    {JOURS.map(j => <th key={j} style={styles.th}>{j}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {['Matin','Après-midi'].map(periode => {
                    const crsBase = (planningProf.creneaux||[]).filter(c=>c.jour==='Lundi'&&c.periode===periode);
                    if (!crsBase.length) return null;
                    return [
                      <tr key={periode}><td colSpan={6} style={styles.periodeBande}>{periode}</td></tr>,
                      ...crsBase.map((crBase,idx) => (
                        <tr key={crBase.id} style={styles.tr}>
                          <td style={{...styles.td,background:'#f8f9fa',fontWeight:600,fontSize:12,whiteSpace:'nowrap'}}>
                            P{idx+1} — {crBase.heure_debut}–{crBase.heure_fin}
                          </td>
                          {JOURS.map(jour => {
                            const cr = (planningProf.creneaux||[]).find(c=>c.jour===jour&&c.periode===periode&&c.ordre===crBase.ordre);
                            if (!cr) return <td key={jour} style={{...styles.td,background:'#f5f5f5'}}></td>;
                            const aff = (planningProf.affectations||[]).find(a=>a.creneau_id===cr.id);
                            const dispo = planningProf.dispos?.find(d=>d.creneau_id===cr.id);
                            const indispo = dispo && !dispo.disponible;
                            return (
                              <td key={jour} style={{...styles.td,textAlign:'center',fontSize:12,
                                background:aff?'#e8f5e9':indispo?'#eeeeee':'#fff'}}>
                                {aff?<><b style={{color:'#2e7d32'}}>{aff.classe_nom}</b>{aff.matiere_nom&&<><br/><span style={{color:'#666',fontSize:11}}>{aff.matiere_nom}</span></>}</>:
                                 indispo?'':
                                 <span style={{color:'#ddd',fontSize:11}}>libre</span>}
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
          )}
        </div>
      )}

      {/* ===== PLANNING GÉNÉRAL ===== */}
      {onglet === 'general' && (
        <div>
          <div style={styles.rowBetween}>
            <h3 style={styles.cardTitre}>Planning général</h3>
            <select style={styles.sel} value={planningPoolId}
              onChange={e => { setPlanningPoolId(e.target.value); chargerPlanningGeneral(e.target.value); }}>
              <option value="">Tous les professeurs</option>
              {pools.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>

          {planningGeneral && (
            <div>
              {/* Tableau titulaires des classes */}
              <div style={{...styles.card, marginBottom:16}}>
                <h4 style={{margin:'0 0 12px',fontSize:14,fontWeight:700,color:'#555'}}>🏫 Classes et titulaires</h4>
                <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
                  {(planningGeneral.titulaires||[]).filter(t=>t.classe_nom).map((t,i) => (
                    <div key={i} style={{background:'#f8f9fa',borderRadius:10,padding:'10px 16px',border:'1px solid #e0e0e0',minWidth:160}}>
                      <div style={{fontWeight:700,fontSize:14,color:'#1a73e8'}}>{t.classe_nom}</div>
                      <div style={{fontSize:12,color:'#555',marginTop:4}}>{t.prof_nom || <span style={{color:'#bbb'}}>Pas de titulaire</span>}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {planningGeneral && (
            <div style={{overflowX:'auto',marginTop:0}}>
              <table style={{...styles.tbl,minWidth:200+planningGeneral.profs.length*120}}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{...styles.th,minWidth:130}}>Créneau</th>
                    {planningGeneral.profs.map(p => {
                      const tits = (planningGeneral.titulaires||[]).filter(t => t.prof_nom && t.prof_nom.includes(p.nom));
                      return <th key={p.id} style={styles.th}>
                        {p.nom} {p.prenom}
                        {tits.length>0 && <div style={{fontSize:10,fontWeight:400,color:'#c8e6c9',marginTop:2}}>{tits.map(t=>t.classe_nom).join(', ')}</div>}
                      </th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {JOURS.map(jour => {
                    const crs = planningGeneral.creneaux.filter(c=>c.jour===jour);
                    if (!crs.length) return null;
                    return [
                      <tr key={jour+'_h'}><td colSpan={planningGeneral.profs.length+1} style={styles.jourBande}>{jour}</td></tr>,
                      ...crs.map(cr => (
                        <tr key={cr.id} style={styles.tr}>
                          <td style={{...styles.td,background:'#f8f9fa',fontSize:11,fontWeight:600,whiteSpace:'nowrap'}}>
                            {cr.heure_debut}–{cr.heure_fin}<br/><span style={{color:'#999'}}>{cr.periode}</span>
                          </td>
                          {planningGeneral.profs.map(p => {
                            const aff = planningGeneral.affectations.find(a=>a.prof_id===p.id&&a.creneau_id===cr.id);
                            const dispo = planningGeneral.dispos.find(d=>d.prof_id===p.id&&d.creneau_id===cr.id);
                            const indispo = dispo&&!dispo.disponible;
                            return (
                              <td key={p.id} style={{...styles.td,textAlign:'center',fontSize:11,
                                background:aff?'#e8f5e9':indispo?'#eeeeee':'#fff'}}>
                                {aff?<><b style={{color:'#2e7d32'}}>{aff.classe_nom}</b>
                                {isAdmin() ? (
                                  <select style={{...styles.cellSel,marginTop:3,fontSize:11}}
                                    value={aff.matiere_id||''}
                                    onChange={async ev => {
                                      await axios.post(API+'/planning/affectations',{prof_id:profPlanningId,classe_id:aff.classe_id,matiere_id:ev.target.value||null,creneau_id:cr.id},{headers});
                                      chargerPlanningProf(profPlanningId);
                                    }}>
                                    <option value="">— Branche —</option>
                                    {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                                  </select>
                                ) : aff.matiere_nom ? <div style={{color:'#666',fontSize:11}}>{aff.matiere_nom}</div> : null}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  page:{padding:20,background:'#f8fafc',minHeight:'100vh'},
  header:{display:'flex',alignItems:'center',gap:15,marginBottom:12},
  btnRetour:{padding:'8px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#475569'},
  titre:{fontSize:22,fontWeight:800,color:'#0f172a',margin:0},
  onglets:{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'},
  onglet:{padding:'8px 16px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  ongletActif:{background:'#6366f1',color:'white',border:'2px solid #6366f1'},
  affActionsWrap:{display:'flex',alignItems:'center',gap:10,marginBottom:16,background:'white',padding:'12px 16px',borderRadius:10,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',flexWrap:'wrap'},
  affTabBtn:{padding:'8px 14px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:600,fontSize:13,background:'#f1f5f9',color:'#555'},
  affTabBtnActif:{background:'#6366f1',color:'white'},
  card:{background:'white',borderRadius:12,padding:20,marginBottom:20,boxShadow:'0 2px 8px rgba(0,0,0,0.06)'},
  rowBetween:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  cardTitre:{fontSize:16,fontWeight:700,margin:0},
  flexWrap:{display:'flex',flexWrap:'wrap',gap:8},
  chip:{padding:'9px 14px',width:240,minWidth:240,maxWidth:240,background:'white',border:'2px solid #e0e0e0',borderRadius:20,cursor:'pointer',fontSize:13,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'},
  chipNom:{fontWeight:700,display:'block',lineHeight:1.15},
  chipPrenom:{fontWeight:500,display:'block',lineHeight:1.15,marginTop:2},
  chipActif:{background:'#6366f1',color:'white',border:'2px solid #6366f1'},
  suiviGrandTitre:{fontSize:22,fontWeight:800,color:'#0f172a',margin:'0 0 10px'},
  suiviJoursGrid:{display:'flex',flexWrap:'wrap',gap:8},
  suiviJourChip:{width:190,minWidth:190,maxWidth:190,padding:'8px 10px',borderRadius:10,border:'1px solid #cbd5e1',background:'#f8fafc',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'},
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
  periodeBande:{background:'#f8fafc',padding:'6px 14px',fontWeight:600,fontSize:12,color:'#64748b'},
  btnBleu:{padding:'8px 16px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  btnVert:{padding:'8px 16px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13},
  btnAnnuler:{padding:'8px 16px',background:'#f5f5f5',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,color:'#475569'},
  btnIcon:{background:'none',border:'none',cursor:'pointer',fontSize:16,marginLeft:6},
  sel:{padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:14},
  overlay:{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000},
  modal:{background:'white',padding:30,borderRadius:16,maxHeight:'85vh',overflowY:'auto'},
  modalTitre:{fontSize:20,fontWeight:700,marginBottom:20},
  formGrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:15},
  fc:{display:'flex',flexDirection:'column'},
  lbl:{fontSize:13,fontWeight:600,marginBottom:5,color:'#555'},
  inp:{padding:10,border:'1px solid #e2e8f0',borderRadius:8,fontSize:14},
  formActions:{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20},
  checkBadge:{padding:'5px 10px',borderRadius:16,cursor:'pointer',fontSize:12,fontWeight:600,display:'flex',alignItems:'center'},
  poolsGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16,marginTop:16},
  poolCard:{background:'white',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.08)'},
  poolLabel:{fontSize:11,fontWeight:700,color:'#aaa',marginBottom:4,letterSpacing:1},
  badge:{display:'inline-block',padding:'3px 10px',borderRadius:12,fontSize:12,fontWeight:600,margin:'2px 3px 2px 0'},
  aucun:{color:'#ccc',fontSize:12},
  cellSel:{width:'100%',padding:'5px 6px',border:'1px solid #e0e0e0',borderRadius:6,fontSize:12},
};