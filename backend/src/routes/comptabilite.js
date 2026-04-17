const express = require('express');
const router = express.Router();
const c = require('../controllers/comptabiliteController');
const { verifierToken, autoriser } = require('../middleware/auth');

router.use(verifierToken);
router.get('/statistiques', c.getStatistiques);
router.get('/factures/reference', c.getFactureRef);
router.post('/factures/reference', autoriser('admin'), c.getOrCreateFactureRef);
router.get('/factures/validation', c.getFacturesValidations);
router.post('/factures/validation', autoriser('admin'), c.toggleFactureValidation);
router.get('/materiels', c.getMateriels);
router.post('/materiels', autoriser('admin'), c.creerMateriel);
router.put('/materiels/:id', autoriser('admin'), c.modifierMateriel);
router.delete('/materiels/:id', autoriser('admin'), c.supprimerMateriel);
router.get('/commandes', c.getCommandes);
router.post('/commandes', autoriser('admin'), c.creerCommande);
router.put('/commandes/:id', autoriser('admin'), c.modifierCommande);
router.delete('/commandes/:id', autoriser('admin'), c.supprimerCommande);
router.get('/', c.getPaiements);
router.post('/', autoriser('admin'), c.creerPaiement);
router.put('/:id', autoriser('admin'), c.modifierPaiement);
router.delete('/:id', autoriser('admin'), c.supprimerPaiement);

module.exports = router;