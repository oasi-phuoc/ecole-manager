import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'https://ecole-manager-backend.onrender.com/api';

export default function DocumentsAdministratifs() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };
  const currentUser = JSON.parse(localStorage.getItem('utilisateur') || '{}');
  const isAdmin = currentUser?.role === 'admin';

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [designation, setDesignation] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chargerDocuments();
  }, []);

  const chargerDocuments = async () => {
    setLoading(true);
    try {
      const r = await axios.get(API + '/documents-administratifs', { headers });
      setDocuments(r.data || []);
    } catch (err) {
      setDocuments([]);
    }
    setLoading(false);
  };

  const documentsTries = useMemo(() => {
    return [...documents].sort((a, b) =>
      (a.designation || '').localeCompare(b.designation || '', 'fr', { sensitivity: 'base' })
    );
  }, [documents]);

  const lireFichier = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const resetForm = () => {
    setDesignation('');
    setSelectedFile(null);
    setEditing(null);
    setDragOver(false);
  };

  const ouvrirAjout = () => {
    resetForm();
    setShowForm(true);
    setMsg('');
  };

  const ouvrirEdition = (doc) => {
    setEditing(doc);
    setDesignation(doc.designation || '');
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
      if (editing) {
        let payload = { designation: designation.trim() };
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
    <div style={{ padding: 28, background: '#f8fafc', minHeight: '100vh', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ padding: '8px 14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', color: '#475569' }}
        >
          ← Retour
        </button>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>🗂️ Documents administratifs</h2>
      </div>
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
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

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Désignation *</div>
              <input
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', color: '#334155' }}
                placeholder="Ex: Attestation de suivi TCF"
              />
            </div>

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
          <div style={{ color: '#94a3b8', padding: 12 }}>Aucun document administratif</div>
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
