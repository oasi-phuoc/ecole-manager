const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Presences.js');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
  `  const exporterOASI = async () => {
    if (!classeSelectionnee) { alert('Sélectionnez une classe d\\'abord'); return; }
    setExportLoading(true);
    try {
      const mois = date.substring(0, 7);
      const [annee, moisNum] = mois.split('-').map(Number);
      const nbJours = new Date(annee, moisNum, 0).getDate();
      const controle_du = mois + '-01';
      const controle_au = mois + '-' + String(nbJours).padStart(2,'0');

      const [elevesRes, presRes] = await Promise.all([
        axios.get(API + '/eleves/oasi?classe_id=' + classeSelectionnee, { headers }),
        axios.get(API + '/presences/mois?classe_id=' + classeSelectionnee + '&mois=' + mois, { headers }),
      ]);

      const eleves = elevesRes.data;
      const presences = presRes.data;

      const rows = [];

      // En-têtes colonnes A à V
      rows.push([
        'Prog. Nom', 'Encadrant', 'N°', 'Réf.', 'Pos.',
        'Nom Complet', 'Date Naiss.', 'Nationalité',
        'Date Présence', 'Jour Semaine', 'Période', 'Type',
        'Remarque', 'Contrôle Du', 'Contrôle Au',
        'Prog. Présences', 'Prog. Admin', 'AS',
        'Prg ID', 'Occupation ID', 'RA ID', 'Temps Réparti ID'
      ]);

      eleves.forEach(eleve => {
        for (let j = 1; j <= nbJours; j++) {
          const dateStr = annee + '-' + String(moisNum).padStart(2,'0') + '-' + String(j).padStart(2,'0');
          const jourIdx = new Date(dateStr + 'T12:00:00').getDay();

          // Ignorer weekends
          if (jourIdx === 0 || jourIdx === 6) continue;

          // Ignorer vacances
          const enVacance = evenementsCalendrier.some(ev => {
            const deb = ev.date_debut?.substring(0,10);
            const fin = (ev.date_fin||ev.date_debut)?.substring(0,10);
            return dateStr >= deb && dateStr <= fin;
          });
          if (enVacance) continue;

          // Horaire du jour pour cette classe
          const nomJour = JOURS_FR[jourIdx];
          const horaireJour = classeHoraires.find(h => h.jour === nomJour);
          const periode = horaireJour?.periode || null;
          if (!periode) continue; // Pas de cours ce jour

          // Présence
          const pr = presences.find(p =>
            String(p.eleve_id) === String(eleve.id) && p.date?.substring(0,10) === dateStr
          );

          // Première période non vide
          let statutBrut = '';
          if (pr) {
            for (let i = 1; i <= 8; i++) { if (pr['p'+i]) { statutBrut = pr['p'+i]; break; } }
          }
          const presenceType = STATUT_OASI[statutBrut] || '';
          const remarque = pr?.remarque || '';

          rows.push([
            eleve.oasi_prog_nom || '',
            eleve.oasi_encadrant || '',
            eleve.oasi_n || '',
            eleve.oasi_ref || '',
            eleve.oasi_pos || '',
            eleve.oasi_nom_complet || (eleve.nom + ' ' + eleve.prenom),
            eleve.oasi_nais || '',
            eleve.oasi_nationalite || '',
            dateStr,
            nomJour,
            periode,
            presenceType,
            remarque,
            controle_du,
            controle_au,
            eleve.oasi_prog_presences || '',
            eleve.oasi_prog_admin || '',
            eleve.oasi_as || '',
            eleve.oasi_prg_id || '',
            eleve.oasi_prg_occupation_id || '',
            eleve.oasi_ra_id || '',
            eleve.oasi_temps_reparti_id || '',
          ]);
        }
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Largeur colonnes
      ws['!cols'] = [
        {wch:18},{wch:18},{wch:6},{wch:6},{wch:6},
        {wch:22},{wch:12},{wch:14},
        {wch:14},{wch:12},{wch:12},{wch:14},
        {wch:20},{wch:12},{wch:12},
        {wch:14},{wch:14},{wch:8},
        {wch:10},{wch:14},{wch:8},{wch:16}
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Présences');
      const nomClasse = classes.find(c => String(c.id) === String(classeSelectionnee))?.nom || 'classe';
      XLSX.writeFile(wb, 'presences_' + nomClasse + '_' + mois + '.xlsx');
    } catch (err) {
      console.error(err);
      alert('Erreur export: ' + (err.response?.data?.message || err.message));
    }
    setExportLoading(false);
  };`,

  `  const fmtDate = (raw) => {
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d)) return raw;
    return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();
  };

  const exporterOASI = async () => {
    if (!classeSelectionnee) { alert('Sélectionnez une classe d\\'abord'); return; }
    setExportLoading(true);
    try {
      const mois = date.substring(0, 7);
      const [annee, moisNum] = mois.split('-').map(Number);
      const nbJours = new Date(annee, moisNum, 0).getDate();
      const controle_du = '01.' + String(moisNum).padStart(2,'0') + '.' + annee;
      const controle_au = String(nbJours).padStart(2,'0') + '.' + String(moisNum).padStart(2,'0') + '.' + annee;

      const [elevesRes, presRes] = await Promise.all([
        axios.get(API + '/eleves/oasi?classe_id=' + classeSelectionnee, { headers }),
        axios.get(API + '/presences/mois?classe_id=' + classeSelectionnee + '&mois=' + mois, { headers }),
      ]);

      const eleves = elevesRes.data;
      const presences = presRes.data;
      const rows = [];

      // En-têtes exactes pour import DB externe
      rows.push([
        'PROG_NOM','PROG_ENCADRANT','N','REF','POS',
        'NOM','NAIS','NATIONALITE',
        'PRESENCE_DATE','JOUR_SEMAINE','PRESENCE_PERIODE','PRESENCE_TYPE',
        'REMARQUE','CONTROLE_DU','CONTROLE_AU',
        'PROG_PRESENCES','PROG_ADMIN','AS',
        'PRG_ID','PRG_OCCUPATION_ID','RA_ID','TEMPS_REPARTI_ID'
      ]);

      eleves.forEach(eleve => {
        for (let j = 1; j <= nbJours; j++) {
          const dateStr = annee + '-' + String(moisNum).padStart(2,'0') + '-' + String(j).padStart(2,'0');
          const jourIdx = new Date(dateStr + 'T12:00:00').getDay();

          if (jourIdx === 0 || jourIdx === 6) continue;

          const enVacance = evenementsCalendrier.some(ev => {
            const deb = ev.date_debut?.substring(0,10);
            const fin = (ev.date_fin||ev.date_debut)?.substring(0,10);
            return dateStr >= deb && dateStr <= fin;
          });
          if (enVacance) continue;

          const nomJour = JOURS_FR[jourIdx];
          const horaireJour = classeHoraires.find(h => h.jour === nomJour);
          const periode = horaireJour?.periode || null;
          if (!periode) continue;

          const pr = presences.find(p =>
            String(p.eleve_id) === String(eleve.id) && p.date?.substring(0,10) === dateStr
          );

          // Première période active : P1-P4 = Matin, P5-P8 = Après-midi
          let statutBrut = '';
          let presencePeriode = periode;
          if (pr) {
            for (let i = 1; i <= 8; i++) {
              if (pr['p'+i]) {
                statutBrut = pr['p'+i];
                presencePeriode = i <= 4 ? 'Matin' : 'Après-midi';
                break;
              }
            }
          }

          const presenceDate = String(j).padStart(2,'0') + '.' + String(moisNum).padStart(2,'0') + '.' + annee;
          const presenceType = STATUT_OASI[statutBrut] || '';
          const remarque = pr?.remarque || '';

          rows.push([
            eleve.oasi_prog_nom || '',
            eleve.oasi_encadrant || '',
            eleve.oasi_n || '',
            eleve.oasi_ref || '',
            eleve.oasi_pos || '',
            eleve.oasi_nom_complet || (eleve.nom + ' ' + eleve.prenom),
            fmtDate(eleve.oasi_nais),
            eleve.oasi_nationalite || '',
            presenceDate,
            nomJour,
            presencePeriode,
            presenceType,
            remarque,
            controle_du,
            controle_au,
            eleve.oasi_prog_presences || '',
            eleve.oasi_prog_admin || '',
            eleve.oasi_as || '',
            eleve.oasi_prg_id || '',
            eleve.oasi_prg_occupation_id || '',
            eleve.oasi_ra_id || '',
            eleve.oasi_temps_reparti_id || '',
          ]);
        }
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        {wch:18},{wch:18},{wch:6},{wch:6},{wch:6},
        {wch:22},{wch:12},{wch:14},
        {wch:14},{wch:12},{wch:14},{wch:14},
        {wch:20},{wch:12},{wch:12},
        {wch:14},{wch:14},{wch:8},
        {wch:10},{wch:14},{wch:8},{wch:16}
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Présences');
      const nomClasse = classes.find(c => String(c.id) === String(classeSelectionnee))?.nom || 'classe';
      XLSX.writeFile(wb, 'presences_' + nomClasse + '_' + mois + '.xlsx');
    } catch (err) {
      console.error(err);
      alert('Erreur export: ' + (err.response?.data?.message || err.message));
    }
    setExportLoading(false);
  };`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Export OASI corrigé :');
console.log('   ✔ En-têtes exactes PROG_NOM, PROG_ENCADRANT...');
console.log('   ✔ Dates en DD.MM.YYYY');
console.log('   ✔ PRESENCE_PERIODE depuis la période active réelle');
console.log('   ✔ PROG_ENCADRANT correctement repris');