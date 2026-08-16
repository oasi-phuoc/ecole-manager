const nodemailer = require('nodemailer');
const pool = require('../config/database');
const { decryptText } = require('../utils/crypto');

const DEFAULT_HOST = 'smtp.office365.com';
const DEFAULT_PORT = 587;
const SMTP_OPERATION_TIMEOUT_MS = 25000;

async function getMailSettingsRow() {
  const result = await pool.query('SELECT * FROM parametres_mail LIMIT 1');
  return result.rows[0] || null;
}

function buildRuntimeMailConfig(row) {
  const host = row?.smtp_host || process.env.EMAIL_HOST || DEFAULT_HOST;
  const port = Number(row?.smtp_port || process.env.EMAIL_PORT || DEFAULT_PORT);
  const secure = row?.smtp_secure === true || String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true';
  const user = row?.smtp_user || process.env.EMAIL_USER || '';
  const appPassword = decryptText(row?.smtp_app_password || '') || process.env.EMAIL_PASS || '';
  const fromEmail = row?.smtp_from_email || process.env.EMAIL_FROM || user;
  const fromName = row?.smtp_from_name || process.env.EMAIL_FROM_NAME || 'Oasis';
  const enabled = row ? row.smtp_active === true : Boolean(user && appPassword);

  return {
    host,
    port,
    secure,
    user,
    appPassword,
    fromEmail,
    fromName,
    enabled,
  };
}

async function getMailRuntimeConfig() {
  const row = await getMailSettingsRow();
  return buildRuntimeMailConfig(row);
}

async function createTransporterOrThrow() {
  const config = await getMailRuntimeConfig();

  if (!config.enabled) {
    throw new Error("Configuration email inactive. Activez l'envoi email dans Parametres.");
  }
  if (!config.user || !config.appPassword) {
    throw new Error("Configuration email incomplete. Verifiez l'utilisateur SMTP et le mot de passe d'application.");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.appPassword,
    },
    requireTLS: !config.secure,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  return { transporter, config };
}

async function sendEmail({ to, subject, html, text }) {
  const { transporter, config } = await createTransporterOrThrow();
  const from = config.fromName
    ? `"${String(config.fromName).replace(/"/g, '\\"')}" <${config.fromEmail}>`
    : config.fromEmail;
  const sendPromise = transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
  });
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Timeout SMTP. Verifiez l'hote/port et les informations d'authentification.")), SMTP_OPERATION_TIMEOUT_MS);
  });

  return Promise.race([sendPromise, timeoutPromise]);
}

module.exports = {
  getMailSettingsRow,
  getMailRuntimeConfig,
  sendEmail,
};
