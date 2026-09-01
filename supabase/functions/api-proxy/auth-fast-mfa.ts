import jwt from "npm:jsonwebtoken@9";
import {
  createPool,
  decryptText,
  hashBackupCode,
  json,
  parseBackupHashes,
  verifyTotp,
} from "./auth-fast-shared.ts";

type MfaUser = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  mfa_enabled: boolean;
  mfa_secret: string | null;
  mfa_backup_codes: unknown;
  doit_changer_mdp: boolean;
};

function userResponse(user: MfaUser) {
  return {
    message: "Connexion reussie",
    utilisateur: {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      doit_changer_mdp: user.doit_changer_mdp || false,
    },
  };
}

function resolveUserId(mfaToken: string): number | null {
  if (String(mfaToken).startsWith("legacy:")) {
    const id = parseInt(String(mfaToken).slice(7), 10);
    return Number.isFinite(id) ? id : null;
  }
  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) return null;
  const decoded = jwt.verify(mfaToken, secret) as { purpose?: string; id?: number };
  if (decoded?.purpose !== "mfa-login" || !decoded?.id) return null;
  return decoded.id;
}

export async function handleAuthLoginMfa(req: Request, cors: Record<string, string>): Promise<Response> {
  const body = await req.json();
  const mfa_token = body?.mfa_token;
  const code = body?.code;
  if (!mfa_token || !code) {
    return json(cors, { message: "Token MFA ou code manquant" }, 400);
  }

  let userId: number | null;
  try {
    userId = resolveUserId(String(mfa_token));
  } catch {
    return json(cors, { message: "Token MFA invalide ou expire" }, 401);
  }
  if (!userId) {
    return json(cors, { message: "Token MFA invalide ou expire" }, 401);
  }

  const pool = createPool();
  try {
    const result = await pool.query<MfaUser>(
      "SELECT id, nom, prenom, email, role, mfa_enabled, mfa_secret, mfa_backup_codes, doit_changer_mdp FROM utilisateurs WHERE id=$1 AND actif = true",
      [userId],
    );
    const user = result.rows[0];
    if (!user) {
      return json(cors, { message: "Utilisateur introuvable" }, 401);
    }

    const secret = decryptText(user.mfa_secret || "");
    if (user.mfa_enabled !== true || !secret) {
      return json(cors, { message: "MFA non active pour cet utilisateur" }, 400);
    }

    const isTotp = verifyTotp(secret, String(code), 1);
    if (!isTotp) {
      const hashes = parseBackupHashes(user.mfa_backup_codes);
      const inputHash = hashBackupCode(String(code));
      const idx = hashes.indexOf(inputHash);
      if (idx === -1) {
        return json(cors, { message: "Code MFA invalide" }, 401);
      }
      hashes.splice(idx, 1);
      await pool.query("UPDATE utilisateurs SET mfa_backup_codes = $1::jsonb WHERE id = $2", [
        JSON.stringify(hashes),
        user.id,
      ]);
    }

    return json(cors, userResponse(user));
  } catch (err) {
    console.error("auth-fast-mfa error:", err);
    return json(cors, { message: "Token MFA invalide ou expire" }, 401);
  } finally {
    await pool.end();
  }
}
