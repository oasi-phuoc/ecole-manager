-- Storage buckets ecole-manager

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('documents-admin', 'documents-admin', false, 52428800),
  ('documents-profs', 'documents-profs', false, 52428800),
  ('documents-eleves', 'documents-eleves', false, 52428800),
  ('eleves-photos', 'eleves-photos', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Staff authentifié : lecture/écriture dans les buckets métier
CREATE POLICY storage_documents_admin ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents-admin' AND public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (bucket_id = 'documents-admin' AND (public.is_admin() OR public.has_module_permission('documents')));

CREATE POLICY storage_documents_profs ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents-profs' AND public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (bucket_id = 'documents-profs' AND public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY storage_documents_eleves ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents-eleves' AND public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (bucket_id = 'documents-eleves' AND public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY storage_eleves_photos ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'eleves-photos' AND public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (bucket_id = 'eleves-photos' AND public.current_utilisateur_id() IS NOT NULL);
