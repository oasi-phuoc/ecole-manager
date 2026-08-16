import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { clearSessionUser, getSessionUser, fetchSessionUser } from '../utils/session';
import { ICONS_BY_PATH } from './DashboardIcons';
import { useIsMobile, MOBILE_BREAKPOINT } from '../hooks/useIsMobile';
import MobilePageEnhancer from './MobilePageEnhancer';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';
const W = 200;
const TOP_BAR_H = 52;

const ACCES_DEFAUT_PROF = {
  eleves: true, classes: false, branches: false, emploi_du_temps: false, presences: true, notes: true, bulletins: true, tcf: false, calendrier: true, comptabilite: false, documents: false, statistiques: false, professeurs: true, enclassement: false, sorties_scolaires: false,
  visite_classes: true, sondage: true,
};

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
  { key: 'attestation',   label: 'Attestations',      adminOnly: false },
];

const PARAMS_ONGLETS = [
  { key: 'profil',  label: 'Mon profil',              adminOnly: false },
  { key: 'ecole',  label: 'École',                    adminOnly: true },
  { key: 'mail',   label: 'Envoi des mails',          adminOnly: true },
  { key: 'acces',  label: 'Gestion des accès',        adminOnly: true },
  { key: 'danger', label: 'Réinitialisation',         adminOnly: true },
];

const DOCS_ONGLETS = [
  { key: 'administratifs', label: 'Administratifs', adminOnly: false },
  { key: 'pedagogiques',   label: 'Pédagogiques',   adminOnly: false },
  { key: 'seances',        label: 'Séances',        adminOnly: false },
  { key: 'formulaires',    label: 'Formulaires',    adminOnly: false },
  { key: 'divers',         label: 'Divers',         adminOnly: false },
];

const COMPTA_ONGLETS = [
  { key: 'factures',  label: 'Factures',      adminOnly: false },
  { key: 'paiements', label: 'Paiements',     adminOnly: false },
  { key: 'commandes', label: 'Commandes',     adminOnly: true  },
  { key: 'prix',      label: 'Liste de prix', adminOnly: false },
];

const CONTROLE_QUALITE_ONGLETS = [
  { key: 'visites', label: 'Visite de classe', accentKey: 'visite_classes' },
  { key: 'feedback', label: 'Feedback', accentKey: 'visite_classes' },
  { key: 'sondage', label: 'Sondage', accentKey: 'sondage' },
  { key: 'statistiques', label: 'Statistiques', accentKey: 'statistiques' },
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
  { label: 'Enclassement',      path: '/enclassement',            accentKey: 'enclassement' },
  { label: 'Contrôle qualité', path: '/controle-qualite' },
  { label: 'Paramètres',        path: '/parametres' },
];

const PinIcon = ({ pinned }) => (
  <svg width={13} height={13} viewBox="0 0 256 256"
    style={{ display: 'block', flexShrink: 0 }}>
    <path
      d="M229.66,74.34l-48-48a8,8,0,0,0-11.32,11.32L178,45.31l-58.43,58.44a56.13,56.13,0,0,0-52.22,14.88,8,8,0,0,0,0,11.31l39,39L34.34,218.34a8,8,0,0,0,11.32,11.32l72-72,39,39a8,8,0,0,0,11.31,0,56.13,56.13,0,0,0,14.88-52.22L241,85.66l7.66,7.65a8,8,0,0,0,11.32-11.32Z"
      fill={pinned ? '#6366f1' : '#cbd5e1'}
    />
    {!pinned && (
      <line x1="34" y1="34" x2="222" y2="222"
        stroke="#64748b" strokeWidth={20} strokeLinecap="round" />
    )}
  </svg>
);

const HamburgerIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" stroke="#4c1d95" strokeWidth={2} strokeLinecap="round" />
  </svg>
);

