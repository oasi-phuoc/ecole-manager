const pool = require('../config/database');

const CLES_AUTORISEES = new Set(['pool', 'affectation', 'resultats']);

const normaliserCle = (raw) => String(raw || '').trim().toLowerCase();

const getState = async (req, res) => {
  const cle = normaliserCle(req.params.cle);
  if (!CLES_AUTORISEES.has(cle)) {
    return res.status(400).json({ message: 'Cle TCF invalide' });
  }
  try {
    const result = await pool.query(
      'SELECT donnees, updated_at FROM tcf_state WHERE cle = $1 LIMIT 1',
      [cle]
    );
    if (!result.rows.length) {
      return res.json({ donnees: {}, updated_at: null });
    }
    return res.json({
      donnees: result.rows[0].donnees || {},
      updated_at: result.rows[0].updated_at || null,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const upsertState = async (req, res) => {
  const cle = normaliserCle(req.params.cle);
  if (!CLES_AUTORISEES.has(cle)) {
    return res.status(400).json({ message: 'Cle TCF invalide' });
  }

  const donnees = req.body?.donnees;
  if (donnees === undefined || donnees === null || typeof donnees !== 'object' || Array.isArray(donnees)) {
    return res.status(400).json({ message: 'Le payload "donnees" doit etre un objet JSON' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tcf_state (cle, donnees, updated_by, updated_at)
       VALUES ($1, $2::jsonb, $3, NOW())
       ON CONFLICT (cle)
       DO UPDATE SET donnees = EXCLUDED.donnees, updated_by = EXCLUDED.updated_by, updated_at = NOW()
       RETURNING updated_at`,
      [cle, JSON.stringify(donnees), req.user.id]
    );
    return res.json({ message: 'Etat TCF enregistre', updated_at: result.rows[0]?.updated_at || null });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = { getState, upsertState };
