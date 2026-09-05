import { isAdmin, getUser } from '../utils/permissions';
import * as XLSX from 'xlsx';
import React, { useState, useEffect } from 'react';
import apiClient from '../lib/apiClient';
import { useLocation, useSearchParams } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import { PageLoader, LoadingButton } from '../components/LoadingUI';
import Toast from '../components/Toast';

const FONT = "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif";
const OPTS = ['', 'P', 'A', 'R', 'E', 'C'];
const OPTS_LABEL = { '': '—', 'P': 'P', 'A': 'A', 'R': 'R', 'E': 'E', 'C': 'C' };
const OPTS_COLOR = { '': '#94a3b8', 'P': '#10b981', 'A': '#ef4444', 'R': '#f59e0b', 'E': '#3b82f6', 'C': '#8b5cf6' };
const PERIODES = [1,2,3,4,5,6,7,8];
const JOURS_NOMS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const COL_NOM_WIDTH = 170;
const COL_PRENOM_WIDTH = 170;
const STATS_TD = { padding:'11px 14px', fontSize:13, color:'#374151' };
/** Décalage vertical du 2e rang d’en-tête (saisie présences) pour le sticky */

/** Jour civil pour les présences (évite le décalage : ISO UTC « 14T22…Z » = 15 en CH). */
function cleDatePresence(raw) {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    if (t.includes('T') || t.includes(' ')) {
      const d = new Date(t);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${mo}-${day}`;
      }
    }
    const m = t.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : t.slice(0, 10);
  }
  if (raw instanceof Date) {
    const y = raw.getFullYear();
    const mo = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  const s = String(raw);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s.slice(0, 10);
}

function initPresences(eleves) {
  const p = {};
  eleves.forEach(e => {
    p[e.id] = { p1:'',p2:'',p3:'',p4:'',p5:'',p6:'',p7:'',p8:'',remarque:'' };
  });
  return p;
}

export default function Presences() {
  const MOIS_LABELS = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  const [classes, setClasses] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [presences, setPresences] = useState({});
  const [classeSelectionnee, setClasseSelectionnee] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchParams] = useSearchParams();
  const onglet = searchParams.get('tab') || 'saisie';
  const [statistiques, setStatistiques] = useState([]);
  const [valide, setValide] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classeHoraires, setClasseHoraires] = useState([]);
  const [evenementsCalendrier, setEvenementsCalendrier] = useState([]);
  const [apercuMois, setApercuMois] = useState({});
  const [loadingApercu, setLoadingApercu] = useState(false);
  const [loadingEleves, setLoadingEleves] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [statsDateDebut, setStatsDateDebut] = useState('');
  const [statsDateFin, setStatsDateFin] = useState('');
  const [statsPeriode, setStatsPeriode] = useState('1sem');
  const location = useLocation();
  const headers = {};
  const anneeCourante = new Date().getFullYear();
  const optionsMois = [];
  for (let y = anneeCourante - 2; y <= anneeCourante + 2; y++) {
    for (let m = 1; m <= 12; m++) {
      const value = `${y}-${String(m).padStart(2, '0')}`;
      const label = `${MOIS_LABELS[m - 1]} ${y}`;
      optionsMois.push({ value, label });
    }
  }

  useEffect(() => {
    chargerClasses();
    chargerCalendrier();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement initial
  }, []);
  useEffect(() => {
    if (onglet === 'apercu') chargerApercuMois();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onglet uniquement
  }, [onglet]);
  useEffect(() => {
    const classeDepuisDashboard = location.state?.classe_id;
    if (classeDepuisDashboard && classes.length > 0) {
      const ok = classes.find(c => String(c.id) === String(classeDepuisDashboard));
      if (ok) setClasseSelectionnee(String(classeDepuisDashboard));
    }
  }, [location.state, classes]);
  useEffect(() => {
    if (classeSelectionnee) {
      chargerEleves();
      chargerClasseHoraires(classeSelectionnee);
    } else {
      setEleves([]);
      setPresences({});
      setStatistiques([]);
      setClasseHoraires([]);
      setApercuMois({});
      setValide(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recharger élèves / horaires quand classe ou date change
  }, [classeSelectionnee, date]);

  useEffect(() => {
    if (classeSelectionnee) chargerStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stats selon période
  }, [classeSelectionnee, statsDateDebut, statsDateFin]);

  useEffect(() => {
    if (!classeSelectionnee) return;
    if (onglet === 'apercu') chargerApercuMois();
    if (onglet === 'stats') chargerStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onglet / classe
  }, [classeSelectionnee, onglet]);

  const JOURS_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const STATUT_OASI = { 'P':'01 Présent', 'R':'02 Retard', 'A':'03 Absent', 'E':'04 Excusé', 'C':'05 Congé' };

  const fmtDate = (raw) => {
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d)) return raw;
    return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();
  };

  const exporterLORA = async () => {
    if (!classeSelectionnee) { alert('Sélectionnez une classe d\'abord'); return; }
    setExportLoading(true);
    try {
      const mois = date.substring(0, 7);
      const [annee, moisNum] = mois.split('-').map(Number);
      const nbJours = new Date(annee, moisNum, 0).getDate();
      const controle_du = '01.' + String(moisNum).padStart(2,'0') + '.' + annee;
      const controle_au = String(nbJours).padStart(2,'0') + '.' + String(moisNum).padStart(2,'0') + '.' + annee;

      const [elevesRes, presRes] = await Promise.all([
        apiClient.get('/eleves/oasi?classe_id=' + classeSelectionnee, { headers }),
        apiClient.get('/presences/mois?classe_id=' + classeSelectionnee + '&mois=' + mois, { headers }),
      ]);

      const eleves = elevesRes.data;
      const presences = presRes.data;
      const rows = [];

      // En-têtes exactes pour import DB externe
      rows.push([
        'PROG_NOM','PROG_ENCADRANT','N','REF','POS',
        'NOM','NAIS','NATIONALITE',
        'PRESENCE_DATE','JOUR_SEMAINE','PRESENCE_PERIODE','PRESENCE_TYPE',
        'REMARQUE','CONTROLE_DU','CONTROLE_AU',
        'PROG_PRESENCES','PROG_ADMIN','AS',
        'PRG_ID','PRG_OCCUPATION_ID','RA_ID','TEMPS_REPARTI_ID'
      ]);

      eleves.forEach(eleve => {
        for (let j = 1; j <= nbJours; j++) {
          const dateStr = annee + '-' + String(moisNum).padStart(2,'0') + '-' + String(j).padStart(2,'0');
          const jourIdx = new Date(dateStr + 'T12:00:00').getDay();

          if (jourIdx === 0 || jourIdx === 6) continue;

          const enVacance = evenementsCalendrier.some(ev => {
            const deb = ev.date_debut?.substring(0,10);
            const fin = (ev.date_fin||ev.date_debut)?.substring(0,10);
            return dateStr >= deb && dateStr <= fin;
          });
          if (enVacance) continue;

          const nomJour = JOURS_FR[jourIdx];
          const horaireJour = classeHoraires.find(h => h.jour === nomJour);
          const periode = horaireJour?.periode || null;
          if (!periode) continue;

          const pr = presences.find(p =>
            String(p.eleve_id) === String(eleve.id) && cleDatePresence(p.date) === dateStr
          );

          // Première période active : P1-P4 = Matin, P5-P8 = Après-midi
          let statutBrut = '';
          let presencePeriode = periode;
          if (pr) {
            for (let i = 1; i <= 8; i++) {
              if (pr['p'+i]) {
                statutBrut = pr['p'+i];
                presencePeriode = i <= 4 ? 'Matin' : 'Après-midi';
                break;
              }
            }
          }

          const presenceDate = String(j).padStart(2,'0') + '.' + String(moisNum).padStart(2,'0') + '.' + annee;
          const presenceType = STATUT_OASI[statutBrut] || '';
          const remarque = pr?.remarque || '';

          rows.push([
            eleve.oasi_prog_nom || '',
            eleve.oasi_encadrant || eleve.oasi_prog_encadrant || '',
            eleve.oasi_n || '',
            eleve.oasi_ref || '',
            eleve.oasi_pos || '',
            eleve.oasi_nom_complet || (eleve.nom + ' ' + eleve.prenom),
            fmtDate(eleve.oasi_nais),
            eleve.oasi_nationalite || '',
            presenceDate,
            nomJour,
            presencePeriode,
            presenceType,
            remarque,
            controle_du,
            controle_au,
            eleve.oasi_prog_presences || '',
            eleve.oasi_prog_admin || '',
            eleve.oasi_as || '',
            eleve.oasi_prg_id || '',
            eleve.oasi_prg_occupation_id || '',
            eleve.oasi_ra_id || '',
            eleve.oasi_temps_reparti_id || '',
          ]);
        }
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        {wch:18},{wch:18},{wch:6},{wch:6},{wch:6},
        {wch:22},{wch:12},{wch:14},
        {wch:14},{wch:12},{wch:14},{wch:14},
        {wch:20},{wch:12},{wch:12},
        {wch:14},{wch:14},{wch:8},
        {wch:10},{wch:14},{wch:8},{wch:16}
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Présences');
      const nomClasse = classes.find(c => String(c.id) === String(classeSelectionnee))?.nom || 'classe';
      XLSX.writeFile(wb, 'presences_' + nomClasse + '_' + mois + '.xlsx');
    } catch (err) {
      console.error(err);
      alert('Erreur export: ' + (err.response?.data?.message || err.message));
    }
    setExportLoading(false);
  };

  const chargerApercuMois = async () => {
    if (!classeSelectionnee) return;
    setLoadingApercu(true);
    try {
      const mois = date.substring(0, 7);
      const [elevesRes, presRes] = await Promise.all([
        apiClient.get('/presences/eleves?classe_id=' + classeSelectionnee, { headers }),
        apiClient.get('/presences/mois?classe_id=' + classeSelectionnee + '&mois=' + mois, { headers }),
      ]);
      setApercuMois({ eleves: elevesRes.data, presences: presRes.data, mois });
    } catch (err) {
      console.error(err);
      setApercuMois({ erreur: err.response?.data?.message || err.message });
    }
    setLoadingApercu(false);
  };

  const chargerCalendrier = async () => {
    try {
      const res = await apiClient.get('/calendrier', { headers });
      const list = Array.isArray(res.data) ? res.data : [];
      setEvenementsCalendrier(list.filter(e => e.categorie === 'vacance'));
    } catch (err) { console.error(err); }
  };

  const chargerClasseHoraires = async (classe_id) => {
    try {
      const res = await apiClient.get('/planning/classe-horaires', { headers });
      const list = Array.isArray(res.data) ? res.data : [];
      setClasseHoraires(list.filter(h => String(h.classe_id) === String(classe_id)));
    } catch (err) { console.error(err); }
  };

  const chargerClasses = async () => {
    try {
      const res = await apiClient.get('/presences/classes', { headers });
      const loadedClasses = res.data;
      setClasses(loadedClasses);
      setClasseSelectionnee('');

      // Auto-sélection pour les profs : classe en cours selon l'heure actuelle
      if (!isAdmin() && loadedClasses.length > 0) {
        const user = getUser();
        if (user?.id) {
          try {
            const edtRes = await apiClient.get('/emploi-du-temps?prof_id=' + user.id, { headers });
            const jourNom = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][new Date().getDay()];
            const now = new Date();
            const nowStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
            const cours = edtRes.data.find(e => e.jour === jourNom && e.heure_debut <= nowStr && nowStr <= e.heure_fin);
            if (cours) {
              const classeOk = loadedClasses.find(c => String(c.id) === String(cours.classe_id));
              if (classeOk) setClasseSelectionnee(String(cours.classe_id));
            }
          } catch (e) { /* ignore */ }
        }
      }
    } catch (err) { console.error(err); }
  };

  const chargerEleves = async () => {
    setLoadingEleves(true);
    try {
      const [elevesRes, presRes] = await Promise.all([
        apiClient.get('/presences/eleves?classe_id=' + classeSelectionnee, { headers }),
        apiClient.get('/presences?classe_id=' + classeSelectionnee + '&date=' + date, { headers })
      ]);
      setEleves(elevesRes.data);
      const p = initPresences(elevesRes.data);
      let isValide = false;
      presRes.data.forEach(pr => {
        if (p[pr.eleve_id] !== undefined) {
          p[pr.eleve_id] = {
            p1: pr.p1||'', p2: pr.p2||'', p3: pr.p3||'',
            p4: pr.p4||'', p5: pr.p5||'', p6: pr.p6||'',
            p7: pr.p7||'', p8: pr.p8||'', remarque: pr.remarque||''
          };
          if (pr.valide) isValide = true;
        }
      });
      setPresences(p);
      setValide(isValide);
    } catch (err) { console.error(err); }
    finally { setLoadingEleves(false); }
  };

  const chargerStats = async () => {
    if (!classeSelectionnee) return;
    setLoadingStats(true);
    try {
      const params = new URLSearchParams({ classe_id: String(classeSelectionnee) });
      if (statsDateDebut) params.append('date_debut', statsDateDebut);
      if (statsDateFin) params.append('date_fin', statsDateFin);
      const res = await apiClient.get('/presences/statistiques?' + params.toString(), { headers });
      setStatistiques(res.data);
    } catch (err) { console.error(err); }
    finally { setLoadingStats(false); }
  };

  const handleToggleValide = () => {
    const newVal = !valide;
    setValide(newVal);
    if (newVal) {
      // Remplir les vides avec P
      setPresences(prev => {
        const next = { ...prev };
        eleves.forEach(e => {
          const row = { ...next[e.id] };
          PERIODES.forEach(i => {
            if (!isBloque(i) && !row['p' + i]) row['p' + i] = 'P';
          });
          next[e.id] = row;
        });
        return next;
      });
    }
  };

  const handleSauvegarder = async () => {
    if (!valide) return;
    setSaving(true);
    try {
      const data = eleves.map(e => ({
        eleve_id: e.id,
        ...presences[e.id],
        valide: true
      }));
      await apiClient.post('/presences', { presences: data, date, classe_id: classeSelectionnee }, { headers });
      setSauvegarde(true);
      setTimeout(() => setSauvegarde(false), 3000);
      chargerStats();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const setCell = (eleveId, periode, val) => {
    setPresences(prev => {
      const row = { ...prev[eleveId] };
      if (val === 'R') {
        // Max 1 retard par demi-journée : efface l'ancien R de la même demi-journée
        const demijour = periode <= 4 ? [1,2,3,4] : [5,6,7,8];
        demijour.forEach(p => { if (row['p' + p] === 'R') row['p' + p] = ''; });
      }
      row['p' + periode] = val;
      return { ...prev, [eleveId]: row };
    });
  };

  const setRemarque = (eleveId, val) => {
    setPresences(prev => ({
      ...prev,
      [eleveId]: { ...prev[eleveId], remarque: val }
    }));
  };

  const getJourSemaine = () => new Date(date + 'T12:00:00').getDay();

  const allerJourPrecedent = () => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const allerJourSuivant = () => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const allerMoisPrecedent = () => {
    const d = new Date(date + 'T12:00:00');
    d.setMonth(d.getMonth() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const allerMoisSuivant = () => {
    const d = new Date(date + 'T12:00:00');
    d.setMonth(d.getMonth() + 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const isVacance = () => {
    return evenementsCalendrier.some(ev => {
      const deb = ev.date_debut?.substring(0, 10);
      const fin = (ev.date_fin || ev.date_debut)?.substring(0, 10);
      return date >= deb && date <= fin;
    });
  };

  const getNomVacance = () => {
    const ev = evenementsCalendrier.find(ev => {
      const deb = ev.date_debut?.substring(0, 10);
      const fin = (ev.date_fin || ev.date_debut)?.substring(0, 10);
      return date >= deb && date <= fin;
    });
    return ev?.nom_vacance || ev?.titre || 'Vacances';
  };

  const getNomJour = () => JOURS_NOMS[getJourSemaine()];

  const isWeekend = () => { const j = getJourSemaine(); return j === 0 || j === 6; };

  // Récupère la période (Matin / Après-midi) définie pour la classe ce jour
  const getHoraireJour = () => {
    if (isWeekend()) return null;
    const nomJour = getNomJour();
    const h = classeHoraires.find(h => h.jour === nomJour);
    return h?.periode || null; // null = pas de cours ce jour
  };

  const isBloque = (periode) => {
    if (isWeekend()) return true;
    if (isVacance()) return true;
    const horaire = getHoraireJour();
    if (!horaire) return true;
    if (horaire === 'Matin' && periode > 4) return true;
    if (horaire === 'Après-midi' && periode <= 4) return true;
    return false;
  };

  // Applique un statut à toutes les périodes non-bloquées d'un élève
  const setToutEleve = (eleveId, val) => {
    setPresences(prev => {
      const row = { ...prev[eleveId] };
      if (val === 'R') {
        // R : première période de chaque demi-journée active = R, les autres = P
        [[1,2,3,4],[5,6,7,8]].forEach(dj => {
          const actives = dj.filter(i => !isBloque(i));
          if (actives.length > 0) {
            row['p' + actives[0]] = 'R';
            actives.slice(1).forEach(i => { row['p' + i] = 'P'; });
          }
        });
      } else {
        PERIODES.forEach(i => {
          if (!isBloque(i)) row['p' + i] = val;
        });
      }
      return { ...prev, [eleveId]: row };
    });
  };

  return (
    <div style={{padding:'28px 32px',background:'#f8fafc',minHeight:'100%',boxSizing:'border-box',fontFamily:FONT}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:12,flexWrap:'wrap'}}>
        <h2 style={{fontSize:22,fontWeight:800,color:'#0f172a',flex:1,margin:0}}>Contrôle des présences</h2>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',minHeight:36}}>
          {onglet === 'saisie' && classeSelectionnee && (<>
            {sauvegarde && <Toast message="Présences sauvegardées !" />}
            <LoadingButton loading={saving} loadingLabel="En cours de sauvegarde…" onClick={handleSauvegarder} disabled={!valide} style={{padding:'0 18px',height:36,boxSizing:'border-box',borderRadius:9,border:'none',cursor:valide?'pointer':'not-allowed',fontWeight:700,fontSize:13,background:valide?'#6366f1':'#e2e8f0',color:valide?'white':'#94a3b8',transition:'all 0.2s'}}>
              Sauvegarder
            </LoadingButton>
          </>)}
          {isAdmin() && (
            <LoadingButton onClick={exporterLORA} loading={exportLoading} loadingLabel="Export en cours…" style={{padding:'0 20px',height:36,boxSizing:'border-box',borderRadius:9,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,background:'#6366f1',color:'white'}}>
              Exporter LORA
            </LoadingButton>
          )}
        </div>
      </div>

      {/* Classe select + date en ligne */}
      <div style={{marginTop:0,marginBottom:12,display:'flex',flexDirection:'column',alignItems:'flex-start',gap:10}}>
        {onglet === 'saisie' ? (
          <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'nowrap',width:240}}>
              <button onClick={allerJourPrecedent} style={{width:20,height:36,padding:0,boxSizing:'border-box',background:'#e0e7ff',border:'none',borderRadius:10,cursor:'pointer',fontSize:14,color:'#4338ca',fontWeight:700,flex:'0 0 20px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 5l-9 7 9 7V5z"/></svg>
              </button>
              <input style={{...s.inp,flex:'1 1 auto',minWidth:0}} type="date" value={date} onChange={e => setDate(e.target.value)} />
              <button onClick={allerJourSuivant} style={{width:20,height:36,padding:0,boxSizing:'border-box',background:'#e0e7ff',border:'none',borderRadius:10,cursor:'pointer',fontSize:14,color:'#4338ca',fontWeight:700,flex:'0 0 20px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 19l9-7-9-7v14z"/></svg>
              </button>
            </div>
            <CustomSelect
              style={s.selClasse}
              value={classeSelectionnee}
              placeholder="Sélectionner une classe"
              options={classes.map(c => ({value: c.id, label: c.nom}))}
              onChange={(v) => setClasseSelectionnee(v)}
            />
            {classeSelectionnee && (
              <button
                onClick={handleToggleValide}
                disabled={isWeekend()||isVacance()}
                style={{
                  padding:'0 16px',
                  height:36,
                  boxSizing:'border-box',
                  borderRadius:99,
                  border:'2px solid '+((isWeekend()||isVacance()) ? '#e2e8f0' : (valide ? '#6366f1' : '#e2e8f0')),
                  background:(isWeekend()||isVacance()) ? '#f8fafc' : (valide ? '#eef2ff' : 'white'),
                  color:(isWeekend()||isVacance()) ? '#cbd5e1' : (valide ? '#4338ca' : '#94a3b8'),
                  cursor:(isWeekend()||isVacance()) ? 'not-allowed' : 'pointer',
                  fontWeight:700,
                  fontSize:13,
                  whiteSpace:'nowrap',
                  transition:'all 0.2s'
                }}
              >
                {valide ? 'Présences validées' : 'Valider les présences'}
              </button>
            )}
          </div>
        ) : onglet === 'apercu' ? (
          <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'nowrap'}}>
              <button onClick={allerMoisPrecedent} style={{width:20,height:36,padding:0,boxSizing:'border-box',background:'#e0e7ff',border:'none',borderRadius:10,cursor:'pointer',fontSize:14,color:'#4338ca',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 5l-9 7 9 7V5z"/></svg>
              </button>
              <CustomSelect
                style={{...s.inp, minWidth:170, textTransform:'capitalize', cursor:'pointer'}}
                value={date.substring(0, 7)}
                allowClear={false}
                options={optionsMois}
                onChange={(v) => {
                  if (!v) return;
                  setDate(v + '-01');
                }}
              />
              <button onClick={allerMoisSuivant} style={{width:20,height:36,padding:0,boxSizing:'border-box',background:'#e0e7ff',border:'none',borderRadius:10,cursor:'pointer',fontSize:14,color:'#4338ca',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 19l9-7-9-7v14z"/></svg>
              </button>
            </div>
            <CustomSelect
              style={s.selClasse}
              value={classeSelectionnee}
              placeholder="Sélectionner une classe"
              options={classes.map(c => ({value: c.id, label: c.nom}))}
              onChange={(v) => setClasseSelectionnee(v)}
            />
          </div>
        ) : onglet === 'stats' ? (
          <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <CustomSelect
              style={s.selClasse}
              value={classeSelectionnee}
              placeholder="Sélectionner une classe"
              options={classes.map(c => ({value: c.id, label: c.nom}))}
              onChange={(v) => setClasseSelectionnee(v)}
            />
            <div className="chip-tabs" style={{display:'flex',background:'#ede9fe',borderRadius:20,padding:3,gap:2}}>
              {[
                { id: '1sem', label: '1er semestre' },
                { id: '2sem', label: '2e semestre' },
                { id: 'libre', label: 'Date libre' },
              ].map(p => (
                <button key={p.id}
                  style={{padding:'7px 14px',borderRadius:17,border:'none',background:statsPeriode===p.id?'#6366f1':'transparent',color:statsPeriode===p.id?'white':'#6d28d9',cursor:'pointer',fontWeight:statsPeriode===p.id?700:600,fontSize:13,fontFamily:'inherit',whiteSpace:'nowrap'}}
                  onClick={() => {
                    setStatsPeriode(p.id);
                    const now = new Date();
                    const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
                    if (p.id === '1sem') { setStatsDateDebut(`${y}-08-01`); setStatsDateFin(`${y+1}-01-31`); }
                    else if (p.id === '2sem') { setStatsDateDebut(`${y+1}-02-01`); setStatsDateFin(`${y+1}-07-31`); }
                    else {
                      const yy = now.getFullYear(), mm = String(now.getMonth()+1).padStart(2,'0');
                      const lastDay = new Date(yy, now.getMonth()+1, 0).getDate();
                      setStatsDateDebut(`${yy}-${mm}-01`); setStatsDateFin(`${yy}-${mm}-${String(lastDay).padStart(2,'0')}`);
                    }
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
            {statsPeriode === 'libre' && <>
              <span style={{fontSize:13,color:'#334155',fontWeight:700}}>Entre :</span>
              <input type="date" value={statsDateDebut} onChange={e => setStatsDateDebut(e.target.value)} style={s.inp} />
              <span style={{fontSize:13,color:'#334155',fontWeight:700}}>et</span>
              <input type="date" value={statsDateFin} onChange={e => setStatsDateFin(e.target.value)} style={s.inp} />
            </>}
          </div>
        ) : (
          <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <CustomSelect
              style={s.selClasse}
              value={classeSelectionnee}
              placeholder="Sélectionner une classe"
              options={classes.map(c => ({value: c.id, label: c.nom}))}
              onChange={(v) => setClasseSelectionnee(v)}
            />
          </div>
        )}
      </div>

      {onglet === 'saisie' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 0, marginBottom: 12, padding: 0, flexWrap: 'wrap' }}>
            {[['P', '#10b981', 'Présent'], ['A', '#ef4444', 'Absent'], ['R', '#f59e0b', 'Retard'], ['E', '#3b82f6', 'Excusé'], ['C', '#8b5cf6', 'Congé']].map(([k, c, l]) => (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: c, fontWeight: 700 }}>
                <span style={{ width: 18, height: 18, borderRadius: 4, background: c, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{k}</span>{l}
              </span>
            ))}
          </div>

          <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
            <div style={{ overflowX: 'auto', maxHeight: 'min(72vh, calc(100vh - 260px))', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <colgroup>
                  <col style={{ width: COL_NOM_WIDTH, minWidth: COL_NOM_WIDTH }} />
                  <col style={{ width: COL_PRENOM_WIDTH, minWidth: COL_PRENOM_WIDTH }} />
                  <col style={{ width: 74, minWidth: 74, maxWidth: 74 }} />
                  {PERIODES.map(i => <col key={`col-p-${i}`} style={{ width: 46, minWidth: 46, maxWidth: 46 }} />)}
                  <col style={{ width: 'auto' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ ...s.th, borderRadius: '12px 0 0 0', background: '#f8fafc', boxShadow: 'none', textAlign: 'left' }} rowSpan={2}>NOM</th>
                    <th style={{ ...s.th, background: '#f8fafc', boxShadow: 'none', textAlign: 'left' }} rowSpan={2}>Prénom</th>
                    <th style={{ ...s.th, fontSize: 13, textAlign: 'center', background: '#f8fafc', boxShadow: 'none' }} rowSpan={2} title="Appliquer à toutes les périodes">Tout</th>
                    <th style={{ ...s.th, background: '#dbeafe', color: '#1e40af', boxShadow: 'none' }} colSpan={4}>Matin</th>
                    <th style={{ ...s.th, background: '#fef3c7', color: '#92400e', boxShadow: 'none' }} colSpan={4}>Après-midi</th>
                    <th style={{ ...s.th, borderRadius: '0 12px 0 0', background: '#f8fafc', boxShadow: 'none' }} rowSpan={2}>Remarques</th>
                  </tr>
                  <tr style={{ background: '#f8fafc' }}>
                    {PERIODES.map(i => (
                      <th key={i} style={{
                        ...s.th,
                        padding: i === 1 ? '10px 3px 10px 10px' : i === 4 ? '10px 10px 10px 3px' : i === 5 ? '10px 3px 10px 10px' : i === 8 ? '10px 10px 10px 3px' : '10px 3px',
                        borderRight: i === 4 ? '2px solid #e2e8f0' : 'none',
                        background: (!classeSelectionnee || isWeekend() || isVacance() || !getHoraireJour()) ? '#f1f5f9' : isBloque(i) ? '#f1f5f9' : i <= 4 ? '#eff6ff' : '#fffbeb',
                        color: (!classeSelectionnee || isWeekend() || isVacance() || !getHoraireJour()) ? '#cbd5e1' : isBloque(i) ? '#cbd5e1' : i <= 4 ? '#3b82f6' : '#f59e0b',
                        fontSize: 11,
                        boxShadow: 'none',
                      }}>P{i}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const cs = 12;
                    const cellMsg = (bg, color, msg) => (
                      <tr key="msg">
                        <td colSpan={cs} style={{ padding: '28px 20px', textAlign: 'center', background: bg, color, fontWeight: 400, fontSize: 14 }}>{msg}</td>
                      </tr>
                    );
                    if (!classeSelectionnee) {
                      return cellMsg('#f8fafc', '#64748b', 'Sélectionner une classe');
                    }
                    if (isWeekend()) {
                      return cellMsg('#fef2f2', '#dc2626', '🚫 Samedi et dimanche — aucune saisie possible');
                    }
                    if (isVacance()) {
                      return cellMsg('#fef3c7', '#92400e', `🏖️ ${getNomVacance()} — pas de saisie de présences pendant les vacances`);
                    }
                    if (!getHoraireJour()) {
                      return cellMsg('white', '#94a3b8', `Aucun horaire défini pour cette classe le ${getNomJour()} — configurez l'affectation des classes dans l'emploi du temps`);
                    }
                    if (loadingEleves) {
                      return (
                        <tr key="loading">
                          <td colSpan={cs} style={{ padding: '28px 20px', textAlign: 'center', background: 'white' }}>
                            <PageLoader label="Chargement..." compact />
                          </td>
                        </tr>
                      );
                    }
                    if (eleves.length === 0) {
                      return cellMsg('#fafafa', '#94a3b8', 'Aucun élève actif dans cette classe');
                    }
                    return (
                      <>
                        {eleves.map((e, idx) => (
                          <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                            <td style={{ ...s.td, fontWeight: 800, color: '#0f172a' }}>{e.nom}</td>
                            <td style={{ ...s.td, color: '#374151' }}>{e.prenom}</td>
                            <td style={{ ...s.td, padding: '11px 4px', textAlign: 'center', background: isWeekend() ? '#f1f5f9' : 'transparent' }}>
                              {isWeekend() ? (
                                <div style={{ width: 44, height: 28, borderRadius: 6, background: '#e2e8f0', margin: '0 auto' }}></div>
                              ) : (
                                <select
                                  value=""
                                  onChange={ev => { if (ev.target.value) setToutEleve(e.id, ev.target.value); ev.target.value = ''; }}
                                  style={{ width: 50, padding: '4px 2px', borderRadius: 6, border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 800, fontSize: 12, textAlign: 'center', textAlignLast: 'center', cursor: 'pointer', outline: 'none', display: 'block', margin: '0 auto' }}
                                >
                                  <option value="">—</option>
                                  {OPTS.filter(o => o !== '').map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              )}
                            </td>
                            {PERIODES.map(i => {
                              const bloque = isBloque(i);
                              const val = presences[e.id]?.['p' + i] || '';
                              return (
                                <td key={i} style={{ ...s.td, padding: i === 1 ? '11px 3px 11px 10px' : i === 4 ? '11px 10px 11px 3px' : i === 5 ? '11px 3px 11px 10px' : i === 8 ? '11px 10px 11px 3px' : '11px 3px', textAlign: 'center', background: bloque ? '#f1f5f9' : 'white', borderRight: i === 4 ? '2px solid #e2e8f0' : 'none' }}>
                                  {bloque ? (
                                    <div style={{ width: 40, height: 28, borderRadius: 6, background: '#e2e8f0', margin: '0 auto' }}></div>
                                  ) : (
                                    <select
                                      value={val}
                                      onChange={ev => setCell(e.id, i, ev.target.value)}
                                      style={{ width: 44, padding: '4px 2px', borderRadius: 6, border: '1px solid ' + (val ? OPTS_COLOR[val] + '66' : '#e2e8f0'), background: val ? OPTS_COLOR[val] + '18' : 'white', color: val ? OPTS_COLOR[val] : '#94a3b8', fontWeight: 700, fontSize: 12, textAlign: 'center', textAlignLast: 'center', cursor: 'pointer', outline: 'none', display: 'block', margin: '0 auto' }}
                                    >
                                      {OPTS.map(o => <option key={o} value={o}>{OPTS_LABEL[o]}</option>)}
                                    </select>
                                  )}
                                </td>
                              );
                            })}
                            <td style={{ ...s.td, padding: '11px 8px' }}>
                              <input
                                style={{ padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, width: '100%', minWidth: 140, outline: 'none' }}
                                type="text"
                                placeholder="Remarque..."
                                value={presences[e.id]?.remarque || ''}
                                onChange={ev => setRemarque(e.id, ev.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {onglet === 'apercu' && (
        <div style={{background:'white',borderRadius:12,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #f1f5f9',overflow:'hidden'}}>
          {loadingApercu ? (
            <PageLoader compact label="Chargement..." />
          ) : !apercuMois.eleves ? (
            <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>
              {apercuMois.erreur
                ? <span style={{color:'#ef4444'}}>❌ Erreur : {apercuMois.erreur}</span>
                : 'Aucune donnée pour ce mois'}
            </div>
          ) : (() => {
            const moisStr = apercuMois.mois;
            const [annee, moisNum] = moisStr.split('-').map(Number);
            const nbJours = new Date(annee, moisNum, 0).getDate();
            const jours = Array.from({length: nbJours}, (_, i) => i + 1);
            const NOM_JOURS = ['D','L','M','M','J','V','S'];
            const STATUT_COLOR = {'P':'#10b981','A':'#ef4444','R':'#f59e0b','E':'#3b82f6','C':'#8b5cf6'};
            const STATUT_BG = {'P':'#d1fae5','A':'#fee2e2','R':'#fef3c7','E':'#dbeafe','C':'#ede9fe'};

            const getStatut = (eleve_id, jour) => {
              const dateStr = annee+'-'+String(moisNum).padStart(2,'0')+'-'+String(jour).padStart(2,'0');
              const pr = (apercuMois.presences||[]).find(p => String(p.eleve_id)===String(eleve_id) && cleDatePresence(p.date) === dateStr);
              if (!pr) return '';
              for (let i=1; i<=8; i++) { if (pr['p'+i] === 'R') return 'R'; }
              for (let i=1; i<=8; i++) { if (pr['p'+i]) return pr['p'+i]; }
              return '';
            };

            const isWkd = (jour) => {
              const j = new Date(annee+'-'+String(moisNum).padStart(2,'0')+'-'+String(jour).padStart(2,'0')+'T12:00:00').getDay();
              return j===0||j===6;
            };

            const isVac = (jour) => {
              const dateStr = annee+'-'+String(moisNum).padStart(2,'0')+'-'+String(jour).padStart(2,'0');
              return evenementsCalendrier.some(ev => {
                const deb = ev.date_debut?.substring(0,10);
                const fin = (ev.date_fin||ev.date_debut)?.substring(0,10);
                return dateStr >= deb && dateStr <= fin;
              });
            };

            return (
              <div style={{overflowX:'auto',maxHeight:'min(78vh, calc(100vh - 220px))',overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
                <table style={{borderCollapse:'collapse',fontSize:11,minWidth:'100%'}}>
                  <colgroup>
                    <col style={{ width: COL_NOM_WIDTH, minWidth: COL_NOM_WIDTH, maxWidth: COL_NOM_WIDTH }} />
                    <col style={{ width: COL_PRENOM_WIDTH, minWidth: COL_PRENOM_WIDTH, maxWidth: COL_PRENOM_WIDTH }} />
                    {jours.map((j) => <col key={`apercu-col-${j}`} style={{ width: 26, minWidth: 26, maxWidth: 26 }} />)}
                  </colgroup>
                  <thead>
                    <tr style={{background:'#f8fafc'}}>
                      <th style={{padding:'10px 14px',textAlign:'left',fontSize:12,fontWeight:800,color:'#475569',borderBottom:'none',background:'#f8fafc',whiteSpace:'nowrap',boxShadow:'none',borderTopLeftRadius:12}}>NOM</th>
                      <th style={{padding:'10px 14px',textAlign:'left',fontSize:12,fontWeight:800,color:'#475569',borderBottom:'none',background:'#f8fafc',whiteSpace:'nowrap',boxShadow:'none'}}>Prénom</th>
                      {jours.map(j => {
                        const wkd = isWkd(j);
                        const vac = isVac(j);
                        const jourIdx = new Date(annee+'-'+String(moisNum).padStart(2,'0')+'-'+String(j).padStart(2,'0')+'T12:00:00').getDay();
                        const bg = wkd ? '#e2e8f0' : vac ? '#fef3c7' : '#f8fafc';
                        const lastJ = j === nbJours;
                        return (
                          <th key={j} style={{padding:'4px 2px',textAlign:'center',borderBottom:'none',minWidth:26,
                            background: bg,
                            color:wkd?'#94a3b8':vac?'#92400e':'#475569',
                            boxShadow: 'none',
                            ...(lastJ ? { borderTopRightRadius: 12 } : {}),
                          }}>
                            <div style={{fontWeight:700,fontSize:11}}>{j}</div>
                            <div style={{fontSize:9,opacity:0.7}}>{NOM_JOURS[jourIdx]}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {(apercuMois.eleves || []).length === 0 ? (
                      <tr>
                        <td colSpan={2 + jours.length} style={{padding:40,textAlign:'center',color:'#94a3b8',background:'white'}}>
                          Aucune donnée
                        </td>
                      </tr>
                    ) : apercuMois.eleves.map((e, ri) => (
                      <tr key={e.id} style={{background:ri%2===0?'white':'#fafafa'}}>
                        <td style={{padding:'11px 14px',fontWeight:700,fontSize:13,color:'#0f172a',borderBottom:'1px solid #f1f5f9',background:ri%2===0?'white':'#fafafa',whiteSpace:'nowrap',boxShadow:'none'}}>{e.nom}</td>
                        <td style={{padding:'11px 14px',fontWeight:700,fontSize:13,color:'#0f172a',borderBottom:'1px solid #f1f5f9',background:ri%2===0?'white':'#fafafa',whiteSpace:'nowrap',boxShadow:'none'}}>{e.prenom}</td>
                        {jours.map(j => {
                          const wkd = isWkd(j);
                          const vac = isVac(j);
                          const statut = (!wkd && !vac) ? getStatut(e.id, j) : '';
                          return (
                            <td key={j} style={{padding:'11px 2px',textAlign:'center',borderBottom:'1px solid #f1f5f9',
                              background:wkd?'#e2e8f0':vac?'#fef9c3':'transparent'}}>
                              {!wkd && !vac && (
                                <span style={{
                                  display:'inline-flex',alignItems:'center',justifyContent:'center',
                                  width:20,height:20,borderRadius:4,fontSize:10,fontWeight:800,
                                  background:STATUT_BG[statut]||'#f1f5f9',
                                  color:STATUT_COLOR[statut]||'#cbd5e1',
                                }}>
                                  {statut||'·'}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {onglet === 'stats' && (
        <div>
          <div style={{background:'white',borderRadius:14,boxShadow:'none',border:'none',overflow:'hidden'}}>
          <div style={{overflow:'auto',maxHeight:'calc(100vh - 260px)',WebkitOverflowScrolling:'touch'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <colgroup>
              <col style={{ width: COL_NOM_WIDTH, minWidth: COL_NOM_WIDTH, maxWidth: COL_NOM_WIDTH }} />
              <col style={{ width: COL_PRENOM_WIDTH, minWidth: COL_PRENOM_WIDTH, maxWidth: COL_PRENOM_WIDTH }} />
              {Array.from({ length: 8 }).map((_, i) => <col key={`stats-col-${i}`} style={{ width: 96, minWidth: 96, maxWidth: 96 }} />)}
            </colgroup>
            <thead>
              <tr style={{background:'#6366f1'}}>
                {['NOM','Prénom','Périodes','Présents','Absents','Retards','Excusés','Congés','Taux','Taux BN'].map((h, hi) => (
                  <th key={h} style={{
                    ...s.th,
                    textAlign: h==='NOM'||h==='Prénom'?'left':'center',
                    color: 'white',
                    background: '#6366f1',
                    borderTopLeftRadius: hi === 0 ? 12 : 0,
                    borderTopRightRadius: hi === 9 ? 12 : 0,
                    boxShadow: 'none',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingStats ? (
                <tr><td colSpan="10"><PageLoader label="Chargement..." compact /></td></tr>
              ) : statistiques.length === 0 ? (
                <tr><td colSpan="10" style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Aucune donnée</td></tr>
              ) : statistiques.map((st, i) => {
                const presents = Number(st.presents) || 0;
                const retards = Number(st.retards) || 0;
                const excuses = Number(st.excuses) || 0;
                const conges = Number(st.conges) || 0;
                const absents = Number(st.absents) || 0;
                const totalPeriodes = presents + absents + retards + excuses + conges;
                const baseTaux = totalPeriodes - excuses - conges;
                const presentPlusRetards = presents + retards;
                const tauxPresence = baseTaux > 0 ? Math.round((presentPlusRetards / baseTaux) * 1000) / 10 : null;
                const tauxBN = totalPeriodes > 0 ? Math.round((presentPlusRetards / totalPeriodes) * 1000) / 10 : null;
                return (
                  <tr key={i} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa'}}>
                    <td style={{...STATS_TD,fontWeight:800}}>{st.nom}</td>
                    <td style={STATS_TD}>{st.prenom}</td>
                    <td style={{...STATS_TD,textAlign:'center'}}>{totalPeriodes}</td>
                    <td style={{...STATS_TD,textAlign:'center',color:'#10b981',fontWeight:700}}>{st.presents||0}</td>
                    <td style={{...STATS_TD,textAlign:'center',color:'#ef4444',fontWeight:700}}>{st.absents||0}</td>
                    <td style={{...STATS_TD,textAlign:'center',color:'#f59e0b',fontWeight:700}}>{st.retards||0}</td>
                    <td style={{...STATS_TD,textAlign:'center',color:'#3b82f6',fontWeight:700}}>{st.excuses||0}</td>
                    <td style={{...STATS_TD,textAlign:'center',color:'#8b5cf6',fontWeight:700}}>{st.conges||0}</td>
                    <td style={{...STATS_TD,textAlign:'center',fontWeight:700,color:tauxPresence!=null&&tauxPresence>=80?'#10b981':tauxPresence!=null?'#f59e0b':'#94a3b8'}}>{tauxPresence != null ? tauxPresence + '%' : '—'}</td>
                    <td style={{...STATS_TD,textAlign:'center',fontWeight:700,color:tauxBN!=null&&tauxBN>=80?'#10b981':tauxBN!=null?'#f59e0b':'#94a3b8'}}>{tauxBN != null ? tauxBN + '%' : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  inp:{padding:'8px 12px',border:'1px solid #c7d2fe',borderRadius:8,fontSize:13,outline:'none',background:'white'},
  /** Liste classe : même gabarit visuel que les barres de recherche. */
  selClasse:{height:36,padding:'0 14px',boxSizing:'border-box',borderRadius:8,border:'1px solid #c7d2fe',background:'white',color:'#1e293b',fontWeight:400,fontSize:13,outline:'none',cursor:'pointer',width:240,fontFamily:'inherit'},
  tabSelect:{padding:'9px 18px',borderRadius:10,border:'2px solid #4f46e5',background:'#e0e7ff',color:'#3730a3',fontWeight:700,fontSize:14,outline:'none',cursor:'pointer',textAlign:'center'},
  btnBack:{padding:'8px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#475569'},
  th:{padding:'10px 8px',textAlign:'center',fontSize:12,fontWeight:700,color:'#475569',borderBottom:'none',whiteSpace:'nowrap'},
  td:{padding:'11px 14px',fontSize:13,color:'#374151'},
};
