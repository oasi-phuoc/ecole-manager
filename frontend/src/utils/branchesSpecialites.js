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

/** Branche de soutien (Soutien, Français soutien, Math soutien, …) : pas une branche à affecter. */
export const estMatiereSoutien = (branche) => {
  if (branche == null || branche === '') return false;
  if (typeof branche === 'string') {
    const s = branche.trim().toLowerCase();
    return s === 'soutien' || s.includes('soutien');
  }
  const nom = String(branche?.nom || branche?.label || '').trim().toLowerCase();
  const courte = String(branche?.designation_courte || branche?.code || '').trim().toLowerCase();
  return nom === 'soutien' || courte === 'soutien' || nom.includes('soutien') || courte.includes('soutien');
};

/** Accompagnement individuel (AI) : peut compléter un Français restant (ex. CSC). */
export const estBrancheAI = (branche) => {
  if (branche == null || branche === '') return false;
  if (typeof branche === 'string') {
    const s = branche.trim().toLowerCase();
    return s === 'ai' || /accompagnement individuel/.test(s);
  }
  const code = String(branche?.designation_courte || branche?.code || '').trim().toUpperCase();
  const nom = String(branche?.nom || branche?.label || '').trim().toLowerCase();
  if (code === 'AI') return true;
  return /accompagnement individuel/.test(nom);
};

/** Exclut Soutien (et AI) des spécialités proposées. */
export const estBrancheExclueSpecialite = (branche) => {
  if (estMatiereSoutien(branche) || estBrancheAI(branche)) return true;
  const nom = String(branche?.nom || '').trim().toLowerCase();
  if (nom.includes('accompagnement individuelle')) return true;
  return false;
};

/**
 * Colonnes Désidératas :
 * - principales : Branches principales (Français / Mathématiques)
 * - autres : Branches secondaires (reste hors ACM/ACS)
 * - culturelles : Autres (ACM / ACS)
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
  principales: 'Branches principales',
  autres: 'Branches secondaires',
  culturelles: 'Autres',
};

export const ORDRE_COLONNES_SPECIALITES = ['principales', 'autres', 'culturelles'];

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

/**
 * Liste complète d'une colonne : ordre de préférence sauvegardé, puis les options restantes.
 * Toutes les options possibles sont toujours présentes (liste numérotée 1..n).
 */
export const listerGroupesColonneOrdonnes = (groupes, idsSelectionnes, cat) => {
  const items = (groupesParCategorie(groupes)[cat] || []);
  const orderedSelected = ordonnerGroupesSelectionnes(groupes, idsSelectionnes).filter((g) => g.categorie === cat);
  const vus = new Set(orderedSelected.map((g) => g.id));
  const reste = items.filter((g) => !vus.has(g.id));
  return [...orderedSelected, ...reste];
};

/** Aplatit les listes de colonnes (ordre ORDRE_COLONNES_SPECIALITES) en ids. */
export const idsDepuisListesColonnes = (listesParCat) => {
  const ids = [];
  ORDRE_COLONNES_SPECIALITES.forEach((cat) => {
    (listesParCat[cat] || []).forEach((g) => {
      (g.ids || []).forEach((id) => {
        if (!ids.includes(String(id))) ids.push(String(id));
      });
    });
  });
  return ids;
};

/** Reconstruit la liste d'ids : toutes les options de chaque colonne, dans l'ordre de préférence. */
export const reconstruireIdsDepuisColonnes = (groupes, idsSelectionnes) => {
  const listes = {};
  ORDRE_COLONNES_SPECIALITES.forEach((cat) => {
    listes[cat] = listerGroupesColonneOrdonnes(groupes, idsSelectionnes, cat);
  });
  return idsDepuisListesColonnes(listes);
};
