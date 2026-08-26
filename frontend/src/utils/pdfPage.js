export const PX_PAR_MM = 96 / 25.4;

/** Marge PDF (mm) sur les 4 côtés. Défaut 10 mm. */
export function parsePageMarginsMm(options = {}) {
  const fallback = 10;
  if (Number.isFinite(Number(options.marginMm))) {
    const n = Math.max(0, Number(options.marginMm));
    return { top: n, right: n, bottom: n, left: n };
  }
  const raw = options.margin;
  if (typeof raw === 'string' && raw.trim()) {
    const parts = raw.trim().split(/\s+/).map((p) => {
      const m = String(p).match(/^([\d.]+)/);
      return m ? Number(m[1]) : NaN;
    }).filter((n) => Number.isFinite(n));
    if (parts.length === 1) {
      return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
    }
    if (parts.length === 2) {
      return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
    }
    if (parts.length === 3) {
      return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
    }
    if (parts.length >= 4) {
      return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
    }
  }
  return { top: fallback, right: fallback, bottom: fallback, left: fallback };
}

/** Dimensions physiques d’une page PDF (mm). */
export function pageDimensionsMm(format, orientation) {
  const f = String(format || 'a4').toLowerCase();
  const paysage = orientation !== 'portrait';
  if (f === 'a3') return paysage ? { w: 420, h: 297 } : { w: 297, h: 420 };
  return paysage ? { w: 297, h: 210 } : { w: 210, h: 297 };
}

/** Zone imprimable en pixels CSS (96 dpi), hors marges. */
export function pageUsablePx(format, orientation, margin) {
  const dim = pageDimensionsMm(format, orientation);
  const m = parsePageMarginsMm({ margin });
  return {
    w: Math.round(Math.max(1, dim.w - m.left - m.right) * PX_PAR_MM),
    h: Math.round(Math.max(1, dim.h - m.top - m.bottom) * PX_PAR_MM),
  };
}

/** Échelle html2canvas ≈ 300 dpi (A3 un peu plus haut pour rester lisible). */
export function rasterScaleForFormat(format) {
  return String(format || 'a4').toLowerCase() === 'a3' ? 3.2 : 2.8;
}
