import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKETS = { elevesPhotos: "eleves-photos" };

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

async function createSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl || null;
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
