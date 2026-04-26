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

// ── Élèves — 3 silhouettes ──────────────────────────────────────────────────
export const IconEleves = ({ size, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="
      M5 3a2.5 2.5 0 100 5 2.5 2.5 0 000-5z
      M12 2a3 3 0 100 6 3 3 0 000-6z
      M19 3a2.5 2.5 0 100 5 2.5 2.5 0 000-5z
      M0 22a5.5 5.5 0 0111 0H0z
      M6.5 22a6 6 0 0112 0h-12z
      M13 22a5.5 5.5 0 0111 0h-11z
    "/>
  }/>
);

// ── Branches — deux classeurs ───────────────────────────────────────────────
export const IconBranches = ({ size, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M1 4a2 2 0 012-2h7a2 2 0 012 2v16a2 2 0 01-2 2H3a2 2 0 01-2-2V4z M13 4a2 2 0 012-2h6a2 2 0 012 2v16a2 2 0 01-2 2h-6a2 2 0 01-2-2V4z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={active ? 1 : 1.5} d="M4 8h4 M4 12h4 M4 16h4 M16 8h4 M16 12h4 M16 16h4"/>
  </>}/>
);

// ── Classes — table avec en-tête ────────────────────────────────────────────
export const IconClasses = ({ size, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M2 3a2 2 0 012-2h16a2 2 0 012 2v18a2 2 0 01-2 2H4a2 2 0 01-2-2V3z M4 8h16v13H4V8z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={active ? 1 : 1.5} d="M9 3v18 M15 3v18 M2 13h20 M2 17h20"/>
  </>}/>
);

// ── Plannings — horloge ──────────────────────────────────────────────────────
export const IconPlannings = ({ size, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M12 1a11 11 0 100 22A11 11 0 0012 1z M12 3a9 9 0 110 18A9 9 0 0112 3z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={2} strokeLinecap="round" d="M12 6v6l4 2.5"/>
  </>}/>
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

// ── Comptabilité — calculatrice ──────────────────────────────────────────────
export const IconComptabilite = ({ size, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="
      M5 1a2 2 0 00-2 2v18a2 2 0 002 2h14a2 2 0 002-2V3a2 2 0 00-2-2H5z
      M7 4h10v4H7V4z
      M7 10h3v2H7v-2z M12 10h2v2h-2v-2z M16 10h2v2h-2v-2z
      M7 14h3v2H7v-2z M12 14h2v2h-2v-2z M16 14h2v2h-2v-2z
      M7 18h3v2H7v-2z M12 18h6v2h-6v-2z
    "/>
  }/>
);

// ── Documents — répertoire classeurs ────────────────────────────────────────
export const IconDocuments = ({ size, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="
      M2 4a2 2 0 012-2h13a2 2 0 012 2v16a2 2 0 01-2 2H4a2 2 0 01-2-2V4z
      M17 2h3a2 2 0 012 2v4h-5V2z
      M17 9h5v5h-5V9z
      M17 15h5v3a2 2 0 01-2 2h-3v-5z
    "/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={active ? 1 : 1.4} d="
      M5 8h10 M5 12h10 M5 16h7
    "/>
  </>}/>
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

// ── Sorties scolaires — bus ──────────────────────────────────────────────────
export const IconSorties = ({ size, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="
      M2 6a3 3 0 013-3h14a3 3 0 013 3v10H2V6z
      M2 16h20v1.5a1.5 1.5 0 01-1.5 1.5h-17A1.5 1.5 0 012 17.5V16z
      M4 7.5h5v3.5H4V7.5z
      M15 7.5h5v3.5h-5V7.5z
      M6.5 17.5a2 2 0 100 4 2 2 0 000-4z
      M17.5 17.5a2 2 0 100 4 2 2 0 000-4z
    "/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.3}
      d="M21 8h1.5a0.5 0.5 0 010 4H21"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.3}
      d="M11 7.5V16"/>
  </>}/>
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

// ═══════════════════════════════════════════════════════
// ── Icônes matériels scolaires ──────────────────────────
// ═══════════════════════════════════════════════════════

// Classeur 7 cm (grand classeur)
export const IconClasseurGrand = ({ size = 24, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V4a2 2 0 00-2-2H5z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.5} d="M9 2v20"/>
    <circle cx="7" cy="8"  r="1.2" stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.2}/>
    <circle cx="7" cy="12" r="1.2" stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.2}/>
    <circle cx="7" cy="16" r="1.2" stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.2}/>
  </>}/>
);

