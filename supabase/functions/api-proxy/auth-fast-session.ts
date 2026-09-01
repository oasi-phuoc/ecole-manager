import { createPool, json, verifyJwtFromRequest } from "./auth-fast-shared.ts";

export async function handleAuthMoi(
  req: Request,
  cors: Record<string, string>,
): Promise<Response> {
  const auth = verifyJwtFromRequest(req);
  if (!auth) return json(cors, { message: "Token manquant" }, 401);

  const pool = createPool();
  try {
    const result = await pool.query(
      `SELECT id, nom, prenom, email, role, created_at, mfa_enabled, mfa_exempt, doit_changer_mdp
       FROM utilisateurs WHERE id = $1`,
      [auth.id],
    );
    const row = result.rows[0];
    if (!row) return json(cors, { message: "Utilisateur non trouve" }, 404);
    return json(cors, {
      ...row,
      mfa_enabled: row.mfa_enabled === true,
      mfa_exempt: row.mfa_exempt === true,
      doit_changer_mdp: row.doit_changer_mdp || false,
    });
  } catch (err) {
    console.error("auth-fast-moi error:", err);
    return json(cors, { message: "Erreur serveur" }, 500);
  } finally {
    await pool.end();
  }
}
