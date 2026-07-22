# AGENTS.md

## Mission

`deep-research-companion` is the Apps Script side of a paired research archive system. It monitors Drive for Gemini research documents and HTML/PWA exports, formats reports, previews PWAs, and synchronizes both asset types into the sibling Cloudflare worker.

## Non-Negotiable Structure

- Keep Apps Script source under `src/server` and `src/client`.
- Treat the sibling `worker/` directory as the authoritative paired infrastructure for research archive storage, search, relations, and Gemini passthrough behavior.
- Do not move worker-specific logic into `shared/` unless it is truly multi-project infrastructure.

## Apps Script Responsibilities

- Poll the configured Drive folder for new Google Docs and HTML exports.
- Format Google Docs before sync.
- Serialize Google Docs into markdown for worker ingestion.
- Push document and PWA payloads to the paired worker API.
- Preserve the Drive-hosted HTML preview model; the Apps Script build ships entrypoints in `Code.js`, bundled logic in `Compiled.js`, `Index.html`, and `appsscript.json`.

## Configuration Rules

- Prefer script properties over hard-coded IDs.
- Respect `RESEARCH_ARCHIVE_WORKER_GATEWAY_ID`; default to the repo/project gateway when unset.
- Never commit live `.clasp.json` files or inline credentials.

## Formatting Rules

- Keep document formatting logic centralized in `src/server/DocumentFormatter.ts`.
- If title normalization or pagination rules change, document the behavior in the project README and keep the logic deterministic.
- Preserve the advanced Docs API pagination-lock pass unless the replacement is fully equivalent.

## Worker Contract

- Document ingest route: `/api/research/documents/ingest`
- PWA ingest route: `/api/research/pwas/ingest`
- Apps Script wake-up route: `/api/research/drive/wake`
- PWA preview route: `/api/research/pwas/:driveFileId/render`
- Gemini passthrough route: `/api/research/gemini-proxy`

If these contracts change, update this file, the project README, and the worker-side AGENTS instructions in the same turn.
