const fs = require('fs');
let ctrl = fs.readFileSync('./src/controllers/elevesController.js', 'utf8');

const start = ctrl.indexOf('const modifierEleve');
const end = ctrl.indexOf('const supprimerEleve');
const newModifier = `const modifierEleve = async (req, res) => {
  const {
    nom, prenom, email, classe_id, date_naissance, telephone, adresse, nom_parent, telephone_parent, statut,
    oasi_prog_nom, oasi_prog_encadrant, oasi_n, oasi_ref, oasi_pos,
    oasi_nom, oasi_nais, oasi_nationalite,
    oasi_presence_date, oasi_jour_semaine, oasi_presence_periode, oasi_presence_type,
    oasi_remarque, oasi_controle_du, oasi_controle_au,
    oasi_prog_presences, oasi_prog_admin, oasi_as,
    oasi_prg_id, oasi_prg_occupation_id, oasi_ra_id, oasi_temps_reparti_id
  } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const eleveResult = await client.query('SELECT utilisateur_id FROM eleves WHERE id=$1', [req.params.id]);
    if (eleveResult.rows.length === 0) return res.status(404).json({ message: 'Eleve non trouve' });
    const userId = eleveResult.rows[0].utilisateur_id;

    // Mettre à jour utilisateurs seulement si existe
    if (userId) {
      await client.query(
        'UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3 WHERE id=$4',
        [nom, prenom, email||null, userId]
      );
    }

    // Mettre à jour eleves avec tous les champs
    await client.query(\`
      UPDATE eleves SET
        nom=$1, prenom=$2, email=$3, classe_id=$4, date_naissance=$5,
        telephone=$6, adresse=$7, nom_parent=$8, telephone_parent=$9, statut=$10,
        oasi_prog_nom=$11, oasi_prog_encadrant=$12, oasi_n=$13, oasi_ref=$14, oasi_pos=$15,
        oasi_nom=$16, oasi_nais=$17, oasi_nationalite=$18,
        oasi_presence_date=$19, oasi_jour_semaine=$20, oasi_presence_periode=$21,
        oasi_presence_type=$22, oasi_remarque=$23, oasi_controle_du=$24, oasi_controle_au=$25,
        oasi_prog_presences=$26, oasi_prog_admin=$27, oasi_as=$28,
        oasi_prg_id=$29, oasi_prg_occupation_id=$30, oasi_ra_id=$31, oasi_temps_reparti_id=$32
      WHERE id=$33
    \`, [
      nom, prenom, email||null, classe_id||null, date_naissance||null,
      telephone||null, adresse||null, nom_parent||null, telephone_parent||null, statut||'actif',
      oasi_prog_nom||null, oasi_prog_encadrant||null,
      oasi_n?parseInt(oasi_n):null, oasi_ref?parseInt(oasi_ref):null, oasi_pos?parseInt(oasi_pos):null,
      oasi_nom||null, oasi_nais||null, oasi_nationalite||null,
      oasi_presence_date||null, oasi_jour_semaine||null, oasi_presence_periode||null,
      oasi_presence_type||null, oasi_remarque||null, oasi_controle_du||null, oasi_controle_au||null,
      oasi_prog_presences||null, oasi_prog_admin||null, oasi_as||null,
      oasi_prg_id?parseInt(oasi_prg_id):null, oasi_prg_occupation_id?parseInt(oasi_prg_occupation_id):null,
      oasi_ra_id?parseInt(oasi_ra_id):null, oasi_temps_reparti_id?parseInt(oasi_temps_reparti_id):null,
      req.params.id
    ]);

    await client.query('COMMIT');
    res.json({ message: 'Eleve modifie' });
  } catch(err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  } finally { client.release(); }
};

`;

ctrl = ctrl.substring(0, start) + newModifier + ctrl.substring(end);
fs.writeFileSync('./src/controllers/elevesController.js', ctrl);
console.log('modifierEleve OK !');