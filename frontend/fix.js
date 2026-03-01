const fs = require('fs');
let c = fs.readFileSync('./src/pages/Classes.js', 'utf8');

c = c.replace(
  `<label style={s.lbl}>Niveau</label>
                  <input style={s.inp}`,
  `<label style={s.lbl}>Niveau *</label>
                  <input style={{...s.inp}} required`
);

fs.writeFileSync('./src/pages/Classes.js', c);
console.log('Classes niveau obligatoire OK !');