import {getWorkerProjectByName, getWorkerRoot, parseArgs, run} from './lib/projects.mjs';
import {buildWorkerConfig} from './lib/wrangler-config.mjs';

async function runShellCommand(command, cwd) {
  const shell = process.env.SHELL || '/bin/bash';
  await run(shell, ['-lc', command], {cwd});
}

export async function deployWorkerProject(projectName) {
  const project = await getWorkerProjectByName(projectName);
  const workerRoot = getWorkerRoot(project);
  const worker = project.worker;

  if (worker.installCommand) {
    await runShellCommand(worker.installCommand, workerRoot);
  }

  await buildWorkerConfig(project);

  if (worker.typesCheckCommand) {
    await runShellCommand(worker.typesCheckCommand, workerRoot);
  }

  await runShellCommand(worker.deployCommand ?? 'npx wrangler deploy', workerRoot);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.project) {
    throw new Error('Usage: node scripts/deploy-worker-project.mjs --project <project-name>');
  }

  await deployWorkerProject(args.project);
  process.stdout.write(`deployed worker for ${args.project}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
