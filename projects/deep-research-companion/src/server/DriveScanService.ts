import {DocumentFormatter} from './DocumentFormatter';
import {DocsMarkdownService} from './DocsMarkdownService';
import {NotificationService} from './NotificationService';
import {TrackingSheetRepository} from './TrackingSheetRepository';
import type {PreviewFileSummary, ProcessedAssetRecord, ResearchCategory, ResearchWorkspaceConfig} from './types';
import {WorkerSyncClient} from './WorkerSyncClient';

const GOOGLE_DOCS_MIME = 'application/vnd.google-apps.document';
const HTML_MIME = 'text/html';

/**
 * Coordinates Drive scanning, formatting, worker synchronization, preview
 * listing, and tracking-sheet writes for the Deep Research Companion project.
 */
export class DriveScanService {
  private readonly trackingSheetRepository: TrackingSheetRepository;

  private readonly formatter: DocumentFormatter;

  private readonly markdownService: DocsMarkdownService;

  private readonly workerSyncClient: WorkerSyncClient;

  private readonly notificationService: NotificationService;

  constructor(private readonly config: ResearchWorkspaceConfig) {
    const defaultFolder = config.researchFolders.find((folder) => folder.researchCategory === 'DEFAULT');
    if (!defaultFolder) {
      throw new Error('Research workspace configuration must include a DEFAULT folder.');
    }

    this.trackingSheetRepository = new TrackingSheetRepository(
      defaultFolder.folderId,
      config.trackingSheetPropertyName,
      config.trackingSheetId
    );
    this.formatter = new DocumentFormatter(config.logFolderId);
    this.markdownService = new DocsMarkdownService();
    this.workerSyncClient = new WorkerSyncClient(config.workerBaseUrl, config.workerApiKey);
    this.notificationService = new NotificationService();
  }

  /**
   * Scans the configured Drive folder for newly created reports and HTML
   * exports, processes each unseen asset, and records successful completions.
   */
  processNewDocuments(): void {
    const processedIds = this.trackingSheetRepository.getProcessedIds();
    const newlyProcessedIds: string[] = [];

    for (const definition of this.config.researchFolders) {
      const folder = DriveApp.getFolderById(definition.folderId);
      newlyProcessedIds.push(
        ...this.scanAndProcess(folder, definition.researchCategory, GOOGLE_DOCS_MIME, 'REPORT', processedIds),
        ...this.scanAndProcess(folder, definition.researchCategory, HTML_MIME, 'WEB_APP', processedIds)
      );
    }

    if (newlyProcessedIds.length > 0) {
      this.workerSyncClient.wakeDriveScan(newlyProcessedIds);
    }
  }

  /**
   * Re-syncs every configured Google Doc and HTML export to the paired Worker.
   * Unlike {@link processNewDocuments}, this intentionally ignores the
   * tracking sheet and does not reformat files, append rows, or send email.
   * It is the safe backfill path for rebuilding D1/R2/Vectorize.
   */
  syncAllToWorker(): void {
    const documents: Array<{documentId: string; documentUrl: string; title: string; createdAt: string}> = [];
    const htmlFiles: Array<{file: GoogleAppsScript.Drive.File; researchCategory: ResearchCategory}> = [];
    const seen = new Set<string>();

    for (const definition of this.config.researchFolders) {
      const folder = DriveApp.getFolderById(definition.folderId);
      const docFiles = folder.getFilesByType(GOOGLE_DOCS_MIME);
      while (docFiles.hasNext()) {
        const file = docFiles.next();
        if (seen.has(file.getId())) continue;
        seen.add(file.getId());
        const createdAt = this.toNativeDate(file.getDateCreated()).toISOString();
        this.workerSyncClient.ingestDocument({
          googleDocId: file.getId(),
          googleDocUrl: file.getUrl(),
          sourceTitle: file.getName(),
          researchCategory: definition.researchCategory,
          markdown: this.markdownService.getMarkdown(file.getId()),
          createdAt,
          modifiedAt: this.toNativeDate(file.getLastUpdated()).toISOString(),
          gatewayId: this.config.workerGatewayId,
        });
        documents.push({ documentId: file.getId(), documentUrl: file.getUrl(), title: file.getName(), createdAt });
      }
      const pwas = folder.getFiles();
      while (pwas.hasNext()) {
        const file = pwas.next();
        if (!this.isHtmlFile(file)) continue;
        if (!seen.has(file.getId())) {
          seen.add(file.getId());
          htmlFiles.push({file, researchCategory: definition.researchCategory});
        }
      }
    }

    for (const {file, researchCategory} of htmlFiles) {
      this.workerSyncClient.ingestPwa({
        driveFileId: file.getId(),
        driveFileUrl: file.getUrl(),
        sourceTitle: file.getName(),
        researchCategory,
        html: file.getBlob().getDataAsString(),
        createdAt: this.toNativeDate(file.getDateCreated()).toISOString(),
        modifiedAt: this.toNativeDate(file.getLastUpdated()).toISOString(),
        relatedDocumentCandidates: documents,
        gatewayId: this.config.workerGatewayId,
      });
    }
  }

