const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const verifierToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token manquant' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT id, nom, prenom, email, role, permissions FROM utilisateurs WHERE id=$1', [decoded.id]);
    if (result.rows.length === 0) return res.status(401).json({ message: 'Utilisateur non trouve' });
    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token invalide' });
  }
};

const autoriser = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Acces refuse' });
  next();
};

const peutModifier = (module) => (req, res, next) => {
  if (req.user.role === 'admin') return next();
  const perms = req.user.permissions || {};
  if (perms[module] === true) return next();
  return res.status(403).json({ message: 'Permission refusee' });
};

module.exports = { verifierToken, autoriser, peutModifier };