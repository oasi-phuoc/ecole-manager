const crypto = require('crypto');

const PREFIX = 'enc:v1';

const getKey = () => {
  const raw = String(process.env.DATA_ENCRYPTION_KEY || '').trim();
  if (!raw) return null;
  try {
    if (/^[a-fA-F0-9]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
    const b64 = Buffer.from(raw, 'base64');
    if (b64.length === 32) return b64;
  } catch {}
  return null;
};

const encryptText = (plainText) => {
  const key = getKey();
  if (!key) return String(plainText || '');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText || ''), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
};

const decryptText = (cipherText) => {
  const value = String(cipherText || '');
  if (!value.startsWith(PREFIX + ':')) return value;
  const key = getKey();
  if (!key) return '';
  try {
    const [, , ivB64, tagB64, payloadB64] = value.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const payload = Buffer.from(payloadB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(payload), decipher.final()]);
    return plain.toString('utf8');
  } catch {
    return '';
  }
};

module.exports = { encryptText, decryptText };
