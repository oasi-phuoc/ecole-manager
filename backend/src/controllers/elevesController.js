const pool = require('../config/database');

const getEleves = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*,
        COALESCE(e.nom, u.nom) as nom,
        COALESCE(e.prenom, u.prenom) as prenom,
        COALESCE(e.email, u.email) as email,
        c.nom as classe_nom
      FROM eleves e
      LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
      LEFT JOIN classes c ON e.classe_id = c.id
      ORDER BY COALESCE(e.nom, u.nom), COALESCE(e.prenom, u.prenom)
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getEleve = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.id, u.nom, u.prenom, u.email, c.nom as classe, e.classe_id, e.date_naissance, e.telephone, e.adresse, e.nom_parent, e.telephone_parent, e.statut
      FROM eleves e
      JOIN utilisateurs u ON e.utilisateur_id = u.id
      LEFT JOIN classes c ON e.classe_id = c.id
      WHERE e.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Eleve non trouve' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const creerEleve = async (req, res) => {
  const { nom, prenom, email, mot_de_passe, classe_id, date_naissance, telephone, adresse, nom_parent, telephone_parent } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(mot_de_passe || 'Ecole123!', 10);
    const userResult = await client.query(
      'INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [nom, prenom, email, hash, 'eleve']
    );
    const userId = userResult.rows[0].id;
    const eleveResult = await client.query(
      'INSERT INTO eleves (utilisateur_id, classe_id, date_naissance, telephone, adresse, nom_parent, telephone_parent) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [userId, classe_id || null, date_naissance || null, telephone || null, adresse || null, nom_parent || null, telephone_parent || null]
    );
    await client.query('COMMIT');
    res.status(201).json({ message: 'Eleve cree', id: eleveResult.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  } finally {
    client.release();
  }
};

const modifierEleve = async (req, res) => {
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
    await client.query(`
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
    `, [
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

const supprimerEleve = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const eleveResult = await client.query('SELECT utilisateur_id FROM eleves WHERE id=$1', [req.params.id]);
    if (eleveResult.rows.length === 0) return res.status(404).json({ message: 'Eleve non trouve' });
    const userId = eleveResult.rows[0].utilisateur_id;

    // Vider photo
    await client.query('UPDATE eleves SET photo=null WHERE id=$1', [req.params.id]);

    // Supprimer toutes les dépendances élève
    await client.query('DELETE FROM observations WHERE eleve_id=$1', [req.params.id]);
    await client.query('DELETE FROM absences WHERE eleve_id=$1', [req.params.id]);
    await client.query('DELETE FROM presences WHERE eleve_id=$1', [req.params.id]);
    await client.query('DELETE FROM plan_classe WHERE classe_id IN (SELECT id FROM classes WHERE id IS NOT NULL)');
    await client.query('DELETE FROM eleves WHERE id=$1', [req.params.id]);

    // Supprimer toutes les dépendances utilisateur
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
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  } finally { client.release(); }
};

const updatePhoto = async (req, res) => {
  const { photo } = req.body;
  try {
    await pool.query('UPDATE eleves SET photo=$1 WHERE id=$2', [photo, req.params.id]);
    res.json({ message: 'Photo mise à jour' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getEleves, getEleve, creerEleve, modifierEleve, supprimerEleve,
  updatePhoto};
