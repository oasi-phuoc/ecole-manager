---
name: vocabulaire-francais
description: >-
  Édite vocabulaire français dans soutien-scolaire (vocab-v*.ts, VocabTheme,
  définitions pivot, exemples, assets public/assets/words).
---

# Vocabulaire français — contenu

## Repo cible

**soutien-scolaire** : `../soutien-scolaire/` ou `E:/soutien-scolaire/`.

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `lib/curriculum/content/francais/vocab-v*.ts` | Thèmes V1–V10 |
| `lib/curriculum/vocabulary-data.ts` | Types, registre |
| `components/francais/VocabRunner.tsx` | Rendu |
| `public/assets/words/` | Images / audio |

## `VocabTheme` / `VocabWord`

`titlePivot`, `definitionPivot` : `PivotCode` (16 codes incl. `fr`) depuis `lib/pivot-langs.ts`.

`exampleSentences` : `a1`, `a2`, `b1`. Images : `image: "carotte.webp"`.

## Registre

Import dans `vocabulary-data.ts` + entrée parcours si nouveau thème.

## Anti-patterns

- ❌ Image absente dans `public/assets/words/`
- ❌ `gender` / `article` incohérents
