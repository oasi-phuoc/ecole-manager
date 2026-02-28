const fs = require('fs');
let ctrl = fs.readFileSync('./src/controllers/branchesController.js', 'utf8');
ctrl = ctrl.replace(
  `const { nom, niveau, periodes_semaine, coefficient } = req.body;
  if (!nom) return res.status(400).json({ message: 'Le nom est requis' });
  if (!periodes_semaine) return res.status(400).json({ message: 'Les périodes/semaine sont requises' });
  if (!niveau) return res.status(400).json({ message: 'Le niveau est requis' });
  try {
    const r = await pool.query(
      'INSERT INTO matieres (nom, niveau, periodes_semaine, coefficient) VALUES ($1,$2,$3,$4) RETURNING *',
      [nom, niveau, parseInt(periodes_semaine), parseFloat(coefficient)||1]`,
  `const { nom, niveau, periodes_semaine, coefficient, type_branche } = req.body;
  if (!nom) return res.status(400).json({ message: 'Le nom est requis' });
  if (!periodes_semaine) return res.status(400).json({ message: 'Les périodes/semaine sont requises' });
  if (!niveau) return res.status(400).json({ message: 'Le niveau est requis' });
  try {
    const r = await pool.query(
      'INSERT INTO matieres (nom, niveau, periodes_semaine, coefficient, type_branche) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [nom, niveau, parseInt(periodes_semaine), parseFloat(coefficient)||1, type_branche||'principale']`
);
ctrl = ctrl.replace(
  `const { nom, niveau, periodes_semaine, coefficient } = req.body;
  try {
    const r = await pool.query(
      'UPDATE matieres SET nom=$1, niveau=$2, periodes_semaine=$3, coefficient=$4 WHERE id=$5 RETURNING *',
      [nom, niveau, parseInt(periodes_semaine), parseFloat(coefficient)||1, req.params.id]`,
  `const { nom, niveau, periodes_semaine, coefficient, type_branche } = req.body;
  try {
    const r = await pool.query(
      'UPDATE matieres SET nom=$1, niveau=$2, periodes_semaine=$3, coefficient=$4, type_branche=$5 WHERE id=$6 RETURNING *',
      [nom, niveau, parseInt(periodes_semaine), parseFloat(coefficient)||1, type_branche||'principale', req.params.id]`
);
fs.writeFileSync('./src/controllers/branchesController.js', ctrl);
console.log('branchesController OK !');