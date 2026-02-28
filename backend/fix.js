const fs = require('fs');

let ctrl = fs.readFileSync('./src/controllers/classesController.js', 'utf8');

// Fix getElevesClasse - joindre utilisateurs pour nom/prénom
ctrl = ctrl.replace(
  `const eleves = await pool.query(\`
      SELECT e.*,
        COUNT(DISTINCT a.id) FILTER (WHERE a.type='absence') as nb_absences,
        COUNT(DISTINCT a.id) FILTER (WHERE a.type='absence' AND a.excusee=true) as nb_excuses,
        COUNT(DISTINCT a.id) FILTER (WHERE a.type='retard') as nb_retards
      FROM eleves e
      LEFT JOIN absences a ON a.eleve_id=e.id
      WHERE e.classe_id=$1
      GROUP BY e.id
      ORDER BY e.nom, e.prenom
    \`, [req.params.id]);`,
  `const eleves = await pool.query(\`
      SELECT e.*,
        COALESCE(e.nom, u.nom) as nom,
        COALESCE(e.prenom, u.prenom) as prenom,
        COUNT(DISTINCT a.id) FILTER (WHERE a.type='absence') as nb_absences,
        COUNT(DISTINCT a.id) FILTER (WHERE a.type='absence' AND a.excusee=true) as nb_excuses,
        COUNT(DISTINCT a.id) FILTER (WHERE a.type='retard') as nb_retards
      FROM eleves e
      LEFT JOIN utilisateurs u ON u.id=e.utilisateur_id
      LEFT JOIN absences a ON a.eleve_id=e.id
      WHERE e.classe_id=$1
      GROUP BY e.id, u.nom, u.prenom
      ORDER BY COALESCE(e.nom, u.nom), COALESCE(e.prenom, u.prenom)
    \`, [req.params.id]);`
);

fs.writeFileSync('./src/controllers/classesController.js', ctrl);
console.log('classesController OK !');