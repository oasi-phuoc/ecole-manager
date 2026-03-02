const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Professeurs.js');
let code = fs.readFileSync(filePath, 'utf8');

// Ajouter state emailEnvoi
code = code.replace(
  `  const [branchesDisponibles, setBranchesDisponibles] = useState([]);`,
  `  const [branchesDisponibles, setBranchesDisponibles] = useState([]);
  const [emailEnvoi, setEmailEnvoi] = useState({});`
);

// Ajouter fonction envoyerAcces
code = code.replace(
  `  const chargerBranchesNiveau = async (niveau) => {`,
  `  const envoyerAccesEmail = async (profId) => {
    setEmailEnvoi(prev => ({...prev, [profId]: 'loading'}));
    try {
      await axios.post(API+'/profs/'+profId+'/envoyer-acces', {}, {headers});
      setEmailEnvoi(prev => ({...prev, [profId]: 'ok'}));
      setTimeout(() => setEmailEnvoi(prev => ({...prev, [profId]: null})), 4000);
    } catch(err) {
      setEmailEnvoi(prev => ({...prev, [profId]: 'error'}));
      alert('Erreur: '+(err.response?.data?.erreur||err.message));
    }
  };

  const chargerBranchesNiveau = async (niveau) => {`
);

// Ajouter bouton dans le tableau après le bouton modifier
code = code.replace(
  `                    <button style={s.btnEdit} onClick={() => handleEdit(p)} title="Modifier">✏️</button>
                    <button style={s.btnDel} onClick={() => handleDelete(p.id)} title="Supprimer">🗑️</button>`,
  `                    <button style={s.btnEdit} onClick={() => handleEdit(p)} title="Modifier">✏️</button>
                    <button
                      onClick={() => envoyerAccesEmail(p.id)}
                      disabled={emailEnvoi[p.id]==='loading'}
                      title="Envoyer accès par email"
                      style={{background:'none',border:'none',cursor:'pointer',fontSize:15,marginRight:6,opacity:emailEnvoi[p.id]==='loading'?0.4:0.7}}>
                      {emailEnvoi[p.id]==='loading'?'⏳':emailEnvoi[p.id]==='ok'?'✅':'📧'}
                    </button>
                    <button style={s.btnDel} onClick={() => handleDelete(p.id)} title="Supprimer">🗑️</button>`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Bouton 📧 envoyer accès ajouté dans le tableau profs');