const fs = require('fs');
let c = fs.readFileSync('./src/pages/Classes.js', 'utf8');

// Centrer Non/Oui dans le tableau PDF
c = c.replace(
  `<th>Date</th><th>Titre</th><th>Remarque</th><th>Mesure prise</th><th>Auteur</th><th>Intervention</th><th>Entretien</th>`,
  `<th>Date</th><th>Titre</th><th>Remarque</th><th>Mesure prise</th><th>Auteur</th><th style="text-align:center">Intervention</th><th style="text-align:center">Entretien</th>`
);

fs.writeFileSync('./src/pages/Classes.js', c);
console.log('OK !');