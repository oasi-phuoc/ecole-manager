const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Presences.js');
let code = fs.readFileSync(filePath, 'utf8');

// Remplacer la logique période dans l'export
code = code.replace(
  `          // Première période saisie
          let statutBrut = '';
          let presencePeriode = periodeDef; // horaire classe par défaut
          if (pr) {
            for (let i = 1; i <= 8; i++) {
              if (pr['p' + i]) {
                statutBrut = pr['p' + i];
                presencePeriode = i <= 4 ? 'Matin' : 'Après-midi';
                break;
              }
            }
          }
          // Si toujours pas de période, déduire depuis l'horaire classe
          if (!presencePeriode && horaireJour) presencePeriode = horaireJour.periode;`,
  `          // Statut : première période non vide
          let statutBrut = '';
          if (pr) {
            for (let i = 1; i <= 8; i++) {
              if (pr['p' + i]) { statutBrut = pr['p' + i]; break; }
            }
          }
          // PRESENCE_PERIODE : toujours depuis l'affectation EmploiDuTemps
          const presencePeriode = horaireJour?.periode || '';`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ PRESENCE_PERIODE : toujours depuis affectation EmploiDuTemps');