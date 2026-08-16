/** Normalise la valeur stockée (tableau, JSON ou liste CSV) en ids string uniques. */
export const normaliserBranchesSpecialites = (valeur) => {
  if (!valeur) return [];
  if (Array.isArray(valeur)) return Array.from(new Set(valeur.map((v) => String(v).trim()).filter(Boolean)));
  const brut = String(valeur).trim();
  if (!brut) return [];
  try {
    const parsed = JSON.parse(brut);
    if (Array.isArray(parsed)) return Array.from(new Set(parsed.map((v) => String(v).trim()).filter(Boolean)));
  } catch {}
  // Cas texte PostgreSQL (ex: {"1","2"}) ou liste simple "1,2"
  const nettoye = brut.replace(/^\{|\}$/g, '').replace(/"/g, '');
  return Array.from(new Set(nettoye.split(',').map((v) => String(v).trim()).filter(Boolean)));
};

/** Exclut Soutien (et AI) des spécialités proposées. */
export const estBrancheExclueSpecialite = (branche) => {
  const code = String(branche?.designation_courte || branche?.code || '').trim().toUpperCase();
  const nom = String(branche?.nom || '').trim().toLowerCase();
  if (code === 'SOUTIEN' || nom === 'soutien' || nom.includes('soutien')) return true;
  if (code === 'AI') return true;
  if (nom.includes('accompagnement individuelle')) return true;
  return false;
};

/**
 * Colonnes Désidératas :
 * - principales : Français / Mathématiques
 * - culturelles : ACM / ACS
 * - autres : reste des branches secondaires
 */
export const categoriserBrancheSpecialite = (branche) => {
  if (estBrancheExclueSpecialite(branche)) return null;
  const code = String(branche?.designation_courte || branche?.code || branche?.id || '').trim().toUpperCase();
  const nom = String(branche?.nom || branche?.label || '').trim().toLowerCase();
  if (
    code === 'FR' || code === 'FRA' || code === 'MA' || code === 'MAT' || code === 'MATH'
    || /fran[cç]ais/.test(nom) || /\bmath/.test(nom)
  ) {
    return 'principales';
  }
  if (code === 'ACM' || code === 'ACS' || /\bacm\b/.test(nom) || /\bacs\b/.test(nom)) {
    return 'culturelles';
  }
  return 'autres';
};

export const LIBELLES_COLONNES_SPECIALITES = {
  principales: 'Français / Mathématiques',
  culturelles: 'ACM / ACS',
  autres: 'Autres branches secondaires',
};

export const ORDRE_COLONNES_SPECIALITES = ['principales', 'culturelles', 'autres'];

/** Regroupe les branches brutes par code court (ids multi-niveaux). */
export const regrouperBranchesParCode = (branches, { labelComplet = false } = {}) => {
  const parCode = new Map();
  (branches || []).forEach((b) => {
    if (estBrancheExclueSpecialite(b)) return;
    const cat = categoriserBrancheSpecialite(b);
    if (!cat) return;
    const code = String(b.designation_courte || b.nom || '').trim().toUpperCase();
    if (!code) return;
    const nom = String(b.nom || '').trim();
    if (!parCode.has(code)) {
      parCode.set(code, {
        id: code,
        code,
        categorie: cat,
        label: labelComplet ? (nom || code) : code,
        labelComplet: nom || code,
        labelCourt: code,
        noms: nom ? [nom] : [],
        ids: [String(b.id)],
      });
      return;
    }
    const ex = parCode.get(code);
    ex.ids.push(String(b.id));
    if (nom && !ex.noms.includes(nom)) ex.noms.push(nom);
    // Preférer le libellé le plus long / le plus « complet »
    if (labelComplet && nom && nom.length > String(ex.labelComplet || '').length) {
      ex.labelComplet = nom;
      ex.label = nom;
    }
  });
  return Array.from(parCode.values()).sort((a, b) =>
    String(a.label || a.code).localeCompare(String(b.label || b.code), 'fr')
  );
};

export const groupesParCategorie = (groupes) => {
  const out = { principales: [], culturelles: [], autres: [] };
  (groupes || []).forEach((g) => {
    const cat = g.categorie || categoriserBrancheSpecialite(g);
    if (cat && out[cat]) out[cat].push(g);
  });
  return out;
};

/** Ordre des groupes sélectionnés d'après la liste d'ids sauvegardée. */
export const ordonnerGroupesSelectionnes = (groupes, idsSelectionnes) => {
  const ids = normaliserBranchesSpecialites(idsSelectionnes);
  const vus = new Set();
  const ordered = [];
  ids.forEach((id) => {
    const g = (groupes || []).find((x) => (x.ids || []).map(String).includes(String(id)));
    if (!g || vus.has(g.id)) return;
    vus.add(g.id);
    ordered.push(g);
  });
  return ordered;
};

/** Reconstruit la liste d'ids : colonnes dans l'ordre, groupes sélectionnés dans leur ordre relatif. */
export const reconstruireIdsDepuisColonnes = (groupes, idsSelectionnes) => {
  const orderedSelected = ordonnerGroupesSelectionnes(groupes, idsSelectionnes);
  const parCat = { principales: [], culturelles: [], autres: [] };
  orderedSelected.forEach((g) => {
    const cat = g.categorie || 'autres';
    if (parCat[cat]) parCat[cat].push(g);
  });
  const flat = [
    ...parCat.principales,
    ...parCat.culturelles,
    ...parCat.autres,
  ];
  const ids = [];
  flat.forEach((g) => {
    (g.ids || []).forEach((id) => {
      if (!ids.includes(String(id))) ids.push(String(id));
    });
  });
  return ids;
};
