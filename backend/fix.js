const fs = require('fs');
let c = fs.readFileSync('./src/controllers/planningController.js', 'utf8');

// Fix getPlanningGeneral - ajouter titulaires des classes
c = c.replace(
  `const affectations = await pool.query('SELECT a.prof_id,a.creneau_id,c.nom as classe_nom,m.nom as matiere_nom FROM affectations a JOIN classes c ON c.id=a.classe_id LEFT JOIN matieres m ON m.id=a.matiere_id');
  const dispos = await pool.query('SELECT prof_id,creneau_id,disponible FROM disponibilites');
  res.json({ profs:profs.rows, creneaux:creneaux.rows, affectations:affectations.rows, dispos:dispos.rows });`,
  `const affectations = await pool.query('SELECT a.prof_id,a.creneau_id,c.nom as classe_nom,m.nom as matiere_nom FROM affectations a JOIN classes c ON c.id=a.classe_id LEFT JOIN matieres m ON m.id=a.matiere_id');
  const dispos = await pool.query('SELECT prof_id,creneau_id,disponible FROM disponibilites');
  const titulaires = await pool.query(\`SELECT c.id as classe_id, c.nom as classe_nom, u.nom||' '||u.prenom as prof_nom FROM classes c LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id\`);
  res.json({ profs:profs.rows, creneaux:creneaux.rows, affectations:affectations.rows, dispos:dispos.rows, titulaires:titulaires.rows });`
);

// Fix getPlanningClasse - ajouter titulaire
c = c.replace(
  `const classe = await pool.query('SELECT id,nom FROM classes WHERE id=$1', [classe_id]);`,
  `const classe = await pool.query(\`SELECT c.id, c.nom, u.nom||' '||u.prenom as titulaire_nom FROM classes c LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id WHERE c.id=$1\`, [classe_id]);`
);

// Fix getPlanningProf - ajouter classe titulaire
c = c.replace(
  `const prof = await pool.query('SELECT id,nom,prenom FROM utilisateurs WHERE id=$1', [prof_id]);`,
  `const prof = await pool.query('SELECT id,nom,prenom FROM utilisateurs WHERE id=$1', [prof_id]);
  const classesTitulaire = await pool.query('SELECT nom FROM classes WHERE prof_principal_id=$1', [prof_id]);`
);
c = c.replace(
  `res.json({ prof:prof.rows[0], creneaux:creneaux.rows, affectations:affectations.rows, dispos:dispos.rows });`,
  `res.json({ prof:prof.rows[0], creneaux:creneaux.rows, affectations:affectations.rows, dispos:dispos.rows, classesTitulaire:classesTitulaire.rows });`
);

fs.writeFileSync('./src/controllers/planningController.js', c);
console.log('Backend OK !');