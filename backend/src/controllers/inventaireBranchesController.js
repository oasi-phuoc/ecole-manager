const pool = require('../config/database');

const getBranchesClasse = async (req, res) => {
  try {
    const classeId = parseInt(req.params.classeId, 10);
    if (!classeId) return res.status(400).json({ message: 'Classe invalide' });

    const classeRes = await pool.query('SELECT id, niveau, nom FROM classes WHERE id=$1', [classeId]);
    if (!classeRes.rows.length) return res.status(404).json({ message: 'Classe non trouvee' });
    const classe = classeRes.rows[0];

    let q = 'SELECT id, nom, niveau FROM matieres';
    const params = [];
    if (classe.niveau) {
      q += ' WHERE niveau=$1';
      params.push(classe.niveau);
    }
    q += ' ORDER BY nom';
    const branchesRes = await pool.query(q, params);

    res.json({
      classe,
      branches: branchesRes.rows,
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
      ORDER BY ib.date_document DESC, ib.id DESC
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
    const { date_document, nom_document, numero_document, remarques } = req.body;

    if (!classeId || !brancheId) return res.status(400).json({ message: 'Parametres invalides' });
    if (!nom_document || !String(nom_document).trim()) {
      return res.status(400).json({ message: 'Le nom du document est requis' });
    }

    const r = await pool.query(`
      INSERT INTO inventaire_branches (
        classe_id, branche_id, date_document, nom_document, numero_document, remarques, auteur_id
      ) VALUES (
        $1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5, $6, $7
      )
      RETURNING *
    `, [
      classeId,
      brancheId,
      date_document || null,
      String(nom_document).trim(),
      numero_document || null,
      remarques || null,
      req.user?.id || null,
    ]);

    res.status(201).json(r.rows[0]);
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
  supprimerInventaireBranche,
};
