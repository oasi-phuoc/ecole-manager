const { isoBase64URL, isoUint8Array } = require('@simplewebauthn/server/helpers');

/** Config RP WebAuthn (domaine de la page frontend, pas de l’API). */
const getWebAuthnConfig = (req) => {
  const headerOrigin = String(req?.get?.('origin') || '').trim();
  const origin = String(
    process.env.WEBAUTHN_ORIGIN
    || headerOrigin
    || process.env.FRONTEND_URL
    || 'http://localhost:3000'
  ).trim().replace(/\/$/, '');
  let rpID = String(process.env.WEBAUTHN_RP_ID || '').trim();
  if (!rpID) {
    try {
      rpID = new URL(origin).hostname;
    } catch {
      rpID = 'localhost';
    }
  }
  const rpName = String(process.env.WEBAUTHN_RP_NAME || 'Oasis').trim() || 'Oasis';
  const originsEnv = String(process.env.WEBAUTHN_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const expectedOrigins = Array.from(new Set([origin, ...originsEnv].filter(Boolean)));
  return { rpID, rpName, origin, expectedOrigins };
};

const toBase64Url = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') {
    // déjà base64url ?
    if (/^[A-Za-z0-9_-]+$/.test(value)) return value;
    return isoBase64URL.fromBuffer(Buffer.from(value, 'base64'));
  }
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return isoBase64URL.fromBuffer(value);
  }
  return isoBase64URL.fromBuffer(Buffer.from(value));
};

const fromBase64Url = (value) => isoBase64URL.toBuffer(String(value || ''));

const userIdBytes = (userId) => isoUint8Array.fromUTF8String(String(userId));

module.exports = {
  getWebAuthnConfig,
  toBase64Url,
  fromBase64Url,
  userIdBytes,
  isoBase64URL,
  isoUint8Array,
};
