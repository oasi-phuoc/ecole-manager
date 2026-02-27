const fs = require('fs');

// Supprimer vercel.json
if (fs.existsSync('./vercel.json')) {
  fs.unlinkSync('./vercel.json');
  console.log('vercel.json supprimé !');
}

console.log('OK !');