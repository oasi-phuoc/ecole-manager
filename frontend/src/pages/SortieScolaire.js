/* eslint-disable */
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TimePicker from '../components/TimePicker';
import { injectForcedPrintCss, openPrintPopup } from '../utils/print';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';
const getHeaders = () => { const u = JSON.parse(localStorage.getItem('user') || '{}'); return { Authorization: `Bearer ${u.token}` }; };

const ONGLETS = [
  { id: 'automne', label: 'Automne' },
  { id: 'juin',    label: 'Juin' },
  { id: 'autres',  label: 'Autres' },
  { id: 'suivi',   label: 'Tableau de suivi' },
];

const LIEUX_PREDEFINIS = ['Sion, Synecom', 'Vétroz, Botza'];

const FORM_VIDE = {
  type: 'juin', classes_ids: [], classes_noms: '', titulaires: '', autres_accompagnants: '', autres_acc_arr: [],
  date_sortie: '', destination: '', activites: '',
  lieu_depart: '', lieu_depart_autre: '',
  heure_depart: '', lieu_retour: '', lieu_retour_autre: '', heure_retour: '',
  budget: '', commentaires: '',
};

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('fr-CH');
};


const fmtHeure = (h) => {
  if (!h) return '';
  return String(h).substring(0, 5);
};

