const express = require('express');
const router = express.Router();
const c = require('../controllers/presencesController');
const { verifierToken } = require('../middleware/auth');

router.use(verifierToken);
router.get('/', c.getPresences);
router.get('/eleves', c.getElevesClasse);
router.get('/statistiques', c.getStatistiques);
router.post('/', c.enregistrerPresences);

module.exports = router;