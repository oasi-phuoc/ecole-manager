const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src', 'controllers', 'elevesController.js');
let ctrl = fs.readFileSync(controllerPath, 'utf8');

ctrl = ctrl.replace(
  `const getElevesOASI = async (req, res) => {
  try {
    const { classe_id } = req.query;
    const result = await pool.query(\`
      SELECT e.id, e.nom, e.prenom,
        e.oasi_prog_nom, e.oasi_encadrant, e.oasi_n, e.oasi_ref, e.oasi_pos,
        e.oasi_nom_complet, e.oasi_nais, e.oasi_nationalite,
        e.oasi_prog_presences, e.oasi_prog_admin, e.oasi_as,
        e.oasi_prg_id, e.oasi_prg_occupation_id, e.oasi_ra_id, e.oasi_temps_reparti_id
      FROM eleves e
      WHERE e.classe_id = $1 AND (e.statut = 'actif' OR e.statut = 'Actif')
      ORDER BY e.nom, e.prenom
    \`, [classe_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};`,
  `const getElevesOASI = async (req, res) => {
  try {
    const { classe_id } = req.query;
    const result = await pool.query(\`
      SELECT e.id, e.nom, e.prenom,
        e.oasi_prog_nom, e.oasi_encadrant, e.oasi_n, e.oasi_ref, e.oasi_pos,
        e.oasi_nom as oasi_nom_complet, e.oasi_nais, e.oasi_nationalite,
        e.oasi_prog_presences, e.oasi_prog_admin, e.oasi_as,
        e.oasi_prg_id, e.oasi_prg_occupation_id, e.oasi_ra_id, e.oasi_temps_reparti_id
      FROM eleves e
      WHERE e.classe_id = $1 AND (e.statut = 'actif' OR e.statut = 'Actif')
      ORDER BY e.nom, e.prenom
    \`, [classe_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};`
);

fs.writeFileSync(controllerPath, ctrl, 'utf8');
console.log('✅ getElevesOASI corrigé : oasi_nom → oasi_nom_complet');