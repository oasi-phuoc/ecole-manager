import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAuth } from "./middleware.ts";

export async function handlePresencesRoute(
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
    if (path === "/presences/classes" && req.method === "GET") {
      if (user!.role === "admin") {
        const result = await pool.query(`
          SELECT id, nom, niveau, annee_scolaire
          FROM classes
          WHERE actif IS DISTINCT FROM false
          ORDER BY nom
        `);
        return json(cors, result.rows);
      }

      const result = await pool.query(
        `
        SELECT DISTINCT c.id, c.nom, c.niveau, c.annee_scolaire
        FROM classes c
        LEFT JOIN affectations a ON a.classe_id = c.id AND a.prof_id = $1
        LEFT JOIN emploi_du_temps et ON et.classe_id = c.id AND et.prof_id = $1
        WHERE c.prof_principal_id = $1
           OR a.id IS NOT NULL
           OR et.id IS NOT NULL
        ORDER BY c.nom
      `,
        [user!.id],
      );
      return json(cors, result.rows);
    }

    if (path === "/presences" && req.method === "GET") {
      const classe_id = url.searchParams.get("classe_id");
      const date = url.searchParams.get("date");
      const result = await pool.query(
        `
        SELECT pv.id, pv.eleve_id, pv.classe_id,
          TO_CHAR(pv.date, 'YYYY-MM-DD') AS date,
          pv.p1, pv.p2, pv.p3, pv.p4, pv.p5, pv.p6, pv.p7, pv.p8,
          pv.remarque, pv.valide
        FROM presences_v2 pv
        JOIN eleves e ON pv.eleve_id = e.id
        WHERE pv.classe_id = $1 AND pv.date = $2::date
      `,
        [classe_id, date],
      );
      return json(cors, result.rows);
    }

    if (path === "/presences/eleves" && req.method === "GET") {
      const classe_id = url.searchParams.get("classe_id");
      const result = await pool.query(
        `
        SELECT e.id,
          COALESCE(u.nom, e.nom) AS nom,
          COALESCE(u.prenom, e.prenom) AS prenom
        FROM eleves e
        LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
        WHERE e.classe_id = $1
          AND LOWER(COALESCE(e.statut, 'actif')) = 'actif'
        ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)
      `,
        [classe_id],
      );
      return json(cors, result.rows);
    }

    if (path === "/presences/mois" && req.method === "GET") {
      const classe_id = url.searchParams.get("classe_id");
      const mois = url.searchParams.get("mois");
      const result = await pool.query(
        `
        SELECT pv.id, pv.eleve_id, pv.classe_id,
          TO_CHAR(pv.date, 'YYYY-MM-DD') AS date,
          pv.p1, pv.p2, pv.p3, pv.p4, pv.p5, pv.p6, pv.p7, pv.p8,
          pv.remarque, pv.valide
        FROM presences_v2 pv
        JOIN eleves e ON pv.eleve_id = e.id
        WHERE pv.classe_id = $1 AND TO_CHAR(pv.date, 'YYYY-MM') = $2
      `,
        [classe_id, mois],
      );
      return json(cors, result.rows);
    }

    if (path === "/presences/statistiques" && req.method === "GET") {
      const classe_id = url.searchParams.get("classe_id");
      const date_debut = url.searchParams.get("date_debut");
      const date_fin = url.searchParams.get("date_fin");
      const result = await pool.query(
        `
        SELECT
          e.id as eleve_id,
          COALESCE(u.nom, e.nom) AS nom,
          COALESCE(u.prenom, e.prenom) AS prenom,
          COUNT(DISTINCT pv.date) as jours,
          SUM(
            (CASE WHEN pv.p1='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p2='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p3='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p4='P' THEN 1 ELSE 0 END)+
            (CASE WHEN pv.p5='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p6='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p7='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p8='P' THEN 1 ELSE 0 END)
          ) as presents,
          SUM(
            (CASE WHEN pv.p1='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p2='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p3='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p4='A' THEN 1 ELSE 0 END)+
            (CASE WHEN pv.p5='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p6='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p7='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p8='A' THEN 1 ELSE 0 END)
          ) as absents,
          SUM(
            (CASE WHEN pv.p1='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p2='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p3='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p4='R' THEN 1 ELSE 0 END)+
            (CASE WHEN pv.p5='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p6='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p7='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p8='R' THEN 1 ELSE 0 END)
          ) as retards,
          SUM(
            (CASE WHEN pv.p1='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p2='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p3='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p4='E' THEN 1 ELSE 0 END)+
            (CASE WHEN pv.p5='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p6='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p7='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p8='E' THEN 1 ELSE 0 END)
          ) as excuses,
          SUM(
            (CASE WHEN pv.p1='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p2='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p3='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p4='C' THEN 1 ELSE 0 END)+
            (CASE WHEN pv.p5='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p6='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p7='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p8='C' THEN 1 ELSE 0 END)
          ) as conges
        FROM eleves e
        LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
        LEFT JOIN presences_v2 pv
          ON pv.eleve_id = e.id
         AND ($2::date IS NULL OR pv.date >= $2::date)
         AND ($3::date IS NULL OR pv.date <= $3::date)
        WHERE e.classe_id = $1
          AND LOWER(COALESCE(e.statut, 'actif')) = 'actif'
        GROUP BY e.id, u.nom, u.prenom
        ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)
      `,
        [classe_id, date_debut || null, date_fin || null],
      );
      return json(cors, result.rows);
    }

    if (path === "/presences" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const { presences, date, classe_id } = body;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const p of presences as Record<string, unknown>[]) {
          const existe = await client.query(
            "SELECT id FROM presences_v2 WHERE eleve_id=$1 AND date=$2",
            [p.eleve_id, date],
          );
          if (existe.rows.length > 0) {
            await client.query(
              `
              UPDATE presences_v2 SET p1=$1,p2=$2,p3=$3,p4=$4,p5=$5,p6=$6,p7=$7,p8=$8,remarque=$9,valide=$10
              WHERE eleve_id=$11 AND date=$12
            `,
              [
                p.p1,
                p.p2,
                p.p3,
                p.p4,
                p.p5,
                p.p6,
                p.p7,
                p.p8,
                p.remarque || null,
                p.valide || false,
                p.eleve_id,
                date,
              ],
            );
          } else {
            await client.query(
              `
              INSERT INTO presences_v2 (eleve_id,classe_id,date,p1,p2,p3,p4,p5,p6,p7,p8,remarque,valide)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            `,
              [
                p.eleve_id,
                classe_id,
                date,
                p.p1,
                p.p2,
                p.p3,
                p.p4,
                p.p5,
                p.p6,
                p.p7,
                p.p8,
                p.remarque || null,
                p.valide || false,
              ],
            );
          }
        }
        await client.query("COMMIT");
        return json(cors, { message: "Presences enregistrees" });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("presences-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: "Erreur serveur", erreur: msg }, 500);
  } finally {
    await pool.end();
  }
}
