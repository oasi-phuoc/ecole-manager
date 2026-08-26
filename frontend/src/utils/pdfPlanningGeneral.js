import { pageUsablePx } from './pdfPage';

export const JOURS_PDF = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
export const MARGIN_PDF_A3_PAYSAGE = '6mm 8mm';
export const MARGIN_PDF_A3_PORTRAIT = '8mm 6mm';

export const POLICE_PDF_GENERAL_MIN = 8;
export const POLICE_PDF_GENERAL_MAX = 24;
export const POLICE_PDF_GENERAL_DEFAUT = 12;

/** Hauteur / largeur horaires des PDF classe, salle, professeur (plus de curseurs). */
export const PDF_LIGNE_CLASSE_SALLE_PROF = 68;
export const PDF_COLONNE_HORAIRE_CLASSE_SALLE_PROF = 128;

export function marginPdfA3(orientation) {
  return orientation === 'portrait' ? MARGIN_PDF_A3_PORTRAIT : MARGIN_PDF_A3_PAYSAGE;
}

export function clampPolicePdfGeneral(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return POLICE_PDF_GENERAL_DEFAUT;
  return Math.min(POLICE_PDF_GENERAL_MAX, Math.max(POLICE_PDF_GENERAL_MIN, Math.round(n * 2) / 2));
}

export function lirePolicePdfGeneral() {
  try {
    const raw = window.localStorage.getItem('oasis.policePdfGeneral');
    if (raw == null || raw === '') return POLICE_PDF_GENERAL_DEFAUT;
    const n = Number(raw);
    // Ancien défaut 10 / mini 6 → 12 pt.
    if (!Number.isFinite(n) || n <= 10) return POLICE_PDF_GENERAL_DEFAUT;
    return clampPolicePdfGeneral(n);
  } catch {
    return POLICE_PDF_GENERAL_DEFAUT;
  }
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

/**
 * Layout auto du planning général : toutes les lignes à la même hauteur,
 * plus hautes en portrait qu’en paysage (feuille plus haute).
 */
export function layoutPlanningGeneralA3({
  creneaux,
  orientation = 'portrait',
  taillePolice = POLICE_PDF_GENERAL_DEFAUT,
  mode = 'semaine',
} = {}) {
  const portrait = orientation === 'portrait';
  const margin = marginPdfA3(orientation);
  const usable = pageUsablePx('a3', portrait ? 'portrait' : 'landscape', margin);
  const nLignes = mode === 'jour'
    ? compterLignesPlanningGeneralJour(creneaux)
    : compterLignesPlanningGeneralA3(creneaux);
  const fontPt = clampPolicePdfGeneral(taillePolice);
  const rowH = hauteurLignePourPage(nLignes, usable.h);
  const creneauW = Math.max(54, Math.min(96, Math.round(fontPt * 6.2 + 18)));
  return {
    rowH,
    creneauW,
    fontPt,
    margin,
    usable,
    nLignes,
    paysage: !portrait,
  };
}
