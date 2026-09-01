-- RPCs pour remplacer les jointures Express

CREATE OR REPLACE FUNCTION public.get_eleves_list()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT e.*,
      COALESCE(u.nom, e.nom) AS nom,
      COALESCE(u.prenom, e.prenom) AS prenom,
      u.email,
      c.nom AS classe_nom,
      (SELECT COUNT(*)::int FROM observations o WHERE o.eleve_id = e.id) AS nb_observations,
      (SELECT COUNT(*)::int FROM sanctions_eleves s WHERE s.eleve_id = e.id) AS nb_sanctions
    FROM eleves e
    LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
    LEFT JOIN classes c ON e.classe_id = c.id
    ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)
  ) t;
$$;

CREATE OR REPLACE FUNCTION public.get_profs_list()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT id, nom, prenom, email, role, actif, telephone, specialite, sexe,
      taux_activite, periodes_semaine, niveau_prefere, type_prof, identifiant, permissions
    FROM utilisateurs
    WHERE role IN ('prof', 'admin') OR role_acces = 'employe'
    ORDER BY nom, prenom
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.get_eleves_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profs_list() TO authenticated;
