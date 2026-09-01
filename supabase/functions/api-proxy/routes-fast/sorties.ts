import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAuth } from "./middleware.ts";

export async function handleSortiesRoute(
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
    if (path === "/sorties" && req.method === "GET") {
      const type = url.searchParams.get("type");
      let q = "SELECT * FROM sorties_scolaires";
      const params: string[] = [];
      if (type) {
        q += " WHERE type = $1";
        params.push(type);
      }
      q += " ORDER BY date_sortie DESC, created_at DESC";
      const r = await pool.query(q, params);
      return json(cors, r.rows);
    }

    if (path === "/sorties" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const {
        type,
        classes_ids,
        classes_noms,
        titulaires,
        autres_accompagnants,
        date_sortie,
        destination,
        activites,
        lieu_depart,
        heure_depart,
        lieu_retour,
        heure_retour,
        budget,
        commentaires,
        approuve,
      } = body;
      const r = await pool.query(
        `INSERT INTO sorties_scolaires (type, classes_ids, classes_noms, titulaires, autres_accompagnants, date_sortie, destination, activites, lieu_depart, heure_depart, lieu_retour, heure_retour, budget, commentaires, approuve)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [
          type,
          classes_ids || null,
          classes_noms || null,
          titulaires,
          autres_accompagnants,
          date_sortie || null,
          destination,
          activites,
          lieu_depart,
          heure_depart || null,
          lieu_retour,
          heure_retour || null,
          budget || null,
          commentaires,
          approuve || false,
        ],
      );
      return json(cors, r.rows[0]);
    }

    const idMatch = path.match(/^\/sorties\/(\d+)$/);
    if (idMatch) {
      const id = idMatch[1];

      if (req.method === "PUT") {
        const body = await parseJsonBody(req);
        const {
          type,
          classes_ids,
          classes_noms,
          titulaires,
          autres_accompagnants,
          date_sortie,
          destination,
          activites,
          lieu_depart,
          heure_depart,
          lieu_retour,
          heure_retour,
          budget,
          commentaires,
          approuve,
        } = body;
        const r = await pool.query(
          `UPDATE sorties_scolaires SET type=$1, classes_ids=$2, classes_noms=$3, titulaires=$4, autres_accompagnants=$5, date_sortie=$6, destination=$7, activites=$8, lieu_depart=$9, heure_depart=$10, lieu_retour=$11, heure_retour=$12, budget=$13, commentaires=$14, approuve=$15
           WHERE id=$16 RETURNING *`,
          [
            type,
            classes_ids || null,
            classes_noms || null,
            titulaires,
            autres_accompagnants,
            date_sortie || null,
            destination,
            activites,
            lieu_depart,
            heure_depart || null,
            lieu_retour,
            heure_retour || null,
            budget || null,
            commentaires,
            approuve || false,
            id,
          ],
        );
        return json(cors, r.rows[0]);
      }

      if (req.method === "DELETE") {
        await pool.query("DELETE FROM sorties_scolaires WHERE id=$1", [id]);
        return json(cors, { message: "Supprimé" });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("sorties-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: msg }, 500);
  } finally {
    await pool.end();
  }
}
