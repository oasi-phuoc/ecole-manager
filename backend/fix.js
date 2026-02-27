const fs = require('fs');

fs.writeFileSync('./src/controllers/planningController.js', `
const pool = require('../config/database');

const getCreneaux = async (req, res) => {
  const r = await pool.query('SELECT * FROM creneaux ORDER BY CASE jour WHEN \\'Lundi\\' THEN 1 WHEN \\'Mardi\\' THEN 2 WHEN \\'Mercredi\\' THEN 3 WHEN \\'Jeudi\\' THEN 4 WHEN \\'Vendredi\\' THEN 5 END, ordre');
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
    result.push({ ...p, profs: profs.rows, classes: classes.rows });
  }
  res.json(result);
};

const createPool = async (req, res) => {
  const { nom, site, couleur, prof_ids, classe_ids } = req.body;
  try {
    const r = await pool.query('INSERT INTO pools (nom, site, couleur) VALUES ($1,$2,$3) RETURNING *', [nom, site, couleur || '#1a73e8']);
    const newPool = r.rows[0];
    for (const pid of (prof_ids || [])) await pool.query('INSERT INTO pool_profs (pool_id, prof_id) VALUES ($1,$2)', [newPool.id, pid]);
    for (const cid of (classe_ids || [])) await pool.query('INSERT INTO pool_classes (pool_id, classe_id) VALUES ($1,$2)', [newPool.id, cid]);
    res.json(newPool);
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const updatePool = async (req, res) => {
  const { id } = req.params;
  const { nom, site, couleur, prof_ids, classe_ids } = req.body;
  try {
    await pool.query('UPDATE pools SET nom=$1, site=$2, couleur=$3 WHERE id=$4', [nom, site, couleur, id]);
    await pool.query('DELETE FROM pool_profs WHERE pool_id=$1', [id]);
    await pool.query('DELETE FROM pool_classes WHERE pool_id=$1', [id]);
    for (const pid of (prof_ids || [])) await pool.query('INSERT INTO pool_profs (pool_id, prof_id) VALUES ($1,$2)', [id, pid]);
    for (const cid of (classe_ids || [])) await pool.query('INSERT INTO pool_classes (pool_id, classe_id) VALUES ($1,$2)', [id, cid]);
    res.json({ message: 'Pool mis à jour' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const deletePool = async (req, res) => {
  await pool.query('DELETE FROM pools WHERE id=$1', [req.params.id]);
  res.json({ message: 'Pool supprimé' });
};

const getClassePeriodes = async (req, res) => {
  const r = await pool.query('SELECT * FROM classe_periodes WHERE classe_id=$1', [req.params.classe_id]);
  res.json(r.rows);
};

const saveClassePeriodes = async (req, res) => {
  const { classe_id } = req.params;
  const { periodes } = req.body;
  try {
    await pool.query('DELETE FROM classe_periodes WHERE classe_id=$1', [classe_id]);
    for (const p of periodes) {
      await pool.query('INSERT INTO classe_periodes (classe_id, creneau_id, type_cours) VALUES ($1,$2,$3)', [classe_id, p.creneau_id, p.type_cours || 'cours']);
    }
    res.json({ message: 'Sauvegardé' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const getAffectations = async (req, res) => {
  const r = await pool.query(\`
    SELECT a.*, u.nom||' '||u.prenom as prof_nom, c.nom as classe_nom, m.nom as matiere_nom,
      cr.jour, cr.heure_debut, cr.heure_fin, cr.periode, cr.ordre
    FROM affectations a
    JOIN utilisateurs u ON u.id=a.prof_id
    JOIN classes c ON c.id=a.classe_id
    LEFT JOIN matieres m ON m.id=a.matiere_id
    JOIN creneaux cr ON cr.id=a.creneau_id
    ORDER BY CASE cr.jour WHEN 'Lundi' THEN 1 WHEN 'Mardi' THEN 2 WHEN 'Mercredi' THEN 3 WHEN 'Jeudi' THEN 4 WHEN 'Vendredi' THEN 5 END, cr.ordre
  \`);
  res.json(r.rows);
};

const saveAffectation = async (req, res) => {
  const { prof_id, classe_id, matiere_id, creneau_id, type_cours } = req.body;
  try {
    const r = await pool.query(\`
      INSERT INTO affectations (prof_id, classe_id, matiere_id, creneau_id)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (classe_id, creneau_id) DO UPDATE SET prof_id=$1, matiere_id=$3
      RETURNING *
    \`, [prof_id, classe_id, matiere_id || null, creneau_id]);
    res.json(r.rows[0]);
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const deleteAffectation = async (req, res) => {
  await pool.query('DELETE FROM affectations WHERE id=$1', [req.params.id]);
  res.json({ message: 'Supprimé' });
};

const getPlanningGeneral = async (req, res) => {
  const { pool_id } = req.query;
  let profsQuery = "SELECT id, nom, prenom FROM utilisateurs WHERE role='prof' ORDER BY nom";
  let profsParams = [];
  if (pool_id) {
    profsQuery = "SELECT u.id, u.nom, u.prenom FROM utilisateurs u JOIN pool_profs pp ON pp.prof_id=u.id WHERE pp.pool_id=$1 ORDER BY u.nom";
    profsParams = [pool_id];
  }
  const profs = await pool.query(profsQuery, profsParams);
  const creneaux = await pool.query('SELECT * FROM creneaux ORDER BY CASE jour WHEN \\'Lundi\\' THEN 1 WHEN \\'Mardi\\' THEN 2 WHEN \\'Mercredi\\' THEN 3 WHEN \\'Jeudi\\' THEN 4 WHEN \\'Vendredi\\' THEN 5 END, ordre');
  const affectations = await pool.query('SELECT a.prof_id, a.creneau_id, c.nom as classe_nom, m.nom as matiere_nom FROM affectations a JOIN classes c ON c.id=a.classe_id LEFT JOIN matieres m ON m.id=a.matiere_id');
  const dispos = await pool.query('SELECT prof_id, creneau_id, disponible FROM disponibilites');
  res.json({ profs: profs.rows, creneaux: creneaux.rows, affectations: affectations.rows, dispos: dispos.rows });
};

const getPlanningProf = async (req, res) => {
  const { prof_id } = req.params;
  const prof = await pool.query('SELECT id, nom, prenom FROM utilisateurs WHERE id=$1', [prof_id]);
  const creneaux = await pool.query('SELECT * FROM creneaux ORDER BY CASE jour WHEN \\'Lundi\\' THEN 1 WHEN \\'Mardi\\' THEN 2 WHEN \\'Mercredi\\' THEN 3 WHEN \\'Jeudi\\' THEN 4 WHEN \\'Vendredi\\' THEN 5 END, ordre');
  const affectations = await pool.query('SELECT a.creneau_id, c.nom as classe_nom, m.nom as matiere_nom FROM affectations a JOIN classes c ON c.id=a.classe_id LEFT JOIN matieres m ON m.id=a.matiere_id WHERE a.prof_id=$1', [prof_id]);
  const dispos = await pool.query('SELECT creneau_id, disponible FROM disponibilites WHERE prof_id=$1', [prof_id]);
  res.json({ prof: prof.rows[0], creneaux: creneaux.rows, affectations: affectations.rows, dispos: dispos.rows });
};

const getPlanningClasse = async (req, res) => {
  const { classe_id } = req.params;
  const classe = await pool.query('SELECT id, nom FROM classes WHERE id=$1', [classe_id]);
  const creneaux = await pool.query('SELECT * FROM creneaux ORDER BY CASE jour WHEN \\'Lundi\\' THEN 1 WHEN \\'Mardi\\' THEN 2 WHEN \\'Mercredi\\' THEN 3 WHEN \\'Jeudi\\' THEN 4 WHEN \\'Vendredi\\' THEN 5 END, ordre');
  const affectations = await pool.query(\`
    SELECT a.creneau_id, u.nom||' '||u.prenom as prof_nom, m.nom as matiere_nom
    FROM affectations a
    JOIN utilisateurs u ON u.id=a.prof_id
    LEFT JOIN matieres m ON m.id=a.matiere_id
    WHERE a.classe_id=$1
  \`, [classe_id]);
  const periodes = await pool.query('SELECT creneau_id, type_cours FROM classe_periodes WHERE classe_id=$1', [classe_id]);
  res.json({ classe: classe.rows[0], creneaux: creneaux.rows, affectations: affectations.rows, periodes: periodes.rows });
};

module.exports = { getCreneaux, getDisponibilites, saveDisponibilites, getPools, createPool, updatePool, deletePool, getClassePeriodes, saveClassePeriodes, getAffectations, saveAffectation, deleteAffectation, getPlanningGeneral, getPlanningProf, getPlanningClasse };
`.trim());

fs.writeFileSync('./src/routes/planning.js', `
const express = require('express');
const router = express.Router();
const c = require('../controllers/planningController');
const { verifierToken, autoriser } = require('../middleware/auth');

router.use(verifierToken);
router.get('/creneaux', c.getCreneaux);
router.get('/disponibilites/:prof_id', c.getDisponibilites);
router.post('/disponibilites/:prof_id', c.saveDisponibilites);
router.get('/pools', c.getPools);
router.post('/pools', autoriser('admin'), c.createPool);
router.put('/pools/:id', autoriser('admin'), c.updatePool);
router.delete('/pools/:id', autoriser('admin'), c.deletePool);
router.get('/classe-periodes/:classe_id', c.getClassePeriodes);
router.post('/classe-periodes/:classe_id', c.saveClassePeriodes);
router.get('/affectations', c.getAffectations);
router.post('/affectations', autoriser('admin'), c.saveAffectation);
router.delete('/affectations/:id', autoriser('admin'), c.deleteAffectation);
router.get('/general', c.getPlanningGeneral);
router.get('/prof/:prof_id', c.getPlanningProf);
router.get('/classe/:classe_id', c.getPlanningClasse);

module.exports = router;
`.trim());

console.log('Backend planning OK !');