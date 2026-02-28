const fs = require('fs');
let d = fs.readFileSync('./src/pages/Dashboard.js', 'utf8');

// Fix: lire 'utilisateur' au lieu de 'user'
d = d.replace(
  "const u = localStorage.getItem('user');",
  "const u = localStorage.getItem('utilisateur');"
);

fs.writeFileSync('./src/pages/Dashboard.js', d);
console.log('OK:', d.includes("getItem('utilisateur')"));