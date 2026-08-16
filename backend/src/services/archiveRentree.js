const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const pool = require('../config/database');

const TABLE_GROUPS = [
  {
    folder: '00-references',
    title: 'Référentiel au moment de l’archive',
    tables: ['classes', 'pools', 'matieres'],
  },
  {
    folder: '01-eleves',
    title: 'Élèves et données liées',
    tables: [
      'eleves',
      'documents_eleves',
      'sanctions_eleves',
      'observations',
      'affectations_eleves_enc',
      'classes_enclassement',
      'enclassements',
      'sorties_scolaires',
    ],
  },
  {
    folder: '02-notes-bulletins',
    title: 'Notes, évaluations et bulletins',
    tables: ['notes', 'evaluations', 'bulletin_criteres', 'suivi_devoirs', 'devoirs'],
  },
  {
    folder: '03-affectations-pools',
    title: 'Affectations et composition des pools',
    tables: ['affectations', 'planning_branches', 'pool_profs', 'pool_classes', 'pool_branches'],
  },
  {
    folder: '04-plannings-horaires',
    title: 'Plannings et horaires de classes',
    tables: ['classe_horaires', 'classe_periodes', 'emploi_du_temps', 'plan_classe', 'inventaire_branches'],
  },
  {
    folder: '05-presences',
    title: 'Présences et absences',
    tables: ['presences_v2', 'presences', 'absences'],
  },
  {
    folder: '06-comptabilite',
    title: 'Comptabilité, facturation et commandes',
    tables: ['paiements', 'factures_validations', 'factures_references', 'commandes_lignes', 'commandes'],
  },
];

const SENSITIVE_COLS = new Set([
  'mot_de_passe', 'password', 'mfa_secret', 'smtp_app_password', 'mfa_backup_codes',
]);

const tableExists = async (client, name) => {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [name]
  );
  return r.rows.length > 0;
};

const sanitizeRows = (rows) => (rows || []).map((row) => {
  const out = {};
  Object.entries(row || {}).forEach(([k, v]) => {
    if (SENSITIVE_COLS.has(k)) return;
    if (v instanceof Date) out[k] = v.toISOString();
    else if (Buffer.isBuffer(v)) out[k] = v.toString('base64');
    else if (v && typeof v === 'object') {
      try { out[k] = JSON.parse(JSON.stringify(v)); } catch { out[k] = String(v); }
    } else out[k] = v;
  });
  return out;
});

const flattenRows = (rows) => (rows || []).map((row) => {
  const out = {};
  Object.entries(row || {}).forEach(([k, v]) => {
    if (v && typeof v === 'object' && !(v instanceof Date)) out[k] = JSON.stringify(v);
    else out[k] = v;
  });
  return out;
});

