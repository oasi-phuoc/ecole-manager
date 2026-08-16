import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { stickyPageChrome } from '../styles/pageShell';
import { getSessionUser, fetchSessionUser } from '../utils/session';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ classes: 0, eleves: 0 });
  const [dashboardInfo, setDashboardInfo] = useState({ prochains_evenements: [], dernieres_notes: [], dernieres_observations: [], controle_presence_aujourdhui: { creneau_en_cours: null, classes_en_cours: [] } });
  const [agendaPerso, setAgendaPerso] = useState([]);
  const [observationDetail, setObservationDetail] = useState(null);
  const [memo, setMemo] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const navigate = useNavigate();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 2200);
  };
  const headers = {};

  const chargerMemo = async () => {
    try {
      const res = await axios.get(API + '/notes-personnelles', { headers });
      setMemo(res.data.contenu || '');
    } catch {}
  };

  const sauvegarderMemo = async () => {
    try {
      await axios.put(API + '/notes-personnelles', { contenu: memo }, { headers });
      showToast('Notes sauvegardées.');
    } catch {
      showToast('Erreur lors de la sauvegarde.', 'error');
    }
  };

  useEffect(() => {
    const chargerUtilisateurEtStats = async () => {
      const enMemoire = getSessionUser();
      if (enMemoire) setUser(enMemoire);
      try {
        const u = await fetchSessionUser();
        setUser(u || null);
      } catch {}
      chargerStats();
      chargerMemo();
    };
    chargerUtilisateurEtStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- montage : profil + stats + mémo une fois
  }, []);

  const chargerStats = async () => {
    try {
      const [cl, el, st, ap] = await Promise.all([
        axios.get(API + '/classes', { headers }).catch(() => ({ data: [] })),
        axios.get(API + '/eleves', { headers }).catch(() => ({ data: [] })),
        axios.get(API + '/statistiques', { headers }).catch(() => ({ data: null })),
        axios.get(API + '/calendrier/prof', { headers }).catch(() => ({ data: [] })),
      ]);
      setStats({ classes: cl.data.length, eleves: el.data.length });
      setAgendaPerso(ap.data || []);
      if (st.data) {
        setDashboardInfo({
          prochains_evenements: st.data.prochains_evenements || [],
          dernieres_notes: st.data.dernieres_notes || [],
          dernieres_observations: st.data.dernieres_observations || [],
          controle_presence_aujourdhui: st.data.controle_presence_aujourdhui || { creneau_en_cours: null, classes_en_cours: [] },
        });
      }
    } catch (err) { console.error(err); }
  };

  const isAdmin = user?.role === 'admin';

  const heure = new Date().getHours();
  const salut = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';
  const fmtDate = (raw) => {
    if (!raw) return '—';
    const d = new Date(raw);
    if (isNaN(d)) return raw;
    return d.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div style={styles.page}>
      <div style={styles.main}>
        <div style={{ ...stickyPageChrome('#ede9fe'), marginBottom: 0, marginLeft: -36, marginRight: -36, paddingLeft: 36, paddingRight: 36 }}>
        <div style={styles.topBar}>
          <div>
            <h1 style={styles.greeting}>{salut}, {user?.prenom} 👋</h1>
            <p style={styles.subGreeting}>Bienvenue sur votre tableau de bord</p>
          </div>
          <div style={styles.topBarRight}>
            <span style={styles.dateBadge}>{new Date().toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </div>

        {/* Stats */}
        {isAdmin && (
          <div style={styles.statsRow}>
            {[
              { label: 'Classes', value: stats.classes },
              { label: 'Élèves', value: stats.eleves },
            ].map(s => (
              <div key={s.label} style={styles.statCard}>
                <div style={styles.statValue}>{s.value}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
        </div>

        <div style={styles.sectionTitle}>Informations utiles</div>
        <div style={styles.infoRow}>
          <div style={styles.infoCard}>
            <div style={styles.infoCardTitle}>📅 Prochains événements</div>
            {(() => {
              const today = new Date().toISOString().split('T')[0];
              const persos = agendaPerso
                .filter(ev => ev.date && ev.date.substring(0, 10) >= today)
                .map(ev => ({ titre: ev.titre, date_debut: ev.date, type: ev.type || 'Agenda', _perso: true }));
              const scolaires = (dashboardInfo.prochains_evenements || []).map(ev => ({ ...ev, _perso: false }));
              const merged = [...scolaires, ...persos]
                .sort((a, b) => (a.date_debut || '').localeCompare(b.date_debut || ''))
                .slice(0, 3);
              if (merged.length === 0) return <div style={styles.infoEmpty}>Aucun événement à venir</div>;
              return merged.map((ev, i) => (
                <div key={i} style={{ ...(i > 0 ? { marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' } : {}) }}>
                  <div style={styles.infoMain}>{ev.titre}{ev._perso && <span style={{ marginLeft: 6, fontSize: 10, background: '#ede9fe', color: '#6366f1', borderRadius: 99, padding: '1px 6px', fontWeight: 700 }}>Perso</span>}</div>
                  <div style={styles.infoSub}>{fmtDate(ev.date_debut)} • {ev.type || 'Événement'}</div>
                </div>
              ));
            })()}
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoCardTitle}>📝 3 dernières notes saisies</div>
            {dashboardInfo.dernieres_notes.length === 0 ? (
              <div style={styles.infoEmpty}>Aucune note récente</div>
            ) : dashboardInfo.dernieres_notes.map((n, i) => (
              <div key={i} style={styles.infoLine}>
                <span style={styles.infoLineMain}>{n.eleve_prenom} {n.eleve_nom} • {n.classe || '—'}</span>
                <span style={styles.infoLineSub}>
                  {n.matiere || n.evaluation_nom || '—'} • {n.absent ? 'Absent' : n.dispense ? 'Dispensé' : (n.valeur ?? '—')} • {fmtDate(n.created_at)}
                </span>
              </div>
            ))}
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoCardTitle}>📌 3 dernières observations</div>
            {dashboardInfo.dernieres_observations.length === 0 ? (
              <div style={styles.infoEmpty}>Aucune observation récente</div>
            ) : dashboardInfo.dernieres_observations.map((o, i) => (
              <div key={i} style={styles.infoLine}>
                <div style={styles.infoLineHead}>
                  <span style={styles.infoLineMain}>{o.eleve_prenom} {o.eleve_nom} • {o.classe || '—'}</span>
                  <button style={styles.obsDetailBtn} onClick={() => setObservationDetail(o)}>👁 Détail</button>
                </div>
                <span style={styles.infoLineSub}>
                  {(o.titre || o.contenu || 'Observation').toString().slice(0, 70)} • {fmtDate(o.created_at)}
                </span>
              </div>
            ))}
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoCardTitle}>✅ Contrôle de présence aujourd'hui</div>
            {(() => {
              const classesDuJour = dashboardInfo.controle_presence_aujourdhui?.classes_du_jour || [];
              if (classesDuJour.length === 0) return <div style={styles.infoEmpty}>Aucune classe aujourd'hui</div>;
              return (
                <div>
                  <div style={styles.infoSub}>{dashboardInfo.controle_presence_aujourdhui.jour}</div>
                  {classesDuJour.map(cl => (
                    <div key={cl.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <b style={{ fontSize: 14 }}>{cl.nom}</b>
                      <button style={styles.quickBtn} onClick={() => navigate('/presences', { state: { classe_id: cl.id } })}>Présences →</button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        <div style={styles.sectionTitle}>📝 Notes personnelles</div>
        <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 24 }}>
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="Écrivez vos notes, rappels, mémos ici..."
            style={{ width: '100%', minHeight: 120, border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', color: '#1e293b', lineHeight: 1.6 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 8 }}>
            {toast.message && (
              <span style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 8, background: '#ede9fe', color: '#4c1d95' }}>{toast.message}</span>
            )}
            <button onClick={sauvegarderMemo} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Sauvegarder
            </button>
          </div>
        </div>
      </div>

      {observationDetail && (
        <div className="modal-overlay" style={styles.overlay} onClick={() => setObservationDetail(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>👁 Détail de l'observation</h3>
              <button style={{ padding: '6px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#64748b', fontWeight: 600 }} onClick={() => setObservationDetail(null)}>Fermer</button>
            </div>
            <div style={styles.detailRow}><b>Élève :</b> {observationDetail.eleve_prenom} {observationDetail.eleve_nom}</div>
            <div style={styles.detailRow}><b>Classe :</b> {observationDetail.classe || '—'}</div>
            <div style={styles.detailRow}><b>Date :</b> {fmtDate(observationDetail.created_at)}</div>
            <div style={styles.detailBloc}>
              <div style={styles.detailLabel}>Titre</div>
              <div style={styles.detailText}>{observationDetail.titre || 'Observation'}</div>
            </div>
            <div style={styles.detailBloc}>
              <div style={styles.detailLabel}>Contenu</div>
              <div style={styles.detailText}>{observationDetail.contenu || '—'}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  page: { minHeight: '100%', background: '#ede9fe', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  main: { padding: '32px 36px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 },
  greeting: { fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 },
  subGreeting: { fontSize: 13, color: '#64748b', margin: '4px 0 0' },
  topBarRight: { display: 'flex', alignItems: 'center', gap: 12 },
  dateBadge: { fontSize: 12, color: '#64748b', background: 'white', padding: '6px 14px', borderRadius: 99, border: '1px solid #e2e8f0', fontWeight: 500, textTransform: 'capitalize' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 32 },
  statCard: { background: 'white', borderRadius: 14, padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 8 },
  statIcon: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  statValue: { fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1 },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: 500 },
  infoRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 24 },
  infoCard: { background: 'white', borderRadius: 12, padding: 14, border: '1px solid #eef2f7', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', minHeight: 150 },
  infoCardTitle: { fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' },
  infoMain: { fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 },
  infoSub: { fontSize: 12, color: '#64748b' },
  infoEmpty: { fontSize: 13, color: '#94a3b8', paddingTop: 8 },
  infoLine: { display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 0', borderBottom: '1px dashed #eef2f7' },
  infoLineHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  infoLineMain: { fontSize: 13, fontWeight: 600, color: '#1f2937' },
  infoLineSub: { fontSize: 12, color: '#64748b' },
  obsDetailBtn: { padding: '5px 10px', background: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
  presenceClassCard: { marginTop: 10, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#fbfdff' },
  presenceClassHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13, color: '#0f172a' },
  quickBtn: { padding: '5px 10px', borderRadius: 7, border: '1px solid #1a73e8', background: 'white', color: '#1a73e8', cursor: 'pointer', fontSize: 11, fontWeight: 700 },
  presenceElevesList: { maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 },
  presenceEleveRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#334155', padding: '4px 0', borderBottom: '1px dashed #eef2f7' },
  presenceBadge: { minWidth: 26, textAlign: 'center', padding: '2px 6px', borderRadius: 8, background: '#e0e7ff', color: '#4338ca', fontWeight: 700, fontSize: 11 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 },
  moduleCard: { background: 'white', borderRadius: 14, padding: '20px 16px', border: '1px solid #f1f5f9', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8, transition: 'box-shadow 0.15s', position: 'relative' },
  moduleIcon: { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 },
  moduleLabel: { fontSize: 13, fontWeight: 700, color: '#1e293b' },
  moduleStat: { fontSize: 12, fontWeight: 500 },
  moduleArrow: { position: 'absolute', top: 16, right: 16, fontSize: 16, opacity: 0.4 },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500 },
  modal: { width: 'min(560px, 92vw)', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 15px 40px rgba(0,0,0,0.18)', padding: 18 },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' },
  btnClose: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8' },
  detailRow: { fontSize: 13, color: '#334155', marginBottom: 6 },
  detailBloc: { marginTop: 10, border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#f8fafc' },
  detailLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  detailText: { fontSize: 13, color: '#1f2937', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
};