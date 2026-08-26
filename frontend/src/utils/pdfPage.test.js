import { pageDimensionsMm, pageUsablePx, rasterScaleForFormat } from './pdfPage';

describe('pageDimensionsMm', () => {
  it('donne le A3 paysage', () => {
    expect(pageDimensionsMm('a3', 'landscape')).toEqual({ w: 420, h: 297 });
  });
});

describe('pageUsablePx', () => {
  it('donne une zone plus haute en A3 portrait qu’en paysage', () => {
    const portrait = pageUsablePx('a3', 'portrait', '8mm 6mm');
    const paysage = pageUsablePx('a3', 'landscape', '6mm 8mm');
    expect(portrait.h).toBeGreaterThan(paysage.h);
    expect(paysage.w).toBeGreaterThan(portrait.w);
  });
});

describe('rasterScaleForFormat', () => {
  it('utilise une échelle plus haute en A3', () => {
    expect(rasterScaleForFormat('a3')).toBeGreaterThan(rasterScaleForFormat('a4'));
  });
});
