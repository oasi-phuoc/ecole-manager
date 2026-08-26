import { pageUsablePx } from './pdfPage';

export const JOURS_PDF = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
export const MARGIN_PDF_A3_PAYSAGE = '6mm 8mm';
export const MARGIN_PDF_A3_PORTRAIT = '8mm 6mm';

/** Police fixe des PDF général (plus de curseur : il gonflait les lignes). */
export const POLICE_PDF_GENERAL = 9;

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
 * Layout auto du planning général : lignes compactes (jamais plus hautes
 * que le texte), réduites seulement si la semaine ne tient pas dans la feuille.
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
  const rowHContent = hauteurLigneContenuPrint(fontPt);
  const rowHFill = hauteurLignePourPage(nLignes, usable.h);
  const rowH = Math.min(rowHFill, rowHContent);
  const headerH = Math.max(rowH, Math.round(fontPt * 2.35 + 6));
  const creneauW = Math.max(54, Math.min(88, Math.round(fontPt * 6.2 + 16)));
  return {
    rowH,
    headerH,
    rowHContent,
    creneauW,
    fontPt,
    margin,
    usable,
    nLignes,
    paysage: !portrait,
  };
}
