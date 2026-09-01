import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Pool } from "npm:pg@8";
import bcrypt from "npm:bcryptjs@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ message: "Method not allowed" }, 405);

  const { email, mot_de_passe } = await req.json();
  const ident = String(email || "").trim().toLowerCase();
  if (!ident || !mot_de_passe) return json({ message: "Email ou mot de passe incorrect" }, 401);

  const pool = new Pool({
    connectionString: Deno.env.get("SUPABASE_DB_URL") || Deno.env.get("DATABASE_URL"),
    ssl: { rejectUnauthorized: false },
  });

  try {
    const r = await pool.query(
      "SELECT * FROM utilisateurs WHERE (LOWER(email) = $1 OR LOWER(identifiant) = $1) AND actif = true",
      [ident]
    );
    if (!r.rows.length) return json({ message: "Email ou mot de passe incorrect" }, 401);
    const user = r.rows[0];
    const ok = await bcrypt.compare(mot_de_passe, user.mot_de_passe || "");
    if (!ok) return json({ message: "Email ou mot de passe incorrect" }, 401);

    if (user.mfa_enabled) {
      return json({
        mfa_required: true,
        mfa_token: `legacy:${user.id}`,
        message: "Code MFA requis",
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    let session = null;
    if (user.auth_user_id && user.email) {
      await admin.auth.admin.updateUserById(user.auth_user_id, { password: mot_de_passe });
      const { data, error } = await admin.auth.signInWithPassword({
        email: user.email,
        password: mot_de_passe,
      });
      if (!error && data.session) session = data.session;
    }

    return json({
      message: "Connexion reussie",
      utilisateur: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        doit_changer_mdp: user.doit_changer_mdp || false,
      },
      session,
    });
  } catch (e) {
    console.error(e);
    return json({ message: "Erreur serveur" }, 500);
  } finally {
    await pool.end();
  }
});
