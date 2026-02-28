const fs = require('fs');
let p = fs.readFileSync('./src/pages/Professeurs.js', 'utf8');

// Ajouter état filtre statut
p = p.replace(
  `const [recherche, setRecherche] = useState('');`,
  `const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('tous');`
);

// Modifier le filtre
p = p.replace(
  `const profsFiltres = profs.filter(p =>
    (p.nom + ' ' + p.prenom + ' ' + p.email).toLowerCase().includes(recherche.toLowerCase())
  );`,
  `const profsFiltres = profs.filter(p => {
    const matchRecherche = (p.nom + ' ' + p.prenom + ' ' + p.email).toLowerCase().includes(recherche.toLowerCase());
    const matchStatut = filtreStatut === 'tous' || (filtreStatut === 'actif' && p.actif !== false) || (filtreStatut === 'inactif' && p.actif === false);
    return matchRecherche && matchStatut;
  });`
);

// Ajouter boutons filtre dans le header
p = p.replace(
  `<input style={styles.recherche} placeholder="🔍 Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} />`,
  `<input style={styles.recherche} placeholder="🔍 Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} />
          <div style={styles.filtreStatut}>
            {[{id:'tous',label:'Tous'},{id:'actif',label:'✅ Actifs'},{id:'inactif',label:'❌ Inactifs'}].map(f => (
              <button key={f.id}
                style={{...styles.filtrBtn, ...(filtreStatut===f.id?styles.filtrBtnActif:{})}}
                onClick={() => setFiltreStatut(f.id)}>
                {f.label}
              </button>
            ))}
          </div>`
);

// Ajouter styles
p = p.replace(
  `btnAjouter: { padding: '10px 20px'`,
  `filtreStatut: { display: 'flex', gap: '6px' },
  filtrBtn: { padding: '8px 14px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  filtrBtnActif: { background: '#34a853', color: 'white', border: '2px solid #34a853' },
  btnAjouter: { padding: '10px 20px'`
);

fs.writeFileSync('./src/pages/Professeurs.js', p);
console.log('OK !');