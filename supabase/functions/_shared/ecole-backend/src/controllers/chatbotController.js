const pool = require('../config/database');
const https = require('https');

const chatbot = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ message: 'Message vide' });

    const isAdmin = req.user?.role === 'admin';
    const profId = req.user?.id;

    // Build context from DB
    let context = '';

    // Students
    const elevesRes = await pool.query(`
      SELECT u.nom, u.prenom,
        e.date_naissance, c.nom as classe, COALESCE(e.statut,'actif') as statut
      FROM eleves e
      LEFT JOIN utilisateurs u ON u.id = e.utilisateur_id
      LEFT JOIN classes c ON c.id = e.classe_id
      ORDER BY c.nom, u.nom, u.prenom
      LIMIT 200
    `);
    if (elevesRes.rows.length > 0) {
      context += '\n## Élèves:\n';
      elevesRes.rows.forEach(e => {
        const ddn = e.date_naissance ? new Date(e.date_naissance).toLocaleDateString('fr-CH') : 'inconnue';
        context += `- ${e.prenom} ${e.nom} | Classe: ${e.classe || 'aucune'} | Né(e): ${ddn} | Statut: ${e.statut}\n`;
      });
    }

    // Today's presences
    const today = new Date().toISOString().split('T')[0];
    const presRes = await pool.query(`
      SELECT u.nom, u.prenom,
        c.nom as classe, pv.p1, pv.p2, pv.p3, pv.p4
      FROM presences_v2 pv
      JOIN eleves e ON e.id = pv.eleve_id
      LEFT JOIN utilisateurs u ON u.id = e.utilisateur_id
      LEFT JOIN classes c ON c.id = e.classe_id
      WHERE pv.date = $1
      LIMIT 200
    `, [today]);
    if (presRes.rows.length > 0) {
      context += `\n## Présences aujourd'hui (${today}):\n`;
      presRes.rows.forEach(p => {
        const statut = p.p1 || p.p2 || p.p3 || p.p4 || 'présent';
        context += `- ${p.prenom} ${p.nom} (${p.classe || '?'}): ${statut}\n`;
      });
    }

    // Classes
    const classesRes = await pool.query('SELECT nom, niveau FROM classes ORDER BY nom LIMIT 50');
    if (classesRes.rows.length > 0) {
      context += '\n## Classes:\n';
      classesRes.rows.forEach(c => { context += `- ${c.nom} (${c.niveau || ''})\n`; });
    }

    // Professors (admin only)
    if (isAdmin) {
      const profsRes = await pool.query(`SELECT nom, prenom, email, telephone FROM utilisateurs WHERE role='prof' ORDER BY nom LIMIT 50`);
      if (profsRes.rows.length > 0) {
        context += '\n## Professeurs:\n';
        profsRes.rows.forEach(p => { context += `- ${p.prenom} ${p.nom} | ${p.email || ''} | ${p.telephone || ''}\n`; });
      }
    }

    // Recent grades per student
    const notesRes = await pool.query(`
      SELECT COALESCE(el.nom, u.nom) as eleve_nom, COALESCE(el.prenom, u.prenom) as eleve_prenom,
        m.nom as matiere, c.nom as classe, n.valeur, n.absent, n.dispense, ev.nom as eval_nom
      FROM notes n
      JOIN evaluations ev ON ev.id = n.evaluation_id
      JOIN eleves el ON el.id = n.eleve_id
      LEFT JOIN utilisateurs u ON u.id = el.utilisateur_id
      LEFT JOIN classes c ON c.id = el.classe_id
      LEFT JOIN matieres m ON m.id = ev.matiere_id
      ${!isAdmin ? 'WHERE ev.prof_id = $1' : ''}
      ORDER BY n.created_at DESC LIMIT 300
    `, !isAdmin ? [profId] : []);
    if (notesRes.rows.length > 0) {
      context += '\n## Notes récentes:\n';
      notesRes.rows.forEach(n => {
        const val = n.absent ? 'ABS' : n.dispense ? 'DISP' : (n.valeur != null ? n.valeur : '—');
        context += `- ${n.eleve_prenom} ${n.eleve_nom} (${n.classe || '?'}) | ${n.matiere || '?'} | ${n.eval_nom}: ${val}\n`;
      });
    }

    // Calendar events (upcoming)
    const calRes = await pool.query(`SELECT titre, date_debut, type FROM calendrier WHERE date_debut >= CURRENT_DATE ORDER BY date_debut LIMIT 20`);
    if (calRes.rows.length > 0) {
      context += '\n## Prochains événements:\n';
      calRes.rows.forEach(ev => { context += `- ${new Date(ev.date_debut).toLocaleDateString('fr-CH')} | ${ev.titre} (${ev.type || ''})\n`; });
    }

    const today_fr = new Date().toLocaleDateString('fr-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const systemPrompt = `Tu es un assistant pour une école de formation pour migrants en Suisse (Le Botza, Vétroz). Tu réponds en français, de façon concise et précise. Tu as accès aux données de l'école ci-dessous. L'utilisateur est un ${isAdmin ? 'administrateur' : 'professeur'}.

Date d'aujourd'hui: ${today_fr}

DONNÉES DE L'ÉCOLE:
${context}

Réponds uniquement à partir de ces données. Si l'information n'est pas disponible, dis-le clairement.`;

    const geminiData = await new Promise((resolve, reject) => {
      const body = JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 512 }
      });
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      };
      const req2 = https.request(options, (r) => {
        let data = '';
        r.on('data', chunk => { data += chunk; });
        r.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      });
      req2.on('error', reject);
      req2.setTimeout(30000, () => { req2.destroy(); reject(new Error('Timeout')); });
      req2.write(body);
      req2.end();
    });

    if (geminiData.error) throw new Error(geminiData.error.message || 'Gemini error');
    const answer = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || 'Désolé, je n\'ai pas pu générer une réponse.';
    res.json({ answer });
  } catch (err) {
    console.error('Chatbot error:', err.message);
    res.status(500).json({ message: 'Erreur chatbot: ' + err.message });
  }
};

module.exports = { chatbot };
