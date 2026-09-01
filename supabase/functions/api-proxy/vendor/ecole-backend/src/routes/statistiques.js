const express = require('express');
const router = express.Router();
const c = require('../controllers/statistiquesController');
const { verifierToken } = require('../middleware/auth');

router.use(verifierToken);
router.get('/', c.getStatistiques);

module.exports = router;