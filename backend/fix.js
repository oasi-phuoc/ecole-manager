const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src', 'controllers', 'profsController.js');
let ctrl = fs.readFileSync(controllerPath, 'utf8');

// 1. Ajouter les colonnes dans CHAMPS
ctrl = ctrl.replace(
  `const CHAMPS = 'id, nom, prenom, email, actif, created_at, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites';`,
  `const CHAMPS = 'id, nom, prenom, email, actif, created_at, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail';`
);

// 2. Ajouter dans creerProf - destructuring
ctrl = ctrl.replace(
  `const { nom, prenom, email, mot_de_passe, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites } = req.body;`,
  `const { nom, prenom, email, mot_de_passe, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail } = req.body;`
);

// 3. INSERT creerProf
ctrl = ctrl.replace(
  `      \`INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites)
       VALUES ($1,$2,$3,$4,'prof',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id, nom, prenom, email\``,
  `      \`INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail)
       VALUES ($1,$2,$3,$4,'prof',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id, nom, prenom, email\``
);

ctrl = ctrl.replace(
  `      [nom, prenom, email, hash, telephone||null, specialite||null, adresse||null, npa||null, lieu||null, sexe||null, (taux_activite ? parseInt(taux_activite) : null), (periodes_semaine ? parseInt(periodes_semaine) : null), (date_naissance && date_naissance !== '' ? date_naissance : null), avs||null, type_contrat||null, type_permis||null, niveau_prefere||null, branches_specialites||null]`,
  `      [nom, prenom, email, hash, telephone||null, specialite||null, adresse||null, npa||null, lieu||null, sexe||null, (taux_activite ? parseInt(taux_activite) : null), (periodes_semaine ? parseInt(periodes_semaine) : null), (date_naissance && date_naissance !== '' ? date_naissance : null), avs||null, type_contrat||null, type_permis||null, niveau_prefere||null, branches_specialites||null, lieu_travail_prefere||null, remarque_lieu_travail||null]`
);

// 4. modifierProf - destructuring
ctrl = ctrl.replace(
  `  const { nom, prenom, email, actif, mot_de_passe, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites } = req.body;`,
  `  const { nom, prenom, email, actif, mot_de_passe, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail } = req.body;`
);

// 5. UPDATE sans mdp
ctrl = ctrl.replace(
  `      query = \`UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, telephone=$5, specialite=$6, adresse=$7, npa=$8, lieu=$9, sexe=$10, taux_activite=$11, periodes_semaine=$12, date_naissance=$13, avs=$14, type_contrat=$15, type_permis=$16, niveau_prefere=$17, branches_specialites=$18 WHERE id=$19 AND role='prof' RETURNING id\`;
      params = [nom, prenom, email, actif!==undefined?actif:true, telephone||null, specialite||null, adresse||null, npa||null, lieu||null, sexe||null, (taux_activite ? parseInt(taux_activite) : null), (periodes_semaine ? parseInt(periodes_semaine) : null), (date_naissance && date_naissance !== '' ? date_naissance : null), avs||null, type_contrat||null, type_permis||null, niveau_prefere||null, branches_specialites||null, req.params.id];`,
  `      query = \`UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, telephone=$5, specialite=$6, adresse=$7, npa=$8, lieu=$9, sexe=$10, taux_activite=$11, periodes_semaine=$12, date_naissance=$13, avs=$14, type_contrat=$15, type_permis=$16, niveau_prefere=$17, branches_specialites=$18, lieu_travail_prefere=$19, remarque_lieu_travail=$20 WHERE id=$21 AND role='prof' RETURNING id\`;
      params = [nom, prenom, email, actif!==undefined?actif:true, telephone||null, specialite||null, adresse||null, npa||null, lieu||null, sexe||null, (taux_activite ? parseInt(taux_activite) : null), (periodes_semaine ? parseInt(periodes_semaine) : null), (date_naissance && date_naissance !== '' ? date_naissance : null), avs||null, type_contrat||null, type_permis||null, niveau_prefere||null, branches_specialites||null, lieu_travail_prefere||null, remarque_lieu_travail||null, req.params.id];`
);

fs.writeFileSync(controllerPath, ctrl, 'utf8');
console.log('✅ Backend profsController : lieu_travail_prefere + remarque_lieu_travail ajoutés');

// 6. Script ALTER TABLE
const migrationPath = path.join(__dirname, 'migration_lieu_travail.js');
fs.writeFileSync(migrationPath, `require('dotenv').config();
const pool = require('./src/config/database');
async function migrate() {
  try {
    await pool.query("ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS lieu_travail_prefere VARCHAR(100) DEFAULT NULL");
    await pool.query("ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS remarque_lieu_travail TEXT DEFAULT NULL");
    console.log('✅ Colonnes lieu_travail_prefere et remarque_lieu_travail ajoutées');
    process.exit(0);
  } catch(err) { console.error('❌', err.message); process.exit(1); }
}
migrate();
`);
console.log('✅ migration_lieu_travail.js créé');