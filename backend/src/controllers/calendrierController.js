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
  const { titre, description, date_debut, date_fin, type, couleur, categorie, nom_vacance, heure_debut, heure_fin } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO calendrier (titre, description, date_debut, date_fin, type, couleur, categorie, nom_vacance, heure_debut, heure_fin) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [titre, description||null, date_debut, date_fin||date_debut, type||'Evenement', couleur||'#1a73e8', categorie||'evenement', nom_vacance||null, heure_debut||null, heure_fin||null]
    );
    res.status(201).json({ message: 'Evenement cree', evenement: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const modifierEvenement = async (req, res) => {
  const { titre, description, date_debut, date_fin, type, couleur, categorie, nom_vacance, heure_debut, heure_fin } = req.body;
  try {
    const result = await pool.query(
      'UPDATE calendrier SET titre=$1, description=$2, date_debut=$3, date_fin=$4, type=$5, couleur=$6, categorie=$7, nom_vacance=$8, heure_debut=$9, heure_fin=$10 WHERE id=$11 RETURNING *',
      [titre, description||null, date_debut, date_fin||date_debut, type||'Evenement', couleur||'#1a73e8', categorie||'evenement', nom_vacance||null, heure_debut||null, heure_fin||null, req.params.id]
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

const getCalendrierProf = async (req, res) => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS calendrier_prof (id SERIAL PRIMARY KEY, prof_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE, date DATE NOT NULL, titre VARCHAR(200) NOT NULL, type VARCHAR(50) DEFAULT 'Autre', description TEXT DEFAULT '', created_at TIMESTAMP DEFAULT NOW())`);
    const r = await pool.query('SELECT * FROM calendrier_prof WHERE prof_id=$1 ORDER BY date DESC', [req.user.id]);
    res.json(r.rows);
  } catch(err) { res.status(500).json({message:err.message}); }
};

const postCalendrierProf = async (req, res) => {
  try {
    const { date, titre, type, description } = req.body;
    const r = await pool.query('INSERT INTO calendrier_prof (prof_id,date,titre,type,description) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, date, titre, type||'Autre', description||'']);
    res.json(r.rows[0]);
  } catch(err) { res.status(500).json({message:err.message}); }
};

const putCalendrierProf = async (req, res) => {
  try {
    const { date, titre, type, description } = req.body;
    const r = await pool.query(
      'UPDATE calendrier_prof SET date=$1, titre=$2, type=$3, description=$4 WHERE id=$5 AND prof_id=$6 RETURNING *',
      [date, titre, type || 'Autre', description || '', req.params.id, req.user.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ message: 'Élément non trouvé' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteCalendrierProf = async (req, res) => {
  try {
    await pool.query('DELETE FROM calendrier_prof WHERE id=$1 AND prof_id=$2', [req.params.id, req.user.id]);
    res.json({ok:true});
  } catch(err) { res.status(500).json({message:err.message}); }
};

module.exports = { getEvenements, creerEvenement, modifierEvenement, supprimerEvenement, getCalendrierProf, postCalendrierProf, putCalendrierProf, deleteCalendrierProf };