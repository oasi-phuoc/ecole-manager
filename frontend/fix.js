const fs = require('fs');
let c = fs.readFileSync('./src/pages/Classes.js', 'utf8');

// 1. Mettre à jour obsForm initial
c = c.replace(
  `const [obsForm, setObsForm] = useState({ titre:'', contenu:'' });`,
  `const [obsForm, setObsForm] = useState({ titre:'', contenu:'', mesure_prise:'', intervention_responsable:false, demande_entretien:false });`
);

c = c.replace(
  `const [obsEditForm, setObsEditForm] = useState({titre:'',contenu:''});`,
  `const [obsEditForm, setObsEditForm] = useState({titre:'',contenu:'',mesure_prise:'',intervention_responsable:false,demande_entretien:false});`
);

// 2. Remplacer le formulaire d'ajout observation
c = c.replace(
  `            <div style={s.field}>
              <label style={s.lbl}>Titre *</label>
              <input style={s.inp} required value={obsForm.titre} onChange={e => setObsForm({...obsForm,titre:e.target.value})} placeholder="Ex: Comportement en classe..." />
            </div>
            <div style={{...s.field,marginTop:10}}>
              <label style={s.lbl}>Remarque *</label>
              <textarea style={{...s.inp,minHeight:80,resize:'vertical'}} required value={obsForm.contenu} onChange={e => setObsForm({...obsForm,contenu:e.target.value})} placeholder="Saisir votre observation..." />
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
              <button type="button" style={s.btnCancel} onClick={() => setShowObsForm(false)}>Annuler</button>
              <button type="submit" style={s.btnSave}>Sauvegarder</button>
            </div>`,
  `            <div style={s.field}>
              <label style={s.lbl}>Titre *</label>
              <input style={s.inp} required value={obsForm.titre} onChange={e => setObsForm({...obsForm,titre:e.target.value})} placeholder="Ex: Comportement en classe..." />
            </div>
            <div style={{...s.field,marginTop:10}}>
              <label style={s.lbl}>Remarque *</label>
              <textarea style={{...s.inp,minHeight:70,resize:'vertical'}} required value={obsForm.contenu} onChange={e => setObsForm({...obsForm,contenu:e.target.value})} placeholder="Saisir votre observation..." />
            </div>
            <div style={{...s.field,marginTop:10}}>
              <label style={s.lbl}>Mesure prise *</label>
              <textarea style={{...s.inp,minHeight:60,resize:'vertical'}} required value={obsForm.mesure_prise} onChange={e => setObsForm({...obsForm,mesure_prise:e.target.value})} placeholder="Ex: Avertissement oral, convocation..." />
            </div>
            <div style={{display:'flex',gap:12,marginTop:14}}>
              <button type="button" onClick={() => setObsForm({...obsForm,intervention_responsable:!obsForm.intervention_responsable})}
                style={{flex:1,padding:'9px 12px',borderRadius:8,border:'2px solid '+(obsForm.intervention_responsable?'#ef4444':'#e2e8f0'),background:obsForm.intervention_responsable?'#fee2e2':'#f8fafc',color:obsForm.intervention_responsable?'#991b1b':'#64748b',cursor:'pointer',fontWeight:600,fontSize:12,transition:'all 0.15s'}}>
                🚨 Intervention responsable : <b>{obsForm.intervention_responsable?'OUI':'NON'}</b>
              </button>
              <button type="button" onClick={() => setObsForm({...obsForm,demande_entretien:!obsForm.demande_entretien})}
                style={{flex:1,padding:'9px 12px',borderRadius:8,border:'2px solid '+(obsForm.demande_entretien?'#f59e0b':'#e2e8f0'),background:obsForm.demande_entretien?'#fef3c7':'#f8fafc',color:obsForm.demande_entretien?'#92400e':'#64748b',cursor:'pointer',fontWeight:600,fontSize:12,transition:'all 0.15s'}}>
                🤝 Demande entretien : <b>{obsForm.demande_entretien?'OUI':'NON'}</b>
              </button>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
              <button type="button" style={s.btnCancel} onClick={() => setShowObsForm(false)}>Annuler</button>
              <button type="submit" style={s.btnSave}>Sauvegarder</button>
            </div>`
);

