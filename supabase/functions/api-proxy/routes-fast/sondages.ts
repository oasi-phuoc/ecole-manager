import { randomBytes } from "node:crypto";
import type { Pool } from "npm:pg@8";
import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAuth } from "./middleware.ts";

const typesValides = new Set(["texte", "paragraphe", "choix_unique", "choix_multiple"]);

const genToken = () => randomBytes(24).toString("hex");

async function getSondageFull(pool: Pool, id: number) {
  const s = await pool.query("SELECT * FROM sondages WHERE id = $1", [id]);
  if (s.rows.length === 0) return null;
  const row = s.rows[0];
  const q = await pool.query(
    "SELECT id, ordre, type, libelle, options, obligatoire FROM sondage_questions WHERE sondage_id = $1 ORDER BY ordre ASC, id ASC",
    [id],
  );
  return { ...row, questions: q.rows.map((r) => ({ ...r, options: r.options || [] })) };
}

function normaliserQuestions(questions: unknown) {
  if (!Array.isArray(questions)) return [];
  return questions.map((q, i) => {
    const item = q as Record<string, unknown>;
    const type = String(item.type || "texte");
    if (!typesValides.has(type)) throw new Error(`Type de question invalide: ${type}`);
    let options = Array.isArray(item.options)
      ? item.options.map((o) => String(o).trim()).filter(Boolean)
      : [];
    if (type === "choix_unique" || type === "choix_multiple") {
      if (options.length < 2) throw new Error("Les questions à choix nécessitent au moins 2 options");
    } else {
      options = [];
    }
    return {
      ordre: i,
      type,
      libelle: String(item.libelle || "").trim() || "Question sans titre",
      options,
      obligatoire: !!item.obligatoire,
    };
  });
}

function validerReponses(
  questions: Array<Record<string, unknown>>,
  reponsesObj: unknown,
) {
  const out: Record<string, unknown> = {};
  const src =
    reponsesObj && typeof reponsesObj === "object"
      ? (reponsesObj as Record<string, unknown>)
      : {};
  for (const q of questions) {
    const key = String(q.id);
    const raw = src[key] !== undefined ? src[key] : src[q.id as number];
    if (q.obligatoire) {
      if (raw === undefined || raw === null || raw === "") {
        throw new Error(`Réponse obligatoire manquante : ${q.libelle}`);
      }
      if (Array.isArray(raw) && raw.length === 0) {
        throw new Error(`Réponse obligatoire manquante : ${q.libelle}`);
      }
    }
    if (raw === undefined || raw === null || raw === "") continue;
    const opts = Array.isArray(q.options) ? q.options.map(String) : [];
    if (q.type === "texte" || q.type === "paragraphe") {
      const s = String(raw).trim();
      if (!s && q.obligatoire) throw new Error(`Réponse obligatoire : ${q.libelle}`);
      if (s) out[key] = s.slice(0, q.type === "paragraphe" ? 8000 : 500);
    } else if (q.type === "choix_unique") {
      const s = String(raw).trim();
      if (!opts.includes(s)) throw new Error(`Choix invalide pour : ${q.libelle}`);
      out[key] = s;
    } else if (q.type === "choix_multiple") {
      const arr = Array.isArray(raw) ? raw : [raw];
      const set = arr.map((x) => String(x).trim()).filter(Boolean);
      for (const x of set) {
        if (!opts.includes(x)) throw new Error(`Option invalide pour : ${q.libelle}`);
      }
      if (q.obligatoire && set.length === 0) throw new Error(`Réponse obligatoire : ${q.libelle}`);
      if (set.length) out[key] = set;
    }
  }
  return out;
}

