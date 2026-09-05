import type { PoolClient } from "npm:pg@8";
import { createPool, json } from "../auth-fast-shared.ts";
import {
  type AuthUser,
  loadUser,
  parseJsonBody,
  requireAdmin,
  requireAuth,
} from "./middleware.ts";

const ORDRE_JOURS =
  "CASE jour WHEN 'Lundi' THEN 1 WHEN 'Mardi' THEN 2 WHEN 'Mercredi' THEN 3 WHEN 'Jeudi' THEN 4 WHEN 'Vendredi' THEN 5 END";

function normaliserNiveauxPool(niveau: unknown): string | null {
  if (niveau == null || niveau === "") return null;
  const list = Array.isArray(niveau)
    ? niveau.map((v) => String(v).trim()).filter(Boolean)
    : String(niveau)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
  return list.length ? list.join(",") : null;
}

function peutEditerDisponibilites(user: AuthUser, profId: string): boolean {
  if (String(user.id) === String(profId)) return true;
  if (user.role === "admin") return true;
  return false;
}

function estIndisponible(valeur: unknown): boolean {
  return valeur === false || valeur === 0 || valeur === "false" || valeur === "indispo";
}

function estEviterFlag(d: Record<string, unknown>): boolean {
  return (
    d?.eviter === true ||
    d?.eviter === 1 ||
    d?.eviter === "true" ||
    d?.statut === "eviter" ||
    d?.disponible === "eviter"
  );
}