// 3. Mettre à jour sauverObservation pour envoyer les nouveaux champs
c = c.replace(
  `      await axios.post(API+'/observations/eleve/'+eleveDetail.id, obsForm, {headers});
      setObsForm({titre:'',contenu:''});`,
  `      await axios.post(API+'/observations/eleve/'+eleveDetail.id, obsForm, {headers});
      setObsForm({titre:'',contenu:'',mesure_prise:'',intervention_responsable:false,demande_entretien:false});`
);

// 4. Mettre à jour le formulaire d'édition
c = c.replace(
  `              <form key={obs.id} onSubmit={async (e) => {
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
              </form>`,
  `              <form key={obs.id} onSubmit={async (e) => {
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
                  <textarea style={{...s.inp,minHeight:60,resize:'vertical'}} value={obsEditForm.contenu} onChange={e => setObsEditForm({...obsEditForm,contenu:e.target.value})} required />
                </div>
                <div style={{...s.field,marginTop:10}}>
                  <label style={s.lbl}>Mesure prise</label>
                  <textarea style={{...s.inp,minHeight:50,resize:'vertical'}} value={obsEditForm.mesure_prise||''} onChange={e => setObsEditForm({...obsEditForm,mesure_prise:e.target.value})} />
                </div>
                <div style={{display:'flex',gap:10,marginTop:12}}>
                  <button type="button" onClick={() => setObsEditForm({...obsEditForm,intervention_responsable:!obsEditForm.intervention_responsable})}
                    style={{flex:1,padding:'8px',borderRadius:8,border:'2px solid '+(obsEditForm.intervention_responsable?'#ef4444':'#e2e8f0'),background:obsEditForm.intervention_responsable?'#fee2e2':'#f8fafc',color:obsEditForm.intervention_responsable?'#991b1b':'#64748b',cursor:'pointer',fontWeight:600,fontSize:11}}>
                    🚨 Intervention : <b>{obsEditForm.intervention_responsable?'OUI':'NON'}</b>
                  </button>
                  <button type="button" onClick={() => setObsEditForm({...obsEditForm,demande_entretien:!obsEditForm.demande_entretien})}
                    style={{flex:1,padding:'8px',borderRadius:8,border:'2px solid '+(obsEditForm.demande_entretien?'#f59e0b':'#e2e8f0'),background:obsEditForm.demande_entretien?'#fef3c7':'#f8fafc',color:obsEditForm.demande_entretien?'#92400e':'#64748b',cursor:'pointer',fontWeight:600,fontSize:11}}>
                    🤝 Entretien : <b>{obsEditForm.demande_entretien?'OUI':'NON'}</b>
                  </button>
                </div>
                <div style={{display:'flex',gap:8,marginTop:10,justifyContent:'flex-end'}}>
                  <button type="button" style={s.btnCancel} onClick={() => setObsEditId(null)}>Annuler</button>
                  <button type="submit" style={s.btnSave}>Sauvegarder</button>
                </div>
              </form>`
);

// 5. Mettre à jour l'initialisation de obsEditForm au click modifier
c = c.replace(
  `onClick={() => { setObsEditId(obs.id); setObsEditForm({titre:obs.titre,contenu:obs.contenu}); }}`,
  `onClick={() => { setObsEditId(obs.id); setObsEditForm({titre:obs.titre,contenu:obs.contenu,mesure_prise:obs.mesure_prise||'',intervention_responsable:obs.intervention_responsable||false,demande_entretien:obs.demande_entretien||false}); }}`
);

