const express = require('express');
const router = express.Router();
const { verifierToken } = require('../middleware/auth');
const { getDevoirs, creerDevoir, supprimerDevoir, getSuivi, majStatut } = require('../controllers/devoirsController');

router.use(verifierToken);
router.get('/', getDevoirs);
router.post('/', creerDevoir);
router.delete('/:id', supprimerDevoir);
router.get('/:id/suivi', getSuivi);
router.put('/:id/suivi/:eleve_id', majStatut);

module.exports = router;
