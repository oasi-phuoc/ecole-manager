---
name: admin-suivi
description: >-
  Développe ecole-manager (élèves, classes, bulletins, TCF, planning, notes,
  impression documents). Utiliser pour frontend/src/pages, supabase/functions,
  migrations SQL, print.js, CustomSelect.
---

# ecole-manager — application scolaire

## Stack (Supabase native)

| Couche | Chemin |
|--------|--------|
| Frontend | `frontend/` — Create React App, React Router, Vercel |
| API | `supabase/functions/api-proxy/` — Express embarqué (parité `backend/`) |
| Schéma | `supabase/migrations/` |
| Auth | Supabase Auth + `utilisateurs.auth_user_id` |
| HTTP client | `frontend/src/lib/apiClient.js` → `functions/v1/api-proxy` |

**Legacy** : `backend/` Express sur Render — ne plus utiliser en prod. Migration : `docs/migration-supabase.md`.

## Config frontend

```env
REACT_APP_SUPABASE_URL=https://xxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=...
```

Sans ces variables, le frontend retombe sur Render (`apiClient` legacy).

## Pages principales (`frontend/src/pages/`)

| Page | Domaine |
|------|---------|
| `Eleves.js` | Fiche élèves |
| `Classes.js`, `Enclassement.js` | Classes, affectation |
| `Bulletins.js` | Bulletins semestres, critères comportement |
| `Notes.js` | Notes, points max |
| `TCF.js` | Plannings TCF, affectation, PDF graphiques |
| `EmploiDuTemps.js`, `Presences.js` | EDT, présences |
| `DocumentsAdministratifs.js` | Documents admin |
| `Comptabilite.js`, `SortieScolaire.js` | Compta, sorties |
| `Parametres.js` | Paramètres école |

Routes : `frontend/src/App.js`. Layout : `components/Layout.js`.

## API / Backend

- Routes Express (référence) : `backend/src/routes/*.js`
- Copie déployée : `supabase/functions/_shared/ecole-backend/src/`
- Edge Functions : `api-proxy`, `auth-legacy-login`, `planning`, `import-lora`, `send-mail`, `chatbot`, `enclassement`
- Auth middleware edge : support JWT Supabase + legacy JWT
- Session : `frontend/src/utils/session.js` (`get_me` RPC + `/auth/moi`)
- Permissions : `frontend/src/utils/permissions.js`

## Impression documents

`frontend/src/utils/print.js` — `injectForcedPrintCss`, `openPrintPopup`. Utilisé par bulletins, TCF, EDT.

## Développement

```bash
cd frontend && npm start          # http://localhost:3000
npx supabase start                # Postgres + Auth local (optionnel)
npx supabase functions serve api-proxy --env-file frontend/.env.local
```

## Anti-patterns

- ❌ `axios` + URL Render hardcodée (utiliser `apiClient`)
- ❌ Impression sans `injectForcedPrintCss`
- ❌ Modifier `backend/src` sans recopier vers `_shared/ecole-backend`

## Repo sibling — soutien-scolaire

Suivi élèves apprenants : `../soutien-scolaire/` (Next.js + Supabase, **projet séparé**).
