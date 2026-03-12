const express = require('express');
const router = express.Router();
const c = require('../controllers/tcfStateController');
const { verifierToken } = require('../middleware/auth');

router.use(verifierToken);
router.get('/:cle', c.getState);
router.put('/:cle', c.upsertState);

module.exports = router;
