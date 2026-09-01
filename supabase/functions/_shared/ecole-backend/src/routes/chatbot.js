const express = require('express');
const router = express.Router();
const { chatbot } = require('../controllers/chatbotController');
const { verifierToken } = require('../middleware/auth');

router.post('/', verifierToken, chatbot);

module.exports = router;
