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
- `deployMode`: `push` or `versioned`

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
