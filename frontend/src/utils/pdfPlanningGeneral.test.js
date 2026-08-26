import {
  canoniserCleSiteTitulariat,
  colonnesTitulariatParSites,
  compterLignesPlanningGeneralA3,
  encadrerColonnesProfsHtml,
  htmlColgroupGrilleGeneral,
  largeurColonneEgaleCss,
  largeurColonneGrilleGeneralCss,
  largeurTableauGrilleGeneralCss,
  layoutPlanningGeneralA3,
  nbColonnesGrilleGeneral,
  trierClesSitesTitulariat,
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