export async function handleSondagesRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  const pool = createPool();

  try {
    const publicGetMatch = path.match(/^\/sondages\/public\/([^/]+)$/);
    if (publicGetMatch && req.method === "GET") {
      const token = String(publicGetMatch[1] || "").trim();
      if (!token || token.length > 80) return json(cors, { message: "Lien invalide" }, 400);
      const s = await pool.query(
        "SELECT id, titre, description, actif, accepte_reponses FROM sondages WHERE public_token = $1",
        [token],
      );
      if (s.rows.length === 0) return json(cors, { message: "Formulaire introuvable" }, 404);
      const row = s.rows[0];
      if (!row.actif) return json(cors, { message: "Ce formulaire n'est plus disponible" }, 403);
      if (!row.accepte_reponses) {
        return json(cors, { message: "Les réponses ne sont plus acceptées" }, 403);
      }
      const q = await pool.query(
        "SELECT id, ordre, type, libelle, options, obligatoire FROM sondage_questions WHERE sondage_id = $1 ORDER BY ordre ASC, id ASC",
        [row.id],
      );
      return json(cors, {
        titre: row.titre,
        description: row.description,
        questions: q.rows.map((r) => ({ ...r, options: r.options || [] })),
      });
    }

    const publicPostMatch = path.match(/^\/sondages\/public\/([^/]+)\/repondre$/);
    if (publicPostMatch && req.method === "POST") {
      try {
        const token = String(publicPostMatch[1] || "").trim();
        if (!token || token.length > 80) return json(cors, { message: "Lien invalide" }, 400);
        const s = await pool.query(
          "SELECT id, actif, accepte_reponses FROM sondages WHERE public_token = $1",
          [token],
        );
        if (s.rows.length === 0) return json(cors, { message: "Formulaire introuvable" }, 404);
        const row = s.rows[0];
        if (!row.actif) return json(cors, { message: "Ce formulaire n'est plus disponible" }, 403);
        if (!row.accepte_reponses) {
          return json(cors, { message: "Les réponses ne sont plus acceptées" }, 403);
        }

        const q = await pool.query(
          "SELECT id, ordre, type, libelle, options, obligatoire FROM sondage_questions WHERE sondage_id = $1 ORDER BY ordre ASC, id ASC",
          [row.id],
        );
        const questions = q.rows.map((r) => ({ ...r, options: r.options || [] }));
        if (questions.length === 0) {
          return json(cors, { message: "Ce formulaire n'a aucune question" }, 400);
        }

        const body = await parseJsonBody(req);
        const reponsesBrutes = body.reponses !== undefined ? body.reponses : body;
        const cleaned = validerReponses(questions, reponsesBrutes);

        const ins = await pool.query(
          `INSERT INTO sondage_reponses (sondage_id, reponses) VALUES ($1, $2::jsonb) RETURNING id, submitted_at`,
          [row.id, JSON.stringify(cleaned)],
        );
        return json(
          cors,
          { ok: true, id: ins.rows[0].id, submitted_at: ins.rows[0].submitted_at },
          201,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur envoi";
        return json(cors, { message: msg }, 400);
      }
    }

    const user = await loadUser(req);
    const authErr = requireAuth(user, cors, path);
    if (authErr) return authErr;

    if (path === "/sondages" && req.method === "GET") {
      const r = await pool.query(`
        SELECT s.id, s.titre, s.description, s.public_token, s.actif, s.accepte_reponses, s.created_at, s.updated_at,
          (SELECT COUNT(*)::int FROM sondage_reponses r WHERE r.sondage_id = s.id) AS nb_reponses
        FROM sondages s
        ORDER BY s.updated_at DESC NULLS LAST, s.id DESC
      `);
      return json(cors, r.rows);
    }

    if (path === "/sondages" && req.method === "POST") {
      const client = await pool.connect();
      try {
        const body = await parseJsonBody(req);
        const { titre, description, questions: rawQ } = body;
        const questions = normaliserQuestions(rawQ);
        const token = genToken();
        await client.query("BEGIN");
        const ins = await client.query(
          `INSERT INTO sondages (titre, description, public_token, created_by)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [
            String(titre || "Nouveau sondage").slice(0, 500),
            description || null,
            token,
            user?.id || null,
          ],
        );
        const sid = ins.rows[0].id;
        for (const q of questions) {
          await client.query(
            `INSERT INTO sondage_questions (sondage_id, ordre, type, libelle, options, obligatoire)
             VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
            [sid, q.ordre, q.type, q.libelle, JSON.stringify(q.options), q.obligatoire],
          );
        }
        await client.query("COMMIT");
        const full = await getSondageFull(pool, sid);
        return json(cors, full, 201);
      } catch (err) {
        await client.query("ROLLBACK");
        const msg = err instanceof Error ? err.message : "Erreur création";
        return json(cors, { message: msg }, 400);
      } finally {
        client.release();
      }
    }

    const reponsesMatch = path.match(/^\/sondages\/(\d+)\/reponses$/);
    if (reponsesMatch && req.method === "GET") {
      const id = parseInt(reponsesMatch[1], 10);
      if (!id) return json(cors, { message: "Identifiant invalide" }, 400);
      const r = await pool.query(
        `SELECT id, reponses, submitted_at FROM sondage_reponses WHERE sondage_id = $1 ORDER BY submitted_at DESC LIMIT 1000`,
        [id],
      );
      return json(cors, r.rows);
    }

    const idMatch = path.match(/^\/sondages\/(\d+)$/);
    if (idMatch) {
      const id = parseInt(idMatch[1], 10);
      if (!id) return json(cors, { message: "Identifiant invalide" }, 400);

      if (req.method === "GET") {
        const full = await getSondageFull(pool, id);
        if (!full) return json(cors, { message: "Sondage introuvable" }, 404);
        return json(cors, full);
      }

      if (req.method === "PUT") {
        const client = await pool.connect();
        try {
          const cur = await client.query(
            "SELECT id, titre, description, actif, accepte_reponses FROM sondages WHERE id = $1",
            [id],
          );
          if (cur.rows.length === 0) return json(cors, { message: "Sondage introuvable" }, 404);
          const row = cur.rows[0];

          const body = await parseJsonBody(req);
          const { titre, description, actif, accepte_reponses, questions: rawQ } = body;
          const questions = rawQ !== undefined ? normaliserQuestions(rawQ) : null;
          const newTitre = titre !== undefined ? String(titre).slice(0, 500) : row.titre;
          const newDesc = description !== undefined ? description : row.description;
          const newActif = actif !== undefined ? !!actif : row.actif;
          const newAcc = accepte_reponses !== undefined ? !!accepte_reponses : row.accepte_reponses;

          await client.query("BEGIN");
          await client.query(
            `UPDATE sondages SET titre = $2, description = $3, actif = $4, accepte_reponses = $5, updated_at = NOW() WHERE id = $1`,
            [id, newTitre, newDesc, newActif, newAcc],
          );

          if (questions !== null) {
            await client.query("DELETE FROM sondage_questions WHERE sondage_id = $1", [id]);
            for (const q of questions) {
              await client.query(
                `INSERT INTO sondage_questions (sondage_id, ordre, type, libelle, options, obligatoire)
                 VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
                [id, q.ordre, q.type, q.libelle, JSON.stringify(q.options), q.obligatoire],
              );
            }
          }
          await client.query("COMMIT");
          return json(cors, await getSondageFull(pool, id));
        } catch (err) {
          await client.query("ROLLBACK");
          const msg = err instanceof Error ? err.message : "Erreur mise à jour";
          return json(cors, { message: msg }, 400);
        } finally {
          client.release();
        }
      }

      if (req.method === "DELETE") {
        await pool.query("DELETE FROM sondages WHERE id = $1", [id]);
        return json(cors, { ok: true });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("sondages-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: msg }, 500);
  } finally {
    await pool.end();
  }
}
