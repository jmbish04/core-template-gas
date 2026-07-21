import {DocumentFormatter} from './DocumentFormatter';
import {DocsMarkdownService} from './DocsMarkdownService';
import {NotificationService} from './NotificationService';
import {TrackingSheetRepository} from './TrackingSheetRepository';
import type {PreviewFileSummary, ProcessedAssetRecord, ResearchWorkspaceConfig} from './types';
import {WorkerSyncClient} from './WorkerSyncClient';

const GOOGLE_DOCS_MIME = 'application/vnd.google-apps.document';
const HTML_MIME = 'text/html';

export type ResearchCategory = 'DEFAULT' | 'PRODUCT' | 'BRAND';

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
    this.trackingSheetRepository = new TrackingSheetRepository(
      config.targetFolderId,
      config.trackingSheetPropertyName
    );
    this.formatter = new DocumentFormatter(config.logFolderId);
    this.markdownService = new DocsMarkdownService();
    this.workerSyncClient = new WorkerSyncClient(config.workerBaseUrl, config.workerApiKey);
    this.notificationService = new NotificationService();
  }

  /**
   * Scans the configured Drive folders for newly created reports and HTML
   * exports, processes each unseen asset, and records successful completions
   * categorized by their source folder.
   */
  processNewDocuments(): void {
    const targets: { id: string; category: ResearchCategory }[] = [
      { id: this.config.targetFolderId, category: 'DEFAULT' },
      { id: this.config.productResearchFolderId, category: 'PRODUCT' },
      { id: this.config.brandResearchFolderId, category: 'BRAND' }
    ];

    const processedIds = this.trackingSheetRepository.getProcessedIds();

    for (const target of targets) {
      if (!target.id) continue;
      
      const folder = DriveApp.getFolderById(target.id);
      this.scanAndProcess(folder, GOOGLE_DOCS_MIME, 'REPORT', target.category, processedIds);
      this.scanAndProcess(folder, HTML_MIME, 'WEB_APP', target.category, processedIds);
    }
  }

  /**
   * Backfills the configured historical folder into the tracking sheet without
   * mutating documents or sending worker sync requests. Defaults to the DEFAULT category.
   */
  backfillFolder(): void {
    const folder = DriveApp.getFolderById(this.config.backfillFolderId);
    const processedIds = this.trackingSheetRepository.getProcessedIds();

    this.backfillByType(folder, GOOGLE_DOCS_MIME, 'REPORT', 'DEFAULT', processedIds);
    this.backfillByType(folder, HTML_MIME, 'WEB_APP', 'DEFAULT', processedIds);
  }

  /**
   * Returns searchable preview metadata for HTML exports across all target folders.
   *
   * @param keyword Optional Drive full-text query.
   * @returns Sorted HTML preview metadata with newest items first.
   */
  getFilesList(keyword: string): PreviewFileSummary[] {
    const folderIds = [
      this.config.targetFolderId,
      this.config.productResearchFolderId,
      this.config.brandResearchFolderId
    ].filter(Boolean);

    const summaries: PreviewFileSummary[] = [];

    for (const id of folderIds) {
      const folder = DriveApp.getFolderById(id);
      const files =
        keyword && keyword.trim() !== ''
          ? folder.searchFiles(`fullText contains '${keyword.replace(/'/g, "\\'")}' and mimeType = '${HTML_MIME}'`)
          : folder.getFilesByType(HTML_MIME);

      while (files.hasNext()) {
        const file = files.next();
        summaries.push({
          id: file.getId(),
          name: file.getName().replace(/\.html$/i, ''),
          date: file.getDateCreated().getTime(),
          dateString: file.getDateCreated().toLocaleString()
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
   * @param mimeType MIME type selector.
   * @param typeLabel Logical asset type.
   * @param category The research category this folder belongs to.
   * @param processedIds Known processed file identifiers.
   */
  private scanAndProcess(
    folder: GoogleAppsScript.Drive.Folder,
    mimeType: string,
    typeLabel: 'REPORT' | 'WEB_APP',
    category: ResearchCategory,
    processedIds: Set<string>
  ): void {
    const files = folder.getFilesByType(mimeType);
    while (files.hasNext()) {
      const file = files.next();
      const fileId = file.getId();
      if (processedIds.has(fileId)) {
        continue;
      }

      try {
        const record = typeLabel === 'REPORT' ? this.processReport(file, category) : this.processPwa(file, category);
        this.trackingSheetRepository.appendRecord(record);
        this.notificationService.sendProcessedEmail(file, typeLabel);
        processedIds.add(fileId);
        console.log(`Successfully processed [${category}] ${typeLabel}: ${file.getName()}`);
      } catch (error) {
        console.error(`Failed to process [${category}] ${typeLabel} ${file.getName()} (${fileId}). ${String(error)}`);
      }
    }
  }

  /**
   * Backfills a folder by appending unseen rows to the tracking sheet only.
   *
   * @param folder Backfill source folder.
   * @param mimeType MIME type selector.
   * @param typeLabel Logical asset type.
   * @param category The research category this folder belongs to.
   * @param processedIds Known processed identifiers.
   */
  private backfillByType(
    folder: GoogleAppsScript.Drive.Folder,
    mimeType: string,
    typeLabel: 'REPORT' | 'WEB_APP',
    category: ResearchCategory,
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
        category: category,
        dateCreated: this.toNativeDate(file.getDateCreated()),
        dateProcessed: new Date(),
        logFileUrl: 'Backfilled - No Log'
      } as ProcessedAssetRecord & { category: ResearchCategory }); 
      // Type cast ensures category is attached even if types.ts hasn't been updated yet
      
      processedIds.add(file.getId());
    }
  }

  /**
   * Formats, serializes, and syncs a Google Doc report to the worker.
   *
   * @param file Report file to process.
   * @param category The research category this folder belongs to.
   * @returns Tracking-sheet record for the processed report.
   */
  private processReport(file: GoogleAppsScript.Drive.File, category: ResearchCategory): ProcessedAssetRecord {
    const formatResult = this.formatter.formatDocument(file.getId(), file.getName());
    if (!formatResult.success) {
      throw new Error(`Formatting failed for ${file.getName()}.`);
    }

    const markdown = this.markdownService.getMarkdown(file.getId());
    this.workerSyncClient.ingestDocument({
      googleDocId: file.getId(),
      googleDocUrl: file.getUrl(),
      sourceTitle: file.getName(),
      markdown,
      createdAt: this.toNativeDate(file.getDateCreated()).toISOString(),
      formattedLogUrl: formatResult.logUrl,
      gatewayId: this.config.workerGatewayId
    });

    return {
      fileId: file.getId(),
      name: file.getName(),
      url: file.getUrl(),
      type: 'REPORT',
      category: category,
      dateCreated: this.toNativeDate(file.getDateCreated()),
      dateProcessed: new Date(),
      logFileUrl: formatResult.logUrl
    } as ProcessedAssetRecord & { category: ResearchCategory };
  }

  /**
   * Uploads a Drive HTML export to the worker, including nearby report
   * candidates to help relation inference.
   *
   * @param file HTML export file to process.
   * @param category The research category this folder belongs to.
   * @returns Tracking-sheet record for the processed PWA asset.
   */
  private processPwa(file: GoogleAppsScript.Drive.File, category: ResearchCategory): ProcessedAssetRecord {
    const html = file.getBlob().getDataAsString();
    const relatedCandidates = this.trackingSheetRepository.findNearbyReports(this.toNativeDate(file.getDateCreated())).map((candidate) => ({
      documentId: candidate.fileId,
      documentUrl: candidate.url,
      title: candidate.name,
      createdAt: candidate.dateCreated.toISOString()
    }));

    this.workerSyncClient.ingestPwa({
      driveFileId: file.getId(),
      driveFileUrl: file.getUrl(),
      sourceTitle: file.getName(),
      html,
      createdAt: this.toNativeDate(file.getDateCreated()).toISOString(),
      relatedDocumentCandidates: relatedCandidates,
      gatewayId: this.config.workerGatewayId
    });

    return {
      fileId: file.getId(),
      name: file.getName(),
      url: file.getUrl(),
      type: 'WEB_APP',
      category: category,
      dateCreated: this.toNativeDate(file.getDateCreated()),
      dateProcessed: new Date(),
      logFileUrl: 'Worker Sync'
    } as ProcessedAssetRecord & { category: ResearchCategory };
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
}
