import { pageUsablePx } from './pdfPage';

export const JOURS_PDF = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
export const MARGIN_PDF_A3_PAYSAGE = '6mm 8mm';
export const MARGIN_PDF_A3_PORTRAIT = '8mm 6mm';

/** Police fixe des PDF général (défaut de l’époque sliders, sans curseur). */
export const POLICE_PDF_GENERAL = 10;

/** Hauteur / largeur du planning général A3 (horaire assez large pour 08:20–09:05). */
export const PDF_LIGNE_GENERAL = 38;
export const PDF_COLONNE_HORAIRE_GENERAL = 112;

/** Hauteur / largeur horaires des PDF classe, salle, professeur (plus de curseurs). */
export const PDF_LIGNE_CLASSE_SALLE_PROF = 68;
export const PDF_COLONNE_HORAIRE_CLASSE_SALLE_PROF = 128;

export function marginPdfA3(orientation) {
  return orientation === 'portrait' ? MARGIN_PDF_A3_PORTRAIT : MARGIN_PDF_A3_PAYSAGE;
}

function creneauxDuJour(creneaux, jour) {
  return (creneaux || []).filter((c) => c.jour === jour);
}

function creneauxPeriode(creneaux, periode) {
  return (creneaux || []).filter((c) => c.periode === periode);
}

/** Lignes du tableau semaine A3 (en-tête + bannière jour + matin/après-midi + créneaux). */
export function compterLignesPlanningGeneralA3(creneaux) {
  let n = 1;
  JOURS_PDF.forEach((jour) => {
    const crs = creneauxDuJour(creneaux, jour);
    if (!crs.length) return;
    n += 1;
    ['Matin', 'Après-midi'].forEach((per) => {
      const crsPer = creneauxPeriode(crs, per);
      if (!crsPer.length) return;
      n += 1 + crsPer.length;
    });
  });
  return Math.max(1, n);
}

/** Lignes d’une page « un jour » (bannière + en-tête + périodes + créneaux). */
export function compterLignesPlanningGeneralJour(creneauxDuJourListe) {
  let n = 2;
  ['Matin', 'Après-midi'].forEach((per) => {
    const crsPer = creneauxPeriode(creneauxDuJourListe, per);
    if (!crsPer.length) return;
    n += 1 + crsPer.length;
  });
  return Math.max(2, n);
}

export function hauteurLignePourPage(nLignes, pageHeightPx) {
  const n = Math.max(1, Number(nLignes) || 1);
  const h = Math.max(1, Number(pageHeightPx) || 1);
  return Math.max(16, Math.floor(h / n));
}

/** Hauteur d’une ligne juste suffisante pour une ou deux lignes de texte. */
export function hauteurLigneContenuPrint(fontPt = POLICE_PDF_GENERAL) {
  const pt = Number(fontPt);
  const taille = Number.isFinite(pt) && pt > 0 ? pt : POLICE_PDF_GENERAL;
  return Math.max(18, Math.round(taille * 1.55 + 6));
}

/**
 * Layout du planning général A3 : mêmes largeur/hauteur de colonnes qu’avant
 * les curseurs auto (38 × 72). Le PDF réduit ensuite le tableau pour tenir
 * sur une page (tous les profs, tous les jours).
 */
export function layoutPlanningGeneralA3({
  creneaux,
  orientation = 'landscape',
  mode = 'semaine',
} = {}) {
  const portrait = orientation === 'portrait';
  const margin = marginPdfA3(orientation);
  const usable = pageUsablePx('a3', portrait ? 'portrait' : 'landscape', margin);
  const nLignes = mode === 'jour'
    ? compterLignesPlanningGeneralJour(creneaux)
    : compterLignesPlanningGeneralA3(creneaux);
  const fontPt = POLICE_PDF_GENERAL;
  const rowH = PDF_LIGNE_GENERAL;
  const creneauW = PDF_COLONNE_HORAIRE_GENERAL;
  const headerH = Math.max(rowH, Math.round(fontPt * 2.6) + 12);
  return {
    rowH,
    headerH,
    rowHContent: rowH,
    creneauW,
    fontPt,
    margin,
    usable,
    nLignes,
    paysage: !portrait,
  };
}

export const ORDRE_SITES_TITULARIAT_MEGA = ['botza', 'synecom', 'creuset'];

export function normaliserCleSiteTitulariat(v) {
  return String(v || '').trim().toLowerCase();
}

export function canoniserCleSiteTitulariat(v, clesConnues = ORDRE_SITES_TITULARIAT_MEGA) {
  const raw = normaliserCleSiteTitulariat(v);
  if (!raw) return '';
  const connus = (clesConnues || []).map(normaliserCleSiteTitulariat).filter(Boolean);
  if (connus.includes(raw)) return raw;
  const premier = raw.split(/[-–—_\s/]+/).filter(Boolean)[0] || raw;
  if (connus.includes(premier)) return premier;
  const prefix = connus.find((k) => raw.startsWith(k));
  return prefix || raw;
}

export function trierClesSitesTitulariat(cles) {
  const pref = ORDRE_SITES_TITULARIAT_MEGA;
  const uniq = [];
  const seen = new Set();
  (cles || []).forEach((c) => {
    const k = canoniserCleSiteTitulariat(c);
    if (!k || seen.has(k)) return;
    seen.add(k);
    uniq.push(k);
  });
  return uniq.sort((a, b) => {
    const ia = pref.indexOf(a);
    const ib = pref.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      return (ia === -1 ? pref.length : ia) - (ib === -1 ? pref.length : ib);
    }
    return a.localeCompare(b, 'fr');
  });
}

/**
 * Une colonne par site, sans libellé. Les sites connus restent présents
 * même sans titulaire ; les cartes sans site vont dans une colonne extra.
 */
export function colonnesTitulariatParSites(lignes, siteDeLigne, clesSites) {
  const ordre = trierClesSitesTitulariat(clesSites);
  const map = new Map(ordre.map((k) => [k, []]));
  const horsSite = [];
  (lignes || []).forEach((row) => {
    const key = canoniserCleSiteTitulariat(
      typeof siteDeLigne === 'function' ? siteDeLigne(row) : row?.site
    );
    if (map.has(key)) {
      map.get(key).push(row);
    } else if (key) {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    } else {
      horsSite.push(row);
    }
  });
  const extraKeys = [...map.keys()]
    .filter((k) => !ordre.includes(k))
    .sort((a, b) => a.localeCompare(b, 'fr'));
  const cols = [...ordre, ...extraKeys].map((k) => map.get(k) || []);
  if (horsSite.length) cols.push(horsSite);
  return cols;
}

