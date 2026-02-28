const fs = require('fs');

let e = fs.readFileSync('./src/pages/EmploiDuTemps.js', 'utf8');

// Fix branche planning profs - texte exact trouvé
e = e.replace(
  `aff.classe_nom}</b>{aff.matiere_nom&&<><br/><span style={{color:'#888'}}>{aff.matiere_nom}</span></>}</>:''}`,
  `aff.classe_nom}</b>
                                {isAdmin() ? (
                                  <select style={{...styles.cellSel,marginTop:3,fontSize:11}}
                                    value={aff.matiere_id||''}
                                    onChange={async ev => {
                                      await axios.post(API+'/planning/affectations',{prof_id:profPlanningId,classe_id:aff.classe_id,matiere_id:ev.target.value||null,creneau_id:cr.id},{headers});
                                      chargerPlanningProf(profPlanningId);
                                    }}>
                                    <option value="">— Branche —</option>
                                    {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                                  </select>
                                ) : aff.matiere_nom ? <div style={{color:'#666',fontSize:11}}>{aff.matiere_nom}</div> : null}
                              </> : ''}`
);

// Fix Professeurs - garder 1 seul filtreStatut
let p = fs.readFileSync('./src/pages/Professeurs.js', 'utf8');
let count = 0;
p = p.replace(/const \[filtreStatut, setFiltreStatut\] = useState\('tous'\);/g, () => {
  count++;
  return count === 1 ? "const [filtreStatut, setFiltreStatut] = useState('tous');" : '';
});
fs.writeFileSync('./src/pages/Professeurs.js', p);

// Fix planning général - titulaires
const idx = e.indexOf('planningGeneral.profs.map(p => <th');
if (idx > -1) {
  console.log('Planning général profs header:', e.substring(idx, idx+200));
} 

e = e.replace(
  `planningGeneral.profs.map(p => <th key={p.id} style={styles.th}>{p.nom}<br/><span style={{fontWeight:400,fontSize:11}}>{p.prenom}</span></th>)}`,
  `planningGeneral.profs.map(p => {
                      const tits = (planningGeneral.titulaires||[]).filter(t => t.prof_nom && t.prof_nom.includes(p.nom));
                      return <th key={p.id} style={styles.th}>
                        {p.nom} {p.prenom}
                        {tits.length>0 && <div style={{fontSize:10,fontWeight:400,color:'#c8e6c9',marginTop:2}}>{tits.map(t=>t.classe_nom).join(', ')}</div>}
                      </th>;
                    })}`
);

fs.writeFileSync('./src/pages/EmploiDuTemps.js', e);
console.log('Branche profs OK:', e.includes('profPlanningId,classe_id:aff.classe_id'));
console.log('Planning général titulaires OK:', e.includes('planningGeneral.titulaires'));
console.log('Professeurs filtreStatut:', (p.match(/filtreStatut/g)||[]).length);