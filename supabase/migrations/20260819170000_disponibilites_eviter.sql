-- Périodes « à éviter » : le professeur est disponible mais préfère ne pas y être affecté.
ALTER TABLE disponibilites ADD COLUMN IF NOT EXISTS eviter BOOLEAN DEFAULT false;
UPDATE disponibilites SET eviter = false WHERE eviter IS NULL;
