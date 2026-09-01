import bcrypt from "npm:bcryptjs@2";
import type { Pool } from "npm:pg@8";
import { createPool, json } from "../auth-fast-shared.ts";
import { sendEmail } from "./mailer.ts";
import { loadUser, parseJsonBody, requireAdmin, requireAuth } from "./middleware.ts";
import { BUCKETS, isSupabaseConfigured, removeObject, resolveContenu, safeFileName, uploadDataUrl } from "./storage.ts";

const CHAMPS =
  "id, nom, prenom, email, actif, created_at, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, priorite_pref, type_prof, identifiant, mfa_enabled, mfa_exempt";

async function appliquerMfaExempt(db: Pool, userId: number | string, exempt: unknown) {
  if (exempt === true || exempt === "true") {
    await db.query(
      `UPDATE utilisateurs
       SET mfa_exempt = true,
           mfa_enabled = false,
           mfa_secret = NULL,
           mfa_enabled_at = NULL,
           mfa_backup_codes = '[]'::jsonb
       WHERE id = $1`,
      [userId],
    );
    return true;
  }
  if (exempt === false || exempt === "false") {
    await db.query("UPDATE utilisateurs SET mfa_exempt = false WHERE id = $1", [userId]);
    return false;
  }
  return null;
}

async function supprimerProfTransaction(pool: Pool, id: string): Promise<Response | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const check = await client.query(
      "SELECT id FROM utilisateurs WHERE id=$1 AND role=$2",
      [id, "prof"],
    );
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query("UPDATE classes SET prof_principal_id=NULL WHERE prof_principal_id=$1", [id]);
    await client.query("UPDATE tcf_state SET updated_by=NULL WHERE updated_by=$1", [id]);
    await client.query("UPDATE documents_administratifs SET auteur_id=NULL WHERE auteur_id=$1", [id]);
    await client.query("UPDATE inventaire_branches SET auteur_id=NULL WHERE auteur_id=$1", [id]);
    await client.query("UPDATE observations SET auteur_id=NULL WHERE auteur_id=$1", [id]);

    const tcfKeys = ["pool", "affectation", "resultats"];
    for (const cle of tcfKeys) {
      const row = await client.query("SELECT donnees FROM tcf_state WHERE cle=$1", [cle]);
      if (!row.rows.length) continue;
      const donnees = row.rows[0].donnees as Record<string, unknown>;
      const selectedBySite = donnees.selectedBySite as Record<string, unknown[]> | undefined;
      if (selectedBySite) {
        for (const site of Object.keys(selectedBySite)) {
          selectedBySite[site] = (selectedBySite[site] || []).filter(
            (pid) => String(pid) !== String(id),
          );
        }
      }
      const poolCellOverrides = donnees.poolCellOverrides as Record<string, unknown> | undefined;
      if (poolCellOverrides) {
        for (const k of Object.keys(poolCellOverrides)) {
          if (k.includes(`::${id}::`) || k.endsWith(`::${id}`)) delete poolCellOverrides[k];
        }
      }
      const rolesByPoolDemi = donnees.rolesByPoolDemi as Record<string, Record<string, unknown>> | undefined;
      if (rolesByPoolDemi) {
        for (const demi of Object.keys(rolesByPoolDemi)) {
          delete rolesByPoolDemi[demi][String(id)];
        }
      }
      await client.query("UPDATE tcf_state SET donnees=$1 WHERE cle=$2", [
        JSON.stringify(donnees),
        cle,
      ]);
    }

    await client.query("DELETE FROM affectations WHERE prof_id=$1", [id]);
    await client.query("DELETE FROM calendrier_prof WHERE prof_id=$1", [id]);
    await client.query("DELETE FROM disponibilites WHERE prof_id=$1", [id]);
    await client.query("DELETE FROM documents_profs WHERE prof_id=$1", [id]);
    await client.query("DELETE FROM emploi_du_temps WHERE prof_id=$1", [id]);
    await client.query("DELETE FROM evaluations WHERE prof_id=$1", [id]);
    await client.query("DELETE FROM messages WHERE expediteur_id=$1 OR destinataire_id=$1", [id]);
    await client.query("DELETE FROM notes_personnelles WHERE utilisateur_id=$1", [id]);
    await client.query("DELETE FROM notifications WHERE utilisateur_id=$1", [id]);
    await client.query("DELETE FROM planning_branches WHERE prof_id=$1", [id]);
    await client.query("DELETE FROM pool_profs WHERE prof_id=$1", [id]);
    await client.query("DELETE FROM prof_couleurs WHERE prof_id=$1", [id]);
    await client.query("DELETE FROM utilisateurs WHERE id=$1", [id]);
    await client.query("COMMIT");
    return null;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function handleProfsRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    if (path === "/profs" && req.method === "GET") {
      const result = await pool.query(
        `SELECT ${CHAMPS} FROM utilisateurs WHERE role=$1 ORDER BY nom, prenom`,
        ["prof"],
      );
      return json(cors, result.rows);
    }

    if (path === "/profs" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const {
        nom,
        prenom,
        email,
        mot_de_passe,
        telephone,
        specialite,
        adresse,
        npa,
        lieu,
        sexe,
        taux_activite,
        periodes_semaine,
        date_naissance,
        avs,
        type_contrat,
        type_permis,
        niveau_prefere,
        branches_specialites,
        lieu_travail_prefere,
        remarque_lieu_travail,
        priorite_pref,
        type_prof,
        identifiant,
      } = body;

      const existe = await pool.query("SELECT id FROM utilisateurs WHERE email=$1", [email]);
      if (existe.rows.length > 0) return json(cors, { message: "Email deja utilise" }, 400);

      const hash = await bcrypt.hash(String(mot_de_passe || "EcoleManager2024!"), 10);
      const identifiantFinal =
        String(identifiant || "").trim() ||
        (String(prenom || "").slice(0, 3) + String(nom || "").slice(0, 3)).toLowerCase() ||
        null;

      const result = await pool.query(
        `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, priorite_pref, type_prof, identifiant)
         VALUES ($1,$2,$3,$4,'prof',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING id, nom, prenom, email`,
        [
          nom,
          prenom,
          email,
          hash,
          telephone || null,
          specialite || null,
          adresse || null,
          npa || null,
          lieu || null,
          sexe || null,
          taux_activite ? parseInt(String(taux_activite)) : null,
          periodes_semaine ? parseInt(String(periodes_semaine)) : null,
          date_naissance && date_naissance !== "" ? date_naissance : null,
          avs || null,
          type_contrat || null,
          type_permis || null,
          niveau_prefere || null,
          branches_specialites || null,
          lieu_travail_prefere || null,
          remarque_lieu_travail || null,
          priorite_pref || "niveau",
          type_prof || null,
          identifiantFinal,
        ],
      );
      await appliquerMfaExempt(pool, result.rows[0].id, body.mfa_exempt);
      return json(cors, { message: "Professeur cree", prof: result.rows[0] }, 201);
    }

    const envoyerMatch = path.match(/^\/profs\/(\d+)\/envoyer-acces$/);
    if (envoyerMatch && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const id = envoyerMatch[1];
      const result = await pool.query(
        "SELECT nom, prenom, email FROM utilisateurs WHERE id=$1 AND role=$2",
        [id, "prof"],
      );
      if (result.rows.length === 0) return json(cors, { message: "Professeur non trouvé" }, 404);
      const prof = result.rows[0];

      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
      let mdp = "";
      for (let i = 0; i < 10; i++) mdp += chars[Math.floor(Math.random() * chars.length)];

      const hash = await bcrypt.hash(mdp, 10);
      await pool.query(
        "UPDATE utilisateurs SET mot_de_passe=$1, doit_changer_mdp=true WHERE id=$2",
        [hash, id],
      );

      await sendEmail({
        to: prof.email,
        subject: "Vos accès Oasis",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#f8fafc;border-radius:12px">
            <h2 style="color:#6366f1">Oasis</h2>
            <p>Bonjour <b>${prof.prenom} ${prof.nom}</b>,</p>
            <p>Voici vos accès pour vous connecter à l'application :</p>
            <div style="background:white;padding:20px;border-radius:8px;border-left:4px solid #6366f1;margin:20px 0">
              <p style="margin:0"><b>Email :</b> ${prof.email}</p>
              <p style="margin:8px 0 0"><b>Mot de passe temporaire :</b> <code style="background:#e0e7ff;padding:4px 8px;border-radius:4px;font-size:16px">${mdp}</code></p>
            </div>
            <p style="color:#ef4444;font-weight:bold">⚠️ Vous devrez changer ce mot de passe lors de votre première connexion.</p>
          </div>
        `,
        text: `Bonjour ${prof.prenom} ${prof.nom}, vos acces Oasis. Email: ${prof.email}. Mot de passe: ${mdp}.`,
      });

      return json(cors, { message: "Email envoyé à " + prof.email });
    }

    const docsMatch = path.match(/^\/profs\/(\d+)\/documents(?:\/(\d+)(?:\/telecharger)?)?$/);
    if (docsMatch) {
      const profId = docsMatch[1];
      const docId = docsMatch[2];
      const isDownload = path.endsWith("/telecharger");

      if (!docId && req.method === "GET") {
        const result = await pool.query(
          "SELECT id, nom, type, taille, created_at FROM documents_profs WHERE prof_id=$1 ORDER BY created_at DESC",
          [profId],
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
            `INSERT INTO documents_profs (prof_id, nom, type, contenu, taille, storage_path)
             VALUES ($1,$2,$3,NULL,$4,NULL) RETURNING id, nom, type, taille, created_at`,
            [profId, nom, type || "Autre", taille || null],
          );
          const doc = inserted.rows[0];
          const storagePath = `profs/${profId}/${doc.id}_${safeFileName(nom)}`;
          try {
            await uploadDataUrl(BUCKETS.documentsProfs, storagePath, String(contenu));
            await pool.query("UPDATE documents_profs SET storage_path=$1 WHERE id=$2", [
              storagePath,
              doc.id,
            ]);
          } catch (upErr) {
            await pool.query("DELETE FROM documents_profs WHERE id=$1", [doc.id]);
            throw upErr;
          }
          return json(cors, doc, 201);
        }

        const result = await pool.query(
          "INSERT INTO documents_profs (prof_id, nom, type, contenu, taille) VALUES ($1,$2,$3,$4,$5) RETURNING id, nom, type, taille, created_at",
          [profId, nom, type || "Autre", contenu, taille || null],
        );
        return json(cors, result.rows[0], 201);
      }

      if (docId && isDownload && req.method === "GET") {
        const result = await pool.query(
          "SELECT nom, contenu, storage_path FROM documents_profs WHERE id=$1 AND prof_id=$2",
          [docId, profId],
        );
        if (result.rows.length === 0) return json(cors, { message: "Document non trouvé" }, 404);
        const row = result.rows[0];
        const dataUrl = await resolveContenu(row, BUCKETS.documentsProfs);
        if (!dataUrl) return json(cors, { message: "Fichier introuvable" }, 404);
        return json(cors, { nom: row.nom, contenu: dataUrl });
      }

      if (docId && !isDownload && req.method === "DELETE") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const cur = await pool.query(
          "SELECT storage_path FROM documents_profs WHERE id=$1 AND prof_id=$2",
          [docId, profId],
        );
        if (!cur.rows.length) return json(cors, { message: "Document non trouvé" }, 404);
        await removeObject(BUCKETS.documentsProfs, cur.rows[0].storage_path);
        await pool.query("DELETE FROM documents_profs WHERE id=$1 AND prof_id=$2", [docId, profId]);
        return json(cors, { message: "Document supprimé" });
      }
    }

    const idMatch = path.match(/^\/profs\/(\d+)$/);
    if (idMatch) {
      const id = idMatch[1];

      if (req.method === "GET") {
        const result = await pool.query(
          `SELECT ${CHAMPS} FROM utilisateurs WHERE id=$1 AND role=$2`,
          [id, "prof"],
        );
        if (result.rows.length === 0) return json(cors, { message: "Professeur non trouve" }, 404);
        return json(cors, result.rows[0]);
      }

      if (req.method === "PUT") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const body = await parseJsonBody(req);
        const {
          nom,
          prenom,
          email,
          actif,
          mot_de_passe,
          telephone,
          specialite,
          adresse,
          npa,
          lieu,
          sexe,
          taux_activite,
          periodes_semaine,
          date_naissance,
          avs,
          type_contrat,
          type_permis,
          niveau_prefere,
          branches_specialites,
          lieu_travail_prefere,
          remarque_lieu_travail,
          priorite_pref,
          type_prof,
          identifiant,
        } = body;

        let query: string;
        let params: unknown[];
        if (mot_de_passe && String(mot_de_passe).trim() !== "") {
          const hash = await bcrypt.hash(String(mot_de_passe), 10);
          query = `UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, mot_de_passe=$5, telephone=$6, specialite=$7, adresse=$8, npa=$9, lieu=$10, sexe=$11, taux_activite=$12, periodes_semaine=$13, date_naissance=$14, avs=$15, type_contrat=$16, type_permis=$17, niveau_prefere=$18, branches_specialites=$19, lieu_travail_prefere=$20, remarque_lieu_travail=$21, priorite_pref=$22, type_prof=$23, identifiant=$24 WHERE id=$25 AND role='prof' RETURNING id`;
          params = [
            nom,
            prenom,
            email,
            actif !== undefined ? actif : true,
            hash,
            telephone || null,
            specialite || null,
            adresse || null,
            npa || null,
            lieu || null,
            sexe || null,
            taux_activite ? parseInt(String(taux_activite)) : null,
            periodes_semaine ? parseInt(String(periodes_semaine)) : null,
            date_naissance && date_naissance !== "" ? date_naissance : null,
            avs || null,
            type_contrat || null,
            type_permis || null,
            niveau_prefere || null,
            branches_specialites || null,
            lieu_travail_prefere || null,
            remarque_lieu_travail || null,
            priorite_pref || "niveau",
            type_prof || null,
            identifiant || null,
            id,
          ];
        } else {
          query = `UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, telephone=$5, specialite=$6, adresse=$7, npa=$8, lieu=$9, sexe=$10, taux_activite=$11, periodes_semaine=$12, date_naissance=$13, avs=$14, type_contrat=$15, type_permis=$16, niveau_prefere=$17, branches_specialites=$18, lieu_travail_prefere=$19, remarque_lieu_travail=$20, priorite_pref=$21, type_prof=$22, identifiant=$23 WHERE id=$24 AND role='prof' RETURNING id`;
          params = [
            nom,
            prenom,
            email,
            actif !== undefined ? actif : true,
            telephone || null,
            specialite || null,
            adresse || null,
            npa || null,
            lieu || null,
            sexe || null,
            taux_activite ? parseInt(String(taux_activite)) : null,
            periodes_semaine ? parseInt(String(periodes_semaine)) : null,
            date_naissance && date_naissance !== "" ? date_naissance : null,
            avs || null,
            type_contrat || null,
            type_permis || null,
            niveau_prefere || null,
            branches_specialites || null,
            lieu_travail_prefere || null,
            remarque_lieu_travail || null,
            priorite_pref || "niveau",
            type_prof || null,
            identifiant || null,
            id,
          ];
        }

        const result = await pool.query(query, params);
        if (result.rows.length === 0) return json(cors, { message: "Professeur non trouve" }, 404);
        await appliquerMfaExempt(pool, id, body.mfa_exempt);
        return json(cors, { message: "Professeur modifie" });
      }

      if (req.method === "DELETE") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const notFound = await supprimerProfTransaction(pool, id);
        if (notFound) return json(cors, { message: "Professeur non trouve" }, 404);
        return json(cors, { message: "Professeur supprime" });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("profs-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: "Erreur serveur", erreur: msg }, 500);
  } finally {
    await pool.end();
  }
}
