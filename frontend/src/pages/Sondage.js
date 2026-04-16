/* eslint-disable */
import React from 'react';
import { stickyPageChrome } from '../styles/pageShell';

export default function Sondage() {
  return (
    <div style={s.page}>
      <div style={{...stickyPageChrome(), paddingBottom:0, marginBottom:0}}>
      <div style={s.header}>
        <h2 style={s.titre}>Sondage</h2>
      </div>
      </div>
      <div style={s.placeholder}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
        <div style={s.placeholderTitre}>Module en cours de développement</div>
        <div style={s.placeholderSub}>Le module Sondage sera disponible prochainement.</div>
      </div>
    </div>
  );
}

const s = {
  page: { padding: '28px 32px', background: '#f8fafc', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' },
  titre: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 },
  placeholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, background: 'white', borderRadius: 16, border: '2px dashed #e0e7ff', color: '#94a3b8' },
  placeholderTitre: { fontSize: 16, fontWeight: 700, color: '#6366f1', marginBottom: 8 },
  placeholderSub: { fontSize: 13, color: '#94a3b8' },
};
