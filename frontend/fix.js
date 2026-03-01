const fs = require('fs');
const FONT = "'Century Gothic', CenturyGothic, 'Apple Gothic', Futura, 'Trebuchet MS', sans-serif";

let p = fs.readFileSync('./src/pages/Professeurs.js', 'utf8');

// 1. Mise à jour des constantes
p = p.replace(
  `const CONTRATS = ['CDI','CDD','Temps partiel','Vacataire','Stagiaire'];`,
  `const CONTRATS = ['CDI','CDD','Remplaçant','Stagiaire','Civiliste','Autre'];`
);
p = p.replace(
  `const PERMIS = ['Citoyen CH','Permis C','Permis B','Permis L','Permis G','Autre'];`,
  `const PERMIS = ['Citoyen CH/UE','Permis C','Permis B','Permis L','Permis G','Frontalier','Autre'];`
);

// 2. Ajouter NIVEAUX et état branches après les constantes
p = p.replace(
  `const MAX_PERIODES = 32;`,
  `const MAX_PERIODES = 32;
const NIVEAUX = ['CSC','CFR','EPL'];`
);

// 3. Ajouter états niveau_prefere et branches_specialites dans le form state
p = p.replace(
  `specialite:'',adresse:'',npa:'',lieu:'',sexe:'',taux_activite:'',periodes_semaine:'',date_naissance:'',avs:'',type_contrat:'',type_permis:'' });`,
  `specialite:'',adresse:'',npa:'',lieu:'',sexe:'',taux_activite:'',periodes_semaine:'',date_naissance:'',avs:'',type_contrat:'',type_permis:'',niveau_prefere:'',branches_specialites:[] });
  const [branchesDisponibles, setBranchesDisponibles] = useState([]);`
);

// 4. Ajouter chargement branches selon niveau dans useEffect ou handleNiveauChange
p = p.replace(
  `  const navigate = useNavigate();`,
  `  const navigate = useNavigate();

  const chargerBranchesNiveau = async (niveau) => {
    if (!niveau) { setBranchesDisponibles([]); return; }
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(API+'/branches', { headers: { Authorization: 'Bearer ' + token } });
      setBranchesDisponibles(r.data.filter(b => b.niveau === niveau));
    } catch(err) { setBranchesDisponibles([]); }
  };`
);

// 5. Ajouter niveau_prefere et branches_specialites dans handleEdit
p = p.replace(
  `type_contrat: prof.type_contrat||'', type_permis: prof.type_permis||''`,
  `type_contrat: prof.type_contrat||'', type_permis: prof.type_permis||'',
      niveau_prefere: prof.niveau_prefere||'', branches_specialites: prof.branches_specialites ? JSON.parse(prof.branches_specialites) : []`
);

// 6. Ajouter dans handleSubmit
p = p.replace(
  `type_contrat: form.type_contrat, type_permis: form.type_permis`,
  `type_contrat: form.type_contrat, type_permis: form.type_permis,
        niveau_prefere: form.niveau_prefere, branches_specialites: JSON.stringify(form.branches_specialites)`
);

// 7. Trouver la section du formulaire modal et remplacer
const formStart = p.indexOf('<form onSubmit={handleSubmit}');
const formEnd = p.indexOf('</form>', formStart) + '</form>'.length;
const oldForm = p.substring(formStart, formEnd);

