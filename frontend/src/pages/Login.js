import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessionUser, setSessionUser } from '../utils/session';
import { redirectAfterAuth } from '../utils/mfa';
import apiClient, { setLegacyToken } from '../lib/apiClient';
import { clearApiCache } from '../lib/apiCache';
import { supabaseConfigured } from '../lib/supabase';
import { LoadingButton } from '../components/LoadingUI';
import { passkeySupported, startAuthentication } from '../lib/webauthnClient';

/** Masqué temporairement sur la page login (réactiver en passant à true). */
const SHOW_PASSKEY_LOGIN = false;

const CRITERES = [
  { id: 'len',     label: '12 caractères minimum',        test: (p) => p.length >= 12 },
  { id: 'maj',     label: '1 lettre majuscule',            test: (p) => /[A-Z]/.test(p) },
  { id: 'min',     label: '1 lettre minuscule',            test: (p) => /[a-z]/.test(p) },
  { id: 'chiffre', label: '1 chiffre',                     test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: '1 caractère spécial (!@#...)',  test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [erreur, setErreur] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const navigate = useNavigate();
  const mfaRequired = Boolean(mfaToken);

  // Changement de mot de passe obligatoire
  const [showChangeMdp, setShowChangeMdp] = useState(false);
  const [newMdp, setNewMdp] = useState('');
  const [confirmMdp, setConfirmMdp] = useState('');
  const [changeMdpErreur, setChangeMdpErreur] = useState('');
  const [changeMdpLoading, setChangeMdpLoading] = useState(false);
  const [showNewMdp, setShowNewMdp] = useState(false);
  const [showConfirmMdp, setShowConfirmMdp] = useState(false);

  const afterLoginSuccess = (utilisateur, token) => {
    if (token) setLegacyToken(token);
    setSessionUser(utilisateur);
    if (utilisateur?.doit_changer_mdp) {
      setShowChangeMdp(true);
      return;
    }
    redirectAfterAuth(navigate, utilisateur);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loginLoading) return;
    setErreur('');
    setLoginLoading(true);
    try {
      if (!mfaRequired) {
        // Évite de mélanger un ancien profil / cache avec une nouvelle connexion
        setSessionUser(null);
        clearApiCache();
        const res = await apiClient.post('/auth/login', { email, mot_de_passe: motDePasse });
        if (res.data?.mfa_required) {
          setMfaToken(res.data.mfa_token || '');
          setMfaCode('');
          return;
        }
        afterLoginSuccess(res.data.utilisateur || null, res.data.token);
        return;
      }
      const res = await apiClient.post('/auth/login/mfa', { mfa_token: mfaToken, code: mfaCode });
      afterLoginSuccess(res.data.utilisateur || null, res.data.token);
    } catch (err) {
      const apiMsg = err.response?.data?.message;
      if (apiMsg) {
        setErreur(apiMsg);
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setErreur('Impossible de joindre le serveur. Vérifiez votre connexion ou la configuration API.');
      } else if (!supabaseConfigured) {
        setErreur('API non configurée (REACT_APP_SUPABASE_URL / ANON_KEY manquants).');
      } else {
        setErreur(err.message || 'Erreur de connexion');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setErreur('');
    if (!passkeySupported()) {
      setErreur('Les passkeys ne sont pas supportées sur cet appareil / navigateur.');
      return;
    }
    setPasskeyLoading(true);
    try {
      const optRes = await apiClient.post('/auth/login/passkey/options', {
        email: email.trim() || undefined,
      });
      const { options, challenge_token } = optRes.data || {};
      if (!options || !challenge_token) {
        setErreur('Impossible de démarrer la connexion passkey.');
        return;
      }
      const credential = await startAuthentication({ optionsJSON: options });
      const res = await apiClient.post('/auth/login/passkey/verify', {
        challenge_token,
        credential,
      });
      afterLoginSuccess(res.data.utilisateur || null, res.data.token);
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        setErreur('Connexion passkey annulée.');
      } else {
        setErreur(err.response?.data?.message || err.message || 'Échec de la connexion passkey');
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleChangerMdp = async (e) => {
    e.preventDefault();
    setChangeMdpErreur('');
    const tousOk = CRITERES.every(c => c.test(newMdp));
    if (!tousOk) { setChangeMdpErreur('Le mot de passe ne remplit pas tous les critères.'); return; }
    if (newMdp !== confirmMdp) { setChangeMdpErreur('Les mots de passe ne correspondent pas.'); return; }
    setChangeMdpLoading(true);
    try {
      await apiClient.post('/auth/changer-mdp', { nouveau_mdp: newMdp });
      let nextUser = { ...(getSessionUser() || {}), doit_changer_mdp: false };
      try {
        const st = await apiClient.get('/auth/mfa/status');
        nextUser = {
          ...nextUser,
          mfa_enabled: st.data?.mfa_enabled === true,
          mfa_exempt: st.data?.mfa_exempt === true,
        };
      } catch {
        nextUser = { ...nextUser, mfa_enabled: false };
      }
      setSessionUser(nextUser);
      redirectAfterAuth(navigate, nextUser);
    } catch (err) {
      setChangeMdpErreur(err.response?.data?.message || 'Erreur lors du changement de mot de passe.');
    } finally {
      setChangeMdpLoading(false);
    }
  };

  if (showChangeMdp) return (
    <div className="login-page" style={styles.page}>
      <div style={{...styles.card, maxWidth: 460}}>
        <div style={styles.logoContainer}>
          <img src="/logo-image-oasis.webp" alt="Oasis" style={styles.logoImage} />
        </div>
        <h2 style={{fontSize:18,fontWeight:800,color:'#1e293b',marginBottom:6,textAlign:'center'}}>Changement de mot de passe obligatoire</h2>
        <p style={{fontSize:13,color:'#64748b',marginBottom:20,textAlign:'center',lineHeight:1.5}}>
          Pour des raisons de sécurité, vous devez définir un nouveau mot de passe avant de continuer.
        </p>

        {changeMdpErreur && <div style={styles.erreur}>{changeMdpErreur}</div>}

        <form onSubmit={handleChangerMdp} style={styles.form}>
          <div style={styles.champ}>
            <label style={styles.label}>Nouveau mot de passe</label>
            <div style={{position:'relative'}}>
              <input
                style={styles.input}
                type={showNewMdp ? 'text' : 'password'}
                required
                value={newMdp}
                onChange={e => setNewMdp(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowNewMdp(v => !v)}
                style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:15,color:'#64748b',padding:4}}>
                {showNewMdp ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:4}}>
            {CRITERES.map(c => {
              const ok = c.test(newMdp);
              return (
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,fontSize:12}}>
                  <span style={{fontSize:13,color:ok?'#10b981':'#cbd5e1',lineHeight:1}}>{ok ? '✓' : '○'}</span>
                  <span style={{color:ok?'#059669':'#64748b',fontWeight:ok?600:400}}>{c.label}</span>
                </div>
              );
            })}
          </div>

          <div style={styles.champ}>
            <label style={styles.label}>Confirmer le mot de passe</label>
            <div style={{position:'relative'}}>
              <input
                style={{...styles.input, borderColor: confirmMdp && newMdp !== confirmMdp ? '#ef4444' : undefined}}
                type={showConfirmMdp ? 'text' : 'password'}
                required
                value={confirmMdp}
                onChange={e => setConfirmMdp(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowConfirmMdp(v => !v)}
                style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:15,color:'#64748b',padding:4}}>
                {showConfirmMdp ? '🙈' : '👁'}
              </button>
            </div>
            {confirmMdp && newMdp !== confirmMdp && (
              <span style={{fontSize:11,color:'#ef4444',marginTop:2}}>Les mots de passe ne correspondent pas</span>
            )}
          </div>

          <LoadingButton type="submit" loading={changeMdpLoading} loadingLabel="Enregistrement…" style={styles.btn}>
            Définir mon mot de passe
          </LoadingButton>
        </form>
      </div>
    </div>
  );

  return (
    <div className="login-page" style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <img src="/logo-image-oasis.webp" alt="Oasis" style={styles.logoImage} />
        </div>
        <p style={styles.sousTitre}>Connectez-vous à Oasis</p>

        {erreur && <div style={styles.erreur}>{erreur}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.champ}>
            <label style={styles.label}>Email ou identifiant</label>
            <input
              style={styles.input}
              type="text"
              required={!mfaRequired}
              value={email}
              disabled={mfaRequired || loginLoading}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email ou identifiant"
              autoComplete="username webauthn"
            />
          </div>
          <div style={styles.champ}>
            <label style={styles.label}>Mot de passe</label>
            <input
              style={styles.input}
              type="password"
              required={!mfaRequired}
              value={motDePasse}
              disabled={mfaRequired || loginLoading}
              onChange={e => setMotDePasse(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {mfaRequired && (
            <div style={styles.champ}>
              <label style={styles.label}>Code Google Authenticator ou code de secours</label>
              <input
                style={styles.input}
                type="text"
                inputMode="text"
                pattern="[A-Za-z0-9]{6,12}"
                maxLength={12}
                required
                value={mfaCode}
                disabled={loginLoading}
                onChange={e => setMfaCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12))}
                placeholder="123456 ou ABCD2345"
              />
            </div>
          )}
          <LoadingButton
            type="submit"
            loading={loginLoading}
            loadingLabel={mfaRequired ? 'Vérification…' : 'Connexion…'}
            style={styles.btn}
          >
            {mfaRequired ? 'Valider le code' : 'Se connecter'}
          </LoadingButton>
          {mfaRequired && (
            <button
              type="button"
              style={{ ...styles.btn, background: '#9ca3af', marginTop: 0, opacity: loginLoading ? 0.7 : 1 }}
              disabled={loginLoading}
              onClick={() => { setMfaToken(''); setMfaCode(''); setErreur(''); }}
            >
              Revenir
            </button>
          )}
        </form>

        {SHOW_PASSKEY_LOGIN && !mfaRequired && passkeySupported() && (
          <>
            <div style={styles.separator}>
              <span style={styles.separatorLine} />
              <span style={styles.separatorText}>ou</span>
              <span style={styles.separatorLine} />
            </div>
            <LoadingButton
              type="button"
              loading={passkeyLoading}
              loadingLabel="Passkey…"
              style={styles.btnPasskey}
              onClick={handlePasskeyLogin}
              title="Connexion biométrique / clé de sécurité (passkey)"
            >
              Se connecter avec une passkey
            </LoadingButton>
            <p style={styles.passkeyHint}>
              Astuce : saisissez votre email si vous avez plusieurs comptes, sinon la passkey suffit.
            </p>
          </>
        )}
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
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '28px 20px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
  },
  logoImage: {
    width: '160px',
    height: 'auto',
    display: 'block',
  },
  sousTitre: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '28px',
    textAlign: 'center',
  },
  erreur: {
    background: '#ffebee',
    color: '#c62828',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'center',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  champ: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#444',
  },
  input: {
    padding: '12px 14px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '15px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  },
  btn: {
    padding: '14px',
    background: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
    width: '100%',
  },
  separator: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '18px 0 12px',
  },
  separatorLine: {
    flex: 1,
    height: 1,
    background: '#e2e8f0',
  },
  separatorText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  btnPasskey: {
    padding: '13px 14px',
    background: '#ffffff',
    color: '#3730a3',
    border: '2px solid #c7d2fe',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    width: '100%',
  },
  passkeyHint: {
    margin: '10px 0 0',
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 1.4,
  },
};
