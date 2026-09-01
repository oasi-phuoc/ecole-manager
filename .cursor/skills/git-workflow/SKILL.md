---
name: git-workflow
description: >-
  Workflow git ecole-manager (status, stash, pull --rebase, stash pop, push) sur
  main. Utiliser pour synchroniser origin ou pousser des changements locaux.
---

# Git workflow — ecole-manager

## Dépôt

- Remote : `origin` → `https://github.com/oasi-phuoc/ecole-manager.git`
- Branche principale : `main`
- Structure : `frontend/` (CRA React), `backend/` (Express)

## Sync avec modifications locales

```bash
cd E:\ecole-manager
git status
git stash push -u -m "wip: <description>"
git pull --rebase origin main
git stash pop
git push origin main
```

PowerShell : citer `"stash@{0}"`.

## Push sans stash

```bash
git pull --rebase origin main
git push origin main
```

## Commit

1. `git status` + `git diff` + `git log -5 --oneline`
2. Messages en français, style repo (« Bulletins: … », « TCF: … »)
3. Commit uniquement si demandé explicitement
4. Ne pas commit `.env` ni secrets

## Stashes obsolètes

`git stash show --stat "stash@{0}"` avant pop — dropper si déjà sur `main`.

## Règles

- Ne pas modifier `git config`
- Pas de force push sur `main` sans demande explicite

## Repo sibling

Pour **soutien-scolaire** : skill `git-workflow` dans `../soutien-scolaire/.cursor/skills/` (remote différent).
