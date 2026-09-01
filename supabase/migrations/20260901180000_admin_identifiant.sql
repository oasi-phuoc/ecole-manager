-- Identifiant de connexion « admin » pour le compte administrateur principal
UPDATE utilisateurs
SET identifiant = 'admin'
WHERE role = 'admin'
  AND (
    LOWER(email) = 'admin@ecole.com'
    OR LOWER(identifiant) = 'admin@ecole.com'
    OR identifiant IS NULL
    OR TRIM(identifiant) = ''
  )
  AND NOT EXISTS (
    SELECT 1 FROM utilisateurs u2
    WHERE u2.identifiant = 'admin' AND u2.id <> utilisateurs.id
  );
