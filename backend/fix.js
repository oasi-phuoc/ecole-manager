const fs = require('fs');

fs.writeFileSync('./src/routes/import.js', `const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifierToken } = require('../middleware/auth');
const { importEleves } = require('../controllers/importController');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
router.use(verifierToken);
router.post('/eleves', upload.single('fichier'), importEleves);
module.exports = router;`);
console.log('Route import.js créée !');

let server = fs.readFileSync('./server.js', 'utf8');
if (!server.includes('/api/import')) {
  server = server.replace(
    "app.use('/api/plan-classe'",
    "app.use('/api/import', require('./src/routes/import'));\napp.use('/api/plan-classe'"
  );
  fs.writeFileSync('./server.js', server);
  console.log('server.js mis à jour !');
} else {
  console.log('Route déjà présente dans server.js');
}