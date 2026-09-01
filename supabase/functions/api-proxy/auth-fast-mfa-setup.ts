import jwt from "npm:jsonwebtoken@9";
import {
  createPool,
  encryptText,
  generateBackupCodes,
  generateOtpAuthUrl,
  generateSecret,
  json,
  parseBackupHashes,
  verifyJwtFromRequest,
  verifyTotp,
} from "./auth-fast-shared.ts";

export async function handleMfaStatus(req: Request, cors: Record<string, string>): Promise<Response> {
  const auth = verifyJwtFromRequest(req);
  if (!auth) return json(cors, { message: "Token manquant" }, 401);

  const pool = createPool();
  try {
    const r = await pool.query(
      "SELECT mfa_enabled, mfa_exempt, mfa_backup_codes FROM utilisateurs WHERE id = $1",
      [auth.id],
    );
    const row = r.rows[0] || {};
    return json(cors, {
      mfa_enabled: row.mfa_enabled === true,
      mfa_exempt: row.mfa_exempt === true,
      backup_codes_remaining: parseBackupHashes(row.mfa_backup_codes).length,
    });
  } finally {
    await pool.end();
  }
}

export async function handleMfaSetup(req: Request, cors: Record<string, string>): Promise<Response> {
  const auth = verifyJwtFromRequest(req);
  if (!auth) return json(cors, { message: "Token manquant" }, 401);

  const pool = createPool();
  try {
    const r = await pool.query(
      "SELECT email, identifiant, mfa_exempt FROM utilisateurs WHERE id = $1",
      [auth.id],
    );
    const row = r.rows[0];
    if (!row) return json(cors, { message: "Utilisateur non trouve" }, 401);
    if (row.mfa_exempt === true) {
      return json(cors, { message: "La 2FA est desactivee pour ce compte." }, 403);
    }

    const account =
      String(row.identifiant || "").trim() ||
      String(row.email || "").trim() ||
      `user-${auth.id}`;
    const secret = generateSecret();
    const issuer = Deno.env.get("MFA_ISSUER") || "Oasis";
    const otpauth_url = generateOtpAuthUrl({ secret, accountName: account, issuer });
    const setup_token = jwt.sign(
      { purpose: "mfa-setup", id: auth.id, secret },
      Deno.env.get("JWT_SECRET")!,
      { expiresIn: "30m" },
    );

    return json(cors, {
      secret,
      otpauth_url,
      setup_token,
      issuer,
      account,
    });
  } finally {
    await pool.end();
  }
}

export async function handleMfaEnable(req: Request, cors: Record<string, string>): Promise<Response> {
  const auth = verifyJwtFromRequest(req);
  if (!auth) return json(cors, { message: "Token manquant" }, 401);

  const body = await req.json();
  const setup_token = body?.setup_token;
  const code = body?.code;
  if (!setup_token || !code) {
    return json(cors, { message: "Token setup ou code manquant" }, 400);
  }

  const pool = createPool();
  try {
    const exempt = await pool.query("SELECT mfa_exempt FROM utilisateurs WHERE id = $1", [auth.id]);
    if (exempt.rows[0]?.mfa_exempt === true) {
      return json(cors, { message: "La 2FA est desactivee pour ce compte." }, 403);
    }

    const secret = Deno.env.get("JWT_SECRET");
    if (!secret) return json(cors, { message: "Configuration de securite manquante" }, 500);

    let decoded: { purpose?: string; id?: number; secret?: string };
    try {
      decoded = jwt.verify(String(setup_token), secret) as typeof decoded;
    } catch {
      return json(cors, { message: "Token setup invalide ou expire" }, 401);
    }

    if (
      decoded?.purpose !== "mfa-setup" ||
      Number(decoded?.id) !== Number(auth.id) ||
      !decoded?.secret
    ) {
      return json(cors, { message: "Token setup invalide" }, 401);
    }

    if (!verifyTotp(decoded.secret, String(code), 2)) {
      return json(cors, { message: "Code MFA invalide" }, 401);
    }

    const backup = generateBackupCodes();
    await pool.query(
      "UPDATE utilisateurs SET mfa_enabled = true, mfa_secret = $1, mfa_enabled_at = NOW(), mfa_backup_codes = $2::jsonb WHERE id = $3",
      [encryptText(decoded.secret), JSON.stringify(backup.hashes), auth.id],
    );

    return json(cors, {
      message: "Double authentification activee",
      backup_codes: backup.plain,
      backup_codes_remaining: backup.plain.length,
    });
  } finally {
    await pool.end();
  }
}
