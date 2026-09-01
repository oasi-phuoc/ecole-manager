-- Données de référence (ex-initDB seeds)

INSERT INTO creneaux (jour, heure_debut, heure_fin, periode, ordre)
SELECT j.jour, p.debut::time, p.fin::time, p.periode, p.num
FROM (
  VALUES ('Lundi'), ('Mardi'), ('Mercredi'), ('Jeudi'), ('Vendredi')
) AS j(jour),
(
  VALUES
    ('Matin', 1, '08:20', '09:05'),
    ('Matin', 2, '09:05', '09:45'),
    ('Matin', 3, '10:05', '10:55'),
    ('Matin', 4, '10:55', '11:40'),
    ('Après-midi', 1, '13:30', '14:15'),
    ('Après-midi', 2, '14:15', '15:00'),
    ('Après-midi', 3, '15:20', '16:05'),
    ('Après-midi', 4, '16:05', '16:50')
) AS p(periode, num, debut, fin)
WHERE NOT EXISTS (SELECT 1 FROM creneaux LIMIT 1);

INSERT INTO niveaux (nom, ordre) VALUES
  ('CSC', 1), ('CFR', 2), ('EPL', 3), ('CPR', 4)
ON CONFLICT (nom) DO NOTHING;

INSERT INTO materiels (nom, section, prix)
SELECT v.nom, v.section, v.prix
FROM (VALUES
  ('Manifestations', 'scolaire', 20.00),
  ('Photocopies / feuilles', 'scolaire', 47.00),
  ("Matériel d'enseignement", 'scolaire', 15.00),
  ('ACM / Sports', 'scolaire', 22.20),
  ('Déplacement', 'scolaire', 35.00),
  ('Classeur 7 cm', 'scolaire', 2.80),
  ('Classeur 4 cm', 'scolaire', 2.00),
  ('Cahier A4', 'scolaire', 1.90),
  ('Feuilles de dessin', 'scolaire', 10.00),
  ('Agenda', 'fournitures', 12.00),
  ('Jeux de répertoires', 'fournitures', 1.60),
  ('Fixpencil pour mines HB', 'fournitures', 6.00),
  ('Boîte de mines (HB)', 'fournitures', 1.80),
  ('Gomme', 'fournitures', 1.40),
  ('Crayons de couleur', 'fournitures', 6.90),
  ('Plume pilot + 3 cartouches', 'fournitures', 14.80)
) AS v(nom, section, prix)
WHERE NOT EXISTS (SELECT 1 FROM materiels LIMIT 1);

-- Lieux + salles
DO $$
DECLARE
  lid INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM lieux_travail LIMIT 1) THEN
    INSERT INTO lieux_travail (nom) VALUES ('BOTZA') ON CONFLICT (nom) DO NOTHING RETURNING id INTO lid;
    IF lid IS NOT NULL THEN
      INSERT INTO salles (nom, lieu_travail_id) VALUES
        ('Salle 1', lid), ('Salle 2', lid), ('Salle 3', lid), ('Salle 4', lid);
    END IF;
    INSERT INTO lieux_travail (nom) VALUES ('SYNECOM') ON CONFLICT (nom) DO NOTHING RETURNING id INTO lid;
    IF lid IS NOT NULL THEN
      INSERT INTO salles (nom, lieu_travail_id) VALUES
        ('Salle 11', lid), ('Salle 12', lid), ('Salle 13', lid),
        ('Salle 21', lid), ('Salle 22', lid), ('Salle 23', lid),
        ('Salle 24', lid), ('Salle 25', lid), ('Salle 26', lid);
    END IF;
    INSERT INTO lieux_travail (nom) VALUES ('CREUSET') ON CONFLICT (nom) DO NOTHING RETURNING id INTO lid;
    IF lid IS NOT NULL THEN
      INSERT INTO salles (nom, lieu_travail_id) VALUES
        ('Salle 1', lid), ('Salle 2', lid), ('Salle 3', lid);
    END IF;
  END IF;
END $$;
