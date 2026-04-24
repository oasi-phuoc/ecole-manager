/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import CustomSelect from '../components/CustomSelect';
import { stickyPageChrome } from '../styles/pageShell';

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

function EvalTable({ title, prefix, criteres, notes, setNotes }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={s.sectionTitle}>{title}</div>
      <table style={s.evalTable}>
        <thead>
          <tr>
            <th style={s.thCrit}></th>
            {NOTES.map((n) => <th key={n} style={s.thOpt}>{n}</th>)}
          </tr>
        </thead>
        <tbody>
          {criteres.map((c, i) => {
            const key = `${prefix}_${i}`;
            return (
              <tr key={key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={s.tdCrit}>{c}</td>
                {NOTES.map((n) => (
                  <td key={`${key}-${n}`} style={s.tdOpt}>
                    <button
                      type="button"
                      onClick={() => setNotes((p) => ({ ...p, [key]: notes[key] === n ? '' : n }))}
                      style={{ ...s.scoreBtn, ...(notes[key] === n ? s.scoreBtnActif : {}) }}
                    />
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
      return (
        (v.formateur_nom    || '').toLowerCase().includes(q) ||
        (v.formateur_prenom || '').toLowerCase().includes(q) ||
        (v.classe_nom       || '').toLowerCase().includes(q)
      );
    });
  }, [visites, search, filtreNiveau]);

  const resetForm = () => {
    setEditId(null); setFormateurId(''); setClasseId(''); setBrancheId('');
    setDateVisite(''); setDuree(1); setNotes({}); setOrgNotes({});
    setObservation(''); setFeedback(''); setValide(false); setMsg('');
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
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  const detailVisite = visites.find((v) => v.id === detailId);

  return (
    <div style={s.page}>
      <div style={{ ...stickyPageChrome(), marginBottom: 0 }}>
        <div style={s.header}>
          <h2 style={s.titre}>Visite de classes</h2>
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

      {msg && <div style={s.msgErr}>{msg}</div>}

      {/* Table liste */}
      {loading ? (
        <div style={s.empty}>Chargement...</div>
      ) : (
        <div style={s.tableListWrap}>
          <table style={s.tableList}>
            <thead>
              <tr>
                <th style={{ ...s.thIcon }}></th>
                <th style={s.thC}>Date</th>
                <th style={s.thL}>Nom</th>
                <th style={s.thL}>Prénom</th>
                <th style={s.thC}>Niveau</th>
                <th style={{ ...s.thIcon, width: 48 }}></th>
                <th style={s.thActions}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '20px 14px', color: '#94a3b8', textAlign: 'center', background: 'white' }}>
                    Aucune visite
                  </td>
                </tr>
              )}
              {rows.map((v, i) => {
                const hasFeedback = !!(v.feedback && String(v.feedback).trim());
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
                    <td style={{ ...s.tdC, whiteSpace: 'nowrap' }}>{fmtDate(v.date_visite)}</td>
                    <td style={{ ...s.tdL, fontWeight: 600 }}>{v.formateur_nom || '—'}</td>
                    <td style={s.tdL}>{v.formateur_prenom || '—'}</td>
                    <td style={s.tdC}>
                      {v.classe_niveau ? (
                        <span style={s.badge}>{v.classe_niveau}</span>
                      ) : '—'}
                    </td>
                    <td style={{ ...s.tdIcon, width: 48 }}>
                      <button
                        title={hasFeedback ? 'Feedback renseigné' : 'Aucun feedback'}
                        onClick={() => ouvrirEdition(v)}
                        style={{ ...s.obsBtn, background: hasFeedback ? '#ede9fe' : '#f1f5f9', color: hasFeedback ? '#7c3aed' : '#94a3b8' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
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
                          onClick={() => handleValider(v)}
                          style={{ ...s.validBtn, background: v.valide ? '#dcfce7' : '#f1f5f9', color: v.valide ? '#16a34a' : '#94a3b8' }}
                          title={v.valide ? 'Validé — cliquer pour annuler' : 'Valider'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
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

      {/* Panneau détail */}
      {detailVisite && (
        <div style={s.detailCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#4c1d95' }}>
              {detailVisite.formateur_prenom} {detailVisite.formateur_nom} · {detailVisite.classe_nom} · {fmtDate(detailVisite.date_visite)}
            </div>
            <button onClick={() => setDetailId(null)} style={s.btnClose}>✕</button>
          </div>
          {detailVisite.branche_nom && <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>Branche : <strong>{detailVisite.branche_nom}</strong></div>}
          {detailVisite.observation && <div style={{ fontSize: 13, color: '#334155', marginBottom: 6 }}><strong>Observation :</strong> {detailVisite.observation}</div>}
          {detailVisite.feedback    && <div style={{ fontSize: 13, color: '#334155' }}><strong>Feedback :</strong> {detailVisite.feedback}</div>}
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
              <button style={s.btnClose} onClick={() => setShowForm(false)}>✕</button>
            </div>
            {msg && <div style={s.msgErr}>{msg}</div>}
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
                <div style={s.sectionTitle}>Organisation</div>
                <table style={s.evalTable}>
                  <thead>
                    <tr>
                      <th style={s.thCrit}></th>
                      <th style={s.thOpt}>Oui</th>
                      <th style={s.thOpt}>Non</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ORG_ITEMS.map((item) => (
                      <tr key={item.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
              <EvalTable title="Préparation"                        prefix="prep" criteres={CRITERES.preparation} notes={notes} setNotes={setNotes} />
              <EvalTable title="Savoir-faire et interaction"        prefix="sf"   criteres={CRITERES.savoirFaire} notes={notes} setNotes={setNotes} />
              <EvalTable title="Savoir-être et gestion de classe"   prefix="se"   criteres={CRITERES.savoirEtre}  notes={notes} setNotes={setNotes} />

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

              {/* Feedback */}
              <div style={{ marginBottom: 16 }}>
                <span style={s.fieldLabel}>Entretien de feedback</span>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  style={{ ...s.textarea, marginTop: 4 }}
                  placeholder="Notes de l'entretien de feedback..."
                />
              </div>

              <div style={s.formActions}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" checked={valide} onChange={(e) => setValide(e.target.checked)} />
                  Valider la visite
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
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
  thIcon: { textAlign: 'center', padding: '10px', fontWeight: 700, color: '#fff', fontSize: 11, width: 52, background: '#6366f1' },
  thActions: { textAlign: 'right', padding: '10px 14px', fontWeight: 700, color: '#fff', fontSize: 11, width: 120, background: '#6366f1' },
  tdL: { padding: '10px 14px', color: '#0f172a' },
  tdC: { padding: '10px 14px', color: '#0f172a', textAlign: 'center' },
  tdIcon: { padding: '10px', textAlign: 'center', width: 52 },
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
  evalTable: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  thCrit: { textAlign: 'left', padding: '6px 10px', fontWeight: 700, color: '#64748b', fontSize: 11 },
  thOpt: { textAlign: 'center', padding: '6px 4px', fontWeight: 700, color: '#64748b', fontSize: 11, width: 48 },
  tdCrit: { padding: '8px 10px', fontSize: 13, color: '#334155' },
  tdOpt: { textAlign: 'center', padding: '6px 4px' },
  scoreBtn: { width: 20, height: 20, borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'inline-block', padding: 0 },
  scoreBtnActif: { background: '#6366f1', border: '1.5px solid #6366f1' },
  legend: { display: 'flex', gap: 16, alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, marginBottom: 14, flexWrap: 'wrap', fontSize: 12, color: '#475569' },
  legendTitle: { fontWeight: 700, color: '#4c1d95' },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#1e293b', background: 'white', fontFamily: 'inherit', resize: 'vertical' },
  formActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #f1f5f9' },
  btnCancel: { padding: '8px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#64748b', fontFamily: 'inherit' },
  btnSave: { padding: '8px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' },
  msgErr: { margin: '0 0 12px', padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontSize: 13 },
  empty: { color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '40px 0' },
};
