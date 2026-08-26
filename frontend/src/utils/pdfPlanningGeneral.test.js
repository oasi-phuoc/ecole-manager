import {
  canoniserCleSiteTitulariat,
  colonnesTitulariatParSites,
  compterLignesPlanningGeneralA3,
  encadrerColonnesProfsHtml,
  fusionnerPlanningsGeneraux,
  htmlColgroupGrilleGeneral,
  interpreterSelectionPlanningGeneral,
  largeurColonneEgaleCss,
  largeurColonneGrilleGeneralCss,
  largeurTableauGrilleGeneralCss,
  layoutPlanningGeneralA3,
  nbColonnesGrilleGeneral,
  nProfsRefPlanningGeneral,
  optionsPlanningGeneral,
  trierClesSitesTitulariat,
  VALEUR_PLANNING_MEGA,
} from './pdfPlanningGeneral';

const creneauxSemaine = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].flatMap((jour) => (
  [1, 2, 3, 4].flatMap((ordre) => ([
    { jour, periode: 'Matin', ordre },
    { jour, periode: 'Après-midi', ordre },
  ]))
));

describe('layoutPlanningGeneralA3', () => {
  it('compte en-tête + 5 jours × (bannière + 2 périodes + 8 créneaux)', () => {
    expect(compterLignesPlanningGeneralA3(creneauxSemaine)).toBe(56);
  });

  it('reprend la hauteur 38 et une largeur horaire suffisante pour 08:20–09:05', () => {
    const peu = layoutPlanningGeneralA3({
      creneaux: [{ jour: 'Lundi', periode: 'Matin', ordre: 1 }],
      orientation: 'landscape',
    });
    const semaine = layoutPlanningGeneralA3({
      creneaux: creneauxSemaine,
      orientation: 'landscape',
    });
    expect(peu.rowH).toBe(38);
    expect(peu.creneauW).toBe(112);
    expect(semaine.rowH).toBe(38);
    expect(semaine.creneauW).toBe(112);
    expect(semaine.fontPt).toBe(10);
    expect(semaine.headerH).toBeGreaterThanOrEqual(38);
  });

  it('donne à l’horaire la même largeur que chaque colonne professeur', () => {
    expect(largeurColonneEgaleCss(10, 10)).toBe('calc((100% - 90px) / 11)');
    expect(largeurColonneEgaleCss(3, 0)).toBe('calc(100% / 4)');
  });
});

describe('grille planning général (2 horaires, sans colonnes vides)', () => {
  it('cale la largeur de colonne sur 10 profs + 2 horaires', () => {
    expect(largeurColonneGrilleGeneralCss(6)).toBe(largeurColonneGrilleGeneralCss(10));
    expect(largeurColonneGrilleGeneralCss(10)).toBe('calc((100% - 110px) / 12)');
    expect(largeurTableauGrilleGeneralCss(10)).toBe('100%');
    expect(largeurTableauGrilleGeneralCss(6)).toBe('calc(8 / 12 * (100% - 110px) + 70px)');
  });

  it('compte 2 horaires + n profs + n+1 écarts', () => {
    expect(nbColonnesGrilleGeneral(10)).toBe(23);
    expect(nbColonnesGrilleGeneral(6)).toBe(15);
    expect(nbColonnesGrilleGeneral(1)).toBe(5);
    expect(nbColonnesGrilleGeneral(0)).toBe(3);
  });

  it('encadre les profs par un écart puis une colonne horaire de chaque côté', () => {
    const html = encadrerColonnesProfsHtml(
      ['<td>A</td>', '<td>B</td>'],
      '<td>H</td>',
      '<td>H</td>'
    );
    expect(html).toBe(
      '<td>H</td><td class="spacer-cell"></td><td>A</td><td class="spacer-cell"></td><td>B</td><td class="spacer-cell"></td><td>H</td>'
    );
    const colgroup = htmlColgroupGrilleGeneral(6, '10%');
    expect((colgroup.match(/<col /g) || []).length).toBe(15);
    expect((colgroup.match(/creneau-col/g) || []).length).toBe(2);
    expect((htmlColgroupGrilleGeneral(10, '10%').match(/<col /g) || []).length).toBe(23);
    expect(largeurColonneGrilleGeneralCss(12)).toBe('calc((100% - 130px) / 14)');
    expect(largeurTableauGrilleGeneralCss(12)).toBe('100%');
  });

  it('cale super sur 20 profs fictifs et méga sur 40', () => {
    expect(nProfsRefPlanningGeneral({ superGeneral: true })).toBe(20);
    expect(nProfsRefPlanningGeneral({ mega: true })).toBe(40);
    expect(nProfsRefPlanningGeneral({})).toBe(10);
    expect(largeurColonneGrilleGeneralCss(12, { nProfsRef: 20 }))
      .toBe(largeurColonneGrilleGeneralCss(20, { nProfsRef: 20 }));
    expect(largeurColonneGrilleGeneralCss(20, { nProfsRef: 20 })).toBe('calc((100% - 210px) / 22)');
    expect(largeurTableauGrilleGeneralCss(12, { nProfsRef: 20 })).toBe('calc(14 / 22 * (100% - 210px) + 130px)');
    expect(largeurTableauGrilleGeneralCss(20, { nProfsRef: 20 })).toBe('100%');
    expect(largeurColonneGrilleGeneralCss(25, { nProfsRef: 40 }))
      .toBe(largeurColonneGrilleGeneralCss(40, { nProfsRef: 40 }));
    expect(largeurColonneGrilleGeneralCss(40, { nProfsRef: 40 })).toBe('calc((100% - 410px) / 42)');
    expect(largeurTableauGrilleGeneralCss(25, { nProfsRef: 40 })).toBe('calc(27 / 42 * (100% - 410px) + 260px)');
    expect(largeurTableauGrilleGeneralCss(40, { nProfsRef: 40 })).toBe('100%');
  });
});

