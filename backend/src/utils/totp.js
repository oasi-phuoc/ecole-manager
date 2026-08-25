const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const base32Encode = (buffer) => {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
  return output;
};

const base32Decode = (input) => {
  const clean = String(input || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
};

/** Secret TOTP 20 octets, Base32 sans padding (Google / Microsoft Authenticator). */
const generateSecret = (bytes = 20) => base32Encode(crypto.randomBytes(bytes)).replace(/=+$/g, '');

/** Encode un fragment de label otpauth (RFC 3986) sans toucher au « : » séparateur ni à « @ ». */
const encodeOtpLabelPart = (s) => encodeURIComponent(String(s || '')).replace(/%40/g, '@');

/**
 * URI otpauth Key URI (Google / Microsoft Authenticator).
 * Le « : » du label issuer:compte n’est JAMAIS encodé (%3A cassait le scan).
 */
const generateOtpAuthUrl = ({ secret, accountName, issuer }) => {
  const iss = String(issuer || 'Oasis').trim() || 'Oasis';
  const acc = String(accountName || 'user').trim() || 'user';
  const sec = String(secret || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  const label = `${encodeOtpLabelPart(iss)}:${encodeOtpLabelPart(acc)}`;
  const q = [
    `secret=${sec}`,
    `issuer=${encodeURIComponent(iss)}`,
    'algorithm=SHA1',
    'digits=6',
    'period=30',
  ].join('&');
  return `otpauth://totp/${label}?${q}`;
};

const hotp = (secretBase32, counter) => {
  const key = base32Decode(secretBase32);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
  return String(codeInt).padStart(6, '0');
};

const totp = (secretBase32, timestampMs = Date.now(), stepSec = 30) => {
  const counter = Math.floor(timestampMs / 1000 / stepSec);
  return hotp(secretBase32, counter);
};

const verifyTotp = (secretBase32, code, window = 2) => {
  const normalized = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  const now = Date.now();
  for (let w = -window; w <= window; w += 1) {
    const c = totp(secretBase32, now + w * 30000);
    if (c === normalized) return true;
  }
  return false;
};

module.exports = { generateSecret, generateOtpAuthUrl, verifyTotp, totp, base32Encode, base32Decode };
