const express = require('express');
const router = express.Router();
const c = require('../controllers/profsController');
const { verifierToken, autoriser } = require('../middleware/auth');

router.use(verifierToken);
router.get('/', c.getProfs);
router.get('/:id', c.getProf);
router.post('/', autoriser('admin'), c.creerProf);
router.put('/:id', autoriser('admin'), c.modifierProf);
router.delete('/:id', autoriser('admin'), c.supprimerProf);

module.exports = router;