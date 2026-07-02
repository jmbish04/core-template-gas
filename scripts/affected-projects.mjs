import fs from 'node:fs/promises';
import {detectAffectedProjects, parseArgs, run} from './lib/projects.mjs';

export async function getChangedFiles(base, head) {
  const revisionRange = base ? `${base}...${head ?? 'HEAD'}` : 'HEAD~1...HEAD';
  const {stdout} = await run('git', ['diff', '--name-only', revisionRange]);
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function getAffectedProjects({base, head}) {
  const changedFiles = await getChangedFiles(base, head);
  const projects = await detectAffectedProjects(changedFiles);
  return {changedFiles, projects};
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = await getAffectedProjects({
    base: args.base,
    head: args.head
  });

  if (args.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write(`${payload.projects.join('\n')}\n`);
  }

  if (args['github-output']) {
    const outputFile = process.env.GITHUB_OUTPUT;
    if (!outputFile) {
      throw new Error('GITHUB_OUTPUT is not defined.');
    }

    await fs.appendFile(outputFile, `projects=${JSON.stringify(payload.projects)}\n`);
    await fs.appendFile(outputFile, `count=${payload.projects.length}\n`);
    await fs.appendFile(outputFile, `has_projects=${String(payload.projects.length > 0)}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
