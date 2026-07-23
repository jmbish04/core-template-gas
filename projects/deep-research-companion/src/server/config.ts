import {getOptionalScriptProperty} from '@shared/core/Properties';
import {RESEARCH_FOLDERS} from '../../research-folders';
import type {ResearchFolderDefinition, ResearchWorkspaceConfig} from './types';

export {RESEARCH_FOLDERS};

const DEFAULT_LOG_FOLDER_ID = '12BeC-wUn63U8aS6TvrlLzjr0FMvReaSM';
const DEFAULT_BACKFILL_FOLDER_ID = '1iPn2gYaVDY1RdNc-jvhDWEaoYuLGUNLB';
const DEFAULT_TRACKING_SHEET_PROPERTY = 'DEEP_RESEARCH_COMPANION_TRACKING_SHEET_ID';
const DEFAULT_TRACKING_SHEET_ID = '1_VmTq_uOT44q3ny2QL0ptC4piDLc5J2qPyu_Mx78VYA';
const DEFAULT_WORKER_BASE_URL = 'https://gas-companion-research.hacolby.workers.dev';

/**
 * Resolves the effective runtime configuration for the Deep Research Companion
 * project.
 *
 * Script properties intentionally override the checked-in defaults so the same
 * codebase can be reused across environments without source edits. The build
 * pipeline injects Cloudflare runtime configuration into
 * `__PROJECT_RUNTIME_CONFIG__`, which lets each project inherit the repository
 * default AI Gateway ID while still permitting per-script overrides via
 * `RESEARCH_ARCHIVE_WORKER_GATEWAY_ID`.
 *
 * @returns Fully resolved project configuration used by Drive scans, worker
 *   sync requests, and tracking-sheet initialization.
 */
export function getResearchWorkspaceConfig(): ResearchWorkspaceConfig {
  const researchFolders = Object.entries(RESEARCH_FOLDERS).map(([key, definition]) => ({
    folderId: getOptionalScriptProperty(
      key === 'general' ? 'DEEP_RESEARCH_TARGET_FOLDER_ID' : `DEEP_RESEARCH_${key.toUpperCase()}_FOLDER_ID`,
      definition.folderId
    ),
    researchCategory: definition.researchCategory,
  }));

  return {
    researchFolders,
    logFolderId: getOptionalScriptProperty('DEEP_RESEARCH_LOG_FOLDER_ID', DEFAULT_LOG_FOLDER_ID),
    backfillFolderId: getOptionalScriptProperty('DEEP_RESEARCH_BACKFILL_FOLDER_ID', DEFAULT_BACKFILL_FOLDER_ID),
    trackingSheetPropertyName: getOptionalScriptProperty(
      'DEEP_RESEARCH_TRACKING_SHEET_PROPERTY',
      DEFAULT_TRACKING_SHEET_PROPERTY
    ),
    trackingSheetId: getOptionalScriptProperty(DEFAULT_TRACKING_SHEET_PROPERTY, DEFAULT_TRACKING_SHEET_ID),
    workerBaseUrl: getOptionalScriptProperty('RESEARCH_ARCHIVE_WORKER_BASE_URL', DEFAULT_WORKER_BASE_URL).replace(
      /\/+$/,
      ''
    ),
    workerApiKey: getOptionalScriptProperty('RESEARCH_ARCHIVE_WORKER_API_KEY', ''),
    workerGatewayId: getOptionalScriptProperty(
      'RESEARCH_ARCHIVE_WORKER_GATEWAY_ID',
      __PROJECT_RUNTIME_CONFIG__.cloudflare.aiGatewayId || 'default-gateway'
    ),
  };
}
