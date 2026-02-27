import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [profs, setProfs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [classeEdit, setClasseEdit] = useState(null);
  const [form, setForm] = useState({ nom: '', niveau: '', annee_scolaire: '2025-2026', prof_principal_id: '' });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerClasses(); chargerProfs(); }, []);

  const chargerClasses = async () => {
    try {
      const res = await axios.get(API + '/classes', { headers });
      setClasses(res.data);
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
    }
  };

  const chargerProfs = async () => {
    try {
      const res = await axios.get(API + '/profs', { headers });
      setProfs(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (classeEdit) {
        await axios.put(API + '/classes/' + classeEdit.id, form, { headers });
      } else {
        await axios.post(API + '/classes', form, { headers });
      }
      setShowForm(false);
      setClasseEdit(null);
      setForm({ nom: '', niveau: '', annee_scolaire: '2025-2026', prof_principal_id: '' });
      chargerClasses();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEdit = (classe) => {
    setClasseEdit(classe);
    setForm({ nom: classe.nom, niveau: classe.niveau || '', annee_scolaire: classe.annee_scolaire || '', prof_principal_id: classe.prof_principal_id || '' });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cette classe ?')) {
      try {
        await axios.delete(API + '/classes/' + id, { headers });
        chargerClasses();
      } catch (err) {
        alert('Erreur: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={styles.titre}>🏫 Gestion des Classes</h2>
        {isAdmin() && <button style={styles.btnAjouter} onClick={() => { setShowForm(true); setClasseEdit(null); setForm({ nom: '', niveau: '', annee_scolaire: '', prof_principal_id: '' }); }}>+ Ajouter</button>}
      </div>

      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitre}>{classeEdit ? 'Modifier' : 'Ajouter'} une classe</h3>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Nom de la classe *</label>
                  <input style={styles.input} type="text" required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ex: 6A, Terminale B..." />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Niveau</label>
                  <input style={styles.input} type="text" value={form.niveau} onChange={e => setForm({ ...form, niveau: e.target.value })} placeholder="Ex: CM2, 3ème, Terminale..." />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Année scolaire</label>
                  <input style={styles.input} type="text" value={form.annee_scolaire} onChange={e => setForm({ ...form, annee_scolaire: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Professeur principal</label>
                  <select style={styles.input} value={form.prof_principal_id} onChange={e => setForm({ ...form, prof_principal_id: e.target.value })}>
                    <option value="">-- Choisir un prof --</option>
                    {profs.map(p => (
                      <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                    ))}
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

      <div style={styles.statBadge}>Total : <b>{classes.length}</b> classes</div>

      <div style={styles.grid}>
        {classes.length === 0 ? (
          <div style={styles.vide}>Aucune classe trouvée — cliquez sur + Ajouter</div>
        ) : classes.map(c => (
          <div key={c.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>🏫</span>
              <span style={styles.cardNom}>{c.nom}</span>
            </div>
            <div style={styles.cardInfo}>
              <div style={styles.cardRow}><span style={styles.cardLabel}>Niveau :</span> {c.niveau || '—'}</div>
              <div style={styles.cardRow}><span style={styles.cardLabel}>Année :</span> {c.annee_scolaire || '—'}</div>
              <div style={styles.cardRow}><span style={styles.cardLabel}>Prof principal :</span> {c.prof_prenom ? c.prof_prenom + ' ' + c.prof_nom : '—'}</div>
              <div style={styles.cardRow}><span style={styles.cardLabel}>Élèves :</span> <span style={styles.badge}>{c.nb_eleves}</span></div>
            </div>
            <div style={styles.cardActions}>
              {isAdmin() && <><button style={styles.btnEdit} onClick={() => handleEdit(c)}>✏️ Modifier</button><button style={styles.btnDelete} onClick={() => handleDelete(c.id)}>🗑️ Supprimer</button></>}
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
  btnAjouter: { padding: '10px 20px', background: '#fbbc04', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  statBadge: { display: 'inline-block', background: '#fff8e1', padding: '6px 14px', borderRadius: '20px', fontSize: '14px', color: '#f57f17', marginBottom: '20px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  card: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderTop: '4px solid #fbbc04' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' },
  cardIcon: { fontSize: '28px' },
  cardNom: { fontSize: '20px', fontWeight: '700' },
  cardInfo: { marginBottom: '15px' },
  cardRow: { fontSize: '14px', marginBottom: '6px', color: '#555' },
  cardLabel: { fontWeight: '600', color: '#333' },
  badge: { display: 'inline-block', background: '#e3f2fd', color: '#1a73e8', padding: '2px 10px', borderRadius: '12px', fontWeight: '600', fontSize: '13px' },
  cardActions: { display: 'flex', gap: '8px' },
  btnEdit: { flex: 1, padding: '8px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  btnDelete: { flex: 1, padding: '8px', background: '#ffebee', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#c62828' },
  vide: { padding: '40px', textAlign: 'center', color: '#888', background: 'white', borderRadius: '12px', gridColumn: '1/-1' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '30px', borderRadius: '16px', width: '500px' },
  modalTitre: { fontSize: '20px', fontWeight: '700', marginBottom: '20px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  formChamp: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#555' },
  input: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
  btnAnnuler: { padding: '10px 20px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  btnSauver: { padding: '10px 20px', background: '#fbbc04', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
};