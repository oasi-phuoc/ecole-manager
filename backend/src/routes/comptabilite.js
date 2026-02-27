const express = require('express');
const router = express.Router();
const c = require('../controllers/comptabiliteController');
const { verifierToken, autoriser } = require('../middleware/auth');

router.use(verifierToken);
router.get('/statistiques', c.getStatistiques);
router.get('/', c.getPaiements);
router.post('/', autoriser('admin'), c.creerPaiement);
router.put('/:id', autoriser('admin'), c.modifierPaiement);
router.delete('/:id', autoriser('admin'), c.supprimerPaiement);

module.exports = router;