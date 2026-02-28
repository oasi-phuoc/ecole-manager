const fs = require('fs');
let p = fs.readFileSync('./src/pages/Professeurs.js', 'utf8');

// Supprimer la ligne en double
p = p.replace(
  `const [filtreStatut, setFiltreStatut] = useState('tous');
  const [filtreStatut, setFiltreStatut] = useState('tous');`,
  `const [filtreStatut, setFiltreStatut] = useState('tous');`
);

fs.writeFileSync('./src/pages/Professeurs.js', p);
console.log('OK !');