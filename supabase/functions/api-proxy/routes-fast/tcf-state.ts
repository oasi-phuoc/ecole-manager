import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAuth } from "./middleware.ts";

const CLES_AUTORISEES = new Set(["pool", "affectation", "resultats"]);

function normaliserCle(raw: string): string {
  return String(raw || "").trim().toLowerCase();
}

export async function handleTcfStateRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    const match = path.match(/^\/tcf-state\/([^/]+)$/);
    if (match) {
      const cle = normaliserCle(match[1]);
      if (!CLES_AUTORISEES.has(cle)) {
        return json(cors, { message: "Cle TCF invalide" }, 400);
      }

      if (req.method === "GET") {
        const result = await pool.query(
          "SELECT donnees, updated_at FROM tcf_state WHERE cle = $1 LIMIT 1",
          [cle],
        );
        if (!result.rows.length) {
          return json(cors, { donnees: {}, updated_at: null });
        }
        return json(cors, {
          donnees: result.rows[0].donnees || {},
          updated_at: result.rows[0].updated_at || null,
        });
      }

      if (req.method === "PUT") {
        const body = await parseJsonBody(req);
        const donnees = body.donnees;
        if (
          donnees === undefined ||
          donnees === null ||
          typeof donnees !== "object" ||
          Array.isArray(donnees)
        ) {
          return json(cors, { message: 'Le payload "donnees" doit etre un objet JSON' }, 400);
        }

        const result = await pool.query(
          `INSERT INTO tcf_state (cle, donnees, updated_by, updated_at)
           VALUES ($1, $2::jsonb, $3, NOW())
           ON CONFLICT (cle)
           DO UPDATE SET donnees = EXCLUDED.donnees, updated_by = EXCLUDED.updated_by, updated_at = NOW()
           RETURNING updated_at`,
          [cle, JSON.stringify(donnees), user!.id],
        );
        return json(cors, {
          message: "Etat TCF enregistre",
          updated_at: result.rows[0]?.updated_at || null,
        });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("tcf-state-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: "Erreur serveur", erreur: msg }, 500);
  } finally {
    await pool.end();
  }
}
