const pool = require('./database');

const initDB = async () => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS utilisateurs (id SERIAL PRIMARY KEY, nom VARCHAR(100) NOT NULL, prenom VARCHAR(100) NOT NULL, email VARCHAR(150) UNIQUE NOT NULL, mot_de_passe VARCHAR(255) NOT NULL, role VARCHAR(20) CHECK (role IN ('admin','prof','eleve','parent')) NOT NULL, actif BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS classes (id SERIAL PRIMARY KEY, nom VARCHAR(50) NOT NULL, niveau VARCHAR(50), annee_scolaire VARCHAR(20), prof_principal_id INTEGER REFERENCES utilisateurs(id));`);
    await pool.query(`CREATE TABLE IF NOT EXISTS eleves (id SERIAL PRIMARY KEY, utilisateur_id INTEGER REFERENCES utilisateurs(id), classe_id INTEGER REFERENCES classes(id), date_naissance DATE, adresse TEXT, telephone VARCHAR(20), nom_parent VARCHAR(200), telephone_parent VARCHAR(20), statut VARCHAR(20) DEFAULT 'actif');`);
    await pool.query(`CREATE TABLE IF NOT EXISTS matieres (id SERIAL PRIMARY KEY, nom VARCHAR(100) NOT NULL, code VARCHAR(20), coefficient DECIMAL(3,1) DEFAULT 1);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS emploi_du_temps (id SERIAL PRIMARY KEY, classe_id INTEGER REFERENCES classes(id), matiere_id INTEGER REFERENCES matieres(id), prof_id INTEGER REFERENCES utilisateurs(id), jour VARCHAR(20), heure_debut TIME, heure_fin TIME, salle VARCHAR(50));`);
    await pool.query(`CREATE TABLE IF NOT EXISTS presences (id SERIAL PRIMARY KEY, eleve_id INTEGER REFERENCES eleves(id), emploi_du_temps_id INTEGER REFERENCES emploi_du_temps(id), date DATE, statut VARCHAR(20) CHECK (statut IN ('present','absent','retard','excuse')), commentaire TEXT);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS evaluations (id SERIAL PRIMARY KEY, nom VARCHAR(200) NOT NULL, classe_id INTEGER REFERENCES classes(id), matiere_id INTEGER REFERENCES matieres(id), prof_id INTEGER REFERENCES utilisateurs(id), date DATE, type VARCHAR(50) DEFAULT 'Ecrit', coefficient DECIMAL(3,1) DEFAULT 1, sur DECIMAL(4,2) DEFAULT 20, publie BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS notes (id SERIAL PRIMARY KEY, evaluation_id INTEGER REFERENCES evaluations(id) ON DELETE CASCADE, eleve_id INTEGER REFERENCES eleves(id), valeur DECIMAL(4,2), absent BOOLEAN DEFAULT false, dispense BOOLEAN DEFAULT false, commentaire TEXT, created_at TIMESTAMP DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, expediteur_id INTEGER REFERENCES utilisateurs(id), destinataire_id INTEGER REFERENCES utilisateurs(id), sujet VARCHAR(200), contenu TEXT, lu BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS paiements (id SERIAL PRIMARY KEY, eleve_id INTEGER REFERENCES eleves(id), montant DECIMAL(10,2), type VARCHAR(100), statut VARCHAR(20) DEFAULT 'en_attente', date_paiement DATE, commentaire TEXT, created_at TIMESTAMP DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, utilisateur_id INTEGER REFERENCES utilisateurs(id), titre VARCHAR(200), contenu TEXT, lu BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW());`);
    // Colonnes additionnelles utilisateurs (migrations)
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS telephone VARCHAR(20)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS specialite VARCHAR(100)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS adresse TEXT`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS npa VARCHAR(10)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS lieu VARCHAR(100)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS sexe VARCHAR(10)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS taux_activite INTEGER`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS periodes_semaine INTEGER`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS date_naissance DATE`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS avs VARCHAR(20)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS type_contrat VARCHAR(50)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS type_permis VARCHAR(50)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS niveau_prefere VARCHAR(100)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS branches_specialites TEXT`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS lieu_travail_prefere VARCHAR(100)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS remarque_lieu_travail TEXT`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS doit_changer_mdp BOOLEAN DEFAULT false`);

    // Table documents professeurs
    await pool.query(`CREATE TABLE IF NOT EXISTS documents_profs (id SERIAL PRIMARY KEY, prof_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE, nom VARCHAR(255) NOT NULL, type VARCHAR(50) DEFAULT 'Autre', contenu TEXT NOT NULL, taille INTEGER, created_at TIMESTAMP DEFAULT NOW());`);

    // Table documents élèves
    await pool.query(`CREATE TABLE IF NOT EXISTS documents_eleves (id SERIAL PRIMARY KEY, eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE, nom VARCHAR(255) NOT NULL, type VARCHAR(50) DEFAULT 'Autre', contenu TEXT NOT NULL, taille INTEGER, created_at TIMESTAMP DEFAULT NOW());`);

    // Table sanctions élèves
    await pool.query(`CREATE TABLE IF NOT EXISTS sanctions_eleves (id SERIAL PRIMARY KEY, eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE, echelle INTEGER NOT NULL, infraction VARCHAR(100) NOT NULL, niveau VARCHAR(100) NOT NULL, date_sanction DATE, prof_nom VARCHAR(200), created_at TIMESTAMP DEFAULT NOW());`);

    // Tables planning
    await pool.query(`CREATE TABLE IF NOT EXISTS creneaux (id SERIAL PRIMARY KEY, jour VARCHAR(20), heure_debut TIME, heure_fin TIME, periode VARCHAR(50), ordre INTEGER);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS pools (id SERIAL PRIMARY KEY, nom VARCHAR(200) NOT NULL, site VARCHAR(200), couleur VARCHAR(20) DEFAULT '#6366f1', horaires TEXT, niveau VARCHAR(100));`);
    await pool.query(`CREATE TABLE IF NOT EXISTS disponibilites (id SERIAL PRIMARY KEY, prof_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE, creneau_id INTEGER REFERENCES creneaux(id) ON DELETE CASCADE, disponible BOOLEAN DEFAULT true);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS pool_profs (id SERIAL PRIMARY KEY, pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE, prof_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS pool_classes (id SERIAL PRIMARY KEY, pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE, classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS pool_branches (id SERIAL PRIMARY KEY, pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE, matiere_id INTEGER REFERENCES matieres(id) ON DELETE CASCADE);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS classe_horaires (id SERIAL PRIMARY KEY, classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE, jour VARCHAR(20), periode VARCHAR(50));`);
    await pool.query(`CREATE TABLE IF NOT EXISTS affectations (id SERIAL PRIMARY KEY, prof_id INTEGER REFERENCES utilisateurs(id), classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE, matiere_id INTEGER REFERENCES matieres(id), creneau_id INTEGER REFERENCES creneaux(id) ON DELETE CASCADE, UNIQUE(classe_id, creneau_id));`);
    await pool.query(`CREATE TABLE IF NOT EXISTS planning_branches (id SERIAL PRIMARY KEY, prof_id INTEGER REFERENCES utilisateurs(id), classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE, matiere_id INTEGER REFERENCES matieres(id) ON DELETE CASCADE, pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE, UNIQUE(classe_id, matiere_id, pool_id));`);

    // Table observations élèves
    await pool.query(`CREATE TABLE IF NOT EXISTS observations (id SERIAL PRIMARY KEY, eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE, titre VARCHAR(200), contenu TEXT, mesure_prise TEXT, intervention_responsable BOOLEAN DEFAULT false, demande_entretien BOOLEAN DEFAULT false, auteur_id INTEGER REFERENCES utilisateurs(id), created_at TIMESTAMP DEFAULT NOW());`);

    // Table plan de classe
    await pool.query(`CREATE TABLE IF NOT EXISTS plan_classe (id SERIAL PRIMARY KEY, classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE UNIQUE, positions TEXT, updated_at TIMESTAMP);`);

    // Colonnes additionnelles classes
    await pool.query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true`);
    await pool.query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS annee_scolaire VARCHAR(20)`);

    // Colonnes additionnelles pools (pour DBs existantes sans niveau)
    await pool.query(`ALTER TABLE pools ADD COLUMN IF NOT EXISTS niveau VARCHAR(100)`);

    // Colonnes additionnelles matieres (branches)
    await pool.query(`ALTER TABLE matieres ADD COLUMN IF NOT EXISTS niveau VARCHAR(100)`);
    await pool.query(`ALTER TABLE matieres ADD COLUMN IF NOT EXISTS periodes_semaine INTEGER`);
    await pool.query(`ALTER TABLE matieres ADD COLUMN IF NOT EXISTS type_branche VARCHAR(50) DEFAULT 'principale'`);

    // Colonnes additionnelles evaluations
    await pool.query(`ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS points_max DECIMAL(4,2) DEFAULT 30`);

    // Colonne points dans notes (points bruts de l'élève)
    await pool.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS points DECIMAL(5,2)`);

    console.log('✅ Toutes les tables créées avec succès !');
  } catch (err) {
    console.error('Erreur création tables:', err);
  }
};

module.exports = initDB;