const pool = require('../config/database');
const storage = require('../services/storageService');

const getEleves = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*,
        COALESCE(u.nom, e.nom) as nom,
        COALESCE(u.prenom, e.prenom) as prenom,
        u.email,
        c.nom as classe_nom,
        (SELECT COUNT(*)::int FROM observations o WHERE o.eleve_id = e.id) AS nb_observations,
        (SELECT COUNT(*)::int FROM sanctions_eleves s WHERE s.eleve_id = e.id) AS nb_sanctions
      FROM eleves e
      LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
      LEFT JOIN classes c ON e.classe_id = c.id
      ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)
    `);
    res.json(await storage.hydrateElevesPhotos(result.rows));
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const getEleve = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.id, u.nom, u.prenom, u.email, c.nom as classe, e.classe_id, e.date_naissance, e.sexe, e.nationalite, e.date_debut_cours, e.categorie, e.telephone, e.adresse, e.nom_parent, e.telephone_parent, e.statut
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
  const { nom, prenom, email, mot_de_passe, classe_id, date_naissance, sexe, nationalite, date_debut_cours, categorie, telephone, adresse, nom_parent, telephone_parent } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(mot_de_passe || 'EcoleManager2024!', 10);
    const emailFinal = email && email.trim() ? email.trim() : `eleve.${Date.now()}.${Math.random().toString(36).slice(2)}@ecole.local`;
    const userResult = await client.query(
      'INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [nom, prenom, emailFinal, hash, 'eleve']
    );
    const userId = userResult.rows[0].id;
    const eleveResult = await client.query(
      'INSERT INTO eleves (utilisateur_id, classe_id, date_naissance, sexe, nationalite, date_debut_cours, categorie, telephone, adresse, nom_parent, telephone_parent) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id',
      [userId, classe_id || null, date_naissance || null, sexe || null, nationalite || null, date_debut_cours || null, categorie || null, telephone || null, adresse || null, nom_parent || null, telephone_parent || null]
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
  const b = req.body;
  const {
    nom, prenom, email, classe_id, date_naissance, sexe, nationalite, date_debut_cours, categorie, telephone, adresse, nom_parent, telephone_parent, statut,
    oasi_prog_nom, oasi_prog_encadrant, oasi_n, oasi_ref, oasi_pos,
    oasi_nom, oasi_nais, oasi_nationalite,
    oasi_presence_date, oasi_jour_semaine, oasi_presence_periode, oasi_presence_type,
    oasi_remarque, oasi_controle_du, oasi_controle_au,
    oasi_prog_presences, oasi_prog_admin, oasi_as,
    oasi_prg_id, oasi_prg_occupation_id, oasi_ra_id, oasi_temps_reparti_id
  } = b;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const eleveResult = await client.query('SELECT * FROM eleves WHERE id=$1', [req.params.id]);
    if (eleveResult.rows.length === 0) return res.status(404).json({ message: 'Eleve non trouve' });
    const row = eleveResult.rows[0];
    const userId = row.utilisateur_id;

    const pick = (key, fallback) => (Object.prototype.hasOwnProperty.call(b, key) ? b[key] : fallback);
    const pickStr = (key) => {
      const v = pick(key, row[key]);
      return v === '' || v === undefined ? null : v;
    };
    const pickInt = (key) => {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return row[key];
      const v = b[key];
      if (v === '' || v === null || v === undefined) return null;
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    };

    const c_id = pick('classe_id', row.classe_id);
    const d_naiss = pick('date_naissance', row.date_naissance);
    const d_debut = pick('date_debut_cours', row.date_debut_cours);
    const cat = pick('categorie', row.categorie);
    const tel = pick('telephone', row.telephone);
    const adr = pick('adresse', row.adresse);
    const n_par = pick('nom_parent', row.nom_parent);
    const t_par = pick('telephone_parent', row.telephone_parent);
    const st = Object.prototype.hasOwnProperty.call(b, 'statut') ? (statut || 'actif') : (row.statut || 'actif');

    // Mettre à jour utilisateurs seulement si des champs profil sont fournis (évite d'écraser avec undefined)
    if (userId && (Object.prototype.hasOwnProperty.call(b, 'nom') || Object.prototype.hasOwnProperty.call(b, 'prenom') || Object.prototype.hasOwnProperty.call(b, 'email'))) {
      const uRow = await client.query('SELECT nom, prenom, email FROM utilisateurs WHERE id=$1', [userId]);
      const u = uRow.rows[0] || {};
      await client.query(
        'UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3 WHERE id=$4',
        [
          Object.prototype.hasOwnProperty.call(b, 'nom') ? nom : u.nom,
          Object.prototype.hasOwnProperty.call(b, 'prenom') ? prenom : u.prenom,
          Object.prototype.hasOwnProperty.call(b, 'email') ? (email || null) : u.email,
          userId
        ]
      );
    }

    // Conserver les champs OASI si le corps de requête ne les envoie pas (ex. bascule actif/inactif)
    await client.query(`
      UPDATE eleves SET
        classe_id=$1, date_naissance=$2, date_debut_cours=$3, categorie=$4,
        telephone=$5, adresse=$6, nom_parent=$7, telephone_parent=$8, statut=$9,
        oasi_prog_nom=$10, oasi_prog_encadrant=$11, oasi_n=$12, oasi_ref=$13, oasi_pos=$14,
        oasi_nom=$15, oasi_nais=$16, oasi_nationalite=$17,
        oasi_presence_date=$18, oasi_jour_semaine=$19, oasi_presence_periode=$20,
        oasi_presence_type=$21, oasi_remarque=$22, oasi_controle_du=$23, oasi_controle_au=$24,
        oasi_prog_presences=$25, oasi_prog_admin=$26, oasi_as=$27,
        oasi_prg_id=$28, oasi_prg_occupation_id=$29, oasi_ra_id=$30, oasi_temps_reparti_id=$31,
        nationalite=$32, sexe=$34
      WHERE id=$33
    `, [
      c_id ?? null, d_naiss || null, d_debut || null, cat || null,
      tel || null, adr || null, n_par || null, t_par || null, st,
      pickStr('oasi_prog_nom'), pickStr('oasi_prog_encadrant'),
      pickInt('oasi_n'), pickInt('oasi_ref'), pickInt('oasi_pos'),
      pickStr('oasi_nom'), pickStr('oasi_nais'), pickStr('oasi_nationalite'),
      pickStr('oasi_presence_date'), pickStr('oasi_jour_semaine'), pickStr('oasi_presence_periode'),
      pickStr('oasi_presence_type'), pickStr('oasi_remarque'), pickStr('oasi_controle_du'), pickStr('oasi_controle_au'),
      pickStr('oasi_prog_presences'), pickStr('oasi_prog_admin'), pickStr('oasi_as'),
      pickInt('oasi_prg_id'), pickInt('oasi_prg_occupation_id'), pickInt('oasi_ra_id'), pickInt('oasi_temps_reparti_id'),
      pickStr('nationalite'),
      req.params.id,
      Object.prototype.hasOwnProperty.call(b, 'sexe') ? (sexe || null) : row.sexe
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
    const eleveResult = await client.query(
      'SELECT utilisateur_id, photo_storage_path FROM eleves WHERE id=$1',
      [req.params.id]
    );
    if (eleveResult.rows.length === 0) return res.status(404).json({ message: 'Eleve non trouve' });
    const userId = eleveResult.rows[0].utilisateur_id;
    const photoPath = eleveResult.rows[0].photo_storage_path;

    const docs = await client.query(
      'SELECT storage_path FROM documents_eleves WHERE eleve_id=$1 AND storage_path IS NOT NULL',
      [req.params.id]
    );

    await client.query('UPDATE eleves SET photo=null, photo_storage_path=null WHERE id=$1', [req.params.id]);

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

    await storage.removeObject(storage.BUCKETS.elevesPhotos, photoPath);
    for (const d of docs.rows) {
      await storage.removeObject(storage.BUCKETS.documentsEleves, d.storage_path);
    }

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

    const current = await pool.query(
      'SELECT photo_storage_path FROM eleves WHERE id=$1',
      [req.params.id]
    );
    if (!current.rows.length) return res.status(404).json({ message: 'Eleve non trouve' });
    const oldPath = current.rows[0].photo_storage_path;

    if (photo === null || photo === undefined) {
      await storage.removeObject(storage.BUCKETS.elevesPhotos, oldPath);
      await pool.query(
        'UPDATE eleves SET photo=NULL, photo_storage_path=NULL WHERE id=$1',
        [req.params.id]
      );
      return res.json({ message: 'Photo mise à jour' });
    }

    if (storage.isSupabaseConfigured()) {
      const path = `eleves/${req.params.id}/photo_${Date.now()}.jpg`;
      await storage.uploadDataUrl(storage.BUCKETS.elevesPhotos, path, photo);
      await pool.query(
        'UPDATE eleves SET photo=NULL, photo_storage_path=$1 WHERE id=$2',
        [path, req.params.id]
      );
      if (oldPath && oldPath !== path) {
        await storage.removeObject(storage.BUCKETS.elevesPhotos, oldPath);
      }
    } else {
      await pool.query('UPDATE eleves SET photo=$1, photo_storage_path=NULL WHERE id=$2', [photo, req.params.id]);
    }
    res.json({ message: 'Photo mise à jour' });
  } catch (err) { res.status(500).json({ message: err.message }); }
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
    if (!contenu) return res.status(400).json({ message: 'Contenu manquant' });
    if (storage.isSupabaseConfigured()) {
      const inserted = await pool.query(
        `INSERT INTO documents_eleves (eleve_id, nom, type, contenu, taille, storage_path)
         VALUES ($1,$2,$3,NULL,$4,NULL) RETURNING id, nom, type, taille, created_at`,
        [req.params.id, nom, type || 'Autre', taille || null]
      );
      const doc = inserted.rows[0];
      const path = `eleves/${req.params.id}/${doc.id}_${storage.safeFileName(nom)}`;
      try {
        await storage.uploadDataUrl(storage.BUCKETS.documentsEleves, path, contenu);
        await pool.query('UPDATE documents_eleves SET storage_path=$1 WHERE id=$2', [path, doc.id]);
      } catch (upErr) {
        await pool.query('DELETE FROM documents_eleves WHERE id=$1', [doc.id]);
        throw upErr;
      }
      return res.status(201).json(doc);
    }
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
      'SELECT nom, contenu, storage_path FROM documents_eleves WHERE id=$1 AND eleve_id=$2',
      [req.params.docId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Document non trouvé' });
    const row = result.rows[0];
    const dataUrl = await storage.resolveContenu(row, storage.BUCKETS.documentsEleves);
    if (!dataUrl) return res.status(404).json({ message: 'Fichier introuvable' });
    res.json({ nom: row.nom, contenu: dataUrl });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur', erreur: err.message }); }
};

const supprimerDocumentEleve = async (req, res) => {
  try {
    const cur = await pool.query(
      'SELECT storage_path FROM documents_eleves WHERE id=$1 AND eleve_id=$2',
      [req.params.docId, req.params.id]
    );
    if (!cur.rows.length) return res.status(404).json({ message: 'Document non trouvé' });
    await storage.removeObject(storage.BUCKETS.documentsEleves, cur.rows[0].storage_path);
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

    const refDeja = await pool.query(
      'SELECT id FROM sanctions_eleves WHERE eleve_id=$1 AND observation_ref=$2 LIMIT 1',
      [req.params.id, ref]
    );
    if (refDeja.rows.length) return res.status(400).json({ message: 'Cette référence d\'observation est déjà utilisée pour une autre sanction' });

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

    const refDeja = await pool.query(
      'SELECT id FROM sanctions_eleves WHERE eleve_id=$1 AND observation_ref=$2 AND id <> $3 LIMIT 1',
      [req.params.id, ref, parseInt(req.params.sanctionId, 10)]
    );
    if (refDeja.rows.length) return res.status(400).json({ message: 'Cette référence d\'observation est déjà utilisée pour une autre sanction' });

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