const sheetFromRows = (rows, sheetName) => {
  const clean = flattenRows(rows);
  const ws = XLSX.utils.json_to_sheet(clean.length ? clean : [{ info: 'Aucune donnée' }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, String(sheetName || 'Données').slice(0, 31));
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

const buildPdf = (title, sections) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(18).fillColor('#4c1d95').text('Oasis — Archive', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(13).fillColor('#0f172a').text(title);
  doc.fontSize(9).fillColor('#64748b').text(new Date().toLocaleString('fr-CH'));
  doc.moveDown();

  (sections || []).forEach((section, idx) => {
    if (idx > 0 && doc.y > 700) doc.addPage();
    doc.fontSize(12).fillColor('#4c1d95').text(section.heading);
    doc.fontSize(9).fillColor('#334155').text(section.subtitle || '');
    doc.moveDown(0.3);
    const rows = flattenRows(section.rows || []);
    if (!rows.length) {
      doc.fontSize(9).fillColor('#94a3b8').text('Aucune donnée.');
      doc.moveDown();
      return;
    }
    const cols = Object.keys(rows[0]).slice(0, 6);
    const max = Math.min(rows.length, 80);
    const colW = 520 / Math.max(cols.length, 1);
    const drawRow = (values, bold) => {
      const y = doc.y;
      values.forEach((val, i) => {
        doc.fontSize(7).fillColor(bold ? '#4c1d95' : '#1e293b')
          .text(String(val ?? '').slice(0, 40), 36 + i * colW, y, { width: colW - 4, lineBreak: false });
      });
      doc.moveDown(0.55);
    };
    drawRow(cols, true);
    for (let i = 0; i < max; i++) {
      if (doc.y > 780) {
        doc.addPage();
        drawRow(cols, true);
      }
      drawRow(cols.map((c) => rows[i][c]), false);
    }
    if (rows.length > max) {
      doc.fontSize(8).fillColor('#92400e').text(`… ${rows.length - max} ligne(s) supplémentaire(s) dans le fichier Excel.`);
    }
    doc.moveDown();
  });

  doc.end();
});

const guessMime = (nom, contenu) => {
  const s = String(contenu || '');
  if (s.startsWith('data:')) return s.slice(5).split(';')[0] || 'application/octet-stream';
  const ext = String(nom || '').split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'application/octet-stream';
};

const decodeDocument = (contenu) => {
  const s = String(contenu || '');
  const m = s.match(/^data:[^;]+;base64,(.+)$/);
  if (m) return Buffer.from(m[1], 'base64');
  if (/^[A-Za-z0-9+/=\s]+$/.test(s) && s.length > 80) {
    try { return Buffer.from(s, 'base64'); } catch { /* ignore */ }
  }
  return Buffer.from(s, 'utf8');
};

const fetchAnnee = async (client) => {
  try {
    const r = await client.query('SELECT nom_ecole, annee_scolaire FROM parametres_ecole LIMIT 1');
    return {
      nom: r.rows[0]?.nom_ecole || 'Oasis',
      annee: r.rows[0]?.annee_scolaire || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    };
  } catch {
    return { nom: 'Oasis', annee: String(new Date().getFullYear()) };
  }
};

const collectSnapshot = async (client) => {
  const groups = [];
  const fichiers = [];
  const synthese = [];

  for (const group of TABLE_GROUPS) {
    const tables = [];
    for (const table of group.tables) {
      if (!(await tableExists(client, table))) continue;
      const result = await client.query(`SELECT * FROM ${table}`);
      let rows = sanitizeRows(result.rows);
      if (table === 'documents_eleves') {
        result.rows.forEach((doc) => {
          if (!doc?.contenu) return;
          fichiers.push({
            table_name: table,
            nom: doc.nom || `document-${doc.id}`,
            eleve_id: doc.eleve_id || null,
            mime: guessMime(doc.nom, doc.contenu),
            contenu: String(doc.contenu),
          });
        });
        rows = rows.map((r) => {
          const { contenu, ...rest } = r;
          return { ...rest, fichier_archive: contenu ? 'oui' : 'non' };
        });
      }
      tables.push({ table, rows });
      synthese.push({ groupe: group.title, table, lignes: rows.length });
    }
    groups.push({ folder: group.folder, title: group.title, tables });
  }

  if (await tableExists(client, 'utilisateurs')) {
    const comptes = await client.query(
      `SELECT id, nom, prenom, email, role, actif, created_at
       FROM utilisateurs WHERE role IN ('eleve','parent') ORDER BY nom, prenom`
    );
    const rows = sanitizeRows(comptes.rows);
    const elevesGroup = groups.find((g) => g.folder === '01-eleves');
    if (elevesGroup) elevesGroup.tables.push({ table: 'comptes_eleves_parents', rows });
    synthese.push({ groupe: 'Élèves et données liées', table: 'comptes_eleves_parents', lignes: rows.length });

    const profs = await client.query(
      `SELECT id, nom, prenom, email, role, actif
       FROM utilisateurs WHERE role NOT IN ('eleve','parent') ORDER BY nom, prenom`
    );
    const refGroup = groups.find((g) => g.folder === '00-references');
    if (refGroup) refGroup.tables.push({ table: 'personnel', rows: sanitizeRows(profs.rows) });
  }

  return { groups, fichiers, synthese };
};

const sauvegarderArchiveAnnee = async (user) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const meta = await fetchAnnee(client);
    const exist = await client.query(
      `SELECT id, verrouilee FROM archives_annees
       WHERE annee_scolaire = $1 AND verrouilee = false
       ORDER BY id DESC LIMIT 1`,
      [meta.annee]
    );

    const snapshot = await collectSnapshot(client);
    let archiveId = exist.rows[0]?.id;
    if (archiveId) {
      await client.query('DELETE FROM archives_fichiers WHERE archive_id = $1', [archiveId]);
      await client.query('DELETE FROM archives_tables WHERE archive_id = $1', [archiveId]);
      await client.query(
        `UPDATE archives_annees
         SET nom_ecole=$1, created_at=NOW(), created_by=$2, synthese=$3::jsonb, verrouilee=false
         WHERE id=$4`,
        [meta.nom, user?.id || null, JSON.stringify(snapshot.synthese), archiveId]
      );
    } else {
      const ins = await client.query(
        `INSERT INTO archives_annees (annee_scolaire, nom_ecole, created_by, synthese)
         VALUES ($1,$2,$3,$4::jsonb) RETURNING id`,
        [meta.annee, meta.nom, user?.id || null, JSON.stringify(snapshot.synthese)]
      );
      archiveId = ins.rows[0].id;
    }

    for (const group of snapshot.groups) {
      for (const t of group.tables) {
        await client.query(
          `INSERT INTO archives_tables (archive_id, groupe, groupe_titre, table_name, n_lignes, donnees)
           VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
          [archiveId, group.folder, group.title, t.table, t.rows.length, JSON.stringify(t.rows)]
        );
      }
    }
    for (const f of snapshot.fichiers) {
      await client.query(
        `INSERT INTO archives_fichiers (archive_id, table_name, nom, eleve_id, mime, contenu)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [archiveId, f.table_name, f.nom, f.eleve_id, f.mime, f.contenu]
      );
    }

    await client.query('COMMIT');
    return {
      archive_id: archiveId,
      annee: meta.annee,
      nom_ecole: meta.nom,
      synthese: snapshot.synthese,
      n_fichiers: snapshot.fichiers.length,
    };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
};

const verifierArchivePourReset = async (archiveId, annee) => {
  if (!archiveId) return false;
  const r = await pool.query(
    'SELECT id, annee_scolaire, verrouilee FROM archives_annees WHERE id=$1',
    [archiveId]
  );
  const row = r.rows[0];
  return Boolean(
    row
    && String(row.annee_scolaire) === String(annee)
    && row.verrouilee !== true
  );
};

const verrouillerArchive = async (archiveId) => {
  if (!archiveId) return;
  await pool.query('UPDATE archives_annees SET verrouilee=true WHERE id=$1', [archiveId]);
};

const listerArchives = async () => {
  const r = await pool.query(
    `SELECT a.id, a.annee_scolaire, a.nom_ecole, a.created_at, a.verrouilee, a.synthese,
            u.prenom AS auteur_prenom, u.nom AS auteur_nom
     FROM archives_annees a
     LEFT JOIN utilisateurs u ON u.id = a.created_by
     ORDER BY a.annee_scolaire DESC, a.created_at DESC`
  );
  return r.rows.map((row) => ({
    ...row,
    n_lignes: Array.isArray(row.synthese)
      ? row.synthese.reduce((s, x) => s + Number(x.lignes || 0), 0)
      : 0,
  }));
};

const getArchiveDetail = async (id) => {
  const a = await pool.query(
    `SELECT a.*, u.prenom AS auteur_prenom, u.nom AS auteur_nom
     FROM archives_annees a
     LEFT JOIN utilisateurs u ON u.id = a.created_by
     WHERE a.id=$1`,
    [id]
  );
  if (!a.rows[0]) return null;
  const tables = await pool.query(
    `SELECT id, groupe, groupe_titre, table_name, n_lignes
     FROM archives_tables WHERE archive_id=$1
     ORDER BY groupe, table_name`,
    [id]
  );
  const fichiers = await pool.query(
    `SELECT id, table_name, nom, eleve_id, mime, length(contenu) AS taille
     FROM archives_fichiers WHERE archive_id=$1 ORDER BY nom`,
    [id]
  );
  const groupes = [];
  const map = new Map();
  tables.rows.forEach((t) => {
    if (!map.has(t.groupe)) {
      const g = { folder: t.groupe, title: t.groupe_titre, tables: [] };
      map.set(t.groupe, g);
      groupes.push(g);
    }
    map.get(t.groupe).tables.push(t);
  });
  return { ...a.rows[0], groupes, fichiers: fichiers.rows };
};

const getArchiveTable = async (archiveId, tableName, { limit = 200, offset = 0 } = {}) => {
  const r = await pool.query(
    `SELECT groupe, groupe_titre, table_name, n_lignes, donnees
     FROM archives_tables WHERE archive_id=$1 AND table_name=$2`,
    [archiveId, tableName]
  );
  const row = r.rows[0];
  if (!row) return null;
  const all = Array.isArray(row.donnees) ? row.donnees : [];
  return {
    groupe: row.groupe,
    groupe_titre: row.groupe_titre,
    table_name: row.table_name,
    n_lignes: row.n_lignes,
    colonnes: all[0] ? Object.keys(all[0]) : [],
    lignes: all.slice(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 200)),
  };
};

