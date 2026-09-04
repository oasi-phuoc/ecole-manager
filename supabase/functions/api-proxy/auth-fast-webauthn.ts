import { isoBase64URL } from "npm:@simplewebauthn/server@13/helpers";

export function parseTransports(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function getWebAuthnConfig(req: Request) {
  const headerOrigin = String(req.headers.get("origin") || "").trim();
  const origin = String(
    Deno.env.get("WEBAUTHN_ORIGIN") ||
      headerOrigin ||
      Deno.env.get("FRONTEND_URL") ||
      "http://localhost:3000",
  )
    .trim()
    .replace(/\/$/, "");

  let rpID = String(Deno.env.get("WEBAUTHN_RP_ID") || "").trim();
  if (!rpID) {
    try {
      rpID = new URL(origin).hostname;
    } catch {
      rpID = "localhost";
    }
  }

  const rpName = String(Deno.env.get("WEBAUTHN_RP_NAME") || "Oasis").trim() || "Oasis";
  const originsEnv = String(Deno.env.get("WEBAUTHN_ORIGINS") || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const expectedOrigins = Array.from(new Set([origin, ...originsEnv].filter(Boolean)));

  return { rpID, rpName, origin, expectedOrigins };
}

export function toBase64Url(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") {
    if (/^[A-Za-z0-9_-]+$/.test(value)) return value;
    return isoBase64URL.fromBuffer(Buffer.from(value, "base64"));
  }
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return isoBase64URL.fromBuffer(value);
  }
  return isoBase64URL.fromBuffer(Buffer.from(value as ArrayLike<number>));
}

export function fromBase64Url(value: unknown): Uint8Array {
  if (value == null) return new Uint8Array();
  if (value instanceof Uint8Array) return value;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return Uint8Array.from(value);
  }
  // pg peut renvoyer BYTEA en hex `\x...`
  if (typeof value === "string" && value.startsWith("\\x")) {
    return Uint8Array.from(Buffer.from(value.slice(2), "hex"));
  }
  return isoBase64URL.toBuffer(String(value || ""));
}
