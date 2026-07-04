import {getProjects} from './lib/projects.mjs';

const projects = await getProjects();
process.stdout.write(`${projects.map((project) => project.name).join('\n')}\n`);
