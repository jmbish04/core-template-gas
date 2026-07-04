import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {getProjectRoot, repoRoot} from './projects.mjs';

export const APPS_SCRIPT_TIMEZONE = 'America/Los_Angeles';

const SCOPE_RULES = [
  {
    scope: 'https://www.googleapis.com/auth/script.external_request',
    pattern: /\bUrlFetchApp\./
  },
  {
    scope: 'https://www.googleapis.com/auth/script.container.ui',
    pattern: /(?:\.getUi\(\)|\.showSidebar\(|\.showModalDialog\(|\.showModelessDialog\(|\.createMenu\(|\.addToUi\()/
  },
  {
    scope: 'https://www.googleapis.com/auth/script.scriptapp',
    pattern: /\bScriptApp\./
  },
  {
    scope: 'https://www.googleapis.com/auth/script.storage',
    pattern: /\bPropertiesService\./
  },
  {
    scope: 'https://www.googleapis.com/auth/script.send_mail',
    pattern: /\bMailApp\./
  },
  {
    scope: 'https://www.googleapis.com/auth/userinfo.email',
    pattern: /(?:\bSession\.getActiveUser\(\)\.getEmail\(|userinfo\.email)/
  },
  {
    scope: 'https://www.googleapis.com/auth/documents',
    pattern: /(?:\bDocumentApp\.|\bDocs\.)/
  },
  {
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    pattern: /\bSpreadsheetApp\./
  },
  {
    scope: 'https://www.googleapis.com/auth/presentations',
    pattern: /\bSlidesApp\./
  },
  {
    scope: 'https://www.googleapis.com/auth/forms',
    pattern: /\bFormApp\./
  },
  {
    scope: 'https://www.googleapis.com/auth/drive',
    pattern: /\bDriveApp\./
  },
  {
    scope: 'https://mail.google.com/',
    pattern: /\bGmailApp\./
  },
  {
    scope: 'https://www.googleapis.com/auth/calendar',
    pattern: /\bCalendarApp\./
  }
];

export function sharedAliasPlugin() {
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

async function readProjectMetadata(project) {
  const metadataPath = path.join(getProjectRoot(project), 'project.json');

  try {
    return JSON.parse(await fs.readFile(metadataPath, 'utf8'));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {};
    }

    throw error;
  }
}

export async function readProjectManifest(project) {
  const manifestPath = path.join(getProjectRoot(project), project.manifest);
  return JSON.parse(await fs.readFile(manifestPath, 'utf8'));
}

export async function bundleProjectServer(project) {
  const projectRoot = getProjectRoot(project);
  const result = await build({
    entryPoints: [path.join(projectRoot, project.serverEntry)],
    bundle: true,
    format: 'iife',
    outfile: path.join(projectRoot, '.codex-manifest-bundle.js'),
    platform: 'browser',
    target: 'es2019',
    write: false,
    plugins: [sharedAliasPlugin()]
  });

  const output = result.outputFiles.find((file) => file.path.endsWith('.js'));
  if (!output) {
    throw new Error(`No server bundle was produced for ${project.name}.`);
  }

  return output.text;
}

export function inferOauthScopesFromBundle(bundleSource) {
  return SCOPE_RULES.filter((rule) => rule.pattern.test(bundleSource))
    .map((rule) => rule.scope)
    .sort();
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

export async function buildNormalizedManifest(project, options = {}) {
  const sourceManifest = options.sourceManifest ?? (await readProjectManifest(project));
  const bundleSource = options.bundleSource ?? (await bundleProjectServer(project));
  const projectMetadata = options.projectMetadata ?? (await readProjectMetadata(project));
  const derivedScopes = inferOauthScopesFromBundle(bundleSource);
  const additionalScopes = Array.isArray(projectMetadata.manifest?.additionalOauthScopes)
    ? projectMetadata.manifest.additionalOauthScopes
    : [];

  return {
    ...sourceManifest,
    timeZone: APPS_SCRIPT_TIMEZONE,
    oauthScopes: uniqueSorted([...derivedScopes, ...additionalScopes])
  };
}
