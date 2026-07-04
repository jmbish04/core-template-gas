# Shared AI Reference

The AI layer is in [shared/src/ai](/Volumes/Projects/workers/core-template-gas/shared/src/ai).

## Current Surface

- `AiClient`
- `PromptCatalog`
- `WorkspaceToolRegistry`

## Provider Support

- OpenAI
- Anthropic
- Gemini
- Workers AI

## Cloudflare AI Gateway

The shared AI client now supports Cloudflare's updated account-scoped REST API pattern for AI Gateway.

- At deploy time, CI injects `CLOUDFLARE_ACCOUNT_ID` from GitHub secrets into the generated Apps Script bundle.
- Each project can define its default gateway ID in `projects/<name>/project.json`.
- The default repository fallback is `default-gateway`.

Runtime overrides still exist through Script Properties:

- `CLOUDFLARE_ACCOUNT_ID`
- `AI_GATEWAY_ID`
- `AI_USE_CLOUDFLARE_GATEWAY`
- `AI_GATEWAY_BASE_URL`

`AI_GATEWAY_BASE_URL` remains available as an escape hatch, but the preferred path is the updated Cloudflare REST API plus the `cf-aig-gateway-id` header.

## Built-In Tooling

The workspace tool registry currently exposes functions for:

- Google Docs creation
- Drive file creation
- Gmail search
- Sheet range reads

The patterns are staged from the agentic and Google Workspace ideas in the local `retro-ref/*.md` notes, then normalized into repo code.
