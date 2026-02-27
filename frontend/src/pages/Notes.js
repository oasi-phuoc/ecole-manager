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
  if (moyenne >= 4.5) return { label: 'Bien', color: '#1a73e8' };
  if (moyenne >= 4) return { label: 'Suffisant', color: '#fbbc04' };
  if (moyenne >= 3.5) return { label: 'Insuffisant', color: '#ff9800' };
  return { label: 'Très Insuffisant', color: '#ea4335' };
};

export default function Notes() {
  const [vue, setVue] = useState('menu');
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [evaluationOuverte, setEvaluationOuverte] = useState(null);
  const [elevesNotes, setElevesNotes] = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [eleveSelectionne, setEleveSelectionne] = useState(null);
  const [matiereSelectionnee, setMatiereSelectionnee] = useState('');
  const [classeSelectionnee, setClasseSelectionnee] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [form, setForm] = useState({ nom: '', matiere_id: '', date: new Date().toISOString().split('T')[0], type: 'Ecrit', coefficient: '1', sur: '6', points_max: '30' });
  const printRef = useRef();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerClasses(); chargerMatieres(); }, []);
  useEffect(() => { if (classeSelectionnee) { chargerEvaluations(); chargerBulletin(); } }, [classeSelectionnee]);

  const chargerClasses = async () => {
    try {
      const res = await axios.get(API + '/classes', { headers });
      setClasses(res.data);
      if (res.data.length > 0) setClasseSelectionnee(res.data[0].id);
    } catch (err) { console.error(err); }
  };

  const chargerMatieres = async () => {
    try {
      const res = await axios.get(API + '/emploi-du-temps/matieres', { headers });
      setMatieres(res.data);
    } catch (err) { console.error(err); }
  };

  const chargerEvaluations = async () => {
    try {
      let url = API + '/notes?classe_id=' + classeSelectionnee;
      if (matiereSelectionnee) url += '&matiere_id=' + matiereSelectionnee;
      const res = await axios.get(url, { headers });
      setEvaluations(res.data);
    } catch (err) { console.error(err); }
  };

  const chargerBulletin = async () => {
    try {
      const res = await axios.get(API + '/notes/bulletin?classe_id=' + classeSelectionnee, { headers });
      setBulletins(res.data);
    } catch (err) { console.error(err); }
  };

  const ouvrirEvaluation = async (evaluation) => {
    try {
      const res = await axios.get(API + '/notes/' + evaluation.id + '/notes', { headers });
      setEvaluationOuverte(res.data.evaluation);
      setElevesNotes(res.data.eleves.map(e => ({
        ...e,
        points: e.points !== null ? String(parseFloat(e.points)) : '',
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
      await axios.post(API + '/notes', { ...form, classe_id: classeSelectionnee }, { headers });
      setShowForm(false);
      setForm({ nom: '', matiere_id: '', date: new Date().toISOString().split('T')[0], type: 'Ecrit', coefficient: '1', sur: '6', points_max: '30' });
      chargerEvaluations();
    } catch (err) { alert('Erreur: ' + (err.response?.data?.message || err.message)); }
  };

  const handleSauvegarderNotes = async () => {
    try {
      const notes = elevesNotes.map(e => ({
        eleve_id: e.id,
        points: e.points !== '' ? parseFloat(e.points) : null,
        valeur: e.points !== '' ? calculerNote(e.points, evaluationOuverte.points_max) : null,
        absent: e.absent,
        dispense: e.dispense,
        commentaire: e.commentaire
      }));
      await axios.post(API + '/notes/' + evaluationOuverte.id + '/notes', { notes }, { headers });
      setSauvegarde(true);
      setTimeout(() => setSauvegarde(false), 3000);
      chargerBulletin();
    } catch (err) { alert('Erreur: ' + (err.response?.data?.message || err.message)); }
  };

  const handleSupprimerEvaluation = async (id) => {
    if (window.confirm('Supprimer cette évaluation ?')) {
      await axios.delete(API + '/notes/' + id, { headers });
      chargerEvaluations();
    }
  };

  const getMoyenneClasse = () => {
    const valides = elevesNotes.filter(e => !e.absent && !e.dispense && e.points !== '');
    if (valides.length === 0) return '—';
    const notes = valides.map(e => calculerNote(e.points, evaluationOuverte.points_max)).filter(n => n !== null);
    if (notes.length === 0) return '—';
    return Math.round(notes.reduce((a, n) => a + n, 0) / notes.length * 10) / 10;
  };

  const handleImprimer = () => {
    window.print();
  };

  const classeNom = classes.find(c => c.id === parseInt(classeSelectionnee))?.nom || '';

  // ===================== VUE SAISIE NOTES =====================
  if (vue === 'saisie' && evaluationOuverte) {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button style={styles.btnRetour} onClick={() => { setVue('evaluations'); chargerEvaluations(); }}>← Retour</button>
          <div style={{ flex: 1 }}>
            <h2 style={styles.titre}>{evaluationOuverte.nom}</h2>
            <div style={styles.evalInfo}>{evaluationOuverte.matiere} • {evaluationOuverte.type} • Points max: {evaluationOuverte.points_max} • Coef. {evaluationOuverte.coefficient}</div>
          </div>
          <div style={styles.moyenneBox}>
            <div style={styles.moyenneLabel}>Moyenne classe</div>
            <div style={styles.moyenneValeur}>{getMoyenneClasse()}/6</div>
          </div>
          <button style={{...styles.btnSauver, opacity: peutModifierNotes() ? 1 : 0.4, cursor: peutModifierNotes() ? 'pointer' : 'not-allowed'}} disabled={!peutModifierNotes()} onClick={handleSauvegarderNotes}>💾 Enregistrer</button>
        </div>
        {sauvegarde && <div style={styles.successMsg}>✅ Notes enregistrées !</div>}
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Nom</th>
                <th style={styles.th}>Prénom</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Points /{evaluationOuverte.points_max}</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Note /6</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Absent</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Dispensé</th>
                <th style={styles.th}>Remarques</th>
              </tr>
            </thead>
            <tbody>
              {elevesNotes.map((eleve, i) => {
                const note = calculerNote(eleve.points, evaluationOuverte.points_max);
                return (
                  <tr key={eleve.id} style={{ ...styles.tr, background: eleve.absent ? '#fff8f8' : eleve.dispense ? '#f8f8ff' : 'white' }}>
                    <td style={styles.td}><b>{eleve.nom}</b></td>
                    <td style={styles.td}>{eleve.prenom}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <input style={styles.noteInput} type="number" min="0" max={evaluationOuverte.points_max} step="0.5"
                        value={eleve.points} disabled={eleve.absent || eleve.dispense}
                        onChange={ev => { const c = [...elevesNotes]; c[i].points = ev.target.value; setElevesNotes(c); }} />
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '16px', color: eleve.absent || eleve.dispense ? '#888' : note !== null ? (note >= 4 ? '#2e7d32' : '#ea4335') : '#888' }}>
                        {eleve.absent ? 'ABS' : eleve.dispense ? 'DISP' : note !== null ? parseFloat(note).toFixed(1) + '/6' : '—'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <input type="checkbox" checked={eleve.absent} style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
                        onChange={ev => { const c = [...elevesNotes]; c[i].absent = ev.target.checked; if (ev.target.checked) { c[i].points = ''; c[i].dispense = false; } setElevesNotes(c); }} />
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <input type="checkbox" checked={eleve.dispense} style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
                        onChange={ev => { const c = [...elevesNotes]; c[i].dispense = ev.target.checked; if (ev.target.checked) { c[i].points = ''; c[i].absent = false; } setElevesNotes(c); }} />
                    </td>
                    <td style={styles.td}>
                      <input style={styles.commentInput} type="text" placeholder="Remarque..." value={eleve.commentaire}
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
    const toutesEvals = evaluations;
    const elevesBulletin = bulletins;
    return (
      <div style={styles.page}>
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
        <div style={styles.header} className="no-print">
          <button style={styles.btnRetour} onClick={() => setVue('menu')}>← Retour</button>
          <h2 style={styles.titre}>📊 Vue générale — {classeNom}</h2>
          <button style={styles.btnImprimer} onClick={handleImprimer}>🖨️ Imprimer</button>
        </div>
        <div ref={printRef}>
          <h3 style={{ textAlign: 'center', marginBottom: '15px', fontSize: '16px' }}>Liste de contrôle des notes — {classeNom}</h3>
          <table style={{ ...styles.table, fontSize: '12px' }}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={{ ...styles.th, minWidth: '140px' }}>Élève</th>
                {matieres.filter(m => elevesBulletin.some(b => b.parMatiere[m.nom])).map(m => (
                  <th key={m.id} style={{ ...styles.th, textAlign: 'center', minWidth: '70px' }}>{m.nom}</th>
                ))}
                <th style={{ ...styles.th, textAlign: 'center' }}>Moy. gén.</th>
              </tr>
            </thead>
            <tbody>
              {elevesBulletin.map((b, i) => (
                <tr key={i} style={styles.tr}>
                  <td style={styles.td}><b>{b.eleve.nom} {b.eleve.prenom}</b></td>
                  {matieres.filter(m => elevesBulletin.some(b2 => b2.parMatiere[m.nom])).map(m => {
                    const data = b.parMatiere[m.nom];
                    return (
                      <td key={m.id} style={{ ...styles.td, textAlign: 'center', color: data ? (data.moyenne >= 4 ? '#2e7d32' : '#ea4335') : '#ccc', fontWeight: data ? '700' : '400' }}>
                        {data ? parseFloat(data.moyenne).toFixed(1) : '—'}
                      </td>
                    );
                  })}
                  <td style={{ ...styles.td, textAlign: 'center', fontWeight: '700', color: b.moyenneGenerale >= 4 ? '#2e7d32' : '#ea4335', fontSize: '14px' }}>
                    {b.moyenneGenerale > 0 ? parseFloat(b.moyenneGenerale).toFixed(1) : '—'}
                  </td>
                </tr>
              ))}
              <tr style={{ ...styles.tr, background: '#f0f4ff', fontWeight: '700' }}>
                <td style={styles.td}>Moyenne de la matière</td>
                {matieres.filter(m => elevesBulletin.some(b => b.parMatiere[m.nom])).map(m => {
                  const vals = elevesBulletin.map(b => b.parMatiere[m.nom]?.moyenne).filter(v => v !== undefined);
                  const moy = vals.length > 0 ? Math.round(vals.reduce((a, v) => a + parseFloat(v), 0) / vals.length * 10) / 10 : null;
                  return <td key={m.id} style={{ ...styles.td, textAlign: 'center' }}>{moy ? parseFloat(moy).toFixed(1) : '—'}</td>;
                })}
                <td style={styles.td}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ===================== VUE PAR MATIERE =====================
  if (vue === 'matiere') {
    const matiere = matieres.find(m => m.id === parseInt(matiereSelectionnee));
    const evalsMatiere = evaluations.filter(ev => ev.matiere_id === parseInt(matiereSelectionnee));
    return (
      <div style={styles.page}>
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
        <div style={styles.header} className="no-print">
          <button style={styles.btnRetour} onClick={() => setVue('menu')}>← Retour</button>
          <h2 style={styles.titre}>📚 Vue par matière — {classeNom}</h2>
          <select style={styles.select} value={matiereSelectionnee} onChange={e => { setMatiereSelectionnee(e.target.value); }}>
            <option value="">-- Choisir une matière --</option>
            {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
          </select>
          <button style={styles.btnImprimer} onClick={handleImprimer}>🖨️ Imprimer</button>
        </div>
        {matiere && evalsMatiere.length > 0 ? (
          <div ref={printRef}>
            <h3 style={{ textAlign: 'center', marginBottom: '5px' }}>Aperçu des notes — {matiere.nom} — {classeNom}</h3>
            <table style={{ ...styles.table, fontSize: '12px' }}>
              <thead>
                <tr style={styles.theadRow}>
                  <th style={{ ...styles.th, minWidth: '150px' }}>Élève</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Note bulletin</th>
                  {evalsMatiere.map(ev => (
                    <th key={ev.id} style={{ ...styles.th, textAlign: 'center', minWidth: '90px', fontSize: '11px' }}>
                      {ev.nom}<br/><span style={{ fontWeight: '400', fontSize: '10px' }}>{ev.date ? new Date(ev.date).toLocaleDateString('fr-CH') : ''}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bulletins.map((b, i) => {
                  const moyMatiere = b.parMatiere[matiere.nom];
                  return (
                    <tr key={i} style={styles.tr}>
                      <td style={styles.td}><b>{b.eleve.nom} {b.eleve.prenom}</b></td>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: '700', color: moyMatiere ? (moyMatiere.moyenne >= 4 ? '#2e7d32' : '#ea4335') : '#ccc' }}>
                        {moyMatiere ? parseFloat(moyMatiere.moyenne).toFixed(1) : '—'}
                      </td>
                      {evalsMatiere.map(ev => {
                        const noteEleve = ev._notes ? ev._notes[b.eleve.id] : null;
                        return <td key={ev.id} style={{ ...styles.td, textAlign: 'center' }}>—</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={styles.vide}>{matiereSelectionnee ? 'Aucune évaluation pour cette matière' : 'Sélectionnez une matière'}</div>
        )}
      </div>
    );
  }

  // ===================== VUE PAR ELEVE =====================
  if (vue === 'eleve') {
    const bulletin = bulletins.find(b => b.eleve.id === parseInt(eleveSelectionne));
    return (
      <div style={styles.page}>
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
        <div style={styles.header} className="no-print">
          <button style={styles.btnRetour} onClick={() => setVue('menu')}>← Retour</button>
          <h2 style={styles.titre}>👤 Notes par élève — {classeNom}</h2>
          <select style={styles.select} value={eleveSelectionne || ''} onChange={e => setEleveSelectionne(e.target.value)}>
            <option value="">-- Choisir un élève --</option>
            {bulletins.map(b => <option key={b.eleve.id} value={b.eleve.id}>{b.eleve.nom} {b.eleve.prenom}</option>)}
          </select>
          <button style={styles.btnImprimer} onClick={handleImprimer}>🖨️ Imprimer</button>
        </div>
        {bulletin ? (
          <div ref={printRef}>
            <h3 style={{ marginBottom: '5px' }}>Liste intermédiaire des notes — {bulletin.eleve.prenom} {bulletin.eleve.nom}</h3>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '15px' }}>Classe : {classeNom}</p>
            {Object.entries(bulletin.parMatiere).map(([matierNom, data]) => (
              <div key={matierNom} style={{ marginBottom: '20px' }}>
                <div style={styles.bulletinMatiereTitre}>
                  <b>{matierNom}</b>
                  <span style={{ marginLeft: 'auto', fontWeight: '700', color: data.moyenne >= 4 ? '#2e7d32' : '#ea4335' }}>
                    Moyenne : {parseFloat(data.moyenne).toFixed(1)}/6
                  </span>
                </div>
                <table style={{ ...styles.table, fontSize: '13px' }}>
                  <thead>
                    <tr style={styles.theadRow}>
                      <th style={styles.th}>Évaluation</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Type</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>Coef.</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>Note /6</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluations.filter(ev => ev.matiere === matierNom).map(ev => (
                      <tr key={ev.id} style={styles.tr}>
                        <td style={styles.td}>{ev.nom}</td>
                        <td style={styles.td}>{ev.date ? new Date(ev.date).toLocaleDateString('fr-CH') : '—'}</td>
                        <td style={styles.td}>{ev.type}</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>{ev.coefficient}</td>
                        <td style={{ ...styles.td, textAlign: 'center', fontWeight: '700' }}>—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <div style={styles.moyenneGeneraleBox}>
              Moyenne générale : <b style={{ fontSize: '20px', color: bulletin.moyenneGenerale >= 4 ? '#2e7d32' : '#ea4335' }}>{parseFloat(bulletin.moyenneGenerale).toFixed(1)}/6</b>
            </div>
          </div>
        ) : (
          <div style={styles.vide}>Sélectionnez un élève</div>
        )}
      </div>
    );
  }

  // ===================== VUE BULLETIN PDF =====================
  if (vue === 'bulletin') {
    const bulletin = bulletins.find(b => b.eleve.id === parseInt(eleveSelectionne));
    return (
      <div style={styles.page}>
        <style>{`@media print { .no-print { display: none !important; } body { margin: 0; } }`}</style>
        <div style={styles.header} className="no-print">
          <button style={styles.btnRetour} onClick={() => setVue('menu')}>← Retour</button>
          <h2 style={styles.titre}>📄 Bulletin de notes — {classeNom}</h2>
          <select style={styles.select} value={eleveSelectionne || ''} onChange={e => setEleveSelectionne(e.target.value)}>
            <option value="">-- Choisir un élève --</option>
            {bulletins.map(b => <option key={b.eleve.id} value={b.eleve.id}>{b.eleve.nom} {b.eleve.prenom}</option>)}
          </select>
          <button style={styles.btnImprimer} onClick={handleImprimer}>🖨️ Imprimer / PDF</button>
        </div>
        {bulletin ? (
          <div ref={printRef} style={styles.bulletinPDF}>
            <div style={styles.bulletinPDFHeader}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '18px' }}>BULLETIN DE NOTES</div>
                <div style={{ fontSize: '13px', color: '#555', marginTop: '5px' }}>Classe : <b>{classeNom}</b></div>
                <div style={{ fontSize: '13px', color: '#555' }}>Date : {new Date().toLocaleDateString('fr-CH')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '700', fontSize: '16px' }}>{bulletin.eleve.prenom} {bulletin.eleve.nom}</div>
              </div>
            </div>
            <table style={{ ...styles.table, marginTop: '20px' }}>
              <thead>
                <tr style={styles.theadRow}>
                  <th style={styles.th}>Matière</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Coef.</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Nb éval.</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Moyenne /6</th>
                  <th style={styles.th}>Appréciation</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(bulletin.parMatiere).map(([matierNom, data]) => {
                  const m = getMention(data.moyenne);
                  return (
                    <tr key={matierNom} style={styles.tr}>
                      <td style={styles.td}><b>{matierNom}</b></td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{data.coefficient}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{data.nbNotes}</td>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: '700', color: m.color }}>{parseFloat(data.moyenne).toFixed(1)}</td>
                      <td style={{ ...styles.td, color: m.color }}>{m.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={styles.moyenneGeneraleBox}>
              Moyenne générale : <b style={{ fontSize: '22px', color: bulletin.moyenneGenerale >= 4 ? '#2e7d32' : '#ea4335' }}>
                {parseFloat(bulletin.moyenneGenerale).toFixed(1)}/6
              </b>
              <span style={{ marginLeft: '15px', color: getMention(bulletin.moyenneGenerale).color, fontWeight: '600' }}>
                {getMention(bulletin.moyenneGenerale).label}
              </span>
            </div>
            <div style={styles.signatures}>
              <div style={styles.signatureBox}><div style={styles.signatureLine}></div><div style={styles.signatureLabel}>Signature du directeur</div></div>
              <div style={styles.signatureBox}><div style={styles.signatureLine}></div><div style={styles.signatureLabel}>Signature du titulaire</div></div>
              <div style={styles.signatureBox}><div style={styles.signatureLine}></div><div style={styles.signatureLabel}>Signature de l'élève</div></div>
            </div>
          </div>
        ) : (
          <div style={styles.vide}>Sélectionnez un élève</div>
        )}
      </div>
    );
  }

  // ===================== VUE EVALUATIONS (saisie) =====================
  if (vue === 'evaluations') {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button style={styles.btnRetour} onClick={() => setVue('menu')}>← Retour</button>
          <h2 style={styles.titre}>📝 Évaluations — {classeNom}</h2>
          <div style={styles.headerRight}>
            <select style={styles.select} value={matiereSelectionnee} onChange={e => { setMatiereSelectionnee(e.target.value); chargerEvaluations(); }}>
              <option value="">Toutes les matières</option>
              {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
            {isAdmin() && <button style={styles.btnAjouter} onClick={() => setShowForm(true)}>+ Nouvelle évaluation</button>}
          </div>
        </div>

        {showForm && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitre}>Créer une évaluation</h3>
              <form onSubmit={handleCreerEvaluation}>
                <div style={styles.formGrid}>
                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={styles.label}>Nom *</label>
                    <input style={styles.input} type="text" required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Contrôle chapitre 3..." />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Matière *</label>
                    <select style={styles.input} required value={form.matiere_id} onChange={e => setForm({ ...form, matiere_id: e.target.value })}>
                      <option value="">-- Choisir --</option>
                      {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                    </select>
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Type</label>
                    <select style={styles.input} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Date</label>
                    <input style={styles.input} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Points maximum</label>
                    <input style={styles.input} type="number" step="0.5" value={form.points_max} onChange={e => setForm({ ...form, points_max: e.target.value })} />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Coefficient</label>
                    <input style={styles.input} type="number" step="0.1" value={form.coefficient} onChange={e => setForm({ ...form, coefficient: e.target.value })} />
                  </div>
                </div>
                <div style={styles.formActions}>
                  <button type="button" style={styles.btnAnnuler} onClick={() => setShowForm(false)}>Annuler</button>
                  <button type="submit" style={styles.btnSauver}>Créer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <table style={styles.table}>
          <thead>
            <tr style={styles.theadRow}>
              {['Désignation', 'Matière', 'Date', 'Type', 'Pts max', 'Coef.', 'Saisies', 'Actions'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {evaluations.length === 0 ? (
              <tr><td colSpan="8" style={styles.vide}>Aucune évaluation — cliquez sur + Nouvelle évaluation</td></tr>
            ) : evaluations.map(ev => (
              <tr key={ev.id} style={styles.tr}>
                <td style={styles.td} onClick={() => ouvrirEvaluation(ev)}><b style={{ color: '#1a73e8', cursor: 'pointer' }}>{ev.nom}</b></td>
                <td style={styles.td}>{ev.matiere}</td>
                <td style={styles.td}>{ev.date ? new Date(ev.date).toLocaleDateString('fr-CH') : '—'}</td>
                <td style={styles.td}><span style={styles.typeBadge}>{ev.type}</span></td>
                <td style={styles.td}>{ev.points_max}</td>
                <td style={styles.td}>{ev.coefficient}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.typeBadge, background: ev.nb_notes > 0 ? '#e8f5e9' : '#fff8e1', color: ev.nb_notes > 0 ? '#2e7d32' : '#f57f17' }}>
                    {ev.nb_notes} élève(s)
                  </span>
                </td>
                <td style={styles.td}>
                  <button style={styles.btnOuvrir} onClick={() => ouvrirEvaluation(ev)}>📋 Saisir</button>
                  <button style={styles.btnDelete} onClick={() => handleSupprimerEvaluation(ev.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ===================== MENU PRINCIPAL =====================
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={styles.titre}>📝 Notes & Bulletins</h2>
        <select style={styles.select} value={classeSelectionnee} onChange={e => setClasseSelectionnee(e.target.value)}>
          {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </div>

      <div style={styles.menuGrid}>
        <div style={{ ...styles.menuCard, borderTop: '4px solid #1a73e8' }} onClick={() => setVue('evaluations')}>
          <div style={styles.menuIcon}>📝</div>
          <div style={styles.menuLabel}>Saisie des évaluations</div>
          <div style={styles.menuDesc}>Créer des évaluations et saisir les notes</div>
        </div>
        <div style={{ ...styles.menuCard, borderTop: '4px solid #34a853' }} onClick={() => setVue('generale')}>
          <div style={styles.menuIcon}>📊</div>
          <div style={styles.menuLabel}>Vue générale</div>
          <div style={styles.menuDesc}>Toutes les moyennes par matière et par élève</div>
        </div>
        <div style={{ ...styles.menuCard, borderTop: '4px solid #fbbc04' }} onClick={() => setVue('matiere')}>
          <div style={styles.menuIcon}>📚</div>
          <div style={styles.menuLabel}>Vue par matière</div>
          <div style={styles.menuDesc}>Détail des notes par branche</div>
        </div>
        <div style={{ ...styles.menuCard, borderTop: '4px solid #9c27b0' }} onClick={() => setVue('eleve')}>
          <div style={styles.menuIcon}>👤</div>
          <div style={styles.menuLabel}>Notes par élève</div>
          <div style={styles.menuDesc}>Toutes les notes d'un élève</div>
        </div>
        <div style={{ ...styles.menuCard, borderTop: '4px solid #ea4335' }} onClick={() => setVue('bulletin')}>
          <div style={styles.menuIcon}>📄</div>
          <div style={styles.menuLabel}>Bulletin de notes</div>
          <div style={styles.menuDesc}>Imprimer le bulletin en PDF</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '20px', background: '#f0f2f5', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' },
  btnRetour: { padding: '8px 16px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer' },
  titre: { fontSize: '24px', fontWeight: '700', flex: 1 },
  evalInfo: { fontSize: '13px', color: '#888', marginTop: '3px' },
  headerRight: { display: 'flex', gap: '10px', alignItems: 'center' },
  select: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' },
  moyenneBox: { background: 'white', padding: '10px 20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  moyenneLabel: { fontSize: '12px', color: '#888' },
  moyenneValeur: { fontSize: '24px', fontWeight: '700', color: '#1a73e8' },
  btnSauver: { padding: '12px 24px', background: '#34a853', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  btnImprimer: { padding: '10px 20px', background: '#ea4335', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  successMsg: { background: '#e8f5e9', color: '#2e7d32', padding: '12px 20px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600' },
  tableContainer: { background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  btnAjouter: { padding: '10px 20px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  theadRow: { background: '#1a73e8', color: 'white' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '10px 16px', fontSize: '14px' },
  vide: { padding: '40px', textAlign: 'center', color: '#888', background: 'white', borderRadius: '12px' },
  typeBadge: { background: '#e3f2fd', color: '#1a73e8', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  btnOuvrir: { padding: '6px 12px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', marginRight: '8px' },
  btnDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' },
  noteInput: { width: '80px', padding: '8px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px', fontWeight: '700', textAlign: 'center' },
  commentInput: { padding: '6px 10px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', width: '180px' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '30px', borderRadius: '16px', width: '550px', maxHeight: '80vh', overflowY: 'auto' },
  modalTitre: { fontSize: '20px', fontWeight: '700', marginBottom: '20px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  formChamp: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#555' },
  input: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
  btnAnnuler: { padding: '10px 20px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  menuGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' },
  menuCard: { background: 'white', borderRadius: '12px', padding: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'transform 0.2s' },
  menuIcon: { fontSize: '36px', marginBottom: '12px' },
  menuLabel: { fontSize: '16px', fontWeight: '700', marginBottom: '8px' },
  menuDesc: { fontSize: '13px', color: '#888' },
  bulletinMatiereTitre: { display: 'flex', alignItems: 'center', background: '#f0f4ff', padding: '10px 16px', borderRadius: '8px', marginBottom: '8px', fontWeight: '600' },
  moyenneGeneraleBox: { background: '#f0f4ff', padding: '16px 20px', borderRadius: '12px', marginTop: '20px', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' },
  bulletinPDF: { background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', maxWidth: '800px', margin: '0 auto' },
  bulletinPDFHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px solid #e0e0e0' },
  signatures: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '40px' },
  signatureBox: { textAlign: 'center' },
  signatureLine: { height: '1px', background: '#333', marginBottom: '8px' },
  signatureLabel: { fontSize: '12px', color: '#555' },
};