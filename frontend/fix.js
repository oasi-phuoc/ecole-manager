const fs = require('fs');
let c = fs.readFileSync('./src/pages/Classes.js', 'utf8');

// 1. Ajouter colonne Photo dans l'entête tableau élèves
c = c.replace(
  `{['Nom','Prénom','Contact','Absences','Excusées','Retards','Présence','Observations'].map(h => <th key={h} style={s.th}>{h}</th>)}`,
  `{['Photo','Nom','Prénom','Contact','Absences','Excusées','Retards','Présence','Observations'].map(h => <th key={h} style={s.th}>{h}</th>)}`
);

// 2. Ajouter cellule photo dans les lignes élèves
c = c.replace(
  `<td style={{...s.td,fontWeight:700}}>{el.nom || el.nom_parent || '—'}</td>`,
  `<td style={s.td}>
                  <div style={{position:'relative',width:38,height:38}}>
                    {el.photo ? (
                      <img src={el.photo} alt="photo" style={{width:38,height:38,borderRadius:'50%',objectFit:'cover',border:'2px solid #e2e8f0'}} />
                    ) : (
                      <div style={{width:38,height:38,borderRadius:'50%',background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'#6366f1',fontWeight:700}}>
                        {(el.prenom||'?')[0]}
                      </div>
                    )}
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
                    )}
                  </div>
                </td>
                <td style={{...s.td,fontWeight:700}}>{el.nom || el.nom_parent || '—'}</td>`
);

// 3. Ajouter aussi la photo dans la vue détail élève
c = c.replace(
  `<h2 style={s.title}>🎓 {eleveDetail.prenom} {eleveDetail.nom}</h2>`,
  `<div style={{display:'flex',alignItems:'center',gap:16}}>
        {eleveDetail.photo ? (
          <img src={eleveDetail.photo} alt="photo" style={{width:56,height:56,borderRadius:'50%',objectFit:'cover',border:'3px solid #e2e8f0'}} />
        ) : (
          <div style={{width:56,height:56,borderRadius:'50%',background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,color:'#6366f1',fontWeight:700}}>
            {(eleveDetail.prenom||'?')[0]}
          </div>
        )}
        <h2 style={s.title}>🎓 {eleveDetail.prenom} {eleveDetail.nom}</h2>
      </div>`
);

fs.writeFileSync('./src/pages/Classes.js', c);
console.log('Photo OK !');