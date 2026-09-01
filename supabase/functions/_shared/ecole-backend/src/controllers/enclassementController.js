const pool = require('../config/database');

exports.list = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT e.*,
        u.prenom || ' ' || u.nom as created_by_nom,
        (SELECT COUNT(*)::int FROM affectations_eleves_enc a
          JOIN classes_enclassement c ON a.classe_id = c.id
          WHERE c.enclassement_id = e.id) as nb_eleves,
        (SELECT COUNT(*)::int FROM classes_enclassement c WHERE c.enclassement_id = e.id) as nb_classes
      FROM enclassements e
      LEFT JOIN utilisateurs u ON e.created_by = u.id
      ORDER BY e.created_at DESC
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.get = async (req, res) => {
  try {
    const { id } = req.params;
    const [enc, classes] = await Promise.all([
      pool.query('SELECT * FROM enclassements WHERE id=$1', [id]),
      pool.query(`
        SELECT c.*,
          COALESCE(json_agg(
            json_build_object(
              'id', a.id,
              'eleve_id', a.eleve_id,
              'nom', u.nom,
              'prenom', u.prenom,
              'score_francais', a.score_francais,
              'score_math', a.score_math,
              'score_pondere', a.score_pondere,
              'flagge_plancher', a.flagge_plancher,
              'motif_flag', a.motif_flag,
              'position_serpentin', a.position_serpentin,
              'modifie_manuellement', a.modifie_manuellement
            ) ORDER BY a.position_serpentin
          ) FILTER (WHERE a.id IS NOT NULL), '[]') as eleves
        FROM classes_enclassement c
        LEFT JOIN affectations_eleves_enc a ON a.classe_id = c.id
        LEFT JOIN eleves el ON a.eleve_id = el.id
        LEFT JOIN utilisateurs u ON el.utilisateur_id = u.id
        WHERE c.enclassement_id = $1
        GROUP BY c.id
        ORDER BY c.structure, c.nom
      `, [id])
    ]);
    if (!enc.rows[0]) return res.status(404).json({ error: 'Non trouvé' });
    res.json({ ...enc.rows[0], classes: classes.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
  const client = await pool.connect();
  try {
    const { nom, session_tcf, parametres, classes } = req.body;
    const userId = req.user?.id;
    await client.query('BEGIN');

    const encR = await client.query(
      `INSERT INTO enclassements (nom, session_tcf, created_by, statut, parametres)
       VALUES ($1, $2, $3, 'validé', $4) RETURNING *`,
      [nom, session_tcf || "Test d'août", userId, JSON.stringify(parametres || {})]
    );
    const enc = encR.rows[0];

    for (const cl of (classes || [])) {
      const clR = await client.query(
        `INSERT INTO classes_enclassement (enclassement_id, structure, nom, capacite_max)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [enc.id, cl.structure, cl.nom, cl.capacite_max || (cl.structure === 'CSC' ? 12 : 15)]
      );
      const clId = clR.rows[0].id;
      for (const eleve of (cl.eleves || [])) {
        await client.query(
          `INSERT INTO affectations_eleves_enc
           (classe_id, eleve_id, score_francais, score_math, score_pondere, flagge_plancher, motif_flag, position_serpentin, modifie_manuellement)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [clId, eleve.eleve_id, eleve.score_francais, eleve.score_math, eleve.score_pondere,
           eleve.flagge_plancher || false, eleve.motif_flag || null,
           eleve.position_serpentin, eleve.modifie_manuellement || false]
        );
      }
    }

    await client.query('COMMIT');
    res.json(enc);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
};

exports.updateStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;
    const r = await pool.query(
      'UPDATE enclassements SET statut=$1 WHERE id=$2 RETURNING *',
      [statut, id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    await pool.query('DELETE FROM enclassements WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
