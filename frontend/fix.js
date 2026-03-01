const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Parametres.js');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
  `      setResetEtape(3);
    try {
      await axios.delete(API + '/parametres/reset-tout', { headers });
      setResetEtape(4);
      setResetMsg('✅ Toutes les données ont été supprimées.');
    } catch (err) {
      setResetEtape(0);
      const detail = err.response?.data?.erreur || err.response?.data?.message || err.message;
      setResetMsg('❌ Erreur : ' + detail);
    }`,
  `      setResetEtape(3);
    try {
      const res = await axios.delete(API + '/parametres/reset-tout', { headers });
      const data = res.data;
      if (data.erreurs && data.erreurs.length > 0) {
        setResetEtape(0);
        setResetMsg('⚠️ ' + data.message + ' : ' + data.erreurs.join(' | '));
      } else {
        setResetEtape(4);
        setResetMsg('✅ Toutes les données ont été supprimées. ' + (data.details?.length || 0) + ' tables vidées.');
      }
    } catch (err) {
      setResetEtape(0);
      setResetMsg('❌ Erreur réseau : ' + (err.response?.data?.message || err.message));
    }`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Frontend : affichage détail reset');