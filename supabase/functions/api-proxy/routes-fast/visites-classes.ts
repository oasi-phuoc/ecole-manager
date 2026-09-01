import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAuth } from "./middleware.ts";

export async function handleVisitesClassesRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    if (path === "/visites-classes" && req.method === "GET") {
      const r = await pool.query(`
        SELECT v.*,
          uf.nom AS formateur_nom, uf.prenom AS formateur_prenom,
          c.nom AS classe_nom, c.niveau AS classe_niveau,
          m.nom AS branche_nom
        FROM visites_classes v
        LEFT JOIN utilisateurs uf ON uf.id = v.formateur_id
        LEFT JOIN classes c ON c.id = v.classe_id
        LEFT JOIN matieres m ON m.id = v.branche_id
        ORDER BY v.date_visite DESC, v.created_at DESC
      `);
      return json(cors, r.rows);
    }

    if (path === "/visites-classes" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const {
        formateur_id,
        classe_id,
        branche_id,
        date_visite,
        duree,
        scores,
        organisation,
        observation,
        feedback,
        valide,
      } = body;
      const r = await pool.query(
        `INSERT INTO visites_classes
          (formateur_id, classe_id, branche_id, date_visite, duree, scores, organisation, observation, feedback, valide, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [
          formateur_id || null,
          classe_id || null,
          branche_id || null,
          date_visite || null,
          duree || 1,
          JSON.stringify(scores || {}),
          JSON.stringify(organisation || {}),
          observation || null,
          feedback || null,
          valide || false,
          user!.id,
        ],
      );
      return json(cors, r.rows[0]);
    }

    const idMatch = path.match(/^\/visites-classes\/(\d+)$/);
    if (idMatch) {
      const id = idMatch[1];

      if (req.method === "PUT") {
        const body = await parseJsonBody(req);
        const {
          formateur_id,
          classe_id,
          branche_id,
          date_visite,
          duree,
          scores,
          organisation,
          observation,
          feedback,
          valide,
        } = body;
        const r = await pool.query(
          `UPDATE visites_classes SET
            formateur_id=$1, classe_id=$2, branche_id=$3, date_visite=$4, duree=$5,
            scores=$6, organisation=$7, observation=$8, feedback=$9, valide=$10,
            updated_at=NOW()
           WHERE id=$11 RETURNING *`,
          [
            formateur_id || null,
            classe_id || null,
            branche_id || null,
            date_visite || null,
            duree || 1,
            JSON.stringify(scores || {}),
            JSON.stringify(organisation || {}),
            observation || null,
            feedback || null,
            valide || false,
            id,
          ],
        );
        return json(cors, r.rows[0]);
      }

      if (req.method === "DELETE") {
        await pool.query("DELETE FROM visites_classes WHERE id=$1", [id]);
        return json(cors, { message: "Supprimé" });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("visites-classes-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: msg }, 500);
  } finally {
    await pool.end();
  }
}
