const fs = require('fs');
const path = require('path');

// ── 1. Ajouter resetTout dans parametresController.js ──
const controllerPath = path.join(__dirname, 'src', 'controllers', 'parametresController.js');
let ctrl = fs.readFileSync(controllerPath, 'utf8');

ctrl += `
const resetTout = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Présences
    await client.query('DELETE FROM presences_v2');
    await client.query('DELETE FROM presences');
    await client.query('DELETE FROM absences');

    // Notes & branches
    await client.query('DELETE FROM notes');
    await client.query('DELETE FROM planning_branches');
    await client.query('DELETE FROM branches');

    // Planning / Emploi du temps
    await client.query('DELETE FROM classe_horaires');
    await client.query('DELETE FROM planning_affectations');
    await client.query('DELETE FROM planning_pools');
    await client.query('DELETE FROM disponibilites');

    // Comptabilité
    await client.query('DELETE FROM paiements');
    await client.query('DELETE FROM comptabilite');

    // Calendrier
    await client.query('DELETE FROM calendrier');

    // Observations
    await client.query('DELETE FROM observations');

    // Élèves
    await client.query('DELETE FROM eleves');

    // Classes
    await client.query('DELETE FROM classes');

    // Professeurs
    await client.query('DELETE FROM profs');

    // Utilisateurs non-admin
    await client.query("DELETE FROM utilisateurs WHERE role != 'admin'");

    // Messages / notifications
    await client.query('DELETE FROM messages');
    await client.query('DELETE FROM notifications');

    await client.query('COMMIT');
    res.json({ message: 'Reset complet effectué' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Erreur lors du reset', erreur: err.message });
  } finally { client.release(); }
};
`;

// Ajouter dans module.exports
ctrl = ctrl.replace(
  /module\.exports\s*=\s*\{([^}]+)\}/,
  (match, exports) => `module.exports = {${exports.trimEnd()}, resetTout }`
);

fs.writeFileSync(controllerPath, ctrl, 'utf8');
console.log('✅ resetTout ajouté dans parametresController.js');

// ── 2. Ajouter la route ──
const routesPath = path.join(__dirname, 'src', 'routes', 'parametres.js');
let routes = fs.readFileSync(routesPath, 'utf8');

routes = routes.replace(
  /const c = require\(['"]\.\.\/controllers\/parametresController['"]\)/,
  `const c = require('../controllers/parametresController')`
);

routes = routes.replace(
  `module.exports = router;`,
  `router.delete('/reset-tout', autoriser('admin'), c.resetTout);\n\nmodule.exports = router;`
);

fs.writeFileSync(routesPath, routes, 'utf8');
console.log('✅ Route DELETE /parametres/reset-tout ajoutée');