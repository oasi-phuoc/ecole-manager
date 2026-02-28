const fs = require('fs');
let ctrl = fs.readFileSync('./src/controllers/elevesController.js', 'utf8');

// Ajouter endpoint photo
if (!ctrl.includes('updatePhoto')) {
  ctrl = ctrl.replace(
    'module.exports = {',
    `const updatePhoto = async (req, res) => {
  const { photo } = req.body;
  try {
    await pool.query('UPDATE eleves SET photo=$1 WHERE id=$2', [photo, req.params.id]);
    res.json({ message: 'Photo mise à jour' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

module.exports = {`
  );
  ctrl = ctrl.replace(
    /module\.exports = \{([^}]+)\}/,
    (match, content) => match.replace(content, content.trimEnd() + ',\n  updatePhoto')
  );
  fs.writeFileSync('./src/controllers/elevesController.js', ctrl);
  console.log('elevesController OK');
}

// Ajouter route photo
let routes = fs.readFileSync('./src/routes/eleves.js', 'utf8');
if (!routes.includes('photo')) {
  routes = routes.replace(
    'module.exports = router;',
    `router.put('/:id/photo', require('../controllers/elevesController').updatePhoto);
module.exports = router;`
  );
  fs.writeFileSync('./src/routes/eleves.js', routes);
  console.log('eleves routes OK');
}