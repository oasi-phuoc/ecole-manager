# Plan de migration Express → handlers Deno natifs (`api-proxy`)

## Contexte

### Pourquoi Express est encore là

L’ancien backend ecole-manager (`backend/server.js`) utilisait **Express** sur Render. Lors de la migration Supabase, tout ce code a été **embarqué** dans la Edge Function `api-proxy` via :

- `createApp.cjs` — montage des ~28 modules de routes
- `expressToFetch.ts` — adaptateur req/res → Fetch API
- `index.ts` — bundle esbuild (~2,9 Mo) déployé sur Supabase

C’est un **pont temporaire** : Express dans Deno est lourd, fragile (503, cold start, `require` dynamiques) et difficile à déboguer.

### Architecture cible

```
Frontend (Vercel)
    → api-proxy (Supabase Edge, Deno.serve)
        → handlers natifs auth-fast-*.ts  (priorité)
        → [suppression] Express fallback
    → Postgres Supabase (DATABASE_URL)
```

Chaque module métier devient un fichier TypeScript Deno :

- `auth-fast-*.ts` — authentification (en cours)
- `fast-classes.ts`, `fast-eleves.ts`, … — un fichier par domaine ou sous-groupe de routes
- Utilitaires partagés : `auth-fast-shared.ts` (`createPool`, `json`, `verifyJwtFromRequest`, `signJwt`)

Le routage se fait dans `index.source.ts` **avant** le fallback `getHandler()` Express.

---

## État actuel (mars 2026)

### Déjà migrés (chemins rapides — **sans Express**)

| Route | Fichier |
|-------|---------|
| `POST /auth/login` | `auth-fast-login.ts` |
| `POST /auth/login/mfa` | `auth-fast-mfa.ts` |
| `GET /auth/mfa/status` | `auth-fast-mfa-setup.ts` |
| `POST /auth/mfa/setup`, `/enable` | `auth-fast-mfa-setup.ts` |
| `POST /auth/login/passkey/*` | `auth-fast-passkey.ts` |
| `GET/POST/DELETE /auth/passkeys*` | `auth-fast-passkey.ts` |
| `GET /auth/moi` | `auth-fast-session.ts` |
| `POST /auth/logout` | `auth-fast-session.ts` |
| `POST /auth/changer-mdp` | `auth-fast-session.ts` |
| `GET /healthz` | `index.source.ts` |
| `POST /auth/register`, MFA backup/disable | `auth-fast-register.ts`, `auth-fast-mfa-setup.ts` |
| `/classes/*` | `routes-fast/classes.ts` |
| `/branches/*` | `routes-fast/branches.ts` |
| `/profs/*` | `routes-fast/profs.ts` |
| `/eleves/*` | `routes-fast/eleves.ts` |
| `/donnees/*` | `routes-fast/donnees.ts` |
| `GET /statistiques` | `routes-fast/statistiques.ts` |
| Tous autres modules (`planning`, `notes`, `parametres`, …) | `routes-fast/*.ts` |

### Migration terminée (sept. 2026)

- **Express retiré** : plus de `getHandler()`, `createApp.cjs`, `vendor/` ni `expressToFetch.ts`.
- Bundle `index.ts` : **~200 KB** (Deno natif uniquement).
- Module **archives** migré (`routes-fast/archives.ts` + `archive-service.ts`).

---

## Pattern technique (référence)

### 1. Handler type

```typescript
import { createPool, json, verifyJwtFromRequest } from "./auth-fast-shared.ts";

export async function handleMaRoute(req: Request, cors: Record<string, string>): Promise<Response> {
  const auth = verifyJwtFromRequest(req);
  if (!auth) return json(cors, { message: "Token manquant" }, 401);

  const pool = createPool();
  try {
    // logique SQL + validation
    return json(cors, { data: result });
  } catch (err) {
    console.error("ma-route:", err);
    return json(cors, { message: "Erreur serveur" }, 500);
  } finally {
    await pool.end();
  }
}
```

### 2. Câblage dans `index.source.ts`

```typescript
if (path === "/classes" && req.method === "GET") {
  return await handleGetClasses(req, cors);
}
```

Placer **toujours avant** le bloc `getHandler()` Express.

### 3. Auth JWT

Le frontend envoie `Authorization: Bearer <token>` via `apiClient` (`sessionStorage` legacy token après login).  
`verifyJwtFromRequest` lit ce header — pas de cookie httpOnly en prod Supabase.

### 4. Build & déploiement

```bash
node scripts/bundle-api-proxy.mjs
npx supabase functions deploy api-proxy --use-api
```

Les imports `npm:xxx` restent **externes** au bundle (résolus par Deno sur Edge).  
Le code Express reste dans le bundle jusqu’à la phase finale.

### 5. Tests par route migrée

```bash
# Sans token → 401
curl -X GET .../api-proxy/auth/moi -H "Origin: https://oasi-van.vercel.app"

# Avec token (après login)
curl -H "Authorization: Bearer $TOKEN" ...
```

**Definition of done** pour un module : toutes ses routes répondent en JSON + CORS sans charger Express (pas de 503 WORKER_ERROR).

---

## Inventaire des modules Express

