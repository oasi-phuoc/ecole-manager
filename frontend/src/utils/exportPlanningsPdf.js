import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import {
  echelleRasterPourPage,
  limitesCanvasPoste,
  parsePageMarginsMm,
  PX_PAR_MM,
  pageDimensionsMm,
  rasterScaleForFormat,
} from './pdfPage';

export {
  parsePageMarginsMm,
  PX_PAR_MM,
  pageDimensionsMm,
  pageUsablePx,
  rasterScaleForFormat,
  echelleCanvasSecurisee,
  echelleRasterPourPage,
  limitesCanvasPoste,
} from './pdfPage';

/** Nom de fichier sûr pour le système de fichiers. */
export function sanitizeFilename(name, fallback = 'document') {
  const clean = String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 120);
  return clean || fallback;
}

/**
 * Demande à l'utilisateur un dossier d'enregistrement.
 * Sur Chrome/Edge : sélecteur de dossier (choisir le Bureau).
 * Sinon : null → l'appelant peut basculer sur un ZIP téléchargeable.
 */
export async function demanderDossierExport() {
  if (typeof window.showDirectoryPicker !== 'function') {
    return null;
  }
  try {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'desktop',
    });
    return { handle };
  } catch (err) {
    if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
      return { cancelled: true };
    }
    throw err;
  }
}

async function getOrCreateDir(parentHandle, name) {
  return parentHandle.getDirectoryHandle(name, { create: true });
}

async function writeBlobToDir(dirHandle, fileName, blob) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

function estErreurMemoire(err) {
  const msg = String(err?.message || err || '');
  return /allocation size overflow|invalid array length|out of memory|maximum call stack/i.test(msg);
}

function reduireCanvas(canvas, maxSide) {
  const w = canvas.width || 0;
  const h = canvas.height || 0;
  if (!w || !h) return canvas;
  const s = Math.min(1, maxSide / Math.max(w, h));
  if (s >= 0.98) return canvas;
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(w * s));
  out.height = Math.max(1, Math.round(h * s));
  const ctx = out.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

async function canvasVersJpeg(canvas, quality) {
  const q = Math.max(0.45, Math.min(0.92, Number(quality) || 0.75));
  const viaBlob = await new Promise((resolve) => {
    try {
      if (typeof canvas.toBlob !== 'function') {
        resolve(null);
        return;
      }
      canvas.toBlob((blob) => resolve(blob || null), 'image/jpeg', q);
    } catch {
      resolve(null);
    }
  });
  if (viaBlob) {
    const buf = await viaBlob.arrayBuffer();
    return { data: new Uint8Array(buf), format: 'JPEG' };
  }
  const dataUrl = canvas.toDataURL('image/jpeg', q);
  return { data: dataUrl, format: 'JPEG' };
}

/** Recadre le canvas sur le contenu non blanc pour centrer le tableau sur la page. */
function cropCanvasToContent(canvas, padding = 8) {
  try {
    const { width, height } = canvas;
    if (!width || !height) return canvas;
    if (width * height > 4_000_000) return canvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;
    const { data } = ctx.getImageData(0, 0, width, height);
    const bg = 248;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        if (data[i + 3] < 12) continue;
        if (data[i] >= bg && data[i + 1] >= bg && data[i + 2] >= bg) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < 0 || maxY < 0) return canvas;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (w >= width - 2 && h >= height - 2) return canvas;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const octx = out.getContext('2d');
    octx.imageSmoothingEnabled = false;
    octx.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
    return out;
  } catch {
    return canvas;
  }
}

function relacherCanvas(canvas) {
  try {
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  } catch { /* ignore */ }
}

async function capturerElementHtml(el, { scale, elW, captureH, appliquerCadrePage }) {
  let s = scale;
  let lastErr = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await html2canvas(el, {
        scale: s,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        letterRendering: false,
        windowWidth: elW,
        windowHeight: captureH,
        onclone: (clonedDoc) => {
          appliquerCadrePage(clonedDoc.documentElement, clonedDoc.body, false, elW);
        },
      });
    } catch (err) {
      lastErr = err;
      s = Math.max(0.25, Math.round(s * 0.55 * 100) / 100);
    }
  }
  throw lastErr || new Error('Impossible de rasteriser la page PDF.');
}

/**
 * Convertit un document HTML d'impression en Blob PDF.
 * Une page PDF par élément `.section` / `.section-a3` (sinon le body entier).
 */
