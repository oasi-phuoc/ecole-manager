import { pageDimensionsMm, rasterScaleForFormat } from './exportPlanningsPdf';

describe('pageDimensionsMm', () => {
  it('donne le A3 paysage', () => {
    expect(pageDimensionsMm('a3', 'landscape')).toEqual({ w: 420, h: 297 });
  });
});

describe('rasterScaleForFormat', () => {
  it('utilise une échelle plus haute en A3', () => {
    expect(rasterScaleForFormat('a3')).toBeGreaterThan(rasterScaleForFormat('a4'));
  });
});
