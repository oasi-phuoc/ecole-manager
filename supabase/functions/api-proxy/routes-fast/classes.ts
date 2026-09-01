import { createPool, json } from "../auth-fast-shared.ts";
import { hydrateElevesPhotos } from "./storage.ts";
import { loadUser, parseJsonBody, requireAdmin, requireAuth } from "./middleware.ts";

export async function handleClassesRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    if (path === "/classes" && req.method === "GET") {
      const result = await pool.query(`
        SELECT c.*, u.nom as prof_nom, u.prenom as prof_prenom, u.sexe as prof_sexe,
          COUNT(DISTINCT e.id) as nb_eleves
        FROM classes c
        LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
        LEFT JOIN eleves e ON e.classe_id=c.id
        GROUP BY c.id, u.nom, u.prenom, u.sexe
        ORDER BY c.nom
      `);
      return json(cors, result.rows);
    }

    if (path === "/classes" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { nom, niveau, annee_scolaire, prof_principal_id } = body;
      if (!nom) return json(cors, { message: "Le nom est requis" }, 400);
      if (!niveau) return json(cors, { message: "Le niveau est requis" }, 400);

      const existe = await pool.query(
        `SELECT id FROM classes
         WHERE LOWER(TRIM(nom)) = LOWER(TRIM($1))
           AND UPPER(TRIM(COALESCE(niveau, ''))) = UPPER(TRIM($2))
         LIMIT 1`,
        [nom, niveau],
      );
      if (existe.rows.length) {
        return json(cors, { message: "Une classe avec le même nom et le même niveau existe déjà" }, 409);
      }

      const r = await pool.query(
        "INSERT INTO classes (nom, niveau, annee_scolaire, prof_principal_id) VALUES ($1,$2,$3,$4) RETURNING *",
        [nom, niveau || null, annee_scolaire, prof_principal_id || null],
      );
      return json(cors, r.rows[0], 201);
    }

    const elevesMatch = path.match(/^\/classes\/(\d+)\/eleves$/);
    if (elevesMatch && req.method === "GET") {
      const id = elevesMatch[1];
      const eleves = await pool.query(
        `
        SELECT e.*,
          COALESCE(u.nom, e.nom) as nom,
          COALESCE(u.prenom, e.prenom) as prenom,
          u.email,
          (SELECT COUNT(*)::int FROM observations o WHERE o.eleve_id = e.id) AS nb_observations,
          (SELECT COUNT(*)::int FROM sanctions_eleves s WHERE s.eleve_id = e.id) AS nb_sanctions
        FROM eleves e
        LEFT JOIN utilisateurs u ON u.id=e.utilisateur_id
        WHERE e.classe_id=$1
        ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)
      `,
        [id],
      );
      return json(cors, await hydrateElevesPhotos(eleves.rows));
    }

    const idMatch = path.match(/^\/classes\/(\d+)$/);
    if (idMatch) {
      const id = idMatch[1];

      if (req.method === "GET") {
        const result = await pool.query(
          `
          SELECT c.*, u.nom as prof_nom, u.prenom as prof_prenom, u.sexe as prof_sexe
          FROM classes c LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
          WHERE c.id=$1
        `,
          [id],
        );
        if (!result.rows.length) return json(cors, { message: "Classe non trouvée" }, 404);
        return json(cors, result.rows[0]);
      }

      if (req.method === "PUT") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const body = await parseJsonBody(req);
        const { nom, niveau, annee_scolaire, prof_principal_id, actif } = body;

        const ancien = await pool.query("SELECT nom FROM classes WHERE id=$1", [id]);
        const ancienNom = ancien.rows[0]?.nom || "";

        const r = await pool.query(
          "UPDATE classes SET nom=$1, niveau=$2, annee_scolaire=$3, prof_principal_id=$4, actif=$5 WHERE id=$6 RETURNING *",
          [
            nom,
            niveau || null,
            annee_scolaire,
            prof_principal_id || null,
            actif !== undefined ? actif : true,
            id,
          ],
        );
        if (!r.rows.length) return json(cors, { message: "Classe non trouvée" }, 404);

        if (ancienNom && nom && ancienNom !== nom) {
          const oldKey = String(ancienNom).replace(/\s+/g, "");
          const newKey = String(nom).replace(/\s+/g, "");
          if (oldKey && newKey && oldKey !== newKey) {
            await pool.query(
              `UPDATE eleves SET oasi_prog_nom = REPLACE(oasi_prog_nom, $1, $2) WHERE classe_id=$3 AND oasi_prog_nom LIKE $4`,
              [oldKey, newKey, id, "%" + oldKey + "%"],
            );
          }
        }

        return json(cors, r.rows[0]);
      }

      if (req.method === "DELETE") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        await pool.query("DELETE FROM classes WHERE id=$1", [id]);
        return json(cors, { message: "Classe supprimée" });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("classes-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: "Erreur serveur", erreur: msg }, 500);
  } finally {
    await pool.end();
  }
}
