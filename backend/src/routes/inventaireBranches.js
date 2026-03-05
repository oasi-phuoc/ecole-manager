const express = require('express');
const router = express.Router();
const c = require('../controllers/inventaireBranchesController');
const { verifierToken, autoriser } = require('../middleware/auth');

router.use(verifierToken);

router.get('/:classeId/branches', c.getBranchesClasse);
router.get('/:classeId/branches/:brancheId', c.getInventaireBranche);
router.post('/:classeId/branches/:brancheId', autoriser('admin', 'prof'), c.ajouterInventaireBranche);
router.delete('/:classeId/branches/:brancheId/:id', autoriser('admin', 'prof'), c.supprimerInventaireBranche);

module.exports = router;
