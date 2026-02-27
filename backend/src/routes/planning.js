const express = require('express');
const router = express.Router();
const c = require('../controllers/planningController');
const { verifierToken, autoriser } = require('../middleware/auth');

router.use(verifierToken);
router.get('/creneaux', c.getCreneaux);
router.get('/disponibilites/:prof_id', c.getDisponibilites);
router.post('/disponibilites/:prof_id', c.saveDisponibilites);
router.get('/pools', c.getPools);
router.post('/pools', autoriser('admin'), c.createPool);
router.put('/pools/:id', autoriser('admin'), c.updatePool);
router.delete('/pools/:id', autoriser('admin'), c.deletePool);
router.get('/classe-periodes/:classe_id', c.getClassePeriodes);
router.post('/classe-periodes/:classe_id', c.saveClassePeriodes);
router.get('/affectations', c.getAffectations);
router.post('/affectations', autoriser('admin'), c.saveAffectation);
router.delete('/affectations/:id', autoriser('admin'), c.deleteAffectation);
router.get('/general', c.getPlanningGeneral);
router.get('/prof/:prof_id', c.getPlanningProf);
router.get('/classe/:classe_id', c.getPlanningClasse);

module.exports = router;