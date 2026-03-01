const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Presences.js');
let code = fs.readFileSync(filePath, 'utf8');

// ── 1. Ajouter state pour aperçu du mois ──
code = code.replace(
  `  const [evenementsCalendrier, setEvenementsCalendrier] = useState([]);`,
  `  const [evenementsCalendrier, setEvenementsCalendrier] = useState([]);
  const [apercuMois, setApercuMois] = useState({});
  const [loadingApercu, setLoadingApercu] = useState(false);`
);

// ── 2. Ajouter onglet 'apercu' ──
code = code.replace(
  `      {[['saisie','📋 Saisie'],['stats','📊 Statistiques']].map(([k,l]) => (`,
  `      {[['saisie','📋 Saisie'],['apercu','📆 Aperçu du mois'],['stats','📊 Statistiques']].map(([k,l]) => (`
);

// ── 3. Déclencher chargerApercuMois au clic ──
code = code.replace(
  `          <button key={k} style={{padding:'9px 20px',borderRadius:9,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,background:onglet===k?'#6366f1':'white',color:onglet===k?'white':'#64748b',boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}} onClick={() => setOnglet(k)}>{l}</button>`,
  `          <button key={k} style={{padding:'9px 20px',borderRadius:9,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,background:onglet===k?'#6366f1':'white',color:onglet===k?'white':'#64748b',boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}} onClick={() => { setOnglet(k); if(k==='apercu') chargerApercuMois(); }}>{l}</button>`
);

// ── 4. Ajouter fonction chargerApercuMois ──
code = code.replace(
  `  const chargerCalendrier = async () => {`,
  `  const chargerApercuMois = async () => {
    if (!classeSelectionnee) return;
    setLoadingApercu(true);
    try {
      const mois = date.substring(0, 7);
      const [elevesRes, presRes] = await Promise.all([
        axios.get(API + '/presences/eleves?classe_id=' + classeSelectionnee, { headers }),
        axios.get(API + '/presences/mois?classe_id=' + classeSelectionnee + '&mois=' + mois, { headers }),
      ]);
      setApercuMois({ eleves: elevesRes.data, presences: presRes.data, mois });
    } catch (err) { console.error(err); }
    setLoadingApercu(false);
  };

  const chargerCalendrier = async () => {`
);

// ── 5. Ajouter le bloc JSX aperçu avant l'onglet stats ──
code = code.replace(
  `      {onglet === 'stats' && (`,
  `      {onglet === 'apercu' && (
        <div style={{background:'white',borderRadius:14,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',border:'1px solid #f1f5f9',overflow:'hidden'}}>
          <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontWeight:800,fontSize:14,color:'#0f172a'}}>
              Aperçu — {apercuMois.mois ? new Date(apercuMois.mois+'-01T12:00:00').toLocaleDateString('fr-CH',{month:'long',year:'numeric'}) : ''}
            </span>
            <button onClick={chargerApercuMois} style={{padding:'6px 14px',background:'#6366f1',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:12}}>🔄 Actualiser</button>
          </div>
          {loadingApercu ? (
            <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Chargement...</div>
          ) : !apercuMois.eleves ? (
            <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Sélectionnez une classe puis cliquez sur Aperçu du mois</div>
          ) : (() => {
            const moisStr = apercuMois.mois;
            const [annee, moisNum] = moisStr.split('-').map(Number);
            const nbJours = new Date(annee, moisNum, 0).getDate();
            const jours = Array.from({length: nbJours}, (_, i) => i + 1);
            const NOM_JOURS = ['D','L','M','M','J','V','S'];
            const STATUT_COLOR = {'P':'#10b981','A':'#ef4444','R':'#f59e0b','E':'#3b82f6','C':'#8b5cf6'};
            const STATUT_BG = {'P':'#d1fae5','A':'#fee2e2','R':'#fef3c7','E':'#dbeafe','C':'#ede9fe'};

            const getStatut = (eleve_id, jour) => {
              const dateStr = annee+'-'+String(moisNum).padStart(2,'0')+'-'+String(jour).padStart(2,'0');
              const pr = (apercuMois.presences||[]).find(p => String(p.eleve_id)===String(eleve_id) && p.date?.substring(0,10)===dateStr);
              if (!pr) return '';
              for (let i=1; i<=8; i++) { if (pr['p'+i]) return pr['p'+i]; }
              return '';
            };

            const isWkd = (jour) => {
              const j = new Date(annee+'-'+String(moisNum).padStart(2,'0')+'-'+String(jour).padStart(2,'0')+'T12:00:00').getDay();
              return j===0||j===6;
            };

            const isVac = (jour) => {
              const dateStr = annee+'-'+String(moisNum).padStart(2,'0')+'-'+String(jour).padStart(2,'0');
              return evenementsCalendrier.some(ev => {
                const deb = ev.date_debut?.substring(0,10);
                const fin = (ev.date_fin||ev.date_debut)?.substring(0,10);
                return dateStr >= deb && dateStr <= fin;
              });
            };

            return (
              <div style={{overflowX:'auto'}}>
                <table style={{borderCollapse:'collapse',fontSize:11,minWidth:'100%'}}>
                  <thead>
                    <tr style={{background:'#f8fafc'}}>
                      <th style={{padding:'8px 14px',textAlign:'left',fontSize:12,fontWeight:800,color:'#475569',borderBottom:'2px solid #e2e8f0',position:'sticky',left:0,background:'#f8fafc',zIndex:2,minWidth:150,whiteSpace:'nowrap'}}>Élève</th>
                      {jours.map(j => {
                        const wkd = isWkd(j);
                        const vac = isVac(j);
                        const jourIdx = new Date(annee+'-'+String(moisNum).padStart(2,'0')+'-'+String(j).padStart(2,'0')+'T12:00:00').getDay();
                        return (
                          <th key={j} style={{padding:'4px 2px',textAlign:'center',borderBottom:'2px solid #e2e8f0',minWidth:26,
                            background:wkd?'#e2e8f0':vac?'#fef3c7':'#f8fafc',
                            color:wkd?'#94a3b8':vac?'#92400e':'#475569'}}>
                            <div style={{fontWeight:700,fontSize:11}}>{j}</div>
                            <div style={{fontSize:9,opacity:0.7}}>{NOM_JOURS[jourIdx]}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {apercuMois.eleves.map((e, ri) => (
                      <tr key={e.id} style={{background:ri%2===0?'white':'#fafafa'}}>
                        <td style={{padding:'5px 14px',fontWeight:700,fontSize:12,color:'#0f172a',borderBottom:'1px solid #f1f5f9',position:'sticky',left:0,background:ri%2===0?'white':'#fafafa',zIndex:1,whiteSpace:'nowrap'}}>
                          {e.nom} {e.prenom}
                        </td>
                        {jours.map(j => {
                          const wkd = isWkd(j);
                          const vac = isVac(j);
                          const statut = (!wkd && !vac) ? getStatut(e.id, j) : '';
                          return (
                            <td key={j} style={{padding:'3px 2px',textAlign:'center',borderBottom:'1px solid #f1f5f9',
                              background:wkd?'#e2e8f0':vac?'#fef9c3':'transparent'}}>
                              {!wkd && !vac && (
                                <span style={{
                                  display:'inline-flex',alignItems:'center',justifyContent:'center',
                                  width:20,height:20,borderRadius:4,fontSize:10,fontWeight:800,
                                  background:STATUT_BG[statut]||'#f1f5f9',
                                  color:STATUT_COLOR[statut]||'#cbd5e1',
                                }}>
                                  {statut||'·'}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {onglet === 'stats' && (`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Aperçu du mois ajouté !');