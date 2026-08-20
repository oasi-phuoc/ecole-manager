const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { encryptText, decryptText } = require('../utils/crypto');
const { generateSecret, generateOtpAuthUrl, verifyTotp } = require('../utils/totp');
const { getWebAuthnConfig, toBase64Url, fromBase64Url, userIdBytes } = require('../utils/webauthn');

const ROLES_VALIDES = new Set(['admin', 'prof', 'eleve', 'parent']);
const emailValide = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
const normaliserEmail = (email) => String(email || '').trim().toLowerCase();
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'ecole_manager_token';
const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const secure = process.env.COOKIE_SECURE
    ? String(process.env.COOKIE_SECURE).toLowerCase() === 'true'
    : isProd;
  const sameSite = process.env.COOKIE_SAMESITE || (secure ? 'None' : 'Lax');
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  };
};
const signerToken = (payload, expiresIn = '8h') => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
const userPayload = (user) => ({ id: user.id, email: user.email, role: user.role, nom: user.nom, prenom: user.prenom });
const publicUser = (user) => ({
  id: user.id,
  nom: user.nom,
  prenom: user.prenom,
  email: user.email,
  role: user.role,
  doit_changer_mdp: user.doit_changer_mdp || false,
  mfa_enabled: user.mfa_enabled === true,
  mfa_exempt: user.mfa_exempt === true,
});
const writeAuthCookie = (res, payload) => {
  const token = signerToken(payload, '8h');
  res.cookie(COOKIE_NAME, token, getCookieOptions());
};
const BACKUP_CODES_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const backupPepper = () => String(process.env.MFA_BACKUP_PEPPER || process.env.JWT_SECRET || '');
const hashBackupCode = (code) => crypto.createHash('sha256').update(String(code || '').toUpperCase() + '::' + backupPepper()).digest('hex');
const generateBackupCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < BACKUP_CODE_LENGTH; i++) out += chars[crypto.randomInt(0, chars.length)];
  return out;
};
const generateBackupCodes = (count = BACKUP_CODES_COUNT) => {
  const plain = [];
  for (let i = 0; i < count; i++) plain.push(generateBackupCode());
  const hashes = plain.map(hashBackupCode);
  return { plain, hashes };
};
const parseBackupHashes = (raw) => (Array.isArray(raw) ? raw.map(v => String(v || '')).filter(Boolean) : []);

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
  const identifiant = String(email || '').trim().toLowerCase();
  try {
    if (!identifiant || !mot_de_passe) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Configuration de securite manquante' });
    }

    const result = await pool.query(
      'SELECT * FROM utilisateurs WHERE (LOWER(email) = $1 OR LOWER(identifiant) = $1) AND actif = true',
      [identifiant]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    const user = result.rows[0];
    const valide = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!valide) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    const secret = decryptText(user.mfa_secret || '');
    if (user.mfa_exempt !== true && user.mfa_enabled === true && secret) {
      const mfaToken = signerToken({ purpose: 'mfa-login', id: user.id }, '5m');
      return res.json({ message: 'Code MFA requis', mfa_required: true, mfa_token: mfaToken });
    }
    writeAuthCookie(res, userPayload(user));
    res.json({
      message: 'Connexion reussie',
      utilisateur: publicUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const logout = async (req, res) => {
  const opts = getCookieOptions();
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
  });
  return res.json({ message: 'Deconnexion reussie' });
};

const loginMfa = async (req, res) => {
  const { mfa_token, code } = req.body || {};
  if (!mfa_token || !code) return res.status(400).json({ message: 'Token MFA ou code manquant' });
  try {
    const decoded = jwt.verify(mfa_token, process.env.JWT_SECRET);
    if (decoded?.purpose !== 'mfa-login' || !decoded?.id) return res.status(401).json({ message: 'Token MFA invalide' });
    const result = await pool.query(
      'SELECT id, nom, prenom, email, role, mfa_enabled, mfa_secret, mfa_backup_codes FROM utilisateurs WHERE id=$1 AND actif = true',
      [decoded.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'Utilisateur introuvable' });
    const secret = decryptText(user.mfa_secret || '');
    if (user.mfa_enabled !== true || !secret) return res.status(400).json({ message: 'MFA non active pour cet utilisateur' });
    const isTotp = verifyTotp(secret, code, 1);
    if (!isTotp) {
      const hashes = parseBackupHashes(user.mfa_backup_codes);
      const inputHash = hashBackupCode(code);
      const idx = hashes.indexOf(inputHash);
      if (idx === -1) return res.status(401).json({ message: 'Code MFA invalide' });
      hashes.splice(idx, 1);
      await pool.query('UPDATE utilisateurs SET mfa_backup_codes = $1::jsonb WHERE id = $2', [JSON.stringify(hashes), user.id]);
    }
    writeAuthCookie(res, userPayload(user));
    return res.json({
      message: 'Connexion reussie',
      utilisateur: publicUser(user),
    });
  } catch {
    return res.status(401).json({ message: 'Token MFA invalide ou expire' });
  }
};

