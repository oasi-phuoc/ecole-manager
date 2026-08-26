import { pageUsablePx } from './pdfPage';

export const JOURS_PDF = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
export const MARGIN_PDF_A3_PAYSAGE = '6mm 8mm';
export const MARGIN_PDF_A3_PORTRAIT = '8mm 6mm';

/** Police fixe des PDF général (défaut de l’époque sliders, sans curseur). */
export const POLICE_PDF_GENERAL = 10;

/** Hauteur / largeur du planning général A3 (horaire assez large pour 08:20–09:05). */
export const PDF_LIGNE_GENERAL = 38;
export const PDF_COLONNE_HORAIRE_GENERAL = 112;

/** Grille de largeur : 10 colonnes profs identiques (sans colonnes vides affichées). */
export const A3_NB_COLONNES_PROF = 10;
export const PDF_SPACER_COLONNE_PX = 10;

/** Largeur CSS égale : colonne horaire = chaque colonne professeur. */
export function largeurColonneEgaleCss(nProfs, spacerPx = 0) {
  const n = Math.max(1, Number(nProfs) || 1);
  const gap = Math.max(0, Number(spacerPx) || 0);
  const spacers = Math.max(0, n - 1) * gap;
  const parts = n + 1;
  if (spacers > 0) return `calc((100% - ${spacers}px) / ${parts})`;
  return `calc(100% / ${parts})`;
}

/**
 * Largeur d’une colonne (horaire ou prof) calée sur 10 profs + 2 horaires.
 * S’il y a moins de 10 profs, les colonnes ne s’élargissent pas.
 */
export function largeurColonneGrilleGeneralCss(nProfsVisibles, {
  nProfsRef = A3_NB_COLONNES_PROF,
  nHoraires = 2,
  spacerPx = PDF_SPACER_COLONNE_PX,
} = {}) {
  const nVis = Math.max(0, Number(nProfsVisibles) || 0);
  const nRef = Math.max(nVis, nProfsRef);
  const nEqual = nRef + nHoraires;
  const nSpacers = nRef + 1;
  return `calc((100% - ${nSpacers * spacerPx}px) / ${nEqual})`;
}

/** Largeur du tableau si moins de 10 profs (évite d’étirer les colonnes). */
export function largeurTableauGrilleGeneralCss(nProfsVisibles, {
  nProfsRef = A3_NB_COLONNES_PROF,
  nHoraires = 2,
  spacerPx = PDF_SPACER_COLONNE_PX,
} = {}) {
  const nVis = Math.max(0, Number(nProfsVisibles) || 0);
  const nRef = Math.max(nVis, nProfsRef);
  if (nVis >= nProfsRef) return '100%';
  const nEqualRef = nRef + nHoraires;
  const nEqualVis = nVis + nHoraires;
  const nSpacersRef = nRef + 1;
  const nSpacersVis = nVis + 1;
  return `calc(${nEqualVis} / ${nEqualRef} * (100% - ${nSpacersRef * spacerPx}px) + ${nSpacersVis * spacerPx}px)`;
}

/** Horaire gauche + écarts + profs + horaire droite. */
export function nbColonnesGrilleGeneral(nProfsVisibles, nHoraires = 2) {
  const n = Math.max(0, Number(nProfsVisibles) || 0);
  return nHoraires + n + (n + 1);
}

const SPACER_CELL_HTML = '<td class="spacer-cell"></td>';
const SPACER_TH_HTML = '<th class="spacer-cell"></th>';

function intercalerSpacersHtml(cellsHtmlArr, spacerHtml) {
  const cells = Array.isArray(cellsHtmlArr) ? cellsHtmlArr : [];
  const out = [];
  cells.forEach((cell, i) => {
    out.push(cell);
    if (i < cells.length - 1) out.push(spacerHtml);
  });
  return out.join('');
}

/**
 * [Horaire] [écart] [profs…] [écart] [Horaire].
 * Un seul écart si aucun prof.
 */