// Classeur 4 cm (petit classeur)
export const IconClasseurPetit = ({ size = 24, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M5 5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.5} d="M9 5v14"/>
    <circle cx="7" cy="10" r="1.1" stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.2}/>
    <circle cx="7" cy="14" r="1.1" stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.2}/>
  </>}/>
);

// Cahier A4
export const IconCahierA4 = ({ size = 24, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v16a2 2 0 002 2h16a2 2 0 002-2V4a2 2 0 00-2-2H4z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.4} d="M7 2v20"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.3} d="M10 8h8M10 12h8M10 16h5"/>
  </>}/>
);

// Feuilles de dessin (page avec coin plié)
export const IconFeuillesDessin = ({ size = 24, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M5 1a2 2 0 00-2 2v18a2 2 0 002 2h14a2 2 0 002-2V7l-6-6H5z M15 1v6h6"/>
  </>}/>
);

// Photocopies / feuilles (deux feuilles empilées)
export const IconPhotocopies = ({ size = 24, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M7 4a2 2 0 00-2 2v13a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H7z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.4} d="M4 7H3a2 2 0 00-2 2v11a2 2 0 002 2h12a2 2 0 002-2v-1"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.3} d="M10 9h6M10 13h6M10 17h4"/>
  </>}/>
);

// Agenda (livre avec anneaux en haut)
export const IconAgenda = ({ size = 24, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v13a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2H4z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.8} d="M8 2v5M12 2v5M16 2v5"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.3} d="M2 10h20M6 14h4v4H6v-4z M14 14h4v4h-4v-4z"/>
  </>}/>
);

// Répertoire (classeur avec onglets latéraux)
export const IconRepertoire = ({ size = 24, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v16a2 2 0 002 2h16a2 2 0 002-2V4a2 2 0 00-2-2H4z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill={active ? '#ffffff55' : 'none'} strokeWidth={1.3} d="M18 2v6h4M18 8v5h4M18 13v5h4"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.3} d="M6 8h9M6 13h9M6 17h7"/>
  </>}/>
);

// Crayon papier
export const IconCrayon = ({ size = 24, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="M18.4 2.3a3 3 0 014.2 4.3l-.9.9-4.2-4.2.9-1zM15.9 5L20 9.2l-11 11-1.5.3L5 22l.3-2.5.2-1.5L15.9 5zM6 19.5l.5-1.5 1 1-1.5.5z"/>
  }/>
);

// Stylo (stylo bille)
export const IconStylo = ({ size = 24, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M14 2a2 2 0 012 2v2h-6L5 19l-2 3 3-2 1-1 8.5-15H16V4a2 2 0 00-2-2h-0z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.4} d="M10 5h6v3h-6V5z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.3} d="M5.5 20l1-2 1 1-2 1z"/>
  </>}/>
);

// Stylo plume (plume pilot)
export const IconStyloPlume = ({ size = 24, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M21.5 2C14 2 9 6.5 7.5 13L3 22l9-4.5c6.5-1.5 11-6.5 11-15.5z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.4} d="M10 12.5a5 5 0 015-5"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.5} d="M3 22l3.5-2"/>
  </>}/>
);

// Fixpencil (crayon mécanique)
export const IconFixpencil = ({ size = 24, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M10 2a2 2 0 014 0v12l-2 4-2-4V2z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.5} d="M9 2h6M9 5h6"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.3} d="M11 18v2.5l1 1.5 1-1.5V18h-2z"/>
  </>}/>
);

// Boîte de mines (HB)
export const IconMines = ({ size = 24, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M4 8a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z M5.5 5a1 1 0 011-1h11a1 1 0 011 1v3h-13V5z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.3} d="M8 10v5M12 10v5M16 10v5"/>
  </>}/>
);

