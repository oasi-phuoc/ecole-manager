import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Buffer } from "node:buffer";
import { createRequire } from "node:module";
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
import { handleAuthChangerMdp, handleAuthLogout, handleAuthMoi } from "./auth-fast-session.ts";
import { handleBranchesRoute } from "./routes-fast/branches.ts";
import { handleClassesRoute } from "./routes-fast/classes.ts";

(globalThis as { Buffer?: typeof Buffer; global?: typeof globalThis }).Buffer = Buffer;
(globalThis as { global?: typeof globalThis }).global = globalThis;

const nodeRequire = createRequire(import.meta.url);
(globalThis as { __esbuildRequire?: (name: string) => unknown }).__esbuildRequire = (name) =>
  nodeRequire(name);

let appHandler: ((req: Request) => Promise<Response>) | null = null;

function bridgeEnv() {
  if (typeof Deno === "undefined") return;
  const proc = (globalThis as { process?: { env?: Record<string, string> } }).process;
  if (!proc?.env) return;
  const keys = ["DATABASE_URL", "JWT_SECRET", "MFA_BACKUP_PEPPER", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NODE_ENV", "DATA_ENCRYPTION_KEY"];
  for (const key of keys) {
    try {
      const v = Deno.env.get(key);
      if (v) proc.env[key] = v;
    } catch {
      /* ignore */
    }
  }
}

async function getHandler() {
  if (!appHandler) {
    bridgeEnv();
    const [{ createApp }, { expressToFetch }] = await Promise.all([
      import("./createApp.cjs"),
      import("./expressToFetch"),
    ]);
    appHandler = expressToFetch(createApp());
  }
  return appHandler;
}

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
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
      return await handleAuthLogout(req, cors);
    }

    if (path === "/auth/changer-mdp" && req.method === "POST") {
      return await handleAuthChangerMdp(req, cors);
    }

    if (path === "/auth/moi" && req.method === "GET") {
      return await handleAuthMoi(req, cors);
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

    const rewritten = new Request(new URL(path + url.search, url.origin), req);
    const handler = await getHandler();
    const res = await handler(rewritten);
    const headers = new Headers(res.headers);
    const origin = req.headers.get("Origin");
    if (origin) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
    } else {
      headers.set("Access-Control-Allow-Origin", "*");
    }
    return new Response(res.body, { status: res.status, headers });
  } catch (err) {
    console.error("api-proxy error:", err);
    return new Response(JSON.stringify({ message: "Erreur serveur" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
