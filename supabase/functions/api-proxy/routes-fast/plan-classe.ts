import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAuth } from "./middleware.ts";

export async function handlePlanClasseRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    const match = path.match(/^\/plan-classe\/(\d+)$/);
    if (match) {
      const classeId = match[1];

      if (req.method === "GET") {
        const r = await pool.query("SELECT * FROM plan_classe WHERE classe_id=$1", [classeId]);
        if (!r.rows[0]) return json(cors, { positions: {} });
        const positions =
          typeof r.rows[0].positions === "string"
            ? JSON.parse(r.rows[0].positions)
            : (r.rows[0].positions || {});
        return json(cors, { positions });
      }

      if (req.method === "POST") {
        const body = await parseJsonBody(req);
        const { positions } = body;
        await pool.query(
          `INSERT INTO plan_classe (classe_id, positions, updated_at) VALUES ($1,$2,NOW())
           ON CONFLICT (classe_id) DO UPDATE SET positions=$2, updated_at=NOW()`,
          [classeId, JSON.stringify(positions)],
        );
        return json(cors, { message: "Plan sauvegardé" });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("plan-classe-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: msg }, 500);
  } finally {
    await pool.end();
  }
}
