const fs = require('fs');
let c = fs.readFileSync('./src/pages/Classes.js', 'utf8');

c = c.split('Archive').join('Inactif');

fs.writeFileSync('./src/pages/Classes.js', c);

// Vérif
const reste = fs.readFileSync('./src/pages/Classes.js', 'utf8');
console.log('Restes archiv:', reste.match(/[Aa]rchiv\w*/g));
console.log('OK !');