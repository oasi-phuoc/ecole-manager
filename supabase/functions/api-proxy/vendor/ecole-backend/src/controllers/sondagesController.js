const crypto = require('crypto');
const pool = require('../config/database');

const genToken = () => crypto.randomBytes(24).toString('hex');

const typesValides = new Set(['texte', 'paragraphe', 'choix_unique', 'choix_multiple']);

async function getSondageFull(id) {
  const s = await pool.query('SELECT * FROM sondages WHERE id = $1', [id]);
  if (s.rows.length === 0) return null;
  const row = s.rows[0];
  const q = await pool.query(
    'SELECT id, ordre, type, libelle, options, obligatoire FROM sondage_questions WHERE sondage_id = $1 ORDER BY ordre ASC, id ASC',
    [id]
  );
  return { ...row, questions: q.rows.map((r) => ({ ...r, options: r.options || [] })) };
}

const listSondages = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT s.id, s.titre, s.description, s.public_token, s.actif, s.accepte_reponses, s.created_at, s.updated_at,
        (SELECT COUNT(*)::int FROM sondage_reponses r WHERE r.sondage_id = s.id) AS nb_reponses
      FROM sondages s
      ORDER BY s.updated_at DESC NULLS LAST, s.id DESC
    `);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSondage = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: 'Identifiant invalide' });
    const full = await getSondageFull(id);
    if (!full) return res.status(404).json({ message: 'Sondage introuvable' });
    res.json(full);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const normaliserQuestions = (questions) => {
  if (!Array.isArray(questions)) return [];
  return questions.map((q, i) => {
    const type = String(q.type || 'texte');
    if (!typesValides.has(type)) throw new Error(`Type de question invalide: ${type}`);
    let options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).filter(Boolean) : [];
    if (type === 'choix_unique' || type === 'choix_multiple') {
      if (options.length < 2) throw new Error('Les questions à choix nécessitent au moins 2 options');
    } else {
      options = [];
    }
    return {
      ordre: i,
      type,
      libelle: String(q.libelle || '').trim() || 'Question sans titre',
      options,
      obligatoire: !!q.obligatoire,
    };
  });
};

const createSondage = async (req, res) => {
  const client = await pool.connect();
  try {
    const { titre, description, questions: rawQ } = req.body || {};
    const questions = normaliserQuestions(rawQ);
    const token = genToken();
    await client.query('BEGIN');
    const ins = await client.query(
      `INSERT INTO sondages (titre, description, public_token, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [String(titre || 'Nouveau sondage').slice(0, 500), description || null, token, req.user?.id || null]
    );
    const sid = ins.rows[0].id;
    for (const q of questions) {
      await client.query(
        `INSERT INTO sondage_questions (sondage_id, ordre, type, libelle, options, obligatoire)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
        [sid, q.ordre, q.type, q.libelle, JSON.stringify(q.options), q.obligatoire]
      );
    }
    await client.query('COMMIT');
    const full = await getSondageFull(sid);
    res.status(201).json(full);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message || 'Erreur création' });
  } finally {
    client.release();
  }
};

const updateSondage = async (req, res) => {
  const client = await pool.connect();
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: 'Identifiant invalide' });
    const cur = await client.query('SELECT id, titre, description, actif, accepte_reponses FROM sondages WHERE id = $1', [id]);
    if (cur.rows.length === 0) return res.status(404).json({ message: 'Sondage introuvable' });
    const row = cur.rows[0];

    const { titre, description, actif, accepte_reponses, questions: rawQ } = req.body || {};
    const questions = rawQ !== undefined ? normaliserQuestions(rawQ) : null;
    const newTitre = titre !== undefined ? String(titre).slice(0, 500) : row.titre;
    const newDesc = description !== undefined ? description : row.description;
    const newActif = actif !== undefined ? !!actif : row.actif;
    const newAcc = accepte_reponses !== undefined ? !!accepte_reponses : row.accepte_reponses;

    await client.query('BEGIN');
    await client.query(
      `UPDATE sondages SET titre = $2, description = $3, actif = $4, accepte_reponses = $5, updated_at = NOW() WHERE id = $1`,
      [id, newTitre, newDesc, newActif, newAcc]
    );

    if (questions !== null) {
      await client.query('DELETE FROM sondage_questions WHERE sondage_id = $1', [id]);
      for (const q of questions) {
        await client.query(
          `INSERT INTO sondage_questions (sondage_id, ordre, type, libelle, options, obligatoire)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
          [id, q.ordre, q.type, q.libelle, JSON.stringify(q.options), q.obligatoire]
        );
      }
    }
    await client.query('COMMIT');
    res.json(await getSondageFull(id));
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message || 'Erreur mise à jour' });
  } finally {
    client.release();
  }
};

