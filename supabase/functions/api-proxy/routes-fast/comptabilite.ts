import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAdmin, requireAuth } from "./middleware.ts";

export async function handleComptabiliteRoute(
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
    if (path === "/comptabilite/statistiques" && req.method === "GET") {
      const total = await pool.query(
        "SELECT COALESCE(SUM(montant),0) as total FROM paiements WHERE statut='paye'",
      );
      const attente = await pool.query(
        "SELECT COALESCE(SUM(montant),0) as total, COUNT(*) as nb FROM paiements WHERE statut='en_attente'",
      );
      const retard = await pool.query(
        "SELECT COALESCE(SUM(montant),0) as total, COUNT(*) as nb FROM paiements WHERE statut='en_retard'",
      );
      const parType = await pool.query(
        "SELECT type, COALESCE(SUM(montant),0) as total, COUNT(*) as nb FROM paiements WHERE statut='paye' GROUP BY type ORDER BY total DESC",
      );
      return json(cors, {
        total_encaisse: total.rows[0].total,
        en_attente: attente.rows[0],
        en_retard: retard.rows[0],
        par_type: parType.rows,
      });
    }

    if (path === "/comptabilite/factures/reference" && req.method === "GET") {
      const eleve_id = url.searchParams.get("eleve_id");
      const annee_scolaire = url.searchParams.get("annee_scolaire");
      if (!eleve_id || !annee_scolaire) return json(cors, { reference: null });
      try {
        const r = await pool.query(
          "SELECT reference FROM factures_references WHERE eleve_id=$1 AND annee_scolaire=$2",
          [eleve_id, annee_scolaire],
        );
        return json(cors, { reference: r.rows[0]?.reference || null });
      } catch {
        return json(cors, { reference: null });
      }
    }

    if (path === "/comptabilite/factures/reference" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { eleve_id, annee_scolaire, reference } = body;
      if (!eleve_id || !annee_scolaire || !reference) {
        return json(cors, { message: "eleve_id, annee_scolaire et reference sont requis" }, 400);
      }
      const existing = await pool.query(
        "SELECT reference FROM factures_references WHERE eleve_id=$1 AND annee_scolaire=$2",
        [eleve_id, annee_scolaire],
      );
      if (existing.rows.length > 0) {
        return json(cors, { reference: existing.rows[0].reference });
      }
      const result = await pool.query(
        "INSERT INTO factures_references (eleve_id, annee_scolaire, reference) VALUES ($1,$2,$3) RETURNING reference",
        [eleve_id, annee_scolaire, reference],
      );
      return json(cors, { reference: result.rows[0].reference });
    }

    if (path === "/comptabilite/factures/validation" && req.method === "GET") {
      const eleve_ids = url.searchParams.get("eleve_ids");
      const annee_scolaire = url.searchParams.get("annee_scolaire");
      if (!eleve_ids || !annee_scolaire) return json(cors, []);
      const ids = eleve_ids.split(",").map(Number).filter(Boolean);
      if (ids.length === 0) return json(cors, []);
      const placeholders = ids.map((_, i) => `$${i + 2}`).join(",");
      const result = await pool.query(
        `SELECT eleve_id, valide FROM factures_validations WHERE annee_scolaire=$1 AND eleve_id IN (${placeholders})`,
        [annee_scolaire, ...ids],
      );
      return json(cors, result.rows);
    }

    if (path === "/comptabilite/factures/validation" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { eleve_id, annee_scolaire, valide } = body;
      if (!eleve_id || !annee_scolaire) return json(cors, { message: "Paramètres manquants" }, 400);
      await pool.query(
        `INSERT INTO factures_validations (eleve_id, annee_scolaire, valide, valide_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (eleve_id, annee_scolaire) DO UPDATE SET valide=$3, valide_at=$4`,
        [eleve_id, annee_scolaire, valide, valide ? new Date() : null],
      );
      return json(cors, { valide });
    }

    if (path === "/comptabilite/materiels" && req.method === "GET") {
      const section = url.searchParams.get("section");
      const params: unknown[] = [];
      let q = "SELECT * FROM materiels";
      if (section) {
        params.push(section);
        q += " WHERE section=$1";
      }
      q += " ORDER BY nom";
      const result = await pool.query(q, params);
      return json(cors, result.rows);
    }

    if (path === "/comptabilite/materiels" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { nom, section, prix, ref, fournisseur, rabais, remarques, icone } = body;
      const result = await pool.query(
        `INSERT INTO materiels (nom, section, prix, ref, fournisseur, rabais, remarques, icone)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          nom,
          section || "scolaire",
          prix || 0,
          ref || null,
          fournisseur || null,
          rabais || 0,
          remarques || null,
          icone || null,
        ],
      );
      return json(cors, { message: "Materiel cree", materiel: result.rows[0] }, 201);
    }

    const materielMatch = path.match(/^\/comptabilite\/materiels\/(\d+)$/);
    if (materielMatch) {
      const id = materielMatch[1];
      if (req.method === "PUT") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const body = await parseJsonBody(req);
        const { nom, section, prix, ref, fournisseur, rabais, remarques, icone } = body;
        const result = await pool.query(
          `UPDATE materiels
           SET nom=$1, section=$2, prix=$3, ref=$4, fournisseur=$5, rabais=$6, remarques=$7, icone=$8
           WHERE id=$9 RETURNING *`,
          [
            nom,
            section || "scolaire",
            prix || 0,
            ref || null,
            fournisseur || null,
            rabais || 0,
            remarques || null,
            icone || null,
            id,
          ],
        );
        if (result.rows.length === 0) return json(cors, { message: "Materiel non trouve" }, 404);
        return json(cors, { message: "Materiel modifie", materiel: result.rows[0] });
      }
      if (req.method === "DELETE") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        await pool.query("DELETE FROM materiels WHERE id=$1", [id]);
        return json(cors, { message: "Materiel supprime" });
      }
    }

    const lignesMatch = path.match(/^\/comptabilite\/commandes\/(\d+)\/lignes(?:\/(\d+))?$/);
    if (lignesMatch) {
      const commandeId = lignesMatch[1];
      const ligneId = lignesMatch[2];

      if (!ligneId && req.method === "GET") {
        const r = await pool.query(
          "SELECT * FROM commandes_lignes WHERE commande_id=$1 ORDER BY created_at ASC",
          [commandeId],
        );
        return json(cors, r.rows);
      }

      if (!ligneId && req.method === "POST") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const body = await parseJsonBody(req);
        const { article, quantite, ref, prix_unitaire, remarques, statut } = body;
        if (!article) return json(cors, { message: "article est requis" }, 400);
        const r = await pool.query(
          "INSERT INTO commandes_lignes (commande_id, article, quantite, ref, prix_unitaire, remarques, statut) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
          [
            commandeId,
            article,
            quantite || 1,
            ref || null,
            prix_unitaire || null,
            remarques || null,
            statut || "en_attente",
          ],
        );
        return json(cors, r.rows[0], 201);
      }

      if (ligneId && req.method === "PUT") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const body = await parseJsonBody(req);
        const { article, quantite, ref, prix_unitaire, remarques, statut } = body;
        const r = await pool.query(
          "UPDATE commandes_lignes SET article=$1, quantite=$2, ref=$3, prix_unitaire=$4, remarques=$5, statut=$6 WHERE id=$7 AND commande_id=$8 RETURNING *",
          [
            article,
            quantite || 1,
            ref || null,
            prix_unitaire || null,
            remarques || null,
            statut || "en_attente",
            ligneId,
            commandeId,
          ],
        );
        if (r.rows.length === 0) return json(cors, { message: "Ligne non trouvée" }, 404);
        return json(cors, r.rows[0]);
      }

      if (ligneId && req.method === "DELETE") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        await pool.query("DELETE FROM commandes_lignes WHERE id=$1 AND commande_id=$2", [
          ligneId,
          commandeId,
        ]);
        return json(cors, { message: "Ligne supprimée" });
      }
    }

    const commandeMatch = path.match(/^\/comptabilite\/commandes(?:\/(\d+))?$/);
    if (commandeMatch) {
      const id = commandeMatch[1];

      if (!id && req.method === "GET") {
        const r = await pool.query(`
          SELECT c.*, COALESCE(SUM(cl.prix_unitaire * cl.quantite), 0) AS montant_total
          FROM commandes c
          LEFT JOIN commandes_lignes cl ON cl.commande_id = c.id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `);
        return json(cors, r.rows);
      }

      if (!id && req.method === "POST") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const body = await parseJsonBody(req);
        const { article, quantite, fournisseur, prix_unitaire, statut, remarques, date_commande } =
          body;
        const now = new Date();
        const annee1 = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
        const prefix = `${String(annee1).slice(-2)}-${String(annee1 + 1).slice(-2)}`;
        const countRes = await pool.query(
          "SELECT COUNT(*) FROM commandes WHERE numero_commande LIKE $1",
          [prefix + "%"],
        );
        const num = parseInt(String(countRes.rows[0].count)) + 1;
        const numero = `${prefix}_${String(num).padStart(4, "0")}`;
        const r = await pool.query(
          "INSERT INTO commandes (article, quantite, fournisseur, prix_unitaire, statut, remarques, numero_commande, date_commande) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
          [
            article || null,
            quantite || 1,
            fournisseur || null,
            prix_unitaire || null,
            statut || "en_attente",
            remarques || null,
            numero,
            date_commande || null,
          ],
        );
        return json(cors, r.rows[0], 201);
      }

      if (id && req.method === "PUT") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const body = await parseJsonBody(req);
        const { article, quantite, fournisseur, prix_unitaire, statut, remarques, valide } = body;
        const r = await pool.query(
          "UPDATE commandes SET article=$1, quantite=$2, fournisseur=$3, prix_unitaire=$4, statut=$5, remarques=$6, valide=$7 WHERE id=$8 RETURNING *",
          [
            article,
            quantite || 1,
            fournisseur || null,
            prix_unitaire || null,
            statut || "en_attente",
            remarques || null,
            valide || false,
            id,
          ],
        );
        if (r.rows.length === 0) return json(cors, { message: "Commande non trouvée" }, 404);
        return json(cors, r.rows[0]);
      }

      if (id && req.method === "DELETE") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        await pool.query("DELETE FROM commandes WHERE id=$1", [id]);
        return json(cors, { message: "Commande supprimée" });
      }
    }

    if (path === "/comptabilite" && req.method === "GET") {
      await pool.query(`
        UPDATE paiements p
        SET statut = 'en_retard'
        FROM eleves e
        JOIN (
          SELECT DISTINCT ON (eleve_id) eleve_id, valide_at
          FROM factures_validations
          WHERE valide = true AND valide_at IS NOT NULL
          ORDER BY eleve_id, valide_at DESC
        ) fv ON fv.eleve_id = e.id
        WHERE p.eleve_id = e.id
          AND p.statut = 'en_attente'
          AND p.valide = false
          AND fv.valide_at < NOW() - INTERVAL '30 days'
      `);

      const statut = url.searchParams.get("statut");
      const classe_id = url.searchParams.get("classe_id");
      let query = `
        SELECT p.id, p.montant, p.type, p.statut, p.date_paiement, p.commentaire, p.reference, p.valide, p.created_at,
          u.nom, u.prenom, e.id as eleve_id,
          c.nom as classe,
          fv.valide_at as emis_at
        FROM paiements p
        JOIN eleves e ON p.eleve_id = e.id
        JOIN utilisateurs u ON e.utilisateur_id = u.id
        LEFT JOIN classes c ON e.classe_id = c.id
        LEFT JOIN (
          SELECT DISTINCT ON (eleve_id) eleve_id, valide_at
          FROM factures_validations
          WHERE valide = true AND valide_at IS NOT NULL
          ORDER BY eleve_id, valide_at DESC
        ) fv ON fv.eleve_id = e.id
        WHERE 1=1
      `;
      const params: unknown[] = [];
      if (statut) {
        query += ` AND p.statut = $${params.length + 1}`;
        params.push(statut);
      }
      if (classe_id) {
        query += ` AND e.classe_id = $${params.length + 1}`;
        params.push(classe_id);
      }
      query += " ORDER BY p.created_at DESC";
      const result = await pool.query(query, params);
      return json(cors, result.rows);
    }

    if (path === "/comptabilite" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { eleve_id, montant, type, statut, date_paiement, commentaire, reference } = body;
      const result = await pool.query(
        "INSERT INTO paiements (eleve_id, montant, type, statut, date_paiement, commentaire, reference) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [
          eleve_id,
          montant,
          type,
          statut || "en_attente",
          date_paiement || null,
          commentaire || null,
          reference || null,
        ],
      );
      return json(cors, { message: "Paiement cree", paiement: result.rows[0] }, 201);
    }

    const paiementMatch = path.match(/^\/comptabilite\/(\d+)$/);
    if (paiementMatch) {
      const id = paiementMatch[1];
      if (req.method === "PUT") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const body = await parseJsonBody(req);
        const { montant, type, statut, date_paiement, commentaire, reference, valide } = body;
        const result = await pool.query(
          "UPDATE paiements SET montant=$1, type=$2, statut=$3, date_paiement=$4, commentaire=$5, reference=$6, valide=$7 WHERE id=$8 RETURNING *",
          [
            montant,
            type,
            statut,
            date_paiement || null,
            commentaire || null,
            reference || null,
            valide || false,
            id,
          ],
        );
        if (result.rows.length === 0) return json(cors, { message: "Paiement non trouve" }, 404);
        return json(cors, { message: "Paiement modifie" });
      }
      if (req.method === "DELETE") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        await pool.query("DELETE FROM paiements WHERE id=$1", [id]);
        return json(cors, { message: "Paiement supprime" });
      }
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("comptabilite-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: "Erreur serveur", erreur: msg }, 500);
  } finally {
    await pool.end();
  }
}
