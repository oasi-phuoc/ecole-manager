const fs = require('fs');

fs.writeFileSync('./vercel.json', `
{
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "build",
  "installCommand": "npm install"
}
`.trim());

console.log('vercel.json mis a jour !');