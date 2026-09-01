import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Buffer } from "node:buffer";
import { handleAuthLogin } from "./auth-fast-login.ts";
import { handleAuthLoginMfa } from "./auth-fast-mfa.ts";
import {
  handleMfaBackupRegenerate,
  handleMfaDisable,
  handleMfaEnable,
  handleMfaSetup,
  handleMfaStatus,
} from "./auth-fast-mfa-setup.ts";
import { handleAuthRegister } from "./auth-fast-register.ts";
import {
  handleDeletePasskey,
  handleListPasskeys,
  handlePasskeyLoginOptions,
  handlePasskeyLoginVerify,
  handlePasskeyRegisterOptions,
  handlePasskeyRegisterVerify,
} from "./auth-fast-passkey.ts";
import { handleChangerMdp, handleLogout, handleMoi } from "./auth-fast-session.ts";
import { json } from "./auth-fast-shared.ts";
import { handleArchivesRoute } from "./routes-fast/archives.ts";
import { handleBranchesRoute } from "./routes-fast/branches.ts";
import { handleCalendrierRoute } from "./routes-fast/calendrier.ts";
import { handleChatbotRoute } from "./routes-fast/chatbot.ts";
import { handleClassesRoute } from "./routes-fast/classes.ts";
import { handleComptabiliteRoute } from "./routes-fast/comptabilite.ts";
import { handleDevoirsRoute } from "./routes-fast/devoirs.ts";
import { handleDonneesRoute } from "./routes-fast/donnees.ts";
import { handleDocumentsAdministratifsRoute } from "./routes-fast/documents-administratifs.ts";
import { handleElevesRoute } from "./routes-fast/eleves.ts";
import { handleEmploiDuTempsRoute } from "./routes-fast/emploi-du-temps.ts";
import { handleEmployesAdministratifsRoute } from "./routes-fast/employes-administratifs.ts";
import { handleEnclassementsRoute } from "./routes-fast/enclassements.ts";
import { handleImportRoute } from "./routes-fast/import.ts";
import { handleInventaireBranchesRoute } from "./routes-fast/inventaire-branches.ts";
import { handleNotesRoute } from "./routes-fast/notes.ts";
import { handleNotesPersonnellesRoute } from "./routes-fast/notes-personnelles.ts";
import { handleObservationsRoute } from "./routes-fast/observations.ts";
import { handleParametresRoute } from "./routes-fast/parametres.ts";
import { handlePlanClasseRoute } from "./routes-fast/plan-classe.ts";
import { handlePlanningRoute } from "./routes-fast/planning.ts";
import { handlePresencesRoute } from "./routes-fast/presences.ts";
import { handleProfsRoute } from "./routes-fast/profs.ts";
import { handleSondagesRoute } from "./routes-fast/sondages.ts";
import { handleSortiesRoute } from "./routes-fast/sorties.ts";
import { handleStatistiquesRoute } from "./routes-fast/statistiques.ts";
import { handleTcfStateRoute } from "./routes-fast/tcf-state.ts";
import { handleVisitesClassesRoute } from "./routes-fast/visites-classes.ts";

(globalThis as { Buffer?: typeof Buffer }).Buffer = Buffer;

