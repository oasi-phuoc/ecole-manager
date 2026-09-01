import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAuth } from "./middleware.ts";

export async function handleObservationsRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    const eleveMatch = path.match(/^\/observations\/eleve\/(\d+)$/);
    if (eleveMatch) {
      const eleveId = eleveMatch[1];

      if (req.method === "GET") {
        const r = await pool.query(
          `
          SELECT o.*, u.nom as auteur_nom, u.prenom as auteur_prenom
          FROM observations o
          LEFT JOIN utilisateurs u ON u.id=o.auteur_id
          WHERE o.eleve_id=$1
          ORDER BY o.created_at DESC
        `,
          [eleveId],
        );
        return json(cors, r.rows);
      }

      if (req.method === "POST") {
        const body = await parseJsonBody(req);
        const { titre, contenu, mesure_prise, intervention_responsable, demande_entretien } = body;

        const eleveRes = await pool.query(
          `
          SELECT
            e.id,
            u.nom, u.prenom
          FROM eleves e
          LEFT JOIN utilisateurs u ON u.id = e.utilisateur_id
          WHERE e.id = $1
        `,
          [eleveId],
        );
        if (!eleveRes.rows.length) {
          return json(cors, { message: "Élève introuvable" }, 404);
        }

        const nom = String(eleveRes.rows[0]?.nom || "").trim();
        const prenom = String(eleveRes.rows[0]?.prenom || "").trim();
        const initialNom = nom ? nom[0].toUpperCase() : "X";
        const initialPrenom = prenom ? prenom[0].toUpperCase() : "X";
        const prefix = `${initialPrenom}${initialNom}`;

        const seqRes = await pool.query(
          `
          SELECT COUNT(*)::int AS nb
          FROM observations
          WHERE eleve_id = $1
        `,
          [eleveId],
        );
        const nextNum = (seqRes.rows[0]?.nb || 0) + 1;
        const referenceObs = `${prefix}-${String(nextNum).padStart(2, "0")}`;

        const r = await pool.query(
          "INSERT INTO observations (eleve_id, reference_obs, titre, contenu, mesure_prise, intervention_responsable, demande_entretien, auteur_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
          [
            eleveId,
            referenceObs,
            titre,
            contenu,
            mesure_prise || null,
            intervention_responsable || false,
            demande_entretien || false,
            user!.id,
          ],
        );
        return json(cors, r.rows[0], 201);
      }
    }

    const idMatch = path.match(/^\/observations\/(\d+)$/);
    if (idMatch) {
      const id = idMatch[1];

      if (req.method === "PUT") {
        const body = await parseJsonBody(req);
        const { titre, contenu, mesure_prise, intervention_responsable, demande_entretien } = body;
        await pool.query(
          "UPDATE observations SET titre=$1, contenu=$2, mesure_prise=$3, intervention_responsable=$4, demande_entretien=$5 WHERE id=$6",
          [
            titre,
            contenu,
            mesure_prise || null,
            intervention_responsable || false,
            demande_entretien || false,
            id,
          ],
        );
        return json(cors, { message: "Observation modifiée" });
      }

      if (req.method === "DELETE") {
        await pool.query("DELETE FROM observations WHERE id=$1", [id]);
        return json(cors, { message: "Observation supprimée" });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("observations-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: "Erreur serveur", erreur: msg }, 500);
  } finally {
    await pool.end();
  }
}
