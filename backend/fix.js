const fs = require('fs');
let s = fs.readFileSync('./server.js', 'utf8');
if (!s.includes('/api/planning')) {
  s = s.replace(
    "app.get('/', ",
    "app.use('/api/planning', require('./src/routes/planning'));\n\napp.get('/', "
  );
  fs.writeFileSync('./server.js', s);
  console.log('server.js mis a jour !');
} else {
  console.log('Deja present !');
}