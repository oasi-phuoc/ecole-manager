const express = require('express');
const router = express.Router();
const c = require('../controllers/elevesController');
const { verifierToken, autoriser } = require('../middleware/auth');

router.use(verifierToken);
router.get('/', c.getEleves);
router.get('/:id', c.getEleve);
router.post('/', autoriser('admin'), c.creerEleve);
router.put('/:id', autoriser('admin'), c.modifierEleve);
router.delete('/:id', autoriser('admin'), c.supprimerEleve);

router.put('/:id/photo', require('../controllers/elevesController').updatePhoto);
router.put('/:id/classe', async (req, res) => {
  const pool = require('../config/database');
  const { classe_id } = req.body;
  try {
    await pool.query('UPDATE eleves SET classe_id=$1 WHERE id=$2', [classe_id||null, req.params.id]);
    res.json({ message: 'Classe mise à jour' });
  } catch(err) { res.status(500).json({ message: err.message }); }
});
module.exports = router;
