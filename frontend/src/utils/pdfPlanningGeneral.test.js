import {
  canoniserCleSiteTitulariat,
  colonnesTitulariatParSites,
  compterLignesPlanningGeneralA3,
  layoutPlanningGeneralA3,
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

  it('reprend la hauteur 38 et la largeur 72 du layout général', () => {
    const peu = layoutPlanningGeneralA3({
      creneaux: [{ jour: 'Lundi', periode: 'Matin', ordre: 1 }],
      orientation: 'landscape',
    });
    const semaine = layoutPlanningGeneralA3({
      creneaux: creneauxSemaine,
      orientation: 'landscape',
    });
    expect(peu.rowH).toBe(38);
    expect(peu.creneauW).toBe(72);
    expect(semaine.rowH).toBe(38);
    expect(semaine.creneauW).toBe(72);
    expect(semaine.fontPt).toBe(10);
    expect(semaine.headerH).toBeGreaterThanOrEqual(38);
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
