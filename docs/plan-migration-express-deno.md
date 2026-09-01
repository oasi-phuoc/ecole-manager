# Plan migration Express → Deno (api-proxy)

Migration progressive des routes Express (`createApp.cjs` / vendor) vers des handlers Deno natifs dans `index.source.ts`.

## Pattern

| Fichier | Rôle |
|---------|------|
| `auth-fast-shared.ts` | Pool PG, JWT, crypto MFA, `json()` |
| `routes-fast/middleware.ts` | `loadUser`, `requireAuth`, `requireAdmin`, MFA gate |
| `routes-fast/storage.ts` | Supabase Storage (photos élèves) |
| `routes-fast/{module}.ts` | Handlers du module |
| `index.source.ts` | Routes rapides **avant** fallback `getHandler()` |

Build : `node scripts/bundle-api-proxy.mjs`  
Deploy : `npx supabase functions deploy api-proxy --use-api`

## État des modules

| Module | Statut | Fichier |
|--------|--------|---------|
| auth (login, MFA, passkeys) | ✅ | auth-fast-*.ts |
| auth (logout, changer-mdp, register, mfa backup/disable) | ✅ | auth-fast-session.ts, auth-fast-register.ts |
| classes | ✅ | routes-fast/classes.ts |
| branches | ✅ | routes-fast/branches.ts |
| eleves | ⏳ | — |
| profs | ⏳ | — |
| emploi-du-temps | ⏳ | — |
| presences | ⏳ | — |
| notes | ⏳ | — |
| parametres | ⏳ | — |
| calendrier | ⏳ | — |
| planning | ⏳ | — |
| enclassements | ⏳ | — |
| devoirs | ⏳ | — |
| comptabilite | ⏳ | — |
| statistiques | ⏳ | — |
| import | ⏳ | — |
| documents-administratifs | ⏳ | — |
| inventaire-branches | ⏳ | — |
| observations | ⏳ | — |
| plan-classe | ⏳ | — |
| employes-administratifs | ⏳ | — |
| donnees | ⏳ | — |
| tcf-state | ⏳ | — |
| notes-personnelles | ⏳ | — |
| chatbot | ⏳ | — |
| sorties | ⏳ | — |
| visites-classes | ⏳ | — |
| sondages | ⏳ | — |

## Fin de migration

Quand tous les modules sont migrés :

1. Retirer `getHandler()` / `createApp.cjs` de `index.source.ts`
2. Réduire le bundle (retirer Express si possible)
3. Commit final : « Retirer bundle Express de api-proxy »

## Notes

- `/auth/moi` doit renvoyer `role`, `permissions`, `role_acces`, champs MFA pour le menu admin.
- Uploads multer → multipart Deno ; xlsx/nodemailer → `npm:` imports.
- Vérifier JWT via `verifyJwtFromRequest` + `loadUser` (miroir `verifierToken`).