// Crayons de couleur (trois crayons en éventail)
export const IconCrayonsCouleur = ({ size = 24, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M7 2a1 1 0 00-1 1v13l2 5 2-5V3a1 1 0 00-1-1H7z M11.5 2a1 1 0 00-1 1v13l2 5 2-5V3a1 1 0 00-1-1h-2z M16 2a1 1 0 00-1 1v13l2 5 2-5V3a1 1 0 00-1-1h-2z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.4} d="M6 14h4M10.5 14h4M15 14h4"/>
  </>}/>
);

// Gomme
export const IconGomme = ({ size = 24, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M2 9a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9z M2 9h9v8H2V9z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.8} d="M2 17h20"/>
  </>}/>
);

// ACM / Sports
export const IconSports = ({ size = 24, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.3} d="M7.5 7.5L12 5l4.5 2.5v5L12 15l-4.5-2.5v-5z M12 5v10M7.5 7.5l9 5M7.5 12.5l9-5"/>
  </>}/>
);

// Déplacement (bus)
export const IconDeplacement = ({ size = 24, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v9H3V7z M1 16h22v1a2 2 0 01-2 2H3a2 2 0 01-2-2v-1z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.3} d="M5 7h5v4H5V7z M14 7h5v4h-5V7z M3 11h18"/>
    <circle cx="7"  cy="18" r="1.5" stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.2}/>
    <circle cx="17" cy="18" r="1.5" stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.2}/>
  </>}/>
);

// Manifestations (étoile)
export const IconManifestation = ({ size = 24, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
  }/>
);

// Matériel d'enseignement (tableau/discussion)
export const IconEnseignement = ({ size = 24, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v11a2 2 0 002 2h7l3 4 3-4h3a2 2 0 002-2V5a2 2 0 00-2-2H4z"/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={1.4} d="M7 9h10M7 13h7"/>
  </>}/>
);

// Map des icônes matériels par clé
export const ICONS_MATERIELS = {
  classeur_grand:    IconClasseurGrand,
  classeur_petit:    IconClasseurPetit,
  cahier_a4:         IconCahierA4,
  feuilles_dessin:   IconFeuillesDessin,
  photocopies:       IconPhotocopies,
  agenda:            IconAgenda,
  repertoire:        IconRepertoire,
  crayon:            IconCrayon,
  stylo:             IconStylo,
  stylo_plume:       IconStyloPlume,
  fixpencil:         IconFixpencil,
  mines:             IconMines,
  crayons_couleur:   IconCrayonsCouleur,
  gomme:             IconGomme,
  sports:            IconSports,
  deplacement:       IconDeplacement,
  manifestation:     IconManifestation,
  enseignement:      IconEnseignement,
};

// ── Sondage — clipboard avec radio buttons ───────────────────────────────────
export const IconSondage = ({ size, active }) => (
  <I size={size} active={active} ch={
    <path fillRule="evenodd" d="
      M8 1a1 1 0 00-1 1v1H5a2 2 0 00-2 2v15a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-2V2a1 1 0 00-1-1H8z
      M9 2h6v1a1 1 0 01-1 1h-4a1 1 0 01-1-1V2z
      M7 10a2 2 0 100 4 2 2 0 000-4z
      M7 15.5a2 2 0 100 4 2 2 0 000-4z
      M11 11.5h6v1h-6v-1z
      M11 17h4v1h-4v-1z
    "/>
  }/>
);

// ── Contrôle qualité (visites de classe) — maison avec loupe ─────────────────
export const IconVisiteClasses = ({ size, active }) => (
  <I size={size} active={active} ch={<>
    <path fillRule="evenodd" d="M12 2L1 10.5h2.5V21a1 1 0 001 1H9v-6h3v3.5a5 5 0 006.5-7.1V10.5H21L12 2z"/>
    <circle cx="16.5" cy="16.5" r="3.5" stroke={active ? 'white' : 'currentColor'} fill={active ? 'none' : 'none'} strokeWidth={1.8}/>
    <path stroke={active ? 'white' : 'currentColor'} fill="none" strokeWidth={2} strokeLinecap="round" d="M19 19l2.5 2.5"/>
  </>}/>
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
  '/enclassement':            IconEnclassement,
  '/controle-qualite':        IconVisiteClasses,
  '/sorties-scolaires':       IconSorties,
  '/parametres':              IconParametres,
};
