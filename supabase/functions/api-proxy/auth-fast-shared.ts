import { Pool } from "npm:pg@8";
import { createDecipheriv, createHash, createHmac } from "node:crypto";

const ENC_PREFIX = "enc:v1";
const TOTP_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function json(cors: Record<string, string>, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export function createPool() {
  return new Pool({
    connectionString: Deno.env.get("DATABASE_URL") || Deno.env.get("SUPABASE_DB_URL"),
    ssl: { rejectUnauthorized: false },
  });
}

function getEncryptionKey(): Uint8Array | null {
  const raw = String(Deno.env.get("DATA_ENCRYPTION_KEY") || "").trim();
  if (!raw) return null;
  try {
    if (/^[a-fA-F0-9]{64}$/.test(raw)) return Uint8Array.from(Buffer.from(raw, "hex"));
    const b64 = Buffer.from(raw, "base64");
    if (b64.length === 32) return Uint8Array.from(b64);
  } catch {
    /* ignore */
  }
  return null;
}

export function decryptText(cipherText: string): string {
  const value = String(cipherText || "");
  if (!value.startsWith(`${ENC_PREFIX}:`)) return value;
  const key = getEncryptionKey();
  if (!key) return "";
  try {
    const parts = value.split(":");
    const ivB64 = parts[2];
    const tagB64 = parts[3];
    const payloadB64 = parts[4];
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const payload = Buffer.from(payloadB64, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(payload), decipher.final()]);
    return plain.toString("utf8");
  } catch {
    return "";
  }
}

function base32Decode(input: string): Buffer {
  const clean = String(input || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = TOTP_ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secretBase32: string, counter: number): string {
  const key = base32Decode(secretBase32);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
  return String(codeInt).padStart(6, "0");
}

function totp(secretBase32: string, timestampMs = Date.now(), stepSec = 30): string {
  const counter = Math.floor(timestampMs / 1000 / stepSec);
  return hotp(secretBase32, counter);
}

export function verifyTotp(secretBase32: string, code: string, window = 1): boolean {
  const normalized = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const now = Date.now();
  for (let w = -window; w <= window; w++) {
    if (totp(secretBase32, now + w * 30000) === normalized) return true;
  }
  return false;
}

export function hashBackupCode(code: string): string {
  const pepper = String(Deno.env.get("MFA_BACKUP_PEPPER") || Deno.env.get("JWT_SECRET") || "");
  return createHash("sha256").update(String(code || "").toUpperCase() + "::" + pepper).digest("hex");
}

export function parseBackupHashes(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map((v) => String(v || "")).filter(Boolean) : [];
}
