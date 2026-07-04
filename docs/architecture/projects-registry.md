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
- `secretKey`: key used inside `CLASP_PROJECTS_JSON`

Manifest policy is enforced centrally by the build and validation scripts:

- `timeZone` must always be `America/Los_Angeles`
- `oauthScopes` must explicitly match the bundled Apps Script services used by the project server code
- optional additive scopes belong in `projects/<project-name>/project.json` under `manifest.additionalOauthScopes`

## Root Impact Paths

`rootImpactPaths` define changes that affect every Apps Script project. Shared code and build tooling live there, so any change under those paths expands the affected set to all projects.

## Example Secret Payload

```json
{
  "workspace-admin": {
    "scriptId": "YOUR_SCRIPT_ID",
    "parentId": ["OPTIONAL_PARENT_FILE_ID"],
    "deploymentId": "OPTIONAL_DEPLOYMENT_ID"
  }
}
```

When `deploymentId` is present, deploy automation updates that same active deployment instead of creating a new one, preserving the production URL.
