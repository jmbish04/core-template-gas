import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {buildNormalizedManifest, sharedAliasPlugin} from './lib/appsscript-manifest.mjs';
import {
  fileExists,
  getDistRoot,
  getProjectByName,
  getProjectRoot,
  parseArgs
} from './lib/projects.mjs';

async function ensureProjectFiles(project) {
  const projectRoot = getProjectRoot(project);
  const required = [project.serverEntry, project.clientEntry, project.clientHtml, project.manifest];

  for (const relativePath of required) {
    const absolutePath = path.join(projectRoot, relativePath);
    if (!(await fileExists(absolutePath))) {
      throw new Error(`Missing required project file: ${absolutePath}`);
    }
  }
}

async function readProjectMetadata(project) {
  const metadataPath = path.join(getProjectRoot(project), 'project.json');
  if (!(await fileExists(metadataPath))) {
    return {};
  }

  return JSON.parse(await fs.readFile(metadataPath, 'utf8'));
}

async function buildClient(project) {
  const projectRoot = getProjectRoot(project);
  const distRoot = getDistRoot(project);
  const htmlTemplate = await fs.readFile(path.join(projectRoot, project.clientHtml), 'utf8');
  const result = await build({
    entryPoints: [path.join(projectRoot, project.clientEntry)],
    bundle: true,
    format: 'iife',
    jsx: 'automatic',
    outdir: path.join(distRoot, '_client'),
    loader: {
      '.css': 'css',
      '.tsx': 'tsx'
    },
    platform: 'browser',
    target: 'es2020',
    write: false,
    plugins: [sharedAliasPlugin()]
  });

  const jsBundle = result.outputFiles.find((file) => file.path.endsWith('.js'))?.text ?? '';
  const cssBundle = result.outputFiles.find((file) => file.path.endsWith('.css'))?.text ?? '';

  const withStyles = cssBundle
    ? htmlTemplate.replace('</head>', `  <style>\n${cssBundle}\n  </style>\n</head>`)
    : htmlTemplate;

  const finalHtml = withStyles.replace('</body>', `  <script>\n${jsBundle}\n  </script>\n</body>`);
  await fs.writeFile(path.join(distRoot, 'Index.html'), finalHtml);
}

async function buildServer(project) {
  const projectRoot = getProjectRoot(project);
  const distRoot = getDistRoot(project);
  const projectMetadata = await readProjectMetadata(project);
  const result = await build({
    entryPoints: [path.join(projectRoot, project.serverEntry)],
    bundle: true,
    format: 'iife',
    outfile: path.join(distRoot, 'Code.bundle.js'),
    platform: 'browser',
    target: 'es2019',
    write: false,
    plugins: [sharedAliasPlugin()]
  });

  const output = result.outputFiles.find((file) => file.path.endsWith('.js'));
  if (!output) {
    throw new Error(`No server bundle was produced for ${project.name}.`);
  }

  const runtimeConfig = {
    projectName: project.name,
    cloudflare: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
      aiGatewayId: projectMetadata.cloudflare?.aiGatewayId ?? 'default-gateway'
    }
  };
  const generatedAt = new Date().toISOString();
  const entryPoints = projectMetadata.appsscript?.entryPoints ?? [];
  if (!Array.isArray(entryPoints) || entryPoints.some((name) => typeof name !== 'string' || !/^[A-Za-z_$][\w$]*$/.test(name))) {
    throw new Error(`${project.name} appsscript.entryPoints must contain valid JavaScript function names.`);
  }

  const header = `/** Generated for ${project.name}. Do not edit dist directly. */\n`;
  const injectedRuntimeConfig = `const __PROJECT_RUNTIME_CONFIG__ = Object.freeze(${JSON.stringify(runtimeConfig)});\n`;
  const serverBundleSource = output.text;
  const entrypointHeader = [
    '/**',
    ` * Updated from GitHub source: ${generatedAt}`,
    ` * Project: ${project.name}`,
    ' * Generated entrypoints only; compiled application logic lives in Compiled.js.',
    ' */',
    ''
  ].join('\n');
  const entrypointSource = entryPoints
    .map(
      (name) =>
        `function ${name}(...args) {\n  return globalThis.__PROJECT_COMPILED__.${name}(...args);\n}`
    )
    .join('\n\n');
  const deploymentPropertiesEntrypoint = `function applyDeploymentScriptProperties(propertiesJson) {\n  const properties = JSON.parse(propertiesJson);\n  PropertiesService.getScriptProperties().setProperties(properties, false);\n  return Object.keys(properties).sort();\n}`;

  await fs.writeFile(
    path.join(distRoot, 'Code.js'),
    `${entrypointHeader}${entrypointSource}\n\n${deploymentPropertiesEntrypoint}\n`
  );
  await fs.writeFile(
    path.join(distRoot, 'Compiled.js'),
    `${header}${injectedRuntimeConfig}${serverBundleSource}`
  );
  return serverBundleSource;
}

async function writeManifest(project, serverBundleSource) {
  const distRoot = getDistRoot(project);
  const manifest = await buildNormalizedManifest(project, {bundleSource: serverBundleSource});
  await fs.writeFile(path.join(distRoot, 'appsscript.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(
    path.join(distRoot, '.claspignore'),
    ['**/*', '!appsscript.json', '!Code.js', '!Compiled.js', '!Index.html'].join('\n')
  );
}

export async function buildProject(projectName) {
  const project = await getProjectByName(projectName);
  await ensureProjectFiles(project);

  const distRoot = getDistRoot(project);
  await fs.rm(distRoot, {recursive: true, force: true});
  await fs.mkdir(distRoot, {recursive: true});

  await buildClient(project);
  const serverBundleSource = await buildServer(project);
  await writeManifest(project, serverBundleSource);

  return distRoot;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectName = args.project;

  if (!projectName) {
    throw new Error('Usage: node scripts/build-project.mjs --project <project-name>');
  }

  const distRoot = await buildProject(projectName);
  process.stdout.write(`${distRoot}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
