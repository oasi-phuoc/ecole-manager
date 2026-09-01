-- ecole-manager — schéma complet (ex-initDB.js)
-- Séquence SERIAL conservée pour compatibilité import Render

CREATE TABLE IF NOT EXISTS utilisateurs (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  mot_de_passe VARCHAR(255),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','prof','eleve','parent')),
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  telephone VARCHAR(20),
  specialite VARCHAR(100),
  adresse TEXT,
  npa VARCHAR(10),
  lieu VARCHAR(100),
  sexe VARCHAR(10),
  taux_activite INTEGER,
  periodes_semaine INTEGER,
  date_naissance DATE,
  avs VARCHAR(20),
  type_contrat VARCHAR(50),
  type_permis VARCHAR(50),
  niveau_prefere VARCHAR(100),
  branches_specialites TEXT,
  lieu_travail_prefere VARCHAR(100),
  remarque_lieu_travail TEXT,
  priorite_pref VARCHAR(20),
  type_prof VARCHAR(50),
  remarque_disponibilites TEXT,
  doit_changer_mdp BOOLEAN DEFAULT false,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret TEXT,
  mfa_enabled_at TIMESTAMPTZ,
  mfa_backup_codes JSONB DEFAULT '[]'::jsonb,
  role_acces VARCHAR(20) DEFAULT 'employe',
  identifiant VARCHAR(50),
  permissions JSONB DEFAULT '{}'::jsonb,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS utilisateurs_identifiant_uq
  ON utilisateurs (LOWER(identifiant)) WHERE identifiant IS NOT NULL;

CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(50) NOT NULL,
  niveau VARCHAR(50),
  annee_scolaire VARCHAR(20),
  prof_principal_id INTEGER REFERENCES utilisateurs(id),
  actif BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS eleves (
  id SERIAL PRIMARY KEY,
  utilisateur_id INTEGER REFERENCES utilisateurs(id),
  classe_id INTEGER REFERENCES classes(id),
  date_naissance DATE,
  sexe VARCHAR(10),
  adresse TEXT,
  telephone VARCHAR(20),
  nom_parent VARCHAR(200),
  telephone_parent VARCHAR(20),
  statut VARCHAR(20) DEFAULT 'actif',
  nom VARCHAR(200),
  prenom VARCHAR(200),
  date_debut_cours DATE,
  categorie VARCHAR(20),
  photo TEXT,
  photo_storage_path TEXT,
  oasi_prog_nom VARCHAR(200),
  oasi_prog_encadrant VARCHAR(200),
  oasi_n INTEGER,
  oasi_ref INTEGER,
  oasi_pos INTEGER,
  oasi_nom VARCHAR(200),
  oasi_nais VARCHAR(100),
  oasi_nationalite VARCHAR(100),
  nationalite VARCHAR(100),
  oasi_presence_date DATE,
  oasi_jour_semaine VARCHAR(50),
  oasi_presence_periode VARCHAR(100),
  oasi_presence_type VARCHAR(100),
  oasi_remarque TEXT,
  oasi_controle_du DATE,
  oasi_controle_au DATE,
  oasi_prog_presences TEXT,
  oasi_prog_admin TEXT,
  oasi_as TEXT,
  oasi_prg_id INTEGER,
  oasi_prg_occupation_id INTEGER,
  oasi_ra_id INTEGER,
  oasi_temps_reparti_id INTEGER
);

CREATE TABLE IF NOT EXISTS matieres (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  code VARCHAR(20),
  coefficient DECIMAL(3,1) DEFAULT 1,
  niveau VARCHAR(100),
  periodes_semaine INTEGER,
  type_branche VARCHAR(50) DEFAULT 'principale',
  designation_courte VARCHAR(20),
  suivi_notes BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS emploi_du_temps (
  id SERIAL PRIMARY KEY,
  classe_id INTEGER REFERENCES classes(id),
  matiere_id INTEGER REFERENCES matieres(id),
  prof_id INTEGER REFERENCES utilisateurs(id),
  jour VARCHAR(20),
  heure_debut TIME,
  heure_fin TIME,
  salle VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS presences (
  id SERIAL PRIMARY KEY,
  eleve_id INTEGER REFERENCES eleves(id),
  emploi_du_temps_id INTEGER REFERENCES emploi_du_temps(id),
  date DATE,
  statut VARCHAR(20) CHECK (statut IN ('present','absent','retard','excuse')),
  commentaire TEXT
);

CREATE TABLE IF NOT EXISTS evaluations (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(200) NOT NULL,
  classe_id INTEGER REFERENCES classes(id),
  matiere_id INTEGER REFERENCES matieres(id),
  prof_id INTEGER REFERENCES utilisateurs(id),
  date DATE,
  type VARCHAR(50) DEFAULT 'Ecrit',
  coefficient DECIMAL(3,1) DEFAULT 1,
  sur DECIMAL(4,2) DEFAULT 20,
  publie BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  points_max DECIMAL(4,2) DEFAULT 30,
  nb_exercices INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  evaluation_id INTEGER REFERENCES evaluations(id) ON DELETE CASCADE,
  eleve_id INTEGER REFERENCES eleves(id),
  valeur DECIMAL(4,2),
  absent BOOLEAN DEFAULT false,
  dispense BOOLEAN DEFAULT false,
  commentaire TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  points DECIMAL(5,2),
  points_detail JSONB
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  expediteur_id INTEGER REFERENCES utilisateurs(id),
  destinataire_id INTEGER REFERENCES utilisateurs(id),
  sujet VARCHAR(200),
  contenu TEXT,
  lu BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paiements (
  id SERIAL PRIMARY KEY,
  eleve_id INTEGER REFERENCES eleves(id),
  montant DECIMAL(10,2),
  type VARCHAR(100),
  statut VARCHAR(20) DEFAULT 'en_attente',
  date_paiement DATE,
  commentaire TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  valide BOOLEAN DEFAULT false,
  reference VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  utilisateur_id INTEGER REFERENCES utilisateurs(id),
  titre VARCHAR(200),
  contenu TEXT,
  lu BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parametres_ecole (
  id SERIAL PRIMARY KEY,
  nom_ecole VARCHAR(200),
  adresse TEXT,
  telephone VARCHAR(50),
  email VARCHAR(150),
  annee_scolaire VARCHAR(20),
  directeur VARCHAR(200),
  responsable_langues_jeunes VARCHAR(200),
  responsable_niveau VARCHAR(200),
  responsable_niveau_csc VARCHAR(200),
  responsable_niveau_cfr VARCHAR(200),
  responsable_niveau_epl VARCHAR(200),
  sexe_responsable_langues_jeunes VARCHAR(1),
  sexe_responsable_niveau_csc VARCHAR(1),
  sexe_responsable_niveau_cfr VARCHAR(1),
  sexe_responsable_niveau_epl VARCHAR(1),
  horaires JSONB DEFAULT '{}'::jsonb,
  date_debut_annee DATE,
  date_fin_annee DATE,
  acces_profs JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS parametres_mail (
  id SERIAL PRIMARY KEY,
  smtp_active BOOLEAN DEFAULT false,
  smtp_host VARCHAR(255),
  smtp_port INTEGER DEFAULT 587,
  smtp_secure BOOLEAN DEFAULT false,
  smtp_user VARCHAR(255),
  smtp_app_password TEXT,
  smtp_from_name VARCHAR(255),
  smtp_from_email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents_profs (
  id SERIAL PRIMARY KEY,
  prof_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'Autre',
  contenu TEXT,
  taille INTEGER,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents_eleves (
  id SERIAL PRIMARY KEY,
  eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'Autre',
  contenu TEXT,
  taille INTEGER,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents_administratifs (
  id SERIAL PRIMARY KEY,
  designation VARCHAR(255) NOT NULL,
  nom_fichier VARCHAR(255) NOT NULL,
  contenu TEXT,
  taille INTEGER,
  storage_path TEXT,
  auteur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  categorie VARCHAR(100) DEFAULT 'Administratifs',
  sous_categorie VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS tcf_state (
  id SERIAL PRIMARY KEY,
  cle VARCHAR(50) UNIQUE NOT NULL,
  donnees JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventaire_branches (
  id SERIAL PRIMARY KEY,
  classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  branche_id INTEGER REFERENCES matieres(id) ON DELETE CASCADE,
  date_document DATE NOT NULL DEFAULT CURRENT_DATE,
  nom_document VARCHAR(255) NOT NULL,
  numero_document VARCHAR(100),
  ordre INTEGER,
  sans_numero BOOLEAN DEFAULT false,
  remarques TEXT,
  auteur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sanctions_eleves (
  id SERIAL PRIMARY KEY,
  eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE,
  echelle INTEGER NOT NULL,
  infraction VARCHAR(100) NOT NULL,
  niveau VARCHAR(100) NOT NULL,
  date_sanction DATE,
  prof_nom VARCHAR(200),
  observation_ref VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creneaux (
  id SERIAL PRIMARY KEY,
  jour VARCHAR(20),
  heure_debut TIME,
  heure_fin TIME,
  periode VARCHAR(50),
  ordre INTEGER
);

CREATE TABLE IF NOT EXISTS pools (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(200) NOT NULL,
  site VARCHAR(200),
  couleur VARCHAR(20) DEFAULT '#6366f1',
  niveau VARCHAR(100),
  horaires TEXT,
  ordre INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS disponibilites (
  id SERIAL PRIMARY KEY,
  prof_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
  creneau_id INTEGER REFERENCES creneaux(id) ON DELETE CASCADE,
  disponible BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS pool_profs (
  id SERIAL PRIMARY KEY,
  pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE,
  prof_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pool_classes (
  id SERIAL PRIMARY KEY,
  pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE,
  classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pool_branches (
  id SERIAL PRIMARY KEY,
  pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE,
  matiere_id INTEGER REFERENCES matieres(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS classe_horaires (
  id SERIAL PRIMARY KEY,
  classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  jour VARCHAR(20),
  periode VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS affectations (
  id SERIAL PRIMARY KEY,
  prof_id INTEGER REFERENCES utilisateurs(id),
  classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  matiere_id INTEGER REFERENCES matieres(id),
  creneau_id INTEGER REFERENCES creneaux(id) ON DELETE CASCADE,
  type_special VARCHAR(30),
  UNIQUE(classe_id, creneau_id)
);

CREATE TABLE IF NOT EXISTS planning_branches (
  id SERIAL PRIMARY KEY,
  prof_id INTEGER REFERENCES utilisateurs(id),
  classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  matiere_id INTEGER REFERENCES matieres(id) ON DELETE CASCADE,
  pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE,
  UNIQUE(classe_id, matiere_id, pool_id)
);

CREATE TABLE IF NOT EXISTS classe_couleurs (
  id SERIAL PRIMARY KEY,
  classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE UNIQUE,
  couleur VARCHAR(20) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prof_couleurs (
  id SERIAL PRIMARY KEY,
  prof_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE UNIQUE,
  couleur VARCHAR(20) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branche_couleurs (
  id SERIAL PRIMARY KEY,
  matiere_id INTEGER REFERENCES matieres(id) ON DELETE CASCADE UNIQUE,
  couleur VARCHAR(20) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS observations (
  id SERIAL PRIMARY KEY,
  eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE,
  reference_obs VARCHAR(50),
  titre VARCHAR(200),
  contenu TEXT,
  mesure_prise TEXT,
  intervention_responsable BOOLEAN DEFAULT false,
  demande_entretien BOOLEAN DEFAULT false,
  auteur_id INTEGER REFERENCES utilisateurs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_classe (
  id SERIAL PRIMARY KEY,
  classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE UNIQUE,
  positions TEXT,
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS presences_v2 (
  id SERIAL PRIMARY KEY,
  eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE,
  classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  p1 VARCHAR(5), p2 VARCHAR(5), p3 VARCHAR(5), p4 VARCHAR(5),
  p5 VARCHAR(5), p6 VARCHAR(5), p7 VARCHAR(5), p8 VARCHAR(5),
  remarque TEXT,
  valide BOOLEAN DEFAULT false,
  UNIQUE(eleve_id, date)
);

CREATE TABLE IF NOT EXISTS sorties_scolaires (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) DEFAULT 'autre',
  classe1 VARCHAR(100),
  classe2 VARCHAR(100),
  titulaires TEXT,
  autres_accompagnants TEXT,
  date_sortie DATE,
  destination TEXT,
  activites TEXT,
  lieu_depart TEXT,
  heure_depart TIME,
  lieu_retour TEXT,
  heure_retour TIME,
  budget DECIMAL(10,2),
  commentaires TEXT,
  delai DATE,
  approuve BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  classes_ids TEXT,
  classes_noms TEXT
);

CREATE TABLE IF NOT EXISTS bulletin_criteres (
  id SERIAL PRIMARY KEY,
  classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE,
  c1 VARCHAR(10), c2 VARCHAR(10), c3 VARCHAR(10), c4 VARCHAR(10), c5 VARCHAR(10),
  c6 VARCHAR(10), c7 VARCHAR(10), c8 VARCHAR(10), c9 VARCHAR(10), c10 VARCHAR(10),
  remarques TEXT,
  valide BOOLEAN DEFAULT false,
  UNIQUE(classe_id, eleve_id)
);

CREATE TABLE IF NOT EXISTS materiels (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  section VARCHAR(30) NOT NULL DEFAULT 'scolaire',
  prix DECIMAL(10,2) NOT NULL DEFAULT 0,
  ref VARCHAR(100),
  fournisseur VARCHAR(200),
  rabais DECIMAL(5,2) DEFAULT 0,
  remarques TEXT,
  icone VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS niveaux (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(50) NOT NULL UNIQUE,
  ordre INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lieux_travail (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL UNIQUE,
  ordre INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS salles (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  lieu_travail_id INTEGER REFERENCES lieux_travail(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enclassements (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(200),
  session_tcf VARCHAR(50) NOT NULL DEFAULT 'Test d''août',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INTEGER REFERENCES utilisateurs(id),
  statut VARCHAR(20) CHECK (statut IN ('brouillon','validé','archivé')) DEFAULT 'brouillon',
  parametres JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS classes_enclassement (
  id SERIAL PRIMARY KEY,
  enclassement_id INTEGER NOT NULL REFERENCES enclassements(id) ON DELETE CASCADE,
  structure VARCHAR(10) CHECK (structure IN ('CSC','CFR')) NOT NULL,
  nom VARCHAR(50) NOT NULL,
  capacite_max INTEGER NOT NULL DEFAULT 12
);

CREATE TABLE IF NOT EXISTS affectations_eleves_enc (
  id SERIAL PRIMARY KEY,
  classe_id INTEGER NOT NULL REFERENCES classes_enclassement(id) ON DELETE CASCADE,
  eleve_id INTEGER NOT NULL REFERENCES eleves(id),
  score_francais INTEGER NOT NULL,
  score_math INTEGER NOT NULL,
  score_pondere INTEGER NOT NULL,
  flagge_plancher BOOLEAN DEFAULT false,
  motif_flag TEXT,
  position_serpentin INTEGER NOT NULL,
  modifie_manuellement BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS calendrier (
  id SERIAL PRIMARY KEY,
  titre VARCHAR(200),
  description TEXT,
  date_debut DATE NOT NULL,
  date_fin DATE,
  type VARCHAR(50) DEFAULT 'Evenement',
  couleur VARCHAR(20) DEFAULT '#1a73e8',
  categorie VARCHAR(50) DEFAULT 'evenement',
  nom_vacance VARCHAR(200),
  heure_debut TIME,
  heure_fin TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS absences (
  id SERIAL PRIMARY KEY,
  eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE,
  date DATE,
  statut VARCHAR(20) DEFAULT 'absent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devoirs (
  id SERIAL PRIMARY KEY,
  classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  titre VARCHAR(200) NOT NULL,
  matiere VARCHAR(100),
  date_devoir DATE,
  date_remise DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suivi_devoirs (
  id SERIAL PRIMARY KEY,
  devoir_id INTEGER REFERENCES devoirs(id) ON DELETE CASCADE,
  eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE,
  statut VARCHAR(20) DEFAULT 'non_rendu' CHECK (statut IN ('rendu','non_rendu','partiel','excuse')),
  commentaire TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(devoir_id, eleve_id)
);

CREATE TABLE IF NOT EXISTS factures_validations (
  id SERIAL PRIMARY KEY,
  eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE,
  annee_scolaire VARCHAR(20) NOT NULL,
  valide BOOLEAN DEFAULT false,
  valide_at TIMESTAMPTZ,
  UNIQUE(eleve_id, annee_scolaire)
);

CREATE TABLE IF NOT EXISTS factures_references (
  id SERIAL PRIMARY KEY,
  eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE,
  annee_scolaire VARCHAR(20) NOT NULL,
  reference VARCHAR(35) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(eleve_id, annee_scolaire)
);

CREATE TABLE IF NOT EXISTS visites_classes (
  id SERIAL PRIMARY KEY,
  formateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  classe_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  branche_id INTEGER REFERENCES matieres(id) ON DELETE SET NULL,
  date_visite DATE,
  duree INTEGER DEFAULT 1,
  scores JSONB DEFAULT '{}'::jsonb,
  organisation JSONB DEFAULT '{}'::jsonb,
  observation TEXT,
  feedback TEXT,
  valide BOOLEAN DEFAULT false,
  created_by INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sondages (
  id SERIAL PRIMARY KEY,
  titre VARCHAR(500) NOT NULL,
  description TEXT,
  public_token VARCHAR(64) NOT NULL UNIQUE,
  actif BOOLEAN DEFAULT true,
  accepte_reponses BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sondage_questions (
  id SERIAL PRIMARY KEY,
  sondage_id INTEGER NOT NULL REFERENCES sondages(id) ON DELETE CASCADE,
  ordre INTEGER NOT NULL DEFAULT 0,
  type VARCHAR(30) NOT NULL CHECK (type IN ('texte','paragraphe','choix_unique','choix_multiple')),
  libelle TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  obligatoire BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_sondage_questions_sondage ON sondage_questions(sondage_id);

CREATE TABLE IF NOT EXISTS sondage_reponses (
  id SERIAL PRIMARY KEY,
  sondage_id INTEGER NOT NULL REFERENCES sondages(id) ON DELETE CASCADE,
  reponses JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sondage_reponses_sondage ON sondage_reponses(sondage_id);

-- Notes personnelles (employés)
CREATE TABLE IF NOT EXISTS notes_personnelles (
  id SERIAL PRIMARY KEY,
  utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
  contenu TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
