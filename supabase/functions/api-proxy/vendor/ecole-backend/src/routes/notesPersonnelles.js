const express = require('express');
const router = express.Router();
const { getNotePersonnelle, putNotePersonnelle } = require('../controllers/notesPersonnellesController');
const { verifierToken } = require('../middleware/auth');

router.get('/', verifierToken, getNotePersonnelle);
router.put('/', verifierToken, putNotePersonnelle);

module.exports = router;
