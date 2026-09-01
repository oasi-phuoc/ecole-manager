-- Auth helpers : lier auth.users ↔ utilisateurs

CREATE OR REPLACE FUNCTION public.current_utilisateur_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id FROM utilisateurs u WHERE u.auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.role FROM utilisateurs u WHERE u.auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() = 'admin', false);
$$;

CREATE OR REPLACE FUNCTION public.has_module_permission(mod TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_admin() THEN true
    ELSE COALESCE(
      (SELECT (u.permissions ->> mod)::boolean FROM utilisateurs u WHERE u.auth_user_id = auth.uid()),
      false
    )
  END;
$$;

-- Trigger : après création auth.users, préparer ligne utilisateurs si metadata présente
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO utilisateurs (nom, prenom, email, role, mot_de_passe, auth_user_id, actif)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'nom', 'Utilisateur'),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'prof'),
    NULL,
    NEW.id,
    true
  )
  ON CONFLICT (email) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_ecole ON auth.users;
CREATE TRIGGER on_auth_user_created_ecole
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Vue classes avec stats (remplace GET /classes)
CREATE OR REPLACE VIEW public.classes_with_stats AS
SELECT
  c.*,
  u.nom AS prof_nom,
  u.prenom AS prof_prenom,
  u.sexe AS prof_sexe,
  COUNT(DISTINCT e.id)::int AS nb_eleves
FROM classes c
LEFT JOIN utilisateurs u ON u.id = c.prof_principal_id
LEFT JOIN eleves e ON e.classe_id = c.id
GROUP BY c.id, u.nom, u.prenom, u.sexe;

-- RPC profil courant (remplace GET /auth/moi)
CREATE OR REPLACE FUNCTION public.get_me()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(u)::json
  FROM utilisateurs u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_me() TO authenticated;
