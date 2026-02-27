const express = require('express');
const router = express.Router();
const c = require('../controllers/classesController');
const { verifierToken, autoriser } = require('../middleware/auth');

router.use(verifierToken);
router.get('/', c.getClasses);
router.post('/', autoriser('admin'), c.creerClasse);
router.put('/:id', autoriser('admin'), c.modifierClasse);
router.delete('/:id', autoriser('admin'), c.supprimerClasse);

module.exports = router;