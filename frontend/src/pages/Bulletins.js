import React, { useState, useEffect } from 'react';
import apiClient from '../lib/apiClient';
import { getSessionUser } from '../utils/session';
import { isAdmin } from '../utils/permissions';
import { injectForcedPrintCss, openPrintPopup } from '../utils/print';
import CustomSelect from '../components/CustomSelect';
import { PageLoader, LoadingButton } from '../components/LoadingUI';


const fmtNote = (n) => {
  if (n === null || n === undefined) return '—';
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  return num % 1 === 0 ? String(Math.round(num)) : String(parseFloat(num.toFixed(1)));
};
const nomSansSuffixe = (nom) => String(nom || '').split('-')[0].trim();
const cycleCouleur = (v) => (v === '' || v === 'rouge' ? 'vert' : v === 'vert' ? 'orange' : 'rouge');

const BULLETIN_CRITERES_LABELS = [
  ["Venir", "à l'école"],
  ["Être", "à l'heure"],
  ["Respecter", "les règles"],
  ["Participer", "en classe"],
  ["Écouter", "les consignes"],
  ["Parler", "français"],
  ["Travailler", "sans déranger"],
  ["Faire", "les devoirs"],
  ["Respecter", "le matériel"],
  ["Organiser", "le classeur"],
];

