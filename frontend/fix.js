const fs = require('fs');
let c = fs.readFileSync('./src/pages/Calendrier.js', 'utf8');

// Enlever maxHeight du bloc vacances
c = c.replace(
  `<div style={{maxHeight:300,overflowY:'auto'}}>`,
  `<div>`
);

fs.writeFileSync('./src/pages/Calendrier.js', c);
console.log('OK !');