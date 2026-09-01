import { createClient } from "npm:@supabase/supabase-js@2";
import { Buffer } from "node:buffer";

export const BUCKETS = {
  elevesPhotos: "eleves-photos",
  documentsProfs: "documents-profs",
};

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(Deno.env.get("SUPABASE_URL") && Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!m) throw new Error("Le fichier doit être un data URL base64");
  const mime = m[1].trim();
  const buffer = Buffer.from(m[2], "base64");
  if (!buffer.length) throw new Error("Fichier vide");
  return { mime, buffer };
}

function bufferToDataUrl(buffer: Buffer, mime = "application/octet-stream"): string {
  return `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`;
}

export function safeFileName(name: unknown): string {
  return String(name || "fichier")
    .replace(/[^\w.\-() ]+/g, "_")
    .slice(0, 120);
}

async function createSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl || null;
}

export async function uploadDataUrl(bucket: string, path: string, dataUrl: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("Supabase Storage non configuré");
  const { mime, buffer } = parseDataUrl(dataUrl);
  const { error } = await sb.storage.from(bucket).upload(path, buffer, {
    contentType: mime,
    upsert: true,
  });
  if (error) throw new Error(error.message);
}

async function downloadAsDataUrl(bucket: string, path: string): Promise<string> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("Supabase Storage non configuré");
  const { data, error } = await sb.storage.from(bucket).download(path);
  if (error) throw new Error(error.message);
  const buffer = Buffer.from(await data.arrayBuffer());
  return bufferToDataUrl(buffer, data.type || "application/octet-stream");
}

export async function resolveContenu(
  row: { storage_path?: string | null; contenu?: string | null },
  bucket: string,
): Promise<string | null> {
  if (row.storage_path && isSupabaseConfigured()) {
    return downloadAsDataUrl(bucket, row.storage_path);
  }
  return row.contenu || null;
}

export async function removeObject(bucket: string, path: string | null | undefined): Promise<void> {
  if (!path) return;
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb.storage.from(bucket).remove([path]);
  if (error) console.warn("Storage remove", path, error.message);
}

export async function hydrateElevesPhotos<
  T extends { photo_storage_path?: string | null; photo?: string | null },
>(rows: T[]): Promise<T[]> {
  if (!rows.length || !isSupabaseConfigured()) return rows;
  return Promise.all(
    rows.map(async (row) => {
      if (!row.photo_storage_path) return row;
      const url = await createSignedUrl(BUCKETS.elevesPhotos, row.photo_storage_path, 3600);
      return { ...row, photo: url || row.photo || null };
    }),
  );
}