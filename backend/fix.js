const fs = require('fs');
const path = require('path');

// ── 1. Ajouter getPresencesMois dans le controller ──
const controllerPath = path.join(__dirname, 'src', 'controllers', 'presencesController.js');
let ctrl = fs.readFileSync(controllerPath, 'utf8');

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

// ── 2. Ajouter la route ──
const routesPath = path.join(__dirname, 'src', 'routes', 'presencesRoutes.js');
let routes = fs.readFileSync(routesPath, 'utf8');

routes = routes.replace(
  /const \{([^}]+)\} = require\(['"]\.\.\/controllers\/presencesController['"]\)/,
  (match, imports) => `const { ${imports.trim()}, getPresencesMois } = require('../controllers/presencesController')`
);

if (routes.includes('module.exports')) {
  routes = routes.replace('module.exports', `router.get('/mois', getPresencesMois);\n\nmodule.exports`);
} else {
  routes += `\nrouter.get('/mois', getPresencesMois);\n`;
}

fs.writeFileSync(routesPath, routes, 'utf8');
console.log('✅ Route GET /presences/mois ajoutée');