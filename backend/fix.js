const fs = require('fs');
let ctrl = fs.readFileSync('./src/controllers/calendrierController.js', 'utf8');

ctrl = ctrl.replace(
  `const { titre, description, date_debut, date_fin, type, couleur } = req.body;
  try {
    const result = await pool.query(
      'UPDATE calendrier SET titre=$1, description=$2, date_debut=$3, date_fin=$4, type=$5, couleur=$6 WHERE id=$7 RETURNING *',
      [titre, description || null, date_debut, date_fin || date_debut, type || 'Evenement', couleur || '#1a73e8', req.params.id]
    );`,
  `const { titre, description, date_debut, date_fin, type, couleur, categorie, nom_vacance, heure_debut, heure_fin } = req.body;
  try {
    const result = await pool.query(
      'UPDATE calendrier SET titre=$1, description=$2, date_debut=$3, date_fin=$4, type=$5, couleur=$6, categorie=$7, nom_vacance=$8, heure_debut=$9, heure_fin=$10 WHERE id=$11 RETURNING *',
      [titre, description||null, date_debut, date_fin||date_debut, type||'Evenement', couleur||'#1a73e8', categorie||'evenement', nom_vacance||null, heure_debut||null, heure_fin||null, req.params.id]
    );`
);

fs.writeFileSync('./src/controllers/calendrierController.js', ctrl);
console.log('modifierEvenement OK !');