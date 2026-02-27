import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';
const TYPES = ['Evenement', 'Conge', 'Examen', 'Reunion', 'Sortie', 'Autre'];
const COULEURS = ['#1a73e8', '#34a853', '#ea4335', '#fbbc04', '#9c27b0', '#ff9800'];
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

export default function Calendrier() {
  const [evenements, setEvenements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [eventEdit, setEventEdit] = useState(null);
  const [moisActuel, setMoisActuel] = useState(new Date().getMonth());
  const [anneeActuelle, setAnneeActuelle] = useState(new Date().getFullYear());
  const [form, setForm] = useState({ titre: '', description: '', date_debut: '', date_fin: '', type: 'Evenement', couleur: '#1a73e8' });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerEvenements(); }, []);

  const chargerEvenements = async () => {
    try {
      const res = await axios.get(API + '/calendrier', { headers });
      setEvenements(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (eventEdit) {
        await axios.put(API + '/calendrier/' + eventEdit.id, form, { headers });
      } else {
        await axios.post(API + '/calendrier', form, { headers });
      }
      setShowForm(false);
      setEventEdit(null);
      setForm({ titre: '', description: '', date_debut: '', date_fin: '', type: 'Evenement', couleur: '#1a73e8' });
      chargerEvenements();
    } catch (err) { alert('Erreur: ' + (err.response?.data?.message || err.message)); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cet événement ?')) {
      await axios.delete(API + '/calendrier/' + id, { headers });
      chargerEvenements();
    }
  };

  const handleEdit = (ev) => {
    setEventEdit(ev);
    setForm({
      titre: ev.titre,
      description: ev.description || '',
      date_debut: ev.date_debut.split('T')[0],
      date_fin: ev.date_fin ? ev.date_fin.split('T')[0] : '',
      type: ev.type,
      couleur: ev.couleur
    });
    setShowForm(true);
  };

  const handleJourClick = (date) => {
    setEventEdit(null);
    setForm({ titre: '', description: '', date_debut: date, date_fin: date, type: 'Evenement', couleur: '#1a73e8' });
    setShowForm(true);
  };

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const getEvenementsJour = (jour) => {
    const dateStr = anneeActuelle + '-' + String(moisActuel + 1).padStart(2, '0') + '-' + String(jour).padStart(2, '0');
    return evenements.filter(ev => {
      const debut = ev.date_debut.split('T')[0];
      const fin = ev.date_fin ? ev.date_fin.split('T')[0] : debut;
      return dateStr >= debut && dateStr <= fin;
    });
  };

  const moisPrecedent = () => {
    if (moisActuel === 0) { setMoisActuel(11); setAnneeActuelle(a => a - 1); }
    else setMoisActuel(m => m - 1);
  };

  const moisSuivant = () => {
    if (moisActuel === 11) { setMoisActuel(0); setAnneeActuelle(a => a + 1); }
    else setMoisActuel(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(moisActuel, anneeActuelle);
  const firstDay = getFirstDayOfMonth(moisActuel, anneeActuelle);
  const today = new Date().toISOString().split('T')[0];
  const evenementsMois = evenements.filter(ev => {
    const debut = new Date(ev.date_debut);
    return debut.getMonth() === moisActuel && debut.getFullYear() === anneeActuelle;
  });

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={styles.titre}>📆 Calendrier</h2>
        {isAdmin() && <button style={styles.btnAjouter} onClick={() => { setEventEdit(null); setForm({ titre: '', description: '', date_debut: '', date_fin: '', type: 'Evenement', couleur: '#1a73e8' }); setShowForm(true); }}>+ Ajouter</button>}
      </div>

      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitre}>{eventEdit ? 'Modifier' : 'Ajouter'} un événement</h3>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                  <label style={styles.label}>Titre *</label>
                  <input style={styles.input} type="text" required value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} placeholder="Ex: Réunion parents, Examen final..." />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Date début *</label>
                  <input style={styles.input} type="date" required value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Date fin</label>
                  <input style={styles.input} type="date" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Type</label>
                  <select style={styles.input} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Couleur</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '5px' }}>
                    {COULEURS.map(c => (
                      <div key={c} onClick={() => setForm({ ...form, couleur: c })}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer', border: form.couleur === c ? '3px solid #333' : '3px solid transparent' }} />
                    ))}
                  </div>
                </div>
                <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                  <label style={styles.label}>Description</label>
                  <textarea style={{ ...styles.input, height: '80px', resize: 'vertical' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description optionnelle..." />
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

      <div style={styles.calendarContainer}>
        <div style={styles.calendarNav}>
          <button style={styles.navBtn} onClick={moisPrecedent}>◀</button>
          <h3 style={styles.calendarTitre}>{MOIS[moisActuel]} {anneeActuelle}</h3>
          <button style={styles.navBtn} onClick={moisSuivant}>▶</button>
          <button style={styles.btnAujourdhui} onClick={() => { setMoisActuel(new Date().getMonth()); setAnneeActuelle(new Date().getFullYear()); }}>Aujourd'hui</button>
        </div>

        <div style={styles.calendarGrid}>
          {JOURS.map(j => <div key={j} style={styles.jourHeader}>{j}</div>)}
          {Array.from({ length: firstDay }).map((_, i) => <div key={'empty-' + i} style={styles.jourVide} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const jour = i + 1;
            const dateStr = anneeActuelle + '-' + String(moisActuel + 1).padStart(2, '0') + '-' + String(jour).padStart(2, '0');
            const eventsJour = getEvenementsJour(jour);
            const isToday = dateStr === today;
            return (
              <div key={jour} style={{ ...styles.jourCell, background: isToday ? '#e3f2fd' : 'white', border: isToday ? '2px solid #1a73e8' : '1px solid #e0e0e0' }}
                onClick={() => handleJourClick(dateStr)}>
                <div style={{ ...styles.jourNum, color: isToday ? '#1a73e8' : '#333', fontWeight: isToday ? '700' : '400' }}>{jour}</div>
                {eventsJour.slice(0, 3).map(ev => (
                  <div key={ev.id} style={{ ...styles.eventPill, background: ev.couleur }}
                    onClick={e => { e.stopPropagation(); handleEdit(ev); }}>
                    {ev.titre}
                  </div>
                ))}
                {eventsJour.length > 3 && <div style={styles.plusEvents}>+{eventsJour.length - 3}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {evenementsMois.length > 0 && (
        <div style={styles.listeEvenements}>
          <h3 style={styles.listeTitre}>📋 Événements de {MOIS[moisActuel]}</h3>
          {evenementsMois.map(ev => (
            <div key={ev.id} style={{ ...styles.eventCard, borderLeft: '4px solid ' + ev.couleur }}>
              <div style={styles.eventCardLeft}>
                <div style={styles.eventCardTitre}>{ev.titre}</div>
                <div style={styles.eventCardDate}>
                  📅 {new Date(ev.date_debut).toLocaleDateString('fr-CH')}
                  {ev.date_fin && ev.date_fin !== ev.date_debut ? ' → ' + new Date(ev.date_fin).toLocaleDateString('fr-CH') : ''}
                  <span style={{ ...styles.typeBadge, background: ev.couleur + '22', color: ev.couleur, marginLeft: '10px' }}>{ev.type}</span>
                </div>
                {ev.description && <div style={styles.eventCardDesc}>{ev.description}</div>}
              </div>
              <div style={styles.eventCardActions}>
                {isAdmin() && <><button style={styles.btnEdit} onClick={() => handleEdit(ev)}>✏️</button><button style={styles.btnDelete} onClick={() => handleDelete(ev.id)}>🗑️</button></>}
              </div>
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
  calendarContainer: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '20px' },
  calendarNav: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' },
  navBtn: { padding: '8px 14px', background: '#f0f2f5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' },
  calendarTitre: { fontSize: '20px', fontWeight: '700', flex: 1, textAlign: 'center' },
  btnAujourdhui: { padding: '8px 16px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' },
  jourHeader: { padding: '8px', textAlign: 'center', fontWeight: '700', fontSize: '13px', color: '#888', background: '#f8f9fa', borderRadius: '6px' },
  jourVide: { minHeight: '90px' },
  jourCell: { minHeight: '90px', padding: '6px', borderRadius: '8px', cursor: 'pointer', overflow: 'hidden' },
  jourNum: { fontSize: '14px', marginBottom: '4px' },
  eventPill: { fontSize: '11px', color: 'white', padding: '2px 6px', borderRadius: '4px', marginBottom: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' },
  plusEvents: { fontSize: '11px', color: '#888', padding: '2px 4px' },
  listeEvenements: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  listeTitre: { fontSize: '16px', fontWeight: '700', marginBottom: '15px' },
  eventCard: { padding: '12px 16px', borderRadius: '8px', background: '#f8f9fa', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  eventCardLeft: { flex: 1 },
  eventCardTitre: { fontWeight: '700', fontSize: '15px', marginBottom: '4px' },
  eventCardDate: { fontSize: '13px', color: '#666', marginBottom: '4px', display: 'flex', alignItems: 'center', flexWrap: 'wrap' },
  eventCardDesc: { fontSize: '13px', color: '#888' },
  eventCardActions: { display: 'flex', gap: '8px' },
  typeBadge: { padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' },
  btnEdit: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' },
  btnDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '30px', borderRadius: '16px', width: '520px', maxHeight: '80vh', overflowY: 'auto' },
  modalTitre: { fontSize: '20px', fontWeight: '700', marginBottom: '20px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  formChamp: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#555' },
  input: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
  btnAnnuler: { padding: '10px 20px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  btnSauver: { padding: '10px 20px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
};