export async function htmlDocumentToPdfBlob(htmlDocument, options = {}) {
  const orientation = options.orientation || (options.paysage === false ? 'portrait' : 'landscape');
  const format = String(options.format || 'a4').toLowerCase();
  const dim = pageDimensionsMm(format, orientation);
  const cssW = Math.round(dim.w * PX_PAR_MM);
  const cssH = Math.round(dim.h * PX_PAR_MM);
  const limites = limitesCanvasPoste();
  const scale = Number(options.scale) > 0
    ? Number(options.scale)
    : Math.min(rasterScaleForFormat(format), limites.scaleDemandee);
  const margins = parsePageMarginsMm(options);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = `position:fixed;left:-12000px;top:0;width:${cssW}px;height:${cssH}px;border:0;opacity:0;pointer-events:none;`;
  document.body.appendChild(iframe);

  try {
    const idoc = iframe.contentDocument || iframe.contentWindow.document;
    idoc.open();
    idoc.write(htmlDocument);
    idoc.close();
    await new Promise((resolve) => {
      const done = () => setTimeout(resolve, 160);
      if (idoc.readyState === 'complete') done();
      else iframe.onload = done;
      setTimeout(resolve, 900);
    });
    const padTop = Math.round(margins.top * PX_PAR_MM);
    const padRight = Math.round(margins.right * PX_PAR_MM);
    const padBottom = Math.round(margins.bottom * PX_PAR_MM);
    const padLeft = Math.round(margins.left * PX_PAR_MM);
    const appliquerCadrePage = (root, body, figerHauteur, widthPx = cssW) => {
      const w = Math.max(cssW, Number(widthPx) || cssW);
      if (root) {
        root.style.width = `${w}px`;
        root.style.maxWidth = 'none';
        root.style.height = figerHauteur ? `${cssH}px` : 'auto';
        root.style.overflow = figerHauteur ? 'hidden' : 'visible';
      }
      if (body) {
        body.style.width = `${w}px`;
        body.style.maxWidth = 'none';
        body.style.margin = '0';
        body.style.padding = `${padTop}px ${padRight}px ${padBottom}px ${padLeft}px`;
        body.style.boxSizing = 'border-box';
        body.style.height = figerHauteur ? `${cssH}px` : 'auto';
        body.style.overflow = figerHauteur ? 'hidden' : 'visible';
      }
    };
    appliquerCadrePage(idoc.documentElement, idoc.body, false);

    const sections = Array.from(idoc.querySelectorAll('.section, .section-a3'))
      .filter((el) => (el.scrollHeight || 0) > 24 && (el.scrollWidth || 0) > 24);
    const targets = sections.length ? sections : [idoc.body];
    const pdf = new jsPDF({ orientation, unit: 'mm', format, compress: false });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const usableW = Math.max(1, pageW - margins.left - margins.right);
    const usableH = Math.max(1, pageH - margins.top - margins.bottom);
    const pageInnerW = Math.max(1, cssW - padLeft - padRight);
    const pageInnerH = Math.max(1, cssH - padTop - padBottom);

    let captureW = cssW;
    targets.forEach((el) => {
      captureW = Math.max(captureW, el.scrollWidth || 0, el.offsetWidth || 0);
    });
    if (captureW > cssW) {
      iframe.style.width = `${captureW}px`;
      appliquerCadrePage(idoc.documentElement, idoc.body, false, captureW);
    }

    for (let i = 0; i < targets.length; i += 1) {
      const el = targets[i];
      const elW = Math.max(1, el.scrollWidth || 0, el.offsetWidth || 0, cssW);
      const captureH = Math.max(1, el.scrollHeight || 0, el.offsetHeight || 0, cssH);
      el.style.width = `${elW}px`;
      el.style.maxWidth = 'none';
      el.style.overflow = 'visible';
      const scalePage = echelleRasterPourPage({
        contentW: elW,
        contentH: captureH,
        pageW: pageInnerW,
        pageH: pageInnerH,
        scaleDemandee: scale,
        maxSide: limites.maxSide,
        maxPixels: limites.maxPixels,
      });
      let canvas = await capturerElementHtml(el, {
        scale: scalePage,
        elW,
        captureH,
        appliquerCadrePage,
      });
      const recadrer = options.crop !== false && limites.recadrer;
      let pageCanvas = recadrer ? cropCanvasToContent(canvas) : canvas;
      if (Math.max(pageCanvas.width, pageCanvas.height) > limites.maxSide) {
        const reduced = reduireCanvas(pageCanvas, limites.maxSide);
        if (reduced !== pageCanvas && pageCanvas !== canvas) relacherCanvas(pageCanvas);
        pageCanvas = reduced;
      }
      let image = null;
      let jpegQ = limites.jpegQuality;
      for (let t = 0; t < 3; t += 1) {
        try {
          image = await canvasVersJpeg(pageCanvas, jpegQ);
          break;
        } catch (err) {
          if (t === 2 || !estErreurMemoire(err)) throw err;
          const next = reduireCanvas(pageCanvas, Math.round(Math.max(pageCanvas.width, pageCanvas.height) * 0.6));
          if (next !== pageCanvas && pageCanvas !== canvas) relacherCanvas(pageCanvas);
          pageCanvas = next;
          jpegQ = Math.max(0.45, jpegQ - 0.12);
        }
      }
      if (!image) throw new Error('Impossible de convertir la page PDF.');
      const ratio = pageCanvas.height / Math.max(1, pageCanvas.width);
      let drawW = usableW;
      let drawH = drawW * ratio;
      if (drawH > usableH) {
        const sFitPage = usableH / drawH;
        drawW *= sFitPage;
        drawH *= sFitPage;
      }
      if (i > 0) pdf.addPage(format, orientation);
      const x = margins.left + (usableW - drawW) / 2;
      const y = margins.top + (usableH - drawH) / 2;
      try {
        pdf.addImage(image.data, image.format, x, y, drawW, drawH, undefined, 'NONE');
      } catch (err) {
        if (!estErreurMemoire(err)) throw err;
        const mini = reduireCanvas(pageCanvas, 1200);
        const imageMini = await canvasVersJpeg(mini, 0.55);
        pdf.addImage(imageMini.data, imageMini.format, x, y, drawW, drawH, undefined, 'NONE');
        if (mini !== pageCanvas) relacherCanvas(mini);
      }
      if (pageCanvas !== canvas) relacherCanvas(pageCanvas);
      relacherCanvas(canvas);
    }

    try {
      return pdf.output('blob');
    } catch (err) {
      if (estErreurMemoire(err)) {
        throw new Error('Mémoire insuffisante sur ce poste pour générer le PDF. Fermez d’autres onglets puis réessayez.');
      }
      throw err;
    }
  } finally {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * @param {object} params
 * @param {FileSystemDirectoryHandle} [params.dirHandle]
 * @param {string} params.rootFolderName
 * @param {Array<{ relativePath: string, html: string, pdfOptions?: object }>} params.documents
 * @param {(done:number,total:number,label:string)=>void} [params.onProgress]
 * @param {() => boolean} [params.shouldCancel] — si true, stoppe l'export
 */
export async function exporterDocumentsPdf({
  dirHandle = null,
  rootFolderName = 'Plannings_EDT',
  documents = [],
  onProgress = null,
  shouldCancel = null,
}) {
  const total = documents.length;
  let done = 0;
  const report = (label) => {
    if (typeof onProgress === 'function') onProgress(done, total, label);
  };
  const cancelled = () => (typeof shouldCancel === 'function' ? !!shouldCancel() : false);

  if (dirHandle) {
    const root = await getOrCreateDir(dirHandle, sanitizeFilename(rootFolderName, 'Plannings_EDT'));
    const dirCache = new Map();
    dirCache.set('', root);

    const ensurePath = async (parts) => {
      const key = parts.join('/');
      if (dirCache.has(key)) return dirCache.get(key);
      let cur = root;
      let acc = [];
      for (const part of parts) {
        acc.push(part);
        const k = acc.join('/');
        if (dirCache.has(k)) {
          cur = dirCache.get(k);
          continue;
        }
        cur = await getOrCreateDir(cur, part);
        dirCache.set(k, cur);
      }
      return cur;
    };

    for (const doc of documents) {
      if (cancelled()) return { mode: 'folder', rootFolderName, count: done, cancelled: true };
      const rel = String(doc.relativePath || 'document.pdf').replace(/^\/+/, '');
      const segments = rel.split('/').filter(Boolean);
      const fileName = sanitizeFilename(segments.pop() || 'document', 'document');
      const finalName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
      const folderParts = segments.map((s) => sanitizeFilename(s, 'dossier'));
      const folder = await ensurePath(folderParts);
      report(`PDF : ${[...folderParts, finalName].join('/')}`);
      const blob = await htmlDocumentToPdfBlob(doc.html, doc.pdfOptions || {});
      if (cancelled()) return { mode: 'folder', rootFolderName, count: done, cancelled: true };
      await writeBlobToDir(folder, finalName, blob);
      done += 1;
      report(`Enregistré : ${[...folderParts, finalName].join('/')}`);
    }
    return { mode: 'folder', rootFolderName, count: total };
  }

  // Fallback ZIP
  const zip = new JSZip();
  const root = zip.folder(sanitizeFilename(rootFolderName, 'Plannings_EDT'));
  for (const doc of documents) {
    if (cancelled()) return { mode: 'zip', rootFolderName, count: done, cancelled: true };
    const rel = String(doc.relativePath || 'document.pdf').replace(/^\/+/, '');
    const segments = rel.split('/').filter(Boolean);
    const fileName = sanitizeFilename(segments.pop() || 'document', 'document');
    const finalName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    const folderParts = segments.map((s) => sanitizeFilename(s, 'dossier'));
    report(`PDF : ${[...folderParts, finalName].join('/')}`);
    const blob = await htmlDocumentToPdfBlob(doc.html, doc.pdfOptions || {});
    if (cancelled()) return { mode: 'zip', rootFolderName, count: done, cancelled: true };
    const buf = await blob.arrayBuffer();
    let folder = root;
    folderParts.forEach((p) => {
      folder = folder.folder(p);
    });
    folder.file(finalName, buf);
    done += 1;
    report(`Ajouté au ZIP : ${[...folderParts, finalName].join('/')}`);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, `${sanitizeFilename(rootFolderName, 'Plannings_EDT')}.zip`);
  return { mode: 'zip', rootFolderName, count: total };
}
