/**
 * Supabase Storage — documents & photos élèves.
 * Si SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absents → fallback DB (base64).
 */
const { getSupabaseAdmin, isSupabaseConfigured } = require('../config/supabase');

const BUCKETS = {
  elevesPhotos: 'eleves-photos',
  documentsEleves: 'documents-eleves',
  documentsProfs: 'documents-profs',
  documentsAdmin: 'documents-admin',
};

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
};

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new Error('Contenu fichier invalide');
  }
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!m) throw new Error('Le fichier doit être un data URL base64');
  const mime = m[1].trim();
  const buffer = Buffer.from(m[2], 'base64');
  if (!buffer.length) throw new Error('Fichier vide');
  return { mime, buffer };
}

function bufferToDataUrl(buffer, mime = 'application/octet-stream') {
  return `data:${mime};base64,${Buffer.from(buffer).toString('base64')}`;
}

function safeFileName(name) {
  return String(name || 'fichier')
    .replace(/[^\w.\-() ]+/g, '_')
    .slice(0, 120);
}

function extFromMimeOrName(mime, nom) {
  if (MIME_TO_EXT[mime]) return MIME_TO_EXT[mime];
  const fromName = String(nom || '').split('.').pop();
  if (fromName && fromName.length <= 8 && /^[a-z0-9]+$/i.test(fromName)) return fromName.toLowerCase();
  return 'bin';
}

async function ensureBuckets() {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { data: existing, error } = await sb.storage.listBuckets();
  if (error) {
    console.warn('Storage listBuckets:', error.message);
    return false;
  }
  const names = new Set((existing || []).map((b) => b.name));
  for (const name of Object.values(BUCKETS)) {
    if (names.has(name)) continue;
    const { error: createErr } = await sb.storage.createBucket(name, {
      public: false,
      fileSizeLimit: 15 * 1024 * 1024,
    });
    if (createErr && !/already exists/i.test(createErr.message)) {
      console.warn(`Storage createBucket ${name}:`, createErr.message);
    } else {
      console.log(`✅ Bucket Storage créé: ${name}`);
    }
  }
  return true;
}

async function uploadDataUrl(bucket, path, dataUrl) {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error('Supabase Storage non configuré');
  const { mime, buffer } = parseDataUrl(dataUrl);
  const { error } = await sb.storage.from(bucket).upload(path, buffer, {
    contentType: mime,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return { path, mime, size: buffer.length };
}

async function downloadAsDataUrl(bucket, path) {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error('Supabase Storage non configuré');
  const { data, error } = await sb.storage.from(bucket).download(path);
  if (error) throw new Error(error.message);
  const buffer = Buffer.from(await data.arrayBuffer());
  const mime = data.type || 'application/octet-stream';
  return bufferToDataUrl(buffer, mime);
}

async function createSignedUrl(bucket, path, expiresIn = 3600) {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) {
    console.warn('signedUrl', path, error.message);
    return null;
  }
  return data?.signedUrl || null;
}

async function removeObject(bucket, path) {
  if (!path) return;
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb.storage.from(bucket).remove([path]);
  if (error) console.warn('Storage remove', path, error.message);
}

/** Résout contenu pour l’API (data URL) — Storage prioritaire, sinon colonne contenu. */
async function resolveContenu({ storage_path, contenu }, bucket) {
  if (storage_path && isSupabaseConfigured()) {
    return downloadAsDataUrl(bucket, storage_path);
  }
  return contenu || null;
}

/** Pour listes élèves : URL signée ou data URL legacy. */
async function resolvePhotoUrl(row) {
  if (row.photo_storage_path && isSupabaseConfigured()) {
    const url = await createSignedUrl(BUCKETS.elevesPhotos, row.photo_storage_path, 3600);
    if (url) return url;
  }
  return row.photo || null;
}

async function hydrateElevesPhotos(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows;
  if (!isSupabaseConfigured()) return rows;
  return Promise.all(
    rows.map(async (row) => {
      if (!row.photo_storage_path) return row;
      const photo = await resolvePhotoUrl(row);
      return { ...row, photo };
    })
  );
}

module.exports = {
  BUCKETS,
  isSupabaseConfigured,
  ensureBuckets,
  parseDataUrl,
  bufferToDataUrl,
  safeFileName,
  extFromMimeOrName,
  uploadDataUrl,
  downloadAsDataUrl,
  createSignedUrl,
  removeObject,
  resolveContenu,
  resolvePhotoUrl,
  hydrateElevesPhotos,
};
