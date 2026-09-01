import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAuth, requireRole } from "./middleware.ts";

export async function handleInventaireBranchesRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    const branchesMatch = path.match(/^\/inventaire-branches\/(\d+)\/branches$/);
    if (branchesMatch && req.method === "GET") {
      const classeId = parseInt(branchesMatch[1], 10);
      if (!classeId) return json(cors, { message: "Classe invalide" }, 400);

      const classeRes = await pool.query("SELECT id, niveau, nom FROM classes WHERE id=$1", [classeId]);
      if (!classeRes.rows.length) return json(cors, { message: "Classe non trouvee" }, 404);
      const classe = {
        ...classeRes.rows[0],
        niveau:
          classeRes.rows[0].niveau != null ? String(classeRes.rows[0].niveau).trim() : "",
      };

      let branches: Record<string, unknown>[] = [];
      if (classe.niveau) {
        const r = await pool.query(
          `SELECT id, nom, code, niveau, designation_courte, type_branche FROM matieres
           WHERE LOWER(TRIM(COALESCE(niveau, ''))) = LOWER($1) ORDER BY nom`,
          [classe.niveau],
        );
        branches = r.rows;
      }
      if (branches.length === 0) {
        const r = await pool.query(
          "SELECT id, nom, code, niveau, designation_courte, type_branche FROM matieres ORDER BY nom",
        );
        branches = r.rows;
      }

      return json(cors, { classe, branches });
    }

    const reorderMatch = path.match(/^\/inventaire-branches\/(\d+)\/branches\/(\d+)\/reorder$/);
    if (reorderMatch && req.method === "POST") {
      const denied = requireRole(user!, cors, "admin", "prof");
      if (denied) return denied;
      const classeId = parseInt(reorderMatch[1], 10);
      const brancheId = parseInt(reorderMatch[2], 10);
      const body = await parseJsonBody(req);
      const { ids } = body;
      if (!classeId || !brancheId || !Array.isArray(ids)) {
        return json(cors, { message: "Parametres invalides" }, 400);
      }

      for (let i = 0; i < ids.length; i += 1) {
        const id = parseInt(String(ids[i]), 10);
        if (!id) continue;
        await pool.query(
          "UPDATE inventaire_branches SET ordre=$1 WHERE id=$2 AND classe_id=$3 AND branche_id=$4",
          [i + 1, id, classeId, brancheId],
        );
      }
      return json(cors, { message: "Ordre mis a jour" });
    }

    const inventaireMatch = path.match(/^\/inventaire-branches\/(\d+)\/branches\/(\d+)(?:\/(\d+))?$/);
    if (inventaireMatch) {
      const classeId = parseInt(inventaireMatch[1], 10);
      const brancheId = parseInt(inventaireMatch[2], 10);
      const rowId = inventaireMatch[3];

      if (!rowId && req.method === "GET") {
        if (!classeId || !brancheId) return json(cors, { message: "Parametres invalides" }, 400);
        const result = await pool.query(
          `
          SELECT ib.*, m.nom AS branche_nom, u.nom AS auteur_nom, u.prenom AS auteur_prenom
          FROM inventaire_branches ib
          JOIN matieres m ON m.id=ib.branche_id
          LEFT JOIN utilisateurs u ON u.id=ib.auteur_id
          WHERE ib.classe_id=$1 AND ib.branche_id=$2
          ORDER BY COALESCE(ib.ordre, 999999) ASC, ib.created_at ASC, ib.id ASC
        `,
          [classeId, brancheId],
        );
        return json(cors, result.rows);
      }

      if (!rowId && req.method === "POST") {
        const denied = requireRole(user!, cors, "admin", "prof");
        if (denied) return denied;
        const body = await parseJsonBody(req);
        const { date_document, nom_document, numero_document, remarques, sans_numero } = body;
        if (!classeId || !brancheId) return json(cors, { message: "Parametres invalides" }, 400);
        if (!nom_document || !String(nom_document).trim()) {
          return json(cors, { message: "Le nom du document est requis" }, 400);
        }

        const ordreRes = await pool.query(
          "SELECT COALESCE(MAX(ordre), 0) + 1 AS next_ordre FROM inventaire_branches WHERE classe_id=$1 AND branche_id=$2",
          [classeId, brancheId],
        );
        const nextOrdre = ordreRes.rows[0]?.next_ordre || 1;

        const r = await pool.query(
          `
          INSERT INTO inventaire_branches (
            classe_id, branche_id, date_document, nom_document, numero_document, ordre, sans_numero, remarques, auteur_id
          ) VALUES (
            $1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5, $6, $7, $8, $9
          )
          RETURNING *
        `,
          [
            classeId,
            brancheId,
            date_document || null,
            String(nom_document).trim(),
            numero_document || null,
            nextOrdre,
            !!sans_numero,
            remarques || null,
            user!.id || null,
          ],
        );
        return json(cors, r.rows[0], 201);
      }

      if (rowId && req.method === "PUT") {
        const denied = requireRole(user!, cors, "admin", "prof");
        if (denied) return denied;
        const id = parseInt(rowId, 10);
        const body = await parseJsonBody(req);
        const { date_document, nom_document, remarques, sans_numero } = body;
        if (!classeId || !brancheId || !id) return json(cors, { message: "Parametres invalides" }, 400);
        if (!nom_document || !String(nom_document).trim()) {
          return json(cors, { message: "Le nom du document est requis" }, 400);
        }

        const r = await pool.query(
          `
          UPDATE inventaire_branches
          SET
            date_document = COALESCE($1::date, CURRENT_DATE),
            nom_document = $2,
            sans_numero = $3,
            remarques = $4
          WHERE id=$5 AND classe_id=$6 AND branche_id=$7
          RETURNING *
        `,
          [
            date_document || null,
            String(nom_document).trim(),
            !!sans_numero,
            remarques || null,
            id,
            classeId,
            brancheId,
          ],
        );
        if (!r.rows.length) return json(cors, { message: "Ligne inventaire non trouvee" }, 404);
        return json(cors, r.rows[0]);
      }

      if (rowId && req.method === "DELETE") {
        const denied = requireRole(user!, cors, "admin", "prof");
        if (denied) return denied;
        const id = parseInt(rowId, 10);
        if (!classeId || !brancheId || !id) return json(cors, { message: "Parametres invalides" }, 400);

        const r = await pool.query(
          "DELETE FROM inventaire_branches WHERE id=$1 AND classe_id=$2 AND branche_id=$3 RETURNING id",
          [id, classeId, brancheId],
        );
        if (!r.rows.length) return json(cors, { message: "Ligne inventaire non trouvee" }, 404);
        return json(cors, { message: "Ligne supprimee" });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("inventaire-branches-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: "Erreur serveur", erreur: msg }, 500);
  } finally {
    await pool.end();
  }
}
