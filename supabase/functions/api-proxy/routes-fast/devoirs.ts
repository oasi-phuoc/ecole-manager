import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAuth } from "./middleware.ts";

export async function handleDevoirsRoute(
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
    if (path === "/devoirs" && req.method === "GET") {
      const classe_id = url.searchParams.get("classe_id");
      if (!classe_id) return json(cors, { message: "classe_id requis" }, 400);
      const r = await pool.query(
        "SELECT * FROM devoirs WHERE classe_id=$1 ORDER BY date_remise DESC, created_at DESC",
        [classe_id],
      );
      return json(cors, r.rows);
    }

    if (path === "/devoirs" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const { classe_id, titre, matiere, date_devoir, date_remise } = body;
      if (!classe_id || !titre) {
        return json(cors, { message: "classe_id et titre requis" }, 400);
      }
      const r = await pool.query(
        "INSERT INTO devoirs (classe_id, titre, matiere, date_devoir, date_remise) VALUES ($1,$2,$3,$4,$5) RETURNING *",
        [classe_id, titre, matiere || null, date_devoir || null, date_remise || null],
      );
      return json(cors, r.rows[0], 201);
    }

    const suiviMatch = path.match(/^\/devoirs\/(\d+)\/suivi(?:\/(\d+))?$/);
    if (suiviMatch) {
      const id = suiviMatch[1];
      const eleveId = suiviMatch[2];

      if (!eleveId && req.method === "GET") {
        const r = await pool.query(
          `SELECT sd.eleve_id, sd.statut, sd.commentaire,
                  COALESCE(u.nom, e.nom) as nom, COALESCE(u.prenom, e.prenom) as prenom
           FROM suivi_devoirs sd
           JOIN eleves e ON sd.eleve_id = e.id
           LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
           WHERE sd.devoir_id=$1
           ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)`,
          [id],
        );
        return json(cors, r.rows);
      }

      if (eleveId && req.method === "PUT") {
        const body = await parseJsonBody(req);
        const { statut, commentaire } = body;
        if (!["rendu", "non_rendu", "partiel", "excuse"].includes(statut)) {
          return json(cors, { message: "Statut invalide" }, 400);
        }
        await pool.query(
          `INSERT INTO suivi_devoirs (devoir_id, eleve_id, statut, commentaire, updated_at)
           VALUES ($1,$2,$3,$4,NOW())
           ON CONFLICT (devoir_id, eleve_id) DO UPDATE SET statut=$3, commentaire=$4, updated_at=NOW()`,
          [id, eleveId, statut, commentaire || null],
        );
        return json(cors, { message: "Statut mis à jour" });
      }
    }

    const idMatch = path.match(/^\/devoirs\/(\d+)$/);
    if (idMatch && req.method === "DELETE") {
      await pool.query("DELETE FROM devoirs WHERE id=$1", [idMatch[1]]);
      return json(cors, { message: "Devoir supprimé" });
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("devoirs-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: msg }, 500);
  } finally {
    await pool.end();
  }
}
