import {getProjects} from './lib/projects.mjs';
import {buildProject} from './build-project.mjs';

async function main() {
  const projects = await getProjects();
  for (const project of projects) {
    await buildProject(project.name);
    process.stdout.write(`built ${project.name}\n`);
  }
}

await main();
