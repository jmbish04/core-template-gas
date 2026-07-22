# Projects Registry

The root [projects.json](/Volumes/Projects/workers/core-template-gas/projects.json) file is authoritative.

## Required Fields

- `name`: stable project key used in scripts and secrets
- `displayName`: human-facing label
- `path`: path under `projects/`
- `serverEntry`: Apps Script server entrypoint
- `clientEntry`: React client entrypoint
- `clientHtml`: HTML shell for the client bundle
- `manifest`: `appsscript.json` path
- `secretKey`: legacy/CI override key used inside `CLASP_PROJECTS_JSON`

## Per-project Apps Script Configuration

Stable Apps Script metadata belongs beside each project in `projects/<project-name>/project.json`:

```json
{
  "appsscript": {
    "scriptId": "YOUR_APPS_SCRIPT_DRIVE_ID",
    "deploymentId": "OPTIONAL_EXISTING_DEPLOYMENT_ID",
    "rootDir": "./src",
    "projectId": "OPTIONAL_CUSTOM_GCP_PROJECT_ID",
    "fileExtension": "ts",
    "filePushOrder": ["src/Config.ts", "src/Utils.ts", "src/Main.ts"]
  }
}
```

- `scriptId` is required for deployment; new projects scaffold it as an empty string until the Apps Script project is created.
- `deploymentId` keeps an existing web app or API-executable URL stable by updating that deployment instead of creating another one.
- `rootDir` and `fileExtension` describe the monorepo source layout. Deploys still run clasp from the generated `dist/projects/<name>` directory so bundled TypeScript is pushed as Apps Script-compatible JavaScript.
- `projectId` overrides the repository default GCP project ID when present.
- `filePushOrder` is optional and is forwarded to generated clasp configuration.

Repository-wide defaults live under `appsscriptDefaults` in `projects.json`. The default GCP project is `discovery-383518` (project number `791610499666`), so individual project files do not need to repeat it.

The repository-root `appsscript.json` is the mandatory manifest policy. At build time its fields overwrite same-named fields from every project manifest and are inserted when absent. Project-only fields such as `dependencies` remain intact, while OAuth scopes are the union of root-required scopes, inferred service scopes, and `manifest.additionalOauthScopes`.

Manifest policy is enforced centrally by the build and validation scripts:

- `timeZone` must always be `America/Los_Angeles`
- `exceptionLogging` must always be `STACKDRIVER`
- `runtimeVersion` must always be `V8`
- `webapp` must always execute as `USER_DEPLOYING` with `MYSELF` access
- `executionApi` must always use `MYSELF` access
- `oauthScopes` must explicitly match the bundled Apps Script services used by the project server code
- optional additive scopes belong in `projects/<project-name>/project.json` under `manifest.additionalOauthScopes`

## Optional Worker Fields

- `worker.path`: path to the paired Cloudflare worker directory
- `worker.installCommand`: command run before deploy inside the worker directory
- `worker.typesCheckCommand`: CI freshness check for generated Wrangler types
- `worker.deployCommand`: deploy command run inside the worker directory

## Root Impact Paths

`rootImpactPaths` define changes that affect every Apps Script project. Shared code and build tooling live there, so any change under those paths expands the affected set to all projects.

`rootWorkerImpactPaths` does the same for paired Cloudflare worker deploys. When a project defines `worker.path`, any change under that project's `path` is treated as affecting the paired worker deploy, and `worker.path` remains the explicit worker-root anchor for install/typecheck/deploy commands.

## Optional CI Override Payload

```json
{
  "workspace-admin": {
    "parentId": ["OPTIONAL_PARENT_FILE_ID"],
    "deploymentId": "OPTIONAL_DEPLOYMENT_ID"
  }
}
```

`scriptId` and `deploymentId` may still be supplied here as backwards-compatible fallbacks, but `project.json` is the normal source. When `deploymentId` is present, deploy automation updates that same active deployment instead of creating a new one, preserving the production URL.

## Deployment Script Properties

The optional GitHub secret `APPS_SCRIPT_PROPERTIES_JSON` provisions Script Properties after a deploy:

```json
{
  "defaults": {
    "GEMINI_API_KEY": "shared-secret-value",
    "RESEARCH_ARCHIVE_WORKER_API_KEY": "shared-secret-value"
  },
  "projects": {
    "deep-research-companion": {
      "GEMINI_API_KEY": "optional-project-override"
    }
  }
}
```

Default properties apply to every deployed Apps Script; project properties overwrite matching defaults. Values must be strings. The JSON stays in GitHub Actions and is passed to the generated `applyDeploymentScriptProperties` Apps Script function through `clasp run-function`; it is never written into the generated source bundle.

Remote property provisioning requires an API-executable deployment, the Apps Script API enabled on the associated standard GCP project, and clasp credentials authorized to execute the script. A normal `clasp push` cannot set Script Properties by itself.

The generated `.clasp.json` always contains the resolved GCP `projectId`, but Google requires an existing Apps Script project to be associated with that standard GCP project separately in Apps Script Project Settings using the project number. Clasp configuration alone does not change that association.
