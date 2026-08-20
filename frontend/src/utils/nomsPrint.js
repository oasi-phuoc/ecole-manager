/** Enlève un suffixe type « Dupont-xxx » pour n’afficher que le nom de famille. */
export function formaterNomComplet(s) {
  return String(s || '').replace(/(^|\s)(\S*?)-\S+$/, '$1$2').trim();
}

/**
 * Compacte un nom pour les cellules PDF à colonnes fixes.
 * Ex. « Emilie Hishier » → « Emilie H. » si le nom dépasse maxLen.
 */
export function formaterNomPrint(nomComplet, maxLen = 13) {
  const s = formaterNomComplet(nomComplet).replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (s.length <= maxLen) return s;
  const parts = s.split(' ').filter(Boolean);
  if (parts.length === 1) {
    return `${s.slice(0, Math.max(1, maxLen - 1))}.`;
  }
  const prenom = parts[0];
  const initiale = parts[parts.length - 1].charAt(0).toUpperCase();
  let compact = `${prenom} ${initiale}.`;
  if (compact.length > maxLen) {
    const maxPrenom = Math.max(3, maxLen - 3);
    compact = `${prenom.slice(0, maxPrenom)} ${initiale}.`;
  }
  return compact;
}

/** Libellés trop longs pour une colonne de planning PDF. */
export function libelleCourtPrint(texte) {
  const t = String(texte || '').trim();
  if (!t) return '';
  if (/^aucun professeur affect[ée]e?$/i.test(t)) return 'Aucun prof';
  if (/^indisponible$/i.test(t)) return 'Indisp.';
  if (/^indispo\.?$/i.test(t)) return 'Indisp.';
  return t;
}
