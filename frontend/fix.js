const fs = require('fs');
let b = fs.readFileSync('./src/pages/Branches.js', 'utf8');

// Corriger les clés CSS cassées
b = b.replace(/cardPériodes\/sem:/g, 'cardCode:');
b = b.replace(/cardPériodes\/sem\b/g, 'cardCode');

// Corriger le placeholder cassé
b = b.replace(/placeholder="Ex: 4" type="number" min="1" max="20"/g, 'placeholder="Ex: MATH"');
b = b.replace(/placeholder="Ex: 4" type="number" min="1" max="20"/g, 'placeholder="Ex: MATH"');

// Remettre "code" là où c'était cassé dans les styles
b = b.replace(/style=\{styles\.cardCode\}/g, 'style={styles.cardCode}');

fs.writeFileSync('./src/pages/Branches.js', b);
console.log('Branches.js corrigé !');
console.log(fs.readFileSync('./src/pages/Branches.js', 'utf8').substring(0, 200));