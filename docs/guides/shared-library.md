# Shared Library

`shared/` is the central staging layer for common Apps Script functionality.

## Folders

- `shared/src/workspace`: wrappers for Docs, Drive, Gmail, Sheets, and web app responses
- `shared/src/cloudflare`: Cloudflare API clients for AI Gateway, Workers AI, D1, KV, Images, and Vectorize
- `shared/src/ai`: provider-neutral AI access, prompt bases, and tool registry
- `shared/src/agentic`: reusable orchestration and knowledge crystallization helpers
- `shared/src/core`: runtime helpers for HTTP, JSON, and script properties

## Rules

- Extend an existing shared module before adding a new one.
- Keep Apps Script service calls inside shared helpers when the behavior will likely recur.
- Treat `shared/` changes as cross-project changes unless proven otherwise.
- Keep provider configuration externalized in Script Properties or CI secrets, never hard-coded.
