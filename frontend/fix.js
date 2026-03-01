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
      setResetMsg('❌ Erreur : ' + (err.response?.data?.message || err.message));
    }`,
  `      setResetEtape(3);
    try {
      await axios.delete(API + '/parametres/reset-tout', { headers });
      setResetEtape(4);
      setResetMsg('✅ Toutes les données ont été supprimées.');
    } catch (err) {
      setResetEtape(0);
      const detail = err.response?.data?.erreur || err.response?.data?.message || err.message;
      setResetMsg('❌ Erreur : ' + detail);
    }`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Affichage erreur détaillée dans le frontend');