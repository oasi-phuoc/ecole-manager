const fs = require('fs');

fs.writeFileSync('./src/controllers/planClasseController.js', `const pool = require('../config/database');

const getPlanClasse = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM plan_classe WHERE classe_id=$1', [req.params.classe_id]);
    res.json(r.rows[0] || { positions: {} });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const savePlanClasse = async (req, res) => {
  const { positions } = req.body;
  try {
    await pool.query(
      \`INSERT INTO plan_classe (classe_id, positions, updated_at) VALUES ($1,$2,NOW())
       ON CONFLICT (classe_id) DO UPDATE SET positions=$2, updated_at=NOW()\`,
      [req.params.classe_id, JSON.stringify(positions)]
    );
    res.json({ message: 'Plan sauvegardé' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getPlanClasse, savePlanClasse };`);

fs.writeFileSync('./src/routes/planClasse.js', `const express = require('express');
const router = express.Router();
const { verifierToken } = require('../middleware/auth');
const { getPlanClasse, savePlanClasse } = require('../controllers/planClasseController');
router.use(verifierToken);
router.get('/:classe_id', getPlanClasse);
router.post('/:classe_id', savePlanClasse);
module.exports = router;`);

let server = fs.readFileSync('./server.js', 'utf8');
if (!server.includes('plan-classe')) {
  server = server.replace(
    "app.use('/api/observations'",
    "app.use('/api/plan-classe', require('./src/routes/planClasse'));\napp.use('/api/observations'"
  );
  fs.writeFileSync('./server.js', server);
  console.log('server.js OK');
}
console.log('planClasse backend OK !');