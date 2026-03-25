const pool = require('../config/database');

const getEleves = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*,
        u.nom, u.prenom, u.email,
        c.nom as classe_nom
      FROM eleves e
      LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
      LEFT JOIN classes c ON e.classe_id = c.id
      ORDER BY u.nom, u.prenom
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getEleve = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.id, u.nom, u.prenom, u.email, c.nom as classe, e.classe_id, e.date_naissance, e.date_debut_cours, e.categorie, e.telephone, e.adresse, e.nom_parent, e.telephone_parent, e.statut
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
  const { nom, prenom, email, mot_de_passe, classe_id, date_naissance, date_debut_cours, categorie, telephone, adresse, nom_parent, telephone_parent } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(mot_de_passe || 'Ecole123!', 10);
    const emailFinal = email && email.trim() ? email.trim() : `eleve.${Date.now()}.${Math.random().toString(36).slice(2)}@ecole.local`;
    const userResult = await client.query(
      'INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [nom, prenom, emailFinal, hash, 'eleve']
    );
    const userId = userResult.rows[0].id;
    const eleveResult = await client.query(
      'INSERT INTO eleves (utilisateur_id, classe_id, date_naissance, date_debut_cours, categorie, telephone, adresse, nom_parent, telephone_parent) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      [userId, classe_id || null, date_naissance || null, date_debut_cours || null, categorie || null, telephone || null, adresse || null, nom_parent || null, telephone_parent || null]
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
    nom, prenom, email, classe_id, date_naissance, date_debut_cours, categorie, telephone, adresse, nom_parent, telephone_parent, statut,
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

    // Mettre à jour eleves avec tous les champs (nom/prenom/email sont dans utilisateurs)
    await client.query(`
      UPDATE eleves SET
        classe_id=$1, date_naissance=$2, date_debut_cours=$3, categorie=$4,
        telephone=$5, adresse=$6, nom_parent=$7, telephone_parent=$8, statut=$9,
        oasi_prog_nom=$10, oasi_prog_encadrant=$11, oasi_n=$12, oasi_ref=$13, oasi_pos=$14,
        oasi_nom=$15, oasi_nais=$16, oasi_nationalite=$17,
        oasi_presence_date=$18, oasi_jour_semaine=$19, oasi_presence_periode=$20,
        oasi_presence_type=$21, oasi_remarque=$22, oasi_controle_du=$23, oasi_controle_au=$24,
        oasi_prog_presences=$25, oasi_prog_admin=$26, oasi_as=$27,
        oasi_prg_id=$28, oasi_prg_occupation_id=$29, oasi_ra_id=$30, oasi_temps_reparti_id=$31
      WHERE id=$32
    `, [
      classe_id||null, date_naissance||null, date_debut_cours||null, categorie||null,
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

    // Supprimer TOUTES les dépendances élève
    await client.query('DELETE FROM presences WHERE eleve_id=$1', [req.params.id]);
    await client.query('DELETE FROM notes WHERE eleve_id=$1', [req.params.id]);
    await client.query('DELETE FROM paiements WHERE eleve_id=$1', [req.params.id]);
    await client.query('DELETE FROM observations WHERE eleve_id=$1', [req.params.id]);
    await client.query('DELETE FROM absences WHERE eleve_id=$1', [req.params.id]);
    await client.query('DELETE FROM sanctions_eleves WHERE eleve_id=$1', [req.params.id]);
    await client.query('DELETE FROM documents_eleves WHERE eleve_id=$1', [req.params.id]);
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

const updatePhoto = async (req, res) => {
  const { photo } = req.body;
  try {
    if (photo !== null && photo !== undefined) {
      if (typeof photo !== 'string') {
        return res.status(400).json({ message: 'Format photo invalide' });
      }
      if (!photo.startsWith('data:image/')) {
        return res.status(400).json({ message: 'Le fichier doit etre une image' });
      }
    }
    await pool.query('UPDATE eleves SET photo=$1 WHERE id=$2', [photo, req.params.id]);
    res.json({ message: 'Photo mise à jour' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const getElevesOASI = async (req, res) => {
  try {
    const { classe_id } = req.query;
    const result = await pool.query(`
      SELECT e.id, u.nom, u.prenom,
        e.oasi_prog_nom, e.oasi_prog_encadrant, e.oasi_prog_encadrant as oasi_encadrant, e.oasi_n, e.oasi_ref, e.oasi_pos,
        e.oasi_nom as oasi_nom_complet, e.oasi_nais, e.oasi_nationalite,
        e.oasi_prog_presences, e.oasi_prog_admin, e.oasi_as,
        e.oasi_prg_id, e.oasi_prg_occupation_id, e.oasi_ra_id, e.oasi_temps_reparti_id
      FROM eleves e
      LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
      WHERE e.classe_id = $1 AND (e.statut = 'actif' OR e.statut = 'Actif')
      ORDER BY u.nom, u.prenom
    `, [classe_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getDocumentsEleve = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nom, type, taille, created_at FROM documents_eleves WHERE eleve_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const uploadDocumentEleve = async (req, res) => {
  const { nom, type, contenu, taille } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO documents_eleves (eleve_id, nom, type, contenu, taille) VALUES ($1,$2,$3,$4,$5) RETURNING id, nom, type, taille, created_at',
      [req.params.id, nom, type || 'Autre', contenu, taille || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const telechargerDocumentEleve = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT nom, contenu FROM documents_eleves WHERE id=$1 AND eleve_id=$2',
      [req.params.docId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Document non trouvé' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const supprimerDocumentEleve = async (req, res) => {
  try {
    await pool.query('DELETE FROM documents_eleves WHERE id=$1 AND eleve_id=$2', [req.params.docId, req.params.id]);
    res.json({ message: 'Document supprimé' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const getSanctionsEleve = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, echelle, infraction, niveau, date_sanction, prof_nom, observation_ref, created_at FROM sanctions_eleves WHERE eleve_id=$1 ORDER BY echelle, infraction, niveau',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const ajouterSanction = async (req, res) => {
  const { echelle, infraction, niveau, date_sanction, prof_nom, observation_ref } = req.body;
  try {
    const ref = String(observation_ref || '').trim();
    if (!ref) return res.status(400).json({ message: "Référence d'observation obligatoire pour valider la sanction" });
    const refExiste = await pool.query(
      'SELECT id FROM observations WHERE eleve_id=$1 AND reference_obs=$2 LIMIT 1',
      [req.params.id, ref]
    );
    if (!refExiste.rows.length) return res.status(400).json({ message: "Référence d'observation invalide pour cet élève" });

    const exists = await pool.query(
      'SELECT id FROM sanctions_eleves WHERE eleve_id=$1 AND echelle=$2 AND infraction=$3 AND niveau=$4',
      [req.params.id, echelle, infraction, niveau]
    );
    if (exists.rows.length > 0) return res.status(409).json({ message: 'Sanction déjà enregistrée' });
    const result = await pool.query(
      'INSERT INTO sanctions_eleves (eleve_id, echelle, infraction, niveau, date_sanction, prof_nom, observation_ref) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.params.id, echelle, infraction, niveau, date_sanction || null, prof_nom || null, ref]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const modifierSanction = async (req, res) => {
  const { date_sanction, prof_nom, observation_ref } = req.body;
  try {
    const ref = String(observation_ref || '').trim();
    if (!ref) return res.status(400).json({ message: "Référence d'observation obligatoire pour valider la sanction" });
    const refExiste = await pool.query(
      'SELECT id FROM observations WHERE eleve_id=$1 AND reference_obs=$2 LIMIT 1',
      [req.params.id, ref]
    );
    if (!refExiste.rows.length) return res.status(400).json({ message: "Référence d'observation invalide pour cet élève" });

    const result = await pool.query(
      'UPDATE sanctions_eleves SET date_sanction=$1, prof_nom=$2, observation_ref=$3 WHERE id=$4 AND eleve_id=$5 RETURNING *',
      [date_sanction || null, prof_nom || null, ref, req.params.sanctionId, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Sanction non trouvée' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const supprimerSanction = async (req, res) => {
  try {
    await pool.query('DELETE FROM sanctions_eleves WHERE id=$1 AND eleve_id=$2', [req.params.sanctionId, req.params.id]);
    res.json({ message: 'Sanction supprimée' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

module.exports = { getEleves, getEleve, creerEleve, modifierEleve, supprimerEleve, updatePhoto, getElevesOASI, getDocumentsEleve, uploadDocumentEleve, telechargerDocumentEleve, supprimerDocumentEleve, getSanctionsEleve, ajouterSanction, modifierSanction, supprimerSanction };
