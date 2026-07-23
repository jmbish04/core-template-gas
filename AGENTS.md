# AGENTS.md

## Mission

This repository is the single source of truth for multiple Google Apps Script projects. Future agents must preserve that contract.

## Non-Negotiable Structure

- Every deployable script lives under `projects/<project-name>/`.
- If a project ships with a sibling `worker/` folder, treat that worker as intentionally paired infrastructure for the project and keep the pairing documented in the project README and `docs/projects/`.
- Shared code lives under `shared/` and is imported by projects instead of duplicated.
- The project registry in `projects.json` is authoritative.
- Documentation changes belong in `docs/` instead of expanding the root `README.md` indefinitely.
- The root symlink `core-gsuite-tools` is the expected local anchor to the sibling Cloudflare Worker repo that exposes Cloudflare and Google Workspace services over REST.

## Project Contract

Every project must include:

- `project.json` if project-specific metadata is needed beyond the root registry
- `appsscript.json`
- `src/server/main.ts`
- `src/client/index.html`
- `src/client/main.tsx`

## Build And Deploy Rules

- Use the root Node scripts in `scripts/`; do not add ad hoc per-project shell workflows when the shared scripts can be extended.
- Treat root `wrangler.jsonc` as mandatory shared Worker policy. Keep Worker identity and project-specific Cloudflare resources in each paired `worker/wrangler.jsonc`; deploy only the merged generated config produced by `scripts/build-worker-config.mjs`.
- Do not commit live `.clasp.json` credentials.
- Apps Script IDs belong in each project's `project.json` under `appsscript.scriptId`; CI injects clasp credentials through `CLASP_CREDENTIALS_JSON`, while `CLASP_PROJECTS_JSON` remains optional for deployment IDs and compatibility overrides.
- Use `scripts/update-clasp-github-secret.sh` to push local `clasp` credentials into the GitHub `CLASP_CREDENTIALS_JSON` secret when rotating or refreshing auth.
- Every `appsscript.json` must keep `timeZone` set to `America/Los_Angeles`.
- The repository-root `appsscript.json` is mandatory manifest policy. Its fields overwrite project-level manifest values during build; project manifests may add project-specific dependencies and scopes but cannot override root policy fields.
- Every `appsscript.json` must declare explicit `oauthScopes` that match the Apps Script services the bundled server code actually uses. At minimum, verify `DocumentApp` and `Docs` imply Docs scope, `SpreadsheetApp` implies Sheets scope, `DriveApp` implies Drive scope, `Session.getActiveUser().getEmail()` implies `userinfo.email`, `UrlFetchApp` implies `script.external_request`, `PropertiesService` implies `script.storage`, `ScriptApp` implies `script.scriptapp`, UI methods imply `script.container.ui`, `MailApp` implies `script.send_mail`, and `GmailApp` implies Gmail scope.
- If a project has a live deployment ID, deployment automation must update that same deployment ID instead of creating a replacement deployment so web app or add-on URLs remain stable.
- If a shared library change impacts runtime behavior, assume all projects are affected unless the impact surface is clearly narrowed in code and docs.

## Shared Library Rules

- Put Google Workspace wrappers in `shared/src/workspace`.
- Put one reusable tool definition per file in `shared/src/tools/<domain>/` and compose them through `shared/src/ai/ToolRegistry.ts`.
- Put Cloudflare service integrations in `shared/src/cloudflare`.
- Prefer routing Apps Script-to-Cloudflare traffic through the `core-gsuite-tools.hacolby.workers.dev` worker bridge when the goal is shared multi-project infrastructure, auth centralization, or generic D1/KV/Vectorize support.
- Put provider-neutral AI orchestration in `shared/src/ai`.
- Put prompt bases, reusable planning flows, and knowledge crystallization helpers in `shared/src/agentic`.
- Prefer extending an existing shared module over creating a near-duplicate.
- New shared functions should carry detailed JSDoc describing inputs, behavior, and return shapes.

## AI / Cloudflare Expectations

- The shared AI client must continue supporting OpenAI, Anthropic, Gemini, and Workers AI.
- Cloudflare AI Gateway routing must stay optional and provider-aware.
- Shared tool execution should remain grounded in Apps Script primitives for Docs, Sheets, Drive, Gmail, and web app flows.
- If the deployed `core-gsuite-tools` worker does not yet advertise a desired Cloudflare proxy endpoint, preserve the shared client contract and document the gap instead of silently changing Apps Script callers back to raw per-project Cloudflare API calls.
- When a project-specific Cloudflare worker exists under `projects/<project-name>/worker`, prefer extending that worker for project-domain storage and UI rather than forcing the feature back into the shared `core-gsuite-tools` bridge.

## Documentation Requirements

When adding or changing a project, update:

- `projects.json`
- relevant `docs/guides/*`
- relevant `docs/reference/*`
- project-level `AGENTS.md` files when a subproject has its own operating constraints
- the project folder README when behavior changes materially

## CI/CD Requirements

- Pull requests should validate affected projects.
- Same-repository pull requests may deploy affected projects when secrets exist.
- Never switch to `pull_request_target` just to access secrets without a clear security review.
