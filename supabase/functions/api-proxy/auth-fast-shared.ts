import { Pool } from "npm:pg@8";
import jwt from "npm:jsonwebtoken@9";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
} from "node:crypto";

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

export function signJwt(payload: Record<string, unknown>, expiresIn = "8h"): string {
  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) throw new Error("JWT_SECRET manquant");
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyJwtFromRequest(req: Request): { id: number } | null {
  const auth = req.headers.get("authorization") || "";
  const raw = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!raw || raw === "null" || raw === "undefined") return null;
  try {
    const secret = Deno.env.get("JWT_SECRET");
    if (!secret) return null;
    const decoded = jwt.verify(raw, secret) as { id?: number };
    if (!decoded?.id) return null;
    return { id: Number(decoded.id) };
  } catch {
    return null;
  }
}

export function encryptText(plainText: string): string {
  const key = getEncryptionKey();
  if (!key) return String(plainText || "");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText || ""), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

const OTP_ALPHABET = TOTP_ALPHABET;

function base32Encode(buffer: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += OTP_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += OTP_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function generateSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes)).replace(/=+$/g, "");
}

export function generateOtpAuthUrl({
  secret,
  accountName,
  issuer,
}: {
  secret: string;
  accountName: string;
  issuer: string;
}): string {
  const iss = String(issuer || "Oasis").trim() || "Oasis";
  const acc = String(accountName || "user").trim() || "user";
  const sec = String(secret || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  const encodePart = (s: string) => encodeURIComponent(s).replace(/%40/g, "@");
  const label = `${encodePart(iss)}:${encodePart(acc)}`;
  const q = [
    `secret=${sec}`,
    `issuer=${encodeURIComponent(iss)}`,
    "algorithm=SHA1",
    "digits=6",
    "period=30",
  ].join("&");
  return `otpauth://totp/${label}?${q}`;
}

const BACKUP_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateBackupCodes(count = 10): { plain: string[]; hashes: string[] } {
  const plain: string[] = [];
  for (let i = 0; i < count; i++) {
    let code = "";
    for (let j = 0; j < 8; j++) code += BACKUP_CHARS[randomInt(0, BACKUP_CHARS.length)];
    plain.push(code);
  }
  const hashes = plain.map((c) => hashBackupCode(c));
  return { plain, hashes };
}

export function publicUser(user: {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  doit_changer_mdp?: boolean;
  mfa_enabled?: boolean;
  mfa_exempt?: boolean;
}) {
  return {
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    role: user.role,
    doit_changer_mdp: user.doit_changer_mdp || false,
    mfa_enabled: user.mfa_enabled === true,
    mfa_exempt: user.mfa_exempt === true,
  };
}
