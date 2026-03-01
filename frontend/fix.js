const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Presences.js');
let code = fs.readFileSync(filePath, 'utf8');

// ── Remplacer le titre + ajouter erreur visible ──
code = code.replace(
  `            <span style={{fontWeight:800,fontSize:14,color:'#0f172a'}}>
              Aperçu — {apercuMois.mois ? new Date(apercuMois.mois+'-01T12:00:00').toLocaleDateString('fr-CH',{month:'long',year:'numeric'}) : ''}
            </span>`,
  `            <span style={{fontWeight:800,fontSize:14,color:'#0f172a'}}>
              Aperçu — {new Date(date.substring(0,7)+'-01T12:00:00').toLocaleDateString('fr-CH',{month:'long',year:'numeric'})}
            </span>`
);

// ── Remplacer la condition d'affichage vide pour montrer l'erreur API ──
code = code.replace(
  `          ) : !apercuMois.eleves ? (
            <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Sélectionnez une classe puis cliquez sur Aperçu du mois</div>
          ) : (() => {`,
  `          ) : !apercuMois.eleves ? (
            <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>
              {apercuMois.erreur
                ? <span style={{color:'#ef4444'}}>❌ Erreur : {apercuMois.erreur}</span>
                : 'Cliquez sur 🔄 Actualiser pour charger les données'}
            </div>
          ) : (() => {`
);

// ── Améliorer chargerApercuMois avec catch visible ──
code = code.replace(
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
  };`,
  `  const chargerApercuMois = async () => {
    if (!classeSelectionnee) { alert('Sélectionnez une classe d\\'abord'); return; }
    setLoadingApercu(true);
    try {
      const mois = date.substring(0, 7);
      const [elevesRes, presRes] = await Promise.all([
        axios.get(API + '/presences/eleves?classe_id=' + classeSelectionnee, { headers }),
        axios.get(API + '/presences/mois?classe_id=' + classeSelectionnee + '&mois=' + mois, { headers }),
      ]);
      setApercuMois({ eleves: elevesRes.data, presences: presRes.data, mois });
    } catch (err) {
      console.error(err);
      setApercuMois({ erreur: err.response?.data?.message || err.message });
    }
    setLoadingApercu(false);
  };`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Fix aperçu : titre date + erreur visible');