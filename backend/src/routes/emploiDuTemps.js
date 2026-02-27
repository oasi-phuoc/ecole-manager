const express = require('express');
const router = express.Router();
const c = require('../controllers/emploiDuTempsController');
const { verifierToken, autoriser } = require('../middleware/auth');

router.use(verifierToken);

router.get('/matieres', c.getMatieres);
router.post('/matieres', autoriser('admin'), c.creerMatiere);

router.get('/', c.getEmploiDuTemps);
router.post('/', autoriser('admin'), c.creerCours);
router.put('/:id', autoriser('admin'), c.modifierCours);
router.delete('/:id', autoriser('admin'), c.supprimerCours);

module.exports = router;