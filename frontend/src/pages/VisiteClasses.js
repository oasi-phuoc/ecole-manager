/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import CustomSelect from '../components/CustomSelect';
import { stickyPageChrome } from '../styles/pageShell';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';
const NOTES = ['A', 'CA', 'NA', 'NO'];

const CRITERES = {
  preparation: ['Utilisation du matériel pédagogique etc.', 'Mise en route, prise de contact', 'Énonciation des objectifs', 'Tenue du classeur de classe'],
  savoirFaire: ['Variété et pertinence du/des document(s) de cours', 'Respect des PSE', 'Consignes', 'Cohérence des activités / Contextualisation', 'Corrections et retours sur les apprentissages', 'Encouragements'],
  savoirEtre: ["Favoriser l'interaction entre les apprenants", 'Interagir avec les apprenants et sollicitation', "Gestion de l'espace, déplacements dans la salle", "Conception de l'équilibre des rôles du formateur", 'Posture, présence, élocution', 'Climat de classe, esprit de groupe', 'Gestion du temps'],
};

function EvalTable({ title, prefix, criteres, values, setValues }) {
  return (
    <div>
      <div style={s.sectionTitle}>{title}</div>
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.thCrit}>Critères</th>
              {NOTES.map((n) => <th key={n} style={s.thOpt}>{n}</th>)}
            </tr>
          </thead>
          <tbody>
            {criteres.map((c, i) => {
              const key = `${prefix}_${i}`;
              return (
                <tr key={key}>
                  <td style={s.tdCrit}>{c}</td>
                  {NOTES.map((n) => (
                    <td key={`${key}-${n}`} style={s.tdOpt}>
                      <input type="radio" name={key} checked={values[key] === n} onChange={() => setValues((p) => ({ ...p, [key]: n }))} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeedbackForm() {
  return <div style={s.formCard}><div style={s.formTitle}>Entretien de feedback</div><textarea style={s.textareaLong} placeholder="Saisir le feedback..." /></div>;
}

function VisiteForm({ profs, classes, branches }) {
  const [notes, setNotes] = useState({});
  const [duree, setDuree] = useState('1');
  return (
    <div style={s.formCard}>
      <div style={s.formTitle}>Formulaire de visite de classe</div>
      <div style={s.gridInfos}>
        <label style={s.field}><span style={s.fieldLabel}>Formateur, Formatrice</span><CustomSelect options={profs.map((p) => ({ value: String(p.id), label: `${p.prenom} ${p.nom}`.trim() }))} placeholder="Sélectionner un formateur" style={{ width: '100%', minWidth: 220 }} /></label>
        <label style={s.field}><span style={s.fieldLabel}>Classe</span><CustomSelect options={classes.map((c) => ({ value: String(c.id), label: c.nom }))} placeholder="Sélectionner une classe" style={{ width: '100%', minWidth: 220 }} /></label>
        <label style={s.field}><span style={s.fieldLabel}>Branche</span><CustomSelect options={branches.map((b) => ({ value: String(b.id), label: b.nom }))} placeholder="Sélectionner une branche" style={{ width: '100%', minWidth: 220 }} /></label>
        <label style={s.field}><span style={s.fieldLabel}>Nombre d'apprenants</span><input style={s.input} /></label>
        <label style={s.field}><span style={s.fieldLabel}>Date</span><input type="date" style={s.input} /></label>
        <div style={s.field}><span style={s.fieldLabel}>Durée de la visite</span><div style={s.toggleWrap}><button type="button" onClick={() => setDuree('1')} style={{ ...s.toggleBtn, ...(duree === '1' ? s.toggleBtnActif : {}) }}>1 période</button><button type="button" onClick={() => setDuree('2')} style={{ ...s.toggleBtn, ...(duree === '2' ? s.toggleBtnActif : {}) }}>2 périodes</button></div></div>
      </div>
      <div style={s.sectionTitle}>Organisation</div>
      <div style={s.tableWrap}><table style={s.table}><thead><tr><th style={s.thCrit}>Critères</th><th style={s.thOpt}>Oui</th><th style={s.thOpt}>Non</th></tr></thead><tbody><tr><td style={s.tdCrit}>Accueil des responsables / salle</td><td style={s.tdOpt}><input type="radio" name="org1" /></td><td style={s.tdOpt}><input type="radio" name="org1" /></td></tr><tr><td style={s.tdCrit}>Plan de cours, programme proposé</td><td style={s.tdOpt}><input type="radio" name="org2" /></td><td style={s.tdOpt}><input type="radio" name="org2" /></td></tr></tbody></table></div>
      <EvalTable title="Préparation" prefix="prep" criteres={CRITERES.preparation} values={notes} setValues={setNotes} />
      <EvalTable title="Savoir-faire et interaction" prefix="sf" criteres={CRITERES.savoirFaire} values={notes} setValues={setNotes} />
      <EvalTable title="Savoir-être et gestion de classe" prefix="se" criteres={CRITERES.savoirEtre} values={notes} setValues={setNotes} />
      <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>A = Aquis, CA = En cours d'acquisition, NA = Non acquis, et NO = Non observé.</div>
      <div style={s.sectionTitle}>Annexes</div>
      <textarea style={s.textareaLong} />
    </div>
  );
}

export default function VisiteClasses() {
  const [profs, setProfs] = useState([]);
  const [classes, setClasses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const rows = useMemo(() => ([
    { id: 1, date: '2026-04-22', nom: 'Durand', prenom: 'Alice', niveau: 'A1', validated: false, hasFeedback: false },
    { id: 2, date: '2026-04-19', nom: 'Martin', prenom: 'Yanis', niveau: 'A2', validated: true, hasFeedback: true },
  ]).filter((r) => `${r.prenom} ${r.nom}`.toLowerCase().includes(search.toLowerCase())), [search]);

  useEffect(() => {
    axios.get(API + '/profs').then((r) => setProfs(r.data || [])).catch(() => setProfs([]));
    axios.get(API + '/classes').then((r) => setClasses(r.data || [])).catch(() => setClasses([]));
    axios.get(API + '/branches').then((r) => setBranches(r.data || [])).catch(() => setBranches([]));
  }, []);

  return (
    <div style={s.page}>
      <div style={{ ...stickyPageChrome(), paddingBottom: 0, marginBottom: 0 }}>
        <div style={s.header}>
          <h2 style={s.titre}>Visite de classes</h2>
          <button style={s.btnAdd} onClick={() => { setShowForm(true); setShowFeedback(false); }}>+ Ajouter</button>
        </div>
      </div>
      {showForm ? <VisiteForm profs={profs} classes={classes} branches={branches} /> : showFeedback ? <FeedbackForm /> : (
        <>
          <div style={s.filters}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un professeur..." style={s.searchInput} />
            <button type="button" style={s.btnTri}>Trier par niveau</button>
          </div>
          <div style={s.tableWrap}>
            <table style={s.tableList}>
              <thead><tr><th style={s.thIcon}></th><th style={s.thC}>Date</th><th style={s.thL}>Nom</th><th style={s.thL}>Prénom</th><th style={s.thC}>Niveau</th><th style={s.thIcon}></th><th style={s.thActions}></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={s.tdIcon}>
                      <button style={s.eyeBtn} title="Détail">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 13a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/>
                        </svg>
                      </button>
                    </td>
                    <td style={s.tdC}>{r.date}</td>
                    <td style={s.tdL}>{r.nom}</td>
                    <td style={s.tdL}>{r.prenom}</td>
                    <td style={s.tdC}>{r.niveau}</td>
                    <td style={s.tdIcon}>
                      <button
                        onClick={() => setShowFeedback(true)}
                        title="Observation"
                        style={{ ...s.obsBtn, background: r.hasFeedback ? '#ede9fe' : '#e2e8f0', color: r.hasFeedback ? '#7c3aed' : '#64748b' }}
                      >
                        🗒
                      </button>
                    </td>
                    <td style={s.tdActions}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button style={s.editBtn} title="Modifier">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button style={s.delBtn} title="Supprimer">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                        <button
                          style={{ ...s.validBtn, background: r.validated ? '#dcfce7' : '#e2e8f0', color: r.validated ? '#16a34a' : '#64748b' }}
                          title={r.validated ? 'Désactiver' : 'Activer'}
                        >
                          <svg width={15} height={15} viewBox="0 0 24 24">
                            <path fillRule="evenodd" fill="currentColor" d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
                            <path fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M7 12l3 3 7-7"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  page: { padding: '28px 32px', background: '#f8fafc', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' },
  titre: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, flex: 1 },
  btnAdd: { padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  filters: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 },
  searchInput: { width: '100%', maxWidth: 460, padding: '10px 12px', borderRadius: 8, border: '1px solid #c7d2fe', fontSize: 14, color: '#1e293b' },
  btnTri: { padding: '7px 14px', borderRadius: 17, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#94a3b8', fontSize: 13, whiteSpace: 'nowrap' },
  formCard: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  formTitle: { fontSize: 18, fontWeight: 800, color: '#0f172a' },
  gridInfos: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(240px, 1fr))', gap: 10 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: 700, color: '#334155' },
  input: { padding: '9px 12px', borderRadius: 8, border: '1px solid #c7d2fe', background: 'white', fontSize: 14, color: '#1e293b', fontFamily: 'inherit' },
  toggleWrap: { display: 'inline-flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2 },
  toggleBtn: { padding: '7px 12px', borderRadius: 17, border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: '#6d28d9', fontSize: 13 },
  toggleBtnActif: { background: '#6366f1', color: 'white' },
  sectionTitle: { fontSize: 14, fontWeight: 800, color: '#334155', marginTop: 4 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 760, background: 'white' },
  thCrit: { textAlign: 'left', padding: '8px 10px', fontSize: 12, color: '#475569', borderBottom: '1px solid #e2e8f0', width: '55%' },
  thOpt: { width: '11.25%', textAlign: 'center', padding: '8px 10px', fontSize: 12, color: '#475569', borderBottom: '1px solid #e2e8f0' },
  tdCrit: { padding: '8px 10px', fontSize: 13, color: '#1e293b', borderBottom: '1px solid #f1f5f9' },
  tdOpt: { textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid #f1f5f9' },
  textareaLong: { minHeight: 120, resize: 'vertical', width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #c7d2fe', background: 'white', fontSize: 14, color: '#1e293b' },
  tableList: { width: '100%', borderCollapse: 'collapse', fontSize: 13, background: 'white', border: '1px solid #e8eaf6', borderRadius: 10 },
  thL: { textAlign: 'left', padding: '10px', fontWeight: 700 },
  thC: { textAlign: 'center', padding: '10px', fontWeight: 700 },
  thIcon: { textAlign: 'center', padding: '10px', fontWeight: 700, width: 96, minWidth: 96, maxWidth: 96, whiteSpace: 'nowrap' },
  thActions: { textAlign: 'center', padding: '10px', fontWeight: 700, width: 130, minWidth: 130, maxWidth: 130, whiteSpace: 'nowrap' },
  tdL: { padding: '9px 10px', borderBottom: '1px solid #f1f5f9' },
  tdC: { padding: '9px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' },
  tdIcon: { padding: '9px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', width: 96, minWidth: 96, maxWidth: 96, whiteSpace: 'nowrap' },
  tdActions: { padding: '9px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', width: 130, minWidth: 130, maxWidth: 130, whiteSpace: 'nowrap' },
  eyeBtn: { border: 'none', background: '#e0e7ff', color: '#4338ca', borderRadius: 8, padding: 5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  obsBtn: { border: 'none', borderRadius: 8, padding: '4px 7px', cursor: 'pointer' },
  editBtn: { border: 'none', background: '#e0e7ff', color: '#4338ca', borderRadius: 8, padding: 5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  delBtn: { border: 'none', background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: 5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  validBtn: { border: 'none', borderRadius: 8, padding: 5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
};
