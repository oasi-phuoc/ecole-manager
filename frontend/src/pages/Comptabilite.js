import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';
const TYPES = ['Ecolage', 'Fournitures', 'Cantine', 'Transport', 'Sortie', 'Assurance', 'Autre'];
const STATUTS = [
  { val: 'en_attente', label: '⏳ En attente', color: '#fbbc04', bg: '#fff8e1' },
  { val: 'paye', label: '✅ Payé', color: '#34a853', bg: '#e8f5e9' },
  { val: 'en_retard', label: '❌ En retard', color: '#ea4335', bg: '#ffebee' },
  { val: 'annule', label: '🚫 Annulé', color: '#888', bg: '#f5f5f5' },
];

export default function Comptabilite() {
  const [paiements, setPaiements] = useState([]);
  const [stats, setStats] = useState(null);
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreClasse, setFiltreClasse] = useState('');
  const [onglet, setOnglet] = useState('liste');
  const [showForm, setShowForm] = useState(false);
  const [paiementEdit, setPaiementEdit] = useState(null);
  const [form, setForm] = useState({ eleve_id: '', montant: '', type: 'Ecolage', statut: 'en_attente', date_paiement: '', commentaire: '' });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerPaiements(); chargerStats(); chargerEleves(); chargerClasses(); }, []);
  useEffect(() => { chargerPaiements(); }, [filtreStatut, filtreClasse]);

  const chargerPaiements = async () => {
    try {
      let url = API + '/comptabilite?';
      if (filtreStatut) url += 'statut=' + filtreStatut + '&';
      if (filtreClasse) url += 'classe_id=' + filtreClasse;
      const res = await axios.get(url, { headers });
      setPaiements(res.data);
    } catch (err) { console.error(err); }
  };

  const chargerStats = async () => {
    try {
      const res = await axios.get(API + '/comptabilite/statistiques', { headers });
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  const chargerEleves = async () => {
    try {
      const res = await axios.get(API + '/eleves', { headers });
      setEleves(res.data);
    } catch (err) { console.error(err); }
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
      if (paiementEdit) {
        await axios.put(API + '/comptabilite/' + paiementEdit.id, form, { headers });
      } else {
        await axios.post(API + '/comptabilite', form, { headers });
      }
      setShowForm(false);
      setPaiementEdit(null);
      setForm({ eleve_id: '', montant: '', type: 'Ecolage', statut: 'en_attente', date_paiement: '', commentaire: '' });
      chargerPaiements();
      chargerStats();
    } catch (err) { alert('Erreur: ' + (err.response?.data?.message || err.message)); }
  };

  const handleEdit = (p) => {
    setPaiementEdit(p);
    setForm({ eleve_id: p.eleve_id, montant: p.montant, type: p.type, statut: p.statut, date_paiement: p.date_paiement ? p.date_paiement.split('T')[0] : '', commentaire: p.commentaire || '' });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce paiement ?')) {
      await axios.delete(API + '/comptabilite/' + id, { headers });
      chargerPaiements();
      chargerStats();
    }
  };

  const getStatut = (val) => STATUTS.find(s => s.val === val) || STATUTS[0];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={styles.titre}>💰 Comptabilité</h2>
        <button style={styles.btnAjouter} onClick={() => { setPaiementEdit(null); setForm({ eleve_id: '', montant: '', type: 'Ecolage', statut: 'en_attente', date_paiement: new Date().toISOString().split('T')[0], commentaire: '' }); setShowForm(true); }}>+ Ajouter</button>
      </div>

      {stats && (
        <div style={styles.statsGrid}>
          <div style={{ ...styles.statCard, borderTop: '4px solid #34a853' }}>
            <div style={styles.statIcon}>✅</div>
            <div style={styles.statValeur}>{parseFloat(stats.total_encaisse).toFixed(2)} CHF</div>
            <div style={styles.statLabel}>Total encaissé</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #fbbc04' }}>
            <div style={styles.statIcon}>⏳</div>
            <div style={styles.statValeur}>{parseFloat(stats.en_attente.total).toFixed(2)} CHF</div>
            <div style={styles.statLabel}>En attente ({stats.en_attente.nb})</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #ea4335' }}>
            <div style={styles.statIcon}>❌</div>
            <div style={styles.statValeur}>{parseFloat(stats.en_retard.total).toFixed(2)} CHF</div>
            <div style={styles.statLabel}>En retard ({stats.en_retard.nb})</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #1a73e8' }}>
            <div style={styles.statIcon}>📊</div>
            <div style={styles.statValeur}>{paiements.length}</div>
            <div style={styles.statLabel}>Total transactions</div>
          </div>
        </div>
      )}

      <div style={styles.onglets}>
        <button style={{ ...styles.onglet, ...(onglet === 'liste' ? styles.ongletActif : {}) }} onClick={() => setOnglet('liste')}>📋 Liste des paiements</button>
        <button style={{ ...styles.onglet, ...(onglet === 'stats' ? styles.ongletActif : {}) }} onClick={() => setOnglet('stats')}>📊 Par type</button>
      </div>

      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitre}>{paiementEdit ? 'Modifier' : 'Ajouter'} un paiement</h3>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                  <label style={styles.label}>Élève *</label>
                  <select style={styles.input} required value={form.eleve_id} onChange={e => setForm({ ...form, eleve_id: e.target.value })}>
                    <option value="">-- Choisir un élève --</option>
                    {eleves.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom} {e.classe ? '(' + e.classe + ')' : ''}</option>)}
                  </select>
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Montant (CHF) *</label>
                  <input style={styles.input} type="number" step="0.05" required value={form.montant} onChange={e => setForm({ ...form, montant: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Type *</label>
                  <select style={styles.input} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Statut</label>
                  <select style={styles.input} value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}>
                    {STATUTS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                  </select>
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Date paiement</label>
                  <input style={styles.input} type="date" value={form.date_paiement} onChange={e => setForm({ ...form, date_paiement: e.target.value })} />
                </div>
                <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                  <label style={styles.label}>Commentaire</label>
                  <input style={styles.input} type="text" value={form.commentaire} onChange={e => setForm({ ...form, commentaire: e.target.value })} placeholder="Ex: Paiement par virement..." />
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

      {onglet === 'liste' && (
        <div>
          <div style={styles.filtres}>
            <select style={styles.select} value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
              <option value="">Tous les statuts</option>
              {STATUTS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
            </select>
            <select style={styles.select} value={filtreClasse} onChange={e => setFiltreClasse(e.target.value)}>
              <option value="">Toutes les classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                {['Élève', 'Classe', 'Type', 'Montant', 'Statut', 'Date', 'Commentaire', 'Actions'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paiements.length === 0 ? (
                <tr><td colSpan="8" style={styles.vide}>Aucun paiement trouvé</td></tr>
              ) : paiements.map(p => {
                const statut = getStatut(p.statut);
                return (
                  <tr key={p.id} style={styles.tr}>
                    <td style={styles.td}><b>{p.prenom} {p.nom}</b></td>
                    <td style={styles.td}>{p.classe || '—'}</td>
                    <td style={styles.td}><span style={styles.typeBadge}>{p.type}</span></td>
                    <td style={{ ...styles.td, fontWeight: '700', color: '#1a73e8' }}>{parseFloat(p.montant).toFixed(2)} CHF</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statutBadge, background: statut.bg, color: statut.color }}>{statut.label}</span>
                    </td>
                    <td style={styles.td}>{p.date_paiement ? new Date(p.date_paiement).toLocaleDateString('fr-CH') : '—'}</td>
                    <td style={styles.td}>{p.commentaire || '—'}</td>
                    <td style={styles.td}>
                      <button style={styles.btnEdit} onClick={() => handleEdit(p)}>✏️</button>
                      <button style={styles.btnDelete} onClick={() => handleDelete(p.id)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {onglet === 'stats' && stats && (
        <div style={styles.statsTypesGrid}>
          {stats.par_type.length === 0 ? (
            <div style={styles.vide}>Aucun paiement encaissé pour le moment</div>
          ) : stats.par_type.map((t, i) => (
            <div key={i} style={styles.typeCard}>
              <div style={styles.typeNom}>{t.type}</div>
              <div style={styles.typeMontant}>{parseFloat(t.total).toFixed(2)} CHF</div>
              <div style={styles.typeNb}>{t.nb} paiement(s)</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '20px', background: '#f0f2f5', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' },
  btnRetour: { padding: '8px 16px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer' },
  titre: { fontSize: '24px', fontWeight: '700', flex: 1 },
  btnAjouter: { padding: '10px 20px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' },
  statCard: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' },
  statIcon: { fontSize: '28px', marginBottom: '8px' },
  statValeur: { fontSize: '22px', fontWeight: '700', color: '#333', marginBottom: '4px' },
  statLabel: { fontSize: '13px', color: '#888' },
  onglets: { display: 'flex', gap: '10px', marginBottom: '20px' },
  onglet: { padding: '10px 20px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  ongletActif: { background: '#1a73e8', color: 'white', border: '2px solid #1a73e8' },
  filtres: { display: 'flex', gap: '10px', marginBottom: '15px' },
  select: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  theadRow: { background: '#1a73e8', color: 'white' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '10px 16px', fontSize: '14px' },
  vide: { padding: '40px', textAlign: 'center', color: '#888', background: 'white', borderRadius: '12px' },
  typeBadge: { background: '#e3f2fd', color: '#1a73e8', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  statutBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  btnEdit: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', marginRight: '8px' },
  btnDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '30px', borderRadius: '16px', width: '550px', maxHeight: '80vh', overflowY: 'auto' },
  modalTitre: { fontSize: '20px', fontWeight: '700', marginBottom: '20px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  formChamp: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#555' },
  input: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
  btnAnnuler: { padding: '10px 20px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  btnSauver: { padding: '10px 20px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  statsTypesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' },
  typeCard: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center', borderTop: '4px solid #34a853' },
  typeNom: { fontSize: '16px', fontWeight: '700', marginBottom: '8px' },
  typeMontant: { fontSize: '22px', fontWeight: '700', color: '#34a853', marginBottom: '4px' },
  typeNb: { fontSize: '13px', color: '#888' },
};