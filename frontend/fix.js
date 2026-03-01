const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Presences.js');
let code = fs.readFileSync(filePath, 'utf8');

// ── Aperçu : aligner padding sur saisie (8px) ──

// Nom élève sticky
code = code.replace(
  `                        <td style={{padding:'5px 14px',fontWeight:700,fontSize:12,color:'#0f172a',borderBottom:'1px solid #f1f5f9',position:'sticky',left:0,background:ri%2===0?'white':'#fafafa',zIndex:1,whiteSpace:'nowrap'}}>`,
  `                        <td style={{padding:'8px 14px',fontWeight:700,fontSize:13,color:'#0f172a',borderBottom:'1px solid #f1f5f9',position:'sticky',left:0,background:ri%2===0?'white':'#fafafa',zIndex:1,whiteSpace:'nowrap'}}>`
);

// Cellules statut
code = code.replace(
  `                            <td key={j} style={{padding:'3px 2px',textAlign:'center',borderBottom:'1px solid #f1f5f9',
                              background:wkd?'#e2e8f0':vac?'#fef9c3':'transparent'}}>`,
  `                            <td key={j} style={{padding:'8px 2px',textAlign:'center',borderBottom:'1px solid #f1f5f9',
                              background:wkd?'#e2e8f0':vac?'#fef9c3':'transparent'}}>`
);

// En-tête Élève aperçu
code = code.replace(
  `                      <th style={{padding:'8px 14px',textAlign:'left',fontSize:12,fontWeight:800,color:'#475569',borderBottom:'2px solid #e2e8f0',position:'sticky',left:0,background:'#f8fafc',zIndex:2,minWidth:150,whiteSpace:'nowrap'}}>Élève</th>`,
  `                      <th style={{padding:'10px 14px',textAlign:'left',fontSize:12,fontWeight:800,color:'#475569',borderBottom:'2px solid #e2e8f0',position:'sticky',left:0,background:'#f8fafc',zIndex:2,minWidth:150,whiteSpace:'nowrap'}}>Élève</th>`
);

// ── Stats : s.td est déjà padding 8px, juste aligner fontSize ──
// Rien à changer, stats utilise déjà s.td

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Hauteur lignes uniformisée : saisie = aperçu = stats');