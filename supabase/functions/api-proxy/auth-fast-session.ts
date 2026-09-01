import bcrypt from "npm:bcryptjs@2";
import { createPool, json, verifyJwtFromRequest } from "./auth-fast-shared.ts";

function mdpFortValide(mdp: unknown): string | null {
  const s = String(mdp || "");
  if (s.length < 12) return "Le mot de passe doit contenir au moins 12 caractères";
  if (!/[A-Z]/.test(s)) return "Au moins une lettre majuscule requise";
  if (!/[a-z]/.test(s)) return "Au moins une lettre minuscule requise";
  if (!/[0-9]/.test(s)) return "Au moins un chiffre requis";
  if (!/[^A-Za-z0-9]/.test(s)) return "Au moins un caractère spécial requis";
  return null;
}

export async function handleMoi(req: Request, cors: Record<string, string>): Promise<Response> {
  const auth = verifyJwtFromRequest(req);
  if (!auth) return json(cors, { message: "Token manquant" }, 401);

  const pool = createPool();
  try {
    const result = await pool.query(
      `SELECT id, nom, prenom, email, role, created_at, mfa_enabled, mfa_exempt, doit_changer_mdp,
              permissions, role_acces
       FROM utilisateurs WHERE id = $1`,
      [auth.id],
    );
    const row = result.rows[0];
    if (!row) return json(cors, { message: "Utilisateur non trouve" }, 404);
    return json(cors, {
      ...row,
      permissions: row.permissions || {},
      mfa_enabled: row.mfa_enabled === true,
      mfa_exempt: row.mfa_exempt === true,
      doit_changer_mdp: row.doit_changer_mdp || false,
    });
  } catch (err) {
    console.error("auth moi:", err);
    return json(cors, { message: "Erreur serveur" }, 500);
  } finally {
    await pool.end();
  }
}

export async function handleLogout(_req: Request, cors: Record<string, string>): Promise<Response> {
  return json(cors, { message: "Deconnexion reussie" });
}

export async function handleChangerMdp(req: Request, cors: Record<string, string>): Promise<Response> {
  const auth = verifyJwtFromRequest(req);
  if (!auth) return json(cors, { message: "Token manquant" }, 401);

  const body = await req.json().catch(() => ({}));
  const erreur = mdpFortValide(body?.nouveau_mdp);
  if (erreur) return json(cors, { message: erreur }, 400);

  const pool = createPool();
  try {
    const hash = await bcrypt.hash(String(body.nouveau_mdp), 10);
    await pool.query(
      "UPDATE utilisateurs SET mot_de_passe=$1, doit_changer_mdp=false WHERE id=$2",
      [hash, auth.id],
    );
    return json(cors, { message: "Mot de passe changé avec succès" });
  } catch (err) {
    console.error("auth changer-mdp:", err);
    return json(cors, { message: "Erreur serveur" }, 500);
  } finally {
    await pool.end();
  }
}
