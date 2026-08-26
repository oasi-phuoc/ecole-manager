import {
  canoniserCleSiteTitulariat,
  colonnesTitulariatParSites,
  compterLignesPlanningGeneralA3,
  hauteurLigneContenuPrint,
  hauteurLignePourPage,
  layoutPlanningGeneralA3,
  POLICE_PDF_GENERAL,
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

  it('ne gonfle pas les lignes au-delà du texte, même avec peu de créneaux', () => {
    const peu = layoutPlanningGeneralA3({
      creneaux: [{ jour: 'Lundi', periode: 'Matin', ordre: 1 }],
      orientation: 'landscape',
    });
    expect(peu.rowH).toBeLessThanOrEqual(peu.rowHContent);
    expect(peu.rowH).toBe(hauteurLigneContenuPrint(POLICE_PDF_GENERAL));
  });

  it('réduit les lignes seulement si la semaine dépasse la feuille', () => {
    const paysage = layoutPlanningGeneralA3({
      creneaux: creneauxSemaine,
      orientation: 'landscape',
    });
    const fill = hauteurLignePourPage(paysage.nLignes, paysage.usable.h);
    expect(paysage.rowH).toBe(Math.min(fill, paysage.rowHContent));
    expect(paysage.rowH * paysage.nLignes).toBeLessThanOrEqual(paysage.usable.h);
  });

  it('reste compact en semaine A3 (police 9 pt, pas de remplissage page)', () => {
    const paysage = layoutPlanningGeneralA3({
      creneaux: creneauxSemaine,
      orientation: 'landscape',
    });
    expect(paysage.fontPt).toBe(9);
    expect(paysage.rowH).toBeLessThanOrEqual(22);
    expect(paysage.rowHContent).toBeLessThanOrEqual(22);
    expect(paysage.headerH).toBeLessThanOrEqual(32);
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
