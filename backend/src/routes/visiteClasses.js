const express = require('express');
const router = express.Router();
const { verifierToken } = require('../middleware/auth');
const { getVisites, creerVisite, modifierVisite, supprimerVisite } = require('../controllers/visiteClassesController');

router.use(verifierToken);
router.get('/', getVisites);
router.post('/', creerVisite);
router.put('/:id', modifierVisite);
router.delete('/:id', supprimerVisite);

module.exports = router;
