import "jsr:@supabase/functions-js/edge-runtime.d.ts";

async function forward(req: Request, prefix: string): Promise<Response> {
  const url = new URL(req.url);
  const subPath = url.pathname.replace(new RegExp(`^/${prefix}`), "") || "";
  const target = `${Deno.env.get("SUPABASE_URL")}/functions/v1/api-proxy/${prefix}${subPath}${url.search}`;

  const headers = new Headers();
  const auth = req.headers.get("Authorization");
  if (auth) headers.set("Authorization", auth);
  headers.set("apikey", Deno.env.get("SUPABASE_ANON_KEY") || "");
  const ct = req.headers.get("Content-Type");
  if (ct) headers.set("Content-Type", ct);

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? await req.arrayBuffer() : undefined,
  });

  return new Response(await res.arrayBuffer(), {
    status: res.status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Content-Type": res.headers.get("Content-Type") || "application/json",
    },
  });
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      },
    });
  }
  return forward(req, "planning");
});
