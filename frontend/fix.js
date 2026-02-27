const fs = require('fs');

fs.writeFileSync('C:\\Users\\Phuoc\\ecole-manager\\.gitignore', `
node_modules
.env
build
dist
.DS_Store
`.trim());

console.log('.gitignore créé !');