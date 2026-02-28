const fs = require('fs');
let c = fs.readFileSync('./src/pages/Classes.js', 'utf8');

// 1. Bouton Détail en première colonne dans le tableau classes
c = c.replace(
  `{['Classe','Année','Titulaire','Élèves','Statut','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}`,
  `{['','Classe','Année','Titulaire','Élèves','Statut'].map(h => <th key={h} style={s.th}>{h}</th>)}
              {isAdmin() && <th style={s.th}>Actions</th>}`
);

c = c.replace(
  `<tr key={c.id} style={s.tr}>
                <td style={s.td}>
                  <div style={{fontWeight:700,color:'#1e293b'}}>{c.nom}</div>
                  {c.niveau && <div style={{fontSize:11,color:'#94a3b8'}}>{c.niveau}</div>}
                </td>
                <td style={s.td}>{c.annee_scolaire||'—'}</td>
                <td style={s.td}>{c.prof_prenom ? <span>{c.prof_prenom} <b>{c.prof_nom}</b></span> : <span style={{color:'#94a3b8'}}>—</span>}</td>
                <td style={s.td}><span style={{...s.badge,background:'#e0e7ff',color:'#3730a3'}}>{c.nb_eleves||0} élèves</span></td>
                <td style={s.td}>
                  <button style={c.actif!==false?s.badgeActive:s.badgeArchive} onClick={() => toggleActif(c)}>
                    {c.actif!==false?'✅ Active':'📦 Archivée'}
                  </button>
                </td>
                <td style={s.td}>
                  <button style={s.btnDetail} onClick={() => ouvrirDetail(c)}>👁 Détail</button>
                  {isAdmin() && <>
                    <button style={s.btnEdit} onClick={() => handleEdit(c)}>✏️</button>
                    <button style={s.btnDel} onClick={() => handleDelete(c.id)}>🗑️</button>
                  </>}
                </td>
              </tr>`,
  `<tr key={c.id} style={s.tr}>
                <td style={s.td}><button style={s.btnDetail} onClick={() => ouvrirDetail(c)}>👁 Détail</button></td>
                <td style={s.td}>
                  <div style={{fontWeight:700,color:'#1e293b'}}>{c.nom}</div>
                  {c.niveau && <div style={{fontSize:11,color:'#94a3b8'}}>{c.niveau}</div>}
                </td>
                <td style={s.td}>{c.annee_scolaire||'—'}</td>
                <td style={s.td}>{c.prof_prenom ? <span>{c.prof_prenom} <b>{c.prof_nom}</b></span> : <span style={{color:'#94a3b8'}}>—</span>}</td>
                <td style={s.td}><span style={{...s.badge,background:'#e0e7ff',color:'#3730a3'}}>{c.nb_eleves||0} élèves</span></td>
                <td style={s.td}>
                  <button style={c.actif!==false?s.badgeActive:s.badgeArchive} onClick={() => toggleActif(c)}>
                    {c.actif!==false?'✅ Active':'📦 Archivée'}
                  </button>
                </td>
                {isAdmin() && <td style={s.td}>
                  <button style={s.btnEdit} onClick={() => handleEdit(c)}>✏️</button>
                  <button style={s.btnDel} onClick={() => handleDelete(c.id)}>🗑️</button>
                </td>}
              </tr>`
);

// 2. Titre liste élèves
c = c.replace(
  `<h2 style={s.title}>🏫 {detailClasse.nom}</h2>`,
  `<h2 style={s.title}>🏫 {detailClasse.nom} — Liste des élèves</h2>`
);

// 3. Colonnes tableau élèves - enlever Actions, Observations devient Détail
c = c.replace(
  `{['Nom','Prénom','Contact','Absences','Excusées','Retards','Présence','Observations','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}`,
  `{['Nom','Prénom','Contact','Absences','Excusées','Retards','Présence','Observations'].map(h => <th key={h} style={s.th}>{h}</th>)}`
);

// 4. Supprimer colonne Actions dans les lignes élèves, Observations = bouton Détail
c = c.replace(
  `<td style={s.td}><span style={{...s.badge,background:'#e0e7ff',color:'#3730a3'}}>—</span></td>
                <td style={s.td}>
                  <button style={s.btnDetail} onClick={() => ouvrirEleveDetail(el)}>👁 Détail</button>
                </td>`,
  `<td style={s.td}><button style={s.btnDetail} onClick={() => ouvrirEleveDetail(el)}>👁 Détail</button></td>`
);

// 5. Fix affichage nom/prenom élève - utiliser nom_parent si pas de nom direct
c = c.replace(
  `<td style={{...s.td,fontWeight:700}}>{el.nom||'—'}</td>
                <td style={s.td}>{el.prenom||'—'}</td>
                <td style={s.td}>{el.personne_contact||'—'}</td>`,
  `<td style={{...s.td,fontWeight:700}}>{el.nom || el.nom_parent || '—'}</td>
                <td style={s.td}>{el.prenom||'—'}</td>
                <td style={s.td}>{el.personne_contact || el.telephone_parent || '—'}</td>`
);

fs.writeFileSync('./src/pages/Classes.js', c);
console.log('OK !');