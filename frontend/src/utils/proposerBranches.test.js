import { extrairePairesDemiJournee, proposerPairesBranches } from './proposerBranches';

const slot = (affId, jour, periode, ordre, profId = 1) => ({
  affId, jour, periode, ordre, profId,
});

const demiJour = (jour, periode, startAff, profId = 1) => ([
  slot(startAff, jour, periode, 1, profId),
  slot(startAff + 1, jour, periode, 2, profId),
  slot(startAff + 2, jour, periode, 3, profId),
  slot(startAff + 3, jour, periode, 4, profId),
]);

describe('extrairePairesDemiJournee', () => {
  it('groupe les 2 premières et les 2 dernières périodes d’une demi-journée', () => {
    const blocs = extrairePairesDemiJournee(demiJour('Lundi', 'Matin', 1));
    expect(blocs.filter((b) => b.type === 'paire')).toHaveLength(2);
    expect(blocs[0].slots.map((s) => s.ordre)).toEqual([1, 2]);
    expect(blocs[1].slots.map((s) => s.ordre)).toEqual([3, 4]);
  });

  it('fait une seule paire s’il n’y a que 2 périodes', () => {
    const blocs = extrairePairesDemiJournee([
      slot(1, 'Lundi', 'Matin', 1),
      slot(2, 'Lundi', 'Matin', 2),
    ]);
    expect(blocs).toHaveLength(1);
    expect(blocs[0].type).toBe('paire');
  });
});

describe('proposerPairesBranches', () => {
  const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const semaineCsc = JOURS.flatMap((jour, i) => demiJour(jour, 'Matin', i * 4 + 1));

  const matieres = [
    { id: 'fr', nom: 'Français', designation_courte: 'FR', periodes_semaine: 5 },
    { id: 'ma', nom: 'Mathématiques', designation_courte: 'MA', periodes_semaine: 4 },
    { id: 'ai', nom: 'Accompagnement individuel', designation_courte: 'AI', periodes_semaine: 1 },
    { id: 'all', nom: 'Allemand', designation_courte: 'ALL', periodes_semaine: 10 },
  ];
  const opts = {
    estFrancais: (m) => m.id === 'fr',
    estMath: (m) => m.id === 'ma',
    estAI: (m) => m.id === 'ai',
  };

  const pairesParJour = (assignment, slots) => {
    const byJour = {};
    slots.forEach((s) => {
      if (!byJour[s.jour]) byJour[s.jour] = [];
      byJour[s.jour].push({ ...s, matiere: assignment[String(s.affId)] });
    });
    Object.values(byJour).forEach((liste) => liste.sort((a, b) => a.ordre - b.ordre));
    return byJour;
  };

  it('place les branches par paires consécutives avant/après la pause', () => {
    const { assignment, comptes } = proposerPairesBranches(semaineCsc, matieres, opts);
    expect(comptes.fr).toBe(5);
    expect(comptes.ma).toBe(4);
    expect(comptes.ai).toBe(1);
    expect(comptes.all).toBe(10);

    JOURS.forEach((jour) => {
      const s = pairesParJour(assignment, semaineCsc)[jour];
      [[s[0], s[1]], [s[2], s[3]]].forEach(([a, b]) => {
        const mixteFrAi = (a.matiere === 'fr' && b.matiere === 'ai')
          || (a.matiere === 'ai' && b.matiere === 'fr');
        expect(a.matiere === b.matiere || mixteFrAi).toBe(true);
      });
    });
  });

  it('met au plus une paire de français par jour tant que le quota le permet', () => {
    const { assignment } = proposerPairesBranches(semaineCsc, matieres, opts);
    const joursFr = new Set();
    let joursAvecDeuxFr = 0;
    JOURS.forEach((jour) => {
      const s = pairesParJour(assignment, semaineCsc)[jour];
      const nFr = s.filter((x) => x.matiere === 'fr').length;
      if (nFr) joursFr.add(jour);
      if (nFr >= 4) joursAvecDeuxFr += 1;
    });
    expect(joursFr.size).toBeGreaterThanOrEqual(3);
    expect(joursAvecDeuxFr).toBe(0);
  });

  it('apparie le français restant avec l’accompagnement individuel', () => {
    const { assignment } = proposerPairesBranches(semaineCsc, matieres, opts);
    const couples = [];
    JOURS.forEach((jour) => {
      const s = pairesParJour(assignment, semaineCsc)[jour];
      [[s[0], s[1]], [s[2], s[3]]].forEach(([a, b]) => {
        if ((a.matiere === 'fr' && b.matiere === 'ai') || (a.matiere === 'ai' && b.matiere === 'fr')) {
          couples.push([a.matiere, b.matiere]);
        }
      });
    });
    expect(couples).toHaveLength(1);
  });

  it('peut placer 2 français le même jour si le quota l’exige', () => {
    const mat = [
      { id: 'fr', periodes_semaine: 12 },
      { id: 'ma', periodes_semaine: 4 },
      { id: 'ai', periodes_semaine: 0 },
      { id: 'all', periodes_semaine: 4 },
    ];
    const { assignment } = proposerPairesBranches(semaineCsc, mat, opts);
    let joursAvecDeuxPairesFr = 0;
    JOURS.forEach((jour) => {
      const s = pairesParJour(assignment, semaineCsc)[jour];
      const nFr = s.filter((x) => x.matiere === 'fr').length;
      if (nFr >= 4) joursAvecDeuxPairesFr += 1;
    });
    expect(joursAvecDeuxPairesFr).toBeGreaterThanOrEqual(1);
  });
});
