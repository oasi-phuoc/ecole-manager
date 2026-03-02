const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Classes.js');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
  `<div style={s.field}><label style={s.lbl}>Niveau</label><input style={s.inp} type="text" required value={form.niveau}`,
  `<div style={s.field}><label style={s.lbl}>Niveau *</label><input style={s.inp} type="text" required value={form.niveau}`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Frontend : label Niveau avec *');