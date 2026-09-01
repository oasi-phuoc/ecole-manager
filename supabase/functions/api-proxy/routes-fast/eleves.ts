import bcrypt from "npm:bcryptjs@2";
import type { Pool } from "npm:pg@8";
import { createPool, json } from "../auth-fast-shared.ts";
import {
  BUCKETS,
  hydrateElevesPhotos,
  isSupabaseConfigured,
  removeObject,
  resolveContenu,
  safeFileName,
  uploadDataUrl,
} from "./storage.ts";
import { loadUser, parseJsonBody, requireAdmin, requireAuth } from "./middleware.ts";

function pick<T>(b: Record<string, unknown>, key: string, fallback: T): T {
  return Object.prototype.hasOwnProperty.call(b, key) ? (b[key] as T) : fallback;
}

function pickStr(b: Record<string, unknown>, key: string, row: Record<string, unknown>): string | null {
  const v = pick(b, key, row[key]);
  return v === "" || v === undefined ? null : String(v);
}

function pickInt(b: Record<string, unknown>, key: string, row: Record<string, unknown>): number | null {
  if (!Object.prototype.hasOwnProperty.call(b, key)) return row[key] as number | null;
  const v = b[key];
  if (v === "" || v === null || v === undefined) return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

async function supprimerEleveTransaction(pool: Pool, eleveId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const eleveResult = await client.query(
      "SELECT utilisateur_id, photo_storage_path FROM eleves WHERE id=$1",
      [eleveId],
    );
    if (eleveResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }
    const userId = eleveResult.rows[0].utilisateur_id;
    const photoPath = eleveResult.rows[0].photo_storage_path;

    const docs = await client.query(
      "SELECT storage_path FROM documents_eleves WHERE eleve_id=$1 AND storage_path IS NOT NULL",
      [eleveId],
    );

    await client.query("UPDATE eleves SET photo=null, photo_storage_path=null WHERE id=$1", [eleveId]);
    await client.query("DELETE FROM presences WHERE eleve_id=$1", [eleveId]);
    await client.query("DELETE FROM notes WHERE eleve_id=$1", [eleveId]);
    await client.query("DELETE FROM paiements WHERE eleve_id=$1", [eleveId]);
    await client.query("DELETE FROM observations WHERE eleve_id=$1", [eleveId]);
    await client.query("DELETE FROM absences WHERE eleve_id=$1", [eleveId]);
    await client.query("DELETE FROM sanctions_eleves WHERE eleve_id=$1", [eleveId]);
    await client.query("DELETE FROM documents_eleves WHERE eleve_id=$1", [eleveId]);
    await client.query("DELETE FROM eleves WHERE id=$1", [eleveId]);

    if (userId) {
      await client.query("DELETE FROM messages WHERE expediteur_id=$1 OR destinataire_id=$1", [userId]);
      await client.query("DELETE FROM notifications WHERE utilisateur_id=$1", [userId]);
      await client.query("DELETE FROM observations WHERE auteur_id=$1", [userId]);
      await client.query("DELETE FROM utilisateurs WHERE id=$1", [userId]);
    }

    await client.query("COMMIT");

    await removeObject(BUCKETS.elevesPhotos, photoPath);
    for (const d of docs.rows) {
      await removeObject(BUCKETS.documentsEleves, d.storage_path);
    }

    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function handleElevesRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
  url: URL,
): Promise<Response> {
  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    if (path === "/eleves" && req.method === "GET") {
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
      return json(cors, await hydrateElevesPhotos(result.rows));
    }

    if (path === "/eleves" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const {
        nom,
        prenom,
        email,
        mot_de_passe,
        classe_id,
        date_naissance,
        sexe,
        nationalite,
        date_debut_cours,
        categorie,
        telephone,
        adresse,
        nom_parent,
        telephone_parent,
      } = body;

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const hash = await bcrypt.hash(String(mot_de_passe || "EcoleManager2024!"), 10);
        const emailFinal =
          email && String(email).trim()
            ? String(email).trim()
            : `eleve.${Date.now()}.${Math.random().toString(36).slice(2)}@ecole.local`;
        const userResult = await client.query(
          "INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES ($1,$2,$3,$4,$5) RETURNING id",
          [nom, prenom, emailFinal, hash, "eleve"],
        );
        const userId = userResult.rows[0].id;
        const eleveResult = await client.query(
          "INSERT INTO eleves (utilisateur_id, classe_id, date_naissance, sexe, nationalite, date_debut_cours, categorie, telephone, adresse, nom_parent, telephone_parent) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id",
          [
            userId,
            classe_id || null,
            date_naissance || null,
            sexe || null,
            nationalite || null,
            date_debut_cours || null,
            categorie || null,
            telephone || null,
            adresse || null,
            nom_parent || null,
            telephone_parent || null,
          ],
        );
        await client.query("COMMIT");
        return json(cors, { message: "Eleve cree", id: eleveResult.rows[0].id }, 201);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    if (path === "/eleves/oasi" && req.method === "GET") {
      const classe_id = url.searchParams.get("classe_id");
      const result = await pool.query(
        `
        SELECT e.id, u.nom, u.prenom,
          e.oasi_prog_nom, e.oasi_prog_encadrant, e.oasi_prog_encadrant as oasi_encadrant, e.oasi_n, e.oasi_ref, e.oasi_pos,
          e.oasi_nom as oasi_nom_complet, e.oasi_nais, e.oasi_nationalite,
          e.oasi_prog_presences, e.oasi_prog_admin, e.oasi_as,
          e.oasi_prg_id, e.oasi_prg_occupation_id, e.oasi_ra_id, e.oasi_temps_reparti_id
        FROM eleves e
        LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
        WHERE e.classe_id = $1 AND (e.statut = 'actif' OR e.statut = 'Actif')
        ORDER BY u.nom, u.prenom
      `,
        [classe_id],
      );
      return json(cors, result.rows);
    }

    const docsMatch = path.match(/^\/eleves\/(\d+)\/documents(?:\/(\d+)(?:\/telecharger)?)?$/);
    if (docsMatch) {
      const eleveId = docsMatch[1];
      const docId = docsMatch[2];
      const isDownload = path.endsWith("/telecharger");

      if (!docId && req.method === "GET") {
        const result = await pool.query(
          "SELECT id, nom, type, taille, created_at FROM documents_eleves WHERE eleve_id=$1 ORDER BY created_at DESC",
          [eleveId],
        );
        return json(cors, result.rows);
      }

      if (!docId && req.method === "POST") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const body = await parseJsonBody(req);
        const { nom, type, contenu, taille } = body;
        if (!contenu) return json(cors, { message: "Contenu manquant" }, 400);

        if (isSupabaseConfigured()) {
          const inserted = await pool.query(
            `INSERT INTO documents_eleves (eleve_id, nom, type, contenu, taille, storage_path)
             VALUES ($1,$2,$3,NULL,$4,NULL) RETURNING id, nom, type, taille, created_at`,
            [eleveId, nom, type || "Autre", taille || null],
          );
          const doc = inserted.rows[0];
          const storagePath = `eleves/${eleveId}/${doc.id}_${safeFileName(nom)}`;
          try {
            await uploadDataUrl(BUCKETS.documentsEleves, storagePath, String(contenu));
            await pool.query("UPDATE documents_eleves SET storage_path=$1 WHERE id=$2", [
              storagePath,
              doc.id,
            ]);
          } catch (upErr) {
            await pool.query("DELETE FROM documents_eleves WHERE id=$1", [doc.id]);
            throw upErr;
          }
          return json(cors, doc, 201);
        }

        const result = await pool.query(
          "INSERT INTO documents_eleves (eleve_id, nom, type, contenu, taille) VALUES ($1,$2,$3,$4,$5) RETURNING id, nom, type, taille, created_at",
          [eleveId, nom, type || "Autre", contenu, taille || null],
        );
        return json(cors, result.rows[0], 201);
      }

      if (docId && isDownload && req.method === "GET") {
        const result = await pool.query(
          "SELECT nom, contenu, storage_path FROM documents_eleves WHERE id=$1 AND eleve_id=$2",
          [docId, eleveId],
        );
        if (result.rows.length === 0) return json(cors, { message: "Document non trouvé" }, 404);
        const row = result.rows[0];
        const dataUrl = await resolveContenu(row, BUCKETS.documentsEleves);
        if (!dataUrl) return json(cors, { message: "Fichier introuvable" }, 404);
        return json(cors, { nom: row.nom, contenu: dataUrl });
      }

      if (docId && !isDownload && req.method === "DELETE") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const cur = await pool.query(
          "SELECT storage_path FROM documents_eleves WHERE id=$1 AND eleve_id=$2",
          [docId, eleveId],
        );
        if (!cur.rows.length) return json(cors, { message: "Document non trouvé" }, 404);
        await removeObject(BUCKETS.documentsEleves, cur.rows[0].storage_path);
        await pool.query("DELETE FROM documents_eleves WHERE id=$1 AND eleve_id=$2", [docId, eleveId]);
        return json(cors, { message: "Document supprimé" });
      }
    }

    const sanctionsMatch = path.match(/^\/eleves\/(\d+)\/sanctions(?:\/(\d+))?$/);
    if (sanctionsMatch) {
      const eleveId = sanctionsMatch[1];
      const sanctionId = sanctionsMatch[2];

      if (!sanctionId && req.method === "GET") {
        const result = await pool.query(
          "SELECT id, echelle, infraction, niveau, date_sanction, prof_nom, observation_ref, created_at FROM sanctions_eleves WHERE eleve_id=$1 ORDER BY echelle, infraction, niveau",
          [eleveId],
        );
        return json(cors, result.rows);
      }

      if (!sanctionId && req.method === "POST") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const body = await parseJsonBody(req);
        const { echelle, infraction, niveau, date_sanction, prof_nom, observation_ref } = body;
        const ref = String(observation_ref || "").trim();
        if (!ref) {
          return json(cors, { message: "Référence d'observation obligatoire pour valider la sanction" }, 400);
        }
        const refExiste = await pool.query(
          "SELECT id FROM observations WHERE eleve_id=$1 AND reference_obs=$2 LIMIT 1",
          [eleveId, ref],
        );
        if (!refExiste.rows.length) {
          return json(cors, { message: "Référence d'observation invalide pour cet élève" }, 400);
        }
        const refDeja = await pool.query(
          "SELECT id FROM sanctions_eleves WHERE eleve_id=$1 AND observation_ref=$2 LIMIT 1",
          [eleveId, ref],
        );
        if (refDeja.rows.length) {
          return json(cors, { message: "Cette référence d'observation est déjà utilisée pour une autre sanction" }, 400);
        }
        const exists = await pool.query(
          "SELECT id FROM sanctions_eleves WHERE eleve_id=$1 AND echelle=$2 AND infraction=$3 AND niveau=$4",
          [eleveId, echelle, infraction, niveau],
        );
        if (exists.rows.length > 0) return json(cors, { message: "Sanction déjà enregistrée" }, 409);
        const result = await pool.query(
          "INSERT INTO sanctions_eleves (eleve_id, echelle, infraction, niveau, date_sanction, prof_nom, observation_ref) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
          [eleveId, echelle, infraction, niveau, date_sanction || null, prof_nom || null, ref],
        );
        return json(cors, result.rows[0], 201);
      }

      if (sanctionId && req.method === "PUT") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const body = await parseJsonBody(req);
        const { date_sanction, prof_nom, observation_ref } = body;
        const ref = String(observation_ref || "").trim();
        if (!ref) {
          return json(cors, { message: "Référence d'observation obligatoire pour valider la sanction" }, 400);
        }
        const refExiste = await pool.query(
          "SELECT id FROM observations WHERE eleve_id=$1 AND reference_obs=$2 LIMIT 1",
          [eleveId, ref],
        );
        if (!refExiste.rows.length) {
          return json(cors, { message: "Référence d'observation invalide pour cet élève" }, 400);
        }
        const refDeja = await pool.query(
          "SELECT id FROM sanctions_eleves WHERE eleve_id=$1 AND observation_ref=$2 AND id <> $3 LIMIT 1",
          [eleveId, ref, parseInt(sanctionId, 10)],
        );
        if (refDeja.rows.length) {
          return json(cors, { message: "Cette référence d'observation est déjà utilisée pour une autre sanction" }, 400);
        }
        const result = await pool.query(
          "UPDATE sanctions_eleves SET date_sanction=$1, prof_nom=$2, observation_ref=$3 WHERE id=$4 AND eleve_id=$5 RETURNING *",
          [date_sanction || null, prof_nom || null, ref, sanctionId, eleveId],
        );
        if (!result.rows.length) return json(cors, { message: "Sanction non trouvée" }, 404);
        return json(cors, result.rows[0]);
      }

      if (sanctionId && req.method === "DELETE") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        await pool.query("DELETE FROM sanctions_eleves WHERE id=$1 AND eleve_id=$2", [sanctionId, eleveId]);
        return json(cors, { message: "Sanction supprimée" });
      }
    }

    const photoMatch = path.match(/^\/eleves\/(\d+)\/photo$/);
    if (photoMatch && req.method === "PUT") {
      const eleveId = photoMatch[1];
      const body = await parseJsonBody(req);
      const { photo } = body;

      if (photo !== null && photo !== undefined) {
        if (typeof photo !== "string") return json(cors, { message: "Format photo invalide" }, 400);
        if (!photo.startsWith("data:image/")) {
          return json(cors, { message: "Le fichier doit etre une image" }, 400);
        }
      }

      const current = await pool.query("SELECT photo_storage_path FROM eleves WHERE id=$1", [eleveId]);
      if (!current.rows.length) return json(cors, { message: "Eleve non trouve" }, 404);
      const oldPath = current.rows[0].photo_storage_path;

      if (photo === null || photo === undefined) {
        await removeObject(BUCKETS.elevesPhotos, oldPath);
        await pool.query("UPDATE eleves SET photo=NULL, photo_storage_path=NULL WHERE id=$1", [eleveId]);
        return json(cors, { message: "Photo mise à jour" });
      }

      if (isSupabaseConfigured()) {
        const storagePath = `eleves/${eleveId}/photo_${Date.now()}.jpg`;
        await uploadDataUrl(BUCKETS.elevesPhotos, storagePath, photo);
        await pool.query("UPDATE eleves SET photo=NULL, photo_storage_path=$1 WHERE id=$2", [
          storagePath,
          eleveId,
        ]);
        if (oldPath && oldPath !== storagePath) {
          await removeObject(BUCKETS.elevesPhotos, oldPath);
        }
      } else {
        await pool.query("UPDATE eleves SET photo=$1, photo_storage_path=NULL WHERE id=$2", [photo, eleveId]);
      }
      return json(cors, { message: "Photo mise à jour" });
    }

    const classeMatch = path.match(/^\/eleves\/(\d+)\/classe$/);
    if (classeMatch && req.method === "PUT") {
      const eleveId = classeMatch[1];
      const body = await parseJsonBody(req);
      const { classe_id } = body;
      await pool.query("UPDATE eleves SET classe_id=$1 WHERE id=$2", [classe_id || null, eleveId]);
      return json(cors, { message: "Classe mise à jour" });
    }

    const dateDebutMatch = path.match(/^\/eleves\/(\d+)\/date-debut-cours$/);
    if (dateDebutMatch && req.method === "PUT") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const eleveId = dateDebutMatch[1];
      const body = await parseJsonBody(req);
      const { date_debut_cours } = body;
      await pool.query("UPDATE eleves SET date_debut_cours=$1 WHERE id=$2", [
        date_debut_cours || null,
        eleveId,
      ]);
      return json(cors, { message: "Date de début des cours mise à jour" });
    }

    const categorieMatch = path.match(/^\/eleves\/(\d+)\/categorie$/);
    if (categorieMatch && req.method === "PUT") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const eleveId = categorieMatch[1];
      const body = await parseJsonBody(req);
      const { categorie } = body;
      await pool.query("UPDATE eleves SET categorie=$1 WHERE id=$2", [categorie || null, eleveId]);
      return json(cors, { message: "Catégorie mise à jour" });
    }

    const idMatch = path.match(/^\/eleves\/(\d+)$/);
    if (idMatch) {
      const eleveId = idMatch[1];

      if (req.method === "GET") {
        const result = await pool.query(
          `
          SELECT e.id, u.nom, u.prenom, u.email, c.nom as classe, e.classe_id, e.date_naissance, e.sexe, e.nationalite, e.date_debut_cours, e.categorie, e.telephone, e.adresse, e.nom_parent, e.telephone_parent, e.statut
          FROM eleves e
          JOIN utilisateurs u ON e.utilisateur_id = u.id
          LEFT JOIN classes c ON e.classe_id = c.id
          WHERE e.id = $1
        `,
          [eleveId],
        );
        if (result.rows.length === 0) return json(cors, { message: "Eleve non trouve" }, 404);
        return json(cors, result.rows[0]);
      }

      if (req.method === "PUT") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const b = await parseJsonBody<Record<string, unknown>>(req);
        const {
          nom,
          prenom,
          email,
          classe_id,
          date_naissance,
          sexe,
          nationalite,
          date_debut_cours,
          categorie,
          telephone,
          adresse,
          nom_parent,
          telephone_parent,
          statut,
        } = b;

        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const eleveResult = await client.query("SELECT * FROM eleves WHERE id=$1", [eleveId]);
          if (eleveResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return json(cors, { message: "Eleve non trouve" }, 404);
          }
          const row = eleveResult.rows[0];
          const userId = row.utilisateur_id;

          const c_id = pick(b, "classe_id", row.classe_id);
          const d_naiss = pick(b, "date_naissance", row.date_naissance);
          const d_debut = pick(b, "date_debut_cours", row.date_debut_cours);
          const cat = pick(b, "categorie", row.categorie);
          const tel = pick(b, "telephone", row.telephone);
          const adr = pick(b, "adresse", row.adresse);
          const n_par = pick(b, "nom_parent", row.nom_parent);
          const t_par = pick(b, "telephone_parent", row.telephone_parent);
          const st = Object.prototype.hasOwnProperty.call(b, "statut")
            ? (statut || "actif")
            : (row.statut || "actif");

          if (
            userId &&
            (Object.prototype.hasOwnProperty.call(b, "nom") ||
              Object.prototype.hasOwnProperty.call(b, "prenom") ||
              Object.prototype.hasOwnProperty.call(b, "email"))
          ) {
            const uRow = await client.query("SELECT nom, prenom, email FROM utilisateurs WHERE id=$1", [
              userId,
            ]);
            const u = uRow.rows[0] || {};
            await client.query("UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3 WHERE id=$4", [
              Object.prototype.hasOwnProperty.call(b, "nom") ? nom : u.nom,
              Object.prototype.hasOwnProperty.call(b, "prenom") ? prenom : u.prenom,
              Object.prototype.hasOwnProperty.call(b, "email") ? (email || null) : u.email,
              userId,
            ]);
          }

          await client.query(
            `
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
          `,
            [
              c_id ?? null,
              d_naiss || null,
              d_debut || null,
              cat || null,
              tel || null,
              adr || null,
              n_par || null,
              t_par || null,
              st,
              pickStr(b, "oasi_prog_nom", row),
              pickStr(b, "oasi_prog_encadrant", row),
              pickInt(b, "oasi_n", row),
              pickInt(b, "oasi_ref", row),
              pickInt(b, "oasi_pos", row),
              pickStr(b, "oasi_nom", row),
              pickStr(b, "oasi_nais", row),
              pickStr(b, "oasi_nationalite", row),
              pickStr(b, "oasi_presence_date", row),
              pickStr(b, "oasi_jour_semaine", row),
              pickStr(b, "oasi_presence_periode", row),
              pickStr(b, "oasi_presence_type", row),
              pickStr(b, "oasi_remarque", row),
              pickStr(b, "oasi_controle_du", row),
              pickStr(b, "oasi_controle_au", row),
              pickStr(b, "oasi_prog_presences", row),
              pickStr(b, "oasi_prog_admin", row),
              pickStr(b, "oasi_as", row),
              pickInt(b, "oasi_prg_id", row),
              pickInt(b, "oasi_prg_occupation_id", row),
              pickInt(b, "oasi_ra_id", row),
              pickInt(b, "oasi_temps_reparti_id", row),
              pickStr(b, "nationalite", row),
              eleveId,
              Object.prototype.hasOwnProperty.call(b, "sexe") ? (sexe || null) : row.sexe,
            ],
          );

          await client.query("COMMIT");
          return json(cors, { message: "Eleve modifie" });
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        } finally {
          client.release();
        }
      }

      if (req.method === "DELETE") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const deleted = await supprimerEleveTransaction(pool, eleveId);
        if (!deleted) return json(cors, { message: "Eleve non trouve" }, 404);
        return json(cors, { message: "Eleve supprime" });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("eleves-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: "Erreur serveur", erreur: msg }, 500);
  } finally {
    await pool.end();
  }
}
