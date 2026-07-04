# Ultimate Apps Script Workspace

This repository is a single control plane for many Google Apps Script projects.

It is built around three ideas:

- `projects/` holds every deployable Apps Script project.
- `shared/` holds the centralized Apps Script library used across projects.
- root `scripts/` and GitHub Actions manage build, affected-project detection, and clasp deployment.

The structure combines the strongest ideas from the local `retro-ref/` references:

- multi-project repo management from the existing starter already in this repo
- React-oriented Apps Script frontend separation inspired by `React-Google-Apps-Script-main`
- clasp-first build and deploy automation from the clasp starters
- AI, agentic, and Google Workspace patterns staged into `shared/` from the loose markdown references in `retro-ref/*.md`

## Repo Layout

```text
.
├── AGENTS.md
├── core-gsuite-tools -> /Volumes/Projects/workers/core-gsuite-tools
├── docs/
├── projects/
│   └── workspace-admin/
├── retro-ref/
├── scripts/
├── shared/
│   └── src/
└── projects.json
```

## Core Commands

```bash
npm install
npm run validate
npm run typecheck
npm run build
npm run deno:build
npm run deno:test
npm run build:project -- --project workspace-admin
npm run deploy:project -- --project workspace-admin
npm run projects:affected -- --base origin/main --head HEAD --json
```

## Deno Starter

The repo now also carries a root-level Deno-based Apps Script starter derived from `gas-deno-starter`.

- [deno.jsonc](/Volumes/Projects/workers/core-template-gas/deno.jsonc)
- [_build.ts](/Volumes/Projects/workers/core-template-gas/_build.ts)
- [main.ts](/Volumes/Projects/workers/core-template-gas/main.ts)
- [main.test.ts](/Volumes/Projects/workers/core-template-gas/main.test.ts)
- [.vscode/settings.json](/Volumes/Projects/workers/core-template-gas/.vscode/settings.json)

This Deno surface is additive and does not replace the main multi-project Node-based workspace tooling.

## Project Registry

All deployable apps are declared in [projects.json](/Volumes/Projects/workers/core-template-gas/projects.json). The registry drives:

- build orchestration
- affected-project detection
- clasp secret resolution
- CI/CD matrix generation

## Shared Library

The shared layer is in [shared/src](/Volumes/Projects/workers/core-template-gas/shared/src) and is grouped by capability:

- `workspace/` for Google Workspace helpers
- `cloudflare/` for Workers AI, AI Gateway, D1, KV, Images, Vectorize, direct Cloudflare API helpers, and the deployed `core-gsuite-tools.hacolby.workers.dev` REST bridge
- `ai/` for multi-provider LLM access and tool-enabled workflows
- `agentic/` for reusable orchestration and knowledge crystallization patterns
- `core/` for fetch, config, serialization, and runtime helpers

## Linked Worker

The repo includes a root symlink, [core-gsuite-tools](/Volumes/Projects/workers/core-template-gas/core-gsuite-tools), which is expected to point at the sibling Cloudflare Worker repo at `/Volumes/Projects/workers/core-gsuite-tools`.

That worker is the intended Cloudflare-facing control plane for Apps Script. The shared Apps Script layer now defaults its worker bridge to `https://core-gsuite-tools.hacolby.workers.dev`.

## CI/CD

Pull requests run validation and can deploy only the affected Apps Script projects when secrets are available and the PR branch lives in the same repository.

See [docs/guides/ci-cd.md](/Volumes/Projects/workers/core-template-gas/docs/guides/ci-cd.md) for the exact secret contract.
