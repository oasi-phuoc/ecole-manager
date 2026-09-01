import bcrypt from "npm:bcryptjs@2";
import {
  createPool,
  decryptText,
  json,
  publicUser,
  signJwt,
} from "./auth-fast-shared.ts";

export async function handleAuthLogin(req: Request, cors: Record<string, string>): Promise<Response> {
  const { email, mot_de_passe } = await req.json();
  const ident = String(email || "").trim().toLowerCase();
  if (!ident || !mot_de_passe) {
    return json(cors, { message: "Email ou mot de passe incorrect" }, 401);
  }

  const pool = createPool();
  try {
    const r = await pool.query(
      "SELECT id, nom, prenom, email, role, mot_de_passe, mfa_enabled, mfa_exempt, mfa_secret, doit_changer_mdp FROM utilisateurs WHERE (LOWER(email) = $1 OR LOWER(identifiant) = $1) AND actif = true",
      [ident],
    );
    if (!r.rows.length) {
      return json(cors, { message: "Email ou mot de passe incorrect" }, 401);
    }
    const user = r.rows[0];
    const ok = await bcrypt.compare(mot_de_passe, user.mot_de_passe || "");
    if (!ok) {
      return json(cors, { message: "Email ou mot de passe incorrect" }, 401);
    }

    const secret = decryptText(user.mfa_secret || "");
    if (user.mfa_exempt !== true && user.mfa_enabled === true && secret) {
      const mfaToken = signJwt({ purpose: "mfa-login", id: user.id }, "5m");
      return json(cors, {
        message: "Code MFA requis",
        mfa_required: true,
        mfa_token: mfaToken,
      });
    }

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
  } finally {
    await pool.end();
  }
}
