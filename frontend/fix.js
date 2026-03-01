const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'EmploiDuTemps.js');
let code = fs.readFileSync(filePath, 'utf8');

// ── 1. Remplacer toggleClasseHoraire : bascule simple Matin ↔ Après-midi ──
code = code.replace(
  `  // Cycle exclusif par jour : rien → Matin → Après-midi → rien
  const toggleClasseHoraire = async (classe_id, jour) => {
    if (!isAdmin()) return;
    const actuel = classeHoraires.find(h => h.classe_id==classe_id && h.jour===jour);
    let nouvellePeriode = null;
    if (!actuel) nouvellePeriode = 'Matin';
    else if (actuel.periode === 'Matin') nouvellePeriode = 'Après-midi';
    else nouvellePeriode = null;
    let nouveaux = classeHoraires.filter(h => !(h.classe_id==classe_id && h.jour===jour));
    if (nouvellePeriode) nouveaux = [...nouveaux, {classe_id, jour, periode: nouvellePeriode}];
    setClasseHoraires(nouveaux);
    const horairesClasse = nouveaux.filter(h => h.classe_id==classe_id).map(h => ({jour:h.jour, periode:h.periode}));
    await axios.post(API + '/planning/classe-horaires/' + classe_id, { horaires: horairesClasse }, { headers });
    chargerTout();
  };

  const getHoraireJourClasse = (classe_id, jour) => {
    const h = classeHoraires.find(h => h.classe_id==classe_id && h.jour===jour);
    return h?.periode || null;
  };`,
  `  // Bascule simple : Matin ↔ Après-midi (défaut Matin)
  const toggleClasseHoraire = async (classe_id, jour) => {
    if (!isAdmin()) return;
    const actuel = classeHoraires.find(h => h.classe_id==classe_id && h.jour===jour);
    const nouvellePeriode = actuel?.periode === 'Matin' ? 'Après-midi' : 'Matin';
    let nouveaux = classeHoraires.filter(h => !(h.classe_id==classe_id && h.jour===jour));
    nouveaux = [...nouveaux, {classe_id, jour, periode: nouvellePeriode}];
    setClasseHoraires(nouveaux);
    const horairesClasse = nouveaux.filter(h => h.classe_id==classe_id).map(h => ({jour:h.jour, periode:h.periode}));
    await axios.post(API + '/planning/classe-horaires/' + classe_id, { horaires: horairesClasse }, { headers });
    chargerTout();
  };

  const getHoraireJourClasse = (classe_id, jour) => {
    const h = classeHoraires.find(h => h.classe_id==classe_id && h.jour===jour);
    return h?.periode || 'Matin';
  };`
);

// ── 2. Mettre à jour le libellé d'aide ──
code = code.replace(
  `<div style={{fontSize:12,color:'#94a3b8',marginBottom:12}}>Cliquer pour cycler : <b style={{color:'#475569'}}>Inactif → ☀️ Matin → 🌙 Après-midi → Inactif</b></div>`,
  `<div style={{fontSize:12,color:'#94a3b8',marginBottom:12}}>Cliquer pour basculer : <b style={{color:'#475569'}}>☀️ Matin ↔ 🌙 Après-midi</b></div>`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Toggle Matin ↔ Après-midi appliqué !');