  /**
   * Backfills the configured historical folder into the tracking sheet without
   * mutating documents or sending worker sync requests.
   */
  backfillFolder(): void {
    const folder = DriveApp.getFolderById(this.config.backfillFolderId);
    const processedIds = this.trackingSheetRepository.getProcessedIds();

    this.backfillByType(folder, 'DEFAULT', GOOGLE_DOCS_MIME, 'REPORT', processedIds);
    this.backfillByType(folder, 'DEFAULT', HTML_MIME, 'WEB_APP', processedIds);
  }

  /**
   * Returns searchable preview metadata for HTML exports in the target folder.
   *
   * @param keyword Optional Drive full-text query.
   * @returns Sorted HTML preview metadata with newest items first.
   */
  getFilesList(keyword: string): PreviewFileSummary[] {
    const summaries: PreviewFileSummary[] = [];
    const seenIds = new Set<string>();

    for (const definition of this.config.researchFolders) {
      const folder = DriveApp.getFolderById(definition.folderId);
      const files =
        keyword && keyword.trim() !== ''
          ? folder.searchFiles(`fullText contains '${keyword.replace(/'/g, "\\'")}'`)
          : folder.getFiles();

      while (files.hasNext()) {
        const file = files.next();
        if (!this.isHtmlFile(file)) continue;
        if (seenIds.has(file.getId())) {
          continue;
        }

        seenIds.add(file.getId());
        summaries.push({
          id: file.getId(),
          name: file.getName().replace(/\.html$/i, ''),
          date: file.getDateCreated().getTime(),
          dateString: file.getDateCreated().toLocaleString(),
        });
      }
    }

    return summaries.sort((left, right) => right.date - left.date);
  }

  /**
   * Returns the raw HTML source for a Drive-hosted PWA export.
   *
   * @param fileId Drive file ID for the HTML export.
   * @returns Raw file contents decoded as UTF-8 text.
   */
  getFileContent(fileId: string): string {
    return DriveApp.getFileById(fileId).getBlob().getDataAsString();
  }

  /**
   * Ensures the tracking spreadsheet exists and installs the recurring trigger.
   */
  installTriggerAndSetup(): void {
    this.trackingSheetRepository.getOrCreateSpreadsheet();
    const triggers = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) {
      if (trigger.getHandlerFunction() === 'processNewDocuments') {
        ScriptApp.deleteTrigger(trigger);
      }
    }

