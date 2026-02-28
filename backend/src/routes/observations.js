const express = require('express');
const router = express.Router();
const { verifierToken } = require('../middleware/auth');
const { getObservations, creerObservation, supprimerObservation } = require('../controllers/observationsController');

router.use(verifierToken);
router.get('/eleve/:eleve_id', getObservations);
router.post('/eleve/:eleve_id', creerObservation);
router.delete('/:id', supprimerObservation);

module.exports = router;