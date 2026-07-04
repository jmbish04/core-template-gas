# CI/CD

This repo has two workflow layers.

## Validation

`.github/workflows/ci.yml` runs on push and pull request:

- `npm ci`
- `npm run validate`
- `npm run typecheck`
- `npm run build`

## Affected PR Deploys

`.github/workflows/deploy-affected-pr.yml` runs on same-repository pull requests and deploys only affected projects.

## Required Secrets

- `CLASP_CREDENTIALS_JSON`: full clasp credentials JSON written to `~/.clasprc.json`
- `CLASP_PROJECTS_JSON`: per-project script metadata
- `CLOUDFLARE_ACCOUNT_ID`: injected into generated Apps Script server bundles before `clasp push`

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

## Security Boundary

- Fork PRs do not deploy.
- Draft PRs do not deploy.
- The workflow uses `pull_request`, not `pull_request_target`.

## Optional Versioned Deploys

If a project entry uses `"deployMode": "versioned"` and its secret payload includes `deploymentId`, the deploy script will run `clasp version` and `clasp deploy` after `clasp push`.
