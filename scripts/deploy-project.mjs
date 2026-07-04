import fs from 'node:fs/promises';
import path from 'node:path';
import {buildProject} from './build-project.mjs';
import {getDistRoot, getProjectByName, getProjectSecret, parseArgs, run} from './lib/projects.mjs';

function parseVersionNumber(stdout) {
  const match = stdout.match(/Created version (\d+)/);
  return match?.[1];
}

async function writeClaspConfig(project) {
  const secret = getProjectSecret(project);
  if (!secret?.scriptId) {
    throw new Error(
      `Missing scriptId for ${project.name}. Set CLASP_PROJECTS_JSON or CLASP_SCRIPT_ID_${project.name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')}.`
    );
  }

  const claspConfig = {
    scriptId: secret.scriptId,
    rootDir: '.'
  };

  if (secret.parentId) {
    claspConfig.parentId = Array.isArray(secret.parentId) ? secret.parentId : [secret.parentId];
  }

  const distRoot = getDistRoot(project);
  await fs.writeFile(path.join(distRoot, '.clasp.json'), `${JSON.stringify(claspConfig, null, 2)}\n`);
  return secret;
}

export async function deployProject(projectName) {
  const project = await getProjectByName(projectName);
  const distRoot = await buildProject(projectName);
  const secret = await writeClaspConfig(project);

  await run('npx', ['clasp', 'push', '--force'], {
    cwd: distRoot
  });

  if (secret.deploymentId) {
    const timestamp = new Date().toISOString();
    const versionResult = await run('npx', ['clasp', 'version', `Automated deploy ${timestamp}`], {
      cwd: distRoot
    });
    const versionNumber = parseVersionNumber(versionResult.stdout);
    const deployArgs = ['clasp', 'deploy', '--deploymentId', secret.deploymentId, '--description', `Automated deploy ${timestamp}`];

    if (versionNumber) {
      deployArgs.push('--versionNumber', versionNumber);
    }

    await run('npx', deployArgs, {cwd: distRoot});
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.project) {
    throw new Error('Usage: node scripts/deploy-project.mjs --project <project-name>');
  }

  await deployProject(args.project);
  process.stdout.write(`deployed ${args.project}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
