const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Presences.js');
let code = fs.readFileSync(filePath, 'utf8');

// ── 1. Ajouter import xlsx en haut du fichier ──
code = code.replace(
  `import { peutModifierPresences } from '../utils/permissions';`,
  `import { peutModifierPresences } from '../utils/permissions';
import * as XLSX from 'xlsx';`
);

// ── 2. Ajouter state exportLoading ──
code = code.replace(
  `  const [loadingApercu, setLoadingApercu] = useState(false);`,
  `  const [loadingApercu, setLoadingApercu] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);`
);

// ── 3. Ajouter la fonction exporterOASI ──
code = code.replace(
  `  const chargerApercuMois = async () => {`,
  `  const JOURS_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const STATUT_OASI = { 'P':'01 Présent', 'R':'02 Retard', 'A':'03 Absent', 'E':'04 Excusé', 'C':'05 Congé' };

  const exporterOASI = async () => {
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
  };

  const chargerApercuMois = async () => {`
);

// ── 4. Ajouter le bouton export à droite des onglets ──
code = code.replace(
  `      {[['saisie','📋 Saisie'],['apercu','📆 Aperçu du mois'],['stats','📊 Statistiques']].map(([k,l]) => (
          <button key={k} style={{padding:'9px 20px',borderRadius:9,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,background:onglet===k?'#6366f1':'white',color:onglet===k?'white':'#64748b',boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}} onClick={() => { setOnglet(k); if(k==='apercu') chargerApercuMois(); }}>{l}</button>
        ))}`,
  `      <div style={{display:'flex',gap:10,alignItems:'center',flex:1}}>
        {[['saisie','📋 Saisie'],['apercu','📆 Aperçu du mois'],['stats','📊 Statistiques']].map(([k,l]) => (
          <button key={k} style={{padding:'9px 20px',borderRadius:9,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,background:onglet===k?'#6366f1':'white',color:onglet===k?'white':'#64748b',boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}} onClick={() => { setOnglet(k); if(k==='apercu') chargerApercuMois(); }}>{l}</button>
        ))}
        <button onClick={exporterOASI} disabled={exportLoading} style={{marginLeft:'auto',padding:'9px 20px',borderRadius:9,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,background:'#10b981',color:'white',boxShadow:'0 1px 3px rgba(0,0,0,0.08)',opacity:exportLoading?0.7:1}}>
          {exportLoading ? '⏳ Export...' : '⬇️ Export OASI'}
        </button>
      </div>`
);

// ── 5. Corriger le style du wrapper onglets ──
code = code.replace(
  `      <div style={{display:'flex',gap:10,marginBottom:20}}>`,
  `      <div style={{display:'flex',gap:10,marginBottom:20,alignItems:'center'}}>`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Export OASI ajouté dans Presences.js');
console.log('   ✔ Bouton ⬇️ Export OASI à droite des onglets');
console.log('   ✔ Colonnes A à V format OASI');
console.log('   ✔ 1 ligne par jour par élève (hors weekend/vacances)');
console.log('');
console.log('⚠️  Lancer: npm install xlsx');