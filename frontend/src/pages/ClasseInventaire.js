import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getSessionUser } from '../utils/session';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';

export default function ClasseInventaire() {
  const navigate = useNavigate();
  const { classeId } = useParams();
  const headers = {};
  const user = getSessionUser() || {};
  const canEdit = user?.role === 'admin' || user?.role === 'prof';

  const [classe, setClasse] = useState(null);
  const [branches, setBranches] = useState([]);
  const [brancheActive, setBrancheActive] = useState(null);
  const [inventaire, setInventaire] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingInventaire, setLoadingInventaire] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    date_document: new Date().toISOString().split('T')[0],
    nom_document: '',
    numero_document: '',
    remarques: '',
  });

  useEffect(() => {
    chargerBranches();
  }, [classeId]);

  useEffect(() => {
    if (brancheActive?.id) chargerInventaire(brancheActive.id);
  }, [brancheActive?.id]);

  const chargerBranches = async () => {
    setLoadingBranches(true);
    setMsg('');
    try {
      const r = await axios.get(API + '/inventaire-branches/' + classeId + '/branches', { headers });
      setClasse(r.data?.classe || null);
      setBranches(r.data?.branches || []);
      if (r.data?.branches?.length) setBrancheActive(r.data.branches[0]);
    } catch (err) {
      setBranches([]);
      setClasse(null);
      setMsg('❌ Erreur chargement branches: ' + (err.response?.data?.message || err.message));
    }
    setLoadingBranches(false);
  };

  const chargerInventaire = async (brancheId) => {
    setLoadingInventaire(true);
    setMsg('');
    try {
      const r = await axios.get(API + '/inventaire-branches/' + classeId + '/branches/' + brancheId, { headers });
      setInventaire(r.data || []);
    } catch (err) {
      setInventaire([]);
      setMsg('❌ Erreur chargement inventaire: ' + (err.response?.data?.message || err.message));
    }
    setLoadingInventaire(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!brancheActive?.id) return;
    if (!form.nom_document.trim()) {
      setMsg('❌ Le nom du document est requis.');
      return;
    }
    try {
      await axios.post(
        API + '/inventaire-branches/' + classeId + '/branches/' + brancheActive.id,
        form,
        { headers }
      );
      setForm({
        date_document: new Date().toISOString().split('T')[0],
        nom_document: '',
        numero_document: '',
        remarques: '',
      });
      await chargerInventaire(brancheActive.id);
    } catch (err) {
      setMsg('❌ Erreur enregistrement: ' + (err.response?.data?.message || err.message));
    }
  };

  const supprimerLigne = async (id) => {
    if (!brancheActive?.id) return;
    if (!window.confirm('Supprimer cette ligne d’inventaire ?')) return;
    try {
      await axios.delete(API + '/inventaire-branches/' + classeId + '/branches/' + brancheActive.id + '/' + id, { headers });
      await chargerInventaire(brancheActive.id);
    } catch (err) {
      setMsg('❌ Erreur suppression: ' + (err.response?.data?.message || err.message));
    }
  };

  const titreClasse = useMemo(() => {
    if (!classe) return 'Inventaire de classe';
    return 'Inventaire — ' + classe.nom + (classe.niveau ? ' (' + classe.niveau + ')' : '');
  }, [classe]);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.btnBack} onClick={() => navigate('/classes')}>← Retour</button>
        <h2 style={s.title}>📦 {titreClasse}</h2>
      </div>

      {msg && <div style={s.msg}>{msg}</div>}

      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardTitle}>Branches</div>
          {loadingBranches ? (
            <div style={s.empty}>Chargement...</div>
          ) : branches.length === 0 ? (
            <div style={s.empty}>Aucune branche trouvée</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Branche</th>
                  <th style={s.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {branches.map(b => (
                  <tr key={b.id} style={brancheActive?.id === b.id ? s.trActive : s.tr}>
                    <td style={s.td}>
                      <div style={{ fontWeight: 700 }}>{b.nom}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{b.niveau || '—'}</div>
                    </td>
                    <td style={s.td}>
                      <button style={s.btnOpen} onClick={() => setBrancheActive(b)}>Ouvrir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={s.card}>
          <div style={{ ...s.cardTitle, marginBottom: 12 }}>
            {brancheActive ? 'Inventaire de la branche: ' + brancheActive.nom : 'Inventaire de la branche'}
          </div>

          {canEdit && brancheActive && (
            <form onSubmit={handleSubmit} style={s.form}>
              <input type="date" style={s.inp} value={form.date_document} onChange={e => setForm({ ...form, date_document: e.target.value })} />
              <input type="text" style={s.inp} placeholder="Nom du document *" value={form.nom_document} onChange={e => setForm({ ...form, nom_document: e.target.value })} />
              <input type="text" style={s.inp} placeholder="Numéro" value={form.numero_document} onChange={e => setForm({ ...form, numero_document: e.target.value })} />
              <input type="text" style={s.inp} placeholder="Remarques" value={form.remarques} onChange={e => setForm({ ...form, remarques: e.target.value })} />
              <button type="submit" style={s.btnAdd}>+ Ajouter</button>
            </form>
          )}

          {!brancheActive ? (
            <div style={s.empty}>Sélectionnez une branche dans le tableau.</div>
          ) : loadingInventaire ? (
            <div style={s.empty}>Chargement...</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['Date', 'Nom du document', 'Numéro', 'Remarques'].map(h => <th key={h} style={s.th}>{h}</th>)}
                  {canEdit && <th style={s.th}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {inventaire.length === 0 ? (
                  <tr><td colSpan={canEdit ? 5 : 4} style={s.empty}>Aucune ligne d’inventaire</td></tr>
                ) : inventaire.map(l => (
                  <tr key={l.id} style={s.tr}>
                    <td style={s.td}>{l.date_document ? new Date(l.date_document).toLocaleDateString('fr-CH') : '—'}</td>
                    <td style={{ ...s.td, fontWeight: 700 }}>{l.nom_document || '—'}</td>
                    <td style={s.td}>{l.numero_document || '—'}</td>
                    <td style={s.td}>{l.remarques || '—'}</td>
                    {canEdit && (
                      <td style={s.td}>
                        <button style={s.btnDel} onClick={() => supprimerLigne(l.id)}>🗑️</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { padding: '28px 32px', background: '#f8fafc', minHeight: '100vh', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' },
  btnBack: { padding: '8px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#475569' },
  title: { margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' },
  msg: { marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 13, fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(520px, 2fr)', gap: 16, alignItems: 'start' },
  card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: 14, fontWeight: 800, color: '#0f172a' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  trActive: { borderBottom: '1px solid #f1f5f9', background: '#eef2ff' },
  td: { padding: '10px 12px', fontSize: 13, color: '#334155' },
  empty: { textAlign: 'center', color: '#94a3b8', padding: 20 },
  btnOpen: { padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#e0e7ff', color: '#3730a3', fontWeight: 700, fontSize: 12 },
  form: { display: 'grid', gridTemplateColumns: '140px 1.4fr 0.8fr 1fr auto', gap: 8, marginBottom: 12 },
  inp: { width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' },
  btnAdd: { padding: '8px 12px', borderRadius: 8, border: 'none', background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer' },
  btnDel: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.75 },
};
