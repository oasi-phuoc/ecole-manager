import nodemailer from "npm:nodemailer@6";
import { createPool, decryptText } from "../auth-fast-shared.ts";

const DEFAULT_HOST = "smtp.office365.com";
const DEFAULT_PORT = 587;
const SMTP_OPERATION_TIMEOUT_MS = 25000;

async function getMailSettingsRow() {
  const pool = createPool();
  try {
    const result = await pool.query("SELECT * FROM parametres_mail LIMIT 1");
    return result.rows[0] || null;
  } finally {
    await pool.end();
  }
}

function buildRuntimeMailConfig(row: Record<string, unknown> | null) {
  const host = (row?.smtp_host as string) || Deno.env.get("EMAIL_HOST") || DEFAULT_HOST;
  const port = Number(row?.smtp_port || Deno.env.get("EMAIL_PORT") || DEFAULT_PORT);
  const secure =
    row?.smtp_secure === true ||
    String(Deno.env.get("EMAIL_SECURE") || "").toLowerCase() === "true";
  const user = (row?.smtp_user as string) || Deno.env.get("EMAIL_USER") || "";
  const appPassword =
    decryptText(String(row?.smtp_app_password || "")) || Deno.env.get("EMAIL_PASS") || "";
  const fromEmail = (row?.smtp_from_email as string) || Deno.env.get("EMAIL_FROM") || user;
  const fromName = (row?.smtp_from_name as string) || Deno.env.get("EMAIL_FROM_NAME") || "Oasis";
  const enabled = row ? row.smtp_active === true : Boolean(user && appPassword);

  return { host, port, secure, user, appPassword, fromEmail, fromName, enabled };
}

async function createTransporterOrThrow() {
  const row = await getMailSettingsRow();
  const config = buildRuntimeMailConfig(row);

  if (!config.enabled) {
    throw new Error("Configuration email inactive. Activez l'envoi email dans Parametres.");
  }
  if (!config.user || !config.appPassword) {
    throw new Error(
      "Configuration email incomplete. Verifiez l'utilisateur SMTP et le mot de passe d'application.",
    );
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.appPassword },
    requireTLS: !config.secure,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  return { transporter, config };
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<unknown> {
  const { transporter, config } = await createTransporterOrThrow();
  const from = config.fromName
    ? `"${String(config.fromName).replace(/"/g, '\\"')}" <${config.fromEmail}>`
    : config.fromEmail;
  const sendPromise = transporter.sendMail({ from, to, subject, html, text });
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            "Timeout SMTP. Verifiez l'hote/port et les informations d'authentification.",
          ),
        ),
      SMTP_OPERATION_TIMEOUT_MS,
    );
  });
  return Promise.race([sendPromise, timeoutPromise]);
}