export function encadrerColonnesProfsHtml(cellsHtmlArr, horaireGaucheHtml, horaireDroiteHtml, spacerHtml = SPACER_CELL_HTML) {
  const cells = Array.isArray(cellsHtmlArr) ? cellsHtmlArr : [];
  if (!cells.length) return `${horaireGaucheHtml}${spacerHtml}${horaireDroiteHtml}`;
  return `${horaireGaucheHtml}${spacerHtml}${intercalerSpacersHtml(cells, spacerHtml)}${spacerHtml}${horaireDroiteHtml}`;
}

export function htmlColgroupGrilleGeneral(nProfsVisibles, colW) {
  const n = Math.max(0, Number(nProfsVisibles) || 0);
  const parts = [`<col class="creneau-col" style="width:${colW};"/>`, '<col class="spacer-col" />'];
  for (let i = 0; i < n; i += 1) {
    parts.push(`<col style="width:${colW};" />`);
    if (i < n - 1) parts.push('<col class="spacer-col" />');
  }
  if (n > 0) parts.push('<col class="spacer-col" />');
  parts.push(`<col class="creneau-col" style="width:${colW};"/>`);
  return `<colgroup>${parts.join('')}</colgroup>`;
}

export { SPACER_CELL_HTML, SPACER_TH_HTML };

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

/** Valeur du menu Général pour le méga-planning (tous les sites). */
export const VALEUR_PLANNING_MEGA = '__mega__';
export const PREFIXE_PLANNING_SUPER = '__super__:';

export function valeurPlanningSuper(cle) {
  const key = String(cle || '').trim().toUpperCase();
  return key ? `${PREFIXE_PLANNING_SUPER}${key}` : '';
}

export function estSelectionMega(valeur) {
  return String(valeur || '') === VALEUR_PLANNING_MEGA;
}

export function estSelectionSuper(valeur) {
  return String(valeur || '').startsWith(PREFIXE_PLANNING_SUPER);
}

export function cleSelectionSuper(valeur) {
  if (!estSelectionSuper(valeur)) return '';
  return String(valeur).slice(PREFIXE_PLANNING_SUPER.length).trim().toUpperCase();
}

export function labelComposePool(pool, resoudreNomSite) {
  const site = String(pool?.site || '').trim();
  const nom = String(pool?.nom || '').trim();
  if (/[-–—]/.test(site)) return site;
  if (/[-–—]/.test(nom)) return nom;
  if (typeof resoudreNomSite === 'function') {
    const resolu = String(resoudreNomSite(pool) || '').trim();
    if (resolu) return resolu;
  }
  return site || nom;
}

export function prefixeSitePool(pool, resoudreNomSite) {
  const label = labelComposePool(pool, resoudreNomSite);
  const premier = String(label).split(/[-–—_\s]+/).filter(Boolean)[0] || label;
  return String(premier).trim() || 'Site';
}

export function nomAfficheSiteGeneral(label) {
  const brut = String(label || '').trim();
  if (!brut) return 'Site';
  if (brut === brut.toUpperCase() && /[A-Z]/.test(brut)) {
    return brut.charAt(0) + brut.slice(1).toLowerCase();
  }
  return brut.charAt(0).toUpperCase() + brut.slice(1);
}

/** Sites qui ont un super-général (plusieurs libellés distincts, même préfixe). */
export function groupesSuperGeneral(pools, resoudreNomSite) {
  const groupesPrefixe = new Map();
  (pools || []).forEach((pool) => {
    const labelComplet = labelComposePool(pool, resoudreNomSite);
    const prefixe = prefixeSitePool(pool, resoudreNomSite);
    const key = prefixe.toUpperCase();
    if (!groupesPrefixe.has(key)) {
      groupesPrefixe.set(key, { key, label: prefixe, pools: [], labelsComplets: new Set() });
    }
    const g = groupesPrefixe.get(key);
    g.pools.push(pool);
    g.labelsComplets.add(String(labelComplet).trim().toUpperCase());
  });
  return Array.from(groupesPrefixe.values()).filter((g) => g.labelsComplets.size >= 2);
}

