-- Phase 2 : chemins Supabase Storage (contenu base64 devient optionnel)
ALTER TABLE documents_eleves ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE documents_profs ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE documents_administratifs ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE eleves ADD COLUMN IF NOT EXISTS photo_storage_path TEXT;

ALTER TABLE documents_eleves ALTER COLUMN contenu DROP NOT NULL;
ALTER TABLE documents_profs ALTER COLUMN contenu DROP NOT NULL;
ALTER TABLE documents_administratifs ALTER COLUMN contenu DROP NOT NULL;
