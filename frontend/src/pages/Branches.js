import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [brancheEdit, setBrancheEdit] = useState(null);
  const [form, setForm] = useState({ nom: '', code: '', coefficient: '1' });
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerBranches(); }, []);

  const chargerBranches = async () => {
    try {
      const res = await axios.get(API + '/branches', { headers });
      setBranches(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    try {
      if (brancheEdit) {
        await axios.put(API + '/branches/' + brancheEdit.id, form, { headers });
      } else {
        await axios.post(API + '/branches', form, { headers });
      }
      setShowForm(false);
      setBrancheEdit(null);
      setForm({ nom: '', code: '', coefficient: '1' });
      chargerBranches();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (b) => {
    setBrancheEdit(b);
    setForm({ nom: b.nom, code: b.code || '', coefficient: b.coefficient || '1' });
    setErreur('');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cette branche ? Elle sera retirée de tous les emplois du temps.')) {
      try {
        await axios.delete(API + '/branches/' + id, { headers });
        chargerBranches();
      } catch (err) {
        alert('Erreur: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const branchesFiltrees = branches.filter(b =>
    b.nom.toLowerCase().includes(recherche.toLowerCase()) ||
    (b.code && b.code.toLowerCase().includes(recherche.toLowerCase()))
  );

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={styles.titre}>📚 Branches / Matières</h2>
        <div style={styles.headerRight}>
          <input style={styles.recherche} placeholder="🔍 Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} />
          <button style={styles.btnAjouter} onClick={() => { setShowForm(true); setBrancheEdit(null); setForm({ nom: '', code: '', coefficient: '1' }); setErreur(''); }}>+ Ajouter</button>
        </div>
      </div>

      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitre}>{brancheEdit ? 'Modifier' : 'Ajouter'} une branche</h3>
            {erreur && <div style={styles.msgError}>❌ {erreur}</div>}
            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                  <label style={styles.label}>Nom de la branche *</label>
                  <input style={styles.input} type="text" required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Mathématiques, Français..." />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Code</label>
                  <input style={styles.input} type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Ex: MATH, FR..." />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Coefficient</label>
                  <input style={styles.input} type="number" min="0.5" max="10" step="0.5" value={form.coefficient} onChange={e => setForm({ ...form, coefficient: e.target.value })} />
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

      <div style={styles.statBadge}>Total : <b>{branches.length}</b> branches</div>

      <div style={styles.grid}>
        {branchesFiltrees.length === 0 ? (
          <div style={styles.vide}>Aucune branche trouvée</div>
        ) : branchesFiltrees.map(b => (
          <div key={b.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardIcon}>📚</div>
              <div style={{ flex: 1 }}>
                <div style={styles.cardNom}>{b.nom}</div>
                {b.code && <div style={styles.cardCode}>{b.code}</div>}
              </div>
              <div style={styles.coefBadge}>Coef. {b.coefficient}</div>
            </div>
            <div style={styles.cardActions}>
              <button style={styles.btnEdit} onClick={() => handleEdit(b)}>✏️ Modifier</button>
              <button style={styles.btnDelete} onClick={() => handleDelete(b.id)}>🗑️ Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '20px', background: '#f0f2f5', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' },
  btnRetour: { padding: '8px 16px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer' },
  titre: { fontSize: '24px', fontWeight: '700', flex: 1 },
  headerRight: { display: 'flex', gap: '10px', alignItems: 'center' },
  recherche: { padding: '10px 16px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', width: '220px' },
  btnAjouter: { padding: '10px 20px', background: '#9c27b0', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  statBadge: { display: 'inline-block', background: '#f3e5f5', padding: '6px 14px', borderRadius: '20px', fontSize: '14px', color: '#9c27b0', marginBottom: '20px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' },
  card: { background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderTop: '4px solid #9c27b0' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  cardIcon: { fontSize: '24px' },
  cardNom: { fontSize: '16px', fontWeight: '700' },
  cardCode: { fontSize: '12px', color: '#888', marginTop: '2px' },
  coefBadge: { background: '#f3e5f5', color: '#9c27b0', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  cardActions: { display: 'flex', gap: '8px' },
  btnEdit: { flex: 1, padding: '8px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  btnDelete: { flex: 1, padding: '8px', background: '#ffebee', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#c62828' },
  vide: { padding: '40px', textAlign: 'center', color: '#888', background: 'white', borderRadius: '12px', gridColumn: '1/-1' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '30px', borderRadius: '16px', width: '450px' },
  modalTitre: { fontSize: '20px', fontWeight: '700', marginBottom: '20px' },
  msgError: { background: '#ffebee', color: '#c62828', padding: '10px 16px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  formChamp: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#555' },
  input: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
  btnAnnuler: { padding: '10px 20px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  btnSauver: { padding: '10px 20px', background: '#9c27b0', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
};