    ScriptApp.newTrigger('processNewDocuments').timeBased().everyMinutes(5).create();
  }

  /**
   * Iterates a folder by MIME type and processes all unseen assets.
   *
   * @param folder Drive folder currently being scanned.
   * @param researchCategory Category assigned to every asset in the folder.
   * @param mimeType MIME type selector.
   * @param typeLabel Logical asset type.
   * @param processedIds Known processed file identifiers.
   */
  private scanAndProcess(
    folder: GoogleAppsScript.Drive.Folder,
    researchCategory: ResearchCategory,
    mimeType: string,
    typeLabel: 'REPORT' | 'WEB_APP',
    processedIds: Set<string>
  ): string[] {
    const newlyProcessedIds: string[] = [];
    const files = typeLabel === 'WEB_APP' ? folder.getFiles() : folder.getFilesByType(mimeType);
    while (files.hasNext()) {
      const file = files.next();
      if (typeLabel === 'WEB_APP' && !this.isHtmlFile(file)) continue;
      const fileId = file.getId();
      if (processedIds.has(fileId)) {
        continue;
      }

      try {
        const record =
          typeLabel === 'REPORT' ? this.processReport(file, researchCategory) : this.processPwa(file, researchCategory);
        this.trackingSheetRepository.appendRecord(record);
        this.notificationService.sendProcessedEmail(file, typeLabel);
        processedIds.add(fileId);
        newlyProcessedIds.push(fileId);
        console.log(`Successfully processed ${typeLabel}: ${file.getName()}`);
      } catch (error) {
        console.error(`Failed to process ${typeLabel} ${file.getName()} (${fileId}). ${String(error)}`);
      }
    }
    return newlyProcessedIds;
  }

  /**
   * Backfills a folder by appending unseen rows to the tracking sheet only.
   *
   * @param folder Backfill source folder.
   * @param researchCategory Category assigned to every backfilled asset.
   * @param mimeType MIME type selector.
   * @param typeLabel Logical asset type.
   * @param processedIds Known processed identifiers.
   */
  private backfillByType(
    folder: GoogleAppsScript.Drive.Folder,
    researchCategory: ResearchCategory,
    mimeType: string,
    typeLabel: 'REPORT' | 'WEB_APP',
    processedIds: Set<string>
  ): void {
    const files = folder.getFilesByType(mimeType);
    while (files.hasNext()) {
      const file = files.next();
      if (processedIds.has(file.getId())) {
        continue;
      }

      this.trackingSheetRepository.appendRecord({
        fileId: file.getId(),
        name: file.getName(),
        url: file.getUrl(),
        type: typeLabel,
        researchCategory,
        dateCreated: this.toNativeDate(file.getDateCreated()),
        dateProcessed: new Date(),
        logFileUrl: 'Backfilled - No Log',
      });
      processedIds.add(file.getId());
    }
  }

  /**
   * Formats, serializes, and syncs a Google Doc report to the worker.
   *
   * @param file Report file to process.
   * @param researchCategory Category derived from the source folder.
   * @returns Tracking-sheet record for the processed report.
   */
  private processReport(file: GoogleAppsScript.Drive.File, researchCategory: ResearchCategory): ProcessedAssetRecord {
    const formatResult = this.formatter.formatDocument(file.getId(), file.getName());
    if (!formatResult.success) {
      throw new Error(`Formatting failed for ${file.getName()}.`);
    }

    const markdown = this.markdownService.getMarkdown(file.getId());
    this.workerSyncClient.ingestDocument({
      googleDocId: file.getId(),
      googleDocUrl: file.getUrl(),
      sourceTitle: file.getName(),
      researchCategory,
      markdown,
      createdAt: this.toNativeDate(file.getDateCreated()).toISOString(),
      modifiedAt: this.toNativeDate(file.getLastUpdated()).toISOString(),
      formattedLogUrl: formatResult.logUrl,
      gatewayId: this.config.workerGatewayId,
    });

    return {
      fileId: file.getId(),
      name: file.getName(),
      url: file.getUrl(),
      type: 'REPORT',
      researchCategory,
      dateCreated: this.toNativeDate(file.getDateCreated()),
      dateProcessed: new Date(),
      logFileUrl: formatResult.logUrl,
    };
  }

  /**
   * Uploads a Drive HTML export to the worker, including nearby report
   * candidates to help relation inference.
   *
   * @param file HTML export file to process.
   * @param researchCategory Category derived from the source folder.
   * @returns Tracking-sheet record for the processed PWA asset.
   */
  private processPwa(file: GoogleAppsScript.Drive.File, researchCategory: ResearchCategory): ProcessedAssetRecord {
    const html = file.getBlob().getDataAsString();
    const relatedCandidates = this.trackingSheetRepository
      .findNearbyReports(this.toNativeDate(file.getDateCreated()))
      .map((candidate) => ({
        documentId: candidate.fileId,
        documentUrl: candidate.url,
        title: candidate.name,
        createdAt: candidate.dateCreated.toISOString(),
      }));

    this.workerSyncClient.ingestPwa({
      driveFileId: file.getId(),
      driveFileUrl: file.getUrl(),
      sourceTitle: file.getName(),
      researchCategory,
      html,
      createdAt: this.toNativeDate(file.getDateCreated()).toISOString(),
      modifiedAt: this.toNativeDate(file.getLastUpdated()).toISOString(),
      relatedDocumentCandidates: relatedCandidates,
      gatewayId: this.config.workerGatewayId,
    });

    return {
      fileId: file.getId(),
      name: file.getName(),
      url: file.getUrl(),
      type: 'WEB_APP',
      researchCategory,
      dateCreated: this.toNativeDate(file.getDateCreated()),
      dateProcessed: new Date(),
      logFileUrl: 'Worker Sync',
    };
  }

  /**
   * Converts Apps Script `Base.Date` wrappers into native JavaScript dates so
   * the rest of the TypeScript code can work against the standard `Date`
   * surface.
   *
   * @param value Apps Script date-like value.
   * @returns Native JavaScript `Date` instance.
   */
  private toNativeDate(value: GoogleAppsScript.Base.Date): Date {
    return new Date(value.getTime());
  }

  /** Accepts Drive's HTML MIME type and generic uploads with an HTML filename. */
  private isHtmlFile(file: GoogleAppsScript.Drive.File): boolean {
    return file.getMimeType() === HTML_MIME || /\.html?$/i.test(file.getName());
  }
}
