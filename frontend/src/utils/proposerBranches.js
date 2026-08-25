/** Proposition de branches par paires consécutives (avant / après la pause). */

const JOURS_DEFAUT = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

const idDe = (m) => (m == null ? null : String(m.id));

const consecutiveOrdre = (a, b) => (
  Math.abs(Number(a?.ordre || 0) - Number(b?.ordre || 0)) === 1
);

/**
 * Dans une demi-journée, les paires sont les 2 premières périodes (avant pause)
 * et les 2 dernières (après pause), si elles se suivent.
 * @param {Array<{ ordre?: number }>} slotsDemi
 */
export function extrairePairesDemiJournee(slotsDemi) {
  const sorted = [...(slotsDemi || [])].sort(
    (a, b) => Number(a?.ordre || 0) - Number(b?.ordre || 0)
  );
  const n = sorted.length;
  const blocs = [];
  const used = new Array(n).fill(false);

  const pushPair = (i, j) => {
    if (i < 0 || j >= n || i >= j || used[i] || used[j]) return;
    if (!consecutiveOrdre(sorted[i], sorted[j])) return;
    blocs.push({ slots: [sorted[i], sorted[j]], type: 'paire' });
    used[i] = true;
    used[j] = true;
  };

  if (n >= 2) pushPair(0, 1);
  if (n >= 4) pushPair(n - 2, n - 1);
  sorted.forEach((slot, i) => {
    if (!used[i]) blocs.push({ slots: [slot], type: 'solo' });
  });
  return blocs;
}

const scorePrefsBloc = (bloc, matiereId, prefsParProf) => {
  let score = 0;
  (bloc.slots || []).forEach((s) => {
    const prefs = prefsParProf[String(s.profId)] || [];
    if (prefs.map(String).includes(String(matiereId))) score += 15;
  });
  return score;
};

/**
 * @param {Array<{ affId: any, jour: string, periode: string, ordre: number, profId?: any }>} slots
 * @param {Array<{ id: any, periodes_semaine?: any }>} matieres
 * @param {{ estFrancais?: Function, estMath?: Function, estAI?: Function, prefsParProf?: object, ordreJours?: string[] }} options
 * @returns {{ assignment: Record<string, string>, comptes: Record<string, number> }}
 */
