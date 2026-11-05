# Supabase (École Manager)

Voir le guide complet : [`docs/MIGRATION_SUPABASE.md`](../docs/MIGRATION_SUPABASE.md).

```bash
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push   # applique migrations/
```

Phase 1 = Postgres drop-in via `DATABASE_URL`. Auth JWT et Express inchangés.

Réinitialiser le mot de passe admin prod (table `utilisateurs` + Auth) :

```bash
# backend/.env.supabase rempli
ADMIN_NEW_PASSWORD=admin123 node scripts/set-admin-password.js
```

Alternative : exécuter `scripts/set-admin-password.sql` dans le SQL Editor Supabase, puis mettre à jour le mot de passe du même email dans **Authentication → Users** si la connexion passe par Supabase Auth.
