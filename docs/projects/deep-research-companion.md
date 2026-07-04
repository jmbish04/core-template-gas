# Deep Research Companion

## Purpose

`deep-research-companion` is the imported Gemini Deep Research monitoring Apps Script, modularized to fit the repository contract. It watches a Drive folder for new Google Docs and HTML/PWA exports, formats reports, previews PWAs through an Apps Script web app, and syncs both asset types into a paired Cloudflare worker.

## Layout

- `projects/deep-research-companion/src/server`
  - Drive scan orchestration
  - tracking sheet repository
  - document formatting and pagination locks
  - Google Doc markdown serialization
  - worker sync client
- `projects/deep-research-companion/src/client`
  - React web app for listing and previewing Drive HTML exports
- `projects/deep-research-companion/worker`
  - vendored Cloudflare Worker app based on `core-template-cfw-assets-astro-shadcn`

## Required configuration

- Apps Script script properties
  - `DEEP_RESEARCH_TARGET_FOLDER_ID`
  - `DEEP_RESEARCH_LOG_FOLDER_ID`
  - `DEEP_RESEARCH_BACKFILL_FOLDER_ID`
  - `RESEARCH_ARCHIVE_WORKER_BASE_URL`
  - `RESEARCH_ARCHIVE_WORKER_API_KEY`
  - `RESEARCH_ARCHIVE_WORKER_GATEWAY_ID` (optional)
- GitHub / CI secret mapping
  - `CLASP_PROJECTS_JSON.deep-research-companion.scriptId`
  - optional `CLASP_PROJECTS_JSON.deep-research-companion.parentId`
- Worker-side secrets/bindings
  - `WORKER_API_KEY`
  - `GEMINI_API_KEY`
  - D1, R2, and Vectorize bindings for the research archive domain

## Maintenance notes

- The Apps Script build only deploys `appsscript.json`, `Code.js`, and `Index.html`. HTML preview content remains Drive-hosted and is loaded dynamically at runtime.
- The paired worker is intentionally nested under the project folder. Exclude `projects/*/worker/**` from root TypeScript checks unless the root toolchain is expanded to understand the worker app.