export function optionsPlanningGeneral(pools, resoudreNomSite) {
  const liste = Array.isArray(pools) ? pools : [];
  const options = liste.map((p) => ({
    value: String(p.id),
    label: String(p.nom || `Pool ${p.id}`),
  }));
  groupesSuperGeneral(liste, resoudreNomSite).forEach((g) => {
    options.push({
      value: valeurPlanningSuper(g.key),
      label: `Tout ${nomAfficheSiteGeneral(g.label)}`,
    });
  });
  if (liste.length >= 2) {
    options.push({ value: VALEUR_PLANNING_MEGA, label: 'Complet' });
  }
  return options;
}

export function interpreterSelectionPlanningGeneral(valeur, pools, resoudreNomSite) {
  const v = valeur == null ? '' : String(valeur);
  const liste = Array.isArray(pools) ? pools : [];
  if (!v) return { mode: '', poolIds: [], label: '', groupe: null };
  if (estSelectionMega(v)) {
    return {
      mode: 'mega',
      poolIds: liste.map((p) => p.id),
      label: 'Complet',
      groupe: null,
    };
  }
  if (estSelectionSuper(v)) {
    const cle = cleSelectionSuper(v);
    const groupe = groupesSuperGeneral(liste, resoudreNomSite).find((g) => g.key === cle) || null;
    return {
      mode: 'super',
      poolIds: (groupe?.pools || []).map((p) => p.id),
      label: groupe ? `Tout ${nomAfficheSiteGeneral(groupe.label)}` : `Tout ${nomAfficheSiteGeneral(cle)}`,
      groupe,
    };
  }
  const pool = liste.find((p) => String(p.id) === v) || null;
  return {
    mode: 'pool',
    poolIds: pool ? [pool.id] : (v ? [v] : []),
    label: pool?.nom || '',
    groupe: null,
  };
}

export function fusionnerPlanningsGeneraux(datas, sitesParIndex = []) {
  const profMap = new Map();
  const affKeys = new Set();
  const affectations = [];
  const dispoKeys = new Set();
  const dispos = [];
  const titMap = new Map();
  let creneaux = [];
  (datas || []).forEach((data, idx) => {
    if (!data) return;
    const siteData = sitesParIndex[idx] || '';
    (data.profs || []).forEach((p) => {
      if (p?.id == null) return;
      if (!profMap.has(String(p.id))) profMap.set(String(p.id), p);
    });
    if (!creneaux.length && Array.isArray(data.creneaux) && data.creneaux.length) {
      creneaux = data.creneaux;
    }
    (data.affectations || []).forEach((a) => {
      const k = `${a.prof_id}|${a.creneau_id}|${a.classe_id || ''}|${a.type_special || ''}|${a.matiere_id || ''}`;
      if (affKeys.has(k)) return;
      affKeys.add(k);
      const { dans_pool_courant, ...rest } = a;
      affectations.push(rest);
    });
    (data.dispos || []).forEach((d) => {
      const k = `${d.prof_id}|${d.creneau_id}`;
      if (dispoKeys.has(k)) return;
      dispoKeys.add(k);
      dispos.push(d);
    });
    (data.titulaires || []).forEach((t) => {
      const k = String(t.classe_id != null ? t.classe_id : t.classe_nom || '');
      if (!k || titMap.has(k)) return;
      titMap.set(k, { ...t, site: t.site || siteData });
    });
  });
  const profsMerged = Array.from(profMap.values()).sort((a, b) =>
    String(a.nom || '').localeCompare(String(b.nom || ''), 'fr')
    || String(a.prenom || '').localeCompare(String(b.prenom || ''), 'fr')
  );
  return {
    profs: profsMerged,
    creneaux,
    affectations,
    dispos,
    titulaires: Array.from(titMap.values()),
  };
}

