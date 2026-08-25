import { formaterNomComplet, lignesNomDepuisComplet, lignesPrenomPuisNom, libelleCourtPrint } from './nomsPrint';

describe('lignesNomDepuisComplet', () => {
  it('garde un nom court sur une ligne', () => {
    expect(lignesNomDepuisComplet('Van Phuoc')).toEqual(['Van Phuoc']);
  });

  it('passe sur deux lignes sans tronquer', () => {
    expect(lignesNomDepuisComplet('Emilie Hishier', 12)).toEqual(['Emilie', 'Hishier']);
  });

  it('retire un suffixe', () => {
    expect(formaterNomComplet('Emilie Hishier-prof')).toBe('Emilie Hishier');
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
