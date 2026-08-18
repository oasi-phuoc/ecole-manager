/** Décompte Préférences : soutien donné (FR/MA du cours jumelé) et SOUTIEN REÇU. */

const estMatiereSoutien = (m) => {
  const nom = String(m?.nom || '').trim().toLowerCase();
  const courte = String(m?.designation_courte || '').trim().toLowerCase();
  return nom === 'soutien' || courte === 'soutien';
};

const estBrancheFrancais = (m) => {
  if (m == null || m === '') return false;
  if (typeof m === 'string') {
    const s = m.trim().toLowerCase();
    if (['fr', 'fra'].includes(s)) return true;
    return /fran[cç]ais/.test(s);
  }
  const courte = String(m?.designation_courte || m?.code || m?.labelCourt || '').trim().toLowerCase();
  const nom = String(m?.nom || m?.label || '').trim().toLowerCase();
  if (['fr', 'fra'].includes(courte)) return true;
  return /fran[cç]ais/.test(`${nom} ${courte}`);
};

const estBrancheMath = (m) => {
  if (m == null || m === '') return false;
  if (typeof m === 'string') {
    const s = m.trim().toLowerCase();
    if (['ma', 'mat', 'math'].includes(s)) return true;
    return /math/.test(s);
  }
  const courte = String(m?.designation_courte || m?.code || m?.labelCourt || '').trim().toLowerCase();
  const nom = String(m?.nom || m?.label || '').trim().toLowerCase();
  if (['ma', 'mat', 'math'].includes(courte)) return true;
  return /math/.test(`${nom} ${courte}`);
};

const estSpecialSansClasse = (a) => {
  const t = String(a?.type_special || '').toLowerCase();
  return t === 'titulariat' || t === 'atelier' || t === 'mediation' || t === 'autre';
};

const estCoursSoutienSlot = (a) => String(a?.type_special || '').toLowerCase() === 'soutien';

const matiereRefAffectation = (a, matieresParId) => {
  if (!a) return null;
  const parIdPrincipal = (a.matiere_id != null && a.matiere_id !== '')
    ? (matieresParId.get(String(a.matiere_id)) || null)
    : null;
  const parIdLie = (a.soutien_matiere_id != null && a.soutien_matiere_id !== '')
    ? (matieresParId.get(String(a.soutien_matiere_id)) || null)
    : null;
  const parId = (parIdPrincipal && !estMatiereSoutien(parIdPrincipal))
    ? parIdPrincipal
    : (parIdLie || parIdPrincipal);
  const nom = String(parId?.nom || a.matiere_nom || a.soutien_matiere_nom || '').trim();
  const courte = String(parId?.designation_courte || '').trim();
  if (!parId && !nom && !courte) return null;
  const ref = {
    ...(parId || {}),
    nom: nom || parId?.nom || '',
    designation_courte: courte || parId?.designation_courte || '',
  };
  if (estMatiereSoutien(ref) && (a.soutien_matiere_nom || parIdLie)) {
    const nomLie = String(parIdLie?.nom || a.soutien_matiere_nom || '').trim();
    if (nomLie) {
      return {
        ...(parIdLie || {}),
        nom: nomLie,
        designation_courte: String(parIdLie?.designation_courte || '').trim(),
      };
    }
  }
  return ref;
};

/**
 * @param {Array} affectations lignes du pool (cours normaux + soutien)
 * @param {Map} matieresParId
 * @param {(matiereId: any) => {code?: string, id?: any}|null} groupePourMatiereId
 * @returns {Record<string, { parCode: Record<string, number>, frS: number, maS: number, recu: number }>}
 */
export function compterPreferencesSoutienParProf(affectations, matieresParId, groupePourMatiereId) {
  const lookup = matieresParId instanceof Map ? matieresParId : new Map();
  const groupeDe = typeof groupePourMatiereId === 'function' ? groupePourMatiereId : () => null;
  const parProf = {};
  const assurer = (pid) => {
    if (!parProf[pid]) parProf[pid] = { parCode: {}, frS: 0, maS: 0, recu: 0 };
    return parProf[pid];
  };
  const parSlot = new Map();
  (affectations || []).forEach((a) => {
    if (a?.classe_id == null || a?.creneau_id == null) return;
    const key = `${String(a.classe_id)}|${String(a.creneau_id)}`;
    if (!parSlot.has(key)) parSlot.set(key, []);
    parSlot.get(key).push(a);
  });
  parSlot.forEach((lignes) => {
    const soutiens = [];
    const normales = [];
    const vusSoutien = new Set();
    const vusNormal = new Set();
    lignes.forEach((a) => {
      const pid = a.prof_id != null ? String(a.prof_id) : '';
      if (!pid) return;
      if (estCoursSoutienSlot(a)) {
        if (vusSoutien.has(pid)) return;
        vusSoutien.add(pid);
        soutiens.push(a);
        return;
      }
      if (estSpecialSansClasse(a)) return;
      if (vusNormal.has(pid)) return;
      vusNormal.add(pid);
      normales.push(a);
    });
    const matiereCours = matiereRefAffectation(
      normales.find((a) => {
        const m = matiereRefAffectation(a, lookup);
        return m && !estMatiereSoutien(m);
      }),
      lookup
    ) || matiereRefAffectation(
      soutiens.find((a) => {
        const m = matiereRefAffectation(a, lookup);
        return m && !estMatiereSoutien(m);
      }),
      lookup
    );
    const estFr = estBrancheFrancais(matiereCours);
    const estMa = estBrancheMath(matiereCours);
    soutiens.forEach((a) => {
      const c = assurer(String(a.prof_id));
      if (estFr) c.frS += 1;
      else if (estMa) c.maS += 1;
    });
    normales.forEach((a) => {
      const c = assurer(String(a.prof_id));
      const matiere = matiereRefAffectation(a, lookup) || matiereCours;
      if (!matiere || estMatiereSoutien(matiere)) return;
      const groupe = groupeDe(a.matiere_id) || groupeDe(matiere.id);
      const code = String(groupe?.code || groupe?.id || matiere.designation_courte || matiere.nom || '').trim().toUpperCase();
      if (code) c.parCode[code] = (c.parCode[code] || 0) + 1;
      const collegueSoutien = soutiens.some((b) => String(b.prof_id) !== String(a.prof_id));
      if (collegueSoutien && (estFr || estMa)) c.recu += 1;
    });
  });
  return parProf;
}
