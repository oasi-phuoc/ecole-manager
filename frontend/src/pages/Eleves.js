import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

export default function Eleves() {
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [eleveEdit, setEleveEdit] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', classe_id: '', date_naissance: '', telephone: '', adresse: '', nom_parent: '', telephone_parent: '' });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerEleves(); chargerClasses(); }, []);

  const chargerEleves = async () => {
    try {
      const res = await axios.get(API + '/eleves', { headers });
      setEleves(res.data);
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
    }
  };

  const chargerClasses = async () => {
    try {
      const res = await axios.get(API + '/classes', { headers });
      setClasses(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (eleveEdit) {
        await axios.put(API + '/eleves/' + eleveEdit.id, form, { headers });
      } else {
        await axios.post(API + '/eleves', form, { headers });
      }
      setShowForm(false);
      setEleveEdit(null);
      setForm({ nom: '', prenom: '', email: '', classe_id: '', date_naissance: '', telephone: '', adresse: '', nom_parent: '', telephone_parent: '' });
      chargerEleves();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEdit = (eleve) => {
    setEleveEdit(eleve);
    setForm({ nom: eleve.nom, prenom: eleve.prenom, email: eleve.email, classe_id: eleve.classe_id || '', date_naissance: eleve.date_naissance?.split('T')[0] || '', telephone: eleve.telephone || '', adresse: eleve.adresse || '', nom_parent: eleve.nom_parent || '', telephone_parent: eleve.telephone_parent || '' });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cet élève ?')) {
      await axios.delete(API + '/eleves/' + id, { headers });
      chargerEleves();
    }
  };

  const elevesFiltres = eleves.filter(e =>
    (e.nom + ' ' + e.prenom + ' ' + e.email).toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={styles.titre}>👨‍🎓 Gestion des Élèves</h2>
        <div style={styles.headerRight}>
          <input style={styles.recherche} placeholder="🔍 Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} />
          {isAdmin() && <button style={styles.btnAjouter} onClick={() => { setShowForm(true); setEleveEdit(null); setForm({ nom: '', prenom: '', email: '', classe_id: '', date_naissance: '', telephone: '', adresse: '', nom_parent: '', telephone_parent: '' }); }}>+ Ajouter</button>}
        </div>
      </div>

      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitre}>{eleveEdit ? 'Modifier' : 'Ajouter'} un élève</h3>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                {[
                  { label: 'Nom *', key: 'nom', type: 'text', required: true },
                  { label: 'Prénom *', key: 'prenom', type: 'text', required: true },
                  { label: 'Email *', key: 'email', type: 'email', required: true },
                  { label: 'Date de naissance', key: 'date_naissance', type: 'date' },
                  { label: 'Téléphone', key: 'telephone', type: 'text' },
                  { label: 'Nom du parent', key: 'nom_parent', type: 'text' },
                  { label: 'Tél. parent', key: 'telephone_parent', type: 'text' },
                  { label: 'Adresse', key: 'adresse', type: 'text' },
                ].map(f => (
                  <div key={f.key} style={styles.formChamp}>
                    <label style={styles.label}>{f.label}</label>
                    <input style={styles.input} type={f.type} required={f.required} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                  </div>
                ))}
                <div style={styles.formChamp}>
                  <label style={styles.label}>Classe</label>
                  <select style={styles.input} value={form.classe_id} onChange={e => setForm({ ...form, classe_id: e.target.value })}>
                    <option value="">-- Choisir une classe --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
              </div>
              <div style={styles.formActions}>
                <button type="button" style={styles.btnAnnuler} onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" style={styles.btnSauver}>Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={styles.statBadge}>Total : <b>{eleves.length}</b> élèves</div>

      <table style={styles.table}>
        <thead>
          <tr style={styles.theadRow}>
            {['Nom', 'Prénom', 'Email', 'Classe', 'Téléphone', 'Parent', 'Statut'].map(h => (
              <th key={h} style={styles.th}>{h}</th>
            ))}
            {isAdmin() && <th style={styles.th}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {elevesFiltres.length === 0 ? (
            <tr><td colSpan="8" style={styles.vide}>Aucun élève trouvé</td></tr>
          ) : elevesFiltres.map(e => (
            <tr key={e.id} style={styles.tr}>
              <td style={styles.td}>{e.nom}</td>
              <td style={styles.td}>{e.prenom}</td>
              <td style={styles.td}>{e.email}</td>
              <td style={styles.td}>{e.classe || '—'}</td>
              <td style={styles.td}>{e.telephone || '—'}</td>
              <td style={styles.td}>{e.nom_parent || '—'}</td>
              <td style={styles.td}>
                <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', background: e.statut === 'actif' ? '#e8f5e9' : '#ffebee', color: e.statut === 'actif' ? '#2e7d32' : '#c62828' }}>
                  {e.statut}
                </span>
              </td>
              {isAdmin() && <td style={styles.td}><button style={styles.btnEdit} onClick={() => handleEdit(e)}>✏️</button><button style={styles.btnDelete} onClick={() => handleDelete(e.id)}>🗑️</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  page: { padding: '20px', background: '#f0f2f5', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' },
  btnRetour: { padding: '8px 16px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer' },
  titre: { fontSize: '24px', fontWeight: '700', flex: 1 },
  headerRight: { display: 'flex', gap: '10px', alignItems: 'center' },
  recherche: { padding: '10px 16px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', width: '250px' },
  btnAjouter: { padding: '10px 20px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  statBadge: { display: 'inline-block', background: '#e3f2fd', padding: '6px 14px', borderRadius: '20px', fontSize: '14px', color: '#1a73e8', marginBottom: '15px' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  theadRow: { background: '#1a73e8', color: 'white' },
  th: { padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '12px 16px', fontSize: '14px' },
  vide: { padding: '40px', textAlign: 'center', color: '#888' },
  btnEdit: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', marginRight: '8px' },
  btnDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '30px', borderRadius: '16px', width: '600px', maxHeight: '80vh', overflowY: 'auto' },
  modalTitre: { fontSize: '20px', fontWeight: '700', marginBottom: '20px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  formChamp: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#555' },
  input: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
  btnAnnuler: { padding: '10px 20px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  btnSauver: { padding: '10px 20px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
};