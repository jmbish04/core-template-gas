import path from 'node:path';
import {buildNormalizedManifest, readProjectManifest} from './lib/appsscript-manifest.mjs';
import {fileExists, getProjects, getProjectRoot, loadRegistry} from './lib/projects.mjs';

function stableStringify(value) {
  return JSON.stringify(value, null, 2);
}

async function main() {
  const registry = await loadRegistry();
  if (!Array.isArray(registry.projects) || registry.projects.length === 0) {
    throw new Error('projects.json must declare at least one project.');
  }

  const projects = await getProjects();

  for (const project of projects) {
    const projectRoot = getProjectRoot(project);
    const requiredFiles = [project.serverEntry, project.clientEntry, project.clientHtml, project.manifest];

    for (const relativePath of requiredFiles) {
      const fullPath = path.join(projectRoot, relativePath);
      if (!(await fileExists(fullPath))) {
        throw new Error(`Validation failed: ${fullPath} does not exist.`);
      }
    }

    const sourceManifest = await readProjectManifest(project);
    const normalizedManifest = await buildNormalizedManifest(project, {sourceManifest});
    if (stableStringify(sourceManifest) !== stableStringify(normalizedManifest)) {
      throw new Error(
        `Validation failed: ${project.name} manifest is out of policy. Update ${path.join(projectRoot, project.manifest)} to match the normalized manifest.`
      );
    }
  }

  process.stdout.write(`validated ${projects.length} project(s)\n`);
}

await main();
