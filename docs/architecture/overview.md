# Architecture Overview

This repository manages multiple Google Apps Script projects from one codebase.

## Design

- `projects/` contains deployable Apps Script apps.
- `shared/` contains reusable libraries shared by every app.
- `scripts/` contains repo automation for build, deploy, and affected-project detection.
- `dist/projects/<name>/` is generated output for clasp pushes.

## Why This Shape

The structure merges the strongest patterns from the local `retro-ref/` assets:

- the original repo's multi-project management pattern
- React-style `src/server` and `src/client` separation from `React-Google-Apps-Script-main`
- clasp-centric deployment workflows from the starter repos
- AI and agentic guidance staged from the loose `retro-ref/*.md` notes into `shared/src/ai` and `shared/src/agentic`

## Build Contract

Each project builds into:

- `Code.js`
- `Index.html`
- `appsscript.json`
- generated `.clasp.json` at deploy time only

## Deploy Contract

Deployments are driven by:

1. `projects.json`
2. `CLASP_PROJECTS_JSON`
3. `CLASP_CREDENTIALS_JSON`
4. root scripts under `scripts/`
