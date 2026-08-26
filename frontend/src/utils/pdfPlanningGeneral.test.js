import {
  clampPolicePdfGeneral,
  compterLignesPlanningGeneralA3,
  hauteurLignePourPage,
  layoutPlanningGeneralA3,
  POLICE_PDF_GENERAL_DEFAUT,
  POLICE_PDF_GENERAL_MAX,
  POLICE_PDF_GENERAL_MIN,
} from './pdfPlanningGeneral';

const creneauxSemaine = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].flatMap((jour) => (
  [1, 2, 3, 4].flatMap((ordre) => ([
    { jour, periode: 'Matin', ordre },
    { jour, periode: 'Après-midi', ordre },
  ]))
));

describe('clampPolicePdfGeneral', () => {
  it('défaut 12 pt, plafonné à 24, minimum 8', () => {
    expect(POLICE_PDF_GENERAL_DEFAUT).toBe(12);
    expect(POLICE_PDF_GENERAL_MIN).toBe(8);
    expect(POLICE_PDF_GENERAL_MAX).toBe(24);
    expect(clampPolicePdfGeneral(undefined)).toBe(12);
    expect(clampPolicePdfGeneral(6)).toBe(8);
    expect(clampPolicePdfGeneral(30)).toBe(24);
    expect(clampPolicePdfGeneral(12)).toBe(12);
  });
});

describe('layoutPlanningGeneralA3', () => {
  it('compte en-tête + 5 jours × (bannière + 2 périodes + 8 créneaux)', () => {
    // 1 + 5 * (1 + 1+4 + 1+4) = 1 + 5*11 = 56
    expect(compterLignesPlanningGeneralA3(creneauxSemaine)).toBe(56);
  });

  it('lignes plus hautes en portrait qu’en paysage, toutes égales', () => {
    const portrait = layoutPlanningGeneralA3({
      creneaux: creneauxSemaine,
      orientation: 'portrait',
      taillePolice: 12,
    });
    const paysage = layoutPlanningGeneralA3({
      creneaux: creneauxSemaine,
      orientation: 'landscape',
      taillePolice: 12,
    });
    expect(portrait.rowH).toBeGreaterThan(paysage.rowH);
    expect(portrait.rowH * portrait.nLignes).toBeLessThanOrEqual(portrait.usable.h);
    expect(paysage.rowH * paysage.nLignes).toBeLessThanOrEqual(paysage.usable.h);
  });
});

describe('hauteurLignePourPage', () => {
  it('répartit la hauteur également', () => {
    expect(hauteurLignePourPage(10, 500)).toBe(50);
  });
});
