const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Eleves.js');
let code = fs.readFileSync(filePath, 'utf8');

// Supprimer les lettres de colonne dans les labels OASI obligatoires
const remplacements = [
  ['A — PROG_NOM *', 'PROG_NOM *'],
  ['B — PROG_ENCADRANT *', 'PROG_ENCADRANT *'],
  ['C — N *', 'N *'],
  ['D — REF *', 'REF *'],
  ['E — POS *', 'POS *'],
  ['F — NOM complet *', 'NOM *'],
  ['G — NAIS *', 'NAIS *'],
  ['H — NATIONALITE *', 'NATIONALITE *'],
  ['P — PROG_PRESENCES *', 'PROG_PRESENCES *'],
  ['Q — PROG_ADMIN *', 'PROG_ADMIN *'],
  ['R — AS *', 'AS *'],
  ['S — PRG_ID *', 'PRG_ID *'],
  ['T — PRG_OCCUPATION_ID *', 'PRG_OCCUPATION_ID *'],
  ['U — RA_ID *', 'RA_ID *'],
  ['V — TEMPS_REPARTI_ID *', 'TEMPS_REPARTI_ID *'],
  ['I — PRESENCE_DATE', 'PRESENCE_DATE'],
  ['J — JOUR_SEMAINE', 'JOUR_SEMAINE'],
  ['K — PRESENCE_PERIODE', 'PRESENCE_PERIODE'],
  ['L — PRESENCE_TYPE', 'PRESENCE_TYPE'],
  ['M — REMARQUE', 'REMARQUE'],
  ['N — CONTROLE_DU', 'CONTROLE_DU'],
  ['O — CONTROLE_AU', 'CONTROLE_AU'],
];

remplacements.forEach(([ancien, nouveau]) => {
  code = code.replace(`lbl="${ancien}"`, `lbl="${nouveau}"`);
});

// Renommer le titre section optionnels
code = code.replace(
  `'📋 OASI optionnels (I–O)'`,
  `'📋 OASI optionnels'`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Labels OASI : lettres de colonnes supprimées');