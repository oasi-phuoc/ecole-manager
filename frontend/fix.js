const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Professeurs.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Ajouter lieu_travail_prefere et remarque_lieu dans le state form initial
code = code.replace(
  `{ nom:'',prenom:'',email:'',mot_de_passe:'',telephone:'',specialite:'',adresse:'',npa:'',lieu:'',sexe:'',taux_activite:'',periodes_semaine:'',date_naissance:'',avs:'',type_contrat:'',type_permis:'',niveau_prefere:'',branches_specialites:[] }`,
  `{ nom:'',prenom:'',email:'',mot_de_passe:'',telephone:'',specialite:'',adresse:'',npa:'',lieu:'',sexe:'',taux_activite:'',periodes_semaine:'',date_naissance:'',avs:'',type_contrat:'',type_permis:'',niveau_prefere:'',branches_specialites:[],lieu_travail_prefere:'',remarque_lieu_travail:'' }`
);

// 2. Ajouter dans resetForm
code = code.replace(
  `const resetForm = () => setForm({nom:'',prenom:'',email:'',mot_de_passe:'',telephone:'',specialite:'',adresse:'',npa:'',lieu:'',sexe:'',taux_activite:'',periodes_semaine:'',date_naissance:'',avs:'',type_contrat:'',type_permis:''});`,
  `const resetForm = () => setForm({nom:'',prenom:'',email:'',mot_de_passe:'',telephone:'',specialite:'',adresse:'',npa:'',lieu:'',sexe:'',taux_activite:'',periodes_semaine:'',date_naissance:'',avs:'',type_contrat:'',type_permis:'',niveau_prefere:'',branches_specialites:[],lieu_travail_prefere:'',remarque_lieu_travail:''});`
);

// 3. Ajouter dans handleEdit
code = code.replace(
  `setForm({nom:p.nom||'',prenom:p.prenom||'',email:p.email||'',mot_de_passe:'',telephone:p.telephone||'',specialite:p.specialite||'',adresse:p.adresse||'',npa:p.npa||'',lieu:p.lieu||'',sexe:p.sexe||'',taux_activite:p.taux_activite||'',periodes_semaine:p.periodes_semaine||'',date_naissance:p.date_naissance?p.date_naissance.substring(0,10):'',avs:p.avs||'',type_contrat:p.type_contrat||'',type_permis:p.type_permis||''});`,
  `setForm({nom:p.nom||'',prenom:p.prenom||'',email:p.email||'',mot_de_passe:'',telephone:p.telephone||'',specialite:p.specialite||'',adresse:p.adresse||'',npa:p.npa||'',lieu:p.lieu||'',sexe:p.sexe||'',taux_activite:p.taux_activite||'',periodes_semaine:p.periodes_semaine||'',date_naissance:p.date_naissance?p.date_naissance.substring(0,10):'',avs:p.avs||'',type_contrat:p.type_contrat||'',type_permis:p.type_permis||'',niveau_prefere:p.niveau_prefere||'',branches_specialites:p.branches_specialites||[],lieu_travail_prefere:p.lieu_travail_prefere||'',remarque_lieu_travail:p.remarque_lieu_travail||''});`
);

// 4. Ajouter le bloc JSX après le champ Remarques (specialite)
code = code.replace(
  `                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Remarques</label>
                      <input style={s.inp} value={form.specialite} onChange={e=>setForm({...form,specialite:e.target.value})} placeholder="Ex: Mathématiques, Physique..." />
                    </div>`,
  `                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Remarques</label>
                      <input style={s.inp} value={form.specialite} onChange={e=>setForm({...form,specialite:e.target.value})} placeholder="Ex: Mathématiques, Physique..." />
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Lieu(x) de travail préféré(s)</label>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        {['BOTZA','SYNECOM','CREUSET'].map(l => {
                          const lieux = form.lieu_travail_prefere ? form.lieu_travail_prefere.split(',').filter(Boolean) : [];
                          const selected = lieux.includes(l);
                          return (
                            <button key={l} type="button"
                              onClick={() => {
                                const curr = form.lieu_travail_prefere ? form.lieu_travail_prefere.split(',').filter(Boolean) : [];
                                const newLieux = selected ? curr.filter(x=>x!==l) : [...curr, l];
                                setForm({...form, lieu_travail_prefere: newLieux.join(',')});
                              }}
                              style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+(selected?'#0891b2':'#e2e8f0'),background:selected?'#cffafe':'white',color:selected?'#0e7490':'#64748b',cursor:'pointer',fontWeight:700,fontSize:13,transition:'all 0.15s'}}>
                              {l}
                            </button>
                          );
                        })}
                        <button type="button"
                          onClick={() => setForm({...form, lieu_travail_prefere:''})}
                          style={{padding:'8px 16px',borderRadius:8,border:'2px solid '+((!form.lieu_travail_prefere)?'#94a3b8':'#e2e8f0'),background:(!form.lieu_travail_prefere)?'#f1f5f9':'white',color:'#64748b',cursor:'pointer',fontWeight:700,fontSize:13,transition:'all 0.15s'}}>
                          Aucune préférence
                        </button>
                      </div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Remarques lieu de travail</label>
                      <input style={s.inp} value={form.remarque_lieu_travail} onChange={e=>setForm({...form,remarque_lieu_travail:e.target.value})} placeholder="Ex: Préfère éviter BOTZA le lundi..." />
                    </div>`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Frontend : lieu_travail_prefere + remarque_lieu_travail ajoutés');