export function proposerPairesBranches(slots, matieres, options = {}) {
  const estFrancais = options.estFrancais || (() => false);
  const estMath = options.estMath || (() => false);
  const estAI = options.estAI || (() => false);
  const prefsParProf = options.prefsParProf || {};
  const ordreJours = options.ordreJours || JOURS_DEFAUT;

  const assignment = {};
  const comptes = {};
  const requis = {};
  (matieres || []).forEach((m) => {
    const id = idDe(m);
    if (!id) return;
    requis[id] = parseInt(m.periodes_semaine, 10) || 0;
    comptes[id] = 0;
  });

  const matiereFr = (matieres || []).find(estFrancais) || null;
  const matiereMa = (matieres || []).find(estMath) || null;
  const matiereAI = (matieres || []).find(estAI) || null;
  const idFr = idDe(matiereFr);
  const idMa = idDe(matiereMa);
  const idAI = idDe(matiereAI);

  const restant = (id) => {
    if (!id) return 0;
    return (requis[id] || 0) - (comptes[id] || 0);
  };

  const marquer = (slot, matiereId) => {
    if (!slot || matiereId == null || matiereId === '') return;
    const affKey = String(slot.affId);
    if (assignment[affKey]) return;
    assignment[affKey] = String(matiereId);
    comptes[String(matiereId)] = (comptes[String(matiereId)] || 0) + 1;
  };

  const occupe = (slot) => !!assignment[String(slot.affId)];
  const blocLibre = (bloc) => (bloc.slots || []).every((s) => !occupe(s));

  const parDemi = new Map();
  (slots || []).forEach((s) => {
    const key = `${s.jour}|${s.periode}`;
    if (!parDemi.has(key)) parDemi.set(key, []);
    parDemi.get(key).push(s);
  });

  const blocsPaires = [];
  const blocsSolo = [];
  parDemi.forEach((liste, key) => {
    const [jour, periode] = key.split('|');
    extrairePairesDemiJournee(liste).forEach((b) => {
      const bloc = { ...b, jour, periode };
      if (b.type === 'paire') blocsPaires.push(bloc);
      else blocsSolo.push(bloc);
    });
  });

  const trierBlocs = (arr) => {
    arr.sort((a, b) => {
      const dj = ordreJours.indexOf(a.jour) - ordreJours.indexOf(b.jour);
      if (dj) return dj;
      const dp = String(a.periode || '').localeCompare(String(b.periode || ''), 'fr');
      if (dp) return dp;
      return Number(a.slots[0]?.ordre || 0) - Number(b.slots[0]?.ordre || 0);
    });
    return arr;
  };
  trierBlocs(blocsPaires);
  trierBlocs(blocsSolo);

  const jourAMatiere = (id) => {
    const jours = new Set();
    if (!id) return jours;
    const cible = String(id);
    Object.entries(assignment).forEach(([affId, mid]) => {
      if (String(mid) !== cible) return;
      const slot = (slots || []).find((s) => String(s.affId) === String(affId));
      if (slot?.jour) jours.add(slot.jour);
    });
    return jours;
  };

  const placerPaireMeme = (bloc, matiereId) => {
    if (!bloc || bloc.slots.length < 2 || !blocLibre(bloc)) return false;
    if (restant(matiereId) < 2) return false;
    marquer(bloc.slots[0], matiereId);
    marquer(bloc.slots[1], matiereId);
    return true;
  };

  const placerPaireFrAi = (bloc) => {
    if (!bloc || bloc.slots.length < 2 || !blocLibre(bloc) || !idFr || !idAI) return false;
    if (restant(idFr) < 1) return false;
    marquer(bloc.slots[0], idFr);
    marquer(bloc.slots[1], idAI);
    return true;
  };

  const libresDuJour = (jour) => blocsPaires.filter((b) => b.jour === jour && blocLibre(b));

  const meilleurBloc = (liste, matiereId) => {
    if (!liste.length) return null;
    return [...liste].sort(
      (a, b) => scorePrefsBloc(b, matiereId, prefsParProf) - scorePrefsBloc(a, matiereId, prefsParProf)
    )[0];
  };

  const choisirBlocPaire = (matiereId, { eviterJourDeja } = {}) => {
    const libres = blocsPaires.filter(blocLibre);
    if (!libres.length) return null;
    const deja = eviterJourDeja ? jourAMatiere(matiereId) : new Set();
    const preferes = eviterJourDeja ? libres.filter((b) => !deja.has(b.jour)) : libres;
    return meilleurBloc(preferes.length ? preferes : libres, matiereId);
  };

  // Passe 1 : 1 Français et 1 Math par jour (paires), tant que le quota le permet.
  ordreJours.forEach((jour) => {
    const hasFr = idFr ? jourAMatiere(idFr).has(jour) : true;
    const hasMa = idMa ? jourAMatiere(idMa).has(jour) : true;
    const peutFrPaire = idFr && restant(idFr) >= 2 && !hasFr;
    const peutFrAi = idFr && idAI && restant(idFr) === 1 && !hasFr;
    const peutMaPaire = idMa && restant(idMa) >= 2 && !hasMa;

    if (peutFrPaire) {
      const bloc = meilleurBloc(libresDuJour(jour), idFr);
      if (bloc) placerPaireMeme(bloc, idFr);
    } else if (peutFrAi) {
      const bloc = meilleurBloc(libresDuJour(jour), idFr);
      if (bloc) placerPaireFrAi(bloc);
    }

    if (peutMaPaire) {
      const bloc = meilleurBloc(libresDuJour(jour), idMa);
      if (bloc) placerPaireMeme(bloc, idMa);
    }
  });

  // Passe 2 : paires FR / MA restantes (autorise 2 FR ou 2 MA le même jour si nécessaire).
  const viderPaires = (matiereId) => {
    if (!matiereId) return;
    while (restant(matiereId) >= 2) {
      const bloc = choisirBlocPaire(matiereId, { eviterJourDeja: true });
      if (!bloc || !placerPaireMeme(bloc, matiereId)) break;
    }
  };
  viderPaires(idFr);
  viderPaires(idMa);

  // Passe 3 : 1 Français restant (CSC) apparié avec Accompagnement individuel.
  if (idFr && idAI && restant(idFr) === 1) {
    const bloc = choisirBlocPaire(idFr, { eviterJourDeja: true });
    if (bloc) placerPaireFrAi(bloc);
  }

  // Passe 4 : autres branches en paires identiques (y compris AI restant).
  const placerAutresPaires = () => {
    while (true) {
      if (!blocsPaires.some(blocLibre)) break;
      const candidats = (matieres || [])
        .map((m) => idDe(m))
        .filter((id) => id && restant(id) >= 2)
        .sort((a, b) => restant(b) - restant(a));
      if (!candidats.length) break;
      let pose = false;
      for (const id of candidats) {
        const bloc = choisirBlocPaire(id, { eviterJourDeja: id === idFr || id === idMa });
        if (bloc && placerPaireMeme(bloc, id)) {
          pose = true;
          break;
        }
      }
      if (!pose) break;
    }
  };
  placerAutresPaires();

  // Passe 5 : Math restant + AI si un créneau paire est encore libre.
  if (idMa && idAI && restant(idMa) === 1 && restant(idAI) >= 1) {
    const bloc = choisirBlocPaire(idMa, { eviterJourDeja: true });
    if (bloc && blocLibre(bloc) && bloc.slots.length >= 2) {
      marquer(bloc.slots[0], idMa);
      marquer(bloc.slots[1], idAI);
    }
  }

  // Passe 6 : créneaux paires encore vides — deux restes, en privilégiant la même branche.
  blocsPaires.filter(blocLibre).forEach((bloc) => {
    const idsRest = (matieres || [])
      .map((m) => idDe(m))
      .filter((id) => id && restant(id) > 0)
      .sort((a, b) => restant(b) - restant(a));
    if (!idsRest.length) return;
    if (restant(idsRest[0]) >= 2) {
      placerPaireMeme(bloc, idsRest[0]);
      return;
    }
    marquer(bloc.slots[0], idsRest[0]);
    const second = idsRest.find((id) => id !== idsRest[0] && restant(id) > 0) || (restant(idsRest[0]) > 0 ? idsRest[0] : null);
    if (second) marquer(bloc.slots[1], second);
  });

  // Passe 7 : solos (période isolée).
  blocsSolo.forEach((bloc) => {
    const slot = bloc.slots[0];
    if (!slot || occupe(slot)) return;
    const dejaFr = idFr ? jourAMatiere(idFr).has(bloc.jour) : false;
    const dejaMa = idMa ? jourAMatiere(idMa).has(bloc.jour) : false;
    let best = null;
    let bestSc = -9999;
    (matieres || []).forEach((m) => {
      const id = idDe(m);
      if (!id || restant(id) <= 0) return;
      let sc = restant(id) * 10;
      if (id === idFr && !dejaFr) sc += 40;
      if (id === idMa && !dejaMa) sc += 40;
      if (id === idFr && dejaFr) sc -= 30;
      if (id === idMa && dejaMa) sc -= 30;
      if (sc > bestSc) {
        bestSc = sc;
        best = id;
      }
    });
    if (best) marquer(slot, best);
  });

  return { assignment, comptes };
}
