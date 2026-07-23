import {getResearchWorkspaceConfig} from './config';
import {DriveScanService} from './DriveScanService';

const driveScanService = new DriveScanService(getResearchWorkspaceConfig());

/**
 * Serves the React-powered HTML preview interface for Drive-hosted PWAs.
 *
 * @returns Evaluated HTML output for the Apps Script web app.
 */
function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Deep Research Companion')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Trigger entrypoint that scans the configured folder for new reports and
 * HTML exports.
 */
function processNewDocuments(): void {
  driveScanService.processNewDocuments();
}

/**
 * One-time setup function that creates the tracking sheet and installs the
 * five-minute polling trigger.
 */
function installTriggerAndSetup(): void {
  driveScanService.installTriggerAndSetup();
}

/**
 * Manual utility for backfilling historical folder contents into the tracking
 * sheet without reprocessing them.
 */
function backfillFolder(): void {
  driveScanService.backfillFolder();
}

/** Rebuilds the Worker research archive from every configured Drive folder. */
function syncAllToWorker(): void {
  driveScanService.syncAllToWorker();
}

/**
 * Returns preview metadata for Drive-hosted HTML exports.
 *
 * @param keyword Optional search term.
 * @returns Sorted preview entries.
 */
function getFilesList(keyword = '') {
  return driveScanService.getFilesList(keyword);
}

/**
 * Returns the raw HTML content of a previewable PWA export.
 *
 * @param fileId Drive file identifier.
 * @returns Raw HTML source.
 */
function getFileContent(fileId: string): string {
  return driveScanService.getFileContent(fileId);
}

(globalThis as typeof globalThis & {__PROJECT_COMPILED__?: Record<string, unknown>}).__PROJECT_COMPILED__ = {
  doGet,
  processNewDocuments,
  installTriggerAndSetup,
  backfillFolder,
  syncAllToWorker,
  getFilesList,
  getFileContent
};

export {};
