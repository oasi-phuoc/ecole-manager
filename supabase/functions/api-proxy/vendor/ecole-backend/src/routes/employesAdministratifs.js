const express = require('express');
const router = express.Router();
const c = require('../controllers/employesAdministratifsController');
const { verifierToken, autoriser } = require('../middleware/auth');

router.use(verifierToken);
router.get('/', c.getEmployes);
router.get('/:id', c.getEmploye);
router.post('/', autoriser('admin'), c.creerEmploye);
router.put('/:id', autoriser('admin'), c.modifierEmploye);
router.delete('/:id', autoriser('admin'), c.supprimerEmploye);
router.post('/:id/envoyer-acces', autoriser('admin'), c.envoyerAcces);
router.get('/:id/documents', c.getDocuments);
router.post('/:id/documents', autoriser('admin'), c.uploadDocument);
router.get('/:id/documents/:docId/telecharger', c.telechargerDocument);
router.delete('/:id/documents/:docId', autoriser('admin'), c.supprimerDocument);

module.exports = router;