const getArchiveFichier = async (archiveId, fichierId) => {
  const r = await pool.query(
    `SELECT id, nom, mime, contenu FROM archives_fichiers WHERE archive_id=$1 AND id=$2`,
    [archiveId, fichierId]
  );
  return r.rows[0] || null;
};

const exporterArchiveZip = async (archiveId, res) => {
  const detail = await getArchiveDetail(archiveId);
  if (!detail) return res.status(404).json({ message: 'Archive introuvable' });
  const tables = await pool.query(
    `SELECT groupe, groupe_titre, table_name, donnees FROM archives_tables WHERE archive_id=$1 ORDER BY groupe, table_name`,
    [archiveId]
  );
  const fichiers = await pool.query(
    `SELECT nom, eleve_id, contenu FROM archives_fichiers WHERE archive_id=$1`,
    [archiveId]
  );

  const safeAnnee = String(detail.annee_scolaire || 'annee').replace(/[^\w.-]+/g, '_');
  const fileName = `Oasis-archive-${safeAnnee}.zip`;
  const zip = archiver('zip', { zlib: { level: 6 } });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  zip.on('error', (err) => {
    if (!res.headersSent) res.status(500).json({ message: err.message });
    else res.end();
  });
  zip.pipe(res);

  const byGroup = new Map();
  tables.rows.forEach((t) => {
    if (!byGroup.has(t.groupe)) byGroup.set(t.groupe, { title: t.groupe_titre, folder: t.groupe, tables: [] });
    byGroup.get(t.groupe).tables.push(t);
  });

  const synthese = Array.isArray(detail.synthese) ? detail.synthese : [];
  zip.append(sheetFromRows(synthese, 'synthese'), { name: '00-synthese.xlsx' });
  zip.append(await buildPdf(`Synthèse ${detail.annee_scolaire}`, [{
    heading: 'Contenu archivé',
    subtitle: `${detail.nom_ecole || 'Oasis'} — ${detail.annee_scolaire}`,
    rows: synthese,
  }]), { name: '00-synthese.pdf' });

  for (const group of byGroup.values()) {
    const pdfSections = [];
    for (const t of group.tables) {
      const rows = Array.isArray(t.donnees) ? t.donnees : [];
      zip.append(sheetFromRows(rows, t.table_name), { name: `${group.folder}/${t.table_name}.xlsx` });
      pdfSections.push({ heading: t.table_name, subtitle: `${rows.length} ligne(s)`, rows });
    }
    zip.append(await buildPdf(group.title, pdfSections), { name: `${group.folder}/${group.folder}.pdf` });
  }

  fichiers.rows.forEach((f, i) => {
    const base = String(f.nom || `fichier-${i}`).replace(/[^\w.-]+/g, '_');
    zip.append(decodeDocument(f.contenu), {
      name: `01-eleves/fichiers/${f.eleve_id || 'sans-eleve'}_${f.id || i}_${base}`,
    });
  });

  zip.append(
    [
      `Oasis — Archive ${detail.annee_scolaire}`,
      `École : ${detail.nom_ecole || 'Oasis'}`,
      `Date d’archivage : ${detail.created_at ? new Date(detail.created_at).toLocaleString('fr-CH') : ''}`,
      '',
      'Consultation en lecture seule dans le menu Archive.',
    ].join('\n'),
    { name: '00-LISEZMOI.txt' }
  );

  await zip.finalize();
};

module.exports = {
  TABLE_GROUPS,
  fetchAnnee,
  sauvegarderArchiveAnnee,
  verifierArchivePourReset,
  verrouillerArchive,
  listerArchives,
  getArchiveDetail,
  getArchiveTable,
  getArchiveFichier,
  exporterArchiveZip,
  decodeDocument,
};