const newForm = `<form onSubmit={handleSubmit}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,alignItems:'start'}}>

                {/* COLONNE 1 - Connexion + Infos personnelles */}
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'#92400e',background:'#fef3c7',padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase'}}>🔐 Connexion</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Email *</label>
                      <input style={s.inp} type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="prof@ecole.ch" />
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>{profEdit?'Nouveau mot de passe':'Mot de passe *'}</label>
                      <input style={s.inp} type="password" required={!profEdit} value={form.mot_de_passe} onChange={e=>setForm({...form,mot_de_passe:e.target.value})} placeholder={profEdit?'Laisser vide pour ne pas changer':'••••••••'} />
                    </div>
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:'#1e40af',background:'#dbeafe',padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase'}}>👤 Informations personnelles</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>NOM *</label>
                      <input style={s.inp} required value={form.nom} onChange={e=>setForm({...form,nom:e.target.value.toUpperCase()})} placeholder="DUPONT" />
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Prénom *</label>
                      <input style={s.inp} required value={form.prenom} onChange={e=>setForm({...form,prenom:e.target.value})} placeholder="Jean" />
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Date de naissance</label>
                      <input style={s.inp} type="date" value={form.date_naissance} onChange={e=>setForm({...form,date_naissance:e.target.value})} />
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Sexe</label>
                      <select style={s.inp} value={form.sexe} onChange={e=>setForm({...form,sexe:e.target.value})}>
                        <option value="">--</option>
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Téléphone</label>
                      <input style={s.inp} value={form.telephone} onChange={e=>setForm({...form,telephone:e.target.value})} placeholder="079 123 45 67" />
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>N° AVS</label>
                      <input style={s.inp} value={form.avs} onChange={e=>setForm({...form,avs:e.target.value})} placeholder="756.XXXX.XXXX.XX" />
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gridColumn:'1/-1'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Adresse</label>
                      <input style={s.inp} value={form.adresse} onChange={e=>setForm({...form,adresse:e.target.value})} placeholder="Rue de la Paix 10" />
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>NPA</label>
                      <input style={s.inp} value={form.npa} onChange={e=>setForm({...form,npa:e.target.value})} placeholder="1950" />
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Lieu</label>
                      <input style={s.inp} value={form.lieu} onChange={e=>setForm({...form,lieu:e.target.value})} placeholder="Sion" />
                    </div>
                  </div>
                </div>

                {/* COLONNE 2 - Infos professionnelles */}
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'#065f46',background:'#d1fae5',padding:'5px 12px',borderRadius:6,marginBottom:12,textTransform:'uppercase'}}>💼 Informations professionnelles</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                      <div style={{display:'flex',flexDirection:'column'}}>
                        <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Taux d'activité (%)</label>
                        <input style={s.inp} type="number" min="0" max="200" value={form.taux_activite} onChange={e=>setForm({...form,taux_activite:e.target.value})} placeholder="100" />
                      </div>
                      <div style={{display:'flex',flexDirection:'column'}}>
                        <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Périodes / semaine</label>
                        <input style={s.inp} type="number" min="0" max="40" value={form.periodes_semaine} onChange={e=>setForm({...form,periodes_semaine:e.target.value})} placeholder="28" />
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                      <div style={{display:'flex',flexDirection:'column'}}>
                        <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Type de contrat</label>
                        <select style={s.inp} value={form.type_contrat} onChange={e=>setForm({...form,type_contrat:e.target.value})}>
                          <option value="">-- Choisir --</option>
                          {['CDI','CDD','Remplaçant','Stagiaire','Civiliste','Autre'].map(c=><option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div style={{display:'flex',flexDirection:'column'}}>
                        <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Type de permis</label>
                        <select style={s.inp} value={form.type_permis} onChange={e=>setForm({...form,type_permis:e.target.value})}>
                          <option value="">-- Choisir --</option>
                          {['Citoyen CH/UE','Permis C','Permis B','Permis L','Permis G','Frontalier','Autre'].map(p=><option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Niveau préféré</label>
                      <div style={{display:'flex',gap:8}}>
                        {['CSC','CFR','EPL'].map(n => (
                          <button key={n} type="button"
                            onClick={() => { setForm({...form,niveau_prefere:n,branches_specialites:[]}); chargerBranchesNiveau(n); }}
                            style={{flex:1,padding:'8px',borderRadius:8,border:'2px solid '+(form.niveau_prefere===n?'#6366f1':'#e2e8f0'),background:form.niveau_prefere===n?'#e0e7ff':'white',color:form.niveau_prefere===n?'#3730a3':'#64748b',cursor:'pointer',fontWeight:700,fontSize:13,transition:'all 0.15s'}}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    {branchesDisponibles.length > 0 && (
                      <div style={{display:'flex',flexDirection:'column'}}>
                        <label style={{fontSize:11,fontWeight:600,marginBottom:8,color:'#475569'}}>Spécialité(s) — {form.niveau_prefere}</label>
                        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                          {branchesDisponibles.map(b => {
                            const selected = (form.branches_specialites||[]).includes(String(b.id));
                            return (
                              <button key={b.id} type="button"
                                onClick={() => {
                                  const curr = form.branches_specialites||[];
                                  const newSel = selected ? curr.filter(x=>x!==String(b.id)) : [...curr, String(b.id)];
                                  setForm({...form,branches_specialites:newSel});
                                }}
                                style={{padding:'6px 14px',borderRadius:99,border:'2px solid '+(selected?'#6366f1':'#e2e8f0'),background:selected?'#e0e7ff':'white',color:selected?'#3730a3':'#64748b',cursor:'pointer',fontWeight:600,fontSize:12,transition:'all 0.15s'}}>
                                {b.nom}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Spécialité (texte libre)</label>
                      <input style={s.inp} value={form.specialite} onChange={e=>setForm({...form,specialite:e.target.value})} placeholder="Ex: Mathématiques, Physique..." />
                    </div>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <label style={{fontSize:11,fontWeight:600,marginBottom:4,color:'#475569'}}>Statut</label>
                      <select style={s.inp} value={form.actif===false||form.actif==='false'?'false':'true'} onChange={e=>setForm({...form,actif:e.target.value==='true'})}>
                        <option value="true">✅ Actif</option>
                        <option value="false">❌ Inactif</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24,paddingTop:20,borderTop:'1px solid #f1f5f9'}}>
                <button type="button" style={s.btnCancel} onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" style={s.btnSave}>{profEdit?'Modifier':'Créer'}</button>
              </div>
            </form>`;

p = p.substring(0, formStart) + newForm + p.substring(formEnd);

// Fix modal width
p = p.replace(
  'width:520,',
  'width:900,maxWidth:"95vw",'
);
p = p.replace(
  'width: 520,',
  'width: 900, maxWidth:"95vw",'
);

fs.writeFileSync('./src/pages/Professeurs.js', p);
console.log('Professeurs formulaire OK !');