const mfaStatus = async (req, res) => {
  try {
    const r = await pool.query('SELECT mfa_enabled, mfa_exempt, mfa_backup_codes FROM utilisateurs WHERE id = $1', [req.user.id]);
    const row = r.rows[0] || {};
    const backupCount = parseBackupHashes(row.mfa_backup_codes).length;
    return res.json({
      mfa_enabled: row.mfa_enabled === true,
      mfa_exempt: row.mfa_exempt === true,
      backup_codes_remaining: backupCount,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const mfaSetup = async (req, res) => {
  try {
    if (req.user?.mfa_exempt === true) {
      return res.status(403).json({ message: 'La 2FA est desactivee pour ce compte.' });
    }
    const r = await pool.query('SELECT email FROM utilisateurs WHERE id = $1', [req.user.id]);
    const email = r.rows[0]?.email || `user-${req.user.id}`;
    const secret = generateSecret();
    const issuer = process.env.MFA_ISSUER || 'Oasis';
    const otpauth_url = generateOtpAuthUrl({ secret, accountName: email, issuer });
    const setup_token = signerToken({ purpose: 'mfa-setup', id: req.user.id, secret }, '10m');
    return res.json({ secret, otpauth_url, setup_token, issuer, account: email });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const mfaEnable = async (req, res) => {
  const { setup_token, code } = req.body || {};
  if (!setup_token || !code) return res.status(400).json({ message: 'Token setup ou code manquant' });
  if (req.user?.mfa_exempt === true) {
    return res.status(403).json({ message: 'La 2FA est desactivee pour ce compte.' });
  }
  try {
    const decoded = jwt.verify(setup_token, process.env.JWT_SECRET);
    if (decoded?.purpose !== 'mfa-setup' || Number(decoded?.id) !== Number(req.user.id) || !decoded?.secret) {
      return res.status(401).json({ message: 'Token setup invalide' });
    }
    if (!verifyTotp(decoded.secret, code, 1)) return res.status(401).json({ message: 'Code MFA invalide' });
    const backup = generateBackupCodes();
    await pool.query(
      'UPDATE utilisateurs SET mfa_enabled = true, mfa_secret = $1, mfa_enabled_at = NOW(), mfa_backup_codes = $2::jsonb WHERE id = $3',
      [encryptText(decoded.secret), JSON.stringify(backup.hashes), req.user.id]
    );
    return res.json({ message: 'Double authentification activee', backup_codes: backup.plain, backup_codes_remaining: backup.plain.length });
  } catch {
    return res.status(401).json({ message: 'Token setup invalide ou expire' });
  }
};

const mfaRegenerateBackupCodes = async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ message: 'Code MFA manquant' });
  try {
    const r = await pool.query('SELECT mfa_enabled, mfa_secret FROM utilisateurs WHERE id = $1', [req.user.id]);
    const row = r.rows[0];
    if (!row || row.mfa_enabled !== true) return res.status(400).json({ message: 'MFA non activee' });
    const secret = decryptText(row.mfa_secret || '');
    if (!secret || !verifyTotp(secret, code, 1)) return res.status(401).json({ message: 'Code MFA invalide' });
    const backup = generateBackupCodes();
    await pool.query('UPDATE utilisateurs SET mfa_backup_codes = $1::jsonb WHERE id = $2', [JSON.stringify(backup.hashes), req.user.id]);
    return res.json({ message: 'Nouveaux codes de secours generes', backup_codes: backup.plain, backup_codes_remaining: backup.plain.length });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const mfaDisable = async (req, res) => {
  return res.status(403).json({
    message: 'La double authentification est obligatoire. Elle ne peut pas être désactivée pour le moment.',
  });
};

const mdpFortValide = (mdp) => {
  if (!mdp || String(mdp).length < 12) return 'Le mot de passe doit contenir au moins 12 caractères';
  if (!/[A-Z]/.test(mdp)) return 'Au moins une lettre majuscule requise';
  if (!/[a-z]/.test(mdp)) return 'Au moins une lettre minuscule requise';
  if (!/[0-9]/.test(mdp)) return 'Au moins un chiffre requis';
  if (!/[^A-Za-z0-9]/.test(mdp)) return 'Au moins un caractère spécial requis';
  return null;
};

const changerMdp = async (req, res) => {
  const { nouveau_mdp } = req.body || {};
  const erreur = mdpFortValide(nouveau_mdp);
  if (erreur) return res.status(400).json({ message: erreur });
  try {
    const hash = await bcrypt.hash(nouveau_mdp, 10);
    await pool.query('UPDATE utilisateurs SET mot_de_passe=$1, doit_changer_mdp=false WHERE id=$2', [hash, req.user.id]);
    return res.json({ message: 'Mot de passe changé avec succès' });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

const moi = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nom, prenom, email, role, created_at, mfa_enabled, mfa_exempt, doit_changer_mdp FROM utilisateurs WHERE id = $1',
      [req.user.id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ message: 'Utilisateur non trouve' });
    res.json({ ...row, mfa_enabled: row.mfa_enabled === true, mfa_exempt: row.mfa_exempt === true, doit_changer_mdp: row.doit_changer_mdp || false });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const parseTransports = (raw) => {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const listPasskeys = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, friendly_name, device_type, backed_up, transports, created_at
       FROM webauthn_credentials WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json({
      passkeys: (r.rows || []).map((row) => ({
        id: row.id,
        friendly_name: row.friendly_name || 'Passkey',
        device_type: row.device_type || null,
        backed_up: row.backed_up === true,
        transports: parseTransports(row.transports),
        created_at: row.created_at,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const passkeyRegisterOptions = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'Configuration de securite manquante' });
    const { rpID, rpName } = getWebAuthnConfig(req);
    const u = await pool.query('SELECT id, email, nom, prenom FROM utilisateurs WHERE id=$1 AND actif=true', [req.user.id]);
    const user = u.rows[0];
    if (!user) return res.status(401).json({ message: 'Utilisateur introuvable' });

    const existing = await pool.query(
      'SELECT credential_id, transports FROM webauthn_credentials WHERE user_id=$1',
      [user.id]
    );
    const excludeCredentials = (existing.rows || []).map((row) => ({
      id: row.credential_id,
      transports: parseTransports(row.transports),
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: userIdBytes(user.id),
      userName: String(user.email || `user-${user.id}`),
      userDisplayName: `${user.prenom || ''} ${user.nom || ''}`.trim() || String(user.email || user.id),
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    const challenge_token = signerToken({
      purpose: 'webauthn-register',
      id: user.id,
      challenge: options.challenge,
    }, '5m');

    return res.json({ options, challenge_token });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const passkeyRegisterVerify = async (req, res) => {
  const { challenge_token, credential, friendly_name } = req.body || {};
  if (!challenge_token || !credential) {
    return res.status(400).json({ message: 'Réponse passkey incomplete' });
  }
  try {
    const decoded = jwt.verify(challenge_token, process.env.JWT_SECRET);
    if (decoded?.purpose !== 'webauthn-register' || Number(decoded?.id) !== Number(req.user.id) || !decoded?.challenge) {
      return res.status(401).json({ message: 'Challenge passkey invalide' });
    }
    const { rpID, expectedOrigins } = getWebAuthnConfig(req);
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: decoded.challenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
    if (!verification.verified || !verification.registrationInfo) {
      return res.status(401).json({ message: 'Enregistrement passkey refusé' });
    }
    const info = verification.registrationInfo;
    const cred = info.credential || {};
    const credentialId = toBase64Url(cred.id || info.credentialID);
    const publicKey = toBase64Url(cred.publicKey || info.credentialPublicKey);
    const counter = Number(cred.counter != null ? cred.counter : info.counter || 0);
    const deviceType = info.credentialDeviceType || null;
    const backedUp = info.credentialBackedUp === true;
    const transports = Array.isArray(credential?.response?.transports)
      ? credential.response.transports
      : (Array.isArray(credential?.transports) ? credential.transports : []);
    const name = String(friendly_name || '').trim().slice(0, 100) || 'Passkey';

    if (!credentialId || !publicKey) {
      return res.status(400).json({ message: 'Identifiant passkey invalide' });
    }

    const inserted = await pool.query(
      `INSERT INTO webauthn_credentials
        (user_id, credential_id, public_key, counter, transports, device_type, backed_up, friendly_name)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8)
       ON CONFLICT (credential_id) DO NOTHING
       RETURNING id, friendly_name, created_at`,
      [req.user.id, credentialId, publicKey, counter, JSON.stringify(transports), deviceType, backedUp, name]
    );
    if (!inserted.rows[0]) {
      return res.status(409).json({ message: 'Cette passkey est déjà enregistrée' });
    }
    return res.json({
      message: 'Passkey enregistrée',
      passkey: {
        id: inserted.rows[0].id,
        friendly_name: inserted.rows[0].friendly_name,
        created_at: inserted.rows[0].created_at,
      },
    });
  } catch (err) {
    if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Challenge passkey invalide ou expiré' });
    }
    return res.status(401).json({ message: err.message || 'Échec de vérification passkey' });
  }
};

const passkeyLoginOptions = async (req, res) => {
  const identifiant = String(req.body?.email || '').trim().toLowerCase();
  try {
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'Configuration de securite manquante' });
    const { rpID } = getWebAuthnConfig(req);
    let allowCredentials;
    let userId = null;
    if (identifiant) {
      const r = await pool.query(
        `SELECT u.id FROM utilisateurs u
         WHERE (LOWER(u.email) = $1 OR LOWER(u.identifiant) = $1) AND u.actif = true`,
        [identifiant]
      );
      userId = r.rows[0]?.id || null;
      if (userId) {
        const creds = await pool.query(
          'SELECT credential_id, transports FROM webauthn_credentials WHERE user_id=$1',
          [userId]
        );
        allowCredentials = (creds.rows || []).map((row) => ({
          id: row.credential_id,
          transports: parseTransports(row.transports),
        }));
        if (!allowCredentials.length) {
          return res.status(404).json({ message: 'Aucune passkey enregistrée pour ce compte' });
        }
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
      allowCredentials,
    });

    const challenge_token = signerToken({
      purpose: 'webauthn-login',
      challenge: options.challenge,
      id: userId || null,
    }, '5m');

    return res.json({ options, challenge_token });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

const passkeyLoginVerify = async (req, res) => {
  const { challenge_token, credential } = req.body || {};
  if (!challenge_token || !credential) {
    return res.status(400).json({ message: 'Réponse passkey incomplete' });
  }
  try {
    const decoded = jwt.verify(challenge_token, process.env.JWT_SECRET);
    if (decoded?.purpose !== 'webauthn-login' || !decoded?.challenge) {
      return res.status(401).json({ message: 'Challenge passkey invalide' });
    }
    const credentialId = toBase64Url(credential?.id || credential?.rawId);
    if (!credentialId) return res.status(400).json({ message: 'Identifiant passkey manquant' });

    const credRes = await pool.query(
      `SELECT c.*, u.id AS uid, u.nom, u.prenom, u.email, u.role, u.doit_changer_mdp, u.mfa_enabled, u.mfa_exempt, u.actif
       FROM webauthn_credentials c
       JOIN utilisateurs u ON u.id = c.user_id
       WHERE c.credential_id = $1`,
      [credentialId]
    );
    const row = credRes.rows[0];
    if (!row || row.actif === false) {
      return res.status(401).json({ message: 'Passkey inconnue ou compte inactif' });
    }
    if (decoded.id != null && Number(decoded.id) !== Number(row.user_id)) {
      return res.status(401).json({ message: 'Passkey ne correspond pas au compte' });
    }

    const { rpID, expectedOrigins } = getWebAuthnConfig(req);
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: decoded.challenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: row.credential_id,
        publicKey: fromBase64Url(row.public_key),
        counter: Number(row.counter || 0),
        transports: parseTransports(row.transports),
      },
    });
    if (!verification.verified) {
      return res.status(401).json({ message: 'Authentification passkey refusée' });
    }
    const newCounter = Number(verification.authenticationInfo?.newCounter ?? row.counter ?? 0);
    await pool.query('UPDATE webauthn_credentials SET counter=$1 WHERE id=$2', [newCounter, row.id]);

    const user = {
      id: row.uid,
      nom: row.nom,
      prenom: row.prenom,
      email: row.email,
      role: row.role,
      doit_changer_mdp: row.doit_changer_mdp || false,
      mfa_enabled: row.mfa_enabled === true,
      mfa_exempt: row.mfa_exempt === true,
    };
    writeAuthCookie(res, userPayload(user));
    return res.json({
      message: 'Connexion reussie',
      utilisateur: publicUser(user),
    });
  } catch (err) {
    if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Challenge passkey invalide ou expiré' });
    }
    return res.status(401).json({ message: err.message || 'Échec de connexion passkey' });
  }
};

const deletePasskey = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'Identifiant invalide' });
    const r = await pool.query(
      'DELETE FROM webauthn_credentials WHERE id=$1 AND user_id=$2 RETURNING id',
      [id, req.user.id]
    );
    if (!r.rows[0]) return res.status(404).json({ message: 'Passkey introuvable' });
    return res.json({ message: 'Passkey supprimée' });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = {
  register,
  login,
  loginMfa,
  logout,
  moi,
  changerMdp,
  mfaStatus,
  mfaSetup,
  mfaEnable,
  mfaRegenerateBackupCodes,
  mfaDisable,
  listPasskeys,
  passkeyRegisterOptions,
  passkeyRegisterVerify,
  passkeyLoginOptions,
  passkeyLoginVerify,
  deletePasskey,
};