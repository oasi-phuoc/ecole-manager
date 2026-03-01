const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'EmploiDuTemps.js');
let code = fs.readFileSync(filePath, 'utf8');

// ── 1. Remplacer toggleClasseHoraire pour cycle exclusif ──
code = code.replace(
  `  const toggleClasseHoraire = async (classe_id, jour, periode) => {
    if (!isAdmin()) return;
    const aHoraire = classeAHoraire(classe_id, jour, periode);
    const autrePeriode = periode==='Matin'?'Après-midi':'Matin';
    let nouveaux = classeHoraires.filter(h => !(h.classe_id==classe_id && h.jour===jour));
    if (!aHoraire) {
      nouveaux = [...nouveaux, {classe_id, jour, periode}];
    }
    setClasseHoraires(nouveaux);
    const horairesClasse = nouveaux.filter(h => h.classe_id==classe_id).map(h => ({jour:h.jour, periode:h.periode}));
    await axios.post(API + '/planning/classe-horaires/' + classe_id, { horaires: horairesClasse }, { headers });
    chargerTout();
  };`,
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
  };`
);

// ── 2. Remplacer le bloc AFFECTATION CLASSES ──
const ancien = `          {/* AFFECTATION CLASSES - matin/après-midi par jour */}
          {sousOngletAff === 'classes' && (
            <div style={{overflowX:'auto',marginTop:12}}>
              <table style={styles.tbl}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={{...styles.th,minWidth:130}}>Classe</th>
                    {JOURS.map(jour => (
                      <th key={jour} style={{...styles.th,textAlign:'center'}} colSpan={2}>{jour}</th>
                    ))}
                  </tr>
                  <tr style={{background:'#e8eaf6'}}>
                    <th style={styles.th}></th>
                    {JOURS.map(jour => (
                      ['Matin','Après-midi'].map(per => (
                        <th key={jour+per} style={{...styles.th,fontSize:11,textAlign:'center',color:'#555'}}>{per}</th>
                      ))
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classesPool.map(cl => (
                    <tr key={cl.id} style={styles.tr}>
                      <td style={{...styles.td,fontWeight:700}}>{cl.nom}</td>
                      {JOURS.map(jour => (
                        ['Matin','Après-midi'].map(per => {
                          const active = classeAHoraire(cl.id, jour, per);
                          return (
                            <td key={jour+per} style={{...styles.td,textAlign:'center',cursor:isAdmin()?'pointer':'default',
                              background:active?'#e8f5e9':'#fff'}}
                              onClick={() => toggleClasseHoraire(cl.id, jour, per)}>
                              <span style={{fontSize:18}}>{active?'✅':'⬜'}</span>
                            </td>
                          );
                        })
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}`;

const nouveau = `          {/* AFFECTATION CLASSES - toggle cycle exclusif par jour */}
          {sousOngletAff === 'classes' && (
            <div style={{marginTop:12}}>
              <div style={{fontSize:12,color:'#94a3b8',marginBottom:12}}>Cliquer pour cycler : <b style={{color:'#475569'}}>Inactif → ☀️ Matin → 🌙 Après-midi → Inactif</b></div>
              <div style={{overflowX:'auto'}}>
                <table style={styles.tbl}>
                  <thead>
                    <tr style={styles.theadRow}>
                      <th style={{...styles.th,minWidth:140}}>Classe</th>
                      {JOURS.map(j => <th key={j} style={{...styles.th,textAlign:'center'}}>{j}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {classesPool.map((cl,ri) => (
                      <tr key={cl.id} style={{background:ri%2===0?'white':'#fafbfc'}}>
                        <td style={{...styles.td,fontWeight:800,fontSize:14,color:'#0f172a',borderLeft:'3px solid #1a73e8'}}>
                          {cl.nom}
                        </td>
                        {JOURS.map(jour => {
                          const periode = getHoraireJourClasse(cl.id, jour);
                          return (
                            <td key={jour} style={{padding:'10px 8px',textAlign:'center',borderBottom:'1px solid #f1f5f9'}}>
                              <button onClick={() => toggleClasseHoraire(cl.id, jour)} disabled={!isAdmin()} style={{
                                padding:'6px 16px', borderRadius:20, fontWeight:700, fontSize:12,
                                cursor:isAdmin()?'pointer':'default', minWidth:100, transition:'all 0.15s',
                                border: periode==='Matin' ? '2px solid #3b82f6' : periode==='Après-midi' ? '2px solid #f59e0b' : '2px solid #e2e8f0',
                                background: periode==='Matin' ? '#dbeafe' : periode==='Après-midi' ? '#fef3c7' : '#f8fafc',
                                color: periode==='Matin' ? '#1d4ed8' : periode==='Après-midi' ? '#92400e' : '#cbd5e1',
                              }}>
                                {periode==='Matin' ? '☀️ Matin' : periode==='Après-midi' ? '🌙 Après-midi' : '—'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}`;

code = code.replace(ancien, nouveau);
fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Affectation classes : toggle exclusif appliqué !');
console.log('   Cycle par jour : Inactif → ☀️ Matin → 🌙 Après-midi → Inactif');