import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAuth } from "./middleware.ts";

async function ensureTable(pool: ReturnType<typeof createPool>): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes_personnelles (
      id SERIAL PRIMARY KEY,
      utilisateur_id INTEGER NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
      contenu TEXT DEFAULT '',
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

export async function handleNotesPersonnellesRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    if (path === "/notes-personnelles" && req.method === "GET") {
      await ensureTable(pool);
      const r = await pool.query(
        "SELECT contenu, updated_at FROM notes_personnelles WHERE utilisateur_id = $1",
        [user!.id],
      );
      return json(cors, {
        contenu: r.rows[0]?.contenu || "",
        updated_at: r.rows[0]?.updated_at || null,
      });
    }

    if (path === "/notes-personnelles" && req.method === "PUT") {
      await ensureTable(pool);
      const body = await parseJsonBody(req);
      const { contenu } = body;
      await pool.query(
        `
        INSERT INTO notes_personnelles (utilisateur_id, contenu, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (utilisateur_id) DO UPDATE SET contenu = $2, updated_at = NOW()
      `,
        [user!.id, contenu || ""],
      );
      return json(cors, { ok: true });
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("notes-personnelles-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: msg }, 500);
  } finally {
    await pool.end();
  }
}
