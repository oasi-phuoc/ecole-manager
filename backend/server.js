const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const initDB = require('./src/config/initDB');
initDB();

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/eleves', require('./src/routes/eleves'));
app.use('/api/profs', require('./src/routes/profs'));
app.use('/api/classes', require('./src/routes/classes'));
app.use('/api/branches', require('./src/routes/branches'));
app.use('/api/emploi-du-temps', require('./src/routes/emploiDuTemps'));
app.use('/api/presences', require('./src/routes/presences'));
app.use('/api/notes', require('./src/routes/notes'));
app.use('/api/calendrier', require('./src/routes/calendrier'));
app.use('/api/parametres', require('./src/routes/parametres'));
app.use('/api/comptabilite', require('./src/routes/comptabilite'));
app.use('/api/statistiques', require('./src/routes/statistiques'));

app.use('/api/plan-classe', require('./src/routes/planClasse'));
app.use('/api/observations', require('./src/routes/observations'));
app.use('/api/planning', require('./src/routes/planning'));

app.get('/', (req, res) => {
  res.json({ message: 'Serveur Ecole Manager operationnel !' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Serveur demarre sur http://localhost:' + PORT);
});