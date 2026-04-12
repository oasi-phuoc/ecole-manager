import { lieuExactPourNpa } from './swissPostalCodes';

/** Format AVS suisse : 756.XXXX.XXX.XX (X = chiffre) */
export const AVS_PATTERN = /^756\.\d{4}\.\d{3}\.\d{2}$/;

export function formatAvsInput(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  let d = digits.startsWith('756') ? digits : `756${digits}`;
  d = d.slice(0, 13);
  const p = [];
  if (d.length > 0) p.push(d.slice(0, 3));
  if (d.length > 3) p.push(d.slice(3, 7));
  if (d.length > 7) p.push(d.slice(7, 10));
  if (d.length > 10) p.push(d.slice(10, 12));
  return p.join('.');
}

export function isAvsValide(v) {
  const s = String(v || '').trim();
  if (!s) return true;
  return AVS_PATTERN.test(s);
}

export function telephoneDigitsOnly(raw) {
  return String(raw || '').replace(/\D/g, '');
}

/** NPA suisse : exactement 4 chiffres */
export const NPA_PATTERN = /^\d{4}$/;

/** Extrait courants (complétable) — saisie NPA propose le lieu si connu */
export const NPA_VERS_LIEU = {
  '1000': 'Lausanne',
  '1003': 'Lausanne',
  '1004': 'Lausanne',
  '1200': 'Genève',
  '1201': 'Genève',
  '1202': 'Genève',
  '1950': 'Sion',
  '1951': 'Sion',
  '1963': 'Vétroz',
  '1994': 'Aproz',
  '3960': 'Sierre',
  '1955': 'Chamoson',
  '1957': 'Leytron',
  '1800': 'Vevey',
  '1820': 'Montreux',
  '3000': 'Berne',
  '8001': 'Zurich',
  '4000': 'Bâle',
};

export function lieuDepuisNpa(npa) {
  const n = String(npa || '').replace(/\D/g, '').slice(0, 4);
  if (n.length !== 4) return '';
  return lieuExactPourNpa(n) || NPA_VERS_LIEU[n] || '';
}

export function isNpaValide(npa) {
  const n = String(npa || '').trim();
  if (!n) return true;
  return NPA_PATTERN.test(n.replace(/\D/g, '').slice(0, 4)) && n.replace(/\D/g, '').length <= 4;
}
