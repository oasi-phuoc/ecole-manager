const pool = require('../config/database');

const getPlanClasse = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM plan_classe WHERE classe_id=$1', [req.params.classe_id]);
    if (!r.rows[0]) return res.json({ positions: {} });
    const positions = typeof r.rows[0].positions === 'string'
      ? JSON.parse(r.rows[0].positions)
      : (r.rows[0].positions || {});
    res.json({ positions });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const savePlanClasse = async (req, res) => {
  const { positions } = req.body;
  try {
    await pool.query(
      `INSERT INTO plan_classe (classe_id, positions, updated_at) VALUES ($1,$2,NOW())
       ON CONFLICT (classe_id) DO UPDATE SET positions=$2, updated_at=NOW()`,
      [req.params.classe_id, JSON.stringify(positions)]
    );
    res.json({ message: 'Plan sauvegardé' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getPlanClasse, savePlanClasse };