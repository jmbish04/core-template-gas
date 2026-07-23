import fs from 'node:fs/promises';
import path from 'node:path';
import {buildProject} from './build-project.mjs';
import {getAppsScriptConfig, getDistRoot, getProjectByName, parseArgs, run} from './lib/projects.mjs';

function parseVersionNumber(stdout) {
  const match = stdout.match(/Created version (\d+)/);
  return match?.[1];
}

function getDeploymentScriptProperties(projectName) {
  if (!process.env.APPS_SCRIPT_PROPERTIES_JSON) {
    return null;
  }

  const config = JSON.parse(process.env.APPS_SCRIPT_PROPERTIES_JSON);
  const defaults = config.defaults ?? {};
  const projectProperties = config.projects?.[projectName] ?? {};
  const properties = {...defaults, ...projectProperties};

  for (const [name, value] of Object.entries(properties)) {
    if (typeof value !== 'string') {
      throw new Error(`Apps Script property ${name} for ${projectName} must be a string.`);
    }
  }

  return properties;
}

async function applyDeploymentScriptProperties(project, distRoot) {
  const properties = getDeploymentScriptProperties(project.name);
  if (!properties || Object.keys(properties).length === 0) {
    return;
  }

  const result = await run(
    'npx',
    [
      'clasp',
      'run-function',
      'applyDeploymentScriptProperties',
      '--params',
      JSON.stringify([JSON.stringify(properties)])
    ],
    {cwd: distRoot}
  );
  const output = `${result.stdout}\n${result.stderr}`;
  if (
    /Unable to run script function|Script API executable not published|PERMISSION_DENIED|permission to run the script function/i.test(
      output
    )
  ) {
    throw new Error(
      `Unable to provision Script Properties for ${project.name}. Confirm that it has an API-executable deployment and that the clasp identity is authorized for its Apps Script scopes.`
    );
  }
}

async function writeClaspConfig(project) {
  const appsscript = await getAppsScriptConfig(project);
  if (!appsscript.scriptId) {
    throw new Error(
      `Missing appsscript.scriptId in projects/${project.name}/project.json (or set CLASP_PROJECTS_JSON / CLASP_SCRIPT_ID_${project.name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')}.`
    );
  }

  const claspConfig = {
    scriptId: appsscript.scriptId,
    // clasp runs from the generated dist directory. The source-facing rootDir
    // remains in project.json, while the deploy root is the dist directory.
    rootDir: '.',
  };

  if (appsscript.projectId) {
    claspConfig.projectId = appsscript.projectId;
  }

  if (appsscript.parentId) {
    claspConfig.parentId = Array.isArray(appsscript.parentId) ? appsscript.parentId : [appsscript.parentId];
  }

  if (appsscript.filePushOrder?.length) {
    claspConfig.filePushOrder = appsscript.filePushOrder;
  }

  const distRoot = getDistRoot(project);
  await fs.writeFile(path.join(distRoot, '.clasp.json'), `${JSON.stringify(claspConfig, null, 2)}\n`);
  return appsscript;
}

export async function deployProject(projectName) {
  const project = await getProjectByName(projectName);
  const distRoot = await buildProject(projectName);
  const appsscript = await writeClaspConfig(project);

  await run('npx', ['clasp', 'push', '--force'], {
    cwd: distRoot,
  });

  if (appsscript.deploymentId) {
    const timestamp = new Date().toISOString();
    const versionResult = await run('npx', ['clasp', 'version', `Automated deploy ${timestamp}`], {
      cwd: distRoot,
    });
    const versionNumber = parseVersionNumber(versionResult.stdout);
    const deployArgs = [
      'clasp',
      'update-deployment',
      appsscript.deploymentId,
      '--description',
      `Automated deploy ${timestamp}`,
    ];

    if (versionNumber) {
      deployArgs.push('--versionNumber', versionNumber);
    }

    const deploymentResult = await run('npx', deployArgs, {cwd: distRoot});
    const deploymentOutput = `${deploymentResult.stdout}\n${deploymentResult.stderr}`;
    if (/Read-only deployments may not be modified|Unable to update deployment|PERMISSION_DENIED/i.test(deploymentOutput)) {
      throw new Error(
        `Unable to update Apps Script deployment ${appsscript.deploymentId} for ${project.name}. Confirm that it is a versioned deployment rather than the read-only @HEAD deployment.`
      );
    }
  }

  await applyDeploymentScriptProperties(project, distRoot);
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
