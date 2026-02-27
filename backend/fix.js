const fs = require('fs');
let c = fs.readFileSync('./src/controllers/planningController.js', 'utf8');

// Fix getPlanningClasse - ajouter a.id, a.prof_id, a.matiere_id dans le SELECT
c = c.replace(
  `SELECT a.creneau_id, u.nom||' '||u.prenom as prof_nom, m.nom as matiere_nom
    FROM affectations a
    JOIN utilisateurs u ON u.id=a.prof_id
    LEFT JOIN matieres m ON m.id=a.matiere_id
    WHERE a.classe_id=$1`,
  `SELECT a.id, a.creneau_id, a.prof_id, a.matiere_id, u.nom||' '||u.prenom as prof_nom, m.nom as matiere_nom
    FROM affectations a
    JOIN utilisateurs u ON u.id=a.prof_id
    LEFT JOIN matieres m ON m.id=a.matiere_id
    WHERE a.classe_id=$1`
);

fs.writeFileSync('./src/controllers/planningController.js', c);
console.log('OK !');

// Vérifier
const content = fs.readFileSync('./src/controllers/planningController.js', 'utf8');
const idx = content.indexOf('getPlanningClasse');
console.log(content.substring(idx, idx+400));