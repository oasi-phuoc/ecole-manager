const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src', 'controllers', 'classesController.js');
let ctrl = fs.readFileSync(controllerPath, 'utf8');

ctrl = ctrl.replace(
  `  if (!nom) return res.status(400).json({ message: 'Le nom est requis' });
  if (!annee_scolaire) return res.status(400).json({ message: "L'année scolaire est requise" });`,
  `  if (!nom) return res.status(400).json({ message: 'Le nom est requis' });
  if (!niveau) return res.status(400).json({ message: 'Le niveau est requis' });`
);

fs.writeFileSync(controllerPath, ctrl, 'utf8');
console.log('✅ Backend : niveau obligatoire, annee_scolaire optionnel');