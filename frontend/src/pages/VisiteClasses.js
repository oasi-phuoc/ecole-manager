/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import CustomSelect from '../components/CustomSelect';
import { stickyPageChrome } from '../styles/pageShell';
import { injectForcedPrintCss, openPrintPopup } from '../utils/print';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';
const getHeaders = () => {
  const u = JSON.parse(localStorage.getItem('user') || '{}');
  return { Authorization: `Bearer ${u.token}` };
};

const NOTES = ['A', 'CA', 'NA', 'NO'];

const CRITERES = {
  preparation: [
    'Utilisation du matériel pédagogique etc.',
    'Mise en route, prise de contact',
    'Énonciation des objectifs',
    'Tenue du classeur de classe',
  ],
  savoirFaire: [
    'Variété et pertinence du/des document(s) de cours',
    'Respect des PSE',
    'Consignes',
    'Cohérence des activités / Contextualisation',
    'Corrections et retours sur les apprentissages',
    'Encouragements',
  ],
  savoirEtre: [
    "Favoriser l'interaction entre les apprenants",
    'Interagir avec les apprenants et sollicitation',
    "Gestion de l'espace, déplacements dans la salle",
    "Conception de l'équilibre des rôles du formateur",
    'Posture, présence, élocution',
    'Climat de classe, esprit de groupe',
    'Gestion du temps',
  ],
};

const ORG_ITEMS = [
  { key: 'accueil',   label: 'Accueil des responsables / salle' },
  { key: 'planCours', label: 'Plan de cours, programme proposé' },
];

const fmtDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('fr-CH'); } catch { return d; }
};

