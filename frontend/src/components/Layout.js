import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { clearSessionUser, getSessionUser, fetchSessionUser } from '../utils/session';
import { ICONS_BY_PATH } from './DashboardIcons';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';
const W = 185;

const ACCES_DEFAUT_PROF = { eleves: true, classes: false, branches: false, emploi_du_temps: false, presences: true, notes: true, bulletins: true, tcf: false, calendrier: true, comptabilite: false, documents: false, statistiques: false, professeurs: true, enclassement: false, sorties_scolaires: false };

const CLASSES_DETAIL_TABS = [
  { key: 'eleves',        label: 'Liste des élèves' },
  { key: 'inventaire',    label: 'Inventaire' },
  { key: 'devoirs',       label: 'Suivi des devoirs' },
  { key: 'plan',          label: 'Plan de classe' },
  { key: 'trombinoscope', label: 'Trombinoscope' },
];

const PRESENCES_ONGLETS = [
  { key: 'saisie', label: 'Saisie' },
  { key: 'apercu', label: 'Aperçu du mois' },
  { key: 'stats',  label: 'Statistiques' },
];

const TCF_ONGLETS = [
  { key: 'pool',        label: 'Pool',         adminOnly: true },
  { key: 'affectation', label: 'Affectation',  adminOnly: true },
  { key: 'resultats',   label: 'Résultats',    adminOnly: false },
  { key: 'plannings',   label: 'Plannings',    adminOnly: false },
  { key: 'graphique',   label: 'Graphique',    adminOnly: false },
  { key: 'stats',       label: 'Statistiques', adminOnly: false },
];

const EDT_ONGLETS = [
  { key: 'pools',          label: 'Pools',          adminOnly: true },
  { key: 'disponibilites', label: 'Disponibilités', adminOnly: true },
  { key: 'affectations',   label: 'Affectations',   adminOnly: true },
  { key: 'plannings',      label: 'Plannings',      adminOnly: false },
];

const NOTES_ONGLETS = [
  { key: 'evaluations',   label: 'Évaluations',      adminOnly: false },
  { key: 'generale',      label: 'Vue générale',      adminOnly: false },
  { key: 'comportements', label: 'Comportements',     adminOnly: false },
  { key: 'bulletin',      label: 'Bulletin de notes', adminOnly: false },
];

const PARAMS_ONGLETS = [
  { key: 'profil',  label: 'Mon profil',              adminOnly: false },
  { key: 'mfa',    label: 'Double authentification',  adminOnly: false },
  { key: 'ecole',  label: 'École',                    adminOnly: true },
  { key: 'mail',   label: 'Envoi des mails',          adminOnly: true },
  { key: 'acces',  label: 'Gestion des accès',        adminOnly: true },
  { key: 'danger', label: 'Réinitialisation',         adminOnly: true },
];

const DOCS_ONGLETS = [
  { key: 'accueil',        label: 'Accueil',        adminOnly: false },
  { key: 'administratifs', label: 'Administratifs', adminOnly: false },
  { key: 'pedagogiques',   label: 'Pédagogiques',   adminOnly: false },
  { key: 'seances',        label: 'Séances',        adminOnly: false },
  { key: 'formulaires',    label: 'Formulaires',    adminOnly: false },
  { key: 'divers',         label: 'Divers',         adminOnly: false },
];

const ALL_MODULES = [
  { label: 'Employés',          path: '/employes-administratifs', adminOnly: true },
  { label: 'Professeurs',       path: '/professeurs',             accentKey: 'professeurs' },
  { label: 'Élèves',            path: '/eleves',                  accentKey: 'eleves' },
  { label: 'Branches',          path: '/branches',                accentKey: 'branches' },
  { label: 'Classes',           path: '/classes',                 accentKey: 'classes' },
  { label: 'Présences',         path: '/presences',               accentKey: 'presences' },
  { label: 'Notes',             path: '/notes',                   accentKey: 'notes' },
  { label: 'Calendrier',        path: '/calendrier',              accentKey: 'calendrier' },
  { label: 'Comptabilité',      path: '/comptabilite',            accentKey: 'comptabilite' },
  { label: 'Sorties scolaires', path: '/sorties-scolaires',       accentKey: 'sorties_scolaires' },
  { label: 'Documents',         path: '/documents-administratifs',accentKey: 'documents' },
  { label: 'Emploi du temps',   path: '/emploi-du-temps',         accentKey: 'emploi_du_temps' },
  { label: 'TCF',               path: '/tcf',                     accentKey: 'tcf' },
  { label: 'Statistiques',      path: '/statistiques',            accentKey: 'statistiques' },
  { label: 'Sondage',           path: '/sondage',                 accentKey: 'sondage' },
  { label: 'Enclassement',      path: '/enclassement',            accentKey: 'enclassement' },
  { label: 'Visite de classes', path: '/visite-classes',          accentKey: 'visite_classes' },
  { label: 'Paramètres',        path: '/parametres' },
];

