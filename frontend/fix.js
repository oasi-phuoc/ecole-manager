const fs = require('fs');

// Ajouter Century Gothic dans index.css
fs.writeFileSync('./src/index.css', `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Century Gothic', CenturyGothic, 'Apple Gothic', AppleGothic, 'URW Gothic L', Futura, 'Trebuchet MS', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #f8fafc;
  color: #1e293b;
}

input, select, textarea, button {
  font-family: 'Century Gothic', CenturyGothic, 'Apple Gothic', AppleGothic, 'URW Gothic L', Futura, 'Trebuchet MS', sans-serif;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #f1f5f9;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 99px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
`.trim());

// Mettre à jour theme.js avec Century Gothic
let t = fs.readFileSync('./src/styles/theme.js', 'utf8');
t = t.replace(
  /fontFamily: '[^']+'/g,
  `fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif"`
);
fs.writeFileSync('./src/styles/theme.js', t);

// Mettre à jour Dashboard.js avec Century Gothic
let d = fs.readFileSync('./src/pages/Dashboard.js', 'utf8');
d = d.replace(
  /fontFamily: '[^']+'/g,
  `fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif"`
);
fs.writeFileSync('./src/pages/Dashboard.js', d);

// Mettre à jour Professeurs.js
let p = fs.readFileSync('./src/pages/Professeurs.js', 'utf8');
p = p.replace(
  /fontFamily: '[^']+'/g,
  `fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif"`
);
fs.writeFileSync('./src/pages/Professeurs.js', p);

console.log('Century Gothic appliqué partout !');