import { peutModifierPresences } from '../utils/permissions';
import * as XLSX from 'xlsx';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';
const FONT = "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif";
const OPTS = ['', 'P', 'A', 'R', 'E', 'C'];
const OPTS_LABEL = { '': '—', 'P': 'P', 'A': 'A', 'R': 'R', 'E': 'E', 'C': 'C' };
const OPTS_COLOR = { '': '#94a3b8', 'P': '#10b981', 'A': '#ef4444', 'R': '#f59e0b', 'E': '#3b82f6', 'C': '#8b5cf6' };
const PERIODES = [1,2,3,4,5,6,7,8];
const JOURS_NOMS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const COL_NOM_WIDTH = 170;
const COL_PRENOM_WIDTH = 150;

function initPresences(eleves) {
  const p = {};
  eleves.forEach(e => {
    p[e.id] = { p1:'',p2:'',p3:'',p4:'',p5:'',p6:'',p7:'',p8:'',remarque:'' };
  });
  return p;
}

export default function Presences() {
  const [classes, setClasses] = useState([]);
  const [classeInfo, setClasseInfo] = useState(null);
  const [eleves, setEleves] = useState([]);
  const [presences, setPresences] = useState({});
  const [classeSelectionnee, setClasseSelectionnee] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [onglet, setOnglet] = useState('saisie');
  const [statistiques, setStatistiques] = useState([]);
  const [valide, setValide] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [classeHoraires, setClasseHoraires] = useState([]);
  const [evenementsCalendrier, setEvenementsCalendrier] = useState([]);
  const [apercuMois, setApercuMois] = useState({});
  const [loadingApercu, setLoadingApercu] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [statsDateDebut, setStatsDateDebut] = useState('');
  const [statsDateFin, setStatsDateFin] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const headers = {};

  useEffect(() => { chargerClasses(); chargerCalendrier(); }, []);
  useEffect(() => {
    const classeDepuisDashboard = location.state?.classe_id;
    if (classeDepuisDashboard && classes.length > 0) {
      const ok = classes.find(c => String(c.id) === String(classeDepuisDashboard));
      if (ok) setClasseSelectionnee(String(classeDepuisDashboard));
    }
  }, [location.state, classes]);
  useEffect(() => {
    if (classeSelectionnee) {
      const cl = classes.find(c => String(c.id) === String(classeSelectionnee));
      setClasseInfo(cl || null);
      chargerEleves();
      chargerClasseHoraires(classeSelectionnee);
    } else {
      setClasseInfo(null);
      setEleves([]);
      setPresences({});
      setStatistiques([]);
      setClasseHoraires([]);
      setApercuMois({});
      setValide(false);
    }
  }, [classeSelectionnee, date]);

  useEffect(() => {
    if (classeSelectionnee) chargerStats();
  }, [classeSelectionnee, statsDateDebut, statsDateFin]);

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
        axios.get(API + '/eleves/oasi?classe_id=' + classeSelectionnee, { headers }),
        axios.get(API + '/presences/mois?classe_id=' + classeSelectionnee + '&mois=' + mois, { headers }),
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
            String(p.eleve_id) === String(eleve.id) && p.date?.substring(0,10) === dateStr
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
    if (!classeSelectionnee) { alert('Sélectionnez une classe d\'abord'); return; }
    setLoadingApercu(true);
    try {
      const mois = date.substring(0, 7);
      const [elevesRes, presRes] = await Promise.all([
        axios.get(API + '/presences/eleves?classe_id=' + classeSelectionnee, { headers }),
        axios.get(API + '/presences/mois?classe_id=' + classeSelectionnee + '&mois=' + mois, { headers }),
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
      const res = await axios.get(API + '/calendrier', { headers });
      setEvenementsCalendrier(res.data.filter(e => e.categorie === 'vacance'));
    } catch (err) { console.error(err); }
  };

  const chargerClasseHoraires = async (classe_id) => {
    try {
      const res = await axios.get(API + '/planning/classe-horaires', { headers });
      setClasseHoraires(res.data.filter(h => h.classe_id == classe_id));
    } catch (err) { console.error(err); }
  };

  const chargerClasses = async () => {
    try {
      const res = await axios.get(API + '/presences/classes', { headers });
      setClasses(res.data);
      setClasseSelectionnee('');
    } catch (err) { console.error(err); }
  };

  const chargerEleves = async () => {
    try {
      const [elevesRes, presRes] = await Promise.all([
        axios.get(API + '/presences/eleves?classe_id=' + classeSelectionnee, { headers }),
        axios.get(API + '/presences?classe_id=' + classeSelectionnee + '&date=' + date, { headers })
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
  };

  const chargerStats = async () => {
    try {
      const params = new URLSearchParams({ classe_id: String(classeSelectionnee) });
      if (statsDateDebut) params.append('date_debut', statsDateDebut);
      if (statsDateFin) params.append('date_fin', statsDateFin);
      const res = await axios.get(API + '/presences/statistiques?' + params.toString(), { headers });
      setStatistiques(res.data);
    } catch (err) { console.error(err); }
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
          const horaire = classeInfo?.horaire || 'complet';
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
    try {
      const data = eleves.map(e => ({
        eleve_id: e.id,
        ...presences[e.id],
        valide: true
      }));
      await axios.post(API + '/presences', { presences: data, date, classe_id: classeSelectionnee }, { headers });
      setSauvegarde(true);
      setTimeout(() => setSauvegarde(false), 3000);
      chargerStats();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.message || err.message));
    }
  };

  const setCell = (eleveId, periode, val) => {
    setPresences(prev => ({
      ...prev,
      [eleveId]: { ...prev[eleveId], ['p' + periode]: val }
    }));
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
      PERIODES.forEach(i => {
        if (!isBloque(i)) row['p' + i] = val;
      });
      return { ...prev, [eleveId]: row };
    });
  };

  return (
    <div style={{padding:'24px 28px',background:'#f8fafc',minHeight:'100vh',fontFamily:FONT}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:12}}>
        <button style={s.btnBack} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={{fontSize:22,fontWeight:800,color:'#0f172a',flex:1,margin:0}}>✅ Présences</h2>
      </div>

      {/* Onglets */}
      <div style={{display:'flex',gap:10,marginBottom:12,alignItems:'center'}}>
        <div style={{display:'flex',gap:10,alignItems:'center',flex:1}}>
        <select style={s.inp} value={classeSelectionnee} onChange={e => setClasseSelectionnee(e.target.value)}>
          <option value="">- Sélectionner une classe -</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        {[['saisie','📋 Saisie'],['apercu','📆 Aperçu du mois'],['stats','📊 Statistiques']].map(([k,l]) => (
          <button key={k} style={{padding:'9px 20px',borderRadius:9,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,background:onglet===k?'#6366f1':'white',color:onglet===k?'white':'#64748b',boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}} onClick={() => { setOnglet(k); if(k==='apercu') chargerApercuMois(); }}>{l}</button>
        ))}
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <button onClick={allerJourPrecedent} style={{padding:'7px 11px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:14,color:'#475569',fontWeight:700}}>‹</button>
          <input style={s.inp} type="date" value={date} onChange={e => setDate(e.target.value)} />
          <button onClick={allerJourSuivant} style={{padding:'7px 11px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:14,color:'#475569',fontWeight:700}}>›</button>
        </div>
        <button onClick={exporterLORA} disabled={exportLoading} style={{marginLeft:'auto',padding:'9px 20px',borderRadius:9,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,background:'#6366f1',color:'white',boxShadow:'0 1px 3px rgba(0,0,0,0.08)',opacity:exportLoading?0.7:1}}>
          {exportLoading ? 'Export...' : 'Export LORA'}
        </button>
      </div>
      </div>

      {onglet === 'saisie' && (
        <div style={{background:'white',borderRadius:14,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',border:'1px solid #f1f5f9',overflow:'hidden'}}>

          {/* Alerte weekend */}
          {isWeekend() && (
            <div style={{padding:'12px 20px',background:'#fef2f2',borderBottom:'1px solid #fecaca',color:'#dc2626',fontWeight:700,fontSize:13}}>
              🚫 Samedi et dimanche — aucune saisie possible
            </div>
          )}
          {!isWeekend() && isVacance() && (
            <div style={{padding:'12px 20px',background:'#fef3c7',borderBottom:'1px solid #fde68a',color:'#92400e',fontWeight:700,fontSize:13}}>
              🏖️ {getNomVacance()} — pas de saisie de présences pendant les vacances
            </div>
          )}
          {!isWeekend() && !isVacance() && !getHoraireJour() && (
            <div style={{padding:'12px 20px',background:'#fff7ed',borderBottom:'1px solid #fed7aa',color:'#c2410c',fontWeight:700,fontSize:13}}>
              ⚠️ Aucun horaire défini pour cette classe le {getNomJour()} — configurez l'affectation des classes dans l'emploi du temps
            </div>
          )}
          {!isWeekend() && getHoraireJour() && (
            <div style={{padding:'8px 20px',background:'#f0fdf4',borderBottom:'1px solid #bbf7d0',color:'#15803d',fontWeight:600,fontSize:12}}>
              📅 {getNomJour()} — {getHoraireJour() === 'Matin' ? '☀️ Matin (P1–P4)' : '🌙 Après-midi (P5–P8)'}
            </div>
          )}

          {/* Barre validation + sauvegarde */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              {/* Légende */}
              {[['P','#10b981','Présent'],['A','#ef4444','Absent'],['R','#f59e0b','Retard'],['E','#3b82f6','Excusé'],['C','#8b5cf6','Congé']].map(([k,c,l]) => (
                <span key={k} style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:12,color:c,fontWeight:700}}>
                  <span style={{width:18,height:18,borderRadius:4,background:c,color:'white',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800}}>{k}</span>{l}
                </span>
              ))}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:13,color:'#64748b'}}>{eleves.length} élève(s)</span>
              {/* Bouton bascule validation */}
              <button onClick={handleToggleValide} disabled={isWeekend()||isVacance()} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',borderRadius:99,border:'2px solid '+((valide)?'#10b981':'#e2e8f0'),background:(isWeekend()||isVacance())?'#f1f5f9':valide?'#ecfdf5':'white',color:(isWeekend()||isVacance())?'#cbd5e1':valide?'#059669':'#64748b',cursor:(isWeekend()||isVacance())?'not-allowed':'pointer',fontWeight:700,fontSize:13,transition:'all 0.2s'}}>
                <div style={{width:36,height:20,borderRadius:10,background:valide?'#10b981':'#e2e8f0',position:'relative',transition:'all 0.2s'}}>
                  <div style={{position:'absolute',top:2,left:valide?18:2,width:16,height:16,borderRadius:'50%',background:'white',transition:'all 0.2s'}}></div>
                </div>
                {valide ? '✅ Présences validées' : 'Valider les présences'}
              </button>
              <button onClick={handleSauvegarder} disabled={!valide} style={{padding:'8px 18px',borderRadius:9,border:'none',cursor:valide?'pointer':'not-allowed',fontWeight:700,fontSize:13,background:valide?'#6366f1':'#e2e8f0',color:valide?'white':'#94a3b8',transition:'all 0.2s'}}>
                💾 Sauvegarder
              </button>
            </div>
          </div>

          {sauvegarde && <div style={{padding:'10px 20px',background:'#ecfdf5',color:'#059669',fontWeight:700,fontSize:13}}>✅ Présences sauvegardées !</div>}

          {eleves.length === 0 ? (
            <div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:14}}>Aucun élève actif dans cette classe</div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <colgroup>
                  <col style={{width:COL_NOM_WIDTH,minWidth:COL_NOM_WIDTH,maxWidth:COL_NOM_WIDTH}} />
                  <col style={{width:COL_PRENOM_WIDTH,minWidth:COL_PRENOM_WIDTH,maxWidth:COL_PRENOM_WIDTH}} />
                  <col style={{width:74,minWidth:74,maxWidth:74}} />
                  {PERIODES.map(i => <col key={`col-p-${i}`} style={{width:64,minWidth:64,maxWidth:64}} />)}
                  <col style={{width:'auto'}} />
                </colgroup>
                <thead>
                  <tr style={{background:'#f8fafc'}}>
                    <th style={s.th} rowSpan={2}>NOM</th>
                    <th style={s.th} rowSpan={2}>Prénom</th>
                    <th style={{...s.th,fontSize:10,textAlign:'center'}} rowSpan={2} title="Appliquer à toutes les périodes">Tout</th>
                    <th style={{...s.th,background:'#dbeafe',color:'#1e40af'}} colSpan={4}>☀️ Matin</th>
                    <th style={{...s.th,background:'#fef3c7',color:'#92400e'}} colSpan={4}>🌙 Après-midi</th>
                    <th style={s.th} rowSpan={2}>Remarques</th>
                  </tr>
                  <tr style={{background:'#f8fafc'}}>
                    {PERIODES.map(i => (
                      <th key={i} style={{
                        ...s.th,
                        background: isBloque(i) ? '#f1f5f9' : i<=4 ? '#eff6ff' : '#fffbeb',
                        color: isBloque(i) ? '#cbd5e1' : i<=4 ? '#3b82f6' : '#f59e0b',
                        fontSize:11
                      }}>P{i}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eleves.map((e, idx) => (
                    <tr key={e.id} style={{borderBottom:'1px solid #f1f5f9',background:idx%2===0?'white':'#fafafa'}}>
                      <td style={{...s.td,fontWeight:800,color:'#0f172a'}}>{e.nom}</td>
                      <td style={{...s.td,color:'#374151'}}>{e.prenom}</td>
                      <td style={{...s.td,padding:'6px 4px',textAlign:'center',background:isWeekend()?'#f1f5f9':'transparent'}}>
                        {isWeekend() ? (
                          <div style={{width:44,height:28,borderRadius:6,background:'#e2e8f0',margin:'0 auto'}}></div>
                        ) : (
                          <select
                            value=""
                            onChange={ev => { if(ev.target.value) setToutEleve(e.id, ev.target.value); ev.target.value=''; }}
                            style={{width:50,padding:'4px 2px',borderRadius:6,border:'1px solid #cbd5e1',background:'white',color:'#64748b',fontWeight:800,fontSize:12,textAlign:'center',textAlignLast:'center',cursor:'pointer',outline:'none',display:'block',margin:'0 auto'}}
                          >
                            <option value="">—</option>
                            {OPTS.filter(o=>o!=='').map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        )}
                      </td>
                      {PERIODES.map(i => {
                        const bloque = isBloque(i);
                        const val = presences[e.id]?.['p'+i] || '';
                        return (
                          <td key={i} style={{...s.td,padding:'6px 4px',textAlign:'center',background:bloque?'#f1f5f9':'white'}}>
                            {bloque ? (
                              <div style={{width:40,height:28,borderRadius:6,background:'#e2e8f0',margin:'0 auto'}}></div>
                            ) : (
                              <select
                                value={val}
                                onChange={ev => setCell(e.id, i, ev.target.value)}
                                style={{width:44,padding:'4px 2px',borderRadius:6,border:'1px solid '+(val?OPTS_COLOR[val]+'66':'#e2e8f0'),background:val?OPTS_COLOR[val]+'18':'white',color:val?OPTS_COLOR[val]:'#94a3b8',fontWeight:700,fontSize:12,textAlign:'center',textAlignLast:'center',cursor:'pointer',outline:'none',display:'block',margin:'0 auto'}}
                              >
                                {OPTS.map(o => <option key={o} value={o}>{OPTS_LABEL[o]}</option>)}
                              </select>
                            )}
                          </td>
                        );
                      })}
                      <td style={{...s.td,padding:'6px 8px'}}>
                        <input
                          style={{padding:'5px 8px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:12,width:'100%',minWidth:140,outline:'none'}}
                          type="text"
                          placeholder="Remarque..."
                          value={presences[e.id]?.remarque || ''}
                          onChange={ev => setRemarque(e.id, ev.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {onglet === 'apercu' && (
        <div style={{background:'white',borderRadius:14,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',border:'1px solid #f1f5f9',overflow:'hidden'}}>
          <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>
            <span style={{fontWeight:800,fontSize:14,color:'#0f172a'}}>
              Aperçu — {new Date(date.substring(0,7)+'-01T12:00:00').toLocaleDateString('fr-CH',{month:'long',year:'numeric'})}
            </span>
          </div>
          {loadingApercu ? (
            <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Chargement...</div>
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
              const pr = (apercuMois.presences||[]).find(p => String(p.eleve_id)===String(eleve_id) && p.date?.substring(0,10)===dateStr);
              if (!pr) return '';
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
              <div style={{overflowX:'auto'}}>
                <table style={{borderCollapse:'collapse',fontSize:11,minWidth:'100%'}}>
                  <colgroup>
                    <col style={{ width: COL_NOM_WIDTH, minWidth: COL_NOM_WIDTH, maxWidth: COL_NOM_WIDTH }} />
                    <col style={{ width: COL_PRENOM_WIDTH, minWidth: COL_PRENOM_WIDTH, maxWidth: COL_PRENOM_WIDTH }} />
                    {jours.map((j) => <col key={`apercu-col-${j}`} style={{ width: 26, minWidth: 26, maxWidth: 26 }} />)}
                  </colgroup>
                  <thead>
                    <tr style={{background:'#f8fafc'}}>
                      <th style={{padding:'10px 14px',textAlign:'left',fontSize:12,fontWeight:800,color:'#475569',borderBottom:'2px solid #e2e8f0',position:'sticky',left:0,background:'#f8fafc',zIndex:3,whiteSpace:'nowrap'}}>NOM</th>
                      <th style={{padding:'10px 14px',textAlign:'left',fontSize:12,fontWeight:800,color:'#475569',borderBottom:'2px solid #e2e8f0',position:'sticky',left:COL_NOM_WIDTH,background:'#f8fafc',zIndex:3,whiteSpace:'nowrap'}}>Prénom</th>
                      {jours.map(j => {
                        const wkd = isWkd(j);
                        const vac = isVac(j);
                        const jourIdx = new Date(annee+'-'+String(moisNum).padStart(2,'0')+'-'+String(j).padStart(2,'0')+'T12:00:00').getDay();
                        return (
                          <th key={j} style={{padding:'4px 2px',textAlign:'center',borderBottom:'2px solid #e2e8f0',minWidth:26,
                            background:wkd?'#e2e8f0':vac?'#fef3c7':'#f8fafc',
                            color:wkd?'#94a3b8':vac?'#92400e':'#475569'}}>
                            <div style={{fontWeight:700,fontSize:11}}>{j}</div>
                            <div style={{fontSize:9,opacity:0.7}}>{NOM_JOURS[jourIdx]}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {apercuMois.eleves.map((e, ri) => (
                      <tr key={e.id} style={{background:ri%2===0?'white':'#fafafa'}}>
                        <td style={{padding:'8px 14px',fontWeight:700,fontSize:13,color:'#0f172a',borderBottom:'1px solid #f1f5f9',position:'sticky',left:0,background:ri%2===0?'white':'#fafafa',zIndex:2,whiteSpace:'nowrap'}}>{e.nom}</td>
                        <td style={{padding:'8px 14px',fontWeight:700,fontSize:13,color:'#0f172a',borderBottom:'1px solid #f1f5f9',position:'sticky',left:COL_NOM_WIDTH,background:ri%2===0?'white':'#fafafa',zIndex:2,whiteSpace:'nowrap'}}>{e.prenom}</td>
                        {jours.map(j => {
                          const wkd = isWkd(j);
                          const vac = isVac(j);
                          const statut = (!wkd && !vac) ? getStatut(e.id, j) : '';
                          return (
                            <td key={j} style={{padding:'8px 2px',textAlign:'center',borderBottom:'1px solid #f1f5f9',
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
        <div style={{background:'white',borderRadius:14,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',border:'1px solid #f1f5f9',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <span style={{fontSize:13,color:'#334155',fontWeight:700}}>Entre :</span>
            <input
              type="date"
              value={statsDateDebut}
              onChange={e => setStatsDateDebut(e.target.value)}
              style={s.inp}
            />
            <span style={{fontSize:13,color:'#334155',fontWeight:700}}>et</span>
            <input
              type="date"
              value={statsDateFin}
              onChange={e => setStatsDateFin(e.target.value)}
              style={s.inp}
            />
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <colgroup>
              <col style={{ width: COL_NOM_WIDTH, minWidth: COL_NOM_WIDTH, maxWidth: COL_NOM_WIDTH }} />
              <col style={{ width: COL_PRENOM_WIDTH, minWidth: COL_PRENOM_WIDTH, maxWidth: COL_PRENOM_WIDTH }} />
              {Array.from({ length: 8 }).map((_, i) => <col key={`stats-col-${i}`} style={{ width: 96, minWidth: 96, maxWidth: 96 }} />)}
            </colgroup>
            <thead>
              <tr style={{background:'#f8fafc'}}>
                {['NOM','Prénom','Périodes','Présents','Absents','Retards','Excusés','Congés','Taux présence %','Taux présence BN %'].map(h => (
                  <th key={h} style={{...s.th,textAlign:h==='NOM'||h==='Prénom'?'left':'center'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statistiques.length === 0 ? (
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
                    <td style={{...s.td,fontWeight:800}}>{st.nom}</td>
                    <td style={s.td}>{st.prenom}</td>
                    <td style={{...s.td,textAlign:'center'}}>{totalPeriodes}</td>
                    <td style={{...s.td,textAlign:'center',color:'#10b981',fontWeight:700}}>{st.presents||0}</td>
                    <td style={{...s.td,textAlign:'center',color:'#ef4444',fontWeight:700}}>{st.absents||0}</td>
                    <td style={{...s.td,textAlign:'center',color:'#f59e0b',fontWeight:700}}>{st.retards||0}</td>
                    <td style={{...s.td,textAlign:'center',color:'#3b82f6',fontWeight:700}}>{st.excuses||0}</td>
                    <td style={{...s.td,textAlign:'center',color:'#8b5cf6',fontWeight:700}}>{st.conges||0}</td>
                    <td style={{...s.td,textAlign:'center',fontWeight:700,color:tauxPresence!=null&&tauxPresence>=80?'#10b981':tauxPresence!=null?'#f59e0b':'#94a3b8'}}>{tauxPresence != null ? tauxPresence + '%' : '—'}</td>
                    <td style={{...s.td,textAlign:'center',fontWeight:700,color:tauxBN!=null&&tauxBN>=80?'#10b981':tauxBN!=null?'#f59e0b':'#94a3b8'}}>{tauxBN != null ? tauxBN + '%' : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const s = {
  inp:{padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,outline:'none',background:'white'},
  btnBack:{padding:'8px 14px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:13,color:'#475569'},
  th:{padding:'10px 8px',textAlign:'center',fontSize:12,fontWeight:700,color:'#475569',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'},
  td:{padding:'8px',fontSize:13,color:'#374151'},
};
