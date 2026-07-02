import {getAffectedProjects} from './affected-projects.mjs';
import {deployProject} from './deploy-project.mjs';
import {parseArgs} from './lib/projects.mjs';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const {projects} = await getAffectedProjects({
    base: args.base,
    head: args.head
  });

  for (const project of projects) {
    await deployProject(project);
    process.stdout.write(`deployed ${project}\n`);
  }
}

await main();
