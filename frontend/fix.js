const fs = require('fs');

// Fix 1: Branches.js - champ periodes_semaine en nombre + fix recherche
let b = fs.readFileSync('./src/pages/Branches.js', 'utf8');
b = b.replace(
  `placeholder="Ex: MATH, FR..."`,
  `placeholder="Ex: 4" type="number" min="1" max="40"`
);
b = b.replace(
  `(b.periodes_semaine && b.periodes_semaine.toLowerCase().includes(recherche.toLowerCase()))`,
  `(b.periodes_semaine && String(b.periodes_semaine).includes(recherche))`
);
fs.writeFileSync('./src/pages/Branches.js', b);
console.log('Branches.js OK');

// Fix 2 & 3: EmploiDuTemps - affectations et planning classes
let e = fs.readFileSync('./src/pages/EmploiDuTemps.js', 'utf8');

// Fix affectation profs: afficher P1,P2 sans horaires
e = e.replace(
  /P\{idx\+1\} — \{cr\.heure_debut\}–\{cr\.heure_fin\}/g,
  'Période {idx+1}'
);

// Fix conflit affectation - utiliser classe_id pas prof_id comme clé de conflict
// Le problème est dans handleCellChange - on cherche par prof_id mais le UNIQUE est sur classe_id+creneau_id
// Remplacer la logique d'affectation profs pour éviter les conflits
e = e.replace(
`onChange={e => {
                                        const classe_id = e.target.value;
                                        if (!classe_id) { const a=affectations.find(x=>x.prof_id==prof.id&&x.creneau_id==cr.id); if(a) axios.delete(API+'/planning/affectations/'+a.id,{headers}).then(chargerTout); }
                                        else axios.post(API+'/planning/affectations',{prof_id:prof.id,classe_id,creneau_id:cr.id},{headers}).then(chargerTout);
                                      }}`,
`onChange={async e => {
                                        const classe_id = e.target.value;
                                        if (!classe_id) {
                                          const a = affectations.find(x => x.prof_id==prof.id && x.creneau_id==cr.id);
                                          if (a) { await axios.delete(API+'/planning/affectations/'+a.id, {headers}); chargerTout(); }
                                        } else {
                                          // Vérifier si cette classe est déjà prise ce créneau par un autre prof
                                          const conflit = affectations.find(x => x.classe_id==classe_id && x.creneau_id==cr.id && x.prof_id!=prof.id);
                                          if (conflit) { alert('⚠️ ' + classe_id + ' est déjà affectée à un autre prof ce créneau !'); return; }
                                          // Supprimer ancienne affectation de CE prof pour CE créneau
                                          const ancienne = affectations.find(x => x.prof_id==prof.id && x.creneau_id==cr.id);
                                          if (ancienne) await axios.delete(API+'/planning/affectations/'+ancienne.id, {headers});
                                          await axios.post(API+'/planning/affectations', {prof_id:prof.id, classe_id, creneau_id:cr.id}, {headers});
                                          chargerTout();
                                        }
                                      }}`
);

// Fix 3: Planning classes - ajouter combobox branches dans les cellules
e = e.replace(
`{aff?<><b style={{color:'#2e7d32'}}>{aff.prof_nom}</b>{aff.matiere_nom&&<><br/><span style={{color:'#666',fontSize:11}}>{aff.matiere_nom}</span></>}</>:
                                   aCours?<span style={{color:'#f57c00',fontSize:11}}>à affecter</span>:''}`,
`{aff ? (
                                    <div>
                                      <b style={{color:'#2e7d32',fontSize:12}}>{aff.prof_nom}</b>
                                      {isAdmin() && (
                                        <select style={{...styles.cellSel,marginTop:4,fontSize:11}}
                                          value={aff.matiere_id||''}
                                          onChange={async ev => {
                                            await axios.post(API+'/planning/affectations',{prof_id:aff.prof_id,classe_id:classePlanningId,matiere_id:ev.target.value||null,creneau_id:cr.id},{headers});
                                            chargerPlanningClasse(classePlanningId, classePlanningPoolId);
                                          }}>
                                          <option value="">— Branche —</option>
                                          {(branchesPoolP.length>0?branchesPoolP:matieres).map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                                        </select>
                                      )}
                                      {!isAdmin() && aff.matiere_nom && <div style={{color:'#666',fontSize:11}}>{aff.matiere_nom}</div>}
                                    </div>
                                  ) : aCours ? <span style={{color:'#f57c00',fontSize:11}}>à affecter</span> : ''}`
);

fs.writeFileSync('./src/pages/EmploiDuTemps.js', e);
console.log('EmploiDuTemps.js OK');