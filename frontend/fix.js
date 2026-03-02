const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Professeurs.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Mot de passe non obligatoire à la création
code = code.replace(
  `<input style={s.inp} type="password" required={!profEdit} value={form.mot_de_passe} onChange={e=>setForm({...form,mot_de_passe:e.target.value})} placeholder={profEdit?'Laisser vide pour ne pas changer':'••••••••'} />`,
  `<input style={s.inp} type="password" autoComplete="new-password" value={form.mot_de_passe} onChange={e=>setForm({...form,mot_de_passe:e.target.value})} placeholder="Laisser vide pour générer automatiquement" />`
);

// 2. autocomplete off sur email
code = code.replace(
  `<input style={s.inp} type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="prof@ecole.ch" />`,
  `<input style={s.inp} type="email" required autoComplete="off" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="prof@ecole.ch" />`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Mdp non obligatoire + autocomplete désactivé');