const fs = require('fs');
let c = fs.readFileSync('./src/pages/Calendrier.js', 'utf8');

// 1. Ajouter états séances
c = c.replace(
  `  const [formVacance, setFormVacance] = useState({ nom_vacance:'', date_debut:'', date_fin:'' });`,
  `  const [formVacance, setFormVacance] = useState({ nom_vacance:'', date_debut:'', date_fin:'' });
  const [showFormSeance, setShowFormSeance] = useState(false);
  const [seanceEdit, setSeanceEdit] = useState(null);
  const [formSeance, setFormSeance] = useState({ titre:'', date_debut:'', heure_debut:'', heure_fin:'' });`
);

// 2. Ajouter filtre séances
c = c.replace(
  `  const vacances = evenements.filter(e => e.categorie === 'vacance');`,
  `  const vacances = evenements.filter(e => e.categorie === 'vacance');
  const seances = evenements.filter(e => e.categorie === 'seance');`
);

// 3. Ajouter fonction sauverSeance
c = c.replace(
  `  const supprimerEvenement = async (id) => {`,
  `  const sauverSeance = async (e) => {
    e.preventDefault();
    try {
      const data = {
        titre: formSeance.titre,
        date_debut: formSeance.date_debut,
        date_fin: formSeance.date_debut,
        heure_debut: formSeance.heure_debut,
        heure_fin: formSeance.heure_fin || null,
        categorie: 'seance',
        couleur: '#0369a1',
        type: 'Reunion'
      };
      if (seanceEdit) await axios.put(API+'/calendrier/'+seanceEdit.id, data, {headers});
      else await axios.post(API+'/calendrier', data, {headers});
      setShowFormSeance(false); setSeanceEdit(null);
      setFormSeance({titre:'',date_debut:'',heure_debut:'',heure_fin:''});
      chargerEvenements();
    } catch(err) { alert('Erreur: '+err.message); }
  };

  const supprimerEvenement = async (id) => {`
);

// 4. Ajouter modal séance après modal vacance
c = c.replace(
  `      {/* Header */}`,
  `      {/* Modal séance */}
      {showFormSeance && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'white',padding:28,borderRadius:14,width:420,boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:800}}>{seanceEdit?'Modifier':'Ajouter'} une séance</h3>
              <button style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#94a3b8'}} onClick={() => setShowFormSeance(false)}>✕</button>
            </div>
            <form onSubmit={sauverSeance}>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div>
                  <label style={s.lbl}>Désignation *</label>
                  <input style={s.inp} required value={formSeance.titre} onChange={e => setFormSeance({...formSeance,titre:e.target.value})} placeholder="Ex: Séance de direction..." />
                </div>
                <div>
                  <label style={s.lbl}>Date *</label>
                  <input style={s.inp} type="date" required value={formSeance.date_debut} onChange={e => setFormSeance({...formSeance,date_debut:e.target.value})} />
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div>
                    <label style={s.lbl}>Heure de début *</label>
                    <input style={s.inp} type="time" required value={formSeance.heure_debut} onChange={e => setFormSeance({...formSeance,heure_debut:e.target.value})} />
                  </div>
                  <div>
                    <label style={s.lbl}>Heure de fin</label>
                    <input style={s.inp} type="time" value={formSeance.heure_fin} onChange={e => setFormSeance({...formSeance,heure_fin:e.target.value})} />
                  </div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20}}>
                <button type="button" style={s.btnCancel} onClick={() => setShowFormSeance(false)}>Annuler</button>
                <button type="submit" style={{...s.btnSave,background:'#0369a1'}}>Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}`
);

// 5. Remplacer le bloc séances statique par le vrai tableau
c = c.replace(
  `          {/* SÉANCES sous le calendrier */}
          <div style={{background:'white',borderRadius:14,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',border:'1px solid #f1f5f9',overflow:'hidden',marginTop:16}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',background:'#f0f9ff'}}>
              <div style={{fontSize:13,fontWeight:800,color:'#0369a1'}}>🤝 Séances & Réunions</div>
              <div style={{fontSize:11,color:'#0284c7'}}>À configurer prochainement</div>
            </div>
            <div style={{padding:20,textAlign:'center',color:'#94a3b8',fontSize:12}}>Aucune séance planifiée</div>
          </div>`,
  `          {/* SÉANCES sous le calendrier */}
          <div style={{background:'white',borderRadius:14,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',border:'1px solid #f1f5f9',overflow:'hidden',marginTop:16}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid #f1f5f9',background:'#f0f9ff'}}>
              <div style={{fontSize:13,fontWeight:800,color:'#0369a1'}}>🤝 Séances & Réunions</div>
              {isAdmin() && <button style={{...s.btnSave,background:'#0369a1',padding:'5px 12px',fontSize:11}} onClick={() => { setSeanceEdit(null); setFormSeance({titre:'',date_debut:'',heure_debut:'',heure_fin:''}); setShowFormSeance(true); }}>+ Ajouter</button>}
            </div>
            <div style={{maxHeight:200,overflowY:'auto'}}>
              {seances.length === 0 ? (
                <div style={{padding:20,textAlign:'center',color:'#94a3b8',fontSize:12}}>Aucune séance planifiée</div>
              ) : seances.map(s2 => (
                <div key={s2.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderBottom:'1px solid #f8fafc'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:'#0369a1',flexShrink:0}}></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{s2.titre}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>
                      {formatDate(s2.date_debut)}
                      {s2.heure_debut ? ' · '+s2.heure_debut.substring(0,5) : ''}
                      {s2.heure_fin ? ' → '+s2.heure_fin.substring(0,5) : ''}
                    </div>
                  </div>
                  {isAdmin() && (
                    <div style={{display:'flex',gap:4}}>
                      <button style={s.btnIcon} onClick={() => { setSeanceEdit(s2); setFormSeance({titre:s2.titre,date_debut:s2.date_debut?.substring(0,10)||'',heure_debut:s2.heure_debut?.substring(0,5)||'',heure_fin:s2.heure_fin?.substring(0,5)||''}); setShowFormSeance(true); }}>✏️</button>
                      <button style={s.btnIcon} onClick={() => supprimerEvenement(s2.id)}>🗑️</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>`
);

fs.writeFileSync('./src/pages/Calendrier.js', c);
console.log('OK !');