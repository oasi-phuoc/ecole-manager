/* eslint-disable */
import React, { useState, useEffect } from 'react';
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
  type: 'automne', classes_ids: [], classes_noms: '', titulaires: '', autres_accompagnants: '', autres_acc_arr: [],
  date_sortie: '', destination: '', activites: '',
  lieu_depart: 'Sion, Synecom', lieu_depart_autre: '',
  heure_depart: '', lieu_retour: '', heure_retour: '',
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
  const [onglet, setOnglet] = useState('automne');
  const [sousOngletSuivi, setSousOngletSuivi] = useState('automne');
  const [sorties, setSorties] = useState([]);
  const [classes, setClasses] = useState([]);
  const [profs, setProfs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VIDE);
  const [editId, setEditId] = useState(null);
  const [showAddTit, setShowAddTit] = useState(false);
  const [suiviClasseSelect, setSuiviClasseSelect] = useState(null);
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
    // Toujours revenir sur la vue d'accueil (ajout/listing), jamais sur le suivi.
    setOnglet('automne');
    setSousOngletSuivi('automne');
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
    setForm({ ...FORM_VIDE, type: onglet === 'suivi' ? 'automne' : onglet });
    setEditId(null);
    setShowForm(true);
  };

  const ouvrirEdit = (s) => {
    const ids = s.classes_ids ? s.classes_ids.split(',').map(x => x.trim()).filter(Boolean) : [];
    const lieuDepart = LIEUX_PREDEFINIS.includes(s.lieu_depart) ? s.lieu_depart : (s.lieu_depart ? 'autre' : 'Sion, Synecom');
    setForm({
      type: s.type || 'autre',
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
      lieu_retour: s.lieu_retour || '',
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
    const payload = {
      ...form,
      classes_ids: (form.classes_ids || []).join(','),
      lieu_depart: lieuDepart,
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
    .filter(s => s.type === onglet)
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
        {onglet !== 'suivi' && (
          <button style={st.btnAdd} onClick={ouvrirNouvelle}>+ Ajouter</button>
        )}
      </div>
      <div style={st.searchRow}>
        <input
          style={st.searchInput}
          value={rechercheSorties}
          onChange={(e) => setRechercheSorties(e.target.value)}
          placeholder="Rechercher professeur, classe, destination..."
        />
        {!showTriTypes ? (
          <button type="button" style={st.btnTri} onClick={() => setShowTriTypes(true)}>Trier</button>
        ) : (
          <div style={st.toggleGroup}>
            {['Tous', 'Juin', 'Autres'].map((t) => (
              <button
                key={t}
                type="button"
                style={{ ...st.toggleBtn, ...(triType === t ? st.toggleBtnActif : {}) }}
                onClick={() => { setTriType(t); setShowTriTypes(false); }}
              >
                {t}
              </button>
            ))}
          </div>
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

      {/* Sous-onglets suivi — hors du cadre blanc */}
      {onglet === 'suivi' && (
        <div style={st.subTabsBar}>
          {[{id:'automne',label:'Automne'},{id:'juin',label:'Juin'},{id:'autres',label:'Autres'}].map(o => (
            <button key={o.id}
              style={{ ...st.subTabBtn, ...(sousOngletSuivi === o.id ? st.subTabBtnActif : {}) }}
              onClick={() => setSousOngletSuivi(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
      )}

      {/* Suivi — hors cadre blanc */}
      {onglet === 'suivi' && (() => {
        const sortiesDuSousOnglet = sorties.filter(s => s.type === sousOngletSuivi);
        // Pour chaque classe, trouver si une sortie existe
        const classesAvecSortie = classesSorted.map(cl => {
          const sortie = sortiesDuSousOnglet.find(s =>
            (s.classes_ids || '').split(',').map(x => x.trim()).includes(String(cl.id))
          );
          return { ...cl, sortie: sortie || null };
        });
        // Grouper par niveau (préfixe avant le numéro)
        const niveauxMap = {};
        classesAvecSortie.forEach(cl => {
          const niv = cl.nom.replace(/\s*\d+.*$/, '').trim() || cl.nom;
          if (!niveauxMap[niv]) niveauxMap[niv] = [];
          niveauxMap[niv].push(cl);
        });
        const sortieSelectionnee = suiviClasseSelect
          ? classesAvecSortie.find(cl => cl.id === suiviClasseSelect)?.sortie
          : null;

        // Suivi des professeurs
        // Tronque le nom composé : "TOUZANI-BOULAADAS" → "TOUZANI"
        const nomCourt = (fullName) => {
          const parts = (fullName || '').trim().split(' ');
          return parts.map((p, i) => i === parts.length - 1 ? p.split('-')[0] : p).join(' ');
        };
        const tousProfs = profs.filter(p => p.prenom && p.nom)
          .map(p => nomCourt(`${p.prenom} ${p.nom}`))
          .sort((a,b) => a.localeCompare(b,'fr'));
        const profsAffectes = new Set(
          sortiesDuSousOnglet.flatMap(s =>
            (s.titulaires || '').split(' et ').map(p => nomCourt(p)).filter(Boolean)
          )
        );

        return (
          <div style={{ marginTop: 15 }}>
            {/* Suivi des professeurs */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                Suivi des professeurs
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {tousProfs.map(prof => {
                  const affecte = profsAffectes.has(prof);
                  return (
                    <span key={prof} style={{
                      padding: '5px 16px', borderRadius: 20,
                      background: affecte ? '#dcfce7' : '#f1f5f9',
                      color: affecte ? '#15803d' : '#94a3b8',
                      fontWeight: 700, fontSize: 13,
                      textAlign: 'center',
                    }}>
                      {prof}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Suivi des classes */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Suivi des classes
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  Total budgets : {sortiesDuSousOnglet.reduce((sum, s) => sum + (parseFloat(s.budget) || 0), 0).toFixed(2)} CHF
                </div>
              </div>
              {Object.entries(niveauxMap).map(([niv, cls]) => (
                <div key={niv} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{niv}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {cls.map(cl => {
                      const actif = suiviClasseSelect === cl.id;
                      return (
                        <button key={cl.id} type="button"
                          onClick={() => cl.sortie ? setSuiviClasseSelect(actif ? null : cl.id) : null}
                          style={{
                            padding: '5px 16px', borderRadius: 20, border: actif ? '2px solid #15803d' : '2px solid transparent',
                            background: cl.sortie ? '#dcfce7' : '#f1f5f9',
                            color: cl.sortie ? '#15803d' : '#94a3b8',
                            fontWeight: 700, fontSize: 13,
                            cursor: cl.sortie ? 'pointer' : 'default',
                            transition: 'all .12s',
                          }}>
                          {cl.nom}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Détail de la sortie sélectionnée */}
              {sortieSelectionnee && (
                <div style={{ marginTop: 16, background: 'white', borderRadius: 12, padding: '18px 22px', border: '1px solid #bbf7d0', boxShadow: '0 2px 8px rgba(21,128,61,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#15803d' }}>
                      {sortieSelectionnee.classes_noms || '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => imprimer(sortieSelectionnee)} style={{ padding: '4px 10px', background: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>🖨️ Imprimer</button>
                      <button onClick={() => ouvrirEdit(sortieSelectionnee)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, opacity: 0.9, color: '#6366f1' }}>✏️</button>
                      <button onClick={() => setSuiviClasseSelect(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8', lineHeight: 1 }}>✕</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 13, color: '#374151' }}>
                    {sortieSelectionnee.date_sortie && <div><span style={{ fontWeight: 600 }}>Date :</span> {new Date(sortieSelectionnee.date_sortie).toLocaleDateString('fr-CH')}</div>}
                    {sortieSelectionnee.destination && <div><span style={{ fontWeight: 600 }}>Destination :</span> {sortieSelectionnee.destination}</div>}
                    {sortieSelectionnee.titulaires && <div><span style={{ fontWeight: 600 }}>Titulaires :</span> {sortieSelectionnee.titulaires}</div>}
                    {sortieSelectionnee.autres_accompagnants && <div><span style={{ fontWeight: 600 }}>Autres accompagnants :</span> {sortieSelectionnee.autres_accompagnants}</div>}
                    {sortieSelectionnee.lieu_depart && <div><span style={{ fontWeight: 600 }}>Départ :</span> {sortieSelectionnee.lieu_depart} {fmtHeure(sortieSelectionnee.heure_depart) ? `à ${fmtHeure(sortieSelectionnee.heure_depart)}` : ''}</div>}
                    {sortieSelectionnee.lieu_retour && <div><span style={{ fontWeight: 600 }}>Retour :</span> {sortieSelectionnee.lieu_retour} {fmtHeure(sortieSelectionnee.heure_retour) ? `à ${fmtHeure(sortieSelectionnee.heure_retour)}` : ''}</div>}
                    {sortieSelectionnee.budget && <div><span style={{ fontWeight: 600 }}>Budget :</span> {parseFloat(sortieSelectionnee.budget).toFixed(2)} CHF</div>}
                    {sortieSelectionnee.activites && <div style={{ gridColumn: '1 / -1' }}><span style={{ fontWeight: 600 }}>Activités :</span> {sortieSelectionnee.activites}</div>}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <button onClick={() => toggleApprouve(sortieSelectionnee)}
                      style={{ padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: sortieSelectionnee.approuve ? '#16a34a' : '#e2e8f0', color: sortieSelectionnee.approuve ? 'white' : '#64748b' }}>
                      {sortieSelectionnee.approuve ? '✓ Approuvé' : 'À approuver'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tableau de suivi existant */}
            <SuiviTable
              sorties={sortiesDuSousOnglet}
              onEdit={ouvrirEdit}
              onDelete={supprimer}
              onPrint={imprimer}
              onToggleApprouve={toggleApprouve}
            />
          </div>
        );
      })()}

      {/* Automne / Juin / Autres — hors cadre blanc */}
      {onglet !== 'suivi' && (
        sortiesOnglet.length === 0 ? (
          <div style={{ ...st.empty, marginTop: 15 }}>
            Aucune sortie pour <b>{ONGLETS.find(o => o.id === onglet)?.label}</b>.
            <br/><br/>
            <button style={st.btnAdd} onClick={ouvrirNouvelle}>+ Ajouter une sortie</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 15 }}>
            {sortiesOnglet.map(sortie => (
              <SortieCard key={sortie.id} sortie={sortie} onEdit={ouvrirEdit} onDelete={supprimer} onPrint={imprimer} onToggleApprouve={toggleApprouve} />
            ))}
          </div>
        )
      )}

      {/* Form popup */}
      {showForm && (
        <div style={st.overlay} onClick={() => setShowForm(false)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <div style={st.modalHeader}>
              <h3 style={st.modalTitre}>{editId ? 'Modifier' : 'Nouvelle'} sortie scolaire</h3>
              <button style={st.btnClose} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={sauvegarder} style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 80px)', paddingRight: 6 }}>

              {/* Type */}
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
                  <label style={st.lbl}>Lieu de départ</label>
                  <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    {[...LIEUX_PREDEFINIS, 'autre'].map((lieu, i) => (
                      <button key={lieu} type="button"
                        onClick={() => setForm({...form, lieu_depart: lieu})}
                        style={{
                          padding: '9px 0', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flex: 1,
                          background: form.lieu_depart === lieu ? '#6366f1' : (i % 2 === 0 ? '#f8fafc' : '#f1f5f9'),
                          color: form.lieu_depart === lieu ? 'white' : '#475569',
                          borderRight: i < 2 ? '1px solid #e2e8f0' : 'none',
                        }}>
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
                  <label style={st.lbl}>Heure de départ</label>
                  <TimePicker value={form.heure_depart} onChange={e => setForm({...form, heure_depart: e.target.value})} style={{ ...st.inp, cursor: 'pointer' }} />
                </div>
              </div>

              {/* Ligne retour — heure toujours alignée avec lieu retour */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={st.lbl}>Lieu de retour</label>
                  <input style={{ ...st.inp, width: '100%', boxSizing: 'border-box' }} value={form.lieu_retour} onChange={e => setForm({...form, lieu_retour: e.target.value})} placeholder="Ex: Gare de Sion" />
                </div>
                <div style={{ width: 170 }}>
                  <label style={st.lbl}>Heure de retour</label>
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

function SortieCard({ sortie, onEdit, onDelete, onPrint, onToggleApprouve }) {
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
          <button onClick={() => onToggleApprouve(sortie)}
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
  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e8eaf6' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#6366f1', color: 'white' }}>
            {['Classes','Date de la sortie','Destination','Lieu de départ','Heure de départ','Lieu de retour','Heure de retour','Budget','Approbation',''].map(h => (
              <th key={h} style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.15)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorties.map((s, i) => {
            const classesNoms = s.classes_noms || [s.classe1, s.classe2].filter(Boolean).join(', ') || '—';
            return (
              <tr key={s.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                <td style={sc.td}>{classesNoms}</td>
                <td style={{ ...sc.td, whiteSpace: 'nowrap' }}>{s.date_sortie ? new Date(s.date_sortie).toLocaleDateString('fr-CH') : '—'}</td>
                <td style={{ ...sc.td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.destination || '—'}</td>
                <td style={sc.td}>{s.lieu_depart || '—'}</td>
                <td style={{ ...sc.td, whiteSpace: 'nowrap' }}>{fmtHeure(s.heure_depart) || '—'}</td>
                <td style={sc.td}>{s.lieu_retour || '—'}</td>
                <td style={{ ...sc.td, whiteSpace: 'nowrap' }}>{fmtHeure(s.heure_retour) || '—'}</td>
                <td style={{ ...sc.td, whiteSpace: 'nowrap', textAlign: 'right' }}>{s.budget ? parseFloat(s.budget).toFixed(1) : '—'}</td>
                <td style={{ ...sc.td, textAlign: 'center' }}>
                  <button onClick={() => onToggleApprouve(s)}
                    style={{ padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: s.approuve ? '#16a34a' : '#e2e8f0', color: s.approuve ? 'white' : '#64748b', whiteSpace: 'nowrap' }}>
                    {s.approuve ? '✓ Oui' : '—'}
                  </button>
                </td>
                <td style={{ ...sc.td, whiteSpace: 'nowrap', textAlign: 'center' }}>
                  <button style={sc.btnPrint} onClick={() => onPrint(s)}>🖨️</button>
                  <button style={sc.btnEdit} onClick={() => onEdit(s)}>✏️</button>
                  <button style={sc.btnDel} onClick={() => onDelete(s.id)}>🗑️</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const st = {
  page: { minHeight: '100%', boxSizing: 'border-box', background: '#f8fafc', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif", padding: '28px 32px' },
  header: { display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 },
  btnBack: { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 500, fontSize: 13, cursor: 'pointer' },
  titre: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, flex: 1 },
  btnAdd: { padding: '9px 18px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  searchRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
  searchInput: { width: '100%', maxWidth: 460, padding: '10px 12px', borderRadius: 8, border: '1px solid #c7d2fe', fontSize: 14, color: '#1e293b' },
  btnTri: { padding: '7px 16px', borderRadius: 17, border: '1px solid #d8b4fe', background: 'white', color: '#7e22ce', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' },
  toggleGroup: { display: 'flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2, flexWrap: 'wrap' },
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
  modal: { background: 'white', borderRadius: 14, padding: 28, width: 'min(700px, 96vw)', maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' },
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
  btnEdit: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, opacity: 0.9, color: '#6366f1' },
  btnDel: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, opacity: 0.9, color: '#ef4444' },
};
