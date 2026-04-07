/* eslint-disable */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ONGLETS = [
  { id: 'automne', label: 'Automne' },
  { id: 'juin',    label: 'Juin' },
  { id: 'autres',  label: 'Autres' },
  { id: 'suivi',   label: 'Tableau de suivi' },
];

export default function SortieScolaire() {
  const navigate = useNavigate();
  const [onglet, setOnglet] = useState('automne');

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnBack} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h1 style={styles.titre}>Gestion des sorties scolaires</h1>
      </div>

      <div style={styles.tabs}>
        {ONGLETS.map(o => (
          <button
            key={o.id}
            style={{ ...styles.tab, ...(onglet === o.id ? styles.tabActive : {}) }}
            onClick={() => setOnglet(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        <div style={styles.empty}>
          Onglet <strong>{ONGLETS.find(o => o.id === onglet)?.label}</strong> — module en cours de développement.
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f8fafc', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet Mars', sans-serif", padding: '28px 32px' },
  header: { display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 },
  btnBack: { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'white', color: '#6366f1', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 1px 4px rgba(99,102,241,0.10)' },
  titre: { fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 },
  tabs: { display: 'flex', gap: 4, marginBottom: 0 },
  tab: { padding: '9px 20px', border: 'none', borderRadius: '10px 10px 0 0', background: '#ddd6fe', color: '#5b21b6', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  tabActive: { background: 'white', color: '#6366f1', fontWeight: 800, boxShadow: '0 -2px 8px rgba(99,102,241,0.08)' },
  content: { background: 'white', borderRadius: '0 12px 12px 12px', padding: 32, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', minHeight: 300 },
  empty: { color: '#94a3b8', fontSize: 15, textAlign: 'center', padding: '40px 0' },
};
