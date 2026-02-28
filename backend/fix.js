const fs = require('fs');
let routes = fs.readFileSync('./src/routes/eleves.js', 'utf8');
if (!routes.includes('classe')) {
  routes = routes.replace(
    'module.exports = router;',
    `router.put('/:id/classe', async (req, res) => {
  const pool = require('../config/database');
  const { classe_id } = req.body;
  try {
    await pool.query('UPDATE eleves SET classe_id=$1 WHERE id=$2', [classe_id||null, req.params.id]);
    res.json({ message: 'Classe mise à jour' });
  } catch(err) { res.status(500).json({ message: err.message }); }
});
module.exports = router;`
  );
  fs.writeFileSync('./src/routes/eleves.js', routes);
  console.log('Route classe OK !');
}