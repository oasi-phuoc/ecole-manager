const pool = require('../config/database');

const getClassesDisponibles = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const result = await pool.query(`
        SELECT id, nom, niveau, annee_scolaire
        FROM classes
        WHERE actif IS DISTINCT FROM false
        ORDER BY nom
      `);
      return res.json(result.rows);
    }

    const result = await pool.query(`
      SELECT DISTINCT c.id, c.nom, c.niveau, c.annee_scolaire
      FROM classes c
      LEFT JOIN affectations a ON a.classe_id = c.id AND a.prof_id = $1
      LEFT JOIN emploi_du_temps et ON et.classe_id = c.id AND et.prof_id = $1
      WHERE c.prof_principal_id = $1
         OR a.id IS NOT NULL
         OR et.id IS NOT NULL
      ORDER BY c.nom
    `, [req.user.id]);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getPresences = async (req, res) => {
  try {
    const { classe_id, date } = req.query;
    // TO_CHAR : la colonne DATE en JS devient minuit local puis ISO UTC → décalage d’un jour
    // dans l’aperçu si on ne renvoie qu’une chaîne civile YYYY-MM-DD.
    const result = await pool.query(`
      SELECT pv.id, pv.eleve_id, pv.classe_id,
        TO_CHAR(pv.date, 'YYYY-MM-DD') AS date,
        pv.p1, pv.p2, pv.p3, pv.p4, pv.p5, pv.p6, pv.p7, pv.p8,
        pv.remarque, pv.valide
      FROM presences_v2 pv
      JOIN eleves e ON pv.eleve_id = e.id
      WHERE pv.classe_id = $1 AND pv.date = $2::date
    `, [classe_id, date]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getElevesClasse = async (req, res) => {
  try {
    const { classe_id } = req.query;
    // Gère les élèves avec ET sans utilisateur_id
    const result = await pool.query(`
      SELECT e.id,
        u.nom, u.prenom
      FROM eleves e
      LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
      WHERE e.classe_id = $1 AND (e.statut = 'actif' OR e.statut = 'Actif')
      ORDER BY u.nom, u.prenom
    `, [classe_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const enregistrerPresences = async (req, res) => {
  const { presences, date, classe_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const p of presences) {
      const existe = await client.query(
        'SELECT id FROM presences_v2 WHERE eleve_id=$1 AND date=$2',
        [p.eleve_id, date]
      );
      if (existe.rows.length > 0) {
        await client.query(`
          UPDATE presences_v2 SET p1=$1,p2=$2,p3=$3,p4=$4,p5=$5,p6=$6,p7=$7,p8=$8,remarque=$9,valide=$10
          WHERE eleve_id=$11 AND date=$12
        `, [p.p1,p.p2,p.p3,p.p4,p.p5,p.p6,p.p7,p.p8,p.remarque||null,p.valide||false,p.eleve_id,date]);
      } else {
        await client.query(`
          INSERT INTO presences_v2 (eleve_id,classe_id,date,p1,p2,p3,p4,p5,p6,p7,p8,remarque,valide)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        `, [p.eleve_id,classe_id,date,p.p1,p.p2,p.p3,p.p4,p.p5,p.p6,p.p7,p.p8,p.remarque||null,p.valide||false]);
      }
    }
    await client.query('COMMIT');
    res.json({ message: 'Presences enregistrees' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  } finally {
    client.release();
  }
};

const getStatistiques = async (req, res) => {
  try {
    const { classe_id, date_debut, date_fin } = req.query;
    const result = await pool.query(`
      SELECT
        e.id as eleve_id,
        u.nom, u.prenom,
        COUNT(DISTINCT pv.date) as jours,
        SUM(
          (CASE WHEN pv.p1='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p2='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p3='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p4='P' THEN 1 ELSE 0 END)+
          (CASE WHEN pv.p5='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p6='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p7='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p8='P' THEN 1 ELSE 0 END)
        ) as presents,
        SUM(
          (CASE WHEN pv.p1='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p2='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p3='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p4='A' THEN 1 ELSE 0 END)+
          (CASE WHEN pv.p5='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p6='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p7='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p8='A' THEN 1 ELSE 0 END)
        ) as absents,
        SUM(
          (CASE WHEN pv.p1='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p2='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p3='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p4='R' THEN 1 ELSE 0 END)+
          (CASE WHEN pv.p5='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p6='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p7='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p8='R' THEN 1 ELSE 0 END)
        ) as retards,
        SUM(
          (CASE WHEN pv.p1='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p2='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p3='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p4='E' THEN 1 ELSE 0 END)+
          (CASE WHEN pv.p5='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p6='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p7='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p8='E' THEN 1 ELSE 0 END)
        ) as excuses,
        SUM(
          (CASE WHEN pv.p1='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p2='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p3='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p4='C' THEN 1 ELSE 0 END)+
          (CASE WHEN pv.p5='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p6='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p7='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p8='C' THEN 1 ELSE 0 END)
        ) as conges
      FROM eleves e
      LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
      LEFT JOIN presences_v2 pv
        ON pv.eleve_id = e.id
       AND ($2::date IS NULL OR pv.date >= $2::date)
       AND ($3::date IS NULL OR pv.date <= $3::date)
      WHERE e.classe_id = $1
      GROUP BY e.id, u.nom, u.prenom
      ORDER BY u.nom, u.prenom
    `, [classe_id, date_debut || null, date_fin || null]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getPresencesMois = async (req, res) => {
  try {
    const { classe_id, mois } = req.query;
    const result = await pool.query(`
      SELECT pv.id, pv.eleve_id, pv.classe_id,
        TO_CHAR(pv.date, 'YYYY-MM-DD') AS date,
        pv.p1, pv.p2, pv.p3, pv.p4, pv.p5, pv.p6, pv.p7, pv.p8,
        pv.remarque, pv.valide
      FROM presences_v2 pv
      JOIN eleves e ON pv.eleve_id = e.id
      WHERE pv.classe_id = $1 AND TO_CHAR(pv.date, 'YYYY-MM') = $2
    `, [classe_id, mois]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = { getClassesDisponibles, getPresences, getElevesClasse, enregistrerPresences, getStatistiques, getPresencesMois };
