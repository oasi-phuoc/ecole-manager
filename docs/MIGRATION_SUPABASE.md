# Migration vers Supabase — École Manager

## Objectif (phase 1)

Remplacer **Neon** par **Supabase Postgres** en drop-in : le backend Express continue d’utiliser `pg` + `DATABASE_URL` et l’**auth JWT custom**. Pas de bascule Auth/Storage dans cette phase.

| Phase | Contenu |
|-------|---------|
| **1 (cette PR)** | Projet Supabase, schéma versionné, scripts dump/restore, variables d’env |
| **2** | Supabase Storage (docs / photos actuellement en base64 TEXT) |
| **3 (optionnel)** | Supabase Auth à la place du JWT maison |

## Prérequis

1. Créer un projet sur [supabase.com](https://supabase.com) (région EU si possible).
2. Noter dans **Project Settings → Database** :
   - **Connection string → URI** (direct, port `5432`) — dumps / migrations
   - **Connection pooling → Session mode** (port `5432` via pooler, ou mode Session) — **Render / Express**
3. Éviter le pooler **Transaction** (`:6543`) avec `node-pg` (prepared statements).

## Chaînes de connexion

```bash
# Backend (Render) — Session pooler recommandé (IPv4)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# Dump / restore / CLI — connexion directe
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

Ajouter `?sslmode=require` si besoin.

Optionnel (phase 2+) :

```bash
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # serveur uniquement, jamais dans le frontend
```

## A. Migrer les données Neon → Supabase (recommandé en prod)

```bash
# 1. Dump Neon (schéma + données)
export NEON_DATABASE_URL='postgresql://...@....neon.tech/neondb?sslmode=require'
./scripts/dump-neon-for-supabase.sh

# 2. Restore sur Supabase (base vide)
export SUPABASE_DB_URL='postgresql://postgres:...@db....supabase.co:5432/postgres'
./scripts/restore-to-supabase.sh
```

Puis sur **Render** : remplacer `DATABASE_URL` par l’URI Supabase (session pooler), redéployer, vérifier login + planning.

Garder Neon en lecture seule quelques jours avant de le couper.

## B. Schéma vert (dev / nouvelle instance)

```bash
# Lier le projet (une fois)
npx supabase link --project-ref [PROJECT_REF]

# Pousser les migrations versionnées
npx supabase db push

# Ou appliquer à la main
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260815080000_initial_schema.sql
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

Le fichier `backend/src/config/initDB.js` reste un filet de sécurité au boot (`CREATE IF NOT EXISTS`) pendant la transition.

## Contenu du dossier `supabase/`

- `config.toml` — config CLI locale
- `migrations/20260815080000_initial_schema.sql` — schéma consolidé (initDB + tables lazy)
- `seed.sql` — niveaux, lieux, créneaux (dev)

## Cutover Render (après restore OK)

Sur le service backend Render → **Environment** → remplacer `DATABASE_URL` par le **session pooler** Supabase (région du projet, ex. `eu-west-2`) :

```text
postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

Optionnel (phase 2) : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Puis **Manual Deploy** / redémarrer le service. Garder Neon intact quelques jours.

## Vérifications post-cutover

1. Connexion DB au démarrage backend (`✅ Base de données connectée`)
2. Login admin / MFA
3. Emploi du temps (affectations normal + soutien)
4. Documents (base64 encore en DB — OK en phase 1)
5. Comparer `SELECT COUNT(*)` sur tables clés (utilisateurs, eleves, affectations, …) Neon vs Supabase

## Hors scope phase 1

- Remplacer JWT par Supabase Auth
- Migrer fichiers vers Storage
- RLS sur `public` (l’API passe toujours par Express)
- Arrêter `initDB` au boot (possible une fois le schéma figé)
