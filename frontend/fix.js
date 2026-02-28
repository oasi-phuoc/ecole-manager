const fs = require('fs');
let c = fs.readFileSync('./src/pages/Classes.js', 'utf8');

// Ajouter fonction impression PDF
c = c.replace(
  `  const tauxPresence = (eleve) => {`,
  `  const imprimerPDF = () => {
    const win = window.open('', '_blank');
    const rows = elevesClasse.map(el => \`
      <tr>
        <td style="text-align:center;padding:8px">
          \${el.photo
            ? \`<img src="\${el.photo}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0"/>\`
            : \`<div style="width:48px;height:48px;border-radius:50%;background:#e0e7ff;display:inline-flex;align-items:center;justify-content:center;font-size:18px;color:#6366f1;font-weight:700">\${(el.prenom||'?')[0]}</div>\`
          }
        </td>
        <td style="padding:8px;font-weight:700">\${el.nom||'—'}</td>
        <td style="padding:8px">\${el.prenom||'—'}</td>
        <td style="padding:8px">\${el.nom_parent||el.personne_contact||'—'}</td>
        <td style="padding:8px;text-align:center"><span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:99px;font-size:11px">\${el.nb_absences||0}</span></td>
        <td style="padding:8px;text-align:center"><span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:99px;font-size:11px">\${tauxPresence(el)}%</span></td>
      </tr>
    \`).join('');

    win.document.write(\`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Liste - \${detailClasse.nom}</title>
        <style>
          body { font-family: 'Century Gothic', sans-serif; padding: 32px; color: #1e293b; }
          h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
          .sub { font-size: 13px; color: #64748b; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f8fafc; padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          td { border-bottom: 1px solid #f1f5f9; vertical-align: middle; font-size: 13px; }
          .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: right; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>
        <h1>🏫 \${detailClasse.nom} — Liste des élèves</h1>
        <div class="sub">
          \${detailClasse.annee_scolaire ? 'Année : ' + detailClasse.annee_scolaire + ' · ' : ''}
          \${detailClasse.prof_prenom ? 'Titulaire : ' + detailClasse.prof_prenom + ' ' + detailClasse.prof_nom + ' · ' : ''}
          \${elevesClasse.length} élève(s)
        </div>
        <table>
          <thead>
            <tr>
              <th>Photo</th><th>Nom</th><th>Prénom</th><th>Contact</th><th>Absences</th><th>Présence</th>
            </tr>
          </thead>
          <tbody>\${rows}</tbody>
        </table>
        <div class="footer">Imprimé le \${new Date().toLocaleDateString('fr-CH')} · École Manager</div>
      </body>
      </html>
    \`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const tauxPresence = (eleve) => {`
);

// Ajouter bouton imprimer dans la vue liste élèves
c = c.replace(
  `      <div style={s.statsBar}>
        <span style={s.statChip}><b>{elevesClasse.length}</b> élèves</span>
      </div>`,
  `      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <span style={s.statChip}><b>{elevesClasse.length}</b> élèves</span>
        <button style={{...s.btnAdd,background:'#6366f1',display:'flex',alignItems:'center',gap:6}} onClick={imprimerPDF}>
          🖨️ Imprimer PDF
        </button>
      </div>`
);

fs.writeFileSync('./src/pages/Classes.js', c);
console.log('Classes PDF OK !');