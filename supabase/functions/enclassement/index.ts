import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      },
    });
  }

  const url = new URL(req.url);
  const sub = url.pathname.replace(/^\/enclassement/, "") || "";
  const target = `${Deno.env.get("SUPABASE_URL")}/functions/v1/api-proxy/enclassements${sub}${url.search}`;
  const res = await fetch(target, {
    method: req.method,
    headers: {
      Authorization: req.headers.get("Authorization") || "",
      apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
      "Content-Type": req.headers.get("Content-Type") || "application/json",
    },
    body: req.method !== "GET" && req.method !== "HEAD" ? await req.arrayBuffer() : undefined,
  });
  return new Response(await res.arrayBuffer(), {
    status: res.status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": res.headers.get("Content-Type") || "application/json",
    },
  });
});
