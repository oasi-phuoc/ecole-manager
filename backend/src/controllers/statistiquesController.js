const pool = require('../config/database');

const getStatistiques = async (req, res) => {
  try {
    const safeQuery = async (sql, params = [], fallbackRows = []) => {
      try {
        return await pool.query(sql, params);
      } catch (err) {
        return { rows: fallbackRows };
      }
    };

    const isAdmin = req.user?.role === 'admin';
    let classesAffectees = [];
    if (!isAdmin) {
      const classesRes = await safeQuery(`
        SELECT DISTINCT classe_id
        FROM (
          SELECT c.id as classe_id FROM classes c WHERE c.prof_principal_id = $1
          UNION
          SELECT et.classe_id FROM emploi_du_temps et WHERE et.prof_id = $1
          UNION
          SELECT a.classe_id FROM affectations a WHERE a.prof_id = $1
          UNION
          SELECT pb.classe_id FROM planning_branches pb WHERE pb.prof_id = $1
        ) t
        WHERE classe_id IS NOT NULL
      `, [req.user.id]);
      classesAffectees = classesRes.rows.map(r => r.classe_id);
    }

    const nbEleves = await safeQuery("SELECT COUNT(*) FROM eleves WHERE statut='actif'", [], [{ count: 0 }]);
    const nbProfs = await safeQuery("SELECT COUNT(*) FROM utilisateurs WHERE role='prof'", [], [{ count: 0 }]);
    const nbClasses = await safeQuery("SELECT COUNT(*) FROM classes", [], [{ count: 0 }]);
    const nbBranches = await safeQuery("SELECT COUNT(*) FROM matieres", [], [{ count: 0 }]);

    const presencesAujourd = await safeQuery(`
      SELECT
        COUNT(CASE WHEN statut='present' THEN 1 END) as presents,
        COUNT(CASE WHEN statut='absent' THEN 1 END) as absents,
        COUNT(CASE WHEN statut='retard' THEN 1 END) as retards,
        COUNT(*) as total
      FROM presences WHERE date = CURRENT_DATE
    `, [], [{ presents: 0, absents: 0, retards: 0, total: 0 }]);

    const paiements = await safeQuery(`
      SELECT
        COALESCE(SUM(CASE WHEN statut='paye' THEN montant END), 0) as encaisse,
        COALESCE(SUM(CASE WHEN statut='en_attente' THEN montant END), 0) as en_attente,
        COALESCE(SUM(CASE WHEN statut='en_retard' THEN montant END), 0) as en_retard
      FROM paiements
    `, [], [{ encaisse: 0, en_attente: 0, en_retard: 0 }]);

    const moyennesParClasse = await safeQuery(`
      SELECT c.nom as classe,
        ROUND(AVG(n.valeur)::numeric, 2) as moyenne
      FROM notes n
      JOIN evaluations ev ON n.evaluation_id = ev.id
      JOIN classes c ON ev.classe_id = c.id
      WHERE n.absent = false AND n.dispense = false AND n.valeur IS NOT NULL
      GROUP BY c.nom
      ORDER BY c.nom
    `, [], []);

    const absencesParClasse = await safeQuery(`
      SELECT c.nom as classe,
        COUNT(CASE WHEN p.statut='absent' THEN 1 END) as absents,
        COUNT(p.id) as total
      FROM presences p
      JOIN eleves e ON p.eleve_id = e.id
      JOIN classes c ON e.classe_id = c.id
      GROUP BY c.nom
      ORDER BY c.nom
    `, [], []);

    const elevesParClasse = await safeQuery(`
      SELECT c.nom as classe, COUNT(e.id) as nb
      FROM classes c
      LEFT JOIN eleves e ON e.classe_id = c.id AND e.statut = 'actif'
      GROUP BY c.nom
      ORDER BY c.nom
    `, [], []);

    const prochainEvenements = await safeQuery(`
      SELECT titre, date_debut, type, couleur
      FROM calendrier
      WHERE date_debut >= CURRENT_DATE
      ORDER BY date_debut
      LIMIT 5
    `, [], []);

    const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const jourAuj = JOURS[new Date().getDay()];
    const creneauEnCoursRes = await safeQuery(`
      SELECT id, jour, heure_debut, heure_fin, periode, ordre
      FROM creneaux
      WHERE jour = $1 AND heure_debut <= CURRENT_TIME AND heure_fin >= CURRENT_TIME
      ORDER BY ordre
      LIMIT 1
    `, [jourAuj], []);

    let controlePresenceAujourdhui = {
      jour: jourAuj,
      creneau_en_cours: null,
      classes_en_cours: []
    };

    if (creneauEnCoursRes.rows.length > 0) {
      const creneau = creneauEnCoursRes.rows[0];
      const classesRes = await safeQuery(`
        SELECT DISTINCT c.id, c.nom
        FROM affectations a
        JOIN classes c ON c.id = a.classe_id
        WHERE a.creneau_id = $1
        ${isAdmin ? '' : 'AND a.prof_id = $2'}
        ORDER BY c.nom
      `, isAdmin ? [creneau.id] : [creneau.id, req.user.id], []);

      const classesEnCours = [];
      for (const cl of classesRes.rows) {
        const elevesRes = await safeQuery(`
          SELECT
            e.id,
            COALESCE(e.nom, u.nom) as nom,
            COALESCE(e.prenom, u.prenom) as prenom,
            pv.p1, pv.p2, pv.p3, pv.p4, pv.p5, pv.p6, pv.p7, pv.p8
          FROM eleves e
          LEFT JOIN utilisateurs u ON u.id = e.utilisateur_id
          LEFT JOIN presences_v2 pv ON pv.eleve_id = e.id AND pv.date = CURRENT_DATE
          WHERE e.classe_id = $1 AND LOWER(COALESCE(e.statut, 'actif')) = 'actif'
          ORDER BY COALESCE(e.nom, u.nom), COALESCE(e.prenom, u.prenom)
        `, [cl.id], []);

        const eleves = elevesRes.rows.map(el => {
          const statut = el.p1 || el.p2 || el.p3 || el.p4 || el.p5 || el.p6 || el.p7 || el.p8 || '';
          return { id: el.id, nom: el.nom, prenom: el.prenom, statut };
        });

        classesEnCours.push({
          id: cl.id,
          nom: cl.nom,
          eleves
        });
      }

      controlePresenceAujourdhui = {
        jour: jourAuj,
        creneau_en_cours: creneau,
        classes_en_cours: classesEnCours
      };
    }

    let dernieresNotes = [];
    if (isAdmin || classesAffectees.length > 0) {
      const params = [];
      let filtre = '';
      if (!isAdmin) {
        params.push(classesAffectees);
        filtre = ' AND ev.classe_id = ANY($1::int[])';
      }
      const notesRes = await safeQuery(`
        SELECT
          n.created_at,
          n.valeur,
          n.absent,
          n.dispense,
          ev.nom as evaluation_nom,
          m.nom as matiere,
          c.nom as classe,
          COALESCE(e.nom, ue.nom) as eleve_nom,
          COALESCE(e.prenom, ue.prenom) as eleve_prenom
        FROM notes n
        JOIN evaluations ev ON ev.id = n.evaluation_id
        LEFT JOIN matieres m ON m.id = ev.matiere_id
        LEFT JOIN classes c ON c.id = ev.classe_id
        JOIN eleves e ON e.id = n.eleve_id
        LEFT JOIN utilisateurs ue ON ue.id = e.utilisateur_id
        WHERE 1=1 ${filtre}
        ORDER BY n.created_at DESC
        LIMIT 3
      `, params, []);
      dernieresNotes = notesRes.rows;
    }

    let dernieresObservations = [];
    if (isAdmin || classesAffectees.length > 0) {
      const params = [];
      let filtre = '';
      if (!isAdmin) {
        params.push(classesAffectees);
        filtre = ' AND e.classe_id = ANY($1::int[])';
      }
      const obsRes = await safeQuery(`
        SELECT
          o.created_at,
          o.titre,
          o.contenu,
          c.nom as classe,
          COALESCE(e.nom, ue.nom) as eleve_nom,
          COALESCE(e.prenom, ue.prenom) as eleve_prenom
        FROM observations o
        JOIN eleves e ON e.id = o.eleve_id
        LEFT JOIN utilisateurs ue ON ue.id = e.utilisateur_id
        LEFT JOIN classes c ON c.id = e.classe_id
        WHERE 1=1 ${filtre}
        ORDER BY o.created_at DESC
        LIMIT 3
      `, params, []);
      dernieresObservations = obsRes.rows;
    }

    res.json({
      nb_eleves: parseInt(nbEleves.rows[0].count),
      nb_profs: parseInt(nbProfs.rows[0].count),
      nb_classes: parseInt(nbClasses.rows[0].count),
      nb_branches: parseInt(nbBranches.rows[0].count),
      presences_aujourd: presencesAujourd.rows[0],
      paiements: paiements.rows[0],
      moyennes_par_classe: moyennesParClasse.rows,
      absences_par_classe: absencesParClasse.rows,
      eleves_par_classe: elevesParClasse.rows,
      prochains_evenements: prochainEvenements.rows,
      prochain_evenement: prochainEvenements.rows[0] || null,
      dernieres_notes: dernieresNotes,
      dernieres_observations: dernieresObservations,
      controle_presence_aujourdhui: controlePresenceAujourdhui
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
};

module.exports = { getStatistiques };