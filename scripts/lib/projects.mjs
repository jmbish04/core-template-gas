import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(currentDir, '..', '..');
const registryPath = path.join(repoRoot, 'projects.json');

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export async function loadRegistry() {
  return readJson(registryPath);
}

export async function getProjects() {
  const registry = await loadRegistry();
  return registry.projects;
}

export async function getProjectByName(name) {
  const projects = await getProjects();
  const project = projects.find((candidate) => candidate.name === name);

  if (!project) {
    throw new Error(`Unknown project "${name}".`);
  }

  return project;
}

export function getProjectRoot(project) {
  return path.join(repoRoot, project.path);
}

export function getDistRoot(project) {
  return path.join(repoRoot, 'dist', 'projects', project.name);
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function detectAffectedProjects(changedFiles) {
  const registry = await loadRegistry();
  const normalizedFiles = changedFiles.map(normalizePath);
  const impactAll = normalizedFiles.some((file) =>
    registry.rootImpactPaths.some((impactPath) => file === impactPath || file.startsWith(impactPath))
  );

  if (impactAll) {
    return registry.projects.map((project) => project.name);
  }

  const affected = new Set();

  for (const project of registry.projects) {
    const projectPrefix = `${normalizePath(project.path)}/`;
    if (normalizedFiles.some((file) => file.startsWith(projectPrefix))) {
      affected.add(project.name);
    }
  }

  return [...affected];
}

export function getProjectSecret(project) {
  const payload = process.env.CLASP_PROJECTS_JSON ? JSON.parse(process.env.CLASP_PROJECTS_JSON) : {};
  const lookupKey = project.secretKey ?? project.name;
  const mapped = payload[lookupKey] ?? payload.projects?.[lookupKey];

  if (mapped) {
    return mapped;
  }

  const envBase = lookupKey.toUpperCase().replace(/[^A-Z0-9]+/g, '_');

  return {
    scriptId: process.env[`CLASP_SCRIPT_ID_${envBase}`],
    parentId: process.env[`CLASP_PARENT_ID_${envBase}`],
    deploymentId: process.env[`CLASP_DEPLOYMENT_ID_${envBase}`]
  };
}

export function parseArgs(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const [rawKey, maybeValue] = token.slice(2).split('=');
    const key = rawKey;
    const nextToken = argv[index + 1];
    const value = maybeValue ?? (nextToken && !nextToken.startsWith('--') ? nextToken : undefined);
    result[key] = value ?? true;

    if (maybeValue === undefined && nextToken && !nextToken.startsWith('--')) {
      index += 1;
    }
  }

  return result;
}

export async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve({stdout, stderr});
        return;
      }

      reject(new Error(stderr || stdout || `${command} exited with code ${code}`));
    });
  });
}
