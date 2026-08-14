const parseResponsablesNiveaux = (valeur) => {
  let list = valeur;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch { list = []; }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      nom: String(item?.nom || '').trim(),
      sexe: String(item?.sexe || 'M').toUpperCase() === 'F' ? 'F' : 'M',
      niveaux: Array.isArray(item?.niveaux)
        ? item.niveaux.map((n) => String(n).trim()).filter(Boolean)
        : String(item?.niveaux || '').split(',').map((n) => n.trim()).filter(Boolean),
    }))
    .filter((item) => item.nom);
};

/** Retourne { nom, sexe } pour un niveau donné (ex. CSC), avec repli sur les anciens champs. */
export const getResponsableNiveauEcole = (ecoleParams = {}, niveau) => {
  const cle = String(niveau || '').trim().toUpperCase();
  if (!cle) return { nom: '', sexe: null };

  const list = parseResponsablesNiveaux(ecoleParams.responsables_niveaux);
  const matches = list.filter((r) =>
    (r.niveaux || []).some((n) => String(n).toUpperCase() === cle)
  );
  if (matches.length) {
    return {
      nom: matches.map((r) => r.nom).filter(Boolean).join(', '),
      sexe: matches[0].sexe || 'M',
    };
  }

  const key = cle.toLowerCase();
  const legacyNom = ecoleParams[`responsable_niveau_${key}`] || '';
  const legacySexe = ecoleParams[`sexe_responsable_niveau_${key}`] || null;
  return { nom: legacyNom, sexe: legacySexe };
};

export const listerNomsResponsablesEcole = (ecoleParams = {}) => {
  const names = [];
  if (ecoleParams.responsable_langues_jeunes) names.push(ecoleParams.responsable_langues_jeunes);
  if (ecoleParams.responsable_niveau) names.push(ecoleParams.responsable_niveau);

  const list = parseResponsablesNiveaux(ecoleParams.responsables_niveaux);
  list.forEach((r) => { if (r.nom) names.push(r.nom); });

  ['responsable_niveau_csc', 'responsable_niveau_cfr', 'responsable_niveau_epl'].forEach((f) => {
    if (ecoleParams[f]) names.push(ecoleParams[f]);
  });

  return names.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
};
