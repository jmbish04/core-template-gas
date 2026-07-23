# Architecture Overview

This repository manages multiple Google Apps Script projects from one codebase.

## Design

- `projects/` contains deployable Apps Script apps.
- some projects also contain a paired `worker/` directory for Cloudflare infrastructure
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

- `Code.js`, containing explicit Apps Script editor entrypoints and the build timestamp
- `Compiled.js`, containing the bundled server implementation
- `Index.html`
- `appsscript.json`
- generated `.clasp.json` at deploy time only

## Deploy Contract

Deployments are driven by:

1. `projects.json`
2. each project's `project.json`, including `appsscript.scriptId`
3. `CLASP_CREDENTIALS_JSON`
4. optional `CLASP_PROJECTS_JSON` deployment metadata/compatibility overrides
5. `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` for paired worker deploys
6. root scripts under `scripts/`

## Worker Configuration Contract

The root `wrangler.jsonc` is the mandatory policy shared by every paired Worker. Each
`projects/<name>/worker/wrangler.jsonc` remains the source for Worker identity and
project resources such as `name`, `main`, `compatibility_date`, D1, KV, Vectorize,
R2, Durable Objects, migrations, and schedules.

Before development, type generation, migrations, or deployment,
`scripts/build-worker-config.mjs` merges both files into the ignored
`wrangler.generated.jsonc`. Root policy wins for shared runtime flags,
observability, Assets, Workers AI, common model variables, and standard Secrets
Store bindings. Wrangler's generated-configuration redirect under
`.wrangler/deploy/config.json` makes deploy and dev commands consume that merged
file.
