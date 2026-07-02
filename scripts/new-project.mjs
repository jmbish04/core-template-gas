import fs from 'node:fs/promises';
import path from 'node:path';
import {parseArgs, repoRoot} from './lib/projects.mjs';

function toDisplayName(name) {
  return name
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

async function writeFile(filePath, contents) {
  await fs.mkdir(path.dirname(filePath), {recursive: true});
  await fs.writeFile(filePath, contents);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectName = args.project;

  if (!projectName) {
    throw new Error('Usage: node scripts/new-project.mjs --project <project-name>');
  }

  const projectRoot = path.join(repoRoot, 'projects', projectName);
  const displayName = toDisplayName(projectName);

  await writeFile(
    path.join(projectRoot, 'appsscript.json'),
    JSON.stringify(
      {
        timeZone: 'America/Los_Angeles',
        runtimeVersion: 'V8',
        exceptionLogging: 'STACKDRIVER',
        webapp: {
          access: 'ANYONE',
          executeAs: 'USER_DEPLOYING'
        }
      },
      null,
      2
    ) + '\n'
  );

  await writeFile(
    path.join(projectRoot, 'src', 'server', 'main.ts'),
    `function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('${displayName}');
}

Object.assign(globalThis, {doGet});

export {};
`
  );

  await writeFile(
    path.join(projectRoot, 'src', 'client', 'index.html'),
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${displayName}</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`
  );

  await writeFile(
    path.join(projectRoot, 'src', 'client', 'main.tsx'),
    `import React from 'react';
import {createRoot} from 'react-dom/client';

function App() {
  return <main>${displayName}</main>;
}

createRoot(document.getElementById('root')!).render(<App />);
`
  );

  process.stdout.write(`Scaffolded ${projectName} at ${projectRoot}\n`);
  process.stdout.write('Remember to add it to projects.json and docs.\n');
}

await main();
