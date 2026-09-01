# Migration ecole-manager → Supabase

## Créer le projet Supabase

1. [supabase.com/dashboard](https://supabase.com/dashboard) → New project **ecole-manager**
2. Copier URL + anon key + service_role dans `frontend/.env.local`
3. Lier le CLI :

```bash
cd E:\ecole-manager
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase functions deploy
```

## Secrets Edge Functions (Dashboard → Edge Functions → Secrets)

| Secret | Usage |
|--------|--------|
| `SUPABASE_DB_URL` | Connection Postgres directe (port 5432) |
| `JWT_SECRET` | Tokens MFA legacy + cookies (même valeur qu’ancien Render) |
| `MFA_BACKUP_PEPPER` | Codes de secours MFA |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Envoi mail (`send-mail`) |
| `OPENAI_API_KEY` | Chatbot (si configuré) |

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` sont injectés automatiquement.

## Migrer les données depuis Render

```bash
# Export (depuis machine avec accès DATABASE_URL Render)
DATABASE_URL="postgres://..." node scripts/export-render-db.js

# Restore sur Supabase (connection string directe, port 5432)
SUPABASE_DB_URL="postgres://..." node scripts/import-to-supabase.js

# Lier utilisateurs existants à Supabase Auth
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=... node scripts/migrate-auth-users.js
```

## Documents → Storage

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=... node scripts/migrate-documents-to-storage.js
```

## Déploiement frontend (Vercel)

- Root : `frontend`
- Build : `npm run build`
- Output : `build`
- Env : `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`
- Après validation : **désactiver** les services Render (backend + frontend)

## Architecture

```text
Vercel (CRA) → Supabase Auth + Edge Functions (api-proxy) → Postgres RLS
            → Storage (documents, photos)
```

- **CRUD** : Edge Function `api-proxy` (Express embarqué, parité routes `/api/*`)
- **Auth** : Supabase Auth + bridge `auth-legacy-login` (bcrypt → session Supabase)
- **MFA** : `auth-mfa` ou `/auth/login/mfa` via api-proxy
- **Complexe** : fonctions dédiées `planning`, `import-lora`, `send-mail`, `chatbot`, `enclassement` (proxy vers api-proxy)

## Frontend

- Client : `frontend/src/lib/supabase.js`
- HTTP : `frontend/src/lib/apiClient.js` (axios → `functions/v1/api-proxy`)
- Login : `frontend/src/pages/Login.js` (Supabase Auth puis legacy bridge)
- Dev local : `REACT_APP_API_URL=http://localhost:5000/api` si Supabase non configuré

## Synchroniser le backend Express copié dans les Edge Functions

Après modification de `backend/src/`, recopier :

```bash
cd E:\ecole-manager
powershell -Command "Copy-Item -Recurse -Force backend\src supabase\functions\_shared\ecole-backend\src"
```

Puis redéployer : `npx supabase functions deploy api-proxy`

## Critères de succès

- Aucun appel hardcodé à `onrender.com` dans le frontend (apiClient → Supabase Edge uniquement en prod)
- CRUD &lt; 500 ms (pas de cold start Render 15 s)
- Données prod migrées
- Backend Render éteint
