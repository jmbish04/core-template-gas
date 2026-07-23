import {buildWorkerConfig} from './lib/wrangler-config.mjs';
import {getWorkerProjectByName, parseArgs} from './lib/projects.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args.project) throw new Error('Usage: node scripts/build-worker-config.mjs --project <project-name>');
const project = await getWorkerProjectByName(args.project);
const {generatedPath} = await buildWorkerConfig(project);
process.stdout.write(`${generatedPath}\n`);
