import {getOptionalScriptProperty} from '@shared/core/Properties';
import type {ResearchWorkspaceConfig} from './types';

/**
 * Research Findings - Source Folders
 */
const DEFAULT_TARGET_FOLDER_ID = '1E-2gq4xYvKYp_svn13F1Er_PGJzXuuVC';
const PRODUCT_RESEARCH_FOLDER_ID = '17ZeNvOHpXBXrn_lSRpYWjlVPROMEMJFa';
const BRAND_RESEARCH_FOLDER_ID = '1CblllJXtd1WmoJw8Molbe3rT3X9Kd3i5';
const SHOWROOM_RESEARCH_FOLDER_ID = '15NNC2IjjyA5X6nftSj8iaiFeCj1ht40Y';

/**
 * Application Logistics
 */
const DEFAULT_LOG_FOLDER_ID = '12BeC-wUn63U8aS6TvrlLzjr0FMvReaSM';
const DEFAULT_BACKFILL_FOLDER_ID = '1iPn2gYaVDY1RdNc-jvhDWEaoYuLGUNLB';
const DEFAULT_TRACKING_SHEET_PROPERTY = 'DEEP_RESEARCH_COMPANION_TRACKING_SHEET_ID';
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
  return {
    targetFolderId: getOptionalScriptProperty('DEEP_RESEARCH_TARGET_FOLDER_ID', DEFAULT_TARGET_FOLDER_ID),
    productResearchFolderId: getOptionalScriptProperty('PRODUCT_RESEARCH_FOLDER_ID', PRODUCT_RESEARCH_FOLDER_ID),
    brandResearchFolderId: getOptionalScriptProperty('BRAND_RESEARCH_FOLDER_ID', BRAND_RESEARCH_FOLDER_ID),
    showroomResearchFolderId: getOptionalScriptProperty('SHOWROOM_RESEARCH_FOLDER_ID', SHOWROOM_RESEARCH_FOLDER_ID),
    logFolderId: getOptionalScriptProperty('DEEP_RESEARCH_LOG_FOLDER_ID', DEFAULT_LOG_FOLDER_ID),
    backfillFolderId: getOptionalScriptProperty('DEEP_RESEARCH_BACKFILL_FOLDER_ID', DEFAULT_BACKFILL_FOLDER_ID),
    trackingSheetPropertyName: getOptionalScriptProperty(
      'DEEP_RESEARCH_TRACKING_SHEET_PROPERTY',
      DEFAULT_TRACKING_SHEET_PROPERTY
    ),
    workerBaseUrl: getOptionalScriptProperty('RESEARCH_ARCHIVE_WORKER_BASE_URL', DEFAULT_WORKER_BASE_URL).replace(
      /\/+$/,
      ''
    ),
    workerApiKey: getOptionalScriptProperty('RESEARCH_ARCHIVE_WORKER_API_KEY', ''),
    workerGatewayId: getOptionalScriptProperty(
      'RESEARCH_ARCHIVE_WORKER_GATEWAY_ID',
      __PROJECT_RUNTIME_CONFIG__.cloudflare.aiGatewayId || 'default-gateway'
    )
  };
}
