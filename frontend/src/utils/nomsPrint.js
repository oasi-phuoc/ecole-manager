/** Enlève un suffixe type « Dupont-xxx » pour n’afficher que le nom de famille. */
export function formaterNomComplet(s) {
  return String(s || '').replace(/(^|\s)(\S*?)-\S+$/, '$1$2').trim();
}

/** Seuil par défaut : prénom + nom usuels (ex. Isabelle Valloton) tiennent sur une ligne. */
export const MAX_NOM_UNE_LIGNE_PRINT = 26;

/**
 * Nom complet pour PDF. Si trop long pour une ligne, prénom puis nom en dessous.
 * Jamais d’abréviation du type « Emilie H. ».
 */
export function lignesNomDepuisComplet(nomComplet, maxUneLigne = MAX_NOM_UNE_LIGNE_PRINT) {
  const s = formaterNomComplet(nomComplet).replace(/\s+/g, ' ').trim();
  if (!s) return [];
  if (s.length <= maxUneLigne) return [s];
  const parts = s.split(' ').filter(Boolean);
  if (parts.length === 1) return [s];
  return [parts[0], parts.slice(1).join(' ')];
}

export function lignesNomPrenomNom(prenom, nom, maxUneLigne = MAX_NOM_UNE_LIGNE_PRINT) {
  const p = String(prenom || '').trim();
  const n = formaterNomComplet(String(nom || '').split('-')[0].trim());
  return lignesNomDepuisComplet([p, n].filter(Boolean).join(' '), maxUneLigne);
}

/** Largeur approximative d’un libellé Arial en pixels CSS (impression PDF). */
export function estimerLargeurTextePrintPx(texte, fontPt) {
  const s = String(texte || '');
  const pt = Number(fontPt);
  const taille = Number.isFinite(pt) && pt > 0 ? pt : 10;
  return Math.ceil(s.length * taille * 0.78) + 12;
}

/** Largeur d’une carte titulariat (classe + prénom nom), selon le plus long texte. */
export function largeurCarteTitulariatPrint(lignes, fontPt) {
  const textes = [];
  (lignes || []).forEach((r) => {
    textes.push(String(r.classe || '').trim());
    textes.push([r.prenom, r.nom].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim());
  });
  const plusLong = textes.reduce((acc, n) => (n.length > acc.length ? n : acc), 'W'.repeat(14));
  return Math.min(200, Math.max(112, estimerLargeurTextePrintPx(plusLong, fontPt)));
}

/** Toujours prénom puis nom de famille, pour les en-têtes PDF général. */
export function lignesPrenomPuisNom(prenom, nom) {
  const p = String(prenom || '').trim();
  const n = formaterNomComplet(String(nom || '').split('-')[0].trim());
  if (p && n) return [p, n];
  if (p) return [p];
  if (n) return [n];
  return [];
}

/** Libellés de statut trop longs — n’abrège pas les noms de personnes ni de branches. */
export function libelleCourtPrint(texte) {
  const t = String(texte || '').trim();
  if (!t) return '';
  if (/^aucun professeur affect[ée]e?$/i.test(t)) return 'Aucun professeur';
  if (/^indisp/i.test(t)) return '';
  return t;
}
