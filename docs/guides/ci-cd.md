# CI/CD

This repo has three workflow layers.

## Validation

`.github/workflows/ci.yml` runs on push and pull request:

- `npm ci`
- `npm run validate`
- `npm run typecheck`
- `npm run build`

## Affected Apps Script Deploys

`.github/workflows/deploy-affected-pr.yml` deploys only affected Apps Script projects on:

- same-repository pull requests
- pushes to `master`
- manual `workflow_dispatch` runs

## Affected Cloudflare Worker Deploys

`.github/workflows/deploy-affected-workers-pr.yml` deploys only affected projects that define a paired `worker/` directory on:

- same-repository pull requests
- pushes to `master`
- manual `workflow_dispatch` runs

## Required Secrets

- `CLASP_CREDENTIALS_JSON`: full clasp credentials JSON written to `~/.clasprc.json`
- `CLASP_PROJECTS_JSON` (optional): per-project deployment IDs, parent IDs, or legacy script ID overrides
- `APPS_SCRIPT_PROPERTIES_JSON` (optional): shared Script Property defaults plus per-project overrides applied through the Apps Script Execution API after deployment
- `CLOUDFLARE_ACCOUNT_ID`: injected into generated Apps Script server bundles before `clasp push`
- `CLOUDFLARE_API_TOKEN`: Wrangler deploy token used by paired worker PR deploys

Apps Script IDs live in each `projects/<name>/project.json` file under `appsscript.scriptId`. `CLASP_PROJECTS_JSON` should include each project's existing active `deploymentId` whenever the script already has a live web app, add-on, or execution API deployment that must keep the same URL.

## Local Secret Sync

Use [`scripts/update-clasp-github-secret.sh`](/Volumes/Projects/workers/core-template-gas/scripts/update-clasp-github-secret.sh) to refresh `CLASP_CREDENTIALS_JSON` from your local `clasp` login:

```bash
scripts/update-clasp-github-secret.sh
```

The script:

- reads `~/.clasprc.json` by default
- falls back to `~/.config/clasp/.clasprc.json`
- infers the GitHub repo from `origin`, or accepts `--repo owner/name`
- updates the target secret with `gh secret set`

Use [`scripts/update-cloudflare-github-secrets.sh`](/Volumes/Projects/workers/core-template-gas/scripts/update-cloudflare-github-secrets.sh) to refresh the worker deploy secrets from your local `tokens` CLI:

```bash
scripts/update-cloudflare-github-secrets.sh
```

The script:

- reads `CLOUDFLARE_ACCOUNT_ID` from `tokens show CLOUDFLARE_ACCOUNT_ID --value-only`
- reads the Wrangler API token from `tokens show CLOUDFLARE_WRANGLER_API_TOKEN --value-only`
- writes GitHub secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`
- infers the GitHub repo from `origin`, or accepts `--repo owner/name`

## Security Boundary

- Fork PRs do not deploy.
- Draft PRs do not deploy.
- The workflow uses `pull_request`, not `pull_request_target`.
- Push deploys are limited to `master`.

## Stable Deployment Updates

If a project's secret payload includes `deploymentId`, the deploy script will:

- `clasp push` the latest code
- `clasp version` to create a new immutable revision
- `clasp deploy --deploymentId <existing-id> --versionNumber <new-version>` so the existing deployment URL stays unchanged

If no `deploymentId` is configured, the workflow stops after `clasp push`.

When `APPS_SCRIPT_PROPERTIES_JSON` is configured, the deploy script subsequently calls the generated `applyDeploymentScriptProperties` function. This requires an API-executable deployment and authorized clasp credentials; property provisioning fails the deployment rather than silently leaving stale secrets.

Clasp can print a remote execution permission failure while exiting with status zero. The deploy script inspects clasp output and converts that condition into a real CI failure.

## Worker Deploy Contract

Worker deploy detection is registry-driven through `projects.json`.

- A project participates in worker deploys only when it defines `worker.path`.
- `scripts/affected-worker-projects.mjs` mirrors affected-project detection for worker-backed projects: changes anywhere under the owning project folder trigger the paired worker deploy, and direct changes under `worker.path` also trigger it.
- `scripts/deploy-worker-project.mjs` runs the registry-defined install, `wrangler types --check`, and deploy commands inside the paired worker directory.
- Before type checking or deployment, the deploy script merges the repository-root `wrangler.jsonc` policy with the project's `worker/wrangler.jsonc` into ignored `wrangler.generated.jsonc` output.
- Shared root fields override project values. Worker identity and project-specific resource bindings remain in the project config.
- Direct Worker development, migration, type-generation, preview, and deploy scripts generate the same effective config, so local and CI behavior stay aligned.
- PR runs diff against the PR base branch, push runs diff against `github.event.before`, and manual dispatch falls back to `HEAD~1...HEAD`.
