import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'https://ecole-manager-backend.onrender.com/api';
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

const creerSemaineVide = () => JOURS.reduce((acc, j) => {
  acc[j] = { matin: '', apresMidi: '' };
  return acc;
}, {});

export default function TCF() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  const [onglet, setOnglet] = useState('planning');
  const [sousOngletPlanning, setSousOngletPlanning] = useState('affectation');
  const [profs, setProfs] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [siteNames, setSiteNames] = useState({ site1: 'Site 1', site2: 'Site 2' });
  const [selectedBySite, setSelectedBySite] = useState({ site1: [], site2: [] });
  const [planningBySite, setPlanningBySite] = useState({ site1: {}, site2: {} });

  useEffect(() => {
    chargerProfs();
    try {
      const brut = localStorage.getItem('tcf_planning_affectation');
      if (!brut) return;
      const d = JSON.parse(brut);
      if (d?.siteNames && d?.selectedBySite && d?.planningBySite) {
        setSiteNames(d.siteNames);
        setSelectedBySite(d.selectedBySite);
        setPlanningBySite(d.planningBySite);
      }
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    const payload = { siteNames, selectedBySite, planningBySite };
    localStorage.setItem('tcf_planning_affectation', JSON.stringify(payload));
  }, [siteNames, selectedBySite, planningBySite]);

  const chargerProfs = async () => {
    setChargement(true);
    try {
      const r = await axios.get(API + '/profs', { headers });
      setProfs((r.data || []).filter(p => p.actif !== false));
    } catch (err) {
      setProfs([]);
    }
    setChargement(false);
  };

  const profMap = useMemo(() => {
    const m = {};
    for (const p of profs) m[p.id] = p;
    return m;
  }, [profs]);

  const estDansAutreSite = (siteKey, profId) => {
    const autre = siteKey === 'site1' ? 'site2' : 'site1';
    return selectedBySite[autre].includes(profId);
  };

  const toggleProf = (siteKey, profId) => {
    if (estDansAutreSite(siteKey, profId)) return;
    setSelectedBySite(prev => {
      const deja = prev[siteKey].includes(profId);
      const next = {
        ...prev,
        [siteKey]: deja ? prev[siteKey].filter(id => id !== profId) : [...prev[siteKey], profId]
      };
      return next;
    });

    setPlanningBySite(prev => {
      const deja = !!prev[siteKey][profId];
      const copySite = { ...prev[siteKey] };
      if (deja) delete copySite[profId];
      else copySite[profId] = creerSemaineVide();
      return { ...prev, [siteKey]: copySite };
    });
  };

  const handleCellChange = (siteKey, profId, jour, moment, valeur) => {
    setPlanningBySite(prev => ({
      ...prev,
      [siteKey]: {
        ...prev[siteKey],
        [profId]: {
          ...(prev[siteKey][profId] || creerSemaineVide()),
          [jour]: {
            ...((prev[siteKey][profId] && prev[siteKey][profId][jour]) || { matin: '', apresMidi: '' }),
            [moment]: valeur
          }
        }
      }
    }));
  };

  const renderTableSite = (siteKey) => {
    const selection = selectedBySite[siteKey];
    if (selection.length === 0) return <div style={styles.empty}>Aucun professeur sélectionné</div>;

    return (
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.thProf} rowSpan={2}>Nom prénom</th>
              {JOURS.map(j => <th key={j} style={styles.thJour} colSpan={2}>{j}</th>)}
            </tr>
            <tr style={styles.thead}>
              {JOURS.map(j => (
                <React.Fragment key={j + '-moments'}>
                  <th style={styles.thMoment}>Matin</th>
                  <th style={styles.thMoment}>Après-midi</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {selection.map(id => {
              const p = profMap[id];
              return (
                <tr key={id}>
                  <td style={styles.tdProf}>{p ? `${p.prenom} ${p.nom}` : `Prof #${id}`}</td>
                  {JOURS.map(j => (
                    <React.Fragment key={id + '-' + j}>
                      <td style={styles.tdCell}>
                        <input
                          value={planningBySite[siteKey]?.[id]?.[j]?.matin || ''}
                          onChange={e => handleCellChange(siteKey, id, j, 'matin', e.target.value)}
                          style={styles.cellInput}
                          placeholder="-"
                        />
                      </td>
                      <td style={styles.tdCell}>
                        <input
                          value={planningBySite[siteKey]?.[id]?.[j]?.apresMidi || ''}
                          onChange={e => handleCellChange(siteKey, id, j, 'apresMidi', e.target.value)}
                          style={styles.cellInput}
                          placeholder="-"
                        />
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.btnBack}>
          ← Retour
        </button>
        <h2 style={styles.title}>🗣️ Module TCF</h2>
      </div>

      <div style={styles.tabsRow}>
        {[
          { id: 'planning', label: 'Planning' },
          { id: 'resultat', label: 'Résultat' },
          { id: 'statistique', label: 'Statistique' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setOnglet(t.id)}
            style={{ ...styles.tabBtn, ...(onglet === t.id ? styles.tabBtnActif : {}) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {onglet === 'planning' && (
        <div style={styles.card}>
          <div style={styles.subTabsRow}>
            <button
              onClick={() => setSousOngletPlanning('affectation')}
              style={{ ...styles.subTabBtn, ...(sousOngletPlanning === 'affectation' ? styles.subTabBtnActif : {}) }}
            >
              Affectation des professeurs
            </button>
          </div>

          {sousOngletPlanning === 'affectation' && (
            <div style={{ marginTop: 12 }}>
              <div style={styles.sitesGrid}>
                {['site1', 'site2'].map(siteKey => (
                  <div key={siteKey} style={styles.siteCard}>
                    <div style={styles.siteHeader}>
                      <label style={styles.siteLabel}>{siteKey === 'site1' ? 'Site 1' : 'Site 2'}</label>
                      <input
                        value={siteNames[siteKey]}
                        onChange={e => setSiteNames(prev => ({ ...prev, [siteKey]: e.target.value }))}
                        style={styles.siteInput}
                        placeholder="Nom du site"
                      />
                    </div>

                    <div style={styles.selectBlock}>
                      <div style={styles.selectTitle}>Sélection des professeurs disponibles</div>
                      {chargement ? (
                        <div style={styles.empty}>Chargement...</div>
                      ) : profs.length === 0 ? (
                        <div style={styles.empty}>Aucun professeur disponible</div>
                      ) : (
                        <div style={styles.profsList}>
                          {profs.map(p => {
                            const checked = selectedBySite[siteKey].includes(p.id);
                            const blocked = estDansAutreSite(siteKey, p.id);
                            return (
                              <label key={p.id} style={{ ...styles.profItem, ...(blocked ? styles.profItemBlocked : {}) }}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={blocked}
                                  onChange={() => toggleProf(siteKey, p.id)}
                                />
                                <span>{p.prenom} {p.nom}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div style={styles.tableTitle}>Affectation hebdomadaire — {siteNames[siteKey] || (siteKey === 'site1' ? 'Site 1' : 'Site 2')}</div>
                    {renderTableSite(siteKey)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {onglet === 'resultat' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Résultat</h3>
          <div style={styles.empty}>Cette section Résultat est prête pour la prochaine étape.</div>
        </div>
      )}

      {onglet === 'statistique' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Statistique</h3>
          <div style={styles.empty}>Cette section Statistique est prête pour la prochaine étape.</div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: 28, background: '#f8fafc', minHeight: '100vh', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 },
  btnBack: { padding: '8px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', color: '#475569' },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' },
  tabsRow: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  tabBtn: { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#475569' },
  tabBtnActif: { background: '#6366f1', color: 'white', borderColor: '#6366f1' },
  card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 },
  subTabsRow: { display: 'flex', gap: 8, marginBottom: 8 },
  subTabBtn: { padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#475569' },
  subTabBtnActif: { background: '#0ea5e9', color: 'white', borderColor: '#0ea5e9' },
  sitesGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  siteCard: { border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#fcfdff' },
  siteHeader: { marginBottom: 10 },
  siteLabel: { display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 5 },
  siteInput: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#1e293b' },
  selectBlock: { marginBottom: 12 },
  selectTitle: { fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 },
  profsList: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  profItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155', padding: '5px 7px', borderRadius: 6, background: 'white', border: '1px solid #eef2f7' },
  profItemBlocked: { opacity: 0.5, background: '#f8fafc' },
  tableTitle: { fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 },
  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 900 },
  thead: { background: '#f8fafc' },
  thProf: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '8px', fontSize: 12, color: '#64748b', textAlign: 'left' },
  thJour: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '8px', fontSize: 12, color: '#64748b', textAlign: 'center' },
  thMoment: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '6px', fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  tdProf: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px', fontSize: 13, fontWeight: 600, color: '#1e293b' },
  tdCell: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '4px' },
  cellInput: { width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, color: '#334155' },
  empty: { fontSize: 13, color: '#94a3b8', padding: 12, textAlign: 'center' },
  cardTitle: { margin: '0 0 6px', fontSize: 18, color: '#0f172a' },
};
