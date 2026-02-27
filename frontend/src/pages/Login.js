import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    try {
      const res = await axios.post(API + '/auth/login', { email, mot_de_passe: motDePasse });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('utilisateur', JSON.stringify(res.data.utilisateur));
      navigate('/dashboard');
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur de connexion');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <span style={styles.logoIcon}>🏫</span>
        </div>
        <h1 style={styles.titre}>École Manager</h1>
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
              onChange={e => setMotDePasse(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" style={styles.btn}>Se connecter</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)',
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
    marginBottom: '12px',
  },
  logoIcon: {
    fontSize: '52px',
  },
  titre: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#1a73e8',
    margin: '0 0 6px 0',
    textAlign: 'center',
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
    background: '#1a73e8',
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