import bcrypt from "npm:bcryptjs@2";
import { createPool, json } from "./auth-fast-shared.ts";

const ROLES_VALIDES = new Set(["admin", "prof", "responsable", "employe_admin"]);

function normaliserEmail(email: unknown): string {
  return String(email || "").trim().toLowerCase();
}

function emailValide(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function handleAuthRegister(
  req: Request,
  cors: Record<string, string>,
): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { nom, prenom, email, mot_de_passe, role } = body;
  const emailNormalise = normaliserEmail(email);

  if (!nom || !prenom || !emailNormalise || !mot_de_passe || !role) {
    return json(cors, { message: "Champs requis manquants" }, 400);
  }
  if (!emailValide(emailNormalise)) {
    return json(cors, { message: "Email invalide" }, 400);
  }
  if (String(mot_de_passe).length < 8) {
    return json(cors, { message: "Le mot de passe doit contenir au moins 8 caracteres" }, 400);
  }
  if (!ROLES_VALIDES.has(String(role))) {
    return json(cors, { message: "Role invalide" }, 400);
  }

  const pool = createPool();
  try {
    const existe = await pool.query("SELECT id FROM utilisateurs WHERE email = $1", [emailNormalise]);
    if (existe.rows.length > 0) {
      return json(cors, { message: "Email deja utilise" }, 400);
    }

    const hash = await bcrypt.hash(String(mot_de_passe), 10);
    const result = await pool.query(
      "INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, nom, prenom, email, role",
      [String(nom).trim(), String(prenom).trim(), emailNormalise, hash, role],
    );
    return json(cors, { message: "Compte cree", utilisateur: result.rows[0] }, 201);
  } catch (err) {
    console.error("auth-fast-register error:", err);
    return json(cors, { message: "Erreur serveur" }, 500);
  } finally {
    await pool.end();
  }
}
