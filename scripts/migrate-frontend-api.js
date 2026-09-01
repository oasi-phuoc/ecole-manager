/**
 * Remplace axios + API onrender par apiClient (migration Supabase).
 * Usage: node scripts/migrate-frontend-api.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'frontend', 'src');
const files = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.js')) files.push(p);
  }
}

walk(root);

const API_LINE =
  "const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';";

for (const file of files) {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('onrender') && !c.includes('axios.get') && !c.includes('axios.post')) continue;
  if (file.endsWith('Login.js') || file.endsWith('apiClient.js')) continue;

  const relToLib = path
    .relative(path.dirname(file), path.join(root, 'lib', 'apiClient'))
    .replace(/\\/g, '/');
  const importLine = `import apiClient from '${relToLib.startsWith('.') ? relToLib : './' + relToLib}';`;

  c = c.replace(/\r?\nconst API = process\.env\.REACT_APP_API_URL \|\| 'https:\/\/ecole-manager-backend\.onrender\.com\/api';\r?\n/g, '\n');
  c = c.replace(/import axios from 'axios';\r?\n/g, `${importLine}\n`);
  c = c.replace(/axios\./g, 'apiClient.');
  c = c.replace(/API \+ /g, '');
  c = c.replace(/API\+/g, '');
  fs.writeFileSync(file, c);
  console.log('Updated', path.relative(root, file));
}