export default function SortieScolaire() {
  const navigate = useNavigate();
  const [sorties, setSorties] = useState([]);
  const [classes, setClasses] = useState([]);
  const [profs, setProfs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VIDE);
  const [editId, setEditId] = useState(null);
  const [showAddTit, setShowAddTit] = useState(false);
  const [suiviClasseSelect, setSuiviClasseSelect] = useState(null);
  const [showSuivi, setShowSuivi] = useState(false);
  const [rechercheSorties, setRechercheSorties] = useState('');
  const [showTriTypes, setShowTriTypes] = useState(false);
  const [triType, setTriType] = useState('Tous');

  const charger = async () => {
    try {
      const [sortiesRes, classesRes, profsRes] = await Promise.all([
        axios.get(API + '/sorties', { headers: getHeaders() }),
        axios.get(API + '/classes', { headers: getHeaders() }),
        axios.get(API + '/profs', { headers: getHeaders() }),
      ]);
      setSorties(sortiesRes.data || []);
      setClasses(classesRes.data || []);
      setProfs(profsRes.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { charger(); }, []);
  useEffect(() => {
    setSuiviClasseSelect(null);
  }, []);

  // Toggle classe sélectionnée
  const toggleClasse = (cl) => {
    const ids = form.classes_ids || [];
    const isSelected = ids.includes(String(cl.id));
    let newIds;
    if (isSelected) {
      newIds = ids.filter(id => id !== String(cl.id));
    } else {
      newIds = [...ids, String(cl.id)];
    }
    // Auto-fill titulaires from selected classes
    const selectedClasses = classes.filter(c => newIds.includes(String(c.id)));
    const titList = [...new Set(
      selectedClasses
        .map(c => c.prof_prenom && c.prof_nom ? `${c.prof_prenom} ${c.prof_nom}` : null)
        .filter(Boolean)
    )].join(' et ');
    const nomsStr = selectedClasses.map(c => c.nom).join(', ');
    setForm(f => ({ ...f, classes_ids: newIds, classes_noms: nomsStr, titulaires: titList }));
  };

  const ouvrirNouvelle = () => {
    setForm({ ...FORM_VIDE, type: 'autres' });
    setEditId(null);
    setShowForm(true);
  };

  const ouvrirEdit = (s) => {
    const ids = s.classes_ids ? s.classes_ids.split(',').map(x => x.trim()).filter(Boolean) : [];
    const lieuDepart = LIEUX_PREDEFINIS.includes(s.lieu_depart) ? s.lieu_depart : (s.lieu_depart ? 'autre' : '');
    setForm({
      type: s.type || 'autres',
      classes_ids: ids,
      classes_noms: s.classes_noms || '',
      titulaires: s.titulaires || '',
      autres_accompagnants: s.autres_accompagnants || '',
      autres_acc_arr: (s.autres_accompagnants || '').split(' et ').filter(Boolean),
      date_sortie: s.date_sortie ? s.date_sortie.split('T')[0] : '',
      destination: s.destination || '',
      activites: s.activites || '',
      lieu_depart: lieuDepart,
      lieu_depart_autre: lieuDepart === 'autre' ? (s.lieu_depart || '') : '',
      heure_depart: fmtHeure(s.heure_depart),
      lieu_retour: LIEUX_PREDEFINIS.includes(s.lieu_retour) ? s.lieu_retour : (s.lieu_retour ? 'autre' : ''),
      lieu_retour_autre: LIEUX_PREDEFINIS.includes(s.lieu_retour) ? '' : (s.lieu_retour || ''),
      heure_retour: fmtHeure(s.heure_retour),
      budget: s.budget || '',
      commentaires: s.commentaires || '',
    });
    setEditId(s.id);
    setShowForm(true);
  };

  const sauvegarder = async (e) => {
    e.preventDefault();
    if (!form.classes_ids || form.classes_ids.length === 0) {
      alert('Veuillez sélectionner au moins une classe.');
      return;
    }
    const lieuDepart = form.lieu_depart === 'autre' ? form.lieu_depart_autre : form.lieu_depart;
    if (!String(lieuDepart || '').trim()) {
      alert('Le lieu de départ est obligatoire.');
      return;
    }
    if (!String(form.heure_depart || '').trim()) {
      alert("L'heure de départ est obligatoire.");
      return;
    }
    const lieuRetour = form.lieu_retour === 'autre' ? form.lieu_retour_autre : form.lieu_retour;
    if (!String(lieuRetour || '').trim()) {
      alert('Le lieu de retour est obligatoire.');
      return;
    }
    if (!String(form.heure_retour || '').trim()) {
      alert("L'heure de retour est obligatoire.");
      return;
    }
    const payload = {
      ...form,
      classes_ids: (form.classes_ids || []).join(','),
      lieu_depart: lieuDepart,
      lieu_retour: lieuRetour,
    };
    try {
      if (editId) {
        await axios.put(API + '/sorties/' + editId, payload, { headers: getHeaders() });
      } else {
        await axios.post(API + '/sorties', payload, { headers: getHeaders() });
      }
      setShowForm(false);
      charger();
    } catch (err) { console.error(err); }
  };

  const supprimer = async (id) => {
    if (!window.confirm('Supprimer cette sortie ?')) return;
    await axios.delete(API + '/sorties/' + id, { headers: getHeaders() });
    charger();
  };

  const toggleApprouve = async (s) => {
    try {
      const ids = s.classes_ids || '';
      await axios.put(API + '/sorties/' + s.id, { ...s, classes_ids: ids, approuve: !s.approuve }, { headers: getHeaders() });
      charger();
    } catch (err) { console.error(err); }
  };

  const imprimer = (s) => {
    const publicBase = `${window.location.origin}${process.env.PUBLIC_URL || ''}`;
    const classesNoms = s.classes_noms || [s.classe1, s.classe2].filter(Boolean).join(' et ') || '—';
    const html = `<!DOCTYPE html><html><head>
    <meta charset="UTF-8"/>
    <title>Sortie scolaire</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Century Gothic', CenturyGothic, 'Apple Gothic', sans-serif; padding: 18mm 18mm 32mm 18mm; color: #1e293b; font-size: 10pt; }
      .entete { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #e2e8f0; font-size: 7pt; line-height: 1.7; }
      .entete-gauche { display: flex; align-items: flex-start; gap: 10px; }
      .scai { font-size: 17pt; font-weight: 800; color: #1e293b; line-height: 1; }
      .entete-droite { text-align: right; }
      .titre { text-align: center; font-size: 22pt; font-weight: 700; margin: 22pt 0 20pt 0; border-bottom: 2px solid #1e293b; padding-bottom: 8pt; }
      table.f { width: 100%; border-collapse: collapse; margin-bottom: 10pt; }
      table.f td { border: 1px solid #b0b0b0; padding: 6pt 10pt; vertical-align: top; font-size: 10pt; }
      table.f td.lbl { font-style: italic; color: #374151; width: 34%; font-size: 9.5pt; }
      table.f td.val { min-height: 14pt; white-space: pre-wrap; }
      .sep { height: 8pt; }
      .approve { display: flex; justify-content: flex-end; align-items: flex-end; gap: 16px; margin-top: 30pt; }
      .approve-label { font-size: 11pt; font-weight: 600; }
      .approve-sig { text-align: right; font-size: 10pt; }
      .approve-line { border-bottom: 1px solid #1e293b; width: 220px; margin-bottom: 4px; }
      .footer { position: fixed; bottom: 8mm; left: 18mm; right: 18mm; display: flex; align-items: center; gap: 12px; font-size: 6.5pt; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    </style></head><body>
    <div class="entete">
      <div class="entete-gauche">
        <img src="${publicBase}/logo-etat-du-valais.png" style="width:36px;" onerror="this.style.display='none'" />
        <div>
          <div>Département de la santé, des affaires sociales et de la culture</div>
          <div>Service de l'action sociale</div>
          <div>Office de l'asile</div>
          <div>Centre de formation "Le Botza"</div>
        </div>
      </div>
      <div class="entete-droite">
        <div class="scai">SCAI</div>
        <div style="font-size:8pt;font-weight:700;color:#374151">${new Date().getFullYear()}</div>
        <div style="font-size:7pt;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em">CLASSE D'ACCUEIL</div>
      </div>
    </div>

    <div class="titre">Sortie scolaire</div>

    <table class="f">
      <tr><td class="lbl">Classes</td><td class="val">${classesNoms}</td></tr>
      <tr><td class="lbl">Titulaires</td><td class="val">${s.titulaires || ''}</td></tr>
      <tr><td class="lbl">Autres accompagnants</td><td class="val">${s.autres_accompagnants || ''}</td></tr>
    </table>
    <div class="sep"></div>
    <table class="f">
      <tr><td class="lbl">Date de la sortie</td><td class="val">${fmtDate(s.date_sortie)}</td></tr>
    </table>
    <div class="sep"></div>
    <table class="f">
      <tr><td class="lbl">Destination</td><td class="val" style="min-height:30pt">${s.destination || ''}</td></tr>
      <tr><td class="lbl">Activités</td><td class="val" style="min-height:60pt">${(s.activites || '').replace(/\n/g, '<br/>')}</td></tr>
    </table>
    <div class="sep"></div>
    <table class="f">
      <tr><td class="lbl">Lieu de départ</td><td class="val">${s.lieu_depart || ''}</td></tr>
      <tr><td class="lbl">Heure de départ</td><td class="val">${fmtHeure(s.heure_depart)}</td></tr>
    </table>
    <div class="sep"></div>
    <table class="f">
      <tr><td class="lbl">Lieu de retour</td><td class="val">${s.lieu_retour || ''}</td></tr>
      <tr><td class="lbl">Heure de retour</td><td class="val">${fmtHeure(s.heure_retour)}</td></tr>
    </table>
    <div class="sep"></div>
    <table class="f">
      <tr><td class="lbl">Budget</td><td class="val">${s.budget ? parseFloat(s.budget).toFixed(2) + ' CHF' : ''}</td></tr>
    </table>
    <div class="sep"></div>
    <table class="f">
      <tr><td class="lbl">Commentaires</td><td class="val" style="min-height:64pt">${(s.commentaires || '').replace(/\n/g, '<br/>')}</td></tr>
    </table>

    <div class="approve">
      <div class="approve-label">Approuvé par :</div>
      <div class="approve-sig">
        <div class="approve-line"></div>
        <div>Responsable, Didier Joris</div>
      </div>
    </div>

    <div class="footer">
      <img src="${publicBase}/logo-pied-page.png" style="height:28px;object-fit:contain;" onerror="this.style.display='none'" />
      <span>Zone Industrielle 4, 1963 Vétroz &nbsp;·&nbsp; Tél. 027 606 18 60</span>
    </div>
    </body></html>`;
    const finalHtml = injectForcedPrintCss(html, 'A4 portrait', '18mm 18mm 32mm 18mm');
    openPrintPopup(finalHtml, { title: 'Sortie scolaire', width: 820, height: 900 });
  };

  const sortiesOnglet = sorties
    .filter(s => {
      if (triType === 'Tous') return true;
      return (s.type || '').toLowerCase() === triType.toLowerCase();
    })
    .filter((s) => {
      const q = rechercheSorties.trim().toLowerCase();
      if (!q) return true;
      const zone = [
        s.classes_noms || '',
        s.titulaires || '',
        s.autres_accompagnants || '',
        s.destination || '',
        s.activites || '',
        s.commentaires || '',
        s.lieu_depart || '',
        s.lieu_retour || '',
      ].join(' ').toLowerCase();
      return zone.includes(q);
    });
  // Classes sorted by nom
  const classesSorted = [...classes].sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));

  return (
    <div style={st.page}>
      {/* Header */}
      <div style={st.header}>
        <h1 style={st.titre}>Gestion des sorties scolaires</h1>
        <button style={{ ...st.btnAdd }} onClick={ouvrirNouvelle}>+ Ajouter</button>
      </div>
      <div style={st.searchRow}>
        <input
          style={st.searchInput}
          value={rechercheSorties}
          onChange={(e) => setRechercheSorties(e.target.value)}
          placeholder="Rechercher professeur, classe, destination..."
        />
        <button
          type="button"
          onClick={() => setShowSuivi(v => !v)}
          style={{ padding: '7px 14px', borderRadius: 17, border: '1.5px solid ' + (showSuivi ? '#6366f1' : '#e2e8f0'), background: showSuivi ? '#e0e7ff' : 'white', cursor: 'pointer', fontWeight: 600, color: showSuivi ? '#4338ca' : '#94a3b8', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap', width: 140, textAlign: 'center' }}
        >
          {showSuivi ? 'Masquer suivi' : 'Afficher suivi'}
        </button>
        {!showTriTypes ? (
          <button type="button" style={st.btnTri} onClick={() => setShowTriTypes(true)}>Trier</button>
        ) : (
          <div style={st.toggleGroup}>
            {['Tous', 'Juin', 'Autres'].map((t) => (
              <button
                key={t}
                type="button"
                style={{ ...st.toggleBtn, ...(triType === t ? st.toggleBtnActif : {}) }}
                onClick={() => { setTriType(t); if (t === 'Tous') setShowTriTypes(false); }}
              >
                {t === 'Tous' ? 'Trier' : t}
              </button>
            ))}
          </div>
        )}
      </div>

      {showSuivi && (
        <div style={{ marginTop: 16 }}>
          <SuiviProfClasse sorties={sortiesOnglet} classes={classes} profs={profs} />
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <SuiviTable
          sorties={sortiesOnglet}
          onEdit={ouvrirEdit}
          onDelete={supprimer}
          onPrint={imprimer}
          onToggleApprouve={toggleApprouve}
        />
      </div>

      {/* Form popup */}
      {showForm && (
        <div style={st.overlay} onClick={() => setShowForm(false)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <div style={st.modalHeader}>
              <h3 style={st.modalTitre}>{editId ? 'Modifier' : 'Nouvelle'} sortie scolaire</h3>
              <button style={st.btnClose} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={sauvegarder}>

              {/* Type */}
              <div style={st.formSection}>Type</div>
              <div style={st.typeToggleWrap}>
                {['juin', 'autres'].map(t => (
                  <button key={t} type="button"
                    style={{ ...st.typeToggleBtn, ...(form.type === t ? st.typeToggleBtnActif : {}) }}
                    onClick={() => setForm({ ...form, type: t })}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* Classes */}
              <div style={st.formSection}>Classes *</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 6, marginBottom: 12 }}>
                {classesSorted.map(cl => {
                  const sel = (form.classes_ids || []).includes(String(cl.id));
                  return (
                    <button key={cl.id} type="button"
                      onClick={() => toggleClasse(cl)}
                      style={{
                        padding: '6px 10px', borderRadius: 20, border: `2px solid ${sel ? '#6366f1' : '#e2e8f0'}`,
                        background: sel ? '#6366f1' : 'white', color: sel ? 'white' : '#475569',
                        fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .12s', textAlign: 'center',
                      }}>
                      {cl.nom}
                    </button>
                  );
                })}
              </div>

              {/* Titulaires */}
              <div style={st.field}>
                <label style={st.lbl}>Titulaires <span style={{ color: '#94a3b8', fontWeight: 400 }}>(auto-rempli)</span></label>
                <input style={st.inp} value={form.titulaires} onChange={e => setForm({...form, titulaires: e.target.value})} placeholder="Titulaires des classes sélectionnées" />
              </div>

              {/* Autres accompagnants + bouton Ajouter */}
              {(() => {
                const autresArr = (form.autres_accompagnants || '').split(' et ').map(s => s.trim()).filter(Boolean);
                const tousProfs = profs.filter(p => p.prenom && p.nom).map(p => `${p.prenom} ${p.nom}`).sort((a,b) => a.localeCompare(b,'fr'));
                const profsDispos = tousProfs.filter(p => !autresArr.includes(p));
                const addAutre = (nom) => {
                  const nouveau = autresArr.length > 0 ? `${form.autres_accompagnants} et ${nom}` : nom;
                  setForm(f => ({ ...f, autres_accompagnants: nouveau }));
                  setShowAddTit(false);
                };
                return (
                  <div style={st.field}>
                    <label style={st.lbl}>Autres accompagnants</label>
                    <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
                      <input style={{ ...st.inp, flex: 1 }} value={form.autres_accompagnants} onChange={e => setForm({...form, autres_accompagnants: e.target.value})} placeholder="Autres accompagnants non-titulaires" />
                      <button type="button"
                        onClick={() => setShowAddTit(v => !v)}
                        style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #6366f1', background: '#e0e7ff', color: '#4f46e5', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        + Ajouter
                      </button>
                      {showAddTit && profsDispos.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 220, maxHeight: 220, overflowY: 'auto' }}>
                          {profsDispos.map(p => (
                            <div key={p} onClick={() => addAutre(p)}
                              style={{ padding: '9px 16px', cursor: 'pointer', fontSize: 13, color: '#1e293b', borderBottom: '1px solid #f8fafc' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#e0e7ff'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              {p}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Programme */}
              <div style={st.formSection}>Programme</div>
              <div style={st.field}><label style={st.lbl}>Date de la sortie *</label><input style={st.inp} type="date" required value={form.date_sortie} onChange={e => setForm({...form, date_sortie: e.target.value})} /></div>
              <div style={st.field}><label style={st.lbl}>Destination *</label><input style={st.inp} required value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} placeholder="Ex: Château de Valère, Sion" /></div>
              <div style={st.field}><label style={st.lbl}>Activités</label><textarea style={{...st.inp, height: 80, resize: 'vertical'}} value={form.activites} onChange={e => setForm({...form, activites: e.target.value})} placeholder="Détail des activités..." /></div>

              {/* Déplacement — chaque ligne = lieu (flex 1) + heure (fixe droite) */}
              <div style={st.formSection}>Déplacement</div>

              {/* Ligne départ */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={st.lbl}>Lieu de départ *</label>
                  <div style={st.toggleGroup}>
                    {[...LIEUX_PREDEFINIS, 'autre'].map((lieu) => (
                      <button key={lieu} type="button"
                        onClick={() => setForm({...form, lieu_depart: lieu, ...(lieu !== 'autre' ? { lieu_depart_autre: '' } : {})})}
                        style={{ ...st.toggleBtn, ...(form.lieu_depart === lieu ? st.toggleBtnActif : {}) }}>
                        {lieu === 'autre' ? 'Autre' : lieu}
                      </button>
                    ))}
                  </div>
                  {form.lieu_depart === 'autre' && (
                    <input style={{ ...st.inp, marginTop: 6, width: '100%', boxSizing: 'border-box' }} value={form.lieu_depart_autre}
                      onChange={e => setForm({...form, lieu_depart_autre: e.target.value})}
                      placeholder="Saisir le lieu de départ..." autoFocus />
                  )}
                </div>
                <div style={{ width: 170 }}>
                  <label style={st.lbl}>Heure de départ *</label>
                  <TimePicker value={form.heure_depart} onChange={e => setForm({...form, heure_depart: e.target.value})} style={{ ...st.inp, cursor: 'pointer' }} />
                </div>
              </div>

              {/* Ligne retour — heure toujours alignée avec lieu retour */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={st.lbl}>Lieu de retour *</label>
                  <div style={st.toggleGroup}>
                    {[...LIEUX_PREDEFINIS, 'autre'].map((lieu) => (
                      <button key={`retour-${lieu}`} type="button"
                        onClick={() => setForm({...form, lieu_retour: lieu, ...(lieu !== 'autre' ? { lieu_retour_autre: '' } : {})})}
                        style={{ ...st.toggleBtn, ...(form.lieu_retour === lieu ? st.toggleBtnActif : {}) }}>
                        {lieu === 'autre' ? 'Autre' : lieu}
                      </button>
                    ))}
                  </div>
                  {form.lieu_retour === 'autre' && (
                    <input style={{ ...st.inp, marginTop: 6, width: '100%', boxSizing: 'border-box' }} value={form.lieu_retour_autre}
                      onChange={e => setForm({...form, lieu_retour_autre: e.target.value})}
                      placeholder="Saisir le lieu de retour..." />
                  )}
                </div>
                <div style={{ width: 170 }}>
                  <label style={st.lbl}>Heure de retour *</label>
                  <TimePicker value={form.heure_retour} onChange={e => setForm({...form, heure_retour: e.target.value})} style={{ ...st.inp, cursor: 'pointer' }} />
                </div>
              </div>

              {/* Finances */}
              <div style={st.formSection}>Finances</div>
              <div style={st.field}><label style={st.lbl}>Budget (CHF) *</label><input style={st.inp} type="number" step="0.01" min="0" required value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} placeholder="Ex: 250.00" /></div>
              <div style={st.field}><label style={st.lbl}>Commentaires</label><textarea style={{...st.inp, height: 80, resize: 'vertical'}} value={form.commentaires} onChange={e => setForm({...form, commentaires: e.target.value})} placeholder="Détails du budget, remarques..." /></div>

              <div style={st.formActions}>
                <button type="button" style={st.btnCancel} onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" style={st.btnSave}>Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SortieCard({ sortie, onEdit, onDelete }) {
  const classesNoms = sortie.classes_noms || [sortie.classe1, sortie.classe2].filter(Boolean).join(', ') || '';
  const nbClasses = classesNoms ? classesNoms.split(',').filter(Boolean).length : 0;
  const classeLabel = nbClasses > 1 ? 'Classes' : 'Classe';
  return (
    <div style={sc.card}>
      <div style={sc.cardTop}>
        <div style={{ flex: 1 }}>
          <div style={sc.cardDate}>{sortie.date_sortie ? new Date(sortie.date_sortie).toLocaleDateString('fr-CH') : '—'}</div>
          {classesNoms && <div style={{ fontSize: 13, color: '#374151', marginTop: 4 }}><span style={{ fontWeight: 600 }}>{classeLabel} :</span> {classesNoms}</div>}
          {sortie.titulaires && <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}><span style={{ fontWeight: 600 }}>Titulaires :</span> {sortie.titulaires}</div>}
          {sortie.autres_accompagnants && <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}><span style={{ fontWeight: 600 }}>Autres accompagnants :</span> {sortie.autres_accompagnants}</div>}
          {sortie.destination && <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}><span style={{ fontWeight: 600 }}>Destination :</span> {sortie.destination}</div>}
        </div>
        <div style={sc.actions}>
          <button style={sc.btnEdit} onClick={() => onEdit(sortie)} title="Modifier">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button style={sc.btnDel} onClick={() => onDelete(sortie.id)} title="Supprimer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>
      {sortie.activites && <div style={sc.activites}>{sortie.activites}</div>}
    </div>
  );
}

function SuiviTable({ sorties, onEdit, onDelete, onPrint, onToggleApprouve }) {
  if (sorties.length === 0) return (
    <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
      Aucune sortie enregistrée pour cet onglet.
    </div>
  );
  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e8eaf6' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#6366f1', color: 'white' }}>
            {['Classes','Date','Destination','Lieu de départ','Lieu de retour','Budget',''].map(h => (
              <th key={h} style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorties.map((s, i) => {
            const classesNoms = s.classes_noms || [s.classe1, s.classe2].filter(Boolean).join(', ') || '—';
            return (
              <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={sc.td}>{classesNoms}</td>
                <td style={{ ...sc.td, whiteSpace: 'nowrap' }}>{s.date_sortie ? new Date(s.date_sortie).toLocaleDateString('fr-CH') : '—'}</td>
                <td style={{ ...sc.td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.destination || '—'}</td>
                <td style={sc.td}>
                  {s.lieu_depart
                    ? `${s.lieu_depart}${fmtHeure(s.heure_depart) ? ` - ${fmtHeure(s.heure_depart)}` : ''}`
                    : (fmtHeure(s.heure_depart) || '—')}
                </td>
                <td style={sc.td}>
                  {s.lieu_retour
                    ? `${s.lieu_retour}${fmtHeure(s.heure_retour) ? ` - ${fmtHeure(s.heure_retour)}` : ''}`
                    : (fmtHeure(s.heure_retour) || '—')}
                </td>
                <td style={{ ...sc.td, whiteSpace: 'nowrap', textAlign: 'right' }}>{s.budget ? parseFloat(s.budget).toFixed(1) : '—'}</td>
                <td style={{ ...sc.td, whiteSpace: 'nowrap', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                    <button style={sc.btnEdit} onClick={() => onEdit(s)} title="Modifier">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button style={sc.btnDel} onClick={() => onDelete(s.id)} title="Supprimer">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => onToggleApprouve(s)}
                      title={s.approuve ? 'Approuvé' : 'Non approuvé'}
                      style={{ padding: 5, background: s.approuve ? '#dcfce7' : '#e2e8f0', color: s.approuve ? '#16a34a' : '#64748b', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <svg width={15} height={15} viewBox="0 0 24 24" aria-hidden="true">
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
  );
}

const shortProfName = (fullName) => {
  const parts = fullName.trim().split(' ');
  if (parts.length < 2) return fullName;
  const surname = parts[parts.length - 1];
  const shortSurname = surname.includes('-') ? surname.split('-')[0] : surname;
  return [...parts.slice(0, -1), shortSurname].join(' ');
};

function SuiviProfClasse({ sorties, classes, profs }) {
  const [showUnassignedProfs, setShowUnassignedProfs] = useState(false);
  const [showUnassignedClasses, setShowUnassignedClasses] = useState(false);
  const classesMap = new Map();
  const profsMap = new Map();
  sorties.forEach((s) => {
    const classNames = (s.classes_noms || [s.classe1, s.classe2].filter(Boolean).join(', ') || '')
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
    const profNames = (s.titulaires || '')
      .split(' et ')
      .map(v => v.trim())
      .filter(Boolean);
    classNames.forEach((nom) => classesMap.set(nom, (classesMap.get(nom) || 0) + 1));
    profNames.forEach((nom) => profsMap.set(nom, (profsMap.get(nom) || 0) + 1));
  });
  const classesList = [...classesMap.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  const profsList = [...profsMap.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  const assignedClasses = new Set(classesList.map(([nom]) => nom.toLowerCase()));
  const assignedProfs = new Set(profsList.map(([nom]) => nom.toLowerCase()));
  const allClassNames = useMemo(
    () => [...new Set((classes || []).map((c) => (c.nom || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')),
    [classes]
  );
  const allProfNames = useMemo(
    () => [...new Set((profs || []).map((p) => `${p.prenom || ''} ${p.nom || ''}`.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')),
    [profs]
  );
  const unassignedClasses = allClassNames.filter((nom) => !assignedClasses.has(nom.toLowerCase()));
  const unassignedProfs = allProfNames.filter((nom) => !assignedProfs.has(nom.toLowerCase()));
  const chipProfStyle = {
    display: 'inline-block',
    width: 210,
    padding: '4px 10px',
    borderRadius: 999,
    background: '#eef2ff',
    color: '#3730a3',
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    boxSizing: 'border-box',
  };
  const chipClasseStyle = {
    display: 'inline-block',
    width: 80,
    padding: '3px 6px',
    borderRadius: 999,
    background: '#eef2ff',
    color: '#3730a3',
    fontSize: 11,
    fontWeight: 600,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    boxSizing: 'border-box',
  };
  const chipNeutreStyle = {
    padding: '4px 10px',
    borderRadius: 999,
    background: '#f1f5f9',
    color: '#334155',
    fontSize: 12,
    fontWeight: 600,
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginBottom: 12 }}>
        <div style={{ background: 'white', border: '1px solid #e8eaf6', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Suivi des professeurs ayant des sorties</div>
            <button
              type="button"
              style={{ ...st.btnSuivi, ...(showUnassignedProfs ? st.btnSuiviActif : {}), flexShrink: 0 }}
              onClick={() => setShowUnassignedProfs(v => !v)}
            >
              Professeurs non affectés ({unassignedProfs.length})
            </button>
          </div>
          {profsList.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Aucun professeur trouvé.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profsList.map(([nom, count]) => (
                <span key={nom} style={chipProfStyle}>
                  {shortProfName(nom)} ({count})
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ background: 'white', border: '1px solid #e8eaf6', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Suivi des classes ayant des sorties</div>
            <button
              type="button"
              style={{ ...st.btnSuivi, ...(showUnassignedClasses ? st.btnSuiviActif : {}), flexShrink: 0 }}
              onClick={() => setShowUnassignedClasses(v => !v)}
            >
              Classes non affectées ({unassignedClasses.length})
            </button>
          </div>
          {classesList.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Aucune classe trouvée.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {classesList.map(([nom, count]) => (
                <span key={nom} style={chipClasseStyle}>
                  {nom} ({count})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {(showUnassignedProfs || showUnassignedClasses) && (
        <div style={{ marginBottom: 12, background: 'white', border: '1px solid #e8eaf6', borderRadius: 10, padding: 12 }}>
          {showUnassignedProfs && (
            <div style={{ marginBottom: showUnassignedClasses ? 12 : 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#3730a3', marginBottom: 8 }}>Professeurs non affectés</div>
              {unassignedProfs.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13 }}>Tous les professeurs sont affectés.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {unassignedProfs.map((nom) => (
                    <span key={nom} style={{ ...chipNeutreStyle, width: 210, display: 'inline-block', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', boxSizing: 'border-box' }}>
                      {nom}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {showUnassignedClasses && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#334155', marginBottom: 8 }}>Classes non affectées</div>
              {unassignedClasses.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13 }}>Toutes les classes sont affectées.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {unassignedClasses.map((nom) => (
                    <span key={nom} style={{ ...chipNeutreStyle, width: 140, display: 'inline-block', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', boxSizing: 'border-box' }}>
                      {nom}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

const st = {
  page: { minHeight: '100%', boxSizing: 'border-box', background: '#f8fafc', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif", padding: '28px 32px' },
  header: { display: 'flex', alignItems: 'center', gap: 18, marginBottom: 12, width: '100%' },
  btnBack: { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 500, fontSize: 13, cursor: 'pointer' },
  titre: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, flex: 1 },
  btnAdd: { padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  searchRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  searchInput: { width: '100%', maxWidth: 460, padding: '10px 12px', borderRadius: 8, border: '1px solid #c7d2fe', fontSize: 14, color: '#1e293b' },
  btnSuivi: { padding: '7px 16px', minWidth: 138, borderRadius: 17, border: '1.5px solid #e2e8f0', background: 'white', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap', textAlign: 'center' },
  btnSuiviActif: { border: '1.5px solid #6366f1', background: '#e0e7ff', color: '#4338ca' },
  btnTri: { padding: '7px 14px', borderRadius: 17, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#94a3b8', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' },
  toggleGroup: { display: 'flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 },
  toggleBtn: { padding: '7px 14px', borderRadius: 17, border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: '#6d28d9', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' },
  toggleBtnActif: { background: '#6366f1', color: 'white', fontWeight: 700 },
  tabsRow: { display: 'flex', gap: 0 },
  onglet: { padding: '9px 14px', background: '#ede9fe', border: 'none', borderRadius: '10px 10px 0 0', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#5b21b6', lineHeight: 1, position: 'relative', zIndex: 1, outline: 'none', width: 140, minWidth: 140, textAlign: 'center' },
  ongletActif: { background: '#6366f1', color: 'white', zIndex: 2, boxShadow: '0 -1px 6px rgba(99,102,241,0.28)' },
  tabLine: { height: 2, background: '#6366f1' },
  content: { background: 'white', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', minHeight: 200, marginTop: 15 },
  subTabsBar: { display: 'flex', gap: 0, marginTop: 0 },
  subTabBtn: { padding: '9px 14px', borderRadius: '0 0 10px 10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: '#e0e7ff', color: '#3730a3', lineHeight: 1, zIndex: 1, outline: 'none', width: 120, minWidth: 120, textAlign: 'center' },
  subTabBtnActif: { background: '#4f46e5', color: 'white', marginTop: -1, zIndex: 2, boxShadow: '0 4px 8px rgba(79,70,229,0.22)' },
  empty: { color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '40px 0' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: 'white', borderRadius: 14, padding: 28, width: 'min(700px, 96vw)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitre: { fontSize: 17, fontWeight: 800, color: '#0f172a' },
  btnClose: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8' },
  formSection: { fontSize: 11, fontWeight: 700, color: '#6366f1', background: '#e0e7ff', padding: '4px 12px', borderRadius: 6, marginBottom: 12, marginTop: 16, textTransform: 'uppercase', letterSpacing: '0.05em' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 },
  field: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 },
  lbl: { fontSize: 11, fontWeight: 600, color: '#475569' },
  inp: { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', color: '#1e293b', background: 'white', fontFamily: 'inherit' },
  typeToggleWrap: { display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 8 },
  typeToggleBtn: { padding: '9px 0', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flex: 1, background: '#f8fafc', color: '#475569' },
  typeToggleBtnActif: { background: '#6366f1', color: 'white' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' },
  btnCancel: { padding: '8px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#64748b' },
  btnSave: { padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
};

const sc = {
  card: { background: '#fafafa', border: '1px solid #e8eaf6', borderRadius: 10, padding: '14px 18px' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardDate: { fontSize: 12, color: '#6366f1', fontWeight: 700, marginBottom: 2 },
  cardDest: { fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 },
  cardMeta: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  chip: { padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: '#e0e7ff', color: '#3730a3' },
  activites: { marginTop: 10, fontSize: 12, color: '#64748b', whiteSpace: 'pre-wrap', borderTop: '1px solid #f1f5f9', paddingTop: 8 },
  actions: { display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' },
  td: { padding: '8px 10px', color: '#1e293b' },
  btnPrint: { padding: '4px 8px', background: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  btnEdit: { padding: 5, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#e0e7ff', color: '#4338ca' },
  btnDel: { padding: 5, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', color: '#dc2626' },
};
