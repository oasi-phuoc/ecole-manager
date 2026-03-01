const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Presences.js');
let code = fs.readFileSync(filePath, 'utf8');

// ── 1. Supprimer HORAIRE_PAR_JOUR hardcodé ──
code = code.replace(
  `const PERIODES = [1,2,3,4,5,6,7,8];

// 0=Dim, 1=Lun, 2=Mar, 3=Mer, 4=Jeu, 5=Ven, 6=Sam
// Valeurs : 'matin' | 'apresmidi' | 'complet' | 'ferme'
const HORAIRE_PAR_JOUR = {
  0: 'ferme',       // Dimanche
  1: 'matin',       // Lundi
  2: 'apresmidi',   // Mardi
  3: 'matin',       // Mercredi  ← adapter si besoin
  4: 'complet',     // Jeudi     ← adapter si besoin
  5: 'apresmidi',   // Vendredi  ← adapter si besoin
  6: 'ferme',       // Samedi
};`,
  `const PERIODES = [1,2,3,4,5,6,7,8];
const JOURS_NOMS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];`
);

// ── 2. Ajouter state classeHoraires ──
code = code.replace(
  `  const [valide, setValide] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);`,
  `  const [valide, setValide] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [classeHoraires, setClasseHoraires] = useState([]);`
);

// ── 3. Charger classeHoraires quand la classe change ──
code = code.replace(
  `  useEffect(() => {
    if (classeSelectionnee) {
      const cl = classes.find(c => String(c.id) === String(classeSelectionnee));
      setClasseInfo(cl || null);
      chargerEleves();
      chargerStats();
    }
  }, [classeSelectionnee, date]);`,
  `  useEffect(() => {
    if (classeSelectionnee) {
      const cl = classes.find(c => String(c.id) === String(classeSelectionnee));
      setClasseInfo(cl || null);
      chargerEleves();
      chargerStats();
      chargerClasseHoraires(classeSelectionnee);
    }
  }, [classeSelectionnee, date]);`
);

// ── 4. Ajouter fonction chargerClasseHoraires ──
code = code.replace(
  `  const chargerClasses = async () => {`,
  `  const chargerClasseHoraires = async (classe_id) => {
    try {
      const res = await axios.get(API + '/planning/classe-horaires', { headers });
      setClasseHoraires(res.data.filter(h => h.classe_id == classe_id));
    } catch (err) { console.error(err); }
  };

  const chargerClasses = async () => {`
);

// ── 5. Remplacer les fonctions getJourSemaine / getHoraireJour / isWeekend / isBloque ──
code = code.replace(
  `  // Jour de la semaine basé sur la date sélectionnée
  const getJourSemaine = () => {
    const d = new Date(date + 'T12:00:00');
    return d.getDay(); // 0=Dim, 1=Lun, ..., 6=Sam
  };

  const getHoraireJour = () => HORAIRE_PAR_JOUR[getJourSemaine()] || 'ferme';

  const isWeekend = () => {
    const j = getJourSemaine();
    return j === 0 || j === 6;
  };

  const isBloque = (periode) => {
    const horaire = getHoraireJour();
    if (horaire === 'ferme') return true;
    if (horaire === 'matin' && periode > 4) return true;
    if (horaire === 'apresmidi' && periode <= 4) return true;
    return false;
  };`,
  `  const getJourSemaine = () => new Date(date + 'T12:00:00').getDay();

  const getNomJour = () => JOURS_NOMS[getJourSemaine()];

  const isWeekend = () => { const j = getJourSemaine(); return j === 0 || j === 6; };

  // Récupère la période (Matin / Après-midi) définie pour la classe ce jour
  const getHoraireJour = () => {
    if (isWeekend()) return null;
    const nomJour = getNomJour();
    const h = classeHoraires.find(h => h.jour === nomJour);
    return h?.periode || null; // null = pas de cours ce jour
  };

  const isBloque = (periode) => {
    const horaire = getHoraireJour();
    if (!horaire) return true; // pas de cours ce jour → tout grisé
    if (horaire === 'Matin' && periode > 4) return true;
    if (horaire === 'Après-midi' && periode <= 4) return true;
    return false;
  };`
);

// ── 6. Améliorer le message weekend pour inclure "pas de cours" ──
code = code.replace(
  `          {isWeekend() && (
            <div style={{padding:'12px 20px',background:'#fef2f2',borderBottom:'1px solid #fecaca',color:'#dc2626',fontWeight:700,fontSize:13}}>
              🚫 Samedi et dimanche — aucune saisie possible
            </div>
          )}`,
  `          {isWeekend() && (
            <div style={{padding:'12px 20px',background:'#fef2f2',borderBottom:'1px solid #fecaca',color:'#dc2626',fontWeight:700,fontSize:13}}>
              🚫 Samedi et dimanche — aucune saisie possible
            </div>
          )}
          {!isWeekend() && !getHoraireJour() && (
            <div style={{padding:'12px 20px',background:'#fff7ed',borderBottom:'1px solid #fed7aa',color:'#c2410c',fontWeight:700,fontSize:13}}>
              ⚠️ Aucun horaire défini pour cette classe le {getNomJour()} — configurez l'affectation des classes dans l'emploi du temps
            </div>
          )}
          {!isWeekend() && getHoraireJour() && (
            <div style={{padding:'8px 20px',background:'#f0fdf4',borderBottom:'1px solid #bbf7d0',color:'#15803d',fontWeight:600,fontSize:12}}>
              📅 {getNomJour()} — {getHoraireJour() === 'Matin' ? '☀️ Matin (P1–P4)' : '🌙 Après-midi (P5–P8)'}
            </div>
          )}`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Presences : horaires réels depuis la DB appliqués !');
console.log('   ✔ Grisage basé sur affectation classes EmploiDuTemps');
console.log('   ✔ Message si aucun horaire défini ce jour');
console.log('   ✔ Bandeau indicateur Matin/Après-midi');