---
name: lecture-curriculum
description: >-
  Édite le parcours lecture dans soutien-scolaire (lecture-data, phonèmes L1–L8,
  SoundPicker, word-pool, assets audio/images).
---

# Lecture — curriculum

## Repo cible

**soutien-scolaire** : `../soutien-scolaire/` ou `E:/soutien-scolaire/`.

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `lib/curriculum/lecture-data.ts` | Modules L1–L8 |
| `lib/curriculum/word-pool.ts` | `wordHasPhoneme`, pools |
| `components/lecture/SoundPicker.tsx` | Exercices phonème |
| `public/assets/words/` | MP3 / images |

## Règles

- `wordHasPhoneme(word, phoneme)` — objet mot complet, pas `word.label`
- Types : `vowel`, `consonant`, `syllable`, `monosyllable`, `complex-sound`
- Audio manquant : `scripts/generate-missing-word-audio.py`

## Impression (lien ecole-manager)

Pattern print de référence : `ecole-manager/frontend/src/utils/print.js` (`openPrintPopup`, `injectForcedPrintCss`). Plan centralisation : `soutien-scolaire/docs/plan-section-impression.md`.
