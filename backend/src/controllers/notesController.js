const pool = require('../config/database');

const getEvaluations = async (req, res) => {
  try {
    await pool.query('ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS semestre INT DEFAULT 1');
    const { classe_id, matiere_id, semestre } = req.query;
    let query = `
      SELECT ev.id, ev.nom, ev.date, ev.type, ev.coefficient, ev.sur, ev.points_max, ev.publie, ev.created_at, ev.semestre,
        m.nom as matiere, m.id as matiere_id,
        c.nom as classe,
        u.nom as prof_nom, u.prenom as prof_prenom,
        COUNT(n.id) as nb_notes,
        ROUND(AVG(CASE WHEN n.absent = false AND n.dispense = false AND n.valeur IS NOT NULL THEN n.valeur END)::numeric, 1) as moyenne_classe,
        (SELECT COUNT(*) FROM eleves e2 WHERE e2.classe_id = ev.classe_id AND LOWER(COALESCE(e2.statut, 'actif')) = 'actif') as nb_eleves_classe,
        COUNT(CASE WHEN n.absent = false AND n.dispense = false AND n.valeur IS NOT NULL THEN 1 END) as nb_notes_saisies,
        COUNT(CASE WHEN n.dispense = true THEN 1 END) as nb_dispenses
      FROM evaluations ev
      JOIN matieres m ON ev.matiere_id = m.id
      JOIN classes c ON ev.classe_id = c.id
      JOIN utilisateurs u ON ev.prof_id = u.id
      LEFT JOIN notes n ON n.evaluation_id = ev.id
      WHERE ev.classe_id = $1
    `;
    const params = [classe_id];
    if (matiere_id) { query += ` AND ev.matiere_id = $${params.length + 1}`; params.push(matiere_id); }
    if (semestre) { query += ` AND ev.semestre = $${params.length + 1}`; params.push(parseInt(semestre)); }
    query += ' GROUP BY ev.id, m.nom, m.id, c.nom, u.nom, u.prenom ORDER BY ev.date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const creerEvaluation = async (req, res) => {
  const { nom, classe_id, matiere_id, date, type, coefficient, sur, points_max, semestre } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO evaluations (nom, classe_id, matiere_id, prof_id, date, type, coefficient, sur, points_max, semestre) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [nom, classe_id, matiere_id, req.user.id, date, type || 'Ecrit', coefficient || 1, sur || 6, points_max != null && points_max !== '' ? points_max : null, semestre || 1]
    );
    res.status(201).json({ message: 'Evaluation creee', evaluation: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const modifierEvaluation = async (req, res) => {
  const { nom, date, type, coefficient, points_max } = req.body;
  const pm = points_max != null && points_max !== '' ? parseFloat(points_max) : null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE evaluations SET nom=$1, date=$2, type=$3, coefficient=$4, points_max=$5 WHERE id=$6',
      [nom, date || null, type || 'Ecrit', coefficient || 1, pm, req.params.id]
    );
    if (pm && pm > 0) {
      await client.query(`
        UPDATE notes SET valeur = ROUND(LEAST((points / $1) * 5 + 1, 6)::numeric, 1)
        WHERE evaluation_id = $2 AND points IS NOT NULL AND absent = false AND dispense = false
      `, [pm, req.params.id]);
    }
    await client.query('COMMIT');
    res.json({ message: 'Evaluation modifiee' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  } finally {
    client.release();
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
      SELECT e.id,
        COALESCE(e.nom, u.nom) as nom,
        COALESCE(e.prenom, u.prenom) as prenom
      FROM eleves e
      LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
      WHERE e.classe_id = $1 AND LOWER(e.statut) = 'actif'
      ORDER BY COALESCE(e.nom, u.nom), COALESCE(e.prenom, u.prenom)
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
      const pts = n.points != null ? n.points : null;
      const val = n.valeur != null ? n.valeur : null;
      const abs = n.absent === true;
      const disp = n.dispense === true;
      const com = n.commentaire || null;
      if (existe.rows.length > 0) {
        await client.query(
          'UPDATE notes SET points=$1, valeur=$2, absent=$3, dispense=$4, commentaire=$5 WHERE evaluation_id=$6 AND eleve_id=$7',
          [pts, val, abs, disp, com, eval_id, n.eleve_id]
        );
      } else {
        await client.query(
          'INSERT INTO notes (evaluation_id, eleve_id, points, valeur, absent, dispense, commentaire) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [eval_id, n.eleve_id, pts, val, abs, disp, com]
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
    const { classe_id, semestre } = req.query;
    const eleves = await pool.query(`
      SELECT e.id, COALESCE(e.nom, u.nom) as nom, COALESCE(e.prenom, u.prenom) as prenom, e.date_debut_cours
      FROM eleves e
      LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
      WHERE e.classe_id = $1 AND LOWER(COALESCE(e.statut, 'actif')) = 'actif'
      ORDER BY COALESCE(e.nom, u.nom), COALESCE(e.prenom, u.prenom)
    `, [classe_id]);

    const matieres = await pool.query('SELECT * FROM matieres ORDER BY nom');

    const bulletins = await Promise.all(eleves.rows.map(async (eleve) => {
      const parMatiere = {};
      for (const matiere of matieres.rows) {
        const params = [eleve.id, matiere.id];
        let semestreFilter = '';
        if (semestre) { params.push(parseInt(semestre)); semestreFilter = ` AND ev.semestre = $${params.length}`; }
        const notes = await pool.query(`
          SELECT n.valeur, n.absent, n.dispense, ev.coefficient
          FROM notes n
          JOIN evaluations ev ON n.evaluation_id = ev.id
          WHERE n.eleve_id = $1 AND ev.matiere_id = $2 AND n.absent = false AND n.dispense = false AND n.valeur IS NOT NULL${semestreFilter}
        `, params);

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

const getRapportClasse = async (req, res) => {
  const { classe_id, semestre } = req.query;
  try {
    const elevesRes = await pool.query(`
      SELECT e.id, COALESCE(e.nom, u.nom) as nom, COALESCE(e.prenom, u.prenom) as prenom
      FROM eleves e
      LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
      WHERE e.classe_id = $1 AND LOWER(COALESCE(e.statut, 'actif')) = 'actif'
      ORDER BY COALESCE(e.nom, u.nom), COALESCE(e.prenom, u.prenom)
    `, [classe_id]);

    const evalsParams = [classe_id];
    let evalsWhere = 'WHERE ev.classe_id = $1';
    if (semestre) { evalsParams.push(parseInt(semestre)); evalsWhere += ` AND ev.semestre = $${evalsParams.length}`; }

    const evalsRes = await pool.query(`
      SELECT ev.id, ev.nom, ev.date, ev.type, ev.coefficient, ev.points_max,
        m.id as matiere_id, m.nom as matiere_nom,
        u.nom as prof_nom, u.prenom as prof_prenom
      FROM evaluations ev
      JOIN matieres m ON ev.matiere_id = m.id
      LEFT JOIN utilisateurs u ON ev.prof_id = u.id
      ${evalsWhere}
      ORDER BY m.nom, ev.date
    `, evalsParams);

    const notesRes = await pool.query(`
      SELECT n.eleve_id, n.evaluation_id, n.valeur, n.absent, n.dispense
      FROM notes n
      JOIN evaluations ev ON n.evaluation_id = ev.id
      WHERE ev.classe_id = $1${semestre ? ' AND ev.semestre = $2' : ''}
    `, semestre ? [classe_id, parseInt(semestre)] : [classe_id]);

    const matiereMap = {};
    for (const ev of evalsRes.rows) {
      if (!matiereMap[ev.matiere_id]) {
        matiereMap[ev.matiere_id] = { matiere_id: ev.matiere_id, matiere_nom: ev.matiere_nom, evaluations: [] };
      }
      const evalNotes = notesRes.rows.filter(n => n.evaluation_id === ev.id);
      matiereMap[ev.matiere_id].evaluations.push({
        id: ev.id, nom: ev.nom, date: ev.date, type: ev.type,
        coefficient: parseFloat(ev.coefficient),
        prof_nom: ev.prof_nom, prof_prenom: ev.prof_prenom,
        notes: elevesRes.rows.map(e => {
          const n = evalNotes.find(n => n.eleve_id === e.id);
          return { eleve_id: e.id, valeur: n ? n.valeur : null, absent: n ? n.absent : null, dispense: n ? n.dispense : null };
        })
      });
    }

    res.json({ eleves: elevesRes.rows, matieres: Object.values(matiereMap) });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getBulletinCriteres = async (req, res) => {
  try {
    const { classe_id, semestre } = req.query;
    const sem = parseInt(semestre) || 1;
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE bulletin_criteres ADD COLUMN IF NOT EXISTS semestre INT NOT NULL DEFAULT 1;
        ALTER TABLE bulletin_criteres DROP CONSTRAINT IF EXISTS bulletin_criteres_classe_id_eleve_id_key;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'bulletin_criteres' AND constraint_name = 'bulletin_criteres_classe_eleve_semestre_key'
        ) THEN
          ALTER TABLE bulletin_criteres ADD CONSTRAINT bulletin_criteres_classe_eleve_semestre_key
            UNIQUE (classe_id, eleve_id, semestre);
        END IF;
      END $$
    `);
    const result = await pool.query(`
      SELECT eleve_id, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, remarques, valide, semestre
      FROM bulletin_criteres WHERE classe_id = $1 AND semestre = $2
    `, [classe_id, sem]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const putBulletinCriteres = async (req, res) => {
  try {
    const { eleve_id } = req.params;
    const { classe_id, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, remarques, valide, semestre } = req.body;
    const sem = parseInt(semestre) || 1;
    await pool.query(`
      INSERT INTO bulletin_criteres (classe_id, eleve_id, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, remarques, valide, semestre)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (classe_id, eleve_id, semestre) DO UPDATE SET
        c1=$3, c2=$4, c3=$5, c4=$6, c5=$7, c6=$8, c7=$9, c8=$10, c9=$11, c10=$12, remarques=$13, valide=$14
    `, [classe_id, eleve_id, c1||null, c2||null, c3||null, c4||null, c5||null, c6||null, c7||null, c8||null, c9||null, c10||null, remarques||null, valide === true || valide === 'true', sem]);
    res.json({ message: 'Critères bulletin enregistrés' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getSuiviClasses = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ev.classe_id, ev.matiere_id, COUNT(ev.id)::int as nb_evaluations
      FROM evaluations ev
      GROUP BY ev.classe_id, ev.matiere_id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getNotesSemConfig = async (req, res) => {
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS app_settings (cle TEXT PRIMARY KEY, valeur TEXT)');
    const result = await pool.query("SELECT valeur FROM app_settings WHERE cle = 'sem1_bloque' LIMIT 1");
    res.json({ sem1_bloque: result.rows.length > 0 && result.rows[0].valeur === 'true' });
  } catch (err) {
    res.json({ sem1_bloque: false });
  }
};

const putNotesSemConfig = async (req, res) => {
  const { sem1_bloque } = req.body;
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS app_settings (cle TEXT PRIMARY KEY, valeur TEXT)');
    await pool.query(
      "INSERT INTO app_settings (cle, valeur) VALUES ('sem1_bloque', $1) ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur",
      [sem1_bloque ? 'true' : 'false']
    );
    res.json({ message: 'OK' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getClassesResponsables = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.classe_id,
        u.id as prof_id,
        u.prenom as prof_prenom,
        u.nom as prof_nom,
        (c.prof_principal_id = u.id) as est_titulaire,
        array_agg(
          DISTINCT COALESCE(NULLIF(TRIM(m.designation_courte),''), m.nom)
          ORDER BY COALESCE(NULLIF(TRIM(m.designation_courte),''), m.nom)
        ) FILTER (WHERE m.nom IS NOT NULL AND (a.type_special IS NULL OR a.type_special = '') AND m.suivi_notes != false) as matieres
      FROM affectations a
      JOIN utilisateurs u ON u.id = a.prof_id
      JOIN classes c ON c.id = a.classe_id
      LEFT JOIN matieres m ON m.id = a.matiere_id
      GROUP BY a.classe_id, u.id, u.prenom, u.nom, c.prof_principal_id
      ORDER BY a.classe_id, (c.prof_principal_id = u.id) DESC, u.nom
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = { getEvaluations, creerEvaluation, modifierEvaluation, supprimerEvaluation, getNotesEvaluation, sauvegarderNotes, getBulletin, getRapportClasse, getBulletinCriteres, putBulletinCriteres, getSuiviClasses, getNotesSemConfig, putNotesSemConfig, getClassesResponsables };