import { styleCelluleDispoVide, styleCelluleDispoVidePrint } from './disponibilites';

describe('styleCelluleDispoVide', () => {
  it('laisse indisponible et non affecté en blanc', () => {
    expect(styleCelluleDispoVide({ disponible: false }).bg).toBe('#ffffff');
    expect(styleCelluleDispoVide(null).bg).toBe('#ffffff');
    expect(styleCelluleDispoVidePrint({ disponible: false }).bg).toBe('#ffffff');
  });
});
