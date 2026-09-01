import bcrypt from "npm:bcryptjs@2";
import type { Pool } from "npm:pg@8";
import { createPool, decryptText, encryptText, json } from "../auth-fast-shared.ts";
import { sendEmail } from "./mailer.ts";
import {
  fetchAnneeMeta,
  verrouillerArchiveDb,
  verifierArchivePourResetDb,
} from "./archive-service.ts";
import { loadUser, parseJsonBody, requireAdmin, requireAuth } from "./middleware.ts";

const DEFAULT_HOST = "smtp.office365.com";
const DEFAULT_PORT = 587;

async function getMailSettingsRow(pool: Pool) {
  const result = await pool.query("SELECT * FROM parametres_mail LIMIT 1");
  return result.rows[0] || null;
}

function buildRuntimeMailConfig(row: Record<string, unknown> | null) {
  const host = (row?.smtp_host as string) || Deno.env.get("EMAIL_HOST") || DEFAULT_HOST;
  const port = Number(row?.smtp_port || Deno.env.get("EMAIL_PORT") || DEFAULT_PORT);
  const secure =
    row?.smtp_secure === true ||
    String(Deno.env.get("EMAIL_SECURE") || "").toLowerCase() === "true";
  const user = (row?.smtp_user as string) || Deno.env.get("EMAIL_USER") || "";
  const appPassword =
    decryptText(String(row?.smtp_app_password || "")) || Deno.env.get("EMAIL_PASS") || "";
  const fromEmail = (row?.smtp_from_email as string) || Deno.env.get("EMAIL_FROM") || user;
  const fromName = (row?.smtp_from_name as string) || Deno.env.get("EMAIL_FROM_NAME") || "Ecole Manager";
  const enabled = row ? row.smtp_active === true : Boolean(user && appPassword);

  return { host, port, secure, user, appPassword, fromEmail, fromName, enabled };
}

function getMailErrorHint(err: unknown) {
  const e = err as { code?: string; message?: string };
  const code = String(e?.code || "").toUpperCase();
  const message = String(e?.message || "").toLowerCase();

  if (code === "EAUTH" || message.includes("authentication unsuccessful") || message.includes("auth")) {
    return "Authentification refusee. Verifiez l'email SMTP, le mot de passe d'application, et que SMTP AUTH est active sur le compte Microsoft.";
  }

  if (code === "ETIMEDOUT" || code === "ECONNECTION" || message.includes("timeout") || message.includes("connect")) {
    return "Connexion SMTP impossible. Verifiez le serveur/port, le pare-feu reseau, et le mode TLS (587 sans SSL implicite ou 465 avec SSL implicite).";
  }

  if (message.includes("5.7.57") || message.includes("smtp client authentication is disabled")) {
    return "SMTP AUTH est desactive cote Microsoft 365. Activez \"Authenticated SMTP\" au niveau de la boite et du tenant.";
  }

  return "Consultez le detail de l'erreur SMTP puis verifiez host/port/TLS et les identifiants.";
}

