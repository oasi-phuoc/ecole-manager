/**
 * Client WebAuthn sans dépendance au bundling ESM de @simplewebauthn/browser
 * (évite les "x is not a function" avec Create React App / webpack).
 */

function b64urlToBuffer(value) {
  const s = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob(s + pad);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

function bufferToB64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.length; i += 1) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function passkeySupported() {
  return typeof window !== 'undefined'
    && typeof window.PublicKeyCredential === 'function'
    && !!navigator.credentials
    && typeof navigator.credentials.get === 'function'
    && typeof navigator.credentials.create === 'function';
}

function normalizeOptionsJSON(input) {
  if (!input) return null;
  if (typeof input === 'string') {
    try { return JSON.parse(input); } catch { return null; }
  }
  if (input.optionsJSON) return input.optionsJSON;
  return input;
}

/**
 * @param {{ optionsJSON?: object } | object} arg
 * @returns {Promise<object>}
 */
export async function startAuthentication(arg) {
  if (!passkeySupported()) throw new Error('WebAuthn non supporté sur ce navigateur');
  const optionsJSON = normalizeOptionsJSON(arg);
  if (!optionsJSON?.challenge) throw new Error('Options passkey invalides (challenge manquant)');

  const allowCredentials = Array.isArray(optionsJSON.allowCredentials)
    && optionsJSON.allowCredentials.length > 0
    ? optionsJSON.allowCredentials.map((c) => ({
      type: c.type || 'public-key',
      id: b64urlToBuffer(c.id),
      transports: c.transports,
    }))
    : undefined;

  const publicKey = {
    ...optionsJSON,
    challenge: b64urlToBuffer(optionsJSON.challenge),
    allowCredentials,
  };

  let credential;
  try {
    credential = await navigator.credentials.get({ publicKey });
  } catch (err) {
    if (err?.name === 'NotAllowedError') throw err;
    throw new Error(err?.message || 'Échec de l’authentification passkey');
  }
  if (!credential) throw new Error('Authentification passkey non terminée');

  const { id, rawId, response, type } = credential;
  return {
    id,
    rawId: bufferToB64url(rawId),
    type,
    response: {
      authenticatorData: bufferToB64url(response.authenticatorData),
      clientDataJSON: bufferToB64url(response.clientDataJSON),
      signature: bufferToB64url(response.signature),
      userHandle: response.userHandle ? bufferToB64url(response.userHandle) : undefined,
    },
    clientExtensionResults: typeof credential.getClientExtensionResults === 'function'
      ? credential.getClientExtensionResults()
      : {},
    authenticatorAttachment: credential.authenticatorAttachment || undefined,
  };
}

/**
 * @param {{ optionsJSON?: object } | object} arg
 * @returns {Promise<object>}
 */
export async function startRegistration(arg) {
  if (!passkeySupported()) throw new Error('WebAuthn non supporté sur ce navigateur');
  const optionsJSON = normalizeOptionsJSON(arg);
  if (!optionsJSON?.challenge || !optionsJSON?.user?.id) {
    throw new Error('Options passkey invalides (enregistrement)');
  }

  const excludeCredentials = Array.isArray(optionsJSON.excludeCredentials)
    ? optionsJSON.excludeCredentials.map((c) => ({
      type: c.type || 'public-key',
      id: b64urlToBuffer(c.id),
      transports: c.transports,
    }))
    : undefined;

  const publicKey = {
    ...optionsJSON,
    challenge: b64urlToBuffer(optionsJSON.challenge),
    user: {
      ...optionsJSON.user,
      id: typeof optionsJSON.user.id === 'string'
        ? b64urlToBuffer(optionsJSON.user.id)
        : optionsJSON.user.id,
    },
    excludeCredentials,
  };

  let credential;
  try {
    credential = await navigator.credentials.create({ publicKey });
  } catch (err) {
    if (err?.name === 'NotAllowedError') throw err;
    throw new Error(err?.message || 'Échec de l’enregistrement passkey');
  }
  if (!credential) throw new Error('Enregistrement passkey non terminé');

  const { id, rawId, response, type } = credential;
  return {
    id,
    rawId: bufferToB64url(rawId),
    type,
    response: {
      clientDataJSON: bufferToB64url(response.clientDataJSON),
      attestationObject: bufferToB64url(response.attestationObject),
      transports: typeof response.getTransports === 'function' ? response.getTransports() : undefined,
    },
    clientExtensionResults: typeof credential.getClientExtensionResults === 'function'
      ? credential.getClientExtensionResults()
      : {},
    authenticatorAttachment: credential.authenticatorAttachment || undefined,
  };
}
