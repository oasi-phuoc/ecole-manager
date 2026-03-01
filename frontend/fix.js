const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Parametres.js');
let code = fs.readFileSync(filePath, 'utf8');

// ── 1. Ajouter onglet 'danger' dans ONGLETS (admin seulement) ──
code = code.replace(
  `    { key: 'acces', label: '🔑 Gestion des accès', show: isAdmin },`,
  `    { key: 'acces', label: '🔑 Gestion des accès', show: isAdmin },
    { key: 'danger', label: '⚠️ Zone de danger', show: isAdmin },`
);

// ── 2. Ajouter couleur pour onglet danger ──
code = code.replace(
  `  const COULEURS = { profil: '#1a73e8', mdp: '#ea4335', ecole: '#34a853', acces: '#ff9800' };`,
  `  const COULEURS = { profil: '#1a73e8', mdp: '#ea4335', ecole: '#34a853', acces: '#ff9800', danger: '#dc2626' };`
);

// ── 3. Ajouter state pour reset ──
code = code.replace(
  `  const [msgPerms, setMsgPerms] = useState('');`,
  `  const [msgPerms, setMsgPerms] = useState('');
  const [resetEtape, setResetEtape] = useState(0); // 0=idle, 1=confirm1, 2=confirm2, 3=loading, 4=done
  const [resetMsg, setResetMsg] = useState('');`
);

// ── 4. Ajouter fonction handleReset ──
code = code.replace(
  `  const ONGLETS = [`,
  `  const handleReset = async () => {
    setResetEtape(3);
    try {
      await axios.delete(API + '/parametres/reset-tout', { headers });
      setResetEtape(4);
      setResetMsg('✅ Toutes les données ont été supprimées.');
    } catch (err) {
      setResetEtape(0);
      setResetMsg('❌ Erreur : ' + (err.response?.data?.message || err.message));
    }
  };

  const ONGLETS = [`
);

// ── 5. Ajouter le bloc JSX onglet danger avant la fermeture du content div ──
code = code.replace(
  `        </div>
      </div>
    </div>
  );
}`,
  `          {onglet === 'danger' && isAdmin && (
            <div style={{...styles.card,border:'2px solid #fecaca'}}>
              <h3 style={{...styles.cardTitre,color:'#dc2626'}}>⚠️ Zone de danger</h3>
              <p style={{color:'#64748b',fontSize:14,marginBottom:24,lineHeight:1.6}}>
                Cette action supprime <b>définitivement et irréversiblement</b> toutes les données :
                élèves, classes, professeurs, notes, branches, emploi du temps, présences, comptabilité, calendrier, etc.<br/>
                <b>Les comptes administrateurs sont conservés.</b>
              </p>

              {resetMsg && (
                <div style={{padding:'12px 16px',borderRadius:8,marginBottom:20,fontWeight:600,fontSize:14,
                  background:resetMsg.startsWith('✅')?'#d1fae5':'#fee2e2',
                  color:resetMsg.startsWith('✅')?'#065f46':'#991b1b'}}>
                  {resetMsg}
                </div>
              )}

              {resetEtape === 0 && (
                <button onClick={() => setResetEtape(1)}
                  style={{padding:'12px 24px',background:'#dc2626',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700,fontSize:14}}>
                  🗑️ Réinitialiser toutes les données
                </button>
              )}

              {resetEtape === 1 && (
                <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:20}}>
                  <p style={{fontWeight:700,color:'#dc2626',marginBottom:16}}>⚠️ Première confirmation — Êtes-vous sûr ?</p>
                  <p style={{fontSize:13,color:'#64748b',marginBottom:16}}>Cette action est irréversible. Toutes les données seront perdues.</p>
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={() => setResetEtape(0)} style={{padding:'10px 20px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontWeight:600}}>Annuler</button>
                    <button onClick={() => setResetEtape(2)} style={{padding:'10px 20px',background:'#dc2626',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700}}>Oui, continuer</button>
                  </div>
                </div>
              )}

              {resetEtape === 2 && (
                <div style={{background:'#fef2f2',border:'2px solid #dc2626',borderRadius:10,padding:20}}>
                  <p style={{fontWeight:800,color:'#dc2626',marginBottom:16,fontSize:15}}>🚨 Dernière confirmation — Cette action est irréversible !</p>
                  <p style={{fontSize:13,color:'#64748b',marginBottom:16}}>Toutes les données seront <b>définitivement supprimées</b>. Confirmez une dernière fois.</p>
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={() => setResetEtape(0)} style={{padding:'10px 20px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontWeight:600}}>Annuler</button>
                    <button onClick={handleReset} style={{padding:'10px 20px',background:'#991b1b',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:800}}>⚠️ SUPPRIMER TOUTES LES DONNÉES</button>
                  </div>
                </div>
              )}

              {resetEtape === 3 && (
                <div style={{padding:20,textAlign:'center',color:'#dc2626',fontWeight:700}}>⏳ Suppression en cours...</div>
              )}

              {resetEtape === 4 && (
                <button onClick={() => { setResetEtape(0); setResetMsg(''); }} style={{padding:'10px 20px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer',fontWeight:600,marginTop:10}}>
                  Réinitialiser
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Zone de danger ajoutée dans Parametres.js');
console.log('   ✔ Double confirmation obligatoire');
console.log('   ✔ Supprime toutes les tables sauf admin');