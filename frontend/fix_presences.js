const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Presences.js');
let code = fs.readFileSync(filePath, 'utf8');

// ── 1. Ajouter HORAIRE_PAR_JOUR après PERIODES ──
code = code.replace(
  `const PERIODES = [1,2,3,4,5,6,7,8];`,
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
};`
);

// ── 2. Remplacer la fonction isBloque dans le composant ──
code = code.replace(
  `  const isBloque = (periode) => {
    const horaire = classeInfo?.horaire || 'complet';
    if (horaire === 'matin' && periode > 4) return true;
    if (horaire === 'apresmidi' && periode <= 4) return true;
    return false;
  };`,
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
  };

  // Applique un statut à toutes les périodes non-bloquées d'un élève
  const setToutEleve = (eleveId, val) => {
    setPresences(prev => {
      const row = { ...prev[eleveId] };
      PERIODES.forEach(i => {
        if (!isBloque(i)) row['p' + i] = val;
      });
      return { ...prev, [eleveId]: row };
    });
  };`
);

// ── 3. Mettre à jour handleToggleValide pour utiliser isBloque ──
code = code.replace(
  `          PERIODES.forEach(i => {
            const key = 'p' + i;
            const isMatin = i <= 4;
            const isBloque = (horaire === 'matin' && !isMatin) || (horaire === 'apresmidi' && isMatin);
            if (!isBloque && !row[key]) row[key] = 'P';
          });`,
  `          PERIODES.forEach(i => {
            if (!isBloque(i) && !row['p' + i]) row['p' + i] = 'P';
          });`
);

// Supprimer la ligne `const horaire = classeInfo?.horaire || 'complet';` dans handleToggleValide
code = code.replace(
  `      const newVal = !valide;
    setValide(newVal);
    if (newVal) {
      // Remplir les vides avec P
      setPresences(prev => {
        const next = { ...prev };
        eleves.forEach(e => {
          const row = { ...next[e.id] };
          const horaire = classeInfo?.horaire || 'complet';`,
  `      const newVal = !valide;
    setValide(newVal);
    if (newVal) {
      // Remplir les vides avec P
      setPresences(prev => {
        const next = { ...prev };
        eleves.forEach(e => {
          const row = { ...next[e.id] };`
);

// ── 4. Ajouter alerte weekend + désactiver bouton valider sur weekend ──
code = code.replace(
  `      {/* Barre validation + sauvegarde */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>`,
  `      {/* Alerte weekend */}
          {isWeekend() && (
            <div style={{padding:'12px 20px',background:'#fef2f2',borderBottom:'1px solid #fecaca',color:'#dc2626',fontWeight:700,fontSize:13}}>
              🚫 Samedi et dimanche — aucune saisie possible
            </div>
          )}

          {/* Barre validation + sauvegarde */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc'}}>`,
);

// ── 5. Désactiver le bouton de validation sur weekend ──
code = code.replace(
  `              <button onClick={handleToggleValide} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',borderRadius:99,border:'2px solid '+(valide?'#10b981':'#e2e8f0'),background:valide?'#ecfdf5':'white',color:valide?'#059669':'#64748b',cursor:'pointer',fontWeight:700,fontSize:13,transition:'all 0.2s'}}>`,
  `              <button onClick={handleToggleValide} disabled={isWeekend()} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',borderRadius:99,border:'2px solid '+(valide?'#10b981':'#e2e8f0'),background:isWeekend()?'#f1f5f9':valide?'#ecfdf5':'white',color:isWeekend()?'#cbd5e1':valide?'#059669':'#64748b',cursor:isWeekend()?'not-allowed':'pointer',fontWeight:700,fontSize:13,transition:'all 0.2s'}}>`,
);

// ── 6. Ajouter en-tête colonne "Tout" dans le tableau ──
// Après <th style={s.th} rowSpan={2}>Prénom</th>
code = code.replace(
  `                    <th style={s.th} rowSpan={2}>NOM</th>
                    <th style={s.th} rowSpan={2}>Prénom</th>
                    <th style={{...s.th,background:'#dbeafe',color:'#1e40af'}} colSpan={4}>☀️ Matin</th>`,
  `                    <th style={s.th} rowSpan={2}>NOM</th>
                    <th style={s.th} rowSpan={2}>Prénom</th>
                    <th style={{...s.th,background:'#f0fdf4',color:'#166534',fontSize:10}} rowSpan={2} title="Appliquer à toutes les périodes">Tout</th>
                    <th style={{...s.th,background:'#dbeafe',color:'#1e40af'}} colSpan={4}>☀️ Matin</th>`,
);

// ── 7. Ajouter cellule "Tout" dans chaque ligne élève ──
code = code.replace(
  `                      <td style={{...s.td,fontWeight:800,color:'#0f172a'}}>{e.nom}</td>
                      <td style={{...s.td,color:'#374151'}}>{e.prenom}</td>
                      {PERIODES.map(i => {`,
  `                      <td style={{...s.td,fontWeight:800,color:'#0f172a'}}>{e.nom}</td>
                      <td style={{...s.td,color:'#374151'}}>{e.prenom}</td>
                      <td style={{...s.td,padding:'6px 4px',background:isWeekend()?'#f1f5f9':'#f0fdf4'}}>
                        {isWeekend() ? (
                          <div style={{width:44,height:28,borderRadius:6,background:'#e2e8f0',margin:'0 auto'}}></div>
                        ) : (
                          <select
                            value=""
                            onChange={ev => { if(ev.target.value) setToutEleve(e.id, ev.target.value); ev.target.value=''; }}
                            style={{width:50,padding:'4px 2px',borderRadius:6,border:'1px solid #86efac',background:'#f0fdf4',color:'#16a34a',fontWeight:800,fontSize:12,textAlign:'center',cursor:'pointer',outline:'none'}}
                          >
                            <option value="">—</option>
                            {OPTS.filter(o=>o!=='').map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        )}
                      </td>
                      {PERIODES.map(i => {`,
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Fix Presences appliqué !');
console.log('   ✔ HORAIRE_PAR_JOUR par jour de semaine');
console.log('   ✔ Colonne "Tout" pour appliquer en masse');
console.log('   ✔ Weekend bloqué + message d\'alerte');
console.log('   ✔ Bouton valider désactivé le weekend');
console.log('');
console.log('⚙️  Adapter HORAIRE_PAR_JOUR dans Presences.js si besoin !');
