import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { T, colors } from '../styles/theme';
import { clearSessionUser, getSessionUser, fetchSessionUser } from '../utils/session';

const API = 'https://ecole-manager-backend.onrender.com/api';

const ACCES_DEFAUT_PROF = { eleves: true, classes: false, branches: false, emploi_du_temps: false, presences: true, notes: true, tcf: false, calendrier: true, comptabilite: false, documents: false, statistiques: false, professeurs: true };

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ classes: 0, eleves: 0 });
  const [accesProfs, setAccesProfs] = useState({});
  const [dashboardInfo, setDashboardInfo] = useState({ prochains_evenements: [], dernieres_notes: [], dernieres_observations: [], controle_presence_aujourdhui: { creneau_en_cours: null, classes_en_cours: [] } });
  const [observationDetail, setObservationDetail] = useState(null);
  const [memo, setMemo] = useState('');
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);
  const navigate = useNavigate();
  const headers = {};

  const chargerMemo = async () => {
    try {
      const res = await axios.get(API + '/notes-personnelles', { headers });
      setMemo(res.data.contenu || '');
    } catch {}
  };

  const sauvegarderMemo = async (contenu) => {
    setMemoSaving(true);
    try {
      await axios.put(API + '/notes-personnelles', { contenu }, { headers });
      setMemoSaved(true);
      setTimeout(() => setMemoSaved(false), 2000);
    } catch {}
    setMemoSaving(false);
  };

  const chargerAccesProfs = async () => {
    try {
      const res = await axios.get(API + '/parametres/acces-profs');
      setAccesProfs(res.data || {});
    } catch {}
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
      chargerAccesProfs();
      chargerMemo();
    };
    chargerUtilisateurEtStats();
  }, []);

  const chargerStats = async () => {
    try {
      const [cl, el, st] = await Promise.all([
        axios.get(API + '/classes', { headers }).catch(() => ({ data: [] })),
        axios.get(API + '/eleves', { headers }).catch(() => ({ data: [] })),
        axios.get(API + '/statistiques', { headers }).catch(() => ({ data: null })),
      ]);
      setStats({ classes: cl.data.length, eleves: el.data.length });
      if (st.data) {
        setDashboardInfo({
          prochains_evenements: (st.data.prochains_evenements || []).slice(0, 3),
          dernieres_notes: st.data.dernieres_notes || [],
          dernieres_observations: st.data.dernieres_observations || [],
          controle_presence_aujourdhui: st.data.controle_presence_aujourdhui || { creneau_en_cours: null, classes_en_cours: [] },
        });
      }
    } catch (err) { console.error(err); }
  };

  const deconnexion = async () => {
    try { await axios.post(API + '/auth/logout'); } catch {}
    clearSessionUser();
    navigate('/login', { replace: true });
  };

  const isAdmin = user?.role === 'admin';

  const modules = [
    { label: 'Employés',         path: '/employes-administratifs', color: '#0ea5e9', bg: '#e0f2fe', adminOnly: true },
    { label: 'Professeurs',      path: '/professeurs',             color: '#6366f1', bg: '#e0e7ff', adminOnly: false, accentKey: 'professeurs' },
    { label: 'Élèves',           path: '/eleves',                  color: '#f59e0b', bg: '#fef3c7', adminOnly: false, accentKey: 'eleves' },
    { label: 'Branches',         path: '/branches',                color: '#8b5cf6', bg: '#ede9fe', adminOnly: false, accentKey: 'branches' },
    { label: 'Classes',          path: '/classes',                 color: '#10b981', bg: '#d1fae5', adminOnly: false, accentKey: 'classes' },
    { label: 'Emploi du Temps',  path: '/emploi-du-temps',         color: '#ef4444', bg: '#fee2e2', adminOnly: false, accentKey: 'emploi_du_temps' },
    { label: 'Présences',        path: '/presences',               color: '#06b6d4', bg: '#cffafe', adminOnly: false, accentKey: 'presences' },
    { label: 'Notes',            path: '/notes',                   color: '#ec4899', bg: '#fce7f3', adminOnly: false, accentKey: 'notes' },
    { label: 'TCF',              path: '/tcf',                     color: '#0ea5e9', bg: '#e0f2fe', adminOnly: false, accentKey: 'tcf' },
    { label: 'Calendrier',       path: '/calendrier',              color: '#14b8a6', bg: '#ccfbf1', adminOnly: false, accentKey: 'calendrier' },
    { label: 'Comptabilité',     path: '/comptabilite',            color: '#84cc16', bg: '#ecfccb', adminOnly: false, accentKey: 'comptabilite' },
    { label: 'Documents',        path: '/documents-administratifs',color: '#7c3aed', bg: '#ede9fe', adminOnly: false, accentKey: 'documents' },
    { label: 'Statistiques',     path: '/statistiques',            color: '#f97316', bg: '#ffedd5', adminOnly: false, accentKey: 'statistiques' },
    { label: 'Paramètres',       path: '/parametres',              color: '#64748b', bg: '#f1f5f9', adminOnly: false },
  ].filter(m => {
    if (isAdmin) return true;
    if (m.adminOnly) return false;
    if (!m.accentKey) return true;
    const val = accesProfs[m.accentKey];
    return val !== undefined ? val : (ACCES_DEFAUT_PROF[m.accentKey] !== false);
  });

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
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.logo}>
          <img src="/logo-oasis.webp" alt="Oasis" style={styles.logoImg} />
        </div>
        <nav style={styles.nav}>
          {modules.map(m => (
            <button
              key={m.path}
              style={styles.navItem}
              onClick={() => navigate(m.path)}
              onMouseEnter={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.querySelector('.nav-label').style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.querySelector('.nav-label').style.color = '#4c1d95'; }}
            >
              <span className="nav-label" style={styles.navLabel}>{m.label}</span>
            </button>
          ))}
        </nav>
        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>{user?.prenom?.[0]}{user?.nom?.[0]}</div>
            <div>
              <div style={styles.userName}>{user?.prenom} {user?.nom}</div>
              <div style={styles.userRole}>{user?.role === 'admin' ? 'Administrateur' : 'Professeur'}</div>
            </div>
          </div>
          <button style={styles.btnLogout} onClick={deconnexion}>↩ Déconnexion</button>
        </div>
      </div>

      {/* Main */}
      <div style={styles.main}>
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
              { icon: '🏫', label: 'Classes', value: stats.classes, color: '#10b981', bg: '#d1fae5' },
              { icon: '🎓', label: 'Élèves', value: stats.eleves, color: '#f59e0b', bg: '#fef3c7' },
            ].map(s => (
              <div key={s.label} style={styles.statCard}>
                <div style={{...styles.statIcon, background: s.bg, color: s.color}}>{s.icon}</div>
                <div style={styles.statValue}>{s.value}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={styles.sectionTitle}>Informations utiles</div>
        <div style={styles.infoRow}>
          <div style={styles.infoCard}>
            <div style={styles.infoCardTitle}>📅 Prochains événements</div>
            {dashboardInfo.prochains_evenements.length === 0
              ? <div style={styles.infoEmpty}>Aucun événement à venir</div>
              : dashboardInfo.prochains_evenements.map((ev, i) => (
                <div key={i} style={{ ...(i > 0 ? { marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' } : {}) }}>
                  <div style={styles.infoMain}>{ev.titre}</div>
                  <div style={styles.infoSub}>{fmtDate(ev.date_debut)} • {ev.type || 'Événement'}</div>
                </div>
              ))
            }
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
            onBlur={() => sauvegarderMemo(memo)}
            placeholder="Écrivez vos notes, rappels, mémos ici..."
            style={{ width: '100%', minHeight: 120, border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', color: '#1e293b', lineHeight: 1.6 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 8 }}>
            {memoSaved && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>✓ Sauvegardé</span>}
            {memoSaving && <span style={{ fontSize: 12, color: '#94a3b8' }}>Sauvegarde...</span>}
            <button onClick={() => sauvegarderMemo(memo)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#6366f1', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Sauvegarder
            </button>
          </div>
        </div>
      </div>

      {observationDetail && (
        <div style={styles.overlay} onClick={() => setObservationDetail(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>👁 Détail de l'observation</h3>
              <button style={styles.btnClose} onClick={() => setObservationDetail(null)}>✕</button>
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
  page: { display: 'flex', minHeight: '100vh', background: '#ede9fe', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  sidebar: { width: 240, background: 'white', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, borderRight: '1px solid #ddd6fe', boxShadow: '2px 0 12px rgba(99,102,241,0.07)' },
  logo: { padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #ede9fe' },
  logoImg: { width: 90, height: 'auto', display: 'block' },
  nav: { flex: 1, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#ede9fe', border: 'none', borderRadius: 8, cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background 0.15s' },
  navIcon: { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  navLabel: { fontSize: 13, fontWeight: 500, color: '#4c1d95', flex: 1 },
  navBadge: { fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99 },
  sidebarFooter: { padding: '16px', borderTop: '1px solid #ede9fe' },
  userInfo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 600, color: '#1e1b4b' },
  userRole: { fontSize: 11, color: '#7c3aed', marginTop: 1 },
  btnLogout: { width: '100%', padding: '8px', background: '#ede9fe', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#6366f1', fontWeight: 600 },
  main: { marginLeft: 240, flex: 1, padding: '32px 36px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  greeting: { fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 },
  subGreeting: { fontSize: 13, color: '#64748b', margin: '4px 0 0' },
  topBarRight: { display: 'flex', alignItems: 'center', gap: 12 },
  dateBadge: { fontSize: 12, color: '#64748b', background: 'white', padding: '6px 14px', borderRadius: 99, border: '1px solid #e2e8f0', fontWeight: 500, textTransform: 'capitalize' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 },
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