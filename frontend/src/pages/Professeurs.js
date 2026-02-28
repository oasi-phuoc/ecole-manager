import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';
const CONTRATS = ['CDI', 'CDD', 'Temps partiel', 'Vacataire', 'Stagiaire'];
const PERMIS = ['Citoyen CH', 'Permis C', 'Permis B', 'Permis L', 'Permis G', 'Autre'];
const MAX_PERIODES = 32;

export default function Professeurs() {
  const [profs, setProfs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [profEdit, setProfEdit] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', mot_de_passe: '', telephone: '',
    specialite: '', adresse: '', npa: '', lieu: '', sexe: '',
    taux_activite: '', periodes_semaine: '', date_naissance: '',
    avs: '', type_contrat: '', type_permis: ''
  });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerProfs(); }, []);

  const chargerProfs = async () => {
    try {
      const res = await axios.get(API + '/profs', { headers });
      setProfs(res.data);
    } catch (err) { console.error(err); }
  };

  const calculerPeriodes = (taux) => {
    if (!taux) return '';
    return Math.round((parseInt(taux) / 100) * MAX_PERIODES);
  };

  const handleTauxChange = (val) => {
    const periodes = calculerPeriodes(val);
    setForm({ ...form, taux_activite: val, periodes_semaine: periodes });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (profEdit) {
        await axios.put(API + '/profs/' + profEdit.id, form, { headers });
      } else {
        await axios.post(API + '/profs', form, { headers });
      }
      setShowForm(false);
      setProfEdit(null);
      resetForm();
      chargerProfs();
    } catch (err) { alert('Erreur: ' + (err.response?.data?.message || err.message)); }
  };

  const resetForm = () => setForm({
    nom: '', prenom: '', email: '', mot_de_passe: '', telephone: '',
    specialite: '', adresse: '', npa: '', lieu: '', sexe: '',
    taux_activite: '', periodes_semaine: '', date_naissance: '',
    avs: '', type_contrat: '', type_permis: ''
  });

  const handleEdit = (p) => {
    setProfEdit(p);
    setForm({
      nom: p.nom || '', prenom: p.prenom || '', email: p.email || '', mot_de_passe: '',
      telephone: p.telephone || '', specialite: p.specialite || '',
      adresse: p.adresse || '', npa: p.npa || '', lieu: p.lieu || '',
      sexe: p.sexe || '', taux_activite: p.taux_activite || '',
      periodes_semaine: p.periodes_semaine || calculerPeriodes(p.taux_activite) || '',
      date_naissance: p.date_naissance ? p.date_naissance.substring(0,10) : '',
      avs: p.avs || '', type_contrat: p.type_contrat || '', type_permis: p.type_permis || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce professeur ?')) {
      await axios.delete(API + '/profs/' + id, { headers });
      chargerProfs();
    }
  };

  const toggleStatut = async (p) => {
    if (!isAdmin()) return;
    try {
      await axios.put(API + '/profs/' + p.id, { ...p, actif: !p.actif }, { headers });
      chargerProfs();
    } catch (err) { alert('Erreur: ' + err.message); }
  };

  const profsFiltres = profs.filter(p => {
    const matchRecherche = (p.nom + ' ' + p.prenom + ' ' + p.email).toLowerCase().includes(recherche.toLowerCase());
    const matchStatut = filtreStatut === 'tous' || (filtreStatut === 'actif' && p.actif !== false) || (filtreStatut === 'inactif' && p.actif === false);
    return matchRecherche && matchStatut;
  });

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={styles.titre}>👨‍🏫 Gestion des Professeurs</h2>
        <div style={styles.headerRight}>
          <input style={styles.recherche} placeholder="🔍 Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} />
          <div style={styles.filtreStatut}>
            {[{id:'tous',label:'Tous'},{id:'actif',label:'✅ Actifs'},{id:'inactif',label:'❌ Inactifs'}].map(f => (
              <button key={f.id}
                style={{...styles.filtrBtn, ...(filtreStatut===f.id?styles.filtrBtnActif:{})}}
                onClick={() => setFiltreStatut(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          {isAdmin() && (
            <button style={styles.btnAjouter} onClick={() => { setShowForm(true); setProfEdit(null); resetForm(); }}>
              + Ajouter
            </button>
          )}
        </div>
      </div>

      <div style={styles.statBadge}>Total : <b>{profs.length}</b> professeurs</div>

      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitre}>{profEdit ? 'Modifier' : 'Ajouter'} un professeur</h3>
            <form onSubmit={handleSubmit}>

              <div style={styles.sectionTitre}>🔐 Informations de connexion</div>
              <div style={styles.formGrid}>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Email *</label>
                  <input style={styles.input} type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>{profEdit ? 'Nouveau mot de passe' : 'Mot de passe *'}</label>
                  <input style={styles.input} type="password" required={!profEdit} value={form.mot_de_passe} onChange={e => setForm({ ...form, mot_de_passe: e.target.value })} />
                </div>
              </div>

              <div style={styles.sectionTitre}>👤 Informations personnelles</div>
              <div style={styles.formGrid}>
                <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                  <label style={styles.label}>Sexe *</label>
                  <div style={styles.radioGroup}>
                    {['Masculin', 'Féminin'].map(s => (
                      <label key={s} style={styles.radioLabel}>
                        <input type="radio" name="sexe" value={s} required checked={form.sexe === s}
                          onChange={e => setForm({ ...form, sexe: e.target.value })} />
                        <span style={{ marginLeft: '6px' }}>{s}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={styles.formChamp}>
                  <label style={styles.label}>Nom *</label>
                  <input style={styles.input} type="text" required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Prénom *</label>
                  <input style={styles.input} type="text" required value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} />
                </div>

                <div style={styles.formChamp}>
                  <label style={styles.label}>Taux d'activité (%) *</label>
                  <input style={styles.input} type="number" min="10" max="100" step="5" required
                    value={form.taux_activite} onChange={e => handleTauxChange(e.target.value)}
                    placeholder="Ex: 100" />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Périodes / semaine * <span style={{color:'#888',fontSize:11}}>(max {MAX_PERIODES})</span></label>
                  <input style={styles.input} type="number" min="1" max={MAX_PERIODES} required
                    value={form.periodes_semaine}
                    onChange={e => setForm({ ...form, periodes_semaine: e.target.value })}
                    placeholder="Calculé auto ou saisie manuelle" />
                </div>

                <div style={styles.formChamp}>
                  <label style={styles.label}>Date de naissance</label>
                  <input style={styles.input} type="date" value={form.date_naissance} onChange={e => setForm({ ...form, date_naissance: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Téléphone</label>
                  <input style={styles.input} type="text" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} placeholder="Ex: 079 123 45 67" />
                </div>

                <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                  <label style={styles.label}>Adresse (Rue)</label>
                  <input style={styles.input} type="text" value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} placeholder="Ex: Rue de la Paix 10" />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>NPA</label>
                  <input style={styles.input} type="text" value={form.npa} onChange={e => setForm({ ...form, npa: e.target.value })} placeholder="Ex: 1950" />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Lieu</label>
                  <input style={styles.input} type="text" value={form.lieu} onChange={e => setForm({ ...form, lieu: e.target.value })} placeholder="Ex: Sion" />
                </div>

                <div style={styles.formChamp}>
                  <label style={styles.label}>Numéro AVS</label>
                  <input style={styles.input} type="text" value={form.avs} onChange={e => setForm({ ...form, avs: e.target.value })} placeholder="756.XXXX.XXXX.XX" />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Spécialité</label>
                  <input style={styles.input} type="text" value={form.specialite} onChange={e => setForm({ ...form, specialite: e.target.value })} placeholder="Ex: Mathématiques" />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Type de contrat</label>
                  <select style={styles.input} value={form.type_contrat} onChange={e => setForm({ ...form, type_contrat: e.target.value })}>
                    <option value="">-- Choisir --</option>
                    {CONTRATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Type de permis</label>
                  <select style={styles.input} value={form.type_permis} onChange={e => setForm({ ...form, type_permis: e.target.value })}>
                    <option value="">-- Choisir --</option>
                    {PERMIS.map(p => <option key={p} value={p}>{p}</option>)}
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

      <table style={styles.table}>
        <thead>
          <tr style={styles.theadRow}>
            {['Nom', 'Prénom', 'Email', 'Date naissance', 'Téléphone', 'Statut', 'Date création'].map(h => (
              <th key={h} style={styles.th}>{h}</th>
            ))}
            {isAdmin() && <th style={styles.th}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {profsFiltres.length === 0 ? (
            <tr><td colSpan="8" style={styles.vide}>Aucun professeur trouvé</td></tr>
          ) : profsFiltres.map(p => (
            <tr key={p.id} style={styles.tr}>
              <td style={styles.td}><b>{p.nom}</b></td>
              <td style={styles.td}>{p.prenom}</td>
              <td style={styles.td}>{p.email}</td>
              <td style={styles.td}>{p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr-CH') : '—'}</td>
              <td style={styles.td}>{p.telephone || '—'}</td>
              <td style={styles.td}>
                <button
                  style={p.actif !== false ? styles.badgeActif : styles.badgeInactif}
                  onClick={() => toggleStatut(p)}
                  title={isAdmin() ? 'Cliquer pour changer' : ''}>
                  {p.actif !== false ? '✅ Actif' : '❌ Inactif'}
                </button>
              </td>
              <td style={styles.td}>{p.created_at ? new Date(p.created_at).toLocaleDateString('fr-CH') : '—'}</td>
              {isAdmin() && (
                <td style={styles.td}>
                  <button style={styles.btnEdit} onClick={() => handleEdit(p)}>✏️</button>
                  <button style={styles.btnDelete} onClick={() => handleDelete(p.id)}>🗑️</button>
                </td>
              )}
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
  filtreStatut: { display: 'flex', gap: '6px' },
  filtrBtn: { padding: '8px 14px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  filtrBtnActif: { background: '#34a853', color: 'white', border: '2px solid #34a853' },
  btnAjouter: { padding: '10px 20px', background: '#34a853', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  statBadge: { display: 'inline-block', background: '#e8f5e9', padding: '6px 14px', borderRadius: '20px', fontSize: '14px', color: '#34a853', marginBottom: '15px' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  theadRow: { background: '#34a853', color: 'white' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '10px 16px', fontSize: '14px' },
  vide: { padding: '40px', textAlign: 'center', color: '#888' },
  badgeActif: { background: '#e8f5e9', color: '#2e7d32', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer' },
  badgeInactif: { background: '#ffebee', color: '#c62828', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer' },
  btnEdit: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', marginRight: '8px' },
  btnDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '30px', borderRadius: '16px', width: '600px', maxHeight: '85vh', overflowY: 'auto' },
  modalTitre: { fontSize: '20px', fontWeight: '700', marginBottom: '20px' },
  sectionTitre: { fontSize: '14px', fontWeight: '700', color: '#1a73e8', background: '#e8f0fe', padding: '8px 12px', borderRadius: '8px', marginBottom: '15px', marginTop: '10px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '10px' },
  formChamp: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#555' },
  input: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' },
  radioGroup: { display: 'flex', gap: '20px', padding: '10px 0' },
  radioLabel: { display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
  btnAnnuler: { padding: '10px 20px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  btnSauver: { padding: '10px 20px', background: '#34a853', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
};