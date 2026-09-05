import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../lib/apiClient';
import { stickyPageChrome } from '../styles/pageShell';
import { useIsMobile } from '../hooks/useIsMobile';
import { PageLoader } from '../components/LoadingUI';


const fmt = (v) => {
  if (v == null || v === '') return '—';
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d)) return d.toLocaleString('fr-CH');
  }
  return s;
};

export default function Archives() {
  const isMobile = useIsMobile();
  const [archives, setArchives] = useState([]);
  const [archiveId, setArchiveId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [groupe, setGroupe] = useState('');
  const [tableName, setTableName] = useState('');
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [erreur, setErreur] = useState('');
  const [offset, setOffset] = useState(0);
  const PAGE = 250;

  const chargerListe = async () => {
    setErreur('');
    try {
      const res = await apiClient.get('/archives');
      const list = Array.isArray(res.data) ? res.data : [];
      setArchives(list);
      setArchiveId((prev) => prev || list[0]?.id || null);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Impossible de charger les archives.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { chargerListe(); }, []);

  useEffect(() => {
    if (!archiveId) { setDetail(null); return undefined; }
    let active = true;
    (async () => {
      try {
        const res = await apiClient.get('/archives/' + archiveId);
        if (!active) return;
        setDetail(res.data);
        const first = res.data?.groupes?.[0];
        setGroupe(first?.folder || '');
        setTableName(first?.tables?.[0]?.table_name || '');
        setTableData(null);
        setOffset(0);
      } catch (err) {
        if (active) setErreur(err.response?.data?.message || 'Archive introuvable.');
      }
    })();
    return () => { active = false; };
  }, [archiveId]);

  useEffect(() => {
    if (!archiveId || !tableName) { setTableData(null); return undefined; }
    let active = true;
    setLoadingTable(true);
    (async () => {
      try {
        const res = await apiClient.get(`/archives/${archiveId}/tables/${encodeURIComponent(tableName)}`, {
          params: { limit: PAGE, offset },
        });
        if (active) setTableData(res.data);
      } catch (err) {
        if (active) setErreur(err.response?.data?.message || 'Lecture impossible.');
      } finally {
        if (active) setLoadingTable(false);
      }
    })();
    return () => { active = false; };
  }, [archiveId, tableName, offset]);

  const libelleAnnee = (a) => {
    const same = archives.filter((x) => x.annee_scolaire === a.annee_scolaire);
    if (same.length <= 1) return a.annee_scolaire;
    const d = a.created_at ? new Date(a.created_at).toLocaleDateString('fr-CH') : '';
    return d ? `${a.annee_scolaire} · ${d}` : a.annee_scolaire;
  };

  const groupeActif = useMemo(
    () => (detail?.groupes || []).find((g) => g.folder === groupe) || detail?.groupes?.[0],
    [detail, groupe]
  );
  const fichiers = detail?.fichiers || [];
  const voirDocuments = groupe === 'documents' || groupe === '01-eleves';

  const exporter = async () => {
    if (!archiveId) return;
    setExporting(true);
    setErreur('');
    try {
      const res = await apiClient.get(`/archives/${archiveId}/export`, {
        responseType: 'blob',
        timeout: 300000,
      });
      if (res.data && res.data.type && String(res.data.type).includes('application/json')) {
        throw new Error(JSON.parse(await res.data.text()).message || 'Export impossible');
      }
      const cd = res.headers['content-disposition'] || '';
      const match = cd.match(/filename="?([^"]+)"?/i);
      const name = match?.[1] || `Oasis-archive-${detail?.annee_scolaire || 'annee'}.zip`;
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let message = err.message || 'Erreur d’export';
      const data = err.response?.data;
      if (data instanceof Blob) {
        try { message = JSON.parse(await data.text()).message || message; } catch { /* ignore */ }
      } else if (data?.message) message = data.message;
      setErreur(message);
    } finally {
      setExporting(false);
    }
  };

  const telechargerFichier = async (f) => {
    try {
      const res = await apiClient.get(`/archives/${archiveId}/fichiers/${f.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.nom || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setErreur('Téléchargement du document impossible.');
    }
  };

  const colonnes = tableData?.colonnes || [];
  const lignes = tableData?.lignes || [];

  return (
    <div style={s.page}>
      <div style={s.main}>
        <div style={stickyPageChrome()}>
          <div style={{ ...s.topBar, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            <div>
              <h1 style={s.titre}>Archives</h1>
              <p style={s.sousTitre}>Données des années précédentes — lecture seule, classées par année. Export Excel + PDF disponible pour chaque archive.</p>
            </div>
            <button type="button" onClick={exporter} disabled={!archiveId || exporting} style={s.btnExport} title="Télécharge un ZIP contenant les fichiers Excel et PDF de l’année">
              {exporting ? 'Export…' : 'Exporter Excel + PDF'}
            </button>
          </div>
        </div>

        {erreur && <div style={s.erreur}>{erreur}</div>}

        {loading ? (
          <PageLoader compact label="Chargement…" />
        ) : archives.length === 0 ? (
          <div style={s.vide}>
            Aucune année archivée pour le moment. Lors de la réinitialisation de rentrée, les données sont d’abord transférées ici.
          </div>
        ) : (
          <>
            <div className="chip-tabs chip-tabs-equal" style={s.years}>
              {archives.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setArchiveId(a.id)}
                  style={{
                    ...s.yearBtn,
                    background: archiveId === a.id ? '#6366f1' : 'transparent',
                    color: archiveId === a.id ? 'white' : '#6d28d9',
                    fontWeight: archiveId === a.id ? 700 : 600,
                  }}
                >
                  {libelleAnnee(a)}
                </button>
              ))}
            </div>

            {detail && (
              <div style={s.meta}>
                <span><b>{detail.nom_ecole || 'Oasis'}</b> · {detail.annee_scolaire}</span>
                <span>Archivé le {detail.created_at ? new Date(detail.created_at).toLocaleString('fr-CH') : '—'}</span>
                {detail.auteur_prenom && <span>par {detail.auteur_prenom} {detail.auteur_nom}</span>}
                <span style={s.badgeRo}>Lecture seule</span>
              </div>
            )}

            <div className="chip-tabs" style={s.years}>
              {(detail?.groupes || []).map((g) => (
                <button
                  key={g.folder}
                  type="button"
                  onClick={() => {
                    setGroupe(g.folder);
                    setTableName(g.tables?.[0]?.table_name || '');
                    setOffset(0);
                  }}
                  style={{
                    ...s.yearBtn,
                    background: groupe === g.folder ? '#0f766e' : 'transparent',
                    color: groupe === g.folder ? 'white' : '#0f766e',
                    fontWeight: groupe === g.folder ? 700 : 600,
                  }}
                >
                  {g.title}
                </button>
              ))}
              {fichiers.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setGroupe('documents'); setTableName(''); setOffset(0); }}
                  style={{
                    ...s.yearBtn,
                    background: groupe === 'documents' ? '#0f766e' : 'transparent',
                    color: groupe === 'documents' ? 'white' : '#0f766e',
                    fontWeight: groupe === 'documents' ? 700 : 600,
                  }}
                >
                  Documents ({fichiers.length})
                </button>
              )}
            </div>

            {groupeActif && groupe !== 'documents' && (
              <div style={s.tableChips}>
                {(groupeActif.tables || []).map((t) => (
                  <button
                    key={t.table_name}
                    type="button"
                    onClick={() => { setTableName(t.table_name); setOffset(0); }}
                    style={{
                      ...s.miniChip,
                      background: tableName === t.table_name ? '#e0e7ff' : 'white',
                      borderColor: tableName === t.table_name ? '#6366f1' : '#e2e8f0',
                      color: tableName === t.table_name ? '#3730a3' : '#475569',
                    }}
                  >
                    {t.table_name} ({t.n_lignes})
                  </button>
                ))}
              </div>
            )}

            {groupe !== 'documents' && (
              <div style={s.card}>
                {tableName && (
                  <div style={s.tableHead}>
                    <b>{tableData?.table_name || tableName}</b>
                    <span style={{ color: '#64748b', fontSize: 12 }}>
                      {loadingTable
                        ? 'Chargement…'
                        : tableData
                          ? `${tableData.n_lignes} ligne${tableData.n_lignes > 1 ? 's' : ''}${tableData.n_lignes > PAGE ? ` · lignes ${offset + 1}–${offset + lignes.length}` : ''} · non modifiable`
                          : 'non modifiable'}
                    </span>
                  </div>
                )}
                <div className="table-scroll">
                  <table style={s.table}>
                    {(colonnes.length > 0 || !loadingTable) && (
                      <thead>
                        <tr>
                          {colonnes.length > 0
                            ? colonnes.map((c) => <th key={c} style={s.th}>{c}</th>)
                            : <th style={s.th}>—</th>}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {loadingTable ? (
                        <tr><td colSpan={Math.max(colonnes.length, 1)}><PageLoader compact label="Lecture des données…" /></td></tr>
                      ) : !tableData ? (
                        <tr><td style={s.td} colSpan={1}>Sélectionnez une table.</td></tr>
                      ) : lignes.length === 0 ? (
                        <tr><td style={s.td} colSpan={Math.max(colonnes.length, 1)}>Aucune donnée</td></tr>
                      ) : lignes.map((row, i) => (
                        <tr key={i}>
                          {colonnes.map((c) => <td key={c} style={s.td}>{fmt(row[c])}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!loadingTable && tableData?.n_lignes > PAGE && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button type="button" disabled={offset <= 0} onClick={() => setOffset((v) => Math.max(0, v - PAGE))} style={s.btnDoc}>Précédent</button>
                    <button type="button" disabled={offset + PAGE >= tableData.n_lignes} onClick={() => setOffset((v) => v + PAGE)} style={s.btnDoc}>Suivant</button>
                  </div>
                )}
              </div>
            )}

            {voirDocuments && fichiers.length > 0 && (
              <div style={{ ...s.card, marginTop: groupe === 'documents' ? 0 : 14 }}>
                <div style={s.tableHead}><b>Documents élèves</b><span style={{ color: '#64748b', fontSize: 12 }}>lecture seule</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {fichiers.map((f) => (
                    <div key={f.id} style={s.fichierRow}>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.nom} {f.eleve_id ? `(élève #${f.eleve_id})` : ''}
                      </span>
                      <button type="button" style={s.btnDoc} onClick={() => telechargerFichier(f)}>Télécharger</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100%', background: '#f8fafc', fontFamily: "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif" },
  main: { padding: '28px 32px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  titre: { margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' },
  sousTitre: { margin: '6px 0 0', fontSize: 13, color: '#64748b' },
  btnExport: { padding: '9px 14px', borderRadius: 8, border: 'none', background: '#4c1d95', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' },
  erreur: { padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', fontWeight: 600, fontSize: 13, marginBottom: 12 },
  vide: { padding: 28, color: '#94a3b8', fontSize: 14, textAlign: 'center' },
  years: { display: 'flex', background: '#ede9fe', borderRadius: 20, padding: 3, gap: 2, marginBottom: 12, flexWrap: 'wrap' },
  yearBtn: { padding: '8px 14px', border: 'none', borderRadius: 16, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' },
  meta: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', fontSize: 12, color: '#475569', marginBottom: 12 },
  badgeRo: { background: '#fef3c7', color: '#92400e', fontWeight: 700, padding: '3px 8px', borderRadius: 99 },
  tableChips: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  miniChip: { padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' },
  card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, overflow: 'hidden' },
  tableHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 8, fontSize: 14, color: '#0f172a' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '8px 10px', background: '#f8fafc', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  td: { padding: '7px 10px', borderBottom: '1px solid #f1f5f9', color: '#334155', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fichierRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 },
  btnDoc: { padding: '6px 10px', borderRadius: 8, border: '1px solid #c4b5fd', background: '#ede9fe', color: '#5b21b6', fontWeight: 700, cursor: 'pointer', fontSize: 12 },
};
