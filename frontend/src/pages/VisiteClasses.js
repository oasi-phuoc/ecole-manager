/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { stickyPageChrome } from '../styles/pageShell';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';

const OPTIONS_NOTE = ['Acquis', "En cours d'acquisition", 'Non acquis', 'N/O'];

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

function LigneEvaluation({ prefix, label, values, setValues }) {
  const selected = values[prefix] || '';
  return (
    <tr>
      <td style={s.tdCritere}>{label}</td>
      {OPTIONS_NOTE.map((opt) => (
        <td key={`${prefix}-${opt}`} style={s.tdOption}>
          <input
            type="radio"
            name={prefix}
            checked={selected === opt}
            onChange={() => setValues((prev) => ({ ...prev, [prefix]: opt }))}
          />
        </td>
      ))}
    </tr>
  );
}

function BlocEvaluation({ title, prefix, criteres, values, setValues }) {
  return (
    <div style={s.sectionCard}>
      <div style={s.sectionTitle}>{title}</div>
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.thCritere}>Critères</th>
              {OPTIONS_NOTE.map((opt) => (
                <th key={`${prefix}-${opt}`} style={s.thOption}>{opt}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteres.map((c, idx) => (
              <LigneEvaluation
                key={`${prefix}-${idx}`}
                prefix={`${prefix}_${idx}`}
                label={c}
                values={values}
                setValues={setValues}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FormulaireVisite({ profs }) {
  const [notes, setNotes] = useState({});
  const annexes = useMemo(() => ['Annexe à la visite de classe - Commentaires', 'Annexe à la visite de classe - Commentaires', 'Annexe à la visite de classe - Commentaires'], []);
  const [formateurVal, setFormateurVal] = useState('');

  return (
    <div style={s.formCard}>
      <div style={s.formTitle}>Formulaire de visite de classe</div>

      <div style={s.gridInfos}>
        <label style={s.field}>
          <span style={s.fieldLabel}>Formateur, Formatrice</span>
          <input
            style={s.input}
            list="profs-list"
            value={formateurVal}
            onChange={e => setFormateurVal(e.target.value)}
            placeholder="Sélectionner ou taper un nom..."
            autoComplete="off"
          />
          <datalist id="profs-list">
            {profs.map(p => (
              <option key={p.id} value={`${p.prenom} ${p.nom}`} />
            ))}
          </datalist>
        </label>
        <label style={s.field}>
          <span style={s.fieldLabel}>Classe</span>
          <input style={s.input} />
        </label>
        <label style={s.field}>
          <span style={s.fieldLabel}>Branche</span>
          <input style={s.input} />
        </label>
        <label style={s.field}>
          <span style={s.fieldLabel}>Nombre d'apprenants</span>
          <input style={s.input} />
        </label>
        <label style={s.field}>
          <span style={s.fieldLabel}>Date</span>
          <input type="date" style={s.input} />
        </label>
        <label style={s.field}>
          <span style={s.fieldLabel}>Durée de la visite</span>
          <input style={s.input} />
        </label>
      </div>

      <div style={s.sectionCard}>
        <div style={s.sectionTitle}>Organisation</div>
        <div style={s.orgRow}>
          <span>Accueil des responsables / salle</span>
          <label style={s.inlineRadio}><input type="radio" name="orga_accueil" /> Oui</label>
          <label style={s.inlineRadio}><input type="radio" name="orga_accueil" /> Non</label>
        </div>
        <div style={s.orgRow}>
          <span>Plan de cours, programme proposé</span>
          <label style={s.inlineRadio}><input type="radio" name="orga_plan" /> Oui</label>
          <label style={s.inlineRadio}><input type="radio" name="orga_plan" /> Non</label>
        </div>
      </div>

      <BlocEvaluation
        title="Préparation"
        prefix="preparation"
        criteres={CRITERES.preparation}
        values={notes}
        setValues={setNotes}
      />
      <BlocEvaluation
        title="Savoir-faire et interaction"
        prefix="savoirFaire"
        criteres={CRITERES.savoirFaire}
        values={notes}
        setValues={setNotes}
      />
      <BlocEvaluation
        title="Savoir-être et gestion de la classe"
        prefix="savoirEtre"
        criteres={CRITERES.savoirEtre}
        values={notes}
        setValues={setNotes}
      />

      {annexes.map((titre, idx) => (
        <div key={`annexe-${idx}`} style={s.sectionCard}>
          <div style={s.sectionTitle}>{titre}</div>
          <textarea style={s.textareaLong} />
        </div>
      ))}
    </div>
  );
}

function EntretienFeedback() {
  return (
    <div style={s.formCard}>
      <div style={s.formTitle}>Entretien de feedback</div>

      <div style={s.sectionCard}>
        <div style={s.sectionTitle}>Auto-évaluation</div>
        <label style={s.field}>
          <span style={s.fieldLabel}>De quoi je suis satisfait en terme pédagogique ? (2 points forts)</span>
          <textarea style={s.textarea} />
        </label>
        <label style={s.field}>
          <span style={s.fieldLabel}>Qu'est-ce que j'aimerais améliorer au niveau technique ou autres ? (1 à 2 points)</span>
          <textarea style={s.textarea} />
        </label>
        <label style={s.field}>
          <span style={s.fieldLabel}>De quoi ai-je besoin pour m'améliorer ? (1 à 2 avis)</span>
          <textarea style={s.textarea} />
        </label>
      </div>

      <div style={s.sectionCard}>
        <label style={s.field}>
          <span style={s.fieldLabel}>A maintenir dans le cours</span>
          <textarea style={s.textarea} />
        </label>
        <label style={s.field}>
          <span style={s.fieldLabel}>A améliorer dans le cours</span>
          <textarea style={s.textarea} />
        </label>
        <label style={s.field}>
          <span style={s.fieldLabel}>Objectifs à mettre en place d'ici la prochaine visite</span>
          <textarea style={s.textarea} />
        </label>
        <label style={s.field}>
          <span style={s.fieldLabel}>Remarques</span>
          <textarea style={s.textarea} />
        </label>
      </div>

      <div style={s.signRow}>
        <div style={s.signBox}>
          <div style={s.signLine}></div>
          <div style={s.signLabel}>Le formateur/trice</div>
        </div>
        <div style={s.signBox}>
          <div style={s.signLine}></div>
          <div style={s.signLabel}>La direction</div>
        </div>
      </div>
      <label style={{ ...s.field, maxWidth: 280 }}>
        <span style={s.fieldLabel}>Date</span>
        <input type="date" style={s.input} />
      </label>
    </div>
  );
}

export default function VisiteClasses() {
  const location = useLocation();
  const activeTab = new URLSearchParams(location.search).get('tab') || 'visite';
  const [profs, setProfs] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios.get(API + '/profs', { headers })
      .then(r => setProfs((r.data || []).sort((a, b) => a.nom.localeCompare(b.nom))))
      .catch(() => setProfs([]));
  }, []);

  return (
    <div style={s.page}>
      <div style={{ ...stickyPageChrome(), paddingBottom: 0, marginBottom: 0 }}>
        <div style={s.header}>
          <h2 style={s.titre}>Visite de classes</h2>
        </div>
      </div>

      {activeTab === 'visite' ? <FormulaireVisite profs={profs} /> : <EntretienFeedback />}
    </div>
  );
}

const s = {
  page: { padding: '28px 32px', background: '#f8fafc', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' },
  titre: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 },
  formCard: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  formTitle: { fontSize: 18, fontWeight: 800, color: '#0f172a' },
  gridInfos: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(240px, 1fr))', gap: 10 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: 700, color: '#334155' },
  input: { padding: '9px 12px', borderRadius: 8, border: '1px solid #c7d2fe', background: 'white', fontSize: 14, color: '#1e293b', fontFamily: 'inherit' },
  sectionCard: { border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#fcfdff' },
  sectionTitle: { fontSize: 14, fontWeight: 800, color: '#334155', marginBottom: 8 },
  orgRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '6px 0', fontSize: 13, color: '#1e293b' },
  inlineRadio: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 760 },
  thCritere: { textAlign: 'left', padding: '8px 10px', fontSize: 12, color: '#475569', borderBottom: '1px solid #e2e8f0', width: '55%' },
  thOption: { textAlign: 'center', padding: '8px 10px', fontSize: 12, color: '#475569', borderBottom: '1px solid #e2e8f0' },
  tdCritere: { padding: '8px 10px', fontSize: 13, color: '#1e293b', borderBottom: '1px solid #f1f5f9' },
  tdOption: { textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid #f1f5f9' },
  textarea: { minHeight: 96, resize: 'vertical', padding: '9px 12px', borderRadius: 8, border: '1px solid #c7d2fe', background: 'white', fontSize: 14, color: '#1e293b', fontFamily: 'inherit' },
  textareaLong: { minHeight: 120, resize: 'vertical', width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #c7d2fe', background: 'white', fontSize: 14, color: '#1e293b', fontFamily: 'inherit', boxSizing: 'border-box' },
  signRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 4 },
  signBox: { display: 'flex', flexDirection: 'column', gap: 6 },
  signLine: { height: 1, background: '#94a3b8', marginTop: 30 },
  signLabel: { fontSize: 13, color: '#334155', fontWeight: 700, textAlign: 'center' },
};
