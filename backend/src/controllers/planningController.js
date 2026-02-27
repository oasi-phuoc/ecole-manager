const pool = require('../config/database');

const ORDRE_JOURS = "CASE jour WHEN 'Lundi' THEN 1 WHEN 'Mardi' THEN 2 WHEN 'Mercredi' THEN 3 WHEN 'Jeudi' THEN 4 WHEN 'Vendredi' THEN 5 END";

const getCreneaux = async (req, res) => {
  const r = await pool.query('SELECT * FROM creneaux ORDER BY ' + ORDRE_JOURS + ', ordre');
  res.json(r.rows);
};

const getDisponibilites = async (req, res) => {
  const r = await pool.query('SELECT creneau_id, disponible FROM disponibilites WHERE prof_id=$1', [req.params.prof_id]);
  res.json(r.rows);
};

const saveDisponibilites = async (req, res) => {
  const { prof_id } = req.params;
  const { disponibilites } = req.body;
  try {
    await pool.query('DELETE FROM disponibilites WHERE prof_id=$1', [prof_id]);
    for (const d of disponibilites) {
      await pool.query('INSERT INTO disponibilites (prof_id, creneau_id, disponible) VALUES ($1,$2,$3)', [prof_id, d.creneau_id, d.disponible]);
    }
    res.json({ message: 'Sauvegardé' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const getPools = async (req, res) => {
  const pools = await pool.query('SELECT * FROM pools ORDER BY nom');
  const result = [];
  for (const p of pools.rows) {
    const profs = await pool.query('SELECT u.id, u.nom, u.prenom FROM utilisateurs u JOIN pool_profs pp ON pp.prof_id=u.id WHERE pp.pool_id=$1', [p.id]);
    const classes = await pool.query('SELECT c.id, c.nom FROM classes c JOIN pool_classes pc ON pc.classe_id=c.id WHERE pc.pool_id=$1', [p.id]);
    const branches = await pool.query('SELECT m.id, m.nom, m.periodes_semaine FROM matieres m JOIN pool_branches pb ON pb.matiere_id=m.id WHERE pb.pool_id=$1', [p.id]);
    result.push({ ...p, profs: profs.rows, classes: classes.rows, branches: branches.rows });
  }
  res.json(result);
};

const createPool = async (req, res) => {
  const { nom, site, couleur, prof_ids, classe_ids, branche_ids, horaires } = req.body;
  try {
    const r = await pool.query('INSERT INTO pools (nom, site, couleur, horaires) VALUES ($1,$2,$3,$4) RETURNING *', [nom, site, couleur||'#1a73e8', JSON.stringify(horaires||[])]);
    const newPool = r.rows[0];
    for (const pid of (prof_ids||[])) await pool.query('INSERT INTO pool_profs (pool_id, prof_id) VALUES ($1,$2)', [newPool.id, pid]);
    for (const cid of (classe_ids||[])) await pool.query('INSERT INTO pool_classes (pool_id, classe_id) VALUES ($1,$2)', [newPool.id, cid]);
    for (const mid of (branche_ids||[])) await pool.query('INSERT INTO pool_branches (pool_id, matiere_id) VALUES ($1,$2)', [newPool.id, mid]);
    res.json(newPool);
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const updatePool = async (req, res) => {
  const { id } = req.params;
  const { nom, site, couleur, prof_ids, classe_ids, branche_ids, horaires } = req.body;
  try {
    await pool.query('UPDATE pools SET nom=$1, site=$2, couleur=$3, horaires=$4 WHERE id=$5', [nom, site, couleur, JSON.stringify(horaires||[]), id]);
    await pool.query('DELETE FROM pool_profs WHERE pool_id=$1', [id]);
    await pool.query('DELETE FROM pool_classes WHERE pool_id=$1', [id]);
    await pool.query('DELETE FROM pool_branches WHERE pool_id=$1', [id]);
    for (const pid of (prof_ids||[])) await pool.query('INSERT INTO pool_profs (pool_id, prof_id) VALUES ($1,$2)', [id, pid]);
    for (const cid of (classe_ids||[])) await pool.query('INSERT INTO pool_classes (pool_id, classe_id) VALUES ($1,$2)', [id, cid]);
    for (const mid of (branche_ids||[])) await pool.query('INSERT INTO pool_branches (pool_id, matiere_id) VALUES ($1,$2)', [id, mid]);
    res.json({ message: 'Pool mis à jour' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const deletePool = async (req, res) => {
  await pool.query('DELETE FROM pools WHERE id=$1', [req.params.id]);
  res.json({ message: 'Supprimé' });
};

const getClasseHoraires = async (req, res) => {
  const r = await pool.query('SELECT jour, periode FROM classe_horaires WHERE classe_id=$1', [req.params.classe_id]);
  res.json(r.rows);
};

const saveClasseHoraires = async (req, res) => {
  const { classe_id } = req.params;
  const { horaires } = req.body;
  try {
    await pool.query('DELETE FROM classe_horaires WHERE classe_id=$1', [classe_id]);
    for (const h of horaires) {
      await pool.query('INSERT INTO classe_horaires (classe_id, jour, periode) VALUES ($1,$2,$3)', [classe_id, h.jour, h.periode]);
    }
    res.json({ message: 'Sauvegardé' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const getAllClasseHoraires = async (req, res) => {
  const r = await pool.query('SELECT * FROM classe_horaires');
  res.json(r.rows);
};

const getAffectations = async (req, res) => {
  const r = await pool.query(`
    SELECT a.*, u.nom||' '||u.prenom as prof_nom, c.nom as classe_nom, m.nom as matiere_nom,
      cr.jour, cr.heure_debut, cr.heure_fin, cr.periode, cr.ordre
    FROM affectations a
    JOIN utilisateurs u ON u.id=a.prof_id
    JOIN classes c ON c.id=a.classe_id
    LEFT JOIN matieres m ON m.id=a.matiere_id
    JOIN creneaux cr ON cr.id=a.creneau_id
    ORDER BY ${ORDRE_JOURS.replace('jour','cr.jour')}, cr.ordre
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
    `, [prof_id||null, classe_id, matiere_id||null, creneau_id]);
    res.json(r.rows[0]);
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const deleteAffectation = async (req, res) => {
  await pool.query('DELETE FROM affectations WHERE id=$1', [req.params.id]);
  res.json({ message: 'Supprimé' });
};

const getPlanningBranches = async (req, res) => {
  const { pool_id } = req.query;
  let q = 'SELECT * FROM planning_branches WHERE 1=1';
  const params = [];
  if (pool_id) { params.push(pool_id); q += ' AND pool_id=$'+params.length; }
  const r = await pool.query(q, params);
  res.json(r.rows);
};

const savePlanningBranche = async (req, res) => {
  const { prof_id, classe_id, matiere_id, pool_id } = req.body;
  try {
    await pool.query(`
      INSERT INTO planning_branches (prof_id, classe_id, matiere_id, pool_id)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (classe_id, matiere_id, pool_id) DO UPDATE SET prof_id=$1
    `, [prof_id, classe_id, matiere_id, pool_id]);
    res.json({ message: 'Sauvegardé' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const deletePlanningBranche = async (req, res) => {
  await pool.query('DELETE FROM planning_branches WHERE classe_id=$1 AND matiere_id=$2 AND pool_id=$3', [req.body.classe_id, req.body.matiere_id, req.body.pool_id]);
  res.json({ message: 'Supprimé' });
};

const getPlanningGeneral = async (req, res) => {
  const { pool_id } = req.query;
  let profsQ = "SELECT id, nom, prenom FROM utilisateurs WHERE role='prof' ORDER BY nom";
  let profsP = [];
  if (pool_id) { profsQ = "SELECT u.id,u.nom,u.prenom FROM utilisateurs u JOIN pool_profs pp ON pp.prof_id=u.id WHERE pp.pool_id=$1 ORDER BY u.nom"; profsP=[pool_id]; }
  const profs = await pool.query(profsQ, profsP);
  const creneaux = await pool.query('SELECT * FROM creneaux ORDER BY '+ORDRE_JOURS+', ordre');
  const affectations = await pool.query('SELECT a.prof_id,a.creneau_id,c.nom as classe_nom,m.nom as matiere_nom FROM affectations a JOIN classes c ON c.id=a.classe_id LEFT JOIN matieres m ON m.id=a.matiere_id');
  const dispos = await pool.query('SELECT prof_id,creneau_id,disponible FROM disponibilites');
  res.json({ profs:profs.rows, creneaux:creneaux.rows, affectations:affectations.rows, dispos:dispos.rows });
};

const getPlanningProf = async (req, res) => {
  const { prof_id } = req.params;
  const prof = await pool.query('SELECT id,nom,prenom FROM utilisateurs WHERE id=$1', [prof_id]);
  const creneaux = await pool.query('SELECT * FROM creneaux ORDER BY '+ORDRE_JOURS+', ordre');
  const affectations = await pool.query('SELECT a.creneau_id,c.nom as classe_nom,m.nom as matiere_nom FROM affectations a JOIN classes c ON c.id=a.classe_id LEFT JOIN matieres m ON m.id=a.matiere_id WHERE a.prof_id=$1', [prof_id]);
  const dispos = await pool.query('SELECT creneau_id,disponible FROM disponibilites WHERE prof_id=$1', [prof_id]);
  res.json({ prof:prof.rows[0], creneaux:creneaux.rows, affectations:affectations.rows, dispos:dispos.rows });
};

const getPlanningClasse = async (req, res) => {
  const { classe_id } = req.params;
  const { pool_id } = req.query;
  const classe = await pool.query('SELECT id,nom FROM classes WHERE id=$1', [classe_id]);
  const creneaux = await pool.query('SELECT * FROM creneaux ORDER BY '+ORDRE_JOURS+', ordre');
  const affectations = await pool.query(`
    SELECT a.id, a.creneau_id, a.prof_id, a.matiere_id, u.nom||' '||u.prenom as prof_nom, m.nom as matiere_nom
    FROM affectations a
    JOIN utilisateurs u ON u.id=a.prof_id
    LEFT JOIN matieres m ON m.id=a.matiere_id
    WHERE a.classe_id=$1
  `, [classe_id]);
  const horaires = await pool.query('SELECT jour,periode FROM classe_horaires WHERE classe_id=$1', [classe_id]);
  let branches = [];
  if (pool_id) {
    const pb = await pool.query(`
      SELECT pb.prof_id, pb.matiere_id, m.nom as matiere_nom, m.periodes_semaine,
        u.nom||' '||u.prenom as prof_nom
      FROM planning_branches pb
      JOIN matieres m ON m.id=pb.matiere_id
      LEFT JOIN utilisateurs u ON u.id=pb.prof_id
      WHERE pb.classe_id=$1 AND pb.pool_id=$2
    `, [classe_id, pool_id]);
    branches = pb.rows;
  }
  res.json({ classe:classe.rows[0], creneaux:creneaux.rows, affectations:affectations.rows, horaires:horaires.rows, branches });
};

module.exports = { getCreneaux, getDisponibilites, saveDisponibilites, getPools, createPool, updatePool, deletePool, getClasseHoraires, saveClasseHoraires, getAllClasseHoraires, getAffectations, saveAffectation, deleteAffectation, getPlanningBranches, savePlanningBranche, deletePlanningBranche, getPlanningGeneral, getPlanningProf, getPlanningClasse };