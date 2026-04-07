/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';
const getHeaders = () => { const u = JSON.parse(localStorage.getItem('user') || '{}'); return { Authorization: `Bearer ${u.token}` }; };

const ONGLETS = [
  { id: 'automne', label: 'Automne' },
  { id: 'juin',    label: 'Juin' },
  { id: 'autres',  label: 'Autres' },
  { id: 'suivi',   label: 'Tableau de suivi' },
];

const FORM_VIDE = {
  type: 'automne', classe1: '', classe2: '', titulaires: '', autres_accompagnants: '',
  date_sortie: '', destination: '', activites: '',
  lieu_depart: '', heure_depart: '', lieu_retour: '', heure_retour: '',
  budget: '', commentaires: '', delai: '', approuve: false,
};

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('fr-CH');
};

const fmtDateLong = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const fmtHeure = (h) => {
  if (!h) return '';
  return String(h).substring(0, 5);
};

export default function SortieScolaire() {
  const navigate = useNavigate();
  const [onglet, setOnglet] = useState('automne');
  const [sousOngletSuivi, setSousOngletSuivi] = useState('automne');
  const [sorties, setSorties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VIDE);
  const [editId, setEditId] = useState(null);

  const charger = async () => {
    try {
      const r = await axios.get(API + '/sorties', { headers: getHeaders() });
      setSorties(r.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { charger(); }, []);

  const ouvrirNouvelle = () => {
    setForm({ ...FORM_VIDE, type: onglet === 'suivi' ? 'automne' : onglet });
    setEditId(null);
    setShowForm(true);
  };

  const ouvrirEdit = (s) => {
    setForm({
      type: s.type || 'autre',
      classe1: s.classe1 || '',
      classe2: s.classe2 || '',
      titulaires: s.titulaires || '',
      autres_accompagnants: s.autres_accompagnants || '',
      date_sortie: s.date_sortie ? s.date_sortie.split('T')[0] : '',
      destination: s.destination || '',
      activites: s.activites || '',
      lieu_depart: s.lieu_depart || '',
      heure_depart: fmtHeure(s.heure_depart),
      lieu_retour: s.lieu_retour || '',
      heure_retour: fmtHeure(s.heure_retour),
      budget: s.budget || '',
      commentaires: s.commentaires || '',
      delai: s.delai ? s.delai.split('T')[0] : '',
      approuve: !!s.approuve,
    });
    setEditId(s.id);
    setShowForm(true);
  };

  const sauvegarder = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(API + '/sorties/' + editId, form, { headers: getHeaders() });
      } else {
        await axios.post(API + '/sorties', form, { headers: getHeaders() });
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
      await axios.put(API + '/sorties/' + s.id, { ...s, approuve: !s.approuve }, { headers: getHeaders() });
      charger();
    } catch (err) { console.error(err); }
  };

  const imprimer = (s) => {
    const publicBase = `${window.location.origin}${process.env.PUBLIC_URL || ''}`;
    const classes = [s.classe1, s.classe2].filter(Boolean).join('          et          ');
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
      .delai-row { text-align: center; font-size: 11pt; font-weight: 600; margin: 20pt 0 8pt 0; }
      .delai-date { color: #ea580c; font-weight: 700; }
      .approve { display: flex; justify-content: flex-end; align-items: flex-end; gap: 16px; margin-top: 24pt; }
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
      <tr><td class="lbl">Classes</td><td class="val">${classes}</td></tr>
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

    ${s.delai ? `<div class="delai-row">Délai : &nbsp;<span class="delai-date">${fmtDateLong(s.delai)}</span></div>` : ''}

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
    <script>window.onload = function(){ window.print(); }</script>
    </body></html>`;
    const popup = window.open('', '_blank', 'width=820,height=900');
    if (!popup) return;
    popup.document.write(html);
    popup.document.close();
  };

  const sortiesOnglet = sorties.filter(s => s.type === onglet);

  return (
    <div style={st.page}>
      {/* Header */}
      <div style={st.header}>
        <button style={st.btnBack} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h1 style={st.titre}>Gestion des sorties scolaires</h1>
        {onglet !== 'suivi' && (
          <button style={st.btnAdd} onClick={ouvrirNouvelle}>+ Ajouter</button>
        )}
      </div>

      {/* Main tabs — style EmploiDuTemps */}
      <div style={st.tabsRow}>
        {ONGLETS.map(o => (
          <button key={o.id}
            style={{ ...st.onglet, ...(onglet === o.id ? st.ongletActif : {}) }}
            onClick={() => setOnglet(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
      <div style={st.tabLine} />

      {/* Content */}
      <div style={st.content}>

        {/* Suivi tab avec sous-onglets */}
        {onglet === 'suivi' && (
          <>
            {/* Sous-onglets style EmploiDuTemps */}
            <div style={st.subTabsBar}>
              {[{id:'automne',label:'Automne'},{id:'juin',label:'Juin'},{id:'autres',label:'Autres'}].map(o => (
                <button key={o.id}
                  style={{ ...st.subTabBtn, ...(sousOngletSuivi === o.id ? st.subTabBtnActif : {}) }}
                  onClick={() => setSousOngletSuivi(o.id)}>
                  {o.label}
                </button>
              ))}
            </div>
            <div style={{ height: 16 }} />
            <SuiviTable
              sorties={sorties.filter(s => s.type === sousOngletSuivi)}
              onEdit={ouvrirEdit}
              onDelete={supprimer}
              onPrint={imprimer}
              onToggleApprouve={toggleApprouve}
            />
          </>
        )}

        {/* Automne / Juin / Autres tabs */}
        {onglet !== 'suivi' && (
          sortiesOnglet.length === 0 ? (
            <div style={st.empty}>
              Aucune sortie enregistrée pour <b>{ONGLETS.find(o => o.id === onglet)?.label}</b>.
              <br/><br/>
              <button style={st.btnAdd} onClick={ouvrirNouvelle}>+ Ajouter une sortie</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sortiesOnglet.map(sortie => (
                <SortieCard key={sortie.id} sortie={sortie} onEdit={ouvrirEdit} onDelete={supprimer} onPrint={imprimer} onToggleApprouve={toggleApprouve} />
              ))}
            </div>
          )
        )}
      </div>

      {/* Popup form */}
      {showForm && (
        <div style={st.overlay} onClick={() => setShowForm(false)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <div style={st.modalHeader}>
              <h3 style={st.modalTitre}>{editId ? 'Modifier' : 'Nouvelle'} sortie scolaire</h3>
              <button style={st.btnClose} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={sauvegarder} style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 80px)', paddingRight: 4 }}>

              <div style={st.formSection}>Type</div>
              <div style={st.grid3}>
                {['automne', 'juin', 'autres'].map(t => (
                  <button key={t} type="button"
                    style={{ ...st.typeBtn, ...(form.type === t ? st.typeBtnActif : {}) }}
                    onClick={() => setForm({ ...form, type: t })}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              <div style={st.formSection}>Participants</div>
              <div style={st.grid2}>
                <div style={st.field}><label style={st.lbl}>Classe 1</label><input style={st.inp} value={form.classe1} onChange={e => setForm({...form, classe1: e.target.value})} placeholder="Ex: CFR 04" /></div>
                <div style={st.field}><label style={st.lbl}>Classe 2</label><input style={st.inp} value={form.classe2} onChange={e => setForm({...form, classe2: e.target.value})} placeholder="Ex: CFR 06 (optionnel)" /></div>
              </div>
              <div style={st.grid2}>
                <div style={st.field}><label style={st.lbl}>Titulaires</label><input style={st.inp} value={form.titulaires} onChange={e => setForm({...form, titulaires: e.target.value})} placeholder="Ex: Yaëlle et Rosa" /></div>
                <div style={st.field}><label style={st.lbl}>Autres accompagnants</label><input style={st.inp} value={form.autres_accompagnants} onChange={e => setForm({...form, autres_accompagnants: e.target.value})} placeholder="Ex: Tania" /></div>
              </div>

              <div style={st.formSection}>Programme</div>
              <div style={st.field}><label style={st.lbl}>Date de la sortie *</label><input style={st.inp} type="date" required value={form.date_sortie} onChange={e => setForm({...form, date_sortie: e.target.value})} /></div>
              <div style={st.field}><label style={st.lbl}>Destination</label><input style={st.inp} value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} placeholder="Ex: Château de Valère, Sion" /></div>
              <div style={st.field}><label style={st.lbl}>Activités</label><textarea style={{...st.inp, height: 90, resize: 'vertical'}} value={form.activites} onChange={e => setForm({...form, activites: e.target.value})} placeholder="Détail des activités prévues..." /></div>

              <div style={st.formSection}>Déplacement</div>
              <div style={st.grid2}>
                <div style={st.field}><label style={st.lbl}>Lieu de départ</label><input style={st.inp} value={form.lieu_depart} onChange={e => setForm({...form, lieu_depart: e.target.value})} placeholder="Ex: Vétroz, Botza" /></div>
                <div style={st.field}><label style={st.lbl}>Heure de départ</label><input style={st.inp} type="time" value={form.heure_depart} onChange={e => setForm({...form, heure_depart: e.target.value})} /></div>
                <div style={st.field}><label style={st.lbl}>Lieu de retour</label><input style={st.inp} value={form.lieu_retour} onChange={e => setForm({...form, lieu_retour: e.target.value})} placeholder="Ex: Gare de Sion" /></div>
                <div style={st.field}><label style={st.lbl}>Heure de retour</label><input style={st.inp} type="time" value={form.heure_retour} onChange={e => setForm({...form, heure_retour: e.target.value})} /></div>
              </div>

              <div style={st.formSection}>Finances</div>
              <div style={st.field}><label style={st.lbl}>Budget (CHF)</label><input style={st.inp} type="number" step="0.01" min="0" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} placeholder="Ex: 250.00" /></div>
              <div style={st.field}><label style={st.lbl}>Commentaires</label><textarea style={{...st.inp, height: 80, resize: 'vertical'}} value={form.commentaires} onChange={e => setForm({...form, commentaires: e.target.value})} placeholder="Détails du budget, remarques..." /></div>

              <div style={st.formSection}>Validation</div>
              <div style={st.field}><label style={st.lbl}>Délai de réponse</label><input style={st.inp} type="date" value={form.delai} onChange={e => setForm({...form, delai: e.target.value})} /></div>

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

function SortieCard({ sortie, onEdit, onDelete, onPrint, onToggleApprouve }) {
  const classes = [sortie.classe1, sortie.classe2].filter(Boolean).join(' + ');
  return (
    <div style={sc.card}>
      <div style={sc.cardTop}>
        <div style={{ flex: 1 }}>
          <div style={sc.cardDate}>{sortie.date_sortie ? new Date(sortie.date_sortie).toLocaleDateString('fr-CH') : '—'}</div>
          <div style={sc.cardDest}>{sortie.destination || '—'}</div>
          <div style={sc.cardMeta}>
            {classes && <span style={sc.chip}>{classes}</span>}
            {sortie.titulaires && <span style={sc.chip}>{sortie.titulaires}</span>}
            {sortie.lieu_depart && <span style={{...sc.chip, background:'#fef3c7', color:'#92400e'}}>⬆ {sortie.lieu_depart} {sortie.heure_depart ? fmtHeure(sortie.heure_depart) : ''}</span>}
            {sortie.lieu_retour && <span style={{...sc.chip, background:'#fef3c7', color:'#92400e'}}>⬇ {sortie.lieu_retour} {sortie.heure_retour ? fmtHeure(sortie.heure_retour) : ''}</span>}
            {sortie.budget && <span style={{...sc.chip, background:'#d1fae5', color:'#065f46'}}>{parseFloat(sortie.budget).toFixed(2)} CHF</span>}
          </div>
        </div>
        <div style={sc.actions}>
          <button
            onClick={() => onToggleApprouve(sortie)}
            style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: sortie.approuve ? '#16a34a' : '#e2e8f0', color: sortie.approuve ? 'white' : '#64748b', whiteSpace: 'nowrap' }}>
            {sortie.approuve ? '✓ Approuvé' : 'À approuver'}
          </button>
          <button style={sc.btnPrint} onClick={() => onPrint(sortie)}>🖨️ Imprimer</button>
          <button style={sc.btnEdit} onClick={() => onEdit(sortie)}>✏️</button>
          <button style={sc.btnDel} onClick={() => onDelete(sortie.id)}>🗑️</button>
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

  const COLS = [
    { key: 'classe1',     label: 'Classe 1',       w: 90 },
    { key: 'classe2',     label: 'Classe 2',       w: 90 },
    { key: 'date_sortie', label: 'Date de la sortie', w: 110 },
    { key: 'destination', label: 'Destination',    w: null },
    { key: 'lieu_depart', label: 'Lieu de départ', w: 130 },
    { key: 'heure_depart',label: 'Heure de départ',w: 90 },
    { key: 'lieu_retour', label: 'Lieu de retour', w: 130 },
    { key: 'heure_retour',label: 'Heure de retour',w: 90 },
    { key: 'budget',      label: 'Budget',          w: 90 },
    { key: 'approuve',    label: 'Approbation',     w: 110 },
  ];

  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e8eaf6' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'auto' }}>
        <thead>
          <tr style={{ background: '#6366f1', color: 'white' }}>
            {COLS.map(c => (
              <th key={c.key} style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap', width: c.w || undefined, borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                {c.label}
              </th>
            ))}
            <th style={{ padding: '10px 10px', width: 90, borderRight: '1px solid rgba(255,255,255,0.15)' }}></th>
          </tr>
        </thead>
        <tbody>
          {sorties.map((s, i) => (
            <tr key={s.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
              <td style={sc.td}>{s.classe1 || '—'}</td>
              <td style={sc.td}>{s.classe2 || ''}</td>
              <td style={{ ...sc.td, whiteSpace: 'nowrap' }}>{s.date_sortie ? new Date(s.date_sortie).toLocaleDateString('fr-CH') : '—'}</td>
              <td style={{ ...sc.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.destination || '—'}</td>
              <td style={sc.td}>{s.lieu_depart || '—'}</td>
              <td style={{ ...sc.td, whiteSpace: 'nowrap' }}>{fmtHeure(s.heure_depart) || '—'}</td>
              <td style={sc.td}>{s.lieu_retour || '—'}</td>
              <td style={{ ...sc.td, whiteSpace: 'nowrap' }}>{fmtHeure(s.heure_retour) || '—'}</td>
              <td style={{ ...sc.td, whiteSpace: 'nowrap', textAlign: 'right' }}>{s.budget ? parseFloat(s.budget).toFixed(1) : '—'}</td>
              <td style={{ ...sc.td, textAlign: 'center' }}>
                <button
                  onClick={() => onToggleApprouve(s)}
                  style={{ padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: s.approuve ? '#16a34a' : '#e2e8f0', color: s.approuve ? 'white' : '#64748b', whiteSpace: 'nowrap' }}>
                  {s.approuve ? '✓ Oui' : '—'}
                </button>
              </td>
              <td style={{ ...sc.td, whiteSpace: 'nowrap', textAlign: 'center' }}>
                <button style={sc.btnPrint} onClick={() => onPrint(s)} title="Imprimer">🖨️</button>
                <button style={sc.btnEdit} onClick={() => onEdit(s)} title="Modifier">✏️</button>
                <button style={sc.btnDel} onClick={() => onDelete(s.id)} title="Supprimer">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const st = {
  page: { minHeight: '100vh', background: '#f8fafc', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif", padding: '28px 32px' },
  header: { display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 },
  btnBack: { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 500, fontSize: 13, cursor: 'pointer' },
  titre: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, flex: 1 },
  btnAdd: { padding: '9px 18px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  // Tabs style EmploiDuTemps
  tabsRow: { display: 'flex', gap: 0, marginBottom: 0 },
  onglet: { padding: '9px 14px', background: '#ede9fe', border: 'none', borderRadius: '10px 10px 0 0', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#5b21b6', lineHeight: 1, position: 'relative', zIndex: 1, outline: 'none', width: 140, minWidth: 140, textAlign: 'center' },
  ongletActif: { background: '#6366f1', color: 'white', border: 'none', marginBottom: -1, zIndex: 2, boxShadow: '0 -1px 6px rgba(99,102,241,0.28)' },
  tabLine: { height: 2, background: '#6366f1' },
  content: { background: 'white', borderRadius: '0 12px 12px 12px', padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', minHeight: 200 },
  // Sub-tabs style EmploiDuTemps
  subTabsBar: { display: 'flex', gap: 0, alignItems: 'flex-start', marginTop: -15, marginBottom: 0 },
  subTabBtn: { padding: '9px 14px', borderRadius: '0 0 10px 10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: '#e0e7ff', color: '#3730a3', lineHeight: 1, position: 'relative', zIndex: 1, outline: 'none', width: 120, minWidth: 120, textAlign: 'center' },
  subTabBtnActif: { background: '#4f46e5', color: 'white', marginTop: -1, zIndex: 2, boxShadow: '0 4px 8px rgba(79,70,229,0.22)' },
  empty: { color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '40px 0' },
  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: 'white', borderRadius: 14, padding: 28, width: 'min(680px, 96vw)', maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitre: { fontSize: 17, fontWeight: 800, color: '#0f172a' },
  btnClose: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8' },
  formSection: { fontSize: 11, fontWeight: 700, color: '#6366f1', background: '#e0e7ff', padding: '4px 12px', borderRadius: 6, marginBottom: 12, marginTop: 16, textTransform: 'uppercase', letterSpacing: '0.05em' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 },
  field: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 },
  lbl: { fontSize: 11, fontWeight: 600, color: '#475569' },
  inp: { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', color: '#1e293b', background: 'white', fontFamily: 'inherit' },
  typeBtn: { padding: '8px 0', border: '2px solid #e0e7ff', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, background: '#f8fafc', color: '#64748b' },
  typeBtnActif: { background: '#6366f1', color: 'white', border: '2px solid #6366f1' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' },
  btnCancel: { padding: '9px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#64748b' },
  btnSave: { padding: '9px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 },
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
  td: { padding: '8px 10px', borderRight: '1px solid #f1f5f9', color: '#1e293b' },
  btnPrint: { padding: '4px 8px', background: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  btnEdit: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, opacity: 0.7 },
  btnDel: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, opacity: 0.7 },
};
