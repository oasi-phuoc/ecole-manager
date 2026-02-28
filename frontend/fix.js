const fs = require('fs');
let c = fs.readFileSync('./src/pages/Classes.js', 'utf8');

// Ajouter état plan de classe
c = c.replace(
  `  const [showTrombinoscope, setShowTrombinoscope] = useState(false);`,
  `  const [showTrombinoscope, setShowTrombinoscope] = useState(false);
  const [showPlanClasse, setShowPlanClasse] = useState(false);
  const [planPositions, setPlanPositions] = useState({});
  const [dragEleve, setDragEleve] = useState(null);`
);

// Ajouter fonctions plan de classe
c = c.replace(
  `  const imprimerTrombinoscope = () => {`,
  `  const chargerPlanClasse = async () => {
    try {
      const r = await axios.get(API+'/plan-classe/'+detailClasse.id, {headers});
      setPlanPositions(r.data.positions || {});
    } catch(err) { setPlanPositions({}); }
  };

  const sauverPlanClasse = async () => {
    try {
      await axios.post(API+'/plan-classe/'+detailClasse.id, {positions: planPositions}, {headers});
      alert('Plan sauvegardé !');
    } catch(err) { alert('Erreur sauvegarde'); }
  };

  const imprimerPlanClasse = () => {
    const COLS = 12; const ROWS = 13;
    let cells = '';
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const key = row+'-'+col;
        const eleveId = planPositions[key];
        const el = eleveId === 'PROF' ? null : elevesClasse.find(e => String(e.id) === String(eleveId));
        const isProf = row === ROWS-1;
        if (isProf && col === 0) {
          cells += \`<td colspan="12" style="background:#0f172a;color:white;text-align:center;font-weight:800;font-size:14px;padding:12px;border-radius:6px">🎓 Bureau du professeur — \${detailClasse.prof_prenom||''} \${detailClasse.prof_nom||''}</td>\`;
          break;
        } else if (!isProf) {
          cells += \`<td style="border:1px solid #e2e8f0;padding:6px;text-align:center;width:80px;height:80px;background:\${eleveId?'#f0f4ff':'#f8fafc'};vertical-align:middle">
            \${el ? \`
              \${el.photo?\`<img src="\${el.photo}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid #6366f1;margin:0 auto;display:block"/>\`:\`<div style="width:44px;height:44px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#6366f1;margin:0 auto">\${(el.prenom||'?')[0]}</div>\`}
              <div style="font-size:10px;font-weight:700;color:#1e293b;margin-top:3px;line-height:1.2">\${el.prenom}</div>
              <div style="font-size:9px;color:#475569">\${el.nom}</div>
            \` : ''}
          </td>\`;
        }
      }
      cells += '</tr><tr>';
    }

    const win = window.open('', '_blank');
    win.document.write(\`<!DOCTYPE html><html><head>
      <title>Plan de classe - \${detailClasse.nom}</title>
      <style>
        body{font-family:'Century Gothic',sans-serif;padding:24px;background:#f8fafc}
        h1{font-size:20px;font-weight:800;margin-bottom:4px}
        .sub{font-size:12px;color:#64748b;margin-bottom:20px}
        table{border-collapse:collapse;width:100%;background:white;border-radius:8px}
        .no-print{margin-bottom:16px}
        @media print{.no-print{display:none}body{padding:12px}@page{margin:1cm}}
      </style></head><body>
      <div class="no-print">
        <button onclick="window.print()" style="padding:10px 20px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit">🖨️ Imprimer</button>
      </div>
      <h1>🏫 Plan de classe — \${detailClasse.nom}</h1>
      <div class="sub">\${detailClasse.annee_scolaire||''} · Titulaire : \${detailClasse.prof_prenom||''} \${detailClasse.prof_nom||''}</div>
      <table><tbody><tr>\${cells}</tr></tbody></table>
    </body></html>\`);
    win.document.close();
  };

  const ouvrirPlanClasse = async () => {
    await chargerPlanClasse();
    setShowPlanClasse(true);
  };

  const dropOnCell = (row, col) => {
    if (dragEleve === null) return;
    const key = row+'-'+col;
    // Retirer élève de son ancienne position
    const newPos = {...planPositions};
    Object.keys(newPos).forEach(k => { if (String(newPos[k]) === String(dragEleve)) delete newPos[k]; });
    if (dragEleve !== 'VIDE') newPos[key] = dragEleve;
    setPlanPositions(newPos);
    setDragEleve(null);
  };

  const imprimerTrombinoscope = () => {`
);

// Ajouter bouton Plan de classe à côté de Trombinoscope
c = c.replace(
  `<button style={{...s.btnAdd,background:'#6366f1',display:'flex',alignItems:'center',gap:6}} onClick={imprimerTrombinoscope}>
          📸 Trombinoscope
        </button>`,
  `<div style={{display:'flex',gap:8}}>
          <button style={{...s.btnAdd,background:'#6366f1',display:'flex',alignItems:'center',gap:6}} onClick={imprimerTrombinoscope}>
            📸 Trombinoscope
          </button>
          <button style={{...s.btnAdd,background:'#0f172a',display:'flex',alignItems:'center',gap:6}} onClick={ouvrirPlanClasse}>
            🪑 Plan de classe
          </button>
        </div>`
);

