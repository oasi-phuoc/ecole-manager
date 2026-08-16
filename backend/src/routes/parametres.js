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
router.get('/mail', autoriser('admin'), c.getParametresMail);
router.put('/mail', autoriser('admin'), c.modifierParametresMail);
router.post('/mail/test', autoriser('admin'), c.envoyerMailTest);
router.get('/profs', autoriser('admin'), c.getProfs);
router.put('/permissions/:id', autoriser('admin'), c.modifierPermissions);
router.get('/acces-profs', c.getAccesProfs);
router.put('/acces-profs', autoriser('admin'), c.modifierAccesProfs);
router.get('/mes-classes', c.getClassesProf);

router.delete('/reset-tout', autoriser('admin'), c.resetTout);
router.get('/archive-rentree', autoriser('admin'), c.archiveRentree);
router.delete('/reset-rentree', autoriser('admin'), c.resetRentree);

module.exports = router;