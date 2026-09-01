import { createPool, json } from "../auth-fast-shared.ts";
import {
  BUCKETS,
  isSupabaseConfigured,
  removeObject,
  resolveContenu,
  safeFileName,
  uploadDataUrl,
} from "./storage.ts";
import { loadUser, parseJsonBody, requireAdmin, requireAuth } from "./middleware.ts";

export async function handleDocumentsAdministratifsRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    if (path === "/documents-administratifs" && req.method === "GET") {
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
      return json(cors, result.rows);
    }

    if (path === "/documents-administratifs" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { designation, nom_fichier, contenu, taille, categorie, sous_categorie } = body;
      if (!designation || !nom_fichier || !contenu) {
        return json(cors, { message: "Champs requis manquants" }, 400);
      }

      if (isSupabaseConfigured()) {
        const inserted = await pool.query(
          `INSERT INTO documents_administratifs (designation, nom_fichier, contenu, taille, auteur_id, categorie, sous_categorie, storage_path)
           VALUES ($1,$2,NULL,$3,$4,$5,$6,NULL)
           RETURNING id, designation, nom_fichier, taille, created_at, auteur_id, categorie, sous_categorie`,
          [
            designation,
            nom_fichier,
            taille || null,
            user!.id,
            categorie || "Administratifs",
            sous_categorie || null,
          ],
        );
        const doc = inserted.rows[0];
        const storagePath = `admin/${doc.id}_${safeFileName(nom_fichier)}`;
        try {
          await uploadDataUrl(BUCKETS.documentsAdmin, storagePath, String(contenu));
          await pool.query("UPDATE documents_administratifs SET storage_path=$1 WHERE id=$2", [
            storagePath,
            doc.id,
          ]);
        } catch (upErr) {
          await pool.query("DELETE FROM documents_administratifs WHERE id=$1", [doc.id]);
          throw upErr;
        }
        return json(cors, doc, 201);
      }

      const result = await pool.query(
        `INSERT INTO documents_administratifs (designation, nom_fichier, contenu, taille, auteur_id, categorie, sous_categorie)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, designation, nom_fichier, taille, created_at, auteur_id, categorie, sous_categorie`,
        [
          designation,
          nom_fichier,
          contenu,
          taille || null,
          user!.id,
          categorie || "Administratifs",
          sous_categorie || null,
        ],
      );
      return json(cors, result.rows[0], 201);
    }

    const telechargerMatch = path.match(/^\/documents-administratifs\/(\d+)\/telecharger$/);
    if (telechargerMatch && req.method === "GET") {
      const id = telechargerMatch[1];
      const result = await pool.query(
        "SELECT nom_fichier, contenu, storage_path FROM documents_administratifs WHERE id=$1",
        [id],
      );
      if (result.rows.length === 0) return json(cors, { message: "Document introuvable" }, 404);
      const row = result.rows[0];
      const dataUrl = await resolveContenu(row, BUCKETS.documentsAdmin);
      if (!dataUrl) return json(cors, { message: "Fichier introuvable" }, 404);
      return json(cors, { nom_fichier: row.nom_fichier, contenu: dataUrl });
    }

    const idMatch = path.match(/^\/documents-administratifs\/(\d+)$/);
    if (idMatch) {
      const id = idMatch[1];

      if (req.method === "PUT") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const body = await parseJsonBody(req);
        const { designation, nom_fichier, contenu, taille, categorie, sous_categorie } = body;
        if (!designation) return json(cors, { message: "La désignation est requise" }, 400);

        const current = await pool.query(
          "SELECT id, nom_fichier, contenu, taille, categorie, sous_categorie, storage_path FROM documents_administratifs WHERE id=$1",
          [id],
        );
        if (current.rows.length === 0) return json(cors, { message: "Document introuvable" }, 404);

        const old = current.rows[0];
        let storagePath: string | null = old.storage_path;
        let contenuDb: string | null = old.contenu;

        if (contenu && isSupabaseConfigured()) {
          const newPath = `admin/${old.id}_${safeFileName(nom_fichier || old.nom_fichier)}`;
          await uploadDataUrl(BUCKETS.documentsAdmin, newPath, String(contenu));
          if (old.storage_path && old.storage_path !== newPath) {
            await removeObject(BUCKETS.documentsAdmin, old.storage_path);
          }
          storagePath = newPath;
          contenuDb = null;
        } else if (contenu) {
          contenuDb = String(contenu);
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
            typeof taille === "number" ? taille : old.taille,
            categorie || old.categorie || "Administratifs",
            sous_categorie !== undefined ? sous_categorie : old.sous_categorie,
            storagePath,
            id,
          ],
        );
        return json(cors, result.rows[0]);
      }

      if (req.method === "DELETE") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const cur = await pool.query(
          "SELECT id, storage_path FROM documents_administratifs WHERE id=$1",
          [id],
        );
        if (cur.rows.length === 0) return json(cors, { message: "Document introuvable" }, 404);
        await removeObject(BUCKETS.documentsAdmin, cur.rows[0].storage_path);
        await pool.query("DELETE FROM documents_administratifs WHERE id=$1", [id]);
        return json(cors, { message: "Document supprimé" });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("documents-administratifs-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: "Erreur serveur", erreur: msg }, 500);
  } finally {
    await pool.end();
  }
}
