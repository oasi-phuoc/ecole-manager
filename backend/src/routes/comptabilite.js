const express = require('express');
const router = express.Router();
const c = require('../controllers/comptabiliteController');
const { verifierToken, autoriser } = require('../middleware/auth');

router.use(verifierToken);
router.get('/statistiques', c.getStatistiques);
router.post('/factures/reference', autoriser('admin'), c.getOrCreateFactureRef);
router.get('/factures/validation', c.getFacturesValidations);
router.post('/factures/validation', autoriser('admin'), c.toggleFactureValidation);
router.get('/materiels', c.getMateriels);
router.post('/materiels', autoriser('admin'), c.creerMateriel);
router.put('/materiels/:id', autoriser('admin'), c.modifierMateriel);
router.delete('/materiels/:id', autoriser('admin'), c.supprimerMateriel);
router.get('/', c.getPaiements);
router.post('/', autoriser('admin'), c.creerPaiement);
router.put('/:id', autoriser('admin'), c.modifierPaiement);
router.delete('/:id', autoriser('admin'), c.supprimerPaiement);

module.exports = router;