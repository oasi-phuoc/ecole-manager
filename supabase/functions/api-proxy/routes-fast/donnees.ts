import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAuth } from "./middleware.ts";

export async function handleDonneesRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  const pool = createPool();
  try {
    if (path === "/donnees/niveaux" && req.method === "GET") {
      const r = await pool.query("SELECT * FROM niveaux ORDER BY ordre, nom");
      return json(cors, r.rows);
    }

    if (path === "/donnees/niveaux" && req.method === "POST") {
      const user = await loadUser(req);
      const authErr = requireAuth(user, cors, path);
      if (authErr) return authErr;
      const body = await parseJsonBody(req);
      const { nom, ordre = 0, periodes_normales = 20, periodes_soutien = 0 } = body;
      const pn = Math.max(0, parseInt(String(periodes_normales), 10) || 0);
      const ps = Math.max(0, parseInt(String(periodes_soutien), 10) || 0);
      const r = await pool.query(
        "INSERT INTO niveaux (nom, ordre, periodes_normales, periodes_soutien) VALUES ($1,$2,$3,$4) RETURNING *",
        [nom, ordre, pn, ps],
      );
      return json(cors, r.rows[0]);
    }

    const niveauMatch = path.match(/^\/donnees\/niveaux\/(\d+)$/);
    if (niveauMatch) {
      const id = niveauMatch[1];
      const user = await loadUser(req);
      const authErr = requireAuth(user, cors, path);
      if (authErr) return authErr;

      if (req.method === "PUT") {
        const body = await parseJsonBody(req);
        const { nom, ordre, periodes_normales, periodes_soutien } = body;
        const pn =
          periodes_normales === undefined || periodes_normales === null || periodes_normales === ""
            ? null
            : Math.max(0, parseInt(String(periodes_normales), 10) || 0);
        const ps =
          periodes_soutien === undefined || periodes_soutien === null || periodes_soutien === ""
            ? null
            : Math.max(0, parseInt(String(periodes_soutien), 10) || 0);
        const r = await pool.query(
          `UPDATE niveaux SET
             nom=$1,
             ordre=$2,
             periodes_normales=COALESCE($3, periodes_normales),
             periodes_soutien=COALESCE($4, periodes_soutien)
           WHERE id=$5 RETURNING *`,
          [nom, ordre, pn, ps, id],
        );
        return json(cors, r.rows[0]);
      }

      if (req.method === "DELETE") {
        await pool.query("DELETE FROM niveaux WHERE id=$1", [id]);
        return json(cors, { ok: true });
      }
    }

    if (path === "/donnees/lieux-travail" && req.method === "GET") {
      const r = await pool.query(
        "SELECT * FROM lieux_travail ORDER BY COALESCE(ordre, 0), nom",
      );
      return json(cors, r.rows);
    }

    if (path === "/donnees/lieux-travail" && req.method === "POST") {
      const user = await loadUser(req);
      const authErr = requireAuth(user, cors, path);
      if (authErr) return authErr;
      const body = await parseJsonBody(req);
      const { nom, ordre = 0 } = body;
      const r = await pool.query(
        "INSERT INTO lieux_travail (nom, ordre) VALUES ($1,$2) RETURNING *",
        [nom, ordre],
      );
      return json(cors, r.rows[0]);
    }

    const lieuMatch = path.match(/^\/donnees\/lieux-travail\/(\d+)$/);
    if (lieuMatch) {
      const id = lieuMatch[1];
      const user = await loadUser(req);
      const authErr = requireAuth(user, cors, path);
      if (authErr) return authErr;

      if (req.method === "PUT") {
        const body = await parseJsonBody(req);
        const { nom, ordre } = body;
        const r = await pool.query(
          "UPDATE lieux_travail SET nom=$1, ordre=$2 WHERE id=$3 RETURNING *",
          [nom, ordre ?? 0, id],
        );
        return json(cors, r.rows[0]);
      }

      if (req.method === "DELETE") {
        await pool.query("DELETE FROM lieux_travail WHERE id=$1", [id]);
        return json(cors, { ok: true });
      }
    }

    if (path === "/donnees/salles" && req.method === "GET") {
      const r = await pool.query(`
        SELECT s.*, l.nom AS lieu_nom
        FROM salles s
        LEFT JOIN lieux_travail l ON l.id = s.lieu_travail_id
        ORDER BY l.nom, s.nom
      `);
      return json(cors, r.rows);
    }

    if (path === "/donnees/salles" && req.method === "POST") {
      const user = await loadUser(req);
      const authErr = requireAuth(user, cors, path);
      if (authErr) return authErr;
      const body = await parseJsonBody(req);
      const { nom, lieu_travail_id } = body;
      const r = await pool.query(
        "INSERT INTO salles (nom, lieu_travail_id) VALUES ($1,$2) RETURNING *",
        [nom, lieu_travail_id],
      );
      return json(cors, r.rows[0]);
    }

    const salleMatch = path.match(/^\/donnees\/salles\/(\d+)$/);
    if (salleMatch) {
      const id = salleMatch[1];
      const user = await loadUser(req);
      const authErr = requireAuth(user, cors, path);
      if (authErr) return authErr;

      if (req.method === "PUT") {
        const body = await parseJsonBody(req);
        const { nom, lieu_travail_id } = body;
        const r = await pool.query(
          "UPDATE salles SET nom=$1, lieu_travail_id=$2 WHERE id=$3 RETURNING *",
          [nom, lieu_travail_id, id],
        );
        return json(cors, r.rows[0]);
      }

      if (req.method === "DELETE") {
        await pool.query("DELETE FROM salles WHERE id=$1", [id]);
        return json(cors, { ok: true });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("donnees-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: msg }, 500);
  } finally {
    await pool.end();
  }
}
