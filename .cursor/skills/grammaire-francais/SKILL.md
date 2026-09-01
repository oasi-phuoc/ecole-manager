---
name: grammaire-francais
description: >-
  Édite le contenu des leçons de grammaire française (théorie, traductions pivot,
  exercices) dans soutien-scolaire/lib/curriculum/content/francais/grammaire-g*.ts.
  Utiliser pour leçons G1–G18, blocs theory[], traductions pivot, exercices grammaire.
---

# Grammaire française — contenu curriculum

## Repo cible (workspace multi-racine)

Contenu dans **soutien-scolaire** :
- Depuis ecole-manager : `../soutien-scolaire/…`
- Absolu : `E:/soutien-scolaire/…`

Chemins ci-dessous = racine **soutien-scolaire**.

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `lib/curriculum/content/francais/grammaire-gX.Y.ts` | Leçon (code `GX.Y`) |
| `lib/curriculum/grammar-data.ts` | Types, registre |
| `lib/curriculum/french-data.ts` | Métadonnées parcours |
| `lib/curriculum/content/francais/grammaire-templates.ts` | Gabarits exercices |
| `components/francais/GrammaireRunner.tsx` | Rendu |

## Traductions pivot — 15 langues

`sq`, `en`, `ar`, `am`, `prs`, `es`, `it`, `fa`, `ps`, `pt`, `ru`, `so`, `ti`, `tr`, `uk`

Marquage : `{a}texte{/a}`, `\n`, ` → ` pour exemples alignés.

Bloc principal : `type: "text"` avec `text` + `items` + `noBulletItems`. Voir [reference.md](reference.md) et `grammaire-g2.3.ts`.

## Anti-patterns

- ❌ Traductions partielles
- ❌ Paraphraser le verbatim utilisateur
