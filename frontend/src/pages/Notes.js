import { isAdmin, peutModifierNotes } from '../utils/permissions';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';
const TYPES = ['Ecrit', 'Oral', 'Projet', 'TP', 'Devoir'];

const calculerNote = (points, pointsMax) => {
  if (points === '' || points === null || points === undefined || pointsMax <= 0) return null;
  const p = Math.min(parseFloat(points), parseFloat(pointsMax));
  const note = (p / parseFloat(pointsMax)) * 5 + 1;
  return Math.round(Math.min(note, 6) * 10) / 10;
};

const fmtNote = (n) => {
  if (n === null || n === undefined) return '—';
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  return num % 1 === 0 ? String(Math.round(num)) : String(parseFloat(num.toFixed(1)));
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
  const [vueClasseAction, setVueClasseAction] = useState('evaluations');
  const [rapportMatiereId, setRapportMatiereId] = useState('');
  const [rapportEleveId, setRapportEleveId] = useState('');
  const [bulletinMode, setBulletinMode] = useState('tous');
  const [bulletinOnglet, setBulletinOnglet] = useState('criteres');
  const [showForm, setShowForm] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [form, setForm] = useState({ nom: '', matiere_id: '', date: new Date().toISOString().split('T')[0], type: 'Ecrit', coefficient: '1', sur: '6', points_max: '', sans_points: false, editId: null });
  const printRef = useRef();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };
  const currentUser = JSON.parse(localStorage.getItem('utilisateur') || '{}');
  const profNomSession = ((currentUser.prenom || '') + ' ' + (currentUser.nom || '')).trim() || '—';
  const todayFormatted = new Date().toLocaleDateString('fr-CH');

  useEffect(() => { chargerClasses(); chargerMatieres(); chargerParametresEcole(); }, []);

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

  const chargerEvaluationsId = async (classeId, matiereId) => {
    try {
      let url = API + '/notes?classe_id=' + classeId;
      if (matiereId) url += '&matiere_id=' + matiereId;
      const res = await axios.get(url, { headers });
      setEvaluations(res.data);
      return res.data;
    } catch (err) { console.error(err); return []; }
  };

  const chargerRapport = async (classeId) => {
    setRapport(null);
    setRapportErreur('');
    setRapportChargement(true);
    try {
      const res = await axios.get(API + '/notes/rapport?classe_id=' + classeId, { headers });
      setRapport(res.data);
    } catch (err) {
      console.error(err);
      setRapportErreur(err.response?.data?.message || err.message || 'Erreur inconnue');
    } finally {
      setRapportChargement(false);
    }
  };

  const chargerBulletinId = async (classeId) => {
    try {
      const [bulletinRes, statsRes, criteresRes] = await Promise.all([
        axios.get(API + '/notes/bulletin?classe_id=' + classeId, { headers }),
        axios.get(API + '/presences/statistiques?classe_id=' + classeId, { headers }),
        axios.get(API + '/notes/bulletin-criteres?classe_id=' + classeId, { headers }),
      ]);
      setBulletins(bulletinRes.data);
      setBulletinStatsPresences(statsRes.data || []);
      setBulletinCriteres(criteresRes.data || []);
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
        prof_id: currentUser.id || null
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
      setSauvegarde(true);
      setTimeout(() => setSauvegarde(false), 3000);
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
    window.print();
  };
  const classeNom = classeObj?.nom || '';

  const ouvrirVueDepuisSelectionClasse = async (mode, classeIdParam = classeSelectionnee) => {
    if (!classeIdParam) return;
    const cl = classes.find(c => String(c.id) === String(classeIdParam));
    if (!cl) {
      return;
    }
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
      await chargerRapport(cl.id);
      setVue('generale');
      return;
    }
    if (mode === 'bulletin') {
      setClasseObj(cl);
      setClasseSelectionnee(cl.id);
      setBulletinMode('tous');
      setEleveSelectionne('');
      await chargerBulletinId(cl.id);
      setVue('bulletin');
    }
  };

  const renderActionsBar = (className = '') => (
    <div className={className} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:12,flexWrap:'wrap'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <button
          style={{ ...s.btnTopAction, background: vueClasseAction === 'evaluations' ? '#6366f1' : 'white', color: vueClasseAction === 'evaluations' ? 'white' : '#475569', border: vueClasseAction === 'evaluations' ? 'none' : '1px solid #e2e8f0' }}
          onClick={() => { setVueClasseAction('evaluations'); if (classeSelectionnee) ouvrirVueDepuisSelectionClasse('evaluations'); }}
        >
          📝 Évaluations
        </button>
        <button
          style={{ ...s.btnTopAction, background: vueClasseAction === 'generale' ? '#6366f1' : 'white', color: vueClasseAction === 'generale' ? 'white' : '#475569', border: vueClasseAction === 'generale' ? 'none' : '1px solid #e2e8f0' }}
          onClick={() => { setVueClasseAction('generale'); if (classeSelectionnee) ouvrirVueDepuisSelectionClasse('generale'); }}
        >
          📊 Vue générale
        </button>
        <button
          style={{ ...s.btnTopAction, background: vueClasseAction === 'bulletin' ? '#6366f1' : 'white', color: vueClasseAction === 'bulletin' ? 'white' : '#475569', border: vueClasseAction === 'bulletin' ? 'none' : '1px solid #e2e8f0' }}
          onClick={() => { setVueClasseAction('bulletin'); if (classeSelectionnee) ouvrirVueDepuisSelectionClasse('bulletin'); }}
        >
          📄 Bulletin
        </button>
        <select
          style={{...s.select, minWidth:230, height:35}}
          value={classeSelectionnee}
          onChange={e => {
            const next = e.target.value;
            setClasseSelectionnee(next);
            if (!next) { setClasseObj(null); return; }
            ouvrirVueDepuisSelectionClasse(vueClasseAction, next);
          }}
        >
          <option value="">- Sélectionner une classe -</option>
          {classes.map(cl => <option key={cl.id} value={cl.id}>{cl.nom}</option>)}
        </select>
      </div>
    </div>
  );

  // ===================== VUE SAISIE NOTES =====================
  if (vue === 'saisie' && evaluationOuverte) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <button style={s.btnRetour} onClick={() => { setVue('evaluations'); chargerEvaluationsId(classeSelectionnee, matiereSelectionnee); }}>← Retour</button>
          <div style={{ flex: 1 }}>
            <h2 style={s.titre}>{evaluationOuverte.nom}</h2>
            <div style={s.evalInfo}>{evaluationOuverte.matiere} • {evaluationOuverte.type}{evaluationOuverte.points_max && parseFloat(evaluationOuverte.points_max) > 0 ? ` • Points max : ${parseFloat(evaluationOuverte.points_max)}` : ''} • Coef. {evaluationOuverte.coefficient} • {profNomSession}</div>
          </div>
          <div style={s.moyenneBox}>
            <div style={s.moyenneLabel}>Moyenne classe</div>
            <div style={s.moyenneValeur}>{(() => { const m = getMoyenneClasse(); return m === '—' ? '—' : fmtNote(m); })()}</div>
          </div>
          <button style={{ ...s.btnSauver, opacity: peutModifierNotes() ? 1 : 0.4, cursor: peutModifierNotes() ? 'pointer' : 'not-allowed' }}
            disabled={!peutModifierNotes()} onClick={handleSauvegarderNotes}>💾 Enregistrer</button>
        </div>
        {sauvegarde && <div style={s.successMsg}>✅ Notes enregistrées !</div>}
        {elevesNotes.length === 0 && <div style={{ background: '#fff3cd', color: '#856404', padding: '12px 20px', borderRadius: 8, marginBottom: 12 }}>Aucun élève actif trouvé dans cette classe.</div>}
        <div style={s.tableContainer}>
          <table style={s.tbl}>
            <thead>
              <tr style={s.theadRow}>
                <th style={s.th}>Nom</th>
                <th style={s.th}>Prénom</th>
                {evaluationOuverte.points_max && parseFloat(evaluationOuverte.points_max) > 0
                  ? <th style={{ ...s.th, textAlign: 'center' }}>Points</th>
                  : null}
                <th style={{ ...s.th, textAlign: 'center' }}>Note</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Absent</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Dispensé</th>
                <th style={s.th}>Remarques</th>
              </tr>
            </thead>
            <tbody>
              {elevesNotes.map((eleve, i) => {
                const avecPoints = evaluationOuverte.points_max && parseFloat(evaluationOuverte.points_max) > 0;
                const note = avecPoints ? calculerNote(eleve.points, evaluationOuverte.points_max) : null;
                const noteDirecte = !avecPoints && eleve.note !== '' ? parseFloat(eleve.note) : null;
                return (
                  <tr key={eleve.id} style={{ ...s.tr, background: eleve.absent ? '#fff8f8' : eleve.dispense ? '#f8f8ff' : i % 2 === 0 ? 'white' : '#fafbfc' }}>
                    <td style={s.td}><b>{eleve.nom}</b></td>
                    <td style={s.td}>{eleve.prenom}</td>
                    {avecPoints ? (
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        <input style={s.noteInput} type="number" min="0" max={evaluationOuverte.points_max} step="0.5"
                          value={eleve.points} disabled={eleve.absent || eleve.dispense}
                          onChange={ev => { const c = [...elevesNotes]; c[i].points = ev.target.value; setElevesNotes(c); }} />
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
                        <input style={{ ...s.noteInput, color: noteDirecte !== null ? (noteDirecte >= 4 ? '#2e7d32' : '#ef4444') : '#333' }}
                          type="number" min="1" max="6" step="0.1"
                          value={eleve.note} placeholder="—"
                          onChange={ev => { const c = [...elevesNotes]; let v = ev.target.value; if (v !== '' && parseFloat(v) > 6) v = '6'; c[i].note = v; setElevesNotes(c); }} />
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

    return (
      <div style={s.page}>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            @page { size: A4 landscape; margin: 8mm; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { margin: 0; font-size: 9px; }
            th, td { font-size: 9px !important; padding: 3px 5px !important; }
            h3 { font-size: 11px !important; margin: 0 0 6px 0 !important; }
            div[class] { box-shadow: none !important; }
          }
        `}</style>
        <div style={s.header} className="no-print">
          <button style={s.btnRetour} onClick={() => setVue('classes')}>← Retour</button>
          <h2 style={s.titre}>📊 Vue générale — {classeNom}</h2>
          <button style={s.btnImprimer} onClick={handleImprimer}>🖨️ Imprimer</button>
        </div>
        {renderActionsBar('no-print')}

        {/* Sélecteur de mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, background: 'white', padding: '12px 16px', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flexWrap: 'wrap' }} className="no-print">
          {[['tous', 'Tous'], ['branche', 'Par branche'], ['eleve', 'Par élève']].map(([val, label]) => (
            <button key={val} onClick={() => setVueGeneraleMode(val)}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: vueGeneraleMode === val ? '#6366f1' : '#f1f5f9', color: vueGeneraleMode === val ? 'white' : '#555' }}>
              {label}
            </button>
          ))}
          {vueGeneraleMode === 'branche' && (
            <select style={{ ...s.select, marginLeft: 8 }} value={rapportMatiereId} onChange={e => setRapportMatiereId(e.target.value)}>
              <option value="">— Choisir une branche —</option>
              {modeMatieres.map(m => <option key={m.matiere_id} value={m.matiere_id}>{m.matiere_nom}</option>)}
            </select>
          )}
          {vueGeneraleMode === 'eleve' && (
            <select style={{ ...s.select, marginLeft: 8 }} value={rapportEleveId} onChange={e => setRapportEleveId(e.target.value)}>
              <option value="">— Choisir un élève —</option>
              {rapport?.eleves.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
            </select>
          )}
        </div>

        {/* Chargement / erreur */}
        {rapportChargement && <div style={{ ...s.vide, color: '#6366f1' }}>⏳ Chargement des données…</div>}
        {rapportErreur && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 20px', borderRadius: 8, marginBottom: 12, fontWeight: 600 }}>❌ Erreur : {rapportErreur}</div>}

        {/* ---- VUE TOUS ---- */}
        {vueGeneraleMode === 'tous' && rapport && (
          <div ref={printRef} style={{ overflowX: 'auto' }}>
            <table style={{ ...s.tbl, fontSize: 12 }}>
              <thead>
                <tr style={s.theadRow}>
                  <th style={s.th}>Nom</th>
                  <th style={s.th}>Prénom</th>
                  {modeMatieres.map(m => (
                    <th key={m.matiere_id} style={{ ...s.th, textAlign: 'center', width: 40, padding: '0 4px 8px 4px', verticalAlign: 'bottom' }}>
                      <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', height: 100, display: 'flex', alignItems: 'center' }}>{m.matiere_nom}</div>
                    </th>
                  ))}
                  <th style={{ ...s.th, textAlign: 'center' }}>Moy. gén.</th>
                </tr>
              </thead>
              <tbody>
                {rapport.eleves.map((eleve, i) => {
                  const moys = modeMatieres.map(m => moyenneEleveMatiere(m, eleve.id));
                  const valides = moys.filter(v => v !== null);
                  const moyGen = valides.length > 0 ? Math.round(valides.reduce((a, v) => a + v, 0) / valides.length * 10) / 10 : null;
                  return (
                    <tr key={eleve.id} style={{ ...s.tr, background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                      <td style={{ ...s.td, fontWeight: 700 }}>{eleve.nom}</td>
                      <td style={s.td}>{eleve.prenom}</td>
                      {moys.map((moy, j) => (
                        <td key={j} style={{ ...s.td, textAlign: 'center', fontWeight: 700, color: moy !== null ? (moy >= 4 ? '#2e7d32' : '#ef4444') : '#ccc' }}>
                          {moy !== null ? fmtNote(moy) : '—'}
                        </td>
                      ))}
                      <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, fontSize: 14, color: moyGen !== null ? (moyGen >= 4 ? '#2e7d32' : '#ef4444') : '#aaa' }}>
                        {moyGen !== null ? fmtNote(moyGen) : '—'}
                      </td>
                    </tr>
                  );
                })}
                {/* Ligne moyenne de classe par branche */}
                <tr style={{ ...s.tr, background: '#e0e7ff', fontWeight: 700 }}>
                  <td style={{ ...s.td, fontWeight: 700 }} colSpan={2}>Moyenne de la branche</td>
                  {modeMatieres.map(m => {
                    const vals = rapport.eleves.map(e => moyenneEleveMatiere(m, e.id)).filter(v => v !== null);
                    const moy = vals.length > 0 ? Math.round(vals.reduce((a, v) => a + v, 0) / vals.length * 10) / 10 : null;
                    return <td key={m.matiere_id} style={{ ...s.td, textAlign: 'center' }}>{moy !== null ? fmtNote(moy) : '—'}</td>;
                  })}
                  <td style={s.td}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ---- VUE PAR BRANCHE ---- */}
        {vueGeneraleMode === 'branche' && rapport && matiereRapport && (
          <div ref={printRef} style={{ overflowX: 'auto' }}>
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>{matiereRapport.matiere_nom} — {classeNom}</h3>
            <table style={{ ...s.tbl, fontSize: 12 }}>
              <thead>
                <tr style={s.theadRow}>
                  <th style={s.th}>Nom</th>
                  <th style={s.th}>Prénom</th>
                  {matiereRapport.evaluations.map(ev => (
                    <th key={ev.id} style={{ ...s.th, textAlign: 'center' }}>
                      <div>{ev.nom}</div>
                      <div style={{ fontWeight: 400, fontSize: 10, opacity: 0.85 }}>{ev.type} • Coef.{ev.coefficient}</div>
                    </th>
                  ))}
                  <th style={{ ...s.th, textAlign: 'center' }}>Moyenne</th>
                </tr>
              </thead>
              <tbody>
                {rapport.eleves.map((eleve, i) => {
                  const moy = moyenneEleveMatiere(matiereRapport, eleve.id);
                  return (
                    <tr key={eleve.id} style={{ ...s.tr, background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                      <td style={{ ...s.td, fontWeight: 700 }}>{eleve.nom}</td>
                      <td style={s.td}>{eleve.prenom}</td>
                      {matiereRapport.evaluations.map(ev => {
                        const n = ev.notes.find(n => n.eleve_id === eleve.id);
                        const color = n && !n.absent && !n.dispense && n.valeur !== null ? (parseFloat(n.valeur) >= 4 ? '#2e7d32' : '#ef4444') : '#aaa';
                        return (
                          <td key={ev.id} style={{ ...s.td, textAlign: 'center', fontWeight: 700, color }}>
                            {n && n.absent ? 'ABS' : n && n.dispense ? 'DISP' : (n && n.valeur !== null ? fmtNote(n.valeur) : '—')}
                          </td>
                        );
                      })}
                      <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, fontSize: 14, color: moy !== null ? (moy >= 4 ? '#2e7d32' : '#ef4444') : '#aaa' }}>
                        {moy !== null ? fmtNote(moy) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {vueGeneraleMode === 'branche' && !rapportMatiereId && <div style={s.vide}>Sélectionnez une branche</div>}

        {/* ---- VUE PAR ELEVE ---- */}
        {vueGeneraleMode === 'eleve' && rapport && eleveRapport && (
          <div ref={printRef}>
            <h3 style={{ marginBottom: 16, fontSize: 15 }}>{eleveRapport.prenom} {eleveRapport.nom} — {classeNom}</h3>
            {modeMatieres.map(matiere => {
              const moy = moyenneEleveMatiere(matiere, eleveRapport.id);
              return (
                <div key={matiere.matiere_id} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#e0e7ff', padding: '10px 16px', borderRadius: 8, marginBottom: 6 }}>
                    <b style={{ fontSize: 15 }}>{matiere.matiere_nom}</b>
                    {moy !== null
                      ? <span style={{ fontWeight: 700, color: moy >= 4 ? '#2e7d32' : '#ef4444', fontSize: 15 }}>Moyenne : {fmtNote(moy)}</span>
                      : <span style={{ color: '#aaa', fontSize: 13 }}>Aucune note</span>}
                  </div>
                  {matiere.evaluations.length > 0 ? (
                    <table style={{ ...s.tbl, fontSize: 13 }}>
                      <thead>
                        <tr style={s.theadRow}>
                          <th style={s.th}>Évaluation</th>
                          <th style={s.th}>Professeur</th>
                          <th style={s.th}>Date</th>
                          <th style={s.th}>Type</th>
                          <th style={{ ...s.th, textAlign: 'center' }}>Coef.</th>
                          <th style={{ ...s.th, textAlign: 'center' }}>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matiere.evaluations.map((ev, j) => {
                          const n = ev.notes.find(n => n.eleve_id === eleveRapport.id);
                          const valeur = n && !n.absent && !n.dispense ? n.valeur : null;
                          const statut = n && n.absent ? 'ABS' : n && n.dispense ? 'DISP' : null;
                          return (
                            <tr key={ev.id} style={{ ...s.tr, background: j % 2 === 0 ? 'white' : '#fafbfc' }}>
                              <td style={s.td}>{ev.nom}</td>
                              <td style={s.td}>{((ev.prof_prenom || '') + ' ' + (ev.prof_nom || '')).trim() || '—'}</td>
                              <td style={s.td}>{ev.date ? new Date(ev.date).toLocaleDateString('fr-CH') : '—'}</td>
                              <td style={s.td}><span style={s.typeBadge}>{ev.type}</span></td>
                              <td style={{ ...s.td, textAlign: 'center' }}>{ev.coefficient}</td>
                              <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, color: valeur !== null ? (parseFloat(valeur) >= 4 ? '#2e7d32' : '#ef4444') : '#888' }}>
                                {statut || (valeur !== null ? fmtNote(valeur) : '—')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : <div style={{ color: '#aaa', fontSize: 13, padding: '6px 0' }}>Aucune évaluation</div>}
                </div>
              );
            })}
          </div>
        )}
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
          <button style={s.btnRetour} onClick={() => setVue('classes')}>← Retour</button>
          <h2 style={s.titre}>👤 Notes par élève — {classeNom}</h2>
          <select style={s.select} value={eleveSelectionne || ''} onChange={e => setEleveSelectionne(e.target.value)}>
            <option value="">-- Choisir un élève --</option>
            {bulletins.map(b => <option key={b.eleve.id} value={b.eleve.id}>{b.eleve.nom} {b.eleve.prenom}</option>)}
          </select>
          <button style={s.btnImprimer} onClick={handleImprimer}>🖨️ Imprimer</button>
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
  const BULLETIN_CRITERES_LABELS = [
    "Je viens à l'école régulièrement.",
    "Je suis à l'heure.",
    "Je respecte le règlement et la charte de l'école.",
    "Je participe activement en classe.",
    "J'écoute les consignes.",
    "Je parle français en classe.",
    "Je travaille sans déranger la classe.",
    "Je fais mon travail à la maison.",
    "Je prends soin du matériel.",
    "J'organise mon classeur.",
  ];
  const cycleCouleur = (v) => (v === '' ? 'vert' : v === 'vert' ? 'orange' : v === 'orange' ? 'rouge' : '');

  if (vue === 'bulletin') {
    const titulaireNom = classeObj ? [classeObj.prof_prenom, classeObj.prof_nom].filter(Boolean).join(' ') || '—' : '—';
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
      };
      await axios.put(API + '/notes/bulletin-criteres/' + eleveId, payload, { headers });
      const res = await axios.get(API + '/notes/bulletin-criteres?classe_id=' + classeSelectionnee, { headers });
      setBulletinCriteres(res.data || []);
    };

    const toutVert = async () => {
      for (const b of bulletins) {
        await sauvegarderCriteres(b.eleve.id, { c1: 'vert', c2: 'vert', c3: 'vert', c4: 'vert', c5: 'vert', c6: 'vert', c7: 'vert', c8: 'vert', c9: 'vert', c10: 'vert' });
      }
      const res = await axios.get(API + '/notes/bulletin-criteres?classe_id=' + classeSelectionnee, { headers });
      setBulletinCriteres(res.data || []);
    };

    const toggleValide = async (eleveId) => {
      const cr = bulletinCriteres.find(c => Number(c.eleve_id) === Number(eleveId));
      await sauvegarderCriteres(eleveId, { valide: !(cr && cr.valide) });
    };

    return (
      <div style={s.page}>
        <style>{`@media print { .no-print { display: none !important; } body { margin: 0; } }`}</style>
        <div style={s.header} className="no-print">
          <button style={s.btnRetour} onClick={() => setVue('classes')}>← Retour</button>
          <h2 style={s.titre}>📄 Bulletin — {classeNom}</h2>
          {bulletinOnglet === 'notes' && (
            <button style={s.btnImprimer} onClick={handleImprimer}>
              🖨️ Imprimer
            </button>
          )}
        </div>
        {renderActionsBar('no-print')}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, background: 'white', padding: '12px 16px', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {[{ id: 'criteres', label: 'Critères de comportements' }, { id: 'notes', label: 'Bulletin de notes' }].map(t => (
              <button key={t.id} onClick={() => setBulletinOnglet(t.id)}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: bulletinOnglet === t.id ? '#6366f1' : '#f1f5f9', color: bulletinOnglet === t.id ? 'white' : '#555' }}>
                {t.label}
              </button>
            ))}
            {bulletinOnglet === 'criteres' ? (
              <button type="button" style={{ padding: '8px 16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }} onClick={toutVert}>
                Tout mettre au vert
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {[{ id: 'tous', label: 'Tous' }, { id: 'eleve', label: 'Par élève' }].map(m => (
                <button key={m.id} onClick={() => setBulletinMode(m.id)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: bulletinMode === m.id ? '#6366f1' : '#f1f5f9', color: bulletinMode === m.id ? 'white' : '#555' }}>
                  {m.label}
                </button>
              ))}
              {bulletinMode === 'eleve' && (
                <select style={s.select} value={eleveSelectionne || ''} onChange={e => setEleveSelectionne(e.target.value)}>
                  <option value="">-- Choisir un élève --</option>
                  {bulletins.map(b => <option key={b.eleve.id} value={b.eleve.id}>{b.eleve.nom} {b.eleve.prenom}</option>)}
                </select>
              )}
              </div>
            )}
          </div>
        </div>

        {bulletinOnglet === 'criteres' && (
          <>
            <div className="no-print" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Titulaire : {titulaireNom}</div>
            </div>

            <div style={{ ...s.tableContainer, marginBottom: 24 }} className="no-print">
              <table style={{ ...s.tbl, fontSize: 12, tableLayout: 'fixed' }}>
                <thead>
                  <tr style={s.theadRow}>
                    <th style={{ ...s.th, width: 120, minWidth: 100 }}>Élève</th>
                    {BULLETIN_CRITERES_LABELS.map((label, i) => (
                      <th key={i} style={{ ...s.th, width: 58, minWidth: 52, textAlign: 'justify', textJustify: 'inter-word', fontSize: 9, lineHeight: 1.2, whiteSpace: 'normal' }} title={label}>{label}</th>
                    ))}
                    <th style={{ ...s.th, width: 60, textAlign: 'center' }}>Absences</th>
                    <th style={{ ...s.th, width: 70, textAlign: 'center', lineHeight: 1.2 }}>Taux<br />présence</th>
                    <th style={{ ...s.th, width: 60, textAlign: 'center' }}>Retards</th>
                    <th style={{ ...s.th, width: 120, textAlign: 'justify', textJustify: 'inter-word' }}>Remarques</th>
                    <th style={{ ...s.th, width: 100, textAlign: 'center' }}>Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {bulletins.length === 0 ? (
                    <tr><td colSpan={16} style={s.vide}>Aucun élève</td></tr>
                  ) : bulletins.map((b, idx) => {
                    const st = bulletinStatsPresences.find(s => Number(s.eleve_id) === Number(b.eleve.id));
                    const cr = bulletinCriteres.find(c => Number(c.eleve_id) === Number(b.eleve.id)) || {};
                    const presents = Number(st?.presents) || 0;
                    const retards = Number(st?.retards) || 0;
                    const absents = Number(st?.absents) || 0;
                    const excuses = Number(st?.excuses) || 0;
                    const conges = Number(st?.conges) || 0;
                    const totalPeriodes = presents + absents + retards + excuses + conges;
                    const tauxBN = totalPeriodes > 0 ? Math.round(((presents + retards) / totalPeriodes) * 1000) / 10 : null;
                    return (
                      <tr key={b.eleve.id} style={{ ...s.tr, background: idx % 2 === 0 ? 'white' : '#fafbfc' }}>
                        <td style={s.td}><b>{b.eleve.nom}</b> {b.eleve.prenom}</td>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                          const key = 'c' + n;
                          const val = cr[key] || '';
                          const bg = val === 'vert' ? '#dcfce7' : val === 'orange' ? '#ffedd5' : val === 'rouge' ? '#fee2e2' : '#f8fafc';
                          return (
                            <td key={key} style={{ ...s.td, padding: 4, textAlign: 'center', background: bg, cursor: 'pointer' }} title={BULLETIN_CRITERES_LABELS[n - 1]}
                              onClick={async () => {
                                const next = cycleCouleur(val);
                                await sauvegarderCriteres(b.eleve.id, { [key]: next });
                              }}>
                              {val ? <span style={{ width: 14, height: 14, borderRadius: '50%', display: 'inline-block', background: val === 'vert' ? '#22c55e' : val === 'orange' ? '#f97316' : '#ef4444' }} /> : '—'}
                            </td>
                          );
                        })}
                        <td style={{ ...s.td, textAlign: 'center', fontWeight: 600 }}>{st?.absents ?? '—'}</td>
                        <td style={{ ...s.td, textAlign: 'center', fontWeight: 600 }}>{tauxBN != null ? tauxBN + '%' : '—'}</td>
                        <td style={{ ...s.td, textAlign: 'center', fontWeight: 600 }}>{st?.retards ?? '—'}</td>
                        <td style={s.td}>
                          <input type="text"
                            value={bulletinRemarqueEdit[b.eleve.id] !== undefined ? bulletinRemarqueEdit[b.eleve.id] : (cr.remarques || '')}
                            style={{ width: '100%', padding: '4px 6px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 6 }}
                            onFocus={e => setBulletinRemarqueEdit(prev => ({ ...prev, [b.eleve.id]: cr.remarques || '' }))}
                            onChange={e => setBulletinRemarqueEdit(prev => ({ ...prev, [b.eleve.id]: e.target.value }))}
                            onBlur={async e => {
                              const v = e.target.value;
                              setBulletinRemarqueEdit(prev => { const p = { ...prev }; delete p[b.eleve.id]; return p; });
                              if (v !== (cr.remarques || '')) await sauvegarderCriteres(b.eleve.id, { remarques: v });
                            }}
                            placeholder="Remarques"
                          />
                        </td>
                        <td style={{ ...s.td, textAlign: 'center' }}>
                          <button type="button" style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: cr.valide ? '#dcfce7' : 'white', color: cr.valide ? '#166534' : '#475569', fontWeight: 600 }}
                            onClick={() => toggleValide(b.eleve.id)}>
                            {cr.valide ? 'Bulletin validé' : 'Valider bulletin'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {bulletinOnglet === 'notes' && bulletinsAImprimer.length > 0 && (
          <div ref={printRef}>
            {bulletinsAImprimer.map((bulletin, bi) => {
              const st = bulletinStatsPresences.find(s => Number(s.eleve_id) === Number(bulletin.eleve.id));
              const cr = bulletinCriteres.find(c => Number(c.eleve_id) === Number(bulletin.eleve.id)) || {};
              const parMatiere = Object.entries(bulletin.parMatiere || {});
              const principales = parMatiere.filter(([, d]) => Number(d.coefficient || 1) >= 2);
              const secondaires = parMatiere.filter(([, d]) => Number(d.coefficient || 1) < 2);
              const sourcePrincipales = principales.length ? principales : parMatiere;
              const sourceSecondaires = secondaires.length ? secondaires : [];
              const moyPrin = sourcePrincipales.length
                ? sourcePrincipales.reduce((acc, [, d]) => acc + (parseFloat(d.moyenne) || 0), 0) / sourcePrincipales.length
                : null;
              const moySec = sourceSecondaires.length
                ? sourceSecondaires.reduce((acc, [, d]) => acc + (parseFloat(d.moyenne) || 0), 0) / sourceSecondaires.length
                : null;
              return (
                <div key={bulletin.eleve.id} style={{ ...s.bulletinPDF, pageBreakAfter: bi < bulletinsAImprimer.length - 1 ? 'always' : 'auto', marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <img
                      src="/logo-etat-du-valais.png"
                      alt="Logo État du Valais"
                      style={{ width: 90, height: 'auto', objectFit: 'contain', flexShrink: 0 }}
                    />
                    <div style={{ fontSize: 12, lineHeight: 1.35 }}>
                      <div>Département de la santé, des affaires sociales et de la culture</div>
                      <div>Service de l'action sociale</div>
                      <div>Office de l'asile</div>
                      <div>Centre de formation "Le Botza"</div>
                      <div>Zone Industrielle 4, 1963 Vétroz</div>
                      <div>Tél. 027 606 18 60</div>
                    </div>
                  </div>
                  <div style={s.bulletinPDFHeader}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20 }}>BULLETIN DE NOTES</div>
                      <div style={{ fontSize: 13, color: '#334155', marginTop: 5 }}>Classe : <b>{classeNom}</b></div>
                      <div style={{ fontSize: 13, color: '#334155' }}>Date : Vétroz, le {new Date().toLocaleDateString('fr-CH')}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 13 }}>
                      <div><b>NOM Prénom :</b> {bulletin.eleve.prenom} {bulletin.eleve.nom}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <table style={s.tbl}>
                        <thead>
                          <tr style={s.theadRow}>
                            <th style={s.th}>Branches principales</th>
                            <th style={{ ...s.th, textAlign: 'center' }}>Sem. 1</th>
                            <th style={{ ...s.th, textAlign: 'center' }}>Sem. 2</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sourcePrincipales.map(([nom, d]) => (
                            <tr key={'p-' + nom} style={s.tr}>
                              <td style={s.td}>{nom}</td>
                              <td style={{ ...s.td, textAlign: 'center' }}>{fmtNote(d.moyenne)}</td>
                              <td style={{ ...s.td, textAlign: 'center' }}>{fmtNote(d.moyenne)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <table style={s.tbl}>
                        <thead>
                          <tr style={s.theadRow}>
                            <th style={s.th}>Branche secondaires</th>
                            <th style={{ ...s.th, textAlign: 'center' }}>Sem. 1</th>
                            <th style={{ ...s.th, textAlign: 'center' }}>Sem. 2</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(secondaires.length ? secondaires : []).map(([nom, d]) => (
                            <tr key={'s-' + nom} style={s.tr}>
                              <td style={s.td}>{nom}</td>
                              <td style={{ ...s.td, textAlign: 'center' }}>{fmtNote(d.moyenne)}</td>
                              <td style={{ ...s.td, textAlign: 'center' }}>{fmtNote(d.moyenne)}</td>
                            </tr>
                          ))}
                          {secondaires.length === 0 && <tr><td colSpan="3" style={s.vide}>—</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
                    <div style={{ ...s.card, padding: 12 }}>
                      <div style={{ fontSize: 13, marginBottom: 5 }}>Moyenne branches principales : <b>{fmtNote(moyPrin)}</b></div>
                    </div>
                    <div style={{ ...s.card, padding: 12 }}>
                      <div style={{ fontSize: 13, marginBottom: 5 }}>Moyenne branches secondaires : <b>{fmtNote(moySec)}</b></div>
                    </div>
                  </div>

                  <div style={{ ...s.card, padding: 12, marginTop: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Moyenne annuelle : <b>{fmtNote(bulletin.moyenneGenerale)}</b></div>
                  </div>

                  <div style={{ ...s.card, padding: 12, marginTop: 12 }}>
                    <div style={{ fontSize: 13, marginBottom: 5 }}>Absences excusées : <b>{st?.excuses ?? 0}</b></div>
                    <div style={{ fontSize: 13 }}>Absences non excusées : <b>{st?.absents ?? 0}</b></div>
                  </div>

                  <div style={{ ...s.card, padding: 12, marginTop: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Observations</div>
                    <div style={{ fontSize: 13 }}>{cr.remarques && String(cr.remarques).trim() ? cr.remarques : '—'}</div>
                  </div>

                  <div style={s.signatures}>
                    <div style={s.signatureBox}><div style={s.signatureLine}></div><div style={s.signatureLabel}>Signature {articleSelonSexe(classeObj?.prof_sexe)} titulaire</div></div>
                    <div style={s.signatureBox}><div style={s.signatureLine}></div><div style={s.signatureLabel}>Signature {articleSelonSexe(responsableNiveauSexe)} responsable de niveau{responsableNiveauNom ? ` (${responsableNiveauNom})` : ''}</div></div>
                    <div style={s.signatureBox}><div style={s.signatureLine}></div><div style={s.signatureLabel}>Signature {articleSelonSexe(responsableCoursSexe)} responsable des cours{responsableCoursNom ? ` (${responsableCoursNom})` : ''}</div></div>
                  </div>
                </div>
              );
            })}
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
          <h2 style={s.titre}>📝 {matiereObj?.nom} — {classeNom}</h2>
          {peutModifierNotes() && <button style={s.btnAjouter} onClick={() => setShowForm(!showForm)}>+ Nouvelle évaluation</button>}
        </div>

        {showForm && (
          <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
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
                    <select style={s.input} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
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
        <table style={s.tbl}>
          <thead>
            <tr style={s.theadRow}>
              {['Actions', 'Désignation', 'Professeur', 'Date', 'Type', 'Pts max', 'Coef.'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
              <th style={{ ...s.th, textAlign: 'center' }}>Statut</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Moyenne</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.length === 0 ? (
              <tr><td colSpan="9" style={s.vide}>Aucune évaluation — cliquez sur + Nouvelle évaluation</td></tr>
            ) : evaluations.map((ev, i) => (
              <tr key={ev.id} style={{ ...s.tr, background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                <td style={s.td}>
                  <button style={s.btnOuvrir} title="Saisir les notes" onClick={() => ouvrirEvaluation(ev)}>📋</button>
                  {peutModifierNotes() && <button style={s.btnDelete} title="Modifier l'évaluation" onClick={() => ouvrirEditionEvaluation(ev)}>✏️</button>}
                  {isAdmin() && <button style={s.btnDelete} onClick={() => handleSupprimerEvaluation(ev.id)}>🗑️</button>}
                </td>
                <td style={{ ...s.td, fontWeight: 700, color: '#6366f1', cursor: 'pointer' }} onClick={() => ouvrirEvaluation(ev)}>{ev.nom}</td>
                <td style={s.td}>{((ev.prof_prenom || '') + ' ' + (ev.prof_nom || '')).trim() || '—'}</td>
                <td style={s.td}>{ev.date ? new Date(ev.date).toLocaleDateString('fr-CH') : '—'}</td>
                <td style={s.td}><span style={s.typeBadge}>{ev.type}</span></td>
                <td style={s.td}>{ev.points_max && parseFloat(ev.points_max) > 0 ? ev.points_max : '—'}</td>
                <td style={s.td}>{ev.coefficient}</td>
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
          <button style={s.btnRetour} onClick={() => setVue('classes')}>← Retour</button>
          <h2 style={s.titre}>📚 Matières — {classeNom}</h2>
        </div>
        {renderActionsBar()}
        <div style={s.tblWrap}>
        <table style={s.tbl}>
          <thead>
            <tr style={s.theadRow}>
              <th style={s.th}>Actions</th>
              <th style={s.th}>Matière</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Évaluations</th>
            </tr>
          </thead>
          <tbody>
            {matieres.filter(m => !classeObj?.niveau || m.niveau === classeObj.niveau).length === 0 ? (
              <tr><td colSpan="3" style={s.vide}>Aucune matière disponible pour ce niveau</td></tr>
            ) : matieres.filter(m => !classeObj?.niveau || m.niveau === classeObj.niveau).map((m, i) => {
              const nbEvals = evaluations.filter(ev => ev.matiere_id === m.id).length;
              return (
                <tr key={m.id} style={{ ...s.tr, background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                  <td style={s.td}>
                    <button style={s.btnEdit} onClick={() => ouvrirMatiere(m)}>📋 Ouvrir</button>
                  </td>
                  <td style={{ ...s.td, fontWeight: 700, color: '#0f172a' }}>{m.nom}</td>
                  <td style={{ ...s.td, textAlign: 'center' }}>
                    <span style={{ ...s.badge, background: nbEvals > 0 ? '#e0e7ff' : '#f1f5f9', color: nbEvals > 0 ? '#4338ca' : '#94a3b8' }}>
                      {nbEvals} éval{nbEvals !== 1 ? 's' : ''}
                    </span>
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
  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={s.titre}>📝 Notes & Bulletins</h2>
      </div>
      {renderActionsBar()}
      <div style={s.tblWrap}>
        <div style={s.vide}>
          {classeSelectionnee
            ? 'Chargement de la vue sélectionnée...'
            : 'Sélectionnez une classe pour afficher les données.'}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { padding: '24px 28px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  btnRetour: { padding: '7px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#475569' },
  btnTopAction: { padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  titre: { fontSize: 20, fontWeight: 700, flex: 1, color: '#0f172a' },
  evalInfo: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  select: { padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: 'white', color: '#374151' },
  moyenneBox: { background: 'white', padding: '10px 18px', borderRadius: 10, textAlign: 'center', border: '1px solid #e2e8f0' },
  moyenneLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
  moyenneValeur: { fontSize: 22, fontWeight: 700, color: '#6366f1' },
  btnSauver: { padding: '8px 18px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnImprimer: { padding: '7px 14px', background: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  successMsg: { background: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: 8, marginBottom: 12, fontWeight: 600, fontSize: 13 },
  tableContainer: { overflowX: 'auto', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  tblWrap: { overflowX: 'auto', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  btnAjouter: { padding: '7px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  tbl: { width: '100%', borderCollapse: 'collapse', background: 'white' },
  theadRow: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f8fafc' },
  td: { padding: '10px 14px', fontSize: 13, color: '#374151' },
  vide: { padding: 40, textAlign: 'center', color: '#94a3b8', background: 'white' },
  typeBadge: { background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 },
  btnOuvrir: { padding: '5px 10px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, marginRight: 6 },
  btnDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, opacity: 0.7 },
  btnEdit: { padding: '4px 10px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginRight: 6 },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 },
  noteInput: { width: 72, padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 15, fontWeight: 700, textAlign: 'center' },
  commentInput: { padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, width: 160 },
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
