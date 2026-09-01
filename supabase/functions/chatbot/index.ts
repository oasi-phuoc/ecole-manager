import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/api-proxy/chatbot${new URL(req.url).pathname.replace(/^\/chatbot/, "")}`;
  const res = await fetch(url, {
    method: req.method,
    headers: {
      Authorization: req.headers.get("Authorization") || "",
      apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
      "Content-Type": req.headers.get("Content-Type") || "application/json",
    },
    body: req.method !== "GET" ? await req.text() : undefined,
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
});
