const fs = require('fs');
let c = fs.readFileSync('./src/pages/Calendrier.js', 'utf8');

c = c.replace(
  `const COULEURS_VACANCES = {
  "Vacances d'automne":'#f59e0b',"La Toussaint":'#f59e0b',
  "Immaculée Conception":'#6366f1',"Vacances de Noël":'#ef4444',
  "Vacances d'hiver":'#3b82f6',"St-Joseph":'#6366f1',
  "Vacances de Pâques":'#10b981',"Fête du travail":'#6366f1',
  "Ascension":'#6366f1',"Pentecôte":'#6366f1',"Fête-Dieu":'#6366f1'
};`,
  `const COULEURS_VACANCES = '#f59e0b';`
);

c = c.replace(
  `couleur: COULEURS_VACANCES[formVacance.nom_vacance]||'#f59e0b'`,
  `couleur: '#f59e0b'`
);

fs.writeFileSync('./src/pages/Calendrier.js', c);
console.log('OK !');