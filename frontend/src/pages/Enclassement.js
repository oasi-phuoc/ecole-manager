/* eslint-disable */
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/apiClient';
import { useNavigate } from 'react-router-dom';
import { getSessionUser } from '../utils/session';
import { injectForcedPrintCss, openPrintPopup } from '../utils/print';
import CustomSelect from '../components/CustomSelect';
import { PageLoader, LoadingButton } from '../components/LoadingUI';

const SESSION_LABEL = { "Test d'août": 'Test de placement' };
const SESSIONS = ["Test d'août", '1e semestre', '2e semestre'];

// ─── Logique d'enclassement (fonctions pures) ─────────────────────────────────

function nb(v) { const n = Number(v); return isNaN(n) ? 0 : n; }

function scorePondere(fr, math) { return fr * 2 + math; }

function determinerStructure(scoreFr, scoreMath, seuilPlancher, seuilPondere) {
  const pondere = scorePondere(scoreFr, scoreMath);
  if (scoreFr < seuilPlancher) {
    return { structure: 'CSC', flagge: true, motif: 'Français insuffisant pour CFR', pondere };
  }
  return { structure: pondere <= seuilPondere ? 'CSC' : 'CFR', flagge: false, motif: null, pondere };
}

function trierEleves(eleves) {
  return [...eleves].sort((a, b) => {
    if (b.score_francais !== a.score_francais) return b.score_francais - a.score_francais;
    const aScol = !!a.scolarise, bScol = !!b.scolarise;
    if (aScol === bScol) {
      if (b.score_math !== a.score_math) return b.score_math - a.score_math;
    }
    const nomA = (a.nom + a.prenom).toLowerCase();
    const nomB = (b.nom + b.prenom).toLowerCase();
    return nomA < nomB ? -1 : nomA > nomB ? 1 : 0;
  });
}

function distribuerSerpentin(elevesTriés, nbClasses) {
  const classes = Array.from({ length: nbClasses }, (_, i) => ({ index: i, eleves: [] }));
  let direction = 1, pos = 0;
  for (const eleve of elevesTriés) {
    classes[pos].eleves.push(eleve);
    if (direction === 1) {
      if (pos === nbClasses - 1) { direction = -1; }
      else { pos++; }
    } else {
      if (pos === 0) { direction = 1; }
      else { pos--; }
    }
  }
  return classes.map(c => c.eleves);
}

function genererAlertes(classesCSC, classesCFR, params) {
  const alertes = [];
  const toutesClasses = [
    ...classesCSC.map((c, i) => ({ ...c, structure: 'CSC', nom: `CSC ${lettre(i)}` })),
    ...classesCFR.map((c, i) => ({ ...c, structure: 'CFR', nom: `CFR ${lettre(i)}` }))
  ];

  // Seuil plancher
  const flaggues = toutesClasses.flatMap(c => c.eleves.filter(e => e.flagge));
  if (flaggues.length > 0) {
    alertes.push({ type: 'warning', msg: `${flaggues.length} élève(s) redirigé(s) en CSC malgré un score pondéré > ${params.seuilPondere} (français insuffisant < ${params.seuilPlancher}).` });
  }

  // Capacité max
  for (const c of toutesClasses) {
    const cap = c.structure === 'CSC' ? 12 : 15;
    if (c.eleves.length > cap) {
      alertes.push({ type: 'error', msg: `${c.nom} : ${c.eleves.length} élèves dépasse la capacité max de ${cap}.` });
    }
  }

  return alertes;
}

function lettre(i) {
  return String.fromCharCode(65 + i); // A, B, C...
}

