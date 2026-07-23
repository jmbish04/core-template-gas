import fs from 'node:fs/promises';
import path from 'node:path';

import {fileExists, getWorkerRoot, repoRoot} from './projects.mjs';

export const ROOT_WRANGLER_PATH = path.join(repoRoot, 'wrangler.jsonc');
export const GENERATED_WRANGLER_NAME = 'wrangler.generated.jsonc';

const ROOT_OVERRIDE_FIELDS = new Set([
  'compatibility_flags',
  'workers_dev',
  'preview_urls',
  'upload_source_maps',
  'observability',
  'assets',
  'ai',
  'vars',
  'secrets_store_secrets',
]);

export function parseJsonc(source) {
  let output = '';
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === '\n') { lineComment = false; output += char; }
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') { blockComment = false; index += 1; }
      continue;
    }
    if (!inString && char === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (!inString && char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    output += char;
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    }
  }

  return JSON.parse(output.replace(/,\s*([}\]])/gu, '$1'));
}

async function readJsonc(filePath) {
  return parseJsonc(await fs.readFile(filePath, 'utf8'));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeObjects(base, override) {
  const merged = {...base};
  for (const [key, value] of Object.entries(override ?? {})) {
    merged[key] = isPlainObject(value) && isPlainObject(merged[key])
      ? mergeObjects(merged[key], value)
      : value;
  }
  return merged;
}

function mergeBindings(projectBindings = [], rootBindings = []) {
  const bindings = new Map(projectBindings.map((binding) => [binding.binding, binding]));
  for (const binding of rootBindings) bindings.set(binding.binding, binding);
  return [...bindings.values()];
}

export function mergeWranglerConfigs(rootConfig, projectConfig) {
  const merged = mergeObjects(rootConfig, projectConfig);
  for (const field of ROOT_OVERRIDE_FIELDS) {
    if (!(field in rootConfig)) continue;
    if (field === 'compatibility_flags') {
      merged[field] = [...new Set([...(projectConfig[field] ?? []), ...rootConfig[field]])];
    } else if (field === 'secrets_store_secrets') {
      merged[field] = mergeBindings(projectConfig[field], rootConfig[field]);
    } else if (isPlainObject(rootConfig[field])) {
      merged[field] = mergeObjects(projectConfig[field] ?? {}, rootConfig[field]);
    } else {
      merged[field] = rootConfig[field];
    }
  }
  return merged;
}

export async function buildWorkerConfig(project, {write = true} = {}) {
  const workerRoot = getWorkerRoot(project);
  const projectConfigPath = path.join(workerRoot, 'wrangler.jsonc');
  if (!(await fileExists(projectConfigPath))) {
    throw new Error(`Missing Worker config: ${projectConfigPath}`);
  }
  const [rootConfig, projectConfig] = await Promise.all([
    readJsonc(ROOT_WRANGLER_PATH),
    readJsonc(projectConfigPath),
  ]);
  const merged = mergeWranglerConfigs(rootConfig, projectConfig);
  if (!merged.name || !merged.main || !merged.compatibility_date) {
    throw new Error(`${project.name} Worker config must define name, main, and compatibility_date.`);
  }

  if (write) {
    const generatedPath = path.join(workerRoot, GENERATED_WRANGLER_NAME);
    const redirectDir = path.join(workerRoot, '.wrangler', 'deploy');
    await fs.writeFile(
      generatedPath,
      `// Generated from root wrangler.jsonc + project wrangler.jsonc. Do not edit.\n${JSON.stringify(merged, null, 2)}\n`,
    );
    await fs.mkdir(redirectDir, {recursive: true});
    await fs.writeFile(
      path.join(redirectDir, 'config.json'),
      `${JSON.stringify({configPath: `../../${GENERATED_WRANGLER_NAME}`}, null, 2)}\n`,
    );
    return {config: merged, generatedPath};
  }
  return {config: merged, generatedPath: null};
}
