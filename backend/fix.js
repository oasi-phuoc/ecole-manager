const fs = require('fs');

// ===== CLASSES CONTROLLER =====
fs.writeFileSync('./src/controllers/classesController.js', `const pool = require('../config/database');

const getClasses = async (req, res) => {
  try {
    const result = await pool.query(\`
      SELECT c.*, u.nom as prof_nom, u.prenom as prof_prenom,
        COUNT(DISTINCT e.id) as nb_eleves
      FROM classes c
      LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
      LEFT JOIN eleves e ON e.classe_id=c.id
      GROUP BY c.id, u.nom, u.prenom
      ORDER BY c.nom
    \`);
    res.json(result.rows);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const getClasse = async (req, res) => {
  try {
    const result = await pool.query(\`
      SELECT c.*, u.nom as prof_nom, u.prenom as prof_prenom
      FROM classes c LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
      WHERE c.id=$1\`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Classe non trouvée' });
    res.json(result.rows[0]);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const getElevesClasse = async (req, res) => {
  try {
    const eleves = await pool.query(\`
      SELECT e.*,
        COUNT(DISTINCT a.id) FILTER (WHERE a.type='absence') as nb_absences,
        COUNT(DISTINCT a.id) FILTER (WHERE a.type='absence' AND a.excusee=true) as nb_excuses,
        COUNT(DISTINCT a.id) FILTER (WHERE a.type='retard') as nb_retards
      FROM eleves e
      LEFT JOIN absences a ON a.eleve_id=e.id
      WHERE e.classe_id=$1
      GROUP BY e.id
      ORDER BY e.nom, e.prenom
    \`, [req.params.id]);
    res.json(eleves.rows);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const creerClasse = async (req, res) => {
  const { nom, niveau, annee_scolaire, prof_principal_id } = req.body;
  if (!nom) return res.status(400).json({ message: 'Le nom est requis' });
  if (!annee_scolaire) return res.status(400).json({ message: "L'année scolaire est requise" });
  try {
    const r = await pool.query(
      'INSERT INTO classes (nom, niveau, annee_scolaire, prof_principal_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [nom, niveau||null, annee_scolaire, prof_principal_id||null]
    );
    res.status(201).json(r.rows[0]);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const modifierClasse = async (req, res) => {
  const { nom, niveau, annee_scolaire, prof_principal_id, actif } = req.body;
  try {
    const r = await pool.query(
      'UPDATE classes SET nom=$1, niveau=$2, annee_scolaire=$3, prof_principal_id=$4, actif=$5 WHERE id=$6 RETURNING *',
      [nom, niveau||null, annee_scolaire, prof_principal_id||null, actif!==undefined?actif:true, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Classe non trouvée' });
    res.json(r.rows[0]);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const supprimerClasse = async (req, res) => {
  try {
    await pool.query('DELETE FROM classes WHERE id=$1', [req.params.id]);
    res.json({ message: 'Classe supprimée' });
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

module.exports = { getClasses, getClasse, getElevesClasse, creerClasse, modifierClasse, supprimerClasse };`);
console.log('classesController OK');

// ===== OBSERVATIONS CONTROLLER =====
fs.writeFileSync('./src/controllers/observationsController.js', `const pool = require('../config/database');

const getObservations = async (req, res) => {
  try {
    const r = await pool.query(\`
      SELECT o.*, u.nom as auteur_nom, u.prenom as auteur_prenom
      FROM observations o
      LEFT JOIN utilisateurs u ON u.id=o.auteur_id
      WHERE o.eleve_id=$1
      ORDER BY o.created_at DESC
    \`, [req.params.eleve_id]);
    res.json(r.rows);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const creerObservation = async (req, res) => {
  const { titre, contenu } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO observations (eleve_id, titre, contenu, auteur_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.eleve_id, titre, contenu, req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const supprimerObservation = async (req, res) => {
  try {
    await pool.query('DELETE FROM observations WHERE id=$1', [req.params.id]);
    res.json({ message: 'Observation supprimée' });
  } catch(err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

module.exports = { getObservations, creerObservation, supprimerObservation };`);
console.log('observationsController OK');

// ===== ROUTES CLASSES =====
let classesRoutes = fs.readFileSync('./src/routes/classes.js', 'utf8');
if (!classesRoutes.includes('eleves-classe')) {
  classesRoutes = classesRoutes.replace(
    "module.exports = router;",
    `const cc = require('../controllers/classesController');
router.get('/:id/eleves', cc.getElevesClasse);
module.exports = router;`
  );
  fs.writeFileSync('./src/routes/classes.js', classesRoutes);
  console.log('classes routes OK');
}

// ===== ROUTES OBSERVATIONS =====
fs.writeFileSync('./src/routes/observations.js', `const express = require('express');
const router = express.Router();
const { verifierToken } = require('../middleware/auth');
const { getObservations, creerObservation, supprimerObservation } = require('../controllers/observationsController');

router.use(verifierToken);
router.get('/eleve/:eleve_id', getObservations);
router.post('/eleve/:eleve_id', creerObservation);
router.delete('/:id', supprimerObservation);

module.exports = router;`);
console.log('observations routes OK');

// ===== SERVER.JS - ajouter route observations =====
let server = fs.readFileSync('./server.js', 'utf8');
if (!server.includes('observations')) {
  server = server.replace(
    "app.use('/api/planning'",
    "app.use('/api/observations', require('./src/routes/observations'));\napp.use('/api/planning'"
  );
  fs.writeFileSync('./server.js', server);
  console.log('server.js OK');
}