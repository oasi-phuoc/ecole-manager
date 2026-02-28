const pool = require('../config/database');
const XLSX = require('xlsx');

const importEleves = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Fichier manquant' });
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    const dataRows = rows.slice(1).filter(r => r[3]);

    const seen = new Set();
    const unique = [];
    for (const row of dataRows) {
      const ref = parseInt(row[3]);
      if (ref && !seen.has(ref)) { seen.add(ref); unique.push(row); }
    }

    let created = 0, skipped = 0;

    for (const row of unique) {
      const ref = parseInt(row[3]);

      const exists = await pool.query('SELECT id FROM eleves WHERE oasi_ref=$1', [ref]);
      if (exists.rows.length > 0) { skipped++; continue; }

      // Col F = NOM complet original (oasi_nom)
      const nomComplet = (row[5] || '').trim();

      // Séparer nom famille (MAJUSCULES) et prénom (minuscules)
      const parts = nomComplet.split(' ');
      const nom = parts.filter(p => p.length > 0 && p === p.toUpperCase()).join(' ');
      const prenom = parts.filter(p => p.length > 0 && p !== p.toUpperCase()).join(' ');

      const parseDate = (val) => {
        if (!val) return null;
        try { const d = new Date(val); return isNaN(d) ? null : d.toISOString().substring(0,10); }
        catch(e) { return null; }
      };

      const parseInt2 = (val) => {
        if (!val) return null;
        const n = parseInt(val);
        return isNaN(n) ? null : n;
      };

      await pool.query(`
        INSERT INTO eleves (
          nom, prenom, date_naissance, statut,
          oasi_prog_nom, oasi_prog_encadrant, oasi_n, oasi_ref, oasi_pos,
          oasi_nom, oasi_nais,
          oasi_nationalite,
          oasi_presence_date, oasi_jour_semaine, oasi_presence_periode, oasi_presence_type,
          oasi_remarque, oasi_controle_du, oasi_controle_au,
          oasi_prog_presences, oasi_prog_admin, oasi_as,
          oasi_prg_id, oasi_prg_occupation_id, oasi_ra_id, oasi_temps_reparti_id
        ) VALUES (
          $1,$2,$3,'actif',
          $4,$5,$6,$7,$8,
          $9,$10,
          $11,
          $12,$13,$14,$15,
          $16,$17,$18,
          $19,$20,$21,
          $22,$23,$24,$25
        )
      `, [
        nom, prenom, parseDate(row[6]),
        row[0]||null, row[1]||null, parseInt2(row[2]), ref, parseInt2(row[4]),
        nomComplet, parseDate(row[6]),
        row[7]||null,
        parseDate(row[8]), row[9]||null, row[10]||null, row[11]||null,
        row[12]||null, parseDate(row[13]), parseDate(row[14]),
        row[15]||null, row[16]||null, row[17]||null,
        parseInt2(row[18]), parseInt2(row[19]), parseInt2(row[20]), parseInt2(row[21]),
      ]);
      created++;
    }

    res.json({ message: `Import terminé : ${created} créé(s), ${skipped} déjà existant(s)`, created, skipped });
  } catch(err) { res.status(500).json({ message: 'Erreur import: ' + err.message }); }
};

module.exports = { importEleves };