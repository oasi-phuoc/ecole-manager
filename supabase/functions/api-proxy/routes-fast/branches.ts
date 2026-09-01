import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAdmin, requireAuth } from "./middleware.ts";

export async function handleBranchesRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    if (path === "/branches" && req.method === "GET") {
      const result = await pool.query("SELECT * FROM matieres ORDER BY niveau, nom");
      return json(cors, result.rows);
    }

    if (path === "/branches" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { nom, niveau, periodes_semaine, coefficient, type_branche, designation_courte, suivi_notes } =
        body;
      if (!nom) return json(cors, { message: "Le nom est requis" }, 400);
      if (!periodes_semaine) return json(cors, { message: "Les périodes/semaine sont requises" }, 400);
      if (!niveau) return json(cors, { message: "Le niveau est requis" }, 400);
      if (!designation_courte || !String(designation_courte).trim()) {
        return json(cors, { message: "La désignation courte est requise" }, 400);
      }

      const r = await pool.query(
        "INSERT INTO matieres (nom, niveau, periodes_semaine, coefficient, type_branche, designation_courte, suivi_notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [
          nom,
          niveau,
          parseInt(String(periodes_semaine)),
          parseFloat(String(coefficient)) || 1,
          type_branche || "principale",
          String(designation_courte).trim(),
          suivi_notes !== false,
        ],
      );
      return json(cors, r.rows[0], 201);
    }

    const idMatch = path.match(/^\/branches\/(\d+)$/);
    if (idMatch) {
      const id = idMatch[1];

      if (req.method === "PUT") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const body = await parseJsonBody(req);
        const { nom, niveau, periodes_semaine, coefficient, type_branche, designation_courte, suivi_notes } =
          body;
        if (!designation_courte || !String(designation_courte).trim()) {
          return json(cors, { message: "La désignation courte est requise" }, 400);
        }

        const r = await pool.query(
          "UPDATE matieres SET nom=$1, niveau=$2, periodes_semaine=$3, coefficient=$4, type_branche=$5, designation_courte=$6, suivi_notes=$7 WHERE id=$8 RETURNING *",
          [
            nom,
            niveau,
            parseInt(String(periodes_semaine)),
            parseFloat(String(coefficient)) || 1,
            type_branche || "principale",
            String(designation_courte).trim(),
            suivi_notes !== false,
            id,
          ],
        );
        if (!r.rows.length) return json(cors, { message: "Branche non trouvée" }, 404);
        return json(cors, r.rows[0]);
      }

      if (req.method === "DELETE") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        await pool.query("DELETE FROM matieres WHERE id=$1", [id]);
        return json(cors, { message: "Branche supprimée" });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("branches-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: "Erreur serveur", erreur: msg }, 500);
  } finally {
    await pool.end();
  }
}
