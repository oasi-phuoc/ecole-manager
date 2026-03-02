const fs = require('fs');
const path = require('path');

// ── 1. Installer nodemailer via package.json ──
const pkgPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (!pkg.dependencies.nodemailer) {
  pkg.dependencies.nodemailer = '^6.9.0';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log('✅ nodemailer ajouté dans package.json');
} else {
  console.log('ℹ️ nodemailer déjà présent');
}

// ── 2. Ajouter route envoi email dans profsController.js ──
const controllerPath = path.join(__dirname, 'src', 'controllers', 'profsController.js');
let ctrl = fs.readFileSync(controllerPath, 'utf8');

if (!ctrl.includes('envoyerAcces')) {
  ctrl = ctrl.replace(
    `module.exports = { getProfs, getProf, creerProf, modifierProf, supprimerProf };`,
    `const envoyerAcces = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT nom, prenom, email FROM utilisateurs WHERE id=$1 AND role=$2', [id, 'prof']);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Professeur non trouvé' });
    const prof = result.rows[0];

    // Générer mdp aléatoire
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    let mdp = '';
    for (let i = 0; i < 10; i++) mdp += chars[Math.floor(Math.random() * chars.length)];

    // Hasher et sauver
    const hash = await bcrypt.hash(mdp, 10);
    await pool.query('UPDATE utilisateurs SET mot_de_passe=$1, doit_changer_mdp=true WHERE id=$2', [hash, id]);

    // Envoyer email
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter({
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: { ciphers: 'SSLv3' }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: prof.email,
      subject: 'Vos accès École Manager',
      html: \`
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#f8fafc;border-radius:12px">
          <h2 style="color:#6366f1">🎓 École Manager</h2>
          <p>Bonjour <b>\${prof.prenom} \${prof.nom}</b>,</p>
          <p>Voici vos accès pour vous connecter à l'application :</p>
          <div style="background:white;padding:20px;border-radius:8px;border-left:4px solid #6366f1;margin:20px 0">
            <p style="margin:0"><b>Email :</b> \${prof.email}</p>
            <p style="margin:8px 0 0"><b>Mot de passe temporaire :</b> <code style="background:#e0e7ff;padding:4px 8px;border-radius:4px;font-size:16px">\${mdp}</code></p>
          </div>
          <p style="color:#ef4444;font-weight:bold">⚠️ Vous devrez changer ce mot de passe lors de votre première connexion.</p>
          <p style="color:#94a3b8;font-size:12px">Ce message a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
      \`
    });

    res.json({ message: 'Email envoyé à ' + prof.email });
  } catch (err) {
    res.status(500).json({ message: 'Erreur envoi email', erreur: err.message });
  }
};

module.exports = { getProfs, getProf, creerProf, modifierProf, supprimerProf, envoyerAcces };`
  );
  fs.writeFileSync(controllerPath, ctrl);
  console.log('✅ envoyerAcces ajouté dans profsController.js');
} else {
  console.log('ℹ️ envoyerAcces déjà présent');
}

// ── 3. Ajouter route dans profs.js ──
const routesPath = path.join(__dirname, 'src', 'routes', 'profs.js');
let routes = fs.readFileSync(routesPath, 'utf8');

if (!routes.includes('envoyer-acces')) {
  routes = routes.replace(
    'module.exports = router;',
    `router.post('/:id/envoyer-acces', autoriser('admin'), c.envoyerAcces);\nmodule.exports = router;`
  );
  fs.writeFileSync(routesPath, routes);
  console.log('✅ Route POST /profs/:id/envoyer-acces ajoutée');
} else {
  console.log('ℹ️ Route déjà présente');
}

// ── 4. Migration doit_changer_mdp ──
fs.writeFileSync(path.join(__dirname, 'migration_mdp.js'), `require('dotenv').config();
const pool = require('./src/config/database');
async function migrate() {
  try {
    await pool.query('ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS doit_changer_mdp BOOLEAN DEFAULT false');
    console.log('✅ Colonne doit_changer_mdp ajoutée');
    process.exit(0);
  } catch(err) { console.error('❌', err.message); process.exit(1); }
}
migrate();
`);
console.log('✅ migration_mdp.js créé');