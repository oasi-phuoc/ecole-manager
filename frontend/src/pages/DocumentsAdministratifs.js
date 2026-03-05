import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function DocumentsAdministratifs() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 28, background: '#f8fafc', minHeight: '100vh', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ padding: '8px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', color: '#475569' }}
        >
          ← Retour
        </button>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>🗂️ Documents administratifs</h2>
      </div>
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, color: '#475569' }}>
        Cette section sera utilisée pour la gestion des documents administratifs.
      </div>
    </div>
  );
}
