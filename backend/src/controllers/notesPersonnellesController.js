const pool = require('../config/database');

const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes_personnelles (
      id SERIAL PRIMARY KEY,
      utilisateur_id INTEGER NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
      contenu TEXT DEFAULT '',
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
};

const getNotePersonnelle = async (req, res) => {
  try {
    await ensureTable();
    const r = await pool.query('SELECT contenu, updated_at FROM notes_personnelles WHERE utilisateur_id = $1', [req.user.id]);
    res.json({ contenu: r.rows[0]?.contenu || '', updated_at: r.rows[0]?.updated_at || null });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const putNotePersonnelle = async (req, res) => {
  try {
    await ensureTable();
    const { contenu } = req.body;
    await pool.query(`
      INSERT INTO notes_personnelles (utilisateur_id, contenu, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (utilisateur_id) DO UPDATE SET contenu = $2, updated_at = NOW()
    `, [req.user.id, contenu || '']);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getNotePersonnelle, putNotePersonnelle };
