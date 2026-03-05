import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';
const TYPES = ['Ecolage', 'Fournitures', 'Cantine', 'Transport', 'Sortie', 'Assurance', 'Autre'];
const MATERIEL_FACTURATION = [
  { key: 'classeur_7', label: 'Classeur 7 cm', prix: 2.80, qteDefaut: 1 },
  { key: 'classeur_4', label: 'Classeur 4 cm', prix: 2.00, qteDefaut: 1 },
  { key: 'cahier_a4', label: 'Cahier A4', prix: 1.90, qteDefaut: 1 },
  { key: 'feuilles_dessin', label: 'Feuilles de dessin', prix: 10.00, qteDefaut: 1 },
  { key: 'agenda', label: 'Agenda', prix: 12.00, qteDefaut: 1 },
  { key: 'jeux_repertoires', label: 'Jeux de répertoires', prix: 1.60, qteDefaut: 2 },
  { key: 'fixpoint_hb', label: 'Fixpencil pour mines HB', prix: 6.00, qteDefaut: 2 },
  { key: 'boite_mines_hb', label: 'Boîte de mines (HB)', prix: 1.80, qteDefaut: 1 },
  { key: 'gomme', label: 'Gomme', prix: 1.40, qteDefaut: 1 },
  { key: 'crayons_couleur', label: 'Crayons de couleur', prix: 6.90, qteDefaut: 1 },
  { key: 'plume_pilot', label: 'Plume pilot + 3 cartouches', prix: 14.80, qteDefaut: 1 },
];
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
  const [materiels, setMateriels] = useState([]);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreClasse, setFiltreClasse] = useState('');
  const [onglet, setOnglet] = useState('liste');
  const [materielMode, setMaterielMode] = useState('scolaire'); // scolaire | fournitures
  const [classeFacturationId, setClasseFacturationId] = useState('');
  const [materielDistribue, setMaterielDistribue] = useState({});
  const [factureEleve, setFactureEleve] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showMaterielForm, setShowMaterielForm] = useState(false);
  const [paiementEdit, setPaiementEdit] = useState(null);
  const [materielEdit, setMaterielEdit] = useState(null);
  const [form, setForm] = useState({ eleve_id: '', montant: '', type: 'Ecolage', statut: 'en_attente', date_paiement: '', commentaire: '' });
  const [materielForm, setMaterielForm] = useState({ nom: '', section: 'scolaire', prix: '', ref: '', fournisseur: '', rabais: '', remarques: '' });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerPaiements(); chargerStats(); chargerEleves(); chargerClasses(); chargerMateriels(); }, []);
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

  const chargerMateriels = async () => {
    try {
      const res = await axios.get(API + '/comptabilite/materiels', { headers });
      setMateriels(res.data || []);
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

  const ouvrirFormMateriel = (m = null) => {
    setMaterielEdit(m);
    setMaterielForm(m
      ? {
          nom: m.nom || '',
          section: m.section || 'scolaire',
          prix: m.prix != null ? String(m.prix) : '',
          ref: m.ref || '',
          fournisseur: m.fournisseur || '',
          rabais: m.rabais != null ? String(m.rabais) : '',
          remarques: m.remarques || '',
        }
      : { nom: '', section: materielMode === 'fournitures' ? 'fournitures' : 'scolaire', prix: '', ref: '', fournisseur: '', rabais: '', remarques: '' }
    );
    setShowMaterielForm(true);
  };

  const handleSaveMateriel = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...materielForm,
        prix: materielForm.prix === '' ? 0 : parseFloat(materielForm.prix),
        rabais: materielForm.rabais === '' ? 0 : parseFloat(materielForm.rabais),
      };
      if (materielEdit) {
        await axios.put(API + '/comptabilite/materiels/' + materielEdit.id, payload, { headers });
      } else {
        await axios.post(API + '/comptabilite/materiels', payload, { headers });
      }
      setShowMaterielForm(false);
      setMaterielEdit(null);
      await chargerMateriels();
    } catch (err) { alert('Erreur: ' + (err.response?.data?.message || err.message)); }
  };

  const handleDeleteMateriel = async (id) => {
    if (!window.confirm('Supprimer ce matériel ?')) return;
    await axios.delete(API + '/comptabilite/materiels/' + id, { headers });
    await chargerMateriels();
  };

  const getStatut = (val) => STATUTS.find(s => s.val === val) || STATUTS[0];
  const materielsScolaires = materiels.filter(m => (m.section || 'scolaire') === 'scolaire');
  const materielsFournitures = materiels.filter(m => (m.section || 'scolaire') === 'fournitures');
  const materielsFacturation = materielsFournitures.length > 0
    ? materielsFournitures.map(m => ({ id: m.id, nom: m.nom, prix: Number(m.prix || 0), qteDefaut: 1 }))
    : MATERIEL_FACTURATION.map(m => ({ id: m.key, nom: m.label, prix: m.prix, qteDefaut: m.qteDefaut }));
  const totalMateriel = materielsScolaires.reduce((acc, m) => acc + Number(m.prix || 0), 0);
  const elevesClasseFacturation = eleves
    .filter(e => String(e.classe_id || '') === String(classeFacturationId || ''))
    .sort((a, b) => ((a.nom || '') + ' ' + (a.prenom || '')).localeCompare((b.nom || '') + ' ' + (b.prenom || ''), 'fr'));

  const creerLigneDefaut = () => {
    const d = {};
    materielsFacturation.forEach(m => { d[m.id] = m.qteDefaut; });
    return d;
  };

  const majQteMateriel = (eleveId, key, value) => {
    const qte = Math.max(0, parseInt(value || '0', 10) || 0);
    setMaterielDistribue(prev => ({
      ...prev,
      [eleveId]: { ...(prev[eleveId] || creerLigneDefaut()), [key]: qte }
    }));
  };

  const totalEleve = (eleveId) => materielsFacturation.reduce((acc, m) => {
    const q = Number(materielDistribue[eleveId]?.[m.id] ?? m.qteDefaut);
    return acc + (q * m.prix);
  }, 0);

  const totalClasse = elevesClasseFacturation.reduce((acc, e) => acc + totalEleve(e.id), 0);
  const fmtCHF = (v) => 'CHF ' + (Number(v || 0).toFixed(2).replace('.', ','));

  const ouvrirFacture = (eleve) => {
    const classe = classes.find(c => String(c.id) === String(classeFacturationId));
    const lignes = materielsFacturation
      .map(m => {
        const qte = Number(materielDistribue[eleve.id]?.[m.id] ?? m.qteDefaut);
        return { ...m, qte, montant: qte * m.prix };
      })
      .filter(l => l.qte > 0);
    setFactureEleve({
      eleve,
      classeNom: classe?.nom || '—',
      dateFacture: new Date().toLocaleDateString('fr-CH'),
      lignes,
      total: lignes.reduce((acc, l) => acc + l.montant, 0),
    });
  };

  const imprimerFacture = () => {
    const node = document.getElementById('facture-pdf');
    if (!node) return;
    const popup = window.open('', '_blank', 'width=1000,height=800');
    if (!popup) return;
    popup.document.write(`
      <html>
        <head>
          <title>Facture matériel</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color:#111; }
            table { width:100%; border-collapse:collapse; margin-top:14px; }
            th, td { border:1px solid #dbe3ee; padding:8px; font-size:12px; }
            th { background:#f8fafc; text-align:left; }
          </style>
        </head>
        <body>${node.outerHTML}</body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  useEffect(() => {
    if (onglet === 'materiel' && materielMode === 'fournitures' && !classeFacturationId && classes.length > 0) {
      setClasseFacturationId(String(classes[0].id));
    }
  }, [onglet, materielMode, classeFacturationId, classes]);

  useEffect(() => {
    if (!classeFacturationId) return;
    setMaterielDistribue(prev => {
      const next = { ...prev };
      elevesClasseFacturation.forEach(e => {
        if (!next[e.id]) next[e.id] = creerLigneDefaut();
      });
      return next;
    });
  }, [classeFacturationId, eleves.length]);

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

      <div style={styles.ongletsWrap}>
        <div style={styles.onglets}>
          <button style={{ ...styles.onglet, ...(onglet === 'liste' ? styles.ongletActif : {}) }} onClick={() => setOnglet('liste')}>📋 Liste des paiements</button>
          <button style={{ ...styles.onglet, ...(onglet === 'stats' ? styles.ongletActif : {}) }} onClick={() => setOnglet('stats')}>📊 Par type</button>
        </div>
        <button style={{ ...styles.onglet, ...(onglet === 'materiel' ? styles.ongletActif : {}) }} onClick={() => setOnglet('materiel')}>🧰 Matériel</button>
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

      {showMaterielForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitre}>{materielEdit ? 'Modifier' : 'Ajouter'} un matériel</h3>
            <form onSubmit={handleSaveMateriel}>
              <div style={styles.formGrid}>
                <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                  <label style={styles.label}>Nom du matériel *</label>
                  <input style={styles.input} required value={materielForm.nom} onChange={e => setMaterielForm({ ...materielForm, nom: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Section</label>
                  <select style={styles.input} value={materielForm.section} onChange={e => setMaterielForm({ ...materielForm, section: e.target.value })}>
                    <option value="scolaire">Matériel scolaire</option>
                    <option value="fournitures">Fournitures</option>
                  </select>
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Prix</label>
                  <input style={styles.input} type="number" step="0.05" value={materielForm.prix} onChange={e => setMaterielForm({ ...materielForm, prix: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>REF</label>
                  <input style={styles.input} value={materielForm.ref} onChange={e => setMaterielForm({ ...materielForm, ref: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Fournisseur</label>
                  <input style={styles.input} value={materielForm.fournisseur} onChange={e => setMaterielForm({ ...materielForm, fournisseur: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Rabais (%)</label>
                  <input style={styles.input} type="number" step="0.01" value={materielForm.rabais} onChange={e => setMaterielForm({ ...materielForm, rabais: e.target.value })} />
                </div>
                <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                  <label style={styles.label}>Remarques</label>
                  <input style={styles.input} value={materielForm.remarques} onChange={e => setMaterielForm({ ...materielForm, remarques: e.target.value })} />
                </div>
              </div>
              <div style={styles.formActions}>
                <button type="button" style={styles.btnAnnuler} onClick={() => setShowMaterielForm(false)}>Annuler</button>
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

      {onglet === 'materiel' && (
        <div style={styles.cardMateriel}>
          <div style={styles.cardMaterielHeader}>
            <h3 style={styles.cardMaterielTitre}>Gestion du matériel</h3>
            <div style={styles.materielActions}>
              <button style={{ ...styles.materielBtn, ...(materielMode === 'scolaire' ? styles.materielBtnActif : {}) }} onClick={() => setMaterielMode('scolaire')}>
                📚 Matériel scolaire
              </button>
              <button style={{ ...styles.materielBtn, ...(materielMode === 'fournitures' ? styles.materielBtnActif : {}) }} onClick={() => setMaterielMode('fournitures')}>
                🧾 Fournitures
              </button>
            </div>
          </div>
          {materielMode === 'scolaire' ? (
            <>
              <div style={{ padding: '0 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button style={styles.btnAjouter} onClick={() => ouvrirFormMateriel(null)}>+ Ajouter</button>
                <span style={styles.totalMaterielBadge}>Total: {totalMateriel.toFixed(2)} CHF</span>
              </div>
              <table style={styles.tableMateriel}>
                <thead>
                  <tr style={styles.theadRowMateriel}>
                    <th style={styles.thMateriel}>Matériel</th>
                    <th style={{ ...styles.thMateriel, textAlign: 'right' }}>Prix</th>
                    <th style={styles.thMateriel}>REF</th>
                    <th style={styles.thMateriel}>Fournisseur</th>
                    <th style={{ ...styles.thMateriel, textAlign: 'right' }}>Rabais</th>
                    <th style={styles.thMateriel}>Remarques</th>
                    <th style={{ ...styles.thMateriel, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {materielsScolaires.length === 0 ? (
                    <tr><td colSpan="7" style={styles.vide}>Aucun matériel scolaire</td></tr>
                  ) : materielsScolaires.map((m, i) => (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={styles.tdMateriel}>{m.nom}</td>
                      <td style={{ ...styles.tdMateriel, textAlign: 'right' }}>
                        <input style={{ ...styles.input, width: 90, padding: '6px 8px' }} readOnly value={Number(m.prix || 0).toFixed(2)} />
                      </td>
                      <td style={styles.tdMateriel}>{m.ref || '—'}</td>
                      <td style={styles.tdMateriel}>{m.fournisseur || '—'}</td>
                      <td style={{ ...styles.tdMateriel, textAlign: 'right' }}>{Number(m.rabais || 0).toFixed(2)}%</td>
                      <td style={styles.tdMateriel}>{m.remarques || '—'}</td>
                      <td style={{ ...styles.tdMateriel, textAlign: 'center' }}>
                        <button style={styles.btnEdit} onClick={() => ouvrirFormMateriel(m)}>✏️</button>
                        <button style={styles.btnDelete} onClick={() => handleDeleteMateriel(m.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div style={styles.facturationLayout}>
              <div style={styles.classesList}>
                <div style={styles.classesListTitre}>Classes</div>
                {classes.length === 0 ? (
                  <div style={styles.classesVide}>Aucune classe</div>
                ) : classes.map(c => (
                  <button
                    key={c.id}
                    style={{ ...styles.classeBtn, ...(String(c.id) === String(classeFacturationId) ? styles.classeBtnActive : {}) }}
                    onClick={() => setClasseFacturationId(String(c.id))}
                  >
                    {c.nom}
                  </button>
                ))}
              </div>
              <div style={styles.facturationTableWrap}>
                {!classeFacturationId ? (
                  <div style={styles.vide}>Sélectionnez une classe</div>
                ) : (
                  <>
                    <div style={styles.facturationHeader}>
                      <b>Classe: {(classes.find(c => String(c.id) === String(classeFacturationId)) || {}).nom || '—'}</b>
                      <span style={styles.totalMaterielBadge}>Total classe: {totalClasse.toFixed(2)} CHF</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={styles.tableFacturation}>
                        <thead>
                          <tr style={styles.theadRowMateriel}>
                            <th style={styles.thFacturationBase}>Nom</th>
                            <th style={styles.thFacturationBase}>Prénom</th>
                            {materielsFacturation.map(m => (
                              <th key={m.id} style={styles.thFacturationItem} title={m.nom}>{m.nom}</th>
                            ))}
                            <th style={{ ...styles.thFacturationBase, textAlign: 'right' }}>Total élève</th>
                            <th style={{ ...styles.thFacturationBase, textAlign: 'center' }}>Détail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {elevesClasseFacturation.length === 0 ? (
                            <tr><td colSpan={materielsFacturation.length + 4} style={styles.vide}>Aucun élève dans cette classe</td></tr>
                          ) : elevesClasseFacturation.map((e, idx) => (
                            <tr key={e.id} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                              <td style={styles.tdFacturation}>{e.nom || '—'}</td>
                              <td style={styles.tdFacturation}>{e.prenom || '—'}</td>
                              {materielsFacturation.map(m => (
                                <td key={m.id} style={{ ...styles.tdFacturation, textAlign: 'center' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    style={styles.qtyInput}
                                    value={materielDistribue[e.id]?.[m.id] ?? m.qteDefaut}
                                    onChange={ev => majQteMateriel(e.id, m.id, ev.target.value)}
                                  />
                                </td>
                              ))}
                              <td style={{ ...styles.tdFacturation, textAlign: 'right', fontWeight: '700', color: '#1a73e8' }}>
                                {totalEleve(e.id).toFixed(2)} CHF
                              </td>
                              <td style={{ ...styles.tdFacturation, textAlign: 'center' }}>
                                <button style={styles.btnDetailFacture} onClick={() => ouvrirFacture(e)}>Détail</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {factureEleve && (
        <div style={styles.overlay}>
          <div style={styles.modalFacture}>
            <div style={styles.modalFactureActions}>
              <button style={styles.btnAnnuler} onClick={() => setFactureEleve(null)}>Fermer</button>
              <button style={styles.btnSauver} onClick={imprimerFacture}>🖨️ Imprimer / PDF</button>
            </div>
            <div id="facture-pdf" style={styles.factureA4}>
              <div style={styles.factureEnteteTop}>Département de la santé, des affaires sociales et de la culture</div>
              <div style={styles.factureEnteteTop}>Service de l'action sociale</div>
              <div style={styles.factureEnteteTop}>Office de l'asile</div>
              <div style={styles.factureEnteteTop}>Centre de formation "Le Botza"</div>
              <div style={styles.factureEnteteTop}>Zone Industrielle 4, 1963 Vétroz</div>
              <div style={{ ...styles.factureEnteteTop, marginBottom: 12 }}>Tél. 027 606 18 60</div>

              <div style={styles.factureTitre}>FINANCE ECOLAGE & MATERIEL GENERAL</div>
              <div style={styles.factureSousTitre}>Facture du matériel scolaire</div>

              <div style={styles.factureInfos}>
                <div><b>NOM Prénom :</b> {factureEleve.eleve.nom || ''} {factureEleve.eleve.prenom || ''}</div>
                <div><b>Classe :</b> {factureEleve.classeNom}</div>
                <div><b>Date :</b> {factureEleve.dateFacture}</div>
              </div>

              <table style={styles.factureTable}>
                <thead>
                  <tr>
                    <th style={styles.factureTh}>Article</th>
                    <th style={{ ...styles.factureTh, textAlign: 'right' }}>Prix unitaire</th>
                    <th style={{ ...styles.factureTh, textAlign: 'center' }}>Quantité</th>
                    <th style={{ ...styles.factureTh, textAlign: 'right' }}>Prix</th>
                  </tr>
                </thead>
                <tbody>
                  {factureEleve.lignes.map(l => (
                    <tr key={l.id}>
                      <td style={styles.factureTd}>{l.nom}</td>
                      <td style={{ ...styles.factureTd, textAlign: 'right' }}>{fmtCHF(l.prix)}</td>
                      <td style={{ ...styles.factureTd, textAlign: 'center' }}>{l.qte}</td>
                      <td style={{ ...styles.factureTd, textAlign: 'right' }}>{fmtCHF(l.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={styles.factureTotalLigne}>
                <span>Sous-Total</span>
                <b>{fmtCHF(factureEleve.total)}</b>
              </div>
              <div style={styles.factureMontantFinal}>
                <span>MONTANT DE LA FACTURE</span>
                <b>{fmtCHF(factureEleve.total)}</b>
              </div>

              <div style={styles.factureSignature}>Signature: ____________________________</div>
            </div>
          </div>
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
  ongletsWrap: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: '20px' },
  onglets: { display: 'flex', gap: '10px', marginBottom: 0 },
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
  cardMateriel: { background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' },
  cardMaterielHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #eef2f7' },
  cardMaterielTitre: { margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' },
  materielActions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  materielBtn: { padding: '7px 12px', border: '1px solid #dbe3ee', borderRadius: 8, background: 'white', color: '#334155', fontWeight: '600', cursor: 'pointer', fontSize: '12px' },
  materielBtnActif: { background: '#1a73e8', color: 'white', border: '1px solid #1a73e8' },
  totalMaterielBadge: { background: '#e8f5e9', color: '#2e7d32', padding: '6px 10px', borderRadius: '10px', fontWeight: '700', fontSize: '13px' },
  tableMateriel: { width: '100%', borderCollapse: 'collapse' },
  theadRowMateriel: { background: '#f8fafc' },
  thMateriel: { padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', borderBottom: '1px solid #e5e7eb' },
  tdMateriel: { padding: '10px 14px', fontSize: '14px', color: '#334155', borderBottom: '1px solid #f1f5f9' },
  facturationLayout: { display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14, padding: 14 },
  classesList: { border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc', height: 'fit-content' },
  classesListTitre: { fontWeight: '700', fontSize: '13px', color: '#475569', marginBottom: 8 },
  classesVide: { fontSize: '12px', color: '#94a3b8', padding: '8px 4px' },
  classeBtn: { width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#334155', cursor: 'pointer', marginBottom: 6, fontSize: '13px', fontWeight: '600' },
  classeBtnActive: { background: '#e3f2fd', border: '1px solid #1a73e8', color: '#1a73e8' },
  facturationTableWrap: { border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: 'white' },
  facturationHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', color: '#334155' },
  tableFacturation: { width: '100%', borderCollapse: 'collapse', minWidth: 1300 },
  thFacturationBase: { padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#64748b', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' },
  thFacturationItem: { padding: '8px 8px', textAlign: 'center', fontSize: '10px', fontWeight: '700', color: '#64748b', borderBottom: '1px solid #e5e7eb', minWidth: 85, lineHeight: 1.2 },
  tdFacturation: { padding: '7px 10px', fontSize: '12px', color: '#334155', borderBottom: '1px solid #f1f5f9' },
  qtyInput: { width: 48, padding: '4px 6px', border: '1px solid #dbe3ee', borderRadius: 6, fontSize: '12px', textAlign: 'center' },
  btnDetailFacture: { padding: '5px 10px', borderRadius: 7, border: '1px solid #1a73e8', background: 'white', color: '#1a73e8', cursor: 'pointer', fontWeight: '700', fontSize: '11px' },
  modalFacture: { background: 'white', width: '900px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', borderRadius: '14px', padding: '18px' },
  modalFactureActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '12px' },
  factureA4: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '22px', color: '#111' },
  factureEnteteTop: { fontSize: '12px', lineHeight: 1.4 },
  factureTitre: { marginTop: '6px', fontSize: '18px', fontWeight: '700', color: '#0f172a' },
  factureSousTitre: { fontSize: '13px', color: '#334155', marginBottom: '10px' },
  factureInfos: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '12px' },
  factureTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '12px' },
  factureTh: { border: '1px solid #dbe3ee', padding: '8px', fontSize: '12px', background: '#f8fafc' },
  factureTd: { border: '1px solid #dbe3ee', padding: '8px', fontSize: '12px' },
  factureTotalLigne: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px 2px' },
  factureMontantFinal: { display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '700', borderTop: '2px solid #0f172a', paddingTop: '10px', marginTop: '8px' },
  factureSignature: { marginTop: '28px', fontSize: '13px' },
};