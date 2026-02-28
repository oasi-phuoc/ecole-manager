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
module.exports = router;
