const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const pool = require('../config/database');

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'ecole_manager_token';

const parseCookies = (cookieHeader) => {
  const out = {};
  if (!cookieHeader) return out;
  String(cookieHeader).split(';').forEach((part) => {
    const [k, ...rest] = part.split('=');
    const key = String(k || '').trim();
    if (!key) return;
    out[key] = decodeURIComponent(rest.join('=').trim());
  });
  return out;
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function utilisateurFromSupabaseToken(token) {
  const admin = getSupabaseAdmin();
  if (!admin || !token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  const result = await pool.query(
    'SELECT id, nom, prenom, email, role, permissions FROM utilisateurs WHERE auth_user_id = $1 AND actif = true',
    [user.id]
  );
  return result.rows[0] || null;
}

async function utilisateurFromLegacyToken(token) {
  if (!process.env.JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) return null;
    const result = await pool.query(
      'SELECT id, nom, prenom, email, role, permissions FROM utilisateurs WHERE id = $1',
      [decoded.id]
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

const verifierToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const headerTokenRaw = authHeader && authHeader.split(' ')[1];
  const headerToken =
    headerTokenRaw && headerTokenRaw !== 'null' && headerTokenRaw !== 'undefined'
      ? headerTokenRaw
      : '';
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[COOKIE_NAME] || '';
  const token = headerToken || cookieToken;
  if (!token) return res.status(401).json({ message: 'Token manquant' });

  try {
    let user = await utilisateurFromSupabaseToken(token);
    if (!user) user = await utilisateurFromLegacyToken(token);
    if (!user) return res.status(403).json({ message: 'Token invalide' });
    req.user = user;
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
