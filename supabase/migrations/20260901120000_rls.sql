-- RLS ecole-manager — staff authentifié (admin ou permission module)

ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE eleves ENABLE ROW LEVEL SECURITY;
ALTER TABLE matieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE presences_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendrier ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametres_ecole ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletin_criteres ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tcf_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_administratifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_profs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_eleves ENABLE ROW LEVEL SECURITY;
ALTER TABLE sorties_scolaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiels ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE sondages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sondage_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sondage_reponses ENABLE ROW LEVEL SECURITY;
ALTER TABLE visites_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventaire_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE enclassements ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes_enclassement ENABLE ROW LEVEL SECURITY;
ALTER TABLE affectations_eleves_enc ENABLE ROW LEVEL SECURITY;
ALTER TABLE devoirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE suivi_devoirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE creneaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE affectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE disponibilites ENABLE ROW LEVEL SECURITY;
ALTER TABLE niveaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE lieux_travail ENABLE ROW LEVEL SECURITY;
ALTER TABLE salles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_classe ENABLE ROW LEVEL SECURITY;
ALTER TABLE sanctions_eleves ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes_personnelles ENABLE ROW LEVEL SECURITY;

-- Utilisateurs : lecture propre ligne ; admin lit tout ; profs listés pour sélecteurs
CREATE POLICY utilisateurs_select ON utilisateurs FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR public.is_admin()
    OR public.current_user_role() IN ('admin', 'prof')
  );

CREATE POLICY utilisateurs_update_self ON utilisateurs FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_admin())
  WITH CHECK (auth_user_id = auth.uid() OR public.is_admin());

CREATE POLICY utilisateurs_insert_admin ON utilisateurs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY utilisateurs_delete_admin ON utilisateurs FOR DELETE TO authenticated
  USING (public.is_admin());

-- Pattern staff : admin ou prof authentifié
CREATE POLICY classes_all ON classes FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('classes'));

CREATE POLICY eleves_all ON eleves FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('eleves'));

CREATE POLICY matieres_all ON matieres FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY evaluations_all ON evaluations FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('notes'));

CREATE POLICY notes_all ON notes FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('notes'));

CREATE POLICY presences_v2_all ON presences_v2 FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('presences'));

CREATE POLICY calendrier_all ON calendrier FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY parametres_ecole_all ON parametres_ecole FOR ALL TO authenticated
  USING (public.is_admin() OR public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin());

CREATE POLICY bulletin_criteres_all ON bulletin_criteres FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('bulletins'));

CREATE POLICY observations_all ON observations FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY tcf_state_all ON tcf_state FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('tcf'));

CREATE POLICY documents_admin_all ON documents_administratifs FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('documents'));

CREATE POLICY documents_profs_all ON documents_profs FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY documents_eleves_all ON documents_eleves FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY sorties_all ON sorties_scolaires FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('sorties'));

CREATE POLICY materiels_all ON materiels FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('comptabilite'));

CREATE POLICY paiements_all ON paiements FOR ALL TO authenticated
  USING (public.is_admin() OR public.has_module_permission('comptabilite'))
  WITH CHECK (public.is_admin() OR public.has_module_permission('comptabilite'));

CREATE POLICY factures_validations_all ON factures_validations FOR ALL TO authenticated
  USING (public.is_admin() OR public.has_module_permission('comptabilite'))
  WITH CHECK (public.is_admin() OR public.has_module_permission('comptabilite'));

CREATE POLICY factures_references_all ON factures_references FOR ALL TO authenticated
  USING (public.is_admin() OR public.has_module_permission('comptabilite'))
  WITH CHECK (public.is_admin() OR public.has_module_permission('comptabilite'));

CREATE POLICY sondages_staff ON sondages FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('sondages'));

CREATE POLICY sondage_questions_staff ON sondage_questions FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('sondages'));

-- Réponses publiques via token (anon)
CREATE POLICY sondage_reponses_staff ON sondage_reponses FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY sondage_reponses_anon_insert ON sondage_reponses FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sondages s
      WHERE s.id = sondage_id AND s.actif = true AND s.accepte_reponses = true
    )
  );

CREATE POLICY visites_all ON visites_classes FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY inventaire_all ON inventaire_branches FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY enclassements_all ON enclassements FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('enclassement'));

CREATE POLICY classes_enc_all ON classes_enclassement FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('enclassement'));

CREATE POLICY affectations_enc_all ON affectations_eleves_enc FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('enclassement'));

CREATE POLICY devoirs_all ON devoirs FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY suivi_devoirs_all ON suivi_devoirs FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY pools_all ON pools FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('planning'));

CREATE POLICY creneaux_all ON creneaux FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('planning'));

CREATE POLICY affectations_all ON affectations FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('planning'));

CREATE POLICY planning_branches_all ON planning_branches FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.is_admin() OR public.has_module_permission('planning'));

CREATE POLICY disponibilites_all ON disponibilites FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY niveaux_read ON niveaux FOR SELECT TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY lieux_read ON lieux_travail FOR SELECT TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY salles_read ON salles FOR SELECT TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY plan_classe_all ON plan_classe FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY sanctions_all ON sanctions_eleves FOR ALL TO authenticated
  USING (public.current_utilisateur_id() IS NOT NULL)
  WITH CHECK (public.current_utilisateur_id() IS NOT NULL);

CREATE POLICY notes_perso_all ON notes_personnelles FOR ALL TO authenticated
  USING (utilisateur_id = public.current_utilisateur_id() OR public.is_admin())
  WITH CHECK (utilisateur_id = public.current_utilisateur_id() OR public.is_admin());

-- Vue classes_with_stats
GRANT SELECT ON public.classes_with_stats TO authenticated;
