const express = require('express');
const router = express.Router();
const { verifierToken, autoriser } = require('../middleware/auth');
const c = require('../controllers/documentsAdministratifsController');

router.use(verifierToken);

router.get('/', c.getDocumentsAdministratifs);
router.get('/:id/telecharger', c.telechargerDocumentAdministratif);
router.post('/', autoriser('admin'), c.creerDocumentAdministratif);
router.put('/:id', autoriser('admin'), c.modifierDocumentAdministratif);
router.delete('/:id', autoriser('admin'), c.supprimerDocumentAdministratif);

module.exports = router;
