const express = require('express');
const router = express.Router();
const c = require('../controllers/sortiesController');
const { verifierToken } = require('../middleware/auth');

router.use(verifierToken);
router.get('/', c.getSorties);
router.post('/', c.creerSortie);
router.put('/:id', c.modifierSortie);
router.delete('/:id', c.supprimerSortie);

module.exports = router;
