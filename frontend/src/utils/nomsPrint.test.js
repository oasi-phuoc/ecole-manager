import {
  formaterNomComplet,
  lignesNomDepuisComplet,
  lignesPrenomPuisNom,
  libelleCourtPrint,
  largeursColonnesTitulariatPrint,
} from './nomsPrint';

describe('lignesNomDepuisComplet', () => {
  it('garde un nom court sur une ligne', () => {
    expect(lignesNomDepuisComplet('Van Phuoc')).toEqual(['Van Phuoc']);
  });

  it('garde Isabelle Valloton et Charlotte Scherperel sur une ligne', () => {
    expect(lignesNomDepuisComplet('Isabelle Valloton')).toEqual(['Isabelle Valloton']);
    expect(lignesNomDepuisComplet('Charlotte Scherperel')).toEqual(['Charlotte Scherperel']);
  });

  it('passe sur deux lignes sans tronquer', () => {
    expect(lignesNomDepuisComplet('Emilie Hishier', 12)).toEqual(['Emilie', 'Hishier']);
  });

  it('retire un suffixe', () => {
    expect(formaterNomComplet('Emilie Hishier-prof')).toBe('Emilie Hishier');
  });
});

describe('largeursColonnesTitulariatPrint', () => {
  it('élargit la colonne noms et resserre la colonne classes selon le texte', () => {
    const { nomW, classeW, totalW } = largeursColonnesTitulariatPrint([
      { prenom: 'Charlotte', nom: 'Scherperel', classe: '7P' },
      { prenom: 'Isabelle', nom: 'Valloton', classe: '8H' },
    ], 10);
    expect(classeW).toBeLessThanOrEqual(42);
    expect(classeW).toBeGreaterThanOrEqual(26);
    expect(nomW).toBeGreaterThan(classeW);
    expect(nomW).toBeGreaterThanOrEqual(128);
    expect(totalW).toBe(nomW + classeW);
  });
});

describe('lignesPrenomPuisNom', () => {
  it('met le prénom puis le nom sur deux lignes', () => {
    expect(lignesPrenomPuisNom('Emilie', 'Hishier')).toEqual(['Emilie', 'Hishier']);
  });
});

describe('libelleCourtPrint', () => {
  it('retire le texte d’indisponibilité', () => {
    expect(libelleCourtPrint('Indispo')).toBe('');
    expect(libelleCourtPrint('Indisponible')).toBe('');
  });
});
