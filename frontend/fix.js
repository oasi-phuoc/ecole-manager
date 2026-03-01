const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Presences.js');
let code = fs.readFileSync(filePath, 'utf8');

// Remplacer les 3 lignes problématiques dans exporterOASI

// 1. PROG_ENCADRANT : essayer tous les noms possibles de champ
code = code.replace(
  `            eleve.oasi_encadrant || '',`,
  `            eleve.oasi_encadrant || eleve.oasi_prog_encadrant || '',`
);

// 2. PRESENCE_PERIODE : utiliser l'horaire classe si aucune période active trouvée
code = code.replace(
  `          // Première période saisie
          let statutBrut = '';
          let presencePeriode = periodeDef;
          if (pr) {
            for (let i = 1; i <= 8; i++) {
              if (pr['p' + i]) {
                statutBrut = pr['p' + i];
                presencePeriode = i <= 4 ? 'Matin' : 'Après-midi';
                break;
              }
            }
          }`,
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
          if (!presencePeriode && horaireJour) presencePeriode = horaireJour.periode;`
);

// 3. Message d'erreur si aucune donnée exportée
code = code.replace(
  `      XLSX.utils.book_append_sheet(wb, ws, 'Présences');
      const nomClasse = classes.find(c => String(c.id) === String(classeSelectionnee))?.nom || 'classe';
      XLSX.writeFile(wb, 'presences_' + nomClasse + '_' + mois + '.xlsx');
      console.log('Export OK - ' + (rows.length - 1) + ' lignes');`,
  `      if (rows.length <= 1) {
        alert('Aucune donnée à exporter pour ce mois. Vérifiez que des présences ont été saisies et que la classe a des horaires configurés.');
        setExportLoading(false);
        return;
      }
      XLSX.utils.book_append_sheet(wb, ws, 'Présences');
      const nomClasse = classes.find(c => String(c.id) === String(classeSelectionnee))?.nom || 'classe';
      XLSX.writeFile(wb, 'presences_' + nomClasse + '_' + mois + '.xlsx');`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Fix export :');
console.log('   ✔ PROG_ENCADRANT : fallback sur les deux noms de champ');
console.log('   ✔ PRESENCE_PERIODE : horaire classe utilisé si pas de présence saisie');
console.log('   ✔ Message si aucune donnée à exporter');