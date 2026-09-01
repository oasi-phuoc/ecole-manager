import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const base = Deno.env.get("SUPABASE_URL")!;
  const url = `${base}/functions/v1/api-proxy/auth/login/mfa`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: req.headers.get("Authorization") || "",
      apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
      "Content-Type": "application/json",
    },
    body: await req.text(),
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
