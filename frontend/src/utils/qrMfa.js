import QRCode from 'qrcode';

/** Encode un fragment de label otpauth sans encoder le séparateur « : » ni « @ ». */
function encodeOtpLabelPart(s) {
  return encodeURIComponent(String(s || '')).replace(/%40/g, '@');
}

/**
 * URI otpauth identique au backend (Google / Microsoft Authenticator).
 * Ne jamais encoder le « : » du label issuer:compte (%3A casse le scan).
 */
export function buildOtpAuthUrl({ secret, accountName, issuer = 'Oasis' }) {
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
}

/** QR local (sans API tierce) pour les URI otpauth. */
export async function otpauthQrDataUrl(otpauthUrl) {
  const url = String(otpauthUrl || '').trim();
  if (!url) return '';
  return QRCode.toDataURL(url, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: 'M',
    type: 'image/png',
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}

export function secretGroupePar4(secret) {
  return String(secret || '').replace(/[^A-Za-z2-7]/g, '').replace(/(.{4})/g, '$1 ').trim();
}
