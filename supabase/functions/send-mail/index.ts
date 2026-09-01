import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer@6";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ message: "Method not allowed" }, 405);

  const hasSmtp = Boolean(Deno.env.get("SMTP_HOST"));
  if (!hasSmtp) {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/api-proxy/parametres/mail-test`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: req.headers.get("Authorization") || "",
        apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
        "Content-Type": "application/json",
      },
      body: await req.text(),
    });
    return new Response(await res.text(), {
      status: res.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { to, subject, html, text } = await req.json();
  const transport = nodemailer.createTransport({
    host: Deno.env.get("SMTP_HOST"),
    port: Number(Deno.env.get("SMTP_PORT") || 587),
    secure: Deno.env.get("SMTP_SECURE") === "true",
    auth: {
      user: Deno.env.get("SMTP_USER"),
      pass: Deno.env.get("SMTP_PASS"),
    },
  });

  await transport.sendMail({
    from: Deno.env.get("SMTP_FROM") || Deno.env.get("SMTP_USER"),
    to,
    subject,
    html,
    text,
  });

  return json({ message: "Email envoye" });
});
