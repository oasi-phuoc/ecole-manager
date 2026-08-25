/** Enlève un suffixe type « Dupont-xxx » pour n’afficher que le nom de famille. */
export function formaterNomComplet(s) {
  return String(s || '').replace(/(^|\s)(\S*?)-\S+$/, '$1$2').trim();
}

/**
 * Nom complet pour PDF. Si trop long pour une ligne, prénom puis nom en dessous.
 * Jamais d’abréviation du type « Emilie H. ».
 */
export function lignesNomDepuisComplet(nomComplet, maxUneLigne = 16) {
  const s = formaterNomComplet(nomComplet).replace(/\s+/g, ' ').trim();
  if (!s) return [];
  if (s.length <= maxUneLigne) return [s];
  const parts = s.split(' ').filter(Boolean);
  if (parts.length === 1) return [s];
  return [parts[0], parts.slice(1).join(' ')];
}

export function lignesNomPrenomNom(prenom, nom, maxUneLigne = 16) {
  const p = String(prenom || '').trim();
  const n = formaterNomComplet(String(nom || '').split('-')[0].trim());
  return lignesNomDepuisComplet([p, n].filter(Boolean).join(' '), maxUneLigne);
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
