import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createRequire } from "node:module";
import { toNodeHandler } from "npm:@whatwg-node/server@0.9.65";

const require = createRequire(import.meta.url);
const { createApp } = require("./createApp.cjs");

const app = createApp();
const handler = toNodeHandler(app);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  let path = url.pathname;
  if (path.startsWith("/api-proxy")) path = path.slice("/api-proxy".length) || "/";
  const rewritten = new Request(new URL(path + url.search, url.origin), req);

  const res = await handler(rewritten);
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(res.body, { status: res.status, headers });
});
