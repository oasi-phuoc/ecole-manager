import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const COULEURS = { 'Lundi': '#1a73e8', 'Mardi': '#34a853', 'Mercredi': '#fbbc04', 'Jeudi': '#ea4335', 'Vendredi': '#9c27b0' };

export default function EmploiDuTemps() {
  const [cours, setCours] = useState([]);
  const [classes, setClasses] = useState([]);
  const [profs, setProfs] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [classeSelectionnee, setClasseSelectionnee] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showMatiereForm, setShowMatiereForm] = useState(false);
  const [coursEdit, setCoursEdit] = useState(null);
  const [form, setForm] = useState({ classe_id: '', matiere_id: '', prof_id: '', jour: 'Lundi', heure_debut: '08:00', heure_fin: '09:00', salle: '' });
  const [matiereForm, setMatiereForm] = useState({ nom: '', code: '', coefficient: 1 });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => {
    chargerClasses();
    chargerProfs();
    chargerMatieres();
  }, []);

  useEffect(() => {
    if (classeSelectionnee) chargerCours();
  }, [classeSelectionnee]);

  const chargerCours = async () => {
    try {
      const res = await axios.get(API + '/emploi-du-temps?classe_id=' + classeSelectionnee, { headers });
      setCours(res.data);
    } catch (err) { console.error(err); }
  };

  const chargerClasses = async () => {
    try {
      const res = await axios.get(API + '/classes', { headers });
      setClasses(res.data);
      if (res.data.length > 0) setClasseSelectionnee(res.data[0].id);
    } catch (err) { console.error(err); }
  };

  const chargerProfs = async () => {
    try {
      const res = await axios.get(API + '/profs', { headers });
      setProfs(res.data);
    } catch (err) { console.error(err); }
  };

  const chargerMatieres = async () => {
    try {
      const res = await axios.get(API + '/emploi-du-temps/matieres', { headers });
      setMatieres(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (coursEdit) {
        await axios.put(API + '/emploi-du-temps/' + coursEdit.id, form, { headers });
      } else {
        await axios.post(API + '/emploi-du-temps', form, { headers });
      }
      setShowForm(false);
      setCoursEdit(null);
      chargerCours();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleMatiereSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API + '/emploi-du-temps/matieres', matiereForm, { headers });
      setShowMatiereForm(false);
      setMatiereForm({ nom: '', code: '', coefficient: 1 });
      chargerMatieres();
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEdit = (c) => {
    setCoursEdit(c);
    setForm({ classe_id: c.classe_id, matiere_id: c.matiere_id, prof_id: c.prof_id, jour: c.jour, heure_debut: c.heure_debut, heure_fin: c.heure_fin, salle: c.salle || '' });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce cours ?')) {
      await axios.delete(API + '/emploi-du-temps/' + id, { headers });
      chargerCours();
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={styles.titre}>📅 Emploi du Temps</h2>
        <div style={styles.headerRight}>
          <select style={styles.select} value={classeSelectionnee} onChange={e => setClasseSelectionnee(e.target.value)}>
            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          {isAdmin() && <button style={styles.btnAjouter} onClick={() => { setShowForm(true); setCoursEdit(null); setForm({ classe_id: '', matiere_id: '', prof_id: '', jour: 'Lundi', heure_debut: '08:00', heure_fin: '09:00', salle: '' }); }}>+ Cours</button>}
        </div>
      </div>

      {showMatiereForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitre}>Ajouter une matière</h3>
            <form onSubmit={handleMatiereSubmit}>
              <div style={styles.formChamp}>
                <label style={styles.label}>Nom *</label>
                <input style={styles.input} type="text" required value={matiereForm.nom} onChange={e => setMatiereForm({ ...matiereForm, nom: e.target.value })} placeholder="Ex: Mathématiques" />
              </div>
              <div style={styles.formChamp}>
                <label style={styles.label}>Code</label>
                <input style={styles.input} type="text" value={matiereForm.code} onChange={e => setMatiereForm({ ...matiereForm, code: e.target.value })} placeholder="Ex: MATH" />
              </div>
              <div style={styles.formChamp}>
                <label style={styles.label}>Coefficient</label>
                <input style={styles.input} type="number" min="1" max="10" value={matiereForm.coefficient} onChange={e => setMatiereForm({ ...matiereForm, coefficient: e.target.value })} />
              </div>
              <div style={styles.formActions}>
                <button type="button" style={styles.btnAnnuler} onClick={() => setShowMatiereForm(false)}>Annuler</button>
                <button type="submit" style={styles.btnSauver}>Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitre}>{coursEdit ? 'Modifier' : 'Ajouter'} un cours</h3>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Classe *</label>
                  <select style={styles.input} required value={form.classe_id} onChange={e => setForm({ ...form, classe_id: e.target.value })}>
                    <option value="">-- Choisir --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Matière *</label>
                  <select style={styles.input} required value={form.matiere_id} onChange={e => setForm({ ...form, matiere_id: e.target.value })}>
                    <option value="">-- Choisir --</option>
                    {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                  </select>
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Professeur *</label>
                  <select style={styles.input} required value={form.prof_id} onChange={e => setForm({ ...form, prof_id: e.target.value })}>
                    <option value="">-- Choisir --</option>
                    {profs.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
                  </select>
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Jour *</label>
                  <select style={styles.input} value={form.jour} onChange={e => setForm({ ...form, jour: e.target.value })}>
                    {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Heure début *</label>
                  <input style={styles.input} type="time" required value={form.heure_debut} onChange={e => setForm({ ...form, heure_debut: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Heure fin *</label>
                  <input style={styles.input} type="time" required value={form.heure_fin} onChange={e => setForm({ ...form, heure_fin: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Salle</label>
                  <input style={styles.input} type="text" value={form.salle} onChange={e => setForm({ ...form, salle: e.target.value })} placeholder="Ex: Salle 101" />
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

      <div style={styles.grille}>
        {JOURS.map(jour => {
          const coursJour = cours.filter(c => c.jour === jour);
          return (
            <div key={jour} style={styles.colonneJour}>
              <div style={{ ...styles.headerJour, background: COULEURS[jour] }}>{jour}</div>
              {coursJour.length === 0 ? (
                <div style={styles.videJour}>Pas de cours</div>
              ) : coursJour.map(c => (
                <div key={c.id} style={{ ...styles.cartesCours, borderLeft: '4px solid ' + COULEURS[jour] }}>
                  <div style={styles.coursHeure}>{c.heure_debut.slice(0,5)} - {c.heure_fin.slice(0,5)}</div>
                  <div style={styles.coursMatiere}>{c.matiere}</div>
                  <div style={styles.coursProf}>👨‍🏫 {c.prof_prenom} {c.prof_nom}</div>
                  {c.salle && <div style={styles.coursSalle}>🚪 {c.salle}</div>}
                  <div style={styles.coursActions}>
                    {isAdmin() && <><button style={styles.btnEdit} onClick={() => handleEdit(c)}>✏️</button><button style={styles.btnDelete} onClick={() => handleDelete(c.id)}>🗑️</button></>}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
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
  select: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' },
  btnMatiere: { padding: '10px 16px', background: '#9c27b0', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  btnAjouter: { padding: '10px 20px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  grille: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px' },
  colonneJour: { background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  headerJour: { color: 'white', padding: '12px', textAlign: 'center', fontWeight: '700', fontSize: '15px' },
  videJour: { padding: '20px', textAlign: 'center', color: '#bbb', fontSize: '13px' },
  cartesCours: { margin: '8px', padding: '10px', background: '#f8f9fa', borderRadius: '8px' },
  coursHeure: { fontSize: '12px', color: '#888', marginBottom: '4px' },
  coursMatiere: { fontSize: '14px', fontWeight: '700', marginBottom: '4px' },
  coursProf: { fontSize: '12px', color: '#555', marginBottom: '2px' },
  coursSalle: { fontSize: '12px', color: '#555' },
  coursActions: { display: 'flex', gap: '5px', marginTop: '8px' },
  btnEdit: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' },
  btnDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '30px', borderRadius: '16px', width: '500px', maxHeight: '80vh', overflowY: 'auto' },
  modalTitre: { fontSize: '20px', fontWeight: '700', marginBottom: '20px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  formChamp: { display: 'flex', flexDirection: 'column', marginBottom: '15px' },
  label: { fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#555' },
  input: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' },
  btnAnnuler: { padding: '10px 20px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  btnSauver: { padding: '10px 20px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
};