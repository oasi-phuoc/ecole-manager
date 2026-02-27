const express = require('express');
const router = express.Router();
const c = require('../controllers/calendrierController');
const { verifierToken } = require('../middleware/auth');

router.use(verifierToken);
router.get('/', c.getEvenements);
router.post('/', c.creerEvenement);
router.put('/:id', c.modifierEvenement);
router.delete('/:id', c.supprimerEvenement);

module.exports = router;