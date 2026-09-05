// Bundled by scripts/bundle-api-proxy.mjs
try {
  var p = globalThis.process;
  if (p && !p.binding) {
    p.binding = function (n) {
      return n === "tty_wrap" ? { guessHandleType: function () { return "PIPE"; } } : {};
    };
  }
} catch (e) {}
import{Buffer as vs}from"node:buffer";import vn from"npm:bcryptjs@2";import{Pool as fn}from"npm:pg@8";import He from"npm:jsonwebtoken@9";import{createCipheriv as _n,createDecipheriv as gn,createHash as Rn,createHmac as hn,randomBytes as We,randomInt as Tn}from"node:crypto";var Fe="enc:v1",xe="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";function s(t,n,e=200){return new Response(JSON.stringify(n),{status:e,headers:{...t,"Content-Type":"application/json"}})}function b(){return new fn({connectionString:Deno.env.get("DATABASE_URL")||Deno.env.get("SUPABASE_DB_URL"),ssl:{rejectUnauthorized:!1}})}function qe(){let t=String(Deno.env.get("DATA_ENCRYPTION_KEY")||"").trim();if(!t)return null;try{if(/^[a-fA-F0-9]{64}$/.test(t))return Uint8Array.from(Buffer.from(t,"hex"));let n=Buffer.from(t,"base64");if(n.length===32)return Uint8Array.from(n)}catch{}return null}function z(t){let n=String(t||"");if(!n.startsWith(`${Fe}:`))return n;let e=qe();if(!e)return"";try{let i=n.split(":"),d=i[2],a=i[3],r=i[4],l=Buffer.from(d,"base64"),m=Buffer.from(a,"base64"),p=Buffer.from(r,"base64"),u=gn("aes-256-gcm",e,l);return u.setAuthTag(m),Buffer.concat([u.update(p),u.final()]).toString("utf8")}catch{return""}}function wn(t){let n=String(t||"").toUpperCase().replace(/[^A-Z2-7]/g,""),e=0,i=0,d=[];for(let a of n){let r=xe.indexOf(a);r<0||(i=i<<5|r,e+=5,e>=8&&(d.push(i>>>e-8&255),e-=8))}return Buffer.from(d)}function yn(t,n){let e=wn(t),i=Buffer.alloc(8);i.writeUInt32BE(Math.floor(n/4294967296),0),i.writeUInt32BE(n>>>0,4);let d=hn("sha1",e).update(i).digest(),a=d[d.length-1]&15,r=((d[a]&127)<<24|(d[a+1]&255)<<16|(d[a+2]&255)<<8|d[a+3]&255)%1e6;return String(r).padStart(6,"0")}function $n(t,n=Date.now(),e=30){let i=Math.floor(n/1e3/e);return yn(t,i)}function le(t,n,e=1){let i=String(n||"").replace(/\s+/g,"");if(!/^\d{6}$/.test(i))return!1;let d=Date.now();for(let a=-e;a<=e;a++)if($n(t,d+a*3e4)===i)return!0;return!1}function ve(t){let n=String(Deno.env.get("MFA_BACKUP_PEPPER")||Deno.env.get("JWT_SECRET")||"");return Rn("sha256").update(String(t||"").toUpperCase()+"::"+n).digest("hex")}function fe(t){return Array.isArray(t)?t.map(n=>String(n||"")).filter(Boolean):[]}function Q(t,n="8h"){let e=Deno.env.get("JWT_SECRET");if(!e)throw new Error("JWT_SECRET manquant");return He.sign(t,e,{expiresIn:n})}function k(t){let n=t.headers.get("authorization")||"",e=n.startsWith("Bearer ")?n.slice(7).trim():"";if(!e||e==="null"||e==="undefined")return null;try{let i=Deno.env.get("JWT_SECRET");if(!i)return null;let d=He.verify(e,i);return d?.id?{id:Number(d.id)}:null}catch{return null}}function _e(t){let n=qe();if(!n)return String(t||"");let e=We(12),i=_n("aes-256-gcm",n,e),d=Buffer.concat([i.update(String(t||""),"utf8"),i.final()]),a=i.getAuthTag();return`${Fe}:${e.toString("base64")}:${a.toString("base64")}:${d.toString("base64")}`}var Pe=xe;function Sn(t){let n=0,e=0,i="";for(let d of t)for(e=e<<8|d,n+=8;n>=5;)i+=Pe[e>>>n-5&31],n-=5;return n>0&&(i+=Pe[e<<5-n&31]),i}function Be(t=20){return Sn(We(t)).replace(/=+$/g,"")}function ke({secret:t,accountName:n,issuer:e}){let i=String(e||"Oasis").trim()||"Oasis",d=String(n||"user").trim()||"user",a=String(t||"").toUpperCase().replace(/[^A-Z2-7]/g,""),r=p=>encodeURIComponent(p).replace(/%40/g,"@"),l=`${r(i)}:${r(d)}`,m=[`secret=${a}`,`issuer=${encodeURIComponent(i)}`,"algorithm=SHA1","digits=6","period=30"].join("&");return`otpauth://totp/${l}?${m}`}var Ue="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";function Ne(t=10){let n=[];for(let i=0;i<t;i++){let d="";for(let a=0;a<8;a++)d+=Ue[Tn(0,Ue.length)];n.push(d)}let e=n.map(i=>ve(i));return{plain:n,hashes:e}}function ie(t){return{id:t.id,nom:t.nom,prenom:t.prenom,email:t.email,role:t.role,doit_changer_mdp:t.doit_changer_mdp||!1,mfa_enabled:t.mfa_enabled===!0,mfa_exempt:t.mfa_exempt===!0}}async function Je(t,n){let{email:e,mot_de_passe:i}=await t.json(),d=String(e||"").trim().toLowerCase();if(!d||!i)return s(n,{message:"Email ou mot de passe incorrect"},401);let a=b();try{let r=await a.query("SELECT id, nom, prenom, email, role, mot_de_passe, mfa_enabled, mfa_exempt, mfa_secret, doit_changer_mdp FROM utilisateurs WHERE (LOWER(email) = $1 OR LOWER(identifiant) = $1) AND actif = true",[d]);if(!r.rows.length)return s(n,{message:"Email ou mot de passe incorrect"},401);let l=r.rows[0];if(!await vn.compare(i,l.mot_de_passe||""))return s(n,{message:"Email ou mot de passe incorrect"},401);let p=z(l.mfa_secret||"");if(l.mfa_exempt!==!0&&l.mfa_enabled===!0&&p){let f=Q({purpose:"mfa-login",id:l.id},"5m");return s(n,{message:"Code MFA requis",mfa_required:!0,mfa_token:f})}let u=Q({id:l.id,email:l.email,role:l.role,nom:l.nom,prenom:l.prenom});return s(n,{message:"Connexion reussie",token:u,utilisateur:ie(l)})}finally{await a.end()}}import Nn from"npm:jsonwebtoken@9";function On(t){if(String(t).startsWith("legacy:")){let i=parseInt(String(t).slice(7),10);return Number.isFinite(i)?i:null}let n=Deno.env.get("JWT_SECRET");if(!n)return null;let e=Nn.verify(t,n);return e?.purpose!=="mfa-login"||!e?.id?null:e.id}async function Ge(t,n){let e=await t.json(),i=e?.mfa_token,d=e?.code;if(!i||!d)return s(n,{message:"Token MFA ou code manquant"},400);let a;try{a=On(String(i))}catch{return s(n,{message:"Token MFA invalide ou expire"},401)}if(!a)return s(n,{message:"Token MFA invalide ou expire"},401);let r=b();try{let m=(await r.query("SELECT id, nom, prenom, email, role, mfa_enabled, mfa_exempt, mfa_secret, mfa_backup_codes, doit_changer_mdp FROM utilisateurs WHERE id=$1 AND actif = true",[a])).rows[0];if(!m)return s(n,{message:"Utilisateur introuvable"},401);let p=z(m.mfa_secret||"");if(m.mfa_enabled!==!0||!p)return s(n,{message:"MFA non active pour cet utilisateur"},400);if(!le(p,String(d),1)){let c=fe(m.mfa_backup_codes),g=ve(String(d)),o=c.indexOf(g);if(o===-1)return s(n,{message:"Code MFA invalide"},401);c.splice(o,1),await r.query("UPDATE utilisateurs SET mfa_backup_codes = $1::jsonb WHERE id = $2",[JSON.stringify(c),m.id])}let f=Q({id:m.id,email:m.email,role:m.role,nom:m.nom,prenom:m.prenom});return s(n,{message:"Connexion reussie",token:f,utilisateur:ie({...m,mfa_enabled:!0})})}catch(l){return console.error("auth-fast-mfa error:",l),s(n,{message:"Token MFA invalide ou expire"},401)}finally{await r.end()}}import je from"npm:jsonwebtoken@9";async function Ye(t,n){let e=k(t);if(!e)return s(n,{message:"Token manquant"},401);let i=b();try{let a=(await i.query("SELECT mfa_enabled, mfa_exempt, mfa_backup_codes FROM utilisateurs WHERE id = $1",[e.id])).rows[0]||{};return s(n,{mfa_enabled:a.mfa_enabled===!0,mfa_exempt:a.mfa_exempt===!0,backup_codes_remaining:fe(a.mfa_backup_codes).length})}finally{await i.end()}}async function Ve(t,n){let e=k(t);if(!e)return s(n,{message:"Token manquant"},401);let i=b();try{let a=(await i.query("SELECT email, identifiant, mfa_exempt FROM utilisateurs WHERE id = $1",[e.id])).rows[0];if(!a)return s(n,{message:"Utilisateur non trouve"},401);if(a.mfa_exempt===!0)return s(n,{message:"La 2FA est desactivee pour ce compte."},403);let r=String(a.identifiant||"").trim()||String(a.email||"").trim()||`user-${e.id}`,l=Be(),m=Deno.env.get("MFA_ISSUER")||"Oasis",p=ke({secret:l,accountName:r,issuer:m}),u=je.sign({purpose:"mfa-setup",id:e.id,secret:l},Deno.env.get("JWT_SECRET"),{expiresIn:"30m"});return s(n,{secret:l,otpauth_url:p,setup_token:u,issuer:m,account:r})}finally{await i.end()}}async function Ke(t,n){let e=k(t);if(!e)return s(n,{message:"Token manquant"},401);let i=await t.json(),d=i?.setup_token,a=i?.code;if(!d||!a)return s(n,{message:"Token setup ou code manquant"},400);let r=b();try{if((await r.query("SELECT mfa_exempt FROM utilisateurs WHERE id = $1",[e.id])).rows[0]?.mfa_exempt===!0)return s(n,{message:"La 2FA est desactivee pour ce compte."},403);let m=Deno.env.get("JWT_SECRET");if(!m)return s(n,{message:"Configuration de securite manquante"},500);let p;try{p=je.verify(String(d),m)}catch{return s(n,{message:"Token setup invalide ou expire"},401)}if(p?.purpose!=="mfa-setup"||Number(p?.id)!==Number(e.id)||!p?.secret)return s(n,{message:"Token setup invalide"},401);if(!le(p.secret,String(a),2))return s(n,{message:"Code MFA invalide"},401);let u=Ne();return await r.query("UPDATE utilisateurs SET mfa_enabled = true, mfa_secret = $1, mfa_enabled_at = NOW(), mfa_backup_codes = $2::jsonb WHERE id = $3",[_e(p.secret),JSON.stringify(u.hashes),e.id]),s(n,{message:"Double authentification activee",backup_codes:u.plain,backup_codes_remaining:u.plain.length})}finally{await r.end()}}async function ze(t,n){let e=k(t);if(!e)return s(n,{message:"Token manquant"},401);let d=(await t.json().catch(()=>({})))?.code;if(!d)return s(n,{message:"Code MFA manquant"},400);let a=b();try{let l=(await a.query("SELECT mfa_enabled, mfa_secret FROM utilisateurs WHERE id = $1",[e.id])).rows[0];if(!l||l.mfa_enabled!==!0)return s(n,{message:"MFA non activee"},400);let m=z(l.mfa_secret||"");if(!m||!le(m,String(d),2))return s(n,{message:"Code MFA invalide"},401);let p=Ne();return await a.query("UPDATE utilisateurs SET mfa_backup_codes = $1::jsonb WHERE id = $2",[JSON.stringify(p.hashes),e.id]),s(n,{message:"Nouveaux codes de secours generes",backup_codes:p.plain,backup_codes_remaining:p.plain.length})}catch(r){return console.error("auth-fast-mfa-backup error:",r),s(n,{message:"Erreur serveur"},500)}finally{await a.end()}}async function Xe(t,n){return s(n,{message:"La double authentification est obligatoire. Elle ne peut pas \xEAtre d\xE9sactiv\xE9e pour le moment."},403)}import bn from"npm:bcryptjs@2";var Ln=new Set(["admin","prof","responsable","employe_admin"]);function An(t){return String(t||"").trim().toLowerCase()}function Cn(t){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)}async function Ze(t,n){let e=await t.json().catch(()=>({})),{nom:i,prenom:d,email:a,mot_de_passe:r,role:l}=e,m=An(a);if(!i||!d||!m||!r||!l)return s(n,{message:"Champs requis manquants"},400);if(!Cn(m))return s(n,{message:"Email invalide"},400);if(String(r).length<8)return s(n,{message:"Le mot de passe doit contenir au moins 8 caracteres"},400);if(!Ln.has(String(l)))return s(n,{message:"Role invalide"},400);let p=b();try{if((await p.query("SELECT id FROM utilisateurs WHERE email = $1",[m])).rows.length>0)return s(n,{message:"Email deja utilise"},400);let f=await bn.hash(String(r),10),c=await p.query("INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, nom, prenom, email, role",[String(i).trim(),String(d).trim(),m,f,l]);return s(n,{message:"Compte cree",utilisateur:c.rows[0]},201)}catch(u){return console.error("auth-fast-register error:",u),s(n,{message:"Erreur serveur"},500)}finally{await p.end()}}import{generateAuthenticationOptions as Dn,generateRegistrationOptions as In,verifyAuthenticationResponse as Mn,verifyRegistrationResponse as Pn}from"npm:@simplewebauthn/server@13";import{isoUint8Array as Un}from"npm:@simplewebauthn/server@13/helpers";import et from"npm:jsonwebtoken@9";import{isoBase64URL as ge}from"npm:@simplewebauthn/server@13/helpers";function ae(t){if(Array.isArray(t))return t.map(String).filter(Boolean);if(typeof t=="string")try{let n=JSON.parse(t);return Array.isArray(n)?n.map(String).filter(Boolean):[]}catch{return[]}return[]}function ce(t){let n=String(t.headers.get("origin")||"").trim(),e=String(Deno.env.get("WEBAUTHN_ORIGIN")||n||Deno.env.get("FRONTEND_URL")||"http://localhost:3000").trim().replace(/\/$/,""),i=String(Deno.env.get("WEBAUTHN_RP_ID")||"").trim();if(!i)try{i=new URL(e).hostname}catch{i="localhost"}let d=String(Deno.env.get("WEBAUTHN_RP_NAME")||"Oasis").trim()||"Oasis",a=String(Deno.env.get("WEBAUTHN_ORIGINS")||"").split(",").map(l=>l.trim().replace(/\/$/,"")).filter(Boolean),r=Array.from(new Set([e,...a].filter(Boolean)));return{rpID:i,rpName:d,origin:e,expectedOrigins:r}}function Re(t){return t==null?"":typeof t=="string"?/^[A-Za-z0-9_-]+$/.test(t)?t:ge.fromBuffer(Buffer.from(t,"base64")):t instanceof Uint8Array||Buffer.isBuffer(t)?ge.fromBuffer(t):ge.fromBuffer(Buffer.from(t))}function Qe(t){return t==null?new Uint8Array:t instanceof Uint8Array?t:typeof Buffer<"u"&&Buffer.isBuffer(t)?Uint8Array.from(t):typeof t=="string"&&t.startsWith("\\x")?Uint8Array.from(Buffer.from(t.slice(2),"hex")):ge.toBuffer(String(t||""))}async function tt(t,n){let e=await t.json().catch(()=>({})),i=String(e?.email||"").trim().toLowerCase();if(!Deno.env.get("JWT_SECRET"))return s(n,{message:"Configuration de securite manquante"},500);let d=b();try{let{rpID:a}=ce(t),r,l=null;if(i&&(l=(await d.query(`SELECT u.id FROM utilisateurs u
         WHERE (LOWER(u.email) = $1 OR LOWER(u.identifiant) = $1) AND u.actif = true`,[i])).rows[0]?.id??null,l&&(r=((await d.query("SELECT credential_id, transports FROM webauthn_credentials WHERE user_id=$1",[l])).rows||[]).map(c=>({id:c.credential_id,transports:ae(c.transports)})),!r.length)))return s(n,{message:"Aucune passkey enregistr\xE9e pour ce compte"},404);let m=await Dn({rpID:a,userVerification:"preferred",allowCredentials:r}),p=Q({purpose:"webauthn-login",challenge:m.challenge,id:l??null},"5m");return s(n,{options:m,challenge_token:p})}catch(a){return console.error("passkey login options:",a),s(n,{message:"Erreur serveur"},500)}finally{await d.end()}}async function nt(t,n){let e=await t.json().catch(()=>({})),i=e?.challenge_token,d=e?.credential;if(!i||!d)return s(n,{message:"R\xE9ponse passkey incomplete"},400);let a=Deno.env.get("JWT_SECRET");if(!a)return s(n,{message:"Configuration de securite manquante"},500);let r;try{r=et.verify(String(i),a)}catch{return s(n,{message:"Challenge passkey invalide ou expir\xE9"},401)}if(r?.purpose!=="webauthn-login"||!r?.challenge)return s(n,{message:"Challenge passkey invalide"},401);let l=Re(d?.id||d?.rawId);if(!l)return s(n,{message:"Identifiant passkey manquant"},400);let m=b();try{let u=(await m.query(`SELECT c.*, u.id AS uid, u.nom, u.prenom, u.email, u.role, u.doit_changer_mdp, u.mfa_enabled, u.mfa_exempt, u.actif
       FROM webauthn_credentials c
       JOIN utilisateurs u ON u.id = c.user_id
       WHERE c.credential_id = $1`,[l])).rows[0];if(!u||u.actif===!1)return s(n,{message:"Passkey inconnue ou compte inactif"},401);if(r.id!=null&&Number(r.id)!==Number(u.user_id))return s(n,{message:"Passkey ne correspond pas au compte"},401);let{rpID:f,expectedOrigins:c}=ce(t),g=await Mn({response:d,expectedChallenge:r.challenge,expectedOrigin:c,expectedRPID:f,requireUserVerification:!1,credential:{id:u.credential_id,publicKey:Qe(u.public_key),counter:Number(u.counter||0),transports:ae(u.transports)}});if(!g.verified)return s(n,{message:"Authentification passkey refus\xE9e"},401);let o=Number(g.authenticationInfo?.newCounter??u.counter??0);await m.query("UPDATE webauthn_credentials SET counter=$1 WHERE id=$2",[o,u.id]);let _={id:u.uid,nom:u.nom,prenom:u.prenom,email:u.email,role:u.role,doit_changer_mdp:u.doit_changer_mdp||!1,mfa_enabled:u.mfa_enabled===!0,mfa_exempt:u.mfa_exempt===!0},E=Q({id:_.id,email:_.email,role:_.role,nom:_.nom,prenom:_.prenom});return s(n,{message:"Connexion reussie",token:E,utilisateur:ie(_)})}catch(p){return console.error("passkey login verify:",p),s(n,{message:"\xC9chec de connexion passkey"},401)}finally{await m.end()}}async function st(t,n){let e=k(t);if(!e)return s(n,{message:"Token manquant"},401);let i=b();try{let d=await i.query(`SELECT id, friendly_name, device_type, backed_up, transports, created_at
       FROM webauthn_credentials WHERE user_id = $1 ORDER BY created_at DESC`,[e.id]);return s(n,{passkeys:(d.rows||[]).map(a=>({id:a.id,friendly_name:a.friendly_name||"Passkey",device_type:a.device_type||null,backed_up:a.backed_up===!0,transports:ae(a.transports),created_at:a.created_at}))})}finally{await i.end()}}async function rt(t,n){let e=k(t);if(!e)return s(n,{message:"Token manquant"},401);if(!Deno.env.get("JWT_SECRET"))return s(n,{message:"Configuration de securite manquante"},500);let i=b();try{let{rpID:d,rpName:a}=ce(t),l=(await i.query("SELECT id, email, nom, prenom FROM utilisateurs WHERE id=$1 AND actif=true",[e.id])).rows[0];if(!l)return s(n,{message:"Utilisateur introuvable"},401);let p=((await i.query("SELECT credential_id, transports FROM webauthn_credentials WHERE user_id=$1",[l.id])).rows||[]).map(c=>({id:c.credential_id,transports:ae(c.transports)})),u=await In({rpName:a,rpID:d,userID:Un.fromUTF8String(String(l.id)),userName:String(l.email||`user-${l.id}`),userDisplayName:`${l.prenom||""} ${l.nom||""}`.trim()||String(l.email||l.id),attestationType:"none",excludeCredentials:p,authenticatorSelection:{residentKey:"preferred",userVerification:"preferred"}}),f=Q({purpose:"webauthn-register",id:l.id,challenge:u.challenge},"5m");return s(n,{options:u,challenge_token:f})}catch(d){return console.error("passkey register options:",d),s(n,{message:"Erreur serveur"},500)}finally{await i.end()}}async function it(t,n){let e=k(t);if(!e)return s(n,{message:"Token manquant"},401);let i=await t.json().catch(()=>({})),d=i?.challenge_token,a=i?.credential,r=i?.friendly_name;if(!d||!a)return s(n,{message:"R\xE9ponse passkey incomplete"},400);let l=Deno.env.get("JWT_SECRET");if(!l)return s(n,{message:"Configuration de securite manquante"},500);let m;try{m=et.verify(String(d),l)}catch{return s(n,{message:"Challenge passkey invalide ou expir\xE9"},401)}if(m?.purpose!=="webauthn-register"||Number(m?.id)!==Number(e.id)||!m?.challenge)return s(n,{message:"Challenge passkey invalide"},401);let p=b();try{let{rpID:u,expectedOrigins:f}=ce(t),c=await Pn({response:a,expectedChallenge:m.challenge,expectedOrigin:f,expectedRPID:u,requireUserVerification:!1});if(!c.verified||!c.registrationInfo)return s(n,{message:"Enregistrement passkey refus\xE9"},401);let g=c.registrationInfo,o=g.credential||{},_=Re(o.id||g.credentialID),E=Re(o.publicKey||g.credentialPublicKey);if(!_||!E)return s(n,{message:"Identifiant passkey invalide"},400);if((await p.query("SELECT id FROM webauthn_credentials WHERE credential_id=$1",[_])).rows.length)return s(n,{message:"Cette passkey est d\xE9j\xE0 enregistr\xE9e"},409);let R=ae(a?.response?.transports),T=g.credentialDeviceType||g.credential?.deviceType||null,w=g.credentialBackedUp===!0||g.credential?.backedUp===!0,y=String(r||"").trim()||"Passkey";return await p.query(`INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, device_type, backed_up, transports, friendly_name)
       VALUES ($1, $2, $3, 0, $4, $5, $6::jsonb, $7)`,[e.id,_,E,T,w,JSON.stringify(R),y]),s(n,{message:"Passkey enregistr\xE9e",friendly_name:y})}catch(u){return console.error("passkey register verify:",u),s(n,{message:"\xC9chec de v\xE9rification passkey"},401)}finally{await p.end()}}async function at(t,n,e){let i=k(t);if(!i)return s(n,{message:"Token manquant"},401);let d=Number(e);if(!Number.isFinite(d))return s(n,{message:"Identifiant invalide"},400);let a=b();try{return(await a.query("DELETE FROM webauthn_credentials WHERE id=$1 AND user_id=$2 RETURNING id",[d,i.id])).rows[0]?s(n,{message:"Passkey supprim\xE9e"}):s(n,{message:"Passkey introuvable"},404)}finally{await a.end()}}import Hn from"npm:bcryptjs@2";function Wn(t){let n=String(t||"");return n.length<12?"Le mot de passe doit contenir au moins 12 caract\xE8res":/[A-Z]/.test(n)?/[a-z]/.test(n)?/[0-9]/.test(n)?/[^A-Za-z0-9]/.test(n)?null:"Au moins un caract\xE8re sp\xE9cial requis":"Au moins un chiffre requis":"Au moins une lettre minuscule requise":"Au moins une lettre majuscule requise"}async function ot(t,n){let e=k(t);if(!e)return s(n,{message:"Token manquant"},401);let i=b();try{let a=(await i.query(`SELECT id, nom, prenom, email, role, created_at, mfa_enabled, mfa_exempt, doit_changer_mdp,
              permissions, role_acces
       FROM utilisateurs WHERE id = $1`,[e.id])).rows[0];return a?s(n,{...a,permissions:a.permissions||{},mfa_enabled:a.mfa_enabled===!0,mfa_exempt:a.mfa_exempt===!0,doit_changer_mdp:a.doit_changer_mdp||!1}):s(n,{message:"Utilisateur non trouve"},404)}catch(d){return console.error("auth moi:",d),s(n,{message:"Erreur serveur"},500)}finally{await i.end()}}async function ut(t,n){return s(n,{message:"Deconnexion reussie"})}async function lt(t,n){let e=k(t);if(!e)return s(n,{message:"Token manquant"},401);let i=await t.json().catch(()=>({})),d=Wn(i?.nouveau_mdp);if(d)return s(n,{message:d},400);let a=b();try{let r=await Hn.hash(String(i.nouveau_mdp),10);return await a.query("UPDATE utilisateurs SET mot_de_passe=$1, doit_changer_mdp=false WHERE id=$2",[r,e.id]),s(n,{message:"Mot de passe chang\xE9 avec succ\xE8s"})}catch(r){return console.error("auth changer-mdp:",r),s(n,{message:"Erreur serveur"},500)}finally{await a.end()}}import he from"npm:xlsx@0.18.5";import Fn from"npm:pdfkit@0.15";import xn from"npm:archiver@7";import{Buffer as oe}from"node:buffer";var qn=[{folder:"00-references",title:"R\xE9f\xE9rentiel au moment de l\u2019archive",tables:["classes","pools","matieres"]},{folder:"01-eleves",title:"\xC9l\xE8ves et donn\xE9es li\xE9es",tables:["eleves","documents_eleves","sanctions_eleves","observations","affectations_eleves_enc","classes_enclassement","enclassements","sorties_scolaires"]},{folder:"02-notes-bulletins",title:"Notes, \xE9valuations et bulletins",tables:["notes","evaluations","bulletin_criteres","suivi_devoirs","devoirs"]},{folder:"03-affectations-pools",title:"Affectations et composition des pools",tables:["affectations","planning_branches","pool_profs","pool_classes","pool_branches"]},{folder:"04-plannings-horaires",title:"Plannings et horaires de classes",tables:["classe_horaires","classe_periodes","emploi_du_temps","plan_classe","inventaire_branches"]},{folder:"05-presences",title:"Pr\xE9sences et absences",tables:["presences_v2","presences","absences"]},{folder:"06-comptabilite",title:"Comptabilit\xE9, facturation et commandes",tables:["paiements","factures_validations","factures_references","commandes_lignes","commandes"]}],Bn=new Set(["mot_de_passe","password","mfa_secret","smtp_app_password","mfa_backup_codes"]),ct=async(t,n)=>(await t.query(`SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,[n])).rows.length>0,Oe=t=>(t||[]).map(n=>{let e={};return Object.entries(n||{}).forEach(([i,d])=>{if(!Bn.has(i))if(d instanceof Date)e[i]=d.toISOString();else if(oe.isBuffer(d))e[i]=d.toString("base64");else if(d&&typeof d=="object")try{e[i]=JSON.parse(JSON.stringify(d))}catch{e[i]=String(d)}else e[i]=d}),e}),pt=t=>(t||[]).map(n=>{let e={};return Object.entries(n||{}).forEach(([i,d])=>{d&&typeof d=="object"&&!(d instanceof Date)?e[i]=JSON.stringify(d):e[i]=d}),e}),dt=(t,n)=>{let e=pt(t),i=he.utils.json_to_sheet(e.length?e:[{info:"Aucune donn\xE9e"}]),d=he.utils.book_new();return he.utils.book_append_sheet(d,i,String(n||"Donn\xE9es").slice(0,31)),he.write(d,{type:"buffer",bookType:"xlsx"})},mt=(t,n)=>new Promise((e,i)=>{let d=new Fn({size:"A4",margin:36}),a=[];d.on("data",r=>a.push(r)),d.on("end",()=>e(oe.concat(a))),d.on("error",i),d.fontSize(18).fillColor("#4c1d95").text("Oasis \u2014 Archive",{align:"left"}),d.moveDown(.3),d.fontSize(13).fillColor("#0f172a").text(t),d.fontSize(9).fillColor("#64748b").text(new Date().toLocaleString("fr-CH")),d.moveDown(),(n||[]).forEach((r,l)=>{l>0&&d.y>700&&d.addPage(),d.fontSize(12).fillColor("#4c1d95").text(r.heading),d.fontSize(9).fillColor("#334155").text(r.subtitle||""),d.moveDown(.3);let m=pt(r.rows||[]);if(!m.length){d.fontSize(9).fillColor("#94a3b8").text("Aucune donn\xE9e."),d.moveDown();return}let p=Object.keys(m[0]).slice(0,6),u=Math.min(m.length,80),f=520/Math.max(p.length,1),c=(g,o)=>{let _=d.y;g.forEach((E,h)=>{d.fontSize(7).fillColor(o?"#4c1d95":"#1e293b").text(String(E??"").slice(0,40),36+h*f,_,{width:f-4,lineBreak:!1})}),d.moveDown(.55)};c(p,!0);for(let g=0;g<u;g++)d.y>780&&(d.addPage(),c(p,!0)),c(p.map(o=>m[g][o]),!1);m.length>u&&d.fontSize(8).fillColor("#92400e").text(`\u2026 ${m.length-u} ligne(s) suppl\xE9mentaire(s) dans le fichier Excel.`),d.moveDown()}),d.end()}),kn=(t,n)=>{let e=String(n||"");if(e.startsWith("data:"))return e.slice(5).split(";")[0]||"application/octet-stream";let i=String(t||"").split(".").pop()?.toLowerCase();return i==="pdf"?"application/pdf":i==="png"?"image/png":i==="jpg"||i==="jpeg"?"image/jpeg":"application/octet-stream"};function Le(t){let n=String(t||""),e=n.match(/^data:[^;]+;base64,(.+)$/);if(e)return oe.from(e[1],"base64");if(/^[A-Za-z0-9+/=\s]+$/.test(n)&&n.length>80)try{return oe.from(n,"base64")}catch{}return oe.from(n,"utf8")}var be=async t=>{try{let n=await t.query("SELECT nom_ecole, annee_scolaire FROM parametres_ecole LIMIT 1");return{nom:n.rows[0]?.nom_ecole||"Oasis",annee:n.rows[0]?.annee_scolaire||`${new Date().getFullYear()}-${new Date().getFullYear()+1}`}}catch{return{nom:"Oasis",annee:String(new Date().getFullYear())}}},Jn=async t=>{let n=[],e=[],i=[];for(let d of qn){let a=[];for(let r of d.tables){if(!await ct(t,r))continue;let l=await t.query(`SELECT * FROM ${r}`),m=Oe(l.rows);r==="documents_eleves"&&(l.rows.forEach(p=>{p?.contenu&&e.push({table_name:r,nom:p.nom||`document-${p.id}`,eleve_id:p.eleve_id||null,mime:kn(p.nom,p.contenu),contenu:String(p.contenu)})}),m=m.map(p=>{let{contenu:u,...f}=p;return{...f,fichier_archive:u?"oui":"non"}})),a.push({table:r,rows:m}),i.push({groupe:d.title,table:r,lignes:m.length})}n.push({folder:d.folder,title:d.title,tables:a})}if(await ct(t,"utilisateurs")){let d=await t.query(`SELECT id, nom, prenom, email, role, actif, created_at
       FROM utilisateurs WHERE role IN ('eleve','parent') ORDER BY nom, prenom`),a=Oe(d.rows),r=n.find(p=>p.folder==="01-eleves");r&&r.tables.push({table:"comptes_eleves_parents",rows:a}),i.push({groupe:"\xC9l\xE8ves et donn\xE9es li\xE9es",table:"comptes_eleves_parents",lignes:a.length});let l=await t.query(`SELECT id, nom, prenom, email, role, actif
       FROM utilisateurs WHERE role NOT IN ('eleve','parent') ORDER BY nom, prenom`),m=n.find(p=>p.folder==="00-references");m&&m.tables.push({table:"personnel",rows:Oe(l.rows)})}return{groups:n,fichiers:e,synthese:i}},Gn=async(t,n)=>{let e=await n.connect();try{await e.query("BEGIN");let i=await be(e),d=await e.query(`SELECT id, verrouilee FROM archives_annees
       WHERE annee_scolaire = $1 AND verrouilee = false
       ORDER BY id DESC LIMIT 1`,[i.annee]),a=await Jn(e),r=d.rows[0]?.id;r?(await e.query("DELETE FROM archives_fichiers WHERE archive_id = $1",[r]),await e.query("DELETE FROM archives_tables WHERE archive_id = $1",[r]),await e.query(`UPDATE archives_annees
         SET nom_ecole=$1, created_at=NOW(), created_by=$2, synthese=$3::jsonb, verrouilee=false
         WHERE id=$4`,[i.nom,t?.id||null,JSON.stringify(a.synthese),r])):r=(await e.query(`INSERT INTO archives_annees (annee_scolaire, nom_ecole, created_by, synthese)
         VALUES ($1,$2,$3,$4::jsonb) RETURNING id`,[i.annee,i.nom,t?.id||null,JSON.stringify(a.synthese)])).rows[0].id;for(let l of a.groups)for(let m of l.tables)await e.query(`INSERT INTO archives_tables (archive_id, groupe, groupe_titre, table_name, n_lignes, donnees)
           VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,[r,l.folder,l.title,m.table,m.rows.length,JSON.stringify(m.rows)]);for(let l of a.fichiers)await e.query(`INSERT INTO archives_fichiers (archive_id, table_name, nom, eleve_id, mime, contenu)
         VALUES ($1,$2,$3,$4,$5,$6)`,[r,l.table_name,l.nom,l.eleve_id,l.mime,l.contenu]);return await e.query("COMMIT"),{archive_id:r,annee:i.annee,nom_ecole:i.nom,synthese:a.synthese,n_fichiers:a.fichiers.length}}catch(i){try{await e.query("ROLLBACK")}catch{}throw i}finally{e.release()}};async function Et(t,n,e){if(!t)return!1;let d=(await e.query("SELECT id, annee_scolaire, verrouilee FROM archives_annees WHERE id=$1",[t])).rows[0];return!!(d&&String(d.annee_scolaire)===String(n)&&d.verrouilee!==!0)}async function ft(t,n){t&&await n.query("UPDATE archives_annees SET verrouilee=true WHERE id=$1",[t])}var jn=async t=>(await t.query(`SELECT a.id, a.annee_scolaire, a.nom_ecole, a.created_at, a.verrouilee, a.synthese,
            u.prenom AS auteur_prenom, u.nom AS auteur_nom
     FROM archives_annees a
     LEFT JOIN utilisateurs u ON u.id = a.created_by
     ORDER BY a.annee_scolaire DESC, a.created_at DESC`)).rows.map(e=>({...e,n_lignes:Array.isArray(e.synthese)?e.synthese.reduce((i,d)=>i+Number(d.lignes||0),0):0})),_t=async(t,n)=>{let e=await n.query(`SELECT a.*, u.prenom AS auteur_prenom, u.nom AS auteur_nom
     FROM archives_annees a
     LEFT JOIN utilisateurs u ON u.id = a.created_by
     WHERE a.id=$1`,[t]);if(!e.rows[0])return null;let i=await n.query(`SELECT id, groupe, groupe_titre, table_name, n_lignes
     FROM archives_tables WHERE archive_id=$1
     ORDER BY groupe, table_name`,[t]),d=await n.query(`SELECT id, table_name, nom, eleve_id, mime, length(contenu) AS taille
     FROM archives_fichiers WHERE archive_id=$1 ORDER BY nom`,[t]),a=[],r=new Map;return i.rows.forEach(l=>{if(!r.has(l.groupe)){let m={folder:l.groupe,title:l.groupe_titre,tables:[]};r.set(l.groupe,m),a.push(m)}r.get(l.groupe).tables.push(l)}),{...e.rows[0],groupes:a,fichiers:d.rows}},Yn=async(t,n,e,{limit:i=200,offset:d=0}={})=>{let r=(await e.query(`SELECT groupe, groupe_titre, table_name, n_lignes, donnees
     FROM archives_tables WHERE archive_id=$1 AND table_name=$2`,[t,n])).rows[0];if(!r)return null;let l=Array.isArray(r.donnees)?r.donnees:[];return{groupe:r.groupe,groupe_titre:r.groupe_titre,table_name:r.table_name,n_lignes:r.n_lignes,colonnes:l[0]?Object.keys(l[0]):[],lignes:l.slice(Number(d)||0,(Number(d)||0)+(Number(i)||200))}},Vn=async(t,n,e)=>(await e.query("SELECT id, nom, mime, contenu FROM archives_fichiers WHERE archive_id=$1 AND id=$2",[t,n])).rows[0]||null,Kn=async(t,n)=>{let e=await _t(t,n);if(!e)return null;let i=await n.query("SELECT groupe, groupe_titre, table_name, donnees FROM archives_tables WHERE archive_id=$1 ORDER BY groupe, table_name",[t]),d=await n.query("SELECT id, nom, eleve_id, contenu FROM archives_fichiers WHERE archive_id=$1",[t]),r=`Oasis-archive-${String(e.annee_scolaire||"annee").replace(/[^\w.-]+/g,"_")}.zip`,l=xn("zip",{zlib:{level:6}}),m=[],p=new Promise((c,g)=>{l.on("data",o=>m.push(o)),l.on("error",g),l.on("end",()=>c())}),u=new Map;i.rows.forEach(c=>{let g=String(c.groupe);u.has(g)||u.set(g,{title:String(c.groupe_titre),folder:g,tables:[]}),u.get(g).tables.push(c)});let f=Array.isArray(e.synthese)?e.synthese:[];l.append(dt(f,"synthese"),{name:"00-synthese.xlsx"}),l.append(await mt(`Synth\xE8se ${e.annee_scolaire}`,[{heading:"Contenu archiv\xE9",subtitle:`${e.nom_ecole||"Oasis"} \u2014 ${e.annee_scolaire}`,rows:f}]),{name:"00-synthese.pdf"});for(let c of u.values()){let g=[];for(let o of c.tables){let _=Array.isArray(o.donnees)?o.donnees:[];l.append(dt(_,String(o.table_name)),{name:`${c.folder}/${o.table_name}.xlsx`}),g.push({heading:String(o.table_name),subtitle:`${_.length} ligne(s)`,rows:_})}l.append(await mt(c.title,g),{name:`${c.folder}/${c.folder}.pdf`})}return d.rows.forEach((c,g)=>{let o=String(c.nom||`fichier-${g}`).replace(/[^\w.-]+/g,"_");l.append(Le(c.contenu),{name:`01-eleves/fichiers/${c.eleve_id||"sans-eleve"}_${c.id||g}_${o}`})}),l.append([`Oasis \u2014 Archive ${e.annee_scolaire}`,`\xC9cole : ${e.nom_ecole||"Oasis"}`,`Date d\u2019archivage : ${e.created_at?new Date(e.created_at).toLocaleString("fr-CH"):""}`,"","Consultation en lecture seule dans le menu Archive."].join(`
`),{name:"00-LISEZMOI.txt"}),await l.finalize(),await p,{buffer:oe.concat(m),fileName:r}};async function se(t){let n=b();try{return await t(n)}finally{await n.end()}}async function gt(t){return t?be(t):se(n=>be(n))}async function Rt(t){return se(n=>Gn(t,n))}async function ht(){return se(t=>jn(t))}async function Tt(t){return se(n=>_t(t,n))}async function wt(t,n,e={}){return se(i=>Yn(t,n,i,e))}async function yt(t,n){return se(e=>Vn(t,n,e))}async function $t(t){return se(n=>Kn(t,n))}var zn=new Set(["/auth/moi","/auth/changer-mdp","/auth/logout","/auth/mfa/status","/auth/mfa/setup","/auth/mfa/enable","/auth/mfa/backup/regenerate","/auth/mfa/disable","/auth/passkeys","/auth/passkeys/register/options","/auth/passkeys/register/verify"]);async function $(t){try{return await t.json()}catch{return{}}}async function A(t){let n=k(t);if(!n)return null;let e=b();try{let d=(await e.query(`SELECT id, nom, prenom, email, role, permissions, mfa_enabled, mfa_exempt
       FROM utilisateurs WHERE id = $1`,[n.id])).rows[0];return d?{id:d.id,nom:d.nom,prenom:d.prenom,email:d.email,role:d.role,permissions:d.permissions||{},mfa_enabled:d.mfa_enabled===!0,mfa_exempt:d.mfa_exempt===!0}:null}finally{await e.end()}}function C(t,n,e){return t?e&&t.mfa_exempt!==!0&&t.mfa_enabled!==!0&&!zn.has(e)?s(n,{message:"Double authentification obligatoire. Activez-la pour continuer.",mfa_required:!0},403):null:s(n,{message:"Token manquant"},401)}function O(t,n){return t.role!=="admin"?s(n,{message:"Acces refuse"},403):null}function de(t,n,...e){return e.includes(t.role)?null:s(n,{message:"Acces refuse"},403)}async function St(t,n,e,i){let d=n.match(/^\/archives\/(\d+)\/export$/);if(d&&t.method==="GET"){let m=await A(t),p=C(m,e,n);if(p)return p;let u=await $t(d[1]);return u?new Response(u.buffer,{status:200,headers:{...e,"Content-Type":"application/zip","Content-Disposition":`attachment; filename="${u.fileName}"`}}):s(e,{message:"Archive introuvable"},404)}let a=n.match(/^\/archives\/(\d+)\/tables\/([^/]+)$/);if(a&&t.method==="GET"){let m=await A(t),p=C(m,e,n);if(p)return p;let u=await wt(a[1],decodeURIComponent(a[2]),{limit:i.searchParams.get("limit")?Number(i.searchParams.get("limit")):200,offset:i.searchParams.get("offset")?Number(i.searchParams.get("offset")):0});return u?s(e,u):s(e,{message:"Table introuvable dans cette archive"},404)}let r=n.match(/^\/archives\/(\d+)\/fichiers\/(\d+)$/);if(r&&t.method==="GET"){let m=await A(t),p=C(m,e,n);if(p)return p;let u=await yt(r[1],r[2]);if(!u)return s(e,{message:"Fichier introuvable"},404);let f=Le(u.contenu),c=String(u.nom||"document").replace(/[^\w.-]+/g,"_");return new Response(f,{status:200,headers:{...e,"Content-Type":u.mime||"application/octet-stream","Content-Disposition":`attachment; filename="${c}"`}})}let l=n.match(/^\/archives\/(\d+)$/);if(l&&t.method==="GET"){let m=await A(t),p=C(m,e,n);if(p)return p;let u=await Tt(l[1]);return u?s(e,u):s(e,{message:"Archive introuvable"},404)}if(n==="/archives"&&t.method==="GET"){let m=await A(t),p=C(m,e,n);return p||s(e,await ht())}if(n==="/archives"&&t.method==="POST"){let m=await A(t),p=C(m,e,n);if(p)return p;let u=O(m,e);if(u)return u;try{let f=await Rt(m);return s(e,{message:"Ann\xE9e transf\xE9r\xE9e dans les archives (lecture seule).",archive_id:f.archive_id,annee:f.annee,nom_ecole:f.nom_ecole,synthese:f.synthese,n_fichiers:f.n_fichiers})}catch(f){let c=f instanceof Error?f.message:"Erreur serveur";return s(e,{message:"Erreur lors du transfert vers les archives",erreur:c},500)}}return s(e,{message:"Route non trouv\xE9e"},404)}async function vt(t,n,e){let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{if(n==="/branches"&&t.method==="GET"){let l=await a.query("SELECT * FROM matieres ORDER BY niveau, nom");return s(e,l.rows)}if(n==="/branches"&&t.method==="POST"){let l=O(i,e);if(l)return l;let m=await $(t),{nom:p,niveau:u,periodes_semaine:f,coefficient:c,type_branche:g,designation_courte:o,suivi_notes:_}=m;if(!p)return s(e,{message:"Le nom est requis"},400);if(!f)return s(e,{message:"Les p\xE9riodes/semaine sont requises"},400);if(!u)return s(e,{message:"Le niveau est requis"},400);if(!o||!String(o).trim())return s(e,{message:"La d\xE9signation courte est requise"},400);let E=await a.query("INSERT INTO matieres (nom, niveau, periodes_semaine, coefficient, type_branche, designation_courte, suivi_notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",[p,u,parseInt(String(f)),parseFloat(String(c))||1,g||"principale",String(o).trim(),_!==!1]);return s(e,E.rows[0],201)}let r=n.match(/^\/branches\/(\d+)$/);if(r){let l=r[1];if(t.method==="PUT"){let m=O(i,e);if(m)return m;let p=await $(t),{nom:u,niveau:f,periodes_semaine:c,coefficient:g,type_branche:o,designation_courte:_,suivi_notes:E}=p;if(!_||!String(_).trim())return s(e,{message:"La d\xE9signation courte est requise"},400);let h=await a.query("UPDATE matieres SET nom=$1, niveau=$2, periodes_semaine=$3, coefficient=$4, type_branche=$5, designation_courte=$6, suivi_notes=$7 WHERE id=$8 RETURNING *",[u,f,parseInt(String(c)),parseFloat(String(g))||1,o||"principale",String(_).trim(),E!==!1,l]);return h.rows.length?s(e,h.rows[0]):s(e,{message:"Branche non trouv\xE9e"},404)}if(t.method==="DELETE"){let m=O(i,e);return m||(await a.query("DELETE FROM matieres WHERE id=$1",[l]),s(e,{message:"Branche supprim\xE9e"}))}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("branches-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:l},500)}finally{await a.end()}}async function Nt(t,n,e){let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{if(n==="/calendrier"&&t.method==="GET"){let m=await a.query("SELECT * FROM calendrier ORDER BY date_debut");return s(e,m.rows)}if(n==="/calendrier"&&t.method==="POST"){let m=await $(t),{titre:p,description:u,date_debut:f,date_fin:c,type:g,couleur:o,categorie:_,nom_vacance:E,heure_debut:h,heure_fin:R}=m,T=await a.query("INSERT INTO calendrier (titre, description, date_debut, date_fin, type, couleur, categorie, nom_vacance, heure_debut, heure_fin) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",[p,u||null,f,c||f,g||"Evenement",o||"#1a73e8",_||"evenement",E||null,h||null,R||null]);return s(e,{message:"Evenement cree",evenement:T.rows[0]},201)}if(n==="/calendrier/prof"&&t.method==="GET"){await a.query("CREATE TABLE IF NOT EXISTS calendrier_prof (id SERIAL PRIMARY KEY, prof_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE, date DATE NOT NULL, titre VARCHAR(200) NOT NULL, type VARCHAR(50) DEFAULT 'Autre', description TEXT DEFAULT '', created_at TIMESTAMP DEFAULT NOW())");let m=await a.query("SELECT * FROM calendrier_prof WHERE prof_id=$1 ORDER BY date DESC",[i.id]);return s(e,m.rows)}if(n==="/calendrier/prof"&&t.method==="POST"){let m=await $(t),{date:p,titre:u,type:f,description:c}=m,g=await a.query("INSERT INTO calendrier_prof (prof_id,date,titre,type,description) VALUES($1,$2,$3,$4,$5) RETURNING *",[i.id,p,u,f||"Autre",c||""]);return s(e,g.rows[0])}let r=n.match(/^\/calendrier\/prof\/(\d+)$/);if(r){let m=r[1];if(t.method==="PUT"){let p=await $(t),{date:u,titre:f,type:c,description:g}=p,o=await a.query("UPDATE calendrier_prof SET date=$1, titre=$2, type=$3, description=$4 WHERE id=$5 AND prof_id=$6 RETURNING *",[u,f,c||"Autre",g||"",m,i.id]);return o.rows.length===0?s(e,{message:"\xC9l\xE9ment non trouv\xE9"},404):s(e,o.rows[0])}if(t.method==="DELETE")return await a.query("DELETE FROM calendrier_prof WHERE id=$1 AND prof_id=$2",[m,i.id]),s(e,{ok:!0})}let l=n.match(/^\/calendrier\/(\d+)$/);if(l){let m=l[1];if(t.method==="PUT"){let p=await $(t),{titre:u,description:f,date_debut:c,date_fin:g,type:o,couleur:_,categorie:E,nom_vacance:h,heure_debut:R,heure_fin:T}=p;return(await a.query("UPDATE calendrier SET titre=$1, description=$2, date_debut=$3, date_fin=$4, type=$5, couleur=$6, categorie=$7, nom_vacance=$8, heure_debut=$9, heure_fin=$10 WHERE id=$11 RETURNING *",[u,f||null,c,g||c,o||"Evenement",_||"#1a73e8",E||"evenement",h||null,R||null,T||null,m])).rows.length===0?s(e,{message:"Evenement non trouve"},404):s(e,{message:"Evenement modifie"})}if(t.method==="DELETE")return await a.query("DELETE FROM calendrier WHERE id=$1",[m]),s(e,{message:"Evenement supprime"})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("calendrier-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:l},500)}finally{await a.end()}}async function Xn(t,n){let e=Deno.env.get("GEMINI_API_KEY");if(!e)throw new Error("GEMINI_API_KEY non configur\xE9e");let i=new AbortController,d=setTimeout(()=>i.abort(),3e4);try{let a=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${e}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system_instruction:{parts:[{text:t}]},contents:[{role:"user",parts:[{text:n}]}],generationConfig:{temperature:.2,maxOutputTokens:512}}),signal:i.signal});if(!a.ok){let r=await a.text();throw new Error(`Gemini HTTP ${a.status}: ${r}`)}return await a.json()}finally{clearTimeout(d)}}async function Ot(t,n,e){if(n!=="/chatbot"||t.method!=="POST")return s(e,{message:"Route non trouv\xE9e"},404);let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{let r=await $(t),{message:l}=r;if(!l||!String(l).trim())return s(e,{message:"Message vide"},400);let m=i.role==="admin",p=i.id,u="",f=await a.query(`
      SELECT u.nom, u.prenom,
        e.date_naissance, c.nom as classe, COALESCE(e.statut,'actif') as statut
      FROM eleves e
      LEFT JOIN utilisateurs u ON u.id = e.utilisateur_id
      LEFT JOIN classes c ON c.id = e.classe_id
      ORDER BY c.nom, u.nom, u.prenom
      LIMIT 200
    `);if(f.rows.length>0){u+=`
## \xC9l\xE8ves:
`;for(let S of f.rows){let v=S.date_naissance?new Date(S.date_naissance).toLocaleDateString("fr-CH"):"inconnue";u+=`- ${S.prenom} ${S.nom} | Classe: ${S.classe||"aucune"} | N\xE9(e): ${v} | Statut: ${S.statut}
`}}let c=new Date().toISOString().split("T")[0],g=await a.query(`
      SELECT u.nom, u.prenom,
        c.nom as classe, pv.p1, pv.p2, pv.p3, pv.p4
      FROM presences_v2 pv
      JOIN eleves e ON e.id = pv.eleve_id
      LEFT JOIN utilisateurs u ON u.id = e.utilisateur_id
      LEFT JOIN classes c ON c.id = e.classe_id
      WHERE pv.date = $1
      LIMIT 200
    `,[c]);if(g.rows.length>0){u+=`
## Pr\xE9sences aujourd'hui (${c}):
`;for(let S of g.rows){let v=S.p1||S.p2||S.p3||S.p4||"pr\xE9sent";u+=`- ${S.prenom} ${S.nom} (${S.classe||"?"}): ${v}
`}}let o=await a.query("SELECT nom, niveau FROM classes ORDER BY nom LIMIT 50");if(o.rows.length>0){u+=`
## Classes:
`;for(let S of o.rows)u+=`- ${S.nom} (${S.niveau||""})
`}if(m){let S=await a.query("SELECT nom, prenom, email, telephone FROM utilisateurs WHERE role='prof' ORDER BY nom LIMIT 50");if(S.rows.length>0){u+=`
## Professeurs:
`;for(let v of S.rows)u+=`- ${v.prenom} ${v.nom} | ${v.email||""} | ${v.telephone||""}
`}}let _=await a.query(`
      SELECT COALESCE(el.nom, u.nom) as eleve_nom, COALESCE(el.prenom, u.prenom) as eleve_prenom,
        m.nom as matiere, c.nom as classe, n.valeur, n.absent, n.dispense, ev.nom as eval_nom
      FROM notes n
      JOIN evaluations ev ON ev.id = n.evaluation_id
      JOIN eleves el ON el.id = n.eleve_id
      LEFT JOIN utilisateurs u ON u.id = el.utilisateur_id
      LEFT JOIN classes c ON c.id = el.classe_id
      LEFT JOIN matieres m ON m.id = ev.matiere_id
      ${m?"":"WHERE ev.prof_id = $1"}
      ORDER BY n.created_at DESC LIMIT 300
    `,m?[]:[p]);if(_.rows.length>0){u+=`
## Notes r\xE9centes:
`;for(let S of _.rows){let v=S.absent?"ABS":S.dispense?"DISP":S.valeur!=null?S.valeur:"\u2014";u+=`- ${S.eleve_prenom} ${S.eleve_nom} (${S.classe||"?"}) | ${S.matiere||"?"} | ${S.eval_nom}: ${v}
`}}let E=await a.query("SELECT titre, date_debut, type FROM calendrier WHERE date_debut >= CURRENT_DATE ORDER BY date_debut LIMIT 20");if(E.rows.length>0){u+=`
## Prochains \xE9v\xE9nements:
`;for(let S of E.rows)u+=`- ${new Date(S.date_debut).toLocaleDateString("fr-CH")} | ${S.titre} (${S.type||""})
`}let h=new Date().toLocaleDateString("fr-CH",{weekday:"long",year:"numeric",month:"long",day:"numeric"}),R=`Tu es un assistant pour une \xE9cole de formation pour migrants en Suisse (Le Botza, V\xE9troz). Tu r\xE9ponds en fran\xE7ais, de fa\xE7on concise et pr\xE9cise. Tu as acc\xE8s aux donn\xE9es de l'\xE9cole ci-dessous. L'utilisateur est un ${m?"administrateur":"professeur"}.

Date d'aujourd'hui: ${h}

DONN\xC9ES DE L'\xC9COLE:
${u}

R\xE9ponds uniquement \xE0 partir de ces donn\xE9es. Si l'information n'est pas disponible, dis-le clairement.`,T=await Xn(R,String(l)),w=T.error;if(w)throw new Error(w.message||"Gemini error");let N=T.candidates?.[0]?.content?.parts?.[0]?.text||"D\xE9sol\xE9, je n'ai pas pu g\xE9n\xE9rer une r\xE9ponse.";return s(e,{answer:N})}catch(r){console.error("chatbot-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur chatbot: "+l},500)}finally{await a.end()}}import{createClient as Zn}from"npm:@supabase/supabase-js@2";import{Buffer as Ae}from"node:buffer";var H={elevesPhotos:"eleves-photos",documentsEleves:"documents-eleves",documentsProfs:"documents-profs",documentsAdmin:"documents-admin"};function Te(){let t=Deno.env.get("SUPABASE_URL"),n=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");return!t||!n?null:Zn(t,n,{auth:{persistSession:!1,autoRefreshToken:!1}})}function V(){return!!(Deno.env.get("SUPABASE_URL")&&Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))}function Qn(t){let n=t.match(/^data:([^;]+);base64,(.+)$/s);if(!n)throw new Error("Le fichier doit \xEAtre un data URL base64");let e=n[1].trim(),i=Ae.from(n[2],"base64");if(!i.length)throw new Error("Fichier vide");return{mime:e,buffer:i}}function es(t,n="application/octet-stream"){return`data:${n};base64,${Ae.from(t).toString("base64")}`}function ee(t){return String(t||"fichier").replace(/[^\w.\-() ]+/g,"_").slice(0,120)}async function ts(t,n,e=3600){let i=Te();if(!i)return null;let{data:d,error:a}=await i.storage.from(t).createSignedUrl(n,e);return a?null:d?.signedUrl||null}async function X(t,n,e){let i=Te();if(!i)throw new Error("Supabase Storage non configur\xE9");let{mime:d,buffer:a}=Qn(e),{error:r}=await i.storage.from(t).upload(n,a,{contentType:d,upsert:!0});if(r)throw new Error(r.message)}async function ns(t,n){let e=Te();if(!e)throw new Error("Supabase Storage non configur\xE9");let{data:i,error:d}=await e.storage.from(t).download(n);if(d)throw new Error(d.message);let a=Ae.from(await i.arrayBuffer());return es(a,i.type||"application/octet-stream")}async function ne(t,n){return t.storage_path&&V()?ns(n,t.storage_path):t.contenu||null}async function Y(t,n){if(!n)return;let e=Te();if(!e)return;let{error:i}=await e.storage.from(t).remove([n]);i&&console.warn("Storage remove",n,i.message)}async function we(t){return!t.length||!V()?t:Promise.all(t.map(async n=>{if(!n.photo_storage_path)return n;let e=await ts(H.elevesPhotos,n.photo_storage_path,3600);return{...n,photo:e||n.photo||null}}))}async function bt(t,n,e){let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{if(n==="/classes"&&t.method==="GET"){let m=await a.query(`
        SELECT c.*, u.nom as prof_nom, u.prenom as prof_prenom, u.sexe as prof_sexe,
          COUNT(DISTINCT e.id) as nb_eleves
        FROM classes c
        LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
        LEFT JOIN eleves e ON e.classe_id=c.id
        GROUP BY c.id, u.nom, u.prenom, u.sexe
        ORDER BY c.nom
      `);return s(e,m.rows)}if(n==="/classes"&&t.method==="POST"){let m=O(i,e);if(m)return m;let p=await $(t),{nom:u,niveau:f,annee_scolaire:c,prof_principal_id:g}=p;if(!u)return s(e,{message:"Le nom est requis"},400);if(!f)return s(e,{message:"Le niveau est requis"},400);if((await a.query(`SELECT id FROM classes
         WHERE LOWER(TRIM(nom)) = LOWER(TRIM($1))
           AND UPPER(TRIM(COALESCE(niveau, ''))) = UPPER(TRIM($2))
         LIMIT 1`,[u,f])).rows.length)return s(e,{message:"Une classe avec le m\xEAme nom et le m\xEAme niveau existe d\xE9j\xE0"},409);let _=await a.query("INSERT INTO classes (nom, niveau, annee_scolaire, prof_principal_id) VALUES ($1,$2,$3,$4) RETURNING *",[u,f||null,c,g||null]);return s(e,_.rows[0],201)}let r=n.match(/^\/classes\/(\d+)\/eleves$/);if(r&&t.method==="GET"){let m=r[1],p=await a.query(`
        SELECT e.*,
          COALESCE(u.nom, e.nom) as nom,
          COALESCE(u.prenom, e.prenom) as prenom,
          u.email,
          (SELECT COUNT(*)::int FROM observations o WHERE o.eleve_id = e.id) AS nb_observations,
          (SELECT COUNT(*)::int FROM sanctions_eleves s WHERE s.eleve_id = e.id) AS nb_sanctions
        FROM eleves e
        LEFT JOIN utilisateurs u ON u.id=e.utilisateur_id
        WHERE e.classe_id=$1
        ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)
      `,[m]);return s(e,await we(p.rows))}let l=n.match(/^\/classes\/(\d+)$/);if(l){let m=l[1];if(t.method==="GET"){let p=await a.query(`
          SELECT c.*, u.nom as prof_nom, u.prenom as prof_prenom, u.sexe as prof_sexe
          FROM classes c LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
          WHERE c.id=$1
        `,[m]);return p.rows.length?s(e,p.rows[0]):s(e,{message:"Classe non trouv\xE9e"},404)}if(t.method==="PUT"){let p=O(i,e);if(p)return p;let u=await $(t),{nom:f,niveau:c,annee_scolaire:g,prof_principal_id:o,actif:_}=u,h=(await a.query("SELECT nom FROM classes WHERE id=$1",[m])).rows[0]?.nom||"",R=await a.query("UPDATE classes SET nom=$1, niveau=$2, annee_scolaire=$3, prof_principal_id=$4, actif=$5 WHERE id=$6 RETURNING *",[f,c||null,g,o||null,_!==void 0?_:!0,m]);if(!R.rows.length)return s(e,{message:"Classe non trouv\xE9e"},404);if(h&&f&&h!==f){let T=String(h).replace(/\s+/g,""),w=String(f).replace(/\s+/g,"");T&&w&&T!==w&&await a.query("UPDATE eleves SET oasi_prog_nom = REPLACE(oasi_prog_nom, $1, $2) WHERE classe_id=$3 AND oasi_prog_nom LIKE $4",[T,w,m,"%"+T+"%"])}return s(e,R.rows[0])}if(t.method==="DELETE"){let p=O(i,e);return p||(await a.query("DELETE FROM classes WHERE id=$1",[m]),s(e,{message:"Classe supprim\xE9e"}))}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("classes-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:l},500)}finally{await a.end()}}async function Lt(t,n,e,i){let d=await A(t),a=C(d,e,n);if(a)return a;let r=b();try{if(n==="/comptabilite/statistiques"&&t.method==="GET"){let f=await r.query("SELECT COALESCE(SUM(montant),0) as total FROM paiements WHERE statut='paye'"),c=await r.query("SELECT COALESCE(SUM(montant),0) as total, COUNT(*) as nb FROM paiements WHERE statut='en_attente'"),g=await r.query("SELECT COALESCE(SUM(montant),0) as total, COUNT(*) as nb FROM paiements WHERE statut='en_retard'"),o=await r.query("SELECT type, COALESCE(SUM(montant),0) as total, COUNT(*) as nb FROM paiements WHERE statut='paye' GROUP BY type ORDER BY total DESC");return s(e,{total_encaisse:f.rows[0].total,en_attente:c.rows[0],en_retard:g.rows[0],par_type:o.rows})}if(n==="/comptabilite/factures/reference"&&t.method==="GET"){let f=i.searchParams.get("eleve_id"),c=i.searchParams.get("annee_scolaire");if(!f||!c)return s(e,{reference:null});try{let g=await r.query("SELECT reference FROM factures_references WHERE eleve_id=$1 AND annee_scolaire=$2",[f,c]);return s(e,{reference:g.rows[0]?.reference||null})}catch{return s(e,{reference:null})}}if(n==="/comptabilite/factures/reference"&&t.method==="POST"){let f=O(d,e);if(f)return f;let c=await $(t),{eleve_id:g,annee_scolaire:o,reference:_}=c;if(!g||!o||!_)return s(e,{message:"eleve_id, annee_scolaire et reference sont requis"},400);let E=await r.query("SELECT reference FROM factures_references WHERE eleve_id=$1 AND annee_scolaire=$2",[g,o]);if(E.rows.length>0)return s(e,{reference:E.rows[0].reference});let h=await r.query("INSERT INTO factures_references (eleve_id, annee_scolaire, reference) VALUES ($1,$2,$3) RETURNING reference",[g,o,_]);return s(e,{reference:h.rows[0].reference})}if(n==="/comptabilite/factures/validation"&&t.method==="GET"){let f=i.searchParams.get("eleve_ids"),c=i.searchParams.get("annee_scolaire");if(!f||!c)return s(e,[]);let g=f.split(",").map(Number).filter(Boolean);if(g.length===0)return s(e,[]);let o=g.map((E,h)=>`$${h+2}`).join(","),_=await r.query(`SELECT eleve_id, valide FROM factures_validations WHERE annee_scolaire=$1 AND eleve_id IN (${o})`,[c,...g]);return s(e,_.rows)}if(n==="/comptabilite/factures/validation"&&t.method==="POST"){let f=O(d,e);if(f)return f;let c=await $(t),{eleve_id:g,annee_scolaire:o,valide:_}=c;return!g||!o?s(e,{message:"Param\xE8tres manquants"},400):(await r.query(`INSERT INTO factures_validations (eleve_id, annee_scolaire, valide, valide_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (eleve_id, annee_scolaire) DO UPDATE SET valide=$3, valide_at=$4`,[g,o,_,_?new Date:null]),s(e,{valide:_}))}if(n==="/comptabilite/materiels"&&t.method==="GET"){let f=i.searchParams.get("section"),c=[],g="SELECT * FROM materiels";f&&(c.push(f),g+=" WHERE section=$1"),g+=" ORDER BY nom";let o=await r.query(g,c);return s(e,o.rows)}if(n==="/comptabilite/materiels"&&t.method==="POST"){let f=O(d,e);if(f)return f;let c=await $(t),{nom:g,section:o,prix:_,ref:E,fournisseur:h,rabais:R,remarques:T,icone:w}=c,y=await r.query(`INSERT INTO materiels (nom, section, prix, ref, fournisseur, rabais, remarques, icone)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[g,o||"scolaire",_||0,E||null,h||null,R||0,T||null,w||null]);return s(e,{message:"Materiel cree",materiel:y.rows[0]},201)}let l=n.match(/^\/comptabilite\/materiels\/(\d+)$/);if(l){let f=l[1];if(t.method==="PUT"){let c=O(d,e);if(c)return c;let g=await $(t),{nom:o,section:_,prix:E,ref:h,fournisseur:R,rabais:T,remarques:w,icone:y}=g,N=await r.query(`UPDATE materiels
           SET nom=$1, section=$2, prix=$3, ref=$4, fournisseur=$5, rabais=$6, remarques=$7, icone=$8
           WHERE id=$9 RETURNING *`,[o,_||"scolaire",E||0,h||null,R||null,T||0,w||null,y||null,f]);return N.rows.length===0?s(e,{message:"Materiel non trouve"},404):s(e,{message:"Materiel modifie",materiel:N.rows[0]})}if(t.method==="DELETE"){let c=O(d,e);return c||(await r.query("DELETE FROM materiels WHERE id=$1",[f]),s(e,{message:"Materiel supprime"}))}}let m=n.match(/^\/comptabilite\/commandes\/(\d+)\/lignes(?:\/(\d+))?$/);if(m){let f=m[1],c=m[2];if(!c&&t.method==="GET"){let g=await r.query("SELECT * FROM commandes_lignes WHERE commande_id=$1 ORDER BY created_at ASC",[f]);return s(e,g.rows)}if(!c&&t.method==="POST"){let g=O(d,e);if(g)return g;let o=await $(t),{article:_,quantite:E,ref:h,prix_unitaire:R,remarques:T,statut:w}=o;if(!_)return s(e,{message:"article est requis"},400);let y=await r.query("INSERT INTO commandes_lignes (commande_id, article, quantite, ref, prix_unitaire, remarques, statut) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",[f,_,E||1,h||null,R||null,T||null,w||"en_attente"]);return s(e,y.rows[0],201)}if(c&&t.method==="PUT"){let g=O(d,e);if(g)return g;let o=await $(t),{article:_,quantite:E,ref:h,prix_unitaire:R,remarques:T,statut:w}=o,y=await r.query("UPDATE commandes_lignes SET article=$1, quantite=$2, ref=$3, prix_unitaire=$4, remarques=$5, statut=$6 WHERE id=$7 AND commande_id=$8 RETURNING *",[_,E||1,h||null,R||null,T||null,w||"en_attente",c,f]);return y.rows.length===0?s(e,{message:"Ligne non trouv\xE9e"},404):s(e,y.rows[0])}if(c&&t.method==="DELETE"){let g=O(d,e);return g||(await r.query("DELETE FROM commandes_lignes WHERE id=$1 AND commande_id=$2",[c,f]),s(e,{message:"Ligne supprim\xE9e"}))}}let p=n.match(/^\/comptabilite\/commandes(?:\/(\d+))?$/);if(p){let f=p[1];if(!f&&t.method==="GET"){let c=await r.query(`
          SELECT c.*, COALESCE(SUM(cl.prix_unitaire * cl.quantite), 0) AS montant_total
          FROM commandes c
          LEFT JOIN commandes_lignes cl ON cl.commande_id = c.id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `);return s(e,c.rows)}if(!f&&t.method==="POST"){let c=O(d,e);if(c)return c;let g=await $(t),{article:o,quantite:_,fournisseur:E,prix_unitaire:h,statut:R,remarques:T,date_commande:w}=g,y=new Date,N=y.getMonth()>=7?y.getFullYear():y.getFullYear()-1,S=`${String(N).slice(-2)}-${String(N+1).slice(-2)}`,v=await r.query("SELECT COUNT(*) FROM commandes WHERE numero_commande LIKE $1",[S+"%"]),L=parseInt(String(v.rows[0].count))+1,I=`${S}_${String(L).padStart(4,"0")}`,M=await r.query("INSERT INTO commandes (article, quantite, fournisseur, prix_unitaire, statut, remarques, numero_commande, date_commande) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",[o||null,_||1,E||null,h||null,R||"en_attente",T||null,I,w||null]);return s(e,M.rows[0],201)}if(f&&t.method==="PUT"){let c=O(d,e);if(c)return c;let g=await $(t),{article:o,quantite:_,fournisseur:E,prix_unitaire:h,statut:R,remarques:T,valide:w}=g,y=await r.query("UPDATE commandes SET article=$1, quantite=$2, fournisseur=$3, prix_unitaire=$4, statut=$5, remarques=$6, valide=$7 WHERE id=$8 RETURNING *",[o,_||1,E||null,h||null,R||"en_attente",T||null,w||!1,f]);return y.rows.length===0?s(e,{message:"Commande non trouv\xE9e"},404):s(e,y.rows[0])}if(f&&t.method==="DELETE"){let c=O(d,e);return c||(await r.query("DELETE FROM commandes WHERE id=$1",[f]),s(e,{message:"Commande supprim\xE9e"}))}}if(n==="/comptabilite"&&t.method==="GET"){await r.query(`
        UPDATE paiements p
        SET statut = 'en_retard'
        FROM eleves e
        JOIN (
          SELECT DISTINCT ON (eleve_id) eleve_id, valide_at
          FROM factures_validations
          WHERE valide = true AND valide_at IS NOT NULL
          ORDER BY eleve_id, valide_at DESC
        ) fv ON fv.eleve_id = e.id
        WHERE p.eleve_id = e.id
          AND p.statut = 'en_attente'
          AND p.valide = false
          AND fv.valide_at < NOW() - INTERVAL '30 days'
      `);let f=i.searchParams.get("statut"),c=i.searchParams.get("classe_id"),g=`
        SELECT p.id, p.montant, p.type, p.statut, p.date_paiement, p.commentaire, p.reference, p.valide, p.created_at,
          u.nom, u.prenom, e.id as eleve_id,
          c.nom as classe,
          fv.valide_at as emis_at
        FROM paiements p
        JOIN eleves e ON p.eleve_id = e.id
        JOIN utilisateurs u ON e.utilisateur_id = u.id
        LEFT JOIN classes c ON e.classe_id = c.id
        LEFT JOIN (
          SELECT DISTINCT ON (eleve_id) eleve_id, valide_at
          FROM factures_validations
          WHERE valide = true AND valide_at IS NOT NULL
          ORDER BY eleve_id, valide_at DESC
        ) fv ON fv.eleve_id = e.id
        WHERE 1=1
      `,o=[];f&&(g+=` AND p.statut = $${o.length+1}`,o.push(f)),c&&(g+=` AND e.classe_id = $${o.length+1}`,o.push(c)),g+=" ORDER BY p.created_at DESC";let _=await r.query(g,o);return s(e,_.rows)}if(n==="/comptabilite"&&t.method==="POST"){let f=O(d,e);if(f)return f;let c=await $(t),{eleve_id:g,montant:o,type:_,statut:E,date_paiement:h,commentaire:R,reference:T}=c,w=await r.query("INSERT INTO paiements (eleve_id, montant, type, statut, date_paiement, commentaire, reference) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",[g,o,_,E||"en_attente",h||null,R||null,T||null]);return s(e,{message:"Paiement cree",paiement:w.rows[0]},201)}let u=n.match(/^\/comptabilite\/(\d+)$/);if(u){let f=u[1];if(t.method==="PUT"){let c=O(d,e);if(c)return c;let g=await $(t),{montant:o,type:_,statut:E,date_paiement:h,commentaire:R,reference:T,valide:w}=g;return(await r.query("UPDATE paiements SET montant=$1, type=$2, statut=$3, date_paiement=$4, commentaire=$5, reference=$6, valide=$7 WHERE id=$8 RETURNING *",[o,_,E,h||null,R||null,T||null,w||!1,f])).rows.length===0?s(e,{message:"Paiement non trouve"},404):s(e,{message:"Paiement modifie"})}if(t.method==="DELETE"){let c=O(d,e);return c||(await r.query("DELETE FROM paiements WHERE id=$1",[f]),s(e,{message:"Paiement supprime"}))}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(l){console.error("comptabilite-fast error:",l);let m=l instanceof Error?l.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await r.end()}}async function At(t,n,e,i){let d=await A(t),a=C(d,e,n);if(a)return a;let r=b();try{if(n==="/devoirs"&&t.method==="GET"){let p=i.searchParams.get("classe_id");if(!p)return s(e,{message:"classe_id requis"},400);let u=await r.query("SELECT * FROM devoirs WHERE classe_id=$1 ORDER BY date_remise DESC, created_at DESC",[p]);return s(e,u.rows)}if(n==="/devoirs"&&t.method==="POST"){let p=await $(t),{classe_id:u,titre:f,matiere:c,date_devoir:g,date_remise:o}=p;if(!u||!f)return s(e,{message:"classe_id et titre requis"},400);let _=await r.query("INSERT INTO devoirs (classe_id, titre, matiere, date_devoir, date_remise) VALUES ($1,$2,$3,$4,$5) RETURNING *",[u,f,c||null,g||null,o||null]);return s(e,_.rows[0],201)}let l=n.match(/^\/devoirs\/(\d+)\/suivi(?:\/(\d+))?$/);if(l){let p=l[1],u=l[2];if(!u&&t.method==="GET"){let f=await r.query(`SELECT sd.eleve_id, sd.statut, sd.commentaire,
                  COALESCE(u.nom, e.nom) as nom, COALESCE(u.prenom, e.prenom) as prenom
           FROM suivi_devoirs sd
           JOIN eleves e ON sd.eleve_id = e.id
           LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
           WHERE sd.devoir_id=$1
           ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)`,[p]);return s(e,f.rows)}if(u&&t.method==="PUT"){let f=await $(t),{statut:c,commentaire:g}=f;return["rendu","non_rendu","partiel","excuse"].includes(c)?(await r.query(`INSERT INTO suivi_devoirs (devoir_id, eleve_id, statut, commentaire, updated_at)
           VALUES ($1,$2,$3,$4,NOW())
           ON CONFLICT (devoir_id, eleve_id) DO UPDATE SET statut=$3, commentaire=$4, updated_at=NOW()`,[p,u,c,g||null]),s(e,{message:"Statut mis \xE0 jour"})):s(e,{message:"Statut invalide"},400)}}let m=n.match(/^\/devoirs\/(\d+)$/);return m&&t.method==="DELETE"?(await r.query("DELETE FROM devoirs WHERE id=$1",[m[1]]),s(e,{message:"Devoir supprim\xE9"})):s(e,{message:"Route non trouv\xE9e"},404)}catch(l){console.error("devoirs-fast error:",l);let m=l instanceof Error?l.message:"Erreur serveur";return s(e,{message:m},500)}finally{await r.end()}}async function Ct(t,n,e){let i=b();try{if(n==="/donnees/niveaux"&&t.method==="GET"){let l=await i.query("SELECT * FROM niveaux ORDER BY ordre, nom");return s(e,l.rows)}if(n==="/donnees/niveaux"&&t.method==="POST"){let l=await A(t),m=C(l,e,n);if(m)return m;let p=await $(t),{nom:u,ordre:f=0,periodes_normales:c=20,periodes_soutien:g=0}=p,o=Math.max(0,parseInt(String(c),10)||0),_=Math.max(0,parseInt(String(g),10)||0),E=await i.query("INSERT INTO niveaux (nom, ordre, periodes_normales, periodes_soutien) VALUES ($1,$2,$3,$4) RETURNING *",[u,f,o,_]);return s(e,E.rows[0])}let d=n.match(/^\/donnees\/niveaux\/(\d+)$/);if(d){let l=d[1],m=await A(t),p=C(m,e,n);if(p)return p;if(t.method==="PUT"){let u=await $(t),{nom:f,ordre:c,periodes_normales:g,periodes_soutien:o}=u,_=g==null||g===""?null:Math.max(0,parseInt(String(g),10)||0),E=o==null||o===""?null:Math.max(0,parseInt(String(o),10)||0),h=await i.query(`UPDATE niveaux SET
             nom=$1,
             ordre=$2,
             periodes_normales=COALESCE($3, periodes_normales),
             periodes_soutien=COALESCE($4, periodes_soutien)
           WHERE id=$5 RETURNING *`,[f,c,_,E,l]);return s(e,h.rows[0])}if(t.method==="DELETE")return await i.query("DELETE FROM niveaux WHERE id=$1",[l]),s(e,{ok:!0})}if(n==="/donnees/lieux-travail"&&t.method==="GET"){let l=await i.query("SELECT * FROM lieux_travail ORDER BY COALESCE(ordre, 0), nom");return s(e,l.rows)}if(n==="/donnees/lieux-travail"&&t.method==="POST"){let l=await A(t),m=C(l,e,n);if(m)return m;let p=await $(t),{nom:u,ordre:f=0}=p,c=await i.query("INSERT INTO lieux_travail (nom, ordre) VALUES ($1,$2) RETURNING *",[u,f]);return s(e,c.rows[0])}let a=n.match(/^\/donnees\/lieux-travail\/(\d+)$/);if(a){let l=a[1],m=await A(t),p=C(m,e,n);if(p)return p;if(t.method==="PUT"){let u=await $(t),{nom:f,ordre:c}=u,g=await i.query("UPDATE lieux_travail SET nom=$1, ordre=$2 WHERE id=$3 RETURNING *",[f,c??0,l]);return s(e,g.rows[0])}if(t.method==="DELETE")return await i.query("DELETE FROM lieux_travail WHERE id=$1",[l]),s(e,{ok:!0})}if(n==="/donnees/salles"&&t.method==="GET"){let l=await i.query(`
        SELECT s.*, l.nom AS lieu_nom
        FROM salles s
        LEFT JOIN lieux_travail l ON l.id = s.lieu_travail_id
        ORDER BY l.nom, s.nom
      `);return s(e,l.rows)}if(n==="/donnees/salles"&&t.method==="POST"){let l=await A(t),m=C(l,e,n);if(m)return m;let p=await $(t),{nom:u,lieu_travail_id:f}=p,c=await i.query("INSERT INTO salles (nom, lieu_travail_id) VALUES ($1,$2) RETURNING *",[u,f]);return s(e,c.rows[0])}let r=n.match(/^\/donnees\/salles\/(\d+)$/);if(r){let l=r[1],m=await A(t),p=C(m,e,n);if(p)return p;if(t.method==="PUT"){let u=await $(t),{nom:f,lieu_travail_id:c}=u,g=await i.query("UPDATE salles SET nom=$1, lieu_travail_id=$2 WHERE id=$3 RETURNING *",[f,c,l]);return s(e,g.rows[0])}if(t.method==="DELETE")return await i.query("DELETE FROM salles WHERE id=$1",[l]),s(e,{ok:!0})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(d){console.error("donnees-fast error:",d);let a=d instanceof Error?d.message:"Erreur serveur";return s(e,{message:a},500)}finally{await i.end()}}async function Dt(t,n,e){let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{if(n==="/documents-administratifs"&&t.method==="GET"){let m=await a.query(`
        SELECT
          d.id,
          d.designation,
          d.nom_fichier,
          d.taille,
          d.created_at,
          d.auteur_id,
          d.categorie,
          d.sous_categorie,
          u.nom AS auteur_nom,
          u.prenom AS auteur_prenom
        FROM documents_administratifs d
        LEFT JOIN utilisateurs u ON u.id = d.auteur_id
        ORDER BY LOWER(COALESCE(d.designation, d.nom_fichier, '')) ASC, d.created_at DESC
      `);return s(e,m.rows)}if(n==="/documents-administratifs"&&t.method==="POST"){let m=O(i,e);if(m)return m;let p=await $(t),{designation:u,nom_fichier:f,contenu:c,taille:g,categorie:o,sous_categorie:_}=p;if(!u||!f||!c)return s(e,{message:"Champs requis manquants"},400);if(V()){let R=(await a.query(`INSERT INTO documents_administratifs (designation, nom_fichier, contenu, taille, auteur_id, categorie, sous_categorie, storage_path)
           VALUES ($1,$2,NULL,$3,$4,$5,$6,NULL)
           RETURNING id, designation, nom_fichier, taille, created_at, auteur_id, categorie, sous_categorie`,[u,f,g||null,i.id,o||"Administratifs",_||null])).rows[0],T=`admin/${R.id}_${ee(f)}`;try{await X(H.documentsAdmin,T,String(c)),await a.query("UPDATE documents_administratifs SET storage_path=$1 WHERE id=$2",[T,R.id])}catch(w){throw await a.query("DELETE FROM documents_administratifs WHERE id=$1",[R.id]),w}return s(e,R,201)}let E=await a.query(`INSERT INTO documents_administratifs (designation, nom_fichier, contenu, taille, auteur_id, categorie, sous_categorie)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, designation, nom_fichier, taille, created_at, auteur_id, categorie, sous_categorie`,[u,f,c,g||null,i.id,o||"Administratifs",_||null]);return s(e,E.rows[0],201)}let r=n.match(/^\/documents-administratifs\/(\d+)\/telecharger$/);if(r&&t.method==="GET"){let m=r[1],p=await a.query("SELECT nom_fichier, contenu, storage_path FROM documents_administratifs WHERE id=$1",[m]);if(p.rows.length===0)return s(e,{message:"Document introuvable"},404);let u=p.rows[0],f=await ne(u,H.documentsAdmin);return f?s(e,{nom_fichier:u.nom_fichier,contenu:f}):s(e,{message:"Fichier introuvable"},404)}let l=n.match(/^\/documents-administratifs\/(\d+)$/);if(l){let m=l[1];if(t.method==="PUT"){let p=O(i,e);if(p)return p;let u=await $(t),{designation:f,nom_fichier:c,contenu:g,taille:o,categorie:_,sous_categorie:E}=u;if(!f)return s(e,{message:"La d\xE9signation est requise"},400);let h=await a.query("SELECT id, nom_fichier, contenu, taille, categorie, sous_categorie, storage_path FROM documents_administratifs WHERE id=$1",[m]);if(h.rows.length===0)return s(e,{message:"Document introuvable"},404);let R=h.rows[0],T=R.storage_path,w=R.contenu;if(g&&V()){let N=`admin/${R.id}_${ee(c||R.nom_fichier)}`;await X(H.documentsAdmin,N,String(g)),R.storage_path&&R.storage_path!==N&&await Y(H.documentsAdmin,R.storage_path),T=N,w=null}else g&&(w=String(g),T=null);let y=await a.query(`UPDATE documents_administratifs
           SET designation=$1, nom_fichier=$2, contenu=$3, taille=$4, categorie=$5, sous_categorie=$6, storage_path=$7
           WHERE id=$8
           RETURNING id, designation, nom_fichier, taille, created_at, auteur_id, categorie, sous_categorie`,[f,c||R.nom_fichier,w,typeof o=="number"?o:R.taille,_||R.categorie||"Administratifs",E!==void 0?E:R.sous_categorie,T,m]);return s(e,y.rows[0])}if(t.method==="DELETE"){let p=O(i,e);if(p)return p;let u=await a.query("SELECT id, storage_path FROM documents_administratifs WHERE id=$1",[m]);return u.rows.length===0?s(e,{message:"Document introuvable"},404):(await Y(H.documentsAdmin,u.rows[0].storage_path),await a.query("DELETE FROM documents_administratifs WHERE id=$1",[m]),s(e,{message:"Document supprim\xE9"}))}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("documents-administratifs-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:l},500)}finally{await a.end()}}import ss from"npm:bcryptjs@2";function te(t,n,e){return Object.prototype.hasOwnProperty.call(t,n)?t[n]:e}function B(t,n,e){let i=te(t,n,e[n]);return i===""||i===void 0?null:String(i)}function re(t,n,e){if(!Object.prototype.hasOwnProperty.call(t,n))return e[n];let i=t[n];if(i===""||i===null||i===void 0)return null;let d=parseInt(String(i),10);return Number.isFinite(d)?d:null}async function rs(t,n){let e=await t.connect();try{await e.query("BEGIN");let i=await e.query("SELECT utilisateur_id, photo_storage_path FROM eleves WHERE id=$1",[n]);if(i.rows.length===0)return await e.query("ROLLBACK"),!1;let d=i.rows[0].utilisateur_id,a=i.rows[0].photo_storage_path,r=await e.query("SELECT storage_path FROM documents_eleves WHERE eleve_id=$1 AND storage_path IS NOT NULL",[n]);await e.query("UPDATE eleves SET photo=null, photo_storage_path=null WHERE id=$1",[n]),await e.query("DELETE FROM presences WHERE eleve_id=$1",[n]),await e.query("DELETE FROM notes WHERE eleve_id=$1",[n]),await e.query("DELETE FROM paiements WHERE eleve_id=$1",[n]),await e.query("DELETE FROM observations WHERE eleve_id=$1",[n]),await e.query("DELETE FROM absences WHERE eleve_id=$1",[n]),await e.query("DELETE FROM sanctions_eleves WHERE eleve_id=$1",[n]),await e.query("DELETE FROM documents_eleves WHERE eleve_id=$1",[n]),await e.query("DELETE FROM eleves WHERE id=$1",[n]),d&&(await e.query("DELETE FROM messages WHERE expediteur_id=$1 OR destinataire_id=$1",[d]),await e.query("DELETE FROM notifications WHERE utilisateur_id=$1",[d]),await e.query("DELETE FROM observations WHERE auteur_id=$1",[d]),await e.query("DELETE FROM utilisateurs WHERE id=$1",[d])),await e.query("COMMIT"),await Y(H.elevesPhotos,a);for(let l of r.rows)await Y(H.documentsEleves,l.storage_path);return!0}catch(i){throw await e.query("ROLLBACK"),i}finally{e.release()}}async function It(t,n,e,i){let d=await A(t),a=C(d,e,n);if(a)return a;let r=b();try{if(n==="/eleves"&&t.method==="GET"){let o=await r.query(`
        SELECT e.*,
          COALESCE(u.nom, e.nom) as nom,
          COALESCE(u.prenom, e.prenom) as prenom,
          u.email,
          c.nom as classe_nom,
          (SELECT COUNT(*)::int FROM observations o WHERE o.eleve_id = e.id) AS nb_observations,
          (SELECT COUNT(*)::int FROM sanctions_eleves s WHERE s.eleve_id = e.id) AS nb_sanctions
        FROM eleves e
        LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
        LEFT JOIN classes c ON e.classe_id = c.id
        ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)
      `);return s(e,await we(o.rows))}if(n==="/eleves"&&t.method==="POST"){let o=O(d,e);if(o)return o;let _=await $(t),{nom:E,prenom:h,email:R,mot_de_passe:T,classe_id:w,date_naissance:y,sexe:N,nationalite:S,date_debut_cours:v,categorie:L,telephone:I,adresse:M,nom_parent:W,telephone_parent:F}=_,P=await r.connect();try{await P.query("BEGIN");let U=await ss.hash(String(T||"EcoleManager2024!"),10),x=R&&String(R).trim()?String(R).trim():`eleve.${Date.now()}.${Math.random().toString(36).slice(2)}@ecole.local`,J=(await P.query("INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES ($1,$2,$3,$4,$5) RETURNING id",[E,h,x,U,"eleve"])).rows[0].id,G=await P.query("INSERT INTO eleves (utilisateur_id, classe_id, date_naissance, sexe, nationalite, date_debut_cours, categorie, telephone, adresse, nom_parent, telephone_parent) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id",[J,w||null,y||null,N||null,S||null,v||null,L||null,I||null,M||null,W||null,F||null]);return await P.query("COMMIT"),s(e,{message:"Eleve cree",id:G.rows[0].id},201)}catch(U){throw await P.query("ROLLBACK"),U}finally{P.release()}}if(n==="/eleves/oasi"&&t.method==="GET"){let o=i.searchParams.get("classe_id"),_=await r.query(`
        SELECT e.id, u.nom, u.prenom,
          e.oasi_prog_nom, e.oasi_prog_encadrant, e.oasi_prog_encadrant as oasi_encadrant, e.oasi_n, e.oasi_ref, e.oasi_pos,
          e.oasi_nom as oasi_nom_complet, e.oasi_nais, e.oasi_nationalite,
          e.oasi_prog_presences, e.oasi_prog_admin, e.oasi_as,
          e.oasi_prg_id, e.oasi_prg_occupation_id, e.oasi_ra_id, e.oasi_temps_reparti_id
        FROM eleves e
        LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
        WHERE e.classe_id = $1 AND (e.statut = 'actif' OR e.statut = 'Actif')
        ORDER BY u.nom, u.prenom
      `,[o]);return s(e,_.rows)}let l=n.match(/^\/eleves\/(\d+)\/documents(?:\/(\d+)(?:\/telecharger)?)?$/);if(l){let o=l[1],_=l[2],E=n.endsWith("/telecharger");if(!_&&t.method==="GET"){let h=await r.query("SELECT id, nom, type, taille, created_at FROM documents_eleves WHERE eleve_id=$1 ORDER BY created_at DESC",[o]);return s(e,h.rows)}if(!_&&t.method==="POST"){let h=O(d,e);if(h)return h;let R=await $(t),{nom:T,type:w,contenu:y,taille:N}=R;if(!y)return s(e,{message:"Contenu manquant"},400);if(V()){let L=(await r.query(`INSERT INTO documents_eleves (eleve_id, nom, type, contenu, taille, storage_path)
             VALUES ($1,$2,$3,NULL,$4,NULL) RETURNING id, nom, type, taille, created_at`,[o,T,w||"Autre",N||null])).rows[0],I=`eleves/${o}/${L.id}_${ee(T)}`;try{await X(H.documentsEleves,I,String(y)),await r.query("UPDATE documents_eleves SET storage_path=$1 WHERE id=$2",[I,L.id])}catch(M){throw await r.query("DELETE FROM documents_eleves WHERE id=$1",[L.id]),M}return s(e,L,201)}let S=await r.query("INSERT INTO documents_eleves (eleve_id, nom, type, contenu, taille) VALUES ($1,$2,$3,$4,$5) RETURNING id, nom, type, taille, created_at",[o,T,w||"Autre",y,N||null]);return s(e,S.rows[0],201)}if(_&&E&&t.method==="GET"){let h=await r.query("SELECT nom, contenu, storage_path FROM documents_eleves WHERE id=$1 AND eleve_id=$2",[_,o]);if(h.rows.length===0)return s(e,{message:"Document non trouv\xE9"},404);let R=h.rows[0],T=await ne(R,H.documentsEleves);return T?s(e,{nom:R.nom,contenu:T}):s(e,{message:"Fichier introuvable"},404)}if(_&&!E&&t.method==="DELETE"){let h=O(d,e);if(h)return h;let R=await r.query("SELECT storage_path FROM documents_eleves WHERE id=$1 AND eleve_id=$2",[_,o]);return R.rows.length?(await Y(H.documentsEleves,R.rows[0].storage_path),await r.query("DELETE FROM documents_eleves WHERE id=$1 AND eleve_id=$2",[_,o]),s(e,{message:"Document supprim\xE9"})):s(e,{message:"Document non trouv\xE9"},404)}}let m=n.match(/^\/eleves\/(\d+)\/sanctions(?:\/(\d+))?$/);if(m){let o=m[1],_=m[2];if(!_&&t.method==="GET"){let E=await r.query("SELECT id, echelle, infraction, niveau, date_sanction, prof_nom, observation_ref, created_at FROM sanctions_eleves WHERE eleve_id=$1 ORDER BY echelle, infraction, niveau",[o]);return s(e,E.rows)}if(!_&&t.method==="POST"){let E=O(d,e);if(E)return E;let h=await $(t),{echelle:R,infraction:T,niveau:w,date_sanction:y,prof_nom:N,observation_ref:S}=h,v=String(S||"").trim();if(!v)return s(e,{message:"R\xE9f\xE9rence d'observation obligatoire pour valider la sanction"},400);if(!(await r.query("SELECT id FROM observations WHERE eleve_id=$1 AND reference_obs=$2 LIMIT 1",[o,v])).rows.length)return s(e,{message:"R\xE9f\xE9rence d'observation invalide pour cet \xE9l\xE8ve"},400);if((await r.query("SELECT id FROM sanctions_eleves WHERE eleve_id=$1 AND observation_ref=$2 LIMIT 1",[o,v])).rows.length)return s(e,{message:"Cette r\xE9f\xE9rence d'observation est d\xE9j\xE0 utilis\xE9e pour une autre sanction"},400);if((await r.query("SELECT id FROM sanctions_eleves WHERE eleve_id=$1 AND echelle=$2 AND infraction=$3 AND niveau=$4",[o,R,T,w])).rows.length>0)return s(e,{message:"Sanction d\xE9j\xE0 enregistr\xE9e"},409);let W=await r.query("INSERT INTO sanctions_eleves (eleve_id, echelle, infraction, niveau, date_sanction, prof_nom, observation_ref) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",[o,R,T,w,y||null,N||null,v]);return s(e,W.rows[0],201)}if(_&&t.method==="PUT"){let E=O(d,e);if(E)return E;let h=await $(t),{date_sanction:R,prof_nom:T,observation_ref:w}=h,y=String(w||"").trim();if(!y)return s(e,{message:"R\xE9f\xE9rence d'observation obligatoire pour valider la sanction"},400);if(!(await r.query("SELECT id FROM observations WHERE eleve_id=$1 AND reference_obs=$2 LIMIT 1",[o,y])).rows.length)return s(e,{message:"R\xE9f\xE9rence d'observation invalide pour cet \xE9l\xE8ve"},400);if((await r.query("SELECT id FROM sanctions_eleves WHERE eleve_id=$1 AND observation_ref=$2 AND id <> $3 LIMIT 1",[o,y,parseInt(_,10)])).rows.length)return s(e,{message:"Cette r\xE9f\xE9rence d'observation est d\xE9j\xE0 utilis\xE9e pour une autre sanction"},400);let v=await r.query("UPDATE sanctions_eleves SET date_sanction=$1, prof_nom=$2, observation_ref=$3 WHERE id=$4 AND eleve_id=$5 RETURNING *",[R||null,T||null,y,_,o]);return v.rows.length?s(e,v.rows[0]):s(e,{message:"Sanction non trouv\xE9e"},404)}if(_&&t.method==="DELETE"){let E=O(d,e);return E||(await r.query("DELETE FROM sanctions_eleves WHERE id=$1 AND eleve_id=$2",[_,o]),s(e,{message:"Sanction supprim\xE9e"}))}}let p=n.match(/^\/eleves\/(\d+)\/photo$/);if(p&&t.method==="PUT"){let o=p[1],_=await $(t),{photo:E}=_;if(E!=null){if(typeof E!="string")return s(e,{message:"Format photo invalide"},400);if(!E.startsWith("data:image/"))return s(e,{message:"Le fichier doit etre une image"},400)}let h=await r.query("SELECT photo_storage_path FROM eleves WHERE id=$1",[o]);if(!h.rows.length)return s(e,{message:"Eleve non trouve"},404);let R=h.rows[0].photo_storage_path;if(E==null)return await Y(H.elevesPhotos,R),await r.query("UPDATE eleves SET photo=NULL, photo_storage_path=NULL WHERE id=$1",[o]),s(e,{message:"Photo mise \xE0 jour"});if(V()){let T=`eleves/${o}/photo_${Date.now()}.jpg`;await X(H.elevesPhotos,T,E),await r.query("UPDATE eleves SET photo=NULL, photo_storage_path=$1 WHERE id=$2",[T,o]),R&&R!==T&&await Y(H.elevesPhotos,R)}else await r.query("UPDATE eleves SET photo=$1, photo_storage_path=NULL WHERE id=$2",[E,o]);return s(e,{message:"Photo mise \xE0 jour"})}let u=n.match(/^\/eleves\/(\d+)\/classe$/);if(u&&t.method==="PUT"){let o=u[1],_=await $(t),{classe_id:E}=_;return await r.query("UPDATE eleves SET classe_id=$1 WHERE id=$2",[E||null,o]),s(e,{message:"Classe mise \xE0 jour"})}let f=n.match(/^\/eleves\/(\d+)\/date-debut-cours$/);if(f&&t.method==="PUT"){let o=O(d,e);if(o)return o;let _=f[1],E=await $(t),{date_debut_cours:h}=E;return await r.query("UPDATE eleves SET date_debut_cours=$1 WHERE id=$2",[h||null,_]),s(e,{message:"Date de d\xE9but des cours mise \xE0 jour"})}let c=n.match(/^\/eleves\/(\d+)\/categorie$/);if(c&&t.method==="PUT"){let o=O(d,e);if(o)return o;let _=c[1],E=await $(t),{categorie:h}=E;return await r.query("UPDATE eleves SET categorie=$1 WHERE id=$2",[h||null,_]),s(e,{message:"Cat\xE9gorie mise \xE0 jour"})}let g=n.match(/^\/eleves\/(\d+)$/);if(g){let o=g[1];if(t.method==="GET"){let _=await r.query(`
          SELECT e.id, u.nom, u.prenom, u.email, c.nom as classe, e.classe_id, e.date_naissance, e.sexe, e.nationalite, e.date_debut_cours, e.categorie, e.telephone, e.adresse, e.nom_parent, e.telephone_parent, e.statut
          FROM eleves e
          JOIN utilisateurs u ON e.utilisateur_id = u.id
          LEFT JOIN classes c ON e.classe_id = c.id
          WHERE e.id = $1
        `,[o]);return _.rows.length===0?s(e,{message:"Eleve non trouve"},404):s(e,_.rows[0])}if(t.method==="PUT"){let _=O(d,e);if(_)return _;let E=await $(t),{nom:h,prenom:R,email:T,classe_id:w,date_naissance:y,sexe:N,nationalite:S,date_debut_cours:v,categorie:L,telephone:I,adresse:M,nom_parent:W,telephone_parent:F,statut:P}=E,U=await r.connect();try{await U.query("BEGIN");let x=await U.query("SELECT * FROM eleves WHERE id=$1",[o]);if(x.rows.length===0)return await U.query("ROLLBACK"),s(e,{message:"Eleve non trouve"},404);let D=x.rows[0],J=D.utilisateur_id,G=te(E,"classe_id",D.classe_id),j=te(E,"date_naissance",D.date_naissance),Z=te(E,"date_debut_cours",D.date_debut_cours),Ee=te(E,"categorie",D.categorie),$e=te(E,"telephone",D.telephone),dn=te(E,"adresse",D.adresse),mn=te(E,"nom_parent",D.nom_parent),pn=te(E,"telephone_parent",D.telephone_parent),En=Object.prototype.hasOwnProperty.call(E,"statut")?P||"actif":D.statut||"actif";if(J&&(Object.prototype.hasOwnProperty.call(E,"nom")||Object.prototype.hasOwnProperty.call(E,"prenom")||Object.prototype.hasOwnProperty.call(E,"email"))){let Se=(await U.query("SELECT nom, prenom, email FROM utilisateurs WHERE id=$1",[J])).rows[0]||{};await U.query("UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3 WHERE id=$4",[Object.prototype.hasOwnProperty.call(E,"nom")?h:Se.nom,Object.prototype.hasOwnProperty.call(E,"prenom")?R:Se.prenom,Object.prototype.hasOwnProperty.call(E,"email")?T||null:Se.email,J])}return await U.query(`
            UPDATE eleves SET
              classe_id=$1, date_naissance=$2, date_debut_cours=$3, categorie=$4,
              telephone=$5, adresse=$6, nom_parent=$7, telephone_parent=$8, statut=$9,
              oasi_prog_nom=$10, oasi_prog_encadrant=$11, oasi_n=$12, oasi_ref=$13, oasi_pos=$14,
              oasi_nom=$15, oasi_nais=$16, oasi_nationalite=$17,
              oasi_presence_date=$18, oasi_jour_semaine=$19, oasi_presence_periode=$20,
              oasi_presence_type=$21, oasi_remarque=$22, oasi_controle_du=$23, oasi_controle_au=$24,
              oasi_prog_presences=$25, oasi_prog_admin=$26, oasi_as=$27,
              oasi_prg_id=$28, oasi_prg_occupation_id=$29, oasi_ra_id=$30, oasi_temps_reparti_id=$31,
              nationalite=$32, sexe=$34
            WHERE id=$33
          `,[G??null,j||null,Z||null,Ee||null,$e||null,dn||null,mn||null,pn||null,En,B(E,"oasi_prog_nom",D),B(E,"oasi_prog_encadrant",D),re(E,"oasi_n",D),re(E,"oasi_ref",D),re(E,"oasi_pos",D),B(E,"oasi_nom",D),B(E,"oasi_nais",D),B(E,"oasi_nationalite",D),B(E,"oasi_presence_date",D),B(E,"oasi_jour_semaine",D),B(E,"oasi_presence_periode",D),B(E,"oasi_presence_type",D),B(E,"oasi_remarque",D),B(E,"oasi_controle_du",D),B(E,"oasi_controle_au",D),B(E,"oasi_prog_presences",D),B(E,"oasi_prog_admin",D),B(E,"oasi_as",D),re(E,"oasi_prg_id",D),re(E,"oasi_prg_occupation_id",D),re(E,"oasi_ra_id",D),re(E,"oasi_temps_reparti_id",D),B(E,"nationalite",D),o,Object.prototype.hasOwnProperty.call(E,"sexe")?N||null:D.sexe]),await U.query("COMMIT"),s(e,{message:"Eleve modifie"})}catch(x){throw await U.query("ROLLBACK"),x}finally{U.release()}}if(t.method==="DELETE"){let _=O(d,e);return _||(await rs(r,o)?s(e,{message:"Eleve supprime"}):s(e,{message:"Eleve non trouve"},404))}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(l){console.error("eleves-fast error:",l);let m=l instanceof Error?l.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await r.end()}}async function Mt(t,n,e,i){let d=await A(t),a=C(d,e,n);if(a)return a;let r=b();try{if(n==="/emploi-du-temps/matieres"&&t.method==="GET"){let m=await r.query("SELECT * FROM matieres ORDER BY nom");return s(e,m.rows)}if(n==="/emploi-du-temps/matieres"&&t.method==="POST"){let m=O(d,e);if(m)return m;let p=await $(t),{nom:u,code:f,coefficient:c}=p,g=await r.query("INSERT INTO matieres (nom, code, coefficient) VALUES ($1,$2,$3) RETURNING *",[u,f||null,c||1]);return s(e,{message:"Matiere creee",matiere:g.rows[0]},201)}if(n==="/emploi-du-temps"&&t.method==="GET"){let m=i.searchParams.get("classe_id"),p=i.searchParams.get("prof_id"),u=`
        SELECT e.id, e.jour, e.heure_debut, e.heure_fin, e.salle,
          c.nom as classe, c.id as classe_id,
          m.nom as matiere, m.id as matiere_id,
          u.nom as prof_nom, u.prenom as prof_prenom, u.id as prof_id
        FROM emploi_du_temps e
        JOIN classes c ON e.classe_id = c.id
        LEFT JOIN matieres m ON e.matiere_id = m.id
        LEFT JOIN utilisateurs u ON e.prof_id = u.id
      `,f=[],c=[];m&&(c.push(`e.classe_id = $${f.length+1}`),f.push(m)),p&&(c.push(`e.prof_id = $${f.length+1}`),f.push(p)),c.length>0&&(u+=" WHERE "+c.join(" AND ")),u+=" ORDER BY e.heure_debut";let g=await r.query(u,f);return s(e,g.rows)}if(n==="/emploi-du-temps"&&t.method==="POST"){let m=O(d,e);if(m)return m;let p=await $(t),{classe_id:u,matiere_id:f,prof_id:c,jour:g,heure_debut:o,heure_fin:_,salle:E}=p,h=await r.query("INSERT INTO emploi_du_temps (classe_id, matiere_id, prof_id, jour, heure_debut, heure_fin, salle) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",[u,f,c,g,o,_,E||null]);return s(e,{message:"Cours cree",cours:h.rows[0]},201)}let l=n.match(/^\/emploi-du-temps\/(\d+)$/);if(l){let m=l[1];if(t.method==="PUT"){let p=O(d,e);if(p)return p;let u=await $(t),{classe_id:f,matiere_id:c,prof_id:g,jour:o,heure_debut:_,heure_fin:E,salle:h}=u;return(await r.query("UPDATE emploi_du_temps SET classe_id=$1, matiere_id=$2, prof_id=$3, jour=$4, heure_debut=$5, heure_fin=$6, salle=$7 WHERE id=$8 RETURNING *",[f,c,g,o,_,E,h||null,m])).rows.length===0?s(e,{message:"Cours non trouve"},404):s(e,{message:"Cours modifie"})}if(t.method==="DELETE"){let p=O(d,e);return p||((await r.query("DELETE FROM emploi_du_temps WHERE id=$1 RETURNING id",[m])).rows.length===0?s(e,{message:"Cours non trouve"},404):s(e,{message:"Cours supprime"}))}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(l){console.error("emploi-du-temps-fast error:",l);let m=l instanceof Error?l.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await r.end()}}import Ce from"npm:bcryptjs@2";import is from"npm:nodemailer@6";var as="smtp.office365.com",os=587,us=25e3;async function ls(){let t=b();try{return(await t.query("SELECT * FROM parametres_mail LIMIT 1")).rows[0]||null}finally{await t.end()}}function cs(t){let n=t?.smtp_host||Deno.env.get("EMAIL_HOST")||as,e=Number(t?.smtp_port||Deno.env.get("EMAIL_PORT")||os),i=t?.smtp_secure===!0||String(Deno.env.get("EMAIL_SECURE")||"").toLowerCase()==="true",d=t?.smtp_user||Deno.env.get("EMAIL_USER")||"",a=z(String(t?.smtp_app_password||""))||Deno.env.get("EMAIL_PASS")||"",r=t?.smtp_from_email||Deno.env.get("EMAIL_FROM")||d,l=t?.smtp_from_name||Deno.env.get("EMAIL_FROM_NAME")||"Oasis",m=t?t.smtp_active===!0:!!(d&&a);return{host:n,port:e,secure:i,user:d,appPassword:a,fromEmail:r,fromName:l,enabled:m}}async function ds(){let t=await ls(),n=cs(t);if(!n.enabled)throw new Error("Configuration email inactive. Activez l'envoi email dans Parametres.");if(!n.user||!n.appPassword)throw new Error("Configuration email incomplete. Verifiez l'utilisateur SMTP et le mot de passe d'application.");return{transporter:is.createTransport({host:n.host,port:n.port,secure:n.secure,auth:{user:n.user,pass:n.appPassword},requireTLS:!n.secure,connectionTimeout:15e3,greetingTimeout:1e4,socketTimeout:2e4}),config:n}}async function ue({to:t,subject:n,html:e,text:i}){let{transporter:d,config:a}=await ds(),r=a.fromName?`"${String(a.fromName).replace(/"/g,'\\"')}" <${a.fromEmail}>`:a.fromEmail,l=d.sendMail({from:r,to:t,subject:n,html:e,text:i}),m=new Promise((p,u)=>{setTimeout(()=>u(new Error("Timeout SMTP. Verifiez l'hote/port et les informations d'authentification.")),us)});return Promise.race([l,m])}var Pt="id, nom, prenom, email, actif, created_at, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, role_acces, identifiant, mfa_enabled, mfa_exempt";async function Ut(t,n,e){return e===!0||e==="true"?(await t.query(`UPDATE utilisateurs
       SET mfa_exempt = true,
           mfa_enabled = false,
           mfa_secret = NULL,
           mfa_enabled_at = NULL,
           mfa_backup_codes = '[]'::jsonb
       WHERE id = $1`,[n]),!0):e===!1||e==="false"?(await t.query("UPDATE utilisateurs SET mfa_exempt = false WHERE id = $1",[n]),!1):null}async function Ht(t,n,e){let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{if(n==="/employes-administratifs"&&t.method==="GET"){let p=await a.query(`SELECT ${Pt} FROM utilisateurs WHERE role=$1 ORDER BY nom, prenom`,["admin"]);return s(e,p.rows)}if(n==="/employes-administratifs"&&t.method==="POST"){let p=O(i,e);if(p)return p;let u=await $(t),{nom:f,prenom:c,email:g,mot_de_passe:o,telephone:_,specialite:E,adresse:h,npa:R,lieu:T,sexe:w,taux_activite:y,periodes_semaine:N,date_naissance:S,avs:v,type_contrat:L,type_permis:I,niveau_prefere:M,branches_specialites:W,lieu_travail_prefere:F,remarque_lieu_travail:P,role_acces:U,identifiant:x}=u;if((await a.query("SELECT id FROM utilisateurs WHERE email=$1",[g])).rows.length>0)return s(e,{message:"Email deja utilise"},400);let J=await Ce.hash(String(o||"Admin123!"),10),G=String(x||"").trim()||(String(c||"").slice(0,3)+String(f||"").slice(0,3)).toLowerCase()||null,j=await a.query(`INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, role_acces, identifiant)
         VALUES ($1,$2,$3,$4,'admin',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING id, nom, prenom, email`,[f,c,g,J,_||null,E||null,h||null,R||null,T||null,w||null,y?parseInt(String(y)):null,N?parseInt(String(N)):null,S&&S!==""?S:null,v||null,L||null,I||null,M||null,W||null,F||null,P||null,U||"employe",G]);return await Ut(a,j.rows[0].id,u.mfa_exempt),s(e,{message:"Employe administratif cree",employe:j.rows[0]},201)}let r=n.match(/^\/employes-administratifs\/(\d+)\/envoyer-acces$/);if(r&&t.method==="POST"){let p=O(i,e);if(p)return p;let u=r[1],f=await a.query("SELECT nom, prenom, email FROM utilisateurs WHERE id=$1 AND role=$2",[u,"admin"]);if(f.rows.length===0)return s(e,{message:"Employe administratif non trouv\xE9"},404);let c=f.rows[0],g="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#",o="";for(let E=0;E<10;E++)o+=g[Math.floor(Math.random()*g.length)];let _=await Ce.hash(o,10);return await a.query("UPDATE utilisateurs SET mot_de_passe=$1, doit_changer_mdp=true WHERE id=$2",[_,u]),await ue({to:c.email,subject:"Vos acc\xE8s \xC9cole Manager",html:`
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#f8fafc;border-radius:12px">
            <h2 style="color:#6366f1">\u{1F393} \xC9cole Manager</h2>
            <p>Bonjour <b>${c.prenom} ${c.nom}</b>,</p>
            <p>Voici vos acc\xE8s pour vous connecter \xE0 l'application :</p>
            <div style="background:white;padding:20px;border-radius:8px;border-left:4px solid #6366f1;margin:20px 0">
              <p style="margin:0"><b>Email :</b> ${c.email}</p>
              <p style="margin:8px 0 0"><b>Mot de passe temporaire :</b> <code style="background:#e0e7ff;padding:4px 8px;border-radius:4px;font-size:16px">${o}</code></p>
            </div>
            <p style="color:#ef4444;font-weight:bold">\u26A0\uFE0F Vous devrez changer ce mot de passe lors de votre premi\xE8re connexion.</p>
          </div>
        `,text:`Bonjour ${c.prenom} ${c.nom}, vos acces Ecole Manager sont prets. Email: ${c.email}. Mot de passe temporaire: ${o}.`}),s(e,{message:"Email envoy\xE9 \xE0 "+c.email})}let l=n.match(/^\/employes-administratifs\/(\d+)\/documents(?:\/(\d+)(?:\/telecharger)?)?$/);if(l){let p=l[1],u=l[2],f=n.endsWith("/telecharger");if(!u&&t.method==="GET"){let c=await a.query("SELECT id, nom, type, taille, created_at FROM documents_profs WHERE prof_id=$1 ORDER BY created_at DESC",[p]);return s(e,c.rows)}if(!u&&t.method==="POST"){let c=O(i,e);if(c)return c;let g=await $(t),{nom:o,type:_,contenu:E,taille:h}=g;if(!E)return s(e,{message:"Contenu manquant"},400);if(V()){let w=(await a.query(`INSERT INTO documents_profs (prof_id, nom, type, contenu, taille, storage_path)
             VALUES ($1,$2,$3,NULL,$4,NULL) RETURNING id, nom, type, taille, created_at`,[p,o,_||"Autre",h||null])).rows[0],y=`employes/${p}/${w.id}_${ee(o)}`;try{await X(H.documentsProfs,y,String(E)),await a.query("UPDATE documents_profs SET storage_path=$1 WHERE id=$2",[y,w.id])}catch(N){throw await a.query("DELETE FROM documents_profs WHERE id=$1",[w.id]),N}return s(e,w,201)}let R=await a.query("INSERT INTO documents_profs (prof_id, nom, type, contenu, taille) VALUES ($1,$2,$3,$4,$5) RETURNING id, nom, type, taille, created_at",[p,o,_||"Autre",E,h||null]);return s(e,R.rows[0],201)}if(u&&f&&t.method==="GET"){let c=await a.query("SELECT nom, contenu, storage_path FROM documents_profs WHERE id=$1 AND prof_id=$2",[u,p]);if(c.rows.length===0)return s(e,{message:"Document non trouv\xE9"},404);let g=c.rows[0],o=await ne(g,H.documentsProfs);return o?s(e,{nom:g.nom,contenu:o}):s(e,{message:"Fichier introuvable"},404)}if(u&&!f&&t.method==="DELETE"){let c=O(i,e);if(c)return c;let g=await a.query("SELECT storage_path FROM documents_profs WHERE id=$1 AND prof_id=$2",[u,p]);return g.rows.length?(await Y(H.documentsProfs,g.rows[0].storage_path),await a.query("DELETE FROM documents_profs WHERE id=$1 AND prof_id=$2",[u,p]),s(e,{message:"Document supprim\xE9"})):s(e,{message:"Document non trouv\xE9"},404)}}let m=n.match(/^\/employes-administratifs\/(\d+)$/);if(m){let p=m[1];if(t.method==="GET"){let u=await a.query(`SELECT ${Pt} FROM utilisateurs WHERE id=$1 AND role=$2`,[p,"admin"]);return u.rows.length===0?s(e,{message:"Employe administratif non trouve"},404):s(e,u.rows[0])}if(t.method==="PUT"){let u=O(i,e);if(u)return u;let f=await $(t),{nom:c,prenom:g,email:o,actif:_,mot_de_passe:E,telephone:h,specialite:R,adresse:T,npa:w,lieu:y,sexe:N,taux_activite:S,periodes_semaine:v,date_naissance:L,avs:I,type_contrat:M,type_permis:W,niveau_prefere:F,branches_specialites:P,lieu_travail_prefere:U,remarque_lieu_travail:x,role_acces:D,identifiant:J}=f,G,j;if(E&&String(E).trim()!==""){let Ee=await Ce.hash(String(E),10);G="UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, mot_de_passe=$5, telephone=$6, specialite=$7, adresse=$8, npa=$9, lieu=$10, sexe=$11, taux_activite=$12, periodes_semaine=$13, date_naissance=$14, avs=$15, type_contrat=$16, type_permis=$17, niveau_prefere=$18, branches_specialites=$19, lieu_travail_prefere=$20, remarque_lieu_travail=$21, role_acces=$22, identifiant=$23 WHERE id=$24 AND role='admin' RETURNING id",j=[c,g,o,_!==void 0?_:!0,Ee,h||null,R||null,T||null,w||null,y||null,N||null,S?parseInt(String(S)):null,v?parseInt(String(v)):null,L&&L!==""?L:null,I||null,M||null,W||null,F||null,P||null,U||null,x||null,D||"employe",J||null,p]}else G="UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, telephone=$5, specialite=$6, adresse=$7, npa=$8, lieu=$9, sexe=$10, taux_activite=$11, periodes_semaine=$12, date_naissance=$13, avs=$14, type_contrat=$15, type_permis=$16, niveau_prefere=$17, branches_specialites=$18, lieu_travail_prefere=$19, remarque_lieu_travail=$20, role_acces=$21, identifiant=$22 WHERE id=$23 AND role='admin' RETURNING id",j=[c,g,o,_!==void 0?_:!0,h||null,R||null,T||null,w||null,y||null,N||null,S?parseInt(String(S)):null,v?parseInt(String(v)):null,L&&L!==""?L:null,I||null,M||null,W||null,F||null,P||null,U||null,x||null,D||"employe",J||null,p];return(await a.query(G,j)).rows.length===0?s(e,{message:"Employe administratif non trouve"},404):(await Ut(a,p,f.mfa_exempt),s(e,{message:"Employe administratif modifie"}))}if(t.method==="DELETE"){let u=O(i,e);return u||(String(i.id)===String(p)?s(e,{message:"Suppression de votre propre compte interdite"},400):(await a.query("DELETE FROM utilisateurs WHERE id=$1 AND role=$2 RETURNING id",[p,"admin"])).rows.length===0?s(e,{message:"Employe administratif non trouve"},404):s(e,{message:"Employe administratif supprime"}))}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("employes-administratifs-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:l},500)}finally{await a.end()}}async function Wt(t,n,e){let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{if(n==="/enclassements"&&t.method==="GET"){let m=await a.query(`
        SELECT e.*,
          u.prenom || ' ' || u.nom as created_by_nom,
          (SELECT COUNT(*)::int FROM affectations_eleves_enc a
            JOIN classes_enclassement c ON a.classe_id = c.id
            WHERE c.enclassement_id = e.id) as nb_eleves,
          (SELECT COUNT(*)::int FROM classes_enclassement c WHERE c.enclassement_id = e.id) as nb_classes
        FROM enclassements e
        LEFT JOIN utilisateurs u ON e.created_by = u.id
        ORDER BY e.created_at DESC
      `);return s(e,m.rows)}if(n==="/enclassements"&&t.method==="POST"){let m=await $(t),{nom:p,session_tcf:u,parametres:f,classes:c}=m,g=await a.connect();try{await g.query("BEGIN");let _=(await g.query(`INSERT INTO enclassements (nom, session_tcf, created_by, statut, parametres)
           VALUES ($1, $2, $3, 'valid\xE9', $4) RETURNING *`,[p,u||"Test d'ao\xFBt",i.id,JSON.stringify(f||{})])).rows[0];for(let E of c||[]){let R=(await g.query(`INSERT INTO classes_enclassement (enclassement_id, structure, nom, capacite_max)
             VALUES ($1, $2, $3, $4) RETURNING id`,[_.id,E.structure,E.nom,E.capacite_max||(E.structure==="CSC"?12:15)])).rows[0].id;for(let T of E.eleves||[])await g.query(`INSERT INTO affectations_eleves_enc
               (classe_id, eleve_id, score_francais, score_math, score_pondere, flagge_plancher, motif_flag, position_serpentin, modifie_manuellement)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[R,T.eleve_id,T.score_francais,T.score_math,T.score_pondere,T.flagge_plancher||!1,T.motif_flag||null,T.position_serpentin,T.modifie_manuellement||!1])}return await g.query("COMMIT"),s(e,_)}catch(o){throw await g.query("ROLLBACK"),o}finally{g.release()}}let r=n.match(/^\/enclassements\/(\d+)\/statut$/);if(r&&t.method==="PATCH"){let m=r[1],p=await $(t),{statut:u}=p,f=await a.query("UPDATE enclassements SET statut=$1 WHERE id=$2 RETURNING *",[u,m]);return s(e,f.rows[0])}let l=n.match(/^\/enclassements\/(\d+)$/);if(l){let m=l[1];if(t.method==="GET"){let[p,u]=await Promise.all([a.query("SELECT * FROM enclassements WHERE id=$1",[m]),a.query(`
            SELECT c.*,
              COALESCE(json_agg(
                json_build_object(
                  'id', a.id,
                  'eleve_id', a.eleve_id,
                  'nom', u.nom,
                  'prenom', u.prenom,
                  'score_francais', a.score_francais,
                  'score_math', a.score_math,
                  'score_pondere', a.score_pondere,
                  'flagge_plancher', a.flagge_plancher,
                  'motif_flag', a.motif_flag,
                  'position_serpentin', a.position_serpentin,
                  'modifie_manuellement', a.modifie_manuellement
                ) ORDER BY a.position_serpentin
              ) FILTER (WHERE a.id IS NOT NULL), '[]') as eleves
            FROM classes_enclassement c
            LEFT JOIN affectations_eleves_enc a ON a.classe_id = c.id
            LEFT JOIN eleves el ON a.eleve_id = el.id
            LEFT JOIN utilisateurs u ON el.utilisateur_id = u.id
            WHERE c.enclassement_id = $1
            GROUP BY c.id
            ORDER BY c.structure, c.nom
          `,[m])]);return p.rows[0]?s(e,{...p.rows[0],classes:u.rows}):s(e,{error:"Non trouv\xE9"},404)}if(t.method==="DELETE")return await a.query("DELETE FROM enclassements WHERE id=$1",[m]),s(e,{ok:!0})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("enclassements-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{error:l},500)}finally{await a.end()}}import*as ye from"npm:xlsx";function Ft(t){if(!t)return null;let n=String(t).split("/");return n.length>=2?n[1].trim():null}function me(t){if(!t)return null;try{let n=new Date(String(t));return isNaN(n.getTime())?null:n.toISOString().substring(0,10)}catch{return null}}function K(t){if(!t)return null;let n=parseInt(String(t));return isNaN(n)?null:n}async function xt(t){let e=(await t.formData()).get("fichier");if(!e||!(e instanceof File))return null;let i=new Uint8Array(await e.arrayBuffer()),d=ye.read(i,{type:"array",cellDates:!0}),a=d.Sheets[d.SheetNames[0]];return ye.utils.sheet_to_json(a,{header:1,raw:!1})}async function qt(t,n,e){let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{if(n==="/import/eleves"&&t.method==="POST"){let r=await xt(t);if(!r)return s(e,{message:"Fichier manquant"},400);let l=r.slice(1).filter(E=>E[3]),m=new Set,p=[];for(let E of l){let h=E,R=parseInt(String(h[3]));R&&!m.has(R)&&(m.add(R),p.push(h))}let u=await a.query("SELECT date_debut_annee FROM parametres_ecole LIMIT 1"),f=u.rows[0]?.date_debut_annee?new Date(u.rows[0].date_debut_annee).toISOString().substring(0,10):null,c=await a.query("SELECT id, nom FROM classes"),g={};for(let E of c.rows)g[String(E.nom).trim().toLowerCase()]=E.id;let o=0,_=0;for(let E of p){let h=parseInt(String(E[3]));if((await a.query("SELECT id FROM eleves WHERE oasi_ref=$1",[h])).rows.length>0){_++;continue}let T=String(E[5]||"").trim(),w=T.split(" "),y=w.filter(L=>L.length>0&&L===L.toUpperCase()).join(" "),N=w.filter(L=>L.length>0&&L!==L.toUpperCase()).join(" "),S=Ft(E[0]),v=S&&g[S.toLowerCase()]||null;await a.query(`
        INSERT INTO eleves (
          nom, prenom, date_naissance, nationalite, statut, nom_parent,
          categorie, classe_id, date_debut_cours,
          oasi_prog_nom, oasi_prog_encadrant, oasi_n, oasi_ref, oasi_pos,
          oasi_nom, oasi_nais,
          oasi_nationalite,
          oasi_presence_date, oasi_jour_semaine, oasi_presence_periode, oasi_presence_type,
          oasi_remarque, oasi_controle_du, oasi_controle_au,
          oasi_prog_presences, oasi_prog_admin, oasi_as,
          oasi_prg_id, oasi_prg_occupation_id, oasi_ra_id, oasi_temps_reparti_id
        ) VALUES (
          $1,$2,$3,$4,'actif',$5,
          'OASI',$6,$7,
          $8,$9,$10,$11,$12,
          $13,$14,
          $15,
          $16,$17,$18,$19,
          $20,$21,$22,
          $23,$24,$25,
          $26,$27,$28,$29
        )
      `,[y,N,me(E[6]),E[7]||null,E[17]||null,v,f,E[0]||null,E[1]||null,K(E[2]),h,K(E[4]),T,me(E[6]),E[7]||null,me(E[8]),E[9]||null,E[10]||null,E[11]||null,E[12]||null,me(E[13]),me(E[14]),E[15]||null,E[16]||null,E[17]||null,K(E[18]),K(E[19]),K(E[20]),K(E[21])]),o++}return s(e,{message:`Import termin\xE9 : ${o} cr\xE9\xE9(s), ${_} d\xE9j\xE0 existant(s)`,created:o,skipped:_})}if(n==="/import/update-lora"&&t.method==="POST"){let r=await xt(t);if(!r)return s(e,{message:"Fichier manquant"},400);let l=r.slice(1).filter(R=>R[3]),m=new Set,p=[];for(let R of l){let T=R,w=parseInt(String(T[3]));w&&!m.has(w)&&(m.add(w),p.push(T))}let u=await a.query("SELECT id, nom FROM classes"),f={};for(let R of u.rows)f[String(R.nom).trim().toLowerCase()]=R.id;let c=0,g=0,o=0,_=new Set;for(let R of p){let T=parseInt(String(R[3]));if((await a.query("SELECT id FROM eleves WHERE oasi_ref=$1",[T])).rows.length===0){g++;continue}let y=Ft(R[0]),N=y&&f[y.toLowerCase()]||null;N?o++:y&&_.add(y),await a.query(`
        UPDATE eleves SET
          oasi_prog_nom=$1, oasi_prog_encadrant=$2, oasi_n=$3, oasi_pos=$4,
          oasi_prog_presences=$5, oasi_prog_admin=$6, oasi_as=$7,
          oasi_prg_id=$8, oasi_prg_occupation_id=$9, oasi_ra_id=$10, oasi_temps_reparti_id=$11,
          classe_id=$13
        WHERE oasi_ref=$12
      `,[R[0]||null,R[1]||null,K(R[2]),K(R[4]),R[15]||null,R[16]||null,R[17]||null,K(R[18]),K(R[19]),K(R[20]),K(R[21]),T,N]),c++}let E=[..._].join(", "),h=`Mise \xE0 jour termin\xE9e : ${c} mis \xE0 jour, ${o} avec classe assign\xE9e`+(E?` \u2014 codes non trouv\xE9s : ${E}`:"")+(g?`, ${g} \xE9l\xE8ve(s) introuvable(s)`:"");return s(e,{message:h,updated:c,notFound:g,classMatched:o,unmatchedCodes:[..._]})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("import-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur import: "+l},500)}finally{await a.end()}}async function Bt(t,n,e){let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{let r=n.match(/^\/inventaire-branches\/(\d+)\/branches$/);if(r&&t.method==="GET"){let p=parseInt(r[1],10);if(!p)return s(e,{message:"Classe invalide"},400);let u=await a.query("SELECT id, niveau, nom FROM classes WHERE id=$1",[p]);if(!u.rows.length)return s(e,{message:"Classe non trouvee"},404);let f={...u.rows[0],niveau:u.rows[0].niveau!=null?String(u.rows[0].niveau).trim():""},c=[];return f.niveau&&(c=(await a.query(`SELECT id, nom, code, niveau, designation_courte, type_branche FROM matieres
           WHERE LOWER(TRIM(COALESCE(niveau, ''))) = LOWER($1) ORDER BY nom`,[f.niveau])).rows),c.length===0&&(c=(await a.query("SELECT id, nom, code, niveau, designation_courte, type_branche FROM matieres ORDER BY nom")).rows),s(e,{classe:f,branches:c})}let l=n.match(/^\/inventaire-branches\/(\d+)\/branches\/(\d+)\/reorder$/);if(l&&t.method==="POST"){let p=de(i,e,"admin","prof");if(p)return p;let u=parseInt(l[1],10),f=parseInt(l[2],10),c=await $(t),{ids:g}=c;if(!u||!f||!Array.isArray(g))return s(e,{message:"Parametres invalides"},400);for(let o=0;o<g.length;o+=1){let _=parseInt(String(g[o]),10);_&&await a.query("UPDATE inventaire_branches SET ordre=$1 WHERE id=$2 AND classe_id=$3 AND branche_id=$4",[o+1,_,u,f])}return s(e,{message:"Ordre mis a jour"})}let m=n.match(/^\/inventaire-branches\/(\d+)\/branches\/(\d+)(?:\/(\d+))?$/);if(m){let p=parseInt(m[1],10),u=parseInt(m[2],10),f=m[3];if(!f&&t.method==="GET"){if(!p||!u)return s(e,{message:"Parametres invalides"},400);let c=await a.query(`
          SELECT ib.*, m.nom AS branche_nom, u.nom AS auteur_nom, u.prenom AS auteur_prenom
          FROM inventaire_branches ib
          JOIN matieres m ON m.id=ib.branche_id
          LEFT JOIN utilisateurs u ON u.id=ib.auteur_id
          WHERE ib.classe_id=$1 AND ib.branche_id=$2
          ORDER BY COALESCE(ib.ordre, 999999) ASC, ib.created_at ASC, ib.id ASC
        `,[p,u]);return s(e,c.rows)}if(!f&&t.method==="POST"){let c=de(i,e,"admin","prof");if(c)return c;let g=await $(t),{date_document:o,nom_document:_,numero_document:E,remarques:h,sans_numero:R}=g;if(!p||!u)return s(e,{message:"Parametres invalides"},400);if(!_||!String(_).trim())return s(e,{message:"Le nom du document est requis"},400);let w=(await a.query("SELECT COALESCE(MAX(ordre), 0) + 1 AS next_ordre FROM inventaire_branches WHERE classe_id=$1 AND branche_id=$2",[p,u])).rows[0]?.next_ordre||1,y=await a.query(`
          INSERT INTO inventaire_branches (
            classe_id, branche_id, date_document, nom_document, numero_document, ordre, sans_numero, remarques, auteur_id
          ) VALUES (
            $1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5, $6, $7, $8, $9
          )
          RETURNING *
        `,[p,u,o||null,String(_).trim(),E||null,w,!!R,h||null,i.id||null]);return s(e,y.rows[0],201)}if(f&&t.method==="PUT"){let c=de(i,e,"admin","prof");if(c)return c;let g=parseInt(f,10),o=await $(t),{date_document:_,nom_document:E,remarques:h,sans_numero:R}=o;if(!p||!u||!g)return s(e,{message:"Parametres invalides"},400);if(!E||!String(E).trim())return s(e,{message:"Le nom du document est requis"},400);let T=await a.query(`
          UPDATE inventaire_branches
          SET
            date_document = COALESCE($1::date, CURRENT_DATE),
            nom_document = $2,
            sans_numero = $3,
            remarques = $4
          WHERE id=$5 AND classe_id=$6 AND branche_id=$7
          RETURNING *
        `,[_||null,String(E).trim(),!!R,h||null,g,p,u]);return T.rows.length?s(e,T.rows[0]):s(e,{message:"Ligne inventaire non trouvee"},404)}if(f&&t.method==="DELETE"){let c=de(i,e,"admin","prof");if(c)return c;let g=parseInt(f,10);return!p||!u||!g?s(e,{message:"Parametres invalides"},400):(await a.query("DELETE FROM inventaire_branches WHERE id=$1 AND classe_id=$2 AND branche_id=$3 RETURNING id",[g,p,u])).rows.length?s(e,{message:"Ligne supprimee"}):s(e,{message:"Ligne inventaire non trouvee"},404)}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("inventaire-branches-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:l},500)}finally{await a.end()}}async function kt(t,n,e,i){let d=await A(t),a=C(d,e,n);if(a)return a;let r=b();try{if(n==="/notes/classes-responsables"&&t.method==="GET"){let u=await r.query(`
        SELECT a.classe_id,
          u.id as prof_id,
          u.prenom as prof_prenom,
          u.nom as prof_nom,
          (c.prof_principal_id = u.id) as est_titulaire,
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'matiere_id', m.id,
                'label', COALESCE(NULLIF(TRIM(m.designation_courte),''), m.nom)
              )
              ORDER BY COALESCE(NULLIF(TRIM(m.designation_courte),''), m.nom)
            ) FILTER (WHERE m.id IS NOT NULL AND (a.type_special IS NULL OR a.type_special = '') AND COALESCE(m.suivi_notes, true) IS DISTINCT FROM false),
            '[]'::jsonb
          ) as matieres_detail
        FROM affectations a
        JOIN utilisateurs u ON u.id = a.prof_id
        JOIN classes c ON c.id = a.classe_id
        LEFT JOIN matieres m ON m.id = a.matiere_id
        GROUP BY a.classe_id, u.id, u.prenom, u.nom, c.prof_principal_id
        ORDER BY a.classe_id, (c.prof_principal_id = u.id) DESC, u.nom
      `);return s(e,u.rows)}if(n==="/notes/semestre-config"&&t.method==="GET")try{await r.query("CREATE TABLE IF NOT EXISTS app_settings (cle TEXT PRIMARY KEY, valeur TEXT)");let u=await r.query("SELECT valeur FROM app_settings WHERE cle = 'sem1_bloque' LIMIT 1");return s(e,{sem1_bloque:u.rows.length>0&&u.rows[0].valeur==="true"})}catch{return s(e,{sem1_bloque:!1})}if(n==="/notes/semestre-config"&&t.method==="PUT"){let u=O(d,e);if(u)return u;let f=await $(t),{sem1_bloque:c}=f;return await r.query("CREATE TABLE IF NOT EXISTS app_settings (cle TEXT PRIMARY KEY, valeur TEXT)"),await r.query("INSERT INTO app_settings (cle, valeur) VALUES ('sem1_bloque', $1) ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur",[c?"true":"false"]),s(e,{message:"OK"})}if(n==="/notes/bulletin"&&t.method==="GET"){let u=i.searchParams.get("classe_id"),f=i.searchParams.get("semestre"),c=await r.query(`
        SELECT e.id, COALESCE(u.nom, e.nom) as nom, COALESCE(u.prenom, e.prenom) as prenom, e.date_debut_cours, e.date_naissance, e.nationalite, e.oasi_nais, e.oasi_nationalite
        FROM eleves e
        LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
        WHERE e.classe_id = $1 AND LOWER(COALESCE(e.statut, 'actif')) = 'actif'
        ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)
      `,[u]),g=await r.query("SELECT * FROM matieres ORDER BY nom"),o=await Promise.all(c.rows.map(async _=>{let E={};for(let T of g.rows){let w=[_.id,T.id],y="";f&&(w.push(parseInt(f)),y=` AND ev.semestre = $${w.length}`);let N=await r.query(`
              SELECT n.valeur, n.absent, n.dispense, ev.coefficient
              FROM notes n
              JOIN evaluations ev ON n.evaluation_id = ev.id
              WHERE n.eleve_id = $1 AND ev.matiere_id = $2 AND n.absent = false AND n.dispense = false AND n.valeur IS NOT NULL${y}
            `,w);if(N.rows.length>0){let S=N.rows.reduce((v,L)=>v+parseFloat(String(L.valeur)),0)/N.rows.length;E[T.nom]={moyenne:Math.round(S*100)/100,coefficient:T.coefficient,nbNotes:N.rows.length}}}let h=0,R=0;return Object.values(E).forEach(T=>{h+=T.moyenne*parseFloat(String(T.coefficient)),R+=parseFloat(String(T.coefficient))}),R>0&&(h=Math.round(h/R*100)/100),{eleve:_,parMatiere:E,moyenneGenerale:h}}));return s(e,o)}if(n==="/notes/bulletin-criteres"&&t.method==="GET"){let u=i.searchParams.get("classe_id"),f=i.searchParams.get("semestre"),c=parseInt(f||"1")||1;await r.query(`
        DO $$ BEGIN
          ALTER TABLE bulletin_criteres ADD COLUMN IF NOT EXISTS semestre INT NOT NULL DEFAULT 1;
          ALTER TABLE bulletin_criteres DROP CONSTRAINT IF EXISTS bulletin_criteres_classe_id_eleve_id_key;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'bulletin_criteres' AND constraint_name = 'bulletin_criteres_classe_eleve_semestre_key'
          ) THEN
            ALTER TABLE bulletin_criteres ADD CONSTRAINT bulletin_criteres_classe_eleve_semestre_key
              UNIQUE (classe_id, eleve_id, semestre);
          END IF;
        END $$
      `);let g=await r.query(`
        SELECT eleve_id, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, remarques, valide, semestre
        FROM bulletin_criteres WHERE classe_id = $1 AND semestre = $2
      `,[u,c]);return s(e,g.rows)}let l=n.match(/^\/notes\/bulletin-criteres\/(\d+)$/);if(l&&t.method==="PUT"){let u=l[1],f=await $(t),{classe_id:c,c1:g,c2:o,c3:_,c4:E,c5:h,c6:R,c7:T,c8:w,c9:y,c10:N,remarques:S,valide:v,semestre:L}=f,I=parseInt(String(L))||1;return await r.query(`
        INSERT INTO bulletin_criteres (classe_id, eleve_id, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, remarques, valide, semestre)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (classe_id, eleve_id, semestre) DO UPDATE SET
          c1=$3, c2=$4, c3=$5, c4=$6, c5=$7, c6=$8, c7=$9, c8=$10, c9=$11, c10=$12, remarques=$13, valide=$14
      `,[c,u,g||null,o||null,_||null,E||null,h||null,R||null,T||null,w||null,y||null,N||null,S||null,v===!0||v==="true",I]),s(e,{message:"Crit\xE8res bulletin enregistr\xE9s"})}if(n==="/notes/rapport"&&t.method==="GET"){let u=i.searchParams.get("classe_id"),f=i.searchParams.get("semestre"),c=await r.query(`
        SELECT e.id,
          COALESCE(u.nom, e.nom) as nom,
          COALESCE(u.prenom, e.prenom) as prenom
        FROM eleves e
        LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
        WHERE e.classe_id = $1 AND LOWER(COALESCE(e.statut, 'actif')) = 'actif'
        ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)
      `,[u]),g=[u],o="WHERE ev.classe_id = $1";f&&(g.push(parseInt(f)),o+=` AND ev.semestre = $${g.length}`);let _=await r.query(`
        SELECT ev.id, ev.nom, ev.date, ev.type, ev.coefficient, ev.points_max,
          m.id as matiere_id, m.nom as matiere_nom,
          u.nom as prof_nom, u.prenom as prof_prenom
        FROM evaluations ev
        JOIN matieres m ON ev.matiere_id = m.id
        LEFT JOIN utilisateurs u ON ev.prof_id = u.id
        ${o}
        ORDER BY m.nom, ev.date
      `,g),E=await r.query(`
        SELECT n.eleve_id, n.evaluation_id, n.valeur, n.absent, n.dispense
        FROM notes n
        JOIN evaluations ev ON n.evaluation_id = ev.id
        WHERE ev.classe_id = $1${f?" AND ev.semestre = $2":""}
      `,f?[u,parseInt(f)]:[u]),h={};for(let R of _.rows){h[R.matiere_id]||(h[R.matiere_id]={matiere_id:R.matiere_id,matiere_nom:R.matiere_nom,evaluations:[]});let T=E.rows.filter(w=>w.evaluation_id===R.id);h[R.matiere_id].evaluations.push({id:R.id,nom:R.nom,date:R.date,type:R.type,coefficient:parseFloat(String(R.coefficient)),prof_nom:R.prof_nom,prof_prenom:R.prof_prenom,notes:c.rows.map(w=>{let y=T.find(N=>N.eleve_id===w.id);return{eleve_id:w.id,valeur:y?y.valeur:null,absent:y?y.absent:null,dispense:y?y.dispense:null}})})}return s(e,{eleves:c.rows,matieres:Object.values(h)})}if(n==="/notes/suivi-classes"&&t.method==="GET"){let u=await r.query(`
        SELECT ev.classe_id, ev.matiere_id, ev.prof_id, COUNT(ev.id)::int as nb_evaluations
        FROM evaluations ev
        GROUP BY ev.classe_id, ev.matiere_id, ev.prof_id
      `);return s(e,u.rows)}if(n==="/notes"&&t.method==="GET"){await r.query("ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS semestre INT DEFAULT 1");let u=i.searchParams.get("classe_id"),f=i.searchParams.get("matiere_id"),c=i.searchParams.get("semestre"),g=`
        SELECT ev.id, ev.nom, ev.date, ev.type, ev.coefficient, ev.sur, ev.points_max, ev.publie, ev.created_at, ev.semestre,
          m.nom as matiere, m.id as matiere_id,
          c.nom as classe,
          u.nom as prof_nom, u.prenom as prof_prenom,
          COUNT(n.id) as nb_notes,
          ROUND(AVG(CASE WHEN n.absent = false AND n.dispense = false AND n.valeur IS NOT NULL THEN n.valeur END)::numeric, 1) as moyenne_classe,
          (SELECT COUNT(*) FROM eleves e2 WHERE e2.classe_id = ev.classe_id AND LOWER(COALESCE(e2.statut, 'actif')) = 'actif') as nb_eleves_classe,
          COUNT(CASE WHEN n.absent = false AND n.dispense = false AND n.valeur IS NOT NULL THEN 1 END) as nb_notes_saisies,
          COUNT(CASE WHEN n.dispense = true THEN 1 END) as nb_dispenses
        FROM evaluations ev
        JOIN matieres m ON ev.matiere_id = m.id
        JOIN classes c ON ev.classe_id = c.id
        JOIN utilisateurs u ON ev.prof_id = u.id
        LEFT JOIN notes n ON n.evaluation_id = ev.id
        WHERE ev.classe_id = $1
      `,o=[u];f&&(g+=` AND ev.matiere_id = $${o.length+1}`,o.push(f)),c&&(g+=` AND ev.semestre = $${o.length+1}`,o.push(parseInt(c))),g+=" GROUP BY ev.id, m.nom, m.id, c.nom, u.nom, u.prenom ORDER BY ev.date DESC";let _=await r.query(g,o);return s(e,_.rows)}if(n==="/notes"&&t.method==="POST"){let u=await $(t),{nom:f,classe_id:c,matiere_id:g,date:o,type:_,coefficient:E,sur:h,points_max:R,semestre:T,nb_exercices:w}=u,y=await r.query("INSERT INTO evaluations (nom, classe_id, matiere_id, prof_id, date, type, coefficient, sur, points_max, semestre, nb_exercices) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",[f,c,g,d.id,o,_||"Ecrit",E||1,h||6,R!=null&&R!==""?R:null,T||1,parseInt(String(w))||0]);return s(e,{message:"Evaluation creee",evaluation:y.rows[0]},201)}let m=n.match(/^\/notes\/(\d+)\/notes$/);if(m){let u=m[1];if(t.method==="GET"){let f=await r.query(`
          SELECT ev.*, m.nom as matiere, c.nom as classe
          FROM evaluations ev
          JOIN matieres m ON ev.matiere_id = m.id
          JOIN classes c ON ev.classe_id = c.id
          WHERE ev.id = $1
        `,[u]);if(f.rows.length===0)return s(e,{message:"Evaluation non trouvee"},404);let c=await r.query(`
          SELECT e.id,
            COALESCE(u.nom, e.nom) as nom,
            COALESCE(u.prenom, e.prenom) as prenom
          FROM eleves e
          LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
          WHERE e.classe_id = $1 AND LOWER(COALESCE(e.statut, 'actif')) = 'actif'
          ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)
        `,[f.rows[0].classe_id]),g=await r.query("SELECT * FROM notes WHERE evaluation_id = $1",[u]),o=c.rows.map(_=>{let E=g.rows.find(h=>h.eleve_id===_.id);return{..._,points:E?E.points:null,valeur:E?E.valeur:null,absent:E?E.absent:!1,dispense:E?E.dispense:!1,commentaire:E?E.commentaire:"",points_detail:E?E.points_detail||{}:{},note_id:E?E.id:null}});return s(e,{evaluation:f.rows[0],eleves:o})}if(t.method==="POST"){let f=await $(t),{notes:c}=f,g=await r.connect();try{await g.query("BEGIN");for(let o of c){let _=await g.query("SELECT id FROM notes WHERE evaluation_id=$1 AND eleve_id=$2",[u,o.eleve_id]),E=o.points!=null?o.points:null,h=o.valeur!=null?o.valeur:null,R=o.absent===!0,T=o.dispense===!0,w=o.commentaire||null,y=o.points_detail&&Object.keys(o.points_detail).length>0?JSON.stringify(o.points_detail):null;_.rows.length>0?await g.query("UPDATE notes SET points=$1, valeur=$2, absent=$3, dispense=$4, commentaire=$5, points_detail=$6 WHERE evaluation_id=$7 AND eleve_id=$8",[E,h,R,T,w,y,u,o.eleve_id]):await g.query("INSERT INTO notes (evaluation_id, eleve_id, points, valeur, absent, dispense, commentaire, points_detail) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",[u,o.eleve_id,E,h,R,T,w,y])}return await g.query("COMMIT"),s(e,{message:"Notes sauvegardees"})}catch(o){throw await g.query("ROLLBACK"),o}finally{g.release()}}}let p=n.match(/^\/notes\/(\d+)$/);if(p){let u=p[1];if(t.method==="PUT"){let f=await $(t),{nom:c,date:g,type:o,coefficient:_,points_max:E,nb_exercices:h}=f,R=E!=null&&E!==""?parseFloat(String(E)):null,T=await r.connect();try{return await T.query("BEGIN"),await T.query("UPDATE evaluations SET nom=$1, date=$2, type=$3, coefficient=$4, points_max=$5, nb_exercices=$6 WHERE id=$7",[c,g||null,o||"Ecrit",_||1,R,parseInt(String(h))||0,u]),R&&R>0&&await T.query(`
              UPDATE notes SET valeur = ROUND(LEAST((points / $1) * 5 + 1, 6)::numeric, 1)
              WHERE evaluation_id = $2 AND points IS NOT NULL AND absent = false AND dispense = false
            `,[R,u]),await T.query("COMMIT"),s(e,{message:"Evaluation modifiee"})}catch(w){throw await T.query("ROLLBACK"),w}finally{T.release()}}if(t.method==="DELETE")return await r.query("DELETE FROM evaluations WHERE id=$1",[u]),s(e,{message:"Evaluation supprimee"})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(l){console.error("notes-fast error:",l);let m=l instanceof Error?l.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await r.end()}}async function Jt(t){await t.query(`
    CREATE TABLE IF NOT EXISTS notes_personnelles (
      id SERIAL PRIMARY KEY,
      utilisateur_id INTEGER NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
      contenu TEXT DEFAULT '',
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)}async function Gt(t,n,e){let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{if(n==="/notes-personnelles"&&t.method==="GET"){await Jt(a);let r=await a.query("SELECT contenu, updated_at FROM notes_personnelles WHERE utilisateur_id = $1",[i.id]);return s(e,{contenu:r.rows[0]?.contenu||"",updated_at:r.rows[0]?.updated_at||null})}if(n==="/notes-personnelles"&&t.method==="PUT"){await Jt(a);let r=await $(t),{contenu:l}=r;return await a.query(`
        INSERT INTO notes_personnelles (utilisateur_id, contenu, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (utilisateur_id) DO UPDATE SET contenu = $2, updated_at = NOW()
      `,[i.id,l||""]),s(e,{ok:!0})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("notes-personnelles-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:l},500)}finally{await a.end()}}async function jt(t,n,e){let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{let r=n.match(/^\/observations\/eleve\/(\d+)$/);if(r){let m=r[1];if(t.method==="GET"){let p=await a.query(`
          SELECT o.*, u.nom as auteur_nom, u.prenom as auteur_prenom
          FROM observations o
          LEFT JOIN utilisateurs u ON u.id=o.auteur_id
          WHERE o.eleve_id=$1
          ORDER BY o.created_at DESC
        `,[m]);return s(e,p.rows)}if(t.method==="POST"){let p=await $(t),{titre:u,contenu:f,mesure_prise:c,intervention_responsable:g,demande_entretien:o}=p,_=await a.query(`
          SELECT
            e.id,
            u.nom, u.prenom
          FROM eleves e
          LEFT JOIN utilisateurs u ON u.id = e.utilisateur_id
          WHERE e.id = $1
        `,[m]);if(!_.rows.length)return s(e,{message:"\xC9l\xE8ve introuvable"},404);let E=String(_.rows[0]?.nom||"").trim(),h=String(_.rows[0]?.prenom||"").trim(),R=E?E[0].toUpperCase():"X",w=`${h?h[0].toUpperCase():"X"}${R}`,N=((await a.query(`
          SELECT COUNT(*)::int AS nb
          FROM observations
          WHERE eleve_id = $1
        `,[m])).rows[0]?.nb||0)+1,S=`${w}-${String(N).padStart(2,"0")}`,v=await a.query("INSERT INTO observations (eleve_id, reference_obs, titre, contenu, mesure_prise, intervention_responsable, demande_entretien, auteur_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",[m,S,u,f,c||null,g||!1,o||!1,i.id]);return s(e,v.rows[0],201)}}let l=n.match(/^\/observations\/(\d+)$/);if(l){let m=l[1];if(t.method==="PUT"){let p=await $(t),{titre:u,contenu:f,mesure_prise:c,intervention_responsable:g,demande_entretien:o}=p;return await a.query("UPDATE observations SET titre=$1, contenu=$2, mesure_prise=$3, intervention_responsable=$4, demande_entretien=$5 WHERE id=$6",[u,f,c||null,g||!1,o||!1,m]),s(e,{message:"Observation modifi\xE9e"})}if(t.method==="DELETE")return await a.query("DELETE FROM observations WHERE id=$1",[m]),s(e,{message:"Observation supprim\xE9e"})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("observations-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:l},500)}finally{await a.end()}}import Yt from"npm:bcryptjs@2";var ms="smtp.office365.com",ps=587;async function Vt(t){return(await t.query("SELECT * FROM parametres_mail LIMIT 1")).rows[0]||null}function Es(t){let n=t?.smtp_host||Deno.env.get("EMAIL_HOST")||ms,e=Number(t?.smtp_port||Deno.env.get("EMAIL_PORT")||ps),i=t?.smtp_secure===!0||String(Deno.env.get("EMAIL_SECURE")||"").toLowerCase()==="true",d=t?.smtp_user||Deno.env.get("EMAIL_USER")||"",a=z(String(t?.smtp_app_password||""))||Deno.env.get("EMAIL_PASS")||"",r=t?.smtp_from_email||Deno.env.get("EMAIL_FROM")||d,l=t?.smtp_from_name||Deno.env.get("EMAIL_FROM_NAME")||"Ecole Manager",m=t?t.smtp_active===!0:!!(d&&a);return{host:n,port:e,secure:i,user:d,appPassword:a,fromEmail:r,fromName:l,enabled:m}}function fs(t){let n=t,e=String(n?.code||"").toUpperCase(),i=String(n?.message||"").toLowerCase();return e==="EAUTH"||i.includes("authentication unsuccessful")||i.includes("auth")?"Authentification refusee. Verifiez l'email SMTP, le mot de passe d'application, et que SMTP AUTH est active sur le compte Microsoft.":e==="ETIMEDOUT"||e==="ECONNECTION"||i.includes("timeout")||i.includes("connect")?"Connexion SMTP impossible. Verifiez le serveur/port, le pare-feu reseau, et le mode TLS (587 sans SSL implicite ou 465 avec SSL implicite).":i.includes("5.7.57")||i.includes("smtp client authentication is disabled")?'SMTP AUTH est desactive cote Microsoft 365. Activez "Authenticated SMTP" au niveau de la boite et du tenant.':"Consultez le detail de l'erreur SMTP puis verifiez host/port/TLS et les identifiants."}async function Kt(t,n,e){let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{if(n==="/parametres/profil"&&t.method==="GET"){let l=await a.query("SELECT id, nom, prenom, email, role, permissions, telephone, adresse, npa, lieu, sexe, date_naissance, avs, taux_activite, periodes_semaine, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, priorite_pref, specialite FROM utilisateurs WHERE id=$1",[i.id]);return s(e,l.rows[0])}if(n==="/parametres/profil"&&t.method==="PUT"){let l=await $(t),{nom:m,prenom:p,email:u,telephone:f,adresse:c,npa:g,lieu:o,sexe:_,date_naissance:E,avs:h,niveau_prefere:R,lieu_travail_prefere:T,remarque_lieu_travail:w,priorite_pref:y,specialite:N}=l;return await a.query("UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, telephone=$4, adresse=$5, npa=$6, lieu=$7, sexe=$8, date_naissance=$9, avs=$10, niveau_prefere=$11, lieu_travail_prefere=$12, remarque_lieu_travail=$13, priorite_pref=$14, specialite=$15 WHERE id=$16",[m,p,u,f||null,c||null,g||null,o||null,_||null,E||null,h||null,R||null,T||null,w||null,y||null,N||null,i.id]),s(e,{message:"Profil mis a jour"})}if(n==="/parametres/mot-de-passe"&&t.method==="PUT"){let l=await $(t),{ancien:m,nouveau:p}=l,u=await a.query("SELECT mot_de_passe FROM utilisateurs WHERE id=$1",[i.id]);if(!await Yt.compare(String(m),u.rows[0].mot_de_passe))return s(e,{message:"Ancien mot de passe incorrect"},400);let c=await Yt.hash(String(p),10);return await a.query("UPDATE utilisateurs SET mot_de_passe=$1 WHERE id=$2",[c,i.id]),s(e,{message:"Mot de passe modifie"})}if(n==="/parametres/ecole"&&t.method==="GET"){let l=await a.query("SELECT * FROM parametres_ecole LIMIT 1");return s(e,l.rows[0]||{})}if(n==="/parametres/ecole"&&t.method==="PUT"){let l=O(i,e);if(l)return l;let m=await $(t),{nom_ecole:p,adresse:u,telephone:f,email:c,annee_scolaire:g,date_debut_annee:o,date_fin_annee:_,responsable_langues_jeunes:E,responsable_niveau:h,responsable_niveau_csc:R,responsable_niveau_cfr:T,responsable_niveau_epl:w,sexe_responsable_langues_jeunes:y,sexe_responsable_niveau_csc:N,sexe_responsable_niveau_cfr:S,sexe_responsable_niveau_epl:v,horaires:L,types_special_affectation:I}=m,M=await a.query("SELECT id FROM parametres_ecole LIMIT 1");return M.rows.length>0?await a.query("UPDATE parametres_ecole SET nom_ecole=$1, adresse=$2, telephone=$3, email=$4, annee_scolaire=$5, date_debut_annee=$6, date_fin_annee=$7, responsable_langues_jeunes=$8, responsable_niveau=$9, responsable_niveau_csc=$10, responsable_niveau_cfr=$11, responsable_niveau_epl=$12, sexe_responsable_langues_jeunes=$13, sexe_responsable_niveau_csc=$14, sexe_responsable_niveau_cfr=$15, sexe_responsable_niveau_epl=$16, horaires=$17::jsonb, types_special_affectation=$18::jsonb WHERE id=$19",[p,u,f,c,g,o||null,_||null,E||null,h||null,R||null,T||null,w||null,y||null,N||null,S||null,v||null,L?JSON.stringify(L):"{}",I!=null?JSON.stringify(I):JSON.stringify([{id:"titulariat",label:"Titulariat"},{id:"atelier",label:"Atelier"},{id:"mediation",label:"M\xE9diation"},{id:"autre",label:"Autre"}]),M.rows[0].id]):await a.query("INSERT INTO parametres_ecole (nom_ecole, adresse, telephone, email, annee_scolaire, date_debut_annee, date_fin_annee, responsable_langues_jeunes, responsable_niveau, responsable_niveau_csc, responsable_niveau_cfr, responsable_niveau_epl, sexe_responsable_langues_jeunes, sexe_responsable_niveau_csc, sexe_responsable_niveau_cfr, sexe_responsable_niveau_epl, horaires, types_special_affectation) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb)",[p,u,f,c,g,o||null,_||null,E||null,h||null,R||null,T||null,w||null,y||null,N||null,S||null,v||null,L?JSON.stringify(L):"{}",I!=null?JSON.stringify(I):JSON.stringify([{id:"titulariat",label:"Titulariat"},{id:"atelier",label:"Atelier"},{id:"mediation",label:"M\xE9diation"},{id:"autre",label:"Autre"}])]),s(e,{message:"Parametres mis a jour"})}if(n==="/parametres/mail"&&t.method==="GET"){let l=O(i,e);if(l)return l;let m=await Vt(a),p=Es(m);return s(e,{smtp_active:m?m.smtp_active===!0:!1,smtp_host:m?.smtp_host||p.host||"smtp.office365.com",smtp_port:m?.smtp_port||p.port||587,smtp_secure:m?m.smtp_secure===!0:!1,smtp_user:m?.smtp_user||p.user||"",smtp_from_name:m?.smtp_from_name||p.fromName||"Ecole Manager",smtp_from_email:m?.smtp_from_email||p.fromEmail||"",has_app_password:!!m?.smtp_app_password})}if(n==="/parametres/mail"&&t.method==="PUT"){let l=O(i,e);if(l)return l;let m=await $(t),{smtp_active:p,smtp_host:u,smtp_port:f,smtp_secure:c,smtp_user:g,smtp_from_name:o,smtp_from_email:_,smtp_app_password:E}=m,h=await Vt(a),R=String(u||"smtp.office365.com").trim(),T=Number(f)||587,w=c===!0,y=String(g||"").trim(),N=String(o||"Ecole Manager").trim(),S=String(_||y).trim(),v=p===!0,L=typeof E=="string"?E.trim():"",I=L?_e(L):"";return v&&(!y||!L&&!h?.smtp_app_password)?s(e,{message:"Pour activer l'envoi d'emails, renseignez l'utilisateur SMTP et le mot de passe d'application."},400):(h?await a.query(`UPDATE parametres_mail
           SET smtp_active=$1, smtp_host=$2, smtp_port=$3, smtp_secure=$4, smtp_user=$5,
               smtp_app_password=COALESCE(NULLIF($6,''), smtp_app_password),
               smtp_from_name=$7, smtp_from_email=$8, updated_at=NOW()
           WHERE id=$9`,[v,R,T,w,y,I,N,S,h.id]):await a.query(`INSERT INTO parametres_mail
            (smtp_active, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_app_password, smtp_from_name, smtp_from_email)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,[v,R,T,w,y,I,N,S]),s(e,{message:"Parametres email mis a jour"}))}if(n==="/parametres/mail/test"&&t.method==="POST"){let l=O(i,e);if(l)return l;let m=await $(t),p=String(m.email||"").trim();if(!p)return s(e,{message:"Email destinataire manquant"},400);try{return await ue({to:p,subject:"Test configuration email - Ecole Manager",html:`
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#f8fafc;border-radius:12px">
              <h2 style="margin:0 0 10px;color:#6366f1">Configuration email OK</h2>
              <p style="margin:0 0 10px;color:#111827">
                Ce message confirme que la configuration SMTP admin fonctionne.
              </p>
              <p style="margin:0;color:#6b7280;font-size:12px">
                Si vous utilisez la double authentification Outlook, gardez un mot de passe d'application actif.
              </p>
            </div>
          `,text:"Configuration email OK. La configuration SMTP admin fonctionne."}),s(e,{message:"Email de test envoye"})}catch(u){let f=u;return s(e,{message:"Echec de l'envoi du mail de test",erreur:f?.message||"Erreur SMTP inconnue",code:f?.code||null,reponse:f?.response||f?.responseCode||null,hint:fs(u)},400)}}if(n==="/parametres/profs"&&t.method==="GET"){let l=O(i,e);if(l)return l;let m=await a.query("SELECT id, nom, prenom, email, permissions FROM utilisateurs WHERE role='prof' ORDER BY nom, prenom");return s(e,m.rows)}let r=n.match(/^\/parametres\/permissions\/(\d+)$/);if(r&&t.method==="PUT"){let l=O(i,e);if(l)return l;let m=await $(t),{permissions:p}=m;return await a.query("UPDATE utilisateurs SET permissions=$1 WHERE id=$2",[JSON.stringify(p),r[1]]),s(e,{message:"Permissions mises a jour"})}if(n==="/parametres/acces-profs"&&t.method==="GET"){let l=await a.query("SELECT acces_profs FROM parametres_ecole LIMIT 1");return s(e,l.rows[0]?.acces_profs||{})}if(n==="/parametres/acces-profs"&&t.method==="PUT"){let l=O(i,e);if(l)return l;let m=await $(t),{acces_profs:p}=m,u=await a.query("SELECT id FROM parametres_ecole LIMIT 1");return u.rows.length>0?await a.query("UPDATE parametres_ecole SET acces_profs=$1 WHERE id=$2",[JSON.stringify(p),u.rows[0].id]):await a.query("INSERT INTO parametres_ecole (acces_profs) VALUES ($1)",[JSON.stringify(p)]),s(e,{message:"Acc\xE8s professeurs mis \xE0 jour"})}if(n==="/parametres/mes-classes"&&t.method==="GET"){let l=await a.query(`
        SELECT DISTINCT c.id, c.nom, c.niveau, c.annee_scolaire, m.nom as matiere
        FROM emploi_du_temps et
        JOIN classes c ON et.classe_id = c.id
        JOIN matieres m ON et.matiere_id = m.id
        WHERE et.prof_id = $1
        ORDER BY c.nom
      `,[i.id]);return s(e,l.rows)}if(n==="/parametres/reset-tout"&&t.method==="DELETE"){let l=O(i,e);if(l)return l;let m=["presences_v2","presences","absences","notes","planning_branches","branches","classe_horaires","planning_affectations","planning_pools","disponibilites","paiements","comptabilite","calendrier","observations","eleves","classes","profs","messages","notifications"],p=[];for(let f of m)try{let c=await a.query("DELETE FROM "+f);p.push("OK:"+f+"("+c.rowCount+")")}catch(c){p.push("ERR:"+f+":"+(c instanceof Error?c.message:String(c)))}try{let f=await a.query("DELETE FROM utilisateurs WHERE role != 'admin'");p.push("OK:utilisateurs("+f.rowCount+")")}catch(f){p.push("ERR:utilisateurs:"+(f instanceof Error?f.message:String(f)))}let u=p.filter(f=>f.startsWith("ERR"));return s(e,{message:u.length===0?"Reset complet effectue":"Reset partiel - "+u.length+" erreur(s)",details:p,erreurs:u})}if(n==="/parametres/reset-rentree"&&t.method==="DELETE"){let l=O(i,e);if(l)return l;let m=await $(t),p=Number(t.headers.get("x-archive-id")||m?.archive_id||0),u=await gt(a);if(!await Et(p,u.annee,a))return s(e,{message:"Vous devez d\u2019abord transf\xE9rer l\u2019ann\xE9e en cours vers le menu Archive avant de confirmer la r\xE9initialisation.",archive_required:!0},400);let f=["presences_v2","presences","absences","notes","evaluations","bulletin_criteres","suivi_devoirs","devoirs","affectations_eleves_enc","classes_enclassement","enclassements","affectations","planning_branches","pool_profs","pool_classes","pool_branches","classe_horaires","classe_periodes","emploi_du_temps","plan_classe","inventaire_branches","paiements","factures_validations","factures_references","commandes_lignes","commandes","documents_eleves","sanctions_eleves","observations","sorties_scolaires","eleves"],c=[],g=await a.connect(),o=async _=>{try{await g.query("ROLLBACK")}catch{}return s(e,{message:_,details:c,erreurs:c.filter(E=>E.startsWith("ERR:"))},500)};try{await g.query("BEGIN");for(let _ of f){if(!(await g.query(`SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = $1`,[_])).rows.length){c.push("SKIP:"+_+"(absente)");continue}try{let h=await g.query("DELETE FROM "+_);c.push("OK:"+_+"("+h.rowCount+")")}catch(h){let R=h instanceof Error?h.message:String(h);return c.push("ERR:"+_+":"+R),await o("Reset rentree echoue \u2014 aucune donn\xE9e n'a \xE9t\xE9 supprim\xE9e (rollback)")}}try{let _=await g.query("DELETE FROM utilisateurs WHERE role IN ('eleve','parent')");c.push("OK:utilisateurs-eleves-parents("+_.rowCount+")")}catch(_){let E=_ instanceof Error?_.message:String(_);return c.push("ERR:utilisateurs-eleves-parents:"+E),await o("Reset rentree echoue \u2014 aucune donn\xE9e n'a \xE9t\xE9 supprim\xE9e (rollback)")}await g.query("COMMIT");try{await ft(p,a)}catch{}return s(e,{message:"Reset rentree effectue",details:c,erreurs:[],archive_id:p})}catch(_){try{await g.query("ROLLBACK")}catch{}let E=_ instanceof Error?_.message:"Erreur serveur";return s(e,{message:"Erreur serveur lors du reset rentree",erreur:E},500)}finally{g.release()}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("parametres-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:l},500)}finally{await a.end()}}async function zt(t,n,e){let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{let r=n.match(/^\/plan-classe\/(\d+)$/);if(r){let l=r[1];if(t.method==="GET"){let m=await a.query("SELECT * FROM plan_classe WHERE classe_id=$1",[l]);if(!m.rows[0])return s(e,{positions:{}});let p=typeof m.rows[0].positions=="string"?JSON.parse(m.rows[0].positions):m.rows[0].positions||{};return s(e,{positions:p})}if(t.method==="POST"){let m=await $(t),{positions:p}=m;return await a.query(`INSERT INTO plan_classe (classe_id, positions, updated_at) VALUES ($1,$2,NOW())
           ON CONFLICT (classe_id) DO UPDATE SET positions=$2, updated_at=NOW()`,[l,JSON.stringify(p)]),s(e,{message:"Plan sauvegard\xE9"})}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("plan-classe-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:l},500)}finally{await a.end()}}var pe="CASE jour WHEN 'Lundi' THEN 1 WHEN 'Mardi' THEN 2 WHEN 'Mercredi' THEN 3 WHEN 'Jeudi' THEN 4 WHEN 'Vendredi' THEN 5 END";function Xt(t){if(t==null||t==="")return null;let n=Array.isArray(t)?t.map(e=>String(e).trim()).filter(Boolean):String(t).split(",").map(e=>e.trim()).filter(Boolean);return n.length?n.join(","):null}function Zt(t,n){return String(t.id)===String(n)||t.role==="admin"}function De(t){return t===!1||t===0||t==="false"||t==="indispo"}function _s(t){return t?.eviter===!0||t?.eviter===1||t?.eviter==="true"||t?.statut==="eviter"||t?.disponible==="eviter"}async function Qt(t,n,e,i){let d=await A(t),a=C(d,e,n);if(a)return a;let r=b();try{if(n==="/planning/creneaux"&&t.method==="GET"){let o=await r.query("SELECT * FROM creneaux ORDER BY "+pe+", ordre");return s(e,o.rows)}if(n==="/planning/disponibilites"&&t.method==="GET"){let o=await r.query("SELECT prof_id, creneau_id, disponible, eviter FROM disponibilites");return s(e,o.rows)}let l=n.match(/^\/planning\/disponibilites\/(\d+)\/remarque$/);if(l){let o=l[1];if(t.method==="GET")try{let _=await r.query("SELECT remarque_disponibilites FROM utilisateurs WHERE id=$1",[o]);return _.rows.length===0?s(e,{message:"Professeur non trouv\xE9"},404):s(e,{remarque:_.rows[0].remarque_disponibilites||""})}catch(_){let E=_ instanceof Error?_.message:"Erreur";return s(e,{message:E},500)}if(t.method==="POST"){if(!Zt(d,o))return s(e,{message:"Acc\xE8s refus\xE9"},403);try{let _=await $(t),E=typeof _?.remarque=="string"?_.remarque:"";return(await r.query("UPDATE utilisateurs SET remarque_disponibilites=$1 WHERE id=$2 RETURNING id",[E,o])).rows.length===0?s(e,{message:"Professeur non trouv\xE9"},404):s(e,{message:"Remarque sauvegard\xE9e"})}catch(_){let E=_ instanceof Error?_.message:"Erreur";return s(e,{message:E},500)}}}let m=n.match(/^\/planning\/disponibilites\/(\d+)$/);if(m){let o=m[1];if(t.method==="GET"){let _=await r.query("SELECT creneau_id, disponible, eviter FROM disponibilites WHERE prof_id=$1",[o]);return s(e,_.rows)}if(t.method==="POST"){if(!Zt(d,o))return s(e,{message:"Acc\xE8s refus\xE9"},403);let _=await $(t),{disponibilites:E}=_,h=Number(o);if(!Number.isInteger(h)||h<=0)return s(e,{message:"prof_id invalide"},400);let R=Array.isArray(E)?E:[],T=[...new Set(R.filter(y=>y&&De(y.disponible)).map(y=>Number(y.creneau_id)).filter(y=>Number.isInteger(y)&&y>0))],w;try{w=await r.connect(),await w.query("BEGIN"),await w.query("DELETE FROM disponibilites WHERE prof_id=$1",[h]);for(let N of R){let S=N,v=Number(S?.creneau_id);if(!Number.isInteger(v)||v<=0)continue;let L=!De(S.disponible)&&_s(S);await w.query("INSERT INTO disponibilites (prof_id, creneau_id, disponible, eviter) VALUES ($1,$2,$3,$4)",[h,v,!De(S.disponible),L])}let y=0;return T.length&&(y=(await w.query("DELETE FROM affectations WHERE prof_id = $1 AND creneau_id = ANY($2::int[])",[h,T])).rowCount||0),await w.query("COMMIT"),s(e,{message:"Sauvegard\xE9",affectations_supprimees:y})}catch(y){if(w)try{await w.query("ROLLBACK")}catch{}let N=y instanceof Error?y.message:"Erreur";return s(e,{message:N},500)}finally{w&&w.release()}}}if(n==="/planning/pools"&&t.method==="GET"){let o=await r.query("SELECT id, nom, site, couleur, horaires, niveau, ordre FROM pools ORDER BY COALESCE(ordre, 0), nom"),_=[];for(let E of o.rows){let h=await r.query("SELECT u.id, u.nom, u.prenom, u.taux_activite, u.periodes_semaine, u.niveau_prefere, u.lieu_travail_prefere, u.branches_specialites FROM utilisateurs u JOIN pool_profs pp ON pp.prof_id=u.id WHERE pp.pool_id=$1",[E.id]),R=await r.query("SELECT c.id, c.nom, c.niveau FROM classes c JOIN pool_classes pc ON pc.classe_id=c.id WHERE pc.pool_id=$1",[E.id]),T=await r.query("SELECT m.id, m.nom, m.periodes_semaine FROM matieres m JOIN pool_branches pb ON pb.matiere_id=m.id WHERE pb.pool_id=$1",[E.id]);_.push({...E,profs:h.rows,classes:R.rows,branches:T.rows})}return s(e,_)}if(n==="/planning/pools"&&t.method==="POST"){let o=O(d,e);if(o)return o;let _=await $(t),{nom:E,site:h,couleur:R,prof_ids:T,classe_ids:w,branche_ids:y,horaires:N,niveau:S}=_;try{let v=Xt(S),I=(await r.query("INSERT INTO pools (nom, site, couleur, horaires, niveau) VALUES ($1,$2,$3,$4,$5) RETURNING *",[E,h||"",R||"#6366f1",JSON.stringify(N||[]),v])).rows[0];for(let M of T||[])await r.query("INSERT INTO pool_profs (pool_id, prof_id) VALUES ($1,$2)",[I.id,M]);for(let M of w||[])await r.query("INSERT INTO pool_classes (pool_id, classe_id) VALUES ($1,$2)",[I.id,M]);for(let M of y||[])await r.query("INSERT INTO pool_branches (pool_id, matiere_id) VALUES ($1,$2)",[I.id,M]);return s(e,I)}catch(v){let L=v instanceof Error?v.message:"Erreur";return s(e,{message:L},500)}}let p=n.match(/^\/planning\/pools\/(\d+)$/);if(p){let o=p[1];if(t.method==="PUT"){let _=O(d,e);if(_)return _;let E=await $(t),{nom:h,site:R,couleur:T,prof_ids:w,classe_ids:y,branche_ids:N,horaires:S,niveau:v,ordre:L}=E;try{let I=await r.query("SELECT prof_id FROM pool_profs WHERE pool_id=$1",[o]),M=await r.query("SELECT classe_id FROM pool_classes WHERE pool_id=$1",[o]),W=I.rows.map(D=>Number(D.prof_id)),F=M.rows.map(D=>Number(D.classe_id)),P=(w||[]).map(D=>Number(D)),U=W.filter(D=>!P.includes(D));U.length&&F.length&&await r.query("DELETE FROM affectations WHERE prof_id = ANY($1::int[]) AND classe_id = ANY($2::int[])",[U,F]);let x=Xt(v);await r.query("UPDATE pools SET nom=$1, site=$2, couleur=$3, horaires=$4, niveau=$5, ordre=$6 WHERE id=$7",[h,R||"",T,JSON.stringify(S||[]),x,L!==void 0?L:0,o]),await r.query("DELETE FROM pool_profs WHERE pool_id=$1",[o]),await r.query("DELETE FROM pool_classes WHERE pool_id=$1",[o]),await r.query("DELETE FROM pool_branches WHERE pool_id=$1",[o]);for(let D of w||[])await r.query("INSERT INTO pool_profs (pool_id, prof_id) VALUES ($1,$2)",[o,D]);for(let D of y||[])await r.query("INSERT INTO pool_classes (pool_id, classe_id) VALUES ($1,$2)",[o,D]);for(let D of N||[])await r.query("INSERT INTO pool_branches (pool_id, matiere_id) VALUES ($1,$2)",[o,D]);return s(e,{message:"Pool mis \xE0 jour"})}catch(I){let M=I instanceof Error?I.message:"Erreur";return s(e,{message:M},500)}}if(t.method==="DELETE"){let _=O(d,e);return _||(await r.query("DELETE FROM pools WHERE id=$1",[o]),s(e,{message:"Supprim\xE9"}))}}if(n==="/planning/classe-horaires"&&t.method==="GET"){let o=await r.query("SELECT * FROM classe_horaires");return s(e,o.rows)}let u=n.match(/^\/planning\/classe-horaires\/(\d+)$/);if(u){let o=u[1];if(t.method==="GET"){let _=await r.query("SELECT jour, periode FROM classe_horaires WHERE classe_id=$1",[o]);return s(e,_.rows)}if(t.method==="POST"){let _=await $(t),{horaires:E}=_;try{await r.query("DELETE FROM classe_horaires WHERE classe_id=$1",[o]);for(let h of E)await r.query("INSERT INTO classe_horaires (classe_id, jour, periode) VALUES ($1,$2,$3)",[o,h.jour,h.periode]);return s(e,{message:"Sauvegard\xE9"})}catch(h){let R=h instanceof Error?h.message:"Erreur";return s(e,{message:R},500)}}}if(n==="/planning/classe-couleurs"&&t.method==="GET")try{let o=await r.query("SELECT classe_id, couleur FROM classe_couleurs");return s(e,o.rows)}catch(o){let _=o instanceof Error?o.message:"Erreur";return s(e,{message:_},500)}if(n==="/planning/classe-couleurs"&&t.method==="POST"){let o=O(d,e);if(o)return o;let _=await $(t),{classe_id:E,couleur:h}=_||{};if(!E||!h)return s(e,{message:"classe_id et couleur requis"},400);try{let R=await r.query(`
          INSERT INTO classe_couleurs (classe_id, couleur, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (classe_id) DO UPDATE SET couleur=$2, updated_at=NOW()
          RETURNING classe_id, couleur
        `,[E,h]);return s(e,R.rows[0])}catch(R){let T=R instanceof Error?R.message:"Erreur";return s(e,{message:T},500)}}if(n==="/planning/prof-couleurs"&&t.method==="GET")try{let o=await r.query("SELECT prof_id, couleur FROM prof_couleurs");return s(e,o.rows)}catch(o){let _=o instanceof Error?o.message:"Erreur";return s(e,{message:_},500)}if(n==="/planning/prof-couleurs"&&t.method==="POST"){let o=O(d,e);if(o)return o;let _=await $(t),{prof_id:E,couleur:h}=_||{};if(!E||!h)return s(e,{message:"prof_id et couleur requis"},400);try{let R=await r.query(`
          INSERT INTO prof_couleurs (prof_id, couleur, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (prof_id) DO UPDATE SET couleur=$2, updated_at=NOW()
          RETURNING prof_id, couleur
        `,[E,h]);return s(e,R.rows[0])}catch(R){let T=R instanceof Error?R.message:"Erreur";return s(e,{message:T},500)}}if(n==="/planning/branche-couleurs"&&t.method==="GET")try{let o=await r.query("SELECT matiere_id, couleur FROM branche_couleurs");return s(e,o.rows)}catch(o){let _=o instanceof Error?o.message:"Erreur";return s(e,{message:_},500)}if(n==="/planning/branche-couleurs"&&t.method==="POST"){let o=O(d,e);if(o)return o;let _=await $(t),{matiere_id:E,couleur:h}=_||{};if(!E||!h)return s(e,{message:"matiere_id et couleur requis"},400);try{let R=await r.query(`
          INSERT INTO branche_couleurs (matiere_id, couleur, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (matiere_id) DO UPDATE SET couleur=$2, updated_at=NOW()
          RETURNING matiere_id, couleur
        `,[E,h]);return s(e,R.rows[0])}catch(R){let T=R instanceof Error?R.message:"Erreur";return s(e,{message:T},500)}}if(n==="/planning/affectations"&&t.method==="GET"){let o=await r.query(`
        SELECT a.*, u.prenom||' '||u.nom as prof_nom,
          COALESCE(c.nom, CASE
            WHEN a.type_special='titulariat' THEN 'Titulariat'
            WHEN a.type_special='atelier' THEN 'Atelier'
            WHEN a.type_special='mediation' THEN 'M\xE9diation'
            WHEN a.type_special='autre' THEN 'Autre'
            WHEN a.type_special IS NOT NULL AND a.type_special <> '' AND a.type_special <> 'soutien'
              THEN INITCAP(REPLACE(a.type_special, '-', ' '))
            ELSE NULL
          END) as classe_nom,
          m.nom as matiere_nom,
          CASE WHEN a.type_special = 'soutien' THEN (
            SELECT a2.matiere_id
            FROM affectations a2
            WHERE a2.classe_id = a.classe_id
              AND a2.creneau_id = a.creneau_id
              AND (a2.type_special IS NULL OR a2.type_special = '')
              AND a2.prof_id IS DISTINCT FROM a.prof_id
            ORDER BY a2.id
            LIMIT 1
          ) ELSE NULL END AS soutien_matiere_id,
          CASE WHEN a.type_special = 'soutien' THEN (
            SELECT m2.nom
            FROM affectations a2
            LEFT JOIN matieres m2 ON m2.id = a2.matiere_id
            WHERE a2.classe_id = a.classe_id
              AND a2.creneau_id = a.creneau_id
              AND (a2.type_special IS NULL OR a2.type_special = '')
              AND a2.prof_id IS DISTINCT FROM a.prof_id
            ORDER BY a2.id
            LIMIT 1
          ) ELSE NULL END AS soutien_matiere_nom,
          COALESCE(ps.nom, (
            SELECT p.nom FROM pools p
            JOIN pool_classes pc ON pc.pool_id = p.id
            WHERE pc.classe_id = a.classe_id
            ORDER BY p.id LIMIT 1
          )) AS pool_nom,
          cr.jour, cr.heure_debut, cr.heure_fin, cr.periode, cr.ordre
        FROM affectations a
        JOIN utilisateurs u ON u.id=a.prof_id
        LEFT JOIN classes c ON c.id=a.classe_id
        LEFT JOIN matieres m ON m.id=a.matiere_id
        LEFT JOIN pools ps ON ps.id = a.pool_id
        JOIN creneaux cr ON cr.id=a.creneau_id
        ORDER BY ${pe.replace("jour","cr.jour")}, cr.ordre
      `);return s(e,o.rows)}if(n==="/planning/affectations"&&t.method==="POST"){let o=O(d,e);if(o)return o;let _=await $(t),{prof_id:E,classe_id:h,matiere_id:R,creneau_id:T,type_special:w,pool_id:y}=_,N=String(w||"").trim(),S=N==="soutien",v=!!N&&!S,L=v||S?N:null,I=v?null:h||null,M=y!=null&&y!==""?Number(y):null;(!Number.isInteger(M)||M<=0)&&(M=null);try{if(!Number.isInteger(M)&&I!=null){let F=await r.query("SELECT pool_id FROM pool_classes WHERE classe_id = $1 ORDER BY pool_id LIMIT 1",[I]);F.rows[0]?.pool_id!=null&&(M=Number(F.rows[0].pool_id))}I!=null&&await r.query(`
            DELETE FROM affectations
            WHERE creneau_id = $1
              AND classe_id = $2
              AND (
                ($3::boolean AND type_special = 'soutien')
                OR (NOT $3::boolean AND (type_special IS NULL OR type_special = ''))
              )
          `,[T,I,S]),E!=null&&await r.query("DELETE FROM affectations WHERE prof_id = $1 AND creneau_id = $2",[E,T]);let W=await r.query(`
          INSERT INTO affectations (prof_id, classe_id, matiere_id, creneau_id, type_special, pool_id)
          VALUES ($1,$2,$3,$4,$5,$6)
          RETURNING *
        `,[E||null,I,R||null,T,L,Number.isInteger(M)?M:null]);return s(e,W.rows[0])}catch(W){let F=W instanceof Error?W.message:"Erreur";return s(e,{message:F},500)}}let f=n.match(/^\/planning\/affectations\/(\d+)$/);if(f&&t.method==="DELETE"){let o=O(d,e);return o||(await r.query("DELETE FROM affectations WHERE id=$1",[f[1]]),s(e,{message:"Supprim\xE9"}))}if(n==="/planning/titulaires"&&t.method==="POST"){let o=O(d,e);if(o)return o;let _=await $(t),E=Number(_?.classe_id),h=_?.prof_id,R=h==null||String(h).trim()===""?null:Number(h);if(!Number.isInteger(E))return s(e,{message:"classe_id invalide"},400);if(R!==null&&!Number.isInteger(R))return s(e,{message:"prof_id invalide"},400);try{return(await r.query("SELECT id FROM classes WHERE id=$1",[E])).rows.length?R!==null&&!(await r.query("SELECT id FROM utilisateurs WHERE id=$1 AND role='prof'",[R])).rows.length?s(e,{message:"Professeur introuvable"},404):(await r.query("UPDATE classes SET prof_principal_id=$1 WHERE id=$2",[R,E]),s(e,{message:"Titulaire mis \xE0 jour"})):s(e,{message:"Classe introuvable"},404)}catch(T){let w=T instanceof Error?T.message:"Erreur";return s(e,{message:w},500)}}if(n==="/planning/planning-branches"&&t.method==="GET"){let o=i.searchParams.get("pool_id"),_="SELECT * FROM planning_branches WHERE 1=1",E=[];o&&(E.push(o),_+=" AND pool_id=$"+E.length);let h=await r.query(_,E);return s(e,h.rows)}if(n==="/planning/planning-branches"&&t.method==="POST"){let o=O(d,e);if(o)return o;let _=await $(t),{prof_id:E,classe_id:h,matiere_id:R,pool_id:T}=_;try{return await r.query(`
          INSERT INTO planning_branches (prof_id, classe_id, matiere_id, pool_id)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (classe_id, matiere_id, pool_id) DO UPDATE SET prof_id=$1
        `,[E,h,R,T]),s(e,{message:"Sauvegard\xE9"})}catch(w){let y=w instanceof Error?w.message:"Erreur";return s(e,{message:y},500)}}if(n==="/planning/planning-branches"&&t.method==="DELETE"){let o=O(d,e);if(o)return o;let _=await $(t);return await r.query("DELETE FROM planning_branches WHERE classe_id=$1 AND matiere_id=$2 AND pool_id=$3",[_.classe_id,_.matiere_id,_.pool_id]),s(e,{message:"Supprim\xE9"})}if(n==="/planning/general"&&t.method==="GET")try{let o=i.searchParams.get("pool_id"),_="SELECT id, nom, prenom FROM utilisateurs WHERE role='prof' ORDER BY nom",E=[];o&&(_="SELECT u.id,u.nom,u.prenom FROM utilisateurs u JOIN pool_profs pp ON pp.prof_id=u.id WHERE pp.pool_id=$1 ORDER BY u.nom",E=[o]);let h=await r.query(_,E),R=await r.query("SELECT * FROM creneaux ORDER BY "+pe+", ordre"),T,w;o?(T=await r.query(`
        SELECT a.prof_id, a.creneau_id, a.matiere_id, a.classe_id, a.type_special, a.pool_id,
          COALESCE(c.nom, CASE
            WHEN a.type_special='titulariat' THEN 'Titulariat'
            WHEN a.type_special='atelier' THEN 'Atelier'
            WHEN a.type_special='mediation' THEN 'M\xE9diation'
            WHEN a.type_special='autre' THEN 'Autre'
            WHEN a.type_special IS NOT NULL AND a.type_special <> '' AND a.type_special <> 'soutien'
              THEN INITCAP(REPLACE(a.type_special, '-', ' '))
            ELSE NULL
          END) as classe_nom,
          m.nom as matiere_nom,
          COALESCE(
            (SELECT p.nom FROM pools p WHERE p.id = a.pool_id),
            (
              SELECT p.nom FROM pools p
              JOIN pool_classes pc ON pc.pool_id = p.id
              WHERE pc.classe_id = a.classe_id
              ORDER BY CASE WHEN p.id = $1::int THEN 0 ELSE 1 END, p.id
              LIMIT 1
            )
          ) AS pool_nom,
          COALESCE(
            a.pool_id,
            (
              SELECT p.id FROM pools p
              JOIN pool_classes pc ON pc.pool_id = p.id
              WHERE pc.classe_id = a.classe_id
              ORDER BY CASE WHEN p.id = $1::int THEN 0 ELSE 1 END, p.id
              LIMIT 1
            )
          ) AS pool_id_aff,
          CASE
            WHEN a.pool_id IS NOT NULL THEN (a.pool_id = $1::int)
            WHEN a.classe_id IS NOT NULL THEN EXISTS (
              SELECT 1 FROM pool_classes pc
              WHERE pc.classe_id = a.classe_id AND pc.pool_id = $1::int
            )
            ELSE true
          END AS dans_pool_courant
        FROM affectations a
        JOIN pool_profs pp ON pp.prof_id = a.prof_id AND pp.pool_id = $1
        LEFT JOIN classes c ON c.id=a.classe_id
        LEFT JOIN matieres m ON m.id=a.matiere_id
      `,[o]),w=await r.query(`
        SELECT d.prof_id, d.creneau_id, d.disponible, d.eviter
        FROM disponibilites d
        JOIN pool_profs pp ON pp.prof_id = d.prof_id AND pp.pool_id = $1
      `,[o])):(T=await r.query(`
        SELECT a.prof_id, a.creneau_id, a.matiere_id, a.classe_id, a.type_special, a.pool_id,
          COALESCE(c.nom, CASE
            WHEN a.type_special='titulariat' THEN 'Titulariat'
            WHEN a.type_special='atelier' THEN 'Atelier'
            WHEN a.type_special='mediation' THEN 'M\xE9diation'
            WHEN a.type_special='autre' THEN 'Autre'
            WHEN a.type_special IS NOT NULL AND a.type_special <> '' AND a.type_special <> 'soutien'
              THEN INITCAP(REPLACE(a.type_special, '-', ' '))
            ELSE NULL
          END) as classe_nom,
          m.nom as matiere_nom,
          COALESCE(
            (SELECT p.nom FROM pools p WHERE p.id = a.pool_id),
            (
              SELECT p.nom FROM pools p
              JOIN pool_classes pc ON pc.pool_id = p.id
              WHERE pc.classe_id = a.classe_id
              ORDER BY p.id LIMIT 1
            )
          ) AS pool_nom,
          COALESCE(
            a.pool_id,
            (
              SELECT p.id FROM pools p
              JOIN pool_classes pc ON pc.pool_id = p.id
              WHERE pc.classe_id = a.classe_id
              ORDER BY p.id LIMIT 1
            )
          ) AS pool_id_aff,
          true AS dans_pool_courant
        FROM affectations a
        LEFT JOIN classes c ON c.id=a.classe_id
        LEFT JOIN matieres m ON m.id=a.matiere_id
      `),w=await r.query("SELECT prof_id,creneau_id,disponible,eviter FROM disponibilites"));let y=o?await r.query(`
          SELECT c.id as classe_id, c.nom as classe_nom, u.id as prof_id, u.prenom||' '||u.nom as prof_nom
          FROM classes c
          JOIN pool_classes pc ON pc.classe_id = c.id AND pc.pool_id = $1
          LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
          ORDER BY c.nom
        `,[o]):await r.query(`
          SELECT c.id as classe_id, c.nom as classe_nom, u.id as prof_id, u.prenom||' '||u.nom as prof_nom
          FROM classes c
          LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
          ORDER BY c.nom
        `);return s(e,{profs:h.rows||[],creneaux:R.rows||[],affectations:T.rows||[],dispos:w.rows||[],titulaires:y.rows||[]})}catch(o){console.error("getPlanningGeneral:",o);let _=o instanceof Error?o.message:"Erreur planning g\xE9n\xE9ral";return s(e,{message:_},500)}let c=n.match(/^\/planning\/prof\/(\d+)$/);if(c&&t.method==="GET"){let o=c[1],_=await r.query("SELECT id,nom,prenom FROM utilisateurs WHERE id=$1",[o]),E=await r.query("SELECT nom FROM classes WHERE prof_principal_id=$1",[o]),h=await r.query("SELECT * FROM creneaux ORDER BY "+pe+", ordre"),R=await r.query(`
    SELECT a.creneau_id, a.matiere_id, a.classe_id, a.type_special, a.pool_id,
      COALESCE(c.nom, CASE
        WHEN a.type_special='titulariat' THEN 'Titulariat'
        WHEN a.type_special='atelier' THEN 'Atelier'
        WHEN a.type_special='mediation' THEN 'M\xE9diation'
        WHEN a.type_special='autre' THEN 'Autre'
        WHEN a.type_special IS NOT NULL AND a.type_special <> '' AND a.type_special <> 'soutien'
          THEN INITCAP(REPLACE(a.type_special, '-', ' '))
        ELSE NULL
      END) as classe_nom,
      m.nom as matiere_nom,
      COALESCE(
        (SELECT p.nom FROM pools p WHERE p.id = a.pool_id),
        (
          SELECT string_agg(p.nom, ', ' ORDER BY p.nom)
          FROM pools p
          JOIN pool_classes pc ON pc.pool_id = p.id
          WHERE pc.classe_id = a.classe_id
        )
      ) AS pool_nom,
      (
        SELECT string_agg(p.nom, ', ' ORDER BY p.nom)
        FROM pools p
        JOIN pool_profs pp ON pp.pool_id = p.id
        WHERE pp.prof_id = $1
      ) AS pools_prof,
      CASE WHEN a.type_special = 'soutien' THEN (
        SELECT u2.prenom
        FROM affectations a2
        JOIN utilisateurs u2 ON u2.id = a2.prof_id
        WHERE a2.classe_id = a.classe_id
          AND a2.creneau_id = a.creneau_id
          AND (a2.type_special IS NULL OR a2.type_special = '')
          AND a2.prof_id IS DISTINCT FROM a.prof_id
        ORDER BY a2.id
        LIMIT 1
      ) ELSE NULL END AS soutien_prof_prenom,
      CASE WHEN a.type_special = 'soutien' THEN (
        SELECT u2.nom
        FROM affectations a2
        JOIN utilisateurs u2 ON u2.id = a2.prof_id
        WHERE a2.classe_id = a.classe_id
          AND a2.creneau_id = a.creneau_id
          AND (a2.type_special IS NULL OR a2.type_special = '')
          AND a2.prof_id IS DISTINCT FROM a.prof_id
        ORDER BY a2.id
        LIMIT 1
      ) ELSE NULL END AS soutien_prof_nom,
      CASE WHEN a.type_special = 'soutien' THEN (
        SELECT COALESCE(m2.nom, m2b.nom)
        FROM affectations a2
        LEFT JOIN matieres m2 ON m2.id = a2.matiere_id
        LEFT JOIN LATERAL (
          SELECT m.nom
          FROM planning_branches pb
          JOIN matieres m ON m.id = pb.matiere_id
          WHERE pb.classe_id = a2.classe_id AND pb.prof_id = a2.prof_id
          ORDER BY pb.id
          LIMIT 1
        ) m2b ON true
        WHERE a2.classe_id = a.classe_id
          AND a2.creneau_id = a.creneau_id
          AND (a2.type_special IS NULL OR a2.type_special = '')
          AND a2.prof_id IS DISTINCT FROM a.prof_id
        ORDER BY a2.id
        LIMIT 1
      ) ELSE NULL END AS soutien_matiere_nom,
      CASE WHEN a.type_special IS NULL OR a.type_special = '' THEN (
        SELECT u3.prenom
        FROM affectations a3
        JOIN utilisateurs u3 ON u3.id = a3.prof_id
        WHERE a3.classe_id = a.classe_id
          AND a3.creneau_id = a.creneau_id
          AND a3.type_special = 'soutien'
        ORDER BY a3.id
        LIMIT 1
      ) ELSE NULL END AS recu_soutien_prenom,
      CASE WHEN a.type_special IS NULL OR a.type_special = '' THEN (
        SELECT u3.nom
        FROM affectations a3
        JOIN utilisateurs u3 ON u3.id = a3.prof_id
        WHERE a3.classe_id = a.classe_id
          AND a3.creneau_id = a.creneau_id
          AND a3.type_special = 'soutien'
        ORDER BY a3.id
        LIMIT 1
      ) ELSE NULL END AS recu_soutien_nom
    FROM affectations a
    LEFT JOIN classes c ON c.id=a.classe_id
    LEFT JOIN matieres m ON m.id=a.matiere_id
    WHERE a.prof_id=$1
  `,[o]),T=await r.query(`
    SELECT p.id, p.nom, p.site
    FROM pools p
    JOIN pool_profs pp ON pp.pool_id = p.id
    WHERE pp.prof_id = $1
    ORDER BY p.nom
  `,[o]),w=await r.query("SELECT creneau_id,disponible,eviter FROM disponibilites WHERE prof_id=$1",[o]);return s(e,{prof:_.rows[0],creneaux:h.rows,affectations:R.rows,dispos:w.rows,classesTitulaire:E.rows,pools:T.rows})}let g=n.match(/^\/planning\/classe\/(\d+)$/);if(g&&t.method==="GET"){let o=g[1],_=i.searchParams.get("pool_id"),E=await r.query("SELECT c.id, c.nom, u.prenom||' '||u.nom as titulaire_nom FROM classes c LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id WHERE c.id=$1",[o]),h=await r.query("SELECT * FROM creneaux ORDER BY "+pe+", ordre"),R=await r.query(`
    SELECT a.id, a.creneau_id, a.prof_id, a.matiere_id, a.type_special, a.pool_id,
      u.prenom||' '||u.nom as prof_nom, m.nom as matiere_nom
    FROM affectations a
    JOIN utilisateurs u ON u.id=a.prof_id
    LEFT JOIN matieres m ON m.id=a.matiere_id
    WHERE a.classe_id=$1
    ORDER BY CASE WHEN a.type_special = 'soutien' THEN 1 ELSE 0 END, a.id
  `,[o]),T=await r.query("SELECT jour,periode FROM classe_horaires WHERE classe_id=$1",[o]),w=[];return _&&(w=(await r.query(`
      SELECT pb.prof_id, pb.matiere_id, m.nom as matiere_nom, m.periodes_semaine,
        u.prenom||' '||u.nom as prof_nom
      FROM planning_branches pb
      JOIN matieres m ON m.id=pb.matiere_id
      LEFT JOIN utilisateurs u ON u.id=pb.prof_id
      WHERE pb.classe_id=$1 AND pb.pool_id=$2
    `,[o,_])).rows),s(e,{classe:E.rows[0],creneaux:h.rows,affectations:R.rows,horaires:T.rows,branches:w})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(l){console.error("planning-fast error:",l);let m=l instanceof Error?l.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await r.end()}}async function en(t,n,e,i){let d=await A(t),a=C(d,e,n);if(a)return a;let r=b();try{if(n==="/presences/classes"&&t.method==="GET"){if(d.role==="admin"){let m=await r.query(`
          SELECT id, nom, niveau, annee_scolaire
          FROM classes
          WHERE actif IS DISTINCT FROM false
          ORDER BY nom
        `);return s(e,m.rows)}let l=await r.query(`
        SELECT DISTINCT c.id, c.nom, c.niveau, c.annee_scolaire
        FROM classes c
        LEFT JOIN affectations a ON a.classe_id = c.id AND a.prof_id = $1
        LEFT JOIN emploi_du_temps et ON et.classe_id = c.id AND et.prof_id = $1
        WHERE c.prof_principal_id = $1
           OR a.id IS NOT NULL
           OR et.id IS NOT NULL
        ORDER BY c.nom
      `,[d.id]);return s(e,l.rows)}if(n==="/presences"&&t.method==="GET"){let l=i.searchParams.get("classe_id"),m=i.searchParams.get("date"),p=await r.query(`
        SELECT pv.id, pv.eleve_id, pv.classe_id,
          TO_CHAR(pv.date, 'YYYY-MM-DD') AS date,
          pv.p1, pv.p2, pv.p3, pv.p4, pv.p5, pv.p6, pv.p7, pv.p8,
          pv.remarque, pv.valide
        FROM presences_v2 pv
        JOIN eleves e ON pv.eleve_id = e.id
        WHERE pv.classe_id = $1 AND pv.date = $2::date
      `,[l,m]);return s(e,p.rows)}if(n==="/presences/eleves"&&t.method==="GET"){let l=i.searchParams.get("classe_id"),m=await r.query(`
        SELECT e.id,
          COALESCE(u.nom, e.nom) AS nom,
          COALESCE(u.prenom, e.prenom) AS prenom
        FROM eleves e
        LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
        WHERE e.classe_id = $1
          AND LOWER(COALESCE(e.statut, 'actif')) = 'actif'
        ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)
      `,[l]);return s(e,m.rows)}if(n==="/presences/mois"&&t.method==="GET"){let l=i.searchParams.get("classe_id"),m=i.searchParams.get("mois"),p=await r.query(`
        SELECT pv.id, pv.eleve_id, pv.classe_id,
          TO_CHAR(pv.date, 'YYYY-MM-DD') AS date,
          pv.p1, pv.p2, pv.p3, pv.p4, pv.p5, pv.p6, pv.p7, pv.p8,
          pv.remarque, pv.valide
        FROM presences_v2 pv
        JOIN eleves e ON pv.eleve_id = e.id
        WHERE pv.classe_id = $1 AND TO_CHAR(pv.date, 'YYYY-MM') = $2
      `,[l,m]);return s(e,p.rows)}if(n==="/presences/statistiques"&&t.method==="GET"){let l=i.searchParams.get("classe_id"),m=i.searchParams.get("date_debut"),p=i.searchParams.get("date_fin"),u=await r.query(`
        SELECT
          e.id as eleve_id,
          COALESCE(u.nom, e.nom) AS nom,
          COALESCE(u.prenom, e.prenom) AS prenom,
          COUNT(DISTINCT pv.date) as jours,
          SUM(
            (CASE WHEN pv.p1='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p2='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p3='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p4='P' THEN 1 ELSE 0 END)+
            (CASE WHEN pv.p5='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p6='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p7='P' THEN 1 ELSE 0 END)+(CASE WHEN pv.p8='P' THEN 1 ELSE 0 END)
          ) as presents,
          SUM(
            (CASE WHEN pv.p1='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p2='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p3='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p4='A' THEN 1 ELSE 0 END)+
            (CASE WHEN pv.p5='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p6='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p7='A' THEN 1 ELSE 0 END)+(CASE WHEN pv.p8='A' THEN 1 ELSE 0 END)
          ) as absents,
          SUM(
            (CASE WHEN pv.p1='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p2='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p3='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p4='R' THEN 1 ELSE 0 END)+
            (CASE WHEN pv.p5='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p6='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p7='R' THEN 1 ELSE 0 END)+(CASE WHEN pv.p8='R' THEN 1 ELSE 0 END)
          ) as retards,
          SUM(
            (CASE WHEN pv.p1='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p2='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p3='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p4='E' THEN 1 ELSE 0 END)+
            (CASE WHEN pv.p5='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p6='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p7='E' THEN 1 ELSE 0 END)+(CASE WHEN pv.p8='E' THEN 1 ELSE 0 END)
          ) as excuses,
          SUM(
            (CASE WHEN pv.p1='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p2='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p3='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p4='C' THEN 1 ELSE 0 END)+
            (CASE WHEN pv.p5='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p6='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p7='C' THEN 1 ELSE 0 END)+(CASE WHEN pv.p8='C' THEN 1 ELSE 0 END)
          ) as conges
        FROM eleves e
        LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
        LEFT JOIN presences_v2 pv
          ON pv.eleve_id = e.id
         AND ($2::date IS NULL OR pv.date >= $2::date)
         AND ($3::date IS NULL OR pv.date <= $3::date)
        WHERE e.classe_id = $1
          AND LOWER(COALESCE(e.statut, 'actif')) = 'actif'
        GROUP BY e.id, u.nom, u.prenom
        ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)
      `,[l,m||null,p||null]);return s(e,u.rows)}if(n==="/presences"&&t.method==="POST"){let l=await $(t),{presences:m,date:p,classe_id:u}=l,f=await r.connect();try{await f.query("BEGIN");for(let c of m)(await f.query("SELECT id FROM presences_v2 WHERE eleve_id=$1 AND date=$2",[c.eleve_id,p])).rows.length>0?await f.query(`
              UPDATE presences_v2 SET p1=$1,p2=$2,p3=$3,p4=$4,p5=$5,p6=$6,p7=$7,p8=$8,remarque=$9,valide=$10
              WHERE eleve_id=$11 AND date=$12
            `,[c.p1,c.p2,c.p3,c.p4,c.p5,c.p6,c.p7,c.p8,c.remarque||null,c.valide||!1,c.eleve_id,p]):await f.query(`
              INSERT INTO presences_v2 (eleve_id,classe_id,date,p1,p2,p3,p4,p5,p6,p7,p8,remarque,valide)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            `,[c.eleve_id,u,p,c.p1,c.p2,c.p3,c.p4,c.p5,c.p6,c.p7,c.p8,c.remarque||null,c.valide||!1]);return await f.query("COMMIT"),s(e,{message:"Presences enregistrees"})}catch(c){throw await f.query("ROLLBACK"),c}finally{f.release()}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(l){console.error("presences-fast error:",l);let m=l instanceof Error?l.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await r.end()}}import Ie from"npm:bcryptjs@2";var tn="id, nom, prenom, email, actif, created_at, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, priorite_pref, type_prof, identifiant, mfa_enabled, mfa_exempt";async function nn(t,n,e){return e===!0||e==="true"?(await t.query(`UPDATE utilisateurs
       SET mfa_exempt = true,
           mfa_enabled = false,
           mfa_secret = NULL,
           mfa_enabled_at = NULL,
           mfa_backup_codes = '[]'::jsonb
       WHERE id = $1`,[n]),!0):e===!1||e==="false"?(await t.query("UPDATE utilisateurs SET mfa_exempt = false WHERE id = $1",[n]),!1):null}async function gs(t,n){let e=await t.connect();try{if(await e.query("BEGIN"),(await e.query("SELECT id FROM utilisateurs WHERE id=$1 AND role=$2",[n,"prof"])).rows.length===0)return await e.query("ROLLBACK"),null;await e.query("UPDATE classes SET prof_principal_id=NULL WHERE prof_principal_id=$1",[n]),await e.query("UPDATE tcf_state SET updated_by=NULL WHERE updated_by=$1",[n]),await e.query("UPDATE documents_administratifs SET auteur_id=NULL WHERE auteur_id=$1",[n]),await e.query("UPDATE inventaire_branches SET auteur_id=NULL WHERE auteur_id=$1",[n]),await e.query("UPDATE observations SET auteur_id=NULL WHERE auteur_id=$1",[n]);let d=["pool","affectation","resultats"];for(let a of d){let r=await e.query("SELECT donnees FROM tcf_state WHERE cle=$1",[a]);if(!r.rows.length)continue;let l=r.rows[0].donnees,m=l.selectedBySite;if(m)for(let f of Object.keys(m))m[f]=(m[f]||[]).filter(c=>String(c)!==String(n));let p=l.poolCellOverrides;if(p)for(let f of Object.keys(p))(f.includes(`::${n}::`)||f.endsWith(`::${n}`))&&delete p[f];let u=l.rolesByPoolDemi;if(u)for(let f of Object.keys(u))delete u[f][String(n)];await e.query("UPDATE tcf_state SET donnees=$1 WHERE cle=$2",[JSON.stringify(l),a])}return await e.query("DELETE FROM affectations WHERE prof_id=$1",[n]),await e.query("DELETE FROM calendrier_prof WHERE prof_id=$1",[n]),await e.query("DELETE FROM disponibilites WHERE prof_id=$1",[n]),await e.query("DELETE FROM documents_profs WHERE prof_id=$1",[n]),await e.query("DELETE FROM emploi_du_temps WHERE prof_id=$1",[n]),await e.query("DELETE FROM evaluations WHERE prof_id=$1",[n]),await e.query("DELETE FROM messages WHERE expediteur_id=$1 OR destinataire_id=$1",[n]),await e.query("DELETE FROM notes_personnelles WHERE utilisateur_id=$1",[n]),await e.query("DELETE FROM notifications WHERE utilisateur_id=$1",[n]),await e.query("DELETE FROM planning_branches WHERE prof_id=$1",[n]),await e.query("DELETE FROM pool_profs WHERE prof_id=$1",[n]),await e.query("DELETE FROM prof_couleurs WHERE prof_id=$1",[n]),await e.query("DELETE FROM utilisateurs WHERE id=$1",[n]),await e.query("COMMIT"),null}catch(i){throw await e.query("ROLLBACK"),i}finally{e.release()}}async function sn(t,n,e){let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{if(n==="/profs"&&t.method==="GET"){let p=await a.query(`SELECT ${tn} FROM utilisateurs WHERE role=$1 ORDER BY nom, prenom`,["prof"]);return s(e,p.rows)}if(n==="/profs"&&t.method==="POST"){let p=O(i,e);if(p)return p;let u=await $(t),{nom:f,prenom:c,email:g,mot_de_passe:o,telephone:_,specialite:E,adresse:h,npa:R,lieu:T,sexe:w,taux_activite:y,periodes_semaine:N,date_naissance:S,avs:v,type_contrat:L,type_permis:I,niveau_prefere:M,branches_specialites:W,lieu_travail_prefere:F,remarque_lieu_travail:P,priorite_pref:U,type_prof:x,identifiant:D}=u;if((await a.query("SELECT id FROM utilisateurs WHERE email=$1",[g])).rows.length>0)return s(e,{message:"Email deja utilise"},400);let G=await Ie.hash(String(o||"EcoleManager2024!"),10),j=String(D||"").trim()||(String(c||"").slice(0,3)+String(f||"").slice(0,3)).toLowerCase()||null,Z=await a.query(`INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, priorite_pref, type_prof, identifiant)
         VALUES ($1,$2,$3,$4,'prof',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING id, nom, prenom, email`,[f,c,g,G,_||null,E||null,h||null,R||null,T||null,w||null,y?parseInt(String(y)):null,N?parseInt(String(N)):null,S&&S!==""?S:null,v||null,L||null,I||null,M||null,W||null,F||null,P||null,U||"niveau",x||null,j]);return await nn(a,Z.rows[0].id,u.mfa_exempt),s(e,{message:"Professeur cree",prof:Z.rows[0]},201)}let r=n.match(/^\/profs\/(\d+)\/envoyer-acces$/);if(r&&t.method==="POST"){let p=O(i,e);if(p)return p;let u=r[1],f=await a.query("SELECT nom, prenom, email FROM utilisateurs WHERE id=$1 AND role=$2",[u,"prof"]);if(f.rows.length===0)return s(e,{message:"Professeur non trouv\xE9"},404);let c=f.rows[0],g="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#",o="";for(let E=0;E<10;E++)o+=g[Math.floor(Math.random()*g.length)];let _=await Ie.hash(o,10);return await a.query("UPDATE utilisateurs SET mot_de_passe=$1, doit_changer_mdp=true WHERE id=$2",[_,u]),await ue({to:c.email,subject:"Vos acc\xE8s Oasis",html:`
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#f8fafc;border-radius:12px">
            <h2 style="color:#6366f1">Oasis</h2>
            <p>Bonjour <b>${c.prenom} ${c.nom}</b>,</p>
            <p>Voici vos acc\xE8s pour vous connecter \xE0 l'application :</p>
            <div style="background:white;padding:20px;border-radius:8px;border-left:4px solid #6366f1;margin:20px 0">
              <p style="margin:0"><b>Email :</b> ${c.email}</p>
              <p style="margin:8px 0 0"><b>Mot de passe temporaire :</b> <code style="background:#e0e7ff;padding:4px 8px;border-radius:4px;font-size:16px">${o}</code></p>
            </div>
            <p style="color:#ef4444;font-weight:bold">\u26A0\uFE0F Vous devrez changer ce mot de passe lors de votre premi\xE8re connexion.</p>
          </div>
        `,text:`Bonjour ${c.prenom} ${c.nom}, vos acces Oasis. Email: ${c.email}. Mot de passe: ${o}.`}),s(e,{message:"Email envoy\xE9 \xE0 "+c.email})}let l=n.match(/^\/profs\/(\d+)\/documents(?:\/(\d+)(?:\/telecharger)?)?$/);if(l){let p=l[1],u=l[2],f=n.endsWith("/telecharger");if(!u&&t.method==="GET"){let c=await a.query("SELECT id, nom, type, taille, created_at FROM documents_profs WHERE prof_id=$1 ORDER BY created_at DESC",[p]);return s(e,c.rows)}if(!u&&t.method==="POST"){let c=O(i,e);if(c)return c;let g=await $(t),{nom:o,type:_,contenu:E,taille:h}=g;if(!E)return s(e,{message:"Contenu manquant"},400);if(V()){let w=(await a.query(`INSERT INTO documents_profs (prof_id, nom, type, contenu, taille, storage_path)
             VALUES ($1,$2,$3,NULL,$4,NULL) RETURNING id, nom, type, taille, created_at`,[p,o,_||"Autre",h||null])).rows[0],y=`profs/${p}/${w.id}_${ee(o)}`;try{await X(H.documentsProfs,y,String(E)),await a.query("UPDATE documents_profs SET storage_path=$1 WHERE id=$2",[y,w.id])}catch(N){throw await a.query("DELETE FROM documents_profs WHERE id=$1",[w.id]),N}return s(e,w,201)}let R=await a.query("INSERT INTO documents_profs (prof_id, nom, type, contenu, taille) VALUES ($1,$2,$3,$4,$5) RETURNING id, nom, type, taille, created_at",[p,o,_||"Autre",E,h||null]);return s(e,R.rows[0],201)}if(u&&f&&t.method==="GET"){let c=await a.query("SELECT nom, contenu, storage_path FROM documents_profs WHERE id=$1 AND prof_id=$2",[u,p]);if(c.rows.length===0)return s(e,{message:"Document non trouv\xE9"},404);let g=c.rows[0],o=await ne(g,H.documentsProfs);return o?s(e,{nom:g.nom,contenu:o}):s(e,{message:"Fichier introuvable"},404)}if(u&&!f&&t.method==="DELETE"){let c=O(i,e);if(c)return c;let g=await a.query("SELECT storage_path FROM documents_profs WHERE id=$1 AND prof_id=$2",[u,p]);return g.rows.length?(await Y(H.documentsProfs,g.rows[0].storage_path),await a.query("DELETE FROM documents_profs WHERE id=$1 AND prof_id=$2",[u,p]),s(e,{message:"Document supprim\xE9"})):s(e,{message:"Document non trouv\xE9"},404)}}let m=n.match(/^\/profs\/(\d+)$/);if(m){let p=m[1];if(t.method==="GET"){let u=await a.query(`SELECT ${tn} FROM utilisateurs WHERE id=$1 AND role=$2`,[p,"prof"]);return u.rows.length===0?s(e,{message:"Professeur non trouve"},404):s(e,u.rows[0])}if(t.method==="PUT"){let u=O(i,e);if(u)return u;let f=await $(t),{nom:c,prenom:g,email:o,actif:_,mot_de_passe:E,telephone:h,specialite:R,adresse:T,npa:w,lieu:y,sexe:N,taux_activite:S,periodes_semaine:v,date_naissance:L,avs:I,type_contrat:M,type_permis:W,niveau_prefere:F,branches_specialites:P,lieu_travail_prefere:U,remarque_lieu_travail:x,priorite_pref:D,type_prof:J,identifiant:G}=f,j,Z;if(E&&String(E).trim()!==""){let $e=await Ie.hash(String(E),10);j="UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, mot_de_passe=$5, telephone=$6, specialite=$7, adresse=$8, npa=$9, lieu=$10, sexe=$11, taux_activite=$12, periodes_semaine=$13, date_naissance=$14, avs=$15, type_contrat=$16, type_permis=$17, niveau_prefere=$18, branches_specialites=$19, lieu_travail_prefere=$20, remarque_lieu_travail=$21, priorite_pref=$22, type_prof=$23, identifiant=$24 WHERE id=$25 AND role='prof' RETURNING id",Z=[c,g,o,_!==void 0?_:!0,$e,h||null,R||null,T||null,w||null,y||null,N||null,S?parseInt(String(S)):null,v?parseInt(String(v)):null,L&&L!==""?L:null,I||null,M||null,W||null,F||null,P||null,U||null,x||null,D||"niveau",J||null,G||null,p]}else j="UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, telephone=$5, specialite=$6, adresse=$7, npa=$8, lieu=$9, sexe=$10, taux_activite=$11, periodes_semaine=$12, date_naissance=$13, avs=$14, type_contrat=$15, type_permis=$16, niveau_prefere=$17, branches_specialites=$18, lieu_travail_prefere=$19, remarque_lieu_travail=$20, priorite_pref=$21, type_prof=$22, identifiant=$23 WHERE id=$24 AND role='prof' RETURNING id",Z=[c,g,o,_!==void 0?_:!0,h||null,R||null,T||null,w||null,y||null,N||null,S?parseInt(String(S)):null,v?parseInt(String(v)):null,L&&L!==""?L:null,I||null,M||null,W||null,F||null,P||null,U||null,x||null,D||"niveau",J||null,G||null,p];return(await a.query(j,Z)).rows.length===0?s(e,{message:"Professeur non trouve"},404):(await nn(a,p,f.mfa_exempt),s(e,{message:"Professeur modifie"}))}if(t.method==="DELETE"){let u=O(i,e);return u||(await gs(a,p)?s(e,{message:"Professeur non trouve"},404):s(e,{message:"Professeur supprime"}))}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("profs-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:l},500)}finally{await a.end()}}import{randomBytes as Rs}from"node:crypto";var hs=new Set(["texte","paragraphe","choix_unique","choix_multiple"]),Ts=()=>Rs(24).toString("hex");async function Me(t,n){let e=await t.query("SELECT * FROM sondages WHERE id = $1",[n]);if(e.rows.length===0)return null;let i=e.rows[0],d=await t.query("SELECT id, ordre, type, libelle, options, obligatoire FROM sondage_questions WHERE sondage_id = $1 ORDER BY ordre ASC, id ASC",[n]);return{...i,questions:d.rows.map(a=>({...a,options:a.options||[]}))}}function rn(t){return Array.isArray(t)?t.map((n,e)=>{let i=n,d=String(i.type||"texte");if(!hs.has(d))throw new Error(`Type de question invalide: ${d}`);let a=Array.isArray(i.options)?i.options.map(r=>String(r).trim()).filter(Boolean):[];if(d==="choix_unique"||d==="choix_multiple"){if(a.length<2)throw new Error("Les questions \xE0 choix n\xE9cessitent au moins 2 options")}else a=[];return{ordre:e,type:d,libelle:String(i.libelle||"").trim()||"Question sans titre",options:a,obligatoire:!!i.obligatoire}}):[]}function ws(t,n){let e={},i=n&&typeof n=="object"?n:{};for(let d of t){let a=String(d.id),r=i[a]!==void 0?i[a]:i[d.id];if(d.obligatoire){if(r==null||r==="")throw new Error(`R\xE9ponse obligatoire manquante : ${d.libelle}`);if(Array.isArray(r)&&r.length===0)throw new Error(`R\xE9ponse obligatoire manquante : ${d.libelle}`)}if(r==null||r==="")continue;let l=Array.isArray(d.options)?d.options.map(String):[];if(d.type==="texte"||d.type==="paragraphe"){let m=String(r).trim();if(!m&&d.obligatoire)throw new Error(`R\xE9ponse obligatoire : ${d.libelle}`);m&&(e[a]=m.slice(0,d.type==="paragraphe"?8e3:500))}else if(d.type==="choix_unique"){let m=String(r).trim();if(!l.includes(m))throw new Error(`Choix invalide pour : ${d.libelle}`);e[a]=m}else if(d.type==="choix_multiple"){let p=(Array.isArray(r)?r:[r]).map(u=>String(u).trim()).filter(Boolean);for(let u of p)if(!l.includes(u))throw new Error(`Option invalide pour : ${d.libelle}`);if(d.obligatoire&&p.length===0)throw new Error(`R\xE9ponse obligatoire : ${d.libelle}`);p.length&&(e[a]=p)}}return e}async function an(t,n,e){let i=b();try{let d=n.match(/^\/sondages\/public\/([^/]+)$/);if(d&&t.method==="GET"){let u=String(d[1]||"").trim();if(!u||u.length>80)return s(e,{message:"Lien invalide"},400);let f=await i.query("SELECT id, titre, description, actif, accepte_reponses FROM sondages WHERE public_token = $1",[u]);if(f.rows.length===0)return s(e,{message:"Formulaire introuvable"},404);let c=f.rows[0];if(!c.actif)return s(e,{message:"Ce formulaire n'est plus disponible"},403);if(!c.accepte_reponses)return s(e,{message:"Les r\xE9ponses ne sont plus accept\xE9es"},403);let g=await i.query("SELECT id, ordre, type, libelle, options, obligatoire FROM sondage_questions WHERE sondage_id = $1 ORDER BY ordre ASC, id ASC",[c.id]);return s(e,{titre:c.titre,description:c.description,questions:g.rows.map(o=>({...o,options:o.options||[]}))})}let a=n.match(/^\/sondages\/public\/([^/]+)\/repondre$/);if(a&&t.method==="POST")try{let u=String(a[1]||"").trim();if(!u||u.length>80)return s(e,{message:"Lien invalide"},400);let f=await i.query("SELECT id, actif, accepte_reponses FROM sondages WHERE public_token = $1",[u]);if(f.rows.length===0)return s(e,{message:"Formulaire introuvable"},404);let c=f.rows[0];if(!c.actif)return s(e,{message:"Ce formulaire n'est plus disponible"},403);if(!c.accepte_reponses)return s(e,{message:"Les r\xE9ponses ne sont plus accept\xE9es"},403);let o=(await i.query("SELECT id, ordre, type, libelle, options, obligatoire FROM sondage_questions WHERE sondage_id = $1 ORDER BY ordre ASC, id ASC",[c.id])).rows.map(T=>({...T,options:T.options||[]}));if(o.length===0)return s(e,{message:"Ce formulaire n'a aucune question"},400);let _=await $(t),E=_.reponses!==void 0?_.reponses:_,h=ws(o,E),R=await i.query("INSERT INTO sondage_reponses (sondage_id, reponses) VALUES ($1, $2::jsonb) RETURNING id, submitted_at",[c.id,JSON.stringify(h)]);return s(e,{ok:!0,id:R.rows[0].id,submitted_at:R.rows[0].submitted_at},201)}catch(u){let f=u instanceof Error?u.message:"Erreur envoi";return s(e,{message:f},400)}let r=await A(t),l=C(r,e,n);if(l)return l;if(n==="/sondages"&&t.method==="GET"){let u=await i.query(`
        SELECT s.id, s.titre, s.description, s.public_token, s.actif, s.accepte_reponses, s.created_at, s.updated_at,
          (SELECT COUNT(*)::int FROM sondage_reponses r WHERE r.sondage_id = s.id) AS nb_reponses
        FROM sondages s
        ORDER BY s.updated_at DESC NULLS LAST, s.id DESC
      `);return s(e,u.rows)}if(n==="/sondages"&&t.method==="POST"){let u=await i.connect();try{let f=await $(t),{titre:c,description:g,questions:o}=f,_=rn(o),E=Ts();await u.query("BEGIN");let R=(await u.query(`INSERT INTO sondages (titre, description, public_token, created_by)
           VALUES ($1, $2, $3, $4) RETURNING id`,[String(c||"Nouveau sondage").slice(0,500),g||null,E,r?.id||null])).rows[0].id;for(let w of _)await u.query(`INSERT INTO sondage_questions (sondage_id, ordre, type, libelle, options, obligatoire)
             VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,[R,w.ordre,w.type,w.libelle,JSON.stringify(w.options),w.obligatoire]);await u.query("COMMIT");let T=await Me(i,R);return s(e,T,201)}catch(f){await u.query("ROLLBACK");let c=f instanceof Error?f.message:"Erreur cr\xE9ation";return s(e,{message:c},400)}finally{u.release()}}let m=n.match(/^\/sondages\/(\d+)\/reponses$/);if(m&&t.method==="GET"){let u=parseInt(m[1],10);if(!u)return s(e,{message:"Identifiant invalide"},400);let f=await i.query("SELECT id, reponses, submitted_at FROM sondage_reponses WHERE sondage_id = $1 ORDER BY submitted_at DESC LIMIT 1000",[u]);return s(e,f.rows)}let p=n.match(/^\/sondages\/(\d+)$/);if(p){let u=parseInt(p[1],10);if(!u)return s(e,{message:"Identifiant invalide"},400);if(t.method==="GET"){let f=await Me(i,u);return f?s(e,f):s(e,{message:"Sondage introuvable"},404)}if(t.method==="PUT"){let f=await i.connect();try{let c=await f.query("SELECT id, titre, description, actif, accepte_reponses FROM sondages WHERE id = $1",[u]);if(c.rows.length===0)return s(e,{message:"Sondage introuvable"},404);let g=c.rows[0],o=await $(t),{titre:_,description:E,actif:h,accepte_reponses:R,questions:T}=o,w=T!==void 0?rn(T):null,y=_!==void 0?String(_).slice(0,500):g.titre,N=E!==void 0?E:g.description,S=h!==void 0?!!h:g.actif,v=R!==void 0?!!R:g.accepte_reponses;if(await f.query("BEGIN"),await f.query("UPDATE sondages SET titre = $2, description = $3, actif = $4, accepte_reponses = $5, updated_at = NOW() WHERE id = $1",[u,y,N,S,v]),w!==null){await f.query("DELETE FROM sondage_questions WHERE sondage_id = $1",[u]);for(let L of w)await f.query(`INSERT INTO sondage_questions (sondage_id, ordre, type, libelle, options, obligatoire)
                 VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,[u,L.ordre,L.type,L.libelle,JSON.stringify(L.options),L.obligatoire])}return await f.query("COMMIT"),s(e,await Me(i,u))}catch(c){await f.query("ROLLBACK");let g=c instanceof Error?c.message:"Erreur mise \xE0 jour";return s(e,{message:g},400)}finally{f.release()}}if(t.method==="DELETE")return await i.query("DELETE FROM sondages WHERE id = $1",[u]),s(e,{ok:!0})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(d){console.error("sondages-fast error:",d);let a=d instanceof Error?d.message:"Erreur serveur";return s(e,{message:a},500)}finally{await i.end()}}async function on(t,n,e,i){let d=await A(t),a=C(d,e,n);if(a)return a;let r=b();try{if(n==="/sorties"&&t.method==="GET"){let m=i.searchParams.get("type"),p="SELECT * FROM sorties_scolaires",u=[];m&&(p+=" WHERE type = $1",u.push(m)),p+=" ORDER BY date_sortie DESC, created_at DESC";let f=await r.query(p,u);return s(e,f.rows)}if(n==="/sorties"&&t.method==="POST"){let m=await $(t),{type:p,classes_ids:u,classes_noms:f,titulaires:c,autres_accompagnants:g,date_sortie:o,destination:_,activites:E,lieu_depart:h,heure_depart:R,lieu_retour:T,heure_retour:w,budget:y,commentaires:N,approuve:S}=m,v=await r.query(`INSERT INTO sorties_scolaires (type, classes_ids, classes_noms, titulaires, autres_accompagnants, date_sortie, destination, activites, lieu_depart, heure_depart, lieu_retour, heure_retour, budget, commentaires, approuve)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,[p,u||null,f||null,c,g,o||null,_,E,h,R||null,T,w||null,y||null,N,S||!1]);return s(e,v.rows[0])}let l=n.match(/^\/sorties\/(\d+)$/);if(l){let m=l[1];if(t.method==="PUT"){let p=await $(t),{type:u,classes_ids:f,classes_noms:c,titulaires:g,autres_accompagnants:o,date_sortie:_,destination:E,activites:h,lieu_depart:R,heure_depart:T,lieu_retour:w,heure_retour:y,budget:N,commentaires:S,approuve:v}=p,L=await r.query(`UPDATE sorties_scolaires SET type=$1, classes_ids=$2, classes_noms=$3, titulaires=$4, autres_accompagnants=$5, date_sortie=$6, destination=$7, activites=$8, lieu_depart=$9, heure_depart=$10, lieu_retour=$11, heure_retour=$12, budget=$13, commentaires=$14, approuve=$15
           WHERE id=$16 RETURNING *`,[u,f||null,c||null,g,o,_||null,E,h,R,T||null,w,y||null,N||null,S,v||!1,m]);return s(e,L.rows[0])}if(t.method==="DELETE")return await r.query("DELETE FROM sorties_scolaires WHERE id=$1",[m]),s(e,{message:"Supprim\xE9"})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(l){console.error("sorties-fast error:",l);let m=l instanceof Error?l.message:"Erreur serveur";return s(e,{message:m},500)}finally{await r.end()}}var ys=["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];async function q(t,n,e=[],i=[]){try{return await t.query(n,e)}catch{return{rows:i}}}async function un(t,n,e){if(n!=="/statistiques"||t.method!=="GET")return s(e,{message:"Route non trouv\xE9e"},404);let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{let r=i.role==="admin",l=[];r||(l=(await q(a,`
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
      `,[i.id])).rows.map(L=>L.classe_id));let m=await q(a,"SELECT COUNT(*) FROM eleves WHERE statut='actif'",[],[{count:0}]),p=await q(a,"SELECT COUNT(*) FROM utilisateurs WHERE role='prof'",[],[{count:0}]),u=await q(a,"SELECT COUNT(*) FROM classes",[],[{count:0}]),f=await q(a,"SELECT COUNT(*) FROM matieres",[],[{count:0}]),c=await q(a,`
      SELECT
        COUNT(CASE WHEN statut='present' THEN 1 END) as presents,
        COUNT(CASE WHEN statut='absent' THEN 1 END) as absents,
        COUNT(CASE WHEN statut='retard' THEN 1 END) as retards,
        COUNT(*) as total
      FROM presences WHERE date = CURRENT_DATE
    `,[],[{presents:0,absents:0,retards:0,total:0}]),g=await q(a,`
      SELECT
        COALESCE(SUM(CASE WHEN statut='paye' THEN montant END), 0) as encaisse,
        COALESCE(SUM(CASE WHEN statut='en_attente' THEN montant END), 0) as en_attente,
        COALESCE(SUM(CASE WHEN statut='en_retard' THEN montant END), 0) as en_retard
      FROM paiements
    `,[],[{encaisse:0,en_attente:0,en_retard:0}]),o=await q(a,`
      SELECT c.nom as classe,
        ROUND(AVG(n.valeur)::numeric, 2) as moyenne
      FROM notes n
      JOIN evaluations ev ON n.evaluation_id = ev.id
      JOIN classes c ON ev.classe_id = c.id
      WHERE n.absent = false AND n.dispense = false AND n.valeur IS NOT NULL
      GROUP BY c.nom
      ORDER BY c.nom
    `),_=await q(a,`
      SELECT c.nom as classe,
        COUNT(CASE WHEN p.statut='absent' THEN 1 END) as absents,
        COUNT(p.id) as total
      FROM presences p
      JOIN eleves e ON p.eleve_id = e.id
      JOIN classes c ON e.classe_id = c.id
      GROUP BY c.nom
      ORDER BY c.nom
    `),E=await q(a,`
      SELECT c.nom as classe, COUNT(e.id) as nb
      FROM classes c
      LEFT JOIN eleves e ON e.classe_id = c.id AND e.statut = 'actif'
      GROUP BY c.nom
      ORDER BY c.nom
    `),h=await q(a,`
      SELECT titre, date_debut, type, couleur
      FROM calendrier
      WHERE date_debut >= CURRENT_DATE
        AND (categorie IS NULL OR categorie NOT IN ('particulier', 'retenue', 'evaluation'))
      ORDER BY date_debut
      LIMIT 5
    `),R=ys[new Date().getDay()],T=await q(a,`
      SELECT id, jour, heure_debut, heure_fin, periode, ordre
      FROM creneaux
      WHERE jour = $1 AND heure_debut <= CURRENT_TIME AND heure_fin >= CURRENT_TIME
      ORDER BY ordre
      LIMIT 1
    `,[R],[]),w=await q(a,`
      SELECT DISTINCT c.id, c.nom
      FROM affectations a
      JOIN classes c ON c.id = a.classe_id
      JOIN creneaux cr ON cr.id = a.creneau_id
      WHERE cr.jour = $1
      ${r?"":"AND a.prof_id = $2"}
      ORDER BY c.nom
    `,r?[R]:[R,i.id],[]),y={jour:R,creneau_en_cours:null,classes_en_cours:[],classes_du_jour:w.rows};if(T.rows.length>0){let v=T.rows[0],L=await q(a,`
        SELECT DISTINCT c.id, c.nom
        FROM affectations a
        JOIN classes c ON c.id = a.classe_id
        WHERE a.creneau_id = $1
        ${r?"":"AND a.prof_id = $2"}
        ORDER BY c.nom
      `,r?[v.id]:[v.id,i.id],[]),I=[];for(let M of L.rows){let F=(await q(a,`
          SELECT
            e.id,
            u.nom, u.prenom,
            pv.p1, pv.p2, pv.p3, pv.p4, pv.p5, pv.p6, pv.p7, pv.p8
          FROM eleves e
          LEFT JOIN utilisateurs u ON u.id = e.utilisateur_id
          LEFT JOIN presences_v2 pv ON pv.eleve_id = e.id AND pv.date = CURRENT_DATE
          WHERE e.classe_id = $1 AND LOWER(COALESCE(e.statut, 'actif')) = 'actif'
          ORDER BY u.nom, u.prenom
        `,[M.id],[])).rows.map(P=>{let U=P.p1||P.p2||P.p3||P.p4||P.p5||P.p6||P.p7||P.p8||"";return{id:P.id,nom:P.nom,prenom:P.prenom,statut:U}});I.push({id:M.id,nom:M.nom,eleves:F})}y={jour:R,creneau_en_cours:v,classes_en_cours:I,classes_du_jour:w.rows}}let N=[];if(r||l.length>0){let v=[],L="";r||(v.push(l),L=" AND ev.classe_id = ANY($1::int[])"),N=(await q(a,`
        SELECT
          n.created_at,
          n.valeur,
          n.absent,
          n.dispense,
          ev.nom as evaluation_nom,
          m.nom as matiere,
          c.nom as classe,
          ue.nom as eleve_nom,
          ue.prenom as eleve_prenom
        FROM notes n
        JOIN evaluations ev ON ev.id = n.evaluation_id
        LEFT JOIN matieres m ON m.id = ev.matiere_id
        LEFT JOIN classes c ON c.id = ev.classe_id
        JOIN eleves e ON e.id = n.eleve_id
        LEFT JOIN utilisateurs ue ON ue.id = e.utilisateur_id
        WHERE 1=1 ${L}
        ORDER BY n.created_at DESC
        LIMIT 3
      `,v)).rows}let S=[];if(r||l.length>0){let v=[],L="";r||(v.push(l),L=" AND e.classe_id = ANY($1::int[])"),S=(await q(a,`
        SELECT
          o.created_at,
          o.titre,
          o.contenu,
          c.nom as classe,
          ue.nom as eleve_nom,
          ue.prenom as eleve_prenom
        FROM observations o
        JOIN eleves e ON e.id = o.eleve_id
        LEFT JOIN utilisateurs ue ON ue.id = e.utilisateur_id
        LEFT JOIN classes c ON c.id = e.classe_id
        WHERE 1=1 ${L}
        ORDER BY o.created_at DESC
        LIMIT 3
      `,v)).rows}return s(e,{nb_eleves:parseInt(String(m.rows[0].count)),nb_profs:parseInt(String(p.rows[0].count)),nb_classes:parseInt(String(u.rows[0].count)),nb_branches:parseInt(String(f.rows[0].count)),presences_aujourd:c.rows[0],paiements:g.rows[0],moyennes_par_classe:o.rows,absences_par_classe:_.rows,eleves_par_classe:E.rows,prochains_evenements:h.rows,prochain_evenement:h.rows[0]||null,dernieres_notes:N,dernieres_observations:S,controle_presence_aujourdhui:y})}catch(r){console.error("statistiques-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:l},500)}finally{await a.end()}}var $s=new Set(["pool","affectation","resultats"]);function Ss(t){return String(t||"").trim().toLowerCase()}async function ln(t,n,e){let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{let r=n.match(/^\/tcf-state\/([^/]+)$/);if(r){let l=Ss(r[1]);if(!$s.has(l))return s(e,{message:"Cle TCF invalide"},400);if(t.method==="GET"){let m=await a.query("SELECT donnees, updated_at FROM tcf_state WHERE cle = $1 LIMIT 1",[l]);return m.rows.length?s(e,{donnees:m.rows[0].donnees||{},updated_at:m.rows[0].updated_at||null}):s(e,{donnees:{},updated_at:null})}if(t.method==="PUT"){let p=(await $(t)).donnees;if(p==null||typeof p!="object"||Array.isArray(p))return s(e,{message:'Le payload "donnees" doit etre un objet JSON'},400);let u=await a.query(`INSERT INTO tcf_state (cle, donnees, updated_by, updated_at)
           VALUES ($1, $2::jsonb, $3, NOW())
           ON CONFLICT (cle)
           DO UPDATE SET donnees = EXCLUDED.donnees, updated_by = EXCLUDED.updated_by, updated_at = NOW()
           RETURNING updated_at`,[l,JSON.stringify(p),i.id]);return s(e,{message:"Etat TCF enregistre",updated_at:u.rows[0]?.updated_at||null})}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("tcf-state-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:l},500)}finally{await a.end()}}async function cn(t,n,e){let i=await A(t),d=C(i,e,n);if(d)return d;let a=b();try{if(n==="/visites-classes"&&t.method==="GET"){let l=await a.query(`
        SELECT v.*,
          uf.nom AS formateur_nom, uf.prenom AS formateur_prenom,
          c.nom AS classe_nom, c.niveau AS classe_niveau,
          m.nom AS branche_nom
        FROM visites_classes v
        LEFT JOIN utilisateurs uf ON uf.id = v.formateur_id
        LEFT JOIN classes c ON c.id = v.classe_id
        LEFT JOIN matieres m ON m.id = v.branche_id
        ORDER BY v.date_visite DESC, v.created_at DESC
      `);return s(e,l.rows)}if(n==="/visites-classes"&&t.method==="POST"){let l=await $(t),{formateur_id:m,classe_id:p,branche_id:u,date_visite:f,duree:c,scores:g,organisation:o,observation:_,feedback:E,valide:h}=l,R=await a.query(`INSERT INTO visites_classes
          (formateur_id, classe_id, branche_id, date_visite, duree, scores, organisation, observation, feedback, valide, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[m||null,p||null,u||null,f||null,c||1,JSON.stringify(g||{}),JSON.stringify(o||{}),_||null,E||null,h||!1,i.id]);return s(e,R.rows[0])}let r=n.match(/^\/visites-classes\/(\d+)$/);if(r){let l=r[1];if(t.method==="PUT"){let m=await $(t),{formateur_id:p,classe_id:u,branche_id:f,date_visite:c,duree:g,scores:o,organisation:_,observation:E,feedback:h,valide:R}=m,T=await a.query(`UPDATE visites_classes SET
            formateur_id=$1, classe_id=$2, branche_id=$3, date_visite=$4, duree=$5,
            scores=$6, organisation=$7, observation=$8, feedback=$9, valide=$10,
            updated_at=NOW()
           WHERE id=$11 RETURNING *`,[p||null,u||null,f||null,c||null,g||1,JSON.stringify(o||{}),JSON.stringify(_||{}),E||null,h||null,R||!1,l]);return s(e,T.rows[0])}if(t.method==="DELETE")return await a.query("DELETE FROM visites_classes WHERE id=$1",[l]),s(e,{message:"Supprim\xE9"})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("visites-classes-fast error:",r);let l=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:l},500)}finally{await a.end()}}globalThis.Buffer=vs;function Ns(t){let n=["/functions/v1/api-proxy","/api-proxy"];for(let e of n){let i=t.indexOf(e);if(i>=0)return t.slice(i+e.length)||"/"}return t}function Os(t){let n=t.headers.get("Origin");return{"Access-Control-Allow-Origin":n||"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, PUT, PATCH, DELETE, OPTIONS",...n?{Vary:"Origin"}:{}}}Deno.serve(async t=>{let n=Os(t);if(t.method==="OPTIONS")return new Response("ok",{headers:n});try{let e=new URL(t.url),i=Ns(e.pathname);if(i==="/healthz")return new Response(JSON.stringify({ok:!0,service:"ecole-manager-api-proxy"}),{status:200,headers:{...n,"Content-Type":"application/json"}});if(i==="/auth/login"&&t.method==="POST")return await Je(t,n);if(i==="/auth/login/mfa"&&t.method==="POST")return await Ge(t,n);if(i==="/auth/register"&&t.method==="POST")return await Ze(t,n);if(i==="/auth/logout"&&t.method==="POST")return await ut(t,n);if(i==="/auth/changer-mdp"&&t.method==="POST")return await lt(t,n);if(i==="/auth/moi"&&t.method==="GET")return await ot(t,n);if(i==="/auth/mfa/status"&&t.method==="GET")return await Ye(t,n);if(i==="/auth/mfa/setup"&&t.method==="POST")return await Ve(t,n);if(i==="/auth/mfa/enable"&&t.method==="POST")return await Ke(t,n);if(i==="/auth/mfa/backup/regenerate"&&t.method==="POST")return await ze(t,n);if(i==="/auth/mfa/disable"&&t.method==="POST")return await Xe(t,n);if(i==="/auth/login/passkey/options"&&t.method==="POST")return await tt(t,n);if(i==="/auth/login/passkey/verify"&&t.method==="POST")return await nt(t,n);if(i==="/auth/passkeys"&&t.method==="GET")return await st(t,n);if(i==="/auth/passkeys/register/options"&&t.method==="POST")return await rt(t,n);if(i==="/auth/passkeys/register/verify"&&t.method==="POST")return await it(t,n);let d=i.match(/^\/auth\/passkeys\/(\d+)$/);return d&&t.method==="DELETE"?await at(t,n,d[1]):i.startsWith("/classes")?await bt(t,i,n):i.startsWith("/branches")?await vt(t,i,n):i.startsWith("/profs")?await sn(t,i,n):i.startsWith("/eleves")?await It(t,i,n,e):i.startsWith("/employes-administratifs")?await Ht(t,i,n):i.startsWith("/emploi-du-temps")?await Mt(t,i,n,e):i.startsWith("/presences")?await en(t,i,n,e):i.startsWith("/notes-personnelles")?await Gt(t,i,n):i.startsWith("/notes")?await kt(t,i,n,e):i.startsWith("/calendrier")?await Nt(t,i,n):i.startsWith("/archives")?await St(t,i,n,e):i.startsWith("/parametres")?await Kt(t,i,n):i.startsWith("/comptabilite")?await Lt(t,i,n,e):i.startsWith("/statistiques")?await un(t,i,n):i.startsWith("/import")?await qt(t,i,n):i.startsWith("/plan-classe")?await zt(t,i,n):i.startsWith("/observations")?await jt(t,i,n):i.startsWith("/planning")?await Qt(t,i,n,e):i.startsWith("/documents-administratifs")?await Dt(t,i,n):i.startsWith("/inventaire-branches")?await Bt(t,i,n):i.startsWith("/tcf-state")?await ln(t,i,n):i==="/chatbot"&&t.method==="POST"?await Ot(t,i,n):i.startsWith("/donnees")?await Ct(t,i,n):i.startsWith("/enclassements")?await Wt(t,i,n):i.startsWith("/devoirs")?await At(t,i,n,e):i.startsWith("/sorties")?await on(t,i,n,e):i.startsWith("/visites-classes")?await cn(t,i,n):i.startsWith("/sondages")?await an(t,i,n):s(n,{message:"Route non trouv\xE9e"},404)}catch(e){return console.error("api-proxy error:",e),s(n,{message:"Erreur serveur"},500)}});
