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

/** Échelle html2canvas visée (plafonnée ensuite pour éviter l’overflow canvas / PDF). */
export function rasterScaleForFormat(format) {
  return String(format || 'a4').toLowerCase() === 'a3' ? 2.4 : 2.2;
}

/** Côté max d’un canvas (Firefox casse vers 8k–16k, et le PDF explose avant). */
export const MAX_CANVAS_SIDE_PX = 4096;
/** Surface max (≈ 8 Mo RGBA) : au-delà, jsPDF `buildDocument` peut faire « allocation size overflow ». */
export const MAX_CANVAS_PIXELS = 8_000_000;

/**
 * Réduit l’échelle html2canvas pour rester sous les limites canvas du navigateur.
 */
export function echelleCanvasSecurisee(cssW, cssH, scaleDemandee, {
  maxSide = MAX_CANVAS_SIDE_PX,
  maxPixels = MAX_CANVAS_PIXELS,
} = {}) {
  const w = Math.max(1, Number(cssW) || 1);
  const h = Math.max(1, Number(cssH) || 1);
  let s = Math.max(0.35, Number(scaleDemandee) || 1);
  s = Math.min(s, maxSide / w, maxSide / h);
  const pixels = w * h * s * s;
  if (pixels > maxPixels) {
    s *= Math.sqrt(maxPixels / pixels);
  }
  return Math.max(0.35, Math.round(s * 100) / 100);
}

/**
 * Échelle de raster : si le HTML dépasse la page, on capture déjà à la résolution
 * de la page (pas un canvas géant ensuite réduit dans le PDF).
 */
export function echelleRasterPourPage({
  contentW,
  contentH,
  pageW,
  pageH,
  scaleDemandee,
  maxSide = MAX_CANVAS_SIDE_PX,
  maxPixels = MAX_CANVAS_PIXELS,
} = {}) {
  const cw = Math.max(1, Number(contentW) || 1);
  const ch = Math.max(1, Number(contentH) || 1);
  const pw = Math.max(1, Number(pageW) || 1);
  const ph = Math.max(1, Number(pageH) || 1);
  const sFit = Math.min(pw / cw, ph / ch);
  const s = (sFit >= 1 ? Number(scaleDemandee) || 1 : (Number(scaleDemandee) || 1) * sFit);
  return echelleCanvasSecurisee(cw, ch, s, { maxSide, maxPixels });
}
