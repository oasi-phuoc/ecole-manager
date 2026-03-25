/* eslint-disable */
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Enclassement() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnBack} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h1 style={styles.titre}>Enclassement</h1>
      </div>
      <div style={styles.content}>
        <div style={styles.empty}>Module en cours de développement.</div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#ede9fe', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif", padding: '32px 36px' },
  header: { display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 },
  btnBack: { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'white', color: '#6366f1', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 1px 4px rgba(99,102,241,0.10)' },
  titre: { fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 },
  content: { background: 'white', borderRadius: 14, padding: 32, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  empty: { color: '#94a3b8', fontSize: 15, textAlign: 'center', padding: '40px 0' },
};
