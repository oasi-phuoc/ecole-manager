---
name: conjugaison-francais
description: >-
  Édite conjugaison française dans soutien-scolaire (ConjLesson, conj-lesson-profiles,
  tableaux, exercices générés). Temps/modes G8+, toggles terminaisons.
---

# Conjugaison française — contenu

## Repo cible

**soutien-scolaire** : `../soutien-scolaire/` ou `E:/soutien-scolaire/`.

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `lib/curriculum/grammar-data.ts` | `ConjLesson`, types |
| `lib/curriculum/content/francais/grammaire-g8.*.ts` | Leçons temps |
| `lib/curriculum/content/francais/conj-lesson-profiles.ts` | Profils verbes |
| `lib/curriculum/content/francais/conj-exercise-builders.ts` | Génération exercices |
| `components/francais/GrammaireRunner.tsx` | Rendu |

## `ConjLesson`

`theory`, `theory2?`, `midExercises?`, `exercises`, `evalExercises?`.

Blocs théorie = grammaire (skill **grammaire-francais**). Tableaux : `{ type: "table", tables: ConjugTable[] }`.

Profils : `getProfileForLesson()`, `applyConjProfile()` — préférer profil vs duplication manuelle.

## Anti-patterns

- ❌ 50 `fill` items quand un profil `conj-lesson-profiles` suffit
- ❌ `transInstruction` incomplet (15 langues pivot)
