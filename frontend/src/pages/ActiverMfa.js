import React, { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useNavigate } from 'react-router-dom';
import { buildOtpAuthUrl, otpauthQrDataUrl, secretGroupePar4 } from '../utils/qrMfa';
import { clearSessionUser, getSessionUser, setSessionUser } from '../utils/session';


export default function ActiverMfa() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [secret, setSecret] = useState('');
  const [otpAuthUrl, setOtpAuthUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiClient.get('/auth/mfa/status');
        if (!active) return;
        if (res.data?.mfa_enabled === true || res.data?.mfa_exempt === true) {
          const current = getSessionUser() || {};
          setSessionUser({
            ...current,
            mfa_enabled: res.data?.mfa_enabled === true,
            mfa_exempt: res.data?.mfa_exempt === true,
          });
          navigate('/dashboard', { replace: true });
          return;
        }
      } catch {}
      if (active) setChecking(false);
    })();
    return () => { active = false; };
  }, [navigate]);

  const genererSetup = async () => {
    setMsg('');
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/mfa/setup', {});
      const secret = res.data?.secret || '';
      const otpUrl = buildOtpAuthUrl({
        secret,
        accountName: res.data?.account || '',
        issuer: res.data?.issuer || 'Oasis',
      }) || res.data?.otpauth_url || '';
      setSetupToken(res.data?.setup_token || '');
      setSecret(secret);
      setOtpAuthUrl(otpUrl);
      try {
        setQrDataUrl(otpUrl ? await otpauthQrDataUrl(otpUrl) : '');
      } catch {
        setQrDataUrl('');
      }
      setBackupCodes([]);
      setMsg('Scannez le QR code avec Google Authenticator, puis saisissez le code à 6 chiffres.');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Erreur lors de la génération du setup MFA.');
    }
    setLoading(false);
  };

  const activer = async () => {
    setMsg('');
    if (!setupToken || !code) {
      setMsg('Saisissez le code à 6 chiffres affiché dans l’application.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/mfa/enable', { setup_token: setupToken, code });
      const codes = res.data?.backup_codes || [];
      setEnabled(true);
      setBackupCodes(codes);
      setSetupToken('');
      setSecret('');
      setOtpAuthUrl('');
      setQrDataUrl('');
      setCode('');
      const current = getSessionUser() || {};
      setSessionUser({ ...current, mfa_enabled: true });
      setMsg('Double authentification activée. Conservez les codes de secours dans un endroit sûr.');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Code invalide. Réessayez.');
    }
    setLoading(false);
  };

  const continuer = () => {
    navigate('/dashboard', { replace: true });
  };

  const deconnexion = async () => {
    try { await apiClient.post('/auth/logout'); } catch {}
    clearSessionUser();
    navigate('/login', { replace: true });
  };

  if (checking) return null;

  return (
    <div className="login-page" style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <img src="/logo-image-oasis.webp" alt="Oasis" style={styles.logoImage} />
        </div>
        <h1 style={styles.titre}>Double authentification obligatoire</h1>
        <p style={styles.texte}>
          Pour sécuriser votre compte, vous devez activer Google Authenticator avant d’accéder à l’application.
        </p>

        {msg && (
          <div style={{
            ...styles.msg,
            background: enabled ? '#dcfce7' : '#eff6ff',
            color: enabled ? '#166534' : '#1e40af',
          }}>
            {msg}
          </div>
        )}

        {!enabled && !setupToken && (
          <button type="button" style={styles.btn} onClick={genererSetup} disabled={loading}>
            {loading ? 'Génération…' : 'Activer la double authentification'}
          </button>
        )}

        {!enabled && setupToken && (
          <div style={styles.setupBox}>
            <div style={styles.etape}>1) Scanner le QR code</div>
            {qrDataUrl ? (
              <img alt="QR code MFA" src={qrDataUrl} style={styles.qr} />
            ) : otpAuthUrl ? (
              <img
                alt="QR code MFA"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&ecc=M&data=${encodeURIComponent(otpAuthUrl)}`}
                style={styles.qr}
              />
            ) : null}
            <div style={styles.hint}>Si le scan échoue, saisissez cette clé manuellement dans Google ou Microsoft Authenticator :</div>
            <code style={styles.secret}>{secretGroupePar4(secret)}</code>

            <div style={{ ...styles.etape, marginTop: 16 }}>2) Saisir le code à 6 chiffres</div>
            <input
              style={styles.input}
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
            />
            <button type="button" style={styles.btn} onClick={activer} disabled={loading}>
              {loading ? 'Activation…' : 'Valider et activer'}
            </button>
          </div>
        )}

        {enabled && (
          <div style={styles.setupBox}>
            {backupCodes.length > 0 && (
              <>
                <div style={styles.warnTitle}>Codes de secours (affichés une seule fois)</div>
                <p style={styles.hint}>
                  Conservez-les hors ligne. Chaque code ne peut être utilisé qu’une seule fois si vous perdez votre téléphone.
                </p>
                <div style={styles.codesGrid}>
                  {backupCodes.map((c, i) => (
                    <code key={`backup-${i}`} style={styles.codeItem}>{c}</code>
                  ))}
                </div>
              </>
            )}
            <button type="button" style={styles.btn} onClick={continuer}>
              J’ai enregistré mes codes — Continuer
            </button>
          </div>
        )}

        <button type="button" style={styles.btnLogout} onClick={deconnexion}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    boxSizing: 'border-box',
  },
  card: {
    background: 'white',
    borderRadius: 16,
    padding: '28px 22px',
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  logoContainer: { marginBottom: 12 },
  logoImage: { width: 150, height: 'auto', display: 'block' },
  titre: { fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 8px', textAlign: 'center' },
  texte: { fontSize: 13, color: '#64748b', lineHeight: 1.5, textAlign: 'center', margin: '0 0 18px' },
  msg: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 14, textAlign: 'center' },
  setupBox: { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  etape: { fontWeight: 700, color: '#0f172a', fontSize: 14, alignSelf: 'flex-start', marginBottom: 8 },
  qr: { border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', marginBottom: 10 },
  hint: { fontSize: 12, color: '#64748b', textAlign: 'center', margin: '0 0 8px', lineHeight: 1.45 },
  secret: { display: 'inline-block', padding: '6px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 },
  input: {
    padding: '12px 14px',
    border: '2px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    marginBottom: 10,
  },
  btn: {
    padding: 14,
    background: '#0f766e',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
    marginTop: 8,
  },
  btnLogout: {
    marginTop: 16,
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  warnTitle: { fontWeight: 800, color: '#92400e', marginBottom: 8, textAlign: 'center' },
  codesGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', marginBottom: 12 },
  codeItem: { padding: '8px 10px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, textAlign: 'center', fontWeight: 800, fontSize: 13 },
};
