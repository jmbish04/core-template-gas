# Deep Research Companion

`deep-research-companion` is a managed Apps Script project inside the multi-project monorepo.

It imports a real standalone Gemini Deep Research workflow and restructures it into:

- typed server modules for Drive monitoring, document formatting, markdown extraction, worker sync, and notifications
- a React client for browsing Drive-hosted HTML/PWA exports
- a sibling `worker/` folder containing the paired Cloudflare Worker application

## Runtime behavior

- scans the configured Drive folder every 5 minutes
- formats new Google Docs exports
- converts formatted documents to markdown
- syncs reports and HTML exports to the paired Cloudflare worker API
- previews Drive HTML exports through the Apps Script web app

## Required script properties

- `DEEP_RESEARCH_TARGET_FOLDER_ID`
- `DEEP_RESEARCH_LOG_FOLDER_ID`
- `DEEP_RESEARCH_BACKFILL_FOLDER_ID`
- `RESEARCH_ARCHIVE_WORKER_BASE_URL`
- `RESEARCH_ARCHIVE_WORKER_API_KEY`
- `RESEARCH_ARCHIVE_WORKER_GATEWAY_ID` (optional override; defaults to the repo/project AI Gateway ID)

## Worker pairing

The sibling [`worker`](./worker) directory is a vendored copy of `jmbish04/core-template-cfw-assets-astro-shadcn` and is the intended Cloudflare-side pair for this Apps Script project.
