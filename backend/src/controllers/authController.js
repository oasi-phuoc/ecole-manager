const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const ROLES_VALIDES = new Set(['admin', 'prof', 'eleve', 'parent']);
const emailValide = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
const normaliserEmail = (email) => String(email || '').trim().toLowerCase();

const register = async (req, res) => {
  const { nom, prenom, email, mot_de_passe, role } = req.body;
  const emailNormalise = normaliserEmail(email);
  try {
    if (!nom || !prenom || !emailNormalise || !mot_de_passe || !role) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }
    if (!emailValide(emailNormalise)) {
      return res.status(400).json({ message: 'Email invalide' });
    }
    if (String(mot_de_passe).length < 8) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caracteres' });
    }
    if (!ROLES_VALIDES.has(String(role))) {
      return res.status(400).json({ message: 'Role invalide' });
    }

    const existe = await pool.query('SELECT id FROM utilisateurs WHERE email = $1', [emailNormalise]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ message: 'Email deja utilise' });
    }
    const hash = await bcrypt.hash(mot_de_passe, 10);
    const result = await pool.query(
      'INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, nom, prenom, email, role',
      [String(nom).trim(), String(prenom).trim(), emailNormalise, hash, role]
    );
    res.status(201).json({ message: 'Compte cree', utilisateur: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const login = async (req, res) => {
  const { email, mot_de_passe } = req.body;
  const emailNormalise = normaliserEmail(email);
  try {
    if (!emailNormalise || !mot_de_passe || !emailValide(emailNormalise)) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Configuration de securite manquante' });
    }

    const result = await pool.query('SELECT * FROM utilisateurs WHERE email = $1 AND actif = true', [emailNormalise]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    const user = result.rows[0];
    const valide = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!valide) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, nom: user.nom, prenom: user.prenom },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({
      message: 'Connexion reussie',
      token,
      utilisateur: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const moi = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nom, prenom, email, role, created_at FROM utilisateurs WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { register, login, moi };