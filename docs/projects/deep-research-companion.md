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

Research source folders and shared runtime defaults are declared once in `projects/deep-research-companion/research-folders.ts`. `RESEARCH_FOLDERS` pairs each Drive folder ID with its `researchCategory`; the scanner iterates every entry automatically, and the tracking spreadsheet records that category in its `Research Category` column. The same module exports the log folder, backfill folder, tracking-sheet property and ID, and Worker base URL for both runtimes.

The checked-in categories are:

- `DEFAULT`: general research processing
- `PRODUCT`: home-remodel product research
- `BRAND`: home-remodel brand research
- `SHOWROOM`: home-remodel showroom research

Folder IDs may still be overridden with script properties. The general folder retains `DEEP_RESEARCH_TARGET_FOLDER_ID`; other entries use `DEEP_RESEARCH_<CONFIG_KEY>_FOLDER_ID`, such as `DEEP_RESEARCH_SHOWROOM_FOLDER_ID`.

- Apps Script script properties
  - `DEEP_RESEARCH_TARGET_FOLDER_ID`
  - `DEEP_RESEARCH_LOG_FOLDER_ID`
  - `DEEP_RESEARCH_BACKFILL_FOLDER_ID`
  - `RESEARCH_ARCHIVE_WORKER_BASE_URL`
  - `RESEARCH_ARCHIVE_WORKER_API_KEY`
  - `RESEARCH_ARCHIVE_WORKER_GATEWAY_ID` (optional)
- GitHub / CI secret mapping
  - `projects/deep-research-companion/project.json` → `appsscript.scriptId`
  - optional `CLASP_PROJECTS_JSON.deep-research-companion.parentId`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_API_TOKEN`
- Worker-side secrets/bindings
  - `WORKER_API_KEY`
  - `GEMINI_API_KEY`
  - D1, R2, and Vectorize bindings for the research archive domain

## Maintenance notes

- The Apps Script build deploys `appsscript.json`, a small timestamped `Code.js` with explicit runnable entrypoints, bundled logic in `Compiled.js`, and `Index.html`. HTML preview content remains Drive-hosted and is loaded dynamically at runtime.
- The five-minute Apps Script trigger sends new document/PWA payloads and then calls `/api/research/drive/wake`; the Worker acknowledges immediately and reconciles all configured Drive folders in the background. Its independent fifteen-minute cron remains the fallback.
- D1 deduplicates Drive assets by their stable Google file IDs and skips revisions whose `driveModifiedAt` is already current.
- The Worker also scans the shared Apps Script log folder for `*_processing_log.json` files. D1 stores file/document metadata in `appsscript_logger_files`, normalized `elements` entries in `appsscript_logger_lines`, and one parsed `element_type`/`error`/`snippet` row per error-array object in `appsscript_logger_errors`; original element objects remain available as JSON.
- Automatic Doc/HTML relations require visible-content overlap, title support, creation-time proximity, category agreement, an unused document, and a clear lead over the next candidate. Manual corrections are marked `MANUAL` and survive later Drive scans.
- The paired worker is intentionally nested under the project folder. Exclude `projects/*/worker/**` from root TypeScript checks unless the root toolchain is expanded to understand the worker app.
