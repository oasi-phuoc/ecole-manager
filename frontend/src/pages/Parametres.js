/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../lib/apiClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import NpaAutocomplete from '../components/NpaAutocomplete';
import CustomSelect from '../components/CustomSelect';
import { stickyPageChrome } from '../styles/pageShell';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  normaliserBranchesSpecialites,
  regrouperBranchesParCode,
  listerGroupesColonneOrdonnes,
  idsDepuisListesColonnes,
  LIBELLES_COLONNES_SPECIALITES,
  ORDRE_COLONNES_SPECIALITES,
} from '../utils/branchesSpecialites';
import { startRegistration } from '@simplewebauthn/browser';
import {
  cycleStatutDispo,
  fondCelluleStatutDispo,
  pastilleDispo,
  payloadDepuisStatut,
  statutDepuisDispoRow,
  titreStatutDispo,
} from '../utils/disponibilites';
import { buildOtpAuthUrl, otpauthQrDataUrl, secretGroupePar4 } from '../utils/qrMfa';
import { PageLoader, LoadingButton } from '../components/LoadingUI';

const JOURS_DISPO = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const BASE_PERIODES_TAUX = 40;
const passkeySupported = () =>
  typeof window !== 'undefined'
  && !!window.PublicKeyCredential
  && typeof window.PublicKeyCredential === 'function';

const creerLigneResponsableNiveau = (overrides = {}) => ({
  nom: '',
  sexe: 'M',
  niveaux: [],
  ...overrides,
});

const normaliserListeResponsablesNiveaux = (valeur) => {
  let list = valeur;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch { list = []; }
  }
  if (!Array.isArray(list)) return [];
  return list.map((item) => creerLigneResponsableNiveau({
    nom: String(item?.nom || '').trim(),
    sexe: String(item?.sexe || 'M').toUpperCase() === 'F' ? 'F' : 'M',
    niveaux: Array.isArray(item?.niveaux)
      ? Array.from(new Set(item.niveaux.map((n) => String(n).trim()).filter(Boolean)))
      : String(item?.niveaux || '').split(',').map((n) => n.trim()).filter(Boolean),
  }));
};

const migrerResponsablesDepuisLegacy = (data = {}) => {
  const existants = normaliserListeResponsablesNiveaux(data.responsables_niveaux);
  if (existants.some((r) => r.nom || r.niveaux.length)) return existants;

  const map = new Map();
  const ajouter = (niveau, nom, sexe) => {
    const name = String(nom || '').trim();
    if (!name || !niveau) return;
    if (!map.has(name)) map.set(name, creerLigneResponsableNiveau({ nom: name, sexe: sexe === 'F' ? 'F' : 'M', niveaux: [] }));
    const row = map.get(name);
    if (!row.niveaux.includes(niveau)) row.niveaux.push(niveau);
    if (sexe === 'F' || sexe === 'M') row.sexe = sexe;
  };
  ajouter('CSC', data.responsable_niveau_csc, data.sexe_responsable_niveau_csc);
  ajouter('CFR', data.responsable_niveau_cfr, data.sexe_responsable_niveau_cfr);
  ajouter('EPL', data.responsable_niveau_epl, data.sexe_responsable_niveau_epl);
  if (!map.size && data.responsable_niveau) {
    map.set(String(data.responsable_niveau).trim(), creerLigneResponsableNiveau({
      nom: String(data.responsable_niveau).trim(),
      sexe: 'M',
      niveaux: [],
    }));
  }
  return Array.from(map.values());
};

const HORAIRE_DEFAUT = {
  matin: [
    { label: 'P1', debut: '08:20', fin: '09:05' },
    { label: 'P2', debut: '09:05', fin: '09:45' },
    { label: 'Pause', debut: '09:45', fin: '10:05' },
    { label: 'P3', debut: '10:05', fin: '10:55' },
    { label: 'P4', debut: '10:55', fin: '11:40' },
  ],
  apresmidi: [
    { label: 'P1', debut: '13:30', fin: '14:15' },
    { label: 'P2', debut: '14:15', fin: '15:00' },
    { label: 'Pause', debut: '15:00', fin: '15:20' },
    { label: 'P3', debut: '15:20', fin: '16:05' },
    { label: 'P4', debut: '16:05', fin: '16:50' },
  ]
};

const MODULES_ACCES_PROFS = [
  { key: 'employes_admin',  label: 'Employés', defaut: false, onglets: [{ key: 'employes_admin_base', label: 'Base — Nom, prénom, email, téléphone, naissance' }, { key: 'employes_admin_etendu', label: 'Étendu — Toutes les informations' }, { key: 'employes_admin_gestion', label: 'Ajout, suppression et statut actif/inactif' }] },
  { key: 'professeurs',     label: 'Professeurs',      defaut: true,  onglets: [{ key: 'professeurs_base', label: 'Base — Nom, prénom, email, téléphone, naissance' }, { key: 'professeurs_etendu', label: 'Étendu — Toutes les informations' }, { key: 'professeurs_gestion', label: 'Ajout, suppression et statut actif/inactif' }] },
  { key: 'eleves',          label: 'Élèves',          defaut: true,  onglets: [{ key: 'eleves_base', label: 'Base — Photo, nom, prénom, nationalité, classe, naissance, observations, sanctions, documents' }, { key: 'eleves_etendu', label: 'Étendu — Toutes les informations' }, { key: 'eleves_import', label: 'Ajout, suppression et statut actif/inactif' }] },
  { key: 'branches',        label: 'Branches',         defaut: false, onglets: [] },
  { key: 'classes',         label: 'Classes',          defaut: false, onglets: [{ key: 'classes_base', label: 'Base — Tableau (détail, classe, titulaire, note)' }, { key: 'classes_gestion', label: 'Ajout, suppression et statut actif/inactif' }] },
  { key: 'emploi_du_temps', label: 'Emploi du temps',  defaut: false, onglets: [{ key: 'emploi_du_temps_planification', label: 'Planification — Pools, disponibilités, affectations' }, { key: 'emploi_du_temps_plannings', label: 'Vue des plannings' }] },
  { key: 'presences',       label: 'Présences',        defaut: true,  onglets: [{ key: 'presences_base', label: 'Base — Tout sauf importation LORA' }, { key: 'presences_import', label: 'Importer LORA' }] },
  { key: 'notes',           label: 'Notes',            defaut: true,  onglets: [{ key: 'notes_notes', label: 'Notes' }, { key: 'notes_evaluations', label: 'Évaluations' }] },
  { key: 'tcf',             label: 'TCF',              defaut: false, onglets: [{ key: 'tcf_liste', label: 'Liste' }] },
  { key: 'calendrier',      label: 'Calendrier',       defaut: true,  onglets: [{ key: 'calendrier_scolaire', label: 'Calendrier scolaire' }, { key: 'calendrier_agenda', label: 'Agenda personnel' }] },
  { key: 'comptabilite',    label: 'Comptabilité',     defaut: false, onglets: [{ key: 'comptabilite_factures', label: 'Factures' }, { key: 'comptabilite_paiements', label: 'Paiements' }, { key: 'comptabilite_prix', label: 'Liste de prix' }] },
  { key: 'documents',       label: 'Documents',        defaut: false, onglets: [{ key: 'documents_administratifs', label: 'Administratifs' }, { key: 'documents_pedagogiques', label: 'Pédagogiques' }, { key: 'documents_seances', label: 'Séances' }, { key: 'documents_formulaires', label: 'Formulaires' }, { key: 'documents_divers', label: 'Divers' }] },
  { key: 'enclassement',      label: 'Enclassement',        defaut: false, onglets: [] },
  { key: 'archives',          label: 'Archives',            defaut: true,  onglets: [] },
  { key: 'sorties_scolaires', label: 'Sorties scolaires',   defaut: false, onglets: [{ key: 'sorties_automne', label: 'Automne' }, { key: 'sorties_juin', label: 'Juin' }, { key: 'sorties_autres', label: 'Autres' }, { key: 'sorties_suivi', label: 'Tableau de suivi' }] },
  { key: 'visite_classes', label: 'Contrôle qualité — Visites & feedback', defaut: true, onglets: [] },
  { key: 'sondage', label: 'Contrôle qualité — Sondage', defaut: true, onglets: [] },
  { key: 'statistiques', label: 'Contrôle qualité — Statistiques', defaut: false, onglets: [{ key: 'statistiques_dashboard', label: 'Tableau de bord' }] },
];

