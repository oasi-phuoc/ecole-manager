const pool = require('../config/database');

const getBranches = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM matieres ORDER BY nom');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const creerBranche = async (req, res) => {
  const { nom, code, coefficient } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO matieres (nom, code, coefficient) VALUES ($1,$2,$3) RETURNING *',
      [nom, code || null, coefficient || 1]
    );
    res.status(201).json({ message: 'Branche creee', branche: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Cette branche existe déjà !' });
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const modifierBranche = async (req, res) => {
  const { nom, code, coefficient } = req.body;
  try {
    const result = await pool.query(
      'UPDATE matieres SET nom=$1, code=$2, coefficient=$3 WHERE id=$4 RETURNING *',
      [nom, code || null, coefficient || 1, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Branche non trouvee' });
    res.json({ message: 'Branche modifiee' });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Cette branche existe déjà !' });
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const supprimerBranche = async (req, res) => {
  try {
    await pool.query('DELETE FROM matieres WHERE id=$1', [req.params.id]);
    res.json({ message: 'Branche supprimee' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = { getBranches, creerBranche, modifierBranche, supprimerBranche };