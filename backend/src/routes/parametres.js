const express = require('express');
const router = express.Router();
const c = require('../controllers/parametresController');
const { verifierToken, autoriser } = require('../middleware/auth');

router.use(verifierToken);
router.get('/profil', c.getProfil);
router.put('/profil', c.modifierProfil);
router.put('/mot-de-passe', c.modifierMotDePasse);
router.get('/ecole', c.getParametresEcole);
router.put('/ecole', autoriser('admin'), c.modifierParametresEcole);
router.get('/profs', autoriser('admin'), c.getProfs);
router.put('/permissions/:id', autoriser('admin'), c.modifierPermissions);
router.get('/mes-classes', c.getClassesProf);

module.exports = router;