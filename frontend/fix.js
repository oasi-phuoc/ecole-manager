const fs = require('fs');
const path = require('path');

const API_URL = 'https://ecole-manager-backend.onrender.com';

function remplacerDansPages(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) remplacerDansPages(full);
    else if (f.endsWith('.js')) {
      let content = fs.readFileSync(full, 'utf8');
      if (content.includes('http://localhost:5000')) {
        content = content.replace(/http:\/\/localhost:5000/g, API_URL);
        fs.writeFileSync(full, content);
        console.log('Mis a jour:', f);
      }
    }
  });
}

remplacerDansPages('./src');
console.log('Toutes les URLs mises a jour !');