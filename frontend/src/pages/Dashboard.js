import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { T, colors } from '../styles/theme';

const API = 'https://ecole-manager-backend.onrender.com/api';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ classes: 0, eleves: 0 });
  const [dashboardInfo, setDashboardInfo] = useState({ prochain_evenement: null, dernieres_notes: [], dernieres_observations: [], controle_presence_aujourdhui: { creneau_en_cours: null, classes_en_cours: [] } });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => {
    const u = localStorage.getItem('utilisateur');
    if (u) setUser(JSON.parse(u));
    chargerStats();
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
          prochain_evenement: st.data.prochain_evenement || null,
          dernieres_notes: st.data.dernieres_notes || [],
          dernieres_observations: st.data.dernieres_observations || [],
          controle_presence_aujourdhui: st.data.controle_presence_aujourdhui || { creneau_en_cours: null, classes_en_cours: [] },
        });
      }
    } catch (err) { console.error(err); }
  };

  const deconnexion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  const modules = [
    { icon: '👨‍🏫', label: 'Professeurs', path: '/professeurs', color: '#6366f1', bg: '#e0e7ff', stat: null, statLabel: '', admin: true },
    { icon: '🏫', label: 'Classes', path: '/classes', color: '#10b981', bg: '#d1fae5', stat: stats.classes, statLabel: 'classes', admin: true },
    { icon: '🎓', label: 'Élèves', path: '/eleves', color: '#f59e0b', bg: '#fef3c7', stat: stats.eleves, statLabel: 'élèves', admin: false },
    { icon: '📚', label: 'Branches', path: '/branches', color: '#8b5cf6', bg: '#ede9fe', stat: null, statLabel: '', admin: true },
    { icon: '📅', label: 'Emploi du Temps', path: '/emploi-du-temps', color: '#ef4444', bg: '#fee2e2', stat: null, statLabel: '', admin: false },
    { icon: '✅', label: 'Présences', path: '/presences', color: '#06b6d4', bg: '#cffafe', stat: null, statLabel: '', admin: false },
    { icon: '📝', label: 'Notes', path: '/notes', color: '#ec4899', bg: '#fce7f3', stat: null, statLabel: '', admin: false },
    { icon: '📆', label: 'Calendrier', path: '/calendrier', color: '#14b8a6', bg: '#ccfbf1', stat: null, statLabel: '', admin: false },
    { icon: '💰', label: 'Comptabilité', path: '/comptabilite', color: '#84cc16', bg: '#ecfccb', stat: null, statLabel: '', admin: true },
    { icon: '📊', label: 'Statistiques', path: '/statistiques', color: '#f97316', bg: '#ffedd5', stat: null, statLabel: '', admin: true },
    { icon: '⚙️', label: 'Paramètres', path: '/parametres', color: '#64748b', bg: '#f1f5f9', stat: null, statLabel: '', admin: true },
  ].filter(m => !m.admin || isAdmin);

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
          <span style={styles.logoIcon}>🏛️</span>
          <span style={styles.logoText}>École Manager</span>
        </div>
        <nav style={styles.nav}>
          {modules.map(m => (
            <button key={m.path} style={styles.navItem} onClick={() => navigate(m.path)}>
              <span style={{...styles.navIcon, background: m.bg, color: m.color}}>{m.icon}</span>
              <span style={styles.navLabel}>{m.label}</span>
              {m.stat !== null && <span style={{...styles.navBadge, background: m.bg, color: m.color}}>{m.stat}</span>}
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
            <div style={styles.infoCardTitle}>📅 Prochain événement du calendrier</div>
            {dashboardInfo.prochain_evenement ? (
              <div>
                <div style={styles.infoMain}>{dashboardInfo.prochain_evenement.titre}</div>
                <div style={styles.infoSub}>
                  {fmtDate(dashboardInfo.prochain_evenement.date_debut)} • {dashboardInfo.prochain_evenement.type || 'Événement'}
                </div>
              </div>
            ) : <div style={styles.infoEmpty}>Aucun événement à venir</div>}
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
                <span style={styles.infoLineMain}>{o.eleve_prenom} {o.eleve_nom} • {o.classe || '—'}</span>
                <span style={styles.infoLineSub}>
                  {(o.titre || o.contenu || 'Observation').toString().slice(0, 70)} • {fmtDate(o.created_at)}
                </span>
              </div>
            ))}
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoCardTitle}>✅ Contrôle de présence aujourd'hui</div>
            {!dashboardInfo.controle_presence_aujourdhui?.creneau_en_cours ? (
              <div style={styles.infoEmpty}>Aucune période en cours pour maintenant</div>
            ) : (
              <div>
                <div style={styles.infoSub}>
                  {dashboardInfo.controle_presence_aujourdhui.jour} • {dashboardInfo.controle_presence_aujourdhui.creneau_en_cours.heure_debut} - {dashboardInfo.controle_presence_aujourdhui.creneau_en_cours.heure_fin}
                </div>
                {dashboardInfo.controle_presence_aujourdhui.classes_en_cours.length === 0 ? (
                  <div style={styles.infoEmpty}>Aucune classe affectée sur ce créneau</div>
                ) : dashboardInfo.controle_presence_aujourdhui.classes_en_cours.map((cl) => (
                  <div key={cl.id} style={styles.presenceClassCard}>
                    <div style={styles.presenceClassHead}>
                      <b>{cl.nom}</b>
                      <button
                        style={styles.quickBtn}
                        onClick={() => navigate('/presences', { state: { classe_id: cl.id } })}
                      >
                        Accès rapide
                      </button>
                    </div>
                    <div style={styles.presenceElevesList}>
                      {cl.eleves.map((e) => (
                        <div key={e.id} style={styles.presenceEleveRow}>
                          <span>{e.prenom} {e.nom}</span>
                          <span style={{ ...styles.presenceBadge, ...(e.statut ? {} : { background: '#f1f5f9', color: '#94a3b8' }) }}>
                            {e.statut || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  sidebar: { width: 240, background: '#0f172a', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100 },
  logo: { padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #1e293b' },
  logoIcon: { fontSize: 24 },
  logoText: { fontSize: 15, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px' },
  nav: { flex: 1, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background 0.15s' },
  navIcon: { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  navLabel: { fontSize: 13, fontWeight: 500, color: '#cbd5e1', flex: 1 },
  navBadge: { fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99 },
  sidebarFooter: { padding: '16px', borderTop: '1px solid #1e293b' },
  userInfo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 600, color: '#f1f5f9' },
  userRole: { fontSize: 11, color: '#64748b', marginTop: 1 },
  btnLogout: { width: '100%', padding: '8px', background: '#1e293b', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#94a3b8', fontWeight: 500 },
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
  infoLineMain: { fontSize: 13, fontWeight: 600, color: '#1f2937' },
  infoLineSub: { fontSize: 12, color: '#64748b' },
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
};