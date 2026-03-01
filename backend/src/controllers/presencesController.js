const pool = require('../config/database');

const getPresences = async (req, res) => {
  try {
    const { classe_id, date } = req.query;
    const result = await pool.query(`
      SELECT pv.*, e.id as eleve_id
      FROM presences_v2 pv
      JOIN eleves e ON pv.eleve_id = e.id
      WHERE pv.classe_id = $1 AND pv.date = $2
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
        COALESCE(u.nom, e.nom) as nom,
        COALESCE(u.prenom, e.prenom) as prenom
      FROM eleves e
      LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
      WHERE e.classe_id = $1 AND (e.statut = 'actif' OR e.statut = 'Actif')
      ORDER BY nom, prenom
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
    const { classe_id } = req.query;
    const result = await pool.query(`
      SELECT
        COALESCE(u.nom, e.nom) as nom,
        COALESCE(u.prenom, e.prenom) as prenom,
        COUNT(DISTINCT pv.date) as jours,
        SUM(CASE WHEN pv.p1='P' OR pv.p2='P' OR pv.p3='P' OR pv.p4='P' OR pv.p5='P' OR pv.p6='P' OR pv.p7='P' OR pv.p8='P' THEN 1 ELSE 0 END) as presents,
        SUM(CASE WHEN pv.p1='A' OR pv.p2='A' OR pv.p3='A' OR pv.p4='A' OR pv.p5='A' OR pv.p6='A' OR pv.p7='A' OR pv.p8='A' THEN 1 ELSE 0 END) as absents,
        SUM(CASE WHEN pv.p1='R' OR pv.p2='R' OR pv.p3='R' OR pv.p4='R' OR pv.p5='R' OR pv.p6='R' OR pv.p7='R' OR pv.p8='R' THEN 1 ELSE 0 END) as retards,
        SUM(CASE WHEN pv.p1='E' OR pv.p2='E' OR pv.p3='E' OR pv.p4='E' OR pv.p5='E' OR pv.p6='E' OR pv.p7='E' OR pv.p8='E' THEN 1 ELSE 0 END) as excuses,
        SUM(CASE WHEN pv.p1='C' OR pv.p2='C' OR pv.p3='C' OR pv.p4='C' OR pv.p5='C' OR pv.p6='C' OR pv.p7='C' OR pv.p8='C' THEN 1 ELSE 0 END) as conges
      FROM eleves e
      LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
      LEFT JOIN presences_v2 pv ON pv.eleve_id = e.id
      WHERE e.classe_id = $1
      GROUP BY e.id, u.nom, u.prenom, e.nom, e.prenom
      ORDER BY nom, prenom
    `, [classe_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = { getPresences, getElevesClasse, enregistrerPresences, getStatistiques };
