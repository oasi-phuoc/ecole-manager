const fs = require('fs');
let e = fs.readFileSync('./src/pages/EmploiDuTemps.js', 'utf8');

// Fix 1: Planning classes - combobox branche sans supprimer le prof
e = e.replace(
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
                                  ) : aCours ? <span style={{color:'#f57c00',fontSize:11}}>à affecter</span> : ''}`,
`{aff ? (
                                    <div>
                                      <b style={{color:'#2e7d32',fontSize:12}}>{aff.prof_nom}</b>
                                      {isAdmin() ? (
                                        <select style={{...styles.cellSel,marginTop:4,fontSize:11}}
                                          value={aff.matiere_id||''}
                                          onChange={async ev => {
                                            await axios.post(API+'/planning/affectations',{prof_id:aff.prof_id,classe_id:classePlanningId,matiere_id:ev.target.value||null,creneau_id:cr.id},{headers});
                                            chargerPlanningClasse(classePlanningId, classePlanningPoolId);
                                          }}>
                                          <option value="">— Branche —</option>
                                          {(branchesPoolP.length>0?branchesPoolP:matieres).map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                                        </select>
                                      ) : (
                                        aff.matiere_nom && <div style={{color:'#666',fontSize:11}}>{aff.matiere_nom}</div>
                                      )}
                                    </div>
                                  ) : aCours ? <span style={{color:'#f57c00',fontSize:11}}>à affecter</span> : ''}`
);

// Fix 2: Affectation branches - nouvelle table sans colonne prof, avec periodes attribuees et statut
e = e.replace(
`{/* Tableau branches × profs */}
              {classePlanningPoolId && branchesPoolP.length > 0 && (
                <div style={{...styles.card,marginBottom:16}}>
                  <h4 style={{margin:'0 0 12px',fontSize:14,fontWeight:700,color:'#555'}}>Affectation branches → professeurs</h4>
                  <table style={styles.tbl}>
                    <thead>
                      <tr style={styles.theadRow}>
                        <th style={styles.th}>Branche</th>
                        <th style={styles.th}>Périodes/sem.</th>
                        <th style={styles.th}>Professeur</th>
                        <th style={styles.th}>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchesPoolP.map(br => {
                        const pb = getPlanningBranche(classePlanningId, br.id);
                        const assigned = planningBranches.filter(x => x.matiere_id==br.id).length;
                        const max = br.periodes_semaine || 999;
                        const depasse = assigned > max;
                        return (
                          <tr key={br.id} style={{...styles.tr,background:depasse?'#fff8e1':''}}>
                            <td style={styles.td}><b>{br.nom}</b></td>
                            <td style={{...styles.td,textAlign:'center'}}>
                              <span style={{...styles.badge,background:'#f3e5f5',color:'#7b1fa2'}}>{br.periodes_semaine||'—'}</span>
                            </td>
                            <td style={{...styles.td,padding:6}}>
                              <select style={{...styles.cellSel,background:pb?'#e8f5e9':'#fff'}}
                                value={pb?pb.prof_id:''} disabled={!isAdmin()}
                                onChange={e => handleBrancheChange(classePlanningId, br.id, classePlanningPoolId, e.target.value)}>
                                <option value="">— Non affecté —</option>
                                {profsPoolP.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
                              </select>
                            </td>
                            <td style={styles.td}>
                              {depasse ? <span style={{color:'#e53935',fontSize:12,fontWeight:700}}>⚠️ Max atteint</span> :
                               pb ? <span style={{color:'#2e7d32',fontSize:12}}>✅ Affecté</span> :
                               <span style={{color:'#bbb',fontSize:12}}>En attente</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}`,
`{/* Tableau branches - periodes attribuées */}
              {classePlanningPoolId && branchesPoolP.length > 0 && (
                <div style={{...styles.card,marginBottom:16}}>
                  <h4 style={{margin:'0 0 12px',fontSize:14,fontWeight:700,color:'#555'}}>Branches — suivi des périodes</h4>
                  <table style={styles.tbl}>
                    <thead>
                      <tr style={styles.theadRow}>
                        <th style={styles.th}>Branche</th>
                        <th style={{...styles.th,textAlign:'center'}}>Périodes/sem.</th>
                        <th style={{...styles.th,textAlign:'center'}}>Attribuées</th>
                        <th style={{...styles.th,textAlign:'center'}}>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchesPoolP.map(br => {
                        const max = parseInt(br.periodes_semaine) || 0;
                        const attribuees = (planningClasse.affectations||[]).filter(a => a.matiere_id==br.id).length;
                        const complet = max > 0 && attribuees >= max;
                        const depasse = max > 0 && attribuees > max;
                        const manquant = max > 0 && attribuees < max;
                        return (
                          <tr key={br.id} style={{...styles.tr, background:depasse?'#fff8e1':complet?'#e8f5e9':''}}>
                            <td style={styles.td}><b>{br.nom}</b></td>
                            <td style={{...styles.td,textAlign:'center'}}>
                              <span style={{...styles.badge,background:'#f3e5f5',color:'#7b1fa2'}}>{max||'—'}</span>
                            </td>
                            <td style={{...styles.td,textAlign:'center'}}>
                              <span style={{...styles.badge,
                                background:depasse?'#fff3e0':complet?'#e8f5e9':'#e3f2fd',
                                color:depasse?'#e65100':complet?'#2e7d32':'#1565c0'}}>
                                {attribuees}
                              </span>
                            </td>
                            <td style={{...styles.td,textAlign:'center'}}>
                              {depasse && <span style={{color:'#e53935',fontSize:12,fontWeight:700}}>⚠️ Dépassé</span>}
                              {complet && !depasse && <span style={{color:'#2e7d32',fontSize:12,fontWeight:700}}>✅ Complet</span>}
                              {manquant && <span style={{color:'#e53935',fontSize:12,fontWeight:600}}>❌ Manquant ({max-attribuees})</span>}
                              {max===0 && <span style={{color:'#bbb',fontSize:12}}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}`
);

fs.writeFileSync('./src/pages/EmploiDuTemps.js', e);
console.log('OK !');