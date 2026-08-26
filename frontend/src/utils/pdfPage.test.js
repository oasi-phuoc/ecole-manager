import {
  echelleCanvasSecurisee,
  echelleRasterPourPage,
  MAX_CANVAS_PIXELS,
  MAX_CANVAS_SIDE_PX,
  pageDimensionsMm,
  pageUsablePx,
  rasterScaleForFormat,
} from './pdfPage';

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

describe('echelleCanvasSecurisee', () => {
  it('plafonne la surface pour rester sous maxPixels', () => {
    const s = echelleCanvasSecurisee(1000, 1000, 4, { maxSide: 20000, maxPixels: 4_000_000 });
    expect(s).toBeCloseTo(2, 2);
    expect(1000 * 1000 * s * s).toBeLessThanOrEqual(4_000_000 * 1.02);
  });

  it('plafonne le côté le plus long', () => {
    const s = echelleCanvasSecurisee(5000, 2000, 3, { maxSide: 4096, maxPixels: 1e12 });
    expect(5000 * s).toBeLessThanOrEqual(4096 * 1.01);
  });
});

describe('echelleRasterPourPage', () => {
  it('capture un tableau plus large que la page à la résolution de la page, pas en géant', () => {
    const s = echelleRasterPourPage({
      contentW: 5000,
      contentH: 2200,
      pageW: 1500,
      pageH: 1050,
      scaleDemandee: 3.2,
      maxSide: 20000,
      maxPixels: 1e12,
    });
    expect(s).toBeCloseTo(0.96, 2);
    expect(5000 * s).toBeLessThanOrEqual(1500 * 3.2 * 1.02);
  });

  it('garde l’échelle demandée si le contenu tient déjà dans la page, puis le plafond canvas', () => {
    const s = echelleRasterPourPage({
      contentW: 1400,
      contentH: 900,
      pageW: 1500,
      pageH: 1050,
      scaleDemandee: 2.4,
    });
    expect(1400 * s).toBeLessThanOrEqual(MAX_CANVAS_SIDE_PX);
    expect(1400 * 900 * s * s).toBeLessThanOrEqual(MAX_CANVAS_PIXELS * 1.02);
  });
});