export default function Parametres() {
  const [searchParams] = useSearchParams();
  const onglet = searchParams.get('tab') || 'profil';
  const [profil, setProfil] = useState({ nom: '', prenom: '', email: '', role: '', telephone: '', adresse: '', npa: '', lieu: '', sexe: '', date_naissance: '', avs: '', taux_activite: '', periodes_semaine: '', type_contrat: '', type_permis: '', niveau_prefere: '', branches_specialites: [], lieu_travail_prefere: '', remarque_lieu_travail: '', priorite_pref: 'niveau', specialite: '' });
  const [ecole, setEcole] = useState({
    nom_ecole: '', adresse: '', telephone: '', email: '', annee_scolaire: '', date_debut_annee: '', date_fin_annee: '',
    responsable_langues_jeunes: '', responsable_niveau: '',
    responsable_niveau_csc: '', responsable_niveau_cfr: '', responsable_niveau_epl: '',
    sexe_responsable_langues_jeunes: 'M', sexe_responsable_niveau_csc: 'M', sexe_responsable_niveau_cfr: 'M', sexe_responsable_niveau_epl: 'M',
    responsables_niveaux: [creerLigneResponsableNiveau()],
  });
  const [mdp, setMdp] = useState({ ancien: '', nouveau: '', confirmation: '' });
  const [profs, setProfs] = useState([]);
  const [profSelectionne, setProfSelectionne] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [accesParRole, setAccesParRole] = useState({ professeurs: {}, employes: {}, responsables: {}, admins: {} });
  const [accesRoleOnglet, setAccesRoleOnglet] = useState('professeurs');
  const [msgAccesProfs, setMsgAccesProfs] = useState('');
  const [moduleOuvert, setModuleOuvert] = useState(null);
  const [sousOngletEcole, setSousOngletEcole] = useState('adresse');
  const [employesResponsablesListe, setEmployesResponsablesListe] = useState([]);
  const [horairesEcole, setHorairesEcole] = useState({});
  const [lieuHoraireOnglet, setLieuHoraireOnglet] = useState('defaut');
  const [sousOngletProfil, setSousOngletProfil] = useState('connexion');
  const [mdpOuvert, setMdpOuvert] = useState(false);
  const [branchesDisponiblesProfil, setBranchesDisponiblesProfil] = useState([]);
  const [creneauxDispoProfil, setCreneauxDispoProfil] = useState([]);
  const [disposProfil, setDisposProfil] = useState({});
  const [remarquesDispoProfil, setRemarquesDispoProfil] = useState('');
  const [disposProfilDirty, setDisposProfilDirty] = useState(false);
  const [msgProfil, setMsgProfil] = useState('');
  const [msgEcole, setMsgEcole] = useState('');
  const [msgMdp, setMsgMdp] = useState('');
  const [savingProfil, setSavingProfil] = useState(false);
  const [savingEcole, setSavingEcole] = useState(false);
  const [savingMail, setSavingMail] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [savingMdp, setSavingMdp] = useState(false);
  const [savingAcces, setSavingAcces] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSetupToken, setMfaSetupToken] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaOtpAuthUrl, setMfaOtpAuthUrl] = useState('');
  const [mfaQrDataUrl, setMfaQrDataUrl] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBackupCodes, setMfaBackupCodes] = useState([]);
  const [mfaBackupRemaining, setMfaBackupRemaining] = useState(0);
  const [msgMfa, setMsgMfa] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [passkeys, setPasskeys] = useState([]);
  const [passkeyName, setPasskeyName] = useState('');
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [msgPasskey, setMsgPasskey] = useState('');
  const [msgPerms, setMsgPerms] = useState('');
  const [mail, setMail] = useState({
    smtp_active: false,
    smtp_host: 'smtp.office365.com',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_from_name: 'Oasis',
    smtp_from_email: '',
    smtp_app_password: '',
    has_app_password: false,
  });
  const [mailTestTo, setMailTestTo] = useState('');
  const [msgMail, setMsgMail] = useState('');
  const [msgMailTest, setMsgMailTest] = useState('');
  const [testMailLoading, setTestMailLoading] = useState(false);
  const [resetEtape, setResetEtape] = useState(0); // 0=idle, 1=confirm1, 2=confirm2, 3=loading, 4=done
  const [resetMsg, setResetMsg] = useState('');
  const [resetRentreeEtape, setResetRentreeEtape] = useState(0); // 0=idle, 1=confirm1, 2=confirm2, 3=loading, 4=done
  const [resetRentreeMsg, setResetRentreeMsg] = useState('');
  const [archiveId, setArchiveId] = useState(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveNom, setArchiveNom] = useState('');
  // Données (niveaux, lieux, salles)
  const [niveauxDB, setNiveauxDB] = useState([]);
  const [lieuxTravailDB, setLieuxTravailDB] = useState([]);
  const [sallesDB, setSallesDB] = useState([]);
  const [loadingDonnees, setLoadingDonnees] = useState(true);
  const [donneesNiveauForm, setDonneesNiveauForm] = useState({ nom: '', periodes_normales: '20', periodes_soutien: '0' });
  const [donneesLieuForm, setDonneesLieuForm] = useState({ nom: '' });
  const [donneesSalleForm, setDonneesSalleForm] = useState({ nom: '', lieu_travail_id: '' });
  const [donneesNiveauEdit, setDonneesNiveauEdit] = useState(null);
  const [donneesLieuEdit, setDonneesLieuEdit] = useState(null);
  const [donneesSalleEdit, setDonneesSalleEdit] = useState(null);
  const dragNiveauIdx = useRef(null);
  const dragLieuIdx = useRef(null);
  const dragBrancheRef = useRef(null); // { cat, idx }
  const [dragOverNiveau, setDragOverNiveau] = useState(null);
  const [dragOverLieu, setDragOverLieu] = useState(null);
  const [dragOverBranche, setDragOverBranche] = useState(null); // { cat, idx }
  const navigate = useNavigate();
  const headers = {};
  const isAdmin = profil.role === 'admin';
  const isMobile = useIsMobile();

  const formGridStyle = isMobile
    ? { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }
    : styles.formGrid;
  const cardStyle = isMobile
    ? { ...styles.card, padding: 16, borderRadius: 12 }
    : styles.card;
  const mainStyle = isMobile
    ? { ...styles.main, padding: 0 }
    : styles.main;
  const chromeStyle = isMobile
    ? { ...stickyPageChrome(), marginBottom: 12 }
    : { ...stickyPageChrome(), marginBottom: 0, marginLeft: -36, marginRight: -36, paddingLeft: 36, paddingRight: 36 };

  const barSousOnglets = (items, actif, onChange) => (
    <div
      className={isMobile ? 'chip-tabs chip-tabs-equal' : undefined}
      style={isMobile ? {
        display: 'flex',
        background: '#ede9fe',
        borderRadius: 20,
        padding: 3,
        gap: 2,
        marginBottom: 16,
        width: '100%',
        boxSizing: 'border-box',
      } : {
        display: 'flex',
        gap: 0,
        borderBottom: '2px solid #6366f1',
        marginBottom: 0,
      }}
    >
      {items.map(([key, label]) => {
        const selected = actif === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            style={isMobile ? {
              padding: '8px 14px',
              borderRadius: 17,
              border: 'none',
              cursor: 'pointer',
              fontWeight: selected ? 700 : 600,
              fontSize: 13,
              lineHeight: 1,
              outline: 'none',
              whiteSpace: 'nowrap',
              background: selected ? '#6366f1' : 'transparent',
              color: selected ? 'white' : '#6d28d9',
              fontFamily: 'inherit',
            } : {
              padding: '9px 18px',
              borderRadius: '10px 10px 0 0',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              lineHeight: '1',
              outline: 'none',
              position: 'relative',
              zIndex: selected ? 2 : 1,
              ...(selected
                ? { background: '#6366f1', color: 'white', marginBottom: -2, boxShadow: '0 -1px 6px rgba(99,102,241,0.18)' }
                : { background: '#ede9fe', color: '#5b21b6' }),
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  const reorderNiveaux = async (from, to) => {
    if (from === to) return;
    const list = [...niveauxDB];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setNiveauxDB(list);
    await Promise.all(list.map((n, i) => apiClient.put('/donnees/niveaux/' + n.id, {
      nom: n.nom,
      ordre: i + 1,
      periodes_normales: n.periodes_normales,
      periodes_soutien: n.periodes_soutien,
    }, { headers })));
  };
  const reorderLieux = async (from, to) => {
    if (from === to) return;
    const list = [...lieuxTravailDB];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setLieuxTravailDB(list);
    await Promise.all(list.map((l, i) => apiClient.put('/donnees/lieux-travail/' + l.id, { nom: l.nom, ordre: i + 1 }, { headers })));
  };

  useEffect(() => { chargerProfil(); }, []);
  useEffect(() => { chargerMfaStatus(); chargerPasskeys(); chargerDonnees(); }, []);
  useEffect(() => {
    if (onglet !== 'mfa') return;
    setSousOngletProfil('connexion');
    navigate('/parametres?tab=profil', { replace: true });
  }, [onglet, navigate]);
  useEffect(() => { if (isAdmin) { chargerEcole(); chargerProfs(); chargerMail(); chargerAccesProfs(); } }, [isAdmin]);
  useEffect(() => { if (onglet === 'ecole' && isAdmin) chargerEcole(); }, [onglet]);
  useEffect(() => {
    if (!isAdmin || onglet !== 'ecole' || sousOngletEcole !== 'responsables') return;
    apiClient.get('/employes-administratifs', { headers }).then(r => {
      const list = (r.data || []).filter(u => String(u.role_acces) === 'responsable' && u.actif !== false);
      setEmployesResponsablesListe(list.sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr')));
    }).catch(() => setEmployesResponsablesListe([]));
  }, [isAdmin, onglet, sousOngletEcole]);
  useEffect(() => {
    if (isAdmin && !mailTestTo && profil?.email) setMailTestTo(profil.email);
  }, [isAdmin, profil?.email, mailTestTo]);

  const chargerProfil = async () => {
    try {
      const res = await apiClient.get('/parametres/profil', { headers });
      setProfil(res.data);
    } catch (err) { console.error(err); }
  };

  const chargerDonnees = async () => {
    try {
      const [niv, lieux, salles] = await Promise.all([
        apiClient.get('/donnees/niveaux', { headers }),
        apiClient.get('/donnees/lieux-travail', { headers }),
        apiClient.get('/donnees/salles', { headers }),
      ]);
      setNiveauxDB(niv.data || []);
      setLieuxTravailDB(lieux.data || []);
      setSallesDB(salles.data || []);
    } catch(err) { console.error(err); }
    finally { setLoadingDonnees(false); }
  };

  const chargerBranchesProfil = async (niveaux = []) => {
    try {
      const r = await apiClient.get('/branches', { headers });
      const filtrees = (r.data || []).filter((b) => !niveaux.length || niveaux.includes(b.niveau));
      setBranchesDisponiblesProfil(regrouperBranchesParCode(filtrees, { labelComplet: true }));
    } catch { setBranchesDisponiblesProfil([]); }
  };

  const chargerDisposProfil = async (profId) => {
    if (!profId) {
      setCreneauxDispoProfil([]);
      setDisposProfil({});
      setRemarquesDispoProfil('');
      setDisposProfilDirty(false);
      return;
    }
    try {
      const [cr, d, rem] = await Promise.all([
        apiClient.get('/planning/creneaux', { headers }),
        apiClient.get('/planning/disponibilites/' + profId, { headers }),
        apiClient.get('/planning/disponibilites/' + profId + '/remarque', { headers }).catch(() => ({ data: { remarque: '' } })),
      ]);
      setCreneauxDispoProfil(cr.data || []);
      const map = {};
      (d.data || []).forEach((row) => { map[row.creneau_id] = statutDepuisDispoRow(row); });
      // Défaut : disponible si aucune entrée
      (cr.data || []).forEach((c) => {
        if (!Object.prototype.hasOwnProperty.call(map, c.id)) map[c.id] = true;
      });
      setDisposProfil(map);
      setRemarquesDispoProfil(rem.data?.remarque || '');
      setDisposProfilDirty(false);
    } catch {
      setCreneauxDispoProfil([]);
      setDisposProfil({});
      setRemarquesDispoProfil('');
      setDisposProfilDirty(false);
    }
  };

  useEffect(() => {
    if (sousOngletProfil !== 'desideratas') return;
    const niveaux = (profil.niveau_prefere || '').split(',').filter(Boolean);
    chargerBranchesProfil(niveaux);
  }, [profil.niveau_prefere, sousOngletProfil]);

  useEffect(() => {
    if (sousOngletProfil !== 'desideratas') return;
    if (!profil?.id) return;
    chargerDisposProfil(profil.id);
  }, [sousOngletProfil, profil?.id]);

  const periodesRequisesDispoProfil = (() => {
    const taux = Number(profil.taux_activite);
    if (!Number.isFinite(taux) || taux <= 0) return parseInt(profil.periodes_semaine, 10) || 0;
    return Math.max(0, Math.floor(((BASE_PERIODES_TAUX * taux) / 100) / 2) * 2);
  })();
  const periodesSelectionneesDispoProfil = Object.values(disposProfil).filter((v) => v !== false).length;
  const couleurCompteurDispoProfil = periodesSelectionneesDispoProfil < periodesRequisesDispoProfil ? '#dc2626' : '#16a34a';

  const toggleDispoProfil = (creneauId) => {
    setDisposProfil((prev) => ({ ...prev, [creneauId]: cycleStatutDispo(prev[creneauId]) }));
    setDisposProfilDirty(true);
  };

  /** Réordonne toutes les options d'une colonne (glisser-déposer, sans sélection préalable). */
  const reorderBrancheProfilDansColonne = (cat, fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx == null || toIdx == null || fromIdx < 0 || toIdx < 0) return;
    const listes = {};
    ORDRE_COLONNES_SPECIALITES.forEach((c) => {
      listes[c] = listerGroupesColonneOrdonnes(branchesDisponiblesProfil, profil.branches_specialites, c);
    });
    const list = [...(listes[cat] || [])];
    if (fromIdx >= list.length || toIdx >= list.length) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    listes[cat] = list;
    setProfil((p) => ({ ...p, branches_specialites: idsDepuisListesColonnes(listes) }));
  };

  const chargerEcole = async () => {
    try {
      const res = await apiClient.get('/parametres/ecole', { headers });
      if (res.data) {
        const responsables = migrerResponsablesDepuisLegacy(res.data);
        setEcole(prev => ({
          ...prev,
          ...res.data,
          sexe_responsable_langues_jeunes: res.data.sexe_responsable_langues_jeunes || 'M',
          sexe_responsable_niveau_csc: res.data.sexe_responsable_niveau_csc || 'M',
          sexe_responsable_niveau_cfr: res.data.sexe_responsable_niveau_cfr || 'M',
          sexe_responsable_niveau_epl: res.data.sexe_responsable_niveau_epl || 'M',
          responsables_niveaux: responsables.length ? responsables : [creerLigneResponsableNiveau()],
        }));
        if (res.data.horaires != null) {
          const h = typeof res.data.horaires === 'string' ? JSON.parse(res.data.horaires) : res.data.horaires;
          setHorairesEcole(h);
        }
      }
    } catch (err) { console.error(err); }
  };

  const chargerProfs = async () => {
    try {
      const res = await apiClient.get('/parametres/profs', { headers });
      setProfs(res.data);
    } catch (err) { console.error(err); }
  };

  const initRole = (roleData, defaultVal) => {
    const init = {};
    MODULES_ACCES_PROFS.forEach(m => {
      const mVal = roleData[m.key] !== undefined ? roleData[m.key] : defaultVal;
      init[m.key] = mVal;
      m.onglets.forEach(o => { init[o.key] = roleData[o.key] !== undefined ? roleData[o.key] : mVal; });
    });
    return init;
  };

  const chargerAccesProfs = async () => {
    try {
      const res = await apiClient.get('/parametres/acces-profs', { headers });
      const data = res.data || {};
      const hasNested = data.professeurs !== undefined;
      const profRaw = hasNested ? (data.professeurs || {}) : data;
      setAccesParRole({
        professeurs: initRole(profRaw, true),
        employes:    initRole(hasNested ? (data.employes    || {}) : {}, false),
        responsables: initRole(hasNested ? (data.responsables || {}) : {}, false),
        admins:      initRole(hasNested ? (data.admins      || {}) : {}, true),
      });
    } catch {}
  };

  const toggleModule = (m) => {
    const curr = accesParRole[accesRoleOnglet] || {};
    const newVal = !curr[m.key];
    const update = { ...curr, [m.key]: newVal };
    m.onglets.forEach(o => { update[o.key] = newVal; });
    setAccesParRole(prev => ({ ...prev, [accesRoleOnglet]: update }));
  };

  const toggleOnglet = (m, oKey) => {
    const curr = accesParRole[accesRoleOnglet] || {};
    const newVal = !curr[oKey];
    const update = { ...curr, [oKey]: newVal };
    const anyOn = m.onglets.some(o => o.key === oKey ? newVal : update[o.key]);
    update[m.key] = anyOn;
    setAccesParRole(prev => ({ ...prev, [accesRoleOnglet]: update }));
  };

  const chargerMail = async () => {
    try {
      const res = await apiClient.get('/parametres/mail', { headers });
      const data = res.data || {};
      setMail(prev => ({
        ...prev,
        ...data,
        smtp_port: Number(data.smtp_port || 587),
        smtp_app_password: '',
      }));
      setMailTestTo(data.smtp_from_email || profil.email || '');
    } catch (err) { console.error(err); }
  };

  const handleSauverProfil = async (e) => {
    e.preventDefault();
    setSavingProfil(true);
    try {
      const payload = {
        ...profil,
        branches_specialites: normaliserBranchesSpecialites(profil.branches_specialites),
      };
      await apiClient.put('/parametres/profil', payload, { headers });
      if (profil?.id) {
        const liste = Object.entries(disposProfil).map(([creneau_id, statut]) => payloadDepuisStatut(creneau_id, statut));
        const [rDispo] = await Promise.all([
          apiClient.post('/planning/disponibilites/' + profil.id, { disponibilites: liste }, { headers }),
          apiClient.post('/planning/disponibilites/' + profil.id + '/remarque', { remarque: remarquesDispoProfil || '' }, { headers }),
        ]);
        setDisposProfilDirty(false);
        const nRetirees = Number(rDispo?.data?.affectations_supprimees) || 0;
        setMsgProfil(nRetirees > 0 ? 'success-affectations' : 'success');
      } else {
        setMsgProfil('success');
      }
      setTimeout(() => setMsgProfil(''), 4000);
    } catch (err) { setMsgProfil('error'); }
    finally { setSavingProfil(false); }
  };

  const handleSauverMdp = async (e) => {
    e.preventDefault();
    if (mdp.nouveau !== mdp.confirmation) { setMsgMdp('mismatch'); return; }
    setSavingMdp(true);
    try {
      await apiClient.put('/parametres/mot-de-passe', { ancien: mdp.ancien, nouveau: mdp.nouveau }, { headers });
      setMsgMdp('success');
      setMdp({ ancien: '', nouveau: '', confirmation: '' });
      setTimeout(() => setMsgMdp(''), 3000);
    } catch (err) { setMsgMdp('error'); }
    finally { setSavingMdp(false); }
  };

  const chargerMfaStatus = async () => {
    try {
      const res = await apiClient.get('/auth/mfa/status', { headers });
      setMfaEnabled(res.data?.mfa_enabled === true);
      setMfaBackupRemaining(Number(res.data?.backup_codes_remaining || 0));
    } catch {}
  };

  const chargerPasskeys = async () => {
    try {
      const res = await apiClient.get('/auth/passkeys', { headers });
      setPasskeys(Array.isArray(res.data?.passkeys) ? res.data.passkeys : []);
    } catch {
      setPasskeys([]);
    }
  };

  const handleAjouterPasskey = async () => {
    setMsgPasskey('');
    if (!passkeySupported()) {
      setMsgPasskey('Les passkeys ne sont pas supportées sur cet appareil / navigateur.');
      return;
    }
    setPasskeyLoading(true);
    try {
      const optRes = await apiClient.post('/auth/passkeys/register/options', {}, { headers });
      const { options, challenge_token } = optRes.data || {};
      if (!options || !challenge_token) {
        setMsgPasskey('Impossible de démarrer l’enregistrement passkey.');
        setPasskeyLoading(false);
        return;
      }
      const credential = await startRegistration({ optionsJSON: options });
      await apiClient.post('/auth/passkeys/register/verify', {
        challenge_token,
        credential,
        friendly_name: passkeyName.trim() || undefined,
      }, { headers });
      setPasskeyName('');
      setMsgPasskey('Passkey enregistrée. Vous pouvez vous connecter sans mot de passe.');
      await chargerPasskeys();
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        setMsgPasskey('Enregistrement passkey annulé.');
      } else {
        setMsgPasskey(err.response?.data?.message || err.message || 'Échec de l’enregistrement passkey');
      }
    }
    setPasskeyLoading(false);
  };

  const handleSupprimerPasskey = async (id) => {
    if (!window.confirm('Supprimer cette passkey ?')) return;
    setMsgPasskey('');
    setPasskeyLoading(true);
    try {
      await apiClient.delete('/auth/passkeys/' + id, { headers });
      setMsgPasskey('Passkey supprimée.');
      await chargerPasskeys();
    } catch (err) {
      setMsgPasskey(err.response?.data?.message || 'Erreur lors de la suppression');
    }
    setPasskeyLoading(false);
  };

  const handleGenererMfaSetup = async () => {
    setMsgMfa('');
    setMfaLoading(true);
    try {
      const res = await apiClient.post('/auth/mfa/setup', {}, { headers });
      const secret = res.data?.secret || '';
      const otpUrl = buildOtpAuthUrl({
        secret,
        accountName: res.data?.account || '',
        issuer: res.data?.issuer || 'Oasis',
      }) || res.data?.otpauth_url || '';
      setMfaSetupToken(res.data?.setup_token || '');
      setMfaSecret(secret);
      setMfaOtpAuthUrl(otpUrl);
      try {
        setMfaQrDataUrl(otpUrl ? await otpauthQrDataUrl(otpUrl) : '');
      } catch {
        setMfaQrDataUrl('');
      }
      setMfaBackupCodes([]);
      setMsgMfa('Scannez le QR code puis saisissez le code à 6 chiffres pour activer.');
    } catch (err) {
      setMsgMfa(err.response?.data?.message || 'Erreur génération setup MFA');
    }
    setMfaLoading(false);
  };

  const handleActiverMfa = async () => {
    setMsgMfa('');
    if (!mfaSetupToken || !mfaCode) return setMsgMfa('Token setup ou code manquant.');
    setMfaLoading(true);
    try {
      const res = await apiClient.post('/auth/mfa/enable', { setup_token: mfaSetupToken, code: mfaCode }, { headers });
      setMfaEnabled(true);
      setMfaBackupCodes(res.data?.backup_codes || []);
      setMfaBackupRemaining(Number(res.data?.backup_codes_remaining || (res.data?.backup_codes || []).length));
      setMfaSetupToken('');
      setMfaSecret('');
      setMfaOtpAuthUrl('');
      setMfaCode('');
      setMsgMfa('Double authentification activée. Conservez les codes de secours dans un endroit sûr.');
    } catch (err) {
      setMsgMfa(err.response?.data?.message || "Erreur d'activation MFA");
    }
    setMfaLoading(false);
  };

  const handleDesactiverMfa = async () => {
    setMsgMfa('');
    if (!mfaCode) return setMsgMfa('Veuillez saisir un code 2FA.');
    setMfaLoading(true);
    try {
      await apiClient.post('/auth/mfa/disable', { code: mfaCode }, { headers });
      setMfaEnabled(false);
      setMfaBackupCodes([]);
      setMfaBackupRemaining(0);
      setMfaCode('');
      setMfaSetupToken('');
      setMfaSecret('');
      setMfaOtpAuthUrl('');
      setMsgMfa('Double authentification désactivée.');
    } catch (err) {
      setMsgMfa(err.response?.data?.message || 'Erreur désactivation MFA');
    }
    setMfaLoading(false);
  };

  const handleRegenererBackupCodes = async () => {
    setMsgMfa('');
    if (!mfaCode) return setMsgMfa('Veuillez saisir un code 2FA pour régénérer les codes de secours.');
    setMfaLoading(true);
    try {
      const res = await apiClient.post('/auth/mfa/backup/regenerate', { code: mfaCode }, { headers });
      setMfaBackupCodes(res.data?.backup_codes || []);
      setMfaBackupRemaining(Number(res.data?.backup_codes_remaining || (res.data?.backup_codes || []).length));
      setMfaCode('');
      setMsgMfa('Nouveaux codes de secours générés.');
    } catch (err) {
      setMsgMfa(err.response?.data?.message || 'Erreur génération des codes de secours');
    }
    setMfaLoading(false);
  };

  const handleSauverEcole = async (e) => {
    e.preventDefault();
    setSavingEcole(true);
    try {
      const horairesData = Object.keys(horairesEcole).length > 0 ? horairesEcole : (ecole.horaires || {});
      const responsables_niveaux = normaliserListeResponsablesNiveaux(ecole.responsables_niveaux)
        .filter((r) => r.nom || r.niveaux.length);
      await apiClient.put('/parametres/ecole', { ...ecole, responsables_niveaux, horaires: horairesData }, { headers });
      setMsgEcole('success');
      setTimeout(() => setMsgEcole(''), 3000);
    } catch (err) { setMsgEcole('error'); }
    finally { setSavingEcole(false); }
  };

  const mettreAJourResponsableNiveau = (index, patch) => {
    setEcole((prev) => {
      const list = [...(prev.responsables_niveaux || [])];
      list[index] = { ...creerLigneResponsableNiveau(list[index]), ...patch };
      return { ...prev, responsables_niveaux: list };
    });
  };

  const toggleNiveauResponsable = (index, niveauNom) => {
    setEcole((prev) => {
      const list = [...(prev.responsables_niveaux || [])];
      const row = creerLigneResponsableNiveau(list[index]);
      const selected = row.niveaux.includes(niveauNom);
      row.niveaux = selected ? row.niveaux.filter((n) => n !== niveauNom) : [...row.niveaux, niveauNom];
      list[index] = row;
      return { ...prev, responsables_niveaux: list };
    });
  };

  const ajouterResponsableNiveau = () => {
    setEcole((prev) => ({
      ...prev,
      responsables_niveaux: [...(prev.responsables_niveaux || []), creerLigneResponsableNiveau()],
    }));
  };

  const supprimerResponsableNiveau = (index) => {
    setEcole((prev) => {
      const list = [...(prev.responsables_niveaux || [])];
      list.splice(index, 1);
      return { ...prev, responsables_niveaux: list.length ? list : [creerLigneResponsableNiveau()] };
    });
  };

  const ouvrirPermissions = (prof) => {
    setProfSelectionne(prof);
    setPermissions(prof.permissions || {});
    setMsgPerms('');
  };

  const handleSauverPermissions = async () => {
    setSavingPermissions(true);
    try {
      await apiClient.put('/parametres/permissions/' + profSelectionne.id, { permissions }, { headers });
      setMsgPerms('success');
      chargerProfs();
      setTimeout(() => setMsgPerms(''), 3000);
    } catch (err) { setMsgPerms('error'); }
    finally { setSavingPermissions(false); }
  };

  const handleSauverMail = async (e) => {
    e.preventDefault();
    setMsgMail('');
    setSavingMail(true);
    try {
      await apiClient.put('/parametres/mail', {
        smtp_active: mail.smtp_active === true,
        smtp_host: mail.smtp_host,
        smtp_port: Number(mail.smtp_port || 587),
        smtp_secure: mail.smtp_secure === true,
        smtp_user: mail.smtp_user,
        smtp_from_name: mail.smtp_from_name,
        smtp_from_email: mail.smtp_from_email,
        smtp_app_password: mail.smtp_app_password || '',
      }, { headers });
      setMsgMail('success');
      setMail(prev => ({ ...prev, smtp_app_password: '' }));
      await chargerMail();
      setTimeout(() => setMsgMail(''), 3500);
    } catch (err) {
      setMsgMail(err?.response?.data?.message || 'error');
    } finally { setSavingMail(false); }
  };

  const handleTesterMail = async () => {
    if (!mailTestTo) return setMsgMailTest('Veuillez saisir un email de destination');
    setMsgMailTest('');
    setTestMailLoading(true);
    try {
      await apiClient.post('/parametres/mail/test', { email: mailTestTo }, { headers, timeout: 35000 });
      setMsgMailTest('Email de test envoyé');
    } catch (err) {
      const timeout = err?.code === 'ECONNABORTED';
      if (timeout) {
        setMsgMailTest("Délai dépassé. Vérifiez SMTP/port/mot de passe d'application puis réessayez.");
      } else {
        const data = err?.response?.data || {};
        const parts = [];
        parts.push(data.message || err.message || 'Échec envoi test');
        if (data.code) parts.push(`Code: ${data.code}`);
        if (data.reponse) parts.push(`Réponse SMTP: ${data.reponse}`);
        if (data.erreur) parts.push(`Détail: ${data.erreur}`);
        if (data.hint) parts.push(`Astuce: ${data.hint}`);

        const isOutlookPersonal = /@(outlook\.com|hotmail\.com|live\.[a-z]{2,}|msn\.com)$/i.test(mail.smtp_user || '');
        const hostLooksOffice365 = String(mail.smtp_host || '').toLowerCase() === 'smtp.office365.com';
        if (isOutlookPersonal && hostLooksOffice365) {
          parts.push('Astuce Outlook personnel: essayez "smtp-mail.outlook.com" (port 587, TLS, mot de passe d application).');
        }

        setMsgMailTest(parts.join('\n'));
      }
    } finally {
      setTestMailLoading(false);
    }
  };

  const handleReset = async () => {
    setResetEtape(3);
    try {
      await apiClient.delete('/parametres/reset-tout', { headers });
      setResetEtape(4);
      setResetMsg('Toutes les données ont été supprimées.');
    } catch (err) {
      setResetEtape(0);
      setResetMsg('Erreur : ' + (err.response?.data?.message || err.message));
    }
  };

  const handleArchiverRentree = async () => {
    setArchiveLoading(true);
    setResetRentreeMsg('');
    try {
      const res = await apiClient.post('/archives', {}, { headers, timeout: 300000 });
      const id = res.data?.archive_id;
      if (!id) throw new Error('Transfert effectué mais identifiant d’archive manquant.');
      setArchiveId(id);
      setArchiveNom(res.data?.annee || 'année en cours');
      setResetRentreeMsg('Année transférée dans le menu Archive (lecture seule). Vous pouvez maintenant confirmer pour continuer.');
    } catch (err) {
      setArchiveId(null);
      setArchiveNom('');
      setResetRentreeMsg('Erreur : ' + (err.response?.data?.message || err.message));
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleResetRentree = async () => {
    if (!archiveId) {
      setResetRentreeEtape(1);
      setResetRentreeMsg('Vous devez d’abord transférer l’année vers Archives avant de continuer.');
      return;
    }
    setResetRentreeEtape(3);
    try {
      const res = await apiClient.delete('/parametres/reset-rentree', {
        headers: { ...headers, 'X-Archive-Id': String(archiveId) },
        data: { archive_id: archiveId },
      });
      const data = res.data || {};
      const erreurs = Array.isArray(data.erreurs) ? data.erreurs : [];
      setResetRentreeEtape(4);
      setArchiveId(null);
      setArchiveNom('');
      if (erreurs.length) {
        setResetRentreeMsg(
          'Reset partiel : ' + erreurs.slice(0, 5).join(' · ')
          + (erreurs.length > 5 ? ` (+${erreurs.length - 5})` : '')
        );
      } else {
        const skips = Array.isArray(data.details)
          ? data.details.filter((d) => String(d).startsWith('SKIP:')).length
          : 0;
        setResetRentreeMsg(
          skips
            ? `Reset de rentrée scolaire effectué (${skips} table(s) absente(s) ignorée(s)).`
            : 'Reset de rentrée scolaire effectué.'
        );
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.archive_required) setResetRentreeEtape(1);
      else setResetRentreeEtape(0);
      const detailErr = Array.isArray(data?.erreurs) && data.erreurs.length
        ? data.erreurs.slice(0, 3).join(' · ')
        : (data?.message || err.message);
      setResetRentreeMsg('Erreur : ' + detailErr);
    }
  };

  const COULEURS = { profil: '#1a73e8', mdp: '#ea4335', mfa: '#0f766e', ecole: '#34a853', mail: '#7c3aed', acces: '#ff9800', danger: '#dc2626' };

  return (
    <div className="page-parametres" style={styles.page}>
      <div style={mainStyle}>
        <div style={chromeStyle}>
        <div style={{ ...styles.topBar, marginBottom: isMobile ? 12 : 24, alignItems: isMobile ? 'stretch' : 'center' }}>
          <h1 style={{ ...styles.titre, fontSize: isMobile ? 20 : 22 }}>Paramètres</h1>
          <div style={{ ...styles.topBarRight, width: isMobile ? '100%' : undefined, flexWrap: 'wrap' }}>
            {onglet === 'profil' && (<>
              {(msgProfil === 'success' || msgProfil === 'success-affectations') && <span style={{fontSize:13,fontWeight:600,padding:'6px 14px',borderRadius:8,background:'#ede9fe',color:'#4c1d95'}}>{msgProfil === 'success-affectations' ? 'Profil mis à jour. Cours retirés des créneaux indisponibles.' : 'Profil mis à jour.'}</span>}
              {msgProfil === 'error' && <span style={{fontSize:13,fontWeight:600,padding:'6px 14px',borderRadius:8,background:'#ede9fe',color:'#4c1d95'}}>Erreur</span>}
              <LoadingButton type="submit" form="form-profil" loading={savingProfil} style={{ ...styles.btnSauverHeader, width: isMobile ? '100%' : undefined }}>Sauvegarder</LoadingButton>
            </>)}
            {onglet === 'ecole' && isAdmin && (<>
              {msgEcole === 'success' && <span style={{fontSize:13,fontWeight:600,padding:'6px 14px',borderRadius:8,background:'#ede9fe',color:'#4c1d95'}}>Paramètres mis à jour.</span>}
              {msgEcole === 'error' && <span style={{fontSize:13,fontWeight:600,padding:'6px 14px',borderRadius:8,background:'#ede9fe',color:'#4c1d95'}}>Erreur</span>}
              <LoadingButton type="submit" form="form-ecole" loading={savingEcole} style={{ ...styles.btnSauverHeader, width: isMobile ? '100%' : undefined }}>Sauvegarder</LoadingButton>
            </>)}
          </div>
        </div>
        </div>
        <div style={styles.content}>

          {onglet === 'profil' && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <h3 style={{ ...styles.cardTitre, margin: 0, fontSize: isMobile ? 17 : 20 }}>Mon profil</h3>
                <div style={styles.roleTag}>{profil.role}</div>
              </div>

              {barSousOnglets(
                isMobile
                  ? [['connexion', 'Connexion'], ['personnelles', 'Perso'], ['professionnelles', 'Pro'], ['desideratas', 'Désidératas']]
                  : [['connexion', 'Informations de connexion'], ['personnelles', 'Informations personnelles'], ['professionnelles', 'Informations professionnelles'], ['desideratas', 'Désidératas']],
                sousOngletProfil,
                setSousOngletProfil
              )}
              <div style={{ paddingTop: isMobile ? 0 : 20 }}>
                {msgProfil === 'success' && <div style={styles.msgSuccess}>Profil mis à jour.</div>}
                {msgProfil === 'success-affectations' && <div style={styles.msgSuccess}>Profil mis à jour. Les cours sur les créneaux indisponibles ont été retirés de l'emploi du temps.</div>}
                {msgProfil === 'error' && <div style={styles.msgError}>Erreur lors de la mise à jour</div>}

                <form id="form-profil" onSubmit={handleSauverProfil}>

                  {/* Connexion */}
                  {sousOngletProfil === 'connexion' && (
                    <div>
                      <div style={{...formGridStyle, marginBottom: 20}}>
                        <div style={{...styles.formChamp, gridColumn:'1/-1'}}>
                          <label style={styles.label}>Email *</label>
                          <input style={styles.input} type="email" required value={profil.email} onChange={e => setProfil({ ...profil, email: e.target.value })} />
                        </div>
                      </div>
                      {/* Changer mot de passe - expandable */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                        <div onClick={() => setMdpOuvert(!mdpOuvert)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: '#f8fafc', cursor: 'pointer' }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Changer le mot de passe</span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{mdpOuvert ? '▲' : '▼'}</span>
                        </div>
                        {mdpOuvert && (
                          <div style={{ padding: '16px', background: 'white', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {msgMdp === 'success' && <div style={styles.msgSuccess}>Mot de passe modifié.</div>}
                            {msgMdp === 'error' && <div style={styles.msgError}>Ancien mot de passe incorrect</div>}
                            {msgMdp === 'mismatch' && <div style={styles.msgError}>Les mots de passe ne correspondent pas</div>}
                            <div style={styles.formChamp}>
                              <label style={styles.label}>Ancien mot de passe *</label>
                              <input style={styles.input} type="password" value={mdp.ancien} onChange={e => setMdp({ ...mdp, ancien: e.target.value })} />
                            </div>
                            <div style={styles.formChamp}>
                              <label style={styles.label}>Nouveau mot de passe *</label>
                              <input style={styles.input} type="password" value={mdp.nouveau} onChange={e => setMdp({ ...mdp, nouveau: e.target.value })} />
                            </div>
                            <div style={styles.formChamp}>
                              <label style={styles.label}>Confirmer *</label>
                              <input style={styles.input} type="password" value={mdp.confirmation} onChange={e => setMdp({ ...mdp, confirmation: e.target.value })} />
                            </div>
                            <LoadingButton type="button" onClick={handleSauverMdp} loading={savingMdp} style={{ ...styles.btnSauver, background: '#ea4335', alignSelf: 'flex-start' }}>Changer</LoadingButton>
                          </div>
                        )}
                      </div>

                      {/* Passkeys */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginTop: 14 }}>
                        <div style={{ padding: '11px 16px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Passkeys</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Connexion biométrique ou clé de sécurité, sans mot de passe.</div>
                          </div>
                        </div>
                        <div style={{ padding: 16, background: 'white', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {msgPasskey && (
                            <div style={{
                              ...((/enregistrée|supprimée/i.test(msgPasskey)) ? styles.msgSuccess : styles.msgError),
                            }}>
                              {msgPasskey}
                            </div>
                          )}
                          {!passkeySupported() ? (
                            <div style={{ fontSize: 13, color: '#94a3b8' }}>Passkeys non disponibles sur ce navigateur.</div>
                          ) : (
                            <>
                              {passkeys.length === 0 ? (
                                <div style={{ fontSize: 13, color: '#94a3b8' }}>Aucune passkey enregistrée.</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {passkeys.map((pk) => (
                                    <div key={pk.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: '#334155' }}>{pk.friendly_name || 'Passkey'}</div>
                                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                          {pk.created_at ? new Date(pk.created_at).toLocaleString('fr-CH') : ''}
                                          {pk.backed_up ? ' · synchronisée' : ''}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleSupprimerPasskey(pk.id)}
                                        disabled={passkeyLoading}
                                        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff1f2', color: '#b91c1c', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
                                      >
                                        Supprimer
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                <input
                                  style={{ ...styles.input, flex: 1, minWidth: 160, margin: 0 }}
                                  type="text"
                                  value={passkeyName}
                                  onChange={(e) => setPasskeyName(e.target.value)}
                                  placeholder="Nom (ex. iPhone, YubiKey)"
                                />
                                <button
                                  type="button"
                                  onClick={handleAjouterPasskey}
                                  disabled={passkeyLoading}
                                  style={{ ...styles.btnSauver, background: '#4f46e5', opacity: passkeyLoading ? 0.7 : 1 }}
                                >
                                  {passkeyLoading ? 'En cours…' : 'Ajouter une passkey'}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Double authentification */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginTop: 14 }}>
                        <div style={{ padding: '11px 16px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Double authentification</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Code à 6 chiffres (Google Authenticator). Obligatoire pour accéder à l’application.</div>
                          </div>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: 99,
                            fontSize: 12,
                            fontWeight: 700,
                            background: mfaEnabled ? '#dcfce7' : '#fef3c7',
                            color: mfaEnabled ? '#166534' : '#92400e',
                          }}>
                            {mfaEnabled ? '2FA active' : '2FA désactivée'}
                          </span>
                        </div>
                        <div style={{ padding: 16, background: 'white', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {msgMfa && (
                            <div style={{
                              ...styles.msgInfo,
                              background: (/^(Double authentification|Nouveaux codes de secours)/.test(msgMfa)) ? '#dcfce7' : '#eff6ff',
                              color: (/^(Double authentification|Nouveaux codes de secours)/.test(msgMfa)) ? '#166534' : '#1e40af',
                            }}>
                              {msgMfa}
                            </div>
                          )}

                          {!mfaEnabled && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                              {!mfaSetupToken && (
                                <button type="button" style={{ ...styles.btnSauver, background: '#0f766e', alignSelf: 'flex-start' }} onClick={handleGenererMfaSetup} disabled={mfaLoading}>
                                  {mfaLoading ? '⏳ Génération...' : 'Générer le setup 2FA'}
                                </button>
                              )}

                              {mfaSetupToken && (
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, background: '#f8fafc' }}>
                                  <div style={{ fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>1) Scanner le QR code</div>
                                  {mfaQrDataUrl ? (
                                    <img
                                      alt="QR code MFA"
                                      src={mfaQrDataUrl}
                                      style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', marginBottom: 10 }}
                                    />
                                  ) : mfaOtpAuthUrl ? (
                                    <img
                                      alt="QR code MFA"
                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&ecc=M&data=${encodeURIComponent(mfaOtpAuthUrl)}`}
                                      style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', marginBottom: 10 }}
                                    />
                                  ) : null}
                                  <div style={{ fontSize: 12, color: '#334155', marginBottom: 6 }}>
                                    En cas de problème de scan, clé manuelle (Google ou Microsoft Authenticator) :
                                  </div>
                                  <code style={{ display: 'inline-block', padding: '6px 8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }}>
                                    {secretGroupePar4(mfaSecret)}
                                  </code>
                                  <div style={{ fontWeight: 700, marginTop: 14, marginBottom: 8, color: '#0f172a' }}>2) Saisir le code à 6 chiffres</div>
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input
                                      style={{ ...styles.input, maxWidth: 180 }}
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]{6}"
                                      maxLength={6}
                                      value={mfaCode}
                                      onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                      placeholder="123456"
                                    />
                                    <button type="button" style={{ ...styles.btnSauver, background: '#0f766e' }} onClick={handleActiverMfa} disabled={mfaLoading}>
                                      {mfaLoading ? '⏳ Activation...' : 'Activer 2FA'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {mfaEnabled && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              <div style={{ fontSize: 13, color: '#334155', fontWeight: 700 }}>
                                Codes de secours restants: {mfaBackupRemaining}
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <input
                                  style={{ ...styles.input, maxWidth: 180 }}
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]{6}"
                                  maxLength={6}
                                  value={mfaCode}
                                  onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                  placeholder="Code 2FA"
                                />
                                <button type="button" style={{ ...styles.btnSauver, background: '#b45309' }} onClick={handleRegenererBackupCodes} disabled={mfaLoading}>
                                  {mfaLoading ? '⏳ Génération...' : 'Régénérer codes secours'}
                                </button>
                                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                  La 2FA est obligatoire et ne peut pas être désactivée pour le moment.
                                </div>
                              </div>
                            </div>
                          )}

                          {mfaBackupCodes.length > 0 && (
                            <div style={{ border: '1px solid #fde68a', borderRadius: 10, padding: 14, background: '#fffbeb' }}>
                              <div style={{ fontWeight: 800, color: '#92400e', marginBottom: 8 }}>
                                ⚠️ Codes de secours (affichés une seule fois)
                              </div>
                              <div style={{ fontSize: 12, color: '#92400e', marginBottom: 10 }}>
                                Conservez-les hors ligne. Chaque code ne peut être utilisé qu'une seule fois.
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8 }}>
                                {mfaBackupCodes.map((c, i) => (
                                  <code key={`backup-${i}`} style={{ padding: '8px 10px', background: 'white', border: '1px solid #fcd34d', borderRadius: 8, textAlign: 'center', fontWeight: 800 }}>
                                    {c}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Informations personnelles */}
                  {sousOngletProfil === 'personnelles' && (
                    <div style={{...formGridStyle, marginBottom: 20}}>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>NOM *</label>
                        <input style={styles.input} type="text" required value={profil.nom} onChange={e => setProfil({ ...profil, nom: e.target.value.toUpperCase() })} placeholder="DUPONT" />
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Prénom *</label>
                        <input style={styles.input} type="text" required value={profil.prenom} onChange={e => setProfil({ ...profil, prenom: e.target.value })} placeholder="Jean" />
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Date de naissance</label>
                        <input style={styles.input} type="date" value={profil.date_naissance ? profil.date_naissance.slice(0,10) : ''} onChange={e => setProfil({ ...profil, date_naissance: e.target.value })} />
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Sexe</label>
                        <CustomSelect
                          style={styles.input}
                          value={profil.sexe||''}
                          placeholder="--"
                          options={[
                            {value: 'M', label: 'Masculin'},
                            {value: 'F', label: 'Féminin'},
                            {value: 'Autre', label: 'Autre'},
                          ]}
                          onChange={(v) => setProfil({ ...profil, sexe: v })}
                        />
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Téléphone</label>
                        <input style={styles.input} type="text" value={profil.telephone||''} onChange={e => setProfil({ ...profil, telephone: e.target.value })} placeholder="079 123 45 67" />
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>N° AVS</label>
                        <input style={styles.input} type="text" value={profil.avs||''} onChange={e => setProfil({ ...profil, avs: e.target.value })} placeholder="756.XXXX.XXXX.XX" />
                      </div>
                      <div style={{...styles.formChamp, gridColumn:'1/-1'}}>
                        <label style={styles.label}>Adresse</label>
                        <input style={styles.input} type="text" value={profil.adresse||''} onChange={e => setProfil({ ...profil, adresse: e.target.value })} placeholder="Rue de la Paix 10" />
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>NPA</label>
                        <NpaAutocomplete
                          npa={profil.npa}
                          lieu={profil.lieu}
                          inputStyle={styles.input}
                          onChange={({ npa, lieu }) => setProfil((p) => ({ ...p, npa, lieu }))}
                        />
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Lieu</label>
                        <input style={styles.input} type="text" value={profil.lieu||''} onChange={e => setProfil({ ...profil, lieu: e.target.value })} placeholder="Sion" />
                      </div>
                    </div>
                  )}

                  {/* Informations professionnelles */}
                  {sousOngletProfil === 'professionnelles' && (
                    <div style={{...formGridStyle, marginBottom: 20}}>
                      {[
                        {label:"Taux d'activité (%)", value: profil.taux_activite ?? '—'},
                        {label:"Périodes / semaine", value: profil.periodes_semaine ?? '—'},
                        {label:"Type de contrat", value: profil.type_contrat || '—'},
                      ].map(({label,value}) => (
                        <div key={label} style={styles.formChamp}>
                          <label style={styles.label}>{label}</label>
                          <div style={{...styles.input, background:'#f1f5f9', color:'#64748b', cursor:'not-allowed', display:'flex', alignItems:'center', height:38}}>{value}</div>
                        </div>
                      ))}
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Type de permis</label>
                        <input style={styles.input} type="text" value={profil.type_permis || ''} onChange={e => setProfil({...profil, type_permis: e.target.value})} placeholder="B, C, L..." />
                      </div>
                    </div>
                  )}

                  {/* Désidératas */}
                  {sousOngletProfil === 'desideratas' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Niveaux préférés</label>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                          {niveauxDB.map(n => {
                            const niveaux = profil.niveau_prefere ? profil.niveau_prefere.split(',').filter(Boolean) : [];
                            const selected = niveaux.includes(n.nom);
                            return (
                              <button key={n.id} type="button"
                                onClick={() => {
                                  const curr = profil.niveau_prefere ? profil.niveau_prefere.split(',').filter(Boolean) : [];
                                  const newNiv = selected ? curr.filter(x=>x!==n.nom) : [...curr, n.nom];
                                  setProfil({...profil, niveau_prefere: newNiv.length >= niveauxDB.length ? '' : newNiv.join(',')});
                                }}
                                style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+(selected?'#6366f1':'#e2e8f0'),background:selected?'#e0e7ff':'white',color:selected?'#3730a3':'#64748b',cursor:'pointer',fontWeight:700,fontSize:13}}>
                                {n.nom}
                              </button>
                            );
                          })}
                          <button type="button" onClick={() => setProfil({...profil, niveau_prefere:''})}
                            style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+((!profil.niveau_prefere)?'#94a3b8':'#e2e8f0'),background:(!profil.niveau_prefere)?'#f1f5f9':'white',color:'#64748b',cursor:'pointer',fontWeight:700,fontSize:13}}>
                            Aucune préférence
                          </button>
                        </div>
                      </div>

                      <div style={styles.formChamp}>
                        <label style={styles.label}>Préférences branches — {profil.niveau_prefere || 'Tous niveaux'}</label>
                        <p style={{ margin: '4px 0 10px', fontSize: 12, color: '#64748b', lineHeight: 1.45 }}>
                          Glissez-déposez pour classer les branches : le numéro 1 est votre priorité la plus forte, puis 2, 3, etc.
                        </p>
                        {branchesDisponiblesProfil.length === 0 ? (
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>Aucune préférence de branche disponible.</div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                            {ORDRE_COLONNES_SPECIALITES.map((cat) => {
                              const items = listerGroupesColonneOrdonnes(branchesDisponiblesProfil, profil.branches_specialites, cat);
                              const ROW_H = 34;
                              return (
                                <div key={cat} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 10, background: '#f8fafc', minHeight: 120 }}>
                                  <div style={{ fontSize: 12, fontWeight: 800, color: '#334155', marginBottom: 8 }}>{LIBELLES_COLONNES_SPECIALITES[cat]}</div>
                                  {items.length === 0 ? (
                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Aucune branche</div>
                                  ) : (
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                                      {/* Numéros fixes hors des pastilles (liste 1, 2, 3…) */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                                        {items.map((_, idx) => (
                                          <div
                                            key={`num-${cat}-${idx}`}
                                            style={{
                                              height: ROW_H,
                                              minWidth: 22,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'flex-end',
                                              fontWeight: 800,
                                              fontSize: 12,
                                              color: '#64748b',
                                              lineHeight: 1,
                                            }}
                                          >
                                            {idx + 1}.
                                          </div>
                                        ))}
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        {items.map((b, idx) => {
                                          const isDragOver = dragOverBranche?.cat === cat && dragOverBranche?.idx === idx;
                                          return (
                                            <div
                                              key={b.id}
                                              draggable
                                              onDragStart={() => { dragBrancheRef.current = { cat, idx }; }}
                                              onDragOver={(e) => { e.preventDefault(); setDragOverBranche({ cat, idx }); }}
                                              onDragLeave={() => {
                                                if (dragOverBranche?.cat === cat && dragOverBranche?.idx === idx) {
                                                  setDragOverBranche(null);
                                                }
                                              }}
                                              onDrop={() => {
                                                const from = dragBrancheRef.current;
                                                if (from && from.cat === cat) {
                                                  reorderBrancheProfilDansColonne(cat, from.idx, idx);
                                                }
                                                setDragOverBranche(null);
                                                dragBrancheRef.current = null;
                                              }}
                                              onDragEnd={() => {
                                                setDragOverBranche(null);
                                                dragBrancheRef.current = null;
                                              }}
                                              title={(b.noms || []).join(' / ')}
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                height: ROW_H,
                                                boxSizing: 'border-box',
                                                padding: '0 10px',
                                                background: isDragOver ? '#e0e7ff' : '#f8fafc',
                                                borderRadius: 7,
                                                border: '1px solid ' + (isDragOver ? '#6366f1' : '#e2e8f0'),
                                                cursor: 'grab',
                                              }}
                                            >
                                              <span style={{ color: '#cbd5e1', fontSize: 14, flexShrink: 0 }}>⠿</span>
                                              <span style={{
                                                flex: 1,
                                                fontWeight: 700,
                                                fontSize: 13,
                                                color: '#334155',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                              }}>
                                                {b.labelComplet || b.label}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div style={styles.formChamp}>
                        <label style={styles.label}>
                          Disponibilités (jours de travail)
                          <span style={{ marginLeft: 10, fontWeight: 800, color: couleurCompteurDispoProfil }}>
                            {periodesSelectionneesDispoProfil} / {periodesRequisesDispoProfil} périodes
                          </span>
                        </label>
                        <p style={{ margin: '4px 0 10px', fontSize: 12, color: '#64748b', lineHeight: 1.45 }}>
                          Indiquez vos périodes disponibles. Orange = disponible, mais à éviter si possible sur les affectations. Cliquer pour cycler : disponible → à éviter → indisponible.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 10, fontSize: 12, color: '#475569' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} /> Disponible</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ea580c', display: 'inline-block' }} /> À éviter</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} /> Indisponible</span>
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ ...styles.label, fontSize: 12 }}>Remarques</label>
                          <textarea
                            style={{ ...styles.input, width: '100%', minHeight: 72, resize: 'vertical' }}
                            value={remarquesDispoProfil}
                            onChange={(e) => { setRemarquesDispoProfil(e.target.value); setDisposProfilDirty(true); }}
                            placeholder="Ajouter une remarque…"
                          />
                        </div>
                        {!creneauxDispoProfil.length ? (
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>Aucun créneau configuré.</div>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 640 }}>
                              <thead>
                                <tr>
                                  <th style={{ padding: '8px 6px', fontSize: 12, background: '#f1f5f9', border: '1px solid #e2e8f0', width: 72 }}>Période</th>
                                  {JOURS_DISPO.map((j) => (
                                    <th key={j} style={{ padding: '8px 6px', fontSize: 12, background: '#f1f5f9', border: '1px solid #e2e8f0', textAlign: 'center' }}>{j}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {['Matin', 'Après-midi'].map((periode) => {
                                  const crsLundi = creneauxDispoProfil.filter((c) => c.jour === 'Lundi' && c.periode === periode);
                                  if (!crsLundi.length) return null;
                                  return [
                                    <tr key={periode + '-banner'}>
                                      <td colSpan={JOURS_DISPO.length + 1} style={{ padding: '6px 10px', background: '#eef2ff', fontWeight: 700, fontSize: 12, color: '#3730a3', border: '1px solid #e2e8f0' }}>{periode}</td>
                                    </tr>,
                                    ...crsLundi.map((crBase, idx) => (
                                      <tr key={crBase.id}>
                                        <td style={{ padding: '8px 6px', fontSize: 12, fontWeight: 700, border: '1px solid #e2e8f0', textAlign: 'center', background: '#f8fafc' }}>
                                          P{periode === 'Matin' ? idx + 1 : idx + 5}
                                        </td>
                                        {JOURS_DISPO.map((jour) => {
                                          const cr = creneauxDispoProfil.find((c) => c.jour === jour && c.periode === periode && c.ordre === crBase.ordre);
                                          if (!cr) return <td key={jour} style={{ background: '#f0f0f0', border: '1px solid #e2e8f0' }} />;
                                          const statut = statutDepuisDispoRow(disposProfil[cr.id]);
                                          return (
                                            <td
                                              key={jour}
                                              onClick={() => toggleDispoProfil(cr.id)}
                                              title={`${titreStatutDispo(statut)} — cliquer pour cycler`}
                                              style={{ padding: '10px 6px', border: '1px solid #e2e8f0', textAlign: 'center', cursor: 'pointer', verticalAlign: 'middle', background: fondCelluleStatutDispo(statut) }}
                                            >
                                              <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', background: pastilleDispo(statut), verticalAlign: 'middle' }} />
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    )),
                                  ];
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div style={styles.formChamp}>
                        <label style={styles.label}>Lieux de travail préférés</label>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                          {lieuxTravailDB.map(l => {
                            const lieux = profil.lieu_travail_prefere ? profil.lieu_travail_prefere.split(',').filter(Boolean) : [];
                            const selected = lieux.includes(l.nom);
                            return (
                              <button key={l.id} type="button"
                                onClick={() => {
                                  const curr = profil.lieu_travail_prefere ? profil.lieu_travail_prefere.split(',').filter(Boolean) : [];
                                  const newL = selected ? curr.filter(x=>x!==l.nom) : [...curr, l.nom];
                                  setProfil({...profil, lieu_travail_prefere: newL.length >= lieuxTravailDB.length ? '' : newL.join(',')});
                                }}
                                style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+(selected?'#6366f1':'#e2e8f0'),background:selected?'#e0e7ff':'white',color:selected?'#3730a3':'#64748b',cursor:'pointer',fontWeight:700,fontSize:13}}>
                                {l.nom}
                              </button>
                            );
                          })}
                          <button type="button" onClick={() => setProfil({...profil, lieu_travail_prefere:''})}
                            style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+((!profil.lieu_travail_prefere)?'#94a3b8':'#e2e8f0'),background:(!profil.lieu_travail_prefere)?'#f1f5f9':'white',color:'#64748b',cursor:'pointer',fontWeight:700,fontSize:13}}>
                            Aucune préférence
                          </button>
                        </div>
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Remarques lieu de travail</label>
                        <input style={styles.input} type="text" value={profil.remarque_lieu_travail||''} onChange={e => setProfil({...profil, remarque_lieu_travail: e.target.value})} placeholder="Ex: Préfère éviter BOTZA le lundi..." />
                      </div>
                      <div style={styles.formChamp}>
                        <label style={styles.label}>Priorité</label>
                        <div className={isMobile ? 'chip-tabs chip-tabs-equal' : undefined} style={{display:'flex',gap:8,marginTop:4,flexWrap: isMobile ? 'nowrap' : 'wrap'}}>
                          {[['niveau','Niveau'],['lieu','Lieu de travail'],['aucune','Aucune priorité']].map(([val,lbl]) => (
                            <button key={val} type="button"
                              onClick={() => setProfil({...profil, priorite_pref: val})}
                              style={{padding:'8px 14px',borderRadius:8,border:'2px solid '+(profil.priorite_pref===val?'#6366f1':'#e2e8f0'),background:profil.priorite_pref===val?'#e0e7ff':'white',fontWeight:700,cursor:'pointer',fontSize:13,color:profil.priorite_pref===val?'#3730a3':'#64748b'}}>
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </form>
              </div>
            </div>
          )}

          {onglet === 'mdp' && (
            <div style={cardStyle}>
              <h3 style={{ ...styles.cardTitre, fontSize: isMobile ? 17 : 20 }}>Changer le mot de passe</h3>
              {msgMdp === 'success' && <div style={styles.msgSuccess}>Mot de passe modifié.</div>}
              {msgMdp === 'error' && <div style={styles.msgError}>Ancien mot de passe incorrect</div>}
              {msgMdp === 'mismatch' && <div style={styles.msgError}>Les mots de passe ne correspondent pas</div>}
              <form onSubmit={handleSauverMdp}>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Ancien mot de passe *</label>
                  <input style={styles.input} type="password" required value={mdp.ancien} onChange={e => setMdp({ ...mdp, ancien: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Nouveau mot de passe *</label>
                  <input style={styles.input} type="password" required value={mdp.nouveau} onChange={e => setMdp({ ...mdp, nouveau: e.target.value })} />
                </div>
                <div style={styles.formChamp}>
                  <label style={styles.label}>Confirmer *</label>
                  <input style={styles.input} type="password" required value={mdp.confirmation} onChange={e => setMdp({ ...mdp, confirmation: e.target.value })} />
                </div>
                <LoadingButton type="submit" loading={savingMdp} style={{ ...styles.btnSauver, background: '#ea4335', marginTop: '10px' }}>Changer</LoadingButton>
              </form>
            </div>
          )}

          {onglet === 'ecole' && isAdmin && (
            <div style={cardStyle}>
              <h3 style={{ ...styles.cardTitre, marginBottom: 16, fontSize: isMobile ? 17 : 20 }}>Paramètres de l'école</h3>

              {barSousOnglets(
                [['adresse', 'Adresse'], ['responsables', 'Responsables'], ['structure', 'Structure'], ['horaires', 'Horaires']],
                sousOngletEcole,
                setSousOngletEcole
              )}
              <div style={{ paddingTop: (isMobile || sousOngletEcole === 'horaires') ? 0 : 20 }}>

              <form id="form-ecole" onSubmit={handleSauverEcole}>

                {/* Section Adresse */}
                {sousOngletEcole === 'adresse' && <div>
                <div style={formGridStyle}>
                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={styles.label}>Nom de l'école</label>
                    <input style={styles.input} type="text" value={ecole.nom_ecole || ''} onChange={e => setEcole({ ...ecole, nom_ecole: e.target.value })} />
                  </div>
                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={styles.label}>Adresse</label>
                    <input style={styles.input} type="text" value={ecole.adresse || ''} onChange={e => setEcole({ ...ecole, adresse: e.target.value })} />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Téléphone</label>
                    <input style={styles.input} type="text" value={ecole.telephone || ''} onChange={e => setEcole({ ...ecole, telephone: e.target.value })} />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Email</label>
                    <input style={styles.input} type="email" value={ecole.email || ''} onChange={e => setEcole({ ...ecole, email: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '15px' }}>
                    <div style={styles.formChamp}>
                      <label style={styles.label}>Année scolaire</label>
                      <input style={styles.input} type="text" value={ecole.annee_scolaire || ''} onChange={e => setEcole({ ...ecole, annee_scolaire: e.target.value })} placeholder="2025-2026" />
                    </div>
                    <div style={styles.formChamp}>
                      <label style={styles.label}>Date début de l'année scolaire</label>
                      <input style={styles.input} type="date" value={ecole.date_debut_annee ? ecole.date_debut_annee.substring(0,10) : ''} onChange={e => setEcole({ ...ecole, date_debut_annee: e.target.value })} />
                    </div>
                    <div style={styles.formChamp}>
                      <label style={styles.label}>Date fin de l'année scolaire</label>
                      <input style={styles.input} type="date" value={ecole.date_fin_annee ? ecole.date_fin_annee.substring(0,10) : ''} onChange={e => setEcole({ ...ecole, date_fin_annee: e.target.value })} />
                    </div>
                  </div>
                </div>
                </div>}

                {/* Section Responsables */}
                {sousOngletEcole === 'responsables' && <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={styles.formChamp}>
                    <label style={{ ...styles.label, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span>Responsable des cours de langues jeunes</span>
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        <button type="button" onClick={() => setEcole({ ...ecole, sexe_responsable_langues_jeunes: 'M' })}
                          style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: ecole.sexe_responsable_langues_jeunes === 'M' ? '#dbeafe' : 'white', color: '#1e3a8a', fontWeight: 700 }}>♂</button>
                        <button type="button" onClick={() => setEcole({ ...ecole, sexe_responsable_langues_jeunes: 'F' })}
                          style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: ecole.sexe_responsable_langues_jeunes === 'F' ? '#fce7f3' : 'white', color: '#9d174d', fontWeight: 700 }}>♀</button>
                      </span>
                    </label>
                    <CustomSelect
                      style={styles.input}
                      value={ecole.responsable_langues_jeunes || ''}
                      placeholder="— Choisir —"
                      options={employesResponsablesListe.map(emp => {
                        const label = `${emp.prenom || ''} ${emp.nom || ''}`.trim();
                        return {value: label, label: label};
                      })}
                      onChange={(v) => setEcole({ ...ecole, responsable_langues_jeunes: v })}
                    />
                  </div>

                  <div>
                    <div style={{ ...styles.label, marginBottom: 10 }}>Responsables de niveau</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {(ecole.responsables_niveaux || []).map((row, index) => (
                        <div
                          key={`resp-niv-${index}`}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: 12,
                            padding: 14,
                            background: '#f8fafc',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                          }}
                        >
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 240px', minWidth: 200 }}>
                              <label style={{ ...styles.label, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <span>Responsable</span>
                                <span style={{ display: 'inline-flex', gap: 4 }}>
                                  <button type="button" onClick={() => mettreAJourResponsableNiveau(index, { sexe: 'M' })}
                                    style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: row.sexe === 'M' ? '#dbeafe' : 'white', color: '#1e3a8a', fontWeight: 700 }}>♂</button>
                                  <button type="button" onClick={() => mettreAJourResponsableNiveau(index, { sexe: 'F' })}
                                    style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: row.sexe === 'F' ? '#fce7f3' : 'white', color: '#9d174d', fontWeight: 700 }}>♀</button>
                                </span>
                              </label>
                              <CustomSelect
                                style={styles.input}
                                value={row.nom || ''}
                                placeholder="— Choisir —"
                                options={employesResponsablesListe.map(emp => {
                                  const label = `${emp.prenom || ''} ${emp.nom || ''}`.trim();
                                  return { value: label, label };
                                })}
                                onChange={(v) => {
                                  const emp = employesResponsablesListe.find(e => `${e.prenom || ''} ${e.nom || ''}`.trim() === v);
                                  const sexeEmp = String(emp?.sexe || '').toUpperCase();
                                  mettreAJourResponsableNiveau(index, {
                                    nom: v,
                                    sexe: sexeEmp === 'F' || sexeEmp === 'M' ? sexeEmp : row.sexe || 'M',
                                  });
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => supprimerResponsableNiveau(index)}
                              title="Supprimer"
                              style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid #fecaca',
                                background: '#fff1f2',
                                color: '#b91c1c',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: 13,
                              }}
                            >
                              Supprimer
                            </button>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Niveaux définis</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {niveauxDB.map((niv) => {
                                const n = niv.nom;
                                const selected = (row.niveaux || []).includes(n);
                                return (
                                  <button
                                    key={`${index}-${n}`}
                                    type="button"
                                    onClick={() => toggleNiveauResponsable(index, n)}
                                    style={{
                                      padding: '8px 14px',
                                      borderRadius: 8,
                                      border: '2px solid ' + (selected ? '#6366f1' : '#e2e8f0'),
                                      background: selected ? '#e0e7ff' : 'white',
                                      color: selected ? '#3730a3' : '#64748b',
                                      cursor: 'pointer',
                                      fontWeight: 700,
                                      fontSize: 13,
                                    }}
                                  >
                                    {n}
                                  </button>
                                );
                              })}
                              {loadingDonnees ? (
                                <PageLoader label="Chargement..." compact style={{ padding: 8 }} />
                              ) : niveauxDB.length === 0 && (
                                <span style={{ fontSize: 12, color: '#94a3b8' }}>Aucun niveau configuré dans Structure.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={ajouterResponsableNiveau}
                      style={{
                        marginTop: 12,
                        padding: '9px 14px',
                        borderRadius: 8,
                        border: '1px dashed #94a3b8',
                        background: 'white',
                        color: '#334155',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      + Ajouter un responsable de niveau
                    </button>
                  </div>
                </div>
                </div>}

              </form>

              {/* Section Structure */}
              {sousOngletEcole === 'structure' && <div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>

                  {/* Niveaux */}
                  <div style={{ flex: '1 1 320px' }}>
                    <div style={styles.label}>Niveaux de classes</div>
                    <form onSubmit={async e => {
                      e.preventDefault();
                      try {
                        const payload = {
                          nom: donneesNiveauForm.nom,
                          periodes_normales: parseInt(donneesNiveauForm.periodes_normales, 10) || 0,
                          periodes_soutien: parseInt(donneesNiveauForm.periodes_soutien, 10) || 0,
                        };
                        if (donneesNiveauEdit) {
                          await apiClient.put('/donnees/niveaux/' + donneesNiveauEdit.id, { ...payload, ordre: donneesNiveauEdit.ordre }, { headers });
                        } else {
                          await apiClient.post('/donnees/niveaux', { ...payload, ordre: niveauxDB.length + 1 }, { headers });
                        }
                        setDonneesNiveauForm({ nom: '', periodes_normales: '20', periodes_soutien: '0' });
                        setDonneesNiveauEdit(null);
                        chargerDonnees();
                      } catch(err) { alert(err.response?.data?.message || err.message); }
                    }} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      <input style={{ ...styles.input, margin: 0, padding: '7px 10px' }} placeholder="Nom (ex: CSC)" value={donneesNiveauForm.nom} onChange={e => setDonneesNiveauForm(f => ({ ...f, nom: e.target.value }))} required />
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          style={{ ...styles.input, flex: 1, margin: 0, padding: '7px 10px' }}
                          type="number"
                          min="0"
                          placeholder="Périodes"
                          title="Périodes normales"
                          value={donneesNiveauForm.periodes_normales}
                          onChange={e => setDonneesNiveauForm(f => ({ ...f, periodes_normales: e.target.value }))}
                          required
                        />
                        <input
                          style={{ ...styles.input, flex: 1, margin: 0, padding: '7px 10px' }}
                          type="number"
                          min="0"
                          placeholder="Soutien"
                          title="Périodes de soutien"
                          value={donneesNiveauForm.periodes_soutien}
                          onChange={e => setDonneesNiveauForm(f => ({ ...f, periodes_soutien: e.target.value }))}
                        />
                        <button type="submit" style={{ padding: '7px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>{donneesNiveauEdit ? '✓' : '+'}</button>
                        {donneesNiveauEdit && <button type="button" onClick={() => { setDonneesNiveauEdit(null); setDonneesNiveauForm({ nom: '', periodes_normales: '20', periodes_soutien: '0' }); }} style={{ padding: '7px 10px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>✕</button>}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Périodes normales · Soutien (0 si aucun)</div>
                    </form>
                    {niveauxDB.map((n, idx) => (
                      <div key={n.id}
                        draggable
                        onDragStart={() => { dragNiveauIdx.current = idx; }}
                        onDragOver={e => { e.preventDefault(); setDragOverNiveau(idx); }}
                        onDragLeave={() => setDragOverNiveau(null)}
                        onDrop={() => { reorderNiveaux(dragNiveauIdx.current, idx); setDragOverNiveau(null); dragNiveauIdx.current = null; }}
                        onDragEnd={() => { setDragOverNiveau(null); dragNiveauIdx.current = null; }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: dragOverNiveau === idx ? '#e0e7ff' : '#f8fafc', borderRadius: 7, border: '1px solid ' + (dragOverNiveau === idx ? '#6366f1' : '#e2e8f0'), marginBottom: 5, cursor: 'grab' }}>
                        <span style={{ color: '#cbd5e1', fontSize: 14, marginRight: 2 }}>⠿</span>
                        <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: '#334155' }}>{n.nom}</span>
                        <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
                          {Number(n.periodes_normales) || 0} pér.
                          {(Number(n.periodes_soutien) || 0) > 0 ? ` + ${Number(n.periodes_soutien)} sout.` : ''}
                        </span>
                        <button onClick={() => { setDonneesNiveauEdit(n); setDonneesNiveauForm({ nom: n.nom, periodes_normales: String(n.periodes_normales ?? 20), periodes_soutien: String(n.periodes_soutien ?? 0) }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#6366f1' }}>✏️</button>
                        <button onClick={async () => { if (window.confirm('Supprimer ?')) { await apiClient.delete('/donnees/niveaux/' + n.id, { headers }); chargerDonnees(); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#ef4444' }}>🗑️</button>
                      </div>
                    ))}
                    {loadingDonnees ? (
                      <PageLoader label="Chargement..." compact style={{ padding: 8 }} />
                    ) : niveauxDB.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>Aucun niveau</div>}
                  </div>

                  {/* Lieux de travail */}
                  <div style={{ flex: '1 1 220px' }}>
                    <div style={styles.label}>Lieux de travail</div>
                    <form onSubmit={async e => {
                      e.preventDefault();
                      try {
                        if (donneesLieuEdit) {
                          await apiClient.put('/donnees/lieux-travail/' + donneesLieuEdit.id, donneesLieuForm, { headers });
                        } else {
                          await apiClient.post('/donnees/lieux-travail', donneesLieuForm, { headers });
                        }
                        setDonneesLieuForm({ nom: '' });
                        setDonneesLieuEdit(null);
                        chargerDonnees();
                      } catch(err) { alert(err.response?.data?.message || err.message); }
                    }} style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                      <input style={{ ...styles.input, flex: 1, margin: 0, padding: '7px 10px', minWidth: isMobile ? 0 : undefined }} placeholder="Nom (ex: BOTZA)" value={donneesLieuForm.nom} onChange={e => setDonneesLieuForm(f => ({ ...f, nom: e.target.value }))} required />
                      <button type="submit" style={{ padding: '7px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>{donneesLieuEdit ? '✓' : '+'}</button>
                      {donneesLieuEdit && <button type="button" onClick={() => { setDonneesLieuEdit(null); setDonneesLieuForm({ nom: '' }); }} style={{ padding: '7px 10px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>✕</button>}
                    </form>
                    {lieuxTravailDB.map((l, idx) => (
                      <div key={l.id}
                        draggable
                        onDragStart={() => { dragLieuIdx.current = idx; }}
                        onDragOver={e => { e.preventDefault(); setDragOverLieu(idx); }}
                        onDragLeave={() => setDragOverLieu(null)}
                        onDrop={() => { reorderLieux(dragLieuIdx.current, idx); setDragOverLieu(null); dragLieuIdx.current = null; }}
                        onDragEnd={() => { setDragOverLieu(null); dragLieuIdx.current = null; }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: dragOverLieu === idx ? '#e0e7ff' : '#f8fafc', borderRadius: 7, border: '1px solid ' + (dragOverLieu === idx ? '#6366f1' : '#e2e8f0'), marginBottom: 5, cursor: 'grab' }}>
                        <span style={{ color: '#cbd5e1', fontSize: 14, marginRight: 2 }}>⠿</span>
                        <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: '#334155' }}>{l.nom}</span>
                        <button onClick={() => { setDonneesLieuEdit(l); setDonneesLieuForm({ nom: l.nom }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#6366f1' }}>✏️</button>
                        <button onClick={async () => { if (window.confirm('Supprimer ?')) { await apiClient.delete('/donnees/lieux-travail/' + l.id, { headers }); chargerDonnees(); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#ef4444' }}>🗑️</button>
                      </div>
                    ))}
                    {loadingDonnees ? (
                      <PageLoader label="Chargement..." compact style={{ padding: 8 }} />
                    ) : lieuxTravailDB.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>Aucun lieu</div>}
                  </div>

                  {/* Salles */}
                  <div style={{ flex: '2 1 320px' }}>
                    <div style={styles.label}>Salles</div>
                    <form onSubmit={async e => {
                      e.preventDefault();
                      try {
                        if (donneesSalleEdit) {
                          await apiClient.put('/donnees/salles/' + donneesSalleEdit.id, donneesSalleForm, { headers });
                        } else {
                          await apiClient.post('/donnees/salles', donneesSalleForm, { headers });
                        }
                        setDonneesSalleForm({ nom: '', lieu_travail_id: '' });
                        setDonneesSalleEdit(null);
                        chargerDonnees();
                      } catch(err) { alert(err.response?.data?.message || err.message); }
                    }} style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                      <input style={{ ...styles.input, flex: 1, margin: 0, padding: '7px 10px', minWidth: isMobile ? '100%' : undefined }} placeholder="Nom salle" value={donneesSalleForm.nom} onChange={e => setDonneesSalleForm(f => ({ ...f, nom: e.target.value }))} required />
                      <select style={{ ...styles.input, minWidth: isMobile ? 0 : 130, flex: isMobile ? 1 : undefined, margin: 0, padding: '7px 8px' }} value={donneesSalleForm.lieu_travail_id} onChange={e => setDonneesSalleForm(f => ({ ...f, lieu_travail_id: e.target.value }))} required>
                        <option value="">Lieu</option>
                        {lieuxTravailDB.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
                      </select>
                      <button type="submit" style={{ padding: '7px 12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>{donneesSalleEdit ? '✓' : '+'}</button>
                      {donneesSalleEdit && <button type="button" onClick={() => { setDonneesSalleEdit(null); setDonneesSalleForm({ nom: '', lieu_travail_id: '' }); }} style={{ padding: '7px 10px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>✕</button>}
                    </form>
                    {lieuxTravailDB.map(l => {
                      const sallesLieu = sallesDB.filter(s => String(s.lieu_travail_id) === String(l.id));
                      if (!sallesLieu.length) return null;
                      return (
                        <div key={l.id} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{l.nom}</div>
                          {sallesLieu.map(s => (
                            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: '#f8fafc', borderRadius: 7, border: '1px solid #e2e8f0', marginBottom: 4 }}>
                              <span style={{ flex: 1, fontSize: 13, color: '#334155' }}>{s.nom}</span>
                              <button onClick={() => { setDonneesSalleEdit(s); setDonneesSalleForm({ nom: s.nom, lieu_travail_id: String(s.lieu_travail_id) }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#6366f1' }}>✏️</button>
                              <button onClick={async () => { if (window.confirm('Supprimer ?')) { await apiClient.delete('/donnees/salles/' + s.id, { headers }); chargerDonnees(); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#ef4444' }}>🗑️</button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {loadingDonnees ? (
                      <PageLoader label="Chargement..." compact style={{ padding: 8 }} />
                    ) : sallesDB.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>Aucune salle</div>}
                  </div>

                </div>
              </div>}

              {/* Section Horaires */}
              {sousOngletEcole === 'horaires' && (() => {
                const lieux = lieuxTravailDB;
                const actifKey = lieuHoraireOnglet || 'defaut';
                const horaireActif = horairesEcole[actifKey] || JSON.parse(JSON.stringify(HORAIRE_DEFAUT));
                const initLieu = (key) => {
                  if (!horairesEcole[key]) setHorairesEcole(prev => ({ ...prev, [key]: JSON.parse(JSON.stringify(HORAIRE_DEFAUT)) }));
                  setLieuHoraireOnglet(key);
                };
                const updatePeriode = (bloc, idx, champ, val) => {
                  const updated = JSON.parse(JSON.stringify(horaireActif));
                  updated[bloc][idx][champ] = val;
                  setHorairesEcole(prev => ({ ...prev, [actifKey]: updated }));
                };
                const allTabs = [{key:'defaut', nom:'Par défaut'}, ...lieux.map(l => ({key:String(l.id), nom:l.nom}))];
                return (
                  <div>
                    {/* Sous-onglets style affectations EDT */}
                    <div
                      className={isMobile ? 'chip-tabs chip-tabs-equal' : undefined}
                      style={isMobile ? {
                        display: 'flex',
                        background: '#ede9fe',
                        borderRadius: 20,
                        padding: 3,
                        gap: 2,
                        marginBottom: 12,
                        width: '100%',
                      } : { display: 'flex', gap: 0, alignItems: 'flex-start', marginBottom: 0, marginTop: 0 }}
                    >
                      {allTabs.map(item => {
                        const actif = (actifKey === item.key);
                        return (
                          <button key={item.key} type="button" onClick={() => initLieu(item.key)} style={isMobile ? {
                            padding: '8px 14px',
                            borderRadius: 17,
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: actif ? 700 : 600,
                            fontSize: 13,
                            background: actif ? '#6366f1' : 'transparent',
                            color: actif ? 'white' : '#6d28d9',
                            lineHeight: 1,
                            outline: 'none',
                            whiteSpace: 'nowrap',
                            fontFamily: 'inherit',
                          } : { padding: '9px 14px', borderRadius: '0 0 10px 10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: actif ? '#4f46e5' : '#e0e7ff', color: actif ? 'white' : '#3730a3', lineHeight: 1, position: 'relative', zIndex: actif ? 2 : 1, outline: 'none', minWidth: 100, textAlign: 'center', ...(actif ? { marginTop: -1, boxShadow: '0 4px 8px rgba(79,70,229,0.22)' } : {}) }}>
                            {item.nom}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ paddingTop: isMobile ? 8 : 20, display: 'flex', gap: isMobile ? 20 : 40, flexWrap: 'wrap' }}>
                      {[['matin', 'Matin'], ['apresmidi', 'Après-midi']].map(([bloc, titre]) => (
                        <div key={bloc} style={{ minWidth: isMobile ? 0 : 260, width: isMobile ? '100%' : undefined }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 12 }}>{titre}</div>
                          {(horaireActif[bloc] || []).map((p, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, minWidth: 0 }}>
                              <span style={{ width: 44, flexShrink: 0, fontSize: 13, color: p.label === 'Pause' ? '#94a3b8' : '#334155', fontWeight: p.label === 'Pause' ? 400 : 600 }}>{p.label}</span>
                              <input type="time" value={p.debut} onChange={e => updatePeriode(bloc, idx, 'debut', e.target.value)}
                                style={{ ...styles.input, width: isMobile ? 'auto' : 90, flex: isMobile ? 1 : undefined, minWidth: 0, padding: '5px 8px', margin: 0, textAlign: 'center' }} />
                              <span style={{ color: '#94a3b8', fontSize: 13, flexShrink: 0 }}>→</span>
                              <input type="time" value={p.fin} onChange={e => updatePeriode(bloc, idx, 'fin', e.target.value)}
                                style={{ ...styles.input, width: isMobile ? 'auto' : 90, flex: isMobile ? 1 : undefined, minWidth: 0, padding: '5px 8px', margin: 0, textAlign: 'center' }} />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              </div>{/* fin paddingTop */}
            </div>
          )}

          {onglet === 'mail' && isAdmin && (
            <div style={cardStyle}>
              <h3 style={{ ...styles.cardTitre, fontSize: isMobile ? 17 : 20 }}>Envoi des mails (admin)</h3>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
                Pour un compte Outlook avec double authentification, utilisez un <b>mot de passe d'application</b>
                (et non votre mot de passe normal).
              </p>
              {msgMail === 'success' && <div style={styles.msgSuccess}>Configuration email enregistrée</div>}
              {msgMail && msgMail !== 'success' && <div style={styles.msgError}>{msgMail === 'error' ? "Erreur lors de l'enregistrement" : msgMail}</div>}

              <form onSubmit={handleSauverMail}>
                <div style={formGridStyle}>
                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={{ ...styles.label, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span>Activer l'envoi d'emails</span>
                      <label style={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={mail.smtp_active === true}
                          onChange={e => setMail({ ...mail, smtp_active: e.target.checked })}
                        />
                        <span style={{ ...styles.toggleSlider, background: mail.smtp_active ? '#34a853' : '#ccc' }}>
                          <span style={{ ...styles.toggleThumb, left: mail.smtp_active ? '22px' : '2px' }} />
                        </span>
                      </label>
                    </label>
                  </div>

                  <div style={styles.formChamp}>
                    <label style={styles.label}>Serveur SMTP</label>
                    <input style={styles.input} type="text" value={mail.smtp_host || ''} onChange={e => setMail({ ...mail, smtp_host: e.target.value })} placeholder="smtp.office365.com" />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Port SMTP</label>
                    <input style={styles.input} type="number" value={mail.smtp_port || 587} onChange={e => setMail({ ...mail, smtp_port: e.target.value })} placeholder="587" />
                  </div>

                  <div style={styles.formChamp}>
                    <label style={styles.label}>Utilisateur SMTP (email)</label>
                    <input style={styles.input} type="email" value={mail.smtp_user || ''} onChange={e => setMail({ ...mail, smtp_user: e.target.value })} placeholder="thanh-phuoc.van@admin.vs.ch" />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Mot de passe d'application (MFA)</label>
                    <input
                      style={styles.input}
                      type="password"
                      value={mail.smtp_app_password || ''}
                      onChange={e => setMail({ ...mail, smtp_app_password: e.target.value })}
                      placeholder={mail.has_app_password ? 'Laisser vide pour conserver le mot de passe existant' : 'Coller le mot de passe d application'}
                    />
                  </div>

                  <div style={styles.formChamp}>
                    <label style={styles.label}>Nom expéditeur</label>
                    <input style={styles.input} type="text" value={mail.smtp_from_name || ''} onChange={e => setMail({ ...mail, smtp_from_name: e.target.value })} placeholder="Oasis" />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Email expéditeur</label>
                    <input style={styles.input} type="email" value={mail.smtp_from_email || ''} onChange={e => setMail({ ...mail, smtp_from_email: e.target.value })} placeholder="thanh-phuoc.van@admin.vs.ch" />
                  </div>

                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={{ ...styles.label, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span>Connexion sécurisée (TLS implicite / port 465)</span>
                      <label style={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={mail.smtp_secure === true}
                          onChange={e => setMail({ ...mail, smtp_secure: e.target.checked, smtp_port: e.target.checked ? 465 : 587 })}
                        />
                        <span style={{ ...styles.toggleSlider, background: mail.smtp_secure ? '#34a853' : '#ccc' }}>
                          <span style={{ ...styles.toggleThumb, left: mail.smtp_secure ? '22px' : '2px' }} />
                        </span>
                      </label>
                    </label>
                  </div>
                </div>

                <LoadingButton type="submit" loading={savingMail} style={{ ...styles.btnSauver, background: '#7c3aed', marginTop: '10px' }}>Sauvegarder la configuration</LoadingButton>
              </form>

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 16, color: '#111827' }}>Tester l'envoi</h4>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: 10, alignItems: 'end' }}>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Email destinataire test</label>
                    <input style={styles.input} type="email" value={mailTestTo} onChange={e => setMailTestTo(e.target.value)} placeholder="votre.email@exemple.ch" />
                  </div>
                  <button type="button" style={{ ...styles.btnSauver, background: '#0ea5e9', opacity: testMailLoading ? 0.7 : 1 }} onClick={handleTesterMail} disabled={testMailLoading}>
                    {testMailLoading ? 'Envoi...' : 'Envoyer un test'}
                  </button>
                </div>
                {msgMailTest && (
                  <div style={{ marginTop: 12, fontWeight: 600, color: msgMailTest.startsWith('Email de test envoyé') ? '#166534' : '#b91c1c', whiteSpace: 'pre-line' }}>
                    {msgMailTest}
                  </div>
                )}
              </div>
            </div>
          )}

          {onglet === 'acces' && isAdmin && (
            <div style={cardStyle}>
              <h3 style={{ ...styles.cardTitre, fontSize: isMobile ? 17 : 20 }}>Gestion des accès</h3>

              {barSousOnglets(
                isMobile
                  ? [['employes_admin', 'Employés'], ['professeurs', 'Profs'], ['responsables', 'Resp.'], ['admins', 'Admins']]
                  : [['employes_admin', 'Employés admin.'], ['professeurs', 'Professeurs'], ['responsables', 'Responsables'], ['admins', 'Administrateurs']],
                accesRoleOnglet,
                (key) => { setAccesRoleOnglet(key); setModuleOuvert(null); }
              )}

              {msgAccesProfs === 'success' && <div style={styles.msgSuccess}>Accès mis à jour.</div>}
              {msgAccesProfs === 'error' && <div style={styles.msgError}>Erreur</div>}
              <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 14px' }}>
                {accesRoleOnglet === 'professeurs'    && 'Ces paramètres s\'appliquent à tous les professeurs.'}
                {accesRoleOnglet === 'employes_admin' && 'Ces paramètres s\'appliquent aux employés administratifs.'}
                {accesRoleOnglet === 'responsables'   && 'Ces paramètres s\'appliquent aux responsables.'}
                {accesRoleOnglet === 'admins'         && 'Les administrateurs ont accès à tous les modules.'}
              </p>
              {MODULES_ACCES_PROFS.map(m => {
                const ca = accesParRole[accesRoleOnglet] || {};
                const hasOnglets = m.onglets.length > 0;
                const allOn = hasOnglets ? m.onglets.every(o => ca[o.key]) : !!ca[m.key];
                const someOn = hasOnglets ? m.onglets.some(o => ca[o.key]) : !!ca[m.key];
                const bgMain = allOn ? '#34a853' : someOn ? '#f59e0b' : '#ccc';
                return (
                  <div key={m.key} style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', background: '#f8fafc', cursor: hasOnglets ? 'pointer' : 'default', gap: 10 }}
                      onClick={() => hasOnglets && setModuleOuvert(moduleOuvert === m.key ? null : m.key)}>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{m.label}</span>
                      <div style={styles.toggle} onClick={e => { e.stopPropagation(); toggleModule(m); }}>
                        <span style={{ ...styles.toggleSlider, background: bgMain }}>
                          <span style={{ ...styles.toggleThumb, left: someOn ? '22px' : '2px' }} />
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6, visibility: hasOnglets ? 'visible' : 'hidden' }}>{moduleOuvert === m.key ? '▲' : '▼'}</span>
                    </div>
                    {hasOnglets && moduleOuvert === m.key && (
                      <div style={{ background: 'white', padding: '4px 14px 10px' }}>
                        {m.onglets.map((o, i) => (
                          <div key={o.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < m.onglets.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                            <span style={{ fontSize: 13, color: '#334155', minWidth: 0, flex: 1, paddingRight: 8, lineHeight: 1.35 }}>{o.label}</span>
                            <div style={styles.toggle} onClick={e => { e.stopPropagation(); toggleOnglet(m, o.key); }}>
                              <span style={{ ...styles.toggleSlider, background: ca[o.key] ? '#34a853' : '#ccc' }}>
                                <span style={{ ...styles.toggleThumb, left: ca[o.key] ? '22px' : '2px' }} />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <LoadingButton style={{ ...styles.btnSauver, background: '#ff9800', marginTop: '20px' }} loading={savingAcces} onClick={async () => {
                setSavingAcces(true);
                try {
                  await apiClient.put('/parametres/acces-profs', { acces_profs: accesParRole }, { headers });
                  setMsgAccesProfs('success');
                  setTimeout(() => setMsgAccesProfs(''), 3000);
                } catch { setMsgAccesProfs('error'); }
                finally { setSavingAcces(false); }
              }}>
                Sauvegarder les accès
              </LoadingButton>
            </div>
          )}
          {onglet === 'danger' && isAdmin && (
            <div style={{...cardStyle,border:'2px solid #fecaca'}}>
              <h3 style={{...styles.cardTitre,color:'#dc2626', fontSize: isMobile ? 17 : 20}}>Réinitialisation</h3>

              <div style={{marginTop:4,paddingTop:0}}>
                <h4 style={{margin:'0 0 10px',color:'#c2410c',fontSize:18}}>Réinitialisation pour la rentrée scolaire</h4>
                <p style={{color:'#7c2d12',fontSize:14,marginBottom:16,lineHeight:1.6}}>
                  Cette option supprime uniquement les données de l'année à réinitialiser :
                </p>
                <ul style={{color:'#7c2d12',fontSize:13,lineHeight:1.7,margin:'0 0 16px 18px'}}>
                  <li>Élèves et toutes leurs données liées (notes, documents, sanctions, enclassement…)</li>
                  <li>Notes, évaluations et bulletins</li>
                  <li>Affectations professeurs / classes et composition des pools</li>
                  <li>Plannings et horaires de classes (les disponibilités professeurs sont conservées)</li>
                  <li>Présences et absences</li>
                  <li>Comptabilité, facturation et commandes</li>
                </ul>
                <p style={{color:'#9a3412',fontSize:12,marginBottom:16,lineHeight:1.5}}>
                  Conservés : professeurs, classes, pools (vides), créneaux, branches/matières, disponibilités, paramètres école.
                  Les données de l’année sont d’abord transférées dans le menu Archive (lecture seule, par année). Les exports Excel et PDF se font ensuite depuis ce menu.
                </p>

                {resetRentreeMsg && (
                  <div style={{padding:'12px 16px',borderRadius:8,marginBottom:14,fontWeight:600,fontSize:14,background:'#ede9fe',color:'#4c1d95'}}>
                    {resetRentreeMsg}
                  </div>
                )}

                {resetRentreeEtape === 0 && (
                  <button onClick={() => setResetRentreeEtape(1)}
                    style={{padding:'12px 24px',background:'#ea580c',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:14,width: isMobile ? '100%' : undefined}}>
                    Lancer la réinitialisation pour la rentrée scolaire
                  </button>
                )}

                {resetRentreeEtape === 1 && (
                  <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,padding:20}}>
                    <p style={{fontWeight:700,color:'#c2410c',marginBottom:10}}>⚠️ Première confirmation — Transférer vers Archives</p>
                    <p style={{fontSize:13,color:'#7c2d12',marginBottom:14,lineHeight:1.55}}>
                      Vous devez d’abord transférer toutes les données de l’année (élèves, notes, affectations, plannings, présences, comptabilité et documents) vers le menu Archive. Elles y resteront en lecture seule, classées par année. La confirmation n’est possible qu’après ce transfert.
                    </p>
                    <button
                      type="button"
                      onClick={handleArchiverRentree}
                      disabled={archiveLoading}
                      style={{padding:'10px 20px',background:'#0f766e',color:'white',border:'none',borderRadius:8,cursor: archiveLoading ? 'wait' : 'pointer',fontWeight:700,marginBottom:14,width: isMobile ? '100%' : undefined,opacity: archiveLoading ? 0.75 : 1}}
                    >
                      {archiveLoading ? '⏳ Transfert en cours…' : (archiveId ? 'Mettre à jour le transfert' : 'Transférer l’année vers Archives')}
                    </button>
                    {archiveId && archiveNom && (
                      <p style={{fontSize:12,color:'#166534',fontWeight:700,marginBottom:14}}>
                        Année transférée : {archiveNom} — consultable dans le menu Archive (lecture seule).
                        {' '}
                        <button type="button" onClick={() => navigate('/archives')} style={{background:'none',border:'none',color:'#4c1d95',fontWeight:800,cursor:'pointer',padding:0,textDecoration:'underline'}}>
                          Ouvrir Archives
                        </button>
                      </p>
                    )}
                    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                      <button onClick={() => { setResetRentreeEtape(0); setArchiveId(null); setArchiveNom(''); }} style={{padding:'10px 20px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontWeight:600,flex: isMobile ? '1 1 120px' : undefined}}>Annuler</button>
                      <button
                        onClick={() => archiveId && setResetRentreeEtape(2)}
                        disabled={!archiveId || archiveLoading}
                        style={{padding:'10px 20px',background: archiveId ? '#ea580c' : '#fdba74',color:'white',border:'none',borderRadius:8,cursor: archiveId ? 'pointer' : 'not-allowed',fontWeight:700,flex: isMobile ? '1 1 140px' : undefined}}
                      >
                        Oui, continuer
                      </button>
                    </div>
                  </div>
                )}

                {resetRentreeEtape === 2 && (
                  <div style={{background:'#fff7ed',border:'2px solid #c2410c',borderRadius:10,padding:20}}>
                    <p style={{fontWeight:800,color:'#c2410c',marginBottom:16,fontSize:15}}>🚨 Dernière confirmation — Réinitialisation de rentrée ?</p>
                    <p style={{fontSize:13,color:'#7c2d12',marginBottom:16}}>Les données de rentrée seront supprimées immédiatement.</p>
                    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                      <button onClick={() => setResetRentreeEtape(0)} style={{padding:'10px 20px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontWeight:600,flex: isMobile ? '1 1 120px' : undefined}}>Annuler</button>
                      <button onClick={handleResetRentree} style={{padding:'10px 20px',background:'#9a3412',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:800,flex: isMobile ? '1 1 100%' : undefined}}>⚠️ SUPPRIMER LES DONNÉES DE RENTRÉE</button>
                    </div>
                  </div>
                )}

                {resetRentreeEtape === 3 && (
                  <div style={{padding:20,textAlign:'center',color:'#c2410c',fontWeight:700}}>⏳ Réinitialisation de rentrée en cours...</div>
                )}

                {resetRentreeEtape === 4 && (
                  <button onClick={() => { setResetRentreeEtape(0); setResetRentreeMsg(''); }} style={{padding:'10px 20px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontWeight:600,marginTop:10}}>
                    Réinitialiser
                  </button>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}


const styles = {
  page: { minHeight: '100%', background: '#f8fafc', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  main: { padding: '32px 36px', minHeight: '100%', boxSizing: 'border-box' },
  topBar: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' },
  titre: { fontSize: 22, fontWeight: 800, color: '#0f172a', flex: 1, margin: 0 },
  topBarRight: { display: 'flex', alignItems: 'center', gap: 10 },
  btnSauverHeader: { padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' },
  content: {},
  card: { background: 'white', borderRadius: 14, padding: '30px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  cardTitre: { fontSize: '20px', fontWeight: '700', marginBottom: '20px' },
  roleTag: { display: 'inline-block', background: '#e3f2fd', color: '#1a73e8', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' },
  msgSuccess: { background: '#e8f5e9', color: '#2e7d32', padding: '10px 16px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600' },
  msgError: { background: '#ffebee', color: '#c62828', padding: '10px 16px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600' },
  msgInfo: { padding: '10px 16px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' },
  formChamp: { display: 'flex', flexDirection: 'column', marginBottom: '15px' },
  label: { fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#555' },
  input: { padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', background: 'white', fontFamily: 'inherit' },
  btnSauver: { padding: '8px 16px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' },
  vide: { color: '#888', textAlign: 'center', padding: '30px' },
  profCard: { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer', border: '2px solid transparent' },
  profAvatar: { width: '44px', height: '44px', borderRadius: '50%', background: '#ff9800', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '15px' },
  profNom: { fontWeight: '700', fontSize: '15px' },
  profEmail: { fontSize: '13px', color: '#888' },
  profPermsCount: { fontSize: '12px', color: '#ff9800', fontWeight: '600', background: '#fff3e0', padding: '4px 10px', borderRadius: '12px' },
  chevron: { fontSize: '20px', color: '#ccc' },
  profHeader: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #f0f0f0' },
  btnBack: { padding: '8px 14px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' },
  permsGrid: { display: 'flex', flexDirection: 'column', gap: '12px' },
  permRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#f8f9fa', borderRadius: '10px' },
  permLabel: { fontSize: '14px', fontWeight: '600' },
  toggle: { position: 'relative', display: 'inline-block', cursor: 'pointer' },
  toggleSlider: { display: 'block', width: '46px', height: '26px', borderRadius: '13px', transition: 'background 0.3s', position: 'relative' },
  toggleThumb: { position: 'absolute', top: '3px', width: '20px', height: '20px', background: 'white', borderRadius: '50%', transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' },
};