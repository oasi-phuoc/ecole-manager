import { Pool } from "npm:pg@8";
import bcrypt from "npm:bcryptjs@2";

function json(cors: Record<string, string>, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export async function handleAuthLogin(req: Request, cors: Record<string, string>): Promise<Response> {
  const { email, mot_de_passe } = await req.json();
  const ident = String(email || "").trim().toLowerCase();
  if (!ident || !mot_de_passe) {
    return json(cors, { message: "Email ou mot de passe incorrect" }, 401);
  }

  const pool = new Pool({
    connectionString: Deno.env.get("DATABASE_URL") || Deno.env.get("SUPABASE_DB_URL"),
    ssl: { rejectUnauthorized: false },
  });

  try {
    const r = await pool.query(
      "SELECT id, nom, prenom, email, role, mot_de_passe, mfa_enabled, doit_changer_mdp FROM utilisateurs WHERE (LOWER(email) = $1 OR LOWER(identifiant) = $1) AND actif = true",
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

    if (user.mfa_enabled === true) {
      return json(cors, {
        message: "Code MFA requis",
        mfa_required: true,
        mfa_token: `legacy:${user.id}`,
      });
    }

    return json(cors, {
      message: "Connexion reussie",
      utilisateur: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        doit_changer_mdp: user.doit_changer_mdp || false,
      },
    });
  } finally {
    await pool.end();
  }
}
