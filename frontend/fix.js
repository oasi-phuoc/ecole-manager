const fs = require('fs');
let c = fs.readFileSync('./src/pages/Classes.js', 'utf8');

// Remplacer la fonction imprimerPDF
c = c.replace(
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
  };`,

  `  const [showTrombinoscope, setShowTrombinoscope] = useState(false);

  const imprimerTrombinoscope = () => {
    const cards = elevesClasse.map(el => \`
      <div style="display:flex;flex-direction:column;align-items:center;padding:16px;background:white;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
        \${el.photo
          ? \`<img src="\${el.photo}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #e0e7ff;margin-bottom:10px"/>\`
          : \`<div style="width:100px;height:100px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;color:#6366f1;margin-bottom:10px">\${(el.prenom||'?')[0]}</div>\`
        }
        <div style="font-weight:800;font-size:14px;color:#1e293b;text-align:center">\${el.prenom||''}</div>
        <div style="font-weight:600;font-size:13px;color:#475569;text-align:center">\${el.nom||''}</div>
      </div>
    \`).join('');

    const win = window.open('', '_blank');
    win.document.write(\`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Trombinoscope - \${detailClasse.nom}</title>
        <style>
          body { font-family: 'Century Gothic', sans-serif; padding: 32px; color: #1e293b; background: #f8fafc; }
          h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; color: #0f172a; }
          .sub { font-size: 13px; color: #64748b; margin-bottom: 28px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
          .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print {
            body { padding: 16px; background: white; }
            .no-print { display: none; }
            @page { margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <h1>📸 Trombinoscope — \${detailClasse.nom}</h1>
            <div class="sub">
              \${detailClasse.annee_scolaire ? detailClasse.annee_scolaire + ' · ' : ''}
              \${detailClasse.prof_prenom ? 'Titulaire : ' + detailClasse.prof_prenom + ' ' + detailClasse.prof_nom + ' · ' : ''}
              \${elevesClasse.length} élève(s)
            </div>
          </div>
          <button class="no-print" onclick="window.print()" style="padding:10px 20px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit">🖨️ Imprimer</button>
        </div>
        <div class="grid">\${cards}</div>
        <div class="footer">Généré le \${new Date().toLocaleDateString('fr-CH')} · École Manager</div>
      </body>
      </html>
    \`);
    win.document.close();
  };`
);

// Remplacer bouton "Imprimer PDF" par "Trombinoscope"
c = c.replace(
  `<button style={{...s.btnAdd,background:'#6366f1',display:'flex',alignItems:'center',gap:6}} onClick={imprimerPDF}>
          🖨️ Imprimer PDF
        </button>`,
  `<button style={{...s.btnAdd,background:'#6366f1',display:'flex',alignItems:'center',gap:6}} onClick={imprimerTrombinoscope}>
          📸 Trombinoscope
        </button>`
);

fs.writeFileSync('./src/pages/Classes.js', c);
console.log('Trombinoscope OK !');