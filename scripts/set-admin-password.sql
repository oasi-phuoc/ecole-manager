-- Réinitialisation manuelle (Supabase → SQL Editor) du mot de passe admin prod.
-- Mot de passe en clair : admin123
-- Hash bcryptjs cost 10 (généré 2026-11-05) — ne pas réutiliser ailleurs.

UPDATE utilisateurs
SET
  mot_de_passe = '$2b$10$NcZSugCV.W9/JwoDmV.nNexpHZaGuabTWIwfZOE4Xta/dQu.gn.rW',
  identifiant = 'admin',
  actif = true
WHERE role = 'admin'
  AND (
    LOWER(identifiant) = 'admin'
    OR LOWER(email) = 'admin@ecole.com'
    OR identifiant IS NULL
    OR TRIM(identifiant) = ''
  );

-- Vérification :
-- SELECT id, email, identifiant, mfa_enabled, mfa_exempt FROM utilisateurs WHERE role = 'admin';
