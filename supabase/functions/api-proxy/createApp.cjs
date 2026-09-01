const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const backendRoot = path.join(__dirname, '..', '_shared', 'ecole-backend', 'src');

function loadRoute(routePath) {
  return require(path.join(backendRoot, 'routes', routePath));
}

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

  app.use('/auth', loadRoute('auth'));
  app.use('/eleves', loadRoute('eleves'));
  app.use('/profs', loadRoute('profs'));
  app.use('/employes-administratifs', loadRoute('employesAdministratifs'));
  app.use('/classes', loadRoute('classes'));
  app.use('/branches', loadRoute('branches'));
  app.use('/emploi-du-temps', loadRoute('emploiDuTemps'));
  app.use('/presences', loadRoute('presences'));
  app.use('/notes', loadRoute('notes'));
  app.use('/calendrier', loadRoute('calendrier'));
  app.use('/parametres', loadRoute('parametres'));
  app.use('/comptabilite', loadRoute('comptabilite'));
  app.use('/statistiques', loadRoute('statistiques'));
  app.use('/import', loadRoute('import'));
  app.use('/plan-classe', loadRoute('planClasse'));
  app.use('/observations', loadRoute('observations'));
  app.use('/planning', loadRoute('planning'));
  app.use('/documents-administratifs', loadRoute('documentsAdministratifs'));
  app.use('/inventaire-branches', loadRoute('inventaireBranches'));
  app.use('/tcf-state', loadRoute('tcfState'));
  app.use('/notes-personnelles', loadRoute('notesPersonnelles'));
  app.use('/chatbot', loadRoute('chatbot'));
  app.use('/donnees', loadRoute('donnees'));
  app.use('/enclassements', loadRoute('enclassements'));
  app.use('/devoirs', loadRoute('devoirs'));
  app.use('/sorties', loadRoute('sorties'));
  app.use('/visites-classes', loadRoute('visiteClasses'));
  app.use('/sondages', loadRoute('sondages'));

  app.use((err, req, res, next) => {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  });

  return app;
}

module.exports = { createApp };
