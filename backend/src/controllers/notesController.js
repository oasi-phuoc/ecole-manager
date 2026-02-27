const pool = require('../config/database');

const getEvaluations = async (req, res) => {
  try {
    const { classe_id, matiere_id } = req.query;
    let query = `
      SELECT ev.id, ev.nom, ev.date, ev.type, ev.coefficient, ev.sur, ev.points_max, ev.publie, ev.created_at,
        m.nom as matiere, m.id as matiere_id,
        c.nom as classe,
        u.nom as prof_nom, u.prenom as prof_prenom,
        COUNT(n.id) as nb_notes
      FROM evaluations ev
      JOIN matieres m ON ev.matiere_id = m.id
      JOIN classes c ON ev.classe_id = c.id
      JOIN utilisateurs u ON ev.prof_id = u.id
      LEFT JOIN notes n ON n.evaluation_id = ev.id
      WHERE ev.classe_id = $1
    `;
    const params = [classe_id];
    if (matiere_id) { query += ` AND ev.matiere_id = $2`; params.push(matiere_id); }
    query += ' GROUP BY ev.id, m.nom, m.id, c.nom, u.nom, u.prenom ORDER BY ev.date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const creerEvaluation = async (req, res) => {
  const { nom, classe_id, matiere_id, date, type, coefficient, sur, points_max } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO evaluations (nom, classe_id, matiere_id, prof_id, date, type, coefficient, sur, points_max) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [nom, classe_id, matiere_id, req.user.id, date, type || 'Ecrit', coefficient || 1, sur || 6, points_max || 30]
    );
    res.status(201).json({ message: 'Evaluation creee', evaluation: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const supprimerEvaluation = async (req, res) => {
  try {
    await pool.query('DELETE FROM evaluations WHERE id=$1', [req.params.id]);
    res.json({ message: 'Evaluation supprimee' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getNotesEvaluation = async (req, res) => {
  try {
    const eval_id = req.params.id;
    const evaluation = await pool.query(`
      SELECT ev.*, m.nom as matiere, c.nom as classe
      FROM evaluations ev
      JOIN matieres m ON ev.matiere_id = m.id
      JOIN classes c ON ev.classe_id = c.id
      WHERE ev.id = $1
    `, [eval_id]);
    if (evaluation.rows.length === 0) return res.status(404).json({ message: 'Evaluation non trouvee' });

    const eleves = await pool.query(`
      SELECT e.id, u.nom, u.prenom
      FROM eleves e
      JOIN utilisateurs u ON e.utilisateur_id = u.id
      WHERE e.classe_id = $1 AND e.statut = 'actif'
      ORDER BY u.nom, u.prenom
    `, [evaluation.rows[0].classe_id]);

    const notes = await pool.query('SELECT * FROM notes WHERE evaluation_id = $1', [eval_id]);

    const elevesAvecNotes = eleves.rows.map(eleve => {
      const note = notes.rows.find(n => n.eleve_id === eleve.id);
      return {
        ...eleve,
        points: note ? note.points : null,
        valeur: note ? note.valeur : null,
        absent: note ? note.absent : false,
        dispense: note ? note.dispense : false,
        commentaire: note ? note.commentaire : '',
        note_id: note ? note.id : null
      };
    });

    res.json({ evaluation: evaluation.rows[0], eleves: elevesAvecNotes });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const sauvegarderNotes = async (req, res) => {
  const { notes } = req.body;
  const eval_id = req.params.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const n of notes) {
      const existe = await client.query('SELECT id FROM notes WHERE evaluation_id=$1 AND eleve_id=$2', [eval_id, n.eleve_id]);
      if (existe.rows.length > 0) {
        await client.query(
          'UPDATE notes SET points=$1, valeur=$2, absent=$3, dispense=$4, commentaire=$5 WHERE evaluation_id=$6 AND eleve_id=$7',
          [n.points || null, n.valeur || null, n.absent || false, n.dispense || false, n.commentaire || null, eval_id, n.eleve_id]
        );
      } else {
        await client.query(
          'INSERT INTO notes (evaluation_id, eleve_id, points, valeur, absent, dispense, commentaire) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [eval_id, n.eleve_id, n.points || null, n.valeur || null, n.absent || false, n.dispense || false, n.commentaire || null]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ message: 'Notes sauvegardees' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  } finally {
    client.release();
  }
};

const getBulletin = async (req, res) => {
  try {
    const { classe_id } = req.query;
    const eleves = await pool.query(`
      SELECT e.id, u.nom, u.prenom
      FROM eleves e
      JOIN utilisateurs u ON e.utilisateur_id = u.id
      WHERE e.classe_id = $1 AND e.statut = 'actif'
      ORDER BY u.nom, u.prenom
    `, [classe_id]);

    const matieres = await pool.query('SELECT * FROM matieres ORDER BY nom');

    const bulletins = await Promise.all(eleves.rows.map(async (eleve) => {
      const parMatiere = {};
      for (const matiere of matieres.rows) {
        const notes = await pool.query(`
          SELECT n.valeur, n.absent, n.dispense, ev.coefficient
          FROM notes n
          JOIN evaluations ev ON n.evaluation_id = ev.id
          WHERE n.eleve_id = $1 AND ev.matiere_id = $2 AND n.absent = false AND n.dispense = false AND n.valeur IS NOT NULL
        `, [eleve.id, matiere.id]);

        if (notes.rows.length > 0) {
          const moyenne = notes.rows.reduce((acc, n) => acc + parseFloat(n.valeur), 0) / notes.rows.length;
          parMatiere[matiere.nom] = {
            moyenne: Math.round(moyenne * 100) / 100,
            coefficient: matiere.coefficient,
            nbNotes: notes.rows.length
          };
        }
      }

      let moyenneGenerale = 0;
      let totalCoef = 0;
      Object.values(parMatiere).forEach(m => {
        moyenneGenerale += m.moyenne * parseFloat(m.coefficient);
        totalCoef += parseFloat(m.coefficient);
      });
      if (totalCoef > 0) moyenneGenerale = Math.round((moyenneGenerale / totalCoef) * 100) / 100;

      return { eleve, parMatiere, moyenneGenerale };
    }));

    res.json(bulletins);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = { getEvaluations, creerEvaluation, supprimerEvaluation, getNotesEvaluation, sauvegarderNotes, getBulletin };