function calculerStats(eleves) {
  if (!eleves.length) return null;
  const frs = eleves.map(e => e.score_francais);
  const moy = frs.reduce((s, v) => s + v, 0) / frs.length;
  const variance = frs.reduce((s, v) => s + Math.pow(v - moy, 2), 0) / frs.length;
  return {
    effectif: eleves.length,
    moyenne_francais: Math.round(moy * 10) / 10,
    ecart_type: Math.round(Math.sqrt(variance) * 10) / 10,
    min: Math.min(...frs),
    max: Math.max(...frs),
    nb_flaggues: eleves.filter(e => e.flagge).length,
  };
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function Enclassement() {
  const navigate = useNavigate();
  const user = getSessionUser();
  const headers = {};

  // Données
  const [eleves, setEleves] = useState([]);
  const [tcfScores, setTcfScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [historique, setHistorique] = useState([]);
  const [detailEnc, setDetailEnc] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingHistorique, setLoadingHistorique] = useState(true);

  // Vue
  const [view, setView] = useState('init'); // 'init' | 'brouillon' | 'detail' | 'historique'

  // Paramètres
  const [session, setSession] = useState("Test d'août");
  const [seuilPlancher, setSeuilPlancher] = useState(25);
  const [seuilPondere, setSeuilPondere] = useState(75);
  const [nbClassesCSC, setNbClassesCSC] = useState(0);
  const [nbClassesCFR, setNbClassesCFR] = useState(0);
  const [autoClasses, setAutoClasses] = useState(true);

  // Brouillon
  const [classesCSC, setClassesCSC] = useState([]); // [{eleves: [...]}]
  const [classesCFR, setClassesCFR] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [nomEnclassement, setNomEnclassement] = useState('');
  const [saving, setSaving] = useState(false);

  // Drag-drop
  const [dragEleve, setDragEleve] = useState(null); // {eleve, sourceStr, sourceIdx}

  // Filtre init
  const [searchInit, setSearchInit] = useState('');

  useEffect(() => {
    loadAll();
    loadHistorique();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [elevRes, tcfRes] = await Promise.all([
        apiClient.get('/eleves', { headers }),
        apiClient.get('/tcf-state/resultats', { headers }).catch(() => ({ data: { donnees: {} } }))
      ]);
      setEleves(elevRes.data || []);
      setTcfScores(tcfRes.data?.donnees?.scores || {});
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadHistorique = async () => {
    setLoadingHistorique(true);
    try {
      const r = await apiClient.get('/enclassements', { headers });
      setHistorique(r.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingHistorique(false); }
  };

  // Scores TCF pour un élève et une session
  const getScoreFr = (eleveId, sess) => {
    const key = `francais::${sess}::${eleveId}`;
    const sc = tcfScores[key];
    if (!sc) return null;
    const total = nb(sc.co) + nb(sc.po) + nb(sc.ce) + nb(sc.pe);
    return [sc.co, sc.po, sc.ce, sc.pe].some(v => v !== '' && v !== undefined) ? total : null;
  };

  const getScoreMath = (eleveId, sess) => {
    const key = `math::${sess}::${eleveId}`;
    const sc = tcfScores[key];
    if (!sc) return null;
    const total = nb(sc.p1) + nb(sc.p2) + nb(sc.p3) + nb(sc.p4);
    return [sc.p1, sc.p2, sc.p3, sc.p4].some(v => v !== '' && v !== undefined) ? total : null;
  };

  // Élèves avec scores TCF pour la session sélectionnée
  const elevesAvecScores = eleves
    .map(e => {
      const fr = getScoreFr(e.id, session);
      const math = getScoreMath(e.id, session);
      return { ...e, score_francais: fr, score_math: math, hasScore: fr !== null || math !== null };
    })
    .filter(e => e.hasScore);

  const elevesSansScores = eleves.filter(e => {
    const fr = getScoreFr(e.id, session);
    const math = getScoreMath(e.id, session);
    return fr === null && math === null;
  });

  // Auto-calcul nb classes
  const nbCSCauto = Math.max(1, Math.ceil(
    elevesAvecScores.filter(e => determinerStructure(e.score_francais || 0, e.score_math || 0, seuilPlancher, seuilPondere).structure === 'CSC').length / 12
  ));
  const nbCFRauto = Math.max(1, Math.ceil(
    elevesAvecScores.filter(e => determinerStructure(e.score_francais || 0, e.score_math || 0, seuilPlancher, seuilPondere).structure === 'CFR').length / 15
  ));

  const nbCSCeffectif = autoClasses ? nbCSCauto : (nbClassesCSC || 1);
  const nbCFReffectif = autoClasses ? nbCFRauto : (nbClassesCFR || 1);

  const calculer = () => {
    if (elevesAvecScores.length === 0) { alert('Aucun élève avec scores TCF pour cette session.'); return; }

    const withResult = elevesAvecScores.map(e => {
      const fr = e.score_francais || 0;
      const math = e.score_math || 0;
      const res = determinerStructure(fr, math, seuilPlancher, seuilPondere);
      return { ...e, ...res, score_francais: fr, score_math: math };
    });

    const cscEleves = trierEleves(withResult.filter(e => e.structure === 'CSC'));
    const cfrEleves = trierEleves(withResult.filter(e => e.structure === 'CFR'));

    const cscClasses = distribuerSerpentin(cscEleves, nbCSCeffectif).map((eleves, i) => ({ nom: `CSC ${lettre(i)}`, eleves }));
    const cfrClasses = distribuerSerpentin(cfrEleves, nbCFReffectif).map((eleves, i) => ({ nom: `CFR ${lettre(i)}`, eleves }));

    setClassesCSC(cscClasses);
    setClassesCFR(cfrClasses);
    setAlertes(genererAlertes(cscClasses, cfrClasses, { seuilPondere, seuilPlancher }));

    const now = new Date();
    setNomEnclassement(`Enclassement ${now.toLocaleDateString('fr-CH')} — ${SESSION_LABEL[session] || session}`);
    setView('brouillon');
  };

  const valider = async () => {
    setSaving(true);
    try {
      const toutes = [
        ...classesCSC.map((c, i) => ({ structure: 'CSC', nom: c.nom, capacite_max: 12, eleves: c.eleves.map((e, pi) => ({ eleve_id: e.id, score_francais: e.score_francais, score_math: e.score_math, score_pondere: e.pondere, flagge_plancher: e.flagge || false, motif_flag: e.motif || null, position_serpentin: pi, modifie_manuellement: e.modifie_manuellement || false })) })),
        ...classesCFR.map((c, i) => ({ structure: 'CFR', nom: c.nom, capacite_max: 15, eleves: c.eleves.map((e, pi) => ({ eleve_id: e.id, score_francais: e.score_francais, score_math: e.score_math, score_pondere: e.pondere, flagge_plancher: e.flagge || false, motif_flag: e.motif || null, position_serpentin: pi, modifie_manuellement: e.modifie_manuellement || false })) }))
      ];
      await apiClient.post('/enclassements', {
        nom: nomEnclassement,
        session_tcf: session,
        parametres: { seuilPlancher, seuilPondere, nbClassesCSC: nbCSCeffectif, nbClassesCFR: nbCFReffectif },
        classes: toutes
      }, { headers });
      await loadHistorique();
      setView('historique');
    } catch (err) { alert('Erreur lors de la sauvegarde : ' + err.message); }
    finally { setSaving(false); }
  };

  const ouvrirDetail = async (enc) => {
    setLoadingDetail(true);
    try {
      const r = await apiClient.get('/enclassements/' + enc.id, { headers });
      setDetailEnc(r.data);
      setView('detail');
    } catch (err) { alert('Erreur chargement'); }
    setLoadingDetail(false);
  };

  const archiverEnclassement = async (enc) => {
    if (!window.confirm('Archiver cet enclassement ?')) return;
    try {
      await apiClient.patch('/enclassements/' + enc.id + '/statut', { statut: 'archivé' }, { headers });
      await loadHistorique();
      if (detailEnc?.id === enc.id) setDetailEnc({ ...detailEnc, statut: 'archivé' });
    } catch (err) { alert('Erreur'); }
  };

  const supprimerEnclassement = async (id) => {
    if (!window.confirm('Supprimer cet enclassement ? Cette action est irréversible.')) return;
    try {
      await apiClient.delete('/enclassements/' + id, { headers });
      await loadHistorique();
      if (detailEnc?.id === id) { setDetailEnc(null); setView('historique'); }
    } catch (err) { alert('Erreur'); }
  };

  // Drag-drop brouillon
  const onDragStart = (eleve, sourceStr, sourceIdx) => {
    setDragEleve({ eleve, sourceStr, sourceIdx });
  };

  const onDrop = (targetStr, targetIdx) => {
    if (!dragEleve) return;
    const { eleve, sourceStr, sourceIdx } = dragEleve;
    if (sourceStr === targetStr && sourceIdx === targetIdx) { setDragEleve(null); return; }

    const setter = (str) => str === 'CSC' ? setClassesCSC : setClassesCFR;
    const getter = (str) => str === 'CSC' ? classesCSC : classesCFR;

    // Retirer de la source
    const src = getter(sourceStr).map((c, i) => i === sourceIdx ? { ...c, eleves: c.eleves.filter(e => e.id !== eleve.id) } : c);
    // Ajouter dans la cible avec flag modifie_manuellement
    const eleveModifié = { ...eleve, modifie_manuellement: true };

    if (sourceStr === targetStr) {
      const updated = src.map((c, i) => i === targetIdx ? { ...c, eleves: [...c.eleves, eleveModifié] } : c);
      setter(sourceStr)(updated);
    } else {
      setter(sourceStr)(src);
      const tgt = getter(targetStr).map((c, i) => i === targetIdx ? { ...c, eleves: [...c.eleves, eleveModifié] } : c);
      setter(targetStr)(tgt);
    }
    setDragEleve(null);
  };

  const exporterPDF = (enc) => {
    if (!enc?.classes) return;
    const classesHTML = enc.classes.map(c => {
      const elevesHTML = (c.eleves || []).map((e, i) => `
        <tr>
          <td style="text-align:center;padding:4px 8px;color:#64748b">${i + 1}</td>
          <td style="padding:4px 8px;font-weight:600">${e.prenom || ''} ${(e.nom || '').toUpperCase()}</td>
          <td style="text-align:center;padding:4px 8px">${e.score_francais}</td>
          <td style="text-align:center;padding:4px 8px">${e.score_math}</td>
          <td style="text-align:center;padding:4px 8px;font-weight:700">${e.score_pondere}</td>
          <td style="text-align:center;padding:4px 8px">${e.flagge_plancher ? '<span style="color:#b91c1c;font-size:10px">⚠ Plancher</span>' : ''}</td>
        </tr>
      `).join('');
      const stats = calculerStats(c.eleves || []);
      return `
        <div style="margin-bottom:28px;break-inside:avoid">
          <div style="background:${c.structure==='CSC'?'#e0e7ff':'#dcfce7'};padding:10px 16px;border-radius:8px 8px 0 0;display:flex;align-items:center;gap:16px">
            <span style="font-weight:800;font-size:16px;color:${c.structure==='CSC'?'#3730a3':'#166534'}">${c.nom}</span>
            <span style="font-size:12px;color:#475569">${c.eleves?.length || 0} élève(s) / max ${c.capacite_max}</span>
            ${stats ? `<span style="font-size:11px;color:#64748b">Moy. Français: ${stats.moyenne_francais} | Éc.-type: ${stats.ecart_type} | Min-Max: ${stats.min}–${stats.max}</span>` : ''}
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr style="background:#f8fafc">
              <th style="padding:4px 8px;text-align:center;width:30px">#</th>
              <th style="padding:4px 8px;text-align:left">Élève</th>
              <th style="padding:4px 8px;text-align:center">Fr.</th>
              <th style="padding:4px 8px;text-align:center">Math</th>
              <th style="padding:4px 8px;text-align:center">Pondéré</th>
              <th style="padding:4px 8px;text-align:center">Note</th>
            </tr></thead>
            <tbody>${elevesHTML}</tbody>
          </table>
        </div>
      `;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${enc.nom}</title>
      <style>body{font-family:'Century Gothic',sans-serif;padding:24px;color:#1e293b}h1{font-size:20px;font-weight:800;margin-bottom:4px}p{font-size:12px;color:#64748b;margin:0 0 20px}@media print{body{padding:12px}}</style>
    </head><body>
      <h1>${enc.nom}</h1>
      <p>Session : ${SESSION_LABEL[enc.session_tcf] || enc.session_tcf} · Validé le ${new Date(enc.created_at).toLocaleDateString('fr-CH')} · ${enc.nb_eleves || ''} élève(s)</p>
      ${classesHTML}
    </body></html>`;

    const finalHtml = injectForcedPrintCss(html, 'A4 portrait', '12mm');
    openPrintPopup(finalHtml, { title: enc.nom, width: 1100, height: 820 });
  };

  // ─── Vues ────────────────────────────────────────────────────────────────────

  if (loading) return <div style={s.page}><PageLoader /></div>;

  // ── Vue détail ──
  if (view === 'detail' && detailEnc) {
    const classesCsc = (detailEnc.classes || []).filter(c => c.structure === 'CSC');
    const classesCfr = (detailEnc.classes || []).filter(c => c.structure === 'CFR');
    return (
      <div style={s.page}>
        <div style={s.header}>
          <button style={s.btnBack} onClick={() => setView('historique')}>← Historique</button>
          <div style={{ flex: 1 }}>
            <h1 style={s.titre}>{detailEnc.nom}</h1>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {SESSION_LABEL[detailEnc.session_tcf] || detailEnc.session_tcf} · Créé le {new Date(detailEnc.created_at).toLocaleDateString('fr-CH')} · {detailEnc.nb_eleves || ''} élève(s)
              {' · '}<span style={{ color: detailEnc.statut === 'archivé' ? '#94a3b8' : '#16a34a', fontWeight: 700 }}>{detailEnc.statut}</span>
            </div>
          </div>
          <button style={{ ...s.btnAction, background: '#6366f1' }} onClick={() => exporterPDF(detailEnc)}>🖨 Export PDF</button>
          {detailEnc.statut === 'validé' && <button style={{ ...s.btnAction, background: '#94a3b8' }} onClick={() => archiverEnclassement(detailEnc)}>📦 Archiver</button>}
          <button style={{ ...s.btnAction, background: '#ef4444' }} onClick={() => supprimerEnclassement(detailEnc.id)}>🗑 Supprimer</button>
        </div>
        {[{ label: 'CSC', classes: classesCsc, color: '#e0e7ff', textColor: '#3730a3' }, { label: 'CFR', classes: classesCfr, color: '#dcfce7', textColor: '#166534' }].map(({ label, classes, color, textColor }) => (
          classes.length > 0 && (
            <div key={label} style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: textColor, marginBottom: 12 }}>Structure {label}</h2>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {classes.map(c => {
                  const stats = calculerStats(c.eleves || []);
                  return (
                    <div key={c.id} style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', minWidth: 260, flex: 1 }}>
                      <div style={{ background: color, padding: '10px 16px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: textColor }}>{c.nom}</span>
                        <span style={{ fontSize: 12, color: '#475569' }}>{c.eleves?.length || 0}/{c.capacite_max}</span>
                        {stats && <span style={{ fontSize: 11, color: '#64748b' }}>Moy Fr: {stats.moyenne_francais}</span>}
                      </div>
                      <div style={{ padding: '8px 0' }}>
                        {(c.eleves || []).map((e, i) => (
                          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', borderBottom: i < c.eleves.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                            <span style={{ fontSize: 11, color: '#94a3b8', width: 18 }}>{i + 1}</span>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: 700, fontSize: 13 }}>{e.prenom} </span>
                              <span style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>{(e.nom || '').toUpperCase()}</span>
                              {e.flagge_plancher && <span style={s.badgePlancher}>⚠ Plancher</span>}
                              {e.modifie_manuellement && <span style={s.badgeManuel}>✏ Manuel</span>}
                            </div>
                            <span style={s.scoreChip}>{e.score_francais}</span>
                            <span style={s.scoreChip}>{e.score_math}</span>
                            <span style={{ ...s.scoreChip, fontWeight: 800, background: '#e0e7ff', color: '#3730a3' }}>{e.score_pondere}</span>
                          </div>
                        ))}
                        {(!c.eleves || c.eleves.length === 0) && <div style={{ padding: '12px 14px', color: '#94a3b8', fontSize: 12 }}>Aucun élève</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ))}
      </div>
    );
  }

  // ── Vue historique ──
  if (view === 'historique') {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <button style={s.btnBack} onClick={() => setView('init')}>← Nouvel enclassement</button>
          <h1 style={s.titre}>Historique des enclassements</h1>
        </div>
        {loadingHistorique && <PageLoader compact label="Chargement…" />}
        {loadingDetail && <PageLoader compact label="Chargement…" />}
        {!loadingHistorique && historique.length === 0 && !loadingDetail && <div style={{ ...s.content, ...s.empty }}>Aucun enclassement sauvegardé.</div>}
        {!loadingHistorique && historique.length > 0 && (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Nom</th>
                  <th style={s.th}>Session</th>
                  <th style={s.th}>Date</th>
                  <th style={s.th}>Auteur</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Élèves</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Classes</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Statut</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {historique.map(enc => (
                  <tr key={enc.id} style={s.tr}>
                    <td style={{ ...s.td, fontWeight: 700 }}>{enc.nom || '—'}</td>
                    <td style={s.td}>{SESSION_LABEL[enc.session_tcf] || enc.session_tcf}</td>
                    <td style={s.td}>{new Date(enc.created_at).toLocaleDateString('fr-CH')}</td>
                    <td style={s.td}>{enc.created_by_nom || '—'}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>{enc.nb_eleves}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>{enc.nb_classes}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <span style={{ ...s.badge, background: enc.statut === 'validé' ? '#dcfce7' : enc.statut === 'archivé' ? '#f1f5f9' : '#fef9c3', color: enc.statut === 'validé' ? '#166534' : enc.statut === 'archivé' ? '#64748b' : '#713f12' }}>
                        {enc.statut}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <button style={s.btnSmall} onClick={() => ouvrirDetail(enc)}>👁 Voir</button>
                      {enc.statut === 'validé' && <button style={{ ...s.btnSmall, background: '#f1f5f9', color: '#64748b' }} onClick={() => archiverEnclassement(enc)}>📦</button>}
                      <button style={{ ...s.btnSmall, background: '#fee2e2', color: '#991b1b' }} onClick={() => supprimerEnclassement(enc.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── Vue brouillon ──
  if (view === 'brouillon') {
    const renderClasse = (classe, structure, idx) => {
      const color = structure === 'CSC' ? '#e0e7ff' : '#dcfce7';
      const textColor = structure === 'CSC' ? '#3730a3' : '#166534';
      const stats = calculerStats(classe.eleves || []);
      return (
        <div key={idx}
          onDragOver={e => e.preventDefault()}
          onDrop={() => onDrop(structure, idx)}
          style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', minWidth: 250, flex: 1, border: '2px solid transparent' }}>
          <div style={{ background: color, padding: '10px 16px', borderRadius: '12px 12px 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: textColor }}>{classe.nom}</span>
              <span style={{ fontSize: 12, color: '#475569' }}>{classe.eleves.length}/{structure === 'CSC' ? 12 : 15}</span>
            </div>
            {stats && (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Moy Fr: {stats.moyenne_francais} · Éc.-type: {stats.ecart_type} · [{stats.min}–{stats.max}]
                {stats.nb_flaggues > 0 && <span style={{ color: '#b91c1c', marginLeft: 6 }}>⚠ {stats.nb_flaggues} plancher</span>}
              </div>
            )}
          </div>
          <div style={{ padding: '6px 0', minHeight: 40 }}>
            {classe.eleves.map((e, i) => (
              <div key={e.id}
                draggable
                onDragStart={() => onDragStart(e, structure, idx)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderBottom: i < classe.eleves.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'grab' }}>
                <span style={{ fontSize: 10, color: '#94a3b8', width: 16 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 12 }}>{e.prenom} </span>
                  <span style={{ fontSize: 12, color: '#475569' }}>{(e.nom || '').toUpperCase()}</span>
                  {e.flagge && <span style={s.badgePlancher}>⚠</span>}
                  {e.modifie_manuellement && <span style={s.badgeManuel}>✏</span>}
                </div>
                <span style={s.scoreChipSm}>{e.score_francais}</span>
                <span style={s.scoreChipSm}>{e.score_math}</span>
                <span style={{ ...s.scoreChipSm, fontWeight: 800, background: '#e0e7ff', color: '#3730a3' }}>{e.pondere}</span>
              </div>
            ))}
            {classe.eleves.length === 0 && <div style={{ padding: '10px 12px', color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>Glisser des élèves ici</div>}
          </div>
        </div>
      );
    };

    return (
      <div style={s.page}>
        <div style={s.header}>
          <button style={s.btnBack} onClick={() => setView('init')}>← Paramètres</button>
          <div style={{ flex: 1 }}>
            <input value={nomEnclassement} onChange={e => setNomEnclassement(e.target.value)}
              style={{ fontSize: 18, fontWeight: 800, border: 'none', background: 'transparent', outline: 'none', color: '#0f172a', width: '100%' }} />
          </div>
          <button style={{ ...s.btnAction, background: '#64748b' }} onClick={() => { calculer(); }}>🔄 Recalculer</button>
          <LoadingButton style={{ ...s.btnAction, background: '#10b981' }} onClick={valider} loading={saving} loadingLabel="Sauvegarde…">
            ✅ Valider et enregistrer
          </LoadingButton>
        </div>

        {alertes.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alertes.map((a, i) => (
              <div key={i} style={{ background: a.type === 'error' ? '#fee2e2' : '#fef9c3', color: a.type === 'error' ? '#991b1b' : '#713f12', padding: '8px 14px', borderRadius: 8, fontSize: 13 }}>
                {a.type === 'error' ? '❌' : '⚠'} {a.msg}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10, background: '#f8fafc', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
          <span style={{ color: '#475569' }}>Légende :</span>
          <span style={{ ...s.scoreChipSm }}>Fr</span> <span style={{ fontSize: 12 }}>Score français</span>
          <span style={{ ...s.scoreChipSm }}>Ma</span> <span style={{ fontSize: 12 }}>Score math</span>
          <span style={{ ...s.scoreChipSm, background: '#e0e7ff', color: '#3730a3' }}>P</span> <span style={{ fontSize: 12 }}>Score pondéré</span>
          <span style={s.badgePlancher}>⚠</span> <span style={{ fontSize: 12 }}>Seuil plancher</span>
        </div>

        {classesCSC.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#3730a3', marginBottom: 10 }}>Structure CSC — {classesCSC.reduce((s, c) => s + c.eleves.length, 0)} élève(s)</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {classesCSC.map((c, i) => renderClasse(c, 'CSC', i))}
            </div>
          </div>
        )}

        {classesCFR.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#166534', marginBottom: 10 }}>Structure CFR — {classesCFR.reduce((s, c) => s + c.eleves.length, 0)} élève(s)</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {classesCFR.map((c, i) => renderClasse(c, 'CFR', i))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Vue init (défaut) ──
  const elevesFiltrés = elevesAvecScores.filter(e => {
    if (!searchInit) return true;
    const s = searchInit.toLowerCase();
    return (e.nom || '').toLowerCase().includes(s) || (e.prenom || '').toLowerCase().includes(s);
  });

  const nbCSC = elevesAvecScores.filter(e => determinerStructure(e.score_francais || 0, e.score_math || 0, seuilPlancher, seuilPondere).structure === 'CSC').length;
  const nbCFR = elevesAvecScores.length - nbCSC;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.titre}>Enclassement</h1>
        <button style={{ ...s.btnAction, background: '#6366f1', marginLeft: 'auto' }} onClick={() => { setView('historique'); loadHistorique(); }}>
          📋 Historique ({historique.length})
        </button>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Panneau paramètres */}
        <div style={{ width: '100%', maxWidth: 320, flex: '1 1 240px', background: 'white', borderRadius: 14, padding: '20px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 16, marginTop: 0 }}>Paramètres</h2>

          <label style={s.label}>Session TCF source</label>
          <CustomSelect
            value={session}
            onChange={v => setSession(v)}
            options={SESSIONS.map(sess => ({ value: sess, label: SESSION_LABEL[sess] || sess }))}
            style={s.select}
          />

          <label style={s.label}>Seuil plancher français</label>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Si score français &lt; seuil → CSC forcé</div>
          <input type="number" value={seuilPlancher} onChange={e => setSeuilPlancher(Number(e.target.value))} style={s.input} />

          <label style={s.label}>Seuil score pondéré (CSC/CFR)</label>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>≤ seuil → CSC · &gt; seuil → CFR</div>
          <input type="number" value={seuilPondere} onChange={e => setSeuilPondere(Number(e.target.value))} style={s.input} />

          <label style={s.label}>Nombre de classes</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input type="checkbox" checked={autoClasses} onChange={e => setAutoClasses(e.target.checked)} id="autoClasses" />
            <label htmlFor="autoClasses" style={{ fontSize: 12, color: '#475569', cursor: 'pointer' }}>Calcul automatique</label>
          </div>
          {!autoClasses && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>CSC (max 12)</div>
                <input type="number" min="1" value={nbClassesCSC || nbCSCauto} onChange={e => setNbClassesCSC(Number(e.target.value))} style={s.input} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>CFR (max 15)</div>
                <input type="number" min="1" value={nbClassesCFR || nbCFRauto} onChange={e => setNbClassesCFR(Number(e.target.value))} style={s.input} />
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, background: '#f8fafc', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#475569' }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>Aperçu</div>
            <div>{elevesAvecScores.length} élève(s) avec scores TCF</div>
            <div style={{ color: '#3730a3' }}>→ CSC: {nbCSC} élève(s) → {nbCSCeffectif} classe(s)</div>
            <div style={{ color: '#166534' }}>→ CFR: {nbCFR} élève(s) → {nbCFReffectif} classe(s)</div>
            {elevesSansScores.length > 0 && <div style={{ color: '#b45309', marginTop: 4 }}>⚠ {elevesSansScores.length} élève(s) sans scores (exclus)</div>}
          </div>

          <button style={{ ...s.btnAction, background: '#6366f1', width: '100%', marginTop: 16, justifyContent: 'center' }}
            onClick={calculer} disabled={elevesAvecScores.length === 0}>
            ▶ Calculer l'enclassement
          </button>
        </div>

        {/* Liste élèves */}
        <div style={{ flex: '1 1 280px', minWidth: 0, background: 'white', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Élèves avec résultats TCF ({elevesAvecScores.length})
            </h2>
            <input placeholder="Rechercher…" value={searchInit} onChange={e => setSearchInit(e.target.value)}
              style={{ ...s.input, marginBottom: 0, marginLeft: 'auto', width: 'min(160px, 100%)', minWidth: 120 }} />
          </div>

          {loading ? (
            <PageLoader label="Chargement…" compact style={{ padding: 32 }} />
          ) : elevesAvecScores.length === 0 ? (
            <div style={{ padding: 32, color: '#94a3b8', textAlign: 'center', fontSize: 14 }}>
              Aucun élève avec scores TCF pour la session « {SESSION_LABEL[session] || session} ».<br />
              <span style={{ fontSize: 12 }}>Vérifiez que des résultats ont été saisis dans le module TCF.</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Élève</th>
                  <th style={{ ...s.th, textAlign: 'center', width: 70 }}>Fr.</th>
                  <th style={{ ...s.th, textAlign: 'center', width: 70 }}>Math</th>
                  <th style={{ ...s.th, textAlign: 'center', width: 80 }}>Pondéré</th>
                  <th style={{ ...s.th, textAlign: 'center', width: 80 }}>Structure</th>
                  <th style={{ ...s.th, width: 80 }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {elevesFiltrés.map(e => {
                  const fr = e.score_francais || 0;
                  const math = e.score_math || 0;
                  const res = determinerStructure(fr, math, seuilPlancher, seuilPondere);
                  return (
                    <tr key={e.id} style={s.tr}>
                      <td style={s.td}>
                        <span style={{ fontWeight: 700 }}>{e.prenom} </span>
                        <span style={{ color: '#475569' }}>{(e.nom || '').toUpperCase()}</span>
                      </td>
                      <td style={{ ...s.td, textAlign: 'center' }}>{fr}</td>
                      <td style={{ ...s.td, textAlign: 'center' }}>{math}</td>
                      <td style={{ ...s.td, textAlign: 'center', fontWeight: 700 }}>{res.pondere}</td>
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        <span style={{ ...s.badge, background: res.structure === 'CSC' ? '#e0e7ff' : '#dcfce7', color: res.structure === 'CSC' ? '#3730a3' : '#166534' }}>
                          {res.structure}
                        </span>
                      </td>
                      <td style={s.td}>
                        {res.flagge && <span style={s.badgePlancher}>⚠ Plancher</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  page: { minHeight: '100%', boxSizing: 'border-box', background: '#f8fafc', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif", padding: '28px 32px' },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' },
  titre: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 },
  btnBack: { padding: '8px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#475569' },
  btnAction: { padding: '8px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 6 },
  content: { background: 'white', borderRadius: 14, padding: 32, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  empty: { color: '#94a3b8', fontSize: 15, textAlign: 'center', padding: '40px 0' },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, marginTop: 14 },
  input: { width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', marginBottom: 0, outline: 'none', fontFamily: 'inherit' },
  select: { width:'100%', height:36, padding:'0 14px', boxSizing:'border-box', borderRadius:8, border:'1px solid #c7d2fe', background:'white', color:'#1e293b', fontWeight:400, fontSize:13, outline:'none', cursor:'pointer', fontFamily:'inherit' },
  tableWrap: { background: 'white', borderRadius: 14, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#6366f1' },
  th: { padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'white', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: 'none', background: '#6366f1', position: 'static', top: 'auto', zIndex: 'auto', boxShadow: 'none' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '10px 14px', fontSize: 13, verticalAlign: 'middle' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 },
  badgePlancher: { display: 'inline-block', background: '#fee2e2', color: '#b91c1c', padding: '1px 6px', borderRadius: 99, fontSize: 10, fontWeight: 700, marginLeft: 4 },
  badgeManuel: { display: 'inline-block', background: '#fef9c3', color: '#713f12', padding: '1px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600, marginLeft: 4 },
  scoreChip: { display: 'inline-block', background: '#f1f5f9', color: '#1e293b', padding: '2px 7px', borderRadius: 6, fontSize: 12, fontWeight: 600, minWidth: 28, textAlign: 'center' },
  scoreChipSm: { display: 'inline-block', background: '#f1f5f9', color: '#1e293b', padding: '1px 5px', borderRadius: 5, fontSize: 11, fontWeight: 600, minWidth: 24, textAlign: 'center' },
  btnSmall: { padding: '4px 8px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#e0e7ff', color: '#3730a3', marginRight: 4 },
};
