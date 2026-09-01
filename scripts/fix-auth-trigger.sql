-- À exécuter dans SQL Editor si createUser échoue avec "Database error creating new user"
-- Cause : trigger qui INSERT avec mot_de_passe NULL sur table existante

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.utilisateurs
  SET auth_user_id = NEW.id
  WHERE LOWER(email) = LOWER(NEW.email);
  RETURN NEW;
END;
$$;
