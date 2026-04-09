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

    // Charger la date de début d'année scolaire depuis les paramètres
    const paramsRes = await pool.query('SELECT date_debut_annee FROM parametres_ecole LIMIT 1');
    const dateDebutAnnee = paramsRes.rows[0]?.date_debut_annee
      ? new Date(paramsRes.rows[0].date_debut_annee).toISOString().substring(0, 10)
      : null;

    // Charger toutes les classes pour la correspondance PROG_NOM
    const classesRes = await pool.query('SELECT id, nom FROM classes');
    const classesMap = {};
    for (const cl of classesRes.rows) {
      classesMap[cl.nom.trim().toLowerCase()] = cl.id;
    }

    // Extraire le code classe depuis PROG_NOM ("... / CODE / Lieu")
    const extractClasseCode = (progNom) => {
      if (!progNom) return null;
      const parts = progNom.split('/');
      if (parts.length >= 2) return parts[1].trim();
      return null;
    };

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

      // Trouver la classe depuis PROG_NOM (col A = row[0])
      const classeCode = extractClasseCode(row[0]);
      const classeId = classeCode ? (classesMap[classeCode.toLowerCase()] || null) : null;

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
          nom, prenom, date_naissance, statut, nom_parent,
          categorie, classe_id, date_debut_cours,
          oasi_prog_nom, oasi_prog_encadrant, oasi_n, oasi_ref, oasi_pos,
          oasi_nom, oasi_nais,
          oasi_nationalite,
          oasi_presence_date, oasi_jour_semaine, oasi_presence_periode, oasi_presence_type,
          oasi_remarque, oasi_controle_du, oasi_controle_au,
          oasi_prog_presences, oasi_prog_admin, oasi_as,
          oasi_prg_id, oasi_prg_occupation_id, oasi_ra_id, oasi_temps_reparti_id
        ) VALUES (
          $1,$2,$3,'actif',$4,
          'OASI',$5,$6,
          $7,$8,$9,$10,$11,
          $12,$13,
          $14,
          $15,$16,$17,$18,
          $19,$20,$21,
          $22,$23,$24,
          $25,$26,$27,$28
        )
      `, [
        nom, prenom, parseDate(row[6]),
        row[17]||null, // AS copie aussi dans Contact / parent
        classeId, dateDebutAnnee,
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

const updateLoraEleves = async (req, res) => {
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

    const parseInt2 = (val) => {
      if (!val) return null;
      const n = parseInt(val);
      return isNaN(n) ? null : n;
    };

    // Charger toutes les classes pour correspondance PROG_NOM
    const classesRes = await pool.query('SELECT id, nom FROM classes');
    const classesMap = {};
    for (const cl of classesRes.rows) {
      classesMap[cl.nom.trim().toLowerCase()] = cl.id;
    }
    const extractClasseCode = (progNom) => {
      if (!progNom) return null;
      const parts = progNom.split('/');
      return parts.length >= 2 ? parts[1].trim() : null;
    };

    let updated = 0, notFound = 0, classMatched = 0;
    const unmatchedCodes = new Set();

    for (const row of unique) {
      const ref = parseInt(row[3]);
      const exists = await pool.query('SELECT id FROM eleves WHERE oasi_ref=$1', [ref]);
      if (exists.rows.length === 0) { notFound++; continue; }

      const classeCode = extractClasseCode(row[0]);
      const classeId = classeCode ? (classesMap[classeCode.toLowerCase()] || null) : null;
      if (classeId) { classMatched++; }
      else if (classeCode) { unmatchedCodes.add(classeCode); }

      await pool.query(`
        UPDATE eleves SET
          oasi_prog_nom=$1, oasi_prog_encadrant=$2, oasi_n=$3, oasi_pos=$4,
          oasi_prog_presences=$5, oasi_prog_admin=$6, oasi_as=$7,
          oasi_prg_id=$8, oasi_prg_occupation_id=$9, oasi_ra_id=$10, oasi_temps_reparti_id=$11,
          classe_id=$13
        WHERE oasi_ref=$12
      `, [
        row[0]||null, row[1]||null, parseInt2(row[2]), parseInt2(row[4]),
        row[15]||null, row[16]||null, row[17]||null,
        parseInt2(row[18]), parseInt2(row[19]), parseInt2(row[20]), parseInt2(row[21]),
        ref, classeId
      ]);
      updated++;
    }

    const unmatchedList = [...unmatchedCodes].join(', ');
    const msg = `Mise à jour terminée : ${updated} mis à jour, ${classMatched} avec classe assignée`
      + (unmatchedList ? ` — codes non trouvés : ${unmatchedList}` : '')
      + (notFound ? `, ${notFound} élève(s) introuvable(s)` : '');
    res.json({ message: msg, updated, notFound, classMatched, unmatchedCodes: [...unmatchedCodes] });
  } catch(err) { res.status(500).json({ message: 'Erreur mise à jour LORA: ' + err.message }); }
};

module.exports = { importEleves, updateLoraEleves };