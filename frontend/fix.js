const fs = require('fs');

// Fix 1: Classes.js - Titulaire
let cl = fs.readFileSync('./src/pages/Classes.js', 'utf8');
cl = cl.replace('Professeur principal</label>', 'Titulaire</label>');
cl = cl.replace("Prof principal :</span>", 'Titulaire :</span>');
fs.writeFileSync('./src/pages/Classes.js', cl);
console.log('Classes OK:', (cl.match(/[Pp]rof[a-z]* principal/g)||[]).length, 'restants');

// Fix 2: EmploiDuTemps - tous les problèmes
let e = fs.readFileSync('./src/pages/EmploiDuTemps.js', 'utf8');

// Espacement disponibilités
e = e.replace(
  `<h3 style={{...styles.cardTitre, fontSize:18, marginBottom:16}}>👨‍🏫 Sélectionner un professeur</h3>
            <div style={{...styles.flexWrap, gap:10}}>`,
  `<h3 style={{...styles.cardTitre, fontSize:18, marginBottom:20}}>👨‍🏫 Sélectionner un professeur</h3>
            <div style={{...styles.flexWrap, gap:12, marginTop:8}}>`
);

// Si le texte précédent n'existait pas encore
e = e.replace(
  `<h3 style={styles.cardTitre}>Sélectionner un professeur</h3>
            <div style={styles.flexWrap}>`,
  `<h3 style={{...styles.cardTitre, fontSize:18, marginBottom:20}}>👨‍🏫 Sélectionner un professeur</h3>
            <div style={{...styles.flexWrap, gap:12, marginTop:8}}>`
);

// Espacement planning profs - sélectionner professeur
e = e.replace(
  `<h3 style={styles.cardTitre}>Sélectionner un professeur</h3>
            <div style={styles.flexWrap}>
              {profs.map(p => (
                <button key={p.id} style={{...styles.chip,...(profPlanningId==p.id?styles.chipActif:{})}}`,
  `<h3 style={{...styles.cardTitre, fontSize:18, marginBottom:20}}>👨‍🏫 Sélectionner un professeur</h3>
            <div style={{...styles.flexWrap, gap:12, marginTop:8}}>
              {profs.map(p => (
                <button key={p.id} style={{...styles.chip,...(profPlanningId==p.id?styles.chipActif:{})}}`
);

// Fix planning général - tableau titulaires au-dessus + pas de combobox branche
// D'abord enlever les combobox branche du planning général
e = e.replace(
  `{aff?<><b style={{color:'#2e7d32'}}>{aff.classe_nom}</b>{aff.matiere_nom&&<><br/><span style={{color:'#888'}}>{aff.matiere_nom}</span></>}</>:''}`,
  `{aff?<><b style={{color:'#2e7d32',fontSize:11}}>{aff.classe_nom}</b>{aff.matiere_nom&&<><br/><span style={{color:'#888',fontSize:10}}>{aff.matiere_nom}</span></>}</>:''}`
);

// Ajouter tableau titulaires avant le tableau planning général
e = e.replace(
  `{planningGeneral && (
            <div style={{overflowX:'auto',marginTop:16}}>`,
  `{planningGeneral && (
            <div>
              {/* Tableau titulaires des classes */}
              <div style={{...styles.card, marginBottom:16}}>
                <h4 style={{margin:'0 0 12px',fontSize:14,fontWeight:700,color:'#555'}}>🏫 Classes et titulaires</h4>
                <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
                  {(planningGeneral.titulaires||[]).filter(t=>t.classe_nom).map((t,i) => (
                    <div key={i} style={{background:'#f8f9fa',borderRadius:10,padding:'10px 16px',border:'1px solid #e0e0e0',minWidth:160}}>
                      <div style={{fontWeight:700,fontSize:14,color:'#1a73e8'}}>{t.classe_nom}</div>
                      <div style={{fontSize:12,color:'#555',marginTop:4}}>{t.prof_nom || <span style={{color:'#bbb'}}>Pas de titulaire</span>}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {planningGeneral && (
            <div style={{overflowX:'auto',marginTop:0}}>`
);

// Fermer le dernier div du planning général correctement
e = e.replace(
  `{planningGeneral && (
            <div style={{overflowX:'auto',marginTop:16}}>`,
  `{planningGeneral && (
            <div style={{overflowX:'auto',marginTop:0}}>`
);

fs.writeFileSync('./src/pages/EmploiDuTemps.js', e);
console.log('EDT espacement dispo:', e.includes('marginBottom:20'));
console.log('EDT titulaires tableau:', e.includes('Classes et titulaires'));