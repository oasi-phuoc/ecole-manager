const express = require('express');
const router = express.Router();
const c = require('../controllers/archivesController');
const { verifierToken, autoriser } = require('../middleware/auth');

router.use(verifierToken);
router.get('/', c.liste);
router.get('/:id/export', c.exporter);
router.get('/:id/tables/:tableName', c.table);
router.get('/:id/fichiers/:fichierId', c.fichier);
router.get('/:id', c.detail);
router.post('/', autoriser('admin'), c.creerArchiveAnnee);

module.exports = router;
