import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

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

/**
 * Convertit un document HTML d'impression en Blob PDF.
 * Une page PDF par élément `.section` / `.section-a3` (sinon le body entier).
 */
export async function htmlDocumentToPdfBlob(htmlDocument, options = {}) {
  const orientation = options.orientation || (options.paysage === false ? 'portrait' : 'landscape');
  const format = String(options.format || 'a4').toLowerCase();
  const scale = options.scale || 1.5;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;left:-12000px;top:0;width:1600px;height:1100px;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  try {
    const idoc = iframe.contentDocument || iframe.contentWindow.document;
    idoc.open();
    idoc.write(htmlDocument);
    idoc.close();
    await new Promise((resolve) => {
      const done = () => setTimeout(resolve, 120);
      if (idoc.readyState === 'complete') done();
      else iframe.onload = done;
      setTimeout(resolve, 800);
    });

    const sections = Array.from(idoc.querySelectorAll('.section, .section-a3'));
    const targets = sections.length ? sections : [idoc.body];
    const pdf = new jsPDF({ orientation, unit: 'mm', format, compress: true });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < targets.length; i += 1) {
      const el = targets[i];
      const canvas = await html2canvas(el, {
        scale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: Math.max(el.scrollWidth, 1200),
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const ratio = canvas.height / Math.max(1, canvas.width);
      let drawW = pageW;
      let drawH = drawW * ratio;
      if (drawH > pageH) {
        const s = pageH / drawH;
        drawW *= s;
        drawH *= s;
      }
      if (i > 0) pdf.addPage(format, orientation);
      // Centrer le tableau horizontalement et verticalement sur la page
      const x = (pageW - drawW) / 2;
      const y = (pageH - drawH) / 2;
      pdf.addImage(imgData, 'JPEG', x, y, drawW, drawH);
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
