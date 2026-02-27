const pool = require('../config/database');

// Creneaux
const getCreneaux = async (req, res) => {
  const r = await pool.query('SELECT * FROM creneaux ORDER BY jour, ordre');
  res.json(r.rows);
};

// Disponibilités d'un prof
const getDisponibilites = async (req, res) => {
  const { prof_id } = req.params;
  const r = await pool.query(
    'SELECT creneau_id, disponible FROM disponibilites WHERE prof_id=$1', [prof_id]
  );
  res.json(r.rows);
};

// Sauvegarder disponibilités
const saveDisponibilites = async (req, res) => {
  const { prof_id } = req.params;
  const { disponibilites } = req.body;
  try {
    await pool.query('DELETE FROM disponibilites WHERE prof_id=$1', [prof_id]);
    for (const d of disponibilites) {
      await pool.query(
        'INSERT INTO disponibilites (prof_id, creneau_id, disponible) VALUES ($1,$2,$3)',
        [prof_id, d.creneau_id, d.disponible]
      );
    }
    res.json({ message: 'Disponibilités sauvegardées' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Pools
const getPools = async (req, res) => {
  const pools = await pool.query('SELECT * FROM pools ORDER BY nom');
  const result = [];
  for (const p of pools.rows) {
    const profs = await pool.query(
      `SELECT u.id, u.nom, u.prenom, u.email FROM utilisateurs u
       JOIN pool_profs pp ON pp.prof_id = u.id WHERE pp.pool_id=$1`, [p.id]
    );
    result.push({ ...p, profs: profs.rows });
  }
  res.json(result);
};

const createPool = async (req, res) => {
  const { nom, site, couleur, prof_ids } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO pools (nom, site, couleur) VALUES ($1,$2,$3) RETURNING *',
      [nom, site, couleur || '#1a73e8']
    );
    const newPool = r.rows[0];
    for (const pid of (prof_ids || [])) {
      await pool.query('INSERT INTO pool_profs (pool_id, prof_id) VALUES ($1,$2)', [newPool.id, pid]);
    }
    res.json(newPool);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updatePool = async (req, res) => {
  const { id } = req.params;
  const { nom, site, couleur, prof_ids } = req.body;
  try {
    await pool.query('UPDATE pools SET nom=$1, site=$2, couleur=$3 WHERE id=$4', [nom, site, couleur, id]);
    await pool.query('DELETE FROM pool_profs WHERE pool_id=$1', [id]);
    for (const pid of (prof_ids || [])) {
      await pool.query('INSERT INTO pool_profs (pool_id, prof_id) VALUES ($1,$2)', [id, pid]);
    }
    res.json({ message: 'Pool mis à jour' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deletePool = async (req, res) => {
  await pool.query('DELETE FROM pools WHERE id=$1', [req.params.id]);
  res.json({ message: 'Pool supprimé' });
};

// Affectations
const getAffectations = async (req, res) => {
  const r = await pool.query(`
    SELECT a.*, 
      u.nom || ' ' || u.prenom as prof_nom,
      c.nom as classe_nom,
      m.nom as matiere_nom,
      cr.jour, cr.heure_debut, cr.heure_fin, cr.periode
    FROM affectations a
    JOIN utilisateurs u ON u.id = a.prof_id
    JOIN classes c ON c.id = a.classe_id
    LEFT JOIN matieres m ON m.id = a.matiere_id
    JOIN creneaux cr ON cr.id = a.creneau_id
    ORDER BY cr.jour, cr.ordre
  `);
  res.json(r.rows);
};

const saveAffectation = async (req, res) => {
  const { prof_id, classe_id, matiere_id, creneau_id } = req.body;
  try {
    const r = await pool.query(`
      INSERT INTO affectations (prof_id, classe_id, matiere_id, creneau_id)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (classe_id, creneau_id) DO UPDATE SET prof_id=$1, matiere_id=$3
      RETURNING *
    `, [prof_id, classe_id, matiere_id, creneau_id]);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteAffectation = async (req, res) => {
  await pool.query('DELETE FROM affectations WHERE id=$1', [req.params.id]);
  res.json({ message: 'Affectation supprimée' });
};

// Planning général (vue feuille 4)
const getPlanningGeneral = async (req, res) => {
  const profs = await pool.query("SELECT id, nom, prenom FROM utilisateurs WHERE role='prof' ORDER BY nom");
  const creneaux = await pool.query('SELECT * FROM creneaux ORDER BY jour, ordre');
  const affectations = await pool.query(`
    SELECT a.prof_id, a.creneau_id, c.nom as classe_nom, m.nom as matiere_nom
    FROM affectations a
    JOIN classes c ON c.id = a.classe_id
    LEFT JOIN matieres m ON m.id = a.matiere_id
  `);
  res.json({ profs: profs.rows, creneaux: creneaux.rows, affectations: affectations.rows });
};

// Planning d'un prof (vue feuille 5+)
const getPlanningProf = async (req, res) => {
  const { prof_id } = req.params;
  const prof = await pool.query('SELECT id, nom, prenom FROM utilisateurs WHERE id=$1', [prof_id]);
  const creneaux = await pool.query('SELECT * FROM creneaux ORDER BY jour, ordre');
  const affectations = await pool.query(`
    SELECT a.creneau_id, c.nom as classe_nom, m.nom as matiere_nom
    FROM affectations a
    JOIN classes c ON c.id = a.classe_id
    LEFT JOIN matieres m ON m.id = a.matiere_id
    WHERE a.prof_id=$1
  `, [prof_id]);
  const dispos = await pool.query('SELECT creneau_id, disponible FROM disponibilites WHERE prof_id=$1', [prof_id]);
  res.json({ prof: prof.rows[0], creneaux: creneaux.rows, affectations: affectations.rows, dispos: dispos.rows });
};

module.exports = { getCreneaux, getDisponibilites, saveDisponibilites, getPools, createPool, updatePool, deletePool, getAffectations, saveAffectation, deleteAffectation, getPlanningGeneral, getPlanningProf };