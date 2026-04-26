const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const envOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://ecole-manager-frontend.onrender.com',
  'https://ecole-manager.onrender.com',
];
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (envOrigins.length === 0) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    try {
      const host = new URL(origin).hostname;
      if (host === 'localhost' || host === '127.0.0.1') return cb(null, true);
      if (host.endsWith('.onrender.com')) return cb(null, true);
      if (host.endsWith('.vercel.app')) return cb(null, true);
    } catch {}
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
const cspConnectSrc = ["'self'", ...allowedOrigins];
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: cspConnectSrc,
      upgradeInsecureRequests: [],
    },
  },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health-check léger pour monitorings externes (UptimeRobot, etc.)
app.get('/healthz', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'ecole-manager-backend',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
app.get('/api/healthz', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'ecole-manager-backend',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase().split(',')[0].trim();
    if (req.secure || proto === 'https') return next();
    return res.status(426).json({ message: 'HTTPS requis' });
  });
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de requetes, veuillez reessayer plus tard.' },
});
app.use('/api', apiLimiter);

const initDB = require('./src/config/initDB');
initDB();

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/eleves', require('./src/routes/eleves'));
app.use('/api/profs', require('./src/routes/profs'));
app.use('/api/employes-administratifs', require('./src/routes/employesAdministratifs'));
app.use('/api/classes', require('./src/routes/classes'));
app.use('/api/branches', require('./src/routes/branches'));
app.use('/api/emploi-du-temps', require('./src/routes/emploiDuTemps'));
app.use('/api/presences', require('./src/routes/presences'));
app.use('/api/notes', require('./src/routes/notes'));
app.use('/api/calendrier', require('./src/routes/calendrier'));
app.use('/api/parametres', require('./src/routes/parametres'));
app.use('/api/comptabilite', require('./src/routes/comptabilite'));
app.use('/api/statistiques', require('./src/routes/statistiques'));

app.use('/api/import', require('./src/routes/import'));
app.use('/api/plan-classe', require('./src/routes/planClasse'));
app.use('/api/observations', require('./src/routes/observations'));
app.use('/api/planning', require('./src/routes/planning'));
app.use('/api/documents-administratifs', require('./src/routes/documentsAdministratifs'));
app.use('/api/inventaire-branches', require('./src/routes/inventaireBranches'));
app.use('/api/tcf-state', require('./src/routes/tcfState'));
app.use('/api/notes-personnelles', require('./src/routes/notesPersonnelles'));
app.use('/api/chatbot', require('./src/routes/chatbot'));
app.use('/api/donnees', require('./src/routes/donnees'));
app.use('/api/enclassements', require('./src/routes/enclassements'));
app.use('/api/devoirs', require('./src/routes/devoirs'));
app.use('/api/sorties', require('./src/routes/sorties'));
app.use('/api/visites-classes', require('./src/routes/visiteClasses'));
app.use('/api/sondages', require('./src/routes/sondages'));

app.get('/', (req, res) => {
  res.json({ message: 'Serveur Ecole Manager operationnel !' });
});

app.use((err, req, res, next) => {
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Origine non autorisee' });
  }
  return next(err);
});

app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({ message: 'Erreur serveur' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Serveur demarre sur http://localhost:' + PORT);
});