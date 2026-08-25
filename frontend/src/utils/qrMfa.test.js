import { buildOtpAuthUrl, secretGroupePar4 } from './qrMfa';

describe('buildOtpAuthUrl', () => {
  it('garde le deux-points du label et n’encode pas @', () => {
    const url = buildOtpAuthUrl({
      secret: 'JBSWY3DPEHPK3PXP',
      accountName: 'marie@oasis.ch',
      issuer: 'Oasis',
    });
    expect(url.startsWith('otpauth://totp/Oasis:marie@oasis.ch?')).toBe(true);
    expect(url).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(url).not.toContain('%3A');
  });
});

describe('secretGroupePar4', () => {
  it('groupe la clé par 4 pour la saisie manuelle', () => {
    expect(secretGroupePar4('JBSWY3DPEHPK3PXP')).toBe('JBSW Y3DP EHPK 3PXP');
  });
});
