/** Types « Spécial » (EDT affectation professeurs) — hors Soutien. */

export const TYPES_SPECIAL_DEFAUT = [
  { id: 'titulariat', label: 'Titulariat' },
  { id: 'atelier', label: 'Atelier' },
  { id: 'mediation', label: 'Médiation' },
  { id: 'autre', label: 'Autre' },
];

export function slugTypeSpecial(label, usedIds = []) {
  const base = String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'special';
  let id = base;
  let n = 2;
  const used = new Set((usedIds || []).map((x) => String(x).toLowerCase()));
  while (used.has(id) || id === 'soutien') {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

export function normaliserTypesSpecial(raw) {
  let list = raw;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch { list = null; }
  }
  if (!Array.isArray(list) || list.length === 0) {
    return TYPES_SPECIAL_DEFAUT.map((t) => ({ ...t }));
  }
  const out = [];
  const seen = new Set();
  list.forEach((item, idx) => {
    const label = String(item?.label ?? item?.nom ?? item?.name ?? '').trim();
    if (!label) return;
    let id = String(item?.id || '').trim().toLowerCase();
    if (!id || id === 'soutien' || seen.has(id)) {
      id = slugTypeSpecial(label, [...seen]);
    }
    seen.add(id);
    out.push({ id, label, ordre: Number(item?.ordre) || idx + 1 });
  });
  return out.length ? out : TYPES_SPECIAL_DEFAUT.map((t) => ({ ...t }));
}

export function libelleTypeSpecial(typeSpecial, typesList) {
  const t = String(typeSpecial || '').trim().toLowerCase();
  if (!t) return '';
  if (t === 'soutien') return 'Soutien';
  const list = normaliserTypesSpecial(typesList);
  const found = list.find((x) => x.id === t);
  if (found) return found.label;
  // rétrocompat anciennes valeurs
  if (t === 'titulariat') return 'Titulariat';
  if (t === 'atelier') return 'Atelier';
  if (t === 'mediation') return 'Médiation';
  if (t === 'autre') return 'Autre';
  return t.charAt(0).toUpperCase() + t.slice(1);
}
