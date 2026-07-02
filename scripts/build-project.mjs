import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {
  fileExists,
  getDistRoot,
  getProjectByName,
  getProjectRoot,
  parseArgs,
  repoRoot
} from './lib/projects.mjs';

function sharedAliasPlugin() {
  const resolveAliasTarget = (relativePath) => {
    const basePath = path.join(repoRoot, 'shared', 'src', relativePath);
    const candidates = [basePath, `${basePath}.ts`, `${basePath}.tsx`, path.join(basePath, 'index.ts')];
    const resolved = candidates.find((candidate) => existsSync(candidate));

    if (!resolved) {
      throw new Error(`Unable to resolve @shared/${relativePath}`);
    }

    return resolved;
  };

  return {
    name: 'shared-alias',
    setup(buildApi) {
      buildApi.onResolve({filter: /^@shared\//}, (args) => ({
        path: resolveAliasTarget(args.path.slice('@shared/'.length))
      }));
    }
  };
}

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

  const header = `/** Generated for ${project.name}. Do not edit dist directly. */\n`;
  await fs.writeFile(path.join(distRoot, 'Code.js'), `${header}${output.text}`);
}

async function copyManifest(project) {
  const projectRoot = getProjectRoot(project);
  const distRoot = getDistRoot(project);

  await fs.copyFile(path.join(projectRoot, project.manifest), path.join(distRoot, 'appsscript.json'));
  await fs.writeFile(
    path.join(distRoot, '.claspignore'),
    ['**/*', '!appsscript.json', '!Code.js', '!Index.html'].join('\n')
  );
}

export async function buildProject(projectName) {
  const project = await getProjectByName(projectName);
  await ensureProjectFiles(project);

  const distRoot = getDistRoot(project);
  await fs.rm(distRoot, {recursive: true, force: true});
  await fs.mkdir(distRoot, {recursive: true});

  await buildClient(project);
  await buildServer(project);
  await copyManifest(project);

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
