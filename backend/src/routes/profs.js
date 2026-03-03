const express = require('express');
const router = express.Router();
const c = require('../controllers/profsController');
const { verifierToken, autoriser } = require('../middleware/auth');

router.use(verifierToken);
router.get('/', c.getProfs);
router.get('/:id', c.getProf);
router.post('/', autoriser('admin'), c.creerProf);
router.put('/:id', autoriser('admin'), c.modifierProf);
router.delete('/:id', autoriser('admin'), c.supprimerProf);

router.post('/:id/envoyer-acces', autoriser('admin'), c.envoyerAcces);
router.get('/:id/documents', c.getDocuments);
router.post('/:id/documents', autoriser('admin'), c.uploadDocument);
router.get('/:id/documents/:docId/telecharger', c.telechargerDocument);
router.delete('/:id/documents/:docId', autoriser('admin'), c.supprimerDocument);
module.exports = router;