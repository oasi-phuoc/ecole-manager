const fs = require('fs');
let ctrl = fs.readFileSync('./src/controllers/elevesController.js', 'utf8');

const start = ctrl.indexOf('const supprimerEleve');
const end = ctrl.indexOf('const updatePhoto');

const newDelete = `const supprimerEleve = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const eleveResult = await client.query('SELECT utilisateur_id FROM eleves WHERE id=$1', [req.params.id]);
    if (eleveResult.rows.length === 0) return res.status(404).json({ message: 'Eleve non trouve' });
    const userId = eleveResult.rows[0].utilisateur_id;

    // Vider photo
    await client.query('UPDATE eleves SET photo=null WHERE id=$1', [req.params.id]);

    // Supprimer TOUTES les dépendances élève
    await client.query('DELETE FROM presences WHERE eleve_id=$1', [req.params.id]);
    await client.query('DELETE FROM notes WHERE eleve_id=$1', [req.params.id]);
    await client.query('DELETE FROM paiements WHERE eleve_id=$1', [req.params.id]);
    await client.query('DELETE FROM observations WHERE eleve_id=$1', [req.params.id]);
    await client.query('DELETE FROM absences WHERE eleve_id=$1', [req.params.id]);
    await client.query('DELETE FROM eleves WHERE id=$1', [req.params.id]);

    // Supprimer utilisateur et ses dépendances
    if (userId) {
      await client.query('DELETE FROM messages WHERE expediteur_id=$1 OR destinataire_id=$1', [userId]);
      await client.query('DELETE FROM notifications WHERE utilisateur_id=$1', [userId]);
      await client.query('DELETE FROM observations WHERE auteur_id=$1', [userId]);
      await client.query('DELETE FROM utilisateurs WHERE id=$1', [userId]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Eleve supprime' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally { client.release(); }
};

`;

ctrl = ctrl.substring(0, start) + newDelete + ctrl.substring(end);
fs.writeFileSync('./src/controllers/elevesController.js', ctrl);
console.log('OK !');