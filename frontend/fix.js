const fs = require('fs');
let c = fs.readFileSync('./src/controllers/profsController.js', 'utf8');
console.log(c);