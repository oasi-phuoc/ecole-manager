const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifierToken } = require('../middleware/auth');
const { importEleves } = require('../controllers/importController');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
router.use(verifierToken);
router.post('/eleves', upload.single('fichier'), importEleves);
module.exports = router;