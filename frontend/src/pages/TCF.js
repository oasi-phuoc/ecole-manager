import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'https://ecole-manager-backend.onrender.com/api';
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const SESSIONS = ['Rentrée scolaire', '1e semestre', '2e semestre'];

const normaliserNiveau = (niveau) => String(niveau || '').trim().toUpperCase();
const clampNote = (value, min = 0, max = 25) => {
  if (value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return Math.min(max, Math.max(min, n));
};
const nb = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const statutParNombrePeriodes = (count) => {
  if (count >= 4) return 'vert';
  if (count >= 1) return 'orange';
  return 'rouge';
};
const couleurTotale = (total) => {
  if (total < 40) return { bg: '#fee2e2', text: '#b91c1c' };
  if (total <= 80) return { bg: '#ffedd5', text: '#c2410c' };
  return { bg: '#dcfce7', text: '#166534' };
};

export default function TCF() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = useMemo(() => ({ Authorization: 'Bearer ' + token }), [token]);

  const [onglet, setOnglet] = useState('pool');
  const [profs, setProfs] = useState([]);
  const [pools, setPools] = useState([]);
  const [creneaux, setCreneaux] = useState([]);
  const [disposMap, setDisposMap] = useState({});
  const [classes, setClasses] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [chargement, setChargement] = useState(true);

  const [siteNames, setSiteNames] = useState({ site1: 'Site 1', site2: 'Site 2' });
  const [selectedBySite, setSelectedBySite] = useState({ site1: [], site2: [] });
  const [splitByProf, setSplitByProf] = useState({});
  const [saveMsg, setSaveMsg] = useState('');

  const [resultatNiveau, setResultatNiveau] = useState('');
  const [resultatMatiere, setResultatMatiere] = useState('francais');
  const [resultatSession, setResultatSession] = useState('');
  const [scores, setScores] = useState({});

  const [statSousOnglet, setStatSousOnglet] = useState('tri');
  const [statMatiere, setStatMatiere] = useState('francais');
  const [statSens, setStatSens] = useState('fort');
  const [statSession, setStatSession] = useState('');
  const [statSeuil, setStatSeuil] = useState('60');

  useEffect(() => {
    const charger = async () => {
      setChargement(true);
      try {
        const [rp, rPools, rCreneaux, rGeneral, rClasses, rEleves] = await Promise.all([
          axios.get(API + '/profs', { headers }),
          axios.get(API + '/planning/pools', { headers }),
          axios.get(API + '/planning/creneaux', { headers }),
          axios.get(API + '/planning/general', { headers }),
          axios.get(API + '/classes', { headers }),
          axios.get(API + '/eleves', { headers }),
        ]);
        setProfs((rp.data || []).filter(p => p.actif !== false));
        setPools(rPools.data || []);
        setCreneaux(rCreneaux.data || []);
        setClasses((rClasses.data || []).filter(c => c.actif !== false));
        setEleves((rEleves.data || []).filter(e => e.statut !== 'inactif'));

        const dMap = {};
        (rGeneral.data?.dispos || []).forEach(d => {
          dMap[`${d.prof_id}-${d.creneau_id}`] = d.disponible;
        });
        setDisposMap(dMap);
      } catch (err) {
        setProfs([]);
        setPools([]);
        setCreneaux([]);
        setClasses([]);
        setEleves([]);
        setDisposMap({});
      }

      try {
        const poolState = JSON.parse(localStorage.getItem('tcf_pool_state') || '{}');
        if (poolState?.siteNames) setSiteNames(poolState.siteNames);
        if (poolState?.selectedBySite) setSelectedBySite(poolState.selectedBySite);
        if (poolState?.splitByProf) setSplitByProf(poolState.splitByProf);
      } catch {}

      try {
        const rs = JSON.parse(localStorage.getItem('tcf_resultats_scores') || '{}');
        if (rs && typeof rs === 'object') setScores(rs);
      } catch {}
      setChargement(false);
    };
    charger();
  }, [headers]);

  const profMap = useMemo(() => {
    const out = {};
    for (const p of profs) out[String(p.id)] = p;
    return out;
  }, [profs]);

  const classesMap = useMemo(() => {
    const out = {};
    for (const c of classes) out[String(c.id)] = c;
    return out;
  }, [classes]);

  const niveaux = useMemo(() => {
    const set = new Set();
    for (const c of classes) {
      const n = normaliserNiveau(c.niveau);
      if (n) set.add(n);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [classes]);

  useEffect(() => {
    if (!resultatNiveau && niveaux.length) setResultatNiveau(niveaux[0]);
  }, [niveaux, resultatNiveau]);

  useEffect(() => {
    localStorage.setItem('tcf_pool_state', JSON.stringify({ siteNames, selectedBySite, splitByProf }));
  }, [siteNames, selectedBySite, splitByProf]);

  useEffect(() => {
    localStorage.setItem('tcf_resultats_scores', JSON.stringify(scores));
  }, [scores]);

  const profsParNiveauPool = useMemo(() => {
    const byLevel = {};
    const seen = {};
    for (const pool of pools) {
      const niveau = normaliserNiveau(pool.niveau) || 'SANS NIVEAU';
      if (!byLevel[niveau]) {
        byLevel[niveau] = [];
        seen[niveau] = new Set();
      }

      const profsPool = Array.isArray(pool.profs) ? pool.profs : [];
      for (const p of profsPool) {
        const pid = String(p.id);
        if (seen[niveau].has(pid)) continue;
        seen[niveau].add(pid);
        byLevel[niveau].push({
          id: pid,
          nom: p.nom || profMap[pid]?.nom || '',
          prenom: p.prenom || profMap[pid]?.prenom || '',
        });
      }
    }

    // Fallback si aucun prof n'est remonté depuis les pools.
    if (Object.keys(byLevel).length === 0) {
      byLevel['SANS NIVEAU'] = profs.map(p => ({
        id: String(p.id),
        nom: p.nom || '',
        prenom: p.prenom || '',
      }));
    }

    for (const niveau of Object.keys(byLevel)) {
      byLevel[niveau].sort((a, b) =>
        `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, 'fr')
      );
    }
    return byLevel;
  }, [pools, profs, profMap]);

  const elevesNiveau = useMemo(() => {
    if (!resultatNiveau) return [];
    const cls = classes.filter(c => normaliserNiveau(c.niveau) === resultatNiveau);
    const clsIds = new Set(cls.map(c => String(c.id)));
    return eleves
      .filter(e => clsIds.has(String(e.classe_id)))
      .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'));
  }, [eleves, classes, resultatNiveau]);

  const estBloqueDansAutreSite = (siteKey, profId) => {
    if (splitByProf[profId]) return false;
    const autre = siteKey === 'site1' ? 'site2' : 'site1';
    return selectedBySite[autre].includes(profId);
  };

  const toggleProfSite = (siteKey, profId) => {
    if (estBloqueDansAutreSite(siteKey, profId)) return;
    setSelectedBySite(prev => {
      const deja = prev[siteKey].includes(profId);
      return {
        ...prev,
        [siteKey]: deja ? prev[siteKey].filter(id => id !== profId) : [...prev[siteKey], profId],
      };
    });
  };

  const toggleSplitProf = (profId) => {
    setSplitByProf(prev => {
      const next = { ...prev, [profId]: !prev[profId] };
      if (!next[profId] && selectedBySite.site1.includes(profId) && selectedBySite.site2.includes(profId)) {
        setSelectedBySite(s => ({ ...s, site2: s.site2.filter(id => id !== profId) }));
      }
      return next;
    });
  };

  const periodesDispoParJour = (profId, jour) => {
    const creneauxJour = creneaux.filter(c => String(c.jour || '').toLowerCase() === jour.toLowerCase());
    let count = 0;
    for (const c of creneauxJour) {
      if (disposMap[`${profId}-${c.id}`] !== false) count += 1;
    }
    return count;
  };

  const scoreKey = (matiere, session, eleveId) => `${matiere}::${session}::${eleveId}`;
  const getScore = (matiere, session, eleveId) => scores[scoreKey(matiere, session, eleveId)] || {};
  const setScore = (matiere, session, eleveId, field, value) => {
    const valeur = value === '' ? '' : String(clampNote(value));
    setScores(prev => {
      const key = scoreKey(matiere, session, eleveId);
      const cur = prev[key] || {};
      return { ...prev, [key]: { ...cur, [field]: valeur } };
    });
  };

  const calculFr = (row) => {
    const oral = nb(row.co) + nb(row.po);
    const ecrit = nb(row.ce) + nb(row.pe);
    const total = oral + ecrit;
    const filled = [row.co, row.po, row.ce, row.pe].some(v => v !== '' && v !== undefined);
    return { oral: filled ? oral : '', ecrit: filled ? ecrit : '', total: filled ? total : '' };
  };
  const calculMath = (row) => {
    const cscCfr = nb(row.p1) + nb(row.p2);
    const cafCap = nb(row.p3) + nb(row.p4);
    const total = cscCfr + cafCap;
    const filled = [row.p1, row.p2, row.p3, row.p4].some(v => v !== '' && v !== undefined);
    return { cscCfr: filled ? cscCfr : '', cafCap: filled ? cafCap : '', total: filled ? total : '' };
  };

  const renderPastille = (statut) => {
    const color = statut === 'vert' ? '#22c55e' : statut === 'orange' ? '#f59e0b' : '#ef4444';
    return <span style={{ ...styles.dot, background: color }} />;
  };

  const renderTableAffectationSite = (siteKey) => {
    const ids = selectedBySite[siteKey] || [];
    if (!ids.length) return <div style={styles.empty}>Aucun professeur sélectionné.</div>;

    const totalVertsSite = ids.reduce((acc, id) => {
      return acc + JOURS.filter(j => statutParNombrePeriodes(periodesDispoParJour(id, j)) === 'vert').length;
    }, 0);

    return (
      <>
        <div style={styles.badgeInfo}>Total cellules vertes: {totalVertsSite}</div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.thLeft}>Nom prénom professeur</th>
                {JOURS.map(j => <th key={j} style={styles.thCenter}>{j}</th>)}
                <th style={styles.thCenter}>Verts</th>
              </tr>
            </thead>
            <tbody>
              {ids.map(id => {
                const p = profMap[id];
                const verts = JOURS.filter(j => statutParNombrePeriodes(periodesDispoParJour(id, j)) === 'vert').length;
                return (
                  <tr key={id}>
                    <td style={styles.tdLeft}>{p ? `${p.prenom} ${p.nom}` : `Prof #${id}`}</td>
                    {JOURS.map(j => {
                      const statut = statutParNombrePeriodes(periodesDispoParJour(id, j));
                      return <td key={id + '-' + j} style={styles.tdCenter}>{renderPastille(statut)}</td>;
                    })}
                    <td style={{ ...styles.tdCenter, fontWeight: 700 }}>{verts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const renderSelectionSite = (siteKey, siteLabel) => (
    <div key={siteKey} style={styles.siteCard}>
      <div style={styles.siteHeader}>
        <span style={styles.siteTitle}>{siteLabel} - </span>
        <input
          value={siteNames[siteKey]}
          onChange={e => setSiteNames(prev => ({ ...prev, [siteKey]: e.target.value }))}
          style={styles.siteInput}
          placeholder="Nom du site"
        />
      </div>

      <div style={styles.sectionTitle}>Liste des professeurs séparée par niveau des pools</div>
      {chargement ? <div style={styles.empty}>Chargement...</div> : Object.entries(profsParNiveauPool).map(([niveau, liste]) => (
        <div key={niveau} style={styles.niveauBlock}>
          <div style={styles.niveauTitle}>Niveau {niveau}</div>
          <div style={styles.profsList}>
            {liste.map(p => {
              const checked = selectedBySite[siteKey].includes(p.id);
              const blocked = estBloqueDansAutreSite(siteKey, p.id);
              return (
                <div key={p.id} style={{ ...styles.profItem, ...(blocked ? styles.profItemBlocked : {}) }}>
                  <label style={styles.profCheck}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={blocked}
                      onChange={() => toggleProfSite(siteKey, p.id)}
                    />
                    <span>{p.prenom} {p.nom}</span>
                  </label>
                  <label style={styles.splitToggle}>
                    <input
                      type="checkbox"
                      checked={!!splitByProf[p.id]}
                      onChange={() => toggleSplitProf(p.id)}
                    />
                    Scinder
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={styles.sectionTitle}>Affectation hebdomadaire selon les jours</div>
      {renderTableAffectationSite(siteKey)}
    </div>
  );

  const renderResultat = () => {
    if (!niveaux.length) return <div style={styles.empty}>Aucun niveau de classe trouvé.</div>;
    const titreSession = resultatSession || 'Session non sélectionnée';
    const isFr = resultatMatiere === 'francais';

    return (
      <div style={styles.card}>
        <div style={styles.subTabsRow}>
          {niveaux.map(n => (
            <button
              key={n}
              onClick={() => setResultatNiveau(n)}
              style={{ ...styles.subTabBtn, ...(resultatNiveau === n ? styles.subTabBtnActif : {}) }}
            >
              {n}
            </button>
          ))}
        </div>

        <div style={styles.filtersRow}>
          <div style={styles.toggleWrap}>
            <button
              onClick={() => setResultatMatiere('francais')}
              style={{ ...styles.toggleBtn, ...(isFr ? styles.toggleBtnActif : {}) }}
            >
              Français
            </button>
            <button
              onClick={() => setResultatMatiere('math')}
              style={{ ...styles.toggleBtn, ...(!isFr ? styles.toggleBtnActif : {}) }}
            >
              Mathématiques
            </button>
          </div>
          <select value={resultatSession} onChange={e => setResultatSession(e.target.value)} style={styles.select}>
            <option value="">- Sélectionner la session -</option>
            {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {!resultatSession ? (
          <div style={styles.empty}>Sélectionnez une session.</div>
        ) : (
          <>
            <h3 style={styles.tableTitleBig}>
              {isFr ? 'Test de connaissance de français' : 'Test de connaissance de mathématiques'} - {titreSession}
            </h3>
            <div style={styles.tableWrap}>
              <table style={styles.tableLarge}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.thCenter}>N°</th>
                    <th style={styles.thLeft}>Classe</th>
                    <th style={styles.thLeft}>Nom</th>
                    <th style={styles.thLeft}>Prénom</th>
                    {isFr ? (
                      <>
                        <th style={styles.thCenter}>CO</th>
                        <th style={styles.thCenter}>PO</th>
                        <th style={styles.thCenter}>CE</th>
                        <th style={styles.thCenter}>PE</th>
                        <th style={styles.thCenter}>Oral</th>
                        <th style={styles.thCenter}>Écrit</th>
                        <th style={styles.thCenter}>Total</th>
                      </>
                    ) : (
                      <>
                        <th style={styles.thCenter}>P1</th>
                        <th style={styles.thCenter}>P2</th>
                        <th style={styles.thCenter}>P3</th>
                        <th style={styles.thCenter}>P4</th>
                        <th style={styles.thCenter}>CSC-CFR</th>
                        <th style={styles.thCenter}>CAF-CAP</th>
                        <th style={styles.thCenter}>Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {elevesNiveau.map((e, idx) => {
                    const row = getScore(resultatMatiere, resultatSession, e.id);
                    const computed = isFr ? calculFr(row) : calculMath(row);
                    const total = computed.total === '' ? null : Number(computed.total);
                    const totalStyle = total == null ? {} : couleurTotale(total);
                    return (
                      <tr key={e.id}>
                        <td style={styles.tdCenter}>{idx + 1}</td>
                        <td style={styles.tdLeft}>{classesMap[String(e.classe_id)]?.nom || '—'}</td>
                        <td style={styles.tdLeft}>{e.nom || ''}</td>
                        <td style={styles.tdLeft}>{e.prenom || ''}</td>

                        {isFr ? (
                          <>
                            {['co', 'po', 'ce', 'pe'].map(f => (
                              <td key={f} style={styles.tdCenter}>
                                <input
                                  style={styles.scoreInput}
                                  type="number"
                                  min="0"
                                  max="25"
                                  value={row[f] ?? ''}
                                  onChange={ev => setScore('francais', resultatSession, e.id, f, ev.target.value)}
                                />
                              </td>
                            ))}
                            <td style={styles.tdCenterRead}>{computed.oral === '' ? '' : computed.oral}</td>
                            <td style={styles.tdCenterRead}>{computed.ecrit === '' ? '' : computed.ecrit}</td>
                            <td style={{ ...styles.tdCenterRead, background: totalStyle.bg, color: totalStyle.text }}>{computed.total === '' ? '' : computed.total}</td>
                          </>
                        ) : (
                          <>
                            {['p1', 'p2', 'p3', 'p4'].map(f => (
                              <td key={f} style={styles.tdCenter}>
                                <input
                                  style={styles.scoreInput}
                                  type="number"
                                  min="0"
                                  max="25"
                                  value={row[f] ?? ''}
                                  onChange={ev => setScore('math', resultatSession, e.id, f, ev.target.value)}
                                />
                              </td>
                            ))}
                            <td style={styles.tdCenterRead}>{computed.cscCfr === '' ? '' : computed.cscCfr}</td>
                            <td style={styles.tdCenterRead}>{computed.cafCap === '' ? '' : computed.cafCap}</td>
                            <td style={{ ...styles.tdCenterRead, background: totalStyle.bg, color: totalStyle.text }}>{computed.total === '' ? '' : computed.total}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderStatistiques = () => {
    const seuil = Number(statSeuil) || 0;
    const matiere = statMatiere;
    const session = statSession;
    const rows = eleves
      .map(e => {
        const sc = getScore(matiere, session, e.id);
        const total = matiere === 'francais' ? calculFr(sc).total : calculMath(sc).total;
        return {
          id: e.id,
          nom: e.nom || '',
          prenom: e.prenom || '',
          classe: classesMap[String(e.classe_id)]?.nom || '—',
          total: total === '' ? null : Number(total),
        };
      })
      .filter(r => r.total != null);

    const filtres = rows.filter(r => (statSens === 'fort' ? r.total >= seuil : r.total <= seuil));
    filtres.sort((a, b) => (statSens === 'fort' ? b.total - a.total : a.total - b.total));

    return (
      <div style={styles.card}>
        <div style={styles.subTabsRow}>
          <button
            onClick={() => setStatSousOnglet('tri')}
            style={{ ...styles.subTabBtn, ...(statSousOnglet === 'tri' ? styles.subTabBtnActif : {}) }}
          >
            Tri
          </button>
        </div>

        {statSousOnglet === 'tri' && (
          <>
            <div style={styles.filtersRow}>
              <div style={styles.toggleWrap}>
                <button
                  onClick={() => setStatMatiere('francais')}
                  style={{ ...styles.toggleBtn, ...(statMatiere === 'francais' ? styles.toggleBtnActif : {}) }}
                >
                  Français
                </button>
                <button
                  onClick={() => setStatMatiere('math')}
                  style={{ ...styles.toggleBtn, ...(statMatiere === 'math' ? styles.toggleBtnActif : {}) }}
                >
                  Math
                </button>
              </div>

              <div style={styles.toggleWrap}>
                <button
                  onClick={() => setStatSens('fort')}
                  style={{ ...styles.toggleBtn, ...(statSens === 'fort' ? styles.toggleBtnActif : {}) }}
                >
                  Fort
                </button>
                <button
                  onClick={() => setStatSens('faible')}
                  style={{ ...styles.toggleBtn, ...(statSens === 'faible' ? styles.toggleBtnActif : {}) }}
                >
                  Faible
                </button>
              </div>

              <select value={statSession} onChange={e => setStatSession(e.target.value)} style={styles.select}>
                <option value="">- Sélectionner la session -</option>
                {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <input
                type="number"
                value={statSeuil}
                onChange={e => setStatSeuil(e.target.value)}
                style={{ ...styles.select, width: 120 }}
                placeholder="Seuil"
              />
            </div>

            {!statSession ? (
              <div style={styles.empty}>Sélectionnez une session pour trier.</div>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thead}>
                      <th style={styles.thCenter}>N°</th>
                      <th style={styles.thLeft}>Classe</th>
                      <th style={styles.thLeft}>Nom</th>
                      <th style={styles.thLeft}>Prénom</th>
                      <th style={styles.thCenter}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtres.map((r, i) => {
                      const c = couleurTotale(r.total);
                      return (
                        <tr key={r.id}>
                          <td style={styles.tdCenter}>{i + 1}</td>
                          <td style={styles.tdLeft}>{r.classe}</td>
                          <td style={styles.tdLeft}>{r.nom}</td>
                          <td style={styles.tdLeft}>{r.prenom}</td>
                          <td style={{ ...styles.tdCenterRead, background: c.bg, color: c.text }}>{r.total}</td>
                        </tr>
                      );
                    })}
                    {filtres.length === 0 && (
                      <tr>
                        <td colSpan={5} style={styles.empty}>Aucun élève ne correspond au tri.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.btnBack}>← Retour</button>
        <h2 style={styles.title}>Test de connaissance</h2>
      </div>

      <div style={styles.tabsRow}>
        {[
          { id: 'pool', label: 'Pool' },
          { id: 'affectation', label: 'Affectation' },
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

      {onglet === 'pool' && (
        <div style={styles.card}>
          <div style={styles.siteStack}>
            {renderSelectionSite('site1', 'Site 1')}
            {renderSelectionSite('site2', 'Site 2')}
          </div>
          <div style={{ marginTop: 14 }}>
            <button
              onClick={() => {
                localStorage.setItem('tcf_pool_state', JSON.stringify({ siteNames, selectedBySite, splitByProf }));
                setSaveMsg('Sauvegarde effectuée.');
                setTimeout(() => setSaveMsg(''), 2000);
              }}
              style={styles.btnSave}
            >
              Sauvegarder
            </button>
            {saveMsg && <span style={styles.saveMsg}>{saveMsg}</span>}
          </div>
        </div>
      )}

      {onglet === 'affectation' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Affectation</h3>
          <div style={styles.empty}>Utilisez l’onglet Pool pour gérer les affectations hebdomadaires.</div>
        </div>
      )}

      {onglet === 'planning' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Planning</h3>
          <div style={styles.empty}>Le planning est basé sur les affectations et disponibilités du module emploi du temps.</div>
        </div>
      )}

      {onglet === 'resultat' && renderResultat()}

      {onglet === 'statistique' && renderStatistiques()}
    </div>
  );
}

const styles = {
  page: {
    padding: 28,
    background: '#f8fafc',
    minHeight: '100vh',
    fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif",
  },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 },
  btnBack: { padding: '8px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', color: '#475569' },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' },
  tabsRow: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  tabBtn: { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#475569' },
  tabBtnActif: { background: '#6366f1', color: 'white', borderColor: '#6366f1' },
  card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 },
  cardTitle: { margin: '0 0 6px', fontSize: 18, color: '#0f172a' },
  empty: { fontSize: 13, color: '#94a3b8', padding: 12, textAlign: 'center' },

  siteStack: { display: 'flex', flexDirection: 'column', gap: 14 },
  siteCard: { border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#fcfdff' },
  siteHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  siteTitle: { fontSize: 13, fontWeight: 700, color: '#334155' },
  siteInput: { width: 260, maxWidth: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#1e293b' },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8, marginTop: 8 },
  niveauBlock: { marginBottom: 8 },
  niveauTitle: { fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 },
  profsList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 6 },
  profItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 8px', background: 'white' },
  profItemBlocked: { opacity: 0.5, background: '#f8fafc' },
  profCheck: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' },
  splitToggle: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' },

  badgeInfo: { display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#334155', background: '#eef2ff', padding: '4px 8px', borderRadius: 99, marginBottom: 8 },
  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 720 },
  tableLarge: { width: '100%', borderCollapse: 'collapse', minWidth: 1100 },
  thead: { background: '#f8fafc' },
  thLeft: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '8px 10px', fontSize: 12, color: '#64748b', textAlign: 'left' },
  thCenter: { borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '8px 10px', fontSize: 12, color: '#64748b', textAlign: 'center' },
  tdLeft: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 10px', fontSize: 13, color: '#1e293b' },
  tdCenter: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 10px', fontSize: 13, color: '#1e293b', textAlign: 'center' },
  tdCenterRead: { borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '8px 10px', fontSize: 13, textAlign: 'center', fontWeight: 700 },
  dot: { width: 12, height: 12, borderRadius: '50%', display: 'inline-block' },

  btnSave: { padding: '8px 16px', border: 'none', borderRadius: 8, background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer' },
  saveMsg: { marginLeft: 10, fontSize: 12, color: '#166534', fontWeight: 700 },

  subTabsRow: { display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  subTabBtn: { padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#475569' },
  subTabBtnActif: { background: '#0ea5e9', color: 'white', borderColor: '#0ea5e9' },
  filtersRow: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 },
  toggleWrap: { display: 'flex', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' },
  toggleBtn: { padding: '7px 11px', border: 'none', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#475569' },
  toggleBtnActif: { background: '#6366f1', color: 'white' },
  select: { padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#1e293b', background: 'white' },
  tableTitleBig: { margin: '10px 0', fontSize: 16, color: '#0f172a' },
  scoreInput: { width: 62, padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, textAlign: 'center' },
};
