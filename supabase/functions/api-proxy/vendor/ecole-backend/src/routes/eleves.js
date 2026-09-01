const express = require('express');
const router = express.Router();
const c = require('../controllers/elevesController');
const { verifierToken, autoriser } = require('../middleware/auth');
router.use(verifierToken);
router.get('/', c.getEleves);
router.get('/oasi', c.getElevesOASI);
router.get('/:id', c.getEleve);
router.post('/', autoriser('admin'), c.creerEleve);
router.put('/:id', autoriser('admin'), c.modifierEleve);
router.delete('/:id', autoriser('admin'), c.supprimerEleve);
router.put('/:id/photo', c.updatePhoto);
router.put('/:id/classe', async (req, res) => {
  const pool = require('../config/database');
  const { classe_id } = req.body;
  try {
    await pool.query('UPDATE eleves SET classe_id=$1 WHERE id=$2', [classe_id||null, req.params.id]);
    res.json({ message: 'Classe mise à jour' });
  } catch(err) { res.status(500).json({ message: err.message }); }
});
router.put('/:id/date-debut-cours', autoriser('admin'), async (req, res) => {
  const pool = require('../config/database');
  const { date_debut_cours } = req.body;
  try {
    await pool.query('UPDATE eleves SET date_debut_cours=$1 WHERE id=$2', [date_debut_cours || null, req.params.id]);
    res.json({ message: 'Date de début des cours mise à jour' });
  } catch(err) { res.status(500).json({ message: err.message }); }
});
router.put('/:id/categorie', autoriser('admin'), async (req, res) => {
  const pool = require('../config/database');
  const { categorie } = req.body;
  try {
    await pool.query('UPDATE eleves SET categorie=$1 WHERE id=$2', [categorie || null, req.params.id]);
    res.json({ message: 'Catégorie mise à jour' });
  } catch(err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id/documents', c.getDocumentsEleve);
router.post('/:id/documents', autoriser('admin'), c.uploadDocumentEleve);
router.get('/:id/documents/:docId/telecharger', c.telechargerDocumentEleve);
router.delete('/:id/documents/:docId', autoriser('admin'), c.supprimerDocumentEleve);

router.get('/:id/sanctions', c.getSanctionsEleve);
router.post('/:id/sanctions', autoriser('admin'), c.ajouterSanction);
router.put('/:id/sanctions/:sanctionId', autoriser('admin'), c.modifierSanction);
router.delete('/:id/sanctions/:sanctionId', autoriser('admin'), c.supprimerSanction);

module.exports = router;
