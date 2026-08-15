const pool = require('../config/database');

const ORDRE_JOURS = "CASE jour WHEN 'Lundi' THEN 1 WHEN 'Mardi' THEN 2 WHEN 'Mercredi' THEN 3 WHEN 'Jeudi' THEN 4 WHEN 'Vendredi' THEN 5 END";

const normaliserNiveauxPool = (niveau) => {
  if (niveau == null || niveau === '') return null;
  const list = Array.isArray(niveau)
    ? niveau.map((v) => String(v).trim()).filter(Boolean)
    : String(niveau).split(',').map((v) => v.trim()).filter(Boolean);
  return list.length ? list.join(',') : null;
};

const getCreneaux = async (req, res) => {
  const r = await pool.query('SELECT * FROM creneaux ORDER BY ' + ORDRE_JOURS + ', ordre');
  res.json(r.rows);
};

const getDisponibilites = async (req, res) => {
  const r = await pool.query('SELECT creneau_id, disponible FROM disponibilites WHERE prof_id=$1', [req.params.prof_id]);
  res.json(r.rows);
};

const getAllDisponibilites = async (req, res) => {
  const r = await pool.query('SELECT prof_id, creneau_id, disponible FROM disponibilites');
  res.json(r.rows);
};

const getRemarqueDisponibilites = async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT remarque_disponibilites FROM utilisateurs WHERE id=$1 AND role='prof'",
      [req.params.prof_id]
    );
    if (r.rows.length === 0) return res.status(404).json({ message: 'Professeur non trouvé' });
    res.json({ remarque: r.rows[0].remarque_disponibilites || '' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const saveRemarqueDisponibilites = async (req, res) => {
  try {
    const remarque = typeof req.body?.remarque === 'string' ? req.body.remarque : '';
    const r = await pool.query(
      "UPDATE utilisateurs SET remarque_disponibilites=$1 WHERE id=$2 AND role='prof' RETURNING id",
      [remarque, req.params.prof_id]
    );
    if (r.rows.length === 0) return res.status(404).json({ message: 'Professeur non trouvé' });
    res.json({ message: 'Remarque sauvegardée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const saveDisponibilites = async (req, res) => {
  const { prof_id } = req.params;
  const { disponibilites } = req.body;
  try {
    await pool.query('DELETE FROM disponibilites WHERE prof_id=$1', [prof_id]);
    for (const d of disponibilites) {
      await pool.query('INSERT INTO disponibilites (prof_id, creneau_id, disponible) VALUES ($1,$2,$3)', [prof_id, d.creneau_id, d.disponible]);
    }
    res.json({ message: 'Sauvegardé' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const getPools = async (req, res) => {
  const pools = await pool.query('SELECT id, nom, site, couleur, horaires, niveau, ordre FROM pools ORDER BY COALESCE(ordre, 0), nom');
  const result = [];
  for (const p of pools.rows) {
    const profs = await pool.query('SELECT u.id, u.nom, u.prenom, u.taux_activite, u.periodes_semaine, u.niveau_prefere, u.lieu_travail_prefere, u.branches_specialites FROM utilisateurs u JOIN pool_profs pp ON pp.prof_id=u.id WHERE pp.pool_id=$1', [p.id]);
    const classes = await pool.query('SELECT c.id, c.nom, c.niveau FROM classes c JOIN pool_classes pc ON pc.classe_id=c.id WHERE pc.pool_id=$1', [p.id]);
    const branches = await pool.query('SELECT m.id, m.nom, m.periodes_semaine FROM matieres m JOIN pool_branches pb ON pb.matiere_id=m.id WHERE pb.pool_id=$1', [p.id]);
    result.push({ ...p, profs: profs.rows, classes: classes.rows, branches: branches.rows });
  }
  res.json(result);
};

const createPool = async (req, res) => {
  const { nom, site, couleur, prof_ids, classe_ids, branche_ids, horaires, niveau } = req.body;
  try {
    const niveauNormalise = normaliserNiveauxPool(niveau);
    const r = await pool.query('INSERT INTO pools (nom, site, couleur, horaires, niveau) VALUES ($1,$2,$3,$4,$5) RETURNING *', [nom, site||'', couleur||'#6366f1', JSON.stringify(horaires||[]), niveauNormalise]);
    const newPool = r.rows[0];
    for (const pid of (prof_ids||[])) await pool.query('INSERT INTO pool_profs (pool_id, prof_id) VALUES ($1,$2)', [newPool.id, pid]);
    for (const cid of (classe_ids||[])) await pool.query('INSERT INTO pool_classes (pool_id, classe_id) VALUES ($1,$2)', [newPool.id, cid]);
    for (const mid of (branche_ids||[])) await pool.query('INSERT INTO pool_branches (pool_id, matiere_id) VALUES ($1,$2)', [newPool.id, mid]);
    res.json(newPool);
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const updatePool = async (req, res) => {
  const { id } = req.params;
  const { nom, site, couleur, prof_ids, classe_ids, branche_ids, horaires, niveau, ordre } = req.body;
  try {
    const anciensProfsRes = await pool.query('SELECT prof_id FROM pool_profs WHERE pool_id=$1', [id]);
    const anciennesClassesRes = await pool.query('SELECT classe_id FROM pool_classes WHERE pool_id=$1', [id]);
    const anciensProfs = anciensProfsRes.rows.map(r => Number(r.prof_id));
    const anciennesClasses = anciennesClassesRes.rows.map(r => Number(r.classe_id));
    const nouveauxProfs = (prof_ids || []).map(x => Number(x));
    const profsSupprimes = anciensProfs.filter(pid => !nouveauxProfs.includes(pid));

    if (profsSupprimes.length && anciennesClasses.length) {
      await pool.query(
        'DELETE FROM affectations WHERE prof_id = ANY($1::int[]) AND classe_id = ANY($2::int[])',
        [profsSupprimes, anciennesClasses]
      );
    }

    const niveauNormalise = normaliserNiveauxPool(niveau);
    await pool.query('UPDATE pools SET nom=$1, site=$2, couleur=$3, horaires=$4, niveau=$5, ordre=$6 WHERE id=$7', [nom, site||'', couleur, JSON.stringify(horaires||[]), niveauNormalise, ordre !== undefined ? ordre : 0, id]);
    await pool.query('DELETE FROM pool_profs WHERE pool_id=$1', [id]);
    await pool.query('DELETE FROM pool_classes WHERE pool_id=$1', [id]);
    await pool.query('DELETE FROM pool_branches WHERE pool_id=$1', [id]);
    for (const pid of (prof_ids||[])) await pool.query('INSERT INTO pool_profs (pool_id, prof_id) VALUES ($1,$2)', [id, pid]);
    for (const cid of (classe_ids||[])) await pool.query('INSERT INTO pool_classes (pool_id, classe_id) VALUES ($1,$2)', [id, cid]);
    for (const mid of (branche_ids||[])) await pool.query('INSERT INTO pool_branches (pool_id, matiere_id) VALUES ($1,$2)', [id, mid]);
    res.json({ message: 'Pool mis à jour' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const deletePool = async (req, res) => {
  await pool.query('DELETE FROM pools WHERE id=$1', [req.params.id]);
  res.json({ message: 'Supprimé' });
};

const getClasseHoraires = async (req, res) => {
  const r = await pool.query('SELECT jour, periode FROM classe_horaires WHERE classe_id=$1', [req.params.classe_id]);
  res.json(r.rows);
};

const saveClasseHoraires = async (req, res) => {
  const { classe_id } = req.params;
  const { horaires } = req.body;
  try {
    await pool.query('DELETE FROM classe_horaires WHERE classe_id=$1', [classe_id]);
    for (const h of horaires) {
      await pool.query('INSERT INTO classe_horaires (classe_id, jour, periode) VALUES ($1,$2,$3)', [classe_id, h.jour, h.periode]);
    }
    res.json({ message: 'Sauvegardé' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const getAllClasseHoraires = async (req, res) => {
  const r = await pool.query('SELECT * FROM classe_horaires');
  res.json(r.rows);
};

const getClasseCouleurs = async (req, res) => {
  try {
    const r = await pool.query('SELECT classe_id, couleur FROM classe_couleurs');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const saveClasseCouleur = async (req, res) => {
  const { classe_id, couleur } = req.body || {};
  if (!classe_id || !couleur) return res.status(400).json({ message: 'classe_id et couleur requis' });
  try {
    const r = await pool.query(`
      INSERT INTO classe_couleurs (classe_id, couleur, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (classe_id) DO UPDATE SET couleur=$2, updated_at=NOW()
      RETURNING classe_id, couleur
    `, [classe_id, couleur]);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getProfCouleurs = async (req, res) => {
  try {
    const r = await pool.query('SELECT prof_id, couleur FROM prof_couleurs');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const saveProfCouleur = async (req, res) => {
  const { prof_id, couleur } = req.body || {};
  if (!prof_id || !couleur) return res.status(400).json({ message: 'prof_id et couleur requis' });
  try {
    const r = await pool.query(`
      INSERT INTO prof_couleurs (prof_id, couleur, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (prof_id) DO UPDATE SET couleur=$2, updated_at=NOW()
      RETURNING prof_id, couleur
    `, [prof_id, couleur]);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getBrancheCouleurs = async (req, res) => {
  try {
    const r = await pool.query('SELECT matiere_id, couleur FROM branche_couleurs');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const saveBrancheCouleur = async (req, res) => {
  const { matiere_id, couleur } = req.body || {};
  if (!matiere_id || !couleur) return res.status(400).json({ message: 'matiere_id et couleur requis' });
  try {
    const r = await pool.query(`
      INSERT INTO branche_couleurs (matiere_id, couleur, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (matiere_id) DO UPDATE SET couleur=$2, updated_at=NOW()
      RETURNING matiere_id, couleur
    `, [matiere_id, couleur]);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAffectations = async (req, res) => {
  const r = await pool.query(`
    SELECT a.*, u.prenom||' '||u.nom as prof_nom,
      COALESCE(c.nom, CASE
        WHEN a.type_special='titulariat' THEN 'Titulariat'
        WHEN a.type_special='atelier' THEN 'Atelier'
        WHEN a.type_special='autre' THEN 'Autre'
        ELSE NULL
      END) as classe_nom,
      m.nom as matiere_nom,
      cr.jour, cr.heure_debut, cr.heure_fin, cr.periode, cr.ordre
    FROM affectations a
    JOIN utilisateurs u ON u.id=a.prof_id
    LEFT JOIN classes c ON c.id=a.classe_id
    LEFT JOIN matieres m ON m.id=a.matiere_id
    JOIN creneaux cr ON cr.id=a.creneau_id
    ORDER BY ${ORDRE_JOURS.replace('jour','cr.jour')}, cr.ordre
  `);
  res.json(r.rows);
};

const saveAffectation = async (req, res) => {
  const { prof_id, classe_id, matiere_id, creneau_id, type_special } = req.body;
  const specialSansClasse = ['titulariat', 'atelier', 'autre'].includes(type_special);
  const estSoutien = type_special === 'soutien';
  const typeFinal = specialSansClasse || estSoutien ? type_special : null;
  const classeIdFinal = specialSansClasse ? null : (classe_id || null);
  try {
    // Remplace uniquement le même « mode » (normal ou soutien) pour cette classe+créneau
    if (classeIdFinal != null) {
      await pool.query(`
        DELETE FROM affectations
        WHERE creneau_id = $1
          AND classe_id = $2
          AND (
            ($3::boolean AND type_special = 'soutien')
            OR (NOT $3::boolean AND (type_special IS NULL OR type_special = ''))
          )
      `, [creneau_id, classeIdFinal, estSoutien]);
    }
    // Un professeur = une seule affectation par créneau
    if (prof_id != null) {
      await pool.query(
        'DELETE FROM affectations WHERE prof_id = $1 AND creneau_id = $2',
        [prof_id, creneau_id]
      );
    }
    const r = await pool.query(`
      INSERT INTO affectations (prof_id, classe_id, matiere_id, creneau_id, type_special)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
    `, [prof_id||null, classeIdFinal, matiere_id||null, creneau_id, typeFinal]);
    res.json(r.rows[0]);
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const deleteAffectation = async (req, res) => {
  await pool.query('DELETE FROM affectations WHERE id=$1', [req.params.id]);
  res.json({ message: 'Supprimé' });
};

const saveClasseTitulaire = async (req, res) => {
  const classeId = Number(req.body?.classe_id);
  const profBrut = req.body?.prof_id;
  const profId = (profBrut === null || profBrut === undefined || String(profBrut).trim() === '')
    ? null
    : Number(profBrut);

  if (!Number.isInteger(classeId)) {
    return res.status(400).json({ message: 'classe_id invalide' });
  }
  if (profId !== null && !Number.isInteger(profId)) {
    return res.status(400).json({ message: 'prof_id invalide' });
  }

  try {
    const classe = await pool.query('SELECT id FROM classes WHERE id=$1', [classeId]);
    if (!classe.rows.length) {
      return res.status(404).json({ message: 'Classe introuvable' });
    }
    if (profId !== null) {
      const prof = await pool.query("SELECT id FROM utilisateurs WHERE id=$1 AND role='prof'", [profId]);
      if (!prof.rows.length) {
        return res.status(404).json({ message: 'Professeur introuvable' });
      }
    }
    await pool.query('UPDATE classes SET prof_principal_id=$1 WHERE id=$2', [profId, classeId]);
    res.json({ message: 'Titulaire mis à jour' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPlanningBranches = async (req, res) => {
  const { pool_id } = req.query;
  let q = 'SELECT * FROM planning_branches WHERE 1=1';
  const params = [];
  if (pool_id) { params.push(pool_id); q += ' AND pool_id=$'+params.length; }
  const r = await pool.query(q, params);
  res.json(r.rows);
};

const savePlanningBranche = async (req, res) => {
  const { prof_id, classe_id, matiere_id, pool_id } = req.body;
  try {
    await pool.query(`
      INSERT INTO planning_branches (prof_id, classe_id, matiere_id, pool_id)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (classe_id, matiere_id, pool_id) DO UPDATE SET prof_id=$1
    `, [prof_id, classe_id, matiere_id, pool_id]);
    res.json({ message: 'Sauvegardé' });
  } catch(err) { res.status(500).json({ message: err.message }); }
};

const deletePlanningBranche = async (req, res) => {
  await pool.query('DELETE FROM planning_branches WHERE classe_id=$1 AND matiere_id=$2 AND pool_id=$3', [req.body.classe_id, req.body.matiere_id, req.body.pool_id]);
  res.json({ message: 'Supprimé' });
};

const getPlanningGeneral = async (req, res) => {
  try {
    const { pool_id } = req.query;
    let profsQ = "SELECT id, nom, prenom FROM utilisateurs WHERE role='prof' ORDER BY nom";
    let profsP = [];
    if (pool_id) {
      profsQ = "SELECT u.id,u.nom,u.prenom FROM utilisateurs u JOIN pool_profs pp ON pp.prof_id=u.id WHERE pp.pool_id=$1 ORDER BY u.nom";
      profsP = [pool_id];
    }
    const profs = await pool.query(profsQ, profsP);
    const creneaux = await pool.query('SELECT * FROM creneaux ORDER BY '+ORDRE_JOURS+', ordre');
    let affectations;
    let dispos;
    if (pool_id) {
      affectations = await pool.query(`
        SELECT a.prof_id, a.creneau_id, a.matiere_id, a.classe_id, a.type_special,
          COALESCE(c.nom, CASE
            WHEN a.type_special='titulariat' THEN 'Titulariat'
            WHEN a.type_special='atelier' THEN 'Atelier'
            WHEN a.type_special='autre' THEN 'Autre'
            ELSE NULL
          END) as classe_nom,
          m.nom as matiere_nom
        FROM affectations a
        JOIN pool_profs pp ON pp.prof_id = a.prof_id AND pp.pool_id = $1
        LEFT JOIN classes c ON c.id=a.classe_id
        LEFT JOIN matieres m ON m.id=a.matiere_id
      `, [pool_id]);
      dispos = await pool.query(`
        SELECT d.prof_id, d.creneau_id, d.disponible
        FROM disponibilites d
        JOIN pool_profs pp ON pp.prof_id = d.prof_id AND pp.pool_id = $1
      `, [pool_id]);
    } else {
      affectations = await pool.query(`
        SELECT a.prof_id, a.creneau_id, a.matiere_id, a.classe_id, a.type_special,
          COALESCE(c.nom, CASE
            WHEN a.type_special='titulariat' THEN 'Titulariat'
            WHEN a.type_special='atelier' THEN 'Atelier'
            WHEN a.type_special='autre' THEN 'Autre'
            ELSE NULL
          END) as classe_nom,
          m.nom as matiere_nom
        FROM affectations a
        LEFT JOIN classes c ON c.id=a.classe_id
        LEFT JOIN matieres m ON m.id=a.matiere_id
      `);
      dispos = await pool.query('SELECT prof_id,creneau_id,disponible FROM disponibilites');
    }
    const titulaires = pool_id
      ? await pool.query(`
          SELECT c.id as classe_id, c.nom as classe_nom, u.id as prof_id, u.prenom||' '||u.nom as prof_nom
          FROM classes c
          JOIN pool_classes pc ON pc.classe_id = c.id AND pc.pool_id = $1
          LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
          ORDER BY c.nom
        `, [pool_id])
      : await pool.query(`
          SELECT c.id as classe_id, c.nom as classe_nom, u.id as prof_id, u.prenom||' '||u.nom as prof_nom
          FROM classes c
          LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
          ORDER BY c.nom
        `);
    res.json({
      profs: profs.rows || [],
      creneaux: creneaux.rows || [],
      affectations: affectations.rows || [],
      dispos: dispos.rows || [],
      titulaires: titulaires.rows || [],
    });
  } catch (e) {
    console.error('getPlanningGeneral:', e);
    res.status(500).json({ message: e.message || 'Erreur planning général' });
  }
};

const getPlanningProf = async (req, res) => {
  const { prof_id } = req.params;
  const prof = await pool.query('SELECT id,nom,prenom FROM utilisateurs WHERE id=$1', [prof_id]);
  const classesTitulaire = await pool.query('SELECT nom FROM classes WHERE prof_principal_id=$1', [prof_id]);
  const creneaux = await pool.query('SELECT * FROM creneaux ORDER BY '+ORDRE_JOURS+', ordre');
  const affectations = await pool.query(`
    SELECT a.creneau_id, a.matiere_id,
      COALESCE(c.nom, CASE
        WHEN a.type_special='titulariat' THEN 'Titulariat'
        WHEN a.type_special='atelier' THEN 'Atelier'
        WHEN a.type_special='autre' THEN 'Autre'
        ELSE NULL
      END) as classe_nom,
      m.nom as matiere_nom
    FROM affectations a
    LEFT JOIN classes c ON c.id=a.classe_id
    LEFT JOIN matieres m ON m.id=a.matiere_id
    WHERE a.prof_id=$1
  `, [prof_id]);
  const dispos = await pool.query('SELECT creneau_id,disponible FROM disponibilites WHERE prof_id=$1', [prof_id]);
  res.json({ prof:prof.rows[0], creneaux:creneaux.rows, affectations:affectations.rows, dispos:dispos.rows, classesTitulaire:classesTitulaire.rows });
};

const getPlanningClasse = async (req, res) => {
  const { classe_id } = req.params;
  const { pool_id } = req.query;
  const classe = await pool.query(`SELECT c.id, c.nom, u.prenom||' '||u.nom as titulaire_nom FROM classes c LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id WHERE c.id=$1`, [classe_id]);
  const creneaux = await pool.query('SELECT * FROM creneaux ORDER BY '+ORDRE_JOURS+', ordre');
  const affectations = await pool.query(`
    SELECT a.id, a.creneau_id, a.prof_id, a.matiere_id, a.type_special,
      u.prenom||' '||u.nom as prof_nom, m.nom as matiere_nom
    FROM affectations a
    JOIN utilisateurs u ON u.id=a.prof_id
    LEFT JOIN matieres m ON m.id=a.matiere_id
    WHERE a.classe_id=$1
    ORDER BY CASE WHEN a.type_special = 'soutien' THEN 1 ELSE 0 END, a.id
  `, [classe_id]);
  const horaires = await pool.query('SELECT jour,periode FROM classe_horaires WHERE classe_id=$1', [classe_id]);
  let branches = [];
  if (pool_id) {
    const pb = await pool.query(`
      SELECT pb.prof_id, pb.matiere_id, m.nom as matiere_nom, m.periodes_semaine,
        u.prenom||' '||u.nom as prof_nom
      FROM planning_branches pb
      JOIN matieres m ON m.id=pb.matiere_id
      LEFT JOIN utilisateurs u ON u.id=pb.prof_id
      WHERE pb.classe_id=$1 AND pb.pool_id=$2
    `, [classe_id, pool_id]);
    branches = pb.rows;
  }
  res.json({ classe:classe.rows[0], creneaux:creneaux.rows, affectations:affectations.rows, horaires:horaires.rows, branches });
};

module.exports = {
  getCreneaux,
  getDisponibilites,
  getAllDisponibilites,
  getRemarqueDisponibilites,
  saveRemarqueDisponibilites,
  saveDisponibilites,
  getPools,
  createPool,
  updatePool,
  deletePool,
  getClasseHoraires,
  saveClasseHoraires,
  getAllClasseHoraires,
  getClasseCouleurs,
  saveClasseCouleur,
  getProfCouleurs,
  saveProfCouleur,
  getBrancheCouleurs,
  saveBrancheCouleur,
  getAffectations,
  saveAffectation,
  deleteAffectation,
  saveClasseTitulaire,
  getPlanningBranches,
  savePlanningBranche,
  deletePlanningBranche,
  getPlanningGeneral,
  getPlanningProf,
  getPlanningClasse
};