const fs = require('fs');
const path = require('path');

// ── Routes presences.js ──
const routesPath = path.join(__dirname, 'src', 'routes', 'presences.js');
fs.writeFileSync(routesPath, `const express = require('express');
const router = express.Router();
const c = require('../controllers/presencesController');
const { verifierToken } = require('../middleware/auth');
router.use(verifierToken);
router.get('/', c.getPresences);
router.get('/eleves', c.getElevesClasse);
router.get('/mois', c.getPresencesMois);
router.get('/statistiques', c.getStatistiques);
router.post('/', c.enregistrerPresences);
module.exports = router;
`);
console.log('✅ Route /mois ajoutée dans presences.js');

// ── Controller ──
const controllerPath = path.join(__dirname, 'src', 'controllers', 'presencesController.js');
let ctrl = fs.readFileSync(controllerPath, 'utf8');

if (ctrl.includes('getPresencesMois')) {
  console.log('ℹ️  getPresencesMois déjà dans le controller');
} else {
  ctrl = ctrl.replace(
    `module.exports = { getPresences, getElevesClasse, enregistrerPresences, getStatistiques };`,
    `const getPresencesMois = async (req, res) => {
  try {
    const { classe_id, mois } = req.query;
    const result = await pool.query(\`
      SELECT pv.*, e.id as eleve_id
      FROM presences_v2 pv
      JOIN eleves e ON pv.eleve_id = e.id
      WHERE pv.classe_id = $1 AND TO_CHAR(pv.date, 'YYYY-MM') = $2
    \`, [classe_id, mois]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = { getPresences, getElevesClasse, enregistrerPresences, getStatistiques, getPresencesMois };`
  );
  fs.writeFileSync(controllerPath, ctrl, 'utf8');
  console.log('✅ getPresencesMois ajouté dans le controller');
}