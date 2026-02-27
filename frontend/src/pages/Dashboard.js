import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [classesProf, setClassesProf] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => {
    const u = localStorage.getItem('utilisateur');
    if (u) setUser(JSON.parse(u));
    chargerClassesProf();
  }, []);

  const chargerClassesProf = async () => {
    try {
      const res = await axios.get(API + '/parametres/mes-classes', { headers });
      setClassesProf(res.data);
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';
  const isProf = user?.role === 'prof';
  const perms = user?.permissions || {};

  const MENUS_ADMIN = [
    { icon: '👨‍🎓', label: 'Élèves', path: '/eleves', color: '#1a73e8' },
    { icon: '👨‍🏫', label: 'Professeurs', path: '/professeurs', color: '#34a853' },
    { icon: '🏫', label: 'Classes', path: '/classes', color: '#fbbc04' },
    { icon: '📚', label: 'Branches', path: '/branches', color: '#9c27b0' },
    { icon: '📅', label: 'Emploi du temps', path: '/emploi-du-temps', color: '#00bcd4' },
    { icon: '✅', label: 'Présences', path: '/presences', color: '#ff9800' },
    { icon: '📝', label: 'Notes', path: '/notes', color: '#e91e63' },
    { icon: '📆', label: 'Calendrier', path: '/calendrier', color: '#009688' },
    { icon: '💰', label: 'Comptabilité', path: '/comptabilite', color: '#4caf50' },
    { icon: '📊', label: 'Statistiques', path: '/statistiques', color: '#3f51b5' },
    { icon: '⚙️', label: 'Paramètres', path: '/parametres', color: '#607d8b' },
  ];

  const MENUS_PROF = [
    { icon: '👨‍🎓', label: 'Élèves', path: '/eleves', color: '#1a73e8' },
    { icon: '👨‍🏫', label: 'Professeurs', path: '/professeurs', color: '#34a853' },
    { icon: '🏫', label: 'Classes', path: '/classes', color: '#fbbc04' },
    { icon: '📅', label: 'Emploi du temps', path: '/emploi-du-temps', color: '#00bcd4' },
    { icon: '✅', label: 'Présences', path: '/presences', color: '#ff9800' },
    { icon: '📝', label: 'Notes', path: '/notes', color: '#e91e63' },
    { icon: '📆', label: 'Calendrier', path: '/calendrier', color: '#009688' },
    { icon: '⚙️', label: 'Paramètres', path: '/parametres', color: '#607d8b' },
  ];

  const menus = isAdmin ? MENUS_ADMIN : MENUS_PROF;

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h1 style={styles.appNom}>🎓 École Manager</h1>
        <div style={styles.userInfo}>
          <span style={styles.userName}>👤 {user?.prenom} {user?.nom} — <b>{user?.role}</b></span>
          <button style={styles.btnLogout} onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>

      <div style={styles.content}>
        <h2 style={styles.titre}>Tableau de bord</h2>

        {/* Message de bienvenue */}
        <div style={styles.welcome}>
          <span style={{ fontSize: '20px' }}>🎉</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '16px' }}>Bienvenue, {user?.prenom} {user?.nom} !</div>
            <div style={{ color: '#888', fontSize: '14px' }}>Cliquez sur un module dans le menu pour commencer.</div>
          </div>
        </div>

        {/* Classes du professeur */}
        {isProf && classesProf.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <h3 style={styles.sectionTitre}>🏫 Mes classes</h3>
            <div style={styles.classesGrid}>
              {[...new Map(classesProf.map(c => [c.id, c])).values()].map(c => (
                <div key={c.id} style={styles.classeCard}>
                  <div style={styles.classeNom}>{c.nom}</div>
                  <div style={styles.classeMatieres}>
                    {classesProf.filter(x => x.id === c.id).map(x => (
                      <span key={x.matiere} style={styles.matiereBadge}>{x.matiere}</span>
                    ))}
                  </div>
                  {c.niveau && <div style={styles.classeInfo}>{c.niveau}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu modules */}
        <h3 style={styles.sectionTitre}>📋 Modules</h3>
        <div style={styles.menuGrid}>
          {menus.map((m, i) => (
            <div key={i} style={{ ...styles.menuCard, borderTop: '4px solid ' + m.color }} onClick={() => navigate(m.path)}>
              <div style={styles.menuIcon}>{m.icon}</div>
              <div style={styles.menuLabel}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { background: '#f0f2f5', minHeight: '100vh' },
  topbar: { background: 'white', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  appNom: { fontSize: '20px', fontWeight: '700', color: '#1a73e8' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '15px' },
  userName: { fontSize: '14px', color: '#555' },
  btnLogout: { padding: '8px 16px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  content: { padding: '30px' },
  titre: { fontSize: '28px', fontWeight: '700', marginBottom: '20px' },
  welcome: { background: 'white', borderRadius: '12px', padding: '20px 25px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '30px' },
  sectionTitre: { fontSize: '16px', fontWeight: '700', color: '#555', marginBottom: '15px' },
  classesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' },
  classeCard: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderTop: '4px solid #1a73e8' },
  classeNom: { fontSize: '18px', fontWeight: '700', marginBottom: '10px' },
  classeMatieres: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' },
  matiereBadge: { background: '#e3f2fd', color: '#1a73e8', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  classeInfo: { fontSize: '12px', color: '#888', marginTop: '6px' },
  menuGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' },
  menuCard: { background: 'white', borderRadius: '12px', padding: '20px 15px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s' },
  menuIcon: { fontSize: '32px', marginBottom: '10px' },
  menuLabel: { fontSize: '14px', fontWeight: '600', color: '#333' },
};