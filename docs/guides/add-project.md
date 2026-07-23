# Add A Project

## 1. Scaffold

```bash
npm run project:new -- --project my-new-project
```

This creates a starter `projects/my-new-project/` folder with:

- `appsscript.json`
- `project.json` with an `appsscript` configuration block
- `src/server/main.ts`
- `src/client/index.html`
- `src/client/main.tsx`

## 2. Register The Project

Add a new entry in [projects.json](/Volumes/Projects/workers/core-template-gas/projects.json).

## 3. Configure Apps Script

Set `appsscript.scriptId` in the new project's `project.json` to the ID from its Apps Script URL. The repo supplies the default GCP project (`discovery-383518`, project number `791610499666`) automatically; set `appsscript.projectId` only when the project needs a different GCP project.

If an existing deployment URL must remain stable, add its `deploymentId` to the optional `CLASP_PROJECTS_JSON` CI secret payload.

## 4. Reuse Shared Code

Import from `@shared/...` instead of copying code into the project.

## 5. Verify

```bash
npm run validate
npm run typecheck
npm run build:project -- --project my-new-project
```

## 6. Document

Update:

- [docs/guides/shared-library.md](/Volumes/Projects/workers/core-template-gas/docs/guides/shared-library.md) if the project expands shared behavior
- [docs/guides/ci-cd.md](/Volumes/Projects/workers/core-template-gas/docs/guides/ci-cd.md) if deployment behavior changes
- the project README if the app's role becomes more specific
