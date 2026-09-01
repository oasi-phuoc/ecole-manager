import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAdmin, requireAuth } from "./middleware.ts";

export async function handleEmploiDuTempsRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
  url: URL,
): Promise<Response> {
  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    if (path === "/emploi-du-temps/matieres" && req.method === "GET") {
      const result = await pool.query("SELECT * FROM matieres ORDER BY nom");
      return json(cors, result.rows);
    }

    if (path === "/emploi-du-temps/matieres" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { nom, code, coefficient } = body;
      const result = await pool.query(
        "INSERT INTO matieres (nom, code, coefficient) VALUES ($1,$2,$3) RETURNING *",
        [nom, code || null, coefficient || 1],
      );
      return json(cors, { message: "Matiere creee", matiere: result.rows[0] }, 201);
    }

    if (path === "/emploi-du-temps" && req.method === "GET") {
      const classe_id = url.searchParams.get("classe_id");
      const prof_id = url.searchParams.get("prof_id");
      let query = `
        SELECT e.id, e.jour, e.heure_debut, e.heure_fin, e.salle,
          c.nom as classe, c.id as classe_id,
          m.nom as matiere, m.id as matiere_id,
          u.nom as prof_nom, u.prenom as prof_prenom, u.id as prof_id
        FROM emploi_du_temps e
        JOIN classes c ON e.classe_id = c.id
        LEFT JOIN matieres m ON e.matiere_id = m.id
        LEFT JOIN utilisateurs u ON e.prof_id = u.id
      `;
      const params: unknown[] = [];
      const conditions: string[] = [];
      if (classe_id) {
        conditions.push(`e.classe_id = $${params.length + 1}`);
        params.push(classe_id);
      }
      if (prof_id) {
        conditions.push(`e.prof_id = $${params.length + 1}`);
        params.push(prof_id);
      }
      if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
      query += " ORDER BY e.heure_debut";
      const result = await pool.query(query, params);
      return json(cors, result.rows);
    }

    if (path === "/emploi-du-temps" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { classe_id, matiere_id, prof_id, jour, heure_debut, heure_fin, salle } = body;
      const result = await pool.query(
        "INSERT INTO emploi_du_temps (classe_id, matiere_id, prof_id, jour, heure_debut, heure_fin, salle) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [classe_id, matiere_id, prof_id, jour, heure_debut, heure_fin, salle || null],
      );
      return json(cors, { message: "Cours cree", cours: result.rows[0] }, 201);
    }

    const idMatch = path.match(/^\/emploi-du-temps\/(\d+)$/);
    if (idMatch) {
      const id = idMatch[1];

      if (req.method === "PUT") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const body = await parseJsonBody(req);
        const { classe_id, matiere_id, prof_id, jour, heure_debut, heure_fin, salle } = body;
        const result = await pool.query(
          "UPDATE emploi_du_temps SET classe_id=$1, matiere_id=$2, prof_id=$3, jour=$4, heure_debut=$5, heure_fin=$6, salle=$7 WHERE id=$8 RETURNING *",
          [classe_id, matiere_id, prof_id, jour, heure_debut, heure_fin, salle || null, id],
        );
        if (result.rows.length === 0) return json(cors, { message: "Cours non trouve" }, 404);
        return json(cors, { message: "Cours modifie" });
      }

      if (req.method === "DELETE") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const result = await pool.query("DELETE FROM emploi_du_temps WHERE id=$1 RETURNING id", [id]);
        if (result.rows.length === 0) return json(cors, { message: "Cours non trouve" }, 404);
        return json(cors, { message: "Cours supprime" });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("emploi-du-temps-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: "Erreur serveur", erreur: msg }, 500);
  } finally {
    await pool.end();
  }
}
