# Supabase (École Manager)

Voir le guide complet : [`docs/MIGRATION_SUPABASE.md`](../docs/MIGRATION_SUPABASE.md).

```bash
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push   # applique migrations/
```

Phase 1 = Postgres drop-in via `DATABASE_URL`. Auth JWT et Express inchangés.
