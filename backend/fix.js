const fs = require('fs');
let ctrl = fs.readFileSync('./src/controllers/profsController.js', 'utf8');

// Fix modifierProf - avec mot de passe
ctrl = ctrl.replace(
  `const { nom, prenom, email, actif, mot_de_passe, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis } = req.body;`,
  `const { nom, prenom, email, actif, mot_de_passe, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites } = req.body;`
);

ctrl = ctrl.replace(
  `UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, mot_de_passe=$5, telephone=$6, specialite=$7, adresse=$8, npa=$9, lieu=$10, sexe=$11, taux_activite=$12, periodes_semaine=$13, date_naissance=$14, avs=$15, type_contrat=$16, type_permis=$17 \nWHERE id=$18 AND role='prof' RETURNING id`,
  `UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, mot_de_passe=$5, telephone=$6, specialite=$7, adresse=$8, npa=$9, lieu=$10, sexe=$11, taux_activite=$12, periodes_semaine=$13, date_naissance=$14, avs=$15, type_contrat=$16, type_permis=$17, niveau_prefere=$18, branches_specialites=$19 WHERE id=$20 AND role='prof' RETURNING id`
);

ctrl = ctrl.replace(
  `params = [nom, prenom, email, actif!==undefined?actif:true, hash, telephone||null, specialite||null, adresse||null, npa||null, lieu||null, sexe||null, (taux_activite ? parseInt(taux_activite) : null), (periodes_semaine ? parseInt(periodes_semaine) : null), (date_naissance && date_naissance !== '' ? date_naissance : null), avs||null, type_contrat||null, type_permis||null, req.params.id];`,
  `params = [nom, prenom, email, actif!==undefined?actif:true, hash, telephone||null, specialite||null, adresse||null, npa||null, lieu||null, sexe||null, (taux_activite ? parseInt(taux_activite) : null), (periodes_semaine ? parseInt(periodes_semaine) : null), (date_naissance && date_naissance !== '' ? date_naissance : null), avs||null, type_contrat||null, type_permis||null, niveau_prefere||null, branches_specialites||null, req.params.id];`
);

ctrl = ctrl.replace(
  `UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, telephone=$5, specialite=$6, adresse=$7, npa=$8, lieu=$9, sexe=$10, taux_activite=$11, periodes_semaine=$12, date_naissance=$13, avs=$14, type_contrat=$15, type_permis=$16 WHERE id=$17 AND role='prof' RETURNING id`,
  `UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, telephone=$5, specialite=$6, adresse=$7, npa=$8, lieu=$9, sexe=$10, taux_activite=$11, periodes_semaine=$12, date_naissance=$13, avs=$14, type_contrat=$15, type_permis=$16, niveau_prefere=$17, branches_specialites=$18 WHERE id=$19 AND role='prof' RETURNING id`
);

// Fix params sans mot de passe - trouver la fin
const idx = ctrl.indexOf("adress\ncreerProf OK !");
const paramsNoPass = ctrl.indexOf("params = [nom, prenom, email, actif!==undefined?actif:true, telephone||null, specialite||null, adress");
if (paramsNoPass > 0) {
  const endParams = ctrl.indexOf(', req.params.id]', paramsNoPass) + ', req.params.id]'.length;
  const oldParams = ctrl.substring(paramsNoPass, endParams);
  const newParams = oldParams.replace(', req.params.id]', ', niveau_prefere||null, branches_specialites||null, req.params.id]');
  ctrl = ctrl.substring(0, paramsNoPass) + newParams + ctrl.substring(endParams);
}

fs.writeFileSync('./src/controllers/profsController.js', ctrl);
console.log('modifierProf OK !');