/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

/** Date du jour (libellé type courrier sous le titre des fiches). */
const fmtDateDuJour = () => fmtDate(new Date());

const parseFeedbackObj = (v) => {
  if (!v) return {};
  try {
    const fd = JSON.parse(v.feedback || '{}');
    return typeof fd === 'object' && fd && !Array.isArray(fd) ? fd : {};
  } catch {
    return {};
  }
};

const escHtmlPdf = (t) => String(t ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Libellés selon le sexe enregistré sur le professeur (module Professeurs). */
const formateurPersoLabel = (prof) => (prof?.sexe === 'F' ? 'Formatrice' : 'Formateur');
const formateurSignLabel = (prof) => (prof?.sexe === 'F' ? 'La formatrice' : 'Le formateur');

function EvalTable({ title, prefix, criteres, notes, setNotes, missingKeys, readOnly }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <table style={s.evalTable}>
        <colgroup>
          <col style={{ width: '64%' }} />
          {NOTES.map((n) => <col key={`col-${n}`} style={{ width: '9%' }} />)}
        </colgroup>
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
            const isLast = i === criteres.length - 1;
            return (
              <tr key={key} style={{ borderBottom: isLast ? 'none' : '1px solid #f1f5f9', background: manque ? '#fee2e2' : 'transparent' }}>
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
  const [searchParams] = useSearchParams();
  const cqTab = searchParams.get('tab') === 'feedback' ? 'feedback' : 'visites';

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
  const [feedbackDetailVisite, setFeedbackDetailVisite] = useState(null);
  /** Fiche type « suivi devoirs » : même contenu que le détail + 5 lignes vierges par bloc pour écriture manuelle à l’impression */
  const [feedbackFicheManuelle, setFeedbackFicheManuelle] = useState(null);

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
      if (cqTab === 'feedback' && !v.valide) return false;
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
  }, [visites, search, filtreNiveau, cqTab]);

  useEffect(() => {
    setDetailId(null);
    setFeedbackDetailVisite(null);
    setFeedbackFicheManuelle(null);
  }, [cqTab]);

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
    if (!formateurId || !classeId || !brancheId || !dateVisite) {
      setMsg('Veuillez compléter les champs requis.');
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
      setMsg('Erreur : ' + (err.response?.data?.message || err.message));
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
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;table-layout:fixed;">
        <colgroup>
          <col style="width:64%" />
          ${NOTES.map(() => '<col style="width:9%" />').join('')}
        </colgroup>
        <thead><tr>
          <th style="text-align:left;padding:5px 8px;font-weight:700;color:#6366f1;background:#e0e7ff;font-size:9pt;text-transform:uppercase;letter-spacing:0.05em;">${title}</th>
          ${NOTES.map(n => `<th style="text-align:center;padding:3px 4px;font-size:9pt;font-weight:700;color:#6366f1;background:#e0e7ff;white-space:nowrap;">${n}</th>`).join('')}
        </tr></thead>
        <tbody>${criteres.map((c, i) => {
          const key = `${prefix}_${i}`;
          const rowBorder = i < criteres.length - 1 ? 'border-bottom:1px solid #f1f5f9;' : 'border-bottom:none;';
          return `<tr style="${rowBorder}">
            <td style="padding:5px 8px;font-size:10pt;color:#334155;">${c}</td>
            ${NOTES.map(n => `<td style="text-align:center;padding:3px 4px;vertical-align:middle;">${scoreDot(scores[key] === n)}</td>`).join('')}
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
      <div class="page-footer" style="border-top:none;box-shadow:none;">
        <img class="footer-logo" src="${logoPiedUrl}" onerror="this.style.display='none'" />
        <div class="footer-text"><div>Zone Industrielle 4, 1963 Vétroz</div><div>Tél. 027 606 18 60</div></div>
      </div>`;

    const orgTable = `
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;table-layout:fixed;">
        <colgroup>
          <col style="width:76%" />
          <col style="width:12%" />
          <col style="width:12%" />
        </colgroup>
        <thead><tr>
          <th style="text-align:left;padding:5px 8px;font-weight:700;color:#6366f1;background:#e0e7ff;font-size:9pt;text-transform:uppercase;letter-spacing:0.05em;">Organisation</th>
          <th style="text-align:center;padding:5px 4px;font-size:9pt;font-weight:700;color:#6366f1;background:#e0e7ff;white-space:nowrap;">Oui</th>
          <th style="text-align:center;padding:5px 4px;font-size:9pt;font-weight:700;color:#6366f1;background:#e0e7ff;white-space:nowrap;">Non</th>
        </tr></thead>
        <tbody>${ORG_ITEMS.map((item, idx) => {
          const rowBorder = idx < ORG_ITEMS.length - 1 ? 'border-bottom:1px solid #f1f5f9;' : 'border-bottom:none;';
          return `<tr style="${rowBorder}">
          <td style="padding:5px 8px;font-size:10pt;color:#334155;">${item.label}</td>
          <td style="text-align:center;padding:5px 4px;vertical-align:middle;">${scoreDot(orgScores[item.key]==='oui')}</td>
          <td style="text-align:center;padding:5px 4px;vertical-align:middle;">${scoreDot(orgScores[item.key]==='non')}</td>
        </tr>`;
        }).join('')}</tbody>
      </table>`;

    const fpVisite = profs.find((p) => String(p.id) === String(v.formateur_id));
    const lblFormateurPdf = fpVisite?.sexe === 'F' ? 'Formatrice' : 'Formateur';
    const nomCompletPdf = `${v.formateur_prenom || ''} ${v.formateur_nom || ''}`.trim() || '—';
    const metaTablePdf = `
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11pt;table-layout:fixed;">
        <tbody>
          <tr>
            <td style="padding:4px 8px 4px 0;font-weight:700;color:#0f172a;border:none;vertical-align:bottom;width:20%;">${lblFormateurPdf}</td>
            <td style="padding:4px 8px;font-weight:700;color:#0f172a;border:none;vertical-align:bottom;width:20%;">Date de la visite</td>
            <td style="padding:4px 8px;font-weight:700;color:#0f172a;border:none;vertical-align:bottom;width:20%;">Classe</td>
            <td style="padding:4px 8px;font-weight:700;color:#0f172a;border:none;vertical-align:bottom;width:20%;">Branche</td>
            <td style="padding:4px 0 4px 8px;font-weight:700;color:#0f172a;border:none;vertical-align:bottom;width:20%;">Durée</td>
          </tr>
          <tr>
            <td style="padding:2px 8px 8px 0;color:#334155;border:none;vertical-align:top;">${nomCompletPdf}</td>
            <td style="padding:2px 8px 8px 8px;color:#334155;border:none;vertical-align:top;">${fmtDate(v.date_visite) || '—'}</td>
            <td style="padding:2px 8px 8px 8px;color:#334155;border:none;vertical-align:top;">${v.classe_nom || '—'}</td>
            <td style="padding:2px 8px 8px 8px;color:#334155;border:none;vertical-align:top;">${v.branche_nom || '—'}</td>
            <td style="padding:2px 0 8px 8px;color:#334155;border:none;vertical-align:top;">${v.duree || 1} période${(v.duree || 1) > 1 ? 's' : ''}</td>
          </tr>
        </tbody>
      </table>`;

    const page1 = `
      <div class="page">
        ${headerHtml}
        <div class="page-title">Visite de classe</div>
        <div style="text-align:right;font-size:11pt;color:#1e293b;margin-bottom:20px;">Vétroz, le ${fmtDateDuJour()}</div>
        ${metaTablePdf}
        ${orgTable}
        ${evalSection('Préparation', 'prep', CRITERES.preparation)}
        ${evalSection('Savoir-faire et interaction', 'sf', CRITERES.savoirFaire)}
        ${evalSection('Savoir-être et gestion de classe', 'se', CRITERES.savoirEtre)}
        <div style="display:flex;gap:12px;padding:8px 12px;background:#f8fafc;border-radius:6px;margin-bottom:12px;font-size:8pt;color:#475569;flex-wrap:wrap;">
          <strong style="color:#000000;font-weight:700;">Légende :</strong>
          <span><strong>A</strong> = Acquis</span><span><strong>CA</strong> = En cours d'acquisition</span><span><strong>NA</strong> = Non acquis</span><span><strong>NO</strong> = Non observé</span>
        </div>
        ${footerHtml}
      </div>`;

    const obsThPdf = 'text-align:left;padding:5px 8px;font-weight:700;color:#6366f1;background:#e0e7ff;font-size:9pt;text-transform:uppercase;letter-spacing:0.05em;';
    const page2 = `
      <div class="page" style="page-break-before:always">
        ${headerHtml}
        ${v.observation ? `
          <div style="margin-top:36px;margin-bottom:20px;">
            <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
              <thead><tr><th style="${obsThPdf}">Observation</th></tr></thead>
              <tbody><tr><td style="padding:10px 12px;font-size:10pt;background:white;border:1px solid #e2e8f0;border-top:none;color:#334155;vertical-align:top;">${v.observation}</td></tr></tbody>
            </table>
          </div>
        ` : `
          <div style="margin-top:36px;margin-bottom:20px;">
            <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
              <thead><tr><th style="${obsThPdf}">Observation</th></tr></thead>
              <tbody><tr><td style="padding:10px 12px;font-size:10pt;color:#94a3b8;font-style:italic;border:1px solid #e2e8f0;border-top:none;background:white;vertical-align:top;">Aucune observation</td></tr></tbody>
            </table>
          </div>`}
        ${footerHtml}
      </div>`;

    const css = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif; background: white; color: #1e293b; }
      @page { size: A4 portrait; margin: 10mm; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: auto; }
      .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; padding-bottom: 0; }
      .header-left { display: flex; align-items: flex-start; gap: 10px; }
      .header-logo { width: 38px; height: auto; object-fit: contain; }
      .header-admin { font-size: 8pt; color: #334155; line-height: 1.5; }
      .header-right { text-align: right; }
      .header-scai { font-size: 17pt; font-weight: 800; color: #1e293b; line-height: 1; }
      .header-year { font-size: 10pt; font-weight: 700; color: #374151; margin-top: 2px; }
      .header-sub { font-size: 8pt; font-weight: 700; color: #475569; margin-top: 2px; }
      .page-title { font-size: 17pt; font-weight: 700; color: #0f172a; text-align: center; text-transform: none; letter-spacing: 0.02em; margin-top: 24px; margin-bottom: 8px; }
      .page-footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; gap: 12px; padding-top: 8px; border-top: none !important; box-shadow: none !important; }
      .footer-logo { height: 26px; width: auto; object-fit: contain; }
      .footer-text { font-size: 8pt; color: #64748b; line-height: 1.35; }
    `;

    const filename = `Visite_${v.formateur_nom || ''}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${filename}</title><style>${css}</style></head><body>${page1}${page2}</body></html>`;
    const finalHtml = injectForcedPrintCss(html, 'A4 portrait', '10mm');
    openPrintPopup(finalHtml, { title: filename, width: 1200, height: 820 });
  };

  const imprimerFeedback = (v, options) => {
    const lignesManuel = options?.lignesManuel === true;
    const publicBase = `${window.location.origin}${process.env.PUBLIC_URL || ''}`;
    const logoUrl = `${publicBase}/logo-etat-du-valais.png`;
    const logoPiedUrl = `${publicBase}/logo-pied-page.png`;
    const fd = parseFeedbackObj(v);
    const obsThSt = 'text-align:left;padding:5px 8px;font-weight:700;color:#6366f1;background:#e0e7ff;font-size:9pt;text-transform:uppercase;letter-spacing:0.05em;';
    const fbBlock = (title, val) => {
      const raw = String(val ?? '').trim();
      if (lignesManuel) {
        const contenu = raw
          ? `<tr><td style="padding:8px 12px;font-size:10pt;border:1px solid #e2e8f0;border-top:none;background:#fafafa;color:#334155;vertical-align:top;line-height:1.45;white-space:pre-wrap;">${escHtmlPdf(val)}</td></tr>`
          : `<tr><td style="padding:6px 12px;font-size:9pt;border:1px solid #e2e8f0;border-top:none;background:#fafafa;color:#94a3b8;vertical-align:top;">&nbsp;</td></tr>`;
        const lignes = [0, 1, 2, 3, 4].map(() =>
          '<tr><td style="height:26px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;border-bottom:1px solid #e8eef5;background:white;vertical-align:middle;">&nbsp;</td></tr>'
        ).join('');
        return `<table style="width:100%;border-collapse:collapse;margin-bottom:12px;table-layout:fixed;"><thead><tr><th style="${obsThSt}">${escHtmlPdf(title)}</th></tr></thead><tbody>${contenu}${lignes}</tbody></table>`;
      }
      const inner = raw
        ? `<td style="padding:10px 12px;font-size:10pt;background:white;border:1px solid #e2e8f0;border-top:none;color:#334155;vertical-align:top;line-height:1.45;white-space:pre-wrap;">${escHtmlPdf(val)}</td>`
        : `<td style="padding:10px 12px;font-size:10pt;color:#94a3b8;font-style:italic;border:1px solid #e2e8f0;border-top:none;background:white;vertical-align:top;">—</td>`;
      return `<table style="width:100%;border-collapse:collapse;margin-bottom:12px;table-layout:fixed;"><thead><tr><th style="${obsThSt}">${escHtmlPdf(title)}</th></tr></thead><tbody><tr>${inner}</tr></tbody></table>`;
    };

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
      <div class="page-footer" style="border-top:none;box-shadow:none;">
        <img class="footer-logo" src="${logoPiedUrl}" onerror="this.style.display='none'" />
        <div class="footer-text"><div>Zone Industrielle 4, 1963 Vétroz</div><div>Tél. 027 606 18 60</div></div>
      </div>`;

    const css = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif; background: white; color: #1e293b; }
      @page { size: A4 portrait; margin: 10mm; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      .page { page-break-after: auto; }
      .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; padding-bottom: 0; }
      .header-left { display: flex; align-items: flex-start; gap: 10px; }
      .header-logo { width: 38px; height: auto; object-fit: contain; }
      .header-admin { font-size: 8pt; color: #334155; line-height: 1.5; }
      .header-right { text-align: right; }
      .header-scai { font-size: 17pt; font-weight: 800; color: #1e293b; line-height: 1; }
      .header-year { font-size: 10pt; font-weight: 700; color: #374151; margin-top: 2px; }
      .header-sub { font-size: 8pt; font-weight: 700; color: #475569; margin-top: 2px; }
      .page-title { font-size: 17pt; font-weight: 700; color: #0f172a; text-align: center; text-transform: none; letter-spacing: 0.02em; margin-top: 24px; margin-bottom: 8px; }
      .page-footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; gap: 12px; padding-top: 8px; border-top: none !important; box-shadow: none !important; }
      .footer-logo { height: 26px; width: auto; object-fit: contain; }
      .footer-text { font-size: 8pt; color: #64748b; line-height: 1.35; }
      .fb-section { font-size: 10pt; font-weight: 700; color: #6366f1; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    `;

    const fpVisite = profs.find((p) => String(p.id) === String(v.formateur_id));
    const lblFormateurPdf = fpVisite?.sexe === 'F' ? 'Formatrice' : 'Formateur';
    const nomCompletPdf = `${v.formateur_prenom || ''} ${v.formateur_nom || ''}`.trim() || '—';
    const metaTablePdf = `
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11pt;table-layout:fixed;">
        <tbody>
          <tr>
            <td style="padding:4px 8px 4px 0;font-weight:700;color:#0f172a;border:none;vertical-align:bottom;width:20%;">${lblFormateurPdf}</td>
            <td style="padding:4px 8px;font-weight:700;color:#0f172a;border:none;vertical-align:bottom;width:20%;">Date de la visite</td>
            <td style="padding:4px 8px;font-weight:700;color:#0f172a;border:none;vertical-align:bottom;width:20%;">Classe</td>
            <td style="padding:4px 8px;font-weight:700;color:#0f172a;border:none;vertical-align:bottom;width:20%;">Branche</td>
            <td style="padding:4px 0 4px 8px;font-weight:700;color:#0f172a;border:none;vertical-align:bottom;width:20%;">Durée</td>
          </tr>
          <tr>
            <td style="padding:2px 8px 8px 0;color:#334155;border:none;vertical-align:top;">${nomCompletPdf}</td>
            <td style="padding:2px 8px 8px 8px;color:#334155;border:none;vertical-align:top;">${fmtDate(v.date_visite) || '—'}</td>
            <td style="padding:2px 8px 8px 8px;color:#334155;border:none;vertical-align:top;">${v.classe_nom || '—'}</td>
            <td style="padding:2px 8px 8px 8px;color:#334155;border:none;vertical-align:top;">${v.branche_nom || '—'}</td>
            <td style="padding:2px 0 8px 8px;color:#334155;border:none;vertical-align:top;">${v.duree || 1} période${(v.duree || 1) > 1 ? 's' : ''}</td>
          </tr>
        </tbody>
      </table>`;

    const dateFb = fd.dateFeedback ? fmtDate(fd.dateFeedback) : '';
    const bodyContent = `
        ${metaTablePdf}
        <div class="fb-section">Auto-évaluation</div>
        ${fbBlock('De quoi je suis satisfait en terme pédagogique ? (2 points forts)', fd.satisfait)}
        ${fbBlock("Qu'est-ce que j'aimerais améliorer au niveau technique ou autres ? (1 – 2 points)", fd.ameliorer)}
        ${fbBlock("De quoi ai-je besoin pour m'améliorer ? (1 – 2 avis)", fd.besoin)}
        <div class="fb-section">Entretien de feedback</div>
        ${fbBlock('A maintenir dans le cours', fd.maintenir)}
        ${fbBlock('A améliorer dans le cours', fd.ameliorerCours)}
        ${fbBlock("Objectifs à mettre en place d'ici la prochaine visite", fd.objectifs)}
        ${fbBlock('Remarques', fd.remarques)}
        <div class="fb-section">Signatures</div>
        ${fbBlock(formateurSignLabel(fpVisite), fd.signatureFormateur)}
        ${fbBlock('La direction', fd.signatureDirection)}
        ${fbBlock('Date', dateFb)}
      `;

    const page = `
      <div class="page">
        ${headerHtml}
        <div class="page-title">Entretien de feedback</div>
        <div style="text-align:right;font-size:11pt;color:#1e293b;margin-bottom:20px;">Vétroz, le ${fmtDateDuJour()}</div>
        ${bodyContent}
        ${footerHtml}
      </div>`;

    const filename = lignesManuel
      ? `Feedback_fiche_manuelle_${v.formateur_nom || 'visite'}_${v.id}`
      : `Feedback_${v.formateur_nom || 'visite'}_${v.id}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escHtmlPdf(filename)}</title><style>${css}</style></head><body>${page}</body></html>`;
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
    setFeedbackDetailVisite(null);
    setFeedbackFicheManuelle(null);
    setFeedbackData(parseFeedbackObj(v));
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

  const fbDetail = cqTab === 'feedback' ? feedbackDetailVisite : null;
  const fbDetailData = fbDetail ? parseFeedbackObj(fbDetail) : {};
  const fbDetailProf = fbDetail ? profs.find((p) => String(p.id) === String(fbDetail.formateur_id)) : null;
  const fbDetailTitreFormateur = fbDetailProf?.sexe === 'F' ? 'Formatrice' : 'Formateur';

  const fbFiche = cqTab === 'feedback' ? feedbackFicheManuelle : null;
  const fbFicheData = fbFiche ? parseFeedbackObj(fbFiche) : {};
  const fbFicheProf = fbFiche ? profs.find((p) => String(p.id) === String(fbFiche.formateur_id)) : null;
  const fbFicheTitreFormateur = fbFicheProf?.sexe === 'F' ? 'Formatrice' : 'Formateur';

  const blocFeedbackLu = (titre, valeur) => (
    <div style={{ marginBottom: 12 }} key={titre}>
      <table style={{ ...s.evalTable, width: '100%' }}>
        <thead>
          <tr>
            <th style={s.thTitle}>{titre}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...s.tdCrit, border: '1px solid #e2e8f0', borderTop: 'none', background: 'white', borderRadius: '0 0 8px 8px', whiteSpace: 'pre-wrap' }}>
              {String(valeur ?? '').trim() ? valeur : '—'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const NB_LIGNES_FEEDBACK_MANUEL = 5;
  /** Même rubrique que le détail + 5 lignes vierges pour compléter à la main après impression */
  const blocFeedbackManuel = (titre, valeur) => (
    <div style={{ marginBottom: 12 }} key={`${titre}-manuel`}>
      <table style={{ ...s.evalTable, width: '100%', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
        <thead>
          <tr>
            <th style={s.thTitle}>{titre}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...s.tdCrit, border: '1px solid #e2e8f0', borderTop: 'none', background: '#fafafa', whiteSpace: 'pre-wrap', minHeight: 28 }}>
              {String(valeur ?? '').trim() ? valeur : '\u00a0'}
            </td>
          </tr>
          {Array.from({ length: NB_LIGNES_FEEDBACK_MANUEL }, (_, i) => (
            <tr key={`ln-${titre}-${i}`}>
              <td style={{ height: 28, border: '1px solid #e2e8f0', borderTop: 'none', background: 'white', borderBottom: '1px solid #e8eef5', boxSizing: 'border-box' }} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={{ ...stickyPageChrome(), marginBottom: 0 }}>
        <div style={s.header}>
          <h2 style={s.titre}>{cqTab === 'feedback' ? 'Feedback' : 'Visite de classe'}</h2>
          {cqTab === 'visites' && (
            <button type="button" style={s.btnAdd} onClick={ouvrirAjout}>+ Ajouter</button>
          )}
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
            <div className="chip-tabs" style={s.triGroup}>
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

      {/* Liste des visites ; détail visite et détail feedback en modales */}
      {loading ? (
        <div style={s.empty}>Chargement...</div>
      ) : (
        <div style={s.splitRow}>
          <div style={s.splitMain}>
            <div style={s.tableListWrap}>
              <table style={s.tableList}>
                <thead>
                  <tr>
                    <th style={{ ...s.thIcon }}></th>
                    <th style={{ ...s.thL, width: 110, minWidth: 110, maxWidth: 110 }}>Date</th>
                    <th style={{ ...s.thL, width: 170, minWidth: 170 }}>Nom</th>
                    <th style={{ ...s.thL, width: 150, minWidth: 150 }}>Prénom</th>
                    <th style={{ ...s.thL, width: 110, minWidth: 110, maxWidth: 110 }}>Modifié le</th>
                    {cqTab === 'feedback' && (
                      <th style={{ textAlign: 'center', padding: '10px 6px', fontWeight: 700, color: '#fff', fontSize: 11, width: 52, minWidth: 52, background: '#6366f1' }}>Fiche</th>
                    )}
                    <th style={s.thActions}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={cqTab === 'feedback' ? 7 : 6} style={{ padding: '20px 14px', color: '#94a3b8', textAlign: 'center', background: 'white' }}>
                        {cqTab === 'feedback' ? 'Aucune visite validée pour le moment.' : 'Aucune visite'}
                      </td>
                    </tr>
                  )}
                  {rows.map((v, i) => {
                    const hasFeedback = (() => { try { const f = JSON.parse(v.feedback || '{}'); return Object.values(f).some((val) => String(val || '').trim()); } catch { return !!(v.feedback && String(v.feedback).trim()); } })();
                    const selVisite = cqTab === 'visites' && detailId === v.id;
                    const selFb = cqTab === 'feedback' && feedbackDetailVisite?.id === v.id;
                    const selFiche = cqTab === 'feedback' && feedbackFicheManuelle?.id === v.id;
                    const rowBg = selVisite || selFb || selFiche ? '#f5f3ff' : (i % 2 === 0 ? 'white' : '#fafbfc');
                    return (
                      <tr key={v.id} style={{ background: rowBg, borderBottom: '1px solid #f1f5f9' }}>
                        <td style={s.tdIcon}>
                          <button
                            type="button"
                            onClick={() => {
                              if (cqTab === 'visites') {
                                setFeedbackDetailVisite(null);
                                setFeedbackFicheManuelle(null);
                                setDetailId(detailId === v.id ? null : v.id);
                              } else {
                                setDetailId(null);
                                setFeedbackFicheManuelle(null);
                                setFeedbackDetailVisite(feedbackDetailVisite?.id === v.id ? null : v);
                              }
                            }}
                            title={cqTab === 'visites' ? 'Détail de la visite' : 'Détail du feedback'}
                            style={{ ...s.eyeBtn, ...(selVisite || selFb ? { boxShadow: '0 0 0 2px #6366f1' } : {}) }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                              <path fillRule="evenodd" d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 13a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/>
                            </svg>
                          </button>
                        </td>
                        <td style={{ ...s.tdL, width: 110, minWidth: 110, maxWidth: 110, whiteSpace: 'nowrap' }}>{fmtDate(v.date_visite)}</td>
                        <td style={{ ...s.tdL, width: 170, minWidth: 170, whiteSpace: 'nowrap', fontWeight: 600 }}>{v.formateur_nom || '—'}</td>
                        <td style={{ ...s.tdL, width: 150, minWidth: 150, whiteSpace: 'nowrap' }}>{v.formateur_prenom || '—'}</td>
                        <td style={{ ...s.tdL, width: 110, minWidth: 110, maxWidth: 110, whiteSpace: 'nowrap', fontSize: 12 }}>
                          {v.updated_at ? fmtDate(v.updated_at) : '—'}
                        </td>
                        {cqTab === 'feedback' && (
                          <td style={{ ...s.tdIcon, width: 52, minWidth: 52, verticalAlign: 'middle', textAlign: 'center' }}>
                            <button
                              type="button"
                              title="Fiche avec lignes pour écriture manuelle (aperçu / impression)"
                              onClick={() => {
                                setFeedbackDetailVisite(null);
                                setFeedbackFicheManuelle(feedbackFicheManuelle?.id === v.id ? null : v);
                              }}
                              style={{
                                border: 'none',
                                borderRadius: 8,
                                padding: 5,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#ede9fe',
                                color: '#5b21b6',
                              }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5zM8 13h8v1.5H8V13zm0 3h6v1.5H8V16z" />
                              </svg>
                            </button>
                          </td>
                        )}
                        <td style={s.tdActions}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => (cqTab === 'feedback' ? ouvrirFeedback(v) : ouvrirEdition(v))}
                              style={{
                                ...s.editBtn,
                                ...(cqTab === 'feedback'
                                  ? (hasFeedback
                                    ? { background: '#ede9fe', color: '#7c3aed' }
                                    : { background: '#f5f3ff', color: '#6d28d9' })
                                  : {}),
                              }}
                              title={cqTab === 'feedback' ? (hasFeedback ? 'Saisir ou modifier le feedback' : 'Saisir le feedback') : 'Modifier'}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button type="button" onClick={() => handleDelete(v)} style={s.delBtn} title="Supprimer">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                                <path d="M9 6V4h6v2"/>
                              </svg>
                            </button>
                            {cqTab === 'visites' && (
                              <button
                                type="button"
                                onClick={() => handleValider(v)}
                                title={v.valide ? 'Validé — cliquer pour annuler' : 'Valider la visite'}
                                style={{ ...s.validBtn, background: v.valide ? '#dcfce7' : '#ede9fe', color: v.valide ? '#16a34a' : '#6366f1' }}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24">
                                  <path fillRule="evenodd" fill="currentColor" d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
                                  <path fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M7 12l3 3 7-7"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Détail visite de classe : modale centrée (comme le feedback) */}
      {cqTab === 'visites' && detailVisite && (
        <div className="modal-overlay" style={s.overlay} onClick={() => setDetailId(null)} role="presentation">
          <div
            style={{ ...s.modal, width: 'min(900px, 96vw)', maxWidth: 900, maxHeight: '92vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="visite-detail-titre"
          >
            <div style={s.modalHeader}>
              <h3 id="visite-detail-titre" style={s.modalTitre}>Détail de la visite</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" style={s.btnSave} onClick={() => imprimerVisite(detailVisite)}>Imprimer</button>
                <button type="button" style={s.btnCancel} onClick={() => setDetailId(null)}>Fermer</button>
              </div>
            </div>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 28px', color: '#1e293b', fontFamily: "'Century Gothic', CenturyGothic, 'Trebuchet MS', sans-serif" }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18, paddingBottom: 0, borderBottom: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <img src={`${window.location.origin}${process.env.PUBLIC_URL || ''}/logo-etat-du-valais.png`} style={{ width: 38 }} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                  <div style={{ fontSize: 7, lineHeight: 1.7, color: '#475569' }}>
                    <div>Département de la santé, des affaires sociales et de la culture</div>
                    <div>Service de l&apos;action sociale</div>
                    <div>Office de l&apos;asile</div>
                    <div>Centre de formation &quot;Le Botza&quot;</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: '#1e293b' }}>SCAI</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{anneeScolaire()}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#475569' }}>CLASSES D&apos;ACCUEIL</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, letterSpacing: 0.02, textTransform: 'none', marginTop: 8, marginBottom: 8, color: '#0f172a' }}>
                Visite de classe
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, marginBottom: 20 }}>Vétroz, le {fmtDateDuJour()}</div>
              <table style={s.detailMetaTable}>
                <tbody>
                  <tr>
                    <td style={{ ...s.detailMetaLabelCell, paddingLeft: 0 }}>{formateurTitre}</td>
                    <td style={s.detailMetaLabelCell}>Date de la visite</td>
                    <td style={s.detailMetaLabelCell}>Classe</td>
                    <td style={s.detailMetaLabelCell}>Branche</td>
                    <td style={{ ...s.detailMetaLabelCell, paddingRight: 0 }}>Durée</td>
                  </tr>
                  <tr>
                    <td style={{ ...s.detailMetaValueCell, paddingLeft: 0 }}>
                      {`${detailVisite.formateur_prenom || ''} ${detailVisite.formateur_nom || ''}`.trim() || '—'}
                    </td>
                    <td style={s.detailMetaValueCell}>{fmtDate(detailVisite.date_visite) || '—'}</td>
                    <td style={s.detailMetaValueCell}>{detailVisite.classe_nom || '—'}</td>
                    <td style={s.detailMetaValueCell}>{detailVisite.branche_nom || '—'}</td>
                    <td style={{ ...s.detailMetaValueCell, paddingRight: 0 }}>
                      {detailVisite.duree || 1} période{(detailVisite.duree || 1) > 1 ? 's' : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style={{ marginBottom: 16 }}>
                <table style={s.evalTable}>
                  <thead><tr>
                    <th style={s.thTitle}>Organisation</th>
                    <th style={s.thOpt}>Oui</th>
                    <th style={s.thOpt}>Non</th>
                  </tr></thead>
                  <tbody>{ORG_ITEMS.map((item, idx) => {
                    const org = detailVisite.organisation || {};
                    const isLast = idx === ORG_ITEMS.length - 1;
                    return (
                      <tr key={item.key} style={{ borderBottom: isLast ? 'none' : '1px solid #f1f5f9' }}>
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
              <div style={s.legend}>
                <span style={s.legendTitle}>Légende :</span>
                <span><strong>A</strong> = Acquis</span>
                <span><strong>CA</strong> = En cours d&apos;acquisition</span>
                <span><strong>NA</strong> = Non acquis</span>
                <span><strong>NO</strong> = Non observé</span>
              </div>
              {detailVisite.observation && (
                <div style={{ marginBottom: 12 }}>
                  <table style={{ ...s.evalTable, width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={s.thTitle}>Observation</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ ...s.tdCrit, border: '1px solid #e2e8f0', borderTop: 'none', background: '#f8fafc', borderRadius: '0 0 8px 8px' }}>{detailVisite.observation}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28, paddingTop: 12 }}>
                <img src={`${window.location.origin}${process.env.PUBLIC_URL || ''}/logo-pied-page.png`} style={{ height: 30, objectFit: 'contain' }} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}><div>Zone Industrielle 4, 1963 Vétroz</div><div>Tél. 027 606 18 60</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Détail feedback : modale centrée (comme la saisie), pas de colonne à droite du tableau */}
      {cqTab === 'feedback' && fbDetail && (
        <div className="modal-overlay" style={s.overlay} onClick={() => { setFeedbackDetailVisite(null); setFeedbackFicheManuelle(null); }} role="presentation">
          <div
            style={{ ...s.modal, width: 'min(900px, 96vw)', maxWidth: 900, maxHeight: '92vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-detail-titre"
          >
            <div style={s.modalHeader}>
              <h3 id="feedback-detail-titre" style={s.modalTitre}>Détail du feedback</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" style={s.btnSave} onClick={() => imprimerFeedback(fbDetail)}>Imprimer</button>
                <button type="button" style={s.btnCancel} onClick={() => { setFeedbackDetailVisite(null); setFeedbackFicheManuelle(null); }}>Fermer</button>
              </div>
            </div>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 28px', color: '#1e293b', fontFamily: "'Century Gothic', CenturyGothic, 'Trebuchet MS', sans-serif" }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18, paddingBottom: 0, borderBottom: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <img src={`${window.location.origin}${process.env.PUBLIC_URL || ''}/logo-etat-du-valais.png`} style={{ width: 38 }} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                  <div style={{ fontSize: 7, lineHeight: 1.7, color: '#475569' }}>
                    <div>Département de la santé, des affaires sociales et de la culture</div>
                    <div>Service de l&apos;action sociale</div>
                    <div>Office de l&apos;asile</div>
                    <div>Centre de formation &quot;Le Botza&quot;</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: '#1e293b' }}>SCAI</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{anneeScolaire()}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#475569' }}>CLASSES D&apos;ACCUEIL</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, letterSpacing: 0.02, textTransform: 'none', marginTop: 8, marginBottom: 8, color: '#0f172a' }}>
                Entretien de feedback
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, marginBottom: 20 }}>Vétroz, le {fmtDateDuJour()}</div>
              <table style={s.detailMetaTable}>
                <tbody>
                  <tr>
                    <td style={{ ...s.detailMetaLabelCell, paddingLeft: 0 }}>{fbDetailTitreFormateur}</td>
                    <td style={s.detailMetaLabelCell}>Date de la visite</td>
                    <td style={s.detailMetaLabelCell}>Classe</td>
                    <td style={s.detailMetaLabelCell}>Branche</td>
                    <td style={{ ...s.detailMetaLabelCell, paddingRight: 0 }}>Durée</td>
                  </tr>
                  <tr>
                    <td style={{ ...s.detailMetaValueCell, paddingLeft: 0 }}>
                      {`${fbDetail.formateur_prenom || ''} ${fbDetail.formateur_nom || ''}`.trim() || '—'}
                    </td>
                    <td style={s.detailMetaValueCell}>{fmtDate(fbDetail.date_visite) || '—'}</td>
                    <td style={s.detailMetaValueCell}>{fbDetail.classe_nom || '—'}</td>
                    <td style={s.detailMetaValueCell}>{fbDetail.branche_nom || '—'}</td>
                    <td style={{ ...s.detailMetaValueCell, paddingRight: 0 }}>
                      {fbDetail.duree || 1} période{(fbDetail.duree || 1) > 1 ? 's' : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style={{ ...s.sectionTitle, marginTop: 8, marginBottom: 10 }}>Auto-évaluation</div>
              {blocFeedbackLu('De quoi je suis satisfait en terme pédagogique ? (2 points forts)', fbDetailData.satisfait)}
              {blocFeedbackLu("Qu'est-ce que j'aimerais améliorer au niveau technique ou autres ? (1 – 2 points)", fbDetailData.ameliorer)}
              {blocFeedbackLu("De quoi ai-je besoin pour m'améliorer ? (1 – 2 avis)", fbDetailData.besoin)}
              <div style={{ ...s.sectionTitle, marginBottom: 10 }}>Entretien de feedback</div>
              {blocFeedbackLu('A maintenir dans le cours', fbDetailData.maintenir)}
              {blocFeedbackLu('A améliorer dans le cours', fbDetailData.ameliorerCours)}
              {blocFeedbackLu("Objectifs à mettre en place d'ici la prochaine visite", fbDetailData.objectifs)}
              {blocFeedbackLu('Remarques', fbDetailData.remarques)}
              <div style={{ ...s.sectionTitle, marginBottom: 10 }}>Signatures</div>
              {blocFeedbackLu(formateurSignLabel(fbDetailProf), fbDetailData.signatureFormateur)}
              {blocFeedbackLu('La direction', fbDetailData.signatureDirection)}
              {blocFeedbackLu('Date', fbDetailData.dateFeedback ? fmtDate(fbDetailData.dateFeedback) : '')}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28, paddingTop: 12 }}>
                <img src={`${window.location.origin}${process.env.PUBLIC_URL || ''}/logo-pied-page.png`} style={{ height: 30, objectFit: 'contain' }} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}><div>Zone Industrielle 4, 1963 Vétroz</div><div>Tél. 027 606 18 60</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fiche feedback : comme le détail + 5 lignes vierges par bloc pour écriture manuelle */}
      {cqTab === 'feedback' && fbFiche && (
        <div className="modal-overlay" style={s.overlay} onClick={() => setFeedbackFicheManuelle(null)} role="presentation">
          <div
            style={{ ...s.modal, width: 'min(900px, 96vw)', maxWidth: 900, maxHeight: '92vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-fiche-titre"
          >
            <div style={s.modalHeader}>
              <h3 id="feedback-fiche-titre" style={s.modalTitre}>Fiche feedback (écriture manuelle)</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" style={s.btnSave} onClick={() => imprimerFeedback(fbFiche, { lignesManuel: true })}>Imprimer</button>
                <button type="button" style={s.btnCancel} onClick={() => setFeedbackFicheManuelle(null)}>Fermer</button>
              </div>
            </div>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 28px', color: '#1e293b', fontFamily: "'Century Gothic', CenturyGothic, 'Trebuchet MS', sans-serif" }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18, paddingBottom: 0, borderBottom: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <img src={`${window.location.origin}${process.env.PUBLIC_URL || ''}/logo-etat-du-valais.png`} style={{ width: 38 }} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                  <div style={{ fontSize: 7, lineHeight: 1.7, color: '#475569' }}>
                    <div>Département de la santé, des affaires sociales et de la culture</div>
                    <div>Service de l&apos;action sociale</div>
                    <div>Office de l&apos;asile</div>
                    <div>Centre de formation &quot;Le Botza&quot;</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: '#1e293b' }}>SCAI</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{anneeScolaire()}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#475569' }}>CLASSES D&apos;ACCUEIL</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, letterSpacing: 0.02, textTransform: 'none', marginTop: 8, marginBottom: 8, color: '#0f172a' }}>
                Entretien de feedback
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, marginBottom: 20 }}>Vétroz, le {fmtDateDuJour()}</div>
              <table style={s.detailMetaTable}>
                <tbody>
                  <tr>
                    <td style={{ ...s.detailMetaLabelCell, paddingLeft: 0 }}>{fbFicheTitreFormateur}</td>
                    <td style={s.detailMetaLabelCell}>Date de la visite</td>
                    <td style={s.detailMetaLabelCell}>Classe</td>
                    <td style={s.detailMetaLabelCell}>Branche</td>
                    <td style={{ ...s.detailMetaLabelCell, paddingRight: 0 }}>Durée</td>
                  </tr>
                  <tr>
                    <td style={{ ...s.detailMetaValueCell, paddingLeft: 0 }}>
                      {`${fbFiche.formateur_prenom || ''} ${fbFiche.formateur_nom || ''}`.trim() || '—'}
                    </td>
                    <td style={s.detailMetaValueCell}>{fmtDate(fbFiche.date_visite) || '—'}</td>
                    <td style={s.detailMetaValueCell}>{fbFiche.classe_nom || '—'}</td>
                    <td style={s.detailMetaValueCell}>{fbFiche.branche_nom || '—'}</td>
                    <td style={{ ...s.detailMetaValueCell, paddingRight: 0 }}>
                      {fbFiche.duree || 1} période{(fbFiche.duree || 1) > 1 ? 's' : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style={{ ...s.sectionTitle, marginTop: 8, marginBottom: 10 }}>Auto-évaluation</div>
              {blocFeedbackManuel('De quoi je suis satisfait en terme pédagogique ? (2 points forts)', fbFicheData.satisfait)}
              {blocFeedbackManuel("Qu'est-ce que j'aimerais améliorer au niveau technique ou autres ? (1 – 2 points)", fbFicheData.ameliorer)}
              {blocFeedbackManuel("De quoi ai-je besoin pour m'améliorer ? (1 – 2 avis)", fbFicheData.besoin)}
              <div style={{ ...s.sectionTitle, marginBottom: 10 }}>Entretien de feedback</div>
              {blocFeedbackManuel('A maintenir dans le cours', fbFicheData.maintenir)}
              {blocFeedbackManuel('A améliorer dans le cours', fbFicheData.ameliorerCours)}
              {blocFeedbackManuel("Objectifs à mettre en place d'ici la prochaine visite", fbFicheData.objectifs)}
              {blocFeedbackManuel('Remarques', fbFicheData.remarques)}
              <div style={{ ...s.sectionTitle, marginBottom: 10 }}>Signatures</div>
              {blocFeedbackManuel(formateurSignLabel(fbFicheProf), fbFicheData.signatureFormateur)}
              {blocFeedbackManuel('La direction', fbFicheData.signatureDirection)}
              {blocFeedbackManuel('Date', fbFicheData.dateFeedback ? fmtDate(fbFicheData.dateFeedback) : '')}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28, paddingTop: 12 }}>
                <img src={`${window.location.origin}${process.env.PUBLIC_URL || ''}/logo-pied-page.png`} style={{ height: 30, objectFit: 'contain' }} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}><div>Zone Industrielle 4, 1963 Vétroz</div><div>Tél. 027 606 18 60</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal feedback */}
      {showFeedbackForm && feedbackVisite && (
        <div className="modal-overlay" style={s.overlay} onClick={() => setShowFeedbackForm(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitre}>Entretien de feedback</h3>
              <button type="button" style={s.btnCancel} onClick={() => setShowFeedbackForm(false)}>Fermer</button>
            </div>

            <div style={{ ...s.grid3, marginBottom: 12 }}>
              <div style={s.field}>
                <span style={s.fieldLabel}>{formateurPersoLabel(profs.find((p) => String(p.id) === String(feedbackVisite.formateur_id)))}</span>
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
                <div style={{ ...s.input, background: '#f8fafc', color: '#64748b' }}>{feedbackVisite.duree || 1} période{(feedbackVisite.duree || 1) > 1 ? 's' : ''}</div>
              </div>
            </div>

            <div style={{ ...s.sectionTitle, marginBottom: 12 }}>Auto-évaluation</div>
            <div style={s.field}>
              <span style={s.fieldLabel}>De quoi je suis satisfait en terme pédagogique ? <span style={{ fontWeight: 400, color: '#94a3b8' }}>(2 points forts)</span></span>
              <textarea value={feedbackData.satisfait || ''} onChange={(e) => setFeedbackData((p) => ({ ...p, satisfait: e.target.value }))} rows={3} style={{ ...s.textarea, marginTop: 4 }} />
            </div>
            <div style={{ ...s.field, marginTop: 10 }}>
              <span style={s.fieldLabel}>Qu'est-ce que j'aimerais améliorer au niveau technique ou autres ? <span style={{ fontWeight: 400, color: '#94a3b8' }}>(1 – 2 points)</span></span>
              <textarea value={feedbackData.ameliorer || ''} onChange={(e) => setFeedbackData((p) => ({ ...p, ameliorer: e.target.value }))} rows={3} style={{ ...s.textarea, marginTop: 4 }} />
            </div>
            <div style={{ ...s.field, marginTop: 10, marginBottom: 20 }}>
              <span style={s.fieldLabel}>De quoi ai-je besoin pour m'améliorer ? <span style={{ fontWeight: 400, color: '#94a3b8' }}>(1 – 2 avis)</span></span>
              <textarea value={feedbackData.besoin || ''} onChange={(e) => setFeedbackData((p) => ({ ...p, besoin: e.target.value }))} rows={3} style={{ ...s.textarea, marginTop: 4 }} />
            </div>

            <div style={{ ...s.sectionTitle, marginBottom: 12 }}>Entretien de feedback</div>
            <div style={s.field}>
              <span style={s.fieldLabel}>A maintenir dans le cours</span>
              <textarea value={feedbackData.maintenir || ''} onChange={(e) => setFeedbackData((p) => ({ ...p, maintenir: e.target.value }))} rows={3} style={{ ...s.textarea, marginTop: 4 }} />
            </div>
            <div style={{ ...s.field, marginTop: 10 }}>
              <span style={s.fieldLabel}>A améliorer dans le cours</span>
              <textarea value={feedbackData.ameliorerCours || ''} onChange={(e) => setFeedbackData((p) => ({ ...p, ameliorerCours: e.target.value }))} rows={3} style={{ ...s.textarea, marginTop: 4 }} />
            </div>
            <div style={{ ...s.field, marginTop: 10 }}>
              <span style={s.fieldLabel}>Objectifs à mettre en place d'ici la prochaine visite</span>
              <textarea value={feedbackData.objectifs || ''} onChange={(e) => setFeedbackData((p) => ({ ...p, objectifs: e.target.value }))} rows={3} style={{ ...s.textarea, marginTop: 4 }} />
            </div>
            <div style={{ ...s.field, marginTop: 10, marginBottom: 20 }}>
              <span style={s.fieldLabel}>Remarques</span>
              <textarea value={feedbackData.remarques || ''} onChange={(e) => setFeedbackData((p) => ({ ...p, remarques: e.target.value }))} rows={2} style={{ ...s.textarea, marginTop: 4 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 16 }}>
              <div style={s.field}>
                <span style={s.fieldLabel}>{formateurSignLabel(profs.find((p) => String(p.id) === String(feedbackVisite.formateur_id)))}</span>
                <input type="text" value={feedbackData.signatureFormateur || ''} onChange={(e) => setFeedbackData((p) => ({ ...p, signatureFormateur: e.target.value }))} style={{ ...s.input, marginTop: 4 }} placeholder="Nom et prénom" />
              </div>
              <div style={s.field}>
                <span style={s.fieldLabel}>La direction</span>
                <input type="text" value={feedbackData.signatureDirection || ''} onChange={(e) => setFeedbackData((p) => ({ ...p, signatureDirection: e.target.value }))} style={{ ...s.input, marginTop: 4 }} placeholder="Nom et prénom" />
              </div>
            </div>
            <div style={{ ...s.field, marginBottom: 16, width: 180 }}>
              <span style={s.fieldLabel}>Date</span>
              <input type="date" value={feedbackData.dateFeedback || ''} onChange={(e) => setFeedbackData((p) => ({ ...p, dateFeedback: e.target.value }))} style={{ ...s.input, marginTop: 4 }} />
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
                  <div className="chip-tabs" style={s.toggleWrap}>
                    <button type="button" onClick={() => setDuree(1)} style={{ ...s.toggleBtn, ...(duree === 1 ? s.toggleBtnActif : {}) }}>1 période</button>
                    <button type="button" onClick={() => setDuree(2)} style={{ ...s.toggleBtn, ...(duree === 2 ? s.toggleBtnActif : {}) }}>2 périodes</button>
                  </div>
                </div>
              </div>

              {/* Organisation */}
              <div style={{ marginBottom: 16 }}>
                <table style={s.evalTable}>
                  <colgroup>
                    <col style={{ width: '76%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={s.thTitle}>Organisation</th>
                      <th style={s.thOpt}>Oui</th>
                      <th style={s.thOpt}>Non</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ORG_ITEMS.map((item, idx) => {
                      const isLast = idx === ORG_ITEMS.length - 1;
                      return (
                      <tr key={item.key} style={{ borderBottom: isLast ? 'none' : '1px solid #f1f5f9', background: missingKeys?.has(item.key) ? '#fee2e2' : 'transparent' }}>
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
                      );
                    })}
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

              {msg ? (
                <div style={{ ...s.msgErr, marginTop: 8, marginBottom: 20 }} role="alert">
                  {msg}
                </div>
              ) : null}
              <div style={{ ...s.formActions, justifyContent: 'flex-end', marginTop: msg ? 4 : 0, paddingTop: msg ? 20 : 16 }}>
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
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, minHeight: 40 },
  titre: { fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, flex: 1 },
  btnAdd: { padding: '8px 14px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' },
  filters: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 },
  searchInput: { padding: '9px 14px', borderRadius: 8, border: '1px solid #c7d2fe', background: 'white', outline: 'none', fontSize: 14, width: 320, color: '#1e293b', fontFamily: 'inherit' },
  btnTrier: { padding: '7px 14px', borderRadius: 17, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#94a3b8', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' },
  triGroup: { display: 'flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 },
  triBtn: { padding: '7px 14px', borderRadius: 17, border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: '#6d28d9', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' },
  triBtnActif: { background: '#6366f1', color: 'white', fontWeight: 700 },
  tableListWrap: { background: 'white', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', marginTop: 4 },
  splitRow: { display: 'flex', gap: 16, alignItems: 'flex-start', width: '100%', marginTop: 4, boxSizing: 'border-box' },
  splitMain: { flex: '1 1 auto', minWidth: 0, width: '100%' },
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
  evalTable: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  thCrit: { textAlign: 'left', padding: '6px 10px', fontWeight: 700, color: '#64748b', fontSize: 11, width: '100%' },
  thOpt: { textAlign: 'center', padding: '3px 4px', fontWeight: 700, color: '#6366f1', background: '#e0e7ff', fontSize: 11, whiteSpace: 'nowrap' },
  tdCrit: { padding: '5px 10px', fontSize: 13, color: '#334155' },
  tdOpt: { textAlign: 'center', padding: '3px 4px', whiteSpace: 'nowrap', verticalAlign: 'middle' },
  scoreBtn: { width: 20, height: 20, borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'inline-block', padding: 0 },
  scoreBtnActif: { background: '#c4b5fd', border: '1.5px solid #7c3aed', boxShadow: 'inset 0 0 0 3px white' },
  legend: { display: 'flex', gap: 16, alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, marginBottom: 14, flexWrap: 'wrap', fontSize: '8pt', color: '#475569' },
  legendTitle: { fontWeight: 700, color: '#000000' },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#1e293b', background: 'white', fontFamily: 'inherit', resize: 'vertical' },
  formActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #f1f5f9' },
  btnCancel: { padding: '8px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#64748b', fontFamily: 'inherit' },
  btnSave: { padding: '8px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' },
  msgErr: { margin: '0 0 12px', padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 13 },
  detailMetaTable: { width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 13, color: '#1e293b', tableLayout: 'fixed' },
  detailMetaLabelCell: { padding: '4px 8px', fontWeight: 700, color: '#0f172a', border: 'none', verticalAlign: 'bottom', width: '20%' },
  detailMetaValueCell: { padding: '2px 8px 8px 8px', color: '#334155', border: 'none', verticalAlign: 'top', fontWeight: 400 },
  empty: { color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '40px 0' },
};
