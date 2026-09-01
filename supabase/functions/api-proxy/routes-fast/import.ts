import * as XLSX from "npm:xlsx";
import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, requireAuth } from "./middleware.ts";

function extractClasseCode(progNom: unknown): string | null {
  if (!progNom) return null;
  const parts = String(progNom).split("/");
  if (parts.length >= 2) return parts[1].trim();
  return null;
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  try {
    const d = new Date(String(val));
    return isNaN(d.getTime()) ? null : d.toISOString().substring(0, 10);
  } catch {
    return null;
  }
}

function parseInt2(val: unknown): number | null {
  if (!val) return null;
  const n = parseInt(String(val));
  return isNaN(n) ? null : n;
}

async function readXlsxRows(req: Request): Promise<unknown[][] | null> {
  const formData = await req.formData();
  const file = formData.get("fichier");
  if (!file || !(file instanceof File)) return null;
  const buffer = new Uint8Array(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as unknown[][];
}

export async function handleImportRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    if (path === "/import/eleves" && req.method === "POST") {
      const rows = await readXlsxRows(req);
      if (!rows) return json(cors, { message: "Fichier manquant" }, 400);
      const dataRows = rows.slice(1).filter((r) => (r as unknown[])[3]);

      const seen = new Set<number>();
      const unique: unknown[][] = [];
      for (const row of dataRows) {
        const r = row as unknown[];
        const ref = parseInt(String(r[3]));
        if (ref && !seen.has(ref)) {
          seen.add(ref);
          unique.push(r);
        }
      }

      const paramsRes = await pool.query("SELECT date_debut_annee FROM parametres_ecole LIMIT 1");
      const dateDebutAnnee = paramsRes.rows[0]?.date_debut_annee
        ? new Date(paramsRes.rows[0].date_debut_annee).toISOString().substring(0, 10)
        : null;

      const classesRes = await pool.query("SELECT id, nom FROM classes");
      const classesMap: Record<string, number> = {};
      for (const cl of classesRes.rows) {
        classesMap[String(cl.nom).trim().toLowerCase()] = cl.id;
      }

      let created = 0;
      let skipped = 0;

      for (const row of unique) {
        const ref = parseInt(String(row[3]));

        const exists = await pool.query("SELECT id FROM eleves WHERE oasi_ref=$1", [ref]);
        if (exists.rows.length > 0) {
          skipped++;
          continue;
        }

        const nomComplet = String(row[5] || "").trim();
        const parts = nomComplet.split(" ");
        const nom = parts.filter((p) => p.length > 0 && p === p.toUpperCase()).join(" ");
        const prenom = parts.filter((p) => p.length > 0 && p !== p.toUpperCase()).join(" ");

        const classeCode = extractClasseCode(row[0]);
        const classeId = classeCode ? (classesMap[classeCode.toLowerCase()] || null) : null;

        await pool.query(
          `
        INSERT INTO eleves (
          nom, prenom, date_naissance, nationalite, statut, nom_parent,
          categorie, classe_id, date_debut_cours,
          oasi_prog_nom, oasi_prog_encadrant, oasi_n, oasi_ref, oasi_pos,
          oasi_nom, oasi_nais,
          oasi_nationalite,
          oasi_presence_date, oasi_jour_semaine, oasi_presence_periode, oasi_presence_type,
          oasi_remarque, oasi_controle_du, oasi_controle_au,
          oasi_prog_presences, oasi_prog_admin, oasi_as,
          oasi_prg_id, oasi_prg_occupation_id, oasi_ra_id, oasi_temps_reparti_id
        ) VALUES (
          $1,$2,$3,$4,'actif',$5,
          'OASI',$6,$7,
          $8,$9,$10,$11,$12,
          $13,$14,
          $15,
          $16,$17,$18,$19,
          $20,$21,$22,
          $23,$24,$25,
          $26,$27,$28,$29
        )
      `,
          [
            nom,
            prenom,
            parseDate(row[6]),
            row[7] || null,
            row[17] || null,
            classeId,
            dateDebutAnnee,
            row[0] || null,
            row[1] || null,
            parseInt2(row[2]),
            ref,
            parseInt2(row[4]),
            nomComplet,
            parseDate(row[6]),
            row[7] || null,
            parseDate(row[8]),
            row[9] || null,
            row[10] || null,
            row[11] || null,
            row[12] || null,
            parseDate(row[13]),
            parseDate(row[14]),
            row[15] || null,
            row[16] || null,
            row[17] || null,
            parseInt2(row[18]),
            parseInt2(row[19]),
            parseInt2(row[20]),
            parseInt2(row[21]),
          ],
        );
        created++;
      }

      return json(cors, {
        message: `Import terminé : ${created} créé(s), ${skipped} déjà existant(s)`,
        created,
        skipped,
      });
    }

    if (path === "/import/update-lora" && req.method === "POST") {
      const rows = await readXlsxRows(req);
      if (!rows) return json(cors, { message: "Fichier manquant" }, 400);
      const dataRows = rows.slice(1).filter((r) => (r as unknown[])[3]);

      const seen = new Set<number>();
      const unique: unknown[][] = [];
      for (const row of dataRows) {
        const r = row as unknown[];
        const ref = parseInt(String(r[3]));
        if (ref && !seen.has(ref)) {
          seen.add(ref);
          unique.push(r);
        }
      }

      const classesRes = await pool.query("SELECT id, nom FROM classes");
      const classesMap: Record<string, number> = {};
      for (const cl of classesRes.rows) {
        classesMap[String(cl.nom).trim().toLowerCase()] = cl.id;
      }

      let updated = 0;
      let notFound = 0;
      let classMatched = 0;
      const unmatchedCodes = new Set<string>();

      for (const row of unique) {
        const ref = parseInt(String(row[3]));
        const exists = await pool.query("SELECT id FROM eleves WHERE oasi_ref=$1", [ref]);
        if (exists.rows.length === 0) {
          notFound++;
          continue;
        }

        const classeCode = extractClasseCode(row[0]);
        const classeId = classeCode ? (classesMap[classeCode.toLowerCase()] || null) : null;
        if (classeId) classMatched++;
        else if (classeCode) unmatchedCodes.add(classeCode);

        await pool.query(
          `
        UPDATE eleves SET
          oasi_prog_nom=$1, oasi_prog_encadrant=$2, oasi_n=$3, oasi_pos=$4,
          oasi_prog_presences=$5, oasi_prog_admin=$6, oasi_as=$7,
          oasi_prg_id=$8, oasi_prg_occupation_id=$9, oasi_ra_id=$10, oasi_temps_reparti_id=$11,
          classe_id=$13
        WHERE oasi_ref=$12
      `,
          [
            row[0] || null,
            row[1] || null,
            parseInt2(row[2]),
            parseInt2(row[4]),
            row[15] || null,
            row[16] || null,
            row[17] || null,
            parseInt2(row[18]),
            parseInt2(row[19]),
            parseInt2(row[20]),
            parseInt2(row[21]),
            ref,
            classeId,
          ],
        );
        updated++;
      }

      const unmatchedList = [...unmatchedCodes].join(", ");
      const msg =
        `Mise à jour terminée : ${updated} mis à jour, ${classMatched} avec classe assignée` +
        (unmatchedList ? ` — codes non trouvés : ${unmatchedList}` : "") +
        (notFound ? `, ${notFound} élève(s) introuvable(s)` : "");

      return json(cors, {
        message: msg,
        updated,
        notFound,
        classMatched,
        unmatchedCodes: [...unmatchedCodes],
      });
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("import-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: "Erreur import: " + msg }, 500);
  } finally {
    await pool.end();
  }
}