const deleteSondage = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: 'Identifiant invalide' });
    await pool.query('DELETE FROM sondages WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const listReponses = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: 'Identifiant invalide' });
    const r = await pool.query(
      `SELECT id, reponses, submitted_at FROM sondage_reponses WHERE sondage_id = $1 ORDER BY submitted_at DESC LIMIT 1000`,
      [id]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPublicFormulaire = async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!token || token.length > 80) return res.status(400).json({ message: 'Lien invalide' });
    const s = await pool.query(
      'SELECT id, titre, description, actif, accepte_reponses FROM sondages WHERE public_token = $1',
      [token]
    );
    if (s.rows.length === 0) return res.status(404).json({ message: 'Formulaire introuvable' });
    const row = s.rows[0];
    if (!row.actif) return res.status(403).json({ message: 'Ce formulaire n\'est plus disponible' });
    if (!row.accepte_reponses) return res.status(403).json({ message: 'Les réponses ne sont plus acceptées' });
    const q = await pool.query(
      'SELECT id, ordre, type, libelle, options, obligatoire FROM sondage_questions WHERE sondage_id = $1 ORDER BY ordre ASC, id ASC',
      [row.id]
    );
    res.json({
      titre: row.titre,
      description: row.description,
      questions: q.rows.map((r) => ({ ...r, options: r.options || [] })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const validerReponses = (questions, reponsesObj) => {
  const out = {};
  const src = reponsesObj && typeof reponsesObj === 'object' ? reponsesObj : {};
  for (const q of questions) {
    const key = String(q.id);
    const raw = src[key] !== undefined ? src[key] : src[q.id];
    if (q.obligatoire) {
      if (raw === undefined || raw === null || raw === '') {
        throw new Error(`Réponse obligatoire manquante : ${q.libelle}`);
      }
      if (Array.isArray(raw) && raw.length === 0) {
        throw new Error(`Réponse obligatoire manquante : ${q.libelle}`);
      }
    }
    if (raw === undefined || raw === null || raw === '') continue;
    const opts = Array.isArray(q.options) ? q.options.map(String) : [];
    if (q.type === 'texte' || q.type === 'paragraphe') {
      const s = String(raw).trim();
      if (!s && q.obligatoire) throw new Error(`Réponse obligatoire : ${q.libelle}`);
      if (s) out[key] = s.slice(0, q.type === 'paragraphe' ? 8000 : 500);
    } else if (q.type === 'choix_unique') {
      const s = String(raw).trim();
      if (!opts.includes(s)) throw new Error(`Choix invalide pour : ${q.libelle}`);
      out[key] = s;
    } else if (q.type === 'choix_multiple') {
      const arr = Array.isArray(raw) ? raw : [raw];
      const set = arr.map((x) => String(x).trim()).filter(Boolean);
      for (const x of set) {
        if (!opts.includes(x)) throw new Error(`Option invalide pour : ${q.libelle}`);
      }
      if (q.obligatoire && set.length === 0) throw new Error(`Réponse obligatoire : ${q.libelle}`);
      if (set.length) out[key] = set;
    }
  }
  return out;
};

const postReponsePublique = async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!token || token.length > 80) return res.status(400).json({ message: 'Lien invalide' });
    const s = await pool.query(
      'SELECT id, actif, accepte_reponses FROM sondages WHERE public_token = $1',
      [token]
    );
    if (s.rows.length === 0) return res.status(404).json({ message: 'Formulaire introuvable' });
    const row = s.rows[0];
    if (!row.actif) return res.status(403).json({ message: 'Ce formulaire n\'est plus disponible' });
    if (!row.accepte_reponses) return res.status(403).json({ message: 'Les réponses ne sont plus acceptées' });

    const q = await pool.query(
      'SELECT id, ordre, type, libelle, options, obligatoire FROM sondage_questions WHERE sondage_id = $1 ORDER BY ordre ASC, id ASC',
      [row.id]
    );
    const questions = q.rows.map((r) => ({ ...r, options: r.options || [] }));
    if (questions.length === 0) return res.status(400).json({ message: 'Ce formulaire n\'a aucune question' });

    const body = req.body || {};
    const reponsesBrutes = body.reponses !== undefined ? body.reponses : body;
    const cleaned = validerReponses(questions, reponsesBrutes);

    const ins = await pool.query(
      `INSERT INTO sondage_reponses (sondage_id, reponses) VALUES ($1, $2::jsonb) RETURNING id, submitted_at`,
      [row.id, JSON.stringify(cleaned)]
    );
    res.status(201).json({ ok: true, id: ins.rows[0].id, submitted_at: ins.rows[0].submitted_at });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Erreur envoi' });
  }
};

module.exports = {
  listSondages,
  getSondage,
  createSondage,
  updateSondage,
  deleteSondage,
  listReponses,
  getPublicFormulaire,
  postReponsePublique,
};
