// Icônes SVG Dashboard — compatibles outline ET fill
// active=false : contour seul (stroke="currentColor", fill="none")
// active=true  : rempli violet (#6366f1), pas de contour
// fillRule="evenodd" crée des "trous" dans les formes remplies

const C = '#6366f1'; // couleur active (violet thème)

const I = ({ ch, size = 26, active }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill={active ? C : 'none'}
    stroke={active ? 'none' : 'currentColor'}
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    style={{ display: 'block', flexShrink: 0 }}>
    {ch}
  </svg>
);

// ── Employés — bâtiment administratif ──────────────────────────────────────
export const IconEmployes = ({ size, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="
      M4 4a2 2 0 012-2h12a2 2 0 012 2v17H4V4z
      M7 6h3v3H7V6z M14 6h3v3h-3V6z
      M7 12h3v3H7v-3z M14 12h3v3h-3v-3z
      M10 17h4v4h-4v-4z
    "/>
  }/>
);

// ── Professeurs — personne avec tableau ─────────────────────────────────────
export const IconProfesseurs = ({ size, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M12 2a4 4 0 100 8 4 4 0 000-8z"/>
    <path fillRule="evenodd" d="M4 22a8 8 0 0116 0H4z"/>
  </>}/>
);

// ── Élèves — groupe ─────────────────────────────────────────────────────────
export const IconEleves = ({ size, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M8 2a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"/>
    <path fillRule="evenodd" d="M1 21a7 7 0 0114 0H1z"/>
    <path fillRule="evenodd" d="M17 5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z"/>
    <path fillRule="evenodd" d="M13.5 21a5.5 5.5 0 0111 0h-11z"/>
  </>}/>
);

// ── Branches — livre ouvert ─────────────────────────────────────────────────
export const IconBranches = ({ size, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M2 4a2 2 0 012-2h7v20L2 18V4z"/>
    <path fillRule="evenodd" d="M22 4a2 2 0 00-2-2h-7v20l9-4V4z"/>
  </>}/>
);

// ── Classes — écran / tableau de classe ─────────────────────────────────────
export const IconClasses = ({ size, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="
      M2 4a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H2a2 2 0 01-2-2V4z
      M9 18v2H7v1h10v-1h-2v-2H9z
      M4 6h16v8H4V6z
    "/>
  }/>
);

// ── Plannings — calendrier avec créneaux ────────────────────────────────────
export const IconPlannings = ({ size, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="
      M3 5a2 2 0 012-2h14a2 2 0 012 2v15a2 2 0 01-2 2H5a2 2 0 01-2-2V5z
      M8 2v4h-1V2h1z M16 2v4h-1V2h1z
      M3 10h18v1H3v-1z
      M6 13h3v2H6v-2z M11 13h3v2h-3v-2z M16 13h3v2h-3v-2z
      M6 17h3v2H6v-2z M11 17h3v2h-3v-2z
    "/>
  }/>
);

// ── Présences — clipboard avec coches ──────────────────────────────────────
export const IconPresences = ({ size, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="
      M5 3a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-2a2 2 0 00-4 0H7a2 2 0 00-2 0z
      M9 4a1 1 0 002 0h2a1 1 0 002 0h2v2H7V4h2z
      M8.3 11.7l1.4 1.4L13 10l1 1-4.3 4.3-2.4-2.4 1-1.2z
      M8.3 16.7l1.4 1.4L13 15l1 1-4.3 4.3-2.4-2.4 1-1.2z
    "/>
  }/>
);

// ── Notes — document avec étoile ─────────────────────────────────────────────
export const IconNotes = ({ size, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="
      M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6z
      M14 2v6h6v-.5L14 2z
      M8 13h3v-1h-3v1z M8 16h6v-1H8v1z M8 19h4v-1H8v1z
    "/>
  }/>
);

// ── TCF — feuille d'examen ──────────────────────────────────────────────────
export const IconTCF = ({ size, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="
      M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H6z
      M8 6h8v2H8V6z M8 11h5v2H8v-2z
      M8 15.5a1 1 0 100 2 1 1 0 000-2z M11 15.5h5v2h-5v-2z
      M8 19.5a1 1 0 100 2 1 1 0 000-2z M11 19.5h3v2h-3v-2z
    "/>
  }/>
);

