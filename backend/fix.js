const fs = require('fs');

let ctrl = fs.readFileSync('./src/controllers/observationsController.js', 'utf8');
if (!ctrl.includes('modifierObservation')) {
  ctrl = ctrl.replace(
    'module.exports = {',
    `const modifierObservation = async (req, res) => {
  const { titre, contenu } = req.body;
  try {
    await pool.query('UPDATE observations SET titre=$1, contenu=$2 WHERE id=$3', [titre, contenu, req.params.id]);
    res.json({ message: 'Observation modifiée' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

module.exports = {`
  );
  ctrl = ctrl.replace(
    'module.exports = { getObservations, creerObservation, supprimerObservation }',
    'module.exports = { getObservations, creerObservation, supprimerObservation, modifierObservation }'
  );
  fs.writeFileSync('./src/controllers/observationsController.js', ctrl);
  console.log('observationsController OK');
}

let routes = fs.readFileSync('./src/routes/observations.js', 'utf8');
if (!routes.includes('put')) {
  routes = routes.replace(
    `const { getObservations, creerObservation, supprimerObservation } = require('../controllers/observationsController');`,
    `const { getObservations, creerObservation, supprimerObservation, modifierObservation } = require('../controllers/observationsController');`
  );
  routes = routes.replace(
    'router.delete',
    `router.put('/:id', modifierObservation);\nrouter.delete`
  );
  fs.writeFileSync('./src/routes/observations.js', routes);
  console.log('observations routes OK');
}