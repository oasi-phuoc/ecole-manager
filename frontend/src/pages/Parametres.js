import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';

const MODULES_PROF = [
  { key: 'presences_modifier', label: 'Modifier les présences' },
  { key: 'notes_modifier', label: 'Modifier les notes' },
];

export default function Parametres() {
  const [onglet, setOnglet] = useState('profil');
  const [profil, setProfil] = useState({ nom: '', prenom: '', email: '', role: '' });
  const [ecole, setEcole] = useState({ nom_ecole: '', adresse: '', telephone: '', email: '', annee_scolaire: '', directeur: '' });
  const [mdp, setMdp] = useState({ ancien: '', nouveau: '', confirmation: '' });
  const [profs, setProfs] = useState([]);
  const [profSelectionne, setProfSelectionne] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [msgProfil, setMsgProfil] = useState('');
  const [msgEcole, setMsgEcole] = useState('');
  const [msgMdp, setMsgMdp] = useState('');
  const [msgPerms, setMsgPerms] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };
  const isAdmin = profil.role === 'admin';

  useEffect(() => { chargerProfil(); }, []);
  useEffect(() => { if (isAdmin) { chargerEcole(); chargerProfs(); } }, [isAdmin]);

  const chargerProfil = async () => {
    try {
      const res = await axios.get(API + '/parametres/profil', { headers });
      setProfil(res.data);
    } catch (err) { console.error(err); }
  };

  const chargerEcole = async () => {
    try {
      const res = await axios.get(API + '/parametres/ecole', { headers });
      if (res.data) setEcole(res.data);
    } catch (err) { console.error(err); }
  };

  const chargerProfs = async () => {
    try {
      const res = await axios.get(API + '/parametres/profs', { headers });
      setProfs(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSauverProfil = async (e) => {
    e.preventDefault();
    try {
      await axios.put(API + '/parametres/profil', profil, { headers });
      setMsgProfil('success');
      setTimeout(() => setMsgProfil(''), 3000);
    } catch (err) { setMsgProfil('error'); }
  };

  const handleSauverMdp = async (e) => {
    e.preventDefault();
    if (mdp.nouveau !== mdp.confirmation) { setMsgMdp('mismatch'); return; }
    try {
      await axios.put(API + '/parametres/mot-de-passe', { ancien: mdp.ancien, nouveau: mdp.nouveau }, { headers });
      setMsgMdp('success');
      setMdp({ ancien: '', nouveau: '', confirmation: '' });
      setTimeout(() => setMsgMdp(''), 3000);
    } catch (err) { setMsgMdp('error'); }
  };

  const handleSauverEcole = async (e) => {
    e.preventDefault();
    try {
      await axios.put(API + '/parametres/ecole', ecole, { headers });
      setMsgEcole('success');
      setTimeout(() => setMsgEcole(''), 3000);
    } catch (err) { setMsgEcole('error'); }
  };

  const ouvrirPermissions = (prof) => {
    setProfSelectionne(prof);
    setPermissions(prof.permissions || {});
    setMsgPerms('');
  };

  const handleSauverPermissions = async () => {
    try {
      await axios.put(API + '/parametres/permissions/' + profSelectionne.id, { permissions }, { headers });
      setMsgPerms('success');
      chargerProfs();
      setTimeout(() => setMsgPerms(''), 3000);
    } catch (err) { setMsgPerms('error'); }
  };

  const ONGLETS = [
    { key: 'profil', label: '👤 Mon profil', show: true },
    { key: 'mdp', label: '🔒 Mot de passe', show: true },
    { key: 'ecole', label: '🏫 École', show: isAdmin },
    { key: 'acces', label: '🔑 Gestion des accès', show: isAdmin },
  ].filter(o => o.show);

  const COULEURS = { profil: '#1a73e8', mdp: '#ea4335', ecole: '#34a853', acces: '#ff9800' };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={styles.titre}>⚙️ Paramètres</h2>
      </div>

      <div style={styles.layout}>
        <div style={styles.sidebar}>
          {ONGLETS.map(o => (
            <div key={o.key} style={{ ...styles.navItem, ...(onglet === o.key ? { ...styles.navItemActif, borderLeft: '4px solid ' + COULEURS[o.key] } : {}) }}
              onClick={() => setOnglet(o.key)}>
              {o.label}
            </div>
          ))}
        </div>

        <div style={styles.content}>

          {onglet === 'profil' && (
            <div style={styles.card}>
              <h3 style={styles.cardTitre}>👤 Mon profil</h3>
              <div style={styles.roleTag}>{profil.role}</div>
              {msgProfil === 'success' && <div style={styles.msgSuccess}>✅ Profil mis à jour !</div>}
              {msgProfil === 'error' && <div style={styles.msgError}>❌ Erreur lors de la mise à jour</div>}
              <form onSubmit={handleSauverProfil}>
                <div style={styles.formGrid}>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Nom *</label>
                    <input style={styles.input} type="text" required value={profil.nom} onChange={e => setProfil({ ...profil, nom: e.target.value })} />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Prénom *</label>
                    <input style={styles.input} type="text" required value={profil.prenom} onChange={e => setProfil({ ...profil, prenom: e.target.value })} />
                  </div>
                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={styles.label}>Email *</label>
                    <input style={styles.input} type="email" required value={profil.email} onChange={e => setProfil({ ...profil, email: e.target.value })} />
                  </div>
                </div>
                <button type="submit" style={styles.btnSauver}>💾 Sauvegarder</button>
              </form>
            </div>
          )}

          {onglet === 'mdp' && (
            <div style={styles.card}>
              <h3 style={styles.cardTitre}>🔒 Changer le mot de passe</h3>
              {msgMdp === 'success' && <div style={styles.msgSuccess}>✅ Mot de passe modifié !</div>}
              {msgMdp === 'error' && <div style={styles.msgError}>❌ Ancien mot de passe incorrect</div>}
              {msgMdp === 'mismatch' && <div style={styles.msgError}>❌ Les mots de passe ne correspondent pas</div>}
              <form onSubmit={handleSauverMdp}>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Ancien mot de passe *</label>
                  <input style={styles.input} type="password" required value={mdp.ancien} onChange={e => setMdp({ ...mdp, ancien: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Nouveau mot de passe *</label>
                  <input style={styles.input} type="password" required value={mdp.nouveau} onChange={e => setMdp({ ...mdp, nouveau: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Confirmer *</label>
                  <input style={styles.input} type="password" required value={mdp.confirmation} onChange={e => setMdp({ ...mdp, confirmation: e.target.value })} />
                </div>
                <button type="submit" style={{ ...styles.btnSauver, background: '#ea4335', marginTop: '10px' }}>🔒 Changer</button>
              </form>
            </div>
          )}

          {onglet === 'ecole' && isAdmin && (
            <div style={styles.card}>
              <h3 style={styles.cardTitre}>🏫 Paramètres de l'école</h3>
              {msgEcole === 'success' && <div style={styles.msgSuccess}>✅ Paramètres mis à jour !</div>}
              {msgEcole === 'error' && <div style={styles.msgError}>❌ Erreur lors de la mise à jour</div>}
              <form onSubmit={handleSauverEcole}>
                <div style={styles.formGrid}>
                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={styles.label}>Nom de l'école</label>
                    <input style={styles.input} type="text" value={ecole.nom_ecole || ''} onChange={e => setEcole({ ...ecole, nom_ecole: e.target.value })} />
                  </div>
                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={styles.label}>Adresse</label>
                    <input style={styles.input} type="text" value={ecole.adresse || ''} onChange={e => setEcole({ ...ecole, adresse: e.target.value })} />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Téléphone</label>
                    <input style={styles.input} type="text" value={ecole.telephone || ''} onChange={e => setEcole({ ...ecole, telephone: e.target.value })} />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Email</label>
                    <input style={styles.input} type="email" value={ecole.email || ''} onChange={e => setEcole({ ...ecole, email: e.target.value })} />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Année scolaire</label>
                    <input style={styles.input} type="text" value={ecole.annee_scolaire || ''} onChange={e => setEcole({ ...ecole, annee_scolaire: e.target.value })} placeholder="2025-2026" />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Directeur</label>
                    <input style={styles.input} type="text" value={ecole.directeur || ''} onChange={e => setEcole({ ...ecole, directeur: e.target.value })} />
                  </div>
                </div>
                <button type="submit" style={{ ...styles.btnSauver, background: '#34a853', marginTop: '10px' }}>💾 Sauvegarder</button>
              </form>
            </div>
          )}

          {onglet === 'acces' && isAdmin && (
            <div style={styles.card}>
              <h3 style={styles.cardTitre}>🔑 Gestion des accès professeurs</h3>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>
                Les professeurs peuvent toujours voir les élèves, classes, calendrier et modifier leur profil. Configurez ici leurs droits de modification.
              </p>

              {profSelectionne ? (
                <div>
                  <div style={styles.profHeader}>
                    <button style={styles.btnBack} onClick={() => setProfSelectionne(null)}>← Retour</button>
                    <div>
                      <div style={styles.profNom}>{profSelectionne.prenom} {profSelectionne.nom}</div>
                      <div style={styles.profEmail}>{profSelectionne.email}</div>
                    </div>
                  </div>
                  {msgPerms === 'success' && <div style={styles.msgSuccess}>✅ Permissions mises à jour !</div>}
                  {msgPerms === 'error' && <div style={styles.msgError}>❌ Erreur</div>}
                  <div style={styles.permsGrid}>
                    {MODULES_PROF.map(m => (
                      <div key={m.key} style={styles.permRow}>
                        <div style={styles.permLabel}>{m.label}</div>
                        <label style={styles.toggle}>
                          <input type="checkbox" checked={permissions[m.key] === true}
                            onChange={e => setPermissions({ ...permissions, [m.key]: e.target.checked })} />
                          <span style={{ ...styles.toggleSlider, background: permissions[m.key] ? '#34a853' : '#ccc' }}>
                            <span style={{ ...styles.toggleThumb, left: permissions[m.key] ? '22px' : '2px' }} />
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <button style={{ ...styles.btnSauver, background: '#ff9800', marginTop: '20px' }} onClick={handleSauverPermissions}>
                    💾 Sauvegarder les permissions
                  </button>
                </div>
              ) : (
                <div>
                  {profs.length === 0 ? (
                    <div style={styles.vide}>Aucun professeur trouvé</div>
                  ) : profs.map(p => (
                    <div key={p.id} style={styles.profCard} onClick={() => ouvrirPermissions(p)}>
                      <div style={styles.profAvatar}>{p.prenom[0]}{p.nom[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={styles.profNom}>{p.prenom} {p.nom}</div>
                        <div style={styles.profEmail}>{p.email}</div>
                      </div>
                      <div style={styles.profPermsCount}>
                        {Object.values(p.permissions || {}).filter(v => v === true).length} permission(s)
                      </div>
                      <div style={styles.chevron}>›</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '20px', background: '#f0f2f5', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' },
  btnRetour: { padding: '8px 16px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer' },
  titre: { fontSize: '24px', fontWeight: '700' },
  layout: { display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px' },
  sidebar: { background: 'white', borderRadius: '12px', padding: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', height: 'fit-content' },
  navItem: { padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', borderLeft: '4px solid transparent', marginBottom: '4px' },
  navItemActif: { background: '#f0f4ff', fontWeight: '700' },
  content: {},
  card: { background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  cardTitre: { fontSize: '20px', fontWeight: '700', marginBottom: '20px' },
  roleTag: { display: 'inline-block', background: '#e3f2fd', color: '#1a73e8', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', marginBottom: '20px' },
  msgSuccess: { background: '#e8f5e9', color: '#2e7d32', padding: '10px 16px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600' },
  msgError: { background: '#ffebee', color: '#c62828', padding: '10px 16px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' },
  formChamp: { display: 'flex', flexDirection: 'column', marginBottom: '15px' },
  label: { fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#555' },
  input: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' },
  btnSauver: { padding: '12px 24px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' },
  vide: { color: '#888', textAlign: 'center', padding: '30px' },
  profCard: { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer', border: '2px solid transparent' },
  profAvatar: { width: '44px', height: '44px', borderRadius: '50%', background: '#ff9800', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '15px' },
  profNom: { fontWeight: '700', fontSize: '15px' },
  profEmail: { fontSize: '13px', color: '#888' },
  profPermsCount: { fontSize: '12px', color: '#ff9800', fontWeight: '600', background: '#fff3e0', padding: '4px 10px', borderRadius: '12px' },
  chevron: { fontSize: '20px', color: '#ccc' },
  profHeader: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #f0f0f0' },
  btnBack: { padding: '8px 14px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  permsGrid: { display: 'flex', flexDirection: 'column', gap: '12px' },
  permRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#f8f9fa', borderRadius: '10px' },
  permLabel: { fontSize: '14px', fontWeight: '600' },
  toggle: { position: 'relative', display: 'inline-block', cursor: 'pointer' },
  toggleSlider: { display: 'block', width: '46px', height: '26px', borderRadius: '13px', transition: 'background 0.3s', position: 'relative' },
  toggleThumb: { position: 'absolute', top: '3px', width: '20px', height: '20px', background: 'white', borderRadius: '50%', transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' },
};