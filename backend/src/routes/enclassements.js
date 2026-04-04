const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/enclassementController');
const { verifierToken } = require('../middleware/auth');

router.get('/', verifierToken, ctrl.list);
router.get('/:id', verifierToken, ctrl.get);
router.post('/', verifierToken, ctrl.create);
router.patch('/:id/statut', verifierToken, ctrl.updateStatut);
router.delete('/:id', verifierToken, ctrl.remove);

module.exports = router;
