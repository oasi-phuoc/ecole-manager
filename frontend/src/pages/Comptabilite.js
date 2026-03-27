/* eslint-disable */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';
const TYPES = ['Ecolage', 'Fournitures', 'Cantine', 'Transport', 'Sortie', 'Assurance', 'Autre'];
const STATUTS = [
  { val: 'en_attente', label: 'En attente', color: '#fbbc04', bg: '#fff8e1' },
  { val: 'paye',       label: 'Payé',       color: '#34a853', bg: '#e8f5e9' },
  { val: 'en_retard',  label: 'En retard',  color: '#ea4335', bg: '#ffebee' },
  { val: 'annule',     label: 'Annulé',     color: '#888',    bg: '#f5f5f5' },
];
const ECOLAGE_DEFAUT = [
  'Manifestations',
  'Photocopies / feuilles',
  'Matériel d\'enseignement',
  'ACM / Sports Déplacements',
];
const MATERIEL_FACTURATION = [
  { key: 'classeur_7',    label: 'Classeur 7 cm',              prix: 2.80,  qteDefaut: 1 },
  { key: 'classeur_4',    label: 'Classeur 4 cm',              prix: 2.00,  qteDefaut: 1 },
  { key: 'cahier_a4',     label: 'Cahier A4',                  prix: 1.90,  qteDefaut: 1 },
  { key: 'feuilles_dessin', label: 'Feuilles de dessin',       prix: 10.00, qteDefaut: 1 },
  { key: 'agenda',        label: 'Agenda',                     prix: 12.00, qteDefaut: 1 },
  { key: 'jeux_repertoires', label: 'Jeux de répertoires',     prix: 1.60,  qteDefaut: 2 },
  { key: 'fixpoint_hb',   label: 'Fixpencil pour mines HB',    prix: 6.00,  qteDefaut: 2 },
  { key: 'boite_mines_hb', label: 'Boîte de mines (HB)',       prix: 1.80,  qteDefaut: 1 },
  { key: 'gomme',         label: 'Gomme',                      prix: 1.40,  qteDefaut: 1 },
  { key: 'crayons_couleur', label: 'Crayons de couleur',       prix: 6.90,  qteDefaut: 1 },
  { key: 'plume_pilot',   label: 'Plume pilot + 3 cartouches', prix: 14.80, qteDefaut: 1 },
];

