const fs = require('fs');
const content = fs.readFileSync('./src/routes/auth.js', 'utf8');
console.log(content);