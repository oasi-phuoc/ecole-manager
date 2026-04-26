const express = require('express');
const rateLimit = require('express-rate-limit');
const { verifierToken } = require('../middleware/auth');
const ctrl = require('../controllers/sondagesController');

const router = express.Router();

const publicSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de soumissions depuis cette adresse. Réessayez plus tard.' },
});

router.get('/public/:token', ctrl.getPublicFormulaire);
router.post('/public/:token/repondre', publicSubmitLimiter, ctrl.postReponsePublique);

router.use(verifierToken);
router.get('/', ctrl.listSondages);
router.post('/', ctrl.createSondage);
router.get('/:id/reponses', ctrl.listReponses);
router.get('/:id', ctrl.getSondage);
router.put('/:id', ctrl.updateSondage);
router.delete('/:id', ctrl.deleteSondage);

module.exports = router;
