import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAuth } from "./middleware.ts";

export async function handleCalendrierRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    if (path === "/calendrier" && req.method === "GET") {
      const result = await pool.query("SELECT * FROM calendrier ORDER BY date_debut");
      return json(cors, result.rows);
    }

    if (path === "/calendrier" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const {
        titre,
        description,
        date_debut,
        date_fin,
        type,
        couleur,
        categorie,
        nom_vacance,
        heure_debut,
        heure_fin,
      } = body;
      const result = await pool.query(
        "INSERT INTO calendrier (titre, description, date_debut, date_fin, type, couleur, categorie, nom_vacance, heure_debut, heure_fin) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
        [
          titre,
          description || null,
          date_debut,
          date_fin || date_debut,
          type || "Evenement",
          couleur || "#1a73e8",
          categorie || "evenement",
          nom_vacance || null,
          heure_debut || null,
          heure_fin || null,
        ],
      );
      return json(cors, { message: "Evenement cree", evenement: result.rows[0] }, 201);
    }

    // Routes /prof avant /:id
    if (path === "/calendrier/prof" && req.method === "GET") {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS calendrier_prof (id SERIAL PRIMARY KEY, prof_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE, date DATE NOT NULL, titre VARCHAR(200) NOT NULL, type VARCHAR(50) DEFAULT 'Autre', description TEXT DEFAULT '', created_at TIMESTAMP DEFAULT NOW())`,
      );
      const r = await pool.query(
        "SELECT * FROM calendrier_prof WHERE prof_id=$1 ORDER BY date DESC",
        [user!.id],
      );
      return json(cors, r.rows);
    }

    if (path === "/calendrier/prof" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const { date, titre, type, description } = body;
      const r = await pool.query(
        "INSERT INTO calendrier_prof (prof_id,date,titre,type,description) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [user!.id, date, titre, type || "Autre", description || ""],
      );
      return json(cors, r.rows[0]);
    }

    const profIdMatch = path.match(/^\/calendrier\/prof\/(\d+)$/);
    if (profIdMatch) {
      const id = profIdMatch[1];

      if (req.method === "PUT") {
        const body = await parseJsonBody(req);
        const { date, titre, type, description } = body;
        const r = await pool.query(
          "UPDATE calendrier_prof SET date=$1, titre=$2, type=$3, description=$4 WHERE id=$5 AND prof_id=$6 RETURNING *",
          [date, titre, type || "Autre", description || "", id, user!.id],
        );
        if (r.rows.length === 0) return json(cors, { message: "Élément non trouvé" }, 404);
        return json(cors, r.rows[0]);
      }

      if (req.method === "DELETE") {
        await pool.query("DELETE FROM calendrier_prof WHERE id=$1 AND prof_id=$2", [id, user!.id]);
        return json(cors, { ok: true });
      }
    }

    const idMatch = path.match(/^\/calendrier\/(\d+)$/);
    if (idMatch) {
      const id = idMatch[1];

      if (req.method === "PUT") {
        const body = await parseJsonBody(req);
        const {
          titre,
          description,
          date_debut,
          date_fin,
          type,
          couleur,
          categorie,
          nom_vacance,
          heure_debut,
          heure_fin,
        } = body;
        const result = await pool.query(
          "UPDATE calendrier SET titre=$1, description=$2, date_debut=$3, date_fin=$4, type=$5, couleur=$6, categorie=$7, nom_vacance=$8, heure_debut=$9, heure_fin=$10 WHERE id=$11 RETURNING *",
          [
            titre,
            description || null,
            date_debut,
            date_fin || date_debut,
            type || "Evenement",
            couleur || "#1a73e8",
            categorie || "evenement",
            nom_vacance || null,
            heure_debut || null,
            heure_fin || null,
            id,
          ],
        );
        if (result.rows.length === 0) return json(cors, { message: "Evenement non trouve" }, 404);
        return json(cors, { message: "Evenement modifie" });
      }

      if (req.method === "DELETE") {
        await pool.query("DELETE FROM calendrier WHERE id=$1", [id]);
        return json(cors, { message: "Evenement supprime" });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("calendrier-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: "Erreur serveur", erreur: msg }, 500);
  } finally {
    await pool.end();
  }
}
