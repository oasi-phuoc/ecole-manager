const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, 'src', 'routes', 'eleves.js');

// Réécrire le fichier entier avec le bon ordre et le bon import
fs.writeFileSync(routesPath, `const express = require('express');
const router = express.Router();
const c = require('../controllers/elevesController');
const { verifierToken, autoriser } = require('../middleware/auth');
router.use(verifierToken);
router.get('/', c.getEleves);
router.get('/oasi', c.getElevesOASI);
router.get('/:id', c.getEleve);
router.post('/', autoriser('admin'), c.creerEleve);
router.put('/:id', autoriser('admin'), c.modifierEleve);
router.delete('/:id', autoriser('admin'), c.supprimerEleve);
router.put('/:id/photo', c.updatePhoto);
router.put('/:id/classe', async (req, res) => {
  const pool = require('../config/database');
  const { classe_id } = req.body;
  try {
    await pool.query('UPDATE eleves SET classe_id=$1 WHERE id=$2', [classe_id||null, req.params.id]);
    res.json({ message: 'Classe mise à jour' });
  } catch(err) { res.status(500).json({ message: err.message }); }
});
module.exports = router;
`);
console.log('✅ eleves.js corrigé : /oasi avant /:id + import correct');