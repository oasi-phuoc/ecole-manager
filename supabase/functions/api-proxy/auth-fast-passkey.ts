import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "npm:@simplewebauthn/server@13";
import { isoUint8Array } from "npm:@simplewebauthn/server@13/helpers";
import jwt from "npm:jsonwebtoken@9";
import {
  createPool,
  json,
  publicUser,
  signJwt,
  verifyJwtFromRequest,
} from "./auth-fast-shared.ts";
import {
  fromBase64Url,
  getWebAuthnConfig,
  parseTransports,
  toBase64Url,
} from "./auth-fast-webauthn.ts";

type AllowCred = { id: string; transports?: string[] };

export async function handlePasskeyLoginOptions(
  req: Request,
  cors: Record<string, string>,
): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const identifiant = String(body?.email || "").trim().toLowerCase();

  if (!Deno.env.get("JWT_SECRET")) {
    return json(cors, { message: "Configuration de securite manquante" }, 500);
  }

  const pool = createPool();
  try {
    const { rpID } = getWebAuthnConfig(req);
    let allowCredentials: AllowCred[] | undefined;
    let userId: number | null = null;

    if (identifiant) {
      const r = await pool.query(
        `SELECT u.id FROM utilisateurs u
         WHERE (LOWER(u.email) = $1 OR LOWER(u.identifiant) = $1) AND u.actif = true`,
        [identifiant],
      );
      userId = r.rows[0]?.id ?? null;
      if (userId) {
        const creds = await pool.query(
          "SELECT credential_id, transports FROM webauthn_credentials WHERE user_id=$1",
          [userId],
        );
        allowCredentials = (creds.rows || []).map((row: { credential_id: string; transports: unknown }) => ({
          id: row.credential_id,
          transports: parseTransports(row.transports),
        }));
        if (!allowCredentials.length) {
          return json(cors, { message: "Aucune passkey enregistrée pour ce compte" }, 404);
        }
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials,
    });

    const challenge_token = signJwt({
      purpose: "webauthn-login",
      challenge: options.challenge,
      id: userId ?? null,
    }, "5m");

    return json(cors, { options, challenge_token });
  } catch (err) {
    console.error("passkey login options:", err);
    return json(cors, { message: "Erreur serveur" }, 500);
  } finally {
    await pool.end();
  }
}

export async function handlePasskeyLoginVerify(
  req: Request,
  cors: Record<string, string>,
): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const challenge_token = body?.challenge_token;
  const credential = body?.credential;
  if (!challenge_token || !credential) {
    return json(cors, { message: "Réponse passkey incomplete" }, 400);
  }

  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) return json(cors, { message: "Configuration de securite manquante" }, 500);

  let decoded: { purpose?: string; challenge?: string; id?: number | null };
  try {
    decoded = jwt.verify(String(challenge_token), secret) as typeof decoded;
  } catch {
    return json(cors, { message: "Challenge passkey invalide ou expiré" }, 401);
  }

  if (decoded?.purpose !== "webauthn-login" || !decoded?.challenge) {
    return json(cors, { message: "Challenge passkey invalide" }, 401);
  }

  const credentialId = toBase64Url(credential?.id || credential?.rawId);
  if (!credentialId) return json(cors, { message: "Identifiant passkey manquant" }, 400);

  const pool = createPool();
  try {
    const credRes = await pool.query(
      `SELECT c.*, u.id AS uid, u.nom, u.prenom, u.email, u.role, u.doit_changer_mdp, u.mfa_enabled, u.mfa_exempt, u.actif
       FROM webauthn_credentials c
       JOIN utilisateurs u ON u.id = c.user_id
       WHERE c.credential_id = $1`,
      [credentialId],
    );
    const row = credRes.rows[0];
    if (!row || row.actif === false) {
      return json(cors, { message: "Passkey inconnue ou compte inactif" }, 401);
    }
    if (decoded.id != null && Number(decoded.id) !== Number(row.user_id)) {
      return json(cors, { message: "Passkey ne correspond pas au compte" }, 401);
    }

    const { rpID, expectedOrigins } = getWebAuthnConfig(req);
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: decoded.challenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: row.credential_id,
        publicKey: fromBase64Url(row.public_key),
        counter: Number(row.counter || 0),
        transports: parseTransports(row.transports),
      },
    });

    if (!verification.verified) {
      return json(cors, { message: "Authentification passkey refusée" }, 401);
    }

    const newCounter = Number(verification.authenticationInfo?.newCounter ?? row.counter ?? 0);
    await pool.query("UPDATE webauthn_credentials SET counter=$1 WHERE id=$2", [newCounter, row.id]);

    const user = {
      id: row.uid,
      nom: row.nom,
      prenom: row.prenom,
      email: row.email,
      role: row.role,
      doit_changer_mdp: row.doit_changer_mdp || false,
      mfa_enabled: row.mfa_enabled === true,
      mfa_exempt: row.mfa_exempt === true,
    };

    const token = signJwt({
      id: user.id,
      email: user.email,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
    });

    return json(cors, {
      message: "Connexion reussie",
      token,
      utilisateur: publicUser(user),
    });
  } catch (err) {
    console.error("passkey login verify:", err);
    return json(cors, { message: "Échec de connexion passkey" }, 401);
  } finally {
    await pool.end();
  }
}

