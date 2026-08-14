const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifierToken: auth } = require('../middleware/auth');

// ===== NIVEAUX =====
router.get('/niveaux', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM niveaux ORDER BY ordre, nom');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/niveaux', auth, async (req, res) => {
  try {
    const { nom, ordre = 0, periodes_normales = 20, periodes_soutien = 0 } = req.body;
    const pn = Math.max(0, parseInt(periodes_normales, 10) || 0);
    const ps = Math.max(0, parseInt(periodes_soutien, 10) || 0);
    const r = await pool.query(
      'INSERT INTO niveaux (nom, ordre, periodes_normales, periodes_soutien) VALUES ($1,$2,$3,$4) RETURNING *',
      [nom, ordre, pn, ps]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/niveaux/:id', auth, async (req, res) => {
  try {
    const { nom, ordre, periodes_normales, periodes_soutien } = req.body;
    const pn = periodes_normales === undefined || periodes_normales === null || periodes_normales === ''
      ? null
      : Math.max(0, parseInt(periodes_normales, 10) || 0);
    const ps = periodes_soutien === undefined || periodes_soutien === null || periodes_soutien === ''
      ? null
      : Math.max(0, parseInt(periodes_soutien, 10) || 0);
    const r = await pool.query(
      `UPDATE niveaux SET
         nom=$1,
         ordre=$2,
         periodes_normales=COALESCE($3, periodes_normales),
         periodes_soutien=COALESCE($4, periodes_soutien)
       WHERE id=$5 RETURNING *`,
      [nom, ordre, pn, ps, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/niveaux/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM niveaux WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ===== LIEUX DE TRAVAIL =====
router.get('/lieux-travail', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM lieux_travail ORDER BY COALESCE(ordre, 0), nom');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/lieux-travail', auth, async (req, res) => {
  try {
    const { nom, ordre = 0 } = req.body;
    const r = await pool.query('INSERT INTO lieux_travail (nom, ordre) VALUES ($1,$2) RETURNING *', [nom, ordre]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/lieux-travail/:id', auth, async (req, res) => {
  try {
    const { nom, ordre } = req.body;
    const r = await pool.query('UPDATE lieux_travail SET nom=$1, ordre=$2 WHERE id=$3 RETURNING *', [nom, ordre ?? 0, req.params.id]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/lieux-travail/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM lieux_travail WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ===== SALLES =====
router.get('/salles', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT s.*, l.nom AS lieu_nom
      FROM salles s
      LEFT JOIN lieux_travail l ON l.id = s.lieu_travail_id
      ORDER BY l.nom, s.nom
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/salles', auth, async (req, res) => {
  try {
    const { nom, lieu_travail_id } = req.body;
    const r = await pool.query('INSERT INTO salles (nom, lieu_travail_id) VALUES ($1,$2) RETURNING *', [nom, lieu_travail_id]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/salles/:id', auth, async (req, res) => {
  try {
    const { nom, lieu_travail_id } = req.body;
    const r = await pool.query('UPDATE salles SET nom=$1, lieu_travail_id=$2 WHERE id=$3 RETURNING *', [nom, lieu_travail_id, req.params.id]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/salles/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM salles WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
