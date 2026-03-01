const fs = require('fs');
let c = fs.readFileSync('./src/pages/Calendrier.js', 'utf8');

// 1. Enlever affichage profs dans bloc retenues
c = c.replace(
  `                      {r.description && <div style={{fontSize:10,color:'#dc2626',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>👤 {r.description}</div>}`,
  ``
);

// 2. Afficher profs dans les cellules du calendrier (remplacer le rendu des events dans la grille)
c = c.replace(
  `                        {evts.slice(0,2).map((ev,i) => (
                          <div key={i} title={ev.titre} style={{fontSize:9,fontWeight:600,color:'white',background:ev.couleur||'#6366f1',borderRadius:3,padding:'1px 4px',marginBottom:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.titre}</div>
                        ))}`,
  `                        {evts.slice(0,2).map((ev,i) => (
                          <div key={i} title={ev.titre} style={{fontSize:9,fontWeight:600,color:'white',background:ev.couleur||'#6366f1',borderRadius:3,padding:'2px 4px',marginBottom:1}}>
                            <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.titre}</div>
                            {ev.categorie==='retenue' && ev.description && ev.description.split(' & ').map((prof,pi) => (
                              <div key={pi} style={{fontSize:8,fontWeight:500,opacity:0.9,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{prof}</div>
                            ))}
                          </div>
                        ))}`
);

fs.writeFileSync('./src/pages/Calendrier.js', c);
console.log('OK !');