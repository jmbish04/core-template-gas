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

Set `AI_GATEWAY_BASE_URL` in Script Properties to route provider requests through Cloudflare AI Gateway instead of a provider-native URL.

## Built-In Tooling

The workspace tool registry currently exposes functions for:

- Google Docs creation
- Drive file creation
- Gmail search
- Sheet range reads

The patterns are staged from the agentic and Google Workspace ideas in the local `retro-ref/*.md` notes, then normalized into repo code.
