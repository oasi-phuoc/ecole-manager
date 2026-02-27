const pool = require('../config/database');

const getPaiements = async (req, res) => {
  try {
    const { statut, classe_id } = req.query;
    let query = `
      SELECT p.id, p.montant, p.type, p.statut, p.date_paiement, p.commentaire, p.created_at,
        u.nom, u.prenom, e.id as eleve_id,
        c.nom as classe
      FROM paiements p
      JOIN eleves e ON p.eleve_id = e.id
      JOIN utilisateurs u ON e.utilisateur_id = u.id
      LEFT JOIN classes c ON e.classe_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (statut) { query += ` AND p.statut = $${params.length + 1}`; params.push(statut); }
    if (classe_id) { query += ` AND e.classe_id = $${params.length + 1}`; params.push(classe_id); }
    query += ' ORDER BY p.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const creerPaiement = async (req, res) => {
  const { eleve_id, montant, type, statut, date_paiement, commentaire } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO paiements (eleve_id, montant, type, statut, date_paiement, commentaire) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [eleve_id, montant, type, statut || 'en_attente', date_paiement || null, commentaire || null]
    );
    res.status(201).json({ message: 'Paiement cree', paiement: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const modifierPaiement = async (req, res) => {
  const { montant, type, statut, date_paiement, commentaire } = req.body;
  try {
    const result = await pool.query(
      'UPDATE paiements SET montant=$1, type=$2, statut=$3, date_paiement=$4, commentaire=$5 WHERE id=$6 RETURNING *',
      [montant, type, statut, date_paiement || null, commentaire || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Paiement non trouve' });
    res.json({ message: 'Paiement modifie' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const supprimerPaiement = async (req, res) => {
  try {
    await pool.query('DELETE FROM paiements WHERE id=$1', [req.params.id]);
    res.json({ message: 'Paiement supprime' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getStatistiques = async (req, res) => {
  try {
    const total = await pool.query("SELECT COALESCE(SUM(montant),0) as total FROM paiements WHERE statut='paye'");
    const attente = await pool.query("SELECT COALESCE(SUM(montant),0) as total, COUNT(*) as nb FROM paiements WHERE statut='en_attente'");
    const retard = await pool.query("SELECT COALESCE(SUM(montant),0) as total, COUNT(*) as nb FROM paiements WHERE statut='en_retard'");
    const parType = await pool.query("SELECT type, COALESCE(SUM(montant),0) as total, COUNT(*) as nb FROM paiements WHERE statut='paye' GROUP BY type ORDER BY total DESC");
    res.json({
      total_encaisse: total.rows[0].total,
      en_attente: attente.rows[0],
      en_retard: retard.rows[0],
      par_type: parType.rows
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = { getPaiements, creerPaiement, modifierPaiement, supprimerPaiement, getStatistiques };