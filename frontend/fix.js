const fs = require('fs');
let b = fs.readFileSync('./src/pages/Branches.js', 'utf8');
b = b.replace(
  `const NIVEAUX = ['CSC','CFR','EPL','CFC','ECG','Gym','Autre'];`,
  `const NIVEAUX = ['CSC','CFR','EPL'];`
);
fs.writeFileSync('./src/pages/Branches.js', b);
console.log('OK !');