import { peutModifierPresences } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

export default function Presences() {
  const [classes, setClasses] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [presences, setPresences] = useState({});
  const [commentaires, setCommentaires] = useState({});
  const [classeSelectionnee, setClasseSelectionnee] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [onglet, setOnglet] = useState('saisie');
  const [statistiques, setStatistiques] = useState([]);
  const [sauvegarde, setSauvegarde] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerClasses(); }, []);
  useEffect(() => { if (classeSelectionnee) { chargerEleves(); chargerPresences(); chargerStats(); } }, [classeSelectionnee, date]);

  const chargerClasses = async () => {
    try {
      const res = await axios.get(API + '/classes', { headers });
      setClasses(res.data);
      if (res.data.length > 0) setClasseSelectionnee(res.data[0].id);
    } catch (err) { console.error(err); }
  };

  const chargerEleves = async () => {
    try {
      const res = await axios.get(API + '/presences/eleves?classe_id=' + classeSelectionnee, { headers });
      setEleves(res.data);
      const p = {};
      res.data.forEach(e => { p[e.id] = 'present'; });
      setPresences(p);
    } catch (err) { console.error(err); }
  };

  const chargerPresences = async () => {
    try {
      const res = await axios.get(API + '/presences?classe_id=' + classeSelectionnee + '&date=' + date, { headers });
      if (res.data.length > 0) {
        const p = {};
        const c = {};
        res.data.forEach(pr => {
          p[pr.eleve_id] = pr.statut;
          c[pr.eleve_id] = pr.commentaire || '';
        });
        setPresences(p);
        setCommentaires(c);
      }
    } catch (err) { console.error(err); }
  };

  const chargerStats = async () => {
    try {
      const res = await axios.get(API + '/presences/statistiques?classe_id=' + classeSelectionnee, { headers });
      setStatistiques(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSauvegarder = async () => {
    try {
      const data = eleves.map(e => ({
        eleve_id: e.id,
        statut: presences[e.id] || 'present',
        commentaire: commentaires[e.id] || ''
      }));
      await axios.post(API + '/presences', { presences: data, date }, { headers });
      setSauvegarde(true);
      setTimeout(() => setSauvegarde(false), 3000);
      chargerStats();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.message || err.message));
    }
  };

  const STATUTS = [
    { val: 'present', label: '✅ Présent', color: '#34a853', bg: '#e8f5e9' },
    { val: 'absent', label: '❌ Absent', color: '#ea4335', bg: '#ffebee' },
    { val: 'retard', label: '⏰ Retard', color: '#fbbc04', bg: '#fff8e1' },
    { val: 'excuse', label: '📝 Excusé', color: '#1a73e8', bg: '#e3f2fd' },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={styles.titre}>✅ Présences / Absences</h2>
        <div style={styles.headerRight}>
          <select style={styles.select} value={classeSelectionnee} onChange={e => setClasseSelectionnee(e.target.value)}>
            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <input style={styles.dateInput} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      <div style={styles.onglets}>
        <button style={{ ...styles.onglet, ...(onglet === 'saisie' ? styles.ongletActif : {}) }} onClick={() => setOnglet('saisie')}>📋 Saisie</button>
        <button style={{ ...styles.onglet, ...(onglet === 'stats' ? styles.ongletActif : {}) }} onClick={() => setOnglet('stats')}>📊 Statistiques</button>
      </div>

      {onglet === 'saisie' && (
        <div style={styles.saisieContainer}>
          {sauvegarde && <div style={styles.successMsg}>✅ Présences sauvegardées avec succès !</div>}
          <div style={styles.legende}>
            {STATUTS.map(s => (
              <span key={s.val} style={{ ...styles.legendeItem, background: s.bg, color: s.color }}>{s.label}</span>
            ))}
          </div>
          {eleves.length === 0 ? (
            <div style={styles.vide}>Aucun élève dans cette classe</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  <th style={styles.th}>Élève</th>
                  {STATUTS.map(s => <th key={s.val} style={styles.th}>{s.label}</th>)}
                  <th style={styles.th}>Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {eleves.map(e => (
                  <tr key={e.id} style={styles.tr}>
                    <td style={{ ...styles.td, textAlign: 'left' }}><b>{e.prenom} {e.nom}</b></td>
                    {STATUTS.map(s => (
                      <td key={s.val} style={{ ...styles.td, textAlign: 'center' }}>
                        <input
                          type="radio"
                          name={'statut-' + e.id}
                          value={s.val}
                          checked={presences[e.id] === s.val}
                          onChange={() => setPresences({ ...presences, [e.id]: s.val })}
                          style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
                        />
                      </td>
                    ))}
                    <td style={styles.td}>
                      <input
                        style={styles.commentInput}
                        type="text"
                        placeholder="Commentaire..."
                        value={commentaires[e.id] || ''}
                        onChange={e2 => setCommentaires({ ...commentaires, [e.id]: e2.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={styles.sauvegardeBar}>
            <span style={styles.compteEleves}>{eleves.length} élève(s)</span>
            <button style={styles.btnSauver} onClick={handleSauvegarder}>💾 Sauvegarder les présences</button>
          </div>
        </div>
      )}

      {onglet === 'stats' && (
        <div>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                {['Élève', '✅ Présents', '❌ Absents', '⏰ Retards', '📝 Excusés', 'Total', '% Présence'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statistiques.length === 0 ? (
                <tr><td colSpan="7" style={styles.vide}>Aucune donnée disponible</td></tr>
              ) : statistiques.map((s, i) => {
                const pct = s.total > 0 ? Math.round((s.presents / s.total) * 100) : 0;
                return (
                  <tr key={i} style={styles.tr}>
                    <td style={styles.td}><b>{s.prenom} {s.nom}</b></td>
                    <td style={{ ...styles.td, color: '#34a853', fontWeight: '600', textAlign: 'center' }}>{s.presents}</td>
                    <td style={{ ...styles.td, color: '#ea4335', fontWeight: '600', textAlign: 'center' }}>{s.absents}</td>
                    <td style={{ ...styles.td, color: '#fbbc04', fontWeight: '600', textAlign: 'center' }}>{s.retards}</td>
                    <td style={{ ...styles.td, color: '#1a73e8', fontWeight: '600', textAlign: 'center' }}>{s.excuses}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{s.total}</td>
                    <td style={styles.td}>
                      <div style={styles.barreContainer}>
                        <div style={{ ...styles.barre, width: pct + '%', background: pct >= 80 ? '#34a853' : pct >= 60 ? '#fbbc04' : '#ea4335' }}></div>
                        <span style={styles.pct}>{pct}%</span>
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
}

const styles = {
  page: { padding: '20px', background: '#f0f2f5', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' },
  btnRetour: { padding: '8px 16px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer' },
  titre: { fontSize: '24px', fontWeight: '700', flex: 1 },
  headerRight: { display: 'flex', gap: '10px', alignItems: 'center' },
  select: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' },
  dateInput: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' },
  onglets: { display: 'flex', gap: '10px', marginBottom: '20px' },
  onglet: { padding: '10px 20px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  ongletActif: { background: '#1a73e8', color: 'white', border: '2px solid #1a73e8' },
  saisieContainer: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  successMsg: { background: '#e8f5e9', color: '#2e7d32', padding: '12px 20px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600' },
  legende: { display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' },
  legendeItem: { padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' },
  table: { width: '100%', borderCollapse: 'collapse' },
  theadRow: { background: '#1a73e8', color: 'white' },
  th: { padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '10px 16px', fontSize: '14px', textAlign: 'center' },
  commentInput: { padding: '6px 10px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', width: '150px' },
  vide: { padding: '40px', textAlign: 'center', color: '#888' },
  sauvegardeBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #f0f0f0' },
  compteEleves: { color: '#888', fontSize: '14px' },
  btnSauver: { padding: '12px 24px', background: '#34a853', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' },
  barreContainer: { display: 'flex', alignItems: 'center', gap: '8px' },
  barre: { height: '8px', borderRadius: '4px', minWidth: '4px', transition: 'width 0.3s' },
  pct: { fontSize: '13px', fontWeight: '600', minWidth: '35px' },
};