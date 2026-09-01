// Bundled by scripts/bundle-api-proxy.mjs
try {
  var p = globalThis.process;
  if (p && !p.binding) {
    p.binding = function (n) {
      return n === "tty_wrap" ? { guessHandleType: function () { return "PIPE"; } } : {};
    };
  }
} catch (e) {}
var M=(t,n,e)=>()=>{if(e)throw e[0];try{return t&&(n=t(t=0)),n}catch(i){throw e=[i],i}};var Mn=(t,n)=>()=>{try{return n||t((n={exports:{}}).exports,n),n.exports}catch(e){throw n=0,e}};var Me=M(()=>{});import{Pool as Un}from"npm:pg@8";import He from"npm:jsonwebtoken@9";import{createCipheriv as Pn,createDecipheriv as Hn,createHash as Wn,createHmac as Fn,randomBytes as We,randomInt as xn}from"node:crypto";function s(t,n,e=200){return new Response(JSON.stringify(n),{status:e,headers:{...t,"Content-Type":"application/json"}})}function b(){return new Un({connectionString:Deno.env.get("DATABASE_URL")||Deno.env.get("SUPABASE_DB_URL"),ssl:{rejectUnauthorized:!1}})}function qe(){let t=String(Deno.env.get("DATA_ENCRYPTION_KEY")||"").trim();if(!t)return null;try{if(/^[a-fA-F0-9]{64}$/.test(t))return Uint8Array.from(Buffer.from(t,"hex"));let n=Buffer.from(t,"base64");if(n.length===32)return Uint8Array.from(n)}catch{}return null}function Z(t){let n=String(t||"");if(!n.startsWith(`${Fe}:`))return n;let e=qe();if(!e)return"";try{let i=n.split(":"),f=i[2],o=i[3],r=i[4],m=Buffer.from(f,"base64"),E=Buffer.from(o,"base64"),p=Buffer.from(r,"base64"),u=Hn("aes-256-gcm",e,m);return u.setAuthTag(E),Buffer.concat([u.update(p),u.final()]).toString("utf8")}catch{return""}}function qn(t){let n=String(t||"").toUpperCase().replace(/[^A-Z2-7]/g,""),e=0,i=0,f=[];for(let o of n){let r=xe.indexOf(o);r<0||(i=i<<5|r,e+=5,e>=8&&(f.push(i>>>e-8&255),e-=8))}return Buffer.from(f)}function Bn(t,n){let e=qn(t),i=Buffer.alloc(8);i.writeUInt32BE(Math.floor(n/4294967296),0),i.writeUInt32BE(n>>>0,4);let f=Fn("sha1",e).update(i).digest(),o=f[f.length-1]&15,r=((f[o]&127)<<24|(f[o+1]&255)<<16|(f[o+2]&255)<<8|f[o+3]&255)%1e6;return String(r).padStart(6,"0")}function kn(t,n=Date.now(),e=30){let i=Math.floor(n/1e3/e);return Bn(t,i)}function de(t,n,e=1){let i=String(n||"").replace(/\s+/g,"");if(!/^\d{6}$/.test(i))return!1;let f=Date.now();for(let o=-e;o<=e;o++)if(kn(t,f+o*3e4)===i)return!0;return!1}function ve(t){let n=String(Deno.env.get("MFA_BACKUP_PEPPER")||Deno.env.get("JWT_SECRET")||"");return Wn("sha256").update(String(t||"").toUpperCase()+"::"+n).digest("hex")}function ge(t){return Array.isArray(t)?t.map(n=>String(n||"")).filter(Boolean):[]}function ne(t,n="8h"){let e=Deno.env.get("JWT_SECRET");if(!e)throw new Error("JWT_SECRET manquant");return He.sign(t,e,{expiresIn:n})}function j(t){let n=t.headers.get("authorization")||"",e=n.startsWith("Bearer ")?n.slice(7).trim():"";if(!e||e==="null"||e==="undefined")return null;try{let i=Deno.env.get("JWT_SECRET");if(!i)return null;let f=He.verify(e,i);return f?.id?{id:Number(f.id)}:null}catch{return null}}function Re(t){let n=qe();if(!n)return String(t||"");let e=We(12),i=Pn("aes-256-gcm",n,e),f=Buffer.concat([i.update(String(t||""),"utf8"),i.final()]),o=i.getAuthTag();return`${Fe}:${e.toString("base64")}:${o.toString("base64")}:${f.toString("base64")}`}function Jn(t){let n=0,e=0,i="";for(let f of t)for(e=e<<8|f,n+=8;n>=5;)i+=Ue[e>>>n-5&31],n-=5;return n>0&&(i+=Ue[e<<5-n&31]),i}function Be(t=20){return Jn(We(t)).replace(/=+$/g,"")}function ke({secret:t,accountName:n,issuer:e}){let i=String(e||"Oasis").trim()||"Oasis",f=String(n||"user").trim()||"user",o=String(t||"").toUpperCase().replace(/[^A-Z2-7]/g,""),r=p=>encodeURIComponent(p).replace(/%40/g,"@"),m=`${r(i)}:${r(f)}`,E=[`secret=${o}`,`issuer=${encodeURIComponent(i)}`,"algorithm=SHA1","digits=6","period=30"].join("&");return`otpauth://totp/${m}?${E}`}function Le(t=10){let n=[];for(let i=0;i<t;i++){let f="";for(let o=0;o<8;o++)f+=Pe[xn(0,Pe.length)];n.push(f)}let e=n.map(i=>ve(i));return{plain:n,hashes:e}}function oe(t){return{id:t.id,nom:t.nom,prenom:t.prenom,email:t.email,role:t.role,doit_changer_mdp:t.doit_changer_mdp||!1,mfa_enabled:t.mfa_enabled===!0,mfa_exempt:t.mfa_exempt===!0}}var Fe,xe,Ue,Pe,U=M(()=>{Fe="enc:v1",xe="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";Ue=xe;Pe="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"});import Gn from"npm:bcryptjs@2";async function Je(t,n){let{email:e,mot_de_passe:i}=await t.json(),f=String(e||"").trim().toLowerCase();if(!f||!i)return s(n,{message:"Email ou mot de passe incorrect"},401);let o=b();try{let r=await o.query("SELECT id, nom, prenom, email, role, mot_de_passe, mfa_enabled, mfa_exempt, mfa_secret, doit_changer_mdp FROM utilisateurs WHERE (LOWER(email) = $1 OR LOWER(identifiant) = $1) AND actif = true",[f]);if(!r.rows.length)return s(n,{message:"Email ou mot de passe incorrect"},401);let m=r.rows[0];if(!await Gn.compare(i,m.mot_de_passe||""))return s(n,{message:"Email ou mot de passe incorrect"},401);let p=Z(m.mfa_secret||"");if(m.mfa_exempt!==!0&&m.mfa_enabled===!0&&p){let d=ne({purpose:"mfa-login",id:m.id},"5m");return s(n,{message:"Code MFA requis",mfa_required:!0,mfa_token:d})}let u=ne({id:m.id,email:m.email,role:m.role,nom:m.nom,prenom:m.prenom});return s(n,{message:"Connexion reussie",token:u,utilisateur:oe(m)})}finally{await o.end()}}var Ge=M(()=>{U()});import jn from"npm:jsonwebtoken@9";function Yn(t){if(String(t).startsWith("legacy:")){let i=parseInt(String(t).slice(7),10);return Number.isFinite(i)?i:null}let n=Deno.env.get("JWT_SECRET");if(!n)return null;let e=jn.verify(t,n);return e?.purpose!=="mfa-login"||!e?.id?null:e.id}async function je(t,n){let e=await t.json(),i=e?.mfa_token,f=e?.code;if(!i||!f)return s(n,{message:"Token MFA ou code manquant"},400);let o;try{o=Yn(String(i))}catch{return s(n,{message:"Token MFA invalide ou expire"},401)}if(!o)return s(n,{message:"Token MFA invalide ou expire"},401);let r=b();try{let E=(await r.query("SELECT id, nom, prenom, email, role, mfa_enabled, mfa_exempt, mfa_secret, mfa_backup_codes, doit_changer_mdp FROM utilisateurs WHERE id=$1 AND actif = true",[o])).rows[0];if(!E)return s(n,{message:"Utilisateur introuvable"},401);let p=Z(E.mfa_secret||"");if(E.mfa_enabled!==!0||!p)return s(n,{message:"MFA non active pour cet utilisateur"},400);if(!de(p,String(f),1)){let l=ge(E.mfa_backup_codes),g=ve(String(f)),a=l.indexOf(g);if(a===-1)return s(n,{message:"Code MFA invalide"},401);l.splice(a,1),await r.query("UPDATE utilisateurs SET mfa_backup_codes = $1::jsonb WHERE id = $2",[JSON.stringify(l),E.id])}let d=ne({id:E.id,email:E.email,role:E.role,nom:E.nom,prenom:E.prenom});return s(n,{message:"Connexion reussie",token:d,utilisateur:oe({...E,mfa_enabled:!0})})}catch(m){return console.error("auth-fast-mfa error:",m),s(n,{message:"Token MFA invalide ou expire"},401)}finally{await r.end()}}var Ye=M(()=>{U()});import Ve from"npm:jsonwebtoken@9";async function Ke(t,n){let e=j(t);if(!e)return s(n,{message:"Token manquant"},401);let i=b();try{let o=(await i.query("SELECT mfa_enabled, mfa_exempt, mfa_backup_codes FROM utilisateurs WHERE id = $1",[e.id])).rows[0]||{};return s(n,{mfa_enabled:o.mfa_enabled===!0,mfa_exempt:o.mfa_exempt===!0,backup_codes_remaining:ge(o.mfa_backup_codes).length})}finally{await i.end()}}async function Xe(t,n){let e=j(t);if(!e)return s(n,{message:"Token manquant"},401);let i=b();try{let o=(await i.query("SELECT email, identifiant, mfa_exempt FROM utilisateurs WHERE id = $1",[e.id])).rows[0];if(!o)return s(n,{message:"Utilisateur non trouve"},401);if(o.mfa_exempt===!0)return s(n,{message:"La 2FA est desactivee pour ce compte."},403);let r=String(o.identifiant||"").trim()||String(o.email||"").trim()||`user-${e.id}`,m=Be(),E=Deno.env.get("MFA_ISSUER")||"Oasis",p=ke({secret:m,accountName:r,issuer:E}),u=Ve.sign({purpose:"mfa-setup",id:e.id,secret:m},Deno.env.get("JWT_SECRET"),{expiresIn:"30m"});return s(n,{secret:m,otpauth_url:p,setup_token:u,issuer:E,account:r})}finally{await i.end()}}async function ze(t,n){let e=j(t);if(!e)return s(n,{message:"Token manquant"},401);let i=await t.json(),f=i?.setup_token,o=i?.code;if(!f||!o)return s(n,{message:"Token setup ou code manquant"},400);let r=b();try{if((await r.query("SELECT mfa_exempt FROM utilisateurs WHERE id = $1",[e.id])).rows[0]?.mfa_exempt===!0)return s(n,{message:"La 2FA est desactivee pour ce compte."},403);let E=Deno.env.get("JWT_SECRET");if(!E)return s(n,{message:"Configuration de securite manquante"},500);let p;try{p=Ve.verify(String(f),E)}catch{return s(n,{message:"Token setup invalide ou expire"},401)}if(p?.purpose!=="mfa-setup"||Number(p?.id)!==Number(e.id)||!p?.secret)return s(n,{message:"Token setup invalide"},401);if(!de(p.secret,String(o),2))return s(n,{message:"Code MFA invalide"},401);let u=Le();return await r.query("UPDATE utilisateurs SET mfa_enabled = true, mfa_secret = $1, mfa_enabled_at = NOW(), mfa_backup_codes = $2::jsonb WHERE id = $3",[Re(p.secret),JSON.stringify(u.hashes),e.id]),s(n,{message:"Double authentification activee",backup_codes:u.plain,backup_codes_remaining:u.plain.length})}finally{await r.end()}}async function Qe(t,n){let e=j(t);if(!e)return s(n,{message:"Token manquant"},401);let f=(await t.json().catch(()=>({})))?.code;if(!f)return s(n,{message:"Code MFA manquant"},400);let o=b();try{let m=(await o.query("SELECT mfa_enabled, mfa_secret FROM utilisateurs WHERE id = $1",[e.id])).rows[0];if(!m||m.mfa_enabled!==!0)return s(n,{message:"MFA non activee"},400);let E=Z(m.mfa_secret||"");if(!E||!de(E,String(f),2))return s(n,{message:"Code MFA invalide"},401);let p=Le();return await o.query("UPDATE utilisateurs SET mfa_backup_codes = $1::jsonb WHERE id = $2",[JSON.stringify(p.hashes),e.id]),s(n,{message:"Nouveaux codes de secours generes",backup_codes:p.plain,backup_codes_remaining:p.plain.length})}catch(r){return console.error("auth-fast-mfa-backup error:",r),s(n,{message:"Erreur serveur"},500)}finally{await o.end()}}async function Ze(t,n){return s(n,{message:"La double authentification est obligatoire. Elle ne peut pas \xEAtre d\xE9sactiv\xE9e pour le moment."},403)}var et=M(()=>{U()});import Vn from"npm:bcryptjs@2";function Xn(t){return String(t||"").trim().toLowerCase()}function zn(t){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)}async function tt(t,n){let e=await t.json().catch(()=>({})),{nom:i,prenom:f,email:o,mot_de_passe:r,role:m}=e,E=Xn(o);if(!i||!f||!E||!r||!m)return s(n,{message:"Champs requis manquants"},400);if(!zn(E))return s(n,{message:"Email invalide"},400);if(String(r).length<8)return s(n,{message:"Le mot de passe doit contenir au moins 8 caracteres"},400);if(!Kn.has(String(m)))return s(n,{message:"Role invalide"},400);let p=b();try{if((await p.query("SELECT id FROM utilisateurs WHERE email = $1",[E])).rows.length>0)return s(n,{message:"Email deja utilise"},400);let d=await Vn.hash(String(r),10),l=await p.query("INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, nom, prenom, email, role",[String(i).trim(),String(f).trim(),E,d,m]);return s(n,{message:"Compte cree",utilisateur:l.rows[0]},201)}catch(u){return console.error("auth-fast-register error:",u),s(n,{message:"Erreur serveur"},500)}finally{await p.end()}}var Kn,nt=M(()=>{U();Kn=new Set(["admin","prof","responsable","employe_admin"])});import{isoBase64URL as Te}from"npm:@simplewebauthn/server@13/helpers";function ue(t){if(Array.isArray(t))return t.map(String).filter(Boolean);if(typeof t=="string")try{let n=JSON.parse(t);return Array.isArray(n)?n.map(String).filter(Boolean):[]}catch{return[]}return[]}function me(t){let n=String(t.headers.get("origin")||"").trim(),e=String(Deno.env.get("WEBAUTHN_ORIGIN")||n||Deno.env.get("FRONTEND_URL")||"http://localhost:3000").trim().replace(/\/$/,""),i=String(Deno.env.get("WEBAUTHN_RP_ID")||"").trim();if(!i)try{i=new URL(e).hostname}catch{i="localhost"}let f=String(Deno.env.get("WEBAUTHN_RP_NAME")||"Oasis").trim()||"Oasis",o=String(Deno.env.get("WEBAUTHN_ORIGINS")||"").split(",").map(m=>m.trim().replace(/\/$/,"")).filter(Boolean),r=Array.from(new Set([e,...o].filter(Boolean)));return{rpID:i,rpName:f,origin:e,expectedOrigins:r}}function we(t){return t==null?"":typeof t=="string"?/^[A-Za-z0-9_-]+$/.test(t)?t:Te.fromBuffer(Buffer.from(t,"base64")):t instanceof Uint8Array||Buffer.isBuffer(t)?Te.fromBuffer(t):Te.fromBuffer(Buffer.from(t))}function st(t){return Te.toBuffer(String(t||""))}var rt=M(()=>{});import{generateAuthenticationOptions as Qn,generateRegistrationOptions as Zn,verifyAuthenticationResponse as es,verifyRegistrationResponse as ts}from"npm:@simplewebauthn/server@13";import{isoUint8Array as ns}from"npm:@simplewebauthn/server@13/helpers";import it from"npm:jsonwebtoken@9";async function at(t,n){let e=await t.json().catch(()=>({})),i=String(e?.email||"").trim().toLowerCase();if(!Deno.env.get("JWT_SECRET"))return s(n,{message:"Configuration de securite manquante"},500);let f=b();try{let{rpID:o}=me(t),r,m=null;if(i&&(m=(await f.query(`SELECT u.id FROM utilisateurs u
         WHERE (LOWER(u.email) = $1 OR LOWER(u.identifiant) = $1) AND u.actif = true`,[i])).rows[0]?.id??null,m&&(r=((await f.query("SELECT credential_id, transports FROM webauthn_credentials WHERE user_id=$1",[m])).rows||[]).map(l=>({id:l.credential_id,transports:ue(l.transports)})),!r.length)))return s(n,{message:"Aucune passkey enregistr\xE9e pour ce compte"},404);let E=await Qn({rpID:o,userVerification:"preferred",allowCredentials:r}),p=ne({purpose:"webauthn-login",challenge:E.challenge,id:m??null},"5m");return s(n,{options:E,challenge_token:p})}catch(o){return console.error("passkey login options:",o),s(n,{message:"Erreur serveur"},500)}finally{await f.end()}}async function ot(t,n){let e=await t.json().catch(()=>({})),i=e?.challenge_token,f=e?.credential;if(!i||!f)return s(n,{message:"R\xE9ponse passkey incomplete"},400);let o=Deno.env.get("JWT_SECRET");if(!o)return s(n,{message:"Configuration de securite manquante"},500);let r;try{r=it.verify(String(i),o)}catch{return s(n,{message:"Challenge passkey invalide ou expir\xE9"},401)}if(r?.purpose!=="webauthn-login"||!r?.challenge)return s(n,{message:"Challenge passkey invalide"},401);let m=we(f?.id||f?.rawId);if(!m)return s(n,{message:"Identifiant passkey manquant"},400);let E=b();try{let u=(await E.query(`SELECT c.*, u.id AS uid, u.nom, u.prenom, u.email, u.role, u.doit_changer_mdp, u.mfa_enabled, u.mfa_exempt, u.actif
       FROM webauthn_credentials c
       JOIN utilisateurs u ON u.id = c.user_id
       WHERE c.credential_id = $1`,[m])).rows[0];if(!u||u.actif===!1)return s(n,{message:"Passkey inconnue ou compte inactif"},401);if(r.id!=null&&Number(r.id)!==Number(u.user_id))return s(n,{message:"Passkey ne correspond pas au compte"},401);let{rpID:d,expectedOrigins:l}=me(t),g=await es({response:f,expectedChallenge:r.challenge,expectedOrigin:l,expectedRPID:d,requireUserVerification:!1,credential:{id:u.credential_id,publicKey:st(u.public_key),counter:Number(u.counter||0),transports:ue(u.transports)}});if(!g.verified)return s(n,{message:"Authentification passkey refus\xE9e"},401);let a=Number(g.authenticationInfo?.newCounter??u.counter??0);await E.query("UPDATE webauthn_credentials SET counter=$1 WHERE id=$2",[a,u.id]);let _={id:u.uid,nom:u.nom,prenom:u.prenom,email:u.email,role:u.role,doit_changer_mdp:u.doit_changer_mdp||!1,mfa_enabled:u.mfa_enabled===!0,mfa_exempt:u.mfa_exempt===!0},c=ne({id:_.id,email:_.email,role:_.role,nom:_.nom,prenom:_.prenom});return s(n,{message:"Connexion reussie",token:c,utilisateur:oe(_)})}catch(p){return console.error("passkey login verify:",p),s(n,{message:"\xC9chec de connexion passkey"},401)}finally{await E.end()}}async function ut(t,n){let e=j(t);if(!e)return s(n,{message:"Token manquant"},401);let i=b();try{let f=await i.query(`SELECT id, friendly_name, device_type, backed_up, transports, created_at
       FROM webauthn_credentials WHERE user_id = $1 ORDER BY created_at DESC`,[e.id]);return s(n,{passkeys:(f.rows||[]).map(o=>({id:o.id,friendly_name:o.friendly_name||"Passkey",device_type:o.device_type||null,backed_up:o.backed_up===!0,transports:ue(o.transports),created_at:o.created_at}))})}finally{await i.end()}}async function lt(t,n){let e=j(t);if(!e)return s(n,{message:"Token manquant"},401);if(!Deno.env.get("JWT_SECRET"))return s(n,{message:"Configuration de securite manquante"},500);let i=b();try{let{rpID:f,rpName:o}=me(t),m=(await i.query("SELECT id, email, nom, prenom FROM utilisateurs WHERE id=$1 AND actif=true",[e.id])).rows[0];if(!m)return s(n,{message:"Utilisateur introuvable"},401);let p=((await i.query("SELECT credential_id, transports FROM webauthn_credentials WHERE user_id=$1",[m.id])).rows||[]).map(l=>({id:l.credential_id,transports:ue(l.transports)})),u=await Zn({rpName:o,rpID:f,userID:ns.fromUTF8String(String(m.id)),userName:String(m.email||`user-${m.id}`),userDisplayName:`${m.prenom||""} ${m.nom||""}`.trim()||String(m.email||m.id),attestationType:"none",excludeCredentials:p,authenticatorSelection:{residentKey:"preferred",userVerification:"preferred"}}),d=ne({purpose:"webauthn-register",id:m.id,challenge:u.challenge},"5m");return s(n,{options:u,challenge_token:d})}catch(f){return console.error("passkey register options:",f),s(n,{message:"Erreur serveur"},500)}finally{await i.end()}}async function ct(t,n){let e=j(t);if(!e)return s(n,{message:"Token manquant"},401);let i=await t.json().catch(()=>({})),f=i?.challenge_token,o=i?.credential,r=i?.friendly_name;if(!f||!o)return s(n,{message:"R\xE9ponse passkey incomplete"},400);let m=Deno.env.get("JWT_SECRET");if(!m)return s(n,{message:"Configuration de securite manquante"},500);let E;try{E=it.verify(String(f),m)}catch{return s(n,{message:"Challenge passkey invalide ou expir\xE9"},401)}if(E?.purpose!=="webauthn-register"||Number(E?.id)!==Number(e.id)||!E?.challenge)return s(n,{message:"Challenge passkey invalide"},401);let p=b();try{let{rpID:u,expectedOrigins:d}=me(t),l=await ts({response:o,expectedChallenge:E.challenge,expectedOrigin:d,expectedRPID:u,requireUserVerification:!1});if(!l.verified||!l.registrationInfo)return s(n,{message:"Enregistrement passkey refus\xE9"},401);let g=l.registrationInfo,a=g.credential||{},_=we(a.id||g.credentialID),c=we(a.publicKey||g.credentialPublicKey);if(!_||!c)return s(n,{message:"Identifiant passkey invalide"},400);if((await p.query("SELECT id FROM webauthn_credentials WHERE credential_id=$1",[_])).rows.length)return s(n,{message:"Cette passkey est d\xE9j\xE0 enregistr\xE9e"},409);let R=ue(o?.response?.transports),w=g.credentialDeviceType||g.credential?.deviceType||null,$=g.credentialBackedUp===!0||g.credential?.backedUp===!0,h=String(r||"").trim()||"Passkey";return await p.query(`INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, device_type, backed_up, transports, friendly_name)
       VALUES ($1, $2, $3, 0, $4, $5, $6::jsonb, $7)`,[e.id,_,c,w,$,JSON.stringify(R),h]),s(n,{message:"Passkey enregistr\xE9e",friendly_name:h})}catch(u){return console.error("passkey register verify:",u),s(n,{message:"\xC9chec de v\xE9rification passkey"},401)}finally{await p.end()}}async function dt(t,n,e){let i=j(t);if(!i)return s(n,{message:"Token manquant"},401);let f=Number(e);if(!Number.isFinite(f))return s(n,{message:"Identifiant invalide"},400);let o=b();try{return(await o.query("DELETE FROM webauthn_credentials WHERE id=$1 AND user_id=$2 RETURNING id",[f,i.id])).rows[0]?s(n,{message:"Passkey supprim\xE9e"}):s(n,{message:"Passkey introuvable"},404)}finally{await o.end()}}var mt=M(()=>{U();rt()});import ss from"npm:bcryptjs@2";function rs(t){let n=String(t||"");return n.length<12?"Le mot de passe doit contenir au moins 12 caract\xE8res":/[A-Z]/.test(n)?/[a-z]/.test(n)?/[0-9]/.test(n)?/[^A-Za-z0-9]/.test(n)?null:"Au moins un caract\xE8re sp\xE9cial requis":"Au moins un chiffre requis":"Au moins une lettre minuscule requise":"Au moins une lettre majuscule requise"}async function pt(t,n){let e=j(t);if(!e)return s(n,{message:"Token manquant"},401);let i=b();try{let o=(await i.query(`SELECT id, nom, prenom, email, role, created_at, mfa_enabled, mfa_exempt, doit_changer_mdp,
              permissions, role_acces
       FROM utilisateurs WHERE id = $1`,[e.id])).rows[0];return o?s(n,{...o,permissions:o.permissions||{},mfa_enabled:o.mfa_enabled===!0,mfa_exempt:o.mfa_exempt===!0,doit_changer_mdp:o.doit_changer_mdp||!1}):s(n,{message:"Utilisateur non trouve"},404)}catch(f){return console.error("auth moi:",f),s(n,{message:"Erreur serveur"},500)}finally{await i.end()}}async function Et(t,n){return s(n,{message:"Deconnexion reussie"})}async function ft(t,n){let e=j(t);if(!e)return s(n,{message:"Token manquant"},401);let i=await t.json().catch(()=>({})),f=rs(i?.nouveau_mdp);if(f)return s(n,{message:f},400);let o=b();try{let r=await ss.hash(String(i.nouveau_mdp),10);return await o.query("UPDATE utilisateurs SET mot_de_passe=$1, doit_changer_mdp=false WHERE id=$2",[r,e.id]),s(n,{message:"Mot de passe chang\xE9 avec succ\xE8s"})}catch(r){return console.error("auth changer-mdp:",r),s(n,{message:"Erreur serveur"},500)}finally{await o.end()}}var _t=M(()=>{U()});async function y(t){try{return await t.json()}catch{return{}}}async function A(t){let n=j(t);if(!n)return null;let e=b();try{let f=(await e.query(`SELECT id, nom, prenom, email, role, permissions, mfa_enabled, mfa_exempt
       FROM utilisateurs WHERE id = $1`,[n.id])).rows[0];return f?{id:f.id,nom:f.nom,prenom:f.prenom,email:f.email,role:f.role,permissions:f.permissions||{},mfa_enabled:f.mfa_enabled===!0,mfa_exempt:f.mfa_exempt===!0}:null}finally{await e.end()}}function C(t,n,e){return t?e&&t.mfa_exempt!==!0&&t.mfa_enabled!==!0&&!is.has(e)?s(n,{message:"Double authentification obligatoire. Activez-la pour continuer.",mfa_required:!0},403):null:s(n,{message:"Token manquant"},401)}function L(t,n){return t.role!=="admin"?s(n,{message:"Acces refuse"},403):null}function pe(t,n,...e){return e.includes(t.role)?null:s(n,{message:"Acces refuse"},403)}var is,F=M(()=>{U();is=new Set(["/auth/moi","/auth/changer-mdp","/auth/logout","/auth/mfa/status","/auth/mfa/setup","/auth/mfa/enable","/auth/mfa/backup/regenerate","/auth/mfa/disable","/auth/passkeys","/auth/passkeys/register/options","/auth/passkeys/register/verify"])});async function gt(t,n,e){let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{if(n==="/branches"&&t.method==="GET"){let m=await o.query("SELECT * FROM matieres ORDER BY niveau, nom");return s(e,m.rows)}if(n==="/branches"&&t.method==="POST"){let m=L(i,e);if(m)return m;let E=await y(t),{nom:p,niveau:u,periodes_semaine:d,coefficient:l,type_branche:g,designation_courte:a,suivi_notes:_}=E;if(!p)return s(e,{message:"Le nom est requis"},400);if(!d)return s(e,{message:"Les p\xE9riodes/semaine sont requises"},400);if(!u)return s(e,{message:"Le niveau est requis"},400);if(!a||!String(a).trim())return s(e,{message:"La d\xE9signation courte est requise"},400);let c=await o.query("INSERT INTO matieres (nom, niveau, periodes_semaine, coefficient, type_branche, designation_courte, suivi_notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",[p,u,parseInt(String(d)),parseFloat(String(l))||1,g||"principale",String(a).trim(),_!==!1]);return s(e,c.rows[0],201)}let r=n.match(/^\/branches\/(\d+)$/);if(r){let m=r[1];if(t.method==="PUT"){let E=L(i,e);if(E)return E;let p=await y(t),{nom:u,niveau:d,periodes_semaine:l,coefficient:g,type_branche:a,designation_courte:_,suivi_notes:c}=p;if(!_||!String(_).trim())return s(e,{message:"La d\xE9signation courte est requise"},400);let T=await o.query("UPDATE matieres SET nom=$1, niveau=$2, periodes_semaine=$3, coefficient=$4, type_branche=$5, designation_courte=$6, suivi_notes=$7 WHERE id=$8 RETURNING *",[u,d,parseInt(String(l)),parseFloat(String(g))||1,a||"principale",String(_).trim(),c!==!1,m]);return T.rows.length?s(e,T.rows[0]):s(e,{message:"Branche non trouv\xE9e"},404)}if(t.method==="DELETE"){let E=L(i,e);return E||(await o.query("DELETE FROM matieres WHERE id=$1",[m]),s(e,{message:"Branche supprim\xE9e"}))}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("branches-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await o.end()}}var Rt=M(()=>{U();F()});async function Tt(t,n,e){let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{if(n==="/calendrier"&&t.method==="GET"){let E=await o.query("SELECT * FROM calendrier ORDER BY date_debut");return s(e,E.rows)}if(n==="/calendrier"&&t.method==="POST"){let E=await y(t),{titre:p,description:u,date_debut:d,date_fin:l,type:g,couleur:a,categorie:_,nom_vacance:c,heure_debut:T,heure_fin:R}=E,w=await o.query("INSERT INTO calendrier (titre, description, date_debut, date_fin, type, couleur, categorie, nom_vacance, heure_debut, heure_fin) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",[p,u||null,d,l||d,g||"Evenement",a||"#1a73e8",_||"evenement",c||null,T||null,R||null]);return s(e,{message:"Evenement cree",evenement:w.rows[0]},201)}if(n==="/calendrier/prof"&&t.method==="GET"){await o.query("CREATE TABLE IF NOT EXISTS calendrier_prof (id SERIAL PRIMARY KEY, prof_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE, date DATE NOT NULL, titre VARCHAR(200) NOT NULL, type VARCHAR(50) DEFAULT 'Autre', description TEXT DEFAULT '', created_at TIMESTAMP DEFAULT NOW())");let E=await o.query("SELECT * FROM calendrier_prof WHERE prof_id=$1 ORDER BY date DESC",[i.id]);return s(e,E.rows)}if(n==="/calendrier/prof"&&t.method==="POST"){let E=await y(t),{date:p,titre:u,type:d,description:l}=E,g=await o.query("INSERT INTO calendrier_prof (prof_id,date,titre,type,description) VALUES($1,$2,$3,$4,$5) RETURNING *",[i.id,p,u,d||"Autre",l||""]);return s(e,g.rows[0])}let r=n.match(/^\/calendrier\/prof\/(\d+)$/);if(r){let E=r[1];if(t.method==="PUT"){let p=await y(t),{date:u,titre:d,type:l,description:g}=p,a=await o.query("UPDATE calendrier_prof SET date=$1, titre=$2, type=$3, description=$4 WHERE id=$5 AND prof_id=$6 RETURNING *",[u,d,l||"Autre",g||"",E,i.id]);return a.rows.length===0?s(e,{message:"\xC9l\xE9ment non trouv\xE9"},404):s(e,a.rows[0])}if(t.method==="DELETE")return await o.query("DELETE FROM calendrier_prof WHERE id=$1 AND prof_id=$2",[E,i.id]),s(e,{ok:!0})}let m=n.match(/^\/calendrier\/(\d+)$/);if(m){let E=m[1];if(t.method==="PUT"){let p=await y(t),{titre:u,description:d,date_debut:l,date_fin:g,type:a,couleur:_,categorie:c,nom_vacance:T,heure_debut:R,heure_fin:w}=p;return(await o.query("UPDATE calendrier SET titre=$1, description=$2, date_debut=$3, date_fin=$4, type=$5, couleur=$6, categorie=$7, nom_vacance=$8, heure_debut=$9, heure_fin=$10 WHERE id=$11 RETURNING *",[u,d||null,l,g||l,a||"Evenement",_||"#1a73e8",c||"evenement",T||null,R||null,w||null,E])).rows.length===0?s(e,{message:"Evenement non trouve"},404):s(e,{message:"Evenement modifie"})}if(t.method==="DELETE")return await o.query("DELETE FROM calendrier WHERE id=$1",[E]),s(e,{message:"Evenement supprime"})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("calendrier-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await o.end()}}var wt=M(()=>{U();F()});async function as(t,n){let e=Deno.env.get("GEMINI_API_KEY");if(!e)throw new Error("GEMINI_API_KEY non configur\xE9e");let i=new AbortController,f=setTimeout(()=>i.abort(),3e4);try{let o=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${e}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system_instruction:{parts:[{text:t}]},contents:[{role:"user",parts:[{text:n}]}],generationConfig:{temperature:.2,maxOutputTokens:512}}),signal:i.signal});if(!o.ok){let r=await o.text();throw new Error(`Gemini HTTP ${o.status}: ${r}`)}return await o.json()}finally{clearTimeout(f)}}async function $t(t,n,e){if(n!=="/chatbot"||t.method!=="POST")return s(e,{message:"Route non trouv\xE9e"},404);let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{let r=await y(t),{message:m}=r;if(!m||!String(m).trim())return s(e,{message:"Message vide"},400);let E=i.role==="admin",p=i.id,u="",d=await o.query(`
      SELECT u.nom, u.prenom,
        e.date_naissance, c.nom as classe, COALESCE(e.statut,'actif') as statut
      FROM eleves e
      LEFT JOIN utilisateurs u ON u.id = e.utilisateur_id
      LEFT JOIN classes c ON c.id = e.classe_id
      ORDER BY c.nom, u.nom, u.prenom
      LIMIT 200
    `);if(d.rows.length>0){u+=`
## \xC9l\xE8ves:
`;for(let N of d.rows){let S=N.date_naissance?new Date(N.date_naissance).toLocaleDateString("fr-CH"):"inconnue";u+=`- ${N.prenom} ${N.nom} | Classe: ${N.classe||"aucune"} | N\xE9(e): ${S} | Statut: ${N.statut}
`}}let l=new Date().toISOString().split("T")[0],g=await o.query(`
      SELECT u.nom, u.prenom,
        c.nom as classe, pv.p1, pv.p2, pv.p3, pv.p4
      FROM presences_v2 pv
      JOIN eleves e ON e.id = pv.eleve_id
      LEFT JOIN utilisateurs u ON u.id = e.utilisateur_id
      LEFT JOIN classes c ON c.id = e.classe_id
      WHERE pv.date = $1
      LIMIT 200
    `,[l]);if(g.rows.length>0){u+=`
## Pr\xE9sences aujourd'hui (${l}):
`;for(let N of g.rows){let S=N.p1||N.p2||N.p3||N.p4||"pr\xE9sent";u+=`- ${N.prenom} ${N.nom} (${N.classe||"?"}): ${S}
`}}let a=await o.query("SELECT nom, niveau FROM classes ORDER BY nom LIMIT 50");if(a.rows.length>0){u+=`
## Classes:
`;for(let N of a.rows)u+=`- ${N.nom} (${N.niveau||""})
`}if(E){let N=await o.query("SELECT nom, prenom, email, telephone FROM utilisateurs WHERE role='prof' ORDER BY nom LIMIT 50");if(N.rows.length>0){u+=`
## Professeurs:
`;for(let S of N.rows)u+=`- ${S.prenom} ${S.nom} | ${S.email||""} | ${S.telephone||""}
`}}let _=await o.query(`
      SELECT COALESCE(el.nom, u.nom) as eleve_nom, COALESCE(el.prenom, u.prenom) as eleve_prenom,
        m.nom as matiere, c.nom as classe, n.valeur, n.absent, n.dispense, ev.nom as eval_nom
      FROM notes n
      JOIN evaluations ev ON ev.id = n.evaluation_id
      JOIN eleves el ON el.id = n.eleve_id
      LEFT JOIN utilisateurs u ON u.id = el.utilisateur_id
      LEFT JOIN classes c ON c.id = el.classe_id
      LEFT JOIN matieres m ON m.id = ev.matiere_id
      ${E?"":"WHERE ev.prof_id = $1"}
      ORDER BY n.created_at DESC LIMIT 300
    `,E?[]:[p]);if(_.rows.length>0){u+=`
## Notes r\xE9centes:
`;for(let N of _.rows){let S=N.absent?"ABS":N.dispense?"DISP":N.valeur!=null?N.valeur:"\u2014";u+=`- ${N.eleve_prenom} ${N.eleve_nom} (${N.classe||"?"}) | ${N.matiere||"?"} | ${N.eval_nom}: ${S}
`}}let c=await o.query("SELECT titre, date_debut, type FROM calendrier WHERE date_debut >= CURRENT_DATE ORDER BY date_debut LIMIT 20");if(c.rows.length>0){u+=`
## Prochains \xE9v\xE9nements:
`;for(let N of c.rows)u+=`- ${new Date(N.date_debut).toLocaleDateString("fr-CH")} | ${N.titre} (${N.type||""})
`}let T=new Date().toLocaleDateString("fr-CH",{weekday:"long",year:"numeric",month:"long",day:"numeric"}),R=`Tu es un assistant pour une \xE9cole de formation pour migrants en Suisse (Le Botza, V\xE9troz). Tu r\xE9ponds en fran\xE7ais, de fa\xE7on concise et pr\xE9cise. Tu as acc\xE8s aux donn\xE9es de l'\xE9cole ci-dessous. L'utilisateur est un ${E?"administrateur":"professeur"}.

Date d'aujourd'hui: ${T}

DONN\xC9ES DE L'\xC9COLE:
${u}

R\xE9ponds uniquement \xE0 partir de ces donn\xE9es. Si l'information n'est pas disponible, dis-le clairement.`,w=await as(R,String(m)),$=w.error;if($)throw new Error($.message||"Gemini error");let O=w.candidates?.[0]?.content?.parts?.[0]?.text||"D\xE9sol\xE9, je n'ai pas pu g\xE9n\xE9rer une r\xE9ponse.";return s(e,{answer:O})}catch(r){console.error("chatbot-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur chatbot: "+m},500)}finally{await o.end()}}var ht=M(()=>{U();F()});import{createClient as os}from"npm:@supabase/supabase-js@2";import{Buffer as be}from"node:buffer";function $e(){let t=Deno.env.get("SUPABASE_URL"),n=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");return!t||!n?null:os(t,n,{auth:{persistSession:!1,autoRefreshToken:!1}})}function z(){return!!(Deno.env.get("SUPABASE_URL")&&Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))}function us(t){let n=t.match(/^data:([^;]+);base64,(.+)$/s);if(!n)throw new Error("Le fichier doit \xEAtre un data URL base64");let e=n[1].trim(),i=be.from(n[2],"base64");if(!i.length)throw new Error("Fichier vide");return{mime:e,buffer:i}}function ls(t,n="application/octet-stream"){return`data:${n};base64,${be.from(t).toString("base64")}`}function se(t){return String(t||"fichier").replace(/[^\w.\-() ]+/g,"_").slice(0,120)}async function cs(t,n,e=3600){let i=$e();if(!i)return null;let{data:f,error:o}=await i.storage.from(t).createSignedUrl(n,e);return o?null:f?.signedUrl||null}async function ee(t,n,e){let i=$e();if(!i)throw new Error("Supabase Storage non configur\xE9");let{mime:f,buffer:o}=us(e),{error:r}=await i.storage.from(t).upload(n,o,{contentType:f,upsert:!0});if(r)throw new Error(r.message)}async function ds(t,n){let e=$e();if(!e)throw new Error("Supabase Storage non configur\xE9");let{data:i,error:f}=await e.storage.from(t).download(n);if(f)throw new Error(f.message);let o=be.from(await i.arrayBuffer());return ls(o,i.type||"application/octet-stream")}async function ie(t,n){return t.storage_path&&z()?ds(n,t.storage_path):t.contenu||null}async function X(t,n){if(!n)return;let e=$e();if(!e)return;let{error:i}=await e.storage.from(t).remove([n]);i&&console.warn("Storage remove",n,i.message)}async function he(t){return!t.length||!z()?t:Promise.all(t.map(async n=>{if(!n.photo_storage_path)return n;let e=await cs(x.elevesPhotos,n.photo_storage_path,3600);return{...n,photo:e||n.photo||null}}))}var x,le=M(()=>{x={elevesPhotos:"eleves-photos",documentsEleves:"documents-eleves",documentsProfs:"documents-profs",documentsAdmin:"documents-admin"}});async function yt(t,n,e){let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{if(n==="/classes"&&t.method==="GET"){let E=await o.query(`
        SELECT c.*, u.nom as prof_nom, u.prenom as prof_prenom, u.sexe as prof_sexe,
          COUNT(DISTINCT e.id) as nb_eleves
        FROM classes c
        LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
        LEFT JOIN eleves e ON e.classe_id=c.id
        GROUP BY c.id, u.nom, u.prenom, u.sexe
        ORDER BY c.nom
      `);return s(e,E.rows)}if(n==="/classes"&&t.method==="POST"){let E=L(i,e);if(E)return E;let p=await y(t),{nom:u,niveau:d,annee_scolaire:l,prof_principal_id:g}=p;if(!u)return s(e,{message:"Le nom est requis"},400);if(!d)return s(e,{message:"Le niveau est requis"},400);if((await o.query(`SELECT id FROM classes
         WHERE LOWER(TRIM(nom)) = LOWER(TRIM($1))
           AND UPPER(TRIM(COALESCE(niveau, ''))) = UPPER(TRIM($2))
         LIMIT 1`,[u,d])).rows.length)return s(e,{message:"Une classe avec le m\xEAme nom et le m\xEAme niveau existe d\xE9j\xE0"},409);let _=await o.query("INSERT INTO classes (nom, niveau, annee_scolaire, prof_principal_id) VALUES ($1,$2,$3,$4) RETURNING *",[u,d||null,l,g||null]);return s(e,_.rows[0],201)}let r=n.match(/^\/classes\/(\d+)\/eleves$/);if(r&&t.method==="GET"){let E=r[1],p=await o.query(`
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
      `,[E]);return s(e,await he(p.rows))}let m=n.match(/^\/classes\/(\d+)$/);if(m){let E=m[1];if(t.method==="GET"){let p=await o.query(`
          SELECT c.*, u.nom as prof_nom, u.prenom as prof_prenom, u.sexe as prof_sexe
          FROM classes c LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
          WHERE c.id=$1
        `,[E]);return p.rows.length?s(e,p.rows[0]):s(e,{message:"Classe non trouv\xE9e"},404)}if(t.method==="PUT"){let p=L(i,e);if(p)return p;let u=await y(t),{nom:d,niveau:l,annee_scolaire:g,prof_principal_id:a,actif:_}=u,T=(await o.query("SELECT nom FROM classes WHERE id=$1",[E])).rows[0]?.nom||"",R=await o.query("UPDATE classes SET nom=$1, niveau=$2, annee_scolaire=$3, prof_principal_id=$4, actif=$5 WHERE id=$6 RETURNING *",[d,l||null,g,a||null,_!==void 0?_:!0,E]);if(!R.rows.length)return s(e,{message:"Classe non trouv\xE9e"},404);if(T&&d&&T!==d){let w=String(T).replace(/\s+/g,""),$=String(d).replace(/\s+/g,"");w&&$&&w!==$&&await o.query("UPDATE eleves SET oasi_prog_nom = REPLACE(oasi_prog_nom, $1, $2) WHERE classe_id=$3 AND oasi_prog_nom LIKE $4",[w,$,E,"%"+w+"%"])}return s(e,R.rows[0])}if(t.method==="DELETE"){let p=L(i,e);return p||(await o.query("DELETE FROM classes WHERE id=$1",[E]),s(e,{message:"Classe supprim\xE9e"}))}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("classes-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await o.end()}}var Nt=M(()=>{U();le();F()});async function St(t,n,e,i){let f=await A(t),o=C(f,e,n);if(o)return o;let r=b();try{if(n==="/comptabilite/statistiques"&&t.method==="GET"){let d=await r.query("SELECT COALESCE(SUM(montant),0) as total FROM paiements WHERE statut='paye'"),l=await r.query("SELECT COALESCE(SUM(montant),0) as total, COUNT(*) as nb FROM paiements WHERE statut='en_attente'"),g=await r.query("SELECT COALESCE(SUM(montant),0) as total, COUNT(*) as nb FROM paiements WHERE statut='en_retard'"),a=await r.query("SELECT type, COALESCE(SUM(montant),0) as total, COUNT(*) as nb FROM paiements WHERE statut='paye' GROUP BY type ORDER BY total DESC");return s(e,{total_encaisse:d.rows[0].total,en_attente:l.rows[0],en_retard:g.rows[0],par_type:a.rows})}if(n==="/comptabilite/factures/reference"&&t.method==="GET"){let d=i.searchParams.get("eleve_id"),l=i.searchParams.get("annee_scolaire");if(!d||!l)return s(e,{reference:null});try{let g=await r.query("SELECT reference FROM factures_references WHERE eleve_id=$1 AND annee_scolaire=$2",[d,l]);return s(e,{reference:g.rows[0]?.reference||null})}catch{return s(e,{reference:null})}}if(n==="/comptabilite/factures/reference"&&t.method==="POST"){let d=L(f,e);if(d)return d;let l=await y(t),{eleve_id:g,annee_scolaire:a,reference:_}=l;if(!g||!a||!_)return s(e,{message:"eleve_id, annee_scolaire et reference sont requis"},400);let c=await r.query("SELECT reference FROM factures_references WHERE eleve_id=$1 AND annee_scolaire=$2",[g,a]);if(c.rows.length>0)return s(e,{reference:c.rows[0].reference});let T=await r.query("INSERT INTO factures_references (eleve_id, annee_scolaire, reference) VALUES ($1,$2,$3) RETURNING reference",[g,a,_]);return s(e,{reference:T.rows[0].reference})}if(n==="/comptabilite/factures/validation"&&t.method==="GET"){let d=i.searchParams.get("eleve_ids"),l=i.searchParams.get("annee_scolaire");if(!d||!l)return s(e,[]);let g=d.split(",").map(Number).filter(Boolean);if(g.length===0)return s(e,[]);let a=g.map((c,T)=>`$${T+2}`).join(","),_=await r.query(`SELECT eleve_id, valide FROM factures_validations WHERE annee_scolaire=$1 AND eleve_id IN (${a})`,[l,...g]);return s(e,_.rows)}if(n==="/comptabilite/factures/validation"&&t.method==="POST"){let d=L(f,e);if(d)return d;let l=await y(t),{eleve_id:g,annee_scolaire:a,valide:_}=l;return!g||!a?s(e,{message:"Param\xE8tres manquants"},400):(await r.query(`INSERT INTO factures_validations (eleve_id, annee_scolaire, valide, valide_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (eleve_id, annee_scolaire) DO UPDATE SET valide=$3, valide_at=$4`,[g,a,_,_?new Date:null]),s(e,{valide:_}))}if(n==="/comptabilite/materiels"&&t.method==="GET"){let d=i.searchParams.get("section"),l=[],g="SELECT * FROM materiels";d&&(l.push(d),g+=" WHERE section=$1"),g+=" ORDER BY nom";let a=await r.query(g,l);return s(e,a.rows)}if(n==="/comptabilite/materiels"&&t.method==="POST"){let d=L(f,e);if(d)return d;let l=await y(t),{nom:g,section:a,prix:_,ref:c,fournisseur:T,rabais:R,remarques:w,icone:$}=l,h=await r.query(`INSERT INTO materiels (nom, section, prix, ref, fournisseur, rabais, remarques, icone)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[g,a||"scolaire",_||0,c||null,T||null,R||0,w||null,$||null]);return s(e,{message:"Materiel cree",materiel:h.rows[0]},201)}let m=n.match(/^\/comptabilite\/materiels\/(\d+)$/);if(m){let d=m[1];if(t.method==="PUT"){let l=L(f,e);if(l)return l;let g=await y(t),{nom:a,section:_,prix:c,ref:T,fournisseur:R,rabais:w,remarques:$,icone:h}=g,O=await r.query(`UPDATE materiels
           SET nom=$1, section=$2, prix=$3, ref=$4, fournisseur=$5, rabais=$6, remarques=$7, icone=$8
           WHERE id=$9 RETURNING *`,[a,_||"scolaire",c||0,T||null,R||null,w||0,$||null,h||null,d]);return O.rows.length===0?s(e,{message:"Materiel non trouve"},404):s(e,{message:"Materiel modifie",materiel:O.rows[0]})}if(t.method==="DELETE"){let l=L(f,e);return l||(await r.query("DELETE FROM materiels WHERE id=$1",[d]),s(e,{message:"Materiel supprime"}))}}let E=n.match(/^\/comptabilite\/commandes\/(\d+)\/lignes(?:\/(\d+))?$/);if(E){let d=E[1],l=E[2];if(!l&&t.method==="GET"){let g=await r.query("SELECT * FROM commandes_lignes WHERE commande_id=$1 ORDER BY created_at ASC",[d]);return s(e,g.rows)}if(!l&&t.method==="POST"){let g=L(f,e);if(g)return g;let a=await y(t),{article:_,quantite:c,ref:T,prix_unitaire:R,remarques:w,statut:$}=a;if(!_)return s(e,{message:"article est requis"},400);let h=await r.query("INSERT INTO commandes_lignes (commande_id, article, quantite, ref, prix_unitaire, remarques, statut) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",[d,_,c||1,T||null,R||null,w||null,$||"en_attente"]);return s(e,h.rows[0],201)}if(l&&t.method==="PUT"){let g=L(f,e);if(g)return g;let a=await y(t),{article:_,quantite:c,ref:T,prix_unitaire:R,remarques:w,statut:$}=a,h=await r.query("UPDATE commandes_lignes SET article=$1, quantite=$2, ref=$3, prix_unitaire=$4, remarques=$5, statut=$6 WHERE id=$7 AND commande_id=$8 RETURNING *",[_,c||1,T||null,R||null,w||null,$||"en_attente",l,d]);return h.rows.length===0?s(e,{message:"Ligne non trouv\xE9e"},404):s(e,h.rows[0])}if(l&&t.method==="DELETE"){let g=L(f,e);return g||(await r.query("DELETE FROM commandes_lignes WHERE id=$1 AND commande_id=$2",[l,d]),s(e,{message:"Ligne supprim\xE9e"}))}}let p=n.match(/^\/comptabilite\/commandes(?:\/(\d+))?$/);if(p){let d=p[1];if(!d&&t.method==="GET"){let l=await r.query(`
          SELECT c.*, COALESCE(SUM(cl.prix_unitaire * cl.quantite), 0) AS montant_total
          FROM commandes c
          LEFT JOIN commandes_lignes cl ON cl.commande_id = c.id
          GROUP BY c.id
          ORDER BY c.created_at DESC
        `);return s(e,l.rows)}if(!d&&t.method==="POST"){let l=L(f,e);if(l)return l;let g=await y(t),{article:a,quantite:_,fournisseur:c,prix_unitaire:T,statut:R,remarques:w,date_commande:$}=g,h=new Date,O=h.getMonth()>=7?h.getFullYear():h.getFullYear()-1,N=`${String(O).slice(-2)}-${String(O+1).slice(-2)}`,S=await r.query("SELECT COUNT(*) FROM commandes WHERE numero_commande LIKE $1",[N+"%"]),v=parseInt(String(S.rows[0].count))+1,I=`${N}_${String(v).padStart(4,"0")}`,P=await r.query("INSERT INTO commandes (article, quantite, fournisseur, prix_unitaire, statut, remarques, numero_commande, date_commande) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",[a||null,_||1,c||null,T||null,R||"en_attente",w||null,I,$||null]);return s(e,P.rows[0],201)}if(d&&t.method==="PUT"){let l=L(f,e);if(l)return l;let g=await y(t),{article:a,quantite:_,fournisseur:c,prix_unitaire:T,statut:R,remarques:w,valide:$}=g,h=await r.query("UPDATE commandes SET article=$1, quantite=$2, fournisseur=$3, prix_unitaire=$4, statut=$5, remarques=$6, valide=$7 WHERE id=$8 RETURNING *",[a,_||1,c||null,T||null,R||"en_attente",w||null,$||!1,d]);return h.rows.length===0?s(e,{message:"Commande non trouv\xE9e"},404):s(e,h.rows[0])}if(d&&t.method==="DELETE"){let l=L(f,e);return l||(await r.query("DELETE FROM commandes WHERE id=$1",[d]),s(e,{message:"Commande supprim\xE9e"}))}}if(n==="/comptabilite"&&t.method==="GET"){await r.query(`
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
      `);let d=i.searchParams.get("statut"),l=i.searchParams.get("classe_id"),g=`
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
      `,a=[];d&&(g+=` AND p.statut = $${a.length+1}`,a.push(d)),l&&(g+=` AND e.classe_id = $${a.length+1}`,a.push(l)),g+=" ORDER BY p.created_at DESC";let _=await r.query(g,a);return s(e,_.rows)}if(n==="/comptabilite"&&t.method==="POST"){let d=L(f,e);if(d)return d;let l=await y(t),{eleve_id:g,montant:a,type:_,statut:c,date_paiement:T,commentaire:R,reference:w}=l,$=await r.query("INSERT INTO paiements (eleve_id, montant, type, statut, date_paiement, commentaire, reference) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",[g,a,_,c||"en_attente",T||null,R||null,w||null]);return s(e,{message:"Paiement cree",paiement:$.rows[0]},201)}let u=n.match(/^\/comptabilite\/(\d+)$/);if(u){let d=u[1];if(t.method==="PUT"){let l=L(f,e);if(l)return l;let g=await y(t),{montant:a,type:_,statut:c,date_paiement:T,commentaire:R,reference:w,valide:$}=g;return(await r.query("UPDATE paiements SET montant=$1, type=$2, statut=$3, date_paiement=$4, commentaire=$5, reference=$6, valide=$7 WHERE id=$8 RETURNING *",[a,_,c,T||null,R||null,w||null,$||!1,d])).rows.length===0?s(e,{message:"Paiement non trouve"},404):s(e,{message:"Paiement modifie"})}if(t.method==="DELETE"){let l=L(f,e);return l||(await r.query("DELETE FROM paiements WHERE id=$1",[d]),s(e,{message:"Paiement supprime"}))}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(m){console.error("comptabilite-fast error:",m);let E=m instanceof Error?m.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:E},500)}finally{await r.end()}}var Ot=M(()=>{U();F()});async function vt(t,n,e,i){let f=await A(t),o=C(f,e,n);if(o)return o;let r=b();try{if(n==="/devoirs"&&t.method==="GET"){let p=i.searchParams.get("classe_id");if(!p)return s(e,{message:"classe_id requis"},400);let u=await r.query("SELECT * FROM devoirs WHERE classe_id=$1 ORDER BY date_remise DESC, created_at DESC",[p]);return s(e,u.rows)}if(n==="/devoirs"&&t.method==="POST"){let p=await y(t),{classe_id:u,titre:d,matiere:l,date_devoir:g,date_remise:a}=p;if(!u||!d)return s(e,{message:"classe_id et titre requis"},400);let _=await r.query("INSERT INTO devoirs (classe_id, titre, matiere, date_devoir, date_remise) VALUES ($1,$2,$3,$4,$5) RETURNING *",[u,d,l||null,g||null,a||null]);return s(e,_.rows[0],201)}let m=n.match(/^\/devoirs\/(\d+)\/suivi(?:\/(\d+))?$/);if(m){let p=m[1],u=m[2];if(!u&&t.method==="GET"){let d=await r.query(`SELECT sd.eleve_id, sd.statut, sd.commentaire,
                  COALESCE(u.nom, e.nom) as nom, COALESCE(u.prenom, e.prenom) as prenom
           FROM suivi_devoirs sd
           JOIN eleves e ON sd.eleve_id = e.id
           LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
           WHERE sd.devoir_id=$1
           ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)`,[p]);return s(e,d.rows)}if(u&&t.method==="PUT"){let d=await y(t),{statut:l,commentaire:g}=d;return["rendu","non_rendu","partiel","excuse"].includes(l)?(await r.query(`INSERT INTO suivi_devoirs (devoir_id, eleve_id, statut, commentaire, updated_at)
           VALUES ($1,$2,$3,$4,NOW())
           ON CONFLICT (devoir_id, eleve_id) DO UPDATE SET statut=$3, commentaire=$4, updated_at=NOW()`,[p,u,l,g||null]),s(e,{message:"Statut mis \xE0 jour"})):s(e,{message:"Statut invalide"},400)}}let E=n.match(/^\/devoirs\/(\d+)$/);return E&&t.method==="DELETE"?(await r.query("DELETE FROM devoirs WHERE id=$1",[E[1]]),s(e,{message:"Devoir supprim\xE9"})):s(e,{message:"Route non trouv\xE9e"},404)}catch(m){console.error("devoirs-fast error:",m);let E=m instanceof Error?m.message:"Erreur serveur";return s(e,{message:E},500)}finally{await r.end()}}var Lt=M(()=>{U();F()});async function bt(t,n,e){let i=b();try{if(n==="/donnees/niveaux"&&t.method==="GET"){let m=await i.query("SELECT * FROM niveaux ORDER BY ordre, nom");return s(e,m.rows)}if(n==="/donnees/niveaux"&&t.method==="POST"){let m=await A(t),E=C(m,e,n);if(E)return E;let p=await y(t),{nom:u,ordre:d=0,periodes_normales:l=20,periodes_soutien:g=0}=p,a=Math.max(0,parseInt(String(l),10)||0),_=Math.max(0,parseInt(String(g),10)||0),c=await i.query("INSERT INTO niveaux (nom, ordre, periodes_normales, periodes_soutien) VALUES ($1,$2,$3,$4) RETURNING *",[u,d,a,_]);return s(e,c.rows[0])}let f=n.match(/^\/donnees\/niveaux\/(\d+)$/);if(f){let m=f[1],E=await A(t),p=C(E,e,n);if(p)return p;if(t.method==="PUT"){let u=await y(t),{nom:d,ordre:l,periodes_normales:g,periodes_soutien:a}=u,_=g==null||g===""?null:Math.max(0,parseInt(String(g),10)||0),c=a==null||a===""?null:Math.max(0,parseInt(String(a),10)||0),T=await i.query(`UPDATE niveaux SET
             nom=$1,
             ordre=$2,
             periodes_normales=COALESCE($3, periodes_normales),
             periodes_soutien=COALESCE($4, periodes_soutien)
           WHERE id=$5 RETURNING *`,[d,l,_,c,m]);return s(e,T.rows[0])}if(t.method==="DELETE")return await i.query("DELETE FROM niveaux WHERE id=$1",[m]),s(e,{ok:!0})}if(n==="/donnees/lieux-travail"&&t.method==="GET"){let m=await i.query("SELECT * FROM lieux_travail ORDER BY COALESCE(ordre, 0), nom");return s(e,m.rows)}if(n==="/donnees/lieux-travail"&&t.method==="POST"){let m=await A(t),E=C(m,e,n);if(E)return E;let p=await y(t),{nom:u,ordre:d=0}=p,l=await i.query("INSERT INTO lieux_travail (nom, ordre) VALUES ($1,$2) RETURNING *",[u,d]);return s(e,l.rows[0])}let o=n.match(/^\/donnees\/lieux-travail\/(\d+)$/);if(o){let m=o[1],E=await A(t),p=C(E,e,n);if(p)return p;if(t.method==="PUT"){let u=await y(t),{nom:d,ordre:l}=u,g=await i.query("UPDATE lieux_travail SET nom=$1, ordre=$2 WHERE id=$3 RETURNING *",[d,l??0,m]);return s(e,g.rows[0])}if(t.method==="DELETE")return await i.query("DELETE FROM lieux_travail WHERE id=$1",[m]),s(e,{ok:!0})}if(n==="/donnees/salles"&&t.method==="GET"){let m=await i.query(`
        SELECT s.*, l.nom AS lieu_nom
        FROM salles s
        LEFT JOIN lieux_travail l ON l.id = s.lieu_travail_id
        ORDER BY l.nom, s.nom
      `);return s(e,m.rows)}if(n==="/donnees/salles"&&t.method==="POST"){let m=await A(t),E=C(m,e,n);if(E)return E;let p=await y(t),{nom:u,lieu_travail_id:d}=p,l=await i.query("INSERT INTO salles (nom, lieu_travail_id) VALUES ($1,$2) RETURNING *",[u,d]);return s(e,l.rows[0])}let r=n.match(/^\/donnees\/salles\/(\d+)$/);if(r){let m=r[1],E=await A(t),p=C(E,e,n);if(p)return p;if(t.method==="PUT"){let u=await y(t),{nom:d,lieu_travail_id:l}=u,g=await i.query("UPDATE salles SET nom=$1, lieu_travail_id=$2 WHERE id=$3 RETURNING *",[d,l,m]);return s(e,g.rows[0])}if(t.method==="DELETE")return await i.query("DELETE FROM salles WHERE id=$1",[m]),s(e,{ok:!0})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(f){console.error("donnees-fast error:",f);let o=f instanceof Error?f.message:"Erreur serveur";return s(e,{message:o},500)}finally{await i.end()}}var At=M(()=>{U();F()});async function Ct(t,n,e){let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{if(n==="/documents-administratifs"&&t.method==="GET"){let E=await o.query(`
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
      `);return s(e,E.rows)}if(n==="/documents-administratifs"&&t.method==="POST"){let E=L(i,e);if(E)return E;let p=await y(t),{designation:u,nom_fichier:d,contenu:l,taille:g,categorie:a,sous_categorie:_}=p;if(!u||!d||!l)return s(e,{message:"Champs requis manquants"},400);if(z()){let R=(await o.query(`INSERT INTO documents_administratifs (designation, nom_fichier, contenu, taille, auteur_id, categorie, sous_categorie, storage_path)
           VALUES ($1,$2,NULL,$3,$4,$5,$6,NULL)
           RETURNING id, designation, nom_fichier, taille, created_at, auteur_id, categorie, sous_categorie`,[u,d,g||null,i.id,a||"Administratifs",_||null])).rows[0],w=`admin/${R.id}_${se(d)}`;try{await ee(x.documentsAdmin,w,String(l)),await o.query("UPDATE documents_administratifs SET storage_path=$1 WHERE id=$2",[w,R.id])}catch($){throw await o.query("DELETE FROM documents_administratifs WHERE id=$1",[R.id]),$}return s(e,R,201)}let c=await o.query(`INSERT INTO documents_administratifs (designation, nom_fichier, contenu, taille, auteur_id, categorie, sous_categorie)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, designation, nom_fichier, taille, created_at, auteur_id, categorie, sous_categorie`,[u,d,l,g||null,i.id,a||"Administratifs",_||null]);return s(e,c.rows[0],201)}let r=n.match(/^\/documents-administratifs\/(\d+)\/telecharger$/);if(r&&t.method==="GET"){let E=r[1],p=await o.query("SELECT nom_fichier, contenu, storage_path FROM documents_administratifs WHERE id=$1",[E]);if(p.rows.length===0)return s(e,{message:"Document introuvable"},404);let u=p.rows[0],d=await ie(u,x.documentsAdmin);return d?s(e,{nom_fichier:u.nom_fichier,contenu:d}):s(e,{message:"Fichier introuvable"},404)}let m=n.match(/^\/documents-administratifs\/(\d+)$/);if(m){let E=m[1];if(t.method==="PUT"){let p=L(i,e);if(p)return p;let u=await y(t),{designation:d,nom_fichier:l,contenu:g,taille:a,categorie:_,sous_categorie:c}=u;if(!d)return s(e,{message:"La d\xE9signation est requise"},400);let T=await o.query("SELECT id, nom_fichier, contenu, taille, categorie, sous_categorie, storage_path FROM documents_administratifs WHERE id=$1",[E]);if(T.rows.length===0)return s(e,{message:"Document introuvable"},404);let R=T.rows[0],w=R.storage_path,$=R.contenu;if(g&&z()){let O=`admin/${R.id}_${se(l||R.nom_fichier)}`;await ee(x.documentsAdmin,O,String(g)),R.storage_path&&R.storage_path!==O&&await X(x.documentsAdmin,R.storage_path),w=O,$=null}else g&&($=String(g),w=null);let h=await o.query(`UPDATE documents_administratifs
           SET designation=$1, nom_fichier=$2, contenu=$3, taille=$4, categorie=$5, sous_categorie=$6, storage_path=$7
           WHERE id=$8
           RETURNING id, designation, nom_fichier, taille, created_at, auteur_id, categorie, sous_categorie`,[d,l||R.nom_fichier,$,typeof a=="number"?a:R.taille,_||R.categorie||"Administratifs",c!==void 0?c:R.sous_categorie,w,E]);return s(e,h.rows[0])}if(t.method==="DELETE"){let p=L(i,e);if(p)return p;let u=await o.query("SELECT id, storage_path FROM documents_administratifs WHERE id=$1",[E]);return u.rows.length===0?s(e,{message:"Document introuvable"},404):(await X(x.documentsAdmin,u.rows[0].storage_path),await o.query("DELETE FROM documents_administratifs WHERE id=$1",[E]),s(e,{message:"Document supprim\xE9"}))}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("documents-administratifs-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await o.end()}}var Dt=M(()=>{U();le();F()});import ms from"npm:bcryptjs@2";function re(t,n,e){return Object.prototype.hasOwnProperty.call(t,n)?t[n]:e}function G(t,n,e){let i=re(t,n,e[n]);return i===""||i===void 0?null:String(i)}function ae(t,n,e){if(!Object.prototype.hasOwnProperty.call(t,n))return e[n];let i=t[n];if(i===""||i===null||i===void 0)return null;let f=parseInt(String(i),10);return Number.isFinite(f)?f:null}async function ps(t,n){let e=await t.connect();try{await e.query("BEGIN");let i=await e.query("SELECT utilisateur_id, photo_storage_path FROM eleves WHERE id=$1",[n]);if(i.rows.length===0)return await e.query("ROLLBACK"),!1;let f=i.rows[0].utilisateur_id,o=i.rows[0].photo_storage_path,r=await e.query("SELECT storage_path FROM documents_eleves WHERE eleve_id=$1 AND storage_path IS NOT NULL",[n]);await e.query("UPDATE eleves SET photo=null, photo_storage_path=null WHERE id=$1",[n]),await e.query("DELETE FROM presences WHERE eleve_id=$1",[n]),await e.query("DELETE FROM notes WHERE eleve_id=$1",[n]),await e.query("DELETE FROM paiements WHERE eleve_id=$1",[n]),await e.query("DELETE FROM observations WHERE eleve_id=$1",[n]),await e.query("DELETE FROM absences WHERE eleve_id=$1",[n]),await e.query("DELETE FROM sanctions_eleves WHERE eleve_id=$1",[n]),await e.query("DELETE FROM documents_eleves WHERE eleve_id=$1",[n]),await e.query("DELETE FROM eleves WHERE id=$1",[n]),f&&(await e.query("DELETE FROM messages WHERE expediteur_id=$1 OR destinataire_id=$1",[f]),await e.query("DELETE FROM notifications WHERE utilisateur_id=$1",[f]),await e.query("DELETE FROM observations WHERE auteur_id=$1",[f]),await e.query("DELETE FROM utilisateurs WHERE id=$1",[f])),await e.query("COMMIT"),await X(x.elevesPhotos,o);for(let m of r.rows)await X(x.documentsEleves,m.storage_path);return!0}catch(i){throw await e.query("ROLLBACK"),i}finally{e.release()}}async function It(t,n,e,i){let f=await A(t),o=C(f,e,n);if(o)return o;let r=b();try{if(n==="/eleves"&&t.method==="GET"){let a=await r.query(`
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
      `);return s(e,await he(a.rows))}if(n==="/eleves"&&t.method==="POST"){let a=L(f,e);if(a)return a;let _=await y(t),{nom:c,prenom:T,email:R,mot_de_passe:w,classe_id:$,date_naissance:h,sexe:O,nationalite:N,date_debut_cours:S,categorie:v,telephone:I,adresse:P,nom_parent:q,telephone_parent:k}=_,H=await r.connect();try{await H.query("BEGIN");let W=await ms.hash(String(w||"EcoleManager2024!"),10),B=R&&String(R).trim()?String(R).trim():`eleve.${Date.now()}.${Math.random().toString(36).slice(2)}@ecole.local`,Y=(await H.query("INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES ($1,$2,$3,$4,$5) RETURNING id",[c,T,B,W,"eleve"])).rows[0].id,V=await H.query("INSERT INTO eleves (utilisateur_id, classe_id, date_naissance, sexe, nationalite, date_debut_cours, categorie, telephone, adresse, nom_parent, telephone_parent) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id",[Y,$||null,h||null,O||null,N||null,S||null,v||null,I||null,P||null,q||null,k||null]);return await H.query("COMMIT"),s(e,{message:"Eleve cree",id:V.rows[0].id},201)}catch(W){throw await H.query("ROLLBACK"),W}finally{H.release()}}if(n==="/eleves/oasi"&&t.method==="GET"){let a=i.searchParams.get("classe_id"),_=await r.query(`
        SELECT e.id, u.nom, u.prenom,
          e.oasi_prog_nom, e.oasi_prog_encadrant, e.oasi_prog_encadrant as oasi_encadrant, e.oasi_n, e.oasi_ref, e.oasi_pos,
          e.oasi_nom as oasi_nom_complet, e.oasi_nais, e.oasi_nationalite,
          e.oasi_prog_presences, e.oasi_prog_admin, e.oasi_as,
          e.oasi_prg_id, e.oasi_prg_occupation_id, e.oasi_ra_id, e.oasi_temps_reparti_id
        FROM eleves e
        LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
        WHERE e.classe_id = $1 AND (e.statut = 'actif' OR e.statut = 'Actif')
        ORDER BY u.nom, u.prenom
      `,[a]);return s(e,_.rows)}let m=n.match(/^\/eleves\/(\d+)\/documents(?:\/(\d+)(?:\/telecharger)?)?$/);if(m){let a=m[1],_=m[2],c=n.endsWith("/telecharger");if(!_&&t.method==="GET"){let T=await r.query("SELECT id, nom, type, taille, created_at FROM documents_eleves WHERE eleve_id=$1 ORDER BY created_at DESC",[a]);return s(e,T.rows)}if(!_&&t.method==="POST"){let T=L(f,e);if(T)return T;let R=await y(t),{nom:w,type:$,contenu:h,taille:O}=R;if(!h)return s(e,{message:"Contenu manquant"},400);if(z()){let v=(await r.query(`INSERT INTO documents_eleves (eleve_id, nom, type, contenu, taille, storage_path)
             VALUES ($1,$2,$3,NULL,$4,NULL) RETURNING id, nom, type, taille, created_at`,[a,w,$||"Autre",O||null])).rows[0],I=`eleves/${a}/${v.id}_${se(w)}`;try{await ee(x.documentsEleves,I,String(h)),await r.query("UPDATE documents_eleves SET storage_path=$1 WHERE id=$2",[I,v.id])}catch(P){throw await r.query("DELETE FROM documents_eleves WHERE id=$1",[v.id]),P}return s(e,v,201)}let N=await r.query("INSERT INTO documents_eleves (eleve_id, nom, type, contenu, taille) VALUES ($1,$2,$3,$4,$5) RETURNING id, nom, type, taille, created_at",[a,w,$||"Autre",h,O||null]);return s(e,N.rows[0],201)}if(_&&c&&t.method==="GET"){let T=await r.query("SELECT nom, contenu, storage_path FROM documents_eleves WHERE id=$1 AND eleve_id=$2",[_,a]);if(T.rows.length===0)return s(e,{message:"Document non trouv\xE9"},404);let R=T.rows[0],w=await ie(R,x.documentsEleves);return w?s(e,{nom:R.nom,contenu:w}):s(e,{message:"Fichier introuvable"},404)}if(_&&!c&&t.method==="DELETE"){let T=L(f,e);if(T)return T;let R=await r.query("SELECT storage_path FROM documents_eleves WHERE id=$1 AND eleve_id=$2",[_,a]);return R.rows.length?(await X(x.documentsEleves,R.rows[0].storage_path),await r.query("DELETE FROM documents_eleves WHERE id=$1 AND eleve_id=$2",[_,a]),s(e,{message:"Document supprim\xE9"})):s(e,{message:"Document non trouv\xE9"},404)}}let E=n.match(/^\/eleves\/(\d+)\/sanctions(?:\/(\d+))?$/);if(E){let a=E[1],_=E[2];if(!_&&t.method==="GET"){let c=await r.query("SELECT id, echelle, infraction, niveau, date_sanction, prof_nom, observation_ref, created_at FROM sanctions_eleves WHERE eleve_id=$1 ORDER BY echelle, infraction, niveau",[a]);return s(e,c.rows)}if(!_&&t.method==="POST"){let c=L(f,e);if(c)return c;let T=await y(t),{echelle:R,infraction:w,niveau:$,date_sanction:h,prof_nom:O,observation_ref:N}=T,S=String(N||"").trim();if(!S)return s(e,{message:"R\xE9f\xE9rence d'observation obligatoire pour valider la sanction"},400);if(!(await r.query("SELECT id FROM observations WHERE eleve_id=$1 AND reference_obs=$2 LIMIT 1",[a,S])).rows.length)return s(e,{message:"R\xE9f\xE9rence d'observation invalide pour cet \xE9l\xE8ve"},400);if((await r.query("SELECT id FROM sanctions_eleves WHERE eleve_id=$1 AND observation_ref=$2 LIMIT 1",[a,S])).rows.length)return s(e,{message:"Cette r\xE9f\xE9rence d'observation est d\xE9j\xE0 utilis\xE9e pour une autre sanction"},400);if((await r.query("SELECT id FROM sanctions_eleves WHERE eleve_id=$1 AND echelle=$2 AND infraction=$3 AND niveau=$4",[a,R,w,$])).rows.length>0)return s(e,{message:"Sanction d\xE9j\xE0 enregistr\xE9e"},409);let q=await r.query("INSERT INTO sanctions_eleves (eleve_id, echelle, infraction, niveau, date_sanction, prof_nom, observation_ref) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",[a,R,w,$,h||null,O||null,S]);return s(e,q.rows[0],201)}if(_&&t.method==="PUT"){let c=L(f,e);if(c)return c;let T=await y(t),{date_sanction:R,prof_nom:w,observation_ref:$}=T,h=String($||"").trim();if(!h)return s(e,{message:"R\xE9f\xE9rence d'observation obligatoire pour valider la sanction"},400);if(!(await r.query("SELECT id FROM observations WHERE eleve_id=$1 AND reference_obs=$2 LIMIT 1",[a,h])).rows.length)return s(e,{message:"R\xE9f\xE9rence d'observation invalide pour cet \xE9l\xE8ve"},400);if((await r.query("SELECT id FROM sanctions_eleves WHERE eleve_id=$1 AND observation_ref=$2 AND id <> $3 LIMIT 1",[a,h,parseInt(_,10)])).rows.length)return s(e,{message:"Cette r\xE9f\xE9rence d'observation est d\xE9j\xE0 utilis\xE9e pour une autre sanction"},400);let S=await r.query("UPDATE sanctions_eleves SET date_sanction=$1, prof_nom=$2, observation_ref=$3 WHERE id=$4 AND eleve_id=$5 RETURNING *",[R||null,w||null,h,_,a]);return S.rows.length?s(e,S.rows[0]):s(e,{message:"Sanction non trouv\xE9e"},404)}if(_&&t.method==="DELETE"){let c=L(f,e);return c||(await r.query("DELETE FROM sanctions_eleves WHERE id=$1 AND eleve_id=$2",[_,a]),s(e,{message:"Sanction supprim\xE9e"}))}}let p=n.match(/^\/eleves\/(\d+)\/photo$/);if(p&&t.method==="PUT"){let a=p[1],_=await y(t),{photo:c}=_;if(c!=null){if(typeof c!="string")return s(e,{message:"Format photo invalide"},400);if(!c.startsWith("data:image/"))return s(e,{message:"Le fichier doit etre une image"},400)}let T=await r.query("SELECT photo_storage_path FROM eleves WHERE id=$1",[a]);if(!T.rows.length)return s(e,{message:"Eleve non trouve"},404);let R=T.rows[0].photo_storage_path;if(c==null)return await X(x.elevesPhotos,R),await r.query("UPDATE eleves SET photo=NULL, photo_storage_path=NULL WHERE id=$1",[a]),s(e,{message:"Photo mise \xE0 jour"});if(z()){let w=`eleves/${a}/photo_${Date.now()}.jpg`;await ee(x.elevesPhotos,w,c),await r.query("UPDATE eleves SET photo=NULL, photo_storage_path=$1 WHERE id=$2",[w,a]),R&&R!==w&&await X(x.elevesPhotos,R)}else await r.query("UPDATE eleves SET photo=$1, photo_storage_path=NULL WHERE id=$2",[c,a]);return s(e,{message:"Photo mise \xE0 jour"})}let u=n.match(/^\/eleves\/(\d+)\/classe$/);if(u&&t.method==="PUT"){let a=u[1],_=await y(t),{classe_id:c}=_;return await r.query("UPDATE eleves SET classe_id=$1 WHERE id=$2",[c||null,a]),s(e,{message:"Classe mise \xE0 jour"})}let d=n.match(/^\/eleves\/(\d+)\/date-debut-cours$/);if(d&&t.method==="PUT"){let a=L(f,e);if(a)return a;let _=d[1],c=await y(t),{date_debut_cours:T}=c;return await r.query("UPDATE eleves SET date_debut_cours=$1 WHERE id=$2",[T||null,_]),s(e,{message:"Date de d\xE9but des cours mise \xE0 jour"})}let l=n.match(/^\/eleves\/(\d+)\/categorie$/);if(l&&t.method==="PUT"){let a=L(f,e);if(a)return a;let _=l[1],c=await y(t),{categorie:T}=c;return await r.query("UPDATE eleves SET categorie=$1 WHERE id=$2",[T||null,_]),s(e,{message:"Cat\xE9gorie mise \xE0 jour"})}let g=n.match(/^\/eleves\/(\d+)$/);if(g){let a=g[1];if(t.method==="GET"){let _=await r.query(`
          SELECT e.id, u.nom, u.prenom, u.email, c.nom as classe, e.classe_id, e.date_naissance, e.sexe, e.nationalite, e.date_debut_cours, e.categorie, e.telephone, e.adresse, e.nom_parent, e.telephone_parent, e.statut
          FROM eleves e
          JOIN utilisateurs u ON e.utilisateur_id = u.id
          LEFT JOIN classes c ON e.classe_id = c.id
          WHERE e.id = $1
        `,[a]);return _.rows.length===0?s(e,{message:"Eleve non trouve"},404):s(e,_.rows[0])}if(t.method==="PUT"){let _=L(f,e);if(_)return _;let c=await y(t),{nom:T,prenom:R,email:w,classe_id:$,date_naissance:h,sexe:O,nationalite:N,date_debut_cours:S,categorie:v,telephone:I,adresse:P,nom_parent:q,telephone_parent:k,statut:H}=c,W=await r.connect();try{await W.query("BEGIN");let B=await W.query("SELECT * FROM eleves WHERE id=$1",[a]);if(B.rows.length===0)return await W.query("ROLLBACK"),s(e,{message:"Eleve non trouve"},404);let D=B.rows[0],Y=D.utilisateur_id,V=re(c,"classe_id",D.classe_id),K=re(c,"date_naissance",D.date_naissance),te=re(c,"date_debut_cours",D.date_debut_cours),_e=re(c,"categorie",D.categorie),Se=re(c,"telephone",D.telephone),An=re(c,"adresse",D.adresse),Cn=re(c,"nom_parent",D.nom_parent),Dn=re(c,"telephone_parent",D.telephone_parent),In=Object.prototype.hasOwnProperty.call(c,"statut")?H||"actif":D.statut||"actif";if(Y&&(Object.prototype.hasOwnProperty.call(c,"nom")||Object.prototype.hasOwnProperty.call(c,"prenom")||Object.prototype.hasOwnProperty.call(c,"email"))){let Oe=(await W.query("SELECT nom, prenom, email FROM utilisateurs WHERE id=$1",[Y])).rows[0]||{};await W.query("UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3 WHERE id=$4",[Object.prototype.hasOwnProperty.call(c,"nom")?T:Oe.nom,Object.prototype.hasOwnProperty.call(c,"prenom")?R:Oe.prenom,Object.prototype.hasOwnProperty.call(c,"email")?w||null:Oe.email,Y])}return await W.query(`
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
          `,[V??null,K||null,te||null,_e||null,Se||null,An||null,Cn||null,Dn||null,In,G(c,"oasi_prog_nom",D),G(c,"oasi_prog_encadrant",D),ae(c,"oasi_n",D),ae(c,"oasi_ref",D),ae(c,"oasi_pos",D),G(c,"oasi_nom",D),G(c,"oasi_nais",D),G(c,"oasi_nationalite",D),G(c,"oasi_presence_date",D),G(c,"oasi_jour_semaine",D),G(c,"oasi_presence_periode",D),G(c,"oasi_presence_type",D),G(c,"oasi_remarque",D),G(c,"oasi_controle_du",D),G(c,"oasi_controle_au",D),G(c,"oasi_prog_presences",D),G(c,"oasi_prog_admin",D),G(c,"oasi_as",D),ae(c,"oasi_prg_id",D),ae(c,"oasi_prg_occupation_id",D),ae(c,"oasi_ra_id",D),ae(c,"oasi_temps_reparti_id",D),G(c,"nationalite",D),a,Object.prototype.hasOwnProperty.call(c,"sexe")?O||null:D.sexe]),await W.query("COMMIT"),s(e,{message:"Eleve modifie"})}catch(B){throw await W.query("ROLLBACK"),B}finally{W.release()}}if(t.method==="DELETE"){let _=L(f,e);return _||(await ps(r,a)?s(e,{message:"Eleve supprime"}):s(e,{message:"Eleve non trouve"},404))}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(m){console.error("eleves-fast error:",m);let E=m instanceof Error?m.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:E},500)}finally{await r.end()}}var Mt=M(()=>{U();le();F()});async function Ut(t,n,e,i){let f=await A(t),o=C(f,e,n);if(o)return o;let r=b();try{if(n==="/emploi-du-temps/matieres"&&t.method==="GET"){let E=await r.query("SELECT * FROM matieres ORDER BY nom");return s(e,E.rows)}if(n==="/emploi-du-temps/matieres"&&t.method==="POST"){let E=L(f,e);if(E)return E;let p=await y(t),{nom:u,code:d,coefficient:l}=p,g=await r.query("INSERT INTO matieres (nom, code, coefficient) VALUES ($1,$2,$3) RETURNING *",[u,d||null,l||1]);return s(e,{message:"Matiere creee",matiere:g.rows[0]},201)}if(n==="/emploi-du-temps"&&t.method==="GET"){let E=i.searchParams.get("classe_id"),p=i.searchParams.get("prof_id"),u=`
        SELECT e.id, e.jour, e.heure_debut, e.heure_fin, e.salle,
          c.nom as classe, c.id as classe_id,
          m.nom as matiere, m.id as matiere_id,
          u.nom as prof_nom, u.prenom as prof_prenom, u.id as prof_id
        FROM emploi_du_temps e
        JOIN classes c ON e.classe_id = c.id
        LEFT JOIN matieres m ON e.matiere_id = m.id
        LEFT JOIN utilisateurs u ON e.prof_id = u.id
      `,d=[],l=[];E&&(l.push(`e.classe_id = $${d.length+1}`),d.push(E)),p&&(l.push(`e.prof_id = $${d.length+1}`),d.push(p)),l.length>0&&(u+=" WHERE "+l.join(" AND ")),u+=" ORDER BY e.heure_debut";let g=await r.query(u,d);return s(e,g.rows)}if(n==="/emploi-du-temps"&&t.method==="POST"){let E=L(f,e);if(E)return E;let p=await y(t),{classe_id:u,matiere_id:d,prof_id:l,jour:g,heure_debut:a,heure_fin:_,salle:c}=p,T=await r.query("INSERT INTO emploi_du_temps (classe_id, matiere_id, prof_id, jour, heure_debut, heure_fin, salle) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",[u,d,l,g,a,_,c||null]);return s(e,{message:"Cours cree",cours:T.rows[0]},201)}let m=n.match(/^\/emploi-du-temps\/(\d+)$/);if(m){let E=m[1];if(t.method==="PUT"){let p=L(f,e);if(p)return p;let u=await y(t),{classe_id:d,matiere_id:l,prof_id:g,jour:a,heure_debut:_,heure_fin:c,salle:T}=u;return(await r.query("UPDATE emploi_du_temps SET classe_id=$1, matiere_id=$2, prof_id=$3, jour=$4, heure_debut=$5, heure_fin=$6, salle=$7 WHERE id=$8 RETURNING *",[d,l,g,a,_,c,T||null,E])).rows.length===0?s(e,{message:"Cours non trouve"},404):s(e,{message:"Cours modifie"})}if(t.method==="DELETE"){let p=L(f,e);return p||((await r.query("DELETE FROM emploi_du_temps WHERE id=$1 RETURNING id",[E])).rows.length===0?s(e,{message:"Cours non trouve"},404):s(e,{message:"Cours supprime"}))}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(m){console.error("emploi-du-temps-fast error:",m);let E=m instanceof Error?m.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:E},500)}finally{await r.end()}}var Pt=M(()=>{U();F()});import Es from"npm:nodemailer@6";async function Rs(){let t=b();try{return(await t.query("SELECT * FROM parametres_mail LIMIT 1")).rows[0]||null}finally{await t.end()}}function Ts(t){let n=t?.smtp_host||Deno.env.get("EMAIL_HOST")||fs,e=Number(t?.smtp_port||Deno.env.get("EMAIL_PORT")||_s),i=t?.smtp_secure===!0||String(Deno.env.get("EMAIL_SECURE")||"").toLowerCase()==="true",f=t?.smtp_user||Deno.env.get("EMAIL_USER")||"",o=Z(String(t?.smtp_app_password||""))||Deno.env.get("EMAIL_PASS")||"",r=t?.smtp_from_email||Deno.env.get("EMAIL_FROM")||f,m=t?.smtp_from_name||Deno.env.get("EMAIL_FROM_NAME")||"Oasis",E=t?t.smtp_active===!0:!!(f&&o);return{host:n,port:e,secure:i,user:f,appPassword:o,fromEmail:r,fromName:m,enabled:E}}async function ws(){let t=await Rs(),n=Ts(t);if(!n.enabled)throw new Error("Configuration email inactive. Activez l'envoi email dans Parametres.");if(!n.user||!n.appPassword)throw new Error("Configuration email incomplete. Verifiez l'utilisateur SMTP et le mot de passe d'application.");return{transporter:Es.createTransport({host:n.host,port:n.port,secure:n.secure,auth:{user:n.user,pass:n.appPassword},requireTLS:!n.secure,connectionTimeout:15e3,greetingTimeout:1e4,socketTimeout:2e4}),config:n}}async function ce({to:t,subject:n,html:e,text:i}){let{transporter:f,config:o}=await ws(),r=o.fromName?`"${String(o.fromName).replace(/"/g,'\\"')}" <${o.fromEmail}>`:o.fromEmail,m=f.sendMail({from:r,to:t,subject:n,html:e,text:i}),E=new Promise((p,u)=>{setTimeout(()=>u(new Error("Timeout SMTP. Verifiez l'hote/port et les informations d'authentification.")),gs)});return Promise.race([m,E])}var fs,_s,gs,ye=M(()=>{U();fs="smtp.office365.com",_s=587,gs=25e3});import Ae from"npm:bcryptjs@2";async function Wt(t,n,e){return e===!0||e==="true"?(await t.query(`UPDATE utilisateurs
       SET mfa_exempt = true,
           mfa_enabled = false,
           mfa_secret = NULL,
           mfa_enabled_at = NULL,
           mfa_backup_codes = '[]'::jsonb
       WHERE id = $1`,[n]),!0):e===!1||e==="false"?(await t.query("UPDATE utilisateurs SET mfa_exempt = false WHERE id = $1",[n]),!1):null}async function Ft(t,n,e){let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{if(n==="/employes-administratifs"&&t.method==="GET"){let p=await o.query(`SELECT ${Ht} FROM utilisateurs WHERE role=$1 ORDER BY nom, prenom`,["admin"]);return s(e,p.rows)}if(n==="/employes-administratifs"&&t.method==="POST"){let p=L(i,e);if(p)return p;let u=await y(t),{nom:d,prenom:l,email:g,mot_de_passe:a,telephone:_,specialite:c,adresse:T,npa:R,lieu:w,sexe:$,taux_activite:h,periodes_semaine:O,date_naissance:N,avs:S,type_contrat:v,type_permis:I,niveau_prefere:P,branches_specialites:q,lieu_travail_prefere:k,remarque_lieu_travail:H,role_acces:W,identifiant:B}=u;if((await o.query("SELECT id FROM utilisateurs WHERE email=$1",[g])).rows.length>0)return s(e,{message:"Email deja utilise"},400);let Y=await Ae.hash(String(a||"Admin123!"),10),V=String(B||"").trim()||(String(l||"").slice(0,3)+String(d||"").slice(0,3)).toLowerCase()||null,K=await o.query(`INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, role_acces, identifiant)
         VALUES ($1,$2,$3,$4,'admin',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING id, nom, prenom, email`,[d,l,g,Y,_||null,c||null,T||null,R||null,w||null,$||null,h?parseInt(String(h)):null,O?parseInt(String(O)):null,N&&N!==""?N:null,S||null,v||null,I||null,P||null,q||null,k||null,H||null,W||"employe",V]);return await Wt(o,K.rows[0].id,u.mfa_exempt),s(e,{message:"Employe administratif cree",employe:K.rows[0]},201)}let r=n.match(/^\/employes-administratifs\/(\d+)\/envoyer-acces$/);if(r&&t.method==="POST"){let p=L(i,e);if(p)return p;let u=r[1],d=await o.query("SELECT nom, prenom, email FROM utilisateurs WHERE id=$1 AND role=$2",[u,"admin"]);if(d.rows.length===0)return s(e,{message:"Employe administratif non trouv\xE9"},404);let l=d.rows[0],g="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#",a="";for(let c=0;c<10;c++)a+=g[Math.floor(Math.random()*g.length)];let _=await Ae.hash(a,10);return await o.query("UPDATE utilisateurs SET mot_de_passe=$1, doit_changer_mdp=true WHERE id=$2",[_,u]),await ce({to:l.email,subject:"Vos acc\xE8s \xC9cole Manager",html:`
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#f8fafc;border-radius:12px">
            <h2 style="color:#6366f1">\u{1F393} \xC9cole Manager</h2>
            <p>Bonjour <b>${l.prenom} ${l.nom}</b>,</p>
            <p>Voici vos acc\xE8s pour vous connecter \xE0 l'application :</p>
            <div style="background:white;padding:20px;border-radius:8px;border-left:4px solid #6366f1;margin:20px 0">
              <p style="margin:0"><b>Email :</b> ${l.email}</p>
              <p style="margin:8px 0 0"><b>Mot de passe temporaire :</b> <code style="background:#e0e7ff;padding:4px 8px;border-radius:4px;font-size:16px">${a}</code></p>
            </div>
            <p style="color:#ef4444;font-weight:bold">\u26A0\uFE0F Vous devrez changer ce mot de passe lors de votre premi\xE8re connexion.</p>
          </div>
        `,text:`Bonjour ${l.prenom} ${l.nom}, vos acces Ecole Manager sont prets. Email: ${l.email}. Mot de passe temporaire: ${a}.`}),s(e,{message:"Email envoy\xE9 \xE0 "+l.email})}let m=n.match(/^\/employes-administratifs\/(\d+)\/documents(?:\/(\d+)(?:\/telecharger)?)?$/);if(m){let p=m[1],u=m[2],d=n.endsWith("/telecharger");if(!u&&t.method==="GET"){let l=await o.query("SELECT id, nom, type, taille, created_at FROM documents_profs WHERE prof_id=$1 ORDER BY created_at DESC",[p]);return s(e,l.rows)}if(!u&&t.method==="POST"){let l=L(i,e);if(l)return l;let g=await y(t),{nom:a,type:_,contenu:c,taille:T}=g;if(!c)return s(e,{message:"Contenu manquant"},400);if(z()){let $=(await o.query(`INSERT INTO documents_profs (prof_id, nom, type, contenu, taille, storage_path)
             VALUES ($1,$2,$3,NULL,$4,NULL) RETURNING id, nom, type, taille, created_at`,[p,a,_||"Autre",T||null])).rows[0],h=`employes/${p}/${$.id}_${se(a)}`;try{await ee(x.documentsProfs,h,String(c)),await o.query("UPDATE documents_profs SET storage_path=$1 WHERE id=$2",[h,$.id])}catch(O){throw await o.query("DELETE FROM documents_profs WHERE id=$1",[$.id]),O}return s(e,$,201)}let R=await o.query("INSERT INTO documents_profs (prof_id, nom, type, contenu, taille) VALUES ($1,$2,$3,$4,$5) RETURNING id, nom, type, taille, created_at",[p,a,_||"Autre",c,T||null]);return s(e,R.rows[0],201)}if(u&&d&&t.method==="GET"){let l=await o.query("SELECT nom, contenu, storage_path FROM documents_profs WHERE id=$1 AND prof_id=$2",[u,p]);if(l.rows.length===0)return s(e,{message:"Document non trouv\xE9"},404);let g=l.rows[0],a=await ie(g,x.documentsProfs);return a?s(e,{nom:g.nom,contenu:a}):s(e,{message:"Fichier introuvable"},404)}if(u&&!d&&t.method==="DELETE"){let l=L(i,e);if(l)return l;let g=await o.query("SELECT storage_path FROM documents_profs WHERE id=$1 AND prof_id=$2",[u,p]);return g.rows.length?(await X(x.documentsProfs,g.rows[0].storage_path),await o.query("DELETE FROM documents_profs WHERE id=$1 AND prof_id=$2",[u,p]),s(e,{message:"Document supprim\xE9"})):s(e,{message:"Document non trouv\xE9"},404)}}let E=n.match(/^\/employes-administratifs\/(\d+)$/);if(E){let p=E[1];if(t.method==="GET"){let u=await o.query(`SELECT ${Ht} FROM utilisateurs WHERE id=$1 AND role=$2`,[p,"admin"]);return u.rows.length===0?s(e,{message:"Employe administratif non trouve"},404):s(e,u.rows[0])}if(t.method==="PUT"){let u=L(i,e);if(u)return u;let d=await y(t),{nom:l,prenom:g,email:a,actif:_,mot_de_passe:c,telephone:T,specialite:R,adresse:w,npa:$,lieu:h,sexe:O,taux_activite:N,periodes_semaine:S,date_naissance:v,avs:I,type_contrat:P,type_permis:q,niveau_prefere:k,branches_specialites:H,lieu_travail_prefere:W,remarque_lieu_travail:B,role_acces:D,identifiant:Y}=d,V,K;if(c&&String(c).trim()!==""){let _e=await Ae.hash(String(c),10);V="UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, mot_de_passe=$5, telephone=$6, specialite=$7, adresse=$8, npa=$9, lieu=$10, sexe=$11, taux_activite=$12, periodes_semaine=$13, date_naissance=$14, avs=$15, type_contrat=$16, type_permis=$17, niveau_prefere=$18, branches_specialites=$19, lieu_travail_prefere=$20, remarque_lieu_travail=$21, role_acces=$22, identifiant=$23 WHERE id=$24 AND role='admin' RETURNING id",K=[l,g,a,_!==void 0?_:!0,_e,T||null,R||null,w||null,$||null,h||null,O||null,N?parseInt(String(N)):null,S?parseInt(String(S)):null,v&&v!==""?v:null,I||null,P||null,q||null,k||null,H||null,W||null,B||null,D||"employe",Y||null,p]}else V="UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, telephone=$5, specialite=$6, adresse=$7, npa=$8, lieu=$9, sexe=$10, taux_activite=$11, periodes_semaine=$12, date_naissance=$13, avs=$14, type_contrat=$15, type_permis=$16, niveau_prefere=$17, branches_specialites=$18, lieu_travail_prefere=$19, remarque_lieu_travail=$20, role_acces=$21, identifiant=$22 WHERE id=$23 AND role='admin' RETURNING id",K=[l,g,a,_!==void 0?_:!0,T||null,R||null,w||null,$||null,h||null,O||null,N?parseInt(String(N)):null,S?parseInt(String(S)):null,v&&v!==""?v:null,I||null,P||null,q||null,k||null,H||null,W||null,B||null,D||"employe",Y||null,p];return(await o.query(V,K)).rows.length===0?s(e,{message:"Employe administratif non trouve"},404):(await Wt(o,p,d.mfa_exempt),s(e,{message:"Employe administratif modifie"}))}if(t.method==="DELETE"){let u=L(i,e);return u||(String(i.id)===String(p)?s(e,{message:"Suppression de votre propre compte interdite"},400):(await o.query("DELETE FROM utilisateurs WHERE id=$1 AND role=$2 RETURNING id",[p,"admin"])).rows.length===0?s(e,{message:"Employe administratif non trouve"},404):s(e,{message:"Employe administratif supprime"}))}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("employes-administratifs-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await o.end()}}var Ht,xt=M(()=>{U();ye();F();le();Ht="id, nom, prenom, email, actif, created_at, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, role_acces, identifiant, mfa_enabled, mfa_exempt"});async function qt(t,n,e){let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{if(n==="/enclassements"&&t.method==="GET"){let E=await o.query(`
        SELECT e.*,
          u.prenom || ' ' || u.nom as created_by_nom,
          (SELECT COUNT(*)::int FROM affectations_eleves_enc a
            JOIN classes_enclassement c ON a.classe_id = c.id
            WHERE c.enclassement_id = e.id) as nb_eleves,
          (SELECT COUNT(*)::int FROM classes_enclassement c WHERE c.enclassement_id = e.id) as nb_classes
        FROM enclassements e
        LEFT JOIN utilisateurs u ON e.created_by = u.id
        ORDER BY e.created_at DESC
      `);return s(e,E.rows)}if(n==="/enclassements"&&t.method==="POST"){let E=await y(t),{nom:p,session_tcf:u,parametres:d,classes:l}=E,g=await o.connect();try{await g.query("BEGIN");let _=(await g.query(`INSERT INTO enclassements (nom, session_tcf, created_by, statut, parametres)
           VALUES ($1, $2, $3, 'valid\xE9', $4) RETURNING *`,[p,u||"Test d'ao\xFBt",i.id,JSON.stringify(d||{})])).rows[0];for(let c of l||[]){let R=(await g.query(`INSERT INTO classes_enclassement (enclassement_id, structure, nom, capacite_max)
             VALUES ($1, $2, $3, $4) RETURNING id`,[_.id,c.structure,c.nom,c.capacite_max||(c.structure==="CSC"?12:15)])).rows[0].id;for(let w of c.eleves||[])await g.query(`INSERT INTO affectations_eleves_enc
               (classe_id, eleve_id, score_francais, score_math, score_pondere, flagge_plancher, motif_flag, position_serpentin, modifie_manuellement)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[R,w.eleve_id,w.score_francais,w.score_math,w.score_pondere,w.flagge_plancher||!1,w.motif_flag||null,w.position_serpentin,w.modifie_manuellement||!1])}return await g.query("COMMIT"),s(e,_)}catch(a){throw await g.query("ROLLBACK"),a}finally{g.release()}}let r=n.match(/^\/enclassements\/(\d+)\/statut$/);if(r&&t.method==="PATCH"){let E=r[1],p=await y(t),{statut:u}=p,d=await o.query("UPDATE enclassements SET statut=$1 WHERE id=$2 RETURNING *",[u,E]);return s(e,d.rows[0])}let m=n.match(/^\/enclassements\/(\d+)$/);if(m){let E=m[1];if(t.method==="GET"){let[p,u]=await Promise.all([o.query("SELECT * FROM enclassements WHERE id=$1",[E]),o.query(`
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
          `,[E])]);return p.rows[0]?s(e,{...p.rows[0],classes:u.rows}):s(e,{error:"Non trouv\xE9"},404)}if(t.method==="DELETE")return await o.query("DELETE FROM enclassements WHERE id=$1",[E]),s(e,{ok:!0})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("enclassements-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{error:m},500)}finally{await o.end()}}var Bt=M(()=>{U();F()});import*as Ne from"npm:xlsx";function kt(t){if(!t)return null;let n=String(t).split("/");return n.length>=2?n[1].trim():null}function Ee(t){if(!t)return null;try{let n=new Date(String(t));return isNaN(n.getTime())?null:n.toISOString().substring(0,10)}catch{return null}}function Q(t){if(!t)return null;let n=parseInt(String(t));return isNaN(n)?null:n}async function Jt(t){let e=(await t.formData()).get("fichier");if(!e||!(e instanceof File))return null;let i=new Uint8Array(await e.arrayBuffer()),f=Ne.read(i,{type:"array",cellDates:!0}),o=f.Sheets[f.SheetNames[0]];return Ne.utils.sheet_to_json(o,{header:1,raw:!1})}async function Gt(t,n,e){let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{if(n==="/import/eleves"&&t.method==="POST"){let r=await Jt(t);if(!r)return s(e,{message:"Fichier manquant"},400);let m=r.slice(1).filter(c=>c[3]),E=new Set,p=[];for(let c of m){let T=c,R=parseInt(String(T[3]));R&&!E.has(R)&&(E.add(R),p.push(T))}let u=await o.query("SELECT date_debut_annee FROM parametres_ecole LIMIT 1"),d=u.rows[0]?.date_debut_annee?new Date(u.rows[0].date_debut_annee).toISOString().substring(0,10):null,l=await o.query("SELECT id, nom FROM classes"),g={};for(let c of l.rows)g[String(c.nom).trim().toLowerCase()]=c.id;let a=0,_=0;for(let c of p){let T=parseInt(String(c[3]));if((await o.query("SELECT id FROM eleves WHERE oasi_ref=$1",[T])).rows.length>0){_++;continue}let w=String(c[5]||"").trim(),$=w.split(" "),h=$.filter(v=>v.length>0&&v===v.toUpperCase()).join(" "),O=$.filter(v=>v.length>0&&v!==v.toUpperCase()).join(" "),N=kt(c[0]),S=N&&g[N.toLowerCase()]||null;await o.query(`
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
      `,[h,O,Ee(c[6]),c[7]||null,c[17]||null,S,d,c[0]||null,c[1]||null,Q(c[2]),T,Q(c[4]),w,Ee(c[6]),c[7]||null,Ee(c[8]),c[9]||null,c[10]||null,c[11]||null,c[12]||null,Ee(c[13]),Ee(c[14]),c[15]||null,c[16]||null,c[17]||null,Q(c[18]),Q(c[19]),Q(c[20]),Q(c[21])]),a++}return s(e,{message:`Import termin\xE9 : ${a} cr\xE9\xE9(s), ${_} d\xE9j\xE0 existant(s)`,created:a,skipped:_})}if(n==="/import/update-lora"&&t.method==="POST"){let r=await Jt(t);if(!r)return s(e,{message:"Fichier manquant"},400);let m=r.slice(1).filter(R=>R[3]),E=new Set,p=[];for(let R of m){let w=R,$=parseInt(String(w[3]));$&&!E.has($)&&(E.add($),p.push(w))}let u=await o.query("SELECT id, nom FROM classes"),d={};for(let R of u.rows)d[String(R.nom).trim().toLowerCase()]=R.id;let l=0,g=0,a=0,_=new Set;for(let R of p){let w=parseInt(String(R[3]));if((await o.query("SELECT id FROM eleves WHERE oasi_ref=$1",[w])).rows.length===0){g++;continue}let h=kt(R[0]),O=h&&d[h.toLowerCase()]||null;O?a++:h&&_.add(h),await o.query(`
        UPDATE eleves SET
          oasi_prog_nom=$1, oasi_prog_encadrant=$2, oasi_n=$3, oasi_pos=$4,
          oasi_prog_presences=$5, oasi_prog_admin=$6, oasi_as=$7,
          oasi_prg_id=$8, oasi_prg_occupation_id=$9, oasi_ra_id=$10, oasi_temps_reparti_id=$11,
          classe_id=$13
        WHERE oasi_ref=$12
      `,[R[0]||null,R[1]||null,Q(R[2]),Q(R[4]),R[15]||null,R[16]||null,R[17]||null,Q(R[18]),Q(R[19]),Q(R[20]),Q(R[21]),w,O]),l++}let c=[..._].join(", "),T=`Mise \xE0 jour termin\xE9e : ${l} mis \xE0 jour, ${a} avec classe assign\xE9e`+(c?` \u2014 codes non trouv\xE9s : ${c}`:"")+(g?`, ${g} \xE9l\xE8ve(s) introuvable(s)`:"");return s(e,{message:T,updated:l,notFound:g,classMatched:a,unmatchedCodes:[..._]})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("import-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur import: "+m},500)}finally{await o.end()}}var jt=M(()=>{U();F()});async function Yt(t,n,e){let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{let r=n.match(/^\/inventaire-branches\/(\d+)\/branches$/);if(r&&t.method==="GET"){let p=parseInt(r[1],10);if(!p)return s(e,{message:"Classe invalide"},400);let u=await o.query("SELECT id, niveau, nom FROM classes WHERE id=$1",[p]);if(!u.rows.length)return s(e,{message:"Classe non trouvee"},404);let d={...u.rows[0],niveau:u.rows[0].niveau!=null?String(u.rows[0].niveau).trim():""},l=[];return d.niveau&&(l=(await o.query(`SELECT id, nom, code, niveau, designation_courte, type_branche FROM matieres
           WHERE LOWER(TRIM(COALESCE(niveau, ''))) = LOWER($1) ORDER BY nom`,[d.niveau])).rows),l.length===0&&(l=(await o.query("SELECT id, nom, code, niveau, designation_courte, type_branche FROM matieres ORDER BY nom")).rows),s(e,{classe:d,branches:l})}let m=n.match(/^\/inventaire-branches\/(\d+)\/branches\/(\d+)\/reorder$/);if(m&&t.method==="POST"){let p=pe(i,e,"admin","prof");if(p)return p;let u=parseInt(m[1],10),d=parseInt(m[2],10),l=await y(t),{ids:g}=l;if(!u||!d||!Array.isArray(g))return s(e,{message:"Parametres invalides"},400);for(let a=0;a<g.length;a+=1){let _=parseInt(String(g[a]),10);_&&await o.query("UPDATE inventaire_branches SET ordre=$1 WHERE id=$2 AND classe_id=$3 AND branche_id=$4",[a+1,_,u,d])}return s(e,{message:"Ordre mis a jour"})}let E=n.match(/^\/inventaire-branches\/(\d+)\/branches\/(\d+)(?:\/(\d+))?$/);if(E){let p=parseInt(E[1],10),u=parseInt(E[2],10),d=E[3];if(!d&&t.method==="GET"){if(!p||!u)return s(e,{message:"Parametres invalides"},400);let l=await o.query(`
          SELECT ib.*, m.nom AS branche_nom, u.nom AS auteur_nom, u.prenom AS auteur_prenom
          FROM inventaire_branches ib
          JOIN matieres m ON m.id=ib.branche_id
          LEFT JOIN utilisateurs u ON u.id=ib.auteur_id
          WHERE ib.classe_id=$1 AND ib.branche_id=$2
          ORDER BY COALESCE(ib.ordre, 999999) ASC, ib.created_at ASC, ib.id ASC
        `,[p,u]);return s(e,l.rows)}if(!d&&t.method==="POST"){let l=pe(i,e,"admin","prof");if(l)return l;let g=await y(t),{date_document:a,nom_document:_,numero_document:c,remarques:T,sans_numero:R}=g;if(!p||!u)return s(e,{message:"Parametres invalides"},400);if(!_||!String(_).trim())return s(e,{message:"Le nom du document est requis"},400);let $=(await o.query("SELECT COALESCE(MAX(ordre), 0) + 1 AS next_ordre FROM inventaire_branches WHERE classe_id=$1 AND branche_id=$2",[p,u])).rows[0]?.next_ordre||1,h=await o.query(`
          INSERT INTO inventaire_branches (
            classe_id, branche_id, date_document, nom_document, numero_document, ordre, sans_numero, remarques, auteur_id
          ) VALUES (
            $1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5, $6, $7, $8, $9
          )
          RETURNING *
        `,[p,u,a||null,String(_).trim(),c||null,$,!!R,T||null,i.id||null]);return s(e,h.rows[0],201)}if(d&&t.method==="PUT"){let l=pe(i,e,"admin","prof");if(l)return l;let g=parseInt(d,10),a=await y(t),{date_document:_,nom_document:c,remarques:T,sans_numero:R}=a;if(!p||!u||!g)return s(e,{message:"Parametres invalides"},400);if(!c||!String(c).trim())return s(e,{message:"Le nom du document est requis"},400);let w=await o.query(`
          UPDATE inventaire_branches
          SET
            date_document = COALESCE($1::date, CURRENT_DATE),
            nom_document = $2,
            sans_numero = $3,
            remarques = $4
          WHERE id=$5 AND classe_id=$6 AND branche_id=$7
          RETURNING *
        `,[_||null,String(c).trim(),!!R,T||null,g,p,u]);return w.rows.length?s(e,w.rows[0]):s(e,{message:"Ligne inventaire non trouvee"},404)}if(d&&t.method==="DELETE"){let l=pe(i,e,"admin","prof");if(l)return l;let g=parseInt(d,10);return!p||!u||!g?s(e,{message:"Parametres invalides"},400):(await o.query("DELETE FROM inventaire_branches WHERE id=$1 AND classe_id=$2 AND branche_id=$3 RETURNING id",[g,p,u])).rows.length?s(e,{message:"Ligne supprimee"}):s(e,{message:"Ligne inventaire non trouvee"},404)}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("inventaire-branches-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await o.end()}}var Vt=M(()=>{U();F()});async function Kt(t,n,e,i){let f=await A(t),o=C(f,e,n);if(o)return o;let r=b();try{if(n==="/notes/classes-responsables"&&t.method==="GET"){let u=await r.query(`
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
      `);return s(e,u.rows)}if(n==="/notes/semestre-config"&&t.method==="GET")try{await r.query("CREATE TABLE IF NOT EXISTS app_settings (cle TEXT PRIMARY KEY, valeur TEXT)");let u=await r.query("SELECT valeur FROM app_settings WHERE cle = 'sem1_bloque' LIMIT 1");return s(e,{sem1_bloque:u.rows.length>0&&u.rows[0].valeur==="true"})}catch{return s(e,{sem1_bloque:!1})}if(n==="/notes/semestre-config"&&t.method==="PUT"){let u=L(f,e);if(u)return u;let d=await y(t),{sem1_bloque:l}=d;return await r.query("CREATE TABLE IF NOT EXISTS app_settings (cle TEXT PRIMARY KEY, valeur TEXT)"),await r.query("INSERT INTO app_settings (cle, valeur) VALUES ('sem1_bloque', $1) ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur",[l?"true":"false"]),s(e,{message:"OK"})}if(n==="/notes/bulletin"&&t.method==="GET"){let u=i.searchParams.get("classe_id"),d=i.searchParams.get("semestre"),l=await r.query(`
        SELECT e.id, COALESCE(u.nom, e.nom) as nom, COALESCE(u.prenom, e.prenom) as prenom, e.date_debut_cours, e.date_naissance, e.nationalite, e.oasi_nais, e.oasi_nationalite
        FROM eleves e
        LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
        WHERE e.classe_id = $1 AND LOWER(COALESCE(e.statut, 'actif')) = 'actif'
        ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)
      `,[u]),g=await r.query("SELECT * FROM matieres ORDER BY nom"),a=await Promise.all(l.rows.map(async _=>{let c={};for(let w of g.rows){let $=[_.id,w.id],h="";d&&($.push(parseInt(d)),h=` AND ev.semestre = $${$.length}`);let O=await r.query(`
              SELECT n.valeur, n.absent, n.dispense, ev.coefficient
              FROM notes n
              JOIN evaluations ev ON n.evaluation_id = ev.id
              WHERE n.eleve_id = $1 AND ev.matiere_id = $2 AND n.absent = false AND n.dispense = false AND n.valeur IS NOT NULL${h}
            `,$);if(O.rows.length>0){let N=O.rows.reduce((S,v)=>S+parseFloat(String(v.valeur)),0)/O.rows.length;c[w.nom]={moyenne:Math.round(N*100)/100,coefficient:w.coefficient,nbNotes:O.rows.length}}}let T=0,R=0;return Object.values(c).forEach(w=>{T+=w.moyenne*parseFloat(String(w.coefficient)),R+=parseFloat(String(w.coefficient))}),R>0&&(T=Math.round(T/R*100)/100),{eleve:_,parMatiere:c,moyenneGenerale:T}}));return s(e,a)}if(n==="/notes/bulletin-criteres"&&t.method==="GET"){let u=i.searchParams.get("classe_id"),d=i.searchParams.get("semestre"),l=parseInt(d||"1")||1;await r.query(`
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
      `,[u,l]);return s(e,g.rows)}let m=n.match(/^\/notes\/bulletin-criteres\/(\d+)$/);if(m&&t.method==="PUT"){let u=m[1],d=await y(t),{classe_id:l,c1:g,c2:a,c3:_,c4:c,c5:T,c6:R,c7:w,c8:$,c9:h,c10:O,remarques:N,valide:S,semestre:v}=d,I=parseInt(String(v))||1;return await r.query(`
        INSERT INTO bulletin_criteres (classe_id, eleve_id, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, remarques, valide, semestre)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (classe_id, eleve_id, semestre) DO UPDATE SET
          c1=$3, c2=$4, c3=$5, c4=$6, c5=$7, c6=$8, c7=$9, c8=$10, c9=$11, c10=$12, remarques=$13, valide=$14
      `,[l,u,g||null,a||null,_||null,c||null,T||null,R||null,w||null,$||null,h||null,O||null,N||null,S===!0||S==="true",I]),s(e,{message:"Crit\xE8res bulletin enregistr\xE9s"})}if(n==="/notes/rapport"&&t.method==="GET"){let u=i.searchParams.get("classe_id"),d=i.searchParams.get("semestre"),l=await r.query(`
        SELECT e.id,
          COALESCE(u.nom, e.nom) as nom,
          COALESCE(u.prenom, e.prenom) as prenom
        FROM eleves e
        LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
        WHERE e.classe_id = $1 AND LOWER(COALESCE(e.statut, 'actif')) = 'actif'
        ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)
      `,[u]),g=[u],a="WHERE ev.classe_id = $1";d&&(g.push(parseInt(d)),a+=` AND ev.semestre = $${g.length}`);let _=await r.query(`
        SELECT ev.id, ev.nom, ev.date, ev.type, ev.coefficient, ev.points_max,
          m.id as matiere_id, m.nom as matiere_nom,
          u.nom as prof_nom, u.prenom as prof_prenom
        FROM evaluations ev
        JOIN matieres m ON ev.matiere_id = m.id
        LEFT JOIN utilisateurs u ON ev.prof_id = u.id
        ${a}
        ORDER BY m.nom, ev.date
      `,g),c=await r.query(`
        SELECT n.eleve_id, n.evaluation_id, n.valeur, n.absent, n.dispense
        FROM notes n
        JOIN evaluations ev ON n.evaluation_id = ev.id
        WHERE ev.classe_id = $1${d?" AND ev.semestre = $2":""}
      `,d?[u,parseInt(d)]:[u]),T={};for(let R of _.rows){T[R.matiere_id]||(T[R.matiere_id]={matiere_id:R.matiere_id,matiere_nom:R.matiere_nom,evaluations:[]});let w=c.rows.filter($=>$.evaluation_id===R.id);T[R.matiere_id].evaluations.push({id:R.id,nom:R.nom,date:R.date,type:R.type,coefficient:parseFloat(String(R.coefficient)),prof_nom:R.prof_nom,prof_prenom:R.prof_prenom,notes:l.rows.map($=>{let h=w.find(O=>O.eleve_id===$.id);return{eleve_id:$.id,valeur:h?h.valeur:null,absent:h?h.absent:null,dispense:h?h.dispense:null}})})}return s(e,{eleves:l.rows,matieres:Object.values(T)})}if(n==="/notes/suivi-classes"&&t.method==="GET"){let u=await r.query(`
        SELECT ev.classe_id, ev.matiere_id, ev.prof_id, COUNT(ev.id)::int as nb_evaluations
        FROM evaluations ev
        GROUP BY ev.classe_id, ev.matiere_id, ev.prof_id
      `);return s(e,u.rows)}if(n==="/notes"&&t.method==="GET"){await r.query("ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS semestre INT DEFAULT 1");let u=i.searchParams.get("classe_id"),d=i.searchParams.get("matiere_id"),l=i.searchParams.get("semestre"),g=`
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
      `,a=[u];d&&(g+=` AND ev.matiere_id = $${a.length+1}`,a.push(d)),l&&(g+=` AND ev.semestre = $${a.length+1}`,a.push(parseInt(l))),g+=" GROUP BY ev.id, m.nom, m.id, c.nom, u.nom, u.prenom ORDER BY ev.date DESC";let _=await r.query(g,a);return s(e,_.rows)}if(n==="/notes"&&t.method==="POST"){let u=await y(t),{nom:d,classe_id:l,matiere_id:g,date:a,type:_,coefficient:c,sur:T,points_max:R,semestre:w,nb_exercices:$}=u,h=await r.query("INSERT INTO evaluations (nom, classe_id, matiere_id, prof_id, date, type, coefficient, sur, points_max, semestre, nb_exercices) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",[d,l,g,f.id,a,_||"Ecrit",c||1,T||6,R!=null&&R!==""?R:null,w||1,parseInt(String($))||0]);return s(e,{message:"Evaluation creee",evaluation:h.rows[0]},201)}let E=n.match(/^\/notes\/(\d+)\/notes$/);if(E){let u=E[1];if(t.method==="GET"){let d=await r.query(`
          SELECT ev.*, m.nom as matiere, c.nom as classe
          FROM evaluations ev
          JOIN matieres m ON ev.matiere_id = m.id
          JOIN classes c ON ev.classe_id = c.id
          WHERE ev.id = $1
        `,[u]);if(d.rows.length===0)return s(e,{message:"Evaluation non trouvee"},404);let l=await r.query(`
          SELECT e.id,
            COALESCE(u.nom, e.nom) as nom,
            COALESCE(u.prenom, e.prenom) as prenom
          FROM eleves e
          LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
          WHERE e.classe_id = $1 AND LOWER(COALESCE(e.statut, 'actif')) = 'actif'
          ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)
        `,[d.rows[0].classe_id]),g=await r.query("SELECT * FROM notes WHERE evaluation_id = $1",[u]),a=l.rows.map(_=>{let c=g.rows.find(T=>T.eleve_id===_.id);return{..._,points:c?c.points:null,valeur:c?c.valeur:null,absent:c?c.absent:!1,dispense:c?c.dispense:!1,commentaire:c?c.commentaire:"",points_detail:c?c.points_detail||{}:{},note_id:c?c.id:null}});return s(e,{evaluation:d.rows[0],eleves:a})}if(t.method==="POST"){let d=await y(t),{notes:l}=d,g=await r.connect();try{await g.query("BEGIN");for(let a of l){let _=await g.query("SELECT id FROM notes WHERE evaluation_id=$1 AND eleve_id=$2",[u,a.eleve_id]),c=a.points!=null?a.points:null,T=a.valeur!=null?a.valeur:null,R=a.absent===!0,w=a.dispense===!0,$=a.commentaire||null,h=a.points_detail&&Object.keys(a.points_detail).length>0?JSON.stringify(a.points_detail):null;_.rows.length>0?await g.query("UPDATE notes SET points=$1, valeur=$2, absent=$3, dispense=$4, commentaire=$5, points_detail=$6 WHERE evaluation_id=$7 AND eleve_id=$8",[c,T,R,w,$,h,u,a.eleve_id]):await g.query("INSERT INTO notes (evaluation_id, eleve_id, points, valeur, absent, dispense, commentaire, points_detail) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",[u,a.eleve_id,c,T,R,w,$,h])}return await g.query("COMMIT"),s(e,{message:"Notes sauvegardees"})}catch(a){throw await g.query("ROLLBACK"),a}finally{g.release()}}}let p=n.match(/^\/notes\/(\d+)$/);if(p){let u=p[1];if(t.method==="PUT"){let d=await y(t),{nom:l,date:g,type:a,coefficient:_,points_max:c,nb_exercices:T}=d,R=c!=null&&c!==""?parseFloat(String(c)):null,w=await r.connect();try{return await w.query("BEGIN"),await w.query("UPDATE evaluations SET nom=$1, date=$2, type=$3, coefficient=$4, points_max=$5, nb_exercices=$6 WHERE id=$7",[l,g||null,a||"Ecrit",_||1,R,parseInt(String(T))||0,u]),R&&R>0&&await w.query(`
              UPDATE notes SET valeur = ROUND(LEAST((points / $1) * 5 + 1, 6)::numeric, 1)
              WHERE evaluation_id = $2 AND points IS NOT NULL AND absent = false AND dispense = false
            `,[R,u]),await w.query("COMMIT"),s(e,{message:"Evaluation modifiee"})}catch($){throw await w.query("ROLLBACK"),$}finally{w.release()}}if(t.method==="DELETE")return await r.query("DELETE FROM evaluations WHERE id=$1",[u]),s(e,{message:"Evaluation supprimee"})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(m){console.error("notes-fast error:",m);let E=m instanceof Error?m.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:E},500)}finally{await r.end()}}var Xt=M(()=>{U();F()});async function zt(t){await t.query(`
    CREATE TABLE IF NOT EXISTS notes_personnelles (
      id SERIAL PRIMARY KEY,
      utilisateur_id INTEGER NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
      contenu TEXT DEFAULT '',
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)}async function Qt(t,n,e){let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{if(n==="/notes-personnelles"&&t.method==="GET"){await zt(o);let r=await o.query("SELECT contenu, updated_at FROM notes_personnelles WHERE utilisateur_id = $1",[i.id]);return s(e,{contenu:r.rows[0]?.contenu||"",updated_at:r.rows[0]?.updated_at||null})}if(n==="/notes-personnelles"&&t.method==="PUT"){await zt(o);let r=await y(t),{contenu:m}=r;return await o.query(`
        INSERT INTO notes_personnelles (utilisateur_id, contenu, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (utilisateur_id) DO UPDATE SET contenu = $2, updated_at = NOW()
      `,[i.id,m||""]),s(e,{ok:!0})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("notes-personnelles-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:m},500)}finally{await o.end()}}var Zt=M(()=>{U();F()});async function en(t,n,e){let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{let r=n.match(/^\/observations\/eleve\/(\d+)$/);if(r){let E=r[1];if(t.method==="GET"){let p=await o.query(`
          SELECT o.*, u.nom as auteur_nom, u.prenom as auteur_prenom
          FROM observations o
          LEFT JOIN utilisateurs u ON u.id=o.auteur_id
          WHERE o.eleve_id=$1
          ORDER BY o.created_at DESC
        `,[E]);return s(e,p.rows)}if(t.method==="POST"){let p=await y(t),{titre:u,contenu:d,mesure_prise:l,intervention_responsable:g,demande_entretien:a}=p,_=await o.query(`
          SELECT
            e.id,
            u.nom, u.prenom
          FROM eleves e
          LEFT JOIN utilisateurs u ON u.id = e.utilisateur_id
          WHERE e.id = $1
        `,[E]);if(!_.rows.length)return s(e,{message:"\xC9l\xE8ve introuvable"},404);let c=String(_.rows[0]?.nom||"").trim(),T=String(_.rows[0]?.prenom||"").trim(),R=c?c[0].toUpperCase():"X",$=`${T?T[0].toUpperCase():"X"}${R}`,O=((await o.query(`
          SELECT COUNT(*)::int AS nb
          FROM observations
          WHERE eleve_id = $1
        `,[E])).rows[0]?.nb||0)+1,N=`${$}-${String(O).padStart(2,"0")}`,S=await o.query("INSERT INTO observations (eleve_id, reference_obs, titre, contenu, mesure_prise, intervention_responsable, demande_entretien, auteur_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",[E,N,u,d,l||null,g||!1,a||!1,i.id]);return s(e,S.rows[0],201)}}let m=n.match(/^\/observations\/(\d+)$/);if(m){let E=m[1];if(t.method==="PUT"){let p=await y(t),{titre:u,contenu:d,mesure_prise:l,intervention_responsable:g,demande_entretien:a}=p;return await o.query("UPDATE observations SET titre=$1, contenu=$2, mesure_prise=$3, intervention_responsable=$4, demande_entretien=$5 WHERE id=$6",[u,d,l||null,g||!1,a||!1,E]),s(e,{message:"Observation modifi\xE9e"})}if(t.method==="DELETE")return await o.query("DELETE FROM observations WHERE id=$1",[E]),s(e,{message:"Observation supprim\xE9e"})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("observations-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await o.end()}}var tn=M(()=>{U();F()});import nn from"npm:bcryptjs@2";async function sn(t){return(await t.query("SELECT * FROM parametres_mail LIMIT 1")).rows[0]||null}function ys(t){let n=t?.smtp_host||Deno.env.get("EMAIL_HOST")||$s,e=Number(t?.smtp_port||Deno.env.get("EMAIL_PORT")||hs),i=t?.smtp_secure===!0||String(Deno.env.get("EMAIL_SECURE")||"").toLowerCase()==="true",f=t?.smtp_user||Deno.env.get("EMAIL_USER")||"",o=Z(String(t?.smtp_app_password||""))||Deno.env.get("EMAIL_PASS")||"",r=t?.smtp_from_email||Deno.env.get("EMAIL_FROM")||f,m=t?.smtp_from_name||Deno.env.get("EMAIL_FROM_NAME")||"Ecole Manager",E=t?t.smtp_active===!0:!!(f&&o);return{host:n,port:e,secure:i,user:f,appPassword:o,fromEmail:r,fromName:m,enabled:E}}function Ns(t){let n=t,e=String(n?.code||"").toUpperCase(),i=String(n?.message||"").toLowerCase();return e==="EAUTH"||i.includes("authentication unsuccessful")||i.includes("auth")?"Authentification refusee. Verifiez l'email SMTP, le mot de passe d'application, et que SMTP AUTH est active sur le compte Microsoft.":e==="ETIMEDOUT"||e==="ECONNECTION"||i.includes("timeout")||i.includes("connect")?"Connexion SMTP impossible. Verifiez le serveur/port, le pare-feu reseau, et le mode TLS (587 sans SSL implicite ou 465 avec SSL implicite).":i.includes("5.7.57")||i.includes("smtp client authentication is disabled")?'SMTP AUTH est desactive cote Microsoft 365. Activez "Authenticated SMTP" au niveau de la boite et du tenant.':"Consultez le detail de l'erreur SMTP puis verifiez host/port/TLS et les identifiants."}async function rn(t,n,e){let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{if(n==="/parametres/profil"&&t.method==="GET"){let m=await o.query("SELECT id, nom, prenom, email, role, permissions, telephone, adresse, npa, lieu, sexe, date_naissance, avs, taux_activite, periodes_semaine, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, priorite_pref, specialite FROM utilisateurs WHERE id=$1",[i.id]);return s(e,m.rows[0])}if(n==="/parametres/profil"&&t.method==="PUT"){let m=await y(t),{nom:E,prenom:p,email:u,telephone:d,adresse:l,npa:g,lieu:a,sexe:_,date_naissance:c,avs:T,niveau_prefere:R,lieu_travail_prefere:w,remarque_lieu_travail:$,priorite_pref:h,specialite:O}=m;return await o.query("UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, telephone=$4, adresse=$5, npa=$6, lieu=$7, sexe=$8, date_naissance=$9, avs=$10, niveau_prefere=$11, lieu_travail_prefere=$12, remarque_lieu_travail=$13, priorite_pref=$14, specialite=$15 WHERE id=$16",[E,p,u,d||null,l||null,g||null,a||null,_||null,c||null,T||null,R||null,w||null,$||null,h||null,O||null,i.id]),s(e,{message:"Profil mis a jour"})}if(n==="/parametres/mot-de-passe"&&t.method==="PUT"){let m=await y(t),{ancien:E,nouveau:p}=m,u=await o.query("SELECT mot_de_passe FROM utilisateurs WHERE id=$1",[i.id]);if(!await nn.compare(String(E),u.rows[0].mot_de_passe))return s(e,{message:"Ancien mot de passe incorrect"},400);let l=await nn.hash(String(p),10);return await o.query("UPDATE utilisateurs SET mot_de_passe=$1 WHERE id=$2",[l,i.id]),s(e,{message:"Mot de passe modifie"})}if(n==="/parametres/ecole"&&t.method==="GET"){let m=await o.query("SELECT * FROM parametres_ecole LIMIT 1");return s(e,m.rows[0]||{})}if(n==="/parametres/ecole"&&t.method==="PUT"){let m=L(i,e);if(m)return m;let E=await y(t),{nom_ecole:p,adresse:u,telephone:d,email:l,annee_scolaire:g,date_debut_annee:a,date_fin_annee:_,responsable_langues_jeunes:c,responsable_niveau:T,responsable_niveau_csc:R,responsable_niveau_cfr:w,responsable_niveau_epl:$,sexe_responsable_langues_jeunes:h,sexe_responsable_niveau_csc:O,sexe_responsable_niveau_cfr:N,sexe_responsable_niveau_epl:S,horaires:v}=E,I=await o.query("SELECT id FROM parametres_ecole LIMIT 1");return I.rows.length>0?await o.query("UPDATE parametres_ecole SET nom_ecole=$1, adresse=$2, telephone=$3, email=$4, annee_scolaire=$5, date_debut_annee=$6, date_fin_annee=$7, responsable_langues_jeunes=$8, responsable_niveau=$9, responsable_niveau_csc=$10, responsable_niveau_cfr=$11, responsable_niveau_epl=$12, sexe_responsable_langues_jeunes=$13, sexe_responsable_niveau_csc=$14, sexe_responsable_niveau_cfr=$15, sexe_responsable_niveau_epl=$16, horaires=$17::jsonb WHERE id=$18",[p,u,d,l,g,a||null,_||null,c||null,T||null,R||null,w||null,$||null,h||null,O||null,N||null,S||null,v?JSON.stringify(v):"{}",I.rows[0].id]):await o.query("INSERT INTO parametres_ecole (nom_ecole, adresse, telephone, email, annee_scolaire, date_debut_annee, date_fin_annee, responsable_langues_jeunes, responsable_niveau, responsable_niveau_csc, responsable_niveau_cfr, responsable_niveau_epl, sexe_responsable_langues_jeunes, sexe_responsable_niveau_csc, sexe_responsable_niveau_cfr, sexe_responsable_niveau_epl, horaires) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)",[p,u,d,l,g,a||null,_||null,c||null,T||null,R||null,w||null,$||null,h||null,O||null,N||null,S||null,v?JSON.stringify(v):"{}"]),s(e,{message:"Parametres mis a jour"})}if(n==="/parametres/mail"&&t.method==="GET"){let m=L(i,e);if(m)return m;let E=await sn(o),p=ys(E);return s(e,{smtp_active:E?E.smtp_active===!0:!1,smtp_host:E?.smtp_host||p.host||"smtp.office365.com",smtp_port:E?.smtp_port||p.port||587,smtp_secure:E?E.smtp_secure===!0:!1,smtp_user:E?.smtp_user||p.user||"",smtp_from_name:E?.smtp_from_name||p.fromName||"Ecole Manager",smtp_from_email:E?.smtp_from_email||p.fromEmail||"",has_app_password:!!E?.smtp_app_password})}if(n==="/parametres/mail"&&t.method==="PUT"){let m=L(i,e);if(m)return m;let E=await y(t),{smtp_active:p,smtp_host:u,smtp_port:d,smtp_secure:l,smtp_user:g,smtp_from_name:a,smtp_from_email:_,smtp_app_password:c}=E,T=await sn(o),R=String(u||"smtp.office365.com").trim(),w=Number(d)||587,$=l===!0,h=String(g||"").trim(),O=String(a||"Ecole Manager").trim(),N=String(_||h).trim(),S=p===!0,v=typeof c=="string"?c.trim():"",I=v?Re(v):"";return S&&(!h||!v&&!T?.smtp_app_password)?s(e,{message:"Pour activer l'envoi d'emails, renseignez l'utilisateur SMTP et le mot de passe d'application."},400):(T?await o.query(`UPDATE parametres_mail
           SET smtp_active=$1, smtp_host=$2, smtp_port=$3, smtp_secure=$4, smtp_user=$5,
               smtp_app_password=COALESCE(NULLIF($6,''), smtp_app_password),
               smtp_from_name=$7, smtp_from_email=$8, updated_at=NOW()
           WHERE id=$9`,[S,R,w,$,h,I,O,N,T.id]):await o.query(`INSERT INTO parametres_mail
            (smtp_active, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_app_password, smtp_from_name, smtp_from_email)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,[S,R,w,$,h,I,O,N]),s(e,{message:"Parametres email mis a jour"}))}if(n==="/parametres/mail/test"&&t.method==="POST"){let m=L(i,e);if(m)return m;let E=await y(t),p=String(E.email||"").trim();if(!p)return s(e,{message:"Email destinataire manquant"},400);try{return await ce({to:p,subject:"Test configuration email - Ecole Manager",html:`
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#f8fafc;border-radius:12px">
              <h2 style="margin:0 0 10px;color:#6366f1">Configuration email OK</h2>
              <p style="margin:0 0 10px;color:#111827">
                Ce message confirme que la configuration SMTP admin fonctionne.
              </p>
              <p style="margin:0;color:#6b7280;font-size:12px">
                Si vous utilisez la double authentification Outlook, gardez un mot de passe d'application actif.
              </p>
            </div>
          `,text:"Configuration email OK. La configuration SMTP admin fonctionne."}),s(e,{message:"Email de test envoye"})}catch(u){let d=u;return s(e,{message:"Echec de l'envoi du mail de test",erreur:d?.message||"Erreur SMTP inconnue",code:d?.code||null,reponse:d?.response||d?.responseCode||null,hint:Ns(u)},400)}}if(n==="/parametres/profs"&&t.method==="GET"){let m=L(i,e);if(m)return m;let E=await o.query("SELECT id, nom, prenom, email, permissions FROM utilisateurs WHERE role='prof' ORDER BY nom, prenom");return s(e,E.rows)}let r=n.match(/^\/parametres\/permissions\/(\d+)$/);if(r&&t.method==="PUT"){let m=L(i,e);if(m)return m;let E=await y(t),{permissions:p}=E;return await o.query("UPDATE utilisateurs SET permissions=$1 WHERE id=$2",[JSON.stringify(p),r[1]]),s(e,{message:"Permissions mises a jour"})}if(n==="/parametres/acces-profs"&&t.method==="GET"){let m=await o.query("SELECT acces_profs FROM parametres_ecole LIMIT 1");return s(e,m.rows[0]?.acces_profs||{})}if(n==="/parametres/acces-profs"&&t.method==="PUT"){let m=L(i,e);if(m)return m;let E=await y(t),{acces_profs:p}=E,u=await o.query("SELECT id FROM parametres_ecole LIMIT 1");return u.rows.length>0?await o.query("UPDATE parametres_ecole SET acces_profs=$1 WHERE id=$2",[JSON.stringify(p),u.rows[0].id]):await o.query("INSERT INTO parametres_ecole (acces_profs) VALUES ($1)",[JSON.stringify(p)]),s(e,{message:"Acc\xE8s professeurs mis \xE0 jour"})}if(n==="/parametres/mes-classes"&&t.method==="GET"){let m=await o.query(`
        SELECT DISTINCT c.id, c.nom, c.niveau, c.annee_scolaire, m.nom as matiere
        FROM emploi_du_temps et
        JOIN classes c ON et.classe_id = c.id
        JOIN matieres m ON et.matiere_id = m.id
        WHERE et.prof_id = $1
        ORDER BY c.nom
      `,[i.id]);return s(e,m.rows)}if(n==="/parametres/reset-tout"&&t.method==="DELETE"){let m=L(i,e);if(m)return m;let E=["presences_v2","presences","absences","notes","planning_branches","branches","classe_horaires","planning_affectations","planning_pools","disponibilites","paiements","comptabilite","calendrier","observations","eleves","classes","profs","messages","notifications"],p=[];for(let d of E)try{let l=await o.query("DELETE FROM "+d);p.push("OK:"+d+"("+l.rowCount+")")}catch(l){p.push("ERR:"+d+":"+(l instanceof Error?l.message:String(l)))}try{let d=await o.query("DELETE FROM utilisateurs WHERE role != 'admin'");p.push("OK:utilisateurs("+d.rowCount+")")}catch(d){p.push("ERR:utilisateurs:"+(d instanceof Error?d.message:String(d)))}let u=p.filter(d=>d.startsWith("ERR"));return s(e,{message:u.length===0?"Reset complet effectue":"Reset partiel - "+u.length+" erreur(s)",details:p,erreurs:u})}if(n==="/parametres/reset-rentree"&&t.method==="DELETE"){let m=L(i,e);if(m)return m;let E=["presences_v2","presences","absences","notes","evaluations","affectations","planning_branches","pool_profs","pool_classes","pool_branches","classe_horaires","emploi_du_temps","plan_classe","paiements","comptabilite","documents_eleves","sanctions_eleves","observations","eleves"],p=[];for(let d of E)try{let l=await o.query("DELETE FROM "+d);p.push("OK:"+d+"("+l.rowCount+")")}catch(l){p.push("ERR:"+d+":"+(l instanceof Error?l.message:String(l)))}try{let d=await o.query("DELETE FROM utilisateurs WHERE role IN ('eleve','parent')");p.push("OK:utilisateurs-eleves-parents("+d.rowCount+")")}catch(d){p.push("ERR:utilisateurs-eleves-parents:"+(d instanceof Error?d.message:String(d)))}let u=p.filter(d=>d.startsWith("ERR"));return s(e,{message:u.length===0?"Reset rentree effectue":"Reset rentree partiel - "+u.length+" erreur(s)",details:p,erreurs:u})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("parametres-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await o.end()}}var $s,hs,an=M(()=>{U();ye();F();$s="smtp.office365.com",hs=587});async function on(t,n,e){let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{let r=n.match(/^\/plan-classe\/(\d+)$/);if(r){let m=r[1];if(t.method==="GET"){let E=await o.query("SELECT * FROM plan_classe WHERE classe_id=$1",[m]);if(!E.rows[0])return s(e,{positions:{}});let p=typeof E.rows[0].positions=="string"?JSON.parse(E.rows[0].positions):E.rows[0].positions||{};return s(e,{positions:p})}if(t.method==="POST"){let E=await y(t),{positions:p}=E;return await o.query(`INSERT INTO plan_classe (classe_id, positions, updated_at) VALUES ($1,$2,NOW())
           ON CONFLICT (classe_id) DO UPDATE SET positions=$2, updated_at=NOW()`,[m,JSON.stringify(p)]),s(e,{message:"Plan sauvegard\xE9"})}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("plan-classe-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:m},500)}finally{await o.end()}}var un=M(()=>{U();F()});function ln(t){if(t==null||t==="")return null;let n=Array.isArray(t)?t.map(e=>String(e).trim()).filter(Boolean):String(t).split(",").map(e=>e.trim()).filter(Boolean);return n.length?n.join(","):null}function cn(t,n){return String(t.id)===String(n)||t.role==="admin"}function Ce(t){return t===!1||t===0||t==="false"||t==="indispo"}function Ss(t){return t?.eviter===!0||t?.eviter===1||t?.eviter==="true"||t?.statut==="eviter"||t?.disponible==="eviter"}async function dn(t,n,e,i){let f=await A(t),o=C(f,e,n);if(o)return o;let r=b();try{if(n==="/planning/creneaux"&&t.method==="GET"){let a=await r.query("SELECT * FROM creneaux ORDER BY "+fe+", ordre");return s(e,a.rows)}if(n==="/planning/disponibilites"&&t.method==="GET"){let a=await r.query("SELECT prof_id, creneau_id, disponible, eviter FROM disponibilites");return s(e,a.rows)}let m=n.match(/^\/planning\/disponibilites\/(\d+)\/remarque$/);if(m){let a=m[1];if(t.method==="GET")try{let _=await r.query("SELECT remarque_disponibilites FROM utilisateurs WHERE id=$1",[a]);return _.rows.length===0?s(e,{message:"Professeur non trouv\xE9"},404):s(e,{remarque:_.rows[0].remarque_disponibilites||""})}catch(_){let c=_ instanceof Error?_.message:"Erreur";return s(e,{message:c},500)}if(t.method==="POST"){if(!cn(f,a))return s(e,{message:"Acc\xE8s refus\xE9"},403);try{let _=await y(t),c=typeof _?.remarque=="string"?_.remarque:"";return(await r.query("UPDATE utilisateurs SET remarque_disponibilites=$1 WHERE id=$2 RETURNING id",[c,a])).rows.length===0?s(e,{message:"Professeur non trouv\xE9"},404):s(e,{message:"Remarque sauvegard\xE9e"})}catch(_){let c=_ instanceof Error?_.message:"Erreur";return s(e,{message:c},500)}}}let E=n.match(/^\/planning\/disponibilites\/(\d+)$/);if(E){let a=E[1];if(t.method==="GET"){let _=await r.query("SELECT creneau_id, disponible, eviter FROM disponibilites WHERE prof_id=$1",[a]);return s(e,_.rows)}if(t.method==="POST"){if(!cn(f,a))return s(e,{message:"Acc\xE8s refus\xE9"},403);let _=await y(t),{disponibilites:c}=_,T=Number(a);if(!Number.isInteger(T)||T<=0)return s(e,{message:"prof_id invalide"},400);let R=Array.isArray(c)?c:[],w=[...new Set(R.filter(h=>h&&Ce(h.disponible)).map(h=>Number(h.creneau_id)).filter(h=>Number.isInteger(h)&&h>0))],$;try{$=await r.connect(),await $.query("BEGIN"),await $.query("DELETE FROM disponibilites WHERE prof_id=$1",[T]);for(let O of R){let N=O,S=Number(N?.creneau_id);if(!Number.isInteger(S)||S<=0)continue;let v=!Ce(N.disponible)&&Ss(N);await $.query("INSERT INTO disponibilites (prof_id, creneau_id, disponible, eviter) VALUES ($1,$2,$3,$4)",[T,S,!Ce(N.disponible),v])}let h=0;return w.length&&(h=(await $.query("DELETE FROM affectations WHERE prof_id = $1 AND creneau_id = ANY($2::int[])",[T,w])).rowCount||0),await $.query("COMMIT"),s(e,{message:"Sauvegard\xE9",affectations_supprimees:h})}catch(h){if($)try{await $.query("ROLLBACK")}catch{}let O=h instanceof Error?h.message:"Erreur";return s(e,{message:O},500)}finally{$&&$.release()}}}if(n==="/planning/pools"&&t.method==="GET"){let a=await r.query("SELECT id, nom, site, couleur, horaires, niveau, ordre FROM pools ORDER BY COALESCE(ordre, 0), nom"),_=[];for(let c of a.rows){let T=await r.query("SELECT u.id, u.nom, u.prenom, u.taux_activite, u.periodes_semaine, u.niveau_prefere, u.lieu_travail_prefere, u.branches_specialites FROM utilisateurs u JOIN pool_profs pp ON pp.prof_id=u.id WHERE pp.pool_id=$1",[c.id]),R=await r.query("SELECT c.id, c.nom, c.niveau FROM classes c JOIN pool_classes pc ON pc.classe_id=c.id WHERE pc.pool_id=$1",[c.id]),w=await r.query("SELECT m.id, m.nom, m.periodes_semaine FROM matieres m JOIN pool_branches pb ON pb.matiere_id=m.id WHERE pb.pool_id=$1",[c.id]);_.push({...c,profs:T.rows,classes:R.rows,branches:w.rows})}return s(e,_)}if(n==="/planning/pools"&&t.method==="POST"){let a=L(f,e);if(a)return a;let _=await y(t),{nom:c,site:T,couleur:R,prof_ids:w,classe_ids:$,branche_ids:h,horaires:O,niveau:N}=_;try{let S=ln(N),I=(await r.query("INSERT INTO pools (nom, site, couleur, horaires, niveau) VALUES ($1,$2,$3,$4,$5) RETURNING *",[c,T||"",R||"#6366f1",JSON.stringify(O||[]),S])).rows[0];for(let P of w||[])await r.query("INSERT INTO pool_profs (pool_id, prof_id) VALUES ($1,$2)",[I.id,P]);for(let P of $||[])await r.query("INSERT INTO pool_classes (pool_id, classe_id) VALUES ($1,$2)",[I.id,P]);for(let P of h||[])await r.query("INSERT INTO pool_branches (pool_id, matiere_id) VALUES ($1,$2)",[I.id,P]);return s(e,I)}catch(S){let v=S instanceof Error?S.message:"Erreur";return s(e,{message:v},500)}}let p=n.match(/^\/planning\/pools\/(\d+)$/);if(p){let a=p[1];if(t.method==="PUT"){let _=L(f,e);if(_)return _;let c=await y(t),{nom:T,site:R,couleur:w,prof_ids:$,classe_ids:h,branche_ids:O,horaires:N,niveau:S,ordre:v}=c;try{let I=await r.query("SELECT prof_id FROM pool_profs WHERE pool_id=$1",[a]),P=await r.query("SELECT classe_id FROM pool_classes WHERE pool_id=$1",[a]),q=I.rows.map(D=>Number(D.prof_id)),k=P.rows.map(D=>Number(D.classe_id)),H=($||[]).map(D=>Number(D)),W=q.filter(D=>!H.includes(D));W.length&&k.length&&await r.query("DELETE FROM affectations WHERE prof_id = ANY($1::int[]) AND classe_id = ANY($2::int[])",[W,k]);let B=ln(S);await r.query("UPDATE pools SET nom=$1, site=$2, couleur=$3, horaires=$4, niveau=$5, ordre=$6 WHERE id=$7",[T,R||"",w,JSON.stringify(N||[]),B,v!==void 0?v:0,a]),await r.query("DELETE FROM pool_profs WHERE pool_id=$1",[a]),await r.query("DELETE FROM pool_classes WHERE pool_id=$1",[a]),await r.query("DELETE FROM pool_branches WHERE pool_id=$1",[a]);for(let D of $||[])await r.query("INSERT INTO pool_profs (pool_id, prof_id) VALUES ($1,$2)",[a,D]);for(let D of h||[])await r.query("INSERT INTO pool_classes (pool_id, classe_id) VALUES ($1,$2)",[a,D]);for(let D of O||[])await r.query("INSERT INTO pool_branches (pool_id, matiere_id) VALUES ($1,$2)",[a,D]);return s(e,{message:"Pool mis \xE0 jour"})}catch(I){let P=I instanceof Error?I.message:"Erreur";return s(e,{message:P},500)}}if(t.method==="DELETE"){let _=L(f,e);return _||(await r.query("DELETE FROM pools WHERE id=$1",[a]),s(e,{message:"Supprim\xE9"}))}}if(n==="/planning/classe-horaires"&&t.method==="GET"){let a=await r.query("SELECT * FROM classe_horaires");return s(e,a.rows)}let u=n.match(/^\/planning\/classe-horaires\/(\d+)$/);if(u){let a=u[1];if(t.method==="GET"){let _=await r.query("SELECT jour, periode FROM classe_horaires WHERE classe_id=$1",[a]);return s(e,_.rows)}if(t.method==="POST"){let _=await y(t),{horaires:c}=_;try{await r.query("DELETE FROM classe_horaires WHERE classe_id=$1",[a]);for(let T of c)await r.query("INSERT INTO classe_horaires (classe_id, jour, periode) VALUES ($1,$2,$3)",[a,T.jour,T.periode]);return s(e,{message:"Sauvegard\xE9"})}catch(T){let R=T instanceof Error?T.message:"Erreur";return s(e,{message:R},500)}}}if(n==="/planning/classe-couleurs"&&t.method==="GET")try{let a=await r.query("SELECT classe_id, couleur FROM classe_couleurs");return s(e,a.rows)}catch(a){let _=a instanceof Error?a.message:"Erreur";return s(e,{message:_},500)}if(n==="/planning/classe-couleurs"&&t.method==="POST"){let a=L(f,e);if(a)return a;let _=await y(t),{classe_id:c,couleur:T}=_||{};if(!c||!T)return s(e,{message:"classe_id et couleur requis"},400);try{let R=await r.query(`
          INSERT INTO classe_couleurs (classe_id, couleur, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (classe_id) DO UPDATE SET couleur=$2, updated_at=NOW()
          RETURNING classe_id, couleur
        `,[c,T]);return s(e,R.rows[0])}catch(R){let w=R instanceof Error?R.message:"Erreur";return s(e,{message:w},500)}}if(n==="/planning/prof-couleurs"&&t.method==="GET")try{let a=await r.query("SELECT prof_id, couleur FROM prof_couleurs");return s(e,a.rows)}catch(a){let _=a instanceof Error?a.message:"Erreur";return s(e,{message:_},500)}if(n==="/planning/prof-couleurs"&&t.method==="POST"){let a=L(f,e);if(a)return a;let _=await y(t),{prof_id:c,couleur:T}=_||{};if(!c||!T)return s(e,{message:"prof_id et couleur requis"},400);try{let R=await r.query(`
          INSERT INTO prof_couleurs (prof_id, couleur, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (prof_id) DO UPDATE SET couleur=$2, updated_at=NOW()
          RETURNING prof_id, couleur
        `,[c,T]);return s(e,R.rows[0])}catch(R){let w=R instanceof Error?R.message:"Erreur";return s(e,{message:w},500)}}if(n==="/planning/branche-couleurs"&&t.method==="GET")try{let a=await r.query("SELECT matiere_id, couleur FROM branche_couleurs");return s(e,a.rows)}catch(a){let _=a instanceof Error?a.message:"Erreur";return s(e,{message:_},500)}if(n==="/planning/branche-couleurs"&&t.method==="POST"){let a=L(f,e);if(a)return a;let _=await y(t),{matiere_id:c,couleur:T}=_||{};if(!c||!T)return s(e,{message:"matiere_id et couleur requis"},400);try{let R=await r.query(`
          INSERT INTO branche_couleurs (matiere_id, couleur, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (matiere_id) DO UPDATE SET couleur=$2, updated_at=NOW()
          RETURNING matiere_id, couleur
        `,[c,T]);return s(e,R.rows[0])}catch(R){let w=R instanceof Error?R.message:"Erreur";return s(e,{message:w},500)}}if(n==="/planning/affectations"&&t.method==="GET"){let a=await r.query(`
        SELECT a.*, u.prenom||' '||u.nom as prof_nom,
          COALESCE(c.nom, CASE
            WHEN a.type_special='titulariat' THEN 'Titulariat'
            WHEN a.type_special='atelier' THEN 'Atelier'
            WHEN a.type_special='mediation' THEN 'M\xE9diation'
            WHEN a.type_special='autre' THEN 'Autre'
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
        ORDER BY ${fe.replace("jour","cr.jour")}, cr.ordre
      `);return s(e,a.rows)}if(n==="/planning/affectations"&&t.method==="POST"){let a=L(f,e);if(a)return a;let _=await y(t),{prof_id:c,classe_id:T,matiere_id:R,creneau_id:w,type_special:$,pool_id:h}=_,O=["titulariat","atelier","mediation","autre"].includes(String($)),N=$==="soutien",S=O||N?$:null,v=O?null:T||null,I=h!=null&&h!==""?Number(h):null;(!Number.isInteger(I)||I<=0)&&(I=null);try{if(!Number.isInteger(I)&&v!=null){let q=await r.query("SELECT pool_id FROM pool_classes WHERE classe_id = $1 ORDER BY pool_id LIMIT 1",[v]);q.rows[0]?.pool_id!=null&&(I=Number(q.rows[0].pool_id))}v!=null&&await r.query(`
            DELETE FROM affectations
            WHERE creneau_id = $1
              AND classe_id = $2
              AND (
                ($3::boolean AND type_special = 'soutien')
                OR (NOT $3::boolean AND (type_special IS NULL OR type_special = ''))
              )
          `,[w,v,N]),c!=null&&await r.query("DELETE FROM affectations WHERE prof_id = $1 AND creneau_id = $2",[c,w]);let P=await r.query(`
          INSERT INTO affectations (prof_id, classe_id, matiere_id, creneau_id, type_special, pool_id)
          VALUES ($1,$2,$3,$4,$5,$6)
          RETURNING *
        `,[c||null,v,R||null,w,S,Number.isInteger(I)?I:null]);return s(e,P.rows[0])}catch(P){let q=P instanceof Error?P.message:"Erreur";return s(e,{message:q},500)}}let d=n.match(/^\/planning\/affectations\/(\d+)$/);if(d&&t.method==="DELETE"){let a=L(f,e);return a||(await r.query("DELETE FROM affectations WHERE id=$1",[d[1]]),s(e,{message:"Supprim\xE9"}))}if(n==="/planning/titulaires"&&t.method==="POST"){let a=L(f,e);if(a)return a;let _=await y(t),c=Number(_?.classe_id),T=_?.prof_id,R=T==null||String(T).trim()===""?null:Number(T);if(!Number.isInteger(c))return s(e,{message:"classe_id invalide"},400);if(R!==null&&!Number.isInteger(R))return s(e,{message:"prof_id invalide"},400);try{return(await r.query("SELECT id FROM classes WHERE id=$1",[c])).rows.length?R!==null&&!(await r.query("SELECT id FROM utilisateurs WHERE id=$1 AND role='prof'",[R])).rows.length?s(e,{message:"Professeur introuvable"},404):(await r.query("UPDATE classes SET prof_principal_id=$1 WHERE id=$2",[R,c]),s(e,{message:"Titulaire mis \xE0 jour"})):s(e,{message:"Classe introuvable"},404)}catch(w){let $=w instanceof Error?w.message:"Erreur";return s(e,{message:$},500)}}if(n==="/planning/planning-branches"&&t.method==="GET"){let a=i.searchParams.get("pool_id"),_="SELECT * FROM planning_branches WHERE 1=1",c=[];a&&(c.push(a),_+=" AND pool_id=$"+c.length);let T=await r.query(_,c);return s(e,T.rows)}if(n==="/planning/planning-branches"&&t.method==="POST"){let a=L(f,e);if(a)return a;let _=await y(t),{prof_id:c,classe_id:T,matiere_id:R,pool_id:w}=_;try{return await r.query(`
          INSERT INTO planning_branches (prof_id, classe_id, matiere_id, pool_id)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (classe_id, matiere_id, pool_id) DO UPDATE SET prof_id=$1
        `,[c,T,R,w]),s(e,{message:"Sauvegard\xE9"})}catch($){let h=$ instanceof Error?$.message:"Erreur";return s(e,{message:h},500)}}if(n==="/planning/planning-branches"&&t.method==="DELETE"){let a=L(f,e);if(a)return a;let _=await y(t);return await r.query("DELETE FROM planning_branches WHERE classe_id=$1 AND matiere_id=$2 AND pool_id=$3",[_.classe_id,_.matiere_id,_.pool_id]),s(e,{message:"Supprim\xE9"})}if(n==="/planning/general"&&t.method==="GET")try{let a=i.searchParams.get("pool_id"),_="SELECT id, nom, prenom FROM utilisateurs WHERE role='prof' ORDER BY nom",c=[];a&&(_="SELECT u.id,u.nom,u.prenom FROM utilisateurs u JOIN pool_profs pp ON pp.prof_id=u.id WHERE pp.pool_id=$1 ORDER BY u.nom",c=[a]);let T=await r.query(_,c),R=await r.query("SELECT * FROM creneaux ORDER BY "+fe+", ordre"),w,$;a?(w=await r.query(`
        SELECT a.prof_id, a.creneau_id, a.matiere_id, a.classe_id, a.type_special, a.pool_id,
          COALESCE(c.nom, CASE
            WHEN a.type_special='titulariat' THEN 'Titulariat'
            WHEN a.type_special='atelier' THEN 'Atelier'
            WHEN a.type_special='mediation' THEN 'M\xE9diation'
            WHEN a.type_special='autre' THEN 'Autre'
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
      `,[a]),$=await r.query(`
        SELECT d.prof_id, d.creneau_id, d.disponible, d.eviter
        FROM disponibilites d
        JOIN pool_profs pp ON pp.prof_id = d.prof_id AND pp.pool_id = $1
      `,[a])):(w=await r.query(`
        SELECT a.prof_id, a.creneau_id, a.matiere_id, a.classe_id, a.type_special, a.pool_id,
          COALESCE(c.nom, CASE
            WHEN a.type_special='titulariat' THEN 'Titulariat'
            WHEN a.type_special='atelier' THEN 'Atelier'
            WHEN a.type_special='mediation' THEN 'M\xE9diation'
            WHEN a.type_special='autre' THEN 'Autre'
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
      `),$=await r.query("SELECT prof_id,creneau_id,disponible,eviter FROM disponibilites"));let h=a?await r.query(`
          SELECT c.id as classe_id, c.nom as classe_nom, u.id as prof_id, u.prenom||' '||u.nom as prof_nom
          FROM classes c
          JOIN pool_classes pc ON pc.classe_id = c.id AND pc.pool_id = $1
          LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
          ORDER BY c.nom
        `,[a]):await r.query(`
          SELECT c.id as classe_id, c.nom as classe_nom, u.id as prof_id, u.prenom||' '||u.nom as prof_nom
          FROM classes c
          LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id
          ORDER BY c.nom
        `);return s(e,{profs:T.rows||[],creneaux:R.rows||[],affectations:w.rows||[],dispos:$.rows||[],titulaires:h.rows||[]})}catch(a){console.error("getPlanningGeneral:",a);let _=a instanceof Error?a.message:"Erreur planning g\xE9n\xE9ral";return s(e,{message:_},500)}let l=n.match(/^\/planning\/prof\/(\d+)$/);if(l&&t.method==="GET"){let a=l[1],_=await r.query("SELECT id,nom,prenom FROM utilisateurs WHERE id=$1",[a]),c=await r.query("SELECT nom FROM classes WHERE prof_principal_id=$1",[a]),T=await r.query("SELECT * FROM creneaux ORDER BY "+fe+", ordre"),R=await r.query(`
    SELECT a.creneau_id, a.matiere_id, a.classe_id, a.type_special, a.pool_id,
      COALESCE(c.nom, CASE
        WHEN a.type_special='titulariat' THEN 'Titulariat'
        WHEN a.type_special='atelier' THEN 'Atelier'
        WHEN a.type_special='mediation' THEN 'M\xE9diation'
        WHEN a.type_special='autre' THEN 'Autre'
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
  `,[a]),w=await r.query(`
    SELECT p.id, p.nom, p.site
    FROM pools p
    JOIN pool_profs pp ON pp.pool_id = p.id
    WHERE pp.prof_id = $1
    ORDER BY p.nom
  `,[a]),$=await r.query("SELECT creneau_id,disponible,eviter FROM disponibilites WHERE prof_id=$1",[a]);return s(e,{prof:_.rows[0],creneaux:T.rows,affectations:R.rows,dispos:$.rows,classesTitulaire:c.rows,pools:w.rows})}let g=n.match(/^\/planning\/classe\/(\d+)$/);if(g&&t.method==="GET"){let a=g[1],_=i.searchParams.get("pool_id"),c=await r.query("SELECT c.id, c.nom, u.prenom||' '||u.nom as titulaire_nom FROM classes c LEFT JOIN utilisateurs u ON u.id=c.prof_principal_id WHERE c.id=$1",[a]),T=await r.query("SELECT * FROM creneaux ORDER BY "+fe+", ordre"),R=await r.query(`
    SELECT a.id, a.creneau_id, a.prof_id, a.matiere_id, a.type_special, a.pool_id,
      u.prenom||' '||u.nom as prof_nom, m.nom as matiere_nom
    FROM affectations a
    JOIN utilisateurs u ON u.id=a.prof_id
    LEFT JOIN matieres m ON m.id=a.matiere_id
    WHERE a.classe_id=$1
    ORDER BY CASE WHEN a.type_special = 'soutien' THEN 1 ELSE 0 END, a.id
  `,[a]),w=await r.query("SELECT jour,periode FROM classe_horaires WHERE classe_id=$1",[a]),$=[];return _&&($=(await r.query(`
      SELECT pb.prof_id, pb.matiere_id, m.nom as matiere_nom, m.periodes_semaine,
        u.prenom||' '||u.nom as prof_nom
      FROM planning_branches pb
      JOIN matieres m ON m.id=pb.matiere_id
      LEFT JOIN utilisateurs u ON u.id=pb.prof_id
      WHERE pb.classe_id=$1 AND pb.pool_id=$2
    `,[a,_])).rows),s(e,{classe:c.rows[0],creneaux:T.rows,affectations:R.rows,horaires:w.rows,branches:$})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(m){console.error("planning-fast error:",m);let E=m instanceof Error?m.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:E},500)}finally{await r.end()}}var fe,mn=M(()=>{U();F();fe="CASE jour WHEN 'Lundi' THEN 1 WHEN 'Mardi' THEN 2 WHEN 'Mercredi' THEN 3 WHEN 'Jeudi' THEN 4 WHEN 'Vendredi' THEN 5 END"});async function pn(t,n,e,i){let f=await A(t),o=C(f,e,n);if(o)return o;let r=b();try{if(n==="/presences/classes"&&t.method==="GET"){if(f.role==="admin"){let E=await r.query(`
          SELECT id, nom, niveau, annee_scolaire
          FROM classes
          WHERE actif IS DISTINCT FROM false
          ORDER BY nom
        `);return s(e,E.rows)}let m=await r.query(`
        SELECT DISTINCT c.id, c.nom, c.niveau, c.annee_scolaire
        FROM classes c
        LEFT JOIN affectations a ON a.classe_id = c.id AND a.prof_id = $1
        LEFT JOIN emploi_du_temps et ON et.classe_id = c.id AND et.prof_id = $1
        WHERE c.prof_principal_id = $1
           OR a.id IS NOT NULL
           OR et.id IS NOT NULL
        ORDER BY c.nom
      `,[f.id]);return s(e,m.rows)}if(n==="/presences"&&t.method==="GET"){let m=i.searchParams.get("classe_id"),E=i.searchParams.get("date"),p=await r.query(`
        SELECT pv.id, pv.eleve_id, pv.classe_id,
          TO_CHAR(pv.date, 'YYYY-MM-DD') AS date,
          pv.p1, pv.p2, pv.p3, pv.p4, pv.p5, pv.p6, pv.p7, pv.p8,
          pv.remarque, pv.valide
        FROM presences_v2 pv
        JOIN eleves e ON pv.eleve_id = e.id
        WHERE pv.classe_id = $1 AND pv.date = $2::date
      `,[m,E]);return s(e,p.rows)}if(n==="/presences/eleves"&&t.method==="GET"){let m=i.searchParams.get("classe_id"),E=await r.query(`
        SELECT e.id,
          COALESCE(u.nom, e.nom) AS nom,
          COALESCE(u.prenom, e.prenom) AS prenom
        FROM eleves e
        LEFT JOIN utilisateurs u ON e.utilisateur_id = u.id
        WHERE e.classe_id = $1
          AND LOWER(COALESCE(e.statut, 'actif')) = 'actif'
        ORDER BY COALESCE(u.nom, e.nom), COALESCE(u.prenom, e.prenom)
      `,[m]);return s(e,E.rows)}if(n==="/presences/mois"&&t.method==="GET"){let m=i.searchParams.get("classe_id"),E=i.searchParams.get("mois"),p=await r.query(`
        SELECT pv.id, pv.eleve_id, pv.classe_id,
          TO_CHAR(pv.date, 'YYYY-MM-DD') AS date,
          pv.p1, pv.p2, pv.p3, pv.p4, pv.p5, pv.p6, pv.p7, pv.p8,
          pv.remarque, pv.valide
        FROM presences_v2 pv
        JOIN eleves e ON pv.eleve_id = e.id
        WHERE pv.classe_id = $1 AND TO_CHAR(pv.date, 'YYYY-MM') = $2
      `,[m,E]);return s(e,p.rows)}if(n==="/presences/statistiques"&&t.method==="GET"){let m=i.searchParams.get("classe_id"),E=i.searchParams.get("date_debut"),p=i.searchParams.get("date_fin"),u=await r.query(`
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
      `,[m,E||null,p||null]);return s(e,u.rows)}if(n==="/presences"&&t.method==="POST"){let m=await y(t),{presences:E,date:p,classe_id:u}=m,d=await r.connect();try{await d.query("BEGIN");for(let l of E)(await d.query("SELECT id FROM presences_v2 WHERE eleve_id=$1 AND date=$2",[l.eleve_id,p])).rows.length>0?await d.query(`
              UPDATE presences_v2 SET p1=$1,p2=$2,p3=$3,p4=$4,p5=$5,p6=$6,p7=$7,p8=$8,remarque=$9,valide=$10
              WHERE eleve_id=$11 AND date=$12
            `,[l.p1,l.p2,l.p3,l.p4,l.p5,l.p6,l.p7,l.p8,l.remarque||null,l.valide||!1,l.eleve_id,p]):await d.query(`
              INSERT INTO presences_v2 (eleve_id,classe_id,date,p1,p2,p3,p4,p5,p6,p7,p8,remarque,valide)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            `,[l.eleve_id,u,p,l.p1,l.p2,l.p3,l.p4,l.p5,l.p6,l.p7,l.p8,l.remarque||null,l.valide||!1]);return await d.query("COMMIT"),s(e,{message:"Presences enregistrees"})}catch(l){throw await d.query("ROLLBACK"),l}finally{d.release()}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(m){console.error("presences-fast error:",m);let E=m instanceof Error?m.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:E},500)}finally{await r.end()}}var En=M(()=>{U();F()});import De from"npm:bcryptjs@2";async function _n(t,n,e){return e===!0||e==="true"?(await t.query(`UPDATE utilisateurs
       SET mfa_exempt = true,
           mfa_enabled = false,
           mfa_secret = NULL,
           mfa_enabled_at = NULL,
           mfa_backup_codes = '[]'::jsonb
       WHERE id = $1`,[n]),!0):e===!1||e==="false"?(await t.query("UPDATE utilisateurs SET mfa_exempt = false WHERE id = $1",[n]),!1):null}async function Os(t,n){let e=await t.connect();try{if(await e.query("BEGIN"),(await e.query("SELECT id FROM utilisateurs WHERE id=$1 AND role=$2",[n,"prof"])).rows.length===0)return await e.query("ROLLBACK"),null;await e.query("UPDATE classes SET prof_principal_id=NULL WHERE prof_principal_id=$1",[n]),await e.query("UPDATE tcf_state SET updated_by=NULL WHERE updated_by=$1",[n]),await e.query("UPDATE documents_administratifs SET auteur_id=NULL WHERE auteur_id=$1",[n]),await e.query("UPDATE inventaire_branches SET auteur_id=NULL WHERE auteur_id=$1",[n]),await e.query("UPDATE observations SET auteur_id=NULL WHERE auteur_id=$1",[n]);let f=["pool","affectation","resultats"];for(let o of f){let r=await e.query("SELECT donnees FROM tcf_state WHERE cle=$1",[o]);if(!r.rows.length)continue;let m=r.rows[0].donnees,E=m.selectedBySite;if(E)for(let d of Object.keys(E))E[d]=(E[d]||[]).filter(l=>String(l)!==String(n));let p=m.poolCellOverrides;if(p)for(let d of Object.keys(p))(d.includes(`::${n}::`)||d.endsWith(`::${n}`))&&delete p[d];let u=m.rolesByPoolDemi;if(u)for(let d of Object.keys(u))delete u[d][String(n)];await e.query("UPDATE tcf_state SET donnees=$1 WHERE cle=$2",[JSON.stringify(m),o])}return await e.query("DELETE FROM affectations WHERE prof_id=$1",[n]),await e.query("DELETE FROM calendrier_prof WHERE prof_id=$1",[n]),await e.query("DELETE FROM disponibilites WHERE prof_id=$1",[n]),await e.query("DELETE FROM documents_profs WHERE prof_id=$1",[n]),await e.query("DELETE FROM emploi_du_temps WHERE prof_id=$1",[n]),await e.query("DELETE FROM evaluations WHERE prof_id=$1",[n]),await e.query("DELETE FROM messages WHERE expediteur_id=$1 OR destinataire_id=$1",[n]),await e.query("DELETE FROM notes_personnelles WHERE utilisateur_id=$1",[n]),await e.query("DELETE FROM notifications WHERE utilisateur_id=$1",[n]),await e.query("DELETE FROM planning_branches WHERE prof_id=$1",[n]),await e.query("DELETE FROM pool_profs WHERE prof_id=$1",[n]),await e.query("DELETE FROM prof_couleurs WHERE prof_id=$1",[n]),await e.query("DELETE FROM utilisateurs WHERE id=$1",[n]),await e.query("COMMIT"),null}catch(i){throw await e.query("ROLLBACK"),i}finally{e.release()}}async function gn(t,n,e){let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{if(n==="/profs"&&t.method==="GET"){let p=await o.query(`SELECT ${fn} FROM utilisateurs WHERE role=$1 ORDER BY nom, prenom`,["prof"]);return s(e,p.rows)}if(n==="/profs"&&t.method==="POST"){let p=L(i,e);if(p)return p;let u=await y(t),{nom:d,prenom:l,email:g,mot_de_passe:a,telephone:_,specialite:c,adresse:T,npa:R,lieu:w,sexe:$,taux_activite:h,periodes_semaine:O,date_naissance:N,avs:S,type_contrat:v,type_permis:I,niveau_prefere:P,branches_specialites:q,lieu_travail_prefere:k,remarque_lieu_travail:H,priorite_pref:W,type_prof:B,identifiant:D}=u;if((await o.query("SELECT id FROM utilisateurs WHERE email=$1",[g])).rows.length>0)return s(e,{message:"Email deja utilise"},400);let V=await De.hash(String(a||"EcoleManager2024!"),10),K=String(D||"").trim()||(String(l||"").slice(0,3)+String(d||"").slice(0,3)).toLowerCase()||null,te=await o.query(`INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, priorite_pref, type_prof, identifiant)
         VALUES ($1,$2,$3,$4,'prof',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING id, nom, prenom, email`,[d,l,g,V,_||null,c||null,T||null,R||null,w||null,$||null,h?parseInt(String(h)):null,O?parseInt(String(O)):null,N&&N!==""?N:null,S||null,v||null,I||null,P||null,q||null,k||null,H||null,W||"niveau",B||null,K]);return await _n(o,te.rows[0].id,u.mfa_exempt),s(e,{message:"Professeur cree",prof:te.rows[0]},201)}let r=n.match(/^\/profs\/(\d+)\/envoyer-acces$/);if(r&&t.method==="POST"){let p=L(i,e);if(p)return p;let u=r[1],d=await o.query("SELECT nom, prenom, email FROM utilisateurs WHERE id=$1 AND role=$2",[u,"prof"]);if(d.rows.length===0)return s(e,{message:"Professeur non trouv\xE9"},404);let l=d.rows[0],g="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#",a="";for(let c=0;c<10;c++)a+=g[Math.floor(Math.random()*g.length)];let _=await De.hash(a,10);return await o.query("UPDATE utilisateurs SET mot_de_passe=$1, doit_changer_mdp=true WHERE id=$2",[_,u]),await ce({to:l.email,subject:"Vos acc\xE8s Oasis",html:`
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#f8fafc;border-radius:12px">
            <h2 style="color:#6366f1">Oasis</h2>
            <p>Bonjour <b>${l.prenom} ${l.nom}</b>,</p>
            <p>Voici vos acc\xE8s pour vous connecter \xE0 l'application :</p>
            <div style="background:white;padding:20px;border-radius:8px;border-left:4px solid #6366f1;margin:20px 0">
              <p style="margin:0"><b>Email :</b> ${l.email}</p>
              <p style="margin:8px 0 0"><b>Mot de passe temporaire :</b> <code style="background:#e0e7ff;padding:4px 8px;border-radius:4px;font-size:16px">${a}</code></p>
            </div>
            <p style="color:#ef4444;font-weight:bold">\u26A0\uFE0F Vous devrez changer ce mot de passe lors de votre premi\xE8re connexion.</p>
          </div>
        `,text:`Bonjour ${l.prenom} ${l.nom}, vos acces Oasis. Email: ${l.email}. Mot de passe: ${a}.`}),s(e,{message:"Email envoy\xE9 \xE0 "+l.email})}let m=n.match(/^\/profs\/(\d+)\/documents(?:\/(\d+)(?:\/telecharger)?)?$/);if(m){let p=m[1],u=m[2],d=n.endsWith("/telecharger");if(!u&&t.method==="GET"){let l=await o.query("SELECT id, nom, type, taille, created_at FROM documents_profs WHERE prof_id=$1 ORDER BY created_at DESC",[p]);return s(e,l.rows)}if(!u&&t.method==="POST"){let l=L(i,e);if(l)return l;let g=await y(t),{nom:a,type:_,contenu:c,taille:T}=g;if(!c)return s(e,{message:"Contenu manquant"},400);if(z()){let $=(await o.query(`INSERT INTO documents_profs (prof_id, nom, type, contenu, taille, storage_path)
             VALUES ($1,$2,$3,NULL,$4,NULL) RETURNING id, nom, type, taille, created_at`,[p,a,_||"Autre",T||null])).rows[0],h=`profs/${p}/${$.id}_${se(a)}`;try{await ee(x.documentsProfs,h,String(c)),await o.query("UPDATE documents_profs SET storage_path=$1 WHERE id=$2",[h,$.id])}catch(O){throw await o.query("DELETE FROM documents_profs WHERE id=$1",[$.id]),O}return s(e,$,201)}let R=await o.query("INSERT INTO documents_profs (prof_id, nom, type, contenu, taille) VALUES ($1,$2,$3,$4,$5) RETURNING id, nom, type, taille, created_at",[p,a,_||"Autre",c,T||null]);return s(e,R.rows[0],201)}if(u&&d&&t.method==="GET"){let l=await o.query("SELECT nom, contenu, storage_path FROM documents_profs WHERE id=$1 AND prof_id=$2",[u,p]);if(l.rows.length===0)return s(e,{message:"Document non trouv\xE9"},404);let g=l.rows[0],a=await ie(g,x.documentsProfs);return a?s(e,{nom:g.nom,contenu:a}):s(e,{message:"Fichier introuvable"},404)}if(u&&!d&&t.method==="DELETE"){let l=L(i,e);if(l)return l;let g=await o.query("SELECT storage_path FROM documents_profs WHERE id=$1 AND prof_id=$2",[u,p]);return g.rows.length?(await X(x.documentsProfs,g.rows[0].storage_path),await o.query("DELETE FROM documents_profs WHERE id=$1 AND prof_id=$2",[u,p]),s(e,{message:"Document supprim\xE9"})):s(e,{message:"Document non trouv\xE9"},404)}}let E=n.match(/^\/profs\/(\d+)$/);if(E){let p=E[1];if(t.method==="GET"){let u=await o.query(`SELECT ${fn} FROM utilisateurs WHERE id=$1 AND role=$2`,[p,"prof"]);return u.rows.length===0?s(e,{message:"Professeur non trouve"},404):s(e,u.rows[0])}if(t.method==="PUT"){let u=L(i,e);if(u)return u;let d=await y(t),{nom:l,prenom:g,email:a,actif:_,mot_de_passe:c,telephone:T,specialite:R,adresse:w,npa:$,lieu:h,sexe:O,taux_activite:N,periodes_semaine:S,date_naissance:v,avs:I,type_contrat:P,type_permis:q,niveau_prefere:k,branches_specialites:H,lieu_travail_prefere:W,remarque_lieu_travail:B,priorite_pref:D,type_prof:Y,identifiant:V}=d,K,te;if(c&&String(c).trim()!==""){let Se=await De.hash(String(c),10);K="UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, mot_de_passe=$5, telephone=$6, specialite=$7, adresse=$8, npa=$9, lieu=$10, sexe=$11, taux_activite=$12, periodes_semaine=$13, date_naissance=$14, avs=$15, type_contrat=$16, type_permis=$17, niveau_prefere=$18, branches_specialites=$19, lieu_travail_prefere=$20, remarque_lieu_travail=$21, priorite_pref=$22, type_prof=$23, identifiant=$24 WHERE id=$25 AND role='prof' RETURNING id",te=[l,g,a,_!==void 0?_:!0,Se,T||null,R||null,w||null,$||null,h||null,O||null,N?parseInt(String(N)):null,S?parseInt(String(S)):null,v&&v!==""?v:null,I||null,P||null,q||null,k||null,H||null,W||null,B||null,D||"niveau",Y||null,V||null,p]}else K="UPDATE utilisateurs SET nom=$1, prenom=$2, email=$3, actif=$4, telephone=$5, specialite=$6, adresse=$7, npa=$8, lieu=$9, sexe=$10, taux_activite=$11, periodes_semaine=$12, date_naissance=$13, avs=$14, type_contrat=$15, type_permis=$16, niveau_prefere=$17, branches_specialites=$18, lieu_travail_prefere=$19, remarque_lieu_travail=$20, priorite_pref=$21, type_prof=$22, identifiant=$23 WHERE id=$24 AND role='prof' RETURNING id",te=[l,g,a,_!==void 0?_:!0,T||null,R||null,w||null,$||null,h||null,O||null,N?parseInt(String(N)):null,S?parseInt(String(S)):null,v&&v!==""?v:null,I||null,P||null,q||null,k||null,H||null,W||null,B||null,D||"niveau",Y||null,V||null,p];return(await o.query(K,te)).rows.length===0?s(e,{message:"Professeur non trouve"},404):(await _n(o,p,d.mfa_exempt),s(e,{message:"Professeur modifie"}))}if(t.method==="DELETE"){let u=L(i,e);return u||(await Os(o,p)?s(e,{message:"Professeur non trouve"},404):s(e,{message:"Professeur supprime"}))}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("profs-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await o.end()}}var fn,Rn=M(()=>{U();ye();F();le();fn="id, nom, prenom, email, actif, created_at, telephone, specialite, adresse, npa, lieu, sexe, taux_activite, periodes_semaine, date_naissance, avs, type_contrat, type_permis, niveau_prefere, branches_specialites, lieu_travail_prefere, remarque_lieu_travail, priorite_pref, type_prof, identifiant, mfa_enabled, mfa_exempt"});import{randomBytes as vs}from"node:crypto";async function Ie(t,n){let e=await t.query("SELECT * FROM sondages WHERE id = $1",[n]);if(e.rows.length===0)return null;let i=e.rows[0],f=await t.query("SELECT id, ordre, type, libelle, options, obligatoire FROM sondage_questions WHERE sondage_id = $1 ORDER BY ordre ASC, id ASC",[n]);return{...i,questions:f.rows.map(o=>({...o,options:o.options||[]}))}}function Tn(t){return Array.isArray(t)?t.map((n,e)=>{let i=n,f=String(i.type||"texte");if(!Ls.has(f))throw new Error(`Type de question invalide: ${f}`);let o=Array.isArray(i.options)?i.options.map(r=>String(r).trim()).filter(Boolean):[];if(f==="choix_unique"||f==="choix_multiple"){if(o.length<2)throw new Error("Les questions \xE0 choix n\xE9cessitent au moins 2 options")}else o=[];return{ordre:e,type:f,libelle:String(i.libelle||"").trim()||"Question sans titre",options:o,obligatoire:!!i.obligatoire}}):[]}function As(t,n){let e={},i=n&&typeof n=="object"?n:{};for(let f of t){let o=String(f.id),r=i[o]!==void 0?i[o]:i[f.id];if(f.obligatoire){if(r==null||r==="")throw new Error(`R\xE9ponse obligatoire manquante : ${f.libelle}`);if(Array.isArray(r)&&r.length===0)throw new Error(`R\xE9ponse obligatoire manquante : ${f.libelle}`)}if(r==null||r==="")continue;let m=Array.isArray(f.options)?f.options.map(String):[];if(f.type==="texte"||f.type==="paragraphe"){let E=String(r).trim();if(!E&&f.obligatoire)throw new Error(`R\xE9ponse obligatoire : ${f.libelle}`);E&&(e[o]=E.slice(0,f.type==="paragraphe"?8e3:500))}else if(f.type==="choix_unique"){let E=String(r).trim();if(!m.includes(E))throw new Error(`Choix invalide pour : ${f.libelle}`);e[o]=E}else if(f.type==="choix_multiple"){let p=(Array.isArray(r)?r:[r]).map(u=>String(u).trim()).filter(Boolean);for(let u of p)if(!m.includes(u))throw new Error(`Option invalide pour : ${f.libelle}`);if(f.obligatoire&&p.length===0)throw new Error(`R\xE9ponse obligatoire : ${f.libelle}`);p.length&&(e[o]=p)}}return e}async function wn(t,n,e){let i=b();try{let f=n.match(/^\/sondages\/public\/([^/]+)$/);if(f&&t.method==="GET"){let u=String(f[1]||"").trim();if(!u||u.length>80)return s(e,{message:"Lien invalide"},400);let d=await i.query("SELECT id, titre, description, actif, accepte_reponses FROM sondages WHERE public_token = $1",[u]);if(d.rows.length===0)return s(e,{message:"Formulaire introuvable"},404);let l=d.rows[0];if(!l.actif)return s(e,{message:"Ce formulaire n'est plus disponible"},403);if(!l.accepte_reponses)return s(e,{message:"Les r\xE9ponses ne sont plus accept\xE9es"},403);let g=await i.query("SELECT id, ordre, type, libelle, options, obligatoire FROM sondage_questions WHERE sondage_id = $1 ORDER BY ordre ASC, id ASC",[l.id]);return s(e,{titre:l.titre,description:l.description,questions:g.rows.map(a=>({...a,options:a.options||[]}))})}let o=n.match(/^\/sondages\/public\/([^/]+)\/repondre$/);if(o&&t.method==="POST")try{let u=String(o[1]||"").trim();if(!u||u.length>80)return s(e,{message:"Lien invalide"},400);let d=await i.query("SELECT id, actif, accepte_reponses FROM sondages WHERE public_token = $1",[u]);if(d.rows.length===0)return s(e,{message:"Formulaire introuvable"},404);let l=d.rows[0];if(!l.actif)return s(e,{message:"Ce formulaire n'est plus disponible"},403);if(!l.accepte_reponses)return s(e,{message:"Les r\xE9ponses ne sont plus accept\xE9es"},403);let a=(await i.query("SELECT id, ordre, type, libelle, options, obligatoire FROM sondage_questions WHERE sondage_id = $1 ORDER BY ordre ASC, id ASC",[l.id])).rows.map(w=>({...w,options:w.options||[]}));if(a.length===0)return s(e,{message:"Ce formulaire n'a aucune question"},400);let _=await y(t),c=_.reponses!==void 0?_.reponses:_,T=As(a,c),R=await i.query("INSERT INTO sondage_reponses (sondage_id, reponses) VALUES ($1, $2::jsonb) RETURNING id, submitted_at",[l.id,JSON.stringify(T)]);return s(e,{ok:!0,id:R.rows[0].id,submitted_at:R.rows[0].submitted_at},201)}catch(u){let d=u instanceof Error?u.message:"Erreur envoi";return s(e,{message:d},400)}let r=await A(t),m=C(r,e,n);if(m)return m;if(n==="/sondages"&&t.method==="GET"){let u=await i.query(`
        SELECT s.id, s.titre, s.description, s.public_token, s.actif, s.accepte_reponses, s.created_at, s.updated_at,
          (SELECT COUNT(*)::int FROM sondage_reponses r WHERE r.sondage_id = s.id) AS nb_reponses
        FROM sondages s
        ORDER BY s.updated_at DESC NULLS LAST, s.id DESC
      `);return s(e,u.rows)}if(n==="/sondages"&&t.method==="POST"){let u=await i.connect();try{let d=await y(t),{titre:l,description:g,questions:a}=d,_=Tn(a),c=bs();await u.query("BEGIN");let R=(await u.query(`INSERT INTO sondages (titre, description, public_token, created_by)
           VALUES ($1, $2, $3, $4) RETURNING id`,[String(l||"Nouveau sondage").slice(0,500),g||null,c,r?.id||null])).rows[0].id;for(let $ of _)await u.query(`INSERT INTO sondage_questions (sondage_id, ordre, type, libelle, options, obligatoire)
             VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,[R,$.ordre,$.type,$.libelle,JSON.stringify($.options),$.obligatoire]);await u.query("COMMIT");let w=await Ie(i,R);return s(e,w,201)}catch(d){await u.query("ROLLBACK");let l=d instanceof Error?d.message:"Erreur cr\xE9ation";return s(e,{message:l},400)}finally{u.release()}}let E=n.match(/^\/sondages\/(\d+)\/reponses$/);if(E&&t.method==="GET"){let u=parseInt(E[1],10);if(!u)return s(e,{message:"Identifiant invalide"},400);let d=await i.query("SELECT id, reponses, submitted_at FROM sondage_reponses WHERE sondage_id = $1 ORDER BY submitted_at DESC LIMIT 1000",[u]);return s(e,d.rows)}let p=n.match(/^\/sondages\/(\d+)$/);if(p){let u=parseInt(p[1],10);if(!u)return s(e,{message:"Identifiant invalide"},400);if(t.method==="GET"){let d=await Ie(i,u);return d?s(e,d):s(e,{message:"Sondage introuvable"},404)}if(t.method==="PUT"){let d=await i.connect();try{let l=await d.query("SELECT id, titre, description, actif, accepte_reponses FROM sondages WHERE id = $1",[u]);if(l.rows.length===0)return s(e,{message:"Sondage introuvable"},404);let g=l.rows[0],a=await y(t),{titre:_,description:c,actif:T,accepte_reponses:R,questions:w}=a,$=w!==void 0?Tn(w):null,h=_!==void 0?String(_).slice(0,500):g.titre,O=c!==void 0?c:g.description,N=T!==void 0?!!T:g.actif,S=R!==void 0?!!R:g.accepte_reponses;if(await d.query("BEGIN"),await d.query("UPDATE sondages SET titre = $2, description = $3, actif = $4, accepte_reponses = $5, updated_at = NOW() WHERE id = $1",[u,h,O,N,S]),$!==null){await d.query("DELETE FROM sondage_questions WHERE sondage_id = $1",[u]);for(let v of $)await d.query(`INSERT INTO sondage_questions (sondage_id, ordre, type, libelle, options, obligatoire)
                 VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,[u,v.ordre,v.type,v.libelle,JSON.stringify(v.options),v.obligatoire])}return await d.query("COMMIT"),s(e,await Ie(i,u))}catch(l){await d.query("ROLLBACK");let g=l instanceof Error?l.message:"Erreur mise \xE0 jour";return s(e,{message:g},400)}finally{d.release()}}if(t.method==="DELETE")return await i.query("DELETE FROM sondages WHERE id = $1",[u]),s(e,{ok:!0})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(f){console.error("sondages-fast error:",f);let o=f instanceof Error?f.message:"Erreur serveur";return s(e,{message:o},500)}finally{await i.end()}}var Ls,bs,$n=M(()=>{U();F();Ls=new Set(["texte","paragraphe","choix_unique","choix_multiple"]),bs=()=>vs(24).toString("hex")});async function hn(t,n,e,i){let f=await A(t),o=C(f,e,n);if(o)return o;let r=b();try{if(n==="/sorties"&&t.method==="GET"){let E=i.searchParams.get("type"),p="SELECT * FROM sorties_scolaires",u=[];E&&(p+=" WHERE type = $1",u.push(E)),p+=" ORDER BY date_sortie DESC, created_at DESC";let d=await r.query(p,u);return s(e,d.rows)}if(n==="/sorties"&&t.method==="POST"){let E=await y(t),{type:p,classes_ids:u,classes_noms:d,titulaires:l,autres_accompagnants:g,date_sortie:a,destination:_,activites:c,lieu_depart:T,heure_depart:R,lieu_retour:w,heure_retour:$,budget:h,commentaires:O,approuve:N}=E,S=await r.query(`INSERT INTO sorties_scolaires (type, classes_ids, classes_noms, titulaires, autres_accompagnants, date_sortie, destination, activites, lieu_depart, heure_depart, lieu_retour, heure_retour, budget, commentaires, approuve)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,[p,u||null,d||null,l,g,a||null,_,c,T,R||null,w,$||null,h||null,O,N||!1]);return s(e,S.rows[0])}let m=n.match(/^\/sorties\/(\d+)$/);if(m){let E=m[1];if(t.method==="PUT"){let p=await y(t),{type:u,classes_ids:d,classes_noms:l,titulaires:g,autres_accompagnants:a,date_sortie:_,destination:c,activites:T,lieu_depart:R,heure_depart:w,lieu_retour:$,heure_retour:h,budget:O,commentaires:N,approuve:S}=p,v=await r.query(`UPDATE sorties_scolaires SET type=$1, classes_ids=$2, classes_noms=$3, titulaires=$4, autres_accompagnants=$5, date_sortie=$6, destination=$7, activites=$8, lieu_depart=$9, heure_depart=$10, lieu_retour=$11, heure_retour=$12, budget=$13, commentaires=$14, approuve=$15
           WHERE id=$16 RETURNING *`,[u,d||null,l||null,g,a,_||null,c,T,R,w||null,$,h||null,O||null,N,S||!1,E]);return s(e,v.rows[0])}if(t.method==="DELETE")return await r.query("DELETE FROM sorties_scolaires WHERE id=$1",[E]),s(e,{message:"Supprim\xE9"})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(m){console.error("sorties-fast error:",m);let E=m instanceof Error?m.message:"Erreur serveur";return s(e,{message:E},500)}finally{await r.end()}}var yn=M(()=>{U();F()});async function J(t,n,e=[],i=[]){try{return await t.query(n,e)}catch{return{rows:i}}}async function Nn(t,n,e){if(n!=="/statistiques"||t.method!=="GET")return s(e,{message:"Route non trouv\xE9e"},404);let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{let r=i.role==="admin",m=[];r||(m=(await J(o,`
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
      `,[i.id])).rows.map(v=>v.classe_id));let E=await J(o,"SELECT COUNT(*) FROM eleves WHERE statut='actif'",[],[{count:0}]),p=await J(o,"SELECT COUNT(*) FROM utilisateurs WHERE role='prof'",[],[{count:0}]),u=await J(o,"SELECT COUNT(*) FROM classes",[],[{count:0}]),d=await J(o,"SELECT COUNT(*) FROM matieres",[],[{count:0}]),l=await J(o,`
      SELECT
        COUNT(CASE WHEN statut='present' THEN 1 END) as presents,
        COUNT(CASE WHEN statut='absent' THEN 1 END) as absents,
        COUNT(CASE WHEN statut='retard' THEN 1 END) as retards,
        COUNT(*) as total
      FROM presences WHERE date = CURRENT_DATE
    `,[],[{presents:0,absents:0,retards:0,total:0}]),g=await J(o,`
      SELECT
        COALESCE(SUM(CASE WHEN statut='paye' THEN montant END), 0) as encaisse,
        COALESCE(SUM(CASE WHEN statut='en_attente' THEN montant END), 0) as en_attente,
        COALESCE(SUM(CASE WHEN statut='en_retard' THEN montant END), 0) as en_retard
      FROM paiements
    `,[],[{encaisse:0,en_attente:0,en_retard:0}]),a=await J(o,`
      SELECT c.nom as classe,
        ROUND(AVG(n.valeur)::numeric, 2) as moyenne
      FROM notes n
      JOIN evaluations ev ON n.evaluation_id = ev.id
      JOIN classes c ON ev.classe_id = c.id
      WHERE n.absent = false AND n.dispense = false AND n.valeur IS NOT NULL
      GROUP BY c.nom
      ORDER BY c.nom
    `),_=await J(o,`
      SELECT c.nom as classe,
        COUNT(CASE WHEN p.statut='absent' THEN 1 END) as absents,
        COUNT(p.id) as total
      FROM presences p
      JOIN eleves e ON p.eleve_id = e.id
      JOIN classes c ON e.classe_id = c.id
      GROUP BY c.nom
      ORDER BY c.nom
    `),c=await J(o,`
      SELECT c.nom as classe, COUNT(e.id) as nb
      FROM classes c
      LEFT JOIN eleves e ON e.classe_id = c.id AND e.statut = 'actif'
      GROUP BY c.nom
      ORDER BY c.nom
    `),T=await J(o,`
      SELECT titre, date_debut, type, couleur
      FROM calendrier
      WHERE date_debut >= CURRENT_DATE
        AND (categorie IS NULL OR categorie NOT IN ('particulier', 'retenue', 'evaluation'))
      ORDER BY date_debut
      LIMIT 5
    `),R=Cs[new Date().getDay()],w=await J(o,`
      SELECT id, jour, heure_debut, heure_fin, periode, ordre
      FROM creneaux
      WHERE jour = $1 AND heure_debut <= CURRENT_TIME AND heure_fin >= CURRENT_TIME
      ORDER BY ordre
      LIMIT 1
    `,[R],[]),$=await J(o,`
      SELECT DISTINCT c.id, c.nom
      FROM affectations a
      JOIN classes c ON c.id = a.classe_id
      JOIN creneaux cr ON cr.id = a.creneau_id
      WHERE cr.jour = $1
      ${r?"":"AND a.prof_id = $2"}
      ORDER BY c.nom
    `,r?[R]:[R,i.id],[]),h={jour:R,creneau_en_cours:null,classes_en_cours:[],classes_du_jour:$.rows};if(w.rows.length>0){let S=w.rows[0],v=await J(o,`
        SELECT DISTINCT c.id, c.nom
        FROM affectations a
        JOIN classes c ON c.id = a.classe_id
        WHERE a.creneau_id = $1
        ${r?"":"AND a.prof_id = $2"}
        ORDER BY c.nom
      `,r?[S.id]:[S.id,i.id],[]),I=[];for(let P of v.rows){let k=(await J(o,`
          SELECT
            e.id,
            u.nom, u.prenom,
            pv.p1, pv.p2, pv.p3, pv.p4, pv.p5, pv.p6, pv.p7, pv.p8
          FROM eleves e
          LEFT JOIN utilisateurs u ON u.id = e.utilisateur_id
          LEFT JOIN presences_v2 pv ON pv.eleve_id = e.id AND pv.date = CURRENT_DATE
          WHERE e.classe_id = $1 AND LOWER(COALESCE(e.statut, 'actif')) = 'actif'
          ORDER BY u.nom, u.prenom
        `,[P.id],[])).rows.map(H=>{let W=H.p1||H.p2||H.p3||H.p4||H.p5||H.p6||H.p7||H.p8||"";return{id:H.id,nom:H.nom,prenom:H.prenom,statut:W}});I.push({id:P.id,nom:P.nom,eleves:k})}h={jour:R,creneau_en_cours:S,classes_en_cours:I,classes_du_jour:$.rows}}let O=[];if(r||m.length>0){let S=[],v="";r||(S.push(m),v=" AND ev.classe_id = ANY($1::int[])"),O=(await J(o,`
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
        WHERE 1=1 ${v}
        ORDER BY n.created_at DESC
        LIMIT 3
      `,S)).rows}let N=[];if(r||m.length>0){let S=[],v="";r||(S.push(m),v=" AND e.classe_id = ANY($1::int[])"),N=(await J(o,`
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
        WHERE 1=1 ${v}
        ORDER BY o.created_at DESC
        LIMIT 3
      `,S)).rows}return s(e,{nb_eleves:parseInt(String(E.rows[0].count)),nb_profs:parseInt(String(p.rows[0].count)),nb_classes:parseInt(String(u.rows[0].count)),nb_branches:parseInt(String(d.rows[0].count)),presences_aujourd:l.rows[0],paiements:g.rows[0],moyennes_par_classe:a.rows,absences_par_classe:_.rows,eleves_par_classe:c.rows,prochains_evenements:T.rows,prochain_evenement:T.rows[0]||null,dernieres_notes:O,dernieres_observations:N,controle_presence_aujourdhui:h})}catch(r){console.error("statistiques-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await o.end()}}var Cs,Sn=M(()=>{U();F();Cs=["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"]});function Is(t){return String(t||"").trim().toLowerCase()}async function On(t,n,e){let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{let r=n.match(/^\/tcf-state\/([^/]+)$/);if(r){let m=Is(r[1]);if(!Ds.has(m))return s(e,{message:"Cle TCF invalide"},400);if(t.method==="GET"){let E=await o.query("SELECT donnees, updated_at FROM tcf_state WHERE cle = $1 LIMIT 1",[m]);return E.rows.length?s(e,{donnees:E.rows[0].donnees||{},updated_at:E.rows[0].updated_at||null}):s(e,{donnees:{},updated_at:null})}if(t.method==="PUT"){let p=(await y(t)).donnees;if(p==null||typeof p!="object"||Array.isArray(p))return s(e,{message:'Le payload "donnees" doit etre un objet JSON'},400);let u=await o.query(`INSERT INTO tcf_state (cle, donnees, updated_by, updated_at)
           VALUES ($1, $2::jsonb, $3, NOW())
           ON CONFLICT (cle)
           DO UPDATE SET donnees = EXCLUDED.donnees, updated_by = EXCLUDED.updated_by, updated_at = NOW()
           RETURNING updated_at`,[m,JSON.stringify(p),i.id]);return s(e,{message:"Etat TCF enregistre",updated_at:u.rows[0]?.updated_at||null})}}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("tcf-state-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:"Erreur serveur",erreur:m},500)}finally{await o.end()}}var Ds,vn=M(()=>{U();F();Ds=new Set(["pool","affectation","resultats"])});async function Ln(t,n,e){let i=await A(t),f=C(i,e,n);if(f)return f;let o=b();try{if(n==="/visites-classes"&&t.method==="GET"){let m=await o.query(`
        SELECT v.*,
          uf.nom AS formateur_nom, uf.prenom AS formateur_prenom,
          c.nom AS classe_nom, c.niveau AS classe_niveau,
          m.nom AS branche_nom
        FROM visites_classes v
        LEFT JOIN utilisateurs uf ON uf.id = v.formateur_id
        LEFT JOIN classes c ON c.id = v.classe_id
        LEFT JOIN matieres m ON m.id = v.branche_id
        ORDER BY v.date_visite DESC, v.created_at DESC
      `);return s(e,m.rows)}if(n==="/visites-classes"&&t.method==="POST"){let m=await y(t),{formateur_id:E,classe_id:p,branche_id:u,date_visite:d,duree:l,scores:g,organisation:a,observation:_,feedback:c,valide:T}=m,R=await o.query(`INSERT INTO visites_classes
          (formateur_id, classe_id, branche_id, date_visite, duree, scores, organisation, observation, feedback, valide, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[E||null,p||null,u||null,d||null,l||1,JSON.stringify(g||{}),JSON.stringify(a||{}),_||null,c||null,T||!1,i.id]);return s(e,R.rows[0])}let r=n.match(/^\/visites-classes\/(\d+)$/);if(r){let m=r[1];if(t.method==="PUT"){let E=await y(t),{formateur_id:p,classe_id:u,branche_id:d,date_visite:l,duree:g,scores:a,organisation:_,observation:c,feedback:T,valide:R}=E,w=await o.query(`UPDATE visites_classes SET
            formateur_id=$1, classe_id=$2, branche_id=$3, date_visite=$4, duree=$5,
            scores=$6, organisation=$7, observation=$8, feedback=$9, valide=$10,
            updated_at=NOW()
           WHERE id=$11 RETURNING *`,[p||null,u||null,d||null,l||null,g||1,JSON.stringify(a||{}),JSON.stringify(_||{}),c||null,T||null,R||!1,m]);return s(e,w.rows[0])}if(t.method==="DELETE")return await o.query("DELETE FROM visites_classes WHERE id=$1",[m]),s(e,{message:"Supprim\xE9"})}return s(e,{message:"Route non trouv\xE9e"},404)}catch(r){console.error("visites-classes-fast error:",r);let m=r instanceof Error?r.message:"Erreur serveur";return s(e,{message:m},500)}finally{await o.end()}}var bn=M(()=>{U();F()});import{Buffer as Ms}from"node:buffer";var Hs=Mn(()=>{Me();Ge();Ye();et();nt();mt();_t();U();Rt();wt();ht();Nt();Ot();Lt();At();Dt();Mt();Pt();xt();Bt();jt();Vt();Xt();Zt();tn();an();un();mn();En();Rn();$n();yn();Sn();vn();bn();globalThis.Buffer=Ms;function Us(t){let n=["/functions/v1/api-proxy","/api-proxy"];for(let e of n){let i=t.indexOf(e);if(i>=0)return t.slice(i+e.length)||"/"}return t}function Ps(t){let n=t.headers.get("Origin");return{"Access-Control-Allow-Origin":n||"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, PUT, PATCH, DELETE, OPTIONS",...n?{Vary:"Origin"}:{}}}Deno.serve(async t=>{let n=Ps(t);if(t.method==="OPTIONS")return new Response("ok",{headers:n});try{let e=new URL(t.url),i=Us(e.pathname);if(i==="/healthz")return new Response(JSON.stringify({ok:!0,service:"ecole-manager-api-proxy"}),{status:200,headers:{...n,"Content-Type":"application/json"}});if(i==="/auth/login"&&t.method==="POST")return await Je(t,n);if(i==="/auth/login/mfa"&&t.method==="POST")return await je(t,n);if(i==="/auth/register"&&t.method==="POST")return await tt(t,n);if(i==="/auth/logout"&&t.method==="POST")return await Et(t,n);if(i==="/auth/changer-mdp"&&t.method==="POST")return await ft(t,n);if(i==="/auth/moi"&&t.method==="GET")return await pt(t,n);if(i==="/auth/mfa/status"&&t.method==="GET")return await Ke(t,n);if(i==="/auth/mfa/setup"&&t.method==="POST")return await Xe(t,n);if(i==="/auth/mfa/enable"&&t.method==="POST")return await ze(t,n);if(i==="/auth/mfa/backup/regenerate"&&t.method==="POST")return await Qe(t,n);if(i==="/auth/mfa/disable"&&t.method==="POST")return await Ze(t,n);if(i==="/auth/login/passkey/options"&&t.method==="POST")return await at(t,n);if(i==="/auth/login/passkey/verify"&&t.method==="POST")return await ot(t,n);if(i==="/auth/passkeys"&&t.method==="GET")return await ut(t,n);if(i==="/auth/passkeys/register/options"&&t.method==="POST")return await lt(t,n);if(i==="/auth/passkeys/register/verify"&&t.method==="POST")return await ct(t,n);let f=i.match(/^\/auth\/passkeys\/(\d+)$/);return f&&t.method==="DELETE"?await dt(t,n,f[1]):i.startsWith("/classes")?await yt(t,i,n):i.startsWith("/branches")?await gt(t,i,n):i.startsWith("/profs")?await gn(t,i,n):i.startsWith("/eleves")?await It(t,i,n,e):i.startsWith("/employes-administratifs")?await Ft(t,i,n):i.startsWith("/emploi-du-temps")?await Ut(t,i,n,e):i.startsWith("/presences")?await pn(t,i,n,e):i.startsWith("/notes-personnelles")?await Qt(t,i,n):i.startsWith("/notes")?await Kt(t,i,n,e):i.startsWith("/calendrier")?await Tt(t,i,n):i.startsWith("/parametres")?await rn(t,i,n):i.startsWith("/comptabilite")?await St(t,i,n,e):i.startsWith("/statistiques")?await Nn(t,i,n):i.startsWith("/import")?await Gt(t,i,n):i.startsWith("/plan-classe")?await on(t,i,n):i.startsWith("/observations")?await en(t,i,n):i.startsWith("/planning")?await dn(t,i,n,e):i.startsWith("/documents-administratifs")?await Ct(t,i,n):i.startsWith("/inventaire-branches")?await Yt(t,i,n):i.startsWith("/tcf-state")?await On(t,i,n):i==="/chatbot"&&t.method==="POST"?await $t(t,i,n):i.startsWith("/donnees")?await bt(t,i,n):i.startsWith("/enclassements")?await qt(t,i,n):i.startsWith("/devoirs")?await vt(t,i,n,e):i.startsWith("/sorties")?await hn(t,i,n,e):i.startsWith("/visites-classes")?await Ln(t,i,n):i.startsWith("/sondages")?await wn(t,i,n):s(n,{message:"Route non trouv\xE9e"},404)}catch(e){return console.error("api-proxy error:",e),s(n,{message:"Erreur serveur"},500)}})});Hs();
