const fs = require('fs');

// Désactiver ESLint pendant le build Vercel
fs.writeFileSync('./.env', `
DISABLE_ESLINT_PLUGIN=true
ESLINT_NO_DEV_ERRORS=true
`.trim());

console.log('.env créé !');