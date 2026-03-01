const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Presences.js');
let code = fs.readFileSync(filePath, 'utf8');

// ── 1. Ajouter state evenementsCalendrier ──
code = code.replace(
  `  const [classeHoraires, setClasseHoraires] = useState([]);`,
  `  const [classeHoraires, setClasseHoraires] = useState([]);
  const [evenementsCalendrier, setEvenementsCalendrier] = useState([]);`
);

// ── 2. Charger les événements du calendrier au démarrage ──
code = code.replace(
  `  useEffect(() => { chargerClasses(); }, []);`,
  `  useEffect(() => { chargerClasses(); chargerCalendrier(); }, []);`
);

// ── 3. Ajouter fonction chargerCalendrier ──
code = code.replace(
  `  const chargerClasseHoraires = async (classe_id) => {`,
  `  const chargerCalendrier = async () => {
    try {
      const res = await axios.get(API + '/calendrier', { headers });
      setEvenementsCalendrier(res.data.filter(e => e.categorie === 'vacance'));
    } catch (err) { console.error(err); }
  };

  const chargerClasseHoraires = async (classe_id) => {`
);

// ── 4. Ajouter helpers navigation date + détection vacance ──
code = code.replace(
  `  const getJourSemaine = () => new Date(date + 'T12:00:00').getDay();`,
  `  const getJourSemaine = () => new Date(date + 'T12:00:00').getDay();

  const allerJourPrecedent = () => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const allerJourSuivant = () => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const isVacance = () => {
    return evenementsCalendrier.some(ev => {
      const deb = ev.date_debut?.substring(0, 10);
      const fin = (ev.date_fin || ev.date_debut)?.substring(0, 10);
      return date >= deb && date <= fin;
    });
  };

  const getNomVacance = () => {
    const ev = evenementsCalendrier.find(ev => {
      const deb = ev.date_debut?.substring(0, 10);
      const fin = (ev.date_fin || ev.date_debut)?.substring(0, 10);
      return date >= deb && date <= fin;
    });
    return ev?.nom_vacance || ev?.titre || 'Vacances';
  };`
);

// ── 5. Remplacer le sélecteur de date par date + boutons navigation ──
code = code.replace(
  `          <input style={s.inp} type="date" value={date} onChange={e => setDate(e.target.value)} />`,
  `          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <button onClick={allerJourPrecedent} style={{padding:'7px 11px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:14,color:'#475569',fontWeight:700}}>‹</button>
            <input style={s.inp} type="date" value={date} onChange={e => setDate(e.target.value)} />
            <button onClick={allerJourSuivant} style={{padding:'7px 11px',background:'white',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontSize:14,color:'#475569',fontWeight:700}}>›</button>
          </div>`
);

// ── 6. Ajouter bandeau vacance (après le bandeau weekend existant) ──
code = code.replace(
  `          {!isWeekend() && !getHoraireJour() && (
            <div style={{padding:'12px 20px',background:'#fff7ed',borderBottom:'1px solid #fed7aa',color:'#c2410c',fontWeight:700,fontSize:13}}>
              ⚠️ Aucun horaire défini pour cette classe le {getNomJour()} — configurez l'affectation des classes dans l'emploi du temps
            </div>
          )}`,
  `          {!isWeekend() && isVacance() && (
            <div style={{padding:'12px 20px',background:'#fef3c7',borderBottom:'1px solid #fde68a',color:'#92400e',fontWeight:700,fontSize:13}}>
              🏖️ {getNomVacance()} — pas de saisie de présences pendant les vacances
            </div>
          )}
          {!isWeekend() && !isVacance() && !getHoraireJour() && (
            <div style={{padding:'12px 20px',background:'#fff7ed',borderBottom:'1px solid #fed7aa',color:'#c2410c',fontWeight:700,fontSize:13}}>
              ⚠️ Aucun horaire défini pour cette classe le {getNomJour()} — configurez l'affectation des classes dans l'emploi du temps
            </div>
          )}`
);

// ── 7. Mettre à jour isBloque pour inclure les vacances ──
code = code.replace(
  `  const isBloque = (periode) => {
    const horaire = getHoraireJour();
    if (!horaire) return true; // pas de cours ce jour → tout grisé
    if (horaire === 'Matin' && periode > 4) return true;
    if (horaire === 'Après-midi' && periode <= 4) return true;
    return false;
  };`,
  `  const isBloque = (periode) => {
    if (isWeekend()) return true;
    if (isVacance()) return true;
    const horaire = getHoraireJour();
    if (!horaire) return true;
    if (horaire === 'Matin' && periode > 4) return true;
    if (horaire === 'Après-midi' && periode <= 4) return true;
    return false;
  };`
);

// ── 8. Désactiver bouton valider aussi pendant les vacances ──
code = code.replace(
  `              <button onClick={handleToggleValide} disabled={isWeekend()} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',borderRadius:99,border:'2px solid '+(valide?'#10b981':'#e2e8f0'),background:isWeekend()?'#f1f5f9':valide?'#ecfdf5':'white',color:isWeekend()?'#cbd5e1':valide?'#059669':'#64748b',cursor:isWeekend()?'not-allowed':'pointer',fontWeight:700,fontSize:13,transition:'all 0.2s'}}>`,
  `              <button onClick={handleToggleValide} disabled={isWeekend()||isVacance()} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',borderRadius:99,border:'2px solid '+((valide)?'#10b981':'#e2e8f0'),background:(isWeekend()||isVacance())?'#f1f5f9':valide?'#ecfdf5':'white',color:(isWeekend()||isVacance())?'#cbd5e1':valide?'#059669':'#64748b',cursor:(isWeekend()||isVacance())?'not-allowed':'pointer',fontWeight:700,fontSize:13,transition:'all 0.2s'}}>`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Presences : navigation date + grisage vacances appliqués !');
console.log('   ✔ Boutons ‹ › pour aller au jour précédent/suivant');
console.log('   ✔ Grisage automatique si jour en vacances/férié');
console.log('   ✔ Bandeau orange vacances avec nom affiché');
console.log('   ✔ Bouton valider désactivé pendant les vacances');