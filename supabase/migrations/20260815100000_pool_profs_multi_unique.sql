-- Un professeur peut appartenir à plusieurs pools ; pas de doublon dans un même pool
CREATE UNIQUE INDEX IF NOT EXISTS pool_profs_pool_prof_uidx ON pool_profs (pool_id, prof_id);