function EvalTable({ title, prefix, criteres, notes, setNotes, missingKeys, readOnly }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <table style={s.evalTable}>
        <thead>
          <tr>
            <th style={s.thTitle}>{title}</th>
            {NOTES.map((n) => <th key={n} style={s.thOpt}>{n}</th>)}
          </tr>
        </thead>
        <tbody>
          {criteres.map((c, i) => {
            const key = `${prefix}_${i}`;
            const manque = !readOnly && missingKeys?.has(key);
            return (
              <tr key={key} style={{ borderBottom: '1px solid #f1f5f9', background: manque ? '#fee2e2' : 'transparent' }}>
                <td style={s.tdCrit}>{c}</td>
                {NOTES.map((n) => (
                  <td key={`${key}-${n}`} style={s.tdOpt}>
                    {readOnly ? (
                      <span style={{ ...s.scoreBtn, ...(notes[key] === n ? s.scoreBtnActif : {}), cursor: 'default', display: 'inline-block' }} />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setNotes((p) => ({ ...p, [key]: notes[key] === n ? '' : n }))}
                        style={{ ...s.scoreBtn, ...(notes[key] === n ? s.scoreBtnActif : {}) }}
                      />
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function VisiteClasses() {
  const [visites, setVisites]   = useState([]);
  const [profs, setProfs]       = useState([]);
  const [classes, setClasses]   = useState([]);
  const [branches, setBranches] = useState([]);
  const [niveauxDB, setNiveauxDB] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [search, setSearch]           = useState('');
  const [filtreNiveau, setFiltreNiveau] = useState('');
  const [showNiveaux, setShowNiveaux] = useState(false);
  const [detailId, setDetailId]       = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [formateurId, setFormateurId] = useState('');
  const [classeId, setClasseId]       = useState('');
  const [brancheId, setBrancheId]     = useState('');
  const [dateVisite, setDateVisite]   = useState('');
  const [duree, setDuree]             = useState(1);
  const [notes, setNotes]             = useState({});
  const [orgNotes, setOrgNotes]       = useState({});
  const [observation, setObservation] = useState('');
  const [feedback, setFeedback]       = useState('');
  const [valide, setValide]           = useState(false);
  const [msg, setMsg]                 = useState('');
  const [missingKeys, setMissingKeys] = useState(null);

  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackVisite, setFeedbackVisite]     = useState(null);
  const [feedbackData, setFeedbackData]         = useState({});
  const [validToast, setValidToast]             = useState('');

  const charger = async () => {
    setLoading(true);
    try {
      const [vRes, pRes, cRes, bRes, nRes] = await Promise.all([
        axios.get(API + '/visites-classes', { headers: getHeaders() }),
        axios.get(API + '/profs',           { headers: getHeaders() }),
        axios.get(API + '/classes',         { headers: getHeaders() }),
        axios.get(API + '/branches',        { headers: getHeaders() }),
        axios.get(API + '/donnees/niveaux', { headers: getHeaders() }),
      ]);
      setVisites(vRes.data || []);
      setProfs(pRes.data || []);
      setClasses(cRes.data || []);
      setBranches(bRes.data || []);
      setNiveauxDB(nRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { charger(); }, []);

  const niveaux = useMemo(() => niveauxDB.map((n) => n.nom), [niveauxDB]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visites.filter((v) => {
      if (filtreNiveau && v.classe_niveau !== filtreNiveau) return false;
      if (!q) return true;
      const dateLocale = fmtDate(v.date_visite).toLowerCase();
      const dateISO = (v.date_visite || '').substring(0, 10);
      return (
        (v.formateur_nom    || '').toLowerCase().includes(q) ||
        (v.formateur_prenom || '').toLowerCase().includes(q) ||
        (v.classe_nom       || '').toLowerCase().includes(q) ||
        dateLocale.includes(q) ||
        dateISO.includes(q)
      );
    });
  }, [visites, search, filtreNiveau]);

  const resetForm = () => {
    setEditId(null); setFormateurId(''); setClasseId(''); setBrancheId('');
    setDateVisite(''); setDuree(1); setNotes({}); setOrgNotes({});
    setObservation(''); setFeedback(''); setValide(false); setMsg(''); setMissingKeys(null);
  };

  const ouvrirAjout = () => { resetForm(); setShowForm(true); };

  const ouvrirEdition = (v) => {
    setEditId(v.id);
    setFormateurId(v.formateur_id ? String(v.formateur_id) : '');
    setClasseId(v.classe_id ? String(v.classe_id) : '');
    setBrancheId(v.branche_id ? String(v.branche_id) : '');
    setDateVisite(v.date_visite ? v.date_visite.substring(0, 10) : '');
    setDuree(v.duree || 1);
    setNotes(v.scores || {});
    setOrgNotes(v.organisation || {});
    setObservation(v.observation || '');
    setFeedback(v.feedback || '');
    setValide(v.valide || false);
    setMsg('');
    setMissingKeys(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const erreurs = [];
    if (!formateurId) erreurs.push('Formateur / Formatrice');
    if (!classeId)    erreurs.push('Classe');
    if (!brancheId)   erreurs.push('Branche');
    if (!dateVisite)  erreurs.push('Date');
    if (erreurs.length > 0) {
      setMsg('❌ Champs obligatoires manquants : ' + erreurs.join(', '));
      return;
    }

    // Vérifier que tous les critères ont une valeur
    const mk = new Set();
    ORG_ITEMS.forEach(item => { if (!orgNotes[item.key]) mk.add(item.key); });
    CRITERES.preparation.forEach((_, i) => { if (!notes[`prep_${i}`]) mk.add(`prep_${i}`); });
    CRITERES.savoirFaire.forEach((_, i) => { if (!notes[`sf_${i}`])   mk.add(`sf_${i}`); });
    CRITERES.savoirEtre.forEach((_, i)  => { if (!notes[`se_${i}`])   mk.add(`se_${i}`); });
    if (mk.size > 0) {
      setMissingKeys(mk);
      setMsg('Veuillez valider tous les champs.');
      return;
    }
    setMissingKeys(null);
    setMsg('');
    try {
      const payload = {
        formateur_id: formateurId || null,
        classe_id:    classeId    || null,
        branche_id:   brancheId   || null,
        date_visite:  dateVisite  || null,
        duree,
        scores:       notes,
        organisation: orgNotes,
        observation,
        feedback,
        valide,
      };
      if (editId) {
        await axios.put(API + '/visites-classes/' + editId, payload, { headers: getHeaders() });
      } else {
        await axios.post(API + '/visites-classes', payload, { headers: getHeaders() });
      }
      setShowForm(false);
      charger();
    } catch (err) {
      setMsg('❌ Erreur : ' + (err.response?.data?.message || err.message));
    }
  };

  const anneeScolaire = () => {
    const n = new Date();
    return n.getMonth() >= 8 ? `${n.getFullYear()}-${n.getFullYear()+1}` : `${n.getFullYear()-1}-${n.getFullYear()}`;
  };

  const imprimerVisite = (v) => {
    const publicBase = `${window.location.origin}${process.env.PUBLIC_URL || ''}`;
    const logoUrl = `${publicBase}/logo-etat-du-valais.png`;
    const logoPiedUrl = `${publicBase}/logo-pied-page.png`;
    const scores = v.scores || {};
    const orgScores = v.organisation || {};

    const scoreDot = (active) => active
      ? `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#c4b5fd;border:1.5px solid #7c3aed;box-shadow:inset 0 0 0 2px white;"></span>`
      : `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;border:1.5px solid #e2e8f0;background:white;"></span>`;

    const evalSection = (title, prefix, criteres) => `
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
        <thead><tr>
          <th style="text-align:left;padding:5px 8px;font-weight:700;color:#6366f1;background:#e0e7ff;font-size:9pt;text-transform:uppercase;letter-spacing:0.05em;">${title}</th>
          ${NOTES.map(n => `<th style="text-align:center;padding:5px 6px;font-size:9pt;color:#64748b;white-space:nowrap;width:1;">${n}</th>`).join('')}
        </tr></thead>
        <tbody>${criteres.map((c, i) => {
          const key = `${prefix}_${i}`;
          return `<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:6px 8px;font-size:10pt;color:#334155;">${c}</td>
            ${NOTES.map(n => `<td style="text-align:center;padding:5px 6px;">${scoreDot(scores[key] === n)}</td>`).join('')}
          </tr>`;
        }).join('')}</tbody>
      </table>`;

    const headerHtml = `
      <div class="page-header">
        <div class="header-left">
          <img class="header-logo" src="${logoUrl}" onerror="this.style.display='none'" />
          <div class="header-admin">
            <div>DÉPARTEMENT DE LA SANTÉ, DES AFFAIRES SOCIALES ET DE LA CULTURE</div>
            <div>Service de l'action sociale</div>
            <div>Office de l'asile</div>
            <div>Centre de formation "Le Botza"</div>
          </div>
        </div>
        <div class="header-right">
          <div class="header-scai">SCAI</div>
          <div class="header-year">${anneeScolaire()}</div>
          <div class="header-sub">CLASSES D'ACCUEIL</div>
        </div>
      </div>`;

    const footerHtml = `
      <div class="page-footer">
        <img class="footer-logo" src="${logoPiedUrl}" onerror="this.style.display='none'" />
        <div class="footer-text"><div>Zone Industrielle 4, 1963 Vétroz</div><div>Tél. 027 606 18 60</div></div>
      </div>`;

    const orgTable = `
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
        <thead><tr>
          <th style="text-align:left;padding:5px 8px;font-weight:700;color:#6366f1;background:#e0e7ff;font-size:9pt;text-transform:uppercase;letter-spacing:0.05em;">Organisation</th>
          <th style="text-align:center;padding:5px 6px;font-size:9pt;color:#64748b;white-space:nowrap;width:1;">Oui</th>
          <th style="text-align:center;padding:5px 6px;font-size:9pt;color:#64748b;white-space:nowrap;width:1;">Non</th>
        </tr></thead>
        <tbody>${ORG_ITEMS.map(item => `<tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:6px 8px;font-size:10pt;color:#334155;">${item.label}</td>
          <td style="text-align:center;padding:5px 6px;">${scoreDot(orgScores[item.key]==='oui')}</td>
          <td style="text-align:center;padding:5px 6px;">${scoreDot(orgScores[item.key]==='non')}</td>
        </tr>`).join('')}</tbody>
      </table>`;

    const page1 = `
      <div class="page">
        ${headerHtml}
        <div class="page-title">Formulaire de visite de classe</div>
        <div style="text-align:right;font-size:11pt;color:#1e293b;margin-bottom:20px;">Vétroz, le ${fmtDate(v.date_visite)}</div>
        <div style="display:flex;gap:24px;margin-bottom:16px;font-size:11pt;flex-wrap:wrap;">
          <div><strong style="color:#64748b;">Formateur/trice :</strong> <strong>${v.formateur_prenom || ''} ${v.formateur_nom || ''}</strong></div>
          <div><strong style="color:#64748b;">Classe :</strong> ${v.classe_nom || '—'}</div>
          ${v.branche_nom ? `<div><strong style="color:#64748b;">Branche :</strong> ${v.branche_nom}</div>` : ''}
          <div><strong style="color:#64748b;">Durée :</strong> ${v.duree || 1} période${(v.duree||1)>1?'s':''}</div>
        </div>
        ${orgTable}
        ${evalSection('Préparation', 'prep', CRITERES.preparation)}
        ${evalSection('Savoir-faire et interaction', 'sf', CRITERES.savoirFaire)}
        ${evalSection('Savoir-être et gestion de classe', 'se', CRITERES.savoirEtre)}
        <div style="display:flex;gap:12px;padding:8px 12px;background:#f8fafc;border-radius:6px;margin-bottom:12px;font-size:10pt;color:#475569;flex-wrap:wrap;">
          <strong style="color:#4c1d95;">Légende :</strong>
          <span><strong>A</strong> = Acquis</span><span><strong>CA</strong> = En cours d'acquisition</span><span><strong>NA</strong> = Non acquis</span><span><strong>NO</strong> = Non observé</span>
        </div>
        ${footerHtml}
      </div>`;

    const page2 = `
      <div class="page" style="page-break-before:always">
        ${headerHtml}
        ${v.observation ? `
          <div style="margin-bottom:20px;">
            <div style="font-size:9pt;font-weight:700;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Observation</div>
            <div style="font-size:10pt;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;color:#334155;">${v.observation}</div>
          </div>
        ` : `<div style="color:#94a3b8;font-style:italic;margin-bottom:20px;">Aucune observation</div>`}
        ${v.valide ? `<div style="margin-top:16px;text-align:right;color:#16a34a;font-weight:700;font-size:11pt;">✓ Visite validée</div>` : ''}
        ${footerHtml}
      </div>`;

    const css = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif; background: white; color: #1e293b; }
      @page { size: A4 portrait; margin: 10mm; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: auto; }
      .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px solid #e2e8f0; }
      .header-left { display: flex; align-items: flex-start; gap: 10px; }
      .header-logo { width: 38px; height: auto; object-fit: contain; }
      .header-admin { font-size: 8pt; color: #334155; line-height: 1.5; }
      .header-right { text-align: right; }
      .header-scai { font-size: 17pt; font-weight: 800; color: #1e293b; line-height: 1; }
      .header-year { font-size: 10pt; font-weight: 700; color: #374151; margin-top: 2px; }
      .header-sub { font-size: 8pt; font-weight: 700; color: #475569; margin-top: 2px; }
      .page-title { font-size: 17pt; font-weight: 700; color: #0f172a; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin-top: 24px; margin-bottom: 8px; }
      .page-footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; gap: 12px; padding-top: 8px; }
      .footer-logo { height: 26px; width: auto; object-fit: contain; }
      .footer-text { font-size: 8pt; color: #64748b; line-height: 1.35; }
    `;

    const filename = `Visite_${v.formateur_nom || ''}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${filename}</title><style>${css}</style></head><body>${page1}${page2}</body></html>`;
    const finalHtml = injectForcedPrintCss(html, 'A4 portrait', '10mm');
    openPrintPopup(finalHtml, { title: filename, width: 1200, height: 820 });
  };

  const handleDelete = async (v) => {
    if (!window.confirm('Supprimer cette visite ?')) return;
    try {
      await axios.delete(API + '/visites-classes/' + v.id, { headers: getHeaders() });
      charger();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.message || err.message)); }
  };

  const handleValider = async (v) => {
    try {
      await axios.put(API + '/visites-classes/' + v.id, { ...v, valide: !v.valide }, { headers: getHeaders() });
      charger();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.message || err.message)); }
  };

  const ouvrirFeedback = (v) => {
    let fd = {};
    try { fd = JSON.parse(v.feedback || '{}'); } catch { fd = {}; }
    if (typeof fd !== 'object' || Array.isArray(fd)) fd = {};
    setFeedbackData(fd);
    setFeedbackVisite(v);
    setShowFeedbackForm(true);
  };

  const sauverFeedback = async () => {
    try {
      await axios.put(API + '/visites-classes/' + feedbackVisite.id,
        { ...feedbackVisite, feedback: JSON.stringify(feedbackData) },
        { headers: getHeaders() });
      setShowFeedbackForm(false);
      charger();
    } catch (err) { alert('Erreur : ' + (err.response?.data?.message || err.message)); }
  };

  const detailVisite = visites.find((v) => v.id === detailId);
  const detailProf = detailVisite ? profs.find((p) => String(p.id) === String(detailVisite.formateur_id)) : null;
  const formateurTitre = detailProf?.sexe === 'F' ? 'Formatrice' : 'Formateur';

  return (
    <div style={s.page}>
      <div style={{ ...stickyPageChrome(), marginBottom: 0 }}>
        <div style={s.header}>
          <h2 style={s.titre}>Visite de classes</h2>
          {validToast && <div style={{ padding: '8px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{validToast}</div>}
          <button style={s.btnAdd} onClick={ouvrirAjout}>+ Ajouter</button>
        </div>
        <div style={s.filters}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un professeur, une classe..."
            style={s.searchInput}
          />
          {!showNiveaux ? (
            <button
              type="button"
              onClick={() => setShowNiveaux(true)}
              style={s.btnTrier}
            >
              Trier
            </button>
          ) : (
            <div style={s.triGroup}>
              <button
                type="button"
                onClick={() => { setFiltreNiveau(''); setShowNiveaux(false); }}
                style={{ ...s.triBtn, ...(!filtreNiveau ? s.triBtnActif : {}) }}
              >
                Trier
              </button>
              {niveaux.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFiltreNiveau(n)}
                  style={{ ...s.triBtn, ...(filtreNiveau === n ? s.triBtnActif : {}) }}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table liste */}
      {loading ? (
        <div style={s.empty}>Chargement...</div>
      ) : (
        <div style={s.tableListWrap}>
          <table style={s.tableList}>
            <thead>
              <tr>
                <th style={{ ...s.thIcon }}></th>
                <th style={{ ...s.thL, width: 110, minWidth: 110, maxWidth: 110 }}>Date</th>
                <th style={{ ...s.thL, width: 170, minWidth: 170 }}>Nom</th>
                <th style={{ ...s.thL, width: 150, minWidth: 150 }}>Prénom</th>
                <th style={s.thL}>Niveau</th>
                <th style={{ ...s.thL, width: 110, minWidth: 110, maxWidth: 110 }}>Modifié le</th>
                <th style={{ ...s.thIcon, width: 48 }}></th>
                <th style={s.thActions}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '20px 14px', color: '#94a3b8', textAlign: 'center', background: 'white' }}>
                    Aucune visite
                  </td>
                </tr>
              )}
              {rows.map((v, i) => {
                const hasFeedback = (() => { try { const f = JSON.parse(v.feedback || '{}'); return Object.values(f).some(val => String(val||'').trim()); } catch { return !!(v.feedback && String(v.feedback).trim()); } })();
                return (
                  <tr key={v.id} style={{ background: i % 2 === 0 ? 'white' : '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={s.tdIcon}>
                      <button
                        onClick={() => setDetailId(detailId === v.id ? null : v.id)}
                        title="Détail"
                        style={s.eyeBtn}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 13a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/>
                        </svg>
                      </button>
                    </td>
                    <td style={{ ...s.tdL, width: 110, minWidth: 110, maxWidth: 110, whiteSpace: 'nowrap' }}>{fmtDate(v.date_visite)}</td>
                    <td style={{ ...s.tdL, width: 170, minWidth: 170, whiteSpace: 'nowrap', fontWeight: 600 }}>{v.formateur_nom || '—'}</td>
                    <td style={{ ...s.tdL, width: 150, minWidth: 150, whiteSpace: 'nowrap' }}>{v.formateur_prenom || '—'}</td>
                    <td style={s.tdL}>
                      {v.classe_niveau ? (
                        <span style={s.badge}>{v.classe_niveau}</span>
                      ) : '—'}
                    </td>
                    <td style={{ ...s.tdL, width: 110, minWidth: 110, maxWidth: 110, whiteSpace: 'nowrap', fontSize: 12 }}>
                      {v.updated_at ? fmtDate(v.updated_at) : '—'}
                    </td>
                    <td style={{ ...s.tdIcon, width: 48 }}>
                      <button
                        title={hasFeedback ? 'Feedback renseigné' : 'Aucun feedback'}
                        onClick={() => ouvrirFeedback(v)}
                        style={{ ...s.obsBtn, background: hasFeedback ? '#ede9fe' : '#f1f5f9', color: hasFeedback ? '#7c3aed' : '#94a3b8' }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h2.5L9 19.5 11.5 17H20a2 2 0 002-2V5a2 2 0 00-2-2H4z M7 8h10v2H7z M7 12h7v2H7z"/>
                        </svg>
                      </button>
                    </td>
                    <td style={s.tdActions}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button onClick={() => ouvrirEdition(v)} style={s.editBtn} title="Modifier">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(v)} style={s.delBtn} title="Supprimer">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (!v.valide && !hasFeedback) {
                              setValidToast('Un feedback est requis avant de valider.');
                              setTimeout(() => setValidToast(''), 4000);
                              return;
                            }
                            handleValider(v);
                          }}
                          title={v.valide ? 'Validé — cliquer pour annuler' : hasFeedback ? 'Valider' : 'Feedback requis avant validation'}
                          style={{ ...s.validBtn, background: v.valide ? '#dcfce7' : '#f1f5f9', color: v.valide ? '#16a34a' : '#94a3b8' }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24">
                            <path fillRule="evenodd" fill="currentColor" d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
                            <path fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M7 12l3 3 7-7"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal détail lecture seule */}
      {detailVisite && (
        <div className="modal-overlay" style={s.overlay} onClick={() => setDetailId(null)}>
          <div style={{ background: 'white', width: 'min(780px, 96vw)', maxHeight: '90vh', overflow: 'auto', borderRadius: 14, padding: 18 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 12 }}>
              <button style={s.btnCancel} onClick={() => setDetailId(null)}>Fermer</button>
              <button style={s.btnSave} onClick={() => imprimerVisite(detailVisite)}>Imprimer</button>
            </div>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '28px 32px', color: '#1e293b', fontFamily: "'Century Gothic', CenturyGothic, 'Trebuchet MS', sans-serif" }}>
              {/* En-tête */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <img src={`${window.location.origin}${process.env.PUBLIC_URL || ''}/logo-etat-du-valais.png`} style={{ width: 38 }} alt="" onError={e => e.target.style.display='none'} />
                  <div style={{ fontSize: 7, lineHeight: 1.7, color: '#475569' }}>
                    <div>Département de la santé, des affaires sociales et de la culture</div>
                    <div>Service de l'action sociale</div>
                    <div>Office de l'asile</div>
                    <div>Centre de formation "Le Botza"</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: '#1e293b' }}>SCAI</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{anneeScolaire()}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#475569' }}>CLASSES D'ACCUEIL</div>
                </div>
              </div>
              {/* Titre */}
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, letterSpacing: 1, textTransform: 'uppercase', marginTop: 24, marginBottom: 8, color: '#0f172a' }}>
                Formulaire de visite de classe
              </div>
              {/* Date */}
              <div style={{ textAlign: 'right', fontSize: 12, marginBottom: 20 }}>Vétroz, le {fmtDate(detailVisite.date_visite)}</div>
              {/* Infos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16, fontSize: 13 }}>
                <div><div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{formateurTitre}</div>{detailVisite.formateur_prenom} {detailVisite.formateur_nom}</div>
                <div><div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>Classe</div>{detailVisite.classe_nom || '—'}</div>
                <div><div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>Branche</div>{detailVisite.branche_nom || '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: 24, marginBottom: 20, fontSize: 13 }}>
                <div><span style={{ fontWeight: 700, color: '#0f172a' }}>Durée :</span> {detailVisite.duree || 1} période{(detailVisite.duree||1)>1?'s':''}</div>
                {detailVisite.classe_niveau && <div><span style={{ fontWeight: 700, color: '#0f172a' }}>Niveau :</span> {detailVisite.classe_niveau}</div>}
              </div>
              {/* Organisation */}
              <div style={{ marginBottom: 16 }}>
                <table style={s.evalTable}>
                  <thead><tr>
                    <th style={s.thTitle}>Organisation</th>
                    <th style={s.thOpt}>Oui</th>
                    <th style={s.thOpt}>Non</th>
                  </tr></thead>
                  <tbody>{ORG_ITEMS.map(item => {
                    const org = detailVisite.org_scores || {};
                    return (
                      <tr key={item.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={s.tdCrit}>{item.label}</td>
                        {['oui','non'].map(o => (
                          <td key={o} style={s.tdOpt}>
                            <span style={{ ...s.scoreBtn, ...(org[item.key]===o ? s.scoreBtnActif : {}), cursor: 'default', display: 'inline-block' }} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
              <EvalTable title="Préparation" prefix="prep" criteres={CRITERES.preparation} notes={detailVisite.scores||{}} setNotes={()=>{}} missingKeys={null} readOnly />
              <EvalTable title="Savoir-faire et interaction" prefix="sf" criteres={CRITERES.savoirFaire} notes={detailVisite.scores||{}} setNotes={()=>{}} missingKeys={null} readOnly />
              <EvalTable title="Savoir-être et gestion de classe" prefix="se" criteres={CRITERES.savoirEtre} notes={detailVisite.scores||{}} setNotes={()=>{}} missingKeys={null} readOnly />
              {/* Légende */}
              <div style={s.legend}>
                <span style={s.legendTitle}>Légende :</span>
                <span><strong>A</strong> = Acquis</span>
                <span><strong>CA</strong> = En cours d'acquisition</span>
                <span><strong>NA</strong> = Non acquis</span>
                <span><strong>NO</strong> = Non observé</span>
              </div>
              {/* Observation */}
              {detailVisite.observation && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Observation</div>
                  <div style={{ fontSize: 13, color: '#334155', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>{detailVisite.observation}</div>
                </div>
              )}
              {detailVisite.valide && (
                <div style={{ marginTop: 16, textAlign: 'right', color: '#16a34a', fontWeight: 700, fontSize: 13 }}>✓ Visite validée</div>
              )}
              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                <img src={`${window.location.origin}${process.env.PUBLIC_URL || ''}/logo-pied-page.png`} style={{ height: 30, objectFit: 'contain' }} alt="" onError={e => e.target.style.display='none'} />
                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}><div>Zone Industrielle 4, 1963 Vétroz</div><div>Tél. 027 606 18 60</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal feedback */}
      {showFeedbackForm && feedbackVisite && (
        <div className="modal-overlay" style={s.overlay} onClick={() => setShowFeedbackForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitre}>Entretien de feedback</h3>
              <button style={s.btnCancel} onClick={() => setShowFeedbackForm(false)}>Fermer</button>
            </div>

            {/* Infos visite en lecture seule */}
            <div style={{ ...s.grid3, marginBottom: 12 }}>
              <div style={s.field}>
                <span style={s.fieldLabel}>Formateur, Formatrice</span>
                <div style={{ ...s.input, background: '#f8fafc', color: '#64748b' }}>{feedbackVisite.formateur_prenom} {feedbackVisite.formateur_nom}</div>
              </div>
              <div style={s.field}>
                <span style={s.fieldLabel}>Classe</span>
                <div style={{ ...s.input, background: '#f8fafc', color: '#64748b' }}>{feedbackVisite.classe_nom || '—'}</div>
              </div>
              <div style={s.field}>
                <span style={s.fieldLabel}>Branche</span>
                <div style={{ ...s.input, background: '#f8fafc', color: '#64748b' }}>{feedbackVisite.branche_nom || '—'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={s.field}>
                <span style={s.fieldLabel}>Date</span>
                <div style={{ ...s.input, background: '#f8fafc', color: '#64748b' }}>{fmtDate(feedbackVisite.date_visite)}</div>
              </div>
              <div style={s.field}>
                <span style={s.fieldLabel}>Durée</span>
                <div style={{ ...s.input, background: '#f8fafc', color: '#64748b' }}>{feedbackVisite.duree || 1} période{(feedbackVisite.duree||1)>1?'s':''}</div>
              </div>
            </div>

            {/* Auto-évaluation */}
            <div style={{ ...s.sectionTitle, marginBottom: 12 }}>Auto-évaluation</div>
            <div style={s.field}>
              <span style={s.fieldLabel}>De quoi je suis satisfait en terme pédagogique ? <span style={{ fontWeight: 400, color: '#94a3b8' }}>(2 points forts)</span></span>
              <textarea value={feedbackData.satisfait || ''} onChange={e => setFeedbackData(p => ({ ...p, satisfait: e.target.value }))} rows={3} style={{ ...s.textarea, marginTop: 4 }} />
            </div>
            <div style={{ ...s.field, marginTop: 10 }}>
              <span style={s.fieldLabel}>Qu'est-ce que j'aimerais améliorer au niveau technique ou autres ? <span style={{ fontWeight: 400, color: '#94a3b8' }}>(1 – 2 points)</span></span>
              <textarea value={feedbackData.ameliorer || ''} onChange={e => setFeedbackData(p => ({ ...p, ameliorer: e.target.value }))} rows={3} style={{ ...s.textarea, marginTop: 4 }} />
            </div>
            <div style={{ ...s.field, marginTop: 10, marginBottom: 20 }}>
              <span style={s.fieldLabel}>De quoi ai-je besoin pour m'améliorer ? <span style={{ fontWeight: 400, color: '#94a3b8' }}>(1 – 2 avis)</span></span>
              <textarea value={feedbackData.besoin || ''} onChange={e => setFeedbackData(p => ({ ...p, besoin: e.target.value }))} rows={3} style={{ ...s.textarea, marginTop: 4 }} />
            </div>

            {/* Entretien de feedback */}
            <div style={{ ...s.sectionTitle, marginBottom: 12 }}>Entretien de feedback</div>
            <div style={s.field}>
              <span style={s.fieldLabel}>A maintenir dans le cours</span>
              <textarea value={feedbackData.maintenir || ''} onChange={e => setFeedbackData(p => ({ ...p, maintenir: e.target.value }))} rows={3} style={{ ...s.textarea, marginTop: 4 }} />
            </div>
            <div style={{ ...s.field, marginTop: 10 }}>
              <span style={s.fieldLabel}>A améliorer dans le cours</span>
              <textarea value={feedbackData.ameliorerCours || ''} onChange={e => setFeedbackData(p => ({ ...p, ameliorerCours: e.target.value }))} rows={3} style={{ ...s.textarea, marginTop: 4 }} />
            </div>
            <div style={{ ...s.field, marginTop: 10 }}>
              <span style={s.fieldLabel}>Objectifs à mettre en place d'ici la prochaine visite</span>
              <textarea value={feedbackData.objectifs || ''} onChange={e => setFeedbackData(p => ({ ...p, objectifs: e.target.value }))} rows={3} style={{ ...s.textarea, marginTop: 4 }} />
            </div>
            <div style={{ ...s.field, marginTop: 10, marginBottom: 20 }}>
              <span style={s.fieldLabel}>Remarques</span>
              <textarea value={feedbackData.remarques || ''} onChange={e => setFeedbackData(p => ({ ...p, remarques: e.target.value }))} rows={2} style={{ ...s.textarea, marginTop: 4 }} />
            </div>

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 16 }}>
              <div style={s.field}>
                <span style={s.fieldLabel}>Le formateur / La formatrice</span>
                <input type="text" value={feedbackData.signatureFormateur || ''} onChange={e => setFeedbackData(p => ({ ...p, signatureFormateur: e.target.value }))} style={{ ...s.input, marginTop: 4 }} placeholder="Nom et prénom" />
              </div>
              <div style={s.field}>
                <span style={s.fieldLabel}>La direction</span>
                <input type="text" value={feedbackData.signatureDirection || ''} onChange={e => setFeedbackData(p => ({ ...p, signatureDirection: e.target.value }))} style={{ ...s.input, marginTop: 4 }} placeholder="Nom et prénom" />
              </div>
            </div>
            <div style={{ ...s.field, marginBottom: 16, width: 180 }}>
              <span style={s.fieldLabel}>Date</span>
              <input type="date" value={feedbackData.dateFeedback || ''} onChange={e => setFeedbackData(p => ({ ...p, dateFeedback: e.target.value }))} style={{ ...s.input, marginTop: 4 }} />
            </div>

            <div style={{ ...s.formActions, justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setShowFeedbackForm(false)} style={s.btnCancel}>Annuler</button>
                <button type="button" onClick={sauverFeedback} style={s.btnSave}>Sauvegarder</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal formulaire */}
      {showForm && (
        <div className="modal-overlay" style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitre}>
                {editId ? 'Modifier la visite' : 'Formulaire de visite de classe'}
              </h3>
              <button style={s.btnCancel} onClick={() => setShowForm(false)}>Fermer</button>
            </div>
            <form onSubmit={handleSubmit}>
              {/* Infos principales */}
              <div style={s.grid3}>
                <div style={s.field}>
                  <span style={s.fieldLabel}>Formateur, Formatrice *</span>
                  <CustomSelect
                    value={formateurId}
                    onChange={(v) => setFormateurId(v)}
                    options={profs.map((p) => ({ value: String(p.id), label: `${p.prenom || ''} ${p.nom || ''}`.trim() }))}
                    placeholder="Sélectionner..."
                    style={{ width: '100%', minWidth: 0, height: 34 }}
                  />
                </div>
                <div style={s.field}>
                  <span style={s.fieldLabel}>Classe *</span>
                  <CustomSelect
                    value={classeId}
                    onChange={(v) => setClasseId(v)}
                    options={classes.map((c) => ({ value: String(c.id), label: c.nom }))}
                    placeholder="Sélectionner..."
                    style={{ width: '100%', minWidth: 0, height: 34 }}
                  />
                </div>
                <div style={s.field}>
                  <span style={s.fieldLabel}>Branche *</span>
                  <CustomSelect
                    value={brancheId}
                    onChange={(v) => setBrancheId(v)}
                    options={branches.map((b) => ({ value: String(b.id), label: b.nom }))}
                    placeholder="Sélectionner..."
                    style={{ width: '100%', minWidth: 0, height: 34 }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={s.field}>
                  <span style={s.fieldLabel}>Date *</span>
                  <input
                    type="date"
                    value={dateVisite}
                    onChange={(e) => setDateVisite(e.target.value)}
                    style={s.input}
                  />
                </div>
                <div style={s.field}>
                  <span style={s.fieldLabel}>Durée de la visite</span>
                  <div style={s.toggleWrap}>
                    <button type="button" onClick={() => setDuree(1)} style={{ ...s.toggleBtn, ...(duree === 1 ? s.toggleBtnActif : {}) }}>1 période</button>
                    <button type="button" onClick={() => setDuree(2)} style={{ ...s.toggleBtn, ...(duree === 2 ? s.toggleBtnActif : {}) }}>2 périodes</button>
                  </div>
                </div>
              </div>

              {/* Organisation */}
              <div style={{ marginBottom: 16 }}>
                <table style={s.evalTable}>
                  <thead>
                    <tr>
                      <th style={s.thTitle}>Organisation</th>
                      <th style={s.thOpt}>Oui</th>
                      <th style={s.thOpt}>Non</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ORG_ITEMS.map((item) => (
                      <tr key={item.key} style={{ borderBottom: '1px solid #f1f5f9', background: missingKeys?.has(item.key) ? '#fee2e2' : 'transparent' }}>
                        <td style={s.tdCrit}>{item.label}</td>
                        {['oui', 'non'].map((o) => (
                          <td key={o} style={s.tdOpt}>
                            <button
                              type="button"
                              onClick={() => setOrgNotes((p) => ({ ...p, [item.key]: orgNotes[item.key] === o ? '' : o }))}
                              style={{ ...s.scoreBtn, ...(orgNotes[item.key] === o ? s.scoreBtnActif : {}) }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tableaux évaluation */}
              <EvalTable title="Préparation"                        prefix="prep" criteres={CRITERES.preparation} notes={notes} setNotes={setNotes} missingKeys={missingKeys} />
              <EvalTable title="Savoir-faire et interaction"        prefix="sf"   criteres={CRITERES.savoirFaire} notes={notes} setNotes={setNotes} missingKeys={missingKeys} />
              <EvalTable title="Savoir-être et gestion de classe"   prefix="se"   criteres={CRITERES.savoirEtre}  notes={notes} setNotes={setNotes} missingKeys={missingKeys} />

              {/* Légende */}
              <div style={s.legend}>
                <span style={s.legendTitle}>Légende :</span>
                <span><strong>A</strong> = Acquis</span>
                <span><strong>CA</strong> = En cours d'acquisition</span>
                <span><strong>NA</strong> = Non acquis</span>
                <span><strong>NO</strong> = Non observé</span>
              </div>

              {/* Observation */}
              <div style={{ marginBottom: 12 }}>
                <span style={s.fieldLabel}>Observation</span>
                <textarea
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  rows={3}
                  style={{ ...s.textarea, marginTop: 4 }}
                  placeholder="Observations générales..."
                />
              </div>


<div style={{ ...s.formActions, justifyContent: 'flex-end' }}>
                {msg && <div style={{ ...s.msgErr, margin: 0, flex: 1 }}>{msg}</div>}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={() => setShowForm(false)} style={s.btnCancel}>Annuler</button>
                  <button type="submit" style={s.btnSave}>{editId ? 'Modifier' : 'Sauvegarder'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { padding: '28px 32px', background: '#f8fafc', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  titre: { fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, flex: 1 },
  btnAdd: { padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' },
  filters: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 },
  searchInput: { padding: '9px 14px', borderRadius: 8, border: '1px solid #c7d2fe', background: 'white', outline: 'none', fontSize: 14, width: 320, color: '#1e293b', fontFamily: 'inherit' },
  btnTrier: { padding: '7px 14px', borderRadius: 17, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#94a3b8', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' },
  triGroup: { display: 'flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 },
  triBtn: { padding: '7px 14px', borderRadius: 17, border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: '#6d28d9', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' },
  triBtnActif: { background: '#6366f1', color: 'white', fontWeight: 700 },
  tableListWrap: { background: 'white', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', marginTop: 4 },
  tableList: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  thL: { textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#fff', fontSize: 11, background: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' },
  thC: { textAlign: 'center', padding: '10px 14px', fontWeight: 700, color: '#fff', fontSize: 11, background: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' },
  thIcon: { textAlign: 'center', padding: '10px', fontWeight: 700, color: '#fff', fontSize: 11, width: 56, minWidth: 56, maxWidth: 56, background: '#6366f1' },
  thActions: { textAlign: 'right', padding: '10px 14px', fontWeight: 700, color: '#fff', fontSize: 11, width: 120, background: '#6366f1' },
  tdL: { padding: '10px 14px', color: '#0f172a' },
  tdC: { padding: '10px 14px', color: '#0f172a', textAlign: 'center' },
  tdIcon: { padding: '10px', textAlign: 'center', width: 56, minWidth: 56, maxWidth: 56 },
  tdActions: { padding: '10px 14px', textAlign: 'right', width: 120 },
  badge: { display: 'inline-block', padding: '2px 10px', borderRadius: 99, background: '#e0e7ff', color: '#3730a3', fontWeight: 700, fontSize: 11 },
  eyeBtn: { border: 'none', background: '#e0e7ff', color: '#4338ca', borderRadius: 8, padding: 5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  obsBtn: { border: 'none', borderRadius: 8, padding: 5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  editBtn: { border: 'none', background: '#e0e7ff', color: '#4338ca', borderRadius: 8, padding: 5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  delBtn: { border: 'none', background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: 5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  validBtn: { border: 'none', borderRadius: 8, padding: 5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  detailCard: { marginTop: 12, background: 'white', borderRadius: 10, padding: '14px 18px', border: '1px solid #e2e8f0' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: 'white', borderRadius: 14, padding: 28, width: 'min(780px, 96vw)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitre: { fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 },
  btnClose: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8', fontFamily: 'inherit', lineHeight: 1 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: 700, color: '#475569' },
  input: { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', color: '#1e293b', background: 'white', fontFamily: 'inherit' },
  toggleWrap: { display: 'inline-flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 },
  toggleBtn: { padding: '7px 12px', borderRadius: 17, border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: '#6d28d9', fontSize: 13, fontFamily: 'inherit' },
  toggleBtnActif: { background: '#6366f1', color: 'white', fontWeight: 700 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#6366f1', background: '#e0e7ff', padding: '4px 12px', borderRadius: 6, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' },
  thTitle: { textAlign: 'left', padding: '6px 10px', fontWeight: 700, color: '#6366f1', background: '#e0e7ff', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' },
  evalTable: { width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' },
  thCrit: { textAlign: 'left', padding: '6px 10px', fontWeight: 700, color: '#64748b', fontSize: 11, width: '100%' },
  thOpt: { textAlign: 'center', padding: '6px 8px', fontWeight: 700, color: '#64748b', fontSize: 11, whiteSpace: 'nowrap', width: 1 },
  tdCrit: { padding: '8px 10px', fontSize: 13, color: '#334155' },
  tdOpt: { textAlign: 'center', padding: '6px 8px', whiteSpace: 'nowrap', width: 1 },
  scoreBtn: { width: 20, height: 20, borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'inline-block', padding: 0 },
  scoreBtnActif: { background: '#c4b5fd', border: '1.5px solid #7c3aed', boxShadow: 'inset 0 0 0 3px white' },
  legend: { display: 'flex', gap: 16, alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, marginBottom: 14, flexWrap: 'wrap', fontSize: 12, color: '#475569' },
  legendTitle: { fontWeight: 700, color: '#4c1d95' },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#1e293b', background: 'white', fontFamily: 'inherit', resize: 'vertical' },
  formActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #f1f5f9' },
  btnCancel: { padding: '8px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#64748b', fontFamily: 'inherit' },
  btnSave: { padding: '8px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' },
  msgErr: { margin: '0 0 12px', padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 13 },
  empty: { color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '40px 0' },
};
