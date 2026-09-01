import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Buffer } from "node:buffer";
import { createRequire } from "node:module";
import { handleAuthLogin } from "./auth-fast-login.ts";
import { handleAuthLoginMfa } from "./auth-fast-mfa.ts";

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
