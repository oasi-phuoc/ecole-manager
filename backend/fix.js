const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src', 'controllers', 'parametresController.js');
let ctrl = fs.readFileSync(controllerPath, 'utf8');

// Remplacer le resetTout par une version qui supprime table par table avec gestion d'erreur individuelle
ctrl = ctrl.replace(
  `const resetTout = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM presences_v2');
    await client.query('DELETE FROM presences');
    await client.query('DELETE FROM absences');
    await client.query('DELETE FROM notes');
    await client.query('DELETE FROM planning_branches');
    await client.query('DELETE FROM branches');
    await client.query('DELETE FROM classe_horaires');
    await client.query('DELETE FROM planning_affectations');
    await client.query('DELETE FROM planning_pools');
    await client.query('DELETE FROM disponibilites');
    await client.query('DELETE FROM paiements');
    await client.query('DELETE FROM comptabilite');
    await client.query('DELETE FROM calendrier');
    await client.query('DELETE FROM observations');
    await client.query('DELETE FROM eleves');
    await client.query('DELETE FROM classes');
    await client.query('DELETE FROM profs');
    await client.query("DELETE FROM utilisateurs WHERE role != 'admin'");
    await client.query('DELETE FROM messages');
    await client.query('DELETE FROM notifications');
    await client.query('COMMIT');
    res.json({ message: 'Reset complet effectue' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Erreur lors du reset', erreur: err.message });
  } finally { client.release(); }
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
};`
);

fs.writeFileSync(controllerPath, ctrl, 'utf8');
console.log('✅ resetTout : version table par table avec erreur détaillée');