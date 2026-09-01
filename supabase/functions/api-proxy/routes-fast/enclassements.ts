import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAuth } from "./middleware.ts";

export async function handleEnclassementsRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    if (path === "/enclassements" && req.method === "GET") {
      const r = await pool.query(`
        SELECT e.*,
          u.prenom || ' ' || u.nom as created_by_nom,
          (SELECT COUNT(*)::int FROM affectations_eleves_enc a
            JOIN classes_enclassement c ON a.classe_id = c.id
            WHERE c.enclassement_id = e.id) as nb_eleves,
          (SELECT COUNT(*)::int FROM classes_enclassement c WHERE c.enclassement_id = e.id) as nb_classes
        FROM enclassements e
        LEFT JOIN utilisateurs u ON e.created_by = u.id
        ORDER BY e.created_at DESC
      `);
      return json(cors, r.rows);
    }

    if (path === "/enclassements" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const { nom, session_tcf, parametres, classes } = body;

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const encR = await client.query(
          `INSERT INTO enclassements (nom, session_tcf, created_by, statut, parametres)
           VALUES ($1, $2, $3, 'validé', $4) RETURNING *`,
          [nom, session_tcf || "Test d'août", user!.id, JSON.stringify(parametres || {})],
        );
        const enc = encR.rows[0];

        for (const cl of classes || []) {
          const clR = await client.query(
            `INSERT INTO classes_enclassement (enclassement_id, structure, nom, capacite_max)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [
              enc.id,
              cl.structure,
              cl.nom,
              cl.capacite_max || (cl.structure === "CSC" ? 12 : 15),
            ],
          );
          const clId = clR.rows[0].id;
          for (const eleve of cl.eleves || []) {
            await client.query(
              `INSERT INTO affectations_eleves_enc
               (classe_id, eleve_id, score_francais, score_math, score_pondere, flagge_plancher, motif_flag, position_serpentin, modifie_manuellement)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
              [
                clId,
                eleve.eleve_id,
                eleve.score_francais,
                eleve.score_math,
                eleve.score_pondere,
                eleve.flagge_plancher || false,
                eleve.motif_flag || null,
                eleve.position_serpentin,
                eleve.modifie_manuellement || false,
              ],
            );
          }
        }

        await client.query("COMMIT");
        return json(cors, enc);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    const statutMatch = path.match(/^\/enclassements\/(\d+)\/statut$/);
    if (statutMatch && req.method === "PATCH") {
      const id = statutMatch[1];
      const body = await parseJsonBody(req);
      const { statut } = body;
      const r = await pool.query("UPDATE enclassements SET statut=$1 WHERE id=$2 RETURNING *", [
        statut,
        id,
      ]);
      return json(cors, r.rows[0]);
    }

    const idMatch = path.match(/^\/enclassements\/(\d+)$/);
    if (idMatch) {
      const id = idMatch[1];

      if (req.method === "GET") {
        const [enc, classes] = await Promise.all([
          pool.query("SELECT * FROM enclassements WHERE id=$1", [id]),
          pool.query(
            `
            SELECT c.*,
              COALESCE(json_agg(
                json_build_object(
                  'id', a.id,
                  'eleve_id', a.eleve_id,
                  'nom', u.nom,
                  'prenom', u.prenom,
                  'score_francais', a.score_francais,
                  'score_math', a.score_math,
                  'score_pondere', a.score_pondere,
                  'flagge_plancher', a.flagge_plancher,
                  'motif_flag', a.motif_flag,
                  'position_serpentin', a.position_serpentin,
                  'modifie_manuellement', a.modifie_manuellement
                ) ORDER BY a.position_serpentin
              ) FILTER (WHERE a.id IS NOT NULL), '[]') as eleves
            FROM classes_enclassement c
            LEFT JOIN affectations_eleves_enc a ON a.classe_id = c.id
            LEFT JOIN eleves el ON a.eleve_id = el.id
            LEFT JOIN utilisateurs u ON el.utilisateur_id = u.id
            WHERE c.enclassement_id = $1
            GROUP BY c.id
            ORDER BY c.structure, c.nom
          `,
            [id],
          ),
        ]);
        if (!enc.rows[0]) return json(cors, { error: "Non trouvé" }, 404);
        return json(cors, { ...enc.rows[0], classes: classes.rows });
      }

      if (req.method === "DELETE") {
        await pool.query("DELETE FROM enclassements WHERE id=$1", [id]);
        return json(cors, { ok: true });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("enclassements-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { error: msg }, 500);
  } finally {
    await pool.end();
  }
}
