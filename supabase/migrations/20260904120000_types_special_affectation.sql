-- Types « Spécial » pour affectation professeurs (EDT)
ALTER TABLE parametres_ecole
  ADD COLUMN IF NOT EXISTS types_special_affectation JSONB
  DEFAULT '[
    {"id":"titulariat","label":"Titulariat"},
    {"id":"atelier","label":"Atelier"},
    {"id":"mediation","label":"Médiation"},
    {"id":"autre","label":"Autre"}
  ]'::jsonb;

UPDATE parametres_ecole
SET types_special_affectation = '[
  {"id":"titulariat","label":"Titulariat"},
  {"id":"atelier","label":"Atelier"},
  {"id":"mediation","label":"Médiation"},
  {"id":"autre","label":"Autre"}
]'::jsonb
WHERE types_special_affectation IS NULL
   OR types_special_affectation = '[]'::jsonb
   OR types_special_affectation = '{}'::jsonb;