// ── Calendrier — mois ────────────────────────────────────────────────────────
export const IconCalendrier = ({ size, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="
      M5 3a2 2 0 00-2 2v15a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5z
      M8 1v4H7V1h1z M16 1v4h-1V1h1z
      M3 10h18v1H3v-1z
      M7 13a1 1 0 100 2 1 1 0 000-2z M12 13a1 1 0 100 2 1 1 0 000-2z M17 13a1 1 0 100 2 1 1 0 000-2z
      M7 17a1 1 0 100 2 1 1 0 000-2z M12 17a1 1 0 100 2 1 1 0 000-2z
    "/>
  }/>
);

// ── Comptabilité — pièce CHF ─────────────────────────────────────────────────
export const IconComptabilite = ({ size, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M12 1a11 11 0 100 22A11 11 0 0012 1z M12 3a9 9 0 110 18A9 9 0 0112 3z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={active ? 1.2 : 1.5}
      d="M14.5 8.5h-3a2 2 0 100 4h1a2 2 0 110 4H9M12 7v2M12 15v2"/>
  </>}/>
);

// ── Documents — dossier ──────────────────────────────────────────────────────
export const IconDocuments = ({ size, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="
      M3 8a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8z
      M3 8V6a2 2 0 012-2h3.5l2 2H3z
      M8 14h8v2H8v-2z M8 17h5v2H8v-2z
    "/>
  }/>
);

// ── Statistiques — barres ────────────────────────────────────────────────────
export const IconStatistiques = ({ size, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="
      M2 21h20v-2H2v2z
      M4 19V12h4v7H4z
      M10 19V7h4v12h-4z
      M16 19V3h4v16h-4z
    "/>
  }/>
);

// ── Enclassement — grille 4 cases ────────────────────────────────────────────
export const IconEnclassement = ({ size, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="
      M3 3h7a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z
      M14 3h7a1 1 0 011 1v7a1 1 0 01-1 1h-7a1 1 0 01-1-1V4a1 1 0 011-1z
      M3 14h7a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1v-7a1 1 0 011-1z
      M14 14h7a1 1 0 011 1v7a1 1 0 01-1 1h-7a1 1 0 01-1-1v-7a1 1 0 011-1z
    "/>
  }/>
);

// ── Sorties scolaires — sac à dos ────────────────────────────────────────────
export const IconSorties = ({ size, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="
      M7 6a5 5 0 0110 0v1h2a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h2V6z
      M10 6a2 2 0 014 0v1h-4V6z
      M9 13h6v2H9v-2z
      M11 11v6h2v-6h-2z
    "/>
  }/>
);

// ── Paramètres — engrenage ───────────────────────────────────────────────────
export const IconParametres = ({ size, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="
      M12 8a4 4 0 100 8 4 4 0 000-8z
      M11.3 2l-.7 2.1a7.9 7.9 0 00-2 .8L6.5 3.8 3.8 6.5l1.1 2.1a8 8 0 00-.8 2L2 11.3v1.4l2.1.7c.2.7.5 1.4.8 2L3.8 17.5l2.7 2.7 2.1-1.1c.6.3 1.3.6 2 .8l.7 2.1h1.4l.7-2.1a7.9 7.9 0 002-.8l2.1 1.1 2.7-2.7-1.1-2.1c.3-.6.6-1.3.8-2l2.1-.7v-1.4l-2.1-.7a7.9 7.9 0 00-.8-2l1.1-2.1-2.7-2.7-2.1 1.1a8 8 0 00-2-.8L12.7 2h-1.4z
      M12 10a2 2 0 100 4 2 2 0 000-4z
    "/>
  }/>
);

// Map path → composant icône
export const ICONS_BY_PATH = {
  '/employes-administratifs': IconEmployes,
  '/professeurs':             IconProfesseurs,
  '/eleves':                  IconEleves,
  '/branches':                IconBranches,
  '/classes':                 IconClasses,
  '/emploi-du-temps':         IconPlannings,
  '/presences':               IconPresences,
  '/notes':                   IconNotes,
  '/tcf':                     IconTCF,
  '/calendrier':              IconCalendrier,
  '/comptabilite':            IconComptabilite,
  '/documents-administratifs':IconDocuments,
  '/statistiques':            IconStatistiques,
  '/enclassement':            IconEnclassement,
  '/sorties-scolaires':       IconSorties,
  '/parametres':              IconParametres,
};
