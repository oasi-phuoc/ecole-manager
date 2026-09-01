import { createPool, json } from "../auth-fast-shared.ts";
import { loadUser, parseJsonBody, requireAuth } from "./middleware.ts";

async function callGemini(systemPrompt: string, message: string): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY non configurée");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
        }),
        signal: controller.signal,
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini HTTP ${res.status}: ${errText}`);
    }

    return (await res.json()) as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function handleChatbotRoute(
  req: Request,
  path: string,
  cors: Record<string, string>,
): Promise<Response> {
  if (path !== "/chatbot" || req.method !== "POST") {
    return json(cors, { message: "Route non trouvée" }, 404);
  }

  const user = await loadUser(req);
  const authErr = requireAuth(user, cors, path);
  if (authErr) return authErr;

  const pool = createPool();
  try {
    const body = await parseJsonBody(req);
    const { message } = body;
    if (!message || !String(message).trim()) {
      return json(cors, { message: "Message vide" }, 400);
    }

    const isAdmin = user!.role === "admin";
    const profId = user!.id;
    let context = "";

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
      context += "\n## Élèves:\n";
      for (const e of elevesRes.rows) {
        const ddn = e.date_naissance
          ? new Date(e.date_naissance).toLocaleDateString("fr-CH")
          : "inconnue";
        context += `- ${e.prenom} ${e.nom} | Classe: ${e.classe || "aucune"} | Né(e): ${ddn} | Statut: ${e.statut}\n`;
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const presRes = await pool.query(
      `
      SELECT u.nom, u.prenom,
        c.nom as classe, pv.p1, pv.p2, pv.p3, pv.p4
      FROM presences_v2 pv
      JOIN eleves e ON e.id = pv.eleve_id
      LEFT JOIN utilisateurs u ON u.id = e.utilisateur_id
      LEFT JOIN classes c ON c.id = e.classe_id
      WHERE pv.date = $1
      LIMIT 200
    `,
      [today],
    );
    if (presRes.rows.length > 0) {
      context += `\n## Présences aujourd'hui (${today}):\n`;
      for (const p of presRes.rows) {
        const statut = p.p1 || p.p2 || p.p3 || p.p4 || "présent";
        context += `- ${p.prenom} ${p.nom} (${p.classe || "?"}): ${statut}\n`;
      }
    }

    const classesRes = await pool.query("SELECT nom, niveau FROM classes ORDER BY nom LIMIT 50");
    if (classesRes.rows.length > 0) {
      context += "\n## Classes:\n";
      for (const c of classesRes.rows) {
        context += `- ${c.nom} (${c.niveau || ""})\n`;
      }
    }

    if (isAdmin) {
      const profsRes = await pool.query(
        `SELECT nom, prenom, email, telephone FROM utilisateurs WHERE role='prof' ORDER BY nom LIMIT 50`,
      );
      if (profsRes.rows.length > 0) {
        context += "\n## Professeurs:\n";
        for (const p of profsRes.rows) {
          context += `- ${p.prenom} ${p.nom} | ${p.email || ""} | ${p.telephone || ""}\n`;
        }
      }
    }

    const notesRes = await pool.query(
      `
      SELECT COALESCE(el.nom, u.nom) as eleve_nom, COALESCE(el.prenom, u.prenom) as eleve_prenom,
        m.nom as matiere, c.nom as classe, n.valeur, n.absent, n.dispense, ev.nom as eval_nom
      FROM notes n
      JOIN evaluations ev ON ev.id = n.evaluation_id
      JOIN eleves el ON el.id = n.eleve_id
      LEFT JOIN utilisateurs u ON u.id = el.utilisateur_id
      LEFT JOIN classes c ON c.id = el.classe_id
      LEFT JOIN matieres m ON m.id = ev.matiere_id
      ${!isAdmin ? "WHERE ev.prof_id = $1" : ""}
      ORDER BY n.created_at DESC LIMIT 300
    `,
      !isAdmin ? [profId] : [],
    );
    if (notesRes.rows.length > 0) {
      context += "\n## Notes récentes:\n";
      for (const n of notesRes.rows) {
        const val = n.absent ? "ABS" : n.dispense ? "DISP" : n.valeur != null ? n.valeur : "—";
        context += `- ${n.eleve_prenom} ${n.eleve_nom} (${n.classe || "?"}) | ${n.matiere || "?"} | ${n.eval_nom}: ${val}\n`;
      }
    }

    const calRes = await pool.query(
      `SELECT titre, date_debut, type FROM calendrier WHERE date_debut >= CURRENT_DATE ORDER BY date_debut LIMIT 20`,
    );
    if (calRes.rows.length > 0) {
      context += "\n## Prochains événements:\n";
      for (const ev of calRes.rows) {
        context += `- ${new Date(ev.date_debut).toLocaleDateString("fr-CH")} | ${ev.titre} (${ev.type || ""})\n`;
      }
    }

    const today_fr = new Date().toLocaleDateString("fr-CH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const systemPrompt = `Tu es un assistant pour une école de formation pour migrants en Suisse (Le Botza, Vétroz). Tu réponds en français, de façon concise et précise. Tu as accès aux données de l'école ci-dessous. L'utilisateur est un ${isAdmin ? "administrateur" : "professeur"}.

Date d'aujourd'hui: ${today_fr}

DONNÉES DE L'ÉCOLE:
${context}

Réponds uniquement à partir de ces données. Si l'information n'est pas disponible, dis-le clairement.`;

    const geminiData = await callGemini(systemPrompt, String(message));

    const error = geminiData.error as { message?: string } | undefined;
    if (error) throw new Error(error.message || "Gemini error");

    const candidates = geminiData.candidates as
      | Array<{ content?: { parts?: Array<{ text?: string }> } }>
      | undefined;
    const answer =
      candidates?.[0]?.content?.parts?.[0]?.text ||
      "Désolé, je n'ai pas pu générer une réponse.";

    return json(cors, { answer });
  } catch (err) {
    console.error("chatbot-fast error:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json(cors, { message: "Erreur chatbot: " + msg }, 500);
  } finally {
    await pool.end();
  }
}
