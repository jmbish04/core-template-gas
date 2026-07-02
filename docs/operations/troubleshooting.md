# Troubleshooting

## `clasp push` fails in CI

Check:

- `CLASP_CREDENTIALS_JSON` is valid JSON
- `CLASP_PROJECTS_JSON` contains the current project key
- the project `scriptId` is correct

## A project was not detected as affected

Check:

- the project is registered in `projects.json`
- the changed files actually fall under `projects/<name>/`
- the change was not excluded because it only touched docs

## A shared change should deploy every project

Make sure the changed path is covered by `rootImpactPaths` in `projects.json`.

## The client bundle does not render

Check:

- `src/client/index.html` contains `<div id="root"></div>`
- `src/client/main.tsx` mounts into `root`
- `npm run build:project -- --project <name>` completes locally