export async function handlePlanningRoute(
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
    if (path === "/planning/creneaux" && req.method === "GET") {
      const r = await pool.query(
        "SELECT * FROM creneaux ORDER BY " + ORDRE_JOURS + ", ordre",
      );
      return json(cors, r.rows);
    }

    if (path === "/planning/disponibilites" && req.method === "GET") {
      const r = await pool.query(
        "SELECT prof_id, creneau_id, disponible, eviter FROM disponibilites",
      );
      return json(cors, r.rows);
    }

    const dispoRemarqueMatch = path.match(/^\/planning\/disponibilites\/(\d+)\/remarque$/);
    if (dispoRemarqueMatch) {
      const profId = dispoRemarqueMatch[1];
      if (req.method === "GET") {
        try {
          const r = await pool.query(
            "SELECT remarque_disponibilites FROM utilisateurs WHERE id=$1",
            [profId],
          );
          if (r.rows.length === 0) {
            return json(cors, { message: "Professeur non trouvé" }, 404);
          }
          return json(cors, { remarque: r.rows[0].remarque_disponibilites || "" });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erreur";
          return json(cors, { message: msg }, 500);
        }
      }
      if (req.method === "POST") {
        if (!peutEditerDisponibilites(user!, profId)) {
          return json(cors, { message: "Accès refusé" }, 403);
        }
        try {
          const body = await parseJsonBody(req);
          const remarque = typeof body?.remarque === "string" ? body.remarque : "";
          const r = await pool.query(
            "UPDATE utilisateurs SET remarque_disponibilites=$1 WHERE id=$2 RETURNING id",
            [remarque, profId],
          );
          if (r.rows.length === 0) {
            return json(cors, { message: "Professeur non trouvé" }, 404);
          }
          return json(cors, { message: "Remarque sauvegardée" });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erreur";
          return json(cors, { message: msg }, 500);
        }
      }
    }

    const dispoMatch = path.match(/^\/planning\/disponibilites\/(\d+)$/);
    if (dispoMatch) {
      const profId = dispoMatch[1];
      if (req.method === "GET") {
        const r = await pool.query(
          "SELECT creneau_id, disponible, eviter FROM disponibilites WHERE prof_id=$1",
          [profId],
        );
        return json(cors, r.rows);
      }
      if (req.method === "POST") {
        if (!peutEditerDisponibilites(user!, profId)) {
          return json(cors, { message: "Accès refusé" }, 403);
        }
        const body = await parseJsonBody(req);
        const { disponibilites } = body;
        const profIdNum = Number(profId);
        if (!Number.isInteger(profIdNum) || profIdNum <= 0) {
          return json(cors, { message: "prof_id invalide" }, 400);
        }
        const liste = Array.isArray(disponibilites) ? disponibilites : [];
        const creneauxIndispo = [
          ...new Set(
            liste
              .filter((d) => d && estIndisponible((d as Record<string, unknown>).disponible))
              .map((d) => Number((d as Record<string, unknown>).creneau_id))
              .filter((id) => Number.isInteger(id) && id > 0),
          ),
        ];
        let client: PoolClient | undefined;
        try {
          client = await pool.connect();
          await client.query("BEGIN");
          await client.query("DELETE FROM disponibilites WHERE prof_id=$1", [profIdNum]);
          for (const d of liste) {
            const row = d as Record<string, unknown>;
            const creneauId = Number(row?.creneau_id);
            if (!Number.isInteger(creneauId) || creneauId <= 0) continue;
            const eviter = !estIndisponible(row.disponible) && estEviterFlag(row);
            await client.query(
              "INSERT INTO disponibilites (prof_id, creneau_id, disponible, eviter) VALUES ($1,$2,$3,$4)",
              [profIdNum, creneauId, !estIndisponible(row.disponible), eviter],
            );
          }
          let affectationsSupprimees = 0;
          if (creneauxIndispo.length) {
            const del = await client.query(
              "DELETE FROM affectations WHERE prof_id = $1 AND creneau_id = ANY($2::int[])",
              [profIdNum, creneauxIndispo],
            );
            affectationsSupprimees = del.rowCount || 0;
          }
          await client.query("COMMIT");
          return json(cors, {
            message: "Sauvegardé",
            affectations_supprimees: affectationsSupprimees,
          });
        } catch (err) {
          if (client) {
            try {
              await client.query("ROLLBACK");
            } catch {
              /* ignore */
            }
          }
          const msg = err instanceof Error ? err.message : "Erreur";
          return json(cors, { message: msg }, 500);
        } finally {
          if (client) client.release();
        }
      }
    }

    if (path === "/planning/pools" && req.method === "GET") {
      const pools = await pool.query(
        "SELECT id, nom, site, couleur, horaires, niveau, ordre FROM pools ORDER BY COALESCE(ordre, 0), nom",
      );
      const result = [];
      for (const p of pools.rows) {
        const profs = await pool.query(
          "SELECT u.id, u.nom, u.prenom, u.taux_activite, u.periodes_semaine, u.niveau_prefere, u.lieu_travail_prefere, u.branches_specialites FROM utilisateurs u JOIN pool_profs pp ON pp.prof_id=u.id WHERE pp.pool_id=$1",
          [p.id],
        );
        const classes = await pool.query(
          "SELECT c.id, c.nom, c.niveau FROM classes c JOIN pool_classes pc ON pc.classe_id=c.id WHERE pc.pool_id=$1",
          [p.id],
        );
        const branches = await pool.query(
          "SELECT m.id, m.nom, m.periodes_semaine FROM matieres m JOIN pool_branches pb ON pb.matiere_id=m.id WHERE pb.pool_id=$1",
          [p.id],
        );
        result.push({ ...p, profs: profs.rows, classes: classes.rows, branches: branches.rows });
      }
      return json(cors, result);
    }

    if (path === "/planning/pools" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { nom, site, couleur, prof_ids, classe_ids, branche_ids, horaires, niveau } = body;
      try {
        const niveauNormalise = normaliserNiveauxPool(niveau);
        const r = await pool.query(
          "INSERT INTO pools (nom, site, couleur, horaires, niveau) VALUES ($1,$2,$3,$4,$5) RETURNING *",
          [
            nom,
            site || "",
            couleur || "#6366f1",
            JSON.stringify(horaires || []),
            niveauNormalise,
          ],
        );
        const newPool = r.rows[0];
        for (const pid of (prof_ids as unknown[]) || []) {
          await pool.query("INSERT INTO pool_profs (pool_id, prof_id) VALUES ($1,$2)", [
            newPool.id,
            pid,
          ]);
        }
        for (const cid of (classe_ids as unknown[]) || []) {
          await pool.query("INSERT INTO pool_classes (pool_id, classe_id) VALUES ($1,$2)", [
            newPool.id,
            cid,
          ]);
        }
        for (const mid of (branche_ids as unknown[]) || []) {
          await pool.query("INSERT INTO pool_branches (pool_id, matiere_id) VALUES ($1,$2)", [
            newPool.id,
            mid,
          ]);
        }
        return json(cors, newPool);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur";
        return json(cors, { message: msg }, 500);
      }
    }

    const poolIdMatch = path.match(/^\/planning\/pools\/(\d+)$/);
    if (poolIdMatch) {
      const id = poolIdMatch[1];
      if (req.method === "PUT") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        const body = await parseJsonBody(req);
        const { nom, site, couleur, prof_ids, classe_ids, branche_ids, horaires, niveau, ordre } =
          body;
        try {
          const anciensProfsRes = await pool.query("SELECT prof_id FROM pool_profs WHERE pool_id=$1", [
            id,
          ]);
          const anciennesClassesRes = await pool.query(
            "SELECT classe_id FROM pool_classes WHERE pool_id=$1",
            [id],
          );
          const anciensProfs = anciensProfsRes.rows.map((r) => Number(r.prof_id));
          const anciennesClasses = anciennesClassesRes.rows.map((r) => Number(r.classe_id));
          const nouveauxProfs = ((prof_ids as unknown[]) || []).map((x) => Number(x));
          const profsSupprimes = anciensProfs.filter((pid) => !nouveauxProfs.includes(pid));

          if (profsSupprimes.length && anciennesClasses.length) {
            await pool.query(
              "DELETE FROM affectations WHERE prof_id = ANY($1::int[]) AND classe_id = ANY($2::int[])",
              [profsSupprimes, anciennesClasses],
            );
          }

          const niveauNormalise = normaliserNiveauxPool(niveau);
          await pool.query(
            "UPDATE pools SET nom=$1, site=$2, couleur=$3, horaires=$4, niveau=$5, ordre=$6 WHERE id=$7",
            [
              nom,
              site || "",
              couleur,
              JSON.stringify(horaires || []),
              niveauNormalise,
              ordre !== undefined ? ordre : 0,
              id,
            ],
          );
          await pool.query("DELETE FROM pool_profs WHERE pool_id=$1", [id]);
          await pool.query("DELETE FROM pool_classes WHERE pool_id=$1", [id]);
          await pool.query("DELETE FROM pool_branches WHERE pool_id=$1", [id]);
          for (const pid of (prof_ids as unknown[]) || []) {
            await pool.query("INSERT INTO pool_profs (pool_id, prof_id) VALUES ($1,$2)", [id, pid]);
          }
          for (const cid of (classe_ids as unknown[]) || []) {
            await pool.query("INSERT INTO pool_classes (pool_id, classe_id) VALUES ($1,$2)", [id, cid]);
          }
          for (const mid of (branche_ids as unknown[]) || []) {
            await pool.query("INSERT INTO pool_branches (pool_id, matiere_id) VALUES ($1,$2)", [
              id,
              mid,
            ]);
          }
          return json(cors, { message: "Pool mis à jour" });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erreur";
          return json(cors, { message: msg }, 500);
        }
      }
      if (req.method === "DELETE") {
        const denied = requireAdmin(user!, cors);
        if (denied) return denied;
        await pool.query("DELETE FROM pools WHERE id=$1", [id]);
        return json(cors, { message: "Supprimé" });
      }
    }

    if (path === "/planning/classe-horaires" && req.method === "GET") {
      const r = await pool.query("SELECT * FROM classe_horaires");
      return json(cors, r.rows);
    }

    const classeHorairesMatch = path.match(/^\/planning\/classe-horaires\/(\d+)$/);
    if (classeHorairesMatch) {
      const classeId = classeHorairesMatch[1];
      if (req.method === "GET") {
        const r = await pool.query(
          "SELECT jour, periode FROM classe_horaires WHERE classe_id=$1",
          [classeId],
        );
        return json(cors, r.rows);
      }
      if (req.method === "POST") {
        const body = await parseJsonBody(req);
        const { horaires } = body;
        try {
          await pool.query("DELETE FROM classe_horaires WHERE classe_id=$1", [classeId]);
          for (const h of horaires as Array<{ jour: string; periode: string }>) {
            await pool.query(
              "INSERT INTO classe_horaires (classe_id, jour, periode) VALUES ($1,$2,$3)",
              [classeId, h.jour, h.periode],
            );
          }
          return json(cors, { message: "Sauvegardé" });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erreur";
          return json(cors, { message: msg }, 500);
        }
      }
    }

    if (path === "/planning/classe-couleurs" && req.method === "GET") {
      try {
        const r = await pool.query("SELECT classe_id, couleur FROM classe_couleurs");
        return json(cors, r.rows);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur";
        return json(cors, { message: msg }, 500);
      }
    }

    if (path === "/planning/classe-couleurs" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { classe_id, couleur } = body || {};
      if (!classe_id || !couleur) {
        return json(cors, { message: "classe_id et couleur requis" }, 400);
      }
      try {
        const r = await pool.query(
          `
          INSERT INTO classe_couleurs (classe_id, couleur, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (classe_id) DO UPDATE SET couleur=$2, updated_at=NOW()
          RETURNING classe_id, couleur
        `,
          [classe_id, couleur],
        );
        return json(cors, r.rows[0]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur";
        return json(cors, { message: msg }, 500);
      }
    }

    if (path === "/planning/prof-couleurs" && req.method === "GET") {
      try {
        const r = await pool.query("SELECT prof_id, couleur FROM prof_couleurs");
        return json(cors, r.rows);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur";
        return json(cors, { message: msg }, 500);
      }
    }

    if (path === "/planning/prof-couleurs" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { prof_id, couleur } = body || {};
      if (!prof_id || !couleur) {
        return json(cors, { message: "prof_id et couleur requis" }, 400);
      }
      try {
        const r = await pool.query(
          `
          INSERT INTO prof_couleurs (prof_id, couleur, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (prof_id) DO UPDATE SET couleur=$2, updated_at=NOW()
          RETURNING prof_id, couleur
        `,
          [prof_id, couleur],
        );
        return json(cors, r.rows[0]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur";
        return json(cors, { message: msg }, 500);
      }
    }

    if (path === "/planning/branche-couleurs" && req.method === "GET") {
      try {
        const r = await pool.query("SELECT matiere_id, couleur FROM branche_couleurs");
        return json(cors, r.rows);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur";
        return json(cors, { message: msg }, 500);
      }
    }

    if (path === "/planning/branche-couleurs" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { matiere_id, couleur } = body || {};
      if (!matiere_id || !couleur) {
        return json(cors, { message: "matiere_id et couleur requis" }, 400);
      }
      try {
        const r = await pool.query(
          `
          INSERT INTO branche_couleurs (matiere_id, couleur, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (matiere_id) DO UPDATE SET couleur=$2, updated_at=NOW()
          RETURNING matiere_id, couleur
        `,
          [matiere_id, couleur],
        );
        return json(cors, r.rows[0]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur";
        return json(cors, { message: msg }, 500);
      }
    }

    if (path === "/planning/affectations" && req.method === "GET") {
      const r = await pool.query(`
        SELECT a.*, u.prenom||' '||u.nom as prof_nom,
          COALESCE(c.nom, CASE
            WHEN a.type_special='titulariat' THEN 'Titulariat'
            WHEN a.type_special='atelier' THEN 'Atelier'
            WHEN a.type_special='mediation' THEN 'Médiation'
            WHEN a.type_special='autre' THEN 'Autre'
            WHEN a.type_special IS NOT NULL AND a.type_special <> '' AND a.type_special <> 'soutien'
              THEN INITCAP(REPLACE(a.type_special, '-', ' '))
            ELSE NULL
          END) as classe_nom,
          m.nom as matiere_nom,
          CASE WHEN a.type_special = 'soutien' THEN (
            SELECT a2.matiere_id
            FROM affectations a2
            WHERE a2.classe_id = a.classe_id
              AND a2.creneau_id = a.creneau_id
              AND (a2.type_special IS NULL OR a2.type_special = '')
              AND a2.prof_id IS DISTINCT FROM a.prof_id
            ORDER BY a2.id
            LIMIT 1
          ) ELSE NULL END AS soutien_matiere_id,
          CASE WHEN a.type_special = 'soutien' THEN (
            SELECT m2.nom
            FROM affectations a2
            LEFT JOIN matieres m2 ON m2.id = a2.matiere_id
            WHERE a2.classe_id = a.classe_id
              AND a2.creneau_id = a.creneau_id
              AND (a2.type_special IS NULL OR a2.type_special = '')
              AND a2.prof_id IS DISTINCT FROM a.prof_id
            ORDER BY a2.id
            LIMIT 1
          ) ELSE NULL END AS soutien_matiere_nom,
          COALESCE(ps.nom, (
            SELECT p.nom FROM pools p
            JOIN pool_classes pc ON pc.pool_id = p.id
            WHERE pc.classe_id = a.classe_id
            ORDER BY p.id LIMIT 1
          )) AS pool_nom,
          cr.jour, cr.heure_debut, cr.heure_fin, cr.periode, cr.ordre
        FROM affectations a
        JOIN utilisateurs u ON u.id=a.prof_id
        LEFT JOIN classes c ON c.id=a.classe_id
        LEFT JOIN matieres m ON m.id=a.matiere_id
        LEFT JOIN pools ps ON ps.id = a.pool_id
        JOIN creneaux cr ON cr.id=a.creneau_id
        ORDER BY ${ORDRE_JOURS.replace("jour", "cr.jour")}, cr.ordre
      `);
      return json(cors, r.rows);
    }

    if (path === "/planning/affectations" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { prof_id, classe_id, matiere_id, creneau_id, type_special, pool_id } = body;
      const typeRaw = String(type_special || '').trim();
      const estSoutien = typeRaw === "soutien";
      // Tout type non vide hors soutien = Spécial sans classe (liste dynamique Paramètres)
      const specialSansClasse = Boolean(typeRaw) && !estSoutien;
      const typeFinal = specialSansClasse || estSoutien ? typeRaw : null;
      const classeIdFinal = specialSansClasse ? null : (classe_id || null);
      let poolIdFinal = pool_id != null && pool_id !== "" ? Number(pool_id) : null;
      if (!Number.isInteger(poolIdFinal) || (poolIdFinal as number) <= 0) poolIdFinal = null;
      try {
        if (!Number.isInteger(poolIdFinal) && classeIdFinal != null) {
          const poolFromClasse = await pool.query(
            "SELECT pool_id FROM pool_classes WHERE classe_id = $1 ORDER BY pool_id LIMIT 1",
            [classeIdFinal],
          );
          if (poolFromClasse.rows[0]?.pool_id != null) {
            poolIdFinal = Number(poolFromClasse.rows[0].pool_id);
          }
        }
        if (classeIdFinal != null) {
          await pool.query(
            `
            DELETE FROM affectations
            WHERE creneau_id = $1
              AND classe_id = $2
              AND (
                ($3::boolean AND type_special = 'soutien')
                OR (NOT $3::boolean AND (type_special IS NULL OR type_special = ''))
              )
          `,
            [creneau_id, classeIdFinal, estSoutien],
          );
        }
        if (prof_id != null) {
          await pool.query("DELETE FROM affectations WHERE prof_id = $1 AND creneau_id = $2", [
            prof_id,
            creneau_id,
          ]);
        }
        const r = await pool.query(
          `
          INSERT INTO affectations (prof_id, classe_id, matiere_id, creneau_id, type_special, pool_id)
          VALUES ($1,$2,$3,$4,$5,$6)
          RETURNING *
        `,
          [
            prof_id || null,
            classeIdFinal,
            matiere_id || null,
            creneau_id,
            typeFinal,
            Number.isInteger(poolIdFinal) ? poolIdFinal : null,
          ],
        );
        return json(cors, r.rows[0]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur";
        return json(cors, { message: msg }, 500);
      }
    }

    const affectationDeleteMatch = path.match(/^\/planning\/affectations\/(\d+)$/);
    if (affectationDeleteMatch && req.method === "DELETE") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      await pool.query("DELETE FROM affectations WHERE id=$1", [affectationDeleteMatch[1]]);
      return json(cors, { message: "Supprimé" });
    }

    if (path === "/planning/titulaires" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const classeId = Number(body?.classe_id);
      const profBrut = body?.prof_id;
      const profId =
        profBrut === null || profBrut === undefined || String(profBrut).trim() === ""
          ? null
          : Number(profBrut);

      if (!Number.isInteger(classeId)) {
        return json(cors, { message: "classe_id invalide" }, 400);
      }
      if (profId !== null && !Number.isInteger(profId)) {
        return json(cors, { message: "prof_id invalide" }, 400);
      }

      try {
        const classe = await pool.query("SELECT id FROM classes WHERE id=$1", [classeId]);
        if (!classe.rows.length) {
          return json(cors, { message: "Classe introuvable" }, 404);
        }
        if (profId !== null) {
          const prof = await pool.query(
            "SELECT id FROM utilisateurs WHERE id=$1 AND role='prof'",
            [profId],
          );
          if (!prof.rows.length) {
            return json(cors, { message: "Professeur introuvable" }, 404);
          }
        }
        await pool.query("UPDATE classes SET prof_principal_id=$1 WHERE id=$2", [profId, classeId]);
        return json(cors, { message: "Titulaire mis à jour" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur";
        return json(cors, { message: msg }, 500);
      }
    }

    if (path === "/planning/planning-branches" && req.method === "GET") {
      const pool_id = url.searchParams.get("pool_id");
      let q = "SELECT * FROM planning_branches WHERE 1=1";
      const params: unknown[] = [];
      if (pool_id) {
        params.push(pool_id);
        q += " AND pool_id=$" + params.length;
      }
      const r = await pool.query(q, params);
      return json(cors, r.rows);
    }

    if (path === "/planning/planning-branches" && req.method === "POST") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      const { prof_id, classe_id, matiere_id, pool_id } = body;
      try {
        await pool.query(
          `
          INSERT INTO planning_branches (prof_id, classe_id, matiere_id, pool_id)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (classe_id, matiere_id, pool_id) DO UPDATE SET prof_id=$1
        `,
          [prof_id, classe_id, matiere_id, pool_id],
        );
        return json(cors, { message: "Sauvegardé" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur";
        return json(cors, { message: msg }, 500);
      }
    }

    if (path === "/planning/planning-branches" && req.method === "DELETE") {
      const denied = requireAdmin(user!, cors);
      if (denied) return denied;
      const body = await parseJsonBody(req);
      await pool.query(
        "DELETE FROM planning_branches WHERE classe_id=$1 AND matiere_id=$2 AND pool_id=$3",
        [body.classe_id, body.matiere_id, body.pool_id],
      );
      return json(cors, { message: "Supprimé" });
    }

    if (path === "/planning/general" && req.method === "GET") {
      try {
        const pool_id = url.searchParams.get("pool_id");
        let profsQ = "SELECT id, nom, prenom FROM utilisateurs WHERE role='prof' ORDER BY nom";
        let profsP: unknown[] = [];
        if (pool_id) {
          profsQ =
            "SELECT u.id,u.nom,u.prenom FROM utilisateurs u JOIN pool_profs pp ON pp.prof_id=u.id WHERE pp.pool_id=$1 ORDER BY u.nom";
          profsP = [pool_id];
        }
        const profs = await pool.query(profsQ, profsP);
        const creneaux = await pool.query(
          "SELECT * FROM creneaux ORDER BY " + ORDRE_JOURS + ", ordre",
        );
        let affectations;
        let dispos;
        if (pool_id) {
          affectations = await pool.query(
            `
        SELECT a.prof_id, a.creneau_id, a.matiere_id, a.classe_id, a.type_special, a.pool_id,
          COALESCE(c.nom, CASE
            WHEN a.type_special='titulariat' THEN 'Titulariat'
            WHEN a.type_special='atelier' THEN 'Atelier'
            WHEN a.type_special='mediation' THEN 'Médiation'
            WHEN a.type_special='autre' THEN 'Autre'
            WHEN a.type_special IS NOT NULL AND a.type_special <> '' AND a.type_special <> 'soutien'
              THEN INITCAP(REPLACE(a.type_special, '-', ' '))
            ELSE NULL
          END) as classe_nom,
          m.nom as matiere_nom,
          COALESCE(
            (SELECT p.nom FROM pools p WHERE p.id = a.pool_id),
            (
              SELECT p.nom FROM pools p
              JOIN pool_classes pc ON pc.pool_id = p.id
              WHERE pc.classe_id = a.classe_id
              ORDER BY CASE WHEN p.id = $1::int THEN 0 ELSE 1 END, p.id
              LIMIT 1
            )
          ) AS pool_nom,
          COALESCE(
            a.pool_id,
            (
              SELECT p.id FROM pools p
              JOIN pool_classes pc ON pc.pool_id = p.id
              WHERE pc.classe_id = a.classe_id
              ORDER BY CASE WHEN p.id = $1::int THEN 0 ELSE 1 END, p.id
              LIMIT 1
            )
          ) AS pool_id_aff,
          CASE
            WHEN a.pool_id IS NOT NULL THEN (a.pool_id = $1::int)
            WHEN a.classe_id IS NOT NULL THEN EXISTS (
              SELECT 1 FROM pool_classes pc
              WHERE pc.classe_id = a.classe_id AND pc.pool_id = $1::int
            )
            ELSE true
          END AS dans_pool_courant
        FROM affectations a
        JOIN pool_profs pp ON pp.prof_id = a.prof_id AND pp.pool_id = $1
        LEFT JOIN classes c ON c.id=a.classe_id
        LEFT JOIN matieres m ON m.id=a.matiere_id
      `,
            [pool_id],
          );
          dispos = await pool.query(
            `
        SELECT d.prof_id, d.creneau_id, d.disponible, d.eviter
        FROM disponibilites d
        JOIN pool_profs pp ON pp.prof_id = d.prof_id AND pp.pool_id = $1
      `,
            [pool_id],
          );
        } else {
          affectations = await pool.query(`
        SELECT a.prof_id, a.creneau_id, a.matiere_id, a.classe_id, a.type_special, a.pool_id,
          COALESCE(c.nom, CASE
            WHEN a.type_special='titulariat' THEN 'Titulariat'
            WHEN a.type_special='atelier' THEN 'Atelier'
            WHEN a.type_special='mediation' THEN 'Médiation'
            WHEN a.type_special='autre' THEN 'Autre'
            WHEN a.type_special IS NOT NULL AND a.type_special <> '' AND a.type_special <> 'soutien'
              THEN INITCAP(REPLACE(a.type_special, '-', ' '))
            ELSE NULL
          END) as classe_nom,
          m.nom as matiere_nom,
          COALESCE(
            (SELECT p.nom FROM pools p WHERE p.id = a.pool_id),
            (
              SELECT p.nom FROM pools p
              JOIN pool_classes pc ON pc.pool_id = p.id
              WHERE pc.classe_id = a.classe_id
              ORDER BY p.id LIMIT 1
            )
          ) AS pool_nom,
          COALESCE(
            a.pool_id,
            (
              SELECT p.id FROM pools p
              JOIN pool_classes pc ON pc.pool_id = p.id
              WHERE pc.classe_id = a.classe_id
              ORDER BY p.id LIMIT 1
            )
          ) AS pool_id_aff,
          true AS dans_pool_courant
        FROM affectations a
        LEFT JOIN classes c ON c.id=a.classe_id
        LEFT JOIN matieres m ON m.id=a.matiere_id
      `);
          dispos = await pool.query(
            "SELECT prof_id,creneau_id,disponible,eviter FROM disponibilites",
          );
        }
        const titulaires = pool_id
          ? await pool.query(
              `
          SELECT c.id as classe_id, c.nom as classe_nom, u.id as prof_id, u.prenom||' '||u.nom as prof_nom
          FROM classes c
          JOIN pool_classes pc ON pc.classe_id = c.id AND pc.pool_id = $1
          LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
          ORDER BY c.nom
        `,
              [pool_id],
            )
          : await pool.query(`
          SELECT c.id as classe_id, c.nom as classe_nom, u.id as prof_id, u.prenom||' '||u.nom as prof_nom
          FROM classes c
          LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
          ORDER BY c.nom
        `);
        return json(cors, {
          profs: profs.rows || [],
          creneaux: creneaux.rows || [],
          affectations: affectations.rows || [],
          dispos: dispos.rows || [],
          titulaires: titulaires.rows || [],
        });
      } catch (e) {
        console.error("getPlanningGeneral:", e);
        const msg = e instanceof Error ? e.message : "Erreur planning général";
        return json(cors, { message: msg }, 500);
      }
    }

    const planningProfMatch = path.match(/^\/planning\/prof\/(\d+)$/);
    if (planningProfMatch && req.method === "GET") {
      const prof_id = planningProfMatch[1];
      const prof = await pool.query("SELECT id,nom,prenom FROM utilisateurs WHERE id=$1", [prof_id]);
      const classesTitulaire = await pool.query(
        "SELECT nom FROM classes WHERE prof_principal_id=$1",
        [prof_id],
      );
      const creneaux = await pool.query(
        "SELECT * FROM creneaux ORDER BY " + ORDRE_JOURS + ", ordre",
      );
      const affectations = await pool.query(
        `
    SELECT a.creneau_id, a.matiere_id, a.classe_id, a.type_special, a.pool_id,
      COALESCE(c.nom, CASE
        WHEN a.type_special='titulariat' THEN 'Titulariat'
        WHEN a.type_special='atelier' THEN 'Atelier'
        WHEN a.type_special='mediation' THEN 'Médiation'
        WHEN a.type_special='autre' THEN 'Autre'
        WHEN a.type_special IS NOT NULL AND a.type_special <> '' AND a.type_special <> 'soutien'
          THEN INITCAP(REPLACE(a.type_special, '-', ' '))
        ELSE NULL
      END) as classe_nom,
      m.nom as matiere_nom,
      COALESCE(
        (SELECT p.nom FROM pools p WHERE p.id = a.pool_id),
        (
          SELECT string_agg(p.nom, ', ' ORDER BY p.nom)
          FROM pools p
          JOIN pool_classes pc ON pc.pool_id = p.id
          WHERE pc.classe_id = a.classe_id
        )
      ) AS pool_nom,
      (
        SELECT string_agg(p.nom, ', ' ORDER BY p.nom)
        FROM pools p
        JOIN pool_profs pp ON pp.pool_id = p.id
        WHERE pp.prof_id = $1
      ) AS pools_prof,
      CASE WHEN a.type_special = 'soutien' THEN (
        SELECT u2.prenom
        FROM affectations a2
        JOIN utilisateurs u2 ON u2.id = a2.prof_id
        WHERE a2.classe_id = a.classe_id
          AND a2.creneau_id = a.creneau_id
          AND (a2.type_special IS NULL OR a2.type_special = '')
          AND a2.prof_id IS DISTINCT FROM a.prof_id
        ORDER BY a2.id
        LIMIT 1
      ) ELSE NULL END AS soutien_prof_prenom,
      CASE WHEN a.type_special = 'soutien' THEN (
        SELECT u2.nom
        FROM affectations a2
        JOIN utilisateurs u2 ON u2.id = a2.prof_id
        WHERE a2.classe_id = a.classe_id
          AND a2.creneau_id = a.creneau_id
          AND (a2.type_special IS NULL OR a2.type_special = '')
          AND a2.prof_id IS DISTINCT FROM a.prof_id
        ORDER BY a2.id
        LIMIT 1
      ) ELSE NULL END AS soutien_prof_nom,
      CASE WHEN a.type_special = 'soutien' THEN (
        SELECT COALESCE(m2.nom, m2b.nom)
        FROM affectations a2
        LEFT JOIN matieres m2 ON m2.id = a2.matiere_id
        LEFT JOIN LATERAL (
          SELECT m.nom
          FROM planning_branches pb
          JOIN matieres m ON m.id = pb.matiere_id
          WHERE pb.classe_id = a2.classe_id AND pb.prof_id = a2.prof_id
          ORDER BY pb.id
          LIMIT 1
        ) m2b ON true
        WHERE a2.classe_id = a.classe_id
          AND a2.creneau_id = a.creneau_id
          AND (a2.type_special IS NULL OR a2.type_special = '')
          AND a2.prof_id IS DISTINCT FROM a.prof_id
        ORDER BY a2.id
        LIMIT 1
      ) ELSE NULL END AS soutien_matiere_nom,
      CASE WHEN a.type_special IS NULL OR a.type_special = '' THEN (
        SELECT u3.prenom
        FROM affectations a3
        JOIN utilisateurs u3 ON u3.id = a3.prof_id
        WHERE a3.classe_id = a.classe_id
          AND a3.creneau_id = a.creneau_id
          AND a3.type_special = 'soutien'
        ORDER BY a3.id
        LIMIT 1
      ) ELSE NULL END AS recu_soutien_prenom,
      CASE WHEN a.type_special IS NULL OR a.type_special = '' THEN (
        SELECT u3.nom
        FROM affectations a3
        JOIN utilisateurs u3 ON u3.id = a3.prof_id
        WHERE a3.classe_id = a.classe_id
          AND a3.creneau_id = a.creneau_id
          AND a3.type_special = 'soutien'
        ORDER BY a3.id
        LIMIT 1
      ) ELSE NULL END AS recu_soutien_nom
    FROM affectations a
    LEFT JOIN classes c ON c.id=a.classe_id
    LEFT JOIN matieres m ON m.id=a.matiere_id
    WHERE a.prof_id=$1
  `,
        [prof_id],
      );
      const poolsProf = await pool.query(
        `
    SELECT p.id, p.nom, p.site
    FROM pools p
    JOIN pool_profs pp ON pp.pool_id = p.id
    WHERE pp.prof_id = $1
    ORDER BY p.nom
  `,
        [prof_id],
      );
      const dispos = await pool.query(
        "SELECT creneau_id,disponible,eviter FROM disponibilites WHERE prof_id=$1",
        [prof_id],
      );
      return json(cors, {
        prof: prof.rows[0],
        creneaux: creneaux.rows,
        affectations: affectations.rows,
        dispos: dispos.rows,
        classesTitulaire: classesTitulaire.rows,
        pools: poolsProf.rows,
      });
    }

    const planningClasseMatch = path.match(/^\/planning\/classe\/(\d+)$/);
    if (planningClasseMatch && req.method === "GET") {
      const classe_id = planningClasseMatch[1];
      const pool_id = url.searchParams.get("pool_id");
      const classe = await pool.query(
        `SELECT c.id, c.nom, u.prenom||' '||u.nom as titulaire_nom FROM classes c LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id WHERE c.id=$1`,
        [classe_id],
      );
      const creneaux = await pool.query(
        "SELECT * FROM creneaux ORDER BY " + ORDRE_JOURS + ", ordre",
      );
      const affectations = await pool.query(
        `
    SELECT a.id, a.creneau_id, a.prof_id, a.matiere_id, a.type_special, a.pool_id,
      u.prenom||' '||u.nom as prof_nom, m.nom as matiere_nom
    FROM affectations a
    JOIN utilisateurs u ON u.id=a.prof_id
    LEFT JOIN matieres m ON m.id=a.matiere_id
    WHERE a.classe_id=$1
    ORDER BY CASE WHEN a.type_special = 'soutien' THEN 1 ELSE 0 END, a.id
  `,
        [classe_id],
      );
      const horaires = await pool.query(
        "SELECT jour,periode FROM classe_horaires WHERE classe_id=$1",
        [classe_id],
      );
      let branches: Record<string, unknown>[] = [];
      if (pool_id) {
        const pb = await pool.query(
          `
      SELECT pb.prof_id, pb.matiere_id, m.nom as matiere_nom, m.periodes_semaine,
        u.prenom||' '||u.nom as prof_nom
      FROM planning_branches pb
      JOIN matieres m ON m.id=pb.matiere_id
      LEFT JOIN utilisateurs u ON u.id=pb.prof_id
      WHERE pb.classe_id=$1 AND pb.pool_id=$2
    `,
          [classe_id, pool_id],
        );
        branches = pb.rows;
      }
      return json(cors, {
        classe: classe.rows[0],
        creneaux: creneaux.rows,
        affectations: affectations.rows,
        horaires: horaires.rows,
        branches,
      });
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("planning-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: "Erreur serveur", erreur: msg }, 500);
  } finally {
    await pool.end();
  }
}
