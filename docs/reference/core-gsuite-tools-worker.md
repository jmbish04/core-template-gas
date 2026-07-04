# core-gsuite-tools Worker

This repo expects a sibling Cloudflare Worker repo at [core-gsuite-tools](/Volumes/Projects/workers/core-template-gas/core-gsuite-tools), implemented as a symlink to `/Volumes/Projects/workers/core-gsuite-tools`.

## Purpose

That worker is the shared REST hub between Apps Script and infrastructure:

- Google Workspace agents
- Cloudflare D1
- Cloudflare KV
- Cloudflare Vectorize
- Cloudflare Images
- Workers AI
- AI Gateway routing

## Deployed Base URL

The shared Apps Script client defaults to:

`https://core-gsuite-tools.hacolby.workers.dev`

## Observed Current Surface

On July 2, 2026, the deployed worker OpenAPI at `/openapi.json` advertised typed Google Workspace, accounts, auth, RAG, chat, settings, and health endpoints. It did not advertise dedicated Cloudflare storage proxy endpoints yet.

## Repo Contract

The Apps Script shared layer still exposes a generic Cloudflare proxy contract against that worker so the two repos converge on a stable interface instead of forcing per-project direct Cloudflare API usage.
