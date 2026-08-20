/** Statuts de disponibilité d'un professeur sur un créneau. */
export const STATUT_DISPO_EVITER = 'eviter';

export const COULEUR_FOND_INDISPO = '#eeeeee';
export const COULEUR_FOND_EVITER = '#ffedd5';
export const COULEUR_PASTILLE_OK = '#16a34a';
export const COULEUR_PASTILLE_EVITER = '#ea580c';
export const COULEUR_PASTILLE_INDISPO = '#dc2626';

export function estIndispoStatut(v) {
  return v === false || v === 0 || v === 'false' || v === 'indispo';
}

export function estEviterStatut(v) {
  return v === STATUT_DISPO_EVITER || v === 'eviter';
}

/** Normalise une ligne API ou une valeur locale vers true | false | 'eviter'. */
export function statutDepuisDispoRow(d) {
  if (d == null || d === true) return true;
  if (typeof d === 'boolean' || typeof d === 'number' || typeof d === 'string') {
    if (estIndispoStatut(d)) return false;
    if (estEviterStatut(d)) return STATUT_DISPO_EVITER;
    return true;
  }
  if (estIndispoStatut(d.disponible)) return false;
  if (
    d.eviter === true
    || d.eviter === 1
    || d.eviter === 'true'
    || d.eviter === 't'
    || estEviterStatut(d.disponible)
    || estEviterStatut(d.statut)
  ) {
    return STATUT_DISPO_EVITER;
  }
  return true;
}

/** Cycle : disponible → à éviter → indisponible → disponible. */
export function cycleStatutDispo(v) {
  const s = statutDepuisDispoRow(v);
  if (s === true) return STATUT_DISPO_EVITER;
  if (s === STATUT_DISPO_EVITER) return false;
  return true;
}

export function payloadDepuisStatut(creneauId, statut) {
  const s = statutDepuisDispoRow(statut);
  return {
    creneau_id: Number(creneauId),
    disponible: s !== false,
    eviter: s === STATUT_DISPO_EVITER,
  };
}

export function pastilleDispo(statut) {
  const s = statutDepuisDispoRow(statut);
  if (s === false) return COULEUR_PASTILLE_INDISPO;
  if (s === STATUT_DISPO_EVITER) return COULEUR_PASTILLE_EVITER;
  return COULEUR_PASTILLE_OK;
}

export function fondCelluleStatutDispo(statut) {
  const s = statutDepuisDispoRow(statut);
  if (s === false) return COULEUR_FOND_INDISPO;
  if (s === STATUT_DISPO_EVITER) return COULEUR_FOND_EVITER;
  return '#ffffff';
}

export function titreStatutDispo(statut) {
  const s = statutDepuisDispoRow(statut);
  if (s === false) return 'Indisponible';
  if (s === STATUT_DISPO_EVITER) return 'Disponible, mais à éviter si possible';
  return 'Disponible';
}

/** Style d'une case vide (planning / PDF) selon la dispo. */
export function styleCelluleDispoVide(dispo) {
  const s = statutDepuisDispoRow(dispo);
    if (s === false) return { text: 'Indisp.', bg: COULEUR_FOND_INDISPO, color: '#9ca3af' };
  if (s === STATUT_DISPO_EVITER) return { text: '', bg: COULEUR_FOND_EVITER, color: '#c2410c' };
  return { text: '', bg: '#ffffff', color: '#111827' };
}
