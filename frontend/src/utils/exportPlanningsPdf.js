import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { parsePageMarginsMm, PX_PAR_MM, pageDimensionsMm, rasterScaleForFormat } from './pdfPage';

export { parsePageMarginsMm, PX_PAR_MM, pageDimensionsMm, pageUsablePx, rasterScaleForFormat } from './pdfPage';

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

function canvasVersImage(canvas) {
  try {
    const png = canvas.toDataURL('image/png');
    if (png && png.length > 64) return { data: png, format: 'PNG' };
  } catch { /* canvas trop grand pour PNG */ }
  return { data: canvas.toDataURL('image/jpeg', 0.95), format: 'JPEG' };
}

/** Recadre le canvas sur le contenu non blanc pour centrer le tableau sur la page. */
function cropCanvasToContent(canvas, padding = 8) {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;
    const { width, height } = canvas;
    if (!width || !height) return canvas;
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
  const scale = Number(options.scale) > 0 ? Number(options.scale) : rasterScaleForFormat(format);
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
    const appliquerCadrePage = (root, body, figerHauteur) => {
      if (root) {
        root.style.width = `${cssW}px`;
        root.style.height = figerHauteur ? `${cssH}px` : 'auto';
        root.style.overflow = figerHauteur ? 'hidden' : 'visible';
      }
      if (body) {
        body.style.width = `${cssW}px`;
        body.style.maxWidth = `${cssW}px`;
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

    for (let i = 0; i < targets.length; i += 1) {
      const el = targets[i];
      const captureH = Math.max(cssH, el.scrollHeight || cssH);
      const canvas = await html2canvas(el, {
        scale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        letterRendering: true,
        windowWidth: cssW,
        windowHeight: captureH,
        onclone: (clonedDoc) => {
          appliquerCadrePage(clonedDoc.documentElement, clonedDoc.body, false);
        },
      });
      const cropped = options.crop === false ? canvas : cropCanvasToContent(canvas);
      const image = canvasVersImage(cropped);
      const ratio = cropped.height / Math.max(1, cropped.width);
      let drawW = usableW;
      let drawH = drawW * ratio;
      if (drawH > usableH) {
        const s = usableH / drawH;
        drawW *= s;
        drawH *= s;
      }
      if (i > 0) pdf.addPage(format, orientation);
      const x = margins.left + (usableW - drawW) / 2;
      const y = margins.top + (usableH - drawH) / 2;
      pdf.addImage(image.data, image.format, x, y, drawW, drawH, undefined, 'NONE');
    }

    return pdf.output('blob');
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
