-- Seed de référence (dev local / reset). En prod : restaurer le dump Neon.
-- Voir docs/MIGRATION_SUPABASE.md

INSERT INTO niveaux (nom, ordre, periodes_normales, periodes_soutien) VALUES
  ('CSC', 1, 20, 4),
  ('CFR', 2, 20, 0),
  ('EPL', 3, 20, 0),
  ('CPR', 4, 20, 0),
  ('CAL', 5, 20, 4),
  ('APL', 6, 28, 0)
ON CONFLICT (nom) DO NOTHING;

INSERT INTO lieux_travail (nom, ordre) VALUES
  ('BOTZA', 1),
  ('SYNECOM', 2),
  ('CREUSET', 3)
ON CONFLICT (nom) DO NOTHING;

INSERT INTO salles (nom, lieu_travail_id)
SELECT s.nom, l.id
FROM (VALUES
  ('BOTZA', 'Salle 1'), ('BOTZA', 'Salle 2'), ('BOTZA', 'Salle 3'), ('BOTZA', 'Salle 4'),
  ('SYNECOM', 'Salle 11'), ('SYNECOM', 'Salle 12'), ('SYNECOM', 'Salle 13'),
  ('SYNECOM', 'Salle 21'), ('SYNECOM', 'Salle 22'), ('SYNECOM', 'Salle 23'),
  ('SYNECOM', 'Salle 24'), ('SYNECOM', 'Salle 25'), ('SYNECOM', 'Salle 26'),
  ('CREUSET', 'Salle 1'), ('CREUSET', 'Salle 2'), ('CREUSET', 'Salle 3')
) AS s(lieu, nom)
JOIN lieux_travail l ON l.nom = s.lieu
WHERE NOT EXISTS (
  SELECT 1 FROM salles x WHERE x.nom = s.nom AND x.lieu_travail_id = l.id
);

-- Créneaux standards (Lun–Ven × 8 périodes) si table vide
INSERT INTO creneaux (jour, heure_debut, heure_fin, periode, ordre)
SELECT j.jour, p.debut::time, p.fin::time, p.periode, p.ordre
FROM (VALUES
  ('Lundi'), ('Mardi'), ('Mercredi'), ('Jeudi'), ('Vendredi')
) AS j(jour)
CROSS JOIN (VALUES
  ('Matin', 1, '08:20', '09:05'),
  ('Matin', 2, '09:05', '09:45'),
  ('Matin', 3, '10:05', '10:55'),
  ('Matin', 4, '10:55', '11:40'),
  ('Après-midi', 1, '13:30', '14:15'),
  ('Après-midi', 2, '14:15', '15:00'),
  ('Après-midi', 3, '15:20', '16:05'),
  ('Après-midi', 4, '16:05', '16:50')
) AS p(periode, ordre, debut, fin)
WHERE NOT EXISTS (SELECT 1 FROM creneaux LIMIT 1);
