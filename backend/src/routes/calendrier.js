const express = require('express');
const router = express.Router();
const c = require('../controllers/calendrierController');
const { verifierToken } = require('../middleware/auth');

router.use(verifierToken);
router.get('/', c.getEvenements);
router.post('/', c.creerEvenement);
router.put('/:id', c.modifierEvenement);
router.delete('/:id', c.supprimerEvenement);
router.get('/prof', c.getCalendrierProf);
router.post('/prof', c.postCalendrierProf);
router.delete('/prof/:id', c.deleteCalendrierProf);

module.exports = router;