import React, { useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { useSearchParams } from 'react-router-dom';
import { getSessionUser } from '../utils/session';
import { stickyPageChrome } from '../styles/pageShell';
import { PageLoader, LoadingButton } from '../components/LoadingUI';


export default function DocumentsAdministratifs() {
  const headers = {};
  const currentUser = getSessionUser() || {};
  const isAdmin = currentUser?.role === 'admin';

  const CATEGORIES = ['Administratifs', 'Pédagogiques', 'Séances', 'Formulaires', 'Divers'];
  const CATEGORY_BADGE_STYLES = {
    Administratifs: { bg: '#e0e7ff', color: '#3730a3' },
    'Pédagogiques': { bg: '#ede9fe', color: '#6d28d9' },
    'Séances': { bg: '#dcfce7', color: '#166534' },
    Formulaires: { bg: '#fef3c7', color: '#92400e' },
    Divers: { bg: '#fee2e2', color: '#991b1b' },
  };
  const TAB_TO_CATEGORY = {
    administratifs: 'Administratifs',
    pedagogiques: 'Pédagogiques',
    seances: 'Séances',
    formulaires: 'Formulaires',
    divers: 'Divers',
  };
  const [searchParams, setSearchParams] = useSearchParams();

  const [documents, setDocuments] = useState([]);
  const [niveauxDB, setNiveauxDB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [designation, setDesignation] = useState('');
  const [categorie, setCategorie] = useState('Administratifs');
  const [sousCategorie, setSousCategorie] = useState('');
  const [categorieOnglet, setCategorieOnglet] = useState('Administratifs');
  const [niveauOnglet, setNiveauOnglet] = useState('tous');
  const [showNiveauxFiltres, setShowNiveauxFiltres] = useState(false);
  const [rechercheDocs, setRechercheDocs] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [docPreview, setDocPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chargerDocuments();
    apiClient.get('/donnees/niveaux').then(r => setNiveauxDB(r.data || [])).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement initial
  }, []);

  const chargerDocuments = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/documents-administratifs', { headers });
      setDocuments(r.data || []);
      setMsg('');
    } catch (err) {
      setDocuments([]);
      setMsg('❌ Erreur chargement: ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  const activeTab = searchParams.get('tab') || 'administratifs';
  useEffect(() => { if (activeTab === 'accueil') setSearchParams({ tab: 'administratifs' }, { replace: true }); }, [activeTab]);
  const isAccueil = false;

  useEffect(() => {
    const nextCategory = TAB_TO_CATEGORY[activeTab];
    if (nextCategory) setCategorieOnglet(nextCategory);
  }, [activeTab]);

  const documentsTries = useMemo(() => {
    return [...documents]
      .filter(d => {
        if (isAccueil) return true;
        return (d.categorie || 'Administratifs') === categorieOnglet;
      })
      .filter(d => {
        if (isAccueil) return true;
        if (categorieOnglet !== 'Pédagogiques' || niveauOnglet === 'tous') return true;
        return (d.sous_categorie || '') === niveauOnglet;
      })
      .filter(d => {
        if (!rechercheDocs.trim()) return true;
        const q = rechercheDocs.toLowerCase();
        return (d.designation || '').toLowerCase().includes(q) || (d.nom_fichier || '').toLowerCase().includes(q);
      })
      .sort((a, b) =>
        (a.designation || '').localeCompare(b.designation || '', 'fr', { sensitivity: 'base' })
      );
  }, [documents, categorieOnglet, niveauOnglet, rechercheDocs, isAccueil]);

  const lireFichier = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const resetForm = () => {
    setDesignation('');
    const catActuelle = TAB_TO_CATEGORY[activeTab] || categorieOnglet;
    setCategorie(catActuelle);
    setSousCategorie(catActuelle === 'Pédagogiques' && niveauOnglet !== 'tous' ? niveauOnglet : '');
    setSelectedFile(null);
    setEditing(null);
    setDragOver(false);
  };

  const ouvrirAjout = () => {
    resetForm();
    const catActuelle = TAB_TO_CATEGORY[activeTab] || categorieOnglet;
    setCategorie(catActuelle);
    setSousCategorie(catActuelle === 'Pédagogiques' && niveauOnglet !== 'tous' ? niveauOnglet : '');
    setShowForm(true);
    setMsg('');
  };

  const ouvrirEdition = (doc) => {
    setEditing(doc);
    setDesignation(doc.designation || '');
    setCategorie(doc.categorie || 'Administratifs');
    setSousCategorie(doc.sous_categorie || '');
    setSelectedFile(null);
    setShowForm(true);
    setMsg('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!designation.trim()) {
      setMsg('❌ La désignation est obligatoire.');
      return;
    }
    if (!editing && !selectedFile) {
      setMsg('❌ Veuillez sélectionner un fichier.');
      return;
    }
    if (selectedFile && selectedFile.size > 12 * 1024 * 1024) {
      setMsg('❌ Fichier trop volumineux (max 12MB).');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        let payload = { designation: designation.trim(), categorie, sous_categorie: sousCategorie || null };
        if (selectedFile) {
          payload = {
            ...payload,
            nom_fichier: selectedFile.name,
            contenu: await lireFichier(selectedFile),
            taille: selectedFile.size,
          };
        }
        await apiClient.put('/documents-administratifs/' + editing.id, payload, { headers });
      } else {
        await apiClient.post('/documents-administratifs', {
          designation: designation.trim(),
          categorie,
          sous_categorie: sousCategorie || null,
          nom_fichier: selectedFile.name,
          contenu: await lireFichier(selectedFile),
          taille: selectedFile.size,
        }, { headers });
      }
      await chargerDocuments();
      setShowForm(false);
      resetForm();
      setMsg('');
    } catch (err) {
      setMsg('❌ Erreur : ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    try {
      await apiClient.delete('/documents-administratifs/' + doc.id, { headers });
      await chargerDocuments();
    } catch (err) {
      setMsg('❌ Erreur : ' + (err.response?.data?.message || err.message));
    }
  };

  const telecharger = async (doc) => {
    try {
      const r = await apiClient.get('/documents-administratifs/' + doc.id + '/telecharger', { headers });
      const a = document.createElement('a');
      a.href = r.data.contenu;
      a.download = r.data.nom_fichier;
      a.click();
    } catch (err) {
      setMsg('❌ Erreur téléchargement');
    }
  };

  const visualiser = async (doc) => {
    try {
      const r = await apiClient.get('/documents-administratifs/' + doc.id + '/telecharger', { headers });
      setDocPreview({ url: r.data.contenu, nom: r.data.nom_fichier || doc.designation });
    } catch (err) {
      setMsg('❌ Erreur prévisualisation');
    }
  };

  const now = new Date();
  const auteurSession = `${currentUser?.nom || ''} ${currentUser?.prenom || ''}`.trim() || '—';

  return (
    <div style={{ padding: '28px 32px', background: '#f8fafc', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" }}>
      <div style={{...stickyPageChrome(), marginBottom:0}}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, minHeight: 40 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a', flex: 1 }}>Documents</h2>
        {isAdmin && (
          <button onClick={ouvrirAjout} style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: '#6366f1', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            + Ajouter
          </button>
        )}
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <input
            value={rechercheDocs}
            onChange={(e) => setRechercheDocs(e.target.value)}
            placeholder="Rechercher un document..."
            style={{ width: 280, padding: '9px 14px', borderRadius: 8, border: '1px solid #c7d2fe', background: 'white', outline: 'none', fontSize: 14, color: '#1e293b', fontFamily: 'inherit' }}
          />
          {activeTab === 'pedagogiques' && (
            !showNiveauxFiltres ? (
              <button
                type="button"
                onClick={() => setShowNiveauxFiltres(true)}
                style={{ padding: '7px 14px', borderRadius: 17, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#94a3b8', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
              >
                Trier
              </button>
            ) : (
              <div className="chip-tabs" style={{ display: 'flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2, flexWrap: 'wrap' }}>
                {[{ id: 'tous', label: 'Tous' }, ...niveauxDB.map(n => ({ id: n.nom, label: n.nom }))].map(n => (
                  <button
                    key={n.id}
                    type="button"
                    style={{ padding: '7px 14px', borderRadius: 17, border: 'none', background: niveauOnglet === n.id ? '#6366f1' : 'transparent', cursor: 'pointer', fontWeight: niveauOnglet === n.id ? 700 : 600, color: niveauOnglet === n.id ? 'white' : '#6d28d9', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                    onClick={() => { setNiveauOnglet(n.id); setShowNiveauxFiltres(false); }}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>
      </div>

      {(() => {
        const docsLast = (documents || []).slice().sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)).slice(0, 15);
        const docsPopular = (documents || []).slice().sort((a, b) => Number(b.telechargements || b.downloads || 0) - Number(a.telechargements || a.downloads || 0)).slice(0, 15);
        const btnAction = { padding: 4, border: 'none', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
        const renderTable = (title, docs) => (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: 'white', overflow: 'hidden' }}>
            <div style={{ overflow: 'auto', maxHeight: 225, WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><th colSpan={3} style={{ padding: '9px 14px', background: '#6366f1', color: 'white', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2 }}>{title}</th></tr>
              </thead>
              <tbody>
                {docs.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '12px 14px', fontSize: 13, color: '#94a3b8', background: 'white' }}>
                      Aucun document
                    </td>
                  </tr>
                )}
                {docs.map((d, idx) => (
                  <tr key={d.id} style={{ background: idx % 2 === 0 ? 'white' : '#fafbfc', borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', fontSize: 13, color: '#334155' }}>{d.designation}</td>
                    <td style={{ padding: '8px 4px', width: 28, textAlign: 'center' }}>
                      <button onClick={() => visualiser(d)} title="Visualiser" style={{ ...btnAction, background: '#ede9fe', color: '#6d28d9' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 13a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>
                      </button>
                    </td>
                    <td style={{ padding: '8px 10px 8px 4px', width: 28, textAlign: 'center' }}>
                      <button onClick={() => telecharger(d)} title="Télécharger" style={{ ...btnAction, background: '#e0e7ff', color: '#4338ca' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        );
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {renderTable('Derniers documents ajoutés', docsLast)}
            {renderTable('Documents souvent utilisés', docsPopular)}
          </div>
        );
      })()}

      {(!isAccueil || rechercheDocs.trim()) && (
      <div>
        {msg && !showForm && (
          <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#ede9fe', color: '#4c1d95', fontSize: 13, fontWeight: 600 }}>
            {msg}
          </div>
        )}

        {loading ? (
          <PageLoader label="Chargement..." compact style={{ padding: 12 }} />
        ) : (
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', marginTop: 4 }}>
          <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 290px)', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {activeTab === 'pedagogiques' ? (
                  <>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#64748b', fontSize: 11, width: 1, whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 2, background: 'white' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#64748b', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, background: 'white' }}>Nom</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#64748b', fontSize: 11, width: 1, whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 2, background: 'white' }}>Niveau</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#64748b', fontSize: 11, width: 1, whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 2, background: 'white' }}>VISA</th>
                  </>
                ) : (
                  <>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#64748b', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, background: 'white' }}>Désignation</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#64748b', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, background: 'white' }}>Fichier</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#64748b', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, background: 'white' }}>Ajouté par</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#64748b', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, background: 'white' }}>Date</th>
                  </>
                )}
                <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 700, color: '#64748b', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, background: 'white' }}></th>
              </tr>
            </thead>
            <tbody>
              {documentsTries.length === 0 && (
                <tr style={{ borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                  <td colSpan={activeTab === 'pedagogiques' ? 5 : 5} style={{ padding: '11px 14px', color: '#94a3b8' }}>
                    Aucun document
                  </td>
                </tr>
              )}
              {documentsTries.map((doc, i) => {
                const visa = [doc.auteur_prenom, doc.auteur_nom].filter(Boolean).map(s => s.charAt(0).toUpperCase()).join('');
                return (
                <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                  {activeTab === 'pedagogiques' ? (
                    <>
                      <td style={{ padding: '11px 14px', color: '#0f172a', fontSize: 13, whiteSpace: 'nowrap', width: 1 }}>{new Date(doc.created_at).toLocaleDateString('fr-CH')}</td>
                      <td style={{ padding: '11px 14px', color: '#0f172a', width: '100%' }}>{doc.designation}</td>
                      <td style={{ padding: '11px 14px', color: '#6366f1', fontSize: 13, whiteSpace: 'nowrap', width: 1 }}>{doc.sous_categorie || '—'}</td>
                      <td style={{ padding: '11px 14px', color: '#0f172a', fontSize: 13, width: 1, whiteSpace: 'nowrap' }}>{visa || '—'}</td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '11px 14px', color: '#0f172a', fontWeight: 600 }}>{doc.designation}</td>
                      <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 13 }}>{doc.nom_fichier}{doc.taille ? ' · ' + Math.round(doc.taille / 1024) + ' KB' : ''}</td>
                      <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 13 }}>{(doc.auteur_nom || '')} {(doc.auteur_prenom || '')}</td>
                      <td style={{ padding: '11px 14px', color: '#0f172a', fontSize: 13, whiteSpace: 'nowrap' }}>{new Date(doc.created_at).toLocaleDateString('fr-CH')}</td>
                    </>
                  )}
                  <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => visualiser(doc)} style={{ padding: 5, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#e0e7ff', color: '#4338ca' }} title="Visualiser">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path fillRule="evenodd" d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 13a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>
                      </button>
                      <button onClick={() => telecharger(doc)} style={{ padding: 5, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#e0e7ff', color: '#4338ca' }} title="Télécharger">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>
                      </button>
                      {isAdmin && (
                        <>
                          <button onClick={() => ouvrirEdition(doc)} style={{ padding: 5, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#e0e7ff', color: '#4338ca' }} title="Modifier">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => handleDelete(doc)} style={{ padding: 5, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', color: '#ef4444' }} title="Supprimer">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          </div>
        )}
      </div>
      )}

      {showForm && isAdmin && (
        <div
          className="modal-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250, padding: 20, boxSizing: 'border-box' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); setMsg(''); } }}
        >
          <div
            style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 25px 50px rgba(0,0,0,0.15)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{editing ? 'Modifier le document' : 'Nouveau document'}</h3>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); setMsg(''); }}
                style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' }}
              >
                Fermer
              </button>
            </div>
            <div style={{ padding: 18, overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {msg && (
                <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#ede9fe', color: '#4c1d95', fontSize: 13, fontWeight: 600 }}>
                  {msg}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Nom & prénom (session)</div>
                    <input value={auteurSession} readOnly style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f1f5f9', color: '#334155', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Date</div>
                    <input value={now.toLocaleDateString('fr-CH')} readOnly style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f1f5f9', color: '#334155', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Désignation *</div>
                  <input
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', color: '#334155', boxSizing: 'border-box' }}
                    placeholder="Ex: Attestation de suivi TCF"
                  />
                </div>

                {activeTab === 'pedagogiques' && niveauxDB.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Niveau *</div>
                    <div className="chip-tabs" style={{ display: 'flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2, flexWrap: 'wrap' }}>
                      {[{ id: '', label: 'Tous les niveaux' }, ...niveauxDB.map(n => ({ id: n.nom, label: n.nom }))].map(n => (
                        <button
                          key={n.id === '' ? '__tous' : n.id}
                          type="button"
                          onClick={() => setSousCategorie(n.id)}
                          style={{ padding: '7px 16px', borderRadius: 17, border: 'none', background: sousCategorie === n.id ? '#6366f1' : 'transparent', cursor: 'pointer', fontWeight: sousCategorie === n.id ? 700 : 600, color: sousCategorie === n.id ? 'white' : '#6d28d9', fontSize: 13, fontFamily: 'inherit', outline: 'none', whiteSpace: 'nowrap' }}
                        >
                          {n.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed ' + (dragOver ? '#6366f1' : '#cbd5e1'),
                    borderRadius: 10,
                    padding: 18,
                    textAlign: 'center',
                    background: dragOver ? '#eef2ff' : 'white',
                    cursor: 'pointer',
                    marginBottom: 10,
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#6366f1', lineHeight: 1 }}>+</div>
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                    Glisser-déposer le document ici
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    ou cliquer pour parcourir l'ordinateur
                  </div>
                </div>

                {selectedFile && (
                  <div style={{ fontSize: 12, color: '#0f766e', marginBottom: 10 }}>
                    📎 {selectedFile.name}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  <button type="button" onClick={() => { setShowForm(false); resetForm(); setMsg(''); }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    Annuler
                  </button>
                  <LoadingButton type="submit" loading={saving} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                    {editing ? 'Modifier' : 'Ajouter'}
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {docPreview && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }} onClick={() => setDocPreview(null)}>
          <div style={{ position: 'relative', width: '90vw', height: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{docPreview.nom}</span>
              <button onClick={() => setDocPreview(null)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', padding: '6px 14px', fontWeight: 600, fontSize: 13 }}>Fermer</button>
            </div>
            {docPreview.url.match(/^data:image\//i) ? (
              <img src={docPreview.url} alt={docPreview.nom} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, objectFit: 'contain', background: 'white' }} />
            ) : (
              <iframe src={docPreview.url} title={docPreview.nom} style={{ width: '100%', flex: 1, borderRadius: 8, border: 'none' }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
