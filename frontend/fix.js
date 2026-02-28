const fs = require('fs');

// ===== CLASSES.JS - Ajouter bouton supprimer photo =====
let c = fs.readFileSync('./src/pages/Classes.js', 'utf8');

c = c.replace(
  `{el.photo
                    ? <img src={el.photo} onClick={() => setPhotoZoom(el.photo)} style={{width:38,height:38,borderRadius:'50%',objectFit:'cover',border:'2px solid #e2e8f0',cursor:'pointer'}} />
                    : <div style={{width:38,height:38,borderRadius:'50%',background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'#6366f1',fontWeight:700}}>
                        {(el.prenom||'?')[0]}
                      </div>
                    }
                    {isAdmin() && (
                      <label style={{position:'absolute',bottom:-2,right:-2,width:16,height:16,background:'#6366f1',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'white'}} title="Changer photo">
                        📷
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={async (ev) => {
                          const file = ev.target.files[0];
                          if (!file) return;
                          if (file.size > 2*1024*1024) { alert('Image trop grande (max 2MB)'); return; }
                          const reader = new FileReader();
                          reader.onload = async (e) => {
                            try {
                              await axios.put(API+'/eleves/'+el.id+'/photo', {photo: e.target.result}, {headers});
                              const r = await axios.get(API+'/classes/'+detailClasse.id+'/eleves', {headers});
                              setElevesClasse(r.data);
                            } catch(err) { alert('Erreur upload photo'); }
                          };
                          reader.readAsDataURL(file);
                        }} />
                      </label>
                    )}`,
  `{el.photo
                    ? <img src={el.photo} onClick={() => setPhotoZoom(el.photo)} style={{width:38,height:38,borderRadius:'50%',objectFit:'cover',border:'2px solid #e2e8f0',cursor:'pointer'}} />
                    : <div style={{width:38,height:38,borderRadius:'50%',background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'#6366f1',fontWeight:700}}>
                        {(el.prenom||'?')[0]}
                      </div>
                    }
                    {isAdmin() && (
                      <div style={{position:'absolute',bottom:-2,right:-2,display:'flex',gap:2}}>
                        <label style={{width:16,height:16,background:'#6366f1',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'white'}} title="Changer photo">
                          📷
                          <input type="file" accept="image/*" style={{display:'none'}} onChange={async (ev) => {
                            const file = ev.target.files[0];
                            if (!file) return;
                            if (file.size > 2*1024*1024) { alert('Image trop grande (max 2MB)'); return; }
                            const reader = new FileReader();
                            reader.onload = async (e) => {
                              try {
                                await axios.put(API+'/eleves/'+el.id+'/photo', {photo: e.target.result}, {headers});
                                const r = await axios.get(API+'/classes/'+detailClasse.id+'/eleves', {headers});
                                setElevesClasse(r.data);
                              } catch(err) { alert('Erreur upload photo'); }
                            };
                            reader.readAsDataURL(file);
                          }} />
                        </label>
                        {el.photo && (
                          <div onClick={async () => {
                            if (window.confirm('Supprimer la photo ?')) {
                              await axios.put(API+'/eleves/'+el.id+'/photo', {photo: null}, {headers});
                              const r = await axios.get(API+'/classes/'+detailClasse.id+'/eleves', {headers});
                              setElevesClasse(r.data);
                            }
                          }} style={{width:16,height:16,background:'#ef4444',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'white'}} title="Supprimer photo">
                            ✕
                          </div>
                        )}
                      </div>
                    )}`
);

fs.writeFileSync('./src/pages/Classes.js', c);
console.log('Classes photo delete OK !');

// ===== ELEVES.JS - Ajouter colonne photo =====
let e = fs.readFileSync('./src/pages/Eleves.js', 'utf8');

// Ajouter colonne Photo dans l'entête
e = e.replace(
  `{['Nom','Prénom','REF','Nationalité','Classe','Date naissance','Contact','Statut','Actions'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}`,
  `{['Photo','Nom','Prénom','REF','Nationalité','Classe','Date naissance','Contact','Statut','Actions'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}`
);

// Ajouter cellule photo avant le nom
e = e.replace(
  `              <tr key={el.id} style={s.tr}>
                <td style={{...s.td,fontWeight:700,color:'#1e293b'}}>{el.nom||'—'}</td>`,
  `              <tr key={el.id} style={s.tr}>
                <td style={s.td}>
                  <div style={{position:'relative',width:36,height:36}}>
                    {el.photo
                      ? <img src={el.photo} onClick={() => setPhotoZoom && setPhotoZoom(el.photo)} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',border:'2px solid #e2e8f0',cursor:'pointer'}} />
                      : <div style={{width:36,height:36,borderRadius:'50%',background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#6366f1',fontWeight:700}}>
                          {(el.prenom||'?')[0]}
                        </div>
                    }
                    {isAdmin() && (
                      <div style={{position:'absolute',bottom:-2,right:-2,display:'flex',gap:1}}>
                        <label style={{width:14,height:14,background:'#6366f1',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'white'}} title="Changer photo">
                          📷
                          <input type="file" accept="image/*" style={{display:'none'}} onChange={async (ev) => {
                            const file = ev.target.files[0];
                            if (!file) return;
                            if (file.size > 2*1024*1024) { alert('Max 2MB'); return; }
                            const reader = new FileReader();
                            reader.onload = async (re) => {
                              try {
                                await axios.put(API+'/eleves/'+el.id+'/photo', {photo: re.target.result}, {headers});
                                chargerTout();
                              } catch(err) { alert('Erreur upload'); }
                            };
                            reader.readAsDataURL(file);
                          }} />
                        </label>
                        {el.photo && (
                          <div onClick={async () => {
                            if (window.confirm('Supprimer la photo ?')) {
                              await axios.put(API+'/eleves/'+el.id+'/photo', {photo: null}, {headers});
                              chargerTout();
                            }
                          }} style={{width:14,height:14,background:'#ef4444',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'white'}} title="Supprimer photo">
                            ✕
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td style={{...s.td,fontWeight:700,color:'#1e293b'}}>{el.nom||'—'}</td>`
);

// Ajouter état photoZoom dans Eleves
e = e.replace(
  `  const navigate = useNavigate();`,
  `  const [photoZoom, setPhotoZoom] = useState(null);
  const navigate = useNavigate();`
);

// Ajouter modal zoom photo dans Eleves avant le return
e = e.replace(
  `  return (
    <div style={s.page}>`,
  `  const ModalZoom = () => photoZoom ? (
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

  return (
    <div style={s.page}>
      <ModalZoom />`
);

// Supprimer le doublon du return
e = e.replace(
  `  return (
    <div style={s.page}>
      <ModalZoom />
    <div style={s.page}>`,
  `  return (
    <div style={s.page}>
      <ModalZoom />`
);

fs.writeFileSync('./src/pages/Eleves.js', e);
console.log('Eleves photo OK !');