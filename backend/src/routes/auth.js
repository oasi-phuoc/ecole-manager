const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { verifierToken } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives de connexion, reessayez dans 15 minutes.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop d'inscriptions, reessayez plus tard." },
});

router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/login/mfa', loginLimiter, authController.loginMfa);
router.post('/logout', authController.logout);
router.get('/moi', verifierToken, authController.moi);
router.post('/changer-mdp', verifierToken, authController.changerMdp);
router.get('/mfa/status', verifierToken, authController.mfaStatus);
router.post('/mfa/setup', verifierToken, authController.mfaSetup);
router.post('/mfa/enable', verifierToken, authController.mfaEnable);
router.post('/mfa/backup/regenerate', verifierToken, authController.mfaRegenerateBackupCodes);
router.post('/mfa/disable', verifierToken, authController.mfaDisable);

module.exports = router;
