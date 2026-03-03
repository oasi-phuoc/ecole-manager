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
  const [eleveSelectionne, setEleveSelectionne] = useState(null);
  const [matiereSelectionnee, setMatiereSelectionnee] = useState('');
  const [classeSelectionnee, setClasseSelectionnee] = useState('');
  const [classeObj, setClasseObj] = useState(null);
  const [matiereObj, setMatiereObj] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [form, setForm] = useState({ nom: '', matiere_id: '', date: new Date().toISOString().split('T')[0], type: 'Ecrit', coefficient: '1', sur: '6', points_max: '30' });
  const printRef = useRef();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };
  const currentUser = JSON.parse(localStorage.getItem('utilisateur') || '{}');
  const profNomSession = ((currentUser.prenom || '') + ' ' + (currentUser.nom || '')).trim() || '—';
  const todayFormatted = new Date().toLocaleDateString('fr-CH');

  useEffect(() => { chargerClasses(); chargerMatieres(); }, []);

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

  const chargerEvaluationsId = async (classeId, matiereId) => {
    try {
      let url = API + '/notes?classe_id=' + classeId;
      if (matiereId) url += '&matiere_id=' + matiereId;
      const res = await axios.get(url, { headers });
      setEvaluations(res.data);
      return res.data;
    } catch (err) { console.error(err); return []; }
  };

  const chargerBulletinId = async (classeId) => {
    try {
      const res = await axios.get(API + '/notes/bulletin?classe_id=' + classeId, { headers });
      setBulletins(res.data);
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
    setForm({ nom: '', matiere_id: m.id, date: new Date().toISOString().split('T')[0], type: 'Ecrit', coefficient: '1', sur: '6', points_max: '30' });
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

  const handleCreerEvaluation = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API + '/notes', {
        ...form,
        classe_id: classeSelectionnee,
        prof_id: currentUser.id || null
      }, { headers });
      setShowForm(false);
      setForm({ nom: '', matiere_id: matiereObj?.id || '', date: new Date().toISOString().split('T')[0], type: 'Ecrit', coefficient: '1', sur: '6', points_max: '30' });
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
          : (e.note !== '' ? parseFloat(e.note) : null),
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

  const handleImprimer = () => { window.print(); };
  const classeNom = classeObj?.nom || '';

  // ===================== VUE SAISIE NOTES =====================
  if (vue === 'saisie' && evaluationOuverte) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <button style={s.btnRetour} onClick={() => { setVue('evaluations'); chargerEvaluationsId(classeSelectionnee, matiereSelectionnee); }}>← Retour</button>
          <div style={{ flex: 1 }}>
            <h2 style={s.titre}>{evaluationOuverte.nom}</h2>
            <div style={s.evalInfo}>{evaluationOuverte.matiere} • {evaluationOuverte.type}{evaluationOuverte.points_max && parseFloat(evaluationOuverte.points_max) > 0 ? ` • Points max : ${evaluationOuverte.points_max}` : ''} • Coef. {evaluationOuverte.coefficient} • {profNomSession}</div>
          </div>
          <div style={s.moyenneBox}>
            <div style={s.moyenneLabel}>Moyenne classe</div>
            <div style={s.moyenneValeur}>{(() => { const m = getMoyenneClasse(); return m === '—' ? '—' : m + '/6'; })()}</div>
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
                          {eleve.absent ? 'ABS' : eleve.dispense ? 'DISP' : note !== null ? parseFloat(note).toFixed(1) + '/6' : '—'}
                        </span>
                      ) : eleve.absent || eleve.dispense ? (
                        <span style={{ fontWeight: 700, fontSize: 16, color: '#888' }}>{eleve.absent ? 'ABS' : 'DISP'}</span>
                      ) : (
                        <input style={{ ...s.noteInput, color: noteDirecte !== null ? (noteDirecte >= 4 ? '#2e7d32' : '#ef4444') : '#333' }}
                          type="number" min="1" max="6" step="0.1"
                          value={eleve.note} placeholder="—"
                          onChange={ev => { const c = [...elevesNotes]; c[i].note = ev.target.value; setElevesNotes(c); }} />
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
    return (
      <div style={s.page}>
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
        <div style={s.header} className="no-print">
          <button style={s.btnRetour} onClick={() => setVue('classes')}>← Retour</button>
          <h2 style={s.titre}>📊 Vue générale — {classeNom}</h2>
          <button style={s.btnImprimer} onClick={handleImprimer}>🖨️ Imprimer</button>
        </div>
        <div ref={printRef}>
          <h3 style={{ textAlign: 'center', marginBottom: 15, fontSize: 16 }}>Liste de contrôle des notes — {classeNom}</h3>
          <table style={{ ...s.tbl, fontSize: 12 }}>
            <thead>
              <tr style={s.theadRow}>
                <th style={{ ...s.th, minWidth: 140 }}>Élève</th>
                {matieres.filter(m => bulletins.some(b => b.parMatiere[m.nom])).map(m => (
                  <th key={m.id} style={{ ...s.th, textAlign: 'center', minWidth: 70 }}>{m.nom}</th>
                ))}
                <th style={{ ...s.th, textAlign: 'center' }}>Moy. gén.</th>
              </tr>
            </thead>
            <tbody>
              {bulletins.map((b, i) => (
                <tr key={i} style={{ ...s.tr, background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                  <td style={s.td}><b>{b.eleve.nom} {b.eleve.prenom}</b></td>
                  {matieres.filter(m => bulletins.some(b2 => b2.parMatiere[m.nom])).map(m => {
                    const data = b.parMatiere[m.nom];
                    return (
                      <td key={m.id} style={{ ...s.td, textAlign: 'center', color: data ? (data.moyenne >= 4 ? '#2e7d32' : '#ef4444') : '#ccc', fontWeight: data ? 700 : 400 }}>
                        {data ? parseFloat(data.moyenne).toFixed(1) : '—'}
                      </td>
                    );
                  })}
                  <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, color: b.moyenneGenerale >= 4 ? '#2e7d32' : '#ef4444', fontSize: 14 }}>
                    {b.moyenneGenerale > 0 ? parseFloat(b.moyenneGenerale).toFixed(1) : '—'}
                  </td>
                </tr>
              ))}
              <tr style={{ ...s.tr, background: '#e0e7ff', fontWeight: 700 }}>
                <td style={s.td}>Moyenne de la matière</td>
                {matieres.filter(m => bulletins.some(b => b.parMatiere[m.nom])).map(m => {
                  const vals = bulletins.map(b => b.parMatiere[m.nom]?.moyenne).filter(v => v !== undefined);
                  const moy = vals.length > 0 ? Math.round(vals.reduce((a, v) => a + parseFloat(v), 0) / vals.length * 10) / 10 : null;
                  return <td key={m.id} style={{ ...s.td, textAlign: 'center' }}>{moy ? parseFloat(moy).toFixed(1) : '—'}</td>;
                })}
                <td style={s.td}></td>
              </tr>
            </tbody>
          </table>
        </div>
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

  // ===================== VUE BULLETIN PDF =====================
  if (vue === 'bulletin') {
    const bulletin = bulletins.find(b => b.eleve.id === parseInt(eleveSelectionne));
    return (
      <div style={s.page}>
        <style>{`@media print { .no-print { display: none !important; } body { margin: 0; } }`}</style>
        <div style={s.header} className="no-print">
          <button style={s.btnRetour} onClick={() => setVue('classes')}>← Retour</button>
          <h2 style={s.titre}>📄 Bulletin de notes — {classeNom}</h2>
          <select style={s.select} value={eleveSelectionne || ''} onChange={e => setEleveSelectionne(e.target.value)}>
            <option value="">-- Choisir un élève --</option>
            {bulletins.map(b => <option key={b.eleve.id} value={b.eleve.id}>{b.eleve.nom} {b.eleve.prenom}</option>)}
          </select>
          <button style={s.btnImprimer} onClick={handleImprimer}>🖨️ Imprimer / PDF</button>
        </div>
        {bulletin ? (
          <div ref={printRef} style={s.bulletinPDF}>
            <div style={s.bulletinPDFHeader}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>BULLETIN DE NOTES</div>
                <div style={{ fontSize: 13, color: '#555', marginTop: 5 }}>Classe : <b>{classeNom}</b></div>
                <div style={{ fontSize: 13, color: '#555' }}>Date : {new Date().toLocaleDateString('fr-CH')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{bulletin.eleve.prenom} {bulletin.eleve.nom}</div>
              </div>
            </div>
            <table style={{ ...s.tbl, marginTop: 20 }}>
              <thead>
                <tr style={s.theadRow}>
                  <th style={s.th}>Matière</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Coef.</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Nb éval.</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Moyenne /6</th>
                  <th style={s.th}>Appréciation</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(bulletin.parMatiere).map(([matierNom, data]) => {
                  const m = getMention(data.moyenne);
                  return (
                    <tr key={matierNom} style={s.tr}>
                      <td style={s.td}><b>{matierNom}</b></td>
                      <td style={{ ...s.td, textAlign: 'center' }}>{data.coefficient}</td>
                      <td style={{ ...s.td, textAlign: 'center' }}>{data.nbNotes}</td>
                      <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, color: m.color }}>{parseFloat(data.moyenne).toFixed(1)}</td>
                      <td style={{ ...s.td, color: m.color }}>{m.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={s.moyenneGeneraleBox}>
              Moyenne générale :
              <b style={{ fontSize: 22, color: bulletin.moyenneGenerale >= 4 ? '#2e7d32' : '#ef4444' }}>
                {parseFloat(bulletin.moyenneGenerale).toFixed(1)}/6
              </b>
              <span style={{ marginLeft: 15, color: getMention(bulletin.moyenneGenerale).color, fontWeight: 600 }}>
                {getMention(bulletin.moyenneGenerale).label}
              </span>
            </div>
            <div style={s.signatures}>
              <div style={s.signatureBox}><div style={s.signatureLine}></div><div style={s.signatureLabel}>Signature du directeur</div></div>
              <div style={s.signatureBox}><div style={s.signatureLine}></div><div style={s.signatureLabel}>Signature du titulaire</div></div>
              <div style={s.signatureBox}><div style={s.signatureLine}></div><div style={s.signatureLabel}>Signature de l'élève</div></div>
            </div>
          </div>
        ) : <div style={s.vide}>Sélectionnez un élève</div>}
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
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Nouvelle évaluation</h3>
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
                    <input style={s.input} type="number" step="0.5" value={form.points_max}
                      onChange={e => setForm({ ...form, points_max: e.target.value })} />
                  </div>
                  <div style={s.formChamp}>
                    <label style={s.label}>Coefficient</label>
                    <input style={s.input} type="number" step="0.1" value={form.coefficient}
                      onChange={e => setForm({ ...form, coefficient: e.target.value })} />
                  </div>
                </div>
                <div style={s.formActions}>
                  <button type="button" style={s.btnAnnuler} onClick={() => setShowForm(false)}>Annuler</button>
                  <button type="submit" style={s.btnSauver}>Créer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <table style={s.tbl}>
          <thead>
            <tr style={s.theadRow}>
              {['Actions', 'Désignation', 'Date', 'Type', 'Pts max', 'Coef.'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
              <th style={{ ...s.th, textAlign: 'center' }}>Moyenne</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.length === 0 ? (
              <tr><td colSpan="7" style={s.vide}>Aucune évaluation — cliquez sur + Nouvelle évaluation</td></tr>
            ) : evaluations.map((ev, i) => (
              <tr key={ev.id} style={{ ...s.tr, background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                <td style={s.td}>
                  <button style={s.btnOuvrir} title="Saisir les notes" onClick={() => ouvrirEvaluation(ev)}>✏️</button>
                  {isAdmin() && <button style={s.btnDelete} onClick={() => handleSupprimerEvaluation(ev.id)}>🗑️</button>}
                </td>
                <td style={{ ...s.td, fontWeight: 700, color: '#6366f1', cursor: 'pointer' }} onClick={() => ouvrirEvaluation(ev)}>{ev.nom}</td>
                <td style={s.td}>{ev.date ? new Date(ev.date).toLocaleDateString('fr-CH') : '—'}</td>
                <td style={s.td}><span style={s.typeBadge}>{ev.type}</span></td>
                <td style={s.td}>{ev.points_max && parseFloat(ev.points_max) > 0 ? ev.points_max : '—'}</td>
                <td style={s.td}>{ev.coefficient}</td>
                <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, fontSize: 15, color: ev.moyenne_classe != null && !isNaN(parseFloat(ev.moyenne_classe)) ? (parseFloat(ev.moyenne_classe) >= 4 ? '#2e7d32' : '#ef4444') : '#aaa' }}>
                  {ev.moyenne_classe != null && !isNaN(parseFloat(ev.moyenne_classe)) ? parseFloat(ev.moyenne_classe).toFixed(1) + '/6' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    );
  }

  // ===================== VUE CLASSES (point d'entrée) =====================
  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={s.titre}>📝 Notes & Bulletins</h2>
      </div>
      <table style={s.tbl}>
        <thead>
          <tr style={s.theadRow}>
            <th style={s.th}>Classe</th>
            <th style={s.th}>Niveau</th>
            <th style={s.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {classes.length === 0 ? (
            <tr><td colSpan="3" style={s.vide}>Aucune classe disponible</td></tr>
          ) : classes.map((cl, i) => (
            <tr key={cl.id} style={{ ...s.tr, background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
              <td style={{ ...s.td, fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{cl.nom}</td>
              <td style={s.td}>{cl.niveau || '—'}</td>
              <td style={s.td}>
                <button style={s.btnEdit} onClick={() => ouvrirClasse(cl)}>📝 Évaluations</button>
                <button style={{ ...s.btnEdit, background: '#f3e5f5', color: '#7b1fa2' }}
                  onClick={async () => { setClasseObj(cl); setClasseSelectionnee(cl.id); await chargerEvaluationsId(cl.id, null); await chargerBulletinId(cl.id); setVue('generale'); }}>
                  📊 Vue générale
                </button>
                <button style={{ ...s.btnEdit, background: '#fce4ec', color: '#c62828' }}
                  onClick={async () => { setClasseObj(cl); setClasseSelectionnee(cl.id); await chargerBulletinId(cl.id); setVue('bulletin'); }}>
                  📄 Bulletin
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const s = {
  page: { padding: 20, background: '#f8fafc', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20, flexWrap: 'wrap' },
  btnRetour: { padding: '8px 16px', background: 'white', border: '2px solid #e0e0e0', borderRadius: 8, cursor: 'pointer' },
  titre: { fontSize: 24, fontWeight: 700, flex: 1 },
  evalInfo: { fontSize: 13, color: '#888', marginTop: 3 },
  select: { padding: 10, border: '2px solid #e0e0e0', borderRadius: 8, fontSize: 14 },
  moyenneBox: { background: 'white', padding: '10px 20px', borderRadius: 12, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  moyenneLabel: { fontSize: 12, color: '#888' },
  moyenneValeur: { fontSize: 24, fontWeight: 700, color: '#6366f1' },
  btnSauver: { padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  btnImprimer: { padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  successMsg: { background: '#d1fae5', color: '#065f46', padding: '12px 20px', borderRadius: 8, marginBottom: 15, fontWeight: 600 },
  tableContainer: { background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  btnAjouter: { padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  tbl: { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  theadRow: { background: '#6366f1', color: 'white' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '10px 16px', fontSize: 14 },
  vide: { padding: 40, textAlign: 'center', color: '#888', background: 'white', borderRadius: 12 },
  typeBadge: { background: '#e0e7ff', color: '#4338ca', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  btnOuvrir: { padding: '6px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, marginRight: 8 },
  btnDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 },
  btnEdit: { padding: '5px 12px', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginRight: 6 },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  noteInput: { width: 80, padding: 8, border: '2px solid #e0e0e0', borderRadius: 8, fontSize: 16, fontWeight: 700, textAlign: 'center' },
  commentInput: { padding: '6px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13, width: 180 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 },
  formChamp: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: 13, fontWeight: 600, marginBottom: 5, color: '#555' },
  input: { padding: 10, border: '2px solid #e0e0e0', borderRadius: 8, fontSize: 14 },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  btnAnnuler: { padding: '10px 20px', background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer' },
  card: { background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', borderRadius: 16, padding: 30, maxWidth: 560, width: '95%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' },
  infoBox: { background: '#f1f5f9', borderRadius: 8, padding: '10px 16px', minWidth: 160 },
  infoLabel: { fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  infoValue: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
  bulletinMatiereTitre: { display: 'flex', alignItems: 'center', background: '#e0e7ff', padding: '10px 16px', borderRadius: 8, marginBottom: 8, fontWeight: 600 },
  moyenneGeneraleBox: { background: '#e0e7ff', padding: '16px 20px', borderRadius: 12, marginTop: 20, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 },
  bulletinPDF: { background: 'white', padding: 30, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', maxWidth: 800, margin: '0 auto' },
  bulletinPDFHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 20, borderBottom: '2px solid #e0e0e0' },
  signatures: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 40 },
  signatureBox: { textAlign: 'center' },
  signatureLine: { height: 1, background: '#333', marginBottom: 8 },
  signatureLabel: { fontSize: 12, color: '#555' },
};