export async function handleListPasskeys(req: Request, cors: Record<string, string>): Promise<Response> {
  const auth = verifyJwtFromRequest(req);
  if (!auth) return json(cors, { message: "Token manquant" }, 401);

  const pool = createPool();
  try {
    const r = await pool.query(
      `SELECT id, friendly_name, device_type, backed_up, transports, created_at
       FROM webauthn_credentials WHERE user_id = $1 ORDER BY created_at DESC`,
      [auth.id],
    );
    return json(cors, {
      passkeys: (r.rows || []).map((row: Record<string, unknown>) => ({
        id: row.id,
        friendly_name: row.friendly_name || "Passkey",
        device_type: row.device_type || null,
        backed_up: row.backed_up === true,
        transports: parseTransports(row.transports),
        created_at: row.created_at,
      })),
    });
  } finally {
    await pool.end();
  }
}

export async function handlePasskeyRegisterOptions(
  req: Request,
  cors: Record<string, string>,
): Promise<Response> {
  const auth = verifyJwtFromRequest(req);
  if (!auth) return json(cors, { message: "Token manquant" }, 401);
  if (!Deno.env.get("JWT_SECRET")) {
    return json(cors, { message: "Configuration de securite manquante" }, 500);
  }

  const pool = createPool();
  try {
    const { rpID, rpName } = getWebAuthnConfig(req);
    const u = await pool.query(
      "SELECT id, email, nom, prenom FROM utilisateurs WHERE id=$1 AND actif=true",
      [auth.id],
    );
    const user = u.rows[0];
    if (!user) return json(cors, { message: "Utilisateur introuvable" }, 401);

    const existing = await pool.query(
      "SELECT credential_id, transports FROM webauthn_credentials WHERE user_id=$1",
      [user.id],
    );
    const excludeCredentials = (existing.rows || []).map((row: { credential_id: string; transports: unknown }) => ({
      id: row.credential_id,
      transports: parseTransports(row.transports),
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: isoUint8Array.fromUTF8String(String(user.id)),
      userName: String(user.email || `user-${user.id}`),
      userDisplayName: `${user.prenom || ""} ${user.nom || ""}`.trim() || String(user.email || user.id),
      attestationType: "none",
      excludeCredentials,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    const challenge_token = signJwt({
      purpose: "webauthn-register",
      id: user.id,
      challenge: options.challenge,
    }, "5m");

    return json(cors, { options, challenge_token });
  } catch (err) {
    console.error("passkey register options:", err);
    return json(cors, { message: "Erreur serveur" }, 500);
  } finally {
    await pool.end();
  }
}

export async function handlePasskeyRegisterVerify(
  req: Request,
  cors: Record<string, string>,
): Promise<Response> {
  const auth = verifyJwtFromRequest(req);
  if (!auth) return json(cors, { message: "Token manquant" }, 401);

  const body = await req.json().catch(() => ({}));
  const challenge_token = body?.challenge_token;
  const credential = body?.credential;
  const friendly_name = body?.friendly_name;
  if (!challenge_token || !credential) {
    return json(cors, { message: "Réponse passkey incomplete" }, 400);
  }

  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) return json(cors, { message: "Configuration de securite manquante" }, 500);

  let decoded: { purpose?: string; id?: number; challenge?: string };
  try {
    decoded = jwt.verify(String(challenge_token), secret) as typeof decoded;
  } catch {
    return json(cors, { message: "Challenge passkey invalide ou expiré" }, 401);
  }

  if (
    decoded?.purpose !== "webauthn-register" ||
    Number(decoded?.id) !== Number(auth.id) ||
    !decoded?.challenge
  ) {
    return json(cors, { message: "Challenge passkey invalide" }, 401);
  }

  const pool = createPool();
  try {
    const { rpID, expectedOrigins } = getWebAuthnConfig(req);
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: decoded.challenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return json(cors, { message: "Enregistrement passkey refusé" }, 401);
    }

    const info = verification.registrationInfo;
    const cred = info.credential || ({} as { id?: unknown; publicKey?: unknown });
    const credentialId = toBase64Url(cred.id || (info as { credentialID?: unknown }).credentialID);
    const publicKey = toBase64Url(cred.publicKey || (info as { credentialPublicKey?: unknown }).credentialPublicKey);
    if (!credentialId || !publicKey) {
      return json(cors, { message: "Identifiant passkey invalide" }, 400);
    }

    const dup = await pool.query("SELECT id FROM webauthn_credentials WHERE credential_id=$1", [credentialId]);
    if (dup.rows.length) {
      return json(cors, { message: "Cette passkey est déjà enregistrée" }, 409);
    }

    const transports = parseTransports(credential?.response?.transports);
    const deviceType = info.credentialDeviceType || info.credential?.deviceType || null;
    const backedUp = info.credentialBackedUp === true || info.credential?.backedUp === true;
    const name = String(friendly_name || "").trim() || "Passkey";

    await pool.query(
      `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, device_type, backed_up, transports, friendly_name)
       VALUES ($1, $2, $3, 0, $4, $5, $6::jsonb, $7)`,
      [
        auth.id,
        credentialId,
        publicKey,
        deviceType,
        backedUp,
        JSON.stringify(transports),
        name,
      ],
    );

    return json(cors, { message: "Passkey enregistrée", friendly_name: name });
  } catch (err) {
    console.error("passkey register verify:", err);
    return json(cors, { message: "Échec de vérification passkey" }, 401);
  } finally {
    await pool.end();
  }
}

export async function handleDeletePasskey(
  req: Request,
  cors: Record<string, string>,
  passkeyId: string,
): Promise<Response> {
  const auth = verifyJwtFromRequest(req);
  if (!auth) return json(cors, { message: "Token manquant" }, 401);

  const id = Number(passkeyId);
  if (!Number.isFinite(id)) return json(cors, { message: "Identifiant invalide" }, 400);

  const pool = createPool();
  try {
    const r = await pool.query(
      "DELETE FROM webauthn_credentials WHERE id=$1 AND user_id=$2 RETURNING id",
      [id, auth.id],
    );
    if (!r.rows[0]) return json(cors, { message: "Passkey introuvable" }, 404);
    return json(cors, { message: "Passkey supprimée" });
  } finally {
    await pool.end();
  }
}