export default function Comptabilite() {
  const navigate = useNavigate();
  const [onglet, setOnglet] = useState('factures');

  // Data
  const [paiements, setPaiements] = useState([]);
  const [stats, setStats] = useState(null);
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [materiels, setMateriels] = useState([]);

  // Paiements sub-tab + filter
  const [paiementsOnglet, setPaiementsOnglet] = useState('tous');
  const [filtreClasse, setFiltreClasse] = useState('');

  // Nouvelle facture popup
  const [showFacturePopup, setShowFacturePopup] = useState(false);
  const [factureEleveId, setFactureEleveId] = useState('');
  const [factureStatut, setFactureStatut] = useState('en_attente');
  const [factureDate, setFactureDate] = useState(new Date().toISOString().split('T')[0]);
  const [factureCommentaire, setFactureCommentaire] = useState('');
  // Table 1 : Écolage + prorata
  const [ecolageRows, setEcolageRows] = useState([{ type: 'Ecolage', montantBase: '', prorata: 12 }]);
  // Table 2 : Matériel
  const [materielRows, setMaterielRows] = useState([]);
  // Table 3 : Divers
  const [diversRows, setDiversRows] = useState([{ desc: '', montant: '' }]);

  // Edit paiement (simple)
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // Factures niveau sub-tab
  const [facturesNiveau, setFacturesNiveau] = useState('Tous');

  // Liste de prix sub-tab
  const [prixOnglet, setPrixOnglet] = useState('scolaire');
  const [classeFacturationId, setClasseFacturationId] = useState('');
  const [materielDistribue, setMaterielDistribue] = useState({});
  const [factureImprime, setFactureImprime] = useState(null);
  const [showMaterielForm, setShowMaterielForm] = useState(false);
  const [materielEdit, setMaterielEdit] = useState(null);
  const [materielForm, setMaterielForm] = useState({ nom: '', section: 'scolaire', prix: '', ref: '', fournisseur: '', rabais: '', remarques: '' });

  const headers = {};

  useEffect(() => {
    chargerPaiements(); chargerStats(); chargerEleves(); chargerClasses(); chargerMateriels();
  }, []);

  const chargerPaiements = async () => {
    try {
      const res = await axios.get(API + '/comptabilite', { headers });
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

  const getStatut = (val) => STATUTS.find(s => s.val === val) || STATUTS[0];
  const fmtCHF = (v) => 'CHF ' + Number(v || 0).toFixed(2).replace('.', ',');

  // Filtered paiements for Paiements tab
  const paiementsFiltres = paiements.filter(p => {
    if (paiementsOnglet !== 'tous' && p.statut !== paiementsOnglet) return false;
    if (filtreClasse && p.classe !== filtreClasse) return false;
    return true;
  });

  // Facture popup totals
  const calcEcolageTotal = (row) => parseFloat(row.montantBase || 0) * (parseFloat(row.prorata || 0) / 12);
  const totalEcolage = ecolageRows.reduce((acc, r) => acc + calcEcolageTotal(r), 0);
  const totalMaterielSelected = materielRows.reduce((acc, r) => acc + Number(r.prix || 0) * Number(r.qte || 0), 0);
  const totalDivers = diversRows.reduce((acc, r) => acc + parseFloat(r.montant || 0), 0);
  const totalFacture = totalEcolage + totalMaterielSelected + totalDivers;

  const ouvrirNouvelleFacture = () => {
    setFactureEleveId('');
    setFactureStatut('en_attente');
    setFactureDate(new Date().toISOString().split('T')[0]);
    setFactureCommentaire('');
    setEcolageRows([{ type: 'Ecolage', montantBase: '', prorata: 12 }]);
    const fournitures = materiels.filter(m => m.section === 'fournitures');
    setMaterielRows(
      fournitures.length > 0
        ? fournitures.map(m => ({ id: m.id, nom: m.nom, prix: Number(m.prix || 0), qte: 0 }))
        : MATERIEL_FACTURATION.map(m => ({ id: m.key, nom: m.label, prix: m.prix, qte: 0 }))
    );
    setDiversRows([{ desc: '', montant: '' }]);
    setShowFacturePopup(true);
  };

  const sauvegarderFacture = async (e) => {
    e.preventDefault();
    if (!factureEleveId) { alert('Veuillez sélectionner un élève.'); return; }
    const lignes = [];
    ecolageRows.forEach(r => { const t = calcEcolageTotal(r); if (t > 0) lignes.push(`${r.type}: ${fmtCHF(t)}`); });
    materielRows.forEach(r => { const t = Number(r.prix) * Number(r.qte); if (t > 0) lignes.push(`Matériel: ${fmtCHF(t)}`); });
    diversRows.forEach(r => { const m = parseFloat(r.montant || 0); if (m > 0 && r.desc) lignes.push(`${r.desc}: ${fmtCHF(m)}`); });
    const payload = {
      eleve_id: factureEleveId,
      montant: totalFacture,
      type: 'Ecolage',
      statut: factureStatut,
      date_paiement: factureDate,
      commentaire: factureCommentaire || lignes.join(' | '),
    };
    try {
      await axios.post(API + '/comptabilite', payload, { headers });
      setShowFacturePopup(false);
      chargerPaiements(); chargerStats();
    } catch (err) { alert('Erreur: ' + (err.response?.data?.message || err.message)); }
  };

  const ouvrirEdit = (p) => {
    setEditForm({
      id: p.id, eleve_id: p.eleve_id, montant: p.montant,
      type: p.type, statut: p.statut,
      date_paiement: p.date_paiement ? p.date_paiement.split('T')[0] : '',
      commentaire: p.commentaire || '',
    });
    setShowEditPopup(true);
  };
  const sauvegarderEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(API + '/comptabilite/' + editForm.id, editForm, { headers });
      setShowEditPopup(false); setEditForm(null);
      chargerPaiements(); chargerStats();
    } catch (err) { alert('Erreur: ' + (err.response?.data?.message || err.message)); }
  };
  const supprimerPaiement = async (id) => {
    if (!window.confirm('Supprimer ce paiement ?')) return;
    await axios.delete(API + '/comptabilite/' + id, { headers });
    chargerPaiements(); chargerStats();
  };

  // Liste de prix helpers
  const materielsScolaires = materiels.filter(m => (m.section || 'scolaire') === 'scolaire');
  const materielsEcolage = materiels.filter(m => m.section === 'ecolage');
  const materielsFournitures = materiels.filter(m => m.section === 'fournitures');
  const materielsFacturation = materielsFournitures.length > 0
    ? materielsFournitures.map(m => ({ id: m.id, nom: m.nom, prix: Number(m.prix || 0), qteDefaut: 1 }))
    : MATERIEL_FACTURATION.map(m => ({ id: m.key, nom: m.label, prix: m.prix, qteDefaut: m.qteDefaut }));
  const elevesClasseFacturation = eleves
    .filter(e => String(e.classe_id || '') === String(classeFacturationId || ''))
    .sort((a, b) => ((a.nom || '') + (a.prenom || '')).localeCompare((b.nom || '') + (b.prenom || ''), 'fr'));

  const creerLigneDefaut = () => { const d = {}; materielsFacturation.forEach(m => { d[m.id] = m.qteDefaut; }); return d; };
  const majQteMateriel = (eleveId, key, value) => {
    const qte = Math.max(0, parseInt(value || '0', 10) || 0);
    setMaterielDistribue(prev => ({ ...prev, [eleveId]: { ...(prev[eleveId] || creerLigneDefaut()), [key]: qte } }));
  };
  const totalEleve = (eleveId) => materielsFacturation.reduce((acc, m) => acc + Number(m.prix) * Number(materielDistribue[eleveId]?.[m.id] ?? m.qteDefaut), 0);
  const totalClasse = elevesClasseFacturation.reduce((acc, e) => acc + totalEleve(e.id), 0);

  useEffect(() => {
    if (onglet === 'factures' && !classeFacturationId && classes.length > 0) setClasseFacturationId(String(classes[0].id));
  }, [onglet, classeFacturationId, classes]);
  useEffect(() => {
    if (!classeFacturationId) return;
    setMaterielDistribue(prev => {
      const next = { ...prev };
      elevesClasseFacturation.forEach(e => { if (!next[e.id]) next[e.id] = creerLigneDefaut(); });
      return next;
    });
  }, [classeFacturationId, eleves.length]);

  const ouvrirFormMateriel = (m = null) => {
    setMaterielEdit(m);
    setMaterielForm(m
      ? { nom: m.nom || '', section: m.section || 'scolaire', prix: m.prix != null ? String(m.prix) : '', ref: m.ref || '', fournisseur: m.fournisseur || '', rabais: m.rabais != null ? String(m.rabais) : '', remarques: m.remarques || '' }
      : { nom: '', section: prixOnglet === 'fournitures' ? 'fournitures' : 'scolaire', prix: '', ref: '', fournisseur: '', rabais: '', remarques: '' }
    );
    setShowMaterielForm(true);
  };
  const handleSaveMateriel = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...materielForm, prix: materielForm.prix === '' ? 0 : parseFloat(materielForm.prix), rabais: materielForm.rabais === '' ? 0 : parseFloat(materielForm.rabais) };
      if (materielEdit) await axios.put(API + '/comptabilite/materiels/' + materielEdit.id, payload, { headers });
      else await axios.post(API + '/comptabilite/materiels', payload, { headers });
      setShowMaterielForm(false); setMaterielEdit(null); await chargerMateriels();
    } catch (err) { alert('Erreur: ' + (err.response?.data?.message || err.message)); }
  };
  const handleDeleteMateriel = async (id) => {
    if (!window.confirm('Supprimer ce matériel ?')) return;
    await axios.delete(API + '/comptabilite/materiels/' + id, { headers });
    await chargerMateriels();
  };

  const ouvrirFactureImprime = (eleve) => {
    const classe = classes.find(c => String(c.id) === String(classeFacturationId));
    const lignes = materielsFacturation.map(m => {
      const qte = Number(materielDistribue[eleve.id]?.[m.id] ?? m.qteDefaut);
      return { ...m, qte, montant: qte * m.prix };
    }).filter(l => l.qte > 0);
    setFactureImprime({ eleve, classeNom: classe?.nom || '—', dateFacture: new Date().toLocaleDateString('fr-CH'), lignes, total: lignes.reduce((acc, l) => acc + l.montant, 0) });
  };
  const imprimerFacture = () => {
    const node = document.getElementById('facture-pdf');
    if (!node) return;
    const popup = window.open('', '_blank', 'width=1000,height=800');
    if (!popup) return;
    popup.document.write(`<html><head><title>Facture</title><style>body{font-family:Arial,sans-serif;margin:20px;color:#111;}table{width:100%;border-collapse:collapse;margin-top:14px;}th,td{border:1px solid #dbe3ee;padding:8px;font-size:12px;}th{background:#f8fafc;text-align:left;}</style></head><body>${node.outerHTML}</body></html>`);
    popup.document.close(); popup.focus(); popup.print();
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={styles.titre}>Comptabilité</h2>
        {onglet === 'factures' && (
          <button style={styles.btnAjouter} onClick={ouvrirNouvelleFacture}>+ Nouvelle facture</button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={{ ...styles.statCard, borderTop: '4px solid #34a853' }}>
            <div style={styles.statValeur}>{parseFloat(stats.total_encaisse).toFixed(2)} CHF</div>
            <div style={styles.statLabel}>Total encaissé</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #fbbc04' }}>
            <div style={styles.statValeur}>{parseFloat(stats.en_attente.total).toFixed(2)} CHF</div>
            <div style={styles.statLabel}>En attente ({stats.en_attente.nb})</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #ea4335' }}>
            <div style={styles.statValeur}>{parseFloat(stats.en_retard.total).toFixed(2)} CHF</div>
            <div style={styles.statLabel}>En retard ({stats.en_retard.nb})</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #6366f1' }}>
            <div style={styles.statValeur}>{paiements.length}</div>
            <div style={styles.statLabel}>Total transactions</div>
          </div>
        </div>
      )}

      {/* Main tabs */}
      <div style={styles.tabsRow}>
        {[
          { key: 'factures', label: 'Factures' },
          { key: 'paiements', label: 'Paiements' },
          { key: 'prix', label: 'Liste de prix' },
        ].map(t => (
          <button key={t.key} style={{ ...styles.tab, ...(onglet === t.key ? styles.tabActif : {}) }} onClick={() => setOnglet(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== FACTURES ===== */}
      {onglet === 'factures' && (
        <>
          <div style={{ display: 'flex', gap: 0 }}>
            {['Tous', 'CSC', 'CFR', 'EPL', 'CPR'].map(niv => (
              <button key={niv}
                style={{ padding: '9px 14px', borderRadius: '0 0 10px 10px', fontSize: 14, background: facturesNiveau === niv ? '#4f46e5' : '#e0e7ff', color: facturesNiveau === niv ? 'white' : '#3730a3', fontWeight: 700, border: 'none', cursor: 'pointer', outline: 'none', boxShadow: facturesNiveau === niv ? '0 4px 6px rgba(79,70,229,0.18)' : 'none' }}
                onClick={() => { setFacturesNiveau(niv); setClasseFacturationId(''); }}>
                {niv}
              </button>
            ))}
          </div>
          <div style={styles.tabContent}>
            <div style={{ padding: '15px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <select style={{ ...styles.select, minWidth: 240 }} value={classeFacturationId} onChange={e => setClasseFacturationId(e.target.value)}>
                <option value="">— Sélectionner une classe —</option>
                {classes.filter(c => facturesNiveau === 'Tous' || String(c.niveau || '').toUpperCase().includes(facturesNiveau)).map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            {!classeFacturationId ? (
              <div style={styles.vide}>Sélectionnez une classe pour voir la facturation</div>
            ) : (
              <>
                <div style={styles.facturationHeader}>
                  <b>Classe : {(classes.find(c => String(c.id) === String(classeFacturationId)) || {}).nom || '—'}</b>
                  <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '6px 10px', borderRadius: 10, fontWeight: '700', fontSize: 13 }}>Total classe : {totalClasse.toFixed(2)} CHF</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ ...styles.tableMateriel, minWidth: 1300 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={styles.thMateriel}>Nom</th>
                        <th style={styles.thMateriel}>Prénom</th>
                        {materielsFacturation.map(m => (
                          <th key={m.id} style={{ ...styles.thMateriel, textAlign: 'center', minWidth: 80, fontSize: 10, lineHeight: 1.2 }} title={m.nom}>{m.nom}</th>
                        ))}
                        <th style={{ ...styles.thMateriel, textAlign: 'right' }}>Total</th>
                        <th style={{ ...styles.thMateriel, textAlign: 'center' }}>Détail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {elevesClasseFacturation.length === 0 ? (
                        <tr><td colSpan={materielsFacturation.length + 4} style={styles.vide}>Aucun élève dans cette classe</td></tr>
                      ) : elevesClasseFacturation.map((e, idx) => (
                        <tr key={e.id} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={styles.tdMateriel}>{e.nom || '—'}</td>
                          <td style={styles.tdMateriel}>{e.prenom || '—'}</td>
                          {materielsFacturation.map(m => (
                            <td key={m.id} style={{ ...styles.tdMateriel, textAlign: 'center' }}>
                              <input type="number" min="0"
                                style={{ width: 48, padding: '4px 6px', border: '1px solid #dbe3ee', borderRadius: 6, fontSize: 12, textAlign: 'center' }}
                                value={materielDistribue[e.id]?.[m.id] ?? m.qteDefaut}
                                onChange={ev => majQteMateriel(e.id, m.id, ev.target.value)}
                              />
                            </td>
                          ))}
                          <td style={{ ...styles.tdMateriel, textAlign: 'right', fontWeight: '700', color: '#1a73e8' }}>{totalEleve(e.id).toFixed(2)} CHF</td>
                          <td style={{ ...styles.tdMateriel, textAlign: 'center' }}>
                            <button style={styles.btnDetailFacture} onClick={() => ouvrirFactureImprime(e)}>Détail</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ===== PAIEMENTS ===== */}
      {onglet === 'paiements' && (
        <>
          {/* Sous-onglets statut paiements */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #6366f1', marginBottom: 0 }}>
            {[
              { key: 'tous', label: 'Tous' },
              { key: 'paye', label: 'Payé' },
              { key: 'en_attente', label: 'En attente' },
              { key: 'en_retard', label: 'En retard' },
              { key: 'annule', label: 'Annulé' },
            ].map(t => (
              <button key={t.key}
                style={{ padding: '9px 14px', background: paiementsOnglet === t.key ? '#6366f1' : '#ede9fe', border: 'none', borderRadius: '10px 10px 0 0', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: paiementsOnglet === t.key ? 'white' : '#5b21b6', marginRight: 4, outline: 'none', lineHeight: '1', marginBottom: paiementsOnglet === t.key ? -1 : 0, zIndex: paiementsOnglet === t.key ? 2 : 1 }}
                onClick={() => setPaiementsOnglet(t.key)}>
                {t.label} ({paiements.filter(p => t.key === 'tous' || p.statut === t.key).length})
              </button>
            ))}
          </div>
        <div style={{ ...styles.tabContent, borderTopLeftRadius: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 14px', borderBottom: '1px solid #f0f0f0' }}>
            <select style={styles.select} value={filtreClasse} onChange={e => setFiltreClasse(e.target.value)}>
              <option value="">Toutes les classes</option>
              {classes.map(c => <option key={c.id} value={c.nom}>{c.nom}</option>)}
            </select>
          </div>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                {['Élève', 'Classe', 'Type', 'Montant', 'Statut', 'Date', 'Actions'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paiementsFiltres.length === 0 ? (
                <tr><td colSpan="7" style={styles.vide}>Aucun paiement</td></tr>
              ) : paiementsFiltres.map(p => {
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
                    <td style={styles.td}>
                      <button style={styles.btnEdit} onClick={() => ouvrirEdit(p)}>✏️</button>
                      <button style={styles.btnDelete} onClick={() => supprimerPaiement(p.id)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* ===== LISTE DE PRIX ===== */}
      {onglet === 'prix' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { key: 'scolaire',    label: 'Matériel scolaire' },
                { key: 'fournitures', label: 'Fournitures' },
              ].map(t => (
                <button key={t.key}
                  style={{ padding: '9px 14px', borderRadius: '0 0 10px 10px', fontSize: 14, background: prixOnglet === t.key ? '#4f46e5' : '#e0e7ff', color: prixOnglet === t.key ? 'white' : '#3730a3', fontWeight: 700, border: 'none', cursor: 'pointer', outline: 'none', boxShadow: prixOnglet === t.key ? '0 4px 6px rgba(79,70,229,0.18)' : 'none' }}
                  onClick={() => setPrixOnglet(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
            {(prixOnglet === 'scolaire' || prixOnglet === 'fournitures') && (
              <button style={{ ...styles.btnAjouter, padding: '7px 14px', fontSize: '13px' }} onClick={() => ouvrirFormMateriel(null)}>+ Ajouter</button>
            )}
          </div>
        <div style={{ ...styles.tabContent, marginTop: 15 }}>

          {/* Matériel scolaire */}
          {prixOnglet === 'scolaire' && (
            <>
              <table style={styles.tableMateriel}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Matériel', 'Prix', 'REF', 'Fournisseur', 'Rabais %', 'Remarques', 'Action'].map(h => (
                      <th key={h} style={styles.thMateriel}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {materielsScolaires.length === 0 ? (
                    <tr><td colSpan="7" style={styles.vide}>Aucun matériel scolaire</td></tr>
                  ) : materielsScolaires.map((m, i) => (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={styles.tdMateriel}>{m.nom}</td>
                      <td style={{ ...styles.tdMateriel, textAlign: 'right' }}>{Number(m.prix || 0).toFixed(2)} CHF</td>
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

              {/* Section FINANCE ECOLAGE */}
              <div style={{ height: 20 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#e0e7ff', borderRadius: '8px 8px 0 0', border: '2px solid #6366f1', borderBottom: 'none' }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: '#3730a3', letterSpacing: 0.5 }}>FINANCE ÉCOLAGE &amp; MATÉRIEL GÉNÉRAL</span>
                <button style={{ ...styles.btnAjouter, padding: '5px 12px', fontSize: 12 }} onClick={() => { setMaterielForm({ nom: '', section: 'ecolage', prix: '', ref: '', fournisseur: '', rabais: '', remarques: '' }); setMaterielEdit(null); setShowMaterielForm(true); }}>+ Ajouter</button>
              </div>
              <table style={{ ...styles.tableMateriel, border: '2px solid #6366f1', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#f0f4ff' }}>
                    {['Matériel', 'Prix', 'REF', 'Fournisseur', 'Rabais %', 'Remarques', 'Action'].map(h => (
                      <th key={h} style={styles.thMateriel}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {materielsEcolage.length === 0 ? (
                    ECOLAGE_DEFAUT.map((nom, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={styles.tdMateriel}>{nom}</td>
                        <td style={{ ...styles.tdMateriel, textAlign: 'right', color: '#94a3b8' }}>—</td>
                        <td style={styles.tdMateriel}>—</td>
                        <td style={styles.tdMateriel}>—</td>
                        <td style={{ ...styles.tdMateriel, textAlign: 'right' }}>—</td>
                        <td style={styles.tdMateriel}>—</td>
                        <td style={{ ...styles.tdMateriel, textAlign: 'center' }}>
                          <button style={{ ...styles.btnAjouter, padding: '3px 8px', fontSize: 11 }} onClick={() => { setMaterielForm({ nom, section: 'ecolage', prix: '', ref: '', fournisseur: '', rabais: '', remarques: '' }); setMaterielEdit(null); setShowMaterielForm(true); }}>Définir</button>
                        </td>
                      </tr>
                    ))
                  ) : materielsEcolage.map((m, i) => (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={styles.tdMateriel}>{m.nom}</td>
                      <td style={{ ...styles.tdMateriel, textAlign: 'right' }}>{Number(m.prix || 0).toFixed(2)} CHF</td>
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
          )}

          {/* Fournitures */}
          {prixOnglet === 'fournitures' && (
            <table style={styles.tableMateriel}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Matériel', 'Prix', 'REF', 'Fournisseur', 'Rabais %', 'Remarques', 'Action'].map(h => (
                    <th key={h} style={styles.thMateriel}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {materielsFournitures.length === 0 ? (
                  <tr><td colSpan="7" style={styles.vide}>Aucune fourniture</td></tr>
                ) : materielsFournitures.map((m, i) => (
                  <tr key={m.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={styles.tdMateriel}>{m.nom}</td>
                    <td style={{ ...styles.tdMateriel, textAlign: 'right' }}>{Number(m.prix || 0).toFixed(2)} CHF</td>
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
          )}

          {/* Facturation classe */}
          {prixOnglet === 'facturation' && (
            <div style={styles.facturationLayout}>
              <div style={styles.classesList}>
                <div style={styles.classesListTitre}>Classes</div>
                {classes.map(c => (
                  <button key={c.id}
                    style={{ ...styles.classeBtn, ...(String(c.id) === String(classeFacturationId) ? styles.classeBtnActive : {}) }}
                    onClick={() => setClasseFacturationId(String(c.id))}>
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
                      <b>Classe : {(classes.find(c => String(c.id) === String(classeFacturationId)) || {}).nom || '—'}</b>
                      <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '6px 10px', borderRadius: 10, fontWeight: '700', fontSize: 13 }}>Total classe : {totalClasse.toFixed(2)} CHF</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ ...styles.tableMateriel, minWidth: 1300 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            <th style={styles.thMateriel}>Nom</th>
                            <th style={styles.thMateriel}>Prénom</th>
                            {materielsFacturation.map(m => (
                              <th key={m.id} style={{ ...styles.thMateriel, textAlign: 'center', minWidth: 80, fontSize: 10, lineHeight: 1.2 }} title={m.nom}>{m.nom}</th>
                            ))}
                            <th style={{ ...styles.thMateriel, textAlign: 'right' }}>Total</th>
                            <th style={{ ...styles.thMateriel, textAlign: 'center' }}>Détail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {elevesClasseFacturation.length === 0 ? (
                            <tr><td colSpan={materielsFacturation.length + 4} style={styles.vide}>Aucun élève dans cette classe</td></tr>
                          ) : elevesClasseFacturation.map((e, idx) => (
                            <tr key={e.id} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                              <td style={styles.tdMateriel}>{e.nom || '—'}</td>
                              <td style={styles.tdMateriel}>{e.prenom || '—'}</td>
                              {materielsFacturation.map(m => (
                                <td key={m.id} style={{ ...styles.tdMateriel, textAlign: 'center' }}>
                                  <input type="number" min="0"
                                    style={{ width: 48, padding: '4px 6px', border: '1px solid #dbe3ee', borderRadius: 6, fontSize: 12, textAlign: 'center' }}
                                    value={materielDistribue[e.id]?.[m.id] ?? m.qteDefaut}
                                    onChange={ev => majQteMateriel(e.id, m.id, ev.target.value)}
                                  />
                                </td>
                              ))}
                              <td style={{ ...styles.tdMateriel, textAlign: 'right', fontWeight: '700', color: '#1a73e8' }}>{totalEleve(e.id).toFixed(2)} CHF</td>
                              <td style={{ ...styles.tdMateriel, textAlign: 'center' }}>
                                <button style={styles.btnDetailFacture} onClick={() => ouvrirFactureImprime(e)}>Détail</button>
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
        </>
      )}

      {/* ===== POPUP NOUVELLE FACTURE (3 tables) ===== */}
      {showFacturePopup && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, width: 720, maxWidth: '96vw' }}>
            <h3 style={styles.modalTitre}>Nouvelle facture</h3>
            <form onSubmit={sauvegarderFacture}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Élève *</label>
                  <select style={styles.input} required value={factureEleveId} onChange={e => setFactureEleveId(e.target.value)}>
                    <option value="">-- Choisir un élève --</option>
                    {eleves.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}{e.classe ? ' (' + e.classe + ')' : ''}</option>)}
                  </select>
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Statut</label>
                  <select style={styles.input} value={factureStatut} onChange={e => setFactureStatut(e.target.value)}>
                    {STATUTS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                  </select>
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Date</label>
                  <input style={styles.input} type="date" value={factureDate} onChange={e => setFactureDate(e.target.value)} />
                </div>
              </div>

              {/* Table 1 : Écolage + prorata */}
              <div style={styles.factureSection}>
                <div style={styles.factureSectionTitre}>
                  1. Écolage &amp; frais
                  <button type="button" style={styles.btnAddRow} onClick={() => setEcolageRows(r => [...r, { type: 'Ecolage', montantBase: '', prorata: 12 }])}>+ Ligne</button>
                </div>
                <table style={styles.tableInPopup}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={styles.thPopup}>Type</th>
                      <th style={{ ...styles.thPopup, textAlign: 'right' }}>Montant mensuel (CHF)</th>
                      <th style={{ ...styles.thPopup, textAlign: 'center' }}>Mois (sur 12)</th>
                      <th style={{ ...styles.thPopup, textAlign: 'right' }}>Total prorata</th>
                      <th style={{ ...styles.thPopup, textAlign: 'center', width: 32 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ecolageRows.map((row, i) => (
                      <tr key={i}>
                        <td style={styles.tdPopup}>
                          <select style={{ ...styles.input, padding: '6px 8px' }} value={row.type} onChange={e => { const u = [...ecolageRows]; u[i] = { ...u[i], type: e.target.value }; setEcolageRows(u); }}>
                            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td style={{ ...styles.tdPopup, textAlign: 'right' }}>
                          <input type="number" step="0.05" min="0" placeholder="0.00"
                            style={{ ...styles.input, width: 110, padding: '6px 8px', textAlign: 'right' }}
                            value={row.montantBase}
                            onChange={e => { const u = [...ecolageRows]; u[i] = { ...u[i], montantBase: e.target.value }; setEcolageRows(u); }}
                          />
                        </td>
                        <td style={{ ...styles.tdPopup, textAlign: 'center' }}>
                          <input type="number" min="0" max="12" step="1"
                            style={{ ...styles.input, width: 56, padding: '6px 8px', textAlign: 'center' }}
                            value={row.prorata}
                            onChange={e => { const u = [...ecolageRows]; u[i] = { ...u[i], prorata: e.target.value }; setEcolageRows(u); }}
                          />
                          <span style={{ fontSize: 11, color: '#888', marginLeft: 4 }}>/12</span>
                        </td>
                        <td style={{ ...styles.tdPopup, textAlign: 'right', fontWeight: 700, color: '#1a73e8' }}>
                          {calcEcolageTotal(row).toFixed(2)} CHF
                        </td>
                        <td style={{ ...styles.tdPopup, textAlign: 'center' }}>
                          {ecolageRows.length > 1 && (
                            <button type="button" style={styles.btnRemoveRow} onClick={() => setEcolageRows(r => r.filter((_, j) => j !== i))}>✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f0f7ff' }}>
                      <td colSpan="3" style={{ ...styles.tdPopup, textAlign: 'right', fontWeight: 700 }}>Sous-total écolage</td>
                      <td style={{ ...styles.tdPopup, textAlign: 'right', fontWeight: 700, color: '#1a73e8' }}>{totalEcolage.toFixed(2)} CHF</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Table 2 : Matériel */}
              <div style={styles.factureSection}>
                <div style={styles.factureSectionTitre}>2. Matériel / Fournitures</div>
                <table style={styles.tableInPopup}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={styles.thPopup}>Article</th>
                      <th style={{ ...styles.thPopup, textAlign: 'right' }}>Prix unit.</th>
                      <th style={{ ...styles.thPopup, textAlign: 'center' }}>Qté</th>
                      <th style={{ ...styles.thPopup, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materielRows.length === 0 ? (
                      <tr><td colSpan="4" style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Aucun article — ajoutez des fournitures dans "Liste de prix"</td></tr>
                    ) : materielRows.map((row, i) => (
                      <tr key={row.id || i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={styles.tdPopup}>{row.nom}</td>
                        <td style={{ ...styles.tdPopup, textAlign: 'right' }}>{Number(row.prix || 0).toFixed(2)} CHF</td>
                        <td style={{ ...styles.tdPopup, textAlign: 'center' }}>
                          <input type="number" min="0"
                            style={{ width: 56, padding: '4px 6px', border: '1px solid #dbe3ee', borderRadius: 6, fontSize: 12, textAlign: 'center' }}
                            value={row.qte}
                            onChange={e => { const u = [...materielRows]; u[i] = { ...u[i], qte: Math.max(0, parseInt(e.target.value || '0') || 0) }; setMaterielRows(u); }}
                          />
                        </td>
                        <td style={{ ...styles.tdPopup, textAlign: 'right', fontWeight: 700, color: Number(row.prix) * Number(row.qte) > 0 ? '#1a73e8' : '#94a3b8' }}>
                          {(Number(row.prix || 0) * Number(row.qte || 0)).toFixed(2)} CHF
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f0f7ff' }}>
                      <td colSpan="3" style={{ ...styles.tdPopup, textAlign: 'right', fontWeight: 700 }}>Sous-total matériel</td>
                      <td style={{ ...styles.tdPopup, textAlign: 'right', fontWeight: 700, color: '#1a73e8' }}>{totalMaterielSelected.toFixed(2)} CHF</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Table 3 : Divers */}
              <div style={styles.factureSection}>
                <div style={styles.factureSectionTitre}>
                  3. Divers
                  <button type="button" style={styles.btnAddRow} onClick={() => setDiversRows(r => [...r, { desc: '', montant: '' }])}>+ Ligne</button>
                </div>
                <table style={styles.tableInPopup}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={styles.thPopup}>Description</th>
                      <th style={{ ...styles.thPopup, textAlign: 'right' }}>Montant (CHF)</th>
                      <th style={{ ...styles.thPopup, width: 32 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {diversRows.map((row, i) => (
                      <tr key={i}>
                        <td style={styles.tdPopup}>
                          <input style={{ ...styles.input, padding: '6px 8px' }} value={row.desc}
                            onChange={e => { const u = [...diversRows]; u[i] = { ...u[i], desc: e.target.value }; setDiversRows(u); }}
                            placeholder="Ex: sortie scolaire, transport..."
                          />
                        </td>
                        <td style={{ ...styles.tdPopup, textAlign: 'right' }}>
                          <input type="number" step="0.05" min="0" placeholder="0.00"
                            style={{ ...styles.input, width: 110, padding: '6px 8px', textAlign: 'right' }}
                            value={row.montant}
                            onChange={e => { const u = [...diversRows]; u[i] = { ...u[i], montant: e.target.value }; setDiversRows(u); }}
                          />
                        </td>
                        <td style={{ ...styles.tdPopup, textAlign: 'center' }}>
                          {diversRows.length > 1 && (
                            <button type="button" style={styles.btnRemoveRow} onClick={() => setDiversRows(r => r.filter((_, j) => j !== i))}>✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f0f7ff' }}>
                      <td style={{ ...styles.tdPopup, textAlign: 'right', fontWeight: 700 }}>Sous-total divers</td>
                      <td style={{ ...styles.tdPopup, textAlign: 'right', fontWeight: 700, color: '#1a73e8' }}>{totalDivers.toFixed(2)} CHF</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div style={styles.factureTotalBar}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>TOTAL FACTURE</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>{totalFacture.toFixed(2)} CHF</span>
              </div>

              <div style={{ ...styles.formChamp, marginBottom: 16 }}>
                <label style={styles.label}>Commentaire (facultatif)</label>
                <input style={styles.input} value={factureCommentaire} onChange={e => setFactureCommentaire(e.target.value)} placeholder="Remarque optionnelle..." />
              </div>

              <div style={styles.formActions}>
                <button type="button" style={styles.btnAnnuler} onClick={() => setShowFacturePopup(false)}>Annuler</button>
                <button type="submit" style={styles.btnSauver}>Sauvegarder la facture</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== POPUP EDIT PAIEMENT ===== */}
      {showEditPopup && editForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitre}>Modifier le paiement</h3>
            <form onSubmit={sauvegarderEdit}>
              <div style={styles.formGrid}>
                <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                  <label style={styles.label}>Élève</label>
                  <select style={styles.input} required value={editForm.eleve_id} onChange={e => setEditForm({ ...editForm, eleve_id: e.target.value })}>
                    <option value="">-- Choisir --</option>
                    {eleves.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
                  </select>
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Montant (CHF)</label>
                  <input style={styles.input} type="number" step="0.05" value={editForm.montant} onChange={e => setEditForm({ ...editForm, montant: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Type</label>
                  <select style={styles.input} value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Statut</label>
                  <select style={styles.input} value={editForm.statut} onChange={e => setEditForm({ ...editForm, statut: e.target.value })}>
                    {STATUTS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                  </select>
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Date paiement</label>
                  <input style={styles.input} type="date" value={editForm.date_paiement} onChange={e => setEditForm({ ...editForm, date_paiement: e.target.value })} />
                </div>
                <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                  <label style={styles.label}>Commentaire</label>
                  <input style={styles.input} type="text" value={editForm.commentaire} onChange={e => setEditForm({ ...editForm, commentaire: e.target.value })} />
                </div>
              </div>
              <div style={styles.formActions}>
                <button type="button" style={styles.btnAnnuler} onClick={() => setShowEditPopup(false)}>Annuler</button>
                <button type="submit" style={styles.btnSauver}>Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== POPUP FORM MATERIEL ===== */}
      {showMaterielForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitre}>{materielEdit ? 'Modifier' : 'Ajouter'} un matériel</h3>
            <form onSubmit={handleSaveMateriel}>
              <div style={styles.formGrid}>
                <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                  <label style={styles.label}>Nom *</label>
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

      {/* ===== POPUP FACTURE IMPRESSION ===== */}
      {factureImprime && (
        <div style={styles.overlay}>
          <div style={{ background: 'white', width: 900, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 12 }}>
              <button style={styles.btnAnnuler} onClick={() => setFactureImprime(null)}>Fermer</button>
              <button style={styles.btnSauver} onClick={imprimerFacture}>🖨️ Imprimer / PDF</button>
            </div>
            <div id="facture-pdf" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 22, color: '#111' }}>
              {['Département de la santé, des affaires sociales et de la culture', "Service de l'action sociale", "Office de l'asile", 'Centre de formation "Le Botza"', 'Zone Industrielle 4, 1963 Vétroz', 'Tél. 027 606 18 60'].map((line, i) => (
                <div key={i} style={{ fontSize: 12, lineHeight: 1.4, marginBottom: i === 5 ? 12 : 0 }}>{line}</div>
              ))}
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>FINANCE ECOLAGE &amp; MATERIEL GENERAL</div>
              <div style={{ fontSize: 13, color: '#334155', marginBottom: 10 }}>Facture du matériel scolaire</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12, marginBottom: 12 }}>
                <div><b>NOM Prénom :</b> {factureImprime.eleve.nom} {factureImprime.eleve.prenom}</div>
                <div><b>Classe :</b> {factureImprime.classeNom}</div>
                <div><b>Date :</b> {factureImprime.dateFacture}</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
                <thead>
                  <tr>
                    {['Article', 'Prix unitaire', 'Quantité', 'Prix'].map((h, i) => (
                      <th key={h} style={{ border: '1px solid #dbe3ee', padding: 8, fontSize: 12, background: '#f8fafc', textAlign: i > 0 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {factureImprime.lignes.map(l => (
                    <tr key={l.id}>
                      <td style={{ border: '1px solid #dbe3ee', padding: 8, fontSize: 12 }}>{l.nom}</td>
                      <td style={{ border: '1px solid #dbe3ee', padding: 8, fontSize: 12, textAlign: 'right' }}>{fmtCHF(l.prix)}</td>
                      <td style={{ border: '1px solid #dbe3ee', padding: 8, fontSize: 12, textAlign: 'right' }}>{l.qte}</td>
                      <td style={{ border: '1px solid #dbe3ee', padding: 8, fontSize: 12, textAlign: 'right' }}>{fmtCHF(l.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 2px' }}>
                <span>Sous-Total</span><b>{fmtCHF(factureImprime.total)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, borderTop: '2px solid #0f172a', paddingTop: 10, marginTop: 8 }}>
                <span>MONTANT DE LA FACTURE</span><b>{fmtCHF(factureImprime.total)}</b>
              </div>
              <div style={{ marginTop: 28, fontSize: 13 }}>Signature : ____________________________</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '20px', background: '#f0f2f5', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: 15, marginBottom: 24 },
  btnRetour: { padding: '8px 16px', background: 'white', border: '2px solid #e0e0e0', borderRadius: 8, cursor: 'pointer' },
  titre: { fontSize: 24, fontWeight: 700, flex: 1 },
  btnAjouter: { padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statCard: { background: 'white', padding: '16px 20px', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' },
  statValeur: { fontSize: 20, fontWeight: 700, color: '#333', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#888' },
  tabsRow: { display: 'flex', gap: 0, borderBottom: '2px solid #6366f1', marginBottom: 0 },
  tab: { padding: '9px 14px', background: '#ede9fe', border: 'none', borderRadius: '10px 10px 0 0', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#5b21b6', marginRight: 4, outline: 'none', lineHeight: '1' },
  tabActif: { background: '#6366f1', color: 'white', marginBottom: -1, zIndex: 2 },
  tabContent: { background: 'white', borderRadius: '0 12px 12px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' },
  subTabsRow: { display: 'flex', gap: 6, padding: '12px 14px', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap', alignItems: 'center', background: '#fafafa' },
  subTab: { padding: '7px 13px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569', outline: 'none' },
  subTabActif: { background: '#6366f1', color: 'white', border: '1px solid #6366f1' },
  select: { padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: 'white' },
  table: { width: '100%', borderCollapse: 'collapse' },
  theadRow: { background: '#6366f1', color: 'white' },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 13, fontWeight: 600 },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '10px 14px', fontSize: 13 },
  vide: { padding: 40, textAlign: 'center', color: '#888', fontSize: 14 },
  typeBadge: { background: '#ede9fe', color: '#6366f1', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  statutBadge: { padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  btnEdit: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, marginRight: 6 },
  btnDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: 28, borderRadius: 16, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' },
  modalTitre: { fontSize: 18, fontWeight: 700, marginBottom: 18 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  formChamp: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12, fontWeight: 600, color: '#555' },
  input: { padding: '9px 10px', border: '1.5px solid #e0e0e0', borderRadius: 7, fontSize: 13, width: '100%', boxSizing: 'border-box', background: 'white' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  btnAnnuler: { padding: '9px 18px', background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  btnSauver: { padding: '9px 18px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  tableMateriel: { width: '100%', borderCollapse: 'collapse' },
  thMateriel: { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e5e7eb' },
  tdMateriel: { padding: '10px 14px', fontSize: 13, color: '#334155', borderBottom: '1px solid #f1f5f9' },
  facturationLayout: { display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, padding: 14 },
  classesList: { border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc' },
  classesListTitre: { fontWeight: 700, fontSize: 12, color: '#475569', marginBottom: 8 },
  classeBtn: { width: '100%', textAlign: 'left', padding: '7px 9px', borderRadius: 7, border: '1px solid #e2e8f0', background: 'white', color: '#334155', cursor: 'pointer', marginBottom: 5, fontSize: 12, fontWeight: 600 },
  classeBtnActive: { background: '#ede9fe', border: '1px solid #6366f1', color: '#6366f1' },
  facturationTableWrap: { border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: 'white' },
  facturationHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 13, color: '#334155' },
  btnDetailFacture: { padding: '5px 10px', borderRadius: 7, border: '1px solid #6366f1', background: 'white', color: '#6366f1', cursor: 'pointer', fontWeight: 700, fontSize: 11 },
  // Facture popup
  factureSection: { marginBottom: 14, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' },
  factureSectionTitre: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 12px', fontSize: 13, fontWeight: 700, color: '#334155', borderBottom: '1px solid #e2e8f0' },
  tableInPopup: { width: '100%', borderCollapse: 'collapse' },
  thPopup: { padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e5e7eb' },
  tdPopup: { padding: '7px 10px', fontSize: 12, color: '#334155', borderBottom: '1px solid #f1f5f9' },
  btnAddRow: { padding: '3px 8px', background: '#ede9fe', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#6366f1' },
  btnRemoveRow: { padding: '2px 6px', background: '#fee2e2', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, color: '#ef4444', fontWeight: 700 },
  factureTotalBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f3ff', border: '2px solid #c4b5fd', borderRadius: 10, padding: '14px 18px', marginBottom: 14 },
};
