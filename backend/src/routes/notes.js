const express = require('express');
const router = express.Router();
const c = require('../controllers/notesController');
const { verifierToken } = require('../middleware/auth');

router.use(verifierToken);
router.get('/bulletin', c.getBulletin);
router.get('/bulletin-criteres', c.getBulletinCriteres);
router.put('/bulletin-criteres/:eleve_id', c.putBulletinCriteres);
router.get('/rapport', c.getRapportClasse);
router.get('/suivi-classes', c.getSuiviClasses);
router.get('/', c.getEvaluations);
router.post('/', c.creerEvaluation);
router.put('/:id', c.modifierEvaluation);
router.delete('/:id', c.supprimerEvaluation);
router.get('/:id/notes', c.getNotesEvaluation);
router.post('/:id/notes', c.sauvegarderNotes);

module.exports = router;