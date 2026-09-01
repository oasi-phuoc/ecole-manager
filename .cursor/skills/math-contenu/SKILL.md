---
name: math-contenu
description: >-
  Édite le contenu maths (théorie MathRichBlock, exercices, colonnes) dans
  soutien-scolaire/lib/curriculum/content/math/. Modules A1–G7, GenericModuleContent,
  correction amber, inputs type=text.
---

# Mathématiques — contenu et exercices

## Repo cible

Contenu dans **soutien-scolaire** (`../soutien-scolaire/` ou `E:/soutien-scolaire/`).

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `lib/curriculum/content/math/math-*.ts` | Leçons |
| `components/math/GenericModuleContent.tsx` | A1.3+ exercices colonnes |
| `CLAUDE.md` | **Référence complète** blocs + patterns |

## Règles absolues

- Inputs : **toujours `type="text"`**, jamais `type="number"`
- Correction : `border-amber-500` underline seul, pas de fond amber
- Colonnes : `CELL_W = 32`, `data-grid-card`, `tabNav`
- `CLS_WRONG`, `MATH_TEXT_INPUT_BASE` — voir `CLAUDE.md`

## Workflow

1. Lire `CLAUDE.md` (section maths)
2. Copier exercice similaire dans le même module
3. `npm run lint` dans soutien-scolaire si changement structurel
