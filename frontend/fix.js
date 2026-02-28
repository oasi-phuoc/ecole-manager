const fs = require('fs');
let b = fs.readFileSync('./src/pages/Branches.js', 'utf8');

// 1. Ajouter type_branche dans form initial
b = b.replace(
  `const [form, setForm] = useState({ nom:'', niveau:'', periodes_semaine:'', coefficient:'1' });`,
  `const [form, setForm] = useState({ nom:'', niveau:'', periodes_semaine:'', coefficient:'1', type_branche:'principale' });`
);

// 2. Ajouter type_branche dans handleEdit
b = b.replace(
  `setForm({nom:b.nom||'',niveau:b.niveau||'',periodes_semaine:b.periodes_semaine||'',coefficient:b.coefficient||'1'});`,
  `setForm({nom:b.nom||'',niveau:b.niveau||'',periodes_semaine:b.periodes_semaine||'',coefficient:b.coefficient||'1',type_branche:b.type_branche||'principale'});`
);

// 3. Reset form
b = b.replace(
  `setForm({nom:'',niveau:'',periodes_semaine:'',coefficient:'1'});`,
  `setForm({nom:'',niveau:'',periodes_semaine:'',coefficient:'1',type_branche:'principale'});`
);

// 4. Ajouter bouton bascule dans le formulaire après le coefficient
b = b.replace(
  `              </div>
              <div style={s.formActions}>
                <button type="button" style={s.btnCancel} onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" style={s.btnSave}>Sauvegarder</button>
              </div>`,
  `              </div>
              <div style={{marginTop:14}}>
                <label style={s.lbl}>Type de branche *</label>
                <div style={{display:'flex',gap:10,marginTop:6}}>
                  {['principale','secondaire'].map(t => (
                    <button key={t} type="button"
                      onClick={() => setForm({...form,type_branche:t})}
                      style={{flex:1,padding:'10px',borderRadius:8,border:'2px solid '+(form.type_branche===t?'#8b5cf6':'#e2e8f0'),background:form.type_branche===t?'#ede9fe':'#f8fafc',color:form.type_branche===t?'#5b21b6':'#64748b',cursor:'pointer',fontWeight:700,fontSize:13,textTransform:'capitalize',transition:'all 0.15s'}}>
                      {t==='principale'?'⭐ Principale':'📎 Secondaire'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={s.formActions}>
                <button type="button" style={s.btnCancel} onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" style={s.btnSave}>Sauvegarder</button>
              </div>`
);

// 5. Enlever p/sem du tableau
b = b.replace(
  `<span style={{background:'#f0fdf4',color:'#166534',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700}}>
                      {b.periodes_semaine||'—'} p/sem
                    </span>`,
  `<span style={{background:'#f0fdf4',color:'#166534',padding:'3px 10px',borderRadius:99,fontSize:12,fontWeight:700}}>
                      {b.periodes_semaine||'—'}
                    </span>`
);

// 6. Enlever Coef. du tableau
b = b.replace(
  `<span style={{background:'#f8fafc',color:'#475569',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600}}>
                      Coef. {b.coefficient||1}
                    </span>`,
  `<span style={{background:'#f8fafc',color:'#475569',padding:'3px 10px',borderRadius:99,fontSize:12,fontWeight:600}}>
                      {b.coefficient||1}
                    </span>`
);

// 7. Ajouter colonne Type dans le tableau
b = b.replace(
  `{['Branche','Niveau','Périodes/sem.','Coefficient','Actions'].map(h => (`,
  `{['Branche','Niveau','Type','Périodes/sem.','Coefficient','Actions'].map(h => (`
);

b = b.replace(
  `                  <td style={s.td}>
                    {b.niveau`,
  `                  <td style={s.td}>
                    <span style={{background:b.type_branche==='principale'?'#fef3c7':'#f1f5f9',color:b.type_branche==='principale'?'#92400e':'#475569',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600}}>
                      {b.type_branche==='principale'?'⭐ Principale':'📎 Secondaire'}
                    </span>
                  </td>
                  <td style={s.td}>
                    {b.niveau`
);

fs.writeFileSync('./src/pages/Branches.js', b);
console.log('Branches OK !');