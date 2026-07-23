import fs from 'node:fs/promises';
import path from 'node:path';
import {buildNormalizedManifest, readProjectManifest, readRootManifest} from './lib/appsscript-manifest.mjs';
import {
  fileExists,
  getAppsScriptConfig,
  getProjectMetadata,
  getProjects,
  getProjectRoot,
  getWorkerProjects,
  loadRegistry,
} from './lib/projects.mjs';
import {buildWorkerConfig} from './lib/wrangler-config.mjs';

function stableStringify(value) {
  return JSON.stringify(value, null, 2);
}

async function findWorkflowFiles(directory) {
  const workflowFiles = [];
  const entries = await fs.readdir(directory, {withFileTypes: true});

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'retro-ref') {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      workflowFiles.push(...(await findWorkflowFiles(entryPath)));
      continue;
    }

    if (/[/\\]\.github[/\\]workflows[/\\].+\.ya?ml$/i.test(entryPath)) {
      workflowFiles.push(entryPath);
    }
  }

  return workflowFiles;
}

async function validateWorkflowNodeRuntime() {
  const workflowFiles = await findWorkflowFiles(process.cwd());
  const staleActionPattern =
    /(actions\/checkout@v[1-4]|actions\/setup-node@v[1-4]|actions\/setup-python@v[1-5]|pnpm\/action-setup@v[1-4])/;
  const staleNodeVersionPattern = /node-version:\s*["']?(?:20|22)(?:\.|["'\s]|$)/;

  for (const workflowFile of workflowFiles) {
    const source = await fs.readFile(workflowFile, 'utf8');
    const staleAction = source.match(staleActionPattern)?.[0];
    if (staleAction) {
      throw new Error(`Validation failed: ${workflowFile} uses Node 20-era action ${staleAction}.`);
    }
    if (staleNodeVersionPattern.test(source)) {
      throw new Error(`Validation failed: ${workflowFile} must use Node.js 24.`);
    }
  }
}

async function main() {
  await validateWorkflowNodeRuntime();

  const registry = await loadRegistry();
  const rootManifest = await readRootManifest();
  if (!Array.isArray(registry.projects) || registry.projects.length === 0) {
    throw new Error('projects.json must declare at least one project.');
  }

  const projects = await getProjects();

  for (const project of projects) {
    const projectRoot = getProjectRoot(project);
    const requiredFiles = [
      'project.json',
      project.serverEntry,
      project.clientEntry,
      project.clientHtml,
      project.manifest,
    ];

    for (const relativePath of requiredFiles) {
      const fullPath = path.join(projectRoot, relativePath);
      if (!(await fileExists(fullPath))) {
        throw new Error(`Validation failed: ${fullPath} does not exist.`);
      }
    }

    const metadata = await getProjectMetadata(project);
    if (!metadata.appsscript || typeof metadata.appsscript.scriptId !== 'string') {
      throw new Error(
        `Validation failed: ${path.join(projectRoot, 'project.json')} must define appsscript.scriptId as a string.`
      );
    }

    const appsscript = await getAppsScriptConfig(project);
    if (typeof appsscript.projectId !== 'string' || !appsscript.projectId) {
      throw new Error(`Validation failed: ${project.name} must resolve a default or project-specific GCP project ID.`);
    }
    if (typeof appsscript.rootDir !== 'string' || !appsscript.rootDir) {
      throw new Error(`Validation failed: ${project.name} appsscript.rootDir must be a non-empty string.`);
    }
    if (appsscript.filePushOrder !== undefined && !Array.isArray(appsscript.filePushOrder)) {
      throw new Error(`Validation failed: ${project.name} appsscript.filePushOrder must be an array.`);
    }
    if (
      !Array.isArray(appsscript.entryPoints) ||
      appsscript.entryPoints.length === 0 ||
      appsscript.entryPoints.some(
        (name) => typeof name !== 'string' || !/^[A-Za-z_$][\w$]*$/.test(name)
      )
    ) {
      throw new Error(
        `Validation failed: ${project.name} appsscript.entryPoints must contain at least one valid function name.`
      );
    }

    const sourceManifest = await readProjectManifest(project);
    const normalizedManifest = await buildNormalizedManifest(project, {sourceManifest, rootManifest});
    if (stableStringify(sourceManifest.oauthScopes ?? []) !== stableStringify(normalizedManifest.oauthScopes)) {
      throw new Error(
        `Validation failed: ${project.name} oauthScopes are out of policy. Update ${path.join(projectRoot, project.manifest)} to match the derived scopes.`
      );
    }

    for (const [field, requiredValue] of Object.entries(rootManifest)) {
      if (field === 'oauthScopes') {
        continue;
      }
      if (stableStringify(normalizedManifest[field]) !== stableStringify(requiredValue)) {
        throw new Error(`Validation failed: ${project.name} does not inherit root appsscript.json field ${field}.`);
      }
    }
  }

  const workerProjects = await getWorkerProjects();
  for (const project of workerProjects) {
    const {config} = await buildWorkerConfig(project, {write: false});
    if (!config.name || !config.main || !config.compatibility_date) {
      throw new Error(`Validation failed: ${project.name} Worker must resolve name, main, and compatibility_date.`);
    }
    if (!config.compatibility_flags?.includes('nodejs_compat')) {
      throw new Error(`Validation failed: ${project.name} Worker must inherit nodejs_compat.`);
    }
    if (config.ai?.binding !== 'AI' || config.assets?.binding !== 'ASSETS') {
      throw new Error(`Validation failed: ${project.name} Worker must inherit the standard AI and Assets bindings.`);
    }
    for (const secret of config.secrets_store_secrets ?? []) {
      if (!secret.binding || !secret.store_id || !secret.secret_name) {
        throw new Error(`Validation failed: ${project.name} has an incomplete Secrets Store binding.`);
      }
    }
    for (const database of config.d1_databases ?? []) {
      if (!database.binding || !database.database_name || !database.database_id) {
        throw new Error(`Validation failed: ${project.name} has an incomplete D1 binding.`);
      }
    }
    for (const index of config.vectorize ?? []) {
      if (!index.binding || !index.index_name) {
        throw new Error(`Validation failed: ${project.name} has an incomplete Vectorize binding.`);
      }
    }
  }

  process.stdout.write(`validated ${projects.length} project(s), ${workerProjects.length} paired worker(s)\n`);
}

await main();
