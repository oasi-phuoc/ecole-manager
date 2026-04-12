import SWISS_PLZ from 'switzerland-postal-codes/dist/postal-codes.json';

/** Carte NPA → libellé localité (toutes les combinaisons officielles CH / LI) */
export const SWISS_POSTAL_MAP = SWISS_PLZ;

const entriesSorted = Object.entries(SWISS_PLZ)
  .map(([plz, lieu]) => ({ plz, lieu }))
  .sort((a, b) => a.plz.localeCompare(b.plz, undefined, { numeric: true }));

/**
 * Suggestions pour autocomplétion (style Poste) : préfixe NPA sur 1–4 chiffres.
 * @param {string} digitPrefix — uniquement des chiffres, max 4
 * @param {number} limit
 */
export function searchNpaByPrefix(digitPrefix, limit = 25) {
  const d = String(digitPrefix || '').replace(/\D/g, '').slice(0, 4);
  if (!d) return [];
  return entriesSorted.filter(({ plz }) => plz.startsWith(d)).slice(0, limit);
}

/** Libellé exact pour un NPA à 4 chiffres (sinon chaîne vide) */
export function lieuExactPourNpa(npa) {
  const n = String(npa || '').replace(/\D/g, '').slice(0, 4);
  if (n.length !== 4) return '';
  return SWISS_PLZ[n] || '';
}
