/* eslint-disable */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ICONS_MATERIELS } from '../components/DashboardIcons';
import { isAdmin } from '../utils/permissions';
import { stickyPageChrome } from '../styles/pageShell';
import { injectForcedPrintCss, openPrintPopup } from '../utils/print';

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

/** Onglets principaux (affichés dans la page, comme l’entrée Notes sans sous-menu latéral) */
const COMPTA_TABS_ADMIN = [
  { key: 'classes', label: 'Classes' },
  { key: 'factures', label: 'Factures' },
  { key: 'paiements', label: 'Paiements' },
  { key: 'prix', label: 'Liste de prix' },
];

const ICONES_MATERIELS_LIST = [
  { key: 'classeur_grand',  label: 'Grand classeur (7 cm)' },
  { key: 'classeur_petit',  label: 'Petit classeur (4 cm)' },
  { key: 'cahier_a4',       label: 'Cahier A4' },
  { key: 'feuilles_dessin', label: 'Feuilles de dessin' },
  { key: 'photocopies',     label: 'Photocopies / feuilles' },
  { key: 'agenda',          label: 'Agenda' },
  { key: 'repertoire',      label: 'Répertoire' },
  { key: 'crayon',          label: 'Crayon papier' },
  { key: 'stylo',           label: 'Stylo bille' },
  { key: 'stylo_plume',     label: 'Stylo plume / Plume pilot' },
  { key: 'fixpencil',       label: 'Fixpencil (crayon mécanique)' },
  { key: 'mines',           label: 'Boîte de mines (HB)' },
  { key: 'crayons_couleur', label: 'Crayons de couleur' },
  { key: 'gomme',           label: 'Gomme' },
  { key: 'sports',          label: 'ACM / Sports' },
  { key: 'deplacement',     label: 'Déplacement' },
  { key: 'manifestation',   label: 'Manifestations' },
  { key: 'enseignement',    label: 'Matériel d\'enseignement' },
];

