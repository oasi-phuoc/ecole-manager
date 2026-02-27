const fs = require('fs');

// Créer vercel.json dans le dossier frontend
fs.writeFileSync('./vercel.json', `
{
  "buildCommand": "DISABLE_ESLINT_PLUGIN=true npm run build",
  "outputDirectory": "build"
}
`.trim());

// Mettre à jour .env
fs.writeFileSync('./.env', `DISABLE_ESLINT_PLUGIN=true\nGENERATE_SOURCEMAP=false`);

console.log('OK !');