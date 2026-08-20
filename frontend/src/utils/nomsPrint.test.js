import { formaterNomPrint, libelleCourtPrint } from './nomsPrint';

describe('formaterNomPrint', () => {
  it('garde un nom court intact', () => {
    expect(formaterNomPrint('Van Phuoc')).toBe('Van Phuoc');
  });

  it('abrège le nom de famille si trop long', () => {
    expect(formaterNomPrint('Emilie Hishier')).toBe('Emilie H.');
  });

  it('retire un suffixe avant d’abréger', () => {
    expect(formaterNomPrint('Emilie Hishier-prof')).toBe('Emilie H.');
  });
});

describe('libelleCourtPrint', () => {
  it('abrège les libellés trop longs', () => {
    expect(libelleCourtPrint('Aucun professeur affecté')).toBe('Aucun prof');
    expect(libelleCourtPrint('Indisponible')).toBe('Indisp.');
    expect(libelleCourtPrint('Indispo')).toBe('Indisp.');
  });
});
