const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Professeurs.js');
let code = fs.readFileSync(filePath, 'utf8');

// Supprimer le bloc dupliqué (le deuxième)
code = code.replace(
  `                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Remarques lieu de travail</label>
                      <input style={s.inp} value={form.remarque_lieu_travail} onChange={e=>setForm({...form,remarque_lieu_travail:e.target.value})} placeholder="Ex: Préfère éviter BOTZA le lundi..." />
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
                    </div>`,
  `                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Remarques lieu de travail</label>
                      <input style={s.inp} value={form.remarque_lieu_travail} onChange={e=>setForm({...form,remarque_lieu_travail:e.target.value})} placeholder="Ex: Préfère éviter BOTZA le lundi..." />
                    </div>`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Doublon supprimé');