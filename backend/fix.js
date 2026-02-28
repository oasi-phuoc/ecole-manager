const fs = require('fs');
const auth = fs.readFileSync('./src/controllers/authController.js', 'utf8');
console.log(auth);