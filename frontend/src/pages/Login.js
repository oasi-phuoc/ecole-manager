import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { startAuthentication } from '@simplewebauthn/browser';
import { setSessionUser } from '../utils/session';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';

const CRITERES = [
  { id: 'len',     label: '12 caractères minimum',        test: (p) => p.length >= 12 },
  { id: 'maj',     label: '1 lettre majuscule',            test: (p) => /[A-Z]/.test(p) },
  { id: 'min',     label: '1 lettre minuscule',            test: (p) => /[a-z]/.test(p) },
  { id: 'chiffre', label: '1 chiffre',                     test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: '1 caractère spécial (!@#...)',  test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const passkeySupported = () =>
  typeof window !== 'undefined'
  && !!window.PublicKeyCredential
  && typeof window.PublicKeyCredential === 'function';

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [erreur, setErreur] = useState('');
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

  const afterLoginSuccess = (utilisateur) => {
    setSessionUser(utilisateur);
    if (utilisateur?.doit_changer_mdp) {
      setShowChangeMdp(true);
      return;
    }
    navigate('/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    try {
      if (!mfaRequired) {
        const res = await axios.post(API + '/auth/login', { email, mot_de_passe: motDePasse });
        if (res.data?.mfa_required) {
          setMfaToken(res.data.mfa_token || '');
          setMfaCode('');
          return;
        }
        afterLoginSuccess(res.data.utilisateur || null);
        return;
      }
      const res = await axios.post(API + '/auth/login/mfa', { mfa_token: mfaToken, code: mfaCode });
      afterLoginSuccess(res.data.utilisateur || null);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur de connexion');
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
      const optRes = await axios.post(API + '/auth/login/passkey/options', {
        email: email.trim() || undefined,
      });
      const { options, challenge_token } = optRes.data || {};
      if (!options || !challenge_token) {
        setErreur('Impossible de démarrer la connexion passkey.');
        return;
      }
      const credential = await startAuthentication({ optionsJSON: options });
      const res = await axios.post(API + '/auth/login/passkey/verify', {
        challenge_token,
        credential,
      });
      afterLoginSuccess(res.data.utilisateur || null);
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
      await axios.post(API + '/auth/changer-mdp', { nouveau_mdp: newMdp });
      navigate('/dashboard');
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

          <button type="submit" style={{...styles.btn, opacity: changeMdpLoading ? 0.7 : 1}} disabled={changeMdpLoading}>
            {changeMdpLoading ? 'Enregistrement...' : 'Définir mon mot de passe'}
          </button>
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
              disabled={mfaRequired}
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
              disabled={mfaRequired}
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
                onChange={e => setMfaCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12))}
                placeholder="123456 ou ABCD2345"
              />
            </div>
          )}
          <button type="submit" style={styles.btn}>{mfaRequired ? 'Valider le code' : 'Se connecter'}</button>
          {mfaRequired && (
            <button
              type="button"
              style={{ ...styles.btn, background: '#9ca3af', marginTop: 0 }}
              onClick={() => { setMfaToken(''); setMfaCode(''); setErreur(''); }}
            >
              Revenir
            </button>
          )}
        </form>

        {!mfaRequired && passkeySupported() && (
          <>
            <div style={styles.separator}>
              <span style={styles.separatorLine} />
              <span style={styles.separatorText}>ou</span>
              <span style={styles.separatorLine} />
            </div>
            <button
              type="button"
              style={{ ...styles.btnPasskey, opacity: passkeyLoading ? 0.75 : 1 }}
              onClick={handlePasskeyLogin}
              disabled={passkeyLoading}
              title="Connexion biométrique / clé de sécurité (passkey)"
            >
              {passkeyLoading ? 'Passkey…' : 'Se connecter avec une passkey'}
            </button>
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
