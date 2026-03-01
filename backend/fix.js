const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src', 'controllers', 'parametresController.js');
let ctrl = fs.readFileSync(controllerPath, 'utf8');

// Ne supprimer que séances, retenues et particuliers — garder vacances et évaluations
ctrl = ctrl.replace(
  `      await pool.query('DELETE FROM ' + table);`,
  `      if (table === 'calendrier') {
        await pool.query("DELETE FROM calendrier WHERE categorie NOT IN ('vacance', 'evaluation')");
      } else {
        await pool.query('DELETE FROM ' + table);
      }`
);

fs.writeFileSync(controllerPath, ctrl, 'utf8');
console.log('✅ Reset : vacances et évaluations conservées dans calendrier');