const PinIcon = ({ pinned }) => (
  <svg width={12} height={12} viewBox="0 0 24 24"
    fill={pinned ? '#6366f1' : 'none'}
    stroke={pinned ? '#6366f1' : '#cbd5e1'}
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    style={{ display: 'block', flexShrink: 0 }}>
    <line x1="12" y1="17" x2="12" y2="22"/>
    <path d="M5 17H19V15C14 15 14 9 12 9C10 9 10 15 5 15V17Z"/>
    <line x1="12" y1="9" x2="12" y2="3"/>
  </svg>
);

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [accesProfs, setAccesProfs] = useState({});
  const [hoveredPath, setHoveredPath] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [pinnedPaths, setPinnedPaths] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_pinned');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ALL_MODULES.map(m => m.path);
  });

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

  useEffect(() => {
    if (!showMoreMenu) return;
    const close = () => setShowMoreMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showMoreMenu]);

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

  const togglePin = (path, e) => {
    e.stopPropagation();
    setPinnedPaths(prev => {
      const next = prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path];
      localStorage.setItem('sidebar_pinned', JSON.stringify(next));
      return next;
    });
  };

  const pinnedModules   = modules.filter(m => pinnedPaths.includes(m.path));
  const unpinnedModules = modules.filter(m => !pinnedPaths.includes(m.path));

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" }}>
      {/* Sidebar fixe */}
      <div style={s.sidebar}>
        <div style={s.logo}>
          <img src="/logo-oasis.webp" alt="Oasis" style={s.logoImg}
            onClick={() => navigate('/dashboard')} title="Tableau de bord" />
        </div>

        <nav style={s.nav}>
          {pinnedModules.map(m => {
            const IconComp = ICONS_BY_PATH[m.path];
            const isActive = location.pathname === m.path || location.pathname.startsWith(m.path + '/');
            const isHov = hoveredPath === m.path;
            return (
              <React.Fragment key={m.path}>
                <button
                  style={{ ...s.navItem, background: isActive ? '#ede9fe' : isHov ? '#f5f3ff' : 'transparent' }}
                  onClick={() => {
                    if (m.path === '/comptabilite') {
                      navigate(isAdmin ? '/comptabilite?tab=classes' : '/comptabilite?tab=paiements');
                    } else if (m.path === '/documents-administratifs') {
                      navigate('/documents-administratifs?tab=accueil');
                    } else {
                      navigate(m.path);
                    }
                  }}
                  onMouseEnter={() => setHoveredPath(m.path)}
                  onMouseLeave={() => setHoveredPath(null)}>
                  {IconComp && <IconComp size={16} active={isActive} />}
                  <span style={{ ...s.navLabel, color: isActive ? '#4c1d95' : '#6d6d8a', fontWeight: isActive ? 700 : 600 }}>
                    {m.label}
                  </span>
                  {isHov && (
                    <span onClick={e => togglePin(m.path, e)} title="Désépingler" style={s.pinBtn}>
                      <PinIcon pinned={true} />
                    </span>
                  )}
                </button>
                {m.path === '/classes' && isActive && (() => {
                  const params = new URLSearchParams(location.search);
                  const detailId = params.get('detail');
                  if (!detailId) return null;
                  const activeTab = params.get('tab') || 'eleves';
                  return (
                    <div style={s.subNav}>
                      {CLASSES_DETAIL_TABS.map(o => (
                        <button key={o.key}
                          style={{ ...s.subNavItem, background: activeTab===o.key ? '#ddd6fe' : 'transparent', color: activeTab===o.key ? '#4c1d95' : '#6d6d8a', fontWeight: activeTab===o.key ? 700 : 500 }}
                          onClick={e => { e.stopPropagation(); navigate(`/classes?detail=${detailId}&tab=${o.key}`); }}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  );
                })()}
                {m.path === '/presences' && isActive && (
                  <div style={s.subNav}>
                    {PRESENCES_ONGLETS.map(o => {
                      const activeTab = new URLSearchParams(location.search).get('tab') || 'saisie';
                      const isTabActive = activeTab === o.key;
                      return (
                        <button key={o.key}
                          style={{ ...s.subNavItem, background: isTabActive ? '#ddd6fe' : 'transparent', color: isTabActive ? '#4c1d95' : '#6d6d8a', fontWeight: isTabActive ? 700 : 500 }}
                          onClick={e => { e.stopPropagation(); navigate(`/presences?tab=${o.key}`); }}>
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {m.path === '/tcf' && isActive && (
                  <div style={s.subNav}>
                    {TCF_ONGLETS.filter(o => !o.adminOnly || isAdmin).map(o => {
                      const activeTab = new URLSearchParams(location.search).get('tab') || 'pool';
                      const isTabActive = activeTab === o.key;
                      return (
                        <button key={o.key}
                          style={{ ...s.subNavItem, background: isTabActive ? '#ddd6fe' : 'transparent', color: isTabActive ? '#4c1d95' : '#6d6d8a', fontWeight: isTabActive ? 700 : 500 }}
                          onClick={e => { e.stopPropagation(); navigate(`/tcf?tab=${o.key}`); }}>
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {m.path === '/notes' && isActive && (() => {
                  const params = new URLSearchParams(location.search);
                  const classeId = params.get('classeId');
                  if (!classeId) return null;
                  const activeTab = params.get('tab') || 'evaluations';
                  return (
                    <div style={s.subNav}>
                      {NOTES_ONGLETS.map(o => (
                        <button key={o.key}
                          style={{ ...s.subNavItem, background: activeTab === o.key ? '#ddd6fe' : 'transparent', color: activeTab === o.key ? '#4c1d95' : '#6d6d8a', fontWeight: activeTab === o.key ? 700 : 500 }}
                          onClick={e => { e.stopPropagation(); navigate(`/notes?tab=${o.key}&classeId=${classeId}`); }}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  );
                })()}
                {m.path === '/emploi-du-temps' && isActive && (
                  <div style={s.subNav}>
                    {EDT_ONGLETS.filter(o => !o.adminOnly || isAdmin).map(o => {
                      const activeTab = new URLSearchParams(location.search).get('tab') || (isAdmin ? 'pools' : 'plannings');
                      const isTabActive = activeTab === o.key;
                      return (
                        <button key={o.key}
                          style={{ ...s.subNavItem, background: isTabActive ? '#ddd6fe' : 'transparent', color: isTabActive ? '#4c1d95' : '#6d6d8a', fontWeight: isTabActive ? 700 : 500 }}
                          onClick={e => { e.stopPropagation(); navigate(`/emploi-du-temps?tab=${o.key}`); }}>
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                )}
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
                {m.path === '/documents-administratifs' && isActive && (
                  <div style={s.subNav}>
                    {DOCS_ONGLETS.filter(o => !o.adminOnly || isAdmin).map(o => {
                      const activeTab = new URLSearchParams(location.search).get('tab') || 'accueil';
                      const isTabActive = activeTab === o.key;
                      return (
                        <button key={o.key}
                          style={{ ...s.subNavItem, background: isTabActive ? '#ddd6fe' : 'transparent', color: isTabActive ? '#4c1d95' : '#6d6d8a', fontWeight: isTabActive ? 700 : 500 }}
                          onClick={e => { e.stopPropagation(); navigate(`/documents-administratifs?tab=${o.key}`); }}>
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Bouton "..." pour les items non épinglés */}
          {unpinnedModules.length > 0 && (
            <div style={{ position: 'relative', marginTop: 4 }}>
              <button
                style={{ ...s.navItem, justifyContent: 'center', gap: 0, background: showMoreMenu ? '#ede9fe' : 'transparent' }}
                onClick={e => { e.stopPropagation(); setShowMoreMenu(v => !v); }}
                title="Autres modules">
                <div style={s.moreBtn}>
                  <span style={s.moreDot}/><span style={s.moreDot}/><span style={s.moreDot}/>
                </div>
              </button>
              {showMoreMenu && (
                <div style={s.moreDropdown} onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 12px 4px' }}>
                    Modules non épinglés
                  </div>
                  {unpinnedModules.map(m => {
                    const IconComp = ICONS_BY_PATH[m.path];
                    const isActive = location.pathname === m.path || location.pathname.startsWith(m.path + '/');
                    return (
                      <div key={m.path} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 7, cursor: 'pointer', background: isActive ? '#ede9fe' : 'transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = isActive ? '#ede9fe' : '#f5f3ff'}
                        onMouseLeave={e => e.currentTarget.style.background = isActive ? '#ede9fe' : 'transparent'}
                        onClick={() => {
                          if (m.path === '/comptabilite') {
                            navigate(isAdmin ? '/comptabilite?tab=classes' : '/comptabilite?tab=paiements');
                          } else if (m.path === '/documents-administratifs') {
                            navigate('/documents-administratifs?tab=accueil');
                          } else {
                            navigate(m.path);
                          }
                          setShowMoreMenu(false);
                        }}>
                        {IconComp && <IconComp size={15} active={isActive} />}
                        <span style={{ ...s.navLabel, flex: 1, color: isActive ? '#4c1d95' : '#6d6d8a', fontWeight: isActive ? 700 : 500 }}>{m.label}</span>
                        <span onClick={e => { togglePin(m.path, e); }} title="Épingler" style={s.pinBtn}>
                          <PinIcon pinned={false} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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

      {/* Contenu principal : seul défilement de l’app — sticky des pages par rapport à cette zone */}
      <div style={{ marginLeft: W, flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <Outlet />
        </div>
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
  pinBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 3, borderRadius: 4, cursor: 'pointer', flexShrink: 0, opacity: 0.7, transition: 'opacity 0.1s' },
  moreBtn: { display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 99, background: '#ede9fe' },
  moreDot: { display: 'block', width: 5, height: 5, borderRadius: '50%', background: '#6366f1' },
  moreDropdown: { position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: 'white', borderRadius: 12, boxShadow: '0 8px 30px rgba(99,102,241,0.15)', border: '1px solid #ede9fe', zIndex: 200, padding: '4px 4px 8px' },
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
