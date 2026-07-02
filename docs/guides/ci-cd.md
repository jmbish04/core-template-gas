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

## Security Boundary

- Fork PRs do not deploy.
- Draft PRs do not deploy.
- The workflow uses `pull_request`, not `pull_request_target`.

## Optional Versioned Deploys

If a project entry uses `"deployMode": "versioned"` and its secret payload includes `deploymentId`, the deploy script will run `clasp version` and `clasp deploy` after `clasp push`.