export default function Bulletins() {
  const [classes, setClasses] = useState([]);
  const [classeSelectionnee, setClasseSelectionnee] = useState('');
  const [classeObj, setClasseObj] = useState(null);
  const [ecoleParams, setEcoleParams] = useState({});
  const [onglet, setOnglet] = useState('comportements');
  const [bulletinSemestre, setBulletinSemestre] = useState('1');
  const [bulletins, setBulletins] = useState([]);
  const [bulletinStatsPresences, setBulletinStatsPresences] = useState([]);
  const [bulletinCriteres, setBulletinCriteres] = useState([]);
  const [criteresLocaux, setCriteresLocaux] = useState([]);
  const [criteresModifies, setCriteresModifies] = useState(false);
  const [criteresValides, setCriteresValides] = useState(false);
  const [bulletinsSem1, setBulletinsSem1] = useState([]);
  const [bulletinsSem2, setBulletinsSem2] = useState([]);
  const [criteresSem1, setCriteresSem1] = useState([]);
  const [criteresSem2, setCriteresSem2] = useState([]);
  const [remarqueModal, setRemarqueModal] = useState(null);
  const [bulletinPopupEleve, setBulletinPopupEleve] = useState(null);
  const [niveauFiltre, setNiveauFiltre] = useState('tous');
  const [chargement, setChargement] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const headers = {};
  const currentUser = getSessionUser() || {};

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 2200);
  };

  useEffect(() => {
    chargerClasses();
    chargerParametresEcole();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement initial
  }, []);

  const chargerClasses = async () => {
    try {
      const res = await apiClient.get('/classes', { headers });
      setClasses(res.data || []);
    } catch {}
  };

  const chargerParametresEcole = async () => {
    try {
      const res = await apiClient.get('/parametres/ecole', { headers });
      setEcoleParams(res.data || {});
    } catch {}
  };

  const chargerBulletinId = async (classeId, sem) => {
    setChargement(true);
    try {
      const semVal = sem !== undefined ? sem : bulletinSemestre;
      const [bulletinRes, statsRes, criteresRes, bS1, bS2, cr1, cr2] = await Promise.all([
        apiClient.get('/notes/bulletin?classe_id=' + classeId + '&semestre=' + semVal, { headers }),
        apiClient.get('/presences/statistiques?classe_id=' + classeId + (() => {
          const today = new Date();
          const annee = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
          return semVal === '1'
            ? `&date_debut=${annee}-08-01&date_fin=${annee}-12-31`
            : `&date_debut=${annee+1}-01-01&date_fin=${annee+1}-06-30`;
        })(), { headers }),
        apiClient.get('/notes/bulletin-criteres?classe_id=' + classeId + '&semestre=' + semVal, { headers }),
        apiClient.get('/notes/bulletin?classe_id=' + classeId + '&semestre=1', { headers }),
        apiClient.get('/notes/bulletin?classe_id=' + classeId + '&semestre=2', { headers }),
        apiClient.get('/notes/bulletin-criteres?classe_id=' + classeId + '&semestre=1', { headers }),
        apiClient.get('/notes/bulletin-criteres?classe_id=' + classeId + '&semestre=2', { headers }),
      ]);
      const bulletinData = bulletinRes.data || [];
      setBulletins(bulletinData);
      setBulletinStatsPresences(statsRes.data || []);
      const criteresData = criteresRes.data || [];
      setBulletinCriteres(criteresData);
      setCriteresLocaux(criteresData);
      setCriteresModifies(false);
      const activeEleveIds = new Set(bulletinData.map(b => Number(b.eleve.id)));
      const criteresActifs = criteresData.filter(cr => activeEleveIds.has(Number(cr.eleve_id)));
      setCriteresValides(activeEleveIds.size > 0 && criteresActifs.length === activeEleveIds.size && criteresActifs.every(cr => cr.valide === true));
      setBulletinsSem1(bS1.data || []);
      setBulletinsSem2(bS2.data || []);
      setCriteresSem1(cr1.data || []);
      setCriteresSem2(cr2.data || []);
    } catch (err) { console.error(err); }
    finally { setChargement(false); }
  };

  const ouvrirClasse = async (cl) => {
    setClasseObj(cl);
    setClasseSelectionnee(cl.id);
    setBulletinSemestre('1');
    setOnglet('comportements');
    await chargerBulletinId(cl.id, '1');
  };

  const mettreAJourCritereLocal = (eleveId, patch) => {
    setCriteresLocaux(prev => {
      const exists = prev.find(c => Number(c.eleve_id) === Number(eleveId));
      if (exists) return prev.map(c => Number(c.eleve_id) === Number(eleveId) ? { ...c, ...patch } : c);
      return [...prev, { eleve_id: eleveId, ...patch }];
    });
    setCriteresModifies(true);
    setCriteresValides(false);
  };

  const validerCriteres = () => {
    if (criteresValides) {
      setCriteresLocaux(prev => prev.map(cr => ({ ...cr, valide: false })));
      setCriteresModifies(true);
      setCriteresValides(false);
      return;
    }
    const tousRemplis = bulletins.every(b => {
      const cr = criteresLocaux.find(c => Number(c.eleve_id) === Number(b.eleve.id)) || {};
      return [1,2,3,4,5,6,7,8,9,10].every(n => cr['c'+n] && cr['c'+n] !== '');
    });
    if (!tousRemplis) { alert('Tous les critères de comportement doivent avoir une couleur avant de valider.'); return; }
    const avertissements = [];
    for (const b of bulletins) {
      const cr = criteresLocaux.find(c => Number(c.eleve_id) === Number(b.eleve.id)) || {};
      const st = bulletinStatsPresences.find(s => Number(s.eleve_id) === Number(b.eleve.id));
      const presents = Number(st?.presents) || 0, retards = Number(st?.retards) || 0;
      const absents = Number(st?.absents) || 0, excuses = Number(st?.excuses) || 0, conges = Number(st?.conges) || 0;
      const total = presents + absents + retards + excuses + conges;
      const taux = total > 0 ? Math.round(((presents + retards) / total) * 1000) / 10 : null;
      const couleurTaux = taux == null ? null : taux < 70 ? 'rouge' : taux < 80 ? 'orange' : null;
      const couleurRetards = retards > 6 ? 'rouge' : retards > 3 ? 'orange' : null;
      const nom = `${b.eleve.nom} ${b.eleve.prenom}`;
      if (couleurTaux && cr.c1 !== couleurTaux) avertissements.push(`${nom} : "Venir à l'école" doit être ${couleurTaux} (taux ${taux}%)`);
      if (couleurRetards && cr.c2 !== couleurRetards) avertissements.push(`${nom} : "Être à l'heure" doit être ${couleurRetards} (${retards} retards)`);
      if ((cr.remarques || '').includes('Suspension de scolarité') && cr.c3 !== 'rouge') avertissements.push(`${nom} : "Respecter les règles" doit être rouge`);
    }
    if (avertissements.length > 0) { alert('⚠ Incohérences détectées :\n\n' + avertissements.join('\n') + '\n\nCorrigez ces critères avant de valider.'); return; }
    setCriteresLocaux(prev => prev.map(cr => ({ ...cr, valide: true })));
    setCriteresModifies(true);
    setCriteresValides(true);
  };

  const sauvegarderTousCriteres = async () => {
    if (!criteresValides) { showToast('Veuillez valider les critères avant de sauvegarder.', 'info'); return; }
    if (!criteresModifies) { showToast('Aucun changement à sauvegarder.', 'info'); return; }
    setSaving(true);
    try {
      for (const b of bulletins) {
        const cr = criteresLocaux.find(c => Number(c.eleve_id) === Number(b.eleve.id)) || {};
        await apiClient.put('/notes/bulletin-criteres/' + b.eleve.id, {
          classe_id: classeSelectionnee, semestre: bulletinSemestre,
          c1: cr.c1||null, c2: cr.c2||null, c3: cr.c3||null, c4: cr.c4||null, c5: cr.c5||null,
          c6: cr.c6||null, c7: cr.c7||null, c8: cr.c8||null, c9: cr.c9||null, c10: cr.c10||null,
          remarques: cr.remarques||null, valide: true,
        }, { headers });
      }
      setBulletinCriteres([...criteresLocaux]);
      setCriteresModifies(false);
      showToast('Changements sauvegardés.', 'info');
    } finally {
      setSaving(false);
    }
  };

  // ===== CLASS SELECTION =====
  const classesVisibles = isAdmin()
    ? classes.filter(c => c.actif !== false)
    : classes.filter(c => c.actif !== false && String(c.prof_principal_id) === String(currentUser.id));
  const niveaux = ['tous', ...([...new Set(classesVisibles.map(c => c.niveau).filter(Boolean))].sort())];
  const classesFiltrees = niveauFiltre === 'tous' ? classesVisibles : classesVisibles.filter(c => c.niveau === niveauFiltre);

  const classeNom = classeObj?.nom || '';

  // ===== BULLETIN POPUP VARIABLES =====
  const renderBulletinPopup = () => {
    if (!bulletinPopupEleve) return null;
    const critValide = bulletinCriteres.find(c => Number(c.eleve_id) === Number(bulletinPopupEleve))?.valide;
    const bdS1 = bulletinsSem1.find(b => b.eleve.id === bulletinPopupEleve);
    const bdS2 = bulletinsSem2.find(b => b.eleve.id === bulletinPopupEleve);
    const eleveInfo = bdS1?.eleve || bdS2?.eleve;
    const cr1 = criteresSem1.find(c => Number(c.eleve_id) === Number(bulletinPopupEleve)) || {};
    const cr2 = criteresSem2.find(c => Number(c.eleve_id) === Number(bulletinPopupEleve)) || {};
    const st = bulletinStatsPresences.find(s => Number(s.eleve_id) === Number(bulletinPopupEleve));
    const pm1 = bdS1?.parMatiere || {};
    const pm2 = bdS2?.parMatiere || {};
    const allNames = [...new Set([...Object.keys(pm1), ...Object.keys(pm2)])].sort();
    const principales = allNames.filter(n => Number((pm1[n] || pm2[n] || {}).coefficient || 1) >= 2);
    const secondaires = allNames.filter(n => Number((pm1[n] || pm2[n] || {}).coefficient || 1) < 2);
    const moyBr = (names, pm) => { const w = names.filter(n => pm[n]?.moyenne != null); return w.length ? w.reduce((a, n) => a + parseFloat(pm[n].moyenne || 0), 0) / w.length : null; };
    const moyP1 = moyBr(principales, pm1); const moyP2 = moyBr(principales, pm2);
    const moyS1 = moyBr(secondaires, pm1); const moyS2 = moyBr(secondaires, pm2);
    const allN = [...principales, ...secondaires];
    const moyG1 = moyBr(allN, pm1); const moyG2 = moyBr(allN, pm2);
    const moyAnn = moyG1 != null && moyG2 != null ? (moyG1 + moyG2) / 2 : null;
    const obs1 = cr1.remarques && String(cr1.remarques).trim() ? `1er sem. : ${cr1.remarques}` : null;
    const obs2 = cr2.remarques && String(cr2.remarques).trim() ? `2e sem. : ${cr2.remarques}` : null;
    const dot = (v) => v ? <span style={{ width: 11, height: 11, borderRadius: '50%', display: 'inline-block', background: v === 'vert' ? '#22c55e' : v === 'orange' ? '#f97316' : '#ef4444' }} /> : <span style={{ color: '#aaa' }}>—</span>;
    const tblBorder = { border: '1px solid #c7d2fe' };
    const font = 'Century Gothic, CenturyGothic, AppleGothic, sans-serif';
    const thL = { ...s.th, border: 'none', textAlign: 'left', fontFamily: font };
    const thC = { ...s.th, border: 'none', textAlign: 'center', width: 44, whiteSpace: 'nowrap', fontFamily: font };
    const tdC = { ...s.td, border: 'none', textAlign: 'center', padding: '4px 6px', fontFamily: font };
    const tdL = { ...s.td, border: 'none', fontFamily: font };
    const niveauCl = String(classeObj?.niveau || '').toUpperCase();
    const cleNiv = niveauCl.includes('CSC') ? 'CSC' : niveauCl.includes('CFR') ? 'CFR' : niveauCl.includes('EPL') ? 'EPL' : '';
    const respNiveauNom = cleNiv === 'CSC' ? (ecoleParams.responsable_niveau_csc || '') : cleNiv === 'CFR' ? (ecoleParams.responsable_niveau_cfr || '') : cleNiv === 'EPL' ? (ecoleParams.responsable_niveau_epl || '') : '';
    const respCoursNom = ecoleParams.responsable_langues_jeunes || '';

    return (
      <div className="modal-overlay" style={s.overlay} onClick={() => setBulletinPopupEleve(null)}>
        <div style={{ ...s.modal, maxWidth: 900, width: '95vw', maxHeight: '90vh', overflowY: 'auto', fontFamily: font }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
            <button onClick={() => setBulletinPopupEleve(null)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Fermer</button>
            <button onClick={() => {
              const node = document.getElementById('bulletin-popup-pdf');
              if (!node) return;
              const html = `<html><head><title>Bulletin de notes</title><style>@import url('https://fonts.googleapis.com/css2?family=Century+Gothic&display=swap');@page{size:A4;margin:15mm;}*{box-sizing:border-box;print-color-adjust:exact;-webkit-print-color-adjust:exact;}body{font-family:'Century Gothic',CenturyGothic,AppleGothic,sans-serif;margin:0;color:#111;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #e2e8f0;padding:6px 8px;font-size:11px;}th{background:#eef2ff;font-weight:700;}tr:nth-child(even){background:#f8fafc;}span[style*="border-radius: 50%"],span[style*="border-radius:50%"]{display:inline-block!important;print-color-adjust:exact;-webkit-print-color-adjust:exact;}#bulletin-popup-pdf{min-height:calc(297mm - 30mm);display:flex;flex-direction:column;padding:0;}.bulletin-bas-page{margin-top:auto;padding-top:30px;}.bulletin-titre-eleve{margin-bottom:100px!important;}</style></head><body>${node.outerHTML}</body></html>`;
              const finalHtml = injectForcedPrintCss(html, 'A4 portrait', '15mm');
              openPrintPopup(finalHtml, { title: 'Bulletin de notes', width: 1000, height: 800 });
            }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #6366f1', background: '#6366f1', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Imprimer</button>
          </div>
          {!critValide ? (
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '16px 20px', color: '#92400e', fontSize: 14, fontWeight: 600 }}>
              ⚠ Les critères de comportement de cet élève n'ont pas encore été validés. Le bulletin ne peut pas être affiché.
            </div>
          ) : !eleveInfo ? (
            <div style={{ color: '#aaa', fontSize: 13 }}>Aucune donnée disponible.</div>
          ) : (
            <div id="bulletin-popup-pdf">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <img src="/logo-etat-du-valais.png" alt="" style={{ width: 32, height: 'auto', objectFit: 'contain', backgroundColor: 'white', padding: 2 }} />
                  <div style={{ fontSize: 10, lineHeight: 1.4, color: '#334155', fontFamily: font }}>
                    <div>Département de la santé, des affaires sociales et de la culture</div>
                    <div>Service de l'action sociale — Office de l'asile</div>
                    <div>Centre de formation "Le Botza"</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#475569', fontFamily: font }}>Vétroz, le {new Date().toLocaleDateString('fr-CH')}</div>
              </div>
              <div className="bulletin-titre-eleve" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 30, marginBottom: 30 }}>
                <div style={{ fontWeight: 900, fontSize: 18, fontFamily: font }}>BULLETIN DE NOTES</div>
                <div style={{ textAlign: 'right', fontFamily: font }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{eleveInfo.nom} {eleveInfo.prenom}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{classeNom}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <table style={{ ...s.tbl, ...tblBorder, width: '100%', tableLayout: 'fixed' }}>
                    <thead><tr style={s.theadRow}><th style={thL}>Branches principales</th><th style={thC}>S1</th><th style={thC}>S2</th></tr></thead>
                    <tbody>
                      {principales.length === 0 && <tr><td colSpan={3} style={{ ...tdL, color: '#aaa' }}>—</td></tr>}
                      {principales.map(nom => (<tr key={nom} style={s.tr}><td style={tdL}>{nom}</td><td style={tdC}>{pm1[nom]?.moyenne != null ? fmtNote(pm1[nom].moyenne) : '—'}</td><td style={tdC}>{pm2[nom]?.moyenne != null ? fmtNote(pm2[nom].moyenne) : '—'}</td></tr>))}
                      <tr style={{ ...s.tr, background: '#eef2ff', fontWeight: 700 }}><td style={tdL}>Moyenne</td><td style={tdC}>{moyP1 != null ? fmtNote(moyP1) : '—'}</td><td style={tdC}>{moyP2 != null ? fmtNote(moyP2) : '—'}</td></tr>
                    </tbody>
                  </table>
                  <table style={{ ...s.tbl, ...tblBorder, width: '100%', tableLayout: 'fixed' }}>
                    <thead><tr style={s.theadRow}><th style={thL}>Branches secondaires</th><th style={thC}>S1</th><th style={thC}>S2</th></tr></thead>
                    <tbody>
                      {secondaires.length === 0 && <tr><td colSpan={3} style={{ ...tdL, color: '#aaa' }}>—</td></tr>}
                      {secondaires.map(nom => (<tr key={nom} style={s.tr}><td style={tdL}>{nom}</td><td style={tdC}>{pm1[nom]?.moyenne != null ? fmtNote(pm1[nom].moyenne) : '—'}</td><td style={tdC}>{pm2[nom]?.moyenne != null ? fmtNote(pm2[nom].moyenne) : '—'}</td></tr>))}
                      <tr style={{ ...s.tr, background: '#eef2ff', fontWeight: 700 }}><td style={tdL}>Moyenne</td><td style={tdC}>{moyS1 != null ? fmtNote(moyS1) : '—'}</td><td style={tdC}>{moyS2 != null ? fmtNote(moyS2) : '—'}</td></tr>
                      <tr><td colSpan={3} style={{ height: 12, padding: 0, border: 'none', background: 'white' }}></td></tr>
                      <tr style={{ ...s.tr, background: '#eef2ff', fontWeight: 700 }}><td style={tdL}>Moyenne semestrielle</td><td style={tdC}>{moyG1 != null ? fmtNote(moyG1) : '—'}</td><td style={tdC}>{moyG2 != null ? fmtNote(moyG2) : '—'}</td></tr>
                      <tr><td colSpan={3} style={{ height: 6, padding: 0, border: 'none', background: 'white' }}></td></tr>
                      <tr style={{ ...s.tr, background: '#eef2ff', fontWeight: 700 }}><td style={tdL}>Moyenne annuelle</td><td style={{ ...tdC, fontWeight: 900, color: '#6366f1' }} colSpan={2}>{moyAnn != null ? fmtNote(moyAnn) : '—'}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <table style={{ ...s.tbl, ...tblBorder, width: '100%', tableLayout: 'fixed', flex: 1, height: '100%' }}>
                    <thead><tr style={s.theadRow}><th style={thL}>Comportement</th><th style={{ ...thC, width: 32 }}>S1</th><th style={{ ...thC, width: 32 }}>S2</th></tr></thead>
                    <tbody style={{ height: '100%' }}>
                      {BULLETIN_CRITERES_LABELS.map((label, idx) => (<tr key={idx} style={{ ...s.tr, height: '1px' }}><td style={{ ...tdL, fontSize: 11 }}>{label.join(' ')}</td><td style={tdC}>{dot(cr1['c' + (idx + 1)])}</td><td style={tdC}>{dot(cr2['c' + (idx + 1)])}</td></tr>))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ marginTop: 15, fontFamily: font, fontSize: 12, padding: '6px 0' }}>
                Abs. excusées : <b>{st?.excuses ?? 0}</b> &nbsp;|&nbsp; Non excusées : <b>{st?.absents ?? 0}</b> &nbsp;|&nbsp; Retards : <b>{st?.retards ?? 0}</b>
              </div>
              <div style={{ ...s.card, marginTop: 15, padding: 8, fontFamily: font }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Observations</div>
                {obs1 && <div style={{ fontSize: 11 }}>{obs1}</div>}
                {obs2 && <div style={{ fontSize: 11 }}>{obs2}</div>}
                {!obs1 && !obs2 && <div style={{ fontSize: 11, color: '#aaa' }}>—</div>}
              </div>
              <div className="bulletin-bas-page">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontFamily: font }}>
                  {[
                    { label: 'Titulaire', nom: [classeObj?.prof_prenom, classeObj?.prof_nom].filter(Boolean).join(' ') },
                    { label: 'Responsable de niveau', nom: respNiveauNom },
                    { label: 'Responsable des cours', nom: respCoursNom },
                  ].map(({ label, nom }, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ borderTop: '0.5px solid #000', marginBottom: 6 }}></div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>{label}</div>
                      {nom && <div style={{ fontSize: 11, color: '#334155' }}>{nom}</div>}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid #e2e8f0', marginTop: 20, paddingTop: 8, fontSize: 11, color: '#64748b', fontFamily: font }}>
                  <img src="/logo-pied-page.png" alt="" style={{ height: 19, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                  <span>Zone Industrielle 4, 1963 Vétroz<br />Tél. 027 606 18 60</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===== CLASSE SELECTION VIEW =====
  if (!classeSelectionnee) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <h2 style={s.titre}>Bulletins de notes</h2>
        </div>
        <div className="mobile-tabs-bar" style={s.tabsBar}>
          {niveaux.map(n => (
            <button key={n} onClick={() => setNiveauFiltre(n)}
              style={{ ...s.tabBtn, width: 90, minWidth: 90, ...(niveauFiltre === n ? s.tabBtnActif : {}) }}>
              {n === 'tous' ? 'Toutes' : n}
            </button>
          ))}
        </div>
        <div style={{ ...s.tblWrap, marginTop: 15 }}>
          <table style={{ ...s.tbl, tableLayout: 'auto' }}>
            <thead>
              <tr style={s.theadRow}>
                <th style={{ ...s.th, width: 1 }}></th>
                <th style={{ ...s.th, width: 1, whiteSpace: 'nowrap' }}>Classe</th>
                <th style={{ ...s.th, width: 1, whiteSpace: 'nowrap' }}>Niveau</th>
                <th style={s.th}>Titulaire</th>
              </tr>
            </thead>
            <tbody>
              {classesFiltrees.length === 0 ? (
                <tr><td colSpan={4} style={s.vide}>Aucune classe disponible.</td></tr>
              ) : classesFiltrees.map((cl, i) => (
                <tr key={cl.id} style={{ ...s.tr, background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                  <td style={{ ...s.td, width: 1 }}>
                    <button style={s.btnDetail} onClick={() => ouvrirClasse(cl)}>👁 Détail</button>
                  </td>
                  <td style={{ ...s.td, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', width: 1 }}>{cl.nom}</td>
                  <td style={{ ...s.td, whiteSpace: 'nowrap', width: 1 }}>{cl.niveau || '—'}</td>
                  <td style={s.td}>{cl.prof_prenom || cl.prof_nom ? [cl.prof_prenom, cl.prof_nom].filter(Boolean).join(' ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ===== DETAIL VIEW =====
  const titulaireNom = classeObj ? [classeObj.prof_prenom, classeObj.prof_nom].filter(Boolean).join(' ') || '—' : '—';

  // Compute all students for the bulletin tab
  const seen = new Set();
  const allEleves = [];
  for (const b of [...bulletinsSem1, ...bulletinsSem2]) {
    if (!seen.has(b.eleve.id)) { seen.add(b.eleve.id); allEleves.push(b.eleve); }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.btnRetour} onClick={() => { setClasseSelectionnee(''); setClasseObj(null); }}>← Retour</button>
        <h2 style={s.titre}>{onglet === 'comportements' ? 'Comportements' : 'Bulletins de notes'} — {classeNom}</h2>
        {onglet === 'comportements' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {toast.message && (
              <span style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 8, background: '#ede9fe', color: '#4c1d95' }}>
                {toast.message}
              </span>
            )}
            <button onClick={validerCriteres}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 99, border: '2px solid ' + (criteresValides ? '#10b981' : '#e2e8f0'), background: criteresValides ? '#ecfdf5' : 'white', color: criteresValides ? '#059669' : '#64748b', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: criteresValides ? '#10b981' : '#e2e8f0', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 2, left: criteresValides ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'all 0.2s' }}></div>
              </div>
              {criteresValides ? 'Critères validés' : 'Valider les critères'}
            </button>
            <LoadingButton loading={saving} loadingLabel="En cours de sauvegarde…" onClick={sauvegarderTousCriteres}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: '#6366f1', color: 'white' }}>
              💾 Sauvegarder
            </LoadingButton>
          </div>
        )}
      </div>

      {/* Main tabs */}
      <div className="mobile-tabs-bar" style={s.tabsBar}>
        {[['comportements', 'Comportements'], ['bulletin', 'Bulletins de notes']].map(([k, l]) => (
          <button key={k} onClick={async () => {
            if (onglet === 'comportements' && k !== 'comportements' && criteresModifies && criteresValides) await sauvegarderTousCriteres();
            setOnglet(k);
          }} style={{ ...s.tabBtn, ...(onglet === k ? s.tabBtnActif : {}) }}>{l}</button>
        ))}
      </div>

      {/* Semestre sub-tabs (comportements only) */}
      {onglet === 'comportements' && (
        <div style={s.subTabsBar}>
          {[{ id: '1', label: '1er semestre' }, { id: '2', label: '2e semestre' }].map(sem => (
            <button key={sem.id}
              onClick={async () => {
                if (criteresModifies && criteresValides) await sauvegarderTousCriteres();
                setBulletinSemestre(sem.id);
                chargerBulletinId(classeSelectionnee, sem.id);
              }}
              style={{ ...s.subTabBtn, ...(bulletinSemestre === sem.id ? s.subTabBtnActif : {}) }}>
              {sem.label}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      {onglet === 'comportements' && (
        <div style={{ marginTop: 15, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Titulaire : {titulaireNom}</div>
          <button type="button"
            style={{ padding: '8px 16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            onClick={() => { for (const b of bulletins) mettreAJourCritereLocal(b.eleve.id, { c1:'vert',c2:'vert',c3:'vert',c4:'vert',c5:'vert',c6:'vert',c7:'vert',c8:'vert',c9:'vert',c10:'vert' }); }}>
            Tout mettre au vert
          </button>
        </div>
      )}

      {/* === COMPORTEMENTS TAB === */}
      {onglet === 'comportements' && (
        <>
            <div style={{ ...s.tableContainer, marginBottom: 24 }}>
              <table style={{ ...s.tbl, fontSize: 12, tableLayout: 'auto' }}>
                <thead>
                  <tr style={s.theadRow}>
                    <th style={{ ...s.th, whiteSpace: 'nowrap', width: 1 }}>Élève</th>
                    {BULLETIN_CRITERES_LABELS.map((label, i) => (
                      <th key={i} style={{ ...s.th, textAlign: 'center', verticalAlign: 'bottom', padding: '4px 2px', height: 110 }} title={label.join(' ')}>
                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'pre-line', fontSize: 11, fontWeight: 700, lineHeight: 1.6, margin: '0 auto' }}>{label[0] + '\n' + label[1]}</div>
                      </th>
                    ))}
                    <th style={{ ...s.th, textAlign: 'center', verticalAlign: 'bottom', padding: '4px 2px', height: 110 }}>
                      <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'pre-line', fontSize: 11, fontWeight: 700, lineHeight: 1.6, margin: '0 auto' }}>{'Taux\nprés.'}</div>
                    </th>
                    <th style={{ ...s.th, textAlign: 'center', verticalAlign: 'bottom', padding: '4px 2px', height: 110 }}>
                      <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 11, fontWeight: 700, lineHeight: 1.6, margin: '0 auto' }}>Retard</div>
                    </th>
                    <th style={{ ...s.th, width: 96, textAlign: 'center' }}>Rem.</th>
                  </tr>
                </thead>
                <tbody>
                  {chargement ? (
                    <tr><td colSpan={14}><PageLoader compact label="Chargement…" /></td></tr>
                  ) : bulletins.length === 0 ? (
                    <tr><td colSpan={14} style={s.vide}>Aucun élève</td></tr>
                  ) : bulletins.map((b, idx) => {
                    const st = bulletinStatsPresences.find(s => Number(s.eleve_id) === Number(b.eleve.id));
                    const cr = criteresLocaux.find(c => Number(c.eleve_id) === Number(b.eleve.id)) || {};
                    const presents = Number(st?.presents)||0, retards = Number(st?.retards)||0;
                    const absents = Number(st?.absents)||0, excuses = Number(st?.excuses)||0, conges = Number(st?.conges)||0;
                    const total = presents + absents + retards + excuses + conges;
                    const taux = total > 0 ? Math.round(((presents + retards) / total) * 1000) / 10 : null;
                    const tauxBg = taux == null ? {} : taux < 70 ? {color:'#b91c1c'} : taux < 80 ? {color:'#c2410c'} : {};
                    const retardsBg = retards > 6 ? {color:'#b91c1c'} : retards > 3 ? {color:'#c2410c'} : {};
                    return (
                      <tr key={b.eleve.id} style={{ ...s.tr, background: idx % 2 === 0 ? 'white' : '#fafbfc' }}>
                        <td style={{ ...s.td, whiteSpace: 'nowrap', width: 1 }}><b>{b.eleve.nom}</b> {b.eleve.prenom}</td>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => {
                          const key = 'c' + n;
                          const val = cr[key] || '';
                          return (
                            <td key={key} style={{ ...s.td, padding: 4, textAlign: 'center', cursor: 'pointer' }} title={BULLETIN_CRITERES_LABELS[n-1].join(' ')}
                              onClick={() => mettreAJourCritereLocal(b.eleve.id, { [key]: cycleCouleur(val) })}>
                              {val ? <span style={{ width: 14, height: 14, borderRadius: '50%', display: 'inline-block', background: val === 'vert' ? '#22c55e' : val === 'orange' ? '#f97316' : '#ef4444' }} /> : '—'}
                            </td>
                          );
                        })}
                        <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, ...tauxBg }}>{taux != null ? taux + '%' : '—'}</td>
                        <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, ...retardsBg }}>{retards > 0 ? retards : (st?.retards != null ? st.retards : '—')}</td>
                        <td style={{ ...s.td, textAlign: 'center', padding: 4 }}>
                          <button type="button"
                            onClick={() => {
                              const existing = cr.remarques || '';
                              const sel = [];
                              const prm = { transfertVerseClasse: '', transfertDepuisSuite: 'au TCF', transfertDepuisDate: '', suspensionDu: '', suspensionAu: '' };
                              if (existing.includes('Arrêt de scolarité')) sel.push('arret');
                              if (existing.includes('Transfert vers une autre classe')) { sel.push('transfertVers'); const m = existing.match(/Transfert vers une autre classe\s*:\s*([^.]+)/); if (m) prm.transfertVerseClasse = m[1].trim(); }
                              if (existing.includes('dans cette classe suite')) { sel.push('transfertDepuis'); const sm = existing.match(/suite\s+(au TCF|au conseil de classe|à la demande du titulaire)/); if (sm) prm.transfertDepuisSuite = sm[1]; const dm = existing.match(/suite.*le\s+(\d{2}\.\d{2}\.\d{4})/); if (dm) { const p = dm[1].split('.'); prm.transfertDepuisDate = `${p[2]}-${p[1]}-${p[0]}`; } }
                              if (existing.includes('Suspension de scolarité')) { sel.push('suspension'); const dm = existing.match(/du\s+(\d{2}\.\d{2}\.\d{4})/); const am = existing.match(/au\s+(\d{2}\.\d{2}\.\d{4})/); if (dm) { const p = dm[1].split('.'); prm.suspensionDu = `${p[2]}-${p[1]}-${p[0]}`; } if (am) { const p = am[1].split('.'); prm.suspensionAu = `${p[2]}-${p[1]}-${p[0]}`; } }
                              if (existing.includes('Participation aux ateliers')) sel.push('ateliers');
                              setRemarqueModal({ eleveId: b.eleve.id, nom: b.eleve.nom, prenom: b.eleve.prenom, selected: sel, params: prm });
                            }}
                            style={{ padding: '3px 8px', fontSize: 11, borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: cr.remarques ? '#ede9fe' : 'white', color: cr.remarques ? '#4c1d95' : '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {cr.remarques ? 'Modifier' : '+ Ajouter'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          {/* Remarque modal */}
          {remarqueModal && (() => {
            const REMARQUES_CONFIG = [
              { key: 'arret', label: 'Arrêt de scolarité.' },
              { key: 'transfertVers', label: 'Transfert vers une autre classe :', hasClassInput: true },
              { key: 'transfertDepuis', label: 'Transféré(e) dans cette classe suite…', hasSuiteSelect: true, hasDate: true },
              { key: 'suspension', label: 'Suspension de scolarité du … au …', hasDateDu: true, hasDateAu: true },
              { key: 'ateliers', label: "Participation aux ateliers, certaines évaluations n'ont pas été effectuées." },
            ];
            const { selected, params } = remarqueModal;
            const toggle = (key) => setRemarqueModal(prev => ({ ...prev, selected: prev.selected.includes(key) ? prev.selected.filter(k => k !== key) : [...prev.selected, key] }));
            const setParam = (key, val) => setRemarqueModal(prev => ({ ...prev, params: { ...prev.params, [key]: val } }));
            const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-CH') : '___';
            const buildText = () => {
              const parts = [];
              if (selected.includes('arret')) parts.push('Arrêt de scolarité.');
              if (selected.includes('transfertVers')) parts.push(`Transfert vers une autre classe : ${params.transfertVerseClasse || '___'}.`);
              if (selected.includes('transfertDepuis')) parts.push(`Transféré(e) dans cette classe suite ${params.transfertDepuisSuite} le ${fmtDate(params.transfertDepuisDate)}.`);
              if (selected.includes('suspension')) parts.push(`Suspension de scolarité du ${fmtDate(params.suspensionDu)} au ${fmtDate(params.suspensionAu)}.`);
              if (selected.includes('ateliers')) parts.push("Participation aux ateliers, certaines évaluations n'ont pas été effectuées.");
              return parts.join(' ');
            };
            const previewText = buildText();
            const inStyle = { padding: '6px 10px', borderRadius: 6, border: '1px solid #6366f1', fontSize: 13, outline: 'none', background: 'white' };
            return (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500 }}
                onClick={() => setRemarqueModal(null)}>
                <div style={{ width: 'min(580px, 94vw)', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 15px 40px rgba(0,0,0,0.18)', padding: 20, maxHeight: '90vh', overflowY: 'auto' }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: '#1e293b' }}>Remarques — {remarqueModal.nom} {remarqueModal.prenom}</div>
                  <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e', marginBottom: 14, fontStyle: 'italic' }}>⚠ Seules les remarques prédéfinies ci-dessous sont autorisées.</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {REMARQUES_CONFIG.map(cfg => {
                      const isSel = selected.includes(cfg.key);
                      return (
                        <div key={cfg.key}>
                          <button type="button" onClick={() => toggle(cfg.key)}
                            style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 7, border: `2px solid ${isSel ? '#6366f1' : '#e2e8f0'}`, background: isSel ? '#ede9fe' : '#f8fafc', color: isSel ? '#4c1d95' : '#334155', fontSize: 13, cursor: 'pointer', fontWeight: isSel ? 700 : 400, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSel ? '#6366f1' : '#cbd5e1'}`, background: isSel ? '#6366f1' : 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {isSel && <span style={{ color: 'white', fontSize: 10, fontWeight: 900 }}>✓</span>}
                            </span>
                            {cfg.label}
                          </button>
                          {isSel && cfg.hasClassInput && (<div style={{ padding: '6px 12px 4px 36px' }}><input type="text" placeholder="Nom de la classe..." value={params.transfertVerseClasse} onChange={e => setParam('transfertVerseClasse', e.target.value)} style={{ ...inStyle, width: '100%', boxSizing: 'border-box' }} /></div>)}
                          {isSel && cfg.hasSuiteSelect && (<div style={{ padding: '6px 12px 4px 36px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><CustomSelect value={params.transfertDepuisSuite} onChange={v => setParam('transfertDepuisSuite', v)} options={[{ value: 'au TCF', label: 'au TCF' }, { value: 'au conseil de classe', label: 'au conseil de classe' }, { value: 'à la demande du titulaire', label: 'à la demande du titulaire' }]} style={inStyle} /><span style={{ fontSize: 13, color: '#475569' }}>le</span><input type="date" value={params.transfertDepuisDate} onChange={e => setParam('transfertDepuisDate', e.target.value)} style={inStyle} /></div>)}
                          {isSel && cfg.hasDateDu && (<div style={{ padding: '6px 12px 4px 36px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><span style={{ fontSize: 13, color: '#475569' }}>Du</span><input type="date" value={params.suspensionDu} onChange={e => setParam('suspensionDu', e.target.value)} style={inStyle} /><span style={{ fontSize: 13, color: '#475569' }}>au</span><input type="date" value={params.suspensionAu} onChange={e => setParam('suspensionAu', e.target.value)} style={inStyle} /></div>)}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#475569', marginBottom: 14, minHeight: 40 }}>
                    <span style={{ fontWeight: 700 }}>Aperçu : </span>
                    {previewText ? <span style={{ color: '#1e293b' }}>{previewText}</span> : <span style={{ fontStyle: 'italic' }}>Aucune remarque sélectionnée</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    {selected.length > 0 && (<button onClick={() => setRemarqueModal(prev => ({ ...prev, selected: [], params: { transfertVerseClasse: '', transfertDepuisSuite: 'au TCF', transfertDepuisDate: '', suspensionDu: '', suspensionAu: '' } }))} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Effacer tout</button>)}
                    <button onClick={() => setRemarqueModal(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Annuler</button>
                    <button onClick={() => { mettreAJourCritereLocal(remarqueModal.eleveId, { remarques: previewText }); setRemarqueModal(null); }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Enregistrer</button>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* === BULLETIN TAB === */}
      {onglet === 'bulletin' && (
        <div style={{ marginTop: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={s.subTabsBar}>
              {[{ id: '1', label: 'Semestre 1' }, { id: '2', label: 'Semestre 2' }].map(sem => (
                <button key={sem.id} style={{ ...s.subTabBtn, borderRadius: 8, ...(bulletinSemestre === sem.id ? s.subTabBtnActif : {}) }}
                  onClick={() => { setBulletinSemestre(sem.id); chargerBulletinId(classeSelectionnee, sem.id); }}>
                  {sem.label}
                </button>
              ))}
            </div>
            <button style={{ ...s.btnDetail, background: '#6366f1', color: 'white', padding: '7px 14px' }}
              onClick={() => {
                const elevesAImprimer = allEleves.filter(e => {
                  const cr = bulletinCriteres.find(c => Number(c.eleve_id) === Number(e.id));
                  return cr?.valide;
                });
                if (elevesAImprimer.length === 0) { alert('Aucun bulletin validé à imprimer.'); return; }
                elevesAImprimer.forEach(e => setBulletinPopupEleve(e.id));
              }}>
              🖨️ Tout imprimer
            </button>
          </div>
          <div style={{ ...s.tblWrap }}>
              <table style={{ ...s.tbl, tableLayout: 'auto' }}>
                <thead>
                  <tr style={s.theadRow}>
                    <th style={{ ...s.th, width: 170, minWidth: 170, whiteSpace: 'nowrap' }}>Nom</th>
                    <th style={{ ...s.th, width: 170, minWidth: 170, whiteSpace: 'nowrap' }}>Prénom</th>
                    <th style={{ ...s.th, textAlign: 'center' }}>Critères validés</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Bulletin</th>
                  </tr>
                </thead>
                <tbody>
                  {chargement ? (
                    <tr><td colSpan={4}><PageLoader compact label="Chargement…" /></td></tr>
                  ) : allEleves.length === 0 ? (
                    <tr><td colSpan={4} style={s.vide}>Aucun bulletin disponible pour cette classe.</td></tr>
                  ) : allEleves.map((eleve, i) => {
                    const crS1 = criteresSem1.find(c => Number(c.eleve_id) === Number(eleve.id));
                    const crS2 = criteresSem2.find(c => Number(c.eleve_id) === Number(eleve.id));
                    const valideS1 = crS1?.valide === true;
                    const valideS2 = crS2?.valide === true;
                    const valide = bulletinSemestre === '1' ? valideS1 : valideS2;
                    return (
                      <tr key={eleve.id} style={{ ...s.tr, background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                        <td style={{ ...s.td, fontWeight: 700, width: 170, minWidth: 170, whiteSpace: 'nowrap' }}>{nomSansSuffixe(eleve.nom)}</td>
                        <td style={{ ...s.td, width: 170, minWidth: 170, whiteSpace: 'nowrap' }}>{eleve.prenom}</td>
                        <td style={{ ...s.td, textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: valide ? '#22c55e' : '#e2e8f0', verticalAlign: 'middle', marginRight: 6 }} />
                          <span style={{ fontSize: 12, color: valide ? '#16a34a' : '#94a3b8' }}>{valide ? 'Validé' : 'Non validé'}</span>
                        </td>
                        <td style={{ ...s.td, textAlign: 'right' }}>
                          <button style={s.btnDetail} onClick={() => setBulletinPopupEleve(eleve.id)}>👁 Détail</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        </div>
      )}

      {renderBulletinPopup()}
    </div>
  );
}

const s = {
  page: { padding: '28px 32px', background: '#f8fafc', minHeight: '100%', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif' },
  tabsBar: { display: 'flex', alignItems: 'flex-end', gap: 0, borderBottom: '2px solid #6366f1', paddingBottom: 0 },
  tabBtn: { padding: '9px 14px', borderRadius: '10px 10px 0 0', border: 'none', background: '#ede9fe', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#5b21b6', outline: 'none', lineHeight: '1', position: 'relative', zIndex: 1, width: 160, minWidth: 160, textAlign: 'center' },
  tabBtnActif: { background: '#6366f1', color: 'white', border: 'none', marginBottom: -1, zIndex: 2, boxShadow: '0 -1px 6px rgba(99,102,241,0.28)' },
  subTabsBar: { display: 'flex', gap: 0, marginTop: 0 },
  subTabBtn: { padding: '9px 14px', borderRadius: '0 0 10px 10px', fontSize: 14, background: '#e0e7ff', color: '#3730a3', fontWeight: 700, width: 160, minWidth: 160, textAlign: 'center', border: 'none', cursor: 'pointer', outline: 'none', position: 'relative', zIndex: 1, lineHeight: 1 },
  subTabBtnActif: { background: '#4f46e5', color: 'white', zIndex: 2, boxShadow: '0 4px 6px rgba(79,70,229,0.18)' },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 45, flexWrap: 'wrap', minHeight: 40 },
  btnRetour: { padding: '8px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#475569' },
  titre: { fontSize: 22, fontWeight: 800, flex: 1, color: '#0f172a', margin: 0 },
  tblWrap: { overflow: 'hidden', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  tableContainer: { overflow: 'hidden', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  tbl: { width: '100%', borderCollapse: 'collapse', background: 'white' },
  theadRow: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f8fafc' },
  td: { padding: '10px 14px', fontSize: 13, color: '#374151' },
  vide: { padding: 40, textAlign: 'center', color: '#94a3b8', background: 'white' },
  btnDetail: { padding: '5px 10px', background: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  card: { background: 'white', borderRadius: 12, padding: 18, border: '1px solid #f1f5f9' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', borderRadius: 14, padding: 28, maxWidth: 520, width: '95%', boxShadow: '0 16px 48px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' },
};
