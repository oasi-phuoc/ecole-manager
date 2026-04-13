const pool = require('../config/database');

const getBranchesClasse = async (req, res) => {
  try {
    const classeId = parseInt(req.params.classeId, 10);
    if (!classeId) return res.status(400).json({ message: 'Classe invalide' });

    const classeRes = await pool.query('SELECT id, niveau, nom FROM classes WHERE id=$1', [classeId]);
    if (!classeRes.rows.length) return res.status(404).json({ message: 'Classe non trouvee' });
    const classe = { ...classeRes.rows[0], niveau: classeRes.rows[0].niveau != null ? String(classeRes.rows[0].niveau).trim() : '' };

    let branches = [];
    if (classe.niveau) {
      const r = await pool.query(
        `SELECT id, nom, code, niveau, designation_courte FROM matieres
         WHERE LOWER(TRIM(COALESCE(niveau, ''))) = LOWER($1) ORDER BY nom`,
        [classe.niveau]
      );
      branches = r.rows;
    }
    if (branches.length === 0) {
      const r = await pool.query('SELECT id, nom, code, niveau, designation_courte FROM matieres ORDER BY nom');
      branches = r.rows;
    }

    res.json({
      classe,
      branches,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getInventaireBranche = async (req, res) => {
  try {
    const classeId = parseInt(req.params.classeId, 10);
    const brancheId = parseInt(req.params.brancheId, 10);
    if (!classeId || !brancheId) return res.status(400).json({ message: 'Parametres invalides' });

    const result = await pool.query(`
      SELECT ib.*, m.nom AS branche_nom, u.nom AS auteur_nom, u.prenom AS auteur_prenom
      FROM inventaire_branches ib
      JOIN matieres m ON m.id=ib.branche_id
      LEFT JOIN utilisateurs u ON u.id=ib.auteur_id
      WHERE ib.classe_id=$1 AND ib.branche_id=$2
      ORDER BY COALESCE(ib.ordre, 999999) ASC, ib.created_at ASC, ib.id ASC
    `, [classeId, brancheId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const ajouterInventaireBranche = async (req, res) => {
  try {
    const classeId = parseInt(req.params.classeId, 10);
    const brancheId = parseInt(req.params.brancheId, 10);
    const { date_document, nom_document, numero_document, remarques, sans_numero } = req.body;

    if (!classeId || !brancheId) return res.status(400).json({ message: 'Parametres invalides' });
    if (!nom_document || !String(nom_document).trim()) {
      return res.status(400).json({ message: 'Le nom du document est requis' });
    }

    const ordreRes = await pool.query(
      'SELECT COALESCE(MAX(ordre), 0) + 1 AS next_ordre FROM inventaire_branches WHERE classe_id=$1 AND branche_id=$2',
      [classeId, brancheId]
    );
    const nextOrdre = ordreRes.rows[0]?.next_ordre || 1;

    const r = await pool.query(`
      INSERT INTO inventaire_branches (
        classe_id, branche_id, date_document, nom_document, numero_document, ordre, sans_numero, remarques, auteur_id
      ) VALUES (
        $1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5, $6, $7, $8, $9
      )
      RETURNING *
    `, [
      classeId,
      brancheId,
      date_document || null,
      String(nom_document).trim(),
      numero_document || null,
      nextOrdre,
      !!sans_numero,
      remarques || null,
      req.user?.id || null,
    ]);

    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const modifierInventaireBranche = async (req, res) => {
  try {
    const classeId = parseInt(req.params.classeId, 10);
    const brancheId = parseInt(req.params.brancheId, 10);
    const id = parseInt(req.params.id, 10);
    const { date_document, nom_document, remarques, sans_numero } = req.body;
    if (!classeId || !brancheId || !id) return res.status(400).json({ message: 'Parametres invalides' });
    if (!nom_document || !String(nom_document).trim()) {
      return res.status(400).json({ message: 'Le nom du document est requis' });
    }

    const r = await pool.query(`
      UPDATE inventaire_branches
      SET
        date_document = COALESCE($1::date, CURRENT_DATE),
        nom_document = $2,
        sans_numero = $3,
        remarques = $4
      WHERE id=$5 AND classe_id=$6 AND branche_id=$7
      RETURNING *
    `, [
      date_document || null,
      String(nom_document).trim(),
      !!sans_numero,
      remarques || null,
      id,
      classeId,
      brancheId,
    ]);
    if (!r.rows.length) return res.status(404).json({ message: 'Ligne inventaire non trouvee' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const reorderInventaireBranche = async (req, res) => {
  try {
    const classeId = parseInt(req.params.classeId, 10);
    const brancheId = parseInt(req.params.brancheId, 10);
    const { ids } = req.body;
    if (!classeId || !brancheId || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'Parametres invalides' });
    }

    for (let i = 0; i < ids.length; i += 1) {
      const id = parseInt(ids[i], 10);
      if (!id) continue;
      await pool.query(
        'UPDATE inventaire_branches SET ordre=$1 WHERE id=$2 AND classe_id=$3 AND branche_id=$4',
        [i + 1, id, classeId, brancheId]
      );
    }
    res.json({ message: 'Ordre mis a jour' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const supprimerInventaireBranche = async (req, res) => {
  try {
    const classeId = parseInt(req.params.classeId, 10);
    const brancheId = parseInt(req.params.brancheId, 10);
    const id = parseInt(req.params.id, 10);
    if (!classeId || !brancheId || !id) return res.status(400).json({ message: 'Parametres invalides' });

    const r = await pool.query(
      'DELETE FROM inventaire_branches WHERE id=$1 AND classe_id=$2 AND branche_id=$3 RETURNING id',
      [id, classeId, brancheId]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Ligne inventaire non trouvee' });

    res.json({ message: 'Ligne supprimee' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = {
  getBranchesClasse,
  getInventaireBranche,
  ajouterInventaireBranche,
  modifierInventaireBranche,
  reorderInventaireBranche,
  supprimerInventaireBranche,
};
