const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateSecret, generateOtpAuthUrl, verifyTotp, totp, base32Encode, base32Decode } = require('./totp');

test('round-trip Base32 20 octets', () => {
  const secret = generateSecret(20);
  assert.match(secret, /^[A-Z2-7]+$/);
  assert.equal(secret.includes('='), false);
  const decoded = base32Decode(secret);
  assert.equal(decoded.length, 20);
  assert.equal(base32Encode(decoded), secret);
});

test('otpauth : le deux-points du label n’est pas encodé', () => {
  const url = generateOtpAuthUrl({
    secret: 'JBSWY3DPEHPK3PXP',
    accountName: 'marie@oasis.ch',
    issuer: 'Oasis',
  });
  assert.equal(url.startsWith('otpauth://totp/Oasis:marie@oasis.ch?'), true);
  assert.equal(url.includes('secret=JBSWY3DPEHPK3PXP'), true);
  assert.equal(url.includes('issuer=Oasis'), true);
  assert.equal(url.includes('%3A'), false);
  assert.equal(url.includes(encodeURIComponent('Oasis:marie@oasis.ch')), false);
});

test('Base32 RFC 4648 sans padding (foobar)', () => {
  assert.equal(base32Encode(Buffer.from('foobar')), 'MZXW6YTBOI');
  assert.equal(base32Decode('MZXW6YTBOI').toString(), 'foobar');
});

test('vérifie le code courant et une fenêtre de ±2', () => {
  const secret = generateSecret(20);
  const now = Date.now();
  assert.equal(verifyTotp(secret, totp(secret, now), 2), true);
  assert.equal(verifyTotp(secret, totp(secret, now - 60000), 2), true);
  assert.equal(verifyTotp(secret, '000000', 2), false);
});
