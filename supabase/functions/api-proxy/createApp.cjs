const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const auth = require('./vendor/ecole-backend/src/routes/auth');
const eleves = require('./vendor/ecole-backend/src/routes/eleves');
const profs = require('./vendor/ecole-backend/src/routes/profs');
const employesAdministratifs = require('./vendor/ecole-backend/src/routes/employesAdministratifs');
const classes = require('./vendor/ecole-backend/src/routes/classes');
const branches = require('./vendor/ecole-backend/src/routes/branches');
const emploiDuTemps = require('./vendor/ecole-backend/src/routes/emploiDuTemps');
const presences = require('./vendor/ecole-backend/src/routes/presences');
const notes = require('./vendor/ecole-backend/src/routes/notes');
const calendrier = require('./vendor/ecole-backend/src/routes/calendrier');
const parametres = require('./vendor/ecole-backend/src/routes/parametres');
const comptabilite = require('./vendor/ecole-backend/src/routes/comptabilite');
const statistiques = require('./vendor/ecole-backend/src/routes/statistiques');
const importRoutes = require('./vendor/ecole-backend/src/routes/import');
const planClasse = require('./vendor/ecole-backend/src/routes/planClasse');
const observations = require('./vendor/ecole-backend/src/routes/observations');
const planning = require('./vendor/ecole-backend/src/routes/planning');
const documentsAdministratifs = require('./vendor/ecole-backend/src/routes/documentsAdministratifs');
const inventaireBranches = require('./vendor/ecole-backend/src/routes/inventaireBranches');
const tcfState = require('./vendor/ecole-backend/src/routes/tcfState');
const notesPersonnelles = require('./vendor/ecole-backend/src/routes/notesPersonnelles');
const chatbot = require('./vendor/ecole-backend/src/routes/chatbot');
const donnees = require('./vendor/ecole-backend/src/routes/donnees');
const enclassements = require('./vendor/ecole-backend/src/routes/enclassements');
const devoirs = require('./vendor/ecole-backend/src/routes/devoirs');
const sorties = require('./vendor/ecole-backend/src/routes/sorties');
const visiteClasses = require('./vendor/ecole-backend/src/routes/visiteClasses');
const sondages = require('./vendor/ecole-backend/src/routes/sondages');

function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-client-info'],
  }));

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  app.get('/healthz', (req, res) => {
    res.status(200).json({ ok: true, service: 'ecole-manager-api-proxy' });
  });

  app.use('/auth', auth);
  app.use('/eleves', eleves);
  app.use('/profs', profs);
  app.use('/employes-administratifs', employesAdministratifs);
  app.use('/classes', classes);
  app.use('/branches', branches);
  app.use('/emploi-du-temps', emploiDuTemps);
  app.use('/presences', presences);
  app.use('/notes', notes);
  app.use('/calendrier', calendrier);
  app.use('/parametres', parametres);
  app.use('/comptabilite', comptabilite);
  app.use('/statistiques', statistiques);
  app.use('/import', importRoutes);
  app.use('/plan-classe', planClasse);
  app.use('/observations', observations);
  app.use('/planning', planning);
  app.use('/documents-administratifs', documentsAdministratifs);
  app.use('/inventaire-branches', inventaireBranches);
  app.use('/tcf-state', tcfState);
  app.use('/notes-personnelles', notesPersonnelles);
  app.use('/chatbot', chatbot);
  app.use('/donnees', donnees);
  app.use('/enclassements', enclassements);
  app.use('/devoirs', devoirs);
  app.use('/sorties', sorties);
  app.use('/visites-classes', visiteClasses);
  app.use('/sondages', sondages);

  app.use((err, req, res, next) => {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  });

  return app;
}

module.exports = { createApp };
