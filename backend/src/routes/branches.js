const express = require('express');
const router = express.Router();
const c = require('../controllers/branchesController');
const { verifierToken, autoriser } = require('../middleware/auth');

router.use(verifierToken);
router.get('/', c.getBranches);
router.post('/', autoriser('admin'), c.creerBranche);
router.put('/:id', autoriser('admin'), c.modifierBranche);
router.delete('/:id', autoriser('admin'), c.supprimerBranche);

module.exports = router;