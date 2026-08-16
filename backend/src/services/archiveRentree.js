const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const pool = require('../config/database');

const ARCHIVE_PURPOSE = 'archive-rentree';
const ARCHIVE_TTL = '2h';

const TABLE_GROUPS = [
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

const signerArchiveToken = (userId) =>
  jwt.sign({ purpose: ARCHIVE_PURPOSE, id: userId }, process.env.JWT_SECRET, { expiresIn: ARCHIVE_TTL });

const verifierArchiveToken = (token, userId) => {
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.purpose === ARCHIVE_PURPOSE && Number(decoded?.id) === Number(userId);
  } catch {
    return false;
  }
};

const tableExists = async (client, name) => {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [name]
  );
  return r.rows.length > 0;
};

const sanitizeRows = (rows) => rows.map((row) => {
  const out = {};
  Object.entries(row || {}).forEach(([k, v]) => {
    if (SENSITIVE_COLS.has(k)) return;
    if (v instanceof Date) out[k] = v.toISOString();
    else if (v && typeof v === 'object') out[k] = JSON.stringify(v);
    else out[k] = v;
  });
  return out;
});

const sheetFromRows = (rows, sheetName) => {
  const clean = sanitizeRows(rows);
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

  doc.fontSize(18).fillColor('#4c1d95').text('Oasis — Archive de rentrée', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(13).fillColor('#0f172a').text(title);
  doc.fontSize(9).fillColor('#64748b').text(new Date().toLocaleString('fr-CH'));
  doc.moveDown();

  sections.forEach((section, idx) => {
    if (idx > 0 && doc.y > 700) doc.addPage();
    doc.fontSize(12).fillColor('#4c1d95').text(section.heading);
    doc.fontSize(9).fillColor('#334155').text(section.subtitle || '');
    doc.moveDown(0.3);
    const rows = section.rows || [];
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

const guessExtension = (nom, contenu) => {
  const fromName = String(nom || '').split('.').pop();
  if (fromName && fromName.length <= 5 && fromName !== String(nom)) return fromName;
  const s = String(contenu || '');
  if (s.startsWith('data:application/pdf') || s.startsWith('%PDF')) return 'pdf';
  if (s.startsWith('data:image/png') || s.startsWith('\x89PNG')) return 'png';
  if (s.startsWith('data:image/jpeg') || s.startsWith('data:image/jpg')) return 'jpg';
  return 'bin';
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
      annee: r.rows[0]?.annee_scolaire || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    };
  } catch {
    return { nom: 'Oasis', annee: String(new Date().getFullYear()) };
  }
};

const archiveRentreeZip = async (req, res) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Configuration de securite manquante' });
  }
  const client = await pool.connect();
  try {
    const meta = await fetchAnnee(client);
    const safeAnnee = String(meta.annee).replace(/[^\w.-]+/g, '_');
    const fileName = `Oasis-archive-rentree-${safeAnnee}.zip`;
    const token = signerArchiveToken(req.user.id);
    const manifest = [];
    const zip = archiver('zip', { zlib: { level: 6 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('X-Archive-Token', token);
    zip.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ message: err.message });
      else res.end();
    });
    zip.pipe(res);

    const synthese = [];

    for (const group of TABLE_GROUPS) {
      const pdfSections = [];
      for (const table of group.tables) {
        if (!(await tableExists(client, table))) {
          manifest.push(`SKIP ${table} (table absente)`);
          continue;
        }
        const result = await client.query(`SELECT * FROM ${table}`);
        const rows = sanitizeRows(result.rows);
        zip.append(sheetFromRows(rows, table), { name: `${group.folder}/${table}.xlsx` });
        pdfSections.push({
          heading: table,
          subtitle: `${rows.length} ligne(s)`,
          rows,
        });
        synthese.push({ groupe: group.title, table, lignes: rows.length });
        manifest.push(`OK ${table} (${rows.length})`);

        if (table === 'documents_eleves') {
          result.rows.forEach((doc, i) => {
            if (!doc?.contenu) return;
            const ext = guessExtension(doc.nom, doc.contenu);
            const base = String(doc.nom || `document-${doc.id || i}`).replace(/[^\w.-]+/g, '_');
            zip.append(decodeDocument(doc.contenu), {
              name: `${group.folder}/fichiers/${doc.eleve_id || 'sans-eleve'}_${doc.id || i}_${base}.${ext}`,
            });
          });
        }
      }
      const pdfBuf = await buildPdf(group.title, pdfSections);
      zip.append(pdfBuf, { name: `${group.folder}/${group.folder}.pdf` });
    }

    if (await tableExists(client, 'utilisateurs')) {
      const comptes = await client.query(
        `SELECT id, nom, prenom, email, role, actif, created_at
         FROM utilisateurs WHERE role IN ('eleve','parent') ORDER BY nom, prenom`
      );
      const rows = sanitizeRows(comptes.rows);
      zip.append(sheetFromRows(rows, 'comptes'), { name: '01-eleves/comptes_eleves_parents.xlsx' });
      synthese.push({ groupe: 'Élèves et données liées', table: 'utilisateurs_eleves_parents', lignes: rows.length });
      manifest.push(`OK utilisateurs_eleves_parents (${rows.length})`);
    }

    zip.append(sheetFromRows(synthese, 'synthese'), { name: '00-synthese.xlsx' });
    const synthesePdf = await buildPdf('Synthèse de l’archive', [{
      heading: 'Contenu archivé',
      subtitle: `${meta.nom} — année ${meta.annee}`,
      rows: synthese,
    }]);
    zip.append(synthesePdf, { name: '00-synthese.pdf' });
    zip.append(
      [
        `Oasis — Archive de rentrée`,
        `École : ${meta.nom}`,
        `Année : ${meta.annee}`,
        `Date : ${new Date().toLocaleString('fr-CH')}`,
        `Auteur : ${req.user.prenom || ''} ${req.user.nom || ''} (${req.user.email || ''})`,
        '',
        'Cette archive contient les données qui seront supprimées par la réinitialisation de rentrée.',
        'Les disponibilités professeurs, classes, pools (structure), créneaux et paramètres ne sont pas archivés ici car ils sont conservés.',
        '',
        ...manifest,
      ].join('\n'),
      { name: '00-LISEZMOI.txt' }
    );

    await zip.finalize();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erreur lors de l’archivage', erreur: err.message });
    }
  } finally {
    client.release();
  }
};

module.exports = {
  archiveRentreeZip,
  verifierArchiveToken,
  TABLE_GROUPS,
};
