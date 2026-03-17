const express = require('express');
const router = express.Router();
const { getNotePersonnelle, putNotePersonnelle } = require('../controllers/notesPersonnellesController');
const { authentifier } = require('../middleware/auth');

router.get('/', authentifier, getNotePersonnelle);
router.put('/', authentifier, putNotePersonnelle);

module.exports = router;
