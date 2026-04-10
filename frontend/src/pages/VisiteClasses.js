/* eslint-disable */
import React from 'react';

export default function VisiteClasses() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.titre}>Visite de classes</h2>
      </div>
      <div style={s.placeholder}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <div style={s.placeholderTitre}>Module en cours de développement</div>
        <div style={s.placeholderSub}>Le module Visite de classes sera disponible prochainement.</div>
      </div>
    </div>
  );
}

const s = {
  page: { padding: '28px 32px', background: '#f8fafc', minHeight: '100vh', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' },
  titre: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 },
  placeholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, background: 'white', borderRadius: 16, border: '2px dashed #e0e7ff', color: '#94a3b8' },
  placeholderTitre: { fontSize: 16, fontWeight: 700, color: '#6366f1', marginBottom: 8 },
  placeholderSub: { fontSize: 13, color: '#94a3b8' },
};
