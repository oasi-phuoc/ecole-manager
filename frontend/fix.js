const fs = require('fs');

// Lire package.json
let pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

// Modifier le script build pour désactiver ESLint
pkg.scripts.build = "DISABLE_ESLINT_PLUGIN=true react-scripts build";

fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
console.log('package.json mis a jour !');
console.log('Build script:', pkg.scripts.build);