| Module | Routes | Dépendances lourdes | Effort | Priorité |
|--------|--------|---------------------|--------|----------|
| **auth** (reste) | 2 | — | S | Phase 1b |
| `register`, `mfa/backup`, `mfa/disable` | | | | |
| **classes** | 5 | — | S | Phase 2 |
| **branches** | 4 | — | S | Phase 2 |
| **donnees** (niveaux, lieux, salles) | 12 | — | M | Phase 2 |
| **parametres** (profil, école, mail) | 15 | nodemailer | M | Phase 2 |
| **statistiques** | 1 | — | S | Phase 2 |
| **notes-personnelles** | 2 | — | S | Phase 2 |
| **tcf-state** | 2 | — | S | Phase 2 |
| **eleves** | 18 | multer (docs) | L | Phase 3 |
| **profs** | 10 | multer, nodemailer | L | Phase 3 |
| **employes-administratifs** | 10 | multer, nodemailer | L | Phase 3 |
| **presences** | 6 | — | M | Phase 3 |
| **emploi-du-temps** | 6 | — | M | Phase 3 |
| **calendrier** | 8 | — | M | Phase 3 |
| **devoirs** | 5 | — | M | Phase 3 |
| **observations** | 4 | — | S | Phase 3 |
| **plan-classe** | 2 | — | S | Phase 3 |
| **visites-classes** | 4 | — | S | Phase 3 |
| **sorties** | 4 | — | S | Phase 3 |
| **enclassements** | 5 | — | M | Phase 4 |
| **inventaire-branches** | 6 | — | M | Phase 4 |
| **documents-administratifs** | 5 | fichiers | M | Phase 4 |
| **notes** (bulletins) | 14 | — | L | Phase 4 |
| **planning** | 29 | — | XL | Phase 5 |
| **comptabilite** | 21 | — | L | Phase 5 |
| **import** | 2 | multer, xlsx | M | Phase 5 |
| **sondages** | 8 | — | M | Phase 5 |
| **chatbot** | 1 | OpenAI | M | Phase 6 |

**Légende effort** : S = 1–2 h, M = ½ journée, L = 1 jour, XL = 2+ jours

---

## Phases de migration

### Phase 1 — Session & auth (✅ en cours)

**Objectif** : post-login stable sans Express.

- [x] Login, MFA, passkeys
- [x] `GET /auth/moi`, `POST /auth/logout`, `POST /auth/changer-mdp`
- [ ] `POST /auth/register` (si utilisé)
- [ ] `POST /auth/mfa/backup/regenerate`

**DoD** : connexion complète + refresh session + changement MDP + déconnexion testés sur Vercel.

### Phase 2 — Données de référence & dashboard initial

**Modules** : `classes`, `branches`, `donnees`, `parametres` (lecture seule d’abord), `statistiques`, `notes-personnelles`, `tcf-state`

**Objectif** : le dashboard et les écrans de navigation chargent sans Express.

**DoD** : ouverture app admin → liste classes/branches/paramètres école OK.

### Phase 3 — Gestion quotidienne

**Modules** : `eleves`, `profs`, `employes-administratifs`, `presences`, `emploi-du-temps`, `calendrier`, `devoirs`, `observations`, `plan-classe`, `visites-classes`, `sorties`

**Attention** : uploads (`multer`) → parser `multipart/form-data` natif Deno ou Supabase Storage.

### Phase 4 — Pédagogie avancée

**Modules** : `notes`, `enclassements`, `inventaire-branches`, `documents-administratifs`

### Phase 5 — Modules lourds

**Modules** : `planning` (29 routes), `comptabilite`, `import` (xlsx), `sondages`

Envisager **Edge Functions séparées** si le bundle dépasse les limites Supabase.

### Phase 6 — Intégrations

**Modules** : `chatbot` (OPENAI_API_KEY), mails transactionnels

### Phase finale — Suppression Express

1. Retirer `getHandler()`, `createApp.cjs`, `expressToFetch.ts`, `vendor/`
2. Réduire `bundle-api-proxy.mjs` ou supprimer le bundle (fichiers `.ts` directs)
3. `backend/server.js` conservé **uniquement** pour dev local optionnel
4. Taille cible `api-proxy` : < 500 Ko (hors dépendances npm runtime)

---

## Middleware à réimplémenter

| Express | Équivalent Deno |
|---------|-----------------|
| `verifierToken` | `verifyJwtFromRequest` + requête SQL utilisateur |
| `autoriser('admin')` | helper `requireRole(auth, 'admin')` |
| `peutModifier(module)` | helper `requirePermission(auth, module)` |
| `express-rate-limit` | Supabase / Cloudflare ou compteur Redis futur |
| `multer` | `req.formData()` + validation taille |
| CORS | `corsHeadersFor` dans `index.source.ts` |

---

## Risques & mitigations

| Risque | Mitigation |
|--------|------------|
| Régression sur une route | Migrer module par module ; tests curl + usage manuel |
| Bundle trop gros | Externaliser `npm:` ; split functions si besoin |
| Upload fichiers | Migrer vers Supabase Storage à terme |
| Secrets manquants | Documenter dans `migration-supabase.md` |

---

## Phase 2 — Prochaine session (à traiter en priorité)

1. **`classes`** — 5 routes (liste, CRUD, élèves par classe) — bloque navigation principale
2. **`branches`** — 4 routes
3. **`donnees`** — niveaux, lieux, salles (référentiels formulaires)
4. **`parametres`** — `GET /profil`, `GET /ecole`, `GET /mes-classes` (lecture)
5. **`statistiques`** — 1 route (widgets dashboard)
6. Helper partagé **`auth-middleware.ts`** : `loadUser`, `requireRole`, `requirePermission`

Créer `lib/fast/` ou préfixe `fast-` par module en reprenant la logique des controllers dans `vendor/ecole-backend/src/controllers/`.

---

## Références

- `supabase/functions/api-proxy/index.source.ts` — routeur principal
- `supabase/functions/api-proxy/auth-fast-shared.ts` — utilitaires
- `scripts/bundle-api-proxy.mjs` — build
- `docs/migration-supabase.md` — infra Supabase
