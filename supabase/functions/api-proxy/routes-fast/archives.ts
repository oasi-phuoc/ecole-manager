import { json } from "../auth-fast-shared.ts";
import {
  decodeDocument,
  exportArchiveZipBuffer,
  getArchiveDetail,
  getArchiveFichier,
  getArchiveTable,
  listerArchives,
  sauvegarderArchiveAnnee,
} from "./archive-service.ts";
import { loadUser, requireAdmin, requireAuth } from "./middleware.ts";

export async function handleArchivesRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
  url: URL,
): Promise<Response> {
  const exportMatch = path.match(/^\/archives\/(\d+)\/export$/);
  if (exportMatch && req.method === "GET") {
    const user = await loadUser(req);
    const authErr = requireAuth(user, cors, path);
    if (authErr) return authErr;
    const zip = await exportArchiveZipBuffer(exportMatch[1]);
    if (!zip) return json(cors, { message: "Archive introuvable" }, 404);
    return new Response(zip.buffer, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zip.fileName}"`,
      },
    });
  }

  const tableMatch = path.match(/^\/archives\/(\d+)\/tables\/([^/]+)$/);
  if (tableMatch && req.method === "GET") {
    const user = await loadUser(req);
    const authErr = requireAuth(user, cors, path);
    if (authErr) return authErr;
    const data = await getArchiveTable(tableMatch[1], decodeURIComponent(tableMatch[2]), {
      limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 200,
      offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0,
    });
    if (!data) return json(cors, { message: "Table introuvable dans cette archive" }, 404);
    return json(cors, data);
  }

  const fichierMatch = path.match(/^\/archives\/(\d+)\/fichiers\/(\d+)$/);
  if (fichierMatch && req.method === "GET") {
    const user = await loadUser(req);
    const authErr = requireAuth(user, cors, path);
    if (authErr) return authErr;
    const row = await getArchiveFichier(fichierMatch[1], fichierMatch[2]);
    if (!row) return json(cors, { message: "Fichier introuvable" }, 404);
    const buf = decodeDocument(row.contenu);
    const nom = String(row.nom || "document").replace(/[^\w.-]+/g, "_");
    return new Response(buf, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": row.mime || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${nom}"`,
      },
    });
  }

  const idMatch = path.match(/^\/archives\/(\d+)$/);
  if (idMatch && req.method === "GET") {
    const user = await loadUser(req);
    const authErr = requireAuth(user, cors, path);
    if (authErr) return authErr;
    const data = await getArchiveDetail(idMatch[1]);
    if (!data) return json(cors, { message: "Archive introuvable" }, 404);
    return json(cors, data);
  }

  if (path === "/archives" && req.method === "GET") {
    const user = await loadUser(req);
    const authErr = requireAuth(user, cors, path);
    if (authErr) return authErr;
    return json(cors, await listerArchives());
  }

  if (path === "/archives" && req.method === "POST") {
    const user = await loadUser(req);
    const authErr = requireAuth(user, cors, path);
    if (authErr) return authErr;
    const denied = requireAdmin(user!, cors);
    if (denied) return denied;
    try {
      const result = await sauvegarderArchiveAnnee(user);
      return json(cors, {
        message: "Année transférée dans les archives (lecture seule).",
        archive_id: result.archive_id,
        annee: result.annee,
        nom_ecole: result.nom_ecole,
        synthese: result.synthese,
        n_fichiers: result.n_fichiers,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur serveur";
      return json(cors, { message: "Erreur lors du transfert vers les archives", erreur: msg }, 500);
    }
  }

  return json(cors, { message: "Route non trouvée" }, 404);
}
