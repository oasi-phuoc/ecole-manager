import { createPool, json, verifyJwtFromRequest } from "../auth-fast-shared.ts";

export type AuthUser = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  permissions: Record<string, boolean>;
  mfa_enabled: boolean;
  mfa_exempt: boolean;
};

const MFA_ALLOWED = new Set([
  "/auth/moi",
  "/auth/changer-mdp",
  "/auth/logout",
  "/auth/mfa/status",
  "/auth/mfa/setup",
  "/auth/mfa/enable",
  "/auth/mfa/backup/regenerate",
  "/auth/mfa/disable",
  "/auth/passkeys",
  "/auth/passkeys/register/options",
  "/auth/passkeys/register/verify",
]);

export async function parseJsonBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export async function loadUser(req: Request): Promise<AuthUser | null> {
  const auth = verifyJwtFromRequest(req);
  if (!auth) return null;

  const pool = createPool();
  try {
    const r = await pool.query(
      `SELECT id, nom, prenom, email, role, permissions, mfa_enabled, mfa_exempt
       FROM utilisateurs WHERE id = $1`,
      [auth.id],
    );
    const row = r.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      nom: row.nom,
      prenom: row.prenom,
      email: row.email,
      role: row.role,
      permissions: (row.permissions as Record<string, boolean>) || {},
      mfa_enabled: row.mfa_enabled === true,
      mfa_exempt: row.mfa_exempt === true,
    };
  } finally {
    await pool.end();
  }
}

export function requireAuth(
  user: AuthUser | null,
  cors: Record<string, string>,
  path?: string,
): Response | null {
  if (!user) return json(cors, { message: "Token manquant" }, 401);
  if (
    path &&
    user.mfa_exempt !== true &&
    user.mfa_enabled !== true &&
    !MFA_ALLOWED.has(path)
  ) {
    return json(
      cors,
      {
        message: "Double authentification obligatoire. Activez-la pour continuer.",
        mfa_required: true,
      },
      403,
    );
  }
  return null;
}

export function requireAdmin(user: AuthUser, cors: Record<string, string>): Response | null {
  if (user.role !== "admin") return json(cors, { message: "Acces refuse" }, 403);
  return null;
}

export function requireRole(
  user: AuthUser,
  cors: Record<string, string>,
  ...roles: string[]
): Response | null {
  if (!roles.includes(user.role)) return json(cors, { message: "Acces refuse" }, 403);
  return null;
}

export function requirePermission(
  user: AuthUser,
  cors: Record<string, string>,
  module: string,
): Response | null {
  if (user.role === "admin") return null;
  if (user.permissions?.[module] === true) return null;
  return json(cors, { message: "Permission refusee" }, 403);
}
