const pool = require('../config/database');
const storage = require('../services/storageService');

const getDocumentsAdministratifs = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        d.id,
        d.designation,
        d.nom_fichier,
        d.taille,
        d.created_at,
        d.auteur_id,
        d.categorie,
        d.sous_categorie,
        u.nom AS auteur_nom,
        u.prenom AS auteur_prenom
      FROM documents_administratifs d
      LEFT JOIN utilisateurs u ON u.id = d.auteur_id
      ORDER BY LOWER(COALESCE(d.designation, d.nom_fichier, '')) ASC, d.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const creerDocumentAdministratif = async (req, res) => {
  const { designation, nom_fichier, contenu, taille, categorie, sous_categorie } = req.body;
  if (!designation || !nom_fichier || !contenu) {
    return res.status(400).json({ message: 'Champs requis manquants' });
  }
  try {
    if (storage.isSupabaseConfigured()) {
      const inserted = await pool.query(
        `INSERT INTO documents_administratifs (designation, nom_fichier, contenu, taille, auteur_id, categorie, sous_categorie, storage_path)
         VALUES ($1,$2,NULL,$3,$4,$5,$6,NULL)
         RETURNING id, designation, nom_fichier, taille, created_at, auteur_id, categorie, sous_categorie`,
        [designation, nom_fichier, taille || null, req.user.id, categorie || 'Administratifs', sous_categorie || null]
      );
      const doc = inserted.rows[0];
      const path = `admin/${doc.id}_${storage.safeFileName(nom_fichier)}`;
      try {
        await storage.uploadDataUrl(storage.BUCKETS.documentsAdmin, path, contenu);
        await pool.query('UPDATE documents_administratifs SET storage_path=$1 WHERE id=$2', [path, doc.id]);
      } catch (upErr) {
        await pool.query('DELETE FROM documents_administratifs WHERE id=$1', [doc.id]);
        throw upErr;
      }
      return res.status(201).json(doc);
    }

    const result = await pool.query(
      `INSERT INTO documents_administratifs (designation, nom_fichier, contenu, taille, auteur_id, categorie, sous_categorie)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, designation, nom_fichier, taille, created_at, auteur_id, categorie, sous_categorie`,
      [designation, nom_fichier, contenu, taille || null, req.user.id, categorie || 'Administratifs', sous_categorie || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const modifierDocumentAdministratif = async (req, res) => {
  const { designation, nom_fichier, contenu, taille, categorie, sous_categorie } = req.body;
  if (!designation) return res.status(400).json({ message: 'La désignation est requise' });
  try {
    const current = await pool.query(
      'SELECT id, nom_fichier, contenu, taille, categorie, sous_categorie, storage_path FROM documents_administratifs WHERE id=$1',
      [req.params.id]
    );
    if (current.rows.length === 0) return res.status(404).json({ message: 'Document introuvable' });

    const old = current.rows[0];
    let storagePath = old.storage_path;
    let contenuDb = old.contenu;

    if (contenu && storage.isSupabaseConfigured()) {
      const path = `admin/${old.id}_${storage.safeFileName(nom_fichier || old.nom_fichier)}`;
      await storage.uploadDataUrl(storage.BUCKETS.documentsAdmin, path, contenu);
      if (old.storage_path && old.storage_path !== path) {
        await storage.removeObject(storage.BUCKETS.documentsAdmin, old.storage_path);
      }
      storagePath = path;
      contenuDb = null;
    } else if (contenu) {
      contenuDb = contenu;
      storagePath = null;
    }

    const result = await pool.query(
      `UPDATE documents_administratifs
       SET designation=$1, nom_fichier=$2, contenu=$3, taille=$4, categorie=$5, sous_categorie=$6, storage_path=$7
       WHERE id=$8
       RETURNING id, designation, nom_fichier, taille, created_at, auteur_id, categorie, sous_categorie`,
      [
        designation,
        nom_fichier || old.nom_fichier,
        contenuDb,
        typeof taille === 'number' ? taille : old.taille,
        categorie || old.categorie || 'Administratifs',
        sous_categorie !== undefined ? sous_categorie : old.sous_categorie,
        storagePath,
        req.params.id
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const supprimerDocumentAdministratif = async (req, res) => {
  try {
    const cur = await pool.query(
      'SELECT id, storage_path FROM documents_administratifs WHERE id=$1',
      [req.params.id]
    );
    if (cur.rows.length === 0) return res.status(404).json({ message: 'Document introuvable' });
    await storage.removeObject(storage.BUCKETS.documentsAdmin, cur.rows[0].storage_path);
    await pool.query('DELETE FROM documents_administratifs WHERE id=$1', [req.params.id]);
    res.json({ message: 'Document supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const telechargerDocumentAdministratif = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT nom_fichier, contenu, storage_path FROM documents_administratifs WHERE id=$1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Document introuvable' });
    const row = result.rows[0];
    const dataUrl = await storage.resolveContenu(row, storage.BUCKETS.documentsAdmin);
    if (!dataUrl) return res.status(404).json({ message: 'Fichier introuvable' });
    res.json({ nom_fichier: row.nom_fichier, contenu: dataUrl });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = {
  getDocumentsAdministratifs,
  creerDocumentAdministratif,
  modifierDocumentAdministratif,
  supprimerDocumentAdministratif,
  telechargerDocumentAdministratif,
};
