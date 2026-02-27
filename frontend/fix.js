const fs = require('fs');

fs.writeFileSync('./src/pages/EmploiDuTemps.js', `
import { isAdmin } from '../utils/permissions';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'https://ecole-manager-backend.onrender.com/api';
const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];
const COULEURS = ['#1a73e8','#34a853','#ea4335','#9c27b0','#ff9800','#00bcd4','#795548'];

export default function EmploiDuTemps() {
  const [onglet, setOnglet] = useState('disponibilites');
  const [profs, setProfs] = useState([]);
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [creneaux, setCreneaux] = useState([]);
  const [pools, setPools] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [profSelectionne, setProfSelectionne] = useState(null);
  const [dispos, setDispos] = useState({});
  const [planningGeneral, setPlanningGeneral] = useState(null);
  const [planningProf, setPlanningProf] = useState(null);
  const [profPlanningId, setProfPlanningId] = useState('');
  const [showPoolForm, setShowPoolForm] = useState(false);
  const [poolEdit, setPoolEdit] = useState(null);
  const [poolForm, setPoolForm] = useState({ nom: '', site: '', couleur: '#1a73e8', prof_ids: [] });
  const [showAffForm, setShowAffForm] = useState(false);
  const [affForm, setAffForm] = useState({ prof_id: '', classe_id: '', matiere_id: '', creneau_id: '' });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => {
    chargerTout();
  }, []);

  const chargerTout = async () => {
    try {
      const [p, cl, m, cr, po, af] = await Promise.all([
        axios.get(API + '/profs', { headers }),
        axios.get(API + '/classes', { headers }),
        axios.get(API + '/branches', { headers }),
        axios.get(API + '/planning/creneaux', { headers }),
        axios.get(API + '/planning/pools', { headers }),
        axios.get(API + '/planning/affectations', { headers }),
      ]);
      setProfs(p.data);
      setClasses(cl.data);
      setMatieres(m.data);
      setCreneaux(cr.data);
      setPools(po.data);
      setAffectations(af.data);
    } catch (err) { console.error(err); }
  };

  const chargerDispos = async (prof_id) => {
    const r = await axios.get(API + '/planning/disponibilites/' + prof_id, { headers });
    const map = {};
    r.data.forEach(d => { map[d.creneau_id] = d.disponible; });
    creneaux.forEach(c => { if (map[c.id] === undefined) map[c.id] = true; });
    setDispos(map);
    setProfSelectionne(prof_id);
  };

  const sauverDispos = async () => {
    const liste = Object.entries(dispos).map(([creneau_id, disponible]) => ({ creneau_id: parseInt(creneau_id), disponible }));
    await axios.post(API + '/planning/disponibilites/' + profSelectionne, { disponibilites: liste }, { headers });
    alert('Disponibilités sauvegardées !');
  };

  const toggleDispo = (creneau_id) => {
    setDispos(prev => ({ ...prev, [creneau_id]: !prev[creneau_id] }));
  };

  const creneauxParJour = (jour) => creneaux.filter(c => c.jour === jour);

  const handleSavePool = async () => {
    try {
      if (poolEdit) {
        await axios.put(API + '/planning/pools/' + poolEdit.id, poolForm, { headers });
      } else {
        await axios.post(API + '/planning/pools', poolForm, { headers });
      }
      setShowPoolForm(false);
      setPoolEdit(null);
      setPoolForm({ nom: '', site: '', couleur: '#1a73e8', prof_ids: [] });
      chargerTout();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleDeletePool = async (id) => {
    if (window.confirm('Supprimer ce pool ?')) {
      await axios.delete(API + '/planning/pools/' + id, { headers });
      chargerTout();
    }
  };

  const toggleProfPool = (prof_id) => {
    setPoolForm(prev => ({
      ...prev,
      prof_ids: prev.prof_ids.includes(prof_id)
        ? prev.prof_ids.filter(id => id !== prof_id)
        : [...prev.prof_ids, prof_id]
    }));
  };

  const handleSaveAff = async () => {
    try {
      await axios.post(API + '/planning/affectations', affForm, { headers });
      setShowAffForm(false);
      setAffForm({ prof_id: '', classe_id: '', matiere_id: '', creneau_id: '' });
      chargerTout();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleDeleteAff = async (id) => {
    if (window.confirm('Supprimer cette affectation ?')) {
      await axios.delete(API + '/planning/affectations/' + id, { headers });
      chargerTout();
    }
  };

  const chargerPlanningGeneral = async () => {
    const r = await axios.get(API + '/planning/general', { headers });
    setPlanningGeneral(r.data);
  };

  const chargerPlanningProf = async (id) => {
    const r = await axios.get(API + '/planning/prof/' + id, { headers });
    setPlanningProf(r.data);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={styles.titre}>📅 Emploi du Temps</h2>
      </div>

      <div style={styles.onglets}>
        {[
          { id: 'disponibilites', label: '✅ Disponibilités' },
          { id: 'pools', label: '👥 Pools' },
          { id: 'affectations', label: '📌 Affectations' },
          { id: 'general', label: '📊 Planning Général' },
          { id: 'prof', label: '👨‍🏫 Planning Prof' },
        ].map(o => (
          <button key={o.id} style={{ ...styles.onglet, ...(onglet === o.id ? styles.ongletActif : {}) }}
            onClick={() => { setOnglet(o.id); if (o.id === 'general') chargerPlanningGeneral(); }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* ===== DISPONIBILITÉS ===== */}
      {onglet === 'disponibilites' && (
        <div>
          <div style={styles.section}>
            <h3 style={styles.sectionTitre}>Sélectionner un professeur</h3>
            <div style={styles.profsGrid}>
              {profs.map(p => (
                <button key={p.id}
                  style={{ ...styles.profBtn, ...(profSelectionne == p.id ? styles.profBtnActif : {}) }}
                  onClick={() => chargerDispos(p.id)}>
                  {p.nom} {p.prenom}
                </button>
              ))}
            </div>
          </div>

          {profSelectionne && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitre}>
                  Disponibilités — {profs.find(p => p.id == profSelectionne)?.nom} {profs.find(p => p.id == profSelectionne)?.prenom}
                </h3>
                {isAdmin() && <button style={styles.btnSauver} onClick={sauverDispos}>💾 Sauvegarder</button>}
              </div>
              <div style={styles.dispoGrid}>
                {JOURS.map(jour => {
                  const crs = creneauxParJour(jour);
                  if (crs.length === 0) return null;
                  const matin = crs.filter(c => c.periode === 'Matin');
                  const aprem = crs.filter(c => c.periode === 'Après-midi');
                  return (
                    <div key={jour} style={styles.jourCol}>
                      <div style={styles.jourHeader}>{jour}</div>
                      {matin.length > 0 && (
                        <>
                          <div style={styles.periodeLabel}>Matin</div>
                          {matin.map(c => (
                            <div key={c.id} style={{ ...styles.creneauCase, background: dispos[c.id] ? '#e8f5e9' : '#fce4ec' }}
                              onClick={() => isAdmin() && toggleDispo(c.id)}>
                              <input type="checkbox" checked={!!dispos[c.id]} onChange={() => isAdmin() && toggleDispo(c.id)} />
                              <span style={styles.creneauHeure}>{c.heure_debut}-{c.heure_fin}</span>
                            </div>
                          ))}
                        </>
                      )}
                      {aprem.length > 0 && (
                        <>
                          <div style={styles.periodeLabel}>Après-midi</div>
                          {aprem.map(c => (
                            <div key={c.id} style={{ ...styles.creneauCase, background: dispos[c.id] ? '#e8f5e9' : '#fce4ec' }}
                              onClick={() => isAdmin() && toggleDispo(c.id)}>
                              <input type="checkbox" checked={!!dispos[c.id]} onChange={() => isAdmin() && toggleDispo(c.id)} />
                              <span style={styles.creneauHeure}>{c.heure_debut}-{c.heure_fin}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== POOLS ===== */}
      {onglet === 'pools' && (
        <div>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitre}>Pools de professeurs</h3>
            {isAdmin() && <button style={styles.btnAjouter} onClick={() => { setShowPoolForm(true); setPoolEdit(null); setPoolForm({ nom: '', site: '', couleur: '#1a73e8', prof_ids: [] }); }}>+ Nouveau pool</button>}
          </div>

          {showPoolForm && (
            <div style={styles.overlay}>
              <div style={styles.modal}>
                <h3 style={styles.modalTitre}>{poolEdit ? 'Modifier' : 'Créer'} un pool</h3>
                <div style={styles.formGrid}>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Nom du pool *</label>
                    <input style={styles.input} value={poolForm.nom} onChange={e => setPoolForm({...poolForm, nom: e.target.value})} placeholder="Ex: Site Sion" />
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Site</label>
                    <input style={styles.input} value={poolForm.site} onChange={e => setPoolForm({...poolForm, site: e.target.value})} placeholder="Ex: Sion" />
                  </div>
                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={styles.label}>Couleur</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {COULEURS.map(c => (
                        <div key={c} onClick={() => setPoolForm({...poolForm, couleur: c})}
                          style={{ width: 30, height: 30, borderRadius: '50%', background: c, cursor: 'pointer',
                            border: poolForm.couleur === c ? '3px solid #333' : '3px solid transparent' }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ ...styles.formChamp, gridColumn: '1/-1' }}>
                    <label style={styles.label}>Professeurs dans ce pool</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {profs.map(p => (
                        <label key={p.id} style={{ ...styles.checkLabel, background: poolForm.prof_ids.includes(p.id) ? poolForm.couleur : '#f5f5f5', color: poolForm.prof_ids.includes(p.id) ? 'white' : '#333' }}>
                          <input type="checkbox" checked={poolForm.prof_ids.includes(p.id)} onChange={() => toggleProfPool(p.id)} style={{ marginRight: 6 }} />
                          {p.nom} {p.prenom}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={styles.formActions}>
                  <button style={styles.btnAnnuler} onClick={() => setShowPoolForm(false)}>Annuler</button>
                  <button style={styles.btnSauver} onClick={handleSavePool}>Sauvegarder</button>
                </div>
              </div>
            </div>
          )}

          <div style={styles.poolsGrid}>
            {pools.map(pool => (
              <div key={pool.id} style={{ ...styles.poolCard, borderTop: '4px solid ' + pool.couleur }}>
                <div style={styles.poolHeader}>
                  <div>
                    <div style={styles.poolNom}>{pool.nom}</div>
                    {pool.site && <div style={styles.poolSite}>📍 {pool.site}</div>}
                  </div>
                  {isAdmin() && (
                    <div>
                      <button style={styles.btnEdit} onClick={() => {
                        setPoolEdit(pool); setShowPoolForm(true);
                        setPoolForm({ nom: pool.nom, site: pool.site || '', couleur: pool.couleur, prof_ids: pool.profs.map(p => p.id) });
                      }}>✏️</button>
                      <button style={styles.btnDelete} onClick={() => handleDeletePool(pool.id)}>🗑️</button>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 10 }}>
                  {pool.profs.map(p => (
                    <span key={p.id} style={{ ...styles.profBadge, background: pool.couleur + '22', color: pool.couleur }}>
                      {p.nom} {p.prenom}
                    </span>
                  ))}
                  {pool.profs.length === 0 && <span style={{ color: '#aaa', fontSize: 13 }}>Aucun prof</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== AFFECTATIONS ===== */}
      {onglet === 'affectations' && (
        <div>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitre}>Affectations Prof → Classe → Branche</h3>
            {isAdmin() && <button style={styles.btnAjouter} onClick={() => setShowAffForm(true)}>+ Affecter</button>}
          </div>

          {showAffForm && (
            <div style={styles.overlay}>
              <div style={styles.modal}>
                <h3 style={styles.modalTitre}>Nouvelle affectation</h3>
                <div style={styles.formGrid}>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Professeur *</label>
                    <select style={styles.input} value={affForm.prof_id} onChange={e => setAffForm({...affForm, prof_id: e.target.value})}>
                      <option value="">-- Choisir --</option>
                      {profs.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
                    </select>
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Classe *</label>
                    <select style={styles.input} value={affForm.classe_id} onChange={e => setAffForm({...affForm, classe_id: e.target.value})}>
                      <option value="">-- Choisir --</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Branche</label>
                    <select style={styles.input} value={affForm.matiere_id} onChange={e => setAffForm({...affForm, matiere_id: e.target.value})}>
                      <option value="">-- Choisir --</option>
                      {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                    </select>
                  </div>
                  <div style={styles.formChamp}>
                    <label style={styles.label}>Créneau *</label>
                    <select style={styles.input} value={affForm.creneau_id} onChange={e => setAffForm({...affForm, creneau_id: e.target.value})}>
                      <option value="">-- Choisir --</option>
                      {JOURS.map(jour => {
                        const crs = creneauxParJour(jour);
                        if (crs.length === 0) return null;
                        return <optgroup key={jour} label={jour}>{crs.map(c => <option key={c.id} value={c.id}>{c.heure_debut}-{c.heure_fin} ({c.periode})</option>)}</optgroup>;
                      })}
                    </select>
                  </div>
                </div>
                <div style={styles.formActions}>
                  <button style={styles.btnAnnuler} onClick={() => setShowAffForm(false)}>Annuler</button>
                  <button style={styles.btnSauver} onClick={handleSaveAff}>Sauvegarder</button>
                </div>
              </div>
            </div>
          )}

          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                {['Professeur','Classe','Branche','Jour','Créneau','Période'].map(h => <th key={h} style={styles.th}>{h}</th>)}
                {isAdmin() && <th style={styles.th}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {affectations.length === 0 ? (
                <tr><td colSpan="7" style={styles.vide}>Aucune affectation</td></tr>
              ) : affectations.map(a => (
                <tr key={a.id} style={styles.tr}>
                  <td style={styles.td}><b>{a.prof_nom}</b></td>
                  <td style={styles.td}><span style={styles.badgeBleu}>{a.classe_nom}</span></td>
                  <td style={styles.td}>{a.matiere_nom || '—'}</td>
                  <td style={styles.td}>{a.jour}</td>
                  <td style={styles.td}>{a.heure_debut}–{a.heure_fin}</td>
                  <td style={styles.td}>{a.periode}</td>
                  {isAdmin() && <td style={styles.td}><button style={styles.btnDelete} onClick={() => handleDeleteAff(a.id)}>🗑️</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== PLANNING GÉNÉRAL ===== */}
      {onglet === 'general' && (
        <div>
          <h3 style={styles.sectionTitre}>📊 Vue générale — Tous les professeurs</h3>
          {planningGeneral ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ ...styles.table, minWidth: 900 }}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{ ...styles.th, minWidth: 120 }}>Créneau</th>
                    {planningGeneral.profs.map(p => (
                      <th key={p.id} style={styles.th}>{p.nom}<br/><span style={{ fontWeight: 400, fontSize: 11 }}>{p.prenom}</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {JOURS.map(jour => {
                    const crs = planningGeneral.creneaux.filter(c => c.jour === jour);
                    if (crs.length === 0) return null;
                    return [
                      <tr key={jour + '_header'}>
                        <td colSpan={planningGeneral.profs.length + 1} style={styles.jourBande}>{jour}</td>
                      </tr>,
                      ...crs.map(cr => (
                        <tr key={cr.id} style={styles.tr}>
                          <td style={{ ...styles.td, background: '#f8f9fa', fontWeight: 600, fontSize: 12 }}>
                            {cr.heure_debut}–{cr.heure_fin}<br/>
                            <span style={{ color: '#888', fontSize: 11 }}>{cr.periode}</span>
                          </td>
                          {planningGeneral.profs.map(p => {
                            const aff = planningGeneral.affectations.find(a => a.prof_id === p.id && a.creneau_id === cr.id);
                            const dispo = true;
                            return (
                              <td key={p.id} style={{ ...styles.td, textAlign: 'center', background: aff ? '#e8f5e9' : '#fff', fontSize: 12 }}>
                                {aff ? <><b>{aff.classe_nom}</b><br/><span style={{ color: '#666' }}>{aff.matiere_nom || ''}</span></> : ''}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ];
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.vide}>Chargement...</div>
          )}
        </div>
      )}

      {/* ===== PLANNING PAR PROF ===== */}
      {onglet === 'prof' && (
        <div>
          <h3 style={styles.sectionTitre}>👨‍🏫 Planning individuel</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {profs.map(p => (
              <button key={p.id}
                style={{ ...styles.profBtn, ...(profPlanningId == p.id ? styles.profBtnActif : {}) }}
                onClick={() => { setProfPlanningId(p.id); chargerPlanningProf(p.id); }}>
                {p.nom} {p.prenom}
              </button>
            ))}
          </div>

          {planningProf && profPlanningId && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 18 }}>
                {planningProf.prof?.nom} {planningProf.prof?.prenom}
              </div>
              <table style={{ ...styles.table, minWidth: 700 }}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{ ...styles.th, minWidth: 130 }}>Horaire</th>
                    {JOURS.map(j => <th key={j} style={styles.th}>{j}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {['Matin','Après-midi'].map(periode => {
                    const crsBase = (planningProf.creneaux || []).filter(c => c.periode === periode && c.jour === 'Lundi');
                    if (crsBase.length === 0) return null;
                    return [
                      <tr key={periode}>
                        <td colSpan="6" style={styles.jourBande}>{periode}</td>
                      </tr>,
                      ...crsBase.map((crBase, idx) => (
                        <tr key={crBase.id} style={styles.tr}>
                          <td style={{ ...styles.td, background: '#f8f9fa', fontWeight: 600, fontSize: 12 }}>
                            {crBase.heure_debut}–{crBase.heure_fin}
                          </td>
                          {JOURS.map(jour => {
                            const cr = (planningProf.creneaux || []).find(c => c.jour === jour && c.periode === periode && c.ordre === crBase.ordre);
                            if (!cr) return <td key={jour} style={styles.td}></td>;
                            const aff = (planningProf.affectations || []).find(a => a.creneau_id === cr.id);
                            const dispo = planningProf.dispos?.find(d => d.creneau_id === cr.id);
                            const estDispo = dispo ? dispo.disponible : true;
                            return (
                              <td key={jour} style={{ ...styles.td, textAlign: 'center', fontSize: 12,
                                background: aff ? '#e8f5e9' : estDispo ? '#fff' : '#fce4ec' }}>
                                {aff ? <><b style={{ color: '#2e7d32' }}>{aff.classe_nom}</b><br/><span style={{ color: '#666' }}>{aff.matiere_nom || ''}</span></> :
                                  estDispo ? <span style={{ color: '#bbb' }}>libre</span> :
                                  <span style={{ color: '#e53935', fontSize: 11 }}>indispo</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '20px', background: '#f0f2f5', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20 },
  btnRetour: { padding: '8px 16px', background: 'white', border: '2px solid #e0e0e0', borderRadius: 8, cursor: 'pointer' },
  titre: { fontSize: 24, fontWeight: 700 },
  onglets: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  onglet: { padding: '10px 18px', background: 'white', border: '2px solid #e0e0e0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  ongletActif: { background: '#1a73e8', color: 'white', border: '2px solid #1a73e8' },
  section: { background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitre: { fontSize: 16, fontWeight: 700, color: '#333', margin: 0 },
  profsGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  profBtn: { padding: '8px 16px', background: 'white', border: '2px solid #e0e0e0', borderRadius: 20, cursor: 'pointer', fontSize: 13 },
  profBtnActif: { background: '#1a73e8', color: 'white', border: '2px solid #1a73e8' },
  dispoGrid: { display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 },
  jourCol: { minWidth: 140, flex: '0 0 auto' },
  jourHeader: { background: '#1a73e8', color: 'white', padding: '8px 12px', borderRadius: 8, fontWeight: 700, textAlign: 'center', marginBottom: 8 },
  periodeLabel: { fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 4, marginTop: 8 },
  creneauCase: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, marginBottom: 4, cursor: 'pointer', border: '1px solid #e0e0e0' },
  creneauHeure: { fontSize: 12, fontWeight: 600 },
  btnAjouter: { padding: '10px 20px', background: '#34a853', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  btnSauver: { padding: '10px 20px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  btnAnnuler: { padding: '10px 20px', background: '#f5f5f5', border: 'none', borderRadius: 8, cursor: 'pointer' },
  btnEdit: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginRight: 8 },
  btnDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: 30, borderRadius: 16, width: 560, maxHeight: '85vh', overflowY: 'auto' },
  modalTitre: { fontSize: 20, fontWeight: 700, marginBottom: 20 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 },
  formChamp: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: 13, fontWeight: 600, marginBottom: 5, color: '#555' },
  input: { padding: 10, border: '2px solid #e0e0e0', borderRadius: 8, fontSize: 14 },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  checkLabel: { padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center' },
  poolsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  poolCard: { background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  poolHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  poolNom: { fontSize: 16, fontWeight: 700 },
  poolSite: { fontSize: 13, color: '#888', marginTop: 4 },
  profBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, margin: '2px 4px 2px 0' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  theadRow: { background: '#1a73e8', color: 'white' },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600 },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '10px 14px', fontSize: 13 },
  vide: { padding: 40, textAlign: 'center', color: '#888' },
  badgeBleu: { background: '#e8f0fe', color: '#1a73e8', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  jourBande: { background: '#e8eaf6', padding: '8px 14px', fontWeight: 700, fontSize: 13, color: '#3949ab' },
};
`.trim());

console.log('EmploiDuTemps.js OK !');