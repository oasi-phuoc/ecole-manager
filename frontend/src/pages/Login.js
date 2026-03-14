import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { setSessionUser } from '../utils/session';

const API = 'https://ecole-manager-backend.onrender.com/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [erreur, setErreur] = useState('');
  const navigate = useNavigate();
  const mfaRequired = Boolean(mfaToken);

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
        setSessionUser(res.data.utilisateur || null);
        navigate('/dashboard');
        return;
      }
      const res = await axios.post(API + '/auth/login/mfa', { mfa_token: mfaToken, code: mfaCode });
      setSessionUser(res.data.utilisateur || null);
      navigate('/dashboard');
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur de connexion');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <img src="/logo-image-oasis.webp" alt="Oasis" style={styles.logoImage} />
          <img src="/logo-oasis.webp" alt="Le Botza" style={styles.logoOasis} />
        </div>
        <p style={styles.sousTitre}>Connectez-vous à votre espace</p>

        {erreur && <div style={styles.erreur}>{erreur}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.champ}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              required
              value={email}
              disabled={mfaRequired}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@ecole.com"
            />
          </div>
          <div style={styles.champ}>
            <label style={styles.label}>Mot de passe</label>
            <input
              style={styles.input}
              type="password"
              required
              value={motDePasse}
              disabled={mfaRequired}
              onChange={e => setMotDePasse(e.target.value)}
              placeholder="••••••••"
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
    padding: '40px',
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
    width: '120px',
    objectFit: 'contain',
  },
  logoOasis: {
    width: '180px',
    objectFit: 'contain',
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
};