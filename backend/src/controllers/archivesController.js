const {
  sauvegarderArchiveAnnee,
  listerArchives,
  getArchiveDetail,
  getArchiveTable,
  getArchiveFichier,
  exporterArchiveZip,
  decodeDocument,
} = require('../services/archiveRentree');

const creerArchiveAnnee = async (req, res) => {
  try {
    const result = await sauvegarderArchiveAnnee(req.user);
    return res.json({
      message: 'Année transférée dans les archives (lecture seule).',
      archive_id: result.archive_id,
      annee: result.annee,
      nom_ecole: result.nom_ecole,
      synthese: result.synthese,
      n_fichiers: result.n_fichiers,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur lors du transfert vers les archives', erreur: err.message });
  }
};

const liste = async (req, res) => {
  try {
    const rows = await listerArchives();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const detail = async (req, res) => {
  try {
    const data = await getArchiveDetail(req.params.id);
    if (!data) return res.status(404).json({ message: 'Archive introuvable' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const table = async (req, res) => {
  try {
    const data = await getArchiveTable(req.params.id, req.params.tableName, {
      limit: req.query.limit,
      offset: req.query.offset,
    });
    if (!data) return res.status(404).json({ message: 'Table introuvable dans cette archive' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const fichier = async (req, res) => {
  try {
    const row = await getArchiveFichier(req.params.id, req.params.fichierId);
    if (!row) return res.status(404).json({ message: 'Fichier introuvable' });
    const buf = decodeDocument(row.contenu);
    const nom = String(row.nom || 'document').replace(/[^\w.-]+/g, '_');
    res.setHeader('Content-Type', row.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
    res.send(buf);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const exporter = async (req, res) => {
  try {
    await exporterArchiveZip(req.params.id, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erreur export', erreur: err.message });
    }
  }
};

module.exports = { creerArchiveAnnee, liste, detail, table, fichier, exporter };
