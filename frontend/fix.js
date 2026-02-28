const fs = require('fs');
let c = fs.readFileSync('./src/pages/Classes.js', 'utf8');

// 1. Fix nom/prénom élève - utiliser utilisateur si nom null
// Chercher la cellule nom
c = c.replace(
  `<td style={{...s.td,fontWeight:700}}>{el.nom || el.nom_parent || '—'}</td>
                <td style={s.td}>{el.prenom||'—'}</td>
                <td style={s.td}>{el.personne_contact || el.telephone_parent || '—'}</td>`,
  `<td style={{...s.td,fontWeight:700}}>{el.nom || '—'}</td>
                <td style={s.td}>{el.prenom || '—'}</td>
                <td style={s.td}>{el.nom_parent || el.personne_contact || '—'}</td>`
);

// 2. Photo cliquable - voir en grand
c = c.replace(
  `{el.photo ? (
                      <img src={el.photo} alt="photo" style={{width:38,height:38,borderRadius:'50%',objectFit:'cover',border:'2px solid #e2e8f0'}} />
                    ) : (`,
  `{el.photo ? (
                      <img src={el.photo} alt="photo" onClick={() => setPhotoZoom(el.photo)} style={{width:38,height:38,borderRadius:'50%',objectFit:'cover',border:'2px solid #e2e8f0',cursor:'pointer'}} />
                    ) : (`
);

// 3. Ajouter état photoZoom
c = c.replace(
  `const [showObsForm, setShowObsForm] = useState(false);`,
  `const [showObsForm, setShowObsForm] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(null);
  const [obsEditId, setObsEditId] = useState(null);
  const [obsEditForm, setObsEditForm] = useState({titre:'',contenu:''});`
);

// 4. Ajouter modal photo zoom + modifier/supprimer observations
// Ajouter avant le return principal
c = c.replace(
  `  // Vue détail élève`,
  `  // Modal zoom photo
  const ModalZoom = () => photoZoom ? (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}} onClick={() => setPhotoZoom(null)}>
      <div style={{position:'relative'}} onClick={e => e.stopPropagation()}>
        <img src={photoZoom} alt="photo" style={{maxWidth:'80vw',maxHeight:'80vh',borderRadius:12,boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}} />
        <div style={{display:'flex',gap:10,justifyContent:'center',marginTop:12}}>
          <a href={photoZoom} download="photo.jpg" style={{padding:'8px 20px',background:'#6366f1',color:'white',borderRadius:8,textDecoration:'none',fontSize:13,fontWeight:600}}>⬇ Télécharger</a>
          <button onClick={() => setPhotoZoom(null)} style={{padding:'8px 20px',background:'#ef4444',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600}}>✕ Fermer</button>
        </div>
      </div>
    </div>
  ) : null;

  // Vue détail élève`
);

// 5. Ajouter <ModalZoom /> dans les renders
c = c.replace(
  `    <div style={s.page}>
      <div style={s.header}>
        <button style={s.btnBack} onClick={() => setEleveDetail(null)}>← Retour classe</button>`,
  `    <div style={s.page}>
      <ModalZoom />
      <div style={s.header}>
        <button style={s.btnBack} onClick={() => setEleveDetail(null)}>← Retour classe</button>`
);

c = c.replace(
  `    <div style={s.page}>
      <div style={s.header}>
        <button style={s.btnBack} onClick={() => setDetailClasse(null)}>← Retour classes</button>`,
  `    <div style={s.page}>
      <ModalZoom />
      <div style={s.header}>
        <button style={s.btnBack} onClick={() => setDetailClasse(null)}>← Retour classes</button>`
);

// 6. Modifier/Supprimer observations
c = c.replace(
  `          {observations.length===0 ? (
            <div style={{textAlign:'center',color:'#94a3b8',padding:30,fontSize:13}}>Aucune observation enregistrée</div>
          ) : observations.map(obs => (
            <div key={obs.id} style={{background:'#f8fafc',borderRadius:10,padding:16,border:'1px solid #e2e8f0',borderLeft:'3px solid #6366f1'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <b style={{fontSize:14,color:'#1e293b'}}>{obs.titre}</b>
                <span style={{fontSize:11,color:'#94a3b8'}}>{new Date(obs.created_at).toLocaleDateString('fr-CH')}</span>
              </div>
              <div style={{fontSize:13,color:'#475569',lineHeight:1.6}}>{obs.contenu}</div>
              <div style={{fontSize:11,color:'#94a3b8',marginTop:8}}>✍️ {obs.auteur_prenom} {obs.auteur_nom}</div>
            </div>
          ))}`,
  `          {observations.length===0 ? (
            <div style={{textAlign:'center',color:'#94a3b8',padding:30,fontSize:13}}>Aucune observation enregistrée</div>
          ) : observations.map(obs => {
            const peutModifier = isAdmin() || (currentUser && obs.auteur_id === currentUser.id);
            return obsEditId === obs.id ? (
              <form key={obs.id} onSubmit={async (e) => {
                e.preventDefault();
                await axios.put(API+'/observations/'+obs.id, obsEditForm, {headers});
                setObsEditId(null);
                const r = await axios.get(API+'/observations/eleve/'+eleveDetail.id, {headers});
                setObservations(r.data);
              }} style={{background:'#f0f4ff',borderRadius:10,padding:16,border:'1px solid #c7d2fe',borderLeft:'3px solid #6366f1'}}>
                <div style={s.field}>
                  <label style={s.lbl}>Titre</label>
                  <input style={s.inp} value={obsEditForm.titre} onChange={e => setObsEditForm({...obsEditForm,titre:e.target.value})} required />
                </div>
                <div style={{...s.field,marginTop:10}}>
                  <label style={s.lbl}>Remarque</label>
                  <textarea style={{...s.inp,minHeight:70,resize:'vertical'}} value={obsEditForm.contenu} onChange={e => setObsEditForm({...obsEditForm,contenu:e.target.value})} required />
                </div>
                <div style={{display:'flex',gap:8,marginTop:10,justifyContent:'flex-end'}}>
                  <button type="button" style={s.btnCancel} onClick={() => setObsEditId(null)}>Annuler</button>
                  <button type="submit" style={s.btnSave}>Sauvegarder</button>
                </div>
              </form>
            ) : (
              <div key={obs.id} style={{background:'#f8fafc',borderRadius:10,padding:16,border:'1px solid #e2e8f0',borderLeft:'3px solid #6366f1'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <b style={{fontSize:14,color:'#1e293b'}}>{obs.titre}</b>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:11,color:'#94a3b8'}}>{new Date(obs.created_at).toLocaleDateString('fr-CH')}</span>
                    {peutModifier && <>
                      <button onClick={() => { setObsEditId(obs.id); setObsEditForm({titre:obs.titre,contenu:obs.contenu}); }} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,opacity:0.6}} title="Modifier">✏️</button>
                      <button onClick={async () => {
                        if (window.confirm('Supprimer cette observation ?')) {
                          await axios.delete(API+'/observations/'+obs.id, {headers});
                          const r = await axios.get(API+'/observations/eleve/'+eleveDetail.id, {headers});
                          setObservations(r.data);
                        }
                      }} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,opacity:0.6}} title="Supprimer">🗑️</button>
                    </>}
                  </div>
                </div>
                <div style={{fontSize:13,color:'#475569',lineHeight:1.6}}>{obs.contenu}</div>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:8}}>✍️ {obs.auteur_prenom} {obs.auteur_nom}</div>
              </div>
            );
          })}`
);

fs.writeFileSync('./src/pages/Classes.js', c);
console.log('Classes OK !');