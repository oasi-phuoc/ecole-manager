const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifierToken } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/moi', verifierToken, authController.moi);

module.exports = router;
