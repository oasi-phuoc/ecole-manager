const fs = require('fs');
let c = fs.readFileSync('./src/controllers/profsController.js', 'utf8');

// Fix: convertir les champs vides en null correctement
c = c.replace(
  /date_naissance\|\|null/g,
  "(date_naissance && date_naissance !== '' ? date_naissance : null)"
);
c = c.replace(
  /taux_activite\|\|null/g,
  "(taux_activite ? parseInt(taux_activite) : null)"
);
c = c.replace(
  /periodes_semaine\|\|null/g,
  "(periodes_semaine ? parseInt(periodes_semaine) : null)"
);

fs.writeFileSync('./src/controllers/profsController.js', c);
console.log('OK !');