import "jsr:@supabase/functions-js/edge-runtime.d.ts";

let appHandler: ((req: Request) => Promise<Response>) | null = null;

async function getHandler() {
  if (!appHandler) {
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
  const path = normalizePath(url.pathname);

  if (path === "/healthz") {
    return new Response(
      JSON.stringify({ ok: true, service: "ecole-manager-api-proxy" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const rewritten = new Request(new URL(path + url.search, url.origin), req);
  const handler = await getHandler();
  const res = await handler(rewritten);
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(res.body, { status: res.status, headers });
});