export default function Comptabilite() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultComptaTab = isAdmin() ? 'classes' : 'paiements';
  const onglet = searchParams.get('tab') || defaultComptaTab;
  const classeFacturationId = searchParams.get('classeId') || '';
  const setOnglet = (tab) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set('tab', tab);
      if (tab !== 'factures') p.delete('classeId');
      return p;
    });
  };
  const openFacturesClasse = (id) => setSearchParams({ tab: 'factures', classeId: String(id) });
  const retourListeClasses = () => setSearchParams({ tab: 'classes' });
  const [rechercheFactures, setRechercheFactures] = useState('');
  const [recherchePrix, setRecherchePrix] = useState('');

  // Data
  const [paiements, setPaiements] = useState([]);
  const [stats, setStats] = useState(null);
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [materiels, setMateriels] = useState([]);

  // Paiements sub-tab + filter
  const [paiementsOnglet, setPaiementsOnglet] = useState('tous');
  const [paiementsNiveau, setPaiementsNiveau] = useState('Tous');
  const [recherchePaiements, setRecherchePaiements] = useState('');

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
  const [showFacturesNiveaux, setShowFacturesNiveaux] = useState(false);
  const [showPaiementsNiveaux, setShowPaiementsNiveaux] = useState(false);
  const [rechercheClasseFacture, setRechercheClasseFacture] = useState('');

  // Liste de prix sub-tab
  const [prixOnglet, setPrixOnglet] = useState('ecolage');
  const [materielDistribue, setMaterielDistribue] = useState({});
  const [facturesValidees, setFacturesValidees] = useState({});
  const [toutesValidations, setToutesValidations] = useState({});
  const [factureImprime, setFactureImprime] = useState(null);
  const [showMaterielForm, setShowMaterielForm] = useState(false);
  const [materielEdit, setMaterielEdit] = useState(null);
  const [materielForm, setMaterielForm] = useState({ nom: '', section: 'scolaire', prix: '', ref: '', fournisseur: '', rabais: '', remarques: '', icone: '' });

  const headers = {};

  useEffect(() => {
    chargerPaiements(); chargerStats(); chargerEleves(); chargerClasses(); chargerMateriels();
  }, []);

  useEffect(() => {
    if (location.state?.classeFacturationId) {
      setSearchParams({ tab: 'factures', classeId: String(location.state.classeFacturationId) });
      navigate('/comptabilite', { replace: true, state: {} });
    }
  }, []);

  const tabParam = searchParams.get('tab');
  useEffect(() => {
    if (!isAdmin() && (tabParam === 'classes' || tabParam === 'factures' || tabParam === 'prix')) {
      setSearchParams({ tab: 'paiements' }, { replace: true });
    }
  }, [tabParam, setSearchParams]);

  const chargerToutesValidations = async (elevesListe, annee) => {
    if (!elevesListe || elevesListe.length === 0) return;
    const ids = elevesListe.map(e => e.id).join(',');
    try {
      const res = await axios.get(API + `/comptabilite/factures/validation?eleve_ids=${ids}&annee_scolaire=${annee}`, { headers });
      const map = {};
      res.data.forEach(r => { map[r.eleve_id] = r.valide; });
      setToutesValidations(map);
      setFacturesValidees(prev => ({ ...map, ...prev }));
    } catch (e) {}
  };

  useEffect(() => {
    if (eleves.length > 0) chargerToutesValidations(eleves, anneeScolaireCourante);
  }, [eleves.length]);

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
    if (paiementsNiveau !== 'Tous') {
      const classeObj = classes.find(c => c.nom === p.classe);
      if (!classeObj || !String(classeObj.niveau || '').toUpperCase().includes(paiementsNiveau)) return false;
    }
    if (recherchePaiements.trim()) {
      const q = recherchePaiements.toLowerCase();
      const nom = `${p.prenom || ''} ${p.nom || ''}`.toLowerCase();
      if (!nom.includes(q) && !(p.classe || '').toLowerCase().includes(q) && !String(p.montant || '').includes(q) && !(p.commentaire || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const paiementsAffiches = [...paiementsFiltres].sort((a, b) => {
    const na = `${a.prenom || ''} ${a.nom || ''}`.trim();
    const nb = `${b.prenom || ''} ${b.nom || ''}`.trim();
    return na.localeCompare(nb, 'fr');
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
    const scolaires = materiels.filter(m => (m.section || 'scolaire') === 'scolaire');
    setMaterielRows(
      scolaires.length > 0
        ? scolaires.map(m => ({ id: m.id, nom: m.nom, prix: Number(m.prix || 0), qte: 0 }))
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

  const ouvrirEdit = async (p) => {
    let reference = p.reference || '';
    if (!reference) {
      try {
        const now = new Date();
        const annee = now.getMonth() >= 8 ? `${now.getFullYear()}-${now.getFullYear()+1}` : `${now.getFullYear()-1}-${now.getFullYear()}`;
        const r = await axios.get(API + `/comptabilite/factures/reference?eleve_id=${p.eleve_id}&annee_scolaire=${annee}`, { headers });
        reference = r.data.reference || '';
      } catch {}
    }
    setEditForm({
      id: p.id, eleve_id: p.eleve_id,
      nom: p.nom || '', prenom: p.prenom || '',
      montant: p.montant,
      type: p.type, statut: p.statut,
      valide: p.valide || false,
      date_paiement: p.date_paiement ? p.date_paiement.split('T')[0] : '',
      commentaire: p.commentaire || '',
      reference,
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

  const togglePaiementStatut = async (p) => {
    const nouveauStatut = p.statut === 'paye' ? 'en_attente' : 'paye';
    const dateP = nouveauStatut === 'paye' ? new Date().toISOString().split('T')[0] : (p.date_paiement ? p.date_paiement.split('T')[0] : null);
    try {
      await axios.put(API + '/comptabilite/' + p.id, { ...p, statut: nouveauStatut, date_paiement: dateP }, { headers });
      chargerPaiements(); chargerStats();
    } catch (err) { console.error(err); }
  };

  const setStatutPaiement = async (p, newStatut) => {
    if (p.valide) return; // blocked when validated
    if (p.statut === newStatut) return;
    const dateP = newStatut === 'paye' ? new Date().toISOString().split('T')[0] : (p.date_paiement ? p.date_paiement.split('T')[0] : null);
    try {
      await axios.put(API + '/comptabilite/' + p.id, { ...p, statut: newStatut, date_paiement: dateP }, { headers });
      chargerPaiements(); chargerStats();
    } catch (err) { console.error(err); }
  };

  const toggleValidePaiement = async (p) => {
    const newValide = !p.valide;
    const newStatut = newValide ? 'paye' : p.statut;
    const newDate = newValide ? new Date().toISOString().split('T')[0] : (p.date_paiement ? p.date_paiement.split('T')[0] : null);
    try {
      await axios.put(API + '/comptabilite/' + p.id, { ...p, valide: newValide, statut: newStatut, date_paiement: newDate }, { headers });
      chargerPaiements(); chargerStats();
    } catch (err) { console.error(err); }
  };

  // Liste de prix helpers
  const materielsScolaires = materiels.filter(m => m.section === 'scolaire');
  const materielsEcolage = materiels.filter(m => m.section === 'ecolage');
  const materielsFournitures = materiels.filter(m => m.section === 'fournitures');
  const materielsFacturation = materielsScolaires.length > 0
    ? materielsScolaires.map(m => ({ id: m.id, nom: m.nom, prix: Number(m.prix || 0), qteDefaut: 1, icone: m.icone || '' }))
    : MATERIEL_FACTURATION.map(m => ({ id: m.key, nom: m.label, prix: m.prix, qteDefaut: m.qteDefaut, icone: '' }));
  const elevesClasseFacturation = eleves
    .filter(e => String(e.classe_id || '') === String(classeFacturationId || ''))
    .sort((a, b) => ((a.nom || '') + (a.prenom || '')).localeCompare((b.nom || '') + (b.prenom || ''), 'fr'));

  const creerLigneDefaut = () => { const d = {}; materielsFacturation.forEach(m => { d[m.id] = m.qteDefaut; }); return d; };
  const majQteMateriel = (eleveId, key, value) => {
    const qte = Math.max(0, parseInt(value || '0', 10) || 0);
    setMaterielDistribue(prev => ({ ...prev, [eleveId]: { ...(prev[eleveId] || creerLigneDefaut()), [key]: qte } }));
  };
  const totalEleve = (eleveId) => materielsFacturation.reduce((acc, m) => acc + Number(m.prix) * Number(materielDistribue[eleveId]?.[m.id] ?? m.qteDefaut), 0);
  const totalEcolageFixe = materielsEcolage.reduce((acc, m) => acc + Number(m.prix || 0), 0);
  const totalFactureEleve = (eleveId) => totalEcolageFixe + totalEleve(eleveId);
  const totalClasse = elevesClasseFacturation.reduce((acc, e) => acc + totalFactureEleve(e.id), 0);

  const now0 = new Date();
  const anneeScolaireCourante = now0.getMonth() >= 8 ? `${now0.getFullYear()}-${now0.getFullYear()+1}` : `${now0.getFullYear()-1}-${now0.getFullYear()}`;

  useEffect(() => {
    if (!classeFacturationId) return;
    setMaterielDistribue(prev => {
      const next = { ...prev };
      elevesClasseFacturation.forEach(e => { if (!next[e.id]) next[e.id] = creerLigneDefaut(); });
      return next;
    });
  }, [classeFacturationId, eleves.length]);

  useEffect(() => {
    if (!classeFacturationId || elevesClasseFacturation.length === 0) return;
    const ids = elevesClasseFacturation.map(e => e.id).join(',');
    axios.get(API + `/comptabilite/factures/validation?eleve_ids=${ids}&annee_scolaire=${anneeScolaireCourante}`, { headers })
      .then(res => {
        const map = {};
        res.data.forEach(r => { map[r.eleve_id] = r.valide; });
        setFacturesValidees(prev => ({ ...prev, ...map }));
      }).catch(() => {});
  }, [classeFacturationId, eleves.length]);

  const toggleValidationFacture = async (eleveId) => {
    const nouvelEtat = !facturesValidees[eleveId];
    setFacturesValidees(prev => ({ ...prev, [eleveId]: nouvelEtat }));
    setToutesValidations(prev => ({ ...prev, [eleveId]: nouvelEtat }));
    try {
      await axios.post(API + '/comptabilite/factures/validation', { eleve_id: eleveId, annee_scolaire: anneeScolaireCourante, valide: nouvelEtat }, { headers });
      // Lors de la validation d'un élève EUCMS, créer automatiquement un paiement en_attente
      if (nouvelEtat) {
        const eleve = eleves.find(e => Number(e.id) === Number(eleveId));
        if (eleve?.categorie === 'EUCMS') {
          const dejaExistant = paiements.some(p => Number(p.eleve_id) === Number(eleveId) && p.statut === 'en_attente' && p.type === 'Ecolage');
          if (!dejaExistant) {
            const montant = totalFactureEleve(eleveId);
            await axios.post(API + '/comptabilite', {
              eleve_id: Number(eleveId),
              montant,
              type: 'Ecolage',
              statut: 'en_attente',
              commentaire: ''
            }, { headers });
            await chargerPaiements();
          }
        }
      }
    } catch (e) {
      setFacturesValidees(prev => ({ ...prev, [eleveId]: !nouvelEtat }));
      setToutesValidations(prev => ({ ...prev, [eleveId]: !nouvelEtat }));
    }
  };

  const ouvrirFormMateriel = (m = null) => {
    setMaterielEdit(m);
    setMaterielForm(m
      ? { nom: m.nom || '', section: m.section || 'scolaire', prix: m.prix != null ? String(m.prix) : '', ref: m.ref || '', fournisseur: m.fournisseur || '', rabais: m.rabais != null ? String(m.rabais) : '', remarques: m.remarques || '', icone: m.icone || '' }
      : { nom: '', section: prixOnglet === 'fournitures' ? 'fournitures' : prixOnglet === 'ecolage' ? 'ecolage' : 'scolaire', prix: '', ref: '', fournisseur: '', rabais: '', remarques: '', icone: '' }
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

  const calcQRRef = (classeNom, dateStr, eleve) => {
    // Encode class: keep only digits, pad to 4
    const classDigits = classeNom.replace(/\D/g,'').padStart(4,'0').slice(-4);
    // Date: DDMMYYYY from DD.MM.YYYY
    const parts = (dateStr||'').split('.');
    const dateDigits = parts.length === 3 ? `${parts[0]}${parts[1]}${parts[2]}` : new Date().toLocaleDateString('fr-CH').split('.').join('');
    // Student: char codes of first letters, mod 100
    const n1 = String((eleve.nom||'A').toUpperCase().charCodeAt(0) % 100).padStart(2,'0');
    const n2 = String((eleve.prenom||'A').toUpperCase().charCodeAt(0) % 100).padStart(2,'0');
    // Build 26-digit base, pad/truncate
    const base = `${classDigits}${dateDigits}${n1}${n2}`.replace(/\D/g,'').padStart(26,'0').slice(-26);
    // Modulo 10 recursive check digit
    const TABLE = [0,9,4,6,8,2,7,1,3,5];
    let carry = 0;
    for (const d of base) carry = TABLE[(carry + parseInt(d)) % 10];
    const check = (10 - carry) % 10;
    const ref27 = `${base}${check}`;
    // Format: XX XXXXX XXXXX XXXXX XXXXX XXXXX
    return ref27.replace(/^(.{2})(.{5})(.{5})(.{5})(.{5})(.{5})$/, '$1 $2 $3 $4 $5 $6');
  };

  const calcProrata = (dateDebutCours) => {
    // 100% = début en août-oct, 75% = novembre, 50% = janvier-mars, 25% = avril-juin
    if (!dateDebutCours) return 12;
    const debut = new Date(dateDebutCours);
    const m = debut.getMonth(); // 0=Jan … 11=Dec
    // School year starts in August (m=7)
    if (m >= 7 && m <= 9) return 12; // Aug–Oct → 100% (12/12)
    if (m === 10) return 9;           // Nov     → 75%  (9/12)
    if (m === 11 || m <= 2) return 6; // Dec–Mar → 50%  (6/12)
    return 3;                         // Apr–Jun → 25%  (3/12)
  };

  const construireDonneesFactureEleve = async (eleve, options = {}) => {
    const { persistReference = true } = options;
    const classe = classes.find(c => String(c.id) === String(classeFacturationId));
    const classeNom = classe?.nom || '—';
    const lignes = materielsFacturation.map(m => {
      const qte = Number(materielDistribue[eleve.id]?.[m.id] ?? m.qteDefaut);
      return { ...m, qte, montant: qte * m.prix };
    }).filter(l => l.qte > 0);
    const prorata = calcProrata(eleve.date_debut_cours);
    const lignesEcolage = materielsEcolage.map(m => ({
      id: m.id, nom: m.nom, prix: Number(m.prix || 0),
      prorata, montant: Number(m.prix || 0) * prorata / 12,
    }));
    const totalEcolage = lignesEcolage.reduce((acc, l) => acc + l.montant, 0);
    const totalMateriel = lignes.reduce((acc, l) => acc + l.montant, 0);
    const dateFacture = new Date().toLocaleDateString('fr-CH');
    const now = new Date();
    const annee_scolaire = now.getMonth() >= 8 ? `${now.getFullYear()}-${now.getFullYear()+1}` : `${now.getFullYear()-1}-${now.getFullYear()}`;
    const refGeneree = calcQRRef(classeNom, dateFacture, eleve);
    let reference = refGeneree;
    try {
      if (persistReference) {
        const resp = await axios.post(API + '/comptabilite/factures/reference', { eleve_id: eleve.id, annee_scolaire, reference: refGeneree }, { headers });
        reference = resp.data.reference;
      } else {
        const resp = await axios.get(API + `/comptabilite/factures/reference?eleve_id=${eleve.id}&annee_scolaire=${annee_scolaire}`, { headers });
        reference = resp.data?.reference || refGeneree;
      }
    } catch (e) { /* utilise la référence générée localement si erreur */ }
    return { eleve, classeNom, dateFacture, lignes, lignesEcolage, total: totalEcolage + totalMateriel, reference };
  };

  const ouvrirFactureImprime = async (eleve) => {
    const data = await construireDonneesFactureEleve(eleve, { persistReference: true });
    setFactureImprime(data);
  };
  const imprimerFacture = () => {
    if (!factureImprime) return;
    const publicBase = `${window.location.origin}${process.env.PUBLIC_URL || ''}`;
    const now = new Date();
    const annee = now.getMonth() >= 8 ? `${now.getFullYear()}-${now.getFullYear()+1}` : `${now.getFullYear()-1}-${now.getFullYear()}`;
    const dateStr = now.toLocaleDateString('fr-CH');
    const { eleve, classeNom, lignes, lignesEcolage, total } = factureImprime;
    const cg = `<colgroup><col/><col style="width:90px"/><col style="width:110px"/><col style="width:110px"/></colgroup>`;
    const th = (col1, col2 = 'Prorata') => `<thead><tr style="background:#6366f1;color:white"><th style="padding:6px 8px;font-size:9pt;text-align:left">${col1}</th><th style="padding:6px 8px;font-size:9pt;text-align:center">${col2}</th><th style="padding:6px 8px;font-size:9pt;text-align:right">Prix</th><th style="padding:6px 8px;font-size:9pt;text-align:right">Montant</th></tr></thead>`;
    const tdR = `border:1px solid #dbe3ee;padding:5px 8px;font-size:9pt;text-align:center`;
    const tdMoney = `border:1px solid #dbe3ee;padding:5px 8px;font-size:9pt;text-align:right`;
    const tdL = `border:1px solid #dbe3ee;padding:5px 8px;font-size:9pt`;
    const stLine = (label, val) => `<div style="display:flex;justify-content:space-between;font-size:9pt;padding:4px 8px;background:#f1f5f9;border:1px solid #e2e8f0;border-top:none;margin-bottom:10px"><span style="font-weight:600">${label}</span><b>${val.toFixed(2)} CHF</b></div>`;
    const totalEcolageVal = (lignesEcolage||[]).reduce((a,l)=>a+l.montant,0);
    const totalMaterielVal = lignes.reduce((a,l)=>a+l.montant,0);
    const ecolageHtml = (lignesEcolage || []).length > 0 ? `
      <table style="table-layout:fixed">
        ${cg}${th('Frais d\'écolage')}
        <tbody>${(lignesEcolage || []).map((l,i) => `
          <tr style="background:${i%2===0?'white':'#fafafa'}">
            <td style="${tdL}">${l.nom}</td>
            <td style="${tdR}">${Math.round(l.prorata/12*100)}%</td>
            <td style="${tdMoney}">${Number(l.prix).toFixed(2)} CHF</td>
            <td style="${tdMoney};font-weight:700">${Number(l.montant).toFixed(2)} CHF</td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${stLine('Sous-total', totalEcolageVal)}` : '';
    const lignesHtml = lignes.length > 0 ? `
      <table style="table-layout:fixed">
        ${cg}${th('Matériel scolaire', 'Quantité')}
        <tbody>${lignes.map((l,i) => `
          <tr style="background:${i%2===0?'white':'#fafafa'}">
            <td style="${tdL}">${l.nom}</td>
            <td style="${tdR}">${l.qte}</td>
            <td style="${tdMoney}">${Number(l.prix).toFixed(2)} CHF</td>
            <td style="${tdMoney};font-weight:700">${Number(l.montant).toFixed(2)} CHF</td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${stLine('Sous-total', totalMaterielVal)}` : '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Facture</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif; background: white; color: #1e293b; }
      @page { size: A4 portrait; margin: 15mm 20mm; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      .entete, .entete * { font-size: 6pt !important; }
      .scai { font-size: 17pt !important; font-weight: 800; line-height: 1; color: #1e293b; }
      .footer { font-size: 6pt !important; position: fixed; bottom: 0; left: 0; right: 0; width: 100%; display: flex; align-items: center; gap: 12px; padding-top: 10px; }
      .footer * { font-size: 6pt !important; }
      .signature { position: fixed; bottom: 100px; right: 20mm; font-size: 10pt; text-align: right; }
      .titre { text-align: center; font-weight: 700; font-size: 17pt; letter-spacing: 1px; text-transform: uppercase; margin-top: 25pt; margin-bottom: 20pt; color: #0f172a; }
      .date { text-align: right; font-size: 10pt; margin-bottom: 20pt; }
      table { width: 100%; border-collapse: collapse; margin-top: 14px; }
      thead tr { background: #6366f1; color: white; }
      thead th { padding: 8px 10px; font-size: 10pt; text-align: left; }
      p { font-size: 10pt; margin-bottom: 8pt; }
    </style></head><body>
      <div class="entete" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px;padding-bottom:14px;">
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <img src="${publicBase}/logo-etat-du-valais.png" style="width:38px;" onerror="this.style.display='none'" />
          <div><div>Département de la santé, des affaires sociales et de la culture</div><div>Service de l'action sociale</div><div>Office de l'asile</div><div>Centre de formation "Le Botza"</div></div>
        </div>
        <div style="text-align:right;">
          <div class="scai">SCAI</div>
          <div style="font-size:12px;font-weight:700;color:#374151;">${annee}</div>
          <div style="font-size:10px;font-weight:700;color:#475569;">CLASSES D'ACCUEIL</div>
        </div>
      </div>
      <div class="titre">Facture</div>
      <div class="date">Vétroz, le ${dateStr}</div>
      <div style="font-size:10pt;color:#64748b;margin-bottom:2px">NOM Prénom</div>
      <div style="font-size:13pt;font-weight:700;color:#0f172a;margin-bottom:6px">${eleve.nom} ${eleve.prenom}</div>
      <div style="font-size:10pt;color:#64748b;margin-bottom:2px">Classe</div>
      <div style="font-size:11pt;color:#334155;margin-bottom:16px">${classeNom}</div>
      <div style="font-size:9pt;color:#64748b;margin-bottom:16px">Référence : <b style="color:#334155;font-family:monospace;letter-spacing:1px">${factureImprime.reference || calcQRRef(classeNom, dateStr, eleve)}</b></div>
      ${ecolageHtml}
      ${lignesHtml}
      <div style="display:flex;justify-content:space-between;font-size:11pt;font-weight:700;border-top:2px solid #0f172a;padding-top:8px;margin-top:4px">
        <span>Montant de la facture</span><b>${Number(total).toFixed(2)} CHF</b>
      </div>
      ${eleve.categorie === 'EUCMS' ? (() => {
        const ref5 = (factureImprime.reference || calcQRRef(classeNom, dateStr, eleve)).replace(/\s/g,'').slice(-5);
        return `<p style="margin-top:16px;font-size:9pt;color:#1e293b;line-height:1.6">Nous vous prions de bien vouloir régler cette facture dans un délai de <b>30 jours</b> dès réception. Sans paiement dans ce délai, l'école se réserve le droit d'annuler l'admission de l'élève.</p>
        <p style="margin-top:8px;font-size:9pt;color:#1e293b;line-height:1.6">Lors du paiement, veuillez indiquer dans le motif les <b>5 derniers chiffres de la référence (${ref5})</b> ainsi que la <b>classe (${classeNom})</b>.</p>`;
      })() : ''}
      <div class="signature">Signature : ____________________________</div>
      <div class="footer">
        <img src="${publicBase}/logo-pied-page.png" style="height:30px;object-fit:contain;" onerror="this.style.display='none'" />
        <span>Zone Industrielle 4, 1963 Vétroz<br>Tél. 027 606 18 60</span>
      </div>
      ${eleve.categorie === 'EUCMS' ? `
      <div style="page-break-before:always;display:flex;align-items:center;justify-content:center;min-height:100vh;">
        <img src="${publicBase}/facture-qr.png" style="max-width:100%;max-height:100vh;object-fit:contain;" />
      </div>` : ''}
    </body></html>`;
    const finalHtml = injectForcedPrintCss(html, 'A4 portrait', '15mm 20mm');
    openPrintPopup(finalHtml, { title: 'Facture', width: 900, height: 800 });
  };

  const validerToutesFacturesClasse = async () => {
    if (!classeFacturationId || elevesClasseFacturation.length === 0) return;
    const cible = elevesClasseFacturation.filter(e => !facturesValidees[e.id]);
    if (cible.length === 0) return;
    for (const e of cible) {
      // eslint-disable-next-line no-await-in-loop
      await toggleValidationFacture(e.id);
    }
  };

  const validerTousPaiementsFiltres = async () => {
    const cible = paiementsFiltres.filter(p => !p.valide);
    for (const p of cible) {
      // eslint-disable-next-line no-await-in-loop
      await toggleValidePaiement(p);
    }
  };

  const imprimerFacturesClasse = async () => {
    if (!classeFacturationId) return;
    const q = rechercheClasseFacture.trim().toLowerCase();
    const elevesVisibles = elevesClasseFacturation.filter(e => {
      if (!q) return true;
      const full = `${e.nom || ''} ${e.prenom || ''}`.toLowerCase();
      return full.includes(q) || String(totalFactureEleve(e.id).toFixed(2)).includes(q);
    });
    if (elevesVisibles.length === 0) return;
    const pages = [];
    for (const e of elevesVisibles) {
      // eslint-disable-next-line no-await-in-loop
      const data = await construireDonneesFactureEleve(e, { persistReference: false });
      const lignesEcolage = data.lignesEcolage || [];
      const lignes = data.lignes || [];
      const totalEcolageVal = lignesEcolage.reduce((a, l) => a + l.montant, 0);
      const totalMaterielVal = lignes.reduce((a, l) => a + l.montant, 0);
      const rowsEcolage = lignesEcolage.map((l, i) => `
        <tr style="background:${i % 2 === 0 ? 'white' : '#fafafa'}">
          <td style="border:1px solid #dbe3ee;padding:5px 8px;font-size:9pt">${l.nom}</td>
          <td style="border:1px solid #dbe3ee;padding:5px 8px;font-size:9pt;text-align:center">${Math.round(l.prorata / 12 * 100)}%</td>
          <td style="border:1px solid #dbe3ee;padding:5px 8px;font-size:9pt;text-align:right">${Number(l.prix).toFixed(2)} CHF</td>
          <td style="border:1px solid #dbe3ee;padding:5px 8px;font-size:9pt;text-align:right;font-weight:700">${Number(l.montant).toFixed(2)} CHF</td>
        </tr>
      `).join('');
      const rowsMat = lignes.map((l, i) => `
        <tr style="background:${i % 2 === 0 ? 'white' : '#fafafa'}">
          <td style="border:1px solid #dbe3ee;padding:5px 8px;font-size:9pt">${l.nom}</td>
          <td style="border:1px solid #dbe3ee;padding:5px 8px;font-size:9pt;text-align:center">${l.qte}</td>
          <td style="border:1px solid #dbe3ee;padding:5px 8px;font-size:9pt;text-align:right">${Number(l.prix).toFixed(2)} CHF</td>
          <td style="border:1px solid #dbe3ee;padding:5px 8px;font-size:9pt;text-align:right;font-weight:700">${Number(l.montant).toFixed(2)} CHF</td>
        </tr>
      `).join('');
      pages.push(`
        <section class="facture-page">
          <div class="date">Vétroz, le ${data.dateFacture}</div>
          <div class="meta"><b>Nom Prénom :</b> ${data.eleve.nom} ${data.eleve.prenom}</div>
          <div class="meta"><b>Classe :</b> ${data.classeNom}</div>
          <div class="meta">Référence : <b style="font-family:monospace;letter-spacing:1px">${data.reference || ''}</b></div>
          ${lignesEcolage.length ? `<table style="table-layout:fixed"><colgroup><col/><col style="width:90px"/><col style="width:110px"/><col style="width:110px"/></colgroup><thead><tr style="background:#6366f1;color:white"><th style="padding:6px 8px;text-align:left;font-size:9pt">Frais d'écolage</th><th style="padding:6px 8px;text-align:center;font-size:9pt">Prorata</th><th style="padding:6px 8px;text-align:right;font-size:9pt">Prix</th><th style="padding:6px 8px;text-align:right;font-size:9pt">Montant</th></tr></thead><tbody>${rowsEcolage}</tbody></table><div class="st">Sous-total <b>${totalEcolageVal.toFixed(2)} CHF</b></div>` : ''}
          ${lignes.length ? `<table style="table-layout:fixed"><colgroup><col/><col style="width:90px"/><col style="width:110px"/><col style="width:110px"/></colgroup><thead><tr style="background:#6366f1;color:white"><th style="padding:6px 8px;text-align:left;font-size:9pt">Matériel scolaire</th><th style="padding:6px 8px;text-align:center;font-size:9pt">Quantité</th><th style="padding:6px 8px;text-align:right;font-size:9pt">Prix</th><th style="padding:6px 8px;text-align:right;font-size:9pt">Montant</th></tr></thead><tbody>${rowsMat}</tbody></table><div class="st">Sous-total <b>${totalMaterielVal.toFixed(2)} CHF</b></div>` : ''}
          <table style="table-layout:fixed;margin-top:4px"><colgroup><col/><col style="width:90px"/><col style="width:110px"/><col style="width:110px"/></colgroup><tbody><tr style="background:#f8fafc"><td colspan="3" style="border:1px solid #dbe3ee;padding:5px 8px;font-size:9pt;font-weight:700;text-transform:uppercase">Montant de la facture</td><td style="border:1px solid #dbe3ee;padding:5px 8px;font-size:9pt;text-align:right;font-weight:800">${Number(data.total).toFixed(2)} CHF</td></tr></tbody></table>
          <div class="signature">Signature : ____________________________</div>
        </section>
      `);
    }
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Factures ${classeFactureNom}</title><style>
      @page { size: A4 portrait; margin: 12mm 16mm; }
      body { font-family: 'Century Gothic', Arial, sans-serif; color: #1e293b; }
      .facture-page { page-break-after: always; }
      .facture-page:last-child { page-break-after: auto; }
      .date { text-align: right; font-size: 10pt; margin-bottom: 10px; }
      .meta { font-size: 10pt; margin-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      .st { display:flex; justify-content:space-between; font-size:9pt; padding:4px 8px; background:#f1f5f9; border:1px solid #e2e8f0; border-top:none; margin-bottom:8px; }
      .signature { margin-top: 16px; text-align: right; font-size: 10pt; }
    </style></head><body>${pages.join('')}</body></html>`;
    const finalHtml = injectForcedPrintCss(html, 'A4 portrait', '12mm 16mm');
    openPrintPopup(finalHtml, { title: `Factures ${classeFactureNom}`, width: 1000, height: 800 });
  };

  const classeFactureObj = classes.find(c => String(c.id) === String(classeFacturationId));
  const classeFactureNom = classeFactureObj?.nom || '—';
  const toutesFacturesClasseValidees = elevesClasseFacturation.length > 0
    && elevesClasseFacturation.every(e => !!facturesValidees[e.id]);
  return (
    <div style={styles.page}>
      <div style={{...stickyPageChrome(), marginBottom:0}}>
      <div style={styles.header}>
        {onglet === 'factures' && classeFacturationId ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <button type="button" style={styles.btnRetourListe} onClick={retourListeClasses}>← Retour</button>
              <h2 style={styles.titre}>Factures — {classeFactureNom}</h2>
            </div>
            <button type="button" style={{ ...styles.btnAjouter, marginLeft: 'auto' }} onClick={imprimerFacturesClasse}>Imprimer</button>
          </>
        ) : (
          <h2 style={styles.titre}>Comptabilité</h2>
        )}
      </div>
      </div>

      {/* ===== CLASSES (liste → factures par classe) ===== */}
      {onglet === 'classes' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input style={styles.tabSearch} placeholder="Rechercher une classe..." value={rechercheFactures} onChange={e => setRechercheFactures(e.target.value)} />
            {!showFacturesNiveaux ? (
              <button style={styles.btnGhostPill} onClick={() => setShowFacturesNiveaux(true)}>Trier</button>
            ) : (
              <div style={styles.toggleGroup}>
                {['Tous', 'CSC', 'CFR', 'EPL', 'CPR'].map(niv => (
                  <button key={niv} style={{ ...styles.toggleBtn, ...(facturesNiveau === niv ? styles.toggleBtnActif : {}) }}
                    onClick={() => { setFacturesNiveau(niv); setRechercheFactures(''); }}>
                    {niv}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={styles.tabContent}>
            {(() => {
              const classesNiveau = classes
                .filter(c => facturesNiveau === 'Tous' || String(c.niveau || '').toUpperCase().includes(facturesNiveau))
                .filter(c => !rechercheFactures || (c.nom || '').toLowerCase().includes(rechercheFactures.toLowerCase()));
              return (
                <div style={styles.tableWrap}><table style={{ ...styles.tableMateriel, tableLayout: 'auto', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.thMateriel, width: 1, whiteSpace: 'nowrap', textAlign: 'center' }}></th>
                      <th style={{ ...styles.thMateriel, width: 1, whiteSpace: 'nowrap' }}>Classe</th>
                      <th style={{ ...styles.thMateriel, textAlign: 'center' }}>Élèves</th>
                      <th style={{ ...styles.thMateriel, textAlign: 'center', color: '#bbf7d0' }}>✓ Validées</th>
                      <th style={{ ...styles.thMateriel, textAlign: 'center', color: '#fecaca' }}>En attente</th>
                      <th style={styles.thMateriel}>Progression</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classesNiveau.map((c, idx) => {
                      const elevesC = eleves.filter(e => String(e.classe_id) === String(c.id));
                      const total = elevesC.length;
                      const valides = elevesC.filter(e => toutesValidations[e.id]).length;
                      const pct = total > 0 ? Math.round(valides / total * 100) : 0;
                      return (
                        <tr key={c.id} style={{ background: idx % 2 === 0 ? 'white' : '#fafbfc' }}>
                          <td style={{ ...styles.tdMateriel, ...styles.tdClasseListe, textAlign: 'center', whiteSpace: 'nowrap', width: 1 }}>
                            <button type="button" style={{ ...styles.btnDetailClasse, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 6 }} onClick={() => openFacturesClasse(c.id)} title="Voir les factures de la classe">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path fillRule="evenodd" d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 13a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>
                            </button>
                          </td>
                          <td style={{ ...styles.tdMateriel, ...styles.tdClasseListe, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', width: 1 }}>{c.nom}</td>
                          <td style={{ ...styles.tdMateriel, ...styles.tdClasseListe, textAlign: 'center', color: '#64748b' }}>{total}</td>
                          <td style={{ ...styles.tdMateriel, ...styles.tdClasseListe, textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{valides}</td>
                          <td style={{ ...styles.tdMateriel, ...styles.tdClasseListe, textAlign: 'center', fontWeight: 700, color: total - valides > 0 ? '#dc2626' : '#16a34a' }}>{total - valides}</td>
                          <td style={{ ...styles.tdMateriel, ...styles.tdClasseListe, minWidth: 120 }}>
                            <div style={{ background: '#e2e8f0', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                              <div style={{ background: pct === 100 ? '#16a34a' : '#6366f1', height: '100%', width: `${pct}%`, borderRadius: 99, transition: 'width .3s' }} />
                            </div>
                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{pct}%</div>
                          </td>
                        </tr>
                      );
                    })}
                    {classesNiveau.length === 0 && (
                      <tr><td colSpan={6} style={styles.vide}>Aucune classe pour ce niveau</td></tr>
                    )}
                  </tbody>
                </table></div>
              );
            })()}
          </div>
        </>
      )}

      {/* ===== FACTURES (détail d'une classe) ===== */}
      {onglet === 'factures' && (
        <>
          {!classeFacturationId ? (
            <div style={styles.tabContent}>
              <div style={{ ...styles.vide, padding: '32px 20px' }}>
                <p style={{ margin: '0 0 16px', color: '#64748b' }}>Sélectionnez une classe dans l’onglet <b>Classes</b> pour afficher et gérer les factures.</p>
                <button type="button" style={styles.btnAjouter} onClick={() => setOnglet('classes')}>Voir la liste des classes</button>
              </div>
            </div>
          ) : (
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  <input
                    style={styles.tabSearch}
                    placeholder="Rechercher un élève ou un montant..."
                    value={rechercheClasseFacture}
                    onChange={e => setRechercheClasseFacture(e.target.value)}
                  />
                  <button
                    style={toutesFacturesClasseValidees ? styles.btnValidatedPill : styles.btnGhostPill}
                    onClick={validerToutesFacturesClasse}
                    disabled={toutesFacturesClasseValidees}
                  >
                    {toutesFacturesClasseValidees ? 'Factures validées' : 'Valider toutes les factures'}
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ ...styles.tableMateriel, minWidth: 900, tableLayout: 'auto' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ ...styles.thMateriel, textAlign: 'center', width: 1, whiteSpace: 'nowrap' }}></th>
                        <th style={styles.thMateriel}>Nom</th>
                        <th style={styles.thMateriel}>Prénom</th>
                        {materielsFacturation.map(m => {
                          const IcComp = m.icone ? ICONS_MATERIELS[m.icone] : null;
                          return (
                            <th key={m.id} style={{ ...styles.thMateriel, textAlign: 'center', minWidth: IcComp ? 44 : 80, fontSize: 10, lineHeight: 1.2 }} title={m.nom}>
                              {IcComp ? <span style={{ display: 'flex', justifyContent: 'center', color: 'white' }}><IcComp size={20} active={false} /></span> : m.nom}
                            </th>
                          );
                        })}
                        <th style={{ ...styles.thMateriel, textAlign: 'right', width: '1%', whiteSpace: 'nowrap' }}>Montant</th>
                        <th style={{ ...styles.thMateriel, textAlign: 'center', width: '1%', whiteSpace: 'nowrap' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const elevesFiltres = elevesClasseFacturation.filter(e => {
                          if (rechercheClasseFacture.trim()) {
                            const q = rechercheClasseFacture.toLowerCase();
                            const full = `${e.nom || ''} ${e.prenom || ''}`.toLowerCase();
                            if (!full.includes(q) && !String(totalFactureEleve(e.id).toFixed(2)).includes(q)) return false;
                          }
                          return true;
                        });
                        if (elevesFiltres.length === 0) {
                          return <tr><td colSpan={materielsFacturation.length + 5} style={styles.vide}>Aucun élève dans cette classe</td></tr>;
                        }
                        return elevesFiltres.map((e, idx) => {
                          const valide = !!facturesValidees[e.id];
                          return (
                        <tr key={e.id} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ ...styles.tdMateriel, textAlign: 'center', whiteSpace: 'nowrap', width: 1 }}>
                            <button style={styles.btnDetailClasse} onClick={() => ouvrirFactureImprime(e)} title="Détail facture">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path fillRule="evenodd" d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 13a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>
                            </button>
                          </td>
                          <td style={styles.tdMateriel}>{e.nom || '—'}</td>
                          <td style={styles.tdMateriel}>{e.prenom || '—'}</td>
                          {materielsFacturation.map(m => (
                            <td key={m.id} style={{ ...styles.tdMateriel, textAlign: 'center' }}>
                              <input type="number" min="0"
                                disabled={valide}
                                style={{ width: 48, padding: '4px 6px', border: '1px solid #dbe3ee', borderRadius: 6, fontSize: 12, textAlign: 'center', ...(valide ? { background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' } : {}) }}
                                value={materielDistribue[e.id]?.[m.id] ?? m.qteDefaut}
                                onChange={ev => majQteMateriel(e.id, m.id, ev.target.value)}
                              />
                            </td>
                          ))}
                          <td style={{ ...styles.tdMateriel, textAlign: 'right', whiteSpace: 'nowrap' }}>{totalFactureEleve(e.id).toFixed(2)} CHF</td>
                          <td style={{ ...styles.tdMateriel, textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => toggleValidationFacture(e.id)}
                              title={valide ? 'Facture validée' : 'Facture non validée'}
                              style={{ padding: 4, borderRadius: 8, border: 'none', cursor: 'pointer', background: valide ? '#dcfce7' : '#f1f5f9', color: valide ? '#16a34a' : '#9ca3af', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width={16} height={16} viewBox="0 0 24 24">
                                <path fillRule="evenodd" fill="currentColor" d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
                                <path fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M7 12l3 3 7-7"/>
                              </svg>
                            </button>
                          </td>
                        </tr>
                        );
                      });
                      })()}
                    </tbody>
                  </table>
                </div>
            </div>
          )}
        </>
      )}

      {/* ===== PAIEMENTS ===== */}
      {onglet === 'paiements' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input style={styles.tabSearch} placeholder="Rechercher nom, prénom, classe, montant..." value={recherchePaiements} onChange={e => setRecherchePaiements(e.target.value)} />
            {!showPaiementsNiveaux ? (
              <button style={styles.btnGhostPill} onClick={() => setShowPaiementsNiveaux(true)}>Trier</button>
            ) : (
              <div style={styles.toggleGroup}>
                {['Tous', 'CSC', 'CFR', 'EPL', 'CPR'].map(niv => (
                  <button key={niv} style={{ ...styles.toggleBtn, ...(paiementsNiveau === niv ? styles.toggleBtnActif : {}) }}
                    onClick={() => { setPaiementsNiveau(niv); }}>{niv}</button>
                ))}
              </div>
            )}
          </div>
        <div style={styles.tableWrap}><table style={{ ...styles.table, tableLayout: 'auto' }}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={styles.th}>Élève</th>
              <th style={{ ...styles.th, width: '1%', whiteSpace: 'nowrap' }}>Classe</th>
              <th style={{ ...styles.th, width: '1%', whiteSpace: 'nowrap' }}>Montant</th>
              <th style={styles.th}>Statut</th>
              <th style={{ ...styles.th, width: '1%', whiteSpace: 'nowrap' }}>Émis</th>
              <th style={{ ...styles.th, width: '1%', whiteSpace: 'nowrap' }}>Date</th>
              <th style={{ ...styles.th, width: '1%', whiteSpace: 'nowrap', textAlign: 'center' }}></th>
              <th style={{ ...styles.th, width: '1%', whiteSpace: 'nowrap', textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {paiementsAffiches.length === 0 ? (
              <tr><td colSpan="8" style={styles.vide}>Aucun paiement</td></tr>
            ) : paiementsAffiches.map(p => {
              const PILLS = [
                { val: 'paye',       label: '✓ Payé',       bg: '#dcfce7', color: '#166534' },
                { val: 'en_attente', label: '… En attente', bg: '#dbeafe', color: '#1d4ed8' },
                { val: 'en_retard',  label: '✗ En retard',  bg: '#fef3c7', color: '#d97706' },
                { val: 'annule',     label: '✗ Annulé',     bg: '#fee2e2', color: '#dc2626' },
              ];
              const statut = p.statut || 'en_attente';
              const valide = !!p.valide;
              return (
                <tr key={p.id} style={styles.tr}>
                  <td style={styles.td}><b>{p.prenom} {p.nom}</b></td>
                  <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>{p.classe || '—'}</td>
                  <td style={{ ...styles.td, color: '#1e293b', whiteSpace: 'nowrap' }}>{parseFloat(p.montant).toFixed(2)} CHF</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {PILLS.map(pill => (
                        <button key={pill.val} type="button"
                          onClick={() => !valide && setStatutPaiement(p, pill.val)}
                          disabled={valide}
                          style={{ padding: '4px 10px', borderRadius: 20, border: `2px solid ${statut === pill.val ? pill.color : '#e2e8f0'}`, background: statut === pill.val ? pill.bg : 'white', color: statut === pill.val ? pill.color : '#94a3b8', fontWeight: statut === pill.val ? 700 : 400, fontSize: 12, cursor: valide ? 'not-allowed' : 'pointer', outline: 'none', fontFamily: 'inherit', opacity: valide ? 0.6 : 1 }}>
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td style={{ ...styles.td, whiteSpace: 'nowrap', color: '#64748b' }}>{p.emis_at ? new Date(p.emis_at).toLocaleDateString('fr-CH') : '—'}</td>
                  <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>{p.date_paiement ? new Date(p.date_paiement).toLocaleDateString('fr-CH') : '—'}</td>
                  <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                    <button style={styles.btnEdit} onClick={() => ouvrirEdit(p)} title="Modifier">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button style={styles.btnDelete} onClick={() => supprimerPaiement(p.id)} title="Supprimer">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => toggleValidePaiement(p)}
                      title={valide ? 'Paiement validé' : 'Paiement non validé'}
                      style={{ padding: 4, borderRadius: 8, border: 'none', cursor: 'pointer', background: valide ? '#dcfce7' : '#f1f5f9', color: valide ? '#16a34a' : '#9ca3af', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width={16} height={16} viewBox="0 0 24 24">
                        <path fillRule="evenodd" fill="currentColor" d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
                        <path fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M7 12l3 3 7-7"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
        </>
      )}

      {/* ===== LISTE DE PRIX ===== */}
      {onglet === 'prix' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input style={styles.tabSearch} placeholder="Rechercher un article..." value={recherchePrix} onChange={e => setRecherchePrix(e.target.value)} />
            <div style={styles.toggleGroup}>
              {[{ key: 'ecolage', label: 'Écolage' }, { key: 'scolaire', label: 'Matériel scolaire' }, { key: 'fournitures', label: 'Autres fournitures' }].map(t => (
                <button key={t.key} style={{ ...styles.toggleBtn, ...(prixOnglet === t.key ? styles.toggleBtnActif : {}) }} onClick={() => setPrixOnglet(t.key)}>{t.label}</button>
              ))}
            </div>
          </div>
        <div style={{ ...styles.tabContent, marginTop: 0 }}>

            {/* Écolage */}
          {prixOnglet === 'ecolage' && (
            <div style={styles.tableWrap}><table style={styles.tableMateriel}>
              <colgroup>
                <col /><col style={{ width: 110 }} /><col style={{ width: 100 }} /><col style={{ width: 130 }} /><col style={{ width: 90 }} /><col style={{ width: 160 }} /><col style={{ width: 85 }} />
              </colgroup>
              <thead>
                <tr>
                  {['Désignation', 'Prix', 'REF', 'Fournisseur', 'Rabais', 'Remarques', 'Action'].map((h, i, arr) => (
                    <th key={h} style={{ ...styles.thMateriel, borderRadius: i === 0 ? '8px 0 0 8px' : i === arr.length - 1 ? '0 8px 8px 0' : 0 }}>{h}</th>
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
                    <td style={{ ...styles.tdMateriel, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.ref || '—'}</td>
                    <td style={{ ...styles.tdMateriel, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.fournisseur || '—'}</td>
                    <td style={{ ...styles.tdMateriel, textAlign: 'right' }}>{Number(m.rabais || 0).toFixed(2)}%</td>
                    <td style={{ ...styles.tdMateriel, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.remarques || ''}>{m.remarques || '—'}</td>
                    <td style={{ ...styles.tdMateriel, textAlign: 'center' }}>
                      <button style={styles.btnEdit} onClick={() => ouvrirFormMateriel(m)} title="Modifier">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button style={styles.btnDelete} onClick={() => handleDeleteMateriel(m.id)} title="Supprimer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}

          {/* Matériel scolaire */}
          {prixOnglet === 'scolaire' && (
            <div style={styles.tableWrap}><table style={styles.tableMateriel}>
              <colgroup>
                <col /><col style={{ width: 110 }} /><col style={{ width: 100 }} /><col style={{ width: 130 }} /><col style={{ width: 90 }} /><col style={{ width: 160 }} /><col style={{ width: 85 }} />
              </colgroup>
              <thead>
                <tr>
                  {['Désignation', 'Prix', 'REF', 'Fournisseur', 'Rabais', 'Remarques', 'Action'].map((h, i, arr) => (
                    <th key={h} style={{ ...styles.thMateriel, borderRadius: i === 0 ? '8px 0 0 8px' : i === arr.length - 1 ? '0 8px 8px 0' : 0 }}>{h}</th>
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
                    <td style={{ ...styles.tdMateriel, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.ref || '—'}</td>
                    <td style={{ ...styles.tdMateriel, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.fournisseur || '—'}</td>
                    <td style={{ ...styles.tdMateriel, textAlign: 'right' }}>{Number(m.rabais || 0).toFixed(2)}%</td>
                    <td style={{ ...styles.tdMateriel, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.remarques || ''}>{m.remarques || '—'}</td>
                    <td style={{ ...styles.tdMateriel, textAlign: 'center' }}>
                      <button style={styles.btnEdit} onClick={() => ouvrirFormMateriel(m)} title="Modifier">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button style={styles.btnDelete} onClick={() => handleDeleteMateriel(m.id)} title="Supprimer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}

          {/* Autres fournitures */}
          {prixOnglet === 'fournitures' && (
            <div style={styles.tableWrap}><table style={styles.tableMateriel}>
              <colgroup>
                <col /><col style={{ width: 110 }} /><col style={{ width: 100 }} /><col style={{ width: 130 }} /><col style={{ width: 90 }} /><col style={{ width: 160 }} /><col style={{ width: 85 }} />
              </colgroup>
              <thead>
                <tr>
                  {['Désignation', 'Prix', 'REF', 'Fournisseur', 'Rabais', 'Remarques', 'Action'].map((h, i, arr) => (
                    <th key={h} style={{ ...styles.thMateriel, borderRadius: i === 0 ? '8px 0 0 8px' : i === arr.length - 1 ? '0 8px 8px 0' : 0 }}>{h}</th>
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
                    <td style={{ ...styles.tdMateriel, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.ref || '—'}</td>
                    <td style={{ ...styles.tdMateriel, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.fournisseur || '—'}</td>
                    <td style={{ ...styles.tdMateriel, textAlign: 'right' }}>{Number(m.rabais || 0).toFixed(2)}%</td>
                    <td style={{ ...styles.tdMateriel, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.remarques || ''}>{m.remarques || '—'}</td>
                    <td style={{ ...styles.tdMateriel, textAlign: 'center' }}>
                      <button style={styles.btnEdit} onClick={() => ouvrirFormMateriel(m)} title="Modifier">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button style={styles.btnDelete} onClick={() => handleDeleteMateriel(m.id)} title="Supprimer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}

        </div>
        {['ecolage', 'scolaire', 'fournitures'].includes(prixOnglet) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 15 }}>
            <button style={{ ...styles.btnAjouter, padding: '7px 14px', fontSize: '13px' }} onClick={() => ouvrirFormMateriel(null)}>+ Ajouter</button>
          </div>
        )}
        <div style={{ display: 'none' }}>
          {/* Facturation classe */}
          {prixOnglet === 'facturation' && (
            <div style={styles.facturationLayout}>
              <div style={styles.classesList}>
                <div style={styles.classesListTitre}>Classes</div>
                {classes.map(c => (
                  <button key={c.id}
                    style={{ ...styles.classeBtn, ...(String(c.id) === String(classeFacturationId) ? styles.classeBtnActive : {}) }}
                    onClick={() => openFacturesClasse(c.id)}>
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
                              <td style={{ ...styles.tdMateriel, textAlign: 'right', fontWeight: '700', color: '#1a73e8' }}>{totalFactureEleve(e.id).toFixed(2)} CHF</td>
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
                  <div style={{ ...styles.input, background: '#f8fafc', color: '#475569', cursor: 'default', display: 'flex', alignItems: 'center' }}>
                    {editForm.prenom} {editForm.nom}
                  </div>
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
                  <input style={styles.input} type="text" placeholder="" value={editForm.commentaire} onChange={e => setEditForm({ ...editForm, commentaire: e.target.value })} />
                </div>
                <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                  <label style={styles.label}>Référence facture</label>
                  <input style={{ ...styles.input, fontFamily: 'monospace', letterSpacing: 1 }} type="text" placeholder="Ex: 00 00000 00000 00000 00000 00000" value={editForm.reference} onChange={e => setEditForm({ ...editForm, reference: e.target.value })} />
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
                  {!materielEdit ? (
                    <div style={{ ...styles.input, background: '#f8fafc', color: '#475569', cursor: 'default' }}>
                      {materielForm.section === 'ecolage' ? 'Écolage' : materielForm.section === 'scolaire' ? 'Matériel scolaire' : 'Autres fournitures'}
                    </div>
                  ) : (
                    <select style={styles.input} value={materielForm.section} onChange={e => setMaterielForm({ ...materielForm, section: e.target.value })}>
                      <option value="ecolage">Écolage</option>
                      <option value="scolaire">Matériel scolaire</option>
                      <option value="fournitures">Autres fournitures</option>
                    </select>
                  )}
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
                {materielForm.section === 'scolaire' && (
                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={styles.label}>Icône (optionnel — visible dans le tableau de facturation)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {ICONES_MATERIELS_LIST.map(ic => {
                        const Comp = ICONS_MATERIELS[ic.key];
                        const sel = materielForm.icone === ic.key;
                        return Comp ? (
                          <button key={ic.key} type="button" title={ic.label}
                            style={{ padding: '6px', border: sel ? '2px solid #6366f1' : '1px solid #e2e8f0', borderRadius: 8, background: sel ? '#ede9fe' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sel ? '#6366f1' : '#64748b' }}
                            onClick={() => setMaterielForm({ ...materielForm, icone: sel ? '' : ic.key })}>
                            <Comp size={22} active={false} />
                          </button>
                        ) : null;
                      })}
                    </div>
                    {materielForm.icone && ICONS_MATERIELS[materielForm.icone] && (() => {
                      const Comp = ICONS_MATERIELS[materielForm.icone];
                      return (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
                          Sélectionné : <span style={{ color: '#6366f1' }}><Comp size={20} active={false} /></span>
                          <button type="button" style={{ fontSize: 11, color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setMaterielForm({ ...materielForm, icone: '' })}>✕ Supprimer</button>
                        </div>
                      );
                    })()}
                  </div>
                )}
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
              <button style={styles.btnSauver} onClick={imprimerFacture}>Imprimer</button>
            </div>
            <div id="facture-pdf" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '28px 32px', color: '#1e293b', fontFamily: "'Century Gothic', CenturyGothic, 'Trebuchet MS', sans-serif" }}>
              {/* En-tête */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18, paddingBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <img src={`${window.location.origin}${process.env.PUBLIC_URL || ''}/logo-etat-du-valais.png`} style={{ width: 38 }} alt="" onError={e => e.target.style.display='none'} />
                  <div style={{ fontSize: 7 }}>
                    <div>Département de la santé, des affaires sociales et de la culture</div>
                    <div>Service de l'action sociale</div>
                    <div>Office de l'asile</div>
                    <div>Centre de formation "Le Botza"</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: '#1e293b' }}>SCAI</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{(() => { const n = new Date(); return n.getMonth() >= 8 ? `${n.getFullYear()}-${n.getFullYear()+1}` : `${n.getFullYear()-1}-${n.getFullYear()}`; })()}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#475569' }}>CLASSES D'ACCUEIL</div>
                </div>
              </div>
              {/* Titre */}
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 20, letterSpacing: 1, textTransform: 'uppercase', marginTop: 32, marginBottom: 16, color: '#0f172a' }}>
                Facture
              </div>
              {/* Date */}
              <div style={{ textAlign: 'right', fontSize: 12, marginBottom: 24 }}>Vétroz, le {factureImprime.dateFacture}</div>
              {/* Infos élève */}
              <div style={{ fontSize: 13, color: '#334155', marginBottom: 6 }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Nom Prénom :</span>{' '}
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{factureImprime.eleve.nom} {factureImprime.eleve.prenom}</span>
              </div>
              <div style={{ fontSize: 13, color: '#334155', marginBottom: 20 }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Classe :</span>{' '}
                <span>{factureImprime.classeNom}</span>
              </div>
              {(() => {
                const ref = factureImprime.reference || calcQRRef(factureImprime.classeNom, factureImprime.dateFacture, factureImprime.eleve);
                const cg = <colgroup><col/><col style={{width:90}}/><col style={{width:110}}/><col style={{width:110}}/></colgroup>;
                const thS = (i) => ({ padding:'8px 10px', fontSize:11, color:'white', textAlign:i===0?'left':'center', fontWeight:700 });
                const tdR = { border:'1px solid #dbe3ee', padding:'7px 10px', fontSize:12, textAlign:'center' };
                const tdMoney = { ...tdR, textAlign: 'right' };
                const tdL = { border:'1px solid #dbe3ee', padding:'7px 10px', fontSize:12 };
                const stRow = (label, val) => (
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 10px', background:'#f1f5f9', border:'1px solid #e2e8f0', borderTop:'none', marginBottom:16 }}>
                    <span style={{ fontWeight:600 }}>{label}</span><b>{fmtCHF(val)}</b>
                  </div>
                );
                const totalTable = (label, val) => (
                  <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', marginTop: 4, marginBottom: 20, borderRadius: 0, clipPath: 'none' }}>
                    {cg}
                    <tbody>
                      <tr style={{ background:'#f8fafc' }}>
                        <td colSpan={3} style={{ ...tdL, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</td>
                        <td style={{ ...tdMoney, fontWeight: 800 }}>{fmtCHF(val)}</td>
                      </tr>
                    </tbody>
                  </table>
                );
                const totalEcol = (factureImprime.lignesEcolage||[]).reduce((a,l)=>a+l.montant,0);
                const totalMat = (factureImprime.lignes||[]).reduce((a,l)=>a+l.montant,0);
                const mkThead = (col1, col2 = 'Prorata') => (
                  <thead><tr style={{ background:'#6366f1' }}>
                    {[col1, col2, 'Prix', 'Montant'].map((h,i) => <th key={h} style={thS(i)}>{h}</th>)}
                  </tr></thead>
                );
                return <>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:16 }}>
                    Référence : <b style={{ color:'#334155', fontFamily:'monospace', letterSpacing:1 }}>{ref}</b>
                  </div>
                  {factureImprime.lignesEcolage?.length > 0 && (<>
                    <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', borderRadius: 0, clipPath: 'none' }}>
                      {cg}{mkThead("Frais d'écolage")}
                      <tbody>
                        {factureImprime.lignesEcolage.map((l,i) => (
                          <tr key={l.id} style={{ background:i%2===0?'white':'#fafafa' }}>
                            <td style={tdL}>{l.nom}</td>
                            <td style={tdR}>{Math.round(l.prorata/12*100)}%</td>
                            <td style={tdMoney}>{Number(l.prix).toFixed(2)} CHF</td>
                            <td style={{...tdMoney,fontWeight:700}}>{Number(l.montant).toFixed(2)} CHF</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {stRow('Sous-total', totalEcol)}
                  </>)}
                  {factureImprime.lignes?.length > 0 && (<>
                    <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', borderRadius: 0, clipPath: 'none' }}>
                      {cg}{mkThead('Matériel scolaire', 'Quantité')}
                      <tbody>
                        {factureImprime.lignes.map((l,i) => (
                          <tr key={l.id} style={{ background:i%2===0?'white':'#fafafa' }}>
                            <td style={tdL}>{l.nom}</td>
                            <td style={tdR}>{l.qte}</td>
                            <td style={tdMoney}>{Number(l.prix).toFixed(2)} CHF</td>
                            <td style={{...tdMoney,fontWeight:700}}>{Number(l.montant).toFixed(2)} CHF</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {stRow('Sous-total', totalMat)}
                  </>)}
                  {totalTable('Montant de la facture', factureImprime.total)}
                </>;
              })()}
              {factureImprime.eleve.categorie === 'EUCMS' && (() => {
                const ref5 = (factureImprime.reference || '').replace(/\s/g,'').slice(-5);
                return (
                  <>
                    <p style={{ marginTop: 20, fontSize: 12, color: '#1e293b', lineHeight: 1.6 }}>
                      Nous vous prions de bien vouloir régler cette facture dans un délai de <b>30 jours</b> dès réception. Sans paiement dans ce délai, l'école se réserve le droit d'annuler l'admission de l'élève.
                    </p>
                    <p style={{ marginTop: 8, fontSize: 12, color: '#1e293b', lineHeight: 1.6 }}>
                      Lors du paiement, veuillez indiquer dans le motif les <b>5 derniers chiffres de la référence ({ref5})</b> ainsi que la <b>classe ({factureImprime.classeNom})</b>.
                    </p>
                  </>
                );
              })()}
              <div style={{ marginTop: 40, fontSize: 12, textAlign: 'right' }}>Signature : ____________________________</div>
              {/* QR EUCMS */}
              {factureImprime.eleve.categorie === 'EUCMS' && (
                <div style={{ marginTop: 32, borderTop: '2px dashed #e2e8f0', paddingTop: 24, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>Page 2 — Bulletin de versement</div>
                  <img src={`${window.location.origin}${process.env.PUBLIC_URL || ''}/facture-qr.png`} style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain' }} alt="QR facture" />
                </div>
              )}
              {/* Pied de page */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32, paddingTop: 10, fontSize: 7 }}>
                <img src={`${window.location.origin}${process.env.PUBLIC_URL || ''}/logo-pied-page.png`} style={{ height: 28, objectFit: 'contain' }} alt="" onError={e => e.target.style.display='none'} />
                <span>Zone Industrielle 4, 1963 Vétroz<br/>Tél. 027 606 18 60</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', background: '#f8fafc', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' },
  btnRetourListe: { padding: '7px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#475569', fontWeight: 600 },
  btnRetour: { padding: '8px 16px', background: 'white', border: '2px solid #e0e0e0', borderRadius: 8, cursor: 'pointer' },
  titre: { fontSize: 24, fontWeight: 700, flex: 1 },
  btnAjouter: { padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statCard: { background: 'white', padding: '16px 20px', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' },
  statValeur: { fontSize: 20, fontWeight: 700, color: '#333', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#888' },
  tabSearch: { padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', outline: 'none', fontSize: 13, width: 280, color: '#1e293b', fontFamily: 'inherit' },
  toggleGroup: { display: 'flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 },
  toggleBtn: { padding: '7px 14px', borderRadius: 17, border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: '#6d28d9', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' },
  toggleBtnActif: { background: '#6366f1', color: 'white', fontWeight: 700 },
  tabsRow: { display: 'flex', gap: 0, borderBottom: '2px solid #6366f1', marginBottom: 0 },
  tabsRowCompta: { display: 'flex', gap: 0, borderBottom: '2px solid #6366f1', marginBottom: 12, flexWrap: 'wrap' },
  tabCompta: { padding: '9px 14px', background: '#ede9fe', border: 'none', borderRadius: '10px 10px 0 0', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#5b21b6', outline: 'none', lineHeight: 1, minWidth: 108, textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  tabComptaActif: { background: '#6366f1', color: 'white', marginBottom: -1, zIndex: 2 },
  tab: { padding: '9px 14px', background: '#ede9fe', border: 'none', borderRadius: '10px 10px 0 0', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#5b21b6', outline: 'none', lineHeight: '1', width: 140, minWidth: 140, textAlign: 'center' },
  tabActif: { background: '#6366f1', color: 'white', marginBottom: -1, zIndex: 2 },
  tabContent: { background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', marginTop: 8 },
  subTabsRow: { display: 'flex', gap: 6, padding: '12px 14px', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap', alignItems: 'center', background: '#fafafa' },
  subTab: { padding: '7px 13px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569', outline: 'none' },
  subTabActif: { background: '#6366f1', color: 'white', border: '1px solid #6366f1' },
  select: { padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: 'white' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'white' },
  theadRow: { background: '#6366f1' },
  th: { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', position: 'static', top: 'auto', zIndex: 'auto', background: '#6366f1', boxShadow: 'none' },
  tr: { borderBottom: '1px solid #f8fafc' },
  td: { padding: '12px 16px', fontSize: 13, color: '#374151' },
  vide: { padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  typeBadge: { background: '#eef2ff', color: '#3730a3', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 },
  statutBadge: { padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 },
  btnEdit: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, marginRight: 4, opacity: 0.85, color: '#6366f1', display: 'inline-flex', alignItems: 'center', padding: 2 },
  btnDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: 0.85, color: '#ef4444', display: 'inline-flex', alignItems: 'center', padding: 2 },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' },
  modal: { background: 'white', padding: 28, borderRadius: 16, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' },
  modalTitre: { fontSize: 18, fontWeight: 700, marginBottom: 18 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  formChamp: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12, fontWeight: 600, color: '#475569' },
  input: { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, width: '100%', boxSizing: 'border-box', background: 'white', outline: 'none', color: '#1e293b' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  btnAnnuler: { padding: '9px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#64748b' },
  btnSauver: { padding: '9px 18px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnGhostPill: { padding: '7px 16px', borderRadius: 17, border: '1px solid #d1d9e6', background: '#f8fafc', color: '#94a3b8', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' },
  btnValidatedPill: { padding: '7px 16px', borderRadius: 17, border: '1px solid #6366f1', background: '#eef2ff', color: '#4338ca', cursor: 'default', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' },
  tableWrap: { borderRadius: 12, overflow: 'hidden', background: 'white' },
  tableMateriel: { width: '100%', borderCollapse: 'collapse', background: 'white', tableLayout: 'fixed' },
  thMateriel: { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'white', background: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', position: 'static', top: 'auto', zIndex: 'auto', boxShadow: 'none' },
  tdMateriel: { padding: '12px 16px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f8fafc' },
  /** Alignement liste classes (onglet Classes) sur la page Notes : padding cellules + bouton œil */
  tdClasseListe: { padding: '10px 14px' },
  btnDetailClasse: { padding: '5px 10px', background: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
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
