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
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS priorite_pref VARCHAR(20)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS type_prof VARCHAR(50)`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS remarque_disponibilites TEXT`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS doit_changer_mdp BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE parametres_ecole ADD COLUMN IF NOT EXISTS acces_profs JSONB DEFAULT '{}'::jsonb`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mfa_secret TEXT`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mfa_enabled_at TIMESTAMP`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mfa_backup_codes JSONB DEFAULT '[]'::jsonb`);
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS role_acces VARCHAR(20) DEFAULT 'employe'`);
    await pool.query(`ALTER TABLE paiements ADD COLUMN IF NOT EXISTS valide BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE paiements ADD COLUMN IF NOT EXISTS reference VARCHAR(100)`);

    // Table documents professeurs
    await pool.query(`CREATE TABLE IF NOT EXISTS documents_profs (id SERIAL PRIMARY KEY, prof_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE, nom VARCHAR(255) NOT NULL, type VARCHAR(50) DEFAULT 'Autre', contenu TEXT NOT NULL, taille INTEGER, created_at TIMESTAMP DEFAULT NOW());`);

    // Table documents élèves
    await pool.query(`CREATE TABLE IF NOT EXISTS documents_eleves (id SERIAL PRIMARY KEY, eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE, nom VARCHAR(255) NOT NULL, type VARCHAR(50) DEFAULT 'Autre', contenu TEXT NOT NULL, taille INTEGER, created_at TIMESTAMP DEFAULT NOW());`);

    // Table documents administratifs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents_administratifs (
        id SERIAL PRIMARY KEY,
        designation VARCHAR(255) NOT NULL,
        nom_fichier VARCHAR(255) NOT NULL,
        contenu TEXT NOT NULL,
        taille INTEGER,
        auteur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`ALTER TABLE documents_administratifs ADD COLUMN IF NOT EXISTS designation VARCHAR(255)`);
    await pool.query(`ALTER TABLE documents_administratifs ADD COLUMN IF NOT EXISTS nom_fichier VARCHAR(255)`);
    await pool.query(`ALTER TABLE documents_administratifs ADD COLUMN IF NOT EXISTS contenu TEXT`);
    await pool.query(`ALTER TABLE documents_administratifs ADD COLUMN IF NOT EXISTS taille INTEGER`);
    await pool.query(`ALTER TABLE documents_administratifs ADD COLUMN IF NOT EXISTS auteur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE documents_administratifs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
    await pool.query(`ALTER TABLE documents_administratifs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
    await pool.query(`ALTER TABLE documents_administratifs ADD COLUMN IF NOT EXISTS categorie VARCHAR(100) DEFAULT 'Administratifs'`);
    await pool.query(`ALTER TABLE documents_administratifs ADD COLUMN IF NOT EXISTS sous_categorie VARCHAR(100)`);

    // Table état module TCF (pool, affectation, résultats)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tcf_state (
        id SERIAL PRIMARY KEY,
        cle VARCHAR(50) UNIQUE NOT NULL,
        donnees JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_by INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE tcf_state ADD COLUMN IF NOT EXISTS cle VARCHAR(50)`);
    await pool.query(`ALTER TABLE tcf_state ADD COLUMN IF NOT EXISTS donnees JSONB NOT NULL DEFAULT '{}'::jsonb`);
    await pool.query(`ALTER TABLE tcf_state ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE tcf_state ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);

    // Table inventaire des branches par classe
    await pool.query(`
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
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`ALTER TABLE inventaire_branches ADD COLUMN IF NOT EXISTS ordre INTEGER`);
    await pool.query(`ALTER TABLE inventaire_branches ADD COLUMN IF NOT EXISTS sans_numero BOOLEAN DEFAULT false`);
    await pool.query(`
      WITH ordered AS (
        SELECT
          id,
          ROW_NUMBER() OVER (PARTITION BY classe_id, branche_id ORDER BY created_at ASC, id ASC) AS rn
        FROM inventaire_branches
      )
      UPDATE inventaire_branches ib
      SET ordre = ordered.rn
      FROM ordered
      WHERE ib.id = ordered.id AND ib.ordre IS NULL
    `);

    // Table sanctions élèves
    await pool.query(`CREATE TABLE IF NOT EXISTS sanctions_eleves (id SERIAL PRIMARY KEY, eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE, echelle INTEGER NOT NULL, infraction VARCHAR(100) NOT NULL, niveau VARCHAR(100) NOT NULL, date_sanction DATE, prof_nom VARCHAR(200), observation_ref VARCHAR(50), created_at TIMESTAMP DEFAULT NOW());`);
    await pool.query(`ALTER TABLE sanctions_eleves ADD COLUMN IF NOT EXISTS observation_ref VARCHAR(50)`);

    // Tables planning
    await pool.query(`CREATE TABLE IF NOT EXISTS creneaux (id SERIAL PRIMARY KEY, jour VARCHAR(20), heure_debut TIME, heure_fin TIME, periode VARCHAR(50), ordre INTEGER);`);
    // Seed creneaux by default if empty
    const nbCreneaux = await pool.query('SELECT COUNT(*) FROM creneaux');
    if (parseInt(nbCreneaux.rows[0].count) === 0) {
      const jours = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];
      const periodes = [
        {periode:'Matin',num:1,debut:'08:20',fin:'09:05'},
        {periode:'Matin',num:2,debut:'09:05',fin:'09:45'},
        {periode:'Matin',num:3,debut:'10:05',fin:'10:55'},
        {periode:'Matin',num:4,debut:'10:55',fin:'11:40'},
        {periode:'Après-midi',num:1,debut:'13:30',fin:'14:15'},
        {periode:'Après-midi',num:2,debut:'14:15',fin:'15:00'},
        {periode:'Après-midi',num:3,debut:'15:20',fin:'16:05'},
        {periode:'Après-midi',num:4,debut:'16:05',fin:'16:50'},
      ];
      for (const jour of jours) {
        for (const p of periodes) {
          await pool.query('INSERT INTO creneaux (jour, heure_debut, heure_fin, periode, ordre) VALUES ($1,$2,$3,$4,$5)', [jour, p.debut, p.fin, p.periode, p.num]);
        }
      }
    }
    await pool.query(`CREATE TABLE IF NOT EXISTS pools (id SERIAL PRIMARY KEY, nom VARCHAR(200) NOT NULL, site VARCHAR(200), couleur VARCHAR(20) DEFAULT '#6366f1', niveau VARCHAR(100));`);
    await pool.query(`ALTER TABLE pools ADD COLUMN IF NOT EXISTS horaires TEXT`);
    await pool.query(`ALTER TABLE pools ADD COLUMN IF NOT EXISTS ordre INTEGER DEFAULT 0`);
    await pool.query(`CREATE TABLE IF NOT EXISTS disponibilites (id SERIAL PRIMARY KEY, prof_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE, creneau_id INTEGER REFERENCES creneaux(id) ON DELETE CASCADE, disponible BOOLEAN DEFAULT true);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS pool_profs (id SERIAL PRIMARY KEY, pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE, prof_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS pool_classes (id SERIAL PRIMARY KEY, pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE, classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS pool_branches (id SERIAL PRIMARY KEY, pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE, matiere_id INTEGER REFERENCES matieres(id) ON DELETE CASCADE);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS classe_horaires (id SERIAL PRIMARY KEY, classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE, jour VARCHAR(20), periode VARCHAR(50));`);
    await pool.query(`CREATE TABLE IF NOT EXISTS affectations (id SERIAL PRIMARY KEY, prof_id INTEGER REFERENCES utilisateurs(id), classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE, matiere_id INTEGER REFERENCES matieres(id), creneau_id INTEGER REFERENCES creneaux(id) ON DELETE CASCADE, type_special VARCHAR(30), UNIQUE(classe_id, creneau_id));`);
    await pool.query(`ALTER TABLE affectations ADD COLUMN IF NOT EXISTS type_special VARCHAR(30)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS planning_branches (id SERIAL PRIMARY KEY, prof_id INTEGER REFERENCES utilisateurs(id), classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE, matiere_id INTEGER REFERENCES matieres(id) ON DELETE CASCADE, pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE, UNIQUE(classe_id, matiere_id, pool_id));`);
    await pool.query(`CREATE TABLE IF NOT EXISTS classe_couleurs (id SERIAL PRIMARY KEY, classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE UNIQUE, couleur VARCHAR(20) NOT NULL, updated_at TIMESTAMP DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS prof_couleurs (id SERIAL PRIMARY KEY, prof_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE UNIQUE, couleur VARCHAR(20) NOT NULL, updated_at TIMESTAMP DEFAULT NOW());`);
    await pool.query(`CREATE TABLE IF NOT EXISTS branche_couleurs (id SERIAL PRIMARY KEY, matiere_id INTEGER REFERENCES matieres(id) ON DELETE CASCADE UNIQUE, couleur VARCHAR(20) NOT NULL, updated_at TIMESTAMP DEFAULT NOW());`);

    // Table observations élèves
    await pool.query(`CREATE TABLE IF NOT EXISTS observations (id SERIAL PRIMARY KEY, eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE, reference_obs VARCHAR(50), titre VARCHAR(200), contenu TEXT, mesure_prise TEXT, intervention_responsable BOOLEAN DEFAULT false, demande_entretien BOOLEAN DEFAULT false, auteur_id INTEGER REFERENCES utilisateurs(id), created_at TIMESTAMP DEFAULT NOW());`);
    await pool.query(`ALTER TABLE observations ADD COLUMN IF NOT EXISTS reference_obs VARCHAR(50)`);

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
    await pool.query(`ALTER TABLE matieres ADD COLUMN IF NOT EXISTS designation_courte VARCHAR(20)`);
    await pool.query(`ALTER TABLE matieres ADD COLUMN IF NOT EXISTS suivi_notes BOOLEAN DEFAULT true`);
    await pool.query(`
      UPDATE matieres
      SET designation_courte = UPPER(SUBSTRING(COALESCE(nom, '') FROM 1 FOR 6))
      WHERE designation_courte IS NULL OR TRIM(designation_courte) = ''
    `);
    await pool.query(`UPDATE matieres SET suivi_notes = true WHERE suivi_notes IS NULL`);

    // Colonnes additionnelles evaluations
    await pool.query(`ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS points_max DECIMAL(4,2) DEFAULT 30`);

    // Colonne points dans notes (points bruts de l'élève)
    await pool.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS points DECIMAL(5,2)`);

    // Table paramètres école (si absente)
    await pool.query(`CREATE TABLE IF NOT EXISTS parametres_ecole (id SERIAL PRIMARY KEY, nom_ecole VARCHAR(200), adresse TEXT, telephone VARCHAR(50), email VARCHAR(150), annee_scolaire VARCHAR(20), directeur VARCHAR(200))`);
    await pool.query(`ALTER TABLE parametres_ecole ADD COLUMN IF NOT EXISTS responsable_langues_jeunes VARCHAR(200)`);
    await pool.query(`ALTER TABLE parametres_ecole ADD COLUMN IF NOT EXISTS responsable_niveau VARCHAR(200)`);
    await pool.query(`ALTER TABLE parametres_ecole ADD COLUMN IF NOT EXISTS responsable_niveau_csc VARCHAR(200)`);
    await pool.query(`ALTER TABLE parametres_ecole ADD COLUMN IF NOT EXISTS responsable_niveau_cfr VARCHAR(200)`);
    await pool.query(`ALTER TABLE parametres_ecole ADD COLUMN IF NOT EXISTS responsable_niveau_epl VARCHAR(200)`);
    await pool.query(`ALTER TABLE parametres_ecole ADD COLUMN IF NOT EXISTS sexe_responsable_langues_jeunes VARCHAR(1)`);
    await pool.query(`ALTER TABLE parametres_ecole ADD COLUMN IF NOT EXISTS sexe_responsable_niveau_csc VARCHAR(1)`);
    await pool.query(`ALTER TABLE parametres_ecole ADD COLUMN IF NOT EXISTS sexe_responsable_niveau_cfr VARCHAR(1)`);
    await pool.query(`ALTER TABLE parametres_ecole ADD COLUMN IF NOT EXISTS sexe_responsable_niveau_epl VARCHAR(1)`);
    await pool.query(`ALTER TABLE parametres_ecole ADD COLUMN IF NOT EXISTS horaires JSONB DEFAULT '{}'::jsonb`);
    await pool.query(`ALTER TABLE parametres_ecole ADD COLUMN IF NOT EXISTS date_debut_annee DATE`);

    // Table configuration email (admin)
    await pool.query(`
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
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE parametres_mail ADD COLUMN IF NOT EXISTS smtp_active BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE parametres_mail ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255)`);
    await pool.query(`ALTER TABLE parametres_mail ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587`);
    await pool.query(`ALTER TABLE parametres_mail ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE parametres_mail ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255)`);
    await pool.query(`ALTER TABLE parametres_mail ADD COLUMN IF NOT EXISTS smtp_app_password TEXT`);
    await pool.query(`ALTER TABLE parametres_mail ADD COLUMN IF NOT EXISTS smtp_from_name VARCHAR(255)`);
    await pool.query(`ALTER TABLE parametres_mail ADD COLUMN IF NOT EXISTS smtp_from_email VARCHAR(255)`);
    await pool.query(`ALTER TABLE parametres_mail ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
    await pool.query(`ALTER TABLE parametres_mail ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);

    // Table présences v2 (par période)
    await pool.query(`
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
      )
    `);

    // Élèves: nom/prenom directs (pour élèves sans compte utilisateur, ex: import LORA)
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS nom VARCHAR(200)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS prenom VARCHAR(200)`);

    // Élèves: date de début des cours
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS date_debut_cours DATE`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS categorie VARCHAR(20)`);

    // Élèves: photo et champs OASI
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS photo TEXT`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_prog_nom VARCHAR(200)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_prog_encadrant VARCHAR(200)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_n INTEGER`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_ref INTEGER`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_pos INTEGER`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_nom VARCHAR(200)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_nais VARCHAR(100)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_nationalite VARCHAR(100)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_presence_date DATE`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_jour_semaine VARCHAR(50)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_presence_periode VARCHAR(100)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_presence_type VARCHAR(100)`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_remarque TEXT`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_controle_du DATE`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_controle_au DATE`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_prog_presences TEXT`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_prog_admin TEXT`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_as TEXT`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_prg_id INTEGER`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_prg_occupation_id INTEGER`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_ra_id INTEGER`);
    await pool.query(`ALTER TABLE eleves ADD COLUMN IF NOT EXISTS oasi_temps_reparti_id INTEGER`);

    // Sorties scolaires
    await pool.query(`
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
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE sorties_scolaires ADD COLUMN IF NOT EXISTS classe1 VARCHAR(100)`);
    await pool.query(`ALTER TABLE sorties_scolaires ADD COLUMN IF NOT EXISTS classe2 VARCHAR(100)`);
    await pool.query(`ALTER TABLE sorties_scolaires ADD COLUMN IF NOT EXISTS approuve BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE sorties_scolaires ADD COLUMN IF NOT EXISTS classes_ids TEXT`);
    await pool.query(`ALTER TABLE sorties_scolaires ADD COLUMN IF NOT EXISTS classes_noms TEXT`);

    // Bulletin critères (comportement / compétences transversales) par élève et classe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bulletin_criteres (
        id SERIAL PRIMARY KEY,
        classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
        eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE,
        c1 VARCHAR(10), c2 VARCHAR(10), c3 VARCHAR(10), c4 VARCHAR(10), c5 VARCHAR(10),
        c6 VARCHAR(10), c7 VARCHAR(10), c8 VARCHAR(10), c9 VARCHAR(10), c10 VARCHAR(10),
        remarques TEXT,
        valide BOOLEAN DEFAULT false,
        UNIQUE(classe_id, eleve_id)
      )
    `);

    // Matériel scolaire / fournitures (comptabilité)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS materiels (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        section VARCHAR(30) NOT NULL DEFAULT 'scolaire',
        prix DECIMAL(10,2) NOT NULL DEFAULT 0,
        ref VARCHAR(100),
        fournisseur VARCHAR(200),
        rabais DECIMAL(5,2) DEFAULT 0,
        remarques TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE materiels ADD COLUMN IF NOT EXISTS section VARCHAR(30) NOT NULL DEFAULT 'scolaire'`);
    await pool.query(`ALTER TABLE materiels ADD COLUMN IF NOT EXISTS ref VARCHAR(100)`);
    await pool.query(`ALTER TABLE materiels ADD COLUMN IF NOT EXISTS fournisseur VARCHAR(200)`);
    await pool.query(`ALTER TABLE materiels ADD COLUMN IF NOT EXISTS rabais DECIMAL(5,2) DEFAULT 0`);
    await pool.query(`ALTER TABLE materiels ADD COLUMN IF NOT EXISTS remarques TEXT`);
    await pool.query(`ALTER TABLE materiels ADD COLUMN IF NOT EXISTS icone VARCHAR(50)`);
    const nbMateriels = await pool.query('SELECT COUNT(*)::int as nb FROM materiels');
    if ((nbMateriels.rows[0]?.nb || 0) === 0) {
      const seed = [
        ['Manifestations', 'scolaire', 20.00], ['Photocopies / feuilles', 'scolaire', 47.00], ["Matériel d'enseignement", 'scolaire', 15.00],
        ['ACM / Sports', 'scolaire', 22.20], ['Déplacement', 'scolaire', 35.00], ['Classeur 7 cm', 'scolaire', 2.80],
        ['Classeur 4 cm', 'scolaire', 2.00], ['Cahier A4', 'scolaire', 1.90], ['Feuilles de dessin', 'scolaire', 10.00],
        ['Agenda', 'fournitures', 12.00], ['Jeux de répertoires', 'fournitures', 1.60], ['Fixpencil pour mines HB', 'fournitures', 6.00],
        ['Boîte de mines (HB)', 'fournitures', 1.80], ['Gomme', 'fournitures', 1.40], ['Crayons de couleur', 'fournitures', 6.90],
        ['Plume pilot + 3 cartouches', 'fournitures', 14.80]
      ];
      for (const s of seed) {
        await pool.query('INSERT INTO materiels (nom, section, prix) VALUES ($1,$2,$3)', s);
      }
    }

    // Tables données de référence (niveaux, lieux de travail, salles)
    await pool.query(`CREATE TABLE IF NOT EXISTS niveaux (id SERIAL PRIMARY KEY, nom VARCHAR(50) NOT NULL UNIQUE, ordre INTEGER DEFAULT 0)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS lieux_travail (id SERIAL PRIMARY KEY, nom VARCHAR(100) NOT NULL UNIQUE, ordre INTEGER DEFAULT 0)`);
    await pool.query(`ALTER TABLE lieux_travail ADD COLUMN IF NOT EXISTS ordre INTEGER DEFAULT 0`);
    await pool.query(`CREATE TABLE IF NOT EXISTS salles (id SERIAL PRIMARY KEY, nom VARCHAR(100) NOT NULL, lieu_travail_id INTEGER REFERENCES lieux_travail(id) ON DELETE CASCADE)`);
    // Seed niveaux si vide
    const nbNiv = await pool.query('SELECT COUNT(*)::int as nb FROM niveaux');
    if ((nbNiv.rows[0]?.nb || 0) === 0) {
      for (const [nom, ordre] of [['CSC',1],['CFR',2],['EPL',3],['CPR',4]]) {
        await pool.query('INSERT INTO niveaux (nom, ordre) VALUES ($1,$2) ON CONFLICT (nom) DO NOTHING', [nom, ordre]);
      }
    }
    // Seed lieux_travail si vide
    const nbLieux = await pool.query('SELECT COUNT(*)::int as nb FROM lieux_travail');
    if ((nbLieux.rows[0]?.nb || 0) === 0) {
      for (const nom of ['BOTZA','SYNECOM','CREUSET']) {
        const r = await pool.query('INSERT INTO lieux_travail (nom) VALUES ($1) ON CONFLICT (nom) DO NOTHING RETURNING id', [nom]);
        const id = r.rows[0]?.id;
        if (id) {
          const sallesParLieu = { BOTZA: ['Salle 1','Salle 2','Salle 3','Salle 4'], SYNECOM: ['Salle 11','Salle 12','Salle 13','Salle 21','Salle 22','Salle 23','Salle 24','Salle 25','Salle 26'], CREUSET: ['Salle 1','Salle 2','Salle 3'] };
          for (const salle of (sallesParLieu[nom] || [])) {
            await pool.query('INSERT INTO salles (nom, lieu_travail_id) VALUES ($1,$2)', [salle, id]);
          }
        }
      }
    }

    // Tables Enclassement
    await pool.query(`
      CREATE TABLE IF NOT EXISTS enclassements (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(200),
        session_tcf VARCHAR(50) NOT NULL DEFAULT 'Test d''août',
        created_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER REFERENCES utilisateurs(id),
        statut VARCHAR(20) CHECK (statut IN ('brouillon','validé','archivé')) DEFAULT 'brouillon',
        parametres JSONB NOT NULL DEFAULT '{}'
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS classes_enclassement (
        id SERIAL PRIMARY KEY,
        enclassement_id INTEGER NOT NULL REFERENCES enclassements(id) ON DELETE CASCADE,
        structure VARCHAR(10) CHECK (structure IN ('CSC','CFR')) NOT NULL,
        nom VARCHAR(50) NOT NULL,
        capacite_max INTEGER NOT NULL DEFAULT 12
      )
    `);
    await pool.query(`
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
      )
    `);

    // Table calendrier
    await pool.query(`
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
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Table absences
    await pool.query(`
      CREATE TABLE IF NOT EXISTS absences (
        id SERIAL PRIMARY KEY,
        eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE,
        date DATE,
        statut VARCHAR(20) DEFAULT 'absent',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Table devoirs (suivi des devoirs par classe)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS devoirs (
        id SERIAL PRIMARY KEY,
        classe_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
        titre VARCHAR(200) NOT NULL,
        matiere VARCHAR(100),
        date_devoir DATE,
        date_remise DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS suivi_devoirs (
        id SERIAL PRIMARY KEY,
        devoir_id INTEGER REFERENCES devoirs(id) ON DELETE CASCADE,
        eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE,
        statut VARCHAR(20) DEFAULT 'non_rendu' CHECK (statut IN ('rendu','non_rendu','partiel','excuse')),
        commentaire TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(devoir_id, eleve_id)
      )
    `);

    // Table validations factures (une validation par élève par année scolaire)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS factures_validations (
        id SERIAL PRIMARY KEY,
        eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE,
        annee_scolaire VARCHAR(20) NOT NULL,
        valide BOOLEAN DEFAULT false,
        valide_at TIMESTAMP,
        UNIQUE(eleve_id, annee_scolaire)
      )
    `);

    // Table références factures (une référence QR par élève par année scolaire)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS factures_references (
        id SERIAL PRIMARY KEY,
        eleve_id INTEGER REFERENCES eleves(id) ON DELETE CASCADE,
        annee_scolaire VARCHAR(20) NOT NULL,
        reference VARCHAR(35) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(eleve_id, annee_scolaire)
      )
    `);

    // Table visites de classes
    await pool.query(`
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
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Colonne permissions (utilisée par le middleware auth)
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb`);

    console.log('✅ Toutes les tables créées avec succès !');
  } catch (err) {
    console.error('Erreur création tables:', err);
  }
};

module.exports = initDB;