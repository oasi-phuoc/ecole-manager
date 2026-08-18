-- Rattacher Autre / Titulariat / Atelier / Médiation (et les cours) au pool d'origine
ALTER TABLE affectations
  ADD COLUMN IF NOT EXISTS pool_id INTEGER REFERENCES pools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS affectations_pool_idx ON affectations (pool_id);

-- Cours déjà liés à une classe présente dans un seul pool
UPDATE affectations a
SET pool_id = pc.pool_id
FROM pool_classes pc
WHERE a.pool_id IS NULL
  AND a.classe_id IS NOT NULL
  AND pc.classe_id = a.classe_id
  AND NOT EXISTS (
    SELECT 1 FROM pool_classes pc2
    WHERE pc2.classe_id = a.classe_id AND pc2.pool_id IS DISTINCT FROM pc.pool_id
  );

-- Périodes spéciales : uniquement si le professeur n'appartient qu'à un pool
UPDATE affectations a
SET pool_id = sub.seul_pool
FROM (
  SELECT a2.id, MIN(pp.pool_id) AS seul_pool
  FROM affectations a2
  JOIN pool_profs pp ON pp.prof_id = a2.prof_id
  WHERE a2.pool_id IS NULL
    AND a2.classe_id IS NULL
    AND a2.type_special IN ('titulariat', 'atelier', 'mediation', 'autre')
  GROUP BY a2.id
  HAVING COUNT(DISTINCT pp.pool_id) = 1
) sub
WHERE a.id = sub.id;
