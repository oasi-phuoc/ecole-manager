/**
 * Vérifie que la liste de reset rentrée couvre bien les FK vers eleves / emploi_du_temps.
 * Exécution : node backend/scripts/verify-reset-rentree.js
 */
const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, '../src/controllers/parametresController.js');
const schemaPath = path.join(__dirname, '../../supabase/migrations/20260815080000_initial_schema.sql');

const src = fs.readFileSync(controllerPath, 'utf8');
const schema = fs.readFileSync(schemaPath, 'utf8');

const match = src.match(/const resetRentree = async[\s\S]*?const tables = \[([\s\S]*?)\];/);
if (!match) {
  console.error('Impossible de trouver la liste tables de resetRentree');
  process.exit(1);
}

const tables = [...match[1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
if (new Set(tables).size !== tables.length) {
  console.error('Doublons dans la liste tables');
  process.exit(1);
}

const blocks = schema.split(/CREATE TABLE\s+/i).slice(1);
const refsOf = (target) => {
  const out = [];
  for (const b of blocks) {
    const name = b.split('(', 1)[0].trim().split(/\s+/)[0];
    if (new RegExp(`REFERENCES\\s+${target}\\s*\\(`, 'i').test(b)) out.push(name);
  }
  return out;
};

const elevesRefs = refsOf('eleves');
const missingEleves = elevesRefs.filter((t) => !tables.includes(t));
const edtRefs = refsOf('emploi_du_temps');
const edtOrderBad = edtRefs.filter((t) => !tables.includes(t) || tables.indexOf(t) > tables.indexOf('emploi_du_temps'));

const mustPreserve = ['disponibilites', 'classes', 'pools', 'creneaux', 'matieres', 'niveaux', 'lieux_travail', 'salles', 'parametres_ecole'];
const accidentallyDeleted = mustPreserve.filter((t) => tables.includes(t));

let ok = true;
if (missingEleves.length) {
  console.error('FK eleves non couvertes:', missingEleves);
  ok = false;
}
if (edtOrderBad.length) {
  console.error('Ordre emploi_du_temps incorrect pour:', edtOrderBad);
  ok = false;
}
if (accidentallyDeleted.length) {
  console.error('Tables structurelles à ne pas supprimer:', accidentallyDeleted);
  ok = false;
}
if (!tables.includes('eleves') || tables[tables.length - 1] !== 'eleves') {
  console.error('eleves doit être la dernière table métier de la liste');
  ok = false;
}
if (!/BEGIN/.test(src) || !/COMMIT/.test(src) || !/ROLLBACK/.test(src)) {
  console.error('Transaction BEGIN/COMMIT/ROLLBACK manquante');
  ok = false;
}

if (!ok) process.exit(1);
console.log('OK — resetRentree: %d tables, FK eleves couvertes, dispos/classes/pools conservés.', tables.length);
