const fs = require('fs');
let e = fs.readFileSync('./src/pages/Eleves.js', 'utf8');

// Remplacer toute la partie formulaire
e = e.replace(
  `            <form onSubmit={handleSubmit}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,alignItems:'start'}}>

                {/* COLONNE GAUCHE */}
                <div>
                  <div style={s.sectionTitle}>🎓 Informations élève</div>
                  <div style={s.grid2}>
                    <F lbl="Nom *"><input style={s.inp} required value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="DUPONT" /></F>
                    <F lbl="Prénom *"><input style={s.inp} required value={form.prenom} onChange={e=>setForm({...form,prenom:e.target.value})} placeholder="Marie" /></F>
                    <F lbl="Email"><input style={s.inp} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="marie@ecole.ch" /></F>
                    <F lbl="Date de naissance"><input style={s.inp} type="date" value={form.date_naissance} onChange={e=>setForm({...form,date_naissance:e.target.value})} /></F>
                    <F lbl="Classe">
                      <select style={s.inp} value={form.classe_id} onChange={e=>setForm({...form,classe_id:e.target.value})}>
                        <option value="">-- Choisir --</option>
                        {classes.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                    </F>
                    <F lbl="Téléphone"><input style={s.inp} value={form.telephone} onChange={e=>setForm({...form,telephone:e.target.value})} placeholder="079 123 45 67" /></F>
                    <F lbl="Adresse" full><input style={s.inp} value={form.adresse} onChange={e=>setForm({...form,adresse:e.target.value})} placeholder="Rue de la Paix 10, 1950 Sion" /></F>
                  </div>
                  <div style={{...s.sectionTitle,marginTop:16}}>👨‍👩‍👦 Contact / Parent</div>
                  <div style={s.grid2}>
                    <F lbl="Nom parent / contact"><input style={s.inp} value={form.nom_parent} onChange={e=>setForm({...form,nom_parent:e.target.value})} placeholder="Dupont Jean" /></F>
                    <F lbl="Téléphone parent"><input style={s.inp} value={form.telephone_parent} onChange={e=>setForm({...form,telephone_parent:e.target.value})} placeholder="079 987 65 43" /></F>
                  </div>
                </div>

                {/* COLONNE DROITE - OASI */}
                <div>
                  <div style={{...s.sectionTitle,color:'#6366f1',background:'#e0e7ff'}}>🗂️ Données OASI</div>
                  <div style={s.grid2}>
                    <F lbl="A — PROG_NOM *" full><input style={s.inp} required value={form.oasi_prog_nom} onChange={e=>setForm({...form,oasi_prog_nom:e.target.value})} placeholder="Programme..." /></F>
                    <F lbl="B — PROG_ENCADRANT *"><input style={s.inp} required value={form.oasi_prog_encadrant} onChange={e=>setForm({...form,oasi_prog_encadrant:e.target.value})} placeholder="Encadrant..." /></F>
                    <F lbl="C — N *"><input style={s.inp} required type="number" value={form.oasi_n} onChange={e=>setForm({...form,oasi_n:e.target.value})} placeholder="859056" /></F>
                    <F lbl="D — REF *"><input style={s.inp} required type="number" value={form.oasi_ref} onChange={e=>setForm({...form,oasi_ref:e.target.value})} placeholder="21372" /></F>
                    <F lbl="E — POS *"><input style={s.inp} required type="number" value={form.oasi_pos} onChange={e=>setForm({...form,oasi_pos:e.target.value})} placeholder="1" /></F>
                    <F lbl="F — NOM complet *"><input style={s.inp} required value={form.oasi_nom} onChange={e=>setForm({...form,oasi_nom:e.target.value})} placeholder="AHMAD Riaz" /></F>
                    <F lbl="G — NAIS *"><input style={s.inp} required type="date" value={form.oasi_nais} onChange={e=>setForm({...form,oasi_nais:e.target.value})} /></F>
                    <F lbl="H — NATIONALITE *"><input style={s.inp} required value={form.oasi_nationalite} onChange={e=>setForm({...form,oasi_nationalite:e.target.value})} placeholder="AFGHANISTAN" /></F>
                  </div>
                  <div style={{fontSize:10,color:'#94a3b8',margin:'10px 0 6px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>Colonnes I-O (optionnelles)</div>
                  <div style={s.grid2}>
                    <F lbl="I — PRESENCE_DATE"><input style={s.inp} type="date" value={form.oasi_presence_date} onChange={e=>setForm({...form,oasi_presence_date:e.target.value})} /></F>
                    <F lbl="J — JOUR_SEMAINE"><input style={s.inp} value={form.oasi_jour_semaine} onChange={e=>setForm({...form,oasi_jour_semaine:e.target.value})} placeholder="lundi" /></F>
                    <F lbl="K — PRESENCE_PERIODE"><input style={s.inp} value={form.oasi_presence_periode} onChange={e=>setForm({...form,oasi_presence_periode:e.target.value})} placeholder="Matin" /></F>
                    <F lbl="L — PRESENCE_TYPE"><input style={s.inp} value={form.oasi_presence_type} onChange={e=>setForm({...form,oasi_presence_type:e.target.value})} placeholder="01 Présent" /></F>
                    <F lbl="M — REMARQUE"><input style={s.inp} value={form.oasi_remarque} onChange={e=>setForm({...form,oasi_remarque:e.target.value})} /></F>
                    <F lbl="N — CONTROLE_DU"><input style={s.inp} type="date" value={form.oasi_controle_du} onChange={e=>setForm({...form,oasi_controle_du:e.target.value})} /></F>
                    <F lbl="O — CONTROLE_AU"><input style={s.inp} type="date" value={form.oasi_controle_au} onChange={e=>setForm({...form,oasi_controle_au:e.target.value})} /></F>
                    <F lbl="P — PROG_PRESENCES"><input style={s.inp} value={form.oasi_prog_presences} onChange={e=>setForm({...form,oasi_prog_presences:e.target.value})} /></F>
                    <F lbl="Q — PROG_ADMIN"><input style={s.inp} value={form.oasi_prog_admin} onChange={e=>setForm({...form,oasi_prog_admin:e.target.value})} /></F>
                    <F lbl="R — AS"><input style={s.inp} value={form.oasi_as} onChange={e=>setForm({...form,oasi_as:e.target.value})} /></F>
                    <F lbl="S — PRG_ID"><input style={s.inp} type="number" value={form.oasi_prg_id} onChange={e=>setForm({...form,oasi_prg_id:e.target.value})} /></F>
                    <F lbl="T — PRG_OCCUPATION_ID"><input style={s.inp} type="number" value={form.oasi_prg_occupation_id} onChange={e=>setForm({...form,oasi_prg_occupation_id:e.target.value})} /></F>
                    <F lbl="U — RA_ID"><input style={s.inp} type="number" value={form.oasi_ra_id} onChange={e=>setForm({...form,oasi_ra_id:e.target.value})} /></F>
                    <F lbl="V — TEMPS_REPARTI_ID"><input style={s.inp} type="number" value={form.oasi_temps_reparti_id} onChange={e=>setForm({...form,oasi_temps_reparti_id:e.target.value})} /></F>
                  </div>
                </div>
              </div>`,

  `            <form onSubmit={handleSubmit}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20,alignItems:'start'}}>

                {/* COLONNE 1 - Élève + Parent */}
                <div>
                  <div style={s.sectionTitle}>🎓 Informations élève</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <F lbl="Nom *"><input style={s.inp} required value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="DUPONT" /></F>
                    <F lbl="Prénom *"><input style={s.inp} required value={form.prenom} onChange={e=>setForm({...form,prenom:e.target.value})} placeholder="Marie" /></F>
                    <F lbl="Email"><input style={s.inp} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="marie@ecole.ch" /></F>
                    <F lbl="Date de naissance"><input style={s.inp} type="date" value={form.date_naissance} onChange={e=>setForm({...form,date_naissance:e.target.value})} /></F>
                    <F lbl="Classe">
                      <select style={s.inp} value={form.classe_id} onChange={e=>setForm({...form,classe_id:e.target.value})}>
                        <option value="">-- Choisir --</option>
                        {classes.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                    </F>
                    <F lbl="Téléphone"><input style={s.inp} value={form.telephone} onChange={e=>setForm({...form,telephone:e.target.value})} placeholder="079 123 45 67" /></F>
                    <F lbl="Adresse"><input style={s.inp} value={form.adresse} onChange={e=>setForm({...form,adresse:e.target.value})} placeholder="Rue de la Paix 10" /></F>
                  </div>
                  <div style={{...s.sectionTitle,marginTop:14}}>👨‍👩‍👦 Contact / Parent</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <F lbl="Nom parent / contact"><input style={s.inp} value={form.nom_parent} onChange={e=>setForm({...form,nom_parent:e.target.value})} placeholder="Dupont Jean" /></F>
                    <F lbl="Téléphone parent"><input style={s.inp} value={form.telephone_parent} onChange={e=>setForm({...form,telephone_parent:e.target.value})} placeholder="079 987 65 43" /></F>
                  </div>
                </div>

                {/* COLONNE 2 - OASI obligatoires A-H + P-V */}
                <div>
                  <div style={{...s.sectionTitle,color:'#6366f1',background:'#e0e7ff'}}>🗂️ Données OASI</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <F lbl="A — PROG_NOM *"><input style={s.inp} required value={form.oasi_prog_nom} onChange={e=>setForm({...form,oasi_prog_nom:e.target.value})} placeholder="Programme..." /></F>
                    <F lbl="B — PROG_ENCADRANT *"><input style={s.inp} required value={form.oasi_prog_encadrant} onChange={e=>setForm({...form,oasi_prog_encadrant:e.target.value})} placeholder="Encadrant..." /></F>
                    <F lbl="C — N *"><input style={s.inp} required type="number" value={form.oasi_n} onChange={e=>setForm({...form,oasi_n:e.target.value})} placeholder="859056" /></F>
                    <F lbl="D — REF *"><input style={s.inp} required type="number" value={form.oasi_ref} onChange={e=>setForm({...form,oasi_ref:e.target.value})} placeholder="21372" /></F>
                    <F lbl="E — POS *"><input style={s.inp} required type="number" value={form.oasi_pos} onChange={e=>setForm({...form,oasi_pos:e.target.value})} placeholder="1" /></F>
                    <F lbl="F — NOM complet *"><input style={s.inp} required value={form.oasi_nom} onChange={e=>setForm({...form,oasi_nom:e.target.value})} placeholder="AHMAD Riaz" /></F>
                    <F lbl="G — NAIS *"><input style={s.inp} required type="date" value={form.oasi_nais} onChange={e=>setForm({...form,oasi_nais:e.target.value})} /></F>
                    <F lbl="H — NATIONALITE *"><input style={s.inp} required value={form.oasi_nationalite} onChange={e=>setForm({...form,oasi_nationalite:e.target.value})} placeholder="AFGHANISTAN" /></F>
                    <div style={{borderTop:'1px dashed #e2e8f0',paddingTop:10,marginTop:2}}>
                      <F lbl="P — PROG_PRESENCES *"><input style={s.inp} required value={form.oasi_prog_presences} onChange={e=>setForm({...form,oasi_prog_presences:e.target.value})} /></F>
                    </div>
                    <F lbl="Q — PROG_ADMIN *"><input style={s.inp} required value={form.oasi_prog_admin} onChange={e=>setForm({...form,oasi_prog_admin:e.target.value})} /></F>
                    <F lbl="R — AS *"><input style={s.inp} required value={form.oasi_as} onChange={e=>setForm({...form,oasi_as:e.target.value})} /></F>
                    <F lbl="S — PRG_ID *"><input style={s.inp} required type="number" value={form.oasi_prg_id} onChange={e=>setForm({...form,oasi_prg_id:e.target.value})} /></F>
                    <F lbl="T — PRG_OCCUPATION_ID *"><input style={s.inp} required type="number" value={form.oasi_prg_occupation_id} onChange={e=>setForm({...form,oasi_prg_occupation_id:e.target.value})} /></F>
                    <F lbl="U — RA_ID *"><input style={s.inp} required type="number" value={form.oasi_ra_id} onChange={e=>setForm({...form,oasi_ra_id:e.target.value})} /></F>
                    <F lbl="V — TEMPS_REPARTI_ID *"><input style={s.inp} required type="number" value={form.oasi_temps_reparti_id} onChange={e=>setForm({...form,oasi_temps_reparti_id:e.target.value})} /></F>
                  </div>
                </div>

                {/* COLONNE 3 - OASI optionnels I-O */}
                <div>
                  <div style={{...s.sectionTitle,color:'#94a3b8',background:'#f1f5f9'}}>📋 OASI optionnels (I–O)</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <F lbl="I — PRESENCE_DATE"><input style={s.inp} type="date" value={form.oasi_presence_date} onChange={e=>setForm({...form,oasi_presence_date:e.target.value})} /></F>
                    <F lbl="J — JOUR_SEMAINE"><input style={s.inp} value={form.oasi_jour_semaine} onChange={e=>setForm({...form,oasi_jour_semaine:e.target.value})} placeholder="lundi" /></F>
                    <F lbl="K — PRESENCE_PERIODE"><input style={s.inp} value={form.oasi_presence_periode} onChange={e=>setForm({...form,oasi_presence_periode:e.target.value})} placeholder="Matin" /></F>
                    <F lbl="L — PRESENCE_TYPE"><input style={s.inp} value={form.oasi_presence_type} onChange={e=>setForm({...form,oasi_presence_type:e.target.value})} placeholder="01 Présent" /></F>
                    <F lbl="M — REMARQUE" full>
                      <textarea style={{...s.inp,minHeight:70,resize:'vertical'}} value={form.oasi_remarque} onChange={e=>setForm({...form,oasi_remarque:e.target.value})} />
                    </F>
                    <F lbl="N — CONTROLE_DU"><input style={s.inp} type="date" value={form.oasi_controle_du} onChange={e=>setForm({...form,oasi_controle_du:e.target.value})} /></F>
                    <F lbl="O — CONTROLE_AU"><input style={s.inp} type="date" value={form.oasi_controle_au} onChange={e=>setForm({...form,oasi_controle_au:e.target.value})} /></F>
                  </div>
                </div>
              </div>`
);

fs.writeFileSync('./src/pages/Eleves.js', e);
console.log('Formulaire 3 colonnes OK !');