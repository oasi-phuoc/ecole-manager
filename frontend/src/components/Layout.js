import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { clearSessionUser, getSessionUser, fetchSessionUser } from '../utils/session';
import { ICONS_BY_PATH } from './DashboardIcons';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';
const W = 185;

const ACCES_DEFAUT_PROF = { eleves: true, classes: false, branches: false, emploi_du_temps: false, presences: true, notes: true, bulletins: true, tcf: false, calendrier: true, comptabilite: false, documents: false, statistiques: false, professeurs: true, enclassement: false, sorties_scolaires: false };

const PARAMS_ONGLETS = [
  { key: 'profil',  label: 'Mon profil',              adminOnly: false },
  { key: 'mfa',    label: 'Double authentification',  adminOnly: false },
  { key: 'ecole',  label: 'École',                    adminOnly: true },
  { key: 'mail',   label: 'Envoi des mails',          adminOnly: true },
  { key: 'acces',  label: 'Gestion des accès',        adminOnly: true },
  { key: 'danger', label: 'Réinitialisation',         adminOnly: true },
];

const ALL_MODULES = [
  { label: 'Employés',          path: '/employes-administratifs', adminOnly: true },
  { label: 'Professeurs',       path: '/professeurs',             accentKey: 'professeurs' },
  { label: 'Élèves',            path: '/eleves',                  accentKey: 'eleves' },
  { label: 'Branches',          path: '/branches',                accentKey: 'branches' },
  { label: 'Classes',           path: '/classes',                 accentKey: 'classes' },
  { label: 'Plannings',         path: '/emploi-du-temps',         accentKey: 'emploi_du_temps' },
  { label: 'Présences',         path: '/presences',               accentKey: 'presences' },
  { label: 'Notes',             path: '/notes',                   accentKey: 'notes' },
  { label: 'TCF',               path: '/tcf',                     accentKey: 'tcf' },
  { label: 'Calendrier',        path: '/calendrier',              accentKey: 'calendrier' },
  { label: 'Comptabilité',      path: '/comptabilite',            accentKey: 'comptabilite' },
  { label: 'Documents',         path: '/documents-administratifs',accentKey: 'documents' },
  { label: 'Statistiques',      path: '/statistiques',            accentKey: 'statistiques' },
  { label: 'Enclassement',      path: '/enclassement',            accentKey: 'enclassement' },
  { label: 'Sorties scolaires', path: '/sorties-scolaires',       accentKey: 'sorties_scolaires' },
  { label: 'Paramètres',        path: '/parametres' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [accesProfs, setAccesProfs] = useState({});
  const [hoveredPath, setHoveredPath] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const init = async () => {
      const cached = getSessionUser();
      if (cached) setUser(cached);
      try {
        const u = await fetchSessionUser();
        setUser(u || null);
      } catch {}
      try {
        const res = await axios.get(API + '/parametres/acces-profs');
        setAccesProfs(res.data || {});
      } catch {}
    };
    init();
  }, []);

  const deconnexion = async () => {
    try { await axios.post(API + '/auth/logout'); } catch {}
    clearSessionUser();
    navigate('/login', { replace: true });
  };

  const isAdmin = user?.role === 'admin';
  const roleKey = user?.role === 'prof'          ? 'professeurs'
                : user?.role === 'employe_admin'  ? 'employes_admin'
                : user?.role === 'responsable'    ? 'responsables'
                : null;

  const modules = ALL_MODULES.filter(m => {
    if (isAdmin) return true;
    if (m.adminOnly) return false;
    if (!m.accentKey) return true;
    const roleAcces = roleKey ? (accesProfs[roleKey] || {}) : {};
    const val = roleAcces[m.accentKey];
    return val !== undefined ? val : (ACCES_DEFAUT_PROF[m.accentKey] !== false);
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" }}>
      {/* Sidebar fixe */}
      <div style={s.sidebar}>
        <div style={s.logo}>
          <img src="/logo-oasis.webp" alt="Oasis" style={s.logoImg}
            onClick={() => navigate('/dashboard')} title="Tableau de bord" />
        </div>

        <nav style={s.nav}>
          {modules.map(m => {
            const IconComp = ICONS_BY_PATH[m.path];
            const isActive = location.pathname === m.path || location.pathname.startsWith(m.path + '/');
            const isHov = hoveredPath === m.path;
            const highlight = isActive || isHov;
            return (
              <React.Fragment key={m.path}>
                <button
                  style={{ ...s.navItem, background: isActive ? '#ede9fe' : isHov ? '#f5f3ff' : 'transparent' }}
                  onClick={() => navigate(m.path)}
                  onMouseEnter={() => setHoveredPath(m.path)}
                  onMouseLeave={() => setHoveredPath(null)}>
                  {IconComp && <IconComp size={16} active={isActive} />}
                  <span style={{ ...s.navLabel, color: isActive ? '#4c1d95' : '#6d6d8a', fontWeight: isActive ? 700 : 600 }}>
                    {m.label}
                  </span>
                  {isActive && <span style={s.activeDot} />}
                </button>
                {m.path === '/parametres' && isActive && (
                  <div style={s.subNav}>
                    {PARAMS_ONGLETS.filter(o => !o.adminOnly || isAdmin).map(o => {
                      const activeTab = new URLSearchParams(location.search).get('tab') || 'profil';
                      const isTabActive = activeTab === o.key;
                      return (
                        <button key={o.key}
                          style={{ ...s.subNavItem, background: isTabActive ? '#ddd6fe' : 'transparent', color: isTabActive ? '#4c1d95' : '#6d6d8a', fontWeight: isTabActive ? 700 : 500 }}
                          onClick={e => { e.stopPropagation(); navigate(`/parametres?tab=${o.key}`); }}>
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        <div style={s.footer}>
          <div style={s.avatar} title={`${user?.prenom || ''} ${user?.nom || ''}`}>
            {user?.prenom?.[0]}{user?.nom?.[0]}
          </div>
          <div style={s.userName}>{user?.prenom} {user?.nom}</div>
        </div>
        <button style={s.btnDeconnexion} onClick={() => setShowLogoutConfirm(true)}>Se déconnecter</button>
      </div>

      {showLogoutConfirm && (
        <div style={s.modalOverlay}>
          <div style={s.modalBox}>
            <div style={{fontSize:15,fontWeight:700,color:'#0f172a',marginBottom:8}}>Déconnexion</div>
            <div style={{fontSize:13,color:'#475569',marginBottom:20}}>Voulez-vous vraiment vous déconnecter ?</div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button style={s.modalBtnCancel} onClick={() => setShowLogoutConfirm(false)}>Annuler</button>
              <button style={s.modalBtnConfirm} onClick={deconnexion}>Déconnecter</button>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <div style={{ marginLeft: W, flex: 1, minHeight: '100vh', background: '#f8fafc' }}>
        <Outlet />
      </div>
    </div>
  );
}

const s = {
  sidebar: { width: W, background: 'white', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, borderRight: '1px solid #ddd6fe', boxShadow: '2px 0 12px rgba(99,102,241,0.07)' },
  logo: { padding: '14px 0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #ede9fe' },
  logoImg: { height: 36, objectFit: 'contain', cursor: 'pointer' },
  nav: { flex: 1, padding: '6px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 },
  navItem: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, padding: '8px 10px', border: 'none', borderRadius: 8, cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background 0.12s', position: 'relative', color: '#6366f1' },
  navLabel: { fontSize: 12, lineHeight: 1.2, flex: 1 },
  activeDot: { width: 5, height: 5, borderRadius: '50%', background: '#6366f1', flexShrink: 0 },
  subNav: { display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 8, marginTop: 1 },
  subNavItem: { display: 'block', padding: '7px 10px', border: 'none', borderRadius: 7, cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: 11, fontFamily: 'inherit', transition: 'background 0.1s' },
  footer: { padding: '10px 10px 12px', borderTop: '1px solid #ede9fe', display: 'flex', alignItems: 'center', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 },
  userName: { fontSize: 10, color: '#4c1d95', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  btnLogout: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#94a3b8', padding: 2, flexShrink: 0 },
  btnDeconnexion: { margin: '0 8px 10px', padding: '7px 10px', background: '#fee2e2', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 11, color: '#dc2626', fontWeight: 600, fontFamily: 'inherit', textAlign: 'center' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 },
  modalBox: { background: 'white', borderRadius: 12, padding: '24px 28px', width: 300, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' },
  modalBtnCancel: { padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569', fontFamily: 'inherit' },
  modalBtnConfirm: { padding: '8px 16px', background: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'white', fontFamily: 'inherit' },
};