describe('colonnesTitulariatParSites', () => {
  it('range Botza, Synecom, Creuset dans cet ordre, sans fusionner les sites', () => {
    expect(trierClesSitesTitulariat(['Creuset', 'SYNECOM-CFR', 'Botza', 'synecom'])).toEqual([
      'botza',
      'synecom',
      'creuset',
    ]);
    expect(canoniserCleSiteTitulariat('SYNECOM-CSC')).toBe('synecom');
  });

  it('fait une colonne par site, y compris un site sans titulaire', () => {
    const lignes = [
      { classe: 'CFR 01', site: 'synecom' },
      { classe: 'BOT 02', site: 'Botza' },
      { classe: 'CFR 03', site: 'SYNECOM-CFR' },
    ];
    const cols = colonnesTitulariatParSites(lignes, (r) => r.site, ['botza', 'synecom', 'creuset']);
    expect(cols).toHaveLength(3);
    expect(cols[0].map((r) => r.classe)).toEqual(['BOT 02']);
    expect(cols[1].map((r) => r.classe)).toEqual(['CFR 01', 'CFR 03']);
    expect(cols[2]).toEqual([]);
  });
});

describe('menu Général Tout / Complet', () => {
  const pools = [
    { id: 1, nom: 'Botza 7-8H', site: 'Botza' },
    { id: 2, nom: 'SYNECOM-CFR 7-8H', site: 'SYNECOM-CFR' },
    { id: 3, nom: 'SYNECOM-CSC 7-8H', site: 'SYNECOM-CSC' },
    { id: 4, nom: 'Creuset 7-8H', site: 'Creuset' },
  ];

  it('ajoute Tout {site} pour chaque super-général et Complet pour le méga', () => {
    const options = optionsPlanningGeneral(pools);
    expect(options.map((o) => o.label)).toEqual([
      'Botza 7-8H',
      'SYNECOM-CFR 7-8H',
      'SYNECOM-CSC 7-8H',
      'Creuset 7-8H',
      'Tout Synecom',
      'Complet',
    ]);
    expect(options.find((o) => o.label === 'Complet').value).toBe(VALEUR_PLANNING_MEGA);
  });

  it('sélectionne les pools du site pour Tout et tous les pools pour Complet', () => {
    const options = optionsPlanningGeneral(pools);
    const toutSynecom = options.find((o) => o.label === 'Tout Synecom').value;
    const superSel = interpreterSelectionPlanningGeneral(toutSynecom, pools);
    expect(superSel.mode).toBe('super');
    expect(superSel.poolIds).toEqual([2, 3]);
    const megaSel = interpreterSelectionPlanningGeneral(VALEUR_PLANNING_MEGA, pools);
    expect(megaSel.mode).toBe('mega');
    expect(megaSel.poolIds).toEqual([1, 2, 3, 4]);
    expect(megaSel.label).toBe('Complet');
  });

  it('fusionne les profs et titulaires de plusieurs pools', () => {
    const merged = fusionnerPlanningsGeneraux([
      {
        profs: [{ id: 10, nom: 'A', prenom: 'Anne' }],
        creneaux: [{ id: 1, jour: 'Lundi' }],
        affectations: [{ prof_id: 10, creneau_id: 1, classe_id: 1, dans_pool_courant: true }],
        dispos: [{ prof_id: 10, creneau_id: 1 }],
        titulaires: [{ classe_id: 1, classe_nom: 'CFR 01' }],
      },
      {
        profs: [{ id: 11, nom: 'B', prenom: 'Bob' }, { id: 10, nom: 'A', prenom: 'Anne' }],
        creneaux: [{ id: 1, jour: 'Lundi' }],
        affectations: [{ prof_id: 11, creneau_id: 1, classe_id: 2 }],
        dispos: [],
        titulaires: [{ classe_id: 2, classe_nom: 'CSC 01' }],
      },
    ], ['SYNECOM-CFR', 'SYNECOM-CSC']);
    expect(merged.profs.map((p) => p.id)).toEqual([10, 11]);
    expect(merged.titulaires).toHaveLength(2);
    expect(merged.titulaires[0].site).toBe('SYNECOM-CFR');
    expect(merged.affectations).toHaveLength(2);
    expect(merged.affectations[0].dans_pool_courant).toBeUndefined();
  });
});
