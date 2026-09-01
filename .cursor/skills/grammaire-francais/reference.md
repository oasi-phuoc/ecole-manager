# Référence — types grammaire

Source : `../soutien-scolaire/lib/curriculum/grammar-data.ts`

## TheoryBlock (union)

| type | Champs principaux |
|------|-------------------|
| `heading` | `text`, `trans?`, `sub?`, `accent?` |
| `text` | `label?`, `text?`, `items?`, `transLabel?`, `transText?`, `transItems?`, `noFirstBullet?`, `noBulletItems?`, `allBullets?`, `inlineArrows?` |
| `grid` | `headers`, `rows`, `transHeaders?`, `transRows?`, `pronounGrid?`, `boldFirstCol?`, `equalCols?`, `colWidths?` |
| `table` | `tables: ConjugTable[]` |
| `rule` | `text`, `examples?: { correct, wrong? }[]` |
| `note` | `text` |
| `selector` | `tabs: { label, content: TheoryBlock[] }[]`, `buttonCols?` |

## Langues pivot (15)

`sq`, `en`, `ar`, `am`, `prs`, `es`, `it`, `fa`, `ps`, `pt`, `ru`, `so`, `ti`, `tr`, `uk` — `../soutien-scolaire/lib/pivot-langs.ts` (sans `fr`).

## Registre

1. Import dans `grammar-data.ts`
2. `lesson(...)` dans `french-data.ts`
