const express = require('express');
const router = express.Router();
const { verifierToken } = require('../middleware/auth');
const { getPlanClasse, savePlanClasse } = require('../controllers/planClasseController');
router.use(verifierToken);
router.get('/:classe_id', getPlanClasse);
router.post('/:classe_id', savePlanClasse);
module.exports = router;