// Ajouter le composant Plan de classe avant le return de détail classe
c = c.replace(
  `  // Vue détail classe - liste élèves
  if (detailClasse) return (`,
  `  // Vue PLAN DE CLASSE
  if (showPlanClasse && detailClasse) {
    const COLS = 12; const ROWS = 13;
    const elevesNonPlaces = elevesClasse.filter(el => !Object.values(planPositions).includes(String(el.id)));

    return (
      <div style={{...s.page, padding:'20px 24px'}}>
        <div style={s.header}>
          <button style={s.btnBack} onClick={() => setShowPlanClasse(false)}>← Retour liste</button>
          <h2 style={{...s.title, fontSize:18}}>🪑 Plan de classe — {detailClasse.nom}</h2>
          <div style={{display:'flex',gap:8}}>
            <button style={{...s.btnAdd,background:'#10b981'}} onClick={sauverPlanClasse}>💾 Sauvegarder</button>
            <button style={{...s.btnAdd,background:'#6366f1'}} onClick={imprimerPlanClasse}>🖨️ Imprimer PDF</button>
            <button style={{...s.btnAdd,background:'#ef4444'}} onClick={() => setPlanPositions({})}>🗑️ Réinitialiser</button>
          </div>
        </div>

        <div style={{display:'flex',gap:20,alignItems:'flex-start'}}>
          {/* Grille plan */}
          <div style={{flex:1,overflowX:'auto'}}>
            <div style={{fontSize:11,color:'#94a3b8',marginBottom:8,fontWeight:600}}>↑ Tableau / Entrée</div>
            <table style={{borderCollapse:'collapse',width:'100%',minWidth:700}}>
              <tbody>
                {Array.from({length:ROWS}).map((_,row) => (
                  <tr key={row}>
                    {row === ROWS-1 ? (
                      <td colSpan={COLS}
                        style={{background:'#0f172a',color:'white',textAlign:'center',fontWeight:800,fontSize:13,padding:'10px',borderRadius:6,cursor:'default'}}>
                        🎓 Bureau du professeur — {detailClasse.prof_prenom||''} {detailClasse.prof_nom||''}
                      </td>
                    ) : Array.from({length:COLS}).map((_,col) => {
                      const key = row+'-'+col;
                      const eleveId = planPositions[key];
                      const el = eleveId ? elevesClasse.find(e => String(e.id)===String(eleveId)) : null;
                      return (
                        <td key={col}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => dropOnCell(row, col)}
                          style={{border:'1.5px solid #e2e8f0',width:70,height:72,textAlign:'center',verticalAlign:'middle',background:el?'#e0e7ff':'white',borderRadius:4,cursor:'default',transition:'background 0.1s',position:'relative'}}>
                          {el ? (
                            <div draggable onDragStart={() => setDragEleve(String(el.id))}
                              style={{cursor:'grab',padding:2}}>
                              {el.photo
                                ? <img src={el.photo} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',border:'2px solid #6366f1',display:'block',margin:'0 auto'}} />
                                : <div style={{width:36,height:36,borderRadius:'50%',background:'#6366f1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:'white',margin:'0 auto'}}>{(el.prenom||'?')[0]}</div>
                              }
                              <div style={{fontSize:9,fontWeight:700,color:'#1e293b',marginTop:2,lineHeight:1.1}}>{el.prenom}</div>
                              <div style={{fontSize:8,color:'#475569'}}>{el.nom}</div>
                              <button onClick={() => {
                                const np = {...planPositions}; delete np[key]; setPlanPositions(np);
                              }} style={{position:'absolute',top:1,right:2,background:'none',border:'none',fontSize:10,cursor:'pointer',color:'#94a3b8',lineHeight:1}}>✕</button>
                            </div>
                          ) : (
                            <div style={{color:'#e2e8f0',fontSize:10}}>·</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Panneau élèves */}
          <div style={{width:160,flexShrink:0}}>
            <div style={{fontSize:11,fontWeight:700,color:'#475569',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.05em'}}>
              Élèves non placés ({elevesNonPlaces.length})
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:'70vh',overflowY:'auto'}}>
              {elevesNonPlaces.map(el => (
                <div key={el.id} draggable onDragStart={() => setDragEleve(String(el.id))}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'white',borderRadius:10,border:'1.5px solid #e2e8f0',cursor:'grab',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                  {el.photo
                    ? <img src={el.photo} style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',flexShrink:0}} />
                    : <div style={{width:32,height:32,borderRadius:'50%',background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#6366f1',flexShrink:0}}>{(el.prenom||'?')[0]}</div>
                  }
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'#1e293b'}}>{el.prenom}</div>
                    <div style={{fontSize:10,color:'#64748b'}}>{el.nom}</div>
                  </div>
                </div>
              ))}
              {elevesNonPlaces.length===0 && <div style={{fontSize:11,color:'#94a3b8',textAlign:'center',padding:16}}>Tous placés ✅</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vue détail classe - liste élèves
  if (detailClasse) return (`
);

fs.writeFileSync('./src/pages/Classes.js', c);
console.log('Plan de classe OK !');