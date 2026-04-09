import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getSessionUser } from '../utils/session';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';

export default function DocumentsAdministratifs() {
  const navigate = useNavigate();
  const headers = {};
  const currentUser = getSessionUser() || {};
  const isAdmin = currentUser?.role === 'admin';

  const CATEGORIES = ['Administratifs', 'Pédagogiques', 'Séances', 'Formulaires', 'Divers'];

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
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chargerDocuments();
    axios.get(API + '/donnees/niveaux').then(r => setNiveauxDB(r.data || [])).catch(() => {});
  }, []);

  const chargerDocuments = async () => {
    setLoading(true);
    try {
      const r = await axios.get(API + '/documents-administratifs', { headers });
      setDocuments(r.data || []);
      setMsg('');
    } catch (err) {
      setDocuments([]);
      setMsg('❌ Erreur chargement: ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  const documentsTries = useMemo(() => {
    return [...documents]
      .filter(d => (d.categorie || 'Administratifs') === categorieOnglet)
      .filter(d => {
        if (categorieOnglet !== 'Pédagogiques' || niveauOnglet === 'tous') return true;
        return (d.sous_categorie || '') === niveauOnglet;
      })
      .sort((a, b) =>
        (a.designation || '').localeCompare(b.designation || '', 'fr', { sensitivity: 'base' })
      );
  }, [documents, categorieOnglet, niveauOnglet]);

  const lireFichier = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const resetForm = () => {
    setDesignation('');
    setCategorie(categorieOnglet);
    setSousCategorie(categorieOnglet === 'Pédagogiques' && niveauOnglet !== 'tous' ? niveauOnglet : '');
    setSelectedFile(null);
    setEditing(null);
    setDragOver(false);
  };

  const ouvrirAjout = () => {
    resetForm();
    setCategorie(categorieOnglet);
    setSousCategorie(categorieOnglet === 'Pédagogiques' && niveauOnglet !== 'tous' ? niveauOnglet : '');
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

    setSaving(true);
    try {
      if (selectedFile && selectedFile.size > 12 * 1024 * 1024) {
        setMsg('❌ Fichier trop volumineux (max 12MB).');
        setSaving(false);
        return;
      }
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
        await axios.put(API + '/documents-administratifs/' + editing.id, payload, { headers });
      } else {
        await axios.post(API + '/documents-administratifs', {
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
    }
    setSaving(false);
  };

  const handleDelete = async (doc) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    try {
      await axios.delete(API + '/documents-administratifs/' + doc.id, { headers });
      await chargerDocuments();
    } catch (err) {
      setMsg('❌ Erreur : ' + (err.response?.data?.message || err.message));
    }
  };

  const telecharger = async (doc) => {
    try {
      const r = await axios.get(API + '/documents-administratifs/' + doc.id + '/telecharger', { headers });
      const a = document.createElement('a');
      a.href = r.data.contenu;
      a.download = r.data.nom_fichier;
      a.click();
    } catch (err) {
      setMsg('❌ Erreur téléchargement');
    }
  };

  const now = new Date();
  const auteurSession = `${currentUser?.nom || ''} ${currentUser?.prenom || ''}`.trim() || '—';

  return (
    <div style={{ padding: '28px 32px', background: '#f8fafc', minHeight: '100vh', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>🗂️ Documents</h2>
      </div>

      {/* Onglets catégories */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #6366f1', marginBottom: 0 }}>
        {CATEGORIES.map(cat => (
          <button key={cat}
            style={{ padding: '9px 0', background: categorieOnglet === cat ? '#6366f1' : '#ede9fe', border: 'none', borderRadius: '10px 10px 0 0', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: categorieOnglet === cat ? 'white' : '#5b21b6', marginRight: 0, outline: 'none', lineHeight: '1', marginBottom: categorieOnglet === cat ? -1 : 0, zIndex: categorieOnglet === cat ? 2 : 1, width: 140, minWidth: 140, textAlign: 'center' }}
            onClick={() => { setCategorieOnglet(cat); setShowForm(false); resetForm(); setMsg(''); }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Sous-onglets niveaux pour Pédagogiques */}
      {categorieOnglet === 'Pédagogiques' && niveauxDB.length > 0 && (
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #c4b5fd', marginBottom: 0, background: '#f5f3ff', paddingTop: 8, paddingLeft: 8, paddingRight: 8 }}>
          {[{ id: 'tous', label: 'Tous' }, ...niveauxDB.map(n => ({ id: n.nom, label: n.nom }))].map(n => (
            <button key={n.id}
              style={{ padding: '7px 14px', background: niveauOnglet === n.id ? '#7c3aed' : '#ede9fe', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: niveauOnglet === n.id ? 'white' : '#6d28d9', marginRight: 0, outline: 'none', lineHeight: '1', marginBottom: niveauOnglet === n.id ? -1 : 0 }}
              onClick={() => { setNiveauOnglet(n.id); setShowForm(false); }}>
              {n.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderTopLeftRadius: 0, borderRadius: '0 12px 12px 12px', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, color: '#475569' }}>Documents classés par ordre alphabétique</div>
          {isAdmin && (
            <button
              onClick={ouvrirAjout}
              style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: '#6366f1', color: 'white', fontWeight: 700, cursor: 'pointer' }}
            >
              + Ajouter un document
            </button>
          )}
        </div>

        {msg && (
          <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: msg.startsWith('❌') ? '#fee2e2' : '#dcfce7', color: msg.startsWith('❌') ? '#991b1b' : '#166534', fontSize: 13, fontWeight: 600 }}>
            {msg}
          </div>
        )}

        {showForm && isAdmin && (
          <form onSubmit={handleSubmit} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16, background: '#f8fafc' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Nom & prénom (session)</div>
                <input value={auteurSession} disabled style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f1f5f9', color: '#334155' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Date</div>
                <input value={now.toLocaleDateString('fr-CH')} disabled style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f1f5f9', color: '#334155' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Désignation *</div>
                <input
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', color: '#334155', boxSizing: 'border-box' }}
                  placeholder="Ex: Attestation de suivi TCF"
                />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Catégorie</div>
                <select
                  value={categorie}
                  onChange={e => { setCategorie(e.target.value); if (e.target.value !== 'Pédagogiques') setSousCategorie(''); }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', color: '#334155' }}
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            {categorie === 'Pédagogiques' && niveauxDB.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Niveau</div>
                <select
                  value={sousCategorie}
                  onChange={e => setSousCategorie(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', color: '#334155' }}
                >
                  <option value="">— Tous niveaux —</option>
                  {niveauxDB.map(n => <option key={n.id} value={n.nom}>{n.nom}</option>)}
                </select>
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
                marginBottom: 10
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

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                Annuler
              </button>
              <button type="submit" disabled={saving} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'Enregistrement...' : (editing ? 'Modifier' : 'Ajouter')}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div style={{ color: '#94a3b8', padding: 12 }}>Chargement...</div>
        ) : documentsTries.length === 0 ? (
          <div style={{ color: '#94a3b8', padding: 12 }}>Aucun document</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {documentsTries.map(doc => (
              <div key={doc.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{doc.designation}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      {doc.nom_fichier} • {(doc.taille ? Math.round(doc.taille / 1024) + ' KB' : 'taille inconnue')}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                      Uploadé par {(doc.auteur_nom || '')} {(doc.auteur_prenom || '')} • {new Date(doc.created_at).toLocaleDateString('fr-CH')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <button onClick={() => telecharger(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} title="Télécharger">⬇️</button>
                    {isAdmin && (
                      <>
                        <button onClick={() => ouvrirEdition(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} title="Modifier">✏️</button>
                        <button onClick={() => handleDelete(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} title="Supprimer">🗑️</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
