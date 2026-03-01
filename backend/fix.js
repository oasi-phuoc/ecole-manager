const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src', 'controllers', 'parametresController.js');
let ctrl = fs.readFileSync(controllerPath, 'utf8');

ctrl = ctrl.replace(
  `const resetTout = async (req, res) => {
  const tables = [
    'presences_v2', 'presences', 'absences',
    'notes', 'planning_branches', 'branches',
    'classe_horaires', 'planning_affectations', 'planning_pools', 'disponibilites',
    'paiements', 'comptabilite', 'calendrier', 'observations',
    'eleves', 'classes', 'profs',
    'messages', 'notifications'
  ];
  const erreurs = [];
  for (const table of tables) {
    try {
      await pool.query('DELETE FROM ' + table);
    } catch (err) {
      erreurs.push(table + ': ' + err.message);
    }
  }
  try {
    await pool.query("DELETE FROM utilisateurs WHERE role != 'admin'");
  } catch (err) { erreurs.push('utilisateurs: ' + err.message); }

  if (erreurs.length > 0) {
    return res.status(500).json({ message: 'Erreur lors du reset', erreur: erreurs.join(' | ') });
  }
  res.json({ message: 'Reset complet effectue' });
};`,
  `const resetTout = async (req, res) => {
  const tables = [
    'presences_v2', 'presences', 'absences',
    'notes', 'planning_branches', 'branches',
    'classe_horaires', 'planning_affectations', 'planning_pools', 'disponibilites',
    'paiements', 'comptabilite', 'calendrier', 'observations',
    'eleves', 'classes', 'profs',
    'messages', 'notifications'
  ];
  const resultats = [];
  for (const table of tables) {
    try {
      const r = await pool.query('DELETE FROM ' + table);
      resultats.push('OK:' + table + '(' + r.rowCount + ')');
    } catch (err) {
      resultats.push('ERR:' + table + ':' + err.message);
    }
  }
  try {
    const r = await pool.query("DELETE FROM utilisateurs WHERE role != 'admin'");
    resultats.push('OK:utilisateurs(' + r.rowCount + ')');
  } catch (err) { resultats.push('ERR:utilisateurs:' + err.message); }

  const erreurs = resultats.filter(r => r.startsWith('ERR'));
  res.json({
    message: erreurs.length === 0 ? 'Reset complet effectue' : 'Reset partiel - ' + erreurs.length + ' erreur(s)',
    details: resultats,
    erreurs: erreurs
  });
};`
);

fs.writeFileSync(controllerPath, ctrl, 'utf8');
console.log('✅ resetTout : retourne toujours 200 avec détail complet');