export async function handleParametresRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    if (path === "/parametres/profil" && req.method === "GET") {
      const result = await pool.query(
        "SELECT id, nom, prenom, email, role, permissions, telephone, adresse, npa, lieu, sexe, date_naissance, avs, taux_activite, periodes_semaine, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, priorite_pref, specialite FROM utilisateurs WHERE id=$1",
        [user!.id],
      );
      return json(cors, result.rows[0]);
    }

    if (path === "/parametres/profil" && req.method === "PUT") {
      const body = await parseJsonBody(req);
      const {
        nom,
        prenom,
        email,
        telephone,
        adresse,
        npa,
        lieu,
        sexe,
        date_naissance,
        avs,
        niveau_prefere,
        lieu_travail_prefere,
        remarque_lieu_travail,
        priorite_pref,
        specialite,
      } = body;
      await pool.query(
        "UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, telephone=$4, adresse=$5, npa=$6, lieu=$7, sexe=$8, date_naissance=$9, avs=$10, niveau_prefere=$11, lieu_travail_prefere=$12, remarque_lieu_travail=$13, priorite_pref=$14, specialite=$15 WHERE id=$16",
        [
          nom,
          prenom,
          email,
          telephone || null,
          adresse || null,
          npa || null,
          lieu || null,
          sexe || null,
          date_naissance || null,
          avs || null,
          niveau_prefere || null,
          lieu_travail_prefere || null,
          remarque_lieu_travail || null,
          priorite_pref || null,
          specialite || null,
          user!.id,
        ],
      );
      return json(cors, { message: "Profil mis a jour" });
    }

    if (path === "/parametres/mot-de-passe" && req.method === "PUT") {
      const body = await parseJsonBody(req);
      const { ancien, nouveau } = body;
      const result = await pool.query("SELECT mot_de_passe FROM utilisateurs WHERE id=$1", [user!.id]);
      const valide = await bcrypt.compare(String(ancien), result.rows[0].mot_de_passe);
      if (!valide) return json(cors, { message: "Ancien mot de passe incorrect" }, 400);
      const hash = await bcrypt.hash(String(nouveau), 10);
      await pool.query("UPDATE utilisateurs SET mot_de_passe=$1 WHERE id=$2", [hash, user!.id]);
      return json(cors, { message: "Mot de passe modifie" });
    }

    if (path === "/parametres/ecole" && req.method === "GET") {
      const result = await pool.query("SELECT * FROM parametres_ecole LIMIT 1");
      return json(cors, result.rows[0] || {});
    }

    if (path === "/parametres/ecole" && req.method === "PUT") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const {
        nom_ecole,
        adresse,
        telephone,
        email,
        annee_scolaire,
        date_debut_annee,
        date_fin_annee,
        responsable_langues_jeunes,
        responsable_niveau,
        responsable_niveau_csc,
        responsable_niveau_cfr,
        responsable_niveau_epl,
        sexe_responsable_langues_jeunes,
        sexe_responsable_niveau_csc,
        sexe_responsable_niveau_cfr,
        sexe_responsable_niveau_epl,
        horaires,
      } = body;
      const existe = await pool.query("SELECT id FROM parametres_ecole LIMIT 1");
      if (existe.rows.length > 0) {
        await pool.query(
          "UPDATE parametres_ecole SET nom_ecole=$1, adresse=$2, telephone=$3, email=$4, annee_scolaire=$5, date_debut_annee=$6, date_fin_annee=$7, responsable_langues_jeunes=$8, responsable_niveau=$9, responsable_niveau_csc=$10, responsable_niveau_cfr=$11, responsable_niveau_epl=$12, sexe_responsable_langues_jeunes=$13, sexe_responsable_niveau_csc=$14, sexe_responsable_niveau_cfr=$15, sexe_responsable_niveau_epl=$16, horaires=$17::jsonb WHERE id=$18",
          [
            nom_ecole,
            adresse,
            telephone,
            email,
            annee_scolaire,
            date_debut_annee || null,
            date_fin_annee || null,
            responsable_langues_jeunes || null,
            responsable_niveau || null,
            responsable_niveau_csc || null,
            responsable_niveau_cfr || null,
            responsable_niveau_epl || null,
            sexe_responsable_langues_jeunes || null,
            sexe_responsable_niveau_csc || null,
            sexe_responsable_niveau_cfr || null,
            sexe_responsable_niveau_epl || null,
            horaires ? JSON.stringify(horaires) : "{}",
            existe.rows[0].id,
          ],
        );
      } else {
        await pool.query(
          "INSERT INTO parametres_ecole (nom_ecole, adresse, telephone, email, annee_scolaire, date_debut_annee, date_fin_annee, responsable_langues_jeunes, responsable_niveau, responsable_niveau_csc, responsable_niveau_cfr, responsable_niveau_epl, sexe_responsable_langues_jeunes, sexe_responsable_niveau_csc, sexe_responsable_niveau_cfr, sexe_responsable_niveau_epl, horaires) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)",
          [
            nom_ecole,
            adresse,
            telephone,
            email,
            annee_scolaire,
            date_debut_annee || null,
            date_fin_annee || null,
            responsable_langues_jeunes || null,
            responsable_niveau || null,
            responsable_niveau_csc || null,
            responsable_niveau_cfr || null,
            responsable_niveau_epl || null,
            sexe_responsable_langues_jeunes || null,
            sexe_responsable_niveau_csc || null,
            sexe_responsable_niveau_cfr || null,
            sexe_responsable_niveau_epl || null,
            horaires ? JSON.stringify(horaires) : "{}",
          ],
        );
      }
      return json(cors, { message: "Parametres mis a jour" });
    }

    if (path === "/parametres/mail" && req.method === "GET") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const row = await getMailSettingsRow(pool);
      const runtime = buildRuntimeMailConfig(row);
      return json(cors, {
        smtp_active: row ? row.smtp_active === true : false,
        smtp_host: row?.smtp_host || runtime.host || "smtp.office365.com",
        smtp_port: row?.smtp_port || runtime.port || 587,
        smtp_secure: row ? row.smtp_secure === true : false,
        smtp_user: row?.smtp_user || runtime.user || "",
        smtp_from_name: row?.smtp_from_name || runtime.fromName || "Ecole Manager",
        smtp_from_email: row?.smtp_from_email || runtime.fromEmail || "",
        has_app_password: Boolean(row?.smtp_app_password),
      });
    }

    if (path === "/parametres/mail" && req.method === "PUT") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const {
        smtp_active,
        smtp_host,
        smtp_port,
        smtp_secure,
        smtp_user,
        smtp_from_name,
        smtp_from_email,
        smtp_app_password,
      } = body;

      const existe = await getMailSettingsRow(pool);
      const hostValue = String(smtp_host || "smtp.office365.com").trim();
      const portValue = Number(smtp_port) || 587;
      const secureValue = smtp_secure === true;
      const userValue = String(smtp_user || "").trim();
      const fromNameValue = String(smtp_from_name || "Ecole Manager").trim();
      const fromEmailValue = String(smtp_from_email || userValue).trim();
      const activeValue = smtp_active === true;
      const appPasswordValue = typeof smtp_app_password === "string" ? smtp_app_password.trim() : "";
      const encryptedPassword = appPasswordValue ? encryptText(appPasswordValue) : "";

      if (activeValue && (!userValue || (!appPasswordValue && !existe?.smtp_app_password))) {
        return json(cors, {
          message:
            "Pour activer l'envoi d'emails, renseignez l'utilisateur SMTP et le mot de passe d'application.",
        }, 400);
      }

      if (existe) {
        await pool.query(
          `UPDATE parametres_mail
           SET smtp_active=$1, smtp_host=$2, smtp_port=$3, smtp_secure=$4, smtp_user=$5,
               smtp_app_password=COALESCE(NULLIF($6,''), smtp_app_password),
               smtp_from_name=$7, smtp_from_email=$8, updated_at=NOW()
           WHERE id=$9`,
          [
            activeValue,
            hostValue,
            portValue,
            secureValue,
            userValue,
            encryptedPassword,
            fromNameValue,
            fromEmailValue,
            existe.id,
          ],
        );
      } else {
        await pool.query(
          `INSERT INTO parametres_mail
            (smtp_active, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_app_password, smtp_from_name, smtp_from_email)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [activeValue, hostValue, portValue, secureValue, userValue, encryptedPassword, fromNameValue, fromEmailValue],
        );
      }

      return json(cors, { message: "Parametres email mis a jour" });
    }

    if (path === "/parametres/mail/test" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const destinataire = String(body.email || "").trim();
      if (!destinataire) return json(cors, { message: "Email destinataire manquant" }, 400);

      try {
        await sendEmail({
          to: destinataire,
          subject: "Test configuration email - Ecole Manager",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#f8fafc;border-radius:12px">
              <h2 style="margin:0 0 10px;color:#6366f1">Configuration email OK</h2>
              <p style="margin:0 0 10px;color:#111827">
                Ce message confirme que la configuration SMTP admin fonctionne.
              </p>
              <p style="margin:0;color:#6b7280;font-size:12px">
                Si vous utilisez la double authentification Outlook, gardez un mot de passe d'application actif.
              </p>
            </div>
          `,
          text: "Configuration email OK. La configuration SMTP admin fonctionne.",
        });
        return json(cors, { message: "Email de test envoye" });
      } catch (err) {
        const e = err as { code?: string; message?: string; response?: unknown; responseCode?: unknown };
        return json(cors, {
          message: "Echec de l'envoi du mail de test",
          erreur: e?.message || "Erreur SMTP inconnue",
          code: e?.code || null,
          reponse: e?.response || e?.responseCode || null,
          hint: getMailErrorHint(err),
        }, 400);
      }
    }

    if (path === "/parametres/profs" && req.method === "GET") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const result = await pool.query(
        "SELECT id, nom, prenom, email, permissions FROM utilisateurs WHERE role='prof' ORDER BY nom, prenom",
      );
      return json(cors, result.rows);
    }

    const permMatch = path.match(/^\/parametres\/permissions\/(\d+)$/);
    if (permMatch && req.method === "PUT") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { permissions } = body;
      await pool.query("UPDATE utilisateurs SET permissions=$1 WHERE id=$2", [
        JSON.stringify(permissions),
        permMatch[1],
      ]);
      return json(cors, { message: "Permissions mises a jour" });
    }

    if (path === "/parametres/acces-profs" && req.method === "GET") {
      const r = await pool.query("SELECT acces_profs FROM parametres_ecole LIMIT 1");
      return json(cors, r.rows[0]?.acces_profs || {});
    }

    if (path === "/parametres/acces-profs" && req.method === "PUT") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { acces_profs } = body;
      const existe = await pool.query("SELECT id FROM parametres_ecole LIMIT 1");
      if (existe.rows.length > 0) {
        await pool.query("UPDATE parametres_ecole SET acces_profs=$1 WHERE id=$2", [
          JSON.stringify(acces_profs),
          existe.rows[0].id,
        ]);
      } else {
        await pool.query("INSERT INTO parametres_ecole (acces_profs) VALUES ($1)", [
          JSON.stringify(acces_profs),
        ]);
      }
      return json(cors, { message: "Accès professeurs mis à jour" });
    }

    if (path === "/parametres/mes-classes" && req.method === "GET") {
      const result = await pool.query(
        `
        SELECT DISTINCT c.id, c.nom, c.niveau, c.annee_scolaire, m.nom as matiere
        FROM emploi_du_temps et
        JOIN classes c ON et.classe_id = c.id
        JOIN matieres m ON et.matiere_id = m.id
        WHERE et.prof_id = $1
        ORDER BY c.nom
      `,
        [user!.id],
      );
      return json(cors, result.rows);
    }

    if (path === "/parametres/reset-tout" && req.method === "DELETE") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const tables = [
        "presences_v2",
        "presences",
        "absences",
        "notes",
        "planning_branches",
        "branches",
        "classe_horaires",
        "planning_affectations",
        "planning_pools",
        "disponibilites",
        "paiements",
        "comptabilite",
        "calendrier",
        "observations",
        "eleves",
        "classes",
        "profs",
        "messages",
        "notifications",
      ];
      const resultats: string[] = [];
      for (const table of tables) {
        try {
          const r = await pool.query("DELETE FROM " + table);
          resultats.push("OK:" + table + "(" + r.rowCount + ")");
        } catch (err) {
          resultats.push("ERR:" + table + ":" + (err instanceof Error ? err.message : String(err)));
        }
      }
      try {
        const r = await pool.query("DELETE FROM utilisateurs WHERE role != 'admin'");
        resultats.push("OK:utilisateurs(" + r.rowCount + ")");
      } catch (err) {
        resultats.push("ERR:utilisateurs:" + (err instanceof Error ? err.message : String(err)));
      }
      const erreurs = resultats.filter((r) => r.startsWith("ERR"));
      return json(cors, {
        message:
          erreurs.length === 0
            ? "Reset complet effectue"
            : "Reset partiel - " + erreurs.length + " erreur(s)",
        details: resultats,
        erreurs,
      });
    }

    if (path === "/parametres/reset-rentree" && req.method === "DELETE") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody<Record<string, unknown>>(req);
      const archiveId = Number(req.headers.get("x-archive-id") || body?.archive_id || 0);
      const meta = await fetchAnneeMeta(pool);
      if (!(await verifierArchivePourResetDb(archiveId, meta.annee, pool))) {
        return json(cors, {
          message:
            "Vous devez d’abord transférer l’année en cours vers le menu Archive avant de confirmer la réinitialisation.",
          archive_required: true,
        }, 400);
      }

      const tables = [
        "presences_v2",
        "presences",
        "absences",
        "notes",
        "evaluations",
        "bulletin_criteres",
        "suivi_devoirs",
        "devoirs",
        "affectations_eleves_enc",
        "classes_enclassement",
        "enclassements",
        "affectations",
        "planning_branches",
        "pool_profs",
        "pool_classes",
        "pool_branches",
        "classe_horaires",
        "classe_periodes",
        "emploi_du_temps",
        "plan_classe",
        "inventaire_branches",
        "paiements",
        "factures_validations",
        "factures_references",
        "commandes_lignes",
        "commandes",
        "documents_eleves",
        "sanctions_eleves",
        "observations",
        "sorties_scolaires",
        "eleves",
      ];

      const resultats: string[] = [];
      const client = await pool.connect();
      const fail = async (message: string) => {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* ignore */
        }
        return json(cors, {
          message,
          details: resultats,
          erreurs: resultats.filter((r) => r.startsWith("ERR:")),
        }, 500);
      };

      try {
        await client.query("BEGIN");
        for (const table of tables) {
          const exists = await client.query(
            `SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = $1`,
            [table],
          );
          if (!exists.rows.length) {
            resultats.push("SKIP:" + table + "(absente)");
            continue;
          }
          try {
            const r = await client.query("DELETE FROM " + table);
            resultats.push("OK:" + table + "(" + r.rowCount + ")");
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            resultats.push("ERR:" + table + ":" + msg);
            return await fail("Reset rentree echoue — aucune donnée n'a été supprimée (rollback)");
          }
        }

        try {
          const r = await client.query(
            "DELETE FROM utilisateurs WHERE role IN ('eleve','parent')",
          );
          resultats.push("OK:utilisateurs-eleves-parents(" + r.rowCount + ")");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          resultats.push("ERR:utilisateurs-eleves-parents:" + msg);
          return await fail("Reset rentree echoue — aucune donnée n'a été supprimée (rollback)");
        }

        await client.query("COMMIT");
        try {
          await verrouillerArchiveDb(archiveId, pool);
        } catch {
          /* ignore */
        }
        return json(cors, {
          message: "Reset rentree effectue",
          details: resultats,
          erreurs: [],
          archive_id: archiveId,
        });
      } catch (err) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* ignore */
        }
        const msg = err instanceof Error ? err.message : "Erreur serveur";
        return json(cors, { message: "Erreur serveur lors du reset rentree", erreur: msg }, 500);
      } finally {
        client.release();
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("parametres-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: "Erreur serveur", erreur: msg }, 500);
  } finally {
    await pool.end();
  }
}