function normalizePath(pathname: string): string {
  const markers = ["/functions/v1/api-proxy", "/api-proxy"];
  for (const marker of markers) {
    const idx = pathname.indexOf(marker);
    if (idx >= 0) {
      const rest = pathname.slice(idx + marker.length);
      return rest || "/";
    }
  }
  return pathname;
}

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    ...(origin ? { Vary: "Origin" } : {}),
  };
}

Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const url = new URL(req.url);
    const path = normalizePath(url.pathname);

    if (path === "/healthz") {
      return new Response(
        JSON.stringify({ ok: true, service: "ecole-manager-api-proxy" }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    if (path === "/auth/login" && req.method === "POST") {
      return await handleAuthLogin(req, cors);
    }

    if (path === "/auth/login/mfa" && req.method === "POST") {
      return await handleAuthLoginMfa(req, cors);
    }

    if (path === "/auth/register" && req.method === "POST") {
      return await handleAuthRegister(req, cors);
    }

    if (path === "/auth/logout" && req.method === "POST") {
      return await handleLogout(req, cors);
    }

    if (path === "/auth/changer-mdp" && req.method === "POST") {
      return await handleChangerMdp(req, cors);
    }

    if (path === "/auth/moi" && req.method === "GET") {
      return await handleMoi(req, cors);
    }

    if (path === "/auth/mfa/status" && req.method === "GET") {
      return await handleMfaStatus(req, cors);
    }

    if (path === "/auth/mfa/setup" && req.method === "POST") {
      return await handleMfaSetup(req, cors);
    }

    if (path === "/auth/mfa/enable" && req.method === "POST") {
      return await handleMfaEnable(req, cors);
    }

    if (path === "/auth/mfa/backup/regenerate" && req.method === "POST") {
      return await handleMfaBackupRegenerate(req, cors);
    }

    if (path === "/auth/mfa/disable" && req.method === "POST") {
      return await handleMfaDisable(req, cors);
    }

    if (path === "/auth/login/passkey/options" && req.method === "POST") {
      return await handlePasskeyLoginOptions(req, cors);
    }

    if (path === "/auth/login/passkey/verify" && req.method === "POST") {
      return await handlePasskeyLoginVerify(req, cors);
    }

    if (path === "/auth/passkeys" && req.method === "GET") {
      return await handleListPasskeys(req, cors);
    }

    if (path === "/auth/passkeys/register/options" && req.method === "POST") {
      return await handlePasskeyRegisterOptions(req, cors);
    }

    if (path === "/auth/passkeys/register/verify" && req.method === "POST") {
      return await handlePasskeyRegisterVerify(req, cors);
    }

    const passkeyDelete = path.match(/^\/auth\/passkeys\/(\d+)$/);
    if (passkeyDelete && req.method === "DELETE") {
      return await handleDeletePasskey(req, cors, passkeyDelete[1]);
    }

    if (path.startsWith("/classes")) {
      return await handleClassesRoute(req, path, cors);
    }

    if (path.startsWith("/branches")) {
      return await handleBranchesRoute(req, path, cors);
    }

    if (path.startsWith("/profs")) {
      return await handleProfsRoute(req, path, cors);
    }

    if (path.startsWith("/eleves")) {
      return await handleElevesRoute(req, path, cors, url);
    }

    if (path.startsWith("/employes-administratifs")) {
      return await handleEmployesAdministratifsRoute(req, path, cors);
    }

    if (path.startsWith("/emploi-du-temps")) {
      return await handleEmploiDuTempsRoute(req, path, cors, url);
    }

    if (path.startsWith("/presences")) {
      return await handlePresencesRoute(req, path, cors, url);
    }

    if (path.startsWith("/notes-personnelles")) {
      return await handleNotesPersonnellesRoute(req, path, cors);
    }

    if (path.startsWith("/notes")) {
      return await handleNotesRoute(req, path, cors, url);
    }

    if (path.startsWith("/calendrier")) {
      return await handleCalendrierRoute(req, path, cors);
    }

    if (path.startsWith("/archives")) {
      return await handleArchivesRoute(req, path, cors, url);
    }

    if (path.startsWith("/parametres")) {
      return await handleParametresRoute(req, path, cors);
    }

    if (path.startsWith("/comptabilite")) {
      return await handleComptabiliteRoute(req, path, cors, url);
    }

    if (path.startsWith("/statistiques")) {
      return await handleStatistiquesRoute(req, path, cors);
    }

    if (path.startsWith("/import")) {
      return await handleImportRoute(req, path, cors);
    }

    if (path.startsWith("/plan-classe")) {
      return await handlePlanClasseRoute(req, path, cors);
    }

    if (path.startsWith("/observations")) {
      return await handleObservationsRoute(req, path, cors);
    }

    if (path.startsWith("/planning")) {
      return await handlePlanningRoute(req, path, cors, url);
    }

    if (path.startsWith("/documents-administratifs")) {
      return await handleDocumentsAdministratifsRoute(req, path, cors);
    }

    if (path.startsWith("/inventaire-branches")) {
      return await handleInventaireBranchesRoute(req, path, cors);
    }

    if (path.startsWith("/tcf-state")) {
      return await handleTcfStateRoute(req, path, cors);
    }

    if (path === "/chatbot" && req.method === "POST") {
      return await handleChatbotRoute(req, path, cors);
    }

    if (path.startsWith("/donnees")) {
      return await handleDonneesRoute(req, path, cors);
    }

    if (path.startsWith("/enclassements")) {
      return await handleEnclassementsRoute(req, path, cors);
    }

    if (path.startsWith("/devoirs")) {
      return await handleDevoirsRoute(req, path, cors, url);
    }

    if (path.startsWith("/sorties")) {
      return await handleSortiesRoute(req, path, cors, url);
    }

    if (path.startsWith("/visites-classes")) {
      return await handleVisitesClassesRoute(req, path, cors);
    }

    if (path.startsWith("/sondages")) {
      return await handleSondagesRoute(req, path, cors);
    }

    return json(cors, { message: "Route non trouvée" }, 404);
  } catch (err) {
    console.error("api-proxy error:", err);
    return json(cors, { message: "Erreur serveur" }, 500);
  }
});
