-- Tables présentes en prod Neon mais absentes de la migration initiale
CREATE TABLE IF NOT EXISTS classe_periodes (
  id SERIAL PRIMARY KEY,
  classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  creneau_id INTEGER REFERENCES creneaux(id) ON DELETE CASCADE,
  type_cours VARCHAR(50) DEFAULT 'cours'
);

CREATE TABLE IF NOT EXISTS commandes (
  id SERIAL PRIMARY KEY,
  article VARCHAR(255),
  quantite INTEGER DEFAULT 1,
  fournisseur VARCHAR(255),
  prix_unitaire DECIMAL(10,2),
  statut VARCHAR(50) DEFAULT 'en_attente',
  remarques TEXT,
  valide BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  numero_commande VARCHAR(20),
  date_commande DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS commandes_lignes (
  id SERIAL PRIMARY KEY,
  commande_id INTEGER REFERENCES commandes(id) ON DELETE CASCADE,
  article VARCHAR(255) NOT NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  ref VARCHAR(100),
  prix_unitaire DECIMAL(10,2),
  remarques TEXT,
  statut VARCHAR(20) DEFAULT 'en_attente',
  created_at TIMESTAMP DEFAULT NOW()
);
