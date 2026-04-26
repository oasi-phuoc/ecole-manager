/* eslint-disable */
import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import axios from 'axios';
import { stickyPageChrome } from '../styles/pageShell';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';
const getHeaders = () => {
  const u = JSON.parse(localStorage.getItem('user') || '{}');
  return { Authorization: `Bearer ${u.token}` };
};

const TYPES = [
  { value: 'texte', label: 'Réponse courte' },
  { value: 'paragraphe', label: 'Paragraphe' },
  { value: 'choix_unique', label: 'Choix unique' },
  { value: 'choix_multiple', label: 'Cases à cocher' },
];

const emptyQuestion = () => ({
  _key: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  type: 'texte',
  libelle: '',
  options: [],
  obligatoire: false,
});

export default function Sondage() {
  const [liste, setListe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [reponses, setReponses] = useState([]);
  const [onglet, setOnglet] = useState('edition');
  const [msg, setMsg] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  const lienPublic = detail?.public_token
    ? `${window.location.origin}${process.env.PUBLIC_URL || ''}/repondre/${detail.public_token}`
    : '';

  const chargerListe = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/sondages`, { headers: getHeaders() });
      setListe(res.data || []);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { chargerListe(); }, [chargerListe]);

  useEffect(() => {
    if (!lienPublic) {
      setQrDataUrl('');
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(lienPublic, { width: 220, margin: 2, color: { dark: '#312e81', light: '#ffffff' } })
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) setQrDataUrl(''); });
    return () => { cancelled = true; };
  }, [lienPublic]);

  const chargerDetail = async (id) => {
    setMsg('');
    try {
      const [d, r] = await Promise.all([
        axios.get(`${API}/sondages/${id}`, { headers: getHeaders() }),
        axios.get(`${API}/sondages/${id}/reponses`, { headers: getHeaders() }),
      ]);
      const q = (d.data.questions || []).map((x) => ({
        ...x,
        _key: `db_${x.id}`,
        options: Array.isArray(x.options) ? x.options : [],
      }));
      setDetail({ ...d.data, questions: q });
      setReponses(r.data || []);
      setSelectedId(id);
      setOnglet('edition');
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.message || e.message));
    }
  };

  const nouveau = async () => {
    setMsg('');
    try {
      const res = await axios.post(
        `${API}/sondages`,
        { titre: 'Nouveau formulaire', description: '', questions: [] },
        { headers: getHeaders() }
      );
      await chargerListe();
      await chargerDetail(res.data.id);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.message || e.message));
    }
  };

  const sauver = async () => {
    if (!detail) return;
    setMsg('');
    const questions = (detail.questions || []).map((q, ordre) => ({
      type: q.type,
      libelle: q.libelle,
      options: q.type === 'choix_unique' || q.type === 'choix_multiple' ? q.options : [],
      obligatoire: !!q.obligatoire,
      ordre,
    }));
    try {
      const res = await axios.put(
        `${API}/sondages/${detail.id}`,
        {
          titre: detail.titre,
          description: detail.description,
          actif: detail.actif,
          accepte_reponses: detail.accepte_reponses,
          questions,
        },
        { headers: getHeaders() }
      );
      const q = (res.data.questions || []).map((x) => ({
        ...x,
        _key: `db_${x.id}`,
        options: Array.isArray(x.options) ? x.options : [],
      }));
      setDetail({ ...res.data, questions: q });
      await chargerListe();
      setMsg('✓ Enregistré');
      setTimeout(() => setMsg(''), 2500);
      const r = await axios.get(`${API}/sondages/${detail.id}/reponses`, { headers: getHeaders() });
      setReponses(r.data || []);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.message || e.message));
    }
  };

  const supprimer = async () => {
    if (!detail || !window.confirm('Supprimer ce formulaire et toutes les réponses ?')) return;
    setMsg('');
    try {
      await axios.delete(`${API}/sondages/${detail.id}`, { headers: getHeaders() });
      setDetail(null);
      setSelectedId(null);
      setReponses([]);
      await chargerListe();
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.message || e.message));
    }
  };

  const majQuestion = (idx, patch) => {
    setDetail((d) => {
      if (!d) return d;
      const qs = [...(d.questions || [])];
      qs[idx] = { ...qs[idx], ...patch };
      return { ...d, questions: qs };
    });
  };

  const ajouterQuestion = () => {
    setDetail((d) => {
      if (!d) return d;
      const q = emptyQuestion();
      return { ...d, questions: [...(d.questions || []), q] };
    });
  };

  const retirerQuestion = (idx) => {
    setDetail((d) => {
      if (!d) return d;
      const qs = [...(d.questions || [])];
      qs.splice(idx, 1);
      return { ...d, questions: qs };
    });
  };

  const monter = (idx) => {
    if (idx <= 0) return;
    setDetail((d) => {
      if (!d) return d;
      const qs = [...(d.questions || [])];
      [qs[idx - 1], qs[idx]] = [qs[idx], qs[idx - 1]];
      return { ...d, questions: qs };
    });
  };

  const descendre = (idx) => {
    setDetail((d) => {
      if (!d || idx >= (d.questions || []).length - 1) return d;
      const qs = [...(d.questions || [])];
      [qs[idx], qs[idx + 1]] = [qs[idx + 1], qs[idx]];
      return { ...d, questions: qs };
    });
  };

  return (
    <div style={s.page}>
      <div style={{ ...stickyPageChrome(), paddingBottom: 0, marginBottom: 0 }}>
        <div style={s.header}>
          <h2 style={s.titre}>Sondages</h2>
          <button type="button" style={s.btnPrimary} onClick={nouveau}>+ Nouveau formulaire</button>
        </div>
        {msg ? <div style={s.msg}>{msg}</div> : null}
      </div>

      <div style={s.layout}>
        <aside style={s.aside}>
          <div style={s.asideTitre}>Mes formulaires</div>
          {loading ? <div style={s.muted}>Chargement…</div> : null}
          {!loading && liste.length === 0 ? <div style={s.muted}>Aucun formulaire</div> : null}
          <ul style={s.liste}>
            {liste.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  style={{ ...s.listeBtn, ...(selectedId === x.id ? s.listeBtnActif : {}) }}
                  onClick={() => chargerDetail(x.id)}
                >
                  <span style={s.listeTitre}>{x.titre}</span>
                  <span style={s.listeMeta}>{x.nb_reponses || 0} rép. · {x.actif ? 'actif' : 'inactif'}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main style={s.main}>
          {!detail ? (
            <div style={s.vide}>Sélectionnez un formulaire ou créez-en un nouveau.</div>
          ) : (
            <>
              <div style={s.tabs}>
                <button type="button" style={{ ...s.tab, ...(onglet === 'edition' ? s.tabActif : {}) }} onClick={() => setOnglet('edition')}>Édition</button>
                <button type="button" style={{ ...s.tab, ...(onglet === 'reponses' ? s.tabActif : {}) }} onClick={() => setOnglet('reponses')}>
                  Réponses ({reponses.length})
                </button>
              </div>

              {onglet === 'edition' && (
                <div style={s.panel}>
                  <div style={s.rowTop}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label style={s.lab}>Titre</label>
                      <input style={s.inp} value={detail.titre} onChange={(e) => setDetail({ ...detail, titre: e.target.value })} />
                    </div>
                    <label style={s.chk}>
                      <input type="checkbox" checked={!!detail.actif} onChange={(e) => setDetail({ ...detail, actif: e.target.checked })} />
                      Formulaire visible
                    </label>
                    <label style={s.chk}>
                      <input type="checkbox" checked={!!detail.accepte_reponses} onChange={(e) => setDetail({ ...detail, accepte_reponses: e.target.checked })} />
                      Accepter les réponses
                    </label>
                  </div>
                  <label style={s.lab}>Description (affichée en haut du formulaire public)</label>
                  <textarea style={{ ...s.inp, minHeight: 72 }} value={detail.description || ''} onChange={(e) => setDetail({ ...detail, description: e.target.value })} />

                  <div style={s.qrBloc}>
                    <div>
                      <div style={s.lab}>Lien pour les élèves (QR)</div>
                      <div style={s.lien}>{lienPublic}</div>
                      <button type="button" style={s.btnGhost} onClick={() => { navigator.clipboard.writeText(lienPublic).then(() => setMsg('✓ Lien copié')).catch(() => {}); }}>Copier le lien</button>
                    </div>
                    {qrDataUrl ? <img src={qrDataUrl} alt="QR code" style={s.qrImg} /> : null}
                  </div>

                  <div style={s.qHead}>
                    <span style={s.section}>Questions</span>
                    <button type="button" style={s.btnGhost} onClick={ajouterQuestion}>+ Question</button>
                  </div>

                  {(detail.questions || []).map((q, idx) => (
                    <div key={q._key || q.id} style={s.qCard}>
                      <div style={s.qRow}>
                        <select style={s.sel} value={q.type} onChange={(e) => majQuestion(idx, { type: e.target.value, options: ['choix_unique', 'choix_multiple'].includes(e.target.value) ? (q.options?.length >= 2 ? q.options : ['Option A', 'Option B']) : [] })}>
                          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <label style={s.chk}>
                          <input type="checkbox" checked={!!q.obligatoire} onChange={(e) => majQuestion(idx, { obligatoire: e.target.checked })} />
                          Obligatoire
                        </label>
                        <div style={s.qActions}>
                          <button type="button" style={s.iconBtn} onClick={() => monter(idx)} title="Monter">↑</button>
                          <button type="button" style={s.iconBtn} onClick={() => descendre(idx)} title="Descendre">↓</button>
                          <button type="button" style={s.iconBtnDanger} onClick={() => retirerQuestion(idx)} title="Supprimer">×</button>
                        </div>
                      </div>
                      <label style={s.lab}>Intitulé</label>
                      <input style={s.inp} value={q.libelle} onChange={(e) => majQuestion(idx, { libelle: e.target.value })} placeholder="Votre question" />
                      {(q.type === 'choix_unique' || q.type === 'choix_multiple') && (
                        <>
                          <label style={s.lab}>Options (une par ligne)</label>
                          <textarea
                            style={{ ...s.inp, minHeight: 88 }}
                            value={(q.options || []).join('\n')}
                            onChange={(e) => majQuestion(idx, { options: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean) })}
                          />
                        </>
                      )}
                    </div>
                  ))}

                  <div style={s.actions}>
                    <button type="button" style={s.btnDanger} onClick={supprimer}>Supprimer le formulaire</button>
                    <button type="button" style={s.btnPrimary} onClick={sauver}>Enregistrer</button>
                  </div>
                </div>
              )}

              {onglet === 'reponses' && (
                <div style={s.panel}>
                  <p style={s.help}>Les réponses sont anonymes. Export CSV possible ultérieurement.</p>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>#</th>
                          <th style={s.th}>Date</th>
                          <th style={s.th}>Contenu (JSON)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reponses.length === 0 ? (
                          <tr><td colSpan={3} style={s.tdEmpty}>Aucune réponse pour l’instant.</td></tr>
                        ) : (
                          reponses.map((r, i) => (
                            <tr key={r.id}>
                              <td style={s.td}>{i + 1}</td>
                              <td style={s.td}>{r.submitted_at ? new Date(r.submitted_at).toLocaleString('fr-CH') : '—'}</td>
                              <td style={{ ...s.td, fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all' }}>{JSON.stringify(r.reponses)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const s = {
  page: { padding: '28px 32px', background: '#f8fafc', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' },
  titre: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, flex: 1 },
  btnPrimary: { padding: '8px 14px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost: { padding: '7px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#475569' },
  btnDanger: { padding: '9px 16px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  msg: { marginTop: 8, padding: '8px 12px', borderRadius: 8, background: '#eef2ff', color: '#4338ca', fontSize: 13 },
  layout: { display: 'flex', gap: 20, alignItems: 'flex-start', marginTop: 16 },
  aside: { width: 260, flexShrink: 0, background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 14, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' },
  asideTitre: { fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 },
  liste: { listStyle: 'none', margin: 0, padding: 0 },
  listeBtn: { width: '100%', textAlign: 'left', padding: '10px 10px', borderRadius: 8, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 4 },
  listeBtnActif: { background: '#ede9fe', borderColor: '#c4b5fd' },
  listeTitre: { display: 'block', fontWeight: 700, fontSize: 13, color: '#1e293b' },
  listeMeta: { display: 'block', fontSize: 11, color: '#94a3b8', marginTop: 2 },
  main: { flex: 1, minWidth: 0, background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', minHeight: 420 },
  vide: { padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  muted: { fontSize: 13, color: '#94a3b8' },
  tabs: { display: 'flex', gap: 4, padding: '10px 12px 0', borderBottom: '1px solid #f1f5f9' },
  tab: { padding: '10px 16px', border: 'none', background: 'transparent', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, color: '#64748b' },
  tabActif: { background: '#eef2ff', color: '#4338ca' },
  panel: { padding: 20 },
  rowTop: { display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end', marginBottom: 14 },
  lab: { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 },
  inp: { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit' },
  chk: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', whiteSpace: 'nowrap' },
  qrBloc: { display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', padding: 16, background: '#f8fafc', borderRadius: 10, marginBottom: 20, border: '1px dashed #c7d2fe' },
  lien: { fontSize: 12, color: '#4338ca', wordBreak: 'break-all', marginBottom: 10 },
  qrImg: { width: 220, height: 220, borderRadius: 8, border: '1px solid #e2e8f0' },
  qHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  section: { fontSize: 13, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' },
  qCard: { border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 12, background: '#fafafa' },
  qRow: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 10 },
  sel: { padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'inherit', fontSize: 13 },
  qActions: { marginLeft: 'auto', display: 'flex', gap: 4 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 14 },
  iconBtnDanger: { width: 32, height: 32, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer', fontSize: 16, lineHeight: 1 },
  actions: { display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 20, flexWrap: 'wrap' },
  help: { fontSize: 13, color: '#64748b', marginTop: 0 },
  tableWrap: { overflowX: 'auto', marginTop: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', background: '#6366f1', color: 'white', fontSize: 11, textTransform: 'uppercase' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
  tdEmpty: { padding: '24px', textAlign: 'center', color: '#94a3b8' },
};
