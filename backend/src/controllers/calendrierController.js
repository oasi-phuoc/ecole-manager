const pool = require('../config/database');

const getEvenements = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM calendrier ORDER BY date_debut');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const creerEvenement = async (req, res) => {
  const { titre, description, date_debut, date_fin, type, couleur } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO calendrier (titre, description, date_debut, date_fin, type, couleur) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [titre, description || null, date_debut, date_fin || date_debut, type || 'Evenement', couleur || '#1a73e8']
    );
    res.status(201).json({ message: 'Evenement cree', evenement: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const modifierEvenement = async (req, res) => {
  const { titre, description, date_debut, date_fin, type, couleur } = req.body;
  try {
    const result = await pool.query(
      'UPDATE calendrier SET titre=$1, description=$2, date_debut=$3, date_fin=$4, type=$5, couleur=$6 WHERE id=$7 RETURNING *',
      [titre, description || null, date_debut, date_fin || date_debut, type || 'Evenement', couleur || '#1a73e8', req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Evenement non trouve' });
    res.json({ message: 'Evenement modifie' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const supprimerEvenement = async (req, res) => {
  try {
    await pool.query('DELETE FROM calendrier WHERE id=$1', [req.params.id]);
    res.json({ message: 'Evenement supprime' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = { getEvenements, creerEvenement, modifierEvenement, supprimerEvenement };