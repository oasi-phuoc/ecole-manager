const fs = require('fs');
let c = fs.readFileSync('./src/pages/Calendrier.js', 'utf8');

// 1. Fix select prof2 - exclure prof1 et vice versa
c = c.replace(
  `                    <select style={s.inp} value={formRetenue.prof1_id} onChange={e => setFormRetenue({...formRetenue,prof1_id:e.target.value})}>
                      <option value="">-- Prof 1 --</option>
                      {profs.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
                    </select>
                    <select style={s.inp} value={formRetenue.prof2_id} onChange={e => setFormRetenue({...formRetenue,prof2_id:e.target.value})}>
                      <option value="">-- Prof 2 --</option>
                      {profs.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
                    </select>`,
  `                    <select style={s.inp} value={formRetenue.prof1_id} onChange={e => setFormRetenue({...formRetenue,prof1_id:e.target.value,prof2_id:e.target.value===formRetenue.prof2_id?'':formRetenue.prof2_id})}>
                      <option value="">-- Prof 1 --</option>
                      {profs.map(p => <option key={p.id} value={p.id} disabled={String(p.id)===String(formRetenue.prof2_id)}>{p.nom} {p.prenom}</option>)}
                    </select>
                    <select style={s.inp} value={formRetenue.prof2_id} onChange={e => setFormRetenue({...formRetenue,prof2_id:e.target.value})}>
                      <option value="">-- Prof 2 --</option>
                      {profs.map(p => <option key={p.id} value={p.id} disabled={String(p.id)===String(formRetenue.prof1_id)}>{p.nom} {p.prenom}</option>)}
                    </select>`
);

// 2. Fix sauverRetenue - stocker les noms dans description ET dans le titre affiché
c = c.replace(
  `  const sauverRetenue = async (e) => {
    e.preventDefault();
    try {
      const prof1 = profs.find(p => String(p.id)===String(formRetenue.prof1_id));
      const prof2 = profs.find(p => String(p.id)===String(formRetenue.prof2_id));
      const profsNoms = [prof1,prof2].filter(Boolean).map(p=>p.nom+' '+p.prenom).join(', ');
      const data = { titre: formRetenue.titre, description: profsNoms, date_debut: formRetenue.date_debut, date_fin: formRetenue.date_debut, heure_debut: formRetenue.heure_debut, heure_fin: formRetenue.heure_fin||null, categorie: 'retenue', couleur: '#dc2626', type: 'Autre' };`,
  `  const sauverRetenue = async (e) => {
    e.preventDefault();
    try {
      const prof1 = profs.find(p => String(p.id)===String(formRetenue.prof1_id));
      const prof2 = profs.find(p => String(p.id)===String(formRetenue.prof2_id));
      const profsNoms = [prof1,prof2].filter(Boolean).map(p=>p.nom+' '+p.prenom).join(' & ');
      const data = { titre: formRetenue.titre, description: profsNoms||null, date_debut: formRetenue.date_debut, date_fin: formRetenue.date_debut, heure_debut: formRetenue.heure_debut, heure_fin: formRetenue.heure_fin||null, categorie: 'retenue', couleur: '#dc2626', type: 'Autre' };`
);

// 3. Afficher les profs dans la liste retenues
c = c.replace(
  `                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.titre}</div>
                      <div style={{fontSize:10,color:'#94a3b8'}}>{formatDate(r.date_debut)}{r.heure_debut?' '+r.heure_debut.substring(0,5):''}</div>
                    </div>`,
  `                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.titre}</div>
                      <div style={{fontSize:10,color:'#94a3b8'}}>{formatDate(r.date_debut)}{r.heure_debut?' '+r.heure_debut.substring(0,5):''}</div>
                      {r.description && <div style={{fontSize:10,color:'#dc2626',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>👤 {r.description}</div>}
                    </div>`
);

// 4. Pré-remplir les profs lors de l'édition depuis description
c = c.replace(
  `onClick={() => { setRetenueEdit(r); setFormRetenue({titre:r.titre,prof1_id:'',prof2_id:'',date_debut:r.date_debut?.substring(0,10)||'',heure_debut:r.heure_debut?.substring(0,5)||'10:00',heure_fin:r.heure_fin?.substring(0,5)||'11:30'}); setShowFormRetenue(true); }}`,
  `onClick={() => { setRetenueEdit(r); setFormRetenue({titre:r.titre,prof1_id:'',prof2_id:'',date_debut:r.date_debut?.substring(0,10)||'',heure_debut:r.heure_debut?.substring(0,5)||'10:00',heure_fin:r.heure_fin?.substring(0,5)||'11:30'}); setShowFormRetenue(true); }}`
);

fs.writeFileSync('./src/pages/Calendrier.js', c);
console.log('OK !');