// 6. Afficher les badges dans la card observation
c = c.replace(
  `              <div style={{fontSize:11,color:'#94a3b8',marginTop:8}}>✍️ {obs.auteur_prenom} {obs.auteur_nom}</div>`,
  `              {obs.mesure_prise && <div style={{fontSize:12,color:'#475569',marginTop:6,background:'#f1f5f9',padding:'4px 10px',borderRadius:6}}>📋 <b>Mesure :</b> {obs.mesure_prise}</div>}
              <div style={{display:'flex',gap:8,marginTop:8,alignItems:'center',flexWrap:'wrap'}}>
                <span style={{fontSize:11,color:'#94a3b8'}}>✍️ {obs.auteur_prenom} {obs.auteur_nom}</span>
                {obs.intervention_responsable && <span style={{background:'#fee2e2',color:'#991b1b',padding:'2px 8px',borderRadius:99,fontSize:10,fontWeight:700}}>🚨 Intervention</span>}
                {obs.demande_entretien && <span style={{background:'#fef3c7',color:'#92400e',padding:'2px 8px',borderRadius:99,fontSize:10,fontWeight:700}}>🤝 Entretien</span>}
              </div>`
);

// 7. Ajouter bouton "Toutes les observations" + fonction imprimer
c = c.replace(
  `        <div style={s.rowBetween}>
          <h3 style={s.cardTitle}>📋 Observations</h3>
          <button style={s.btnAdd} onClick={() => setShowObsForm(!showObsForm)}>+ Ajouter</button>
        </div>`,
  `        <div style={s.rowBetween}>
          <h3 style={s.cardTitle}>📋 Observations</h3>
          <div style={{display:'flex',gap:8}}>
            <button style={{...s.btnAdd,background:'#6366f1'}} onClick={() => imprimerObservations()}>📄 Rapport PDF</button>
            <button style={s.btnAdd} onClick={() => setShowObsForm(!showObsForm)}>+ Ajouter</button>
          </div>
        </div>`
);

// 8. Ajouter fonction imprimerObservations
c = c.replace(
  `  const [showTrombinoscope, setShowTrombinoscope] = useState(false);`,
  `  const [showTrombinoscope, setShowTrombinoscope] = useState(false);

  const imprimerObservations = () => {
    const rows = observations.map(obs => \`
      <tr>
        <td>\${new Date(obs.created_at).toLocaleDateString('fr-CH')}</td>
        <td style="font-weight:700">\${obs.titre||''}</td>
        <td>\${obs.contenu||''}</td>
        <td>\${obs.mesure_prise||'—'}</td>
        <td>\${obs.auteur_prenom||''} \${obs.auteur_nom||''}</td>
        <td style="text-align:center">
          \${obs.intervention_responsable?'<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700">🚨 Oui</span>':'<span style="color:#94a3b8;font-size:11px">Non</span>'}
        </td>
        <td style="text-align:center">
          \${obs.demande_entretien?'<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700">🤝 Oui</span>':'<span style="color:#94a3b8;font-size:11px">Non</span>'}
        </td>
      </tr>
    \`).join('');

    const win = window.open('', '_blank');
    win.document.write(\`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Observations - \${eleveDetail.prenom} \${eleveDetail.nom}</title>
        <style>
          body { font-family: 'Century Gothic', sans-serif; padding: 32px; color: #1e293b; background: #f8fafc; }
          h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
          .sub { font-size: 13px; color: #64748b; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
          th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
          tr:last-child td { border-bottom: none; }
          .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: right; }
          @media print { body { padding: 16px; background: white; } .no-print { display: none; } @page { margin: 1.5cm; } }
        </style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <h1>📋 Rapport d'observations — \${eleveDetail.prenom} \${eleveDetail.nom}</h1>
            <div class="sub">Classe : \${detailClasse.nom} · \${observations.length} observation(s) · Généré le \${new Date().toLocaleDateString('fr-CH')}</div>
          </div>
          <button class="no-print" onclick="window.print()" style="padding:10px 20px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit">🖨️ Imprimer</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Titre</th><th>Remarque</th><th>Mesure prise</th><th>Auteur</th><th>Intervention</th><th>Entretien</th>
            </tr>
          </thead>
          <tbody>\${rows}</tbody>
        </table>
        <div class="footer">École Manager</div>
      </body>
      </html>
    \`);
    win.document.close();
  };`
);

fs.writeFileSync('./src/pages/Classes.js', c);
console.log('Classes observations OK !');