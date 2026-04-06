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

const getMateriels = async (req, res) => {
  try {
    const { section } = req.query;
    const params = [];
    let q = 'SELECT * FROM materiels';
    if (section) {
      params.push(section);
      q += ' WHERE section=$1';
    }
    q += ' ORDER BY nom';
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const creerMateriel = async (req, res) => {
  const { nom, section, prix, ref, fournisseur, rabais, remarques, icone } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO materiels (nom, section, prix, ref, fournisseur, rabais, remarques, icone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nom, section || 'scolaire', prix || 0, ref || null, fournisseur || null, rabais || 0, remarques || null, icone || null]
    );
    res.status(201).json({ message: 'Materiel cree', materiel: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const modifierMateriel = async (req, res) => {
  const { nom, section, prix, ref, fournisseur, rabais, remarques, icone } = req.body;
  try {
    const result = await pool.query(
      `UPDATE materiels
       SET nom=$1, section=$2, prix=$3, ref=$4, fournisseur=$5, rabais=$6, remarques=$7, icone=$8
       WHERE id=$9 RETURNING *`,
      [nom, section || 'scolaire', prix || 0, ref || null, fournisseur || null, rabais || 0, remarques || null, icone || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Materiel non trouve' });
    res.json({ message: 'Materiel modifie', materiel: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const supprimerMateriel = async (req, res) => {
  try {
    await pool.query('DELETE FROM materiels WHERE id=$1', [req.params.id]);
    res.json({ message: 'Materiel supprime' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getFacturesValidations = async (req, res) => {
  const { eleve_ids, annee_scolaire } = req.query;
  if (!eleve_ids || !annee_scolaire) return res.json([]);
  try {
    const ids = eleve_ids.split(',').map(Number).filter(Boolean);
    if (ids.length === 0) return res.json([]);
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
    const result = await pool.query(
      `SELECT eleve_id, valide FROM factures_validations WHERE annee_scolaire=$1 AND eleve_id IN (${placeholders})`,
      [annee_scolaire, ...ids]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const toggleFactureValidation = async (req, res) => {
  const { eleve_id, annee_scolaire, valide } = req.body;
  if (!eleve_id || !annee_scolaire) return res.status(400).json({ message: 'Paramètres manquants' });
  try {
    await pool.query(
      `INSERT INTO factures_validations (eleve_id, annee_scolaire, valide, valide_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (eleve_id, annee_scolaire) DO UPDATE SET valide=$3, valide_at=$4`,
      [eleve_id, annee_scolaire, valide, valide ? new Date() : null]
    );
    res.json({ valide });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getOrCreateFactureRef = async (req, res) => {
  const { eleve_id, annee_scolaire, reference } = req.body;
  if (!eleve_id || !annee_scolaire || !reference) {
    return res.status(400).json({ message: 'eleve_id, annee_scolaire et reference sont requis' });
  }
  try {
    const existing = await pool.query(
      'SELECT reference FROM factures_references WHERE eleve_id=$1 AND annee_scolaire=$2',
      [eleve_id, annee_scolaire]
    );
    if (existing.rows.length > 0) {
      return res.json({ reference: existing.rows[0].reference });
    }
    const result = await pool.query(
      'INSERT INTO factures_references (eleve_id, annee_scolaire, reference) VALUES ($1,$2,$3) RETURNING reference',
      [eleve_id, annee_scolaire, reference]
    );
    res.json({ reference: result.rows[0].reference });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = {
  getPaiements, creerPaiement, modifierPaiement, supprimerPaiement, getStatistiques,
  getMateriels, creerMateriel, modifierMateriel, supprimerMateriel,
  getOrCreateFactureRef,
  getFacturesValidations, toggleFactureValidation
};