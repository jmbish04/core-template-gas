import {getAffectedWorkerProjects} from './affected-worker-projects.mjs';
import {parseArgs} from './lib/projects.mjs';
import {deployWorkerProject} from './deploy-worker-project.mjs';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const {projects} = await getAffectedWorkerProjects({
    base: args.base,
    head: args.head
  });

  for (const project of projects) {
    await deployWorkerProject(project);
    process.stdout.write(`deployed worker for ${project}\n`);
  }
}

await main();