function getCurrentPageTitle(pathname) {
  if (pathname === '/dashboard') return 'Tableau de bord';
  const mod = ALL_MODULES.find(
    (m) =>
      pathname === m.path ||
      pathname.startsWith(m.path + '/') ||
      (m.path === '/controle-qualite' && pathname === '/statistiques'),
  );
  return mod?.label || 'Oasis';
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  const [user, setUser] = useState(null);
  const [accesProfs, setAccesProfs] = useState({});
  const [hoveredPath, setHoveredPath] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pinnedPaths, setPinnedPaths] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_pinned');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ALL_MODULES.map(m => m.path);
  });

  useEffect(() => {
    setPinnedPaths((prev) => {
      const next = prev.map((p) => (
        (p === '/visite-classes' || p === '/sondage' || p === '/statistiques') ? '/controle-qualite' : p
      ));
      const dedup = [...new Set(next)];
      if (JSON.stringify(dedup) !== JSON.stringify(prev)) {
        try { localStorage.setItem('sidebar_pinned', JSON.stringify(dedup)); } catch {}
      }
      return dedup;
    });
  }, []);

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

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen || !isMobile) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [drawerOpen, isMobile]);

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

  const profAccesCle = (cle) => {
    if (isAdmin) return true;
    const roleAcces = roleKey ? (accesProfs[roleKey] || {}) : {};
    const val = roleAcces[cle];
    return val !== undefined ? val : (ACCES_DEFAUT_PROF[cle] !== false);
  };

  const modules = ALL_MODULES.filter(m => {
    if (isAdmin) return true;
    if (m.adminOnly) return false;
    if (m.path === '/controle-qualite') {
      return profAccesCle('visite_classes') || profAccesCle('sondage') || profAccesCle('statistiques');
    }
    if (!m.accentKey) return true;
    return profAccesCle(m.accentKey);
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
  const currentPageTitle = getCurrentPageTitle(location.pathname);

  const navigateToModule = (m, onAfterNavigate) => {
    if (m.path === '/comptabilite') {
      navigate('/comptabilite?tab=classes');
    } else if (m.path === '/documents-administratifs') {
      navigate('/documents-administratifs?tab=administratifs');
    } else if (m.path === '/controle-qualite') {
      const premier = CONTROLE_QUALITE_ONGLETS.find((o) => profAccesCle(o.accentKey))?.key || 'visites';
      navigate(`/controle-qualite?tab=${premier}`);
    } else {
      navigate(m.path);
    }
    onAfterNavigate?.();
  };

  const isModuleActive = (path) =>
    location.pathname === path ||
    location.pathname.startsWith(path + '/') ||
    (path === '/controle-qualite' && location.pathname === '/statistiques');

  const renderNav = (options = {}) => {
    const { onAfterNavigate, inDrawer = false } = options;
    const showPin = (isHov) => inDrawer || isHov;

    return (
      <nav style={s.nav}>
        {pinnedModules.map(m => {
          const IconComp = ICONS_BY_PATH[m.path];
          const isActive = isModuleActive(m.path);
          const isHov = hoveredPath === m.path;
          return (
            <React.Fragment key={m.path}>
              <button
                style={{ ...s.navItem, background: isActive ? '#ede9fe' : isHov ? '#f5f3ff' : 'transparent' }}
                onClick={() => navigateToModule(m, onAfterNavigate)}
                onMouseEnter={() => setHoveredPath(m.path)}
                onMouseLeave={() => setHoveredPath(null)}>
                {IconComp && <IconComp size={16} active={isActive} />}
                <span style={{ ...s.navLabel, color: isActive ? '#4c1d95' : '#6d6d8a', fontWeight: isActive ? 700 : 600 }}>
                  {m.label}
                </span>
                {showPin(isHov) && (
                  <span onClick={e => togglePin(m.path, e)} title="Désépingler" style={{ ...s.pinBtn, opacity: inDrawer ? 1 : 0.7 }}>
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
                        onClick={e => { e.stopPropagation(); navigate(`/classes?detail=${detailId}&tab=${o.key}`); onAfterNavigate?.(); }}>
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
                        onClick={e => { e.stopPropagation(); navigate(`/presences?tab=${o.key}`); onAfterNavigate?.(); }}>
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
                        onClick={e => { e.stopPropagation(); navigate(`/tcf?tab=${o.key}`); onAfterNavigate?.(); }}>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {m.path === '/controle-qualite' && isActive && (
                <div style={s.subNav}>
                  {CONTROLE_QUALITE_ONGLETS.filter((o) => profAccesCle(o.accentKey)).map((o) => {
                    const activeTab = new URLSearchParams(location.search).get('tab') || 'visites';
                    const isTabActive = activeTab === o.key;
                    return (
                      <button
                        key={o.key}
                        type="button"
                        style={{ ...s.subNavItem, background: isTabActive ? '#ddd6fe' : 'transparent', color: isTabActive ? '#4c1d95' : '#6d6d8a', fontWeight: isTabActive ? 700 : 500 }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/controle-qualite?tab=${o.key}`); onAfterNavigate?.(); }}
                      >
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
                        onClick={e => { e.stopPropagation(); navigate(`/notes?tab=${o.key}&classeId=${classeId}`); onAfterNavigate?.(); }}>
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
                        onClick={e => { e.stopPropagation(); navigate(`/emploi-du-temps?tab=${o.key}`); onAfterNavigate?.(); }}>
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
                        onClick={e => { e.stopPropagation(); navigate(`/parametres?tab=${o.key}`); onAfterNavigate?.(); }}>
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
                        onClick={e => { e.stopPropagation(); navigate(`/documents-administratifs?tab=${o.key}`); onAfterNavigate?.(); }}>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {m.path === '/comptabilite' && isActive && (
                <div style={s.subNav}>
                  {(() => {
                    const params = new URLSearchParams(location.search);
                    const classeId = params.get('classeId');
                    const ongletsCompta = COMPTA_ONGLETS
                      .filter(o => !o.adminOnly || isAdmin)
                      .filter(o => (o.key === 'factures' ? !!classeId : true));
                    return ongletsCompta.map(o => {
                    const activeTab = new URLSearchParams(location.search).get('tab') || (isAdmin ? 'classes' : 'paiements');
                    const isTabActive = activeTab === o.key;
                    const target = o.key === 'factures' && classeId
                      ? `/comptabilite?tab=factures&classeId=${classeId}`
                      : `/comptabilite?tab=${o.key}`;
                    return (
                      <button key={o.key}
                        style={{ ...s.subNavItem, background: isTabActive ? '#ddd6fe' : 'transparent', color: isTabActive ? '#4c1d95' : '#6d6d8a', fontWeight: isTabActive ? 700 : 500 }}
                        onClick={e => { e.stopPropagation(); navigate(target); onAfterNavigate?.(); }}>
                        {o.label}
                      </button>
                    );
                    });
                  })()}
                </div>
              )}
            </React.Fragment>
          );
        })}

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
              <div style={inDrawer ? s.moreDropdownDrawer : s.moreDropdown} onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 12px 4px' }}>
                  Modules non épinglés
                </div>
                {unpinnedModules.map(m => {
                  const IconComp = ICONS_BY_PATH[m.path];
                  const isActive = isModuleActive(m.path);
                  return (
                    <div key={m.path} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 7, cursor: 'pointer', background: isActive ? '#ede9fe' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = isActive ? '#ede9fe' : '#f5f3ff'}
                      onMouseLeave={e => e.currentTarget.style.background = isActive ? '#ede9fe' : 'transparent'}
                      onClick={() => {
                        navigateToModule(m, () => {
                          setShowMoreMenu(false);
                          onAfterNavigate?.();
                        });
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
    );
  };

  const renderSidebarFooter = () => (
    <>
      <div style={s.footer}>
        <div style={s.avatar} title={`${user?.prenom || ''} ${user?.nom || ''}`}>
          {user?.prenom?.[0]}{user?.nom?.[0]}
        </div>
        <div style={s.userName}>{user?.prenom} {user?.nom}</div>
      </div>
      <button style={s.btnDeconnexion} onClick={() => setShowLogoutConfirm(true)}>Se déconnecter</button>
    </>
  );

  return (
    <div
      className={isMobile ? 'layout-mobile' : 'layout-desktop'}
      style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" }}
    >
      {/* Desktop sidebar */}
      {!isMobile && (
        <div style={s.sidebar}>
          <div style={s.logo}>
            <img src="/logo-oasis.webp" alt="Oasis" style={s.logoImg}
              onClick={() => navigate('/dashboard')} title="Tableau de bord" />
          </div>
          {renderNav()}
          {renderSidebarFooter()}
        </div>
      )}

      {/* Mobile top bar */}
      {isMobile && (
        <header style={s.mobileTopBar}>
          <button
            type="button"
            style={s.hamburgerBtn}
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <HamburgerIcon />
          </button>
          <div style={s.topBarCenter}>
            <img
              src="/logo-oasis.webp"
              alt=""
              style={s.topBarLogo}
              onClick={() => navigate('/dashboard')}
            />
            <span style={s.topBarTitle}>{currentPageTitle}</span>
          </div>
          <button
            type="button"
            style={s.topBarAvatarBtn}
            onClick={() => navigate('/parametres?tab=profil')}
            title={`${user?.prenom || ''} ${user?.nom || ''}`}
            aria-label="Mon profil"
          >
            <div style={s.avatar}>
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </div>
          </button>
        </header>
      )}

      {/* Mobile drawer overlay */}
      {isMobile && drawerOpen && (
        <>
          <div
            style={s.drawerBackdrop}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div style={s.drawer} role="dialog" aria-modal="true" aria-label="Menu de navigation">
            <div style={s.logo}>
              <img src="/logo-oasis.webp" alt="Oasis" style={s.logoImg}
                onClick={() => { navigate('/dashboard'); setDrawerOpen(false); }}
                title="Tableau de bord" />
            </div>
            {renderNav({ onAfterNavigate: () => setDrawerOpen(false), inDrawer: true })}
            {renderSidebarFooter()}
          </div>
        </>
      )}

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

      {/* Contenu principal : seul défilement de l'app — sticky des pages par rapport à cette zone */}
      <div style={{
        marginLeft: isMobile ? 0 : W,
        paddingTop: isMobile ? `calc(${TOP_BAR_H}px + env(safe-area-inset-top, 0px))` : 0,
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
      }}>
        <div
          className="app-page-host"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <MobilePageEnhancer enabled={isMobile} />
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
  moreDropdownDrawer: { position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: 'white', borderRadius: 12, boxShadow: '0 8px 30px rgba(99,102,241,0.15)', border: '1px solid #ede9fe', zIndex: 210, padding: '4px 4px 8px' },
  navLabel: { fontSize: 12, lineHeight: 1.2, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 },
  activeDot: { width: 5, height: 5, borderRadius: '50%', background: '#6366f1', flexShrink: 0 },
  subNav: { display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 8, marginTop: 1 },
  subNavItem: { display: 'block', padding: '7px 10px', border: 'none', borderRadius: 7, cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: 11, fontFamily: 'inherit', transition: 'background 0.1s' },
  footer: { padding: '10px 10px 12px', borderTop: '1px solid #ede9fe', display: 'flex', alignItems: 'center', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 },
  userName: { fontSize: 10, color: '#4c1d95', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  btnLogout: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#94a3b8', padding: 2, flexShrink: 0 },
  btnDeconnexion: { margin: '0 8px 10px', padding: '7px 10px', background: '#fee2e2', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 11, color: '#dc2626', fontWeight: 600, fontFamily: 'inherit', textAlign: 'center' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 16 },
  modalBox: { background: 'white', borderRadius: 12, padding: '24px 28px', width: 'min(300px, 100%)', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', boxSizing: 'border-box' },
  modalBtnCancel: { padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569', fontFamily: 'inherit' },
  modalBtnConfirm: { padding: '8px 16px', background: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'white', fontFamily: 'inherit' },
  mobileTopBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: `calc(${TOP_BAR_H}px + env(safe-area-inset-top, 0px))`,
    zIndex: 150,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 'env(safe-area-inset-top, 0px) 10px 0',
    background: 'white',
    borderBottom: '1px solid #ede9fe',
    boxShadow: '0 2px 12px rgba(99,102,241,0.08)',
  },
  hamburgerBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    padding: 0,
    border: 'none',
    borderRadius: 10,
    background: '#ede9fe',
    cursor: 'pointer',
    flexShrink: 0,
  },
  topBarCenter: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  topBarLogo: {
    height: 26,
    objectFit: 'contain',
    cursor: 'pointer',
    flexShrink: 0,
  },
  topBarTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#4c1d95',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
  },
  topBarAvatarBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    flexShrink: 0,
  },
  drawerBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15,23,42,0.4)',
    zIndex: 180,
  },
  drawer: {
    width: 'min(280px, 86vw)',
    maxWidth: 320,
    background: 'white',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 200,
    borderRight: '1px solid #ddd6fe',
    boxShadow: '4px 0 24px rgba(99,102,241,